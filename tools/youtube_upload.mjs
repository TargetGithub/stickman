#!/usr/bin/env node
// Upload a rendered episode to YouTube with the YouTube Data API v3. No dependencies: raw HTTPS via fetch.
// Setup, quota and the approval rule: docs/YOUTUBE_UPLOAD.md.
//
//   node tools/youtube_upload.mjs --auth [--channel <name>] [--client <client_secret.json>] [--port 8085]   sign in (opens the browser)
//   node tools/youtube_upload.mjs --check [--channel <name>]                             connected channel + today's quota use
//   node tools/youtube_upload.mjs <episode folder | episode id> --dry-run                 show exactly what would be sent
//   node tools/youtube_upload.mjs <episode folder | episode id> [--privacy private|unlisted|public]
//        [--publish-at 2026-11-10T16:00:00-08:00] [--playlist <id or exact title> | --no-playlist] [--thumb <file>] [--video <file>]
//        [--no-notify] [--force] [--yes]
//
// Every upload is Made for kids (selfDeclaredMadeForKids), category Education (27), private unless --privacy says
// otherwise; --publish-at schedules it (private until then). Title, description and tags come from youtube.txt.
// An episode that already has a video id (youtube_upload.json in its folder, or episodes.json) is refused
// unless --force. Without --yes the tool asks on the terminal before uploading.
// Secrets live outside the repo in ~/.config/stickman (mode 600): youtube_client.json, youtube_token[_<channel>].json.
// Each --channel name keeps its own sign-in, so Toy Box, Doopi and Baaaana can each upload to their own channel.

import { createHash, randomBytes } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { chmodSync, closeSync, copyFileSync, existsSync, mkdirSync, openSync, readFileSync, readSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { homedir } from "node:os";
import { basename, isAbsolute, join, resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";
import {
  DAILY_QUOTA, PRIVACY, QUOTA, buildAuthUrl, choosePlaylist, buildInsertBody, buildPlaylistItem, buildResumableStart, contentRange, episodeIdFromDir,
  fitTags, humanSize, isPlaylistId, nextOffset, parsePublishAt, parseYoutubeTxt, pickThumbnail, quotaDay, validateMeta,
} from "./lib/youtube.mjs";

const REPO = fileURLToPath(new URL("../", import.meta.url));
const CONF = process.env.STICKMAN_CONFIG_DIR ?? join(homedir(), ".config/stickman");
const CLIENT_FILE = join(CONF, "youtube_client.json");
const QUOTA_FILE = join(CONF, "youtube_quota.json");
const RESUME_DIR = join(CONF, "youtube_resume");
const REG_FILE = join(REPO, "engine3d/scripts/series/toybox/episodes.json");
const CHUNK = 64 * 1024 * 1024; // a multiple of 256 KiB, as resumable uploads require
const API = "https://www.googleapis.com/youtube/v3";

// ---------- arguments ----------
const argv = process.argv.slice(2);
const opt = { _: [] };
const VALUED = new Set(["--client", "--port", "--channel", "--privacy", "--publish-at", "--playlist", "--thumb", "--video", "--language"]);
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (VALUED.has(a)) opt[a.slice(2)] = argv[++i];
  else if (a.startsWith("--")) opt[a.slice(2)] = true;
  else opt._.push(a);
}
// One sign-in per channel: --channel toybox → youtube_token_toybox.json (no --channel → youtube_token.json).
if (opt.channel && !/^[a-z0-9_-]+$/i.test(opt.channel)) throw new Error("--channel takes a short name like toybox");
const TOKEN_FILE = join(CONF, opt.channel ? `youtube_token_${opt.channel}.json` : "youtube_token.json");
const CH = opt.channel ? ` --channel ${opt.channel}` : "";

// ---------- secrets on disk ----------
function writeSecret(file, data) {
  mkdirSync(CONF, { recursive: true, mode: 0o700 });
  writeFileSync(file, typeof data === "string" ? data : `${JSON.stringify(data, null, 1)}\n`, { mode: 0o600 });
  chmodSync(file, 0o600);
}

/** OAuth client: ~/.config/stickman/youtube_client.json, else --client, $YOUTUBE_CLIENT_SECRET or the one ~/Downloads/client_secret_*.json. */
function loadClient({ adopt = false } = {}) {
  let src = opt.client ?? process.env.YOUTUBE_CLIENT_SECRET;
  if (!src && existsSync(CLIENT_FILE)) src = CLIENT_FILE;
  if (!src) {
    const dl = join(homedir(), "Downloads");
    const found = existsSync(dl) ? readdirSync(dl).filter((f) => /^client_secret_.*\.json$/.test(f)) : [];
    if (found.length === 1) src = join(dl, found[0]);
    else throw new Error(found.length ? `several client_secret_*.json in ~/Downloads: pass --client <file>` : "no OAuth client: pass --client <client_secret.json> (see docs/YOUTUBE_UPLOAD.md)");
  }
  const raw = JSON.parse(readFileSync(src, "utf8"));
  const kind = raw.installed ? "installed" : raw.web ? "web" : null;
  if (!kind) throw new Error(`${src}: not an OAuth client file (no "installed" or "web" key)`);
  if (adopt && resolve(src) !== resolve(CLIENT_FILE)) { writeSecret(CLIENT_FILE, readFileSync(src, "utf8")); console.log(`OAuth client copied to ${CLIENT_FILE} (mode 600)`); }
  const c = raw[kind];
  return { kind, clientId: c.client_id, clientSecret: c.client_secret, authUri: c.auth_uri, tokenUri: c.token_uri ?? "https://oauth2.googleapis.com/token", redirectUris: c.redirect_uris ?? [] };
}

// ---------- quota ledger (the API does not report usage; this counts what this tool spent) ----------
function quotaLedger() {
  try { return JSON.parse(readFileSync(QUOTA_FILE, "utf8")); } catch { return {}; }
}
function spend(op) {
  const day = quotaDay(Date.now());
  const l = quotaLedger();
  for (const d of Object.keys(l)) if (d < day && Object.keys(l).length > 14) delete l[d];
  l[day] = l[day] ?? { units: 0, ops: {} };
  l[day].units += QUOTA[op] ?? 1;
  l[day].ops[op] = (l[day].ops[op] ?? 0) + 1;
  writeSecret(QUOTA_FILE, l);
}
const spentToday = () => quotaLedger()[quotaDay(Date.now())]?.units ?? 0;

// ---------- OAuth ----------
async function tokenRequest(client, params) {
  const r = await fetch(client.tokenUri, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: client.clientId, client_secret: client.clientSecret, ...params }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`token request failed: ${r.status} ${j.error ?? ""} ${j.error_description ?? ""}`.trim());
  return j;
}

async function signIn() {
  const client = loadClient({ adopt: true });
  const verifier = randomBytes(48).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const state = randomBytes(16).toString("hex");
  // Desktop ("installed") clients accept any loopback port; a Web client only accepts a registered redirect URI.
  const port = client.kind === "installed" ? Number(opt.port ?? 0) : Number(opt.port ?? 8085);
  const host = client.kind === "installed" ? "127.0.0.1" : "localhost";
  const server = createServer();
  await new Promise((ok, fail) => server.once("error", fail).listen(port, host === "localhost" ? "127.0.0.1" : host, ok));
  const redirectUri = `http://${host}:${server.address().port}`;
  if (client.kind === "web" && !client.redirectUris.includes(redirectUri) && !client.redirectUris.includes(`${redirectUri}/`)) {
    console.warn(`warning: this is a Web OAuth client and ${redirectUri} is not in its redirect URIs, so Google will answer redirect_uri_mismatch.\n` +
      `  Fix: create a "Desktop app" OAuth client and pass --client <file>, or add ${redirectUri} to this client's Authorized redirect URIs.`);
  }
  const url = buildAuthUrl({ clientId: client.clientId, authUri: client.authUri, redirectUri, state, challenge });
  const code = await new Promise((ok, fail) => {
    const timer = setTimeout(() => fail(new Error("no answer from the consent screen within 10 minutes")), 600_000);
    server.on("request", (req, res) => {
      const u = new URL(req.url, redirectUri);
      if (u.pathname !== "/") { res.writeHead(404).end(); return; }
      const err = u.searchParams.get("error");
      const good = !err && u.searchParams.get("state") === state && u.searchParams.get("code");
      res.writeHead(good ? 200 : 400, { "Content-Type": "text/html; charset=utf-8" })
        .end(good ? "<h2>Signed in. You can close this tab and go back to Claude.</h2>" : `<h2>Sign-in failed: ${err ?? "bad state"}</h2>`);
      clearTimeout(timer);
      if (good) ok(u.searchParams.get("code"));
      else fail(new Error(`consent screen answered ${err ?? "with a wrong state"}`));
    });
    console.log(`\nOpen this page and allow access (the browser should open by itself):\n\n${url}\n`);
    if (!opt["no-browser"]) spawn("open", [url], { stdio: "ignore", detached: true }).on("error", () => {}).unref();
  }).finally(() => server.close());
  const t = await tokenRequest(client, { code, code_verifier: verifier, grant_type: "authorization_code", redirect_uri: redirectUri });
  if (!t.refresh_token) throw new Error("Google returned no refresh token; remove the app at myaccount.google.com/permissions and run --auth again");
  writeSecret(TOKEN_FILE, { refresh_token: t.refresh_token, access_token: t.access_token, expires_at: Date.now() + (t.expires_in ?? 3600) * 1000, scope: t.scope, client_id: client.clientId });
  console.log(`Signed in. Token saved to ${TOKEN_FILE} (mode 600). Scopes: ${t.scope}`);
}

let tok = null;
async function accessToken() {
  if (!tok) {
    if (!existsSync(TOKEN_FILE)) throw new Error(`not signed in: run node tools/youtube_upload.mjs --auth${CH}`);
    tok = JSON.parse(readFileSync(TOKEN_FILE, "utf8"));
  }
  if (tok.access_token && tok.expires_at > Date.now() + 60_000) return tok.access_token;
  const t = await tokenRequest(loadClient(), { refresh_token: tok.refresh_token, grant_type: "refresh_token" });
  tok = { ...tok, access_token: t.access_token, expires_at: Date.now() + (t.expires_in ?? 3600) * 1000 };
  writeSecret(TOKEN_FILE, tok);
  return tok.access_token;
}

// ---------- HTTP with retries ----------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const RETRY = new Set([500, 502, 503, 504]);

/** fetch with the bearer token; retries network errors and 5xx with backoff. Returns the Response. */
async function call(url, init = {}, op = null, tries = 6) {
  for (let i = 0; ; i++) {
    try {
      const r = await fetch(url, { ...init, headers: { ...init.headers, Authorization: `Bearer ${await accessToken()}` } });
      if (r.status === 401 && i === 0) { tok.expires_at = 0; continue; }
      if (!RETRY.has(r.status) || i >= tries) { if (op) spend(op); return r; }
    } catch (e) {
      if (i >= tries) throw e;
      console.warn(`  network error (${e.cause?.code ?? e.message}), retrying`);
    }
    await sleep(Math.min(60_000, 1000 * 2 ** i + Math.floor(Math.random() * 500)));
  }
}
async function json(r, what) {
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`${what} failed: ${r.status} ${j.error?.errors?.[0]?.reason ?? ""} ${j.error?.message ?? ""}`.trim());
  return j;
}

// ---------- --check ----------
async function check() {
  const j = await json(await call(`${API}/channels?part=snippet,statistics,status&mine=true`, {}, "channels.list"), "channels.list");
  if (!j.items?.length) { console.log("Signed in, but this Google account has no YouTube channel."); return; }
  for (const c of j.items) {
    console.log(`Channel: ${c.snippet.title}  (${c.id}${c.snippet.customUrl ? `, ${c.snippet.customUrl}` : ""})`);
    console.log(`  videos ${c.statistics.videoCount}, subscribers ${c.statistics.hiddenSubscriberCount ? "hidden" : c.statistics.subscriberCount}, made for kids by default: ${c.status?.madeForKids ?? "not set"}`);
  }
  const used = spentToday();
  console.log(`Quota today (${quotaDay(Date.now())}, Pacific): ${used} of ${DAILY_QUOTA} units used by this tool; room for ${Math.floor((DAILY_QUOTA - used) / (QUOTA["videos.insert"] + QUOTA["thumbnails.set"] + QUOTA["playlistItems.insert"]))} more uploads.`);
  console.log("  (The API does not report usage; the Cloud console's Quotas page shows the project's true total.)");
}

// ---------- the episode ----------
function registry() {
  try { return JSON.parse(readFileSync(REG_FILE, "utf8")); } catch { return null; }
}

/** Resolve an episode folder or a Toy Box episode id (via episodes.json render locations) to a folder. */
function episodeDir(arg) {
  if (existsSync(arg) && statSync(arg).isDirectory()) return resolve(arg);
  const reg = registry();
  const e = reg?.episodes?.[arg];
  if (!e?.render) throw new Error(`${arg}: not a folder, and episodes.json has no render location for it`);
  const [root, rest] = e.render.includes(":") ? e.render.split(/:(.*)/s) : ["out", e.render];
  const base = reg.roots[root];
  return resolve(isAbsolute(base) ? base : join(REPO, base), rest);
}

function plan(dir) {
  const files = readdirSync(dir);
  const ytFile = join(dir, "youtube.txt");
  if (!existsSync(ytFile)) throw new Error(`${dir}: no youtube.txt`);
  const parsed = parseYoutubeTxt(readFileSync(ytFile, "utf8"));
  if (!parsed.madeForKids) throw new Error(`youtube.txt AUDIENCE is "${parsed.audience}", but every upload must be Made for kids`);
  const { tags, dropped } = fitTags(parsed.tags);
  const meta = { ...parsed, tags };
  const problems = validateMeta(meta);
  if (problems.length) throw new Error(`youtube.txt: ${problems.join("; ")}`);
  const video = opt.video ? resolve(opt.video) : join(dir, "final_4k60.mp4");
  if (!existsSync(video)) throw new Error(`no video at ${video}`);
  const thumbName = opt.thumb ? null : pickThumbnail(files);
  const thumb = opt.thumb ? resolve(opt.thumb) : thumbName ? join(dir, thumbName) : null;
  if (thumb && !existsSync(thumb)) throw new Error(`no thumbnail at ${thumb}`);
  if (thumb && statSync(thumb).size > 2 * 1024 * 1024) throw new Error(`thumbnail ${thumb} is over YouTube's 2 MB limit`);
  if (opt.privacy && !PRIVACY.includes(opt.privacy)) throw new Error(`--privacy must be one of ${PRIVACY.join(", ")}`);
  if (opt["publish-at"] && opt.privacy && opt.privacy !== "private") throw new Error("--publish-at keeps the video private until then; drop --privacy");
  const publishAt = opt["publish-at"] ? parsePublishAt(opt["publish-at"], Date.now()) : null;
  const body = buildInsertBody(meta, { privacy: opt.privacy, publishAt, language: opt.language });
  const id = episodeIdFromDir(basename(dir));
  const sidecar = join(dir, "youtube_upload.json");
  const prior = (existsSync(sidecar) && JSON.parse(readFileSync(sidecar, "utf8")).videoId) || registry()?.episodes?.[id]?.youtube?.videoId || null;
  const playlist = choosePlaylist({ explicit: opt.playlist, noPlaylist: opt["no-playlist"], channel: opt.channel, audience: parsed.audience });
  return { dir, id, meta, dropped, playlist, body, video, size: statSync(video).size, thumb, sidecar, prior, notify: !opt["no-notify"] };
}

function show(p) {
  const s = buildResumableStart(p.body, p.size, p.notify);
  const cost = QUOTA["videos.insert"] + (p.thumb ? QUOTA["thumbnails.set"] : 0) + (p.playlist ? QUOTA["playlistItems.insert"] + (isPlaylistId(p.playlist.id) ? 0 : QUOTA["playlists.list"]) : 0);
  console.log(`Episode:    ${p.id ?? "–"}  ${p.dir}`);
  console.log(`Video:      ${p.video}  (${humanSize(p.size)}, ${p.size} bytes, resumable in ${humanSize(CHUNK)} chunks)`);
  console.log(`Thumbnail:  ${p.thumb ? `${p.thumb}  (${humanSize(statSync(p.thumb).size)})` : "none (YouTube picks a frame)"}`);
  console.log(`Playlist:   ${p.playlist ? `${p.playlist.title ? `${p.playlist.title} (${p.playlist.id})` : p.playlist.id}${p.playlist.auto ? ", the grade playlist" : ""}${isPlaylistId(p.playlist.id) ? "" : "  (title: looked up with playlists.list)"}` : "none"}`);
  console.log(`Privacy:    ${p.body.status.privacyStatus}${p.body.status.publishAt ? `, scheduled to go public at ${p.body.status.publishAt}` : ""}`);
  console.log(`Audience:   Made for kids (selfDeclaredMadeForKids: true), category ${p.body.snippet.categoryId} Education`);
  if (p.dropped.length) console.log(`Tags dropped to fit 500 characters: ${p.dropped.join(", ")}`);
  if (p.prior) console.log(`ALREADY UPLOADED as ${p.prior}; this run would refuse without --force.`);
  console.log(`Quota:      about ${cost} units (${spentToday()} of ${DAILY_QUOTA} spent today by this tool)`);
  console.log(`\n${s.method} ${s.url}`);
  for (const [k, v] of Object.entries(s.headers)) console.log(`${k}: ${v}`);
  console.log(`\n${JSON.stringify(p.body, null, 2)}`);
}

// ---------- resumable upload ----------
async function uploadVideo(p) {
  mkdirSync(RESUME_DIR, { recursive: true, mode: 0o700 });
  const st = statSync(p.video);
  const key = createHash("sha1").update(`${p.video}|${st.size}|${st.mtimeMs}`).digest("hex").slice(0, 16);
  const stateFile = join(RESUME_DIR, `${key}.json`);
  let session = null;
  if (existsSync(stateFile)) {
    const s = JSON.parse(readFileSync(stateFile, "utf8"));
    if (Date.now() - s.created < 6 * 86400_000) { session = s.uri; console.log("Resuming an earlier upload session."); }
  }
  if (!session) {
    const s = buildResumableStart(p.body, p.size, p.notify);
    const r = await call(s.url, { method: s.method, headers: s.headers, body: s.body }, "videos.insert");
    if (!r.ok) await json(r, "starting the upload");
    session = r.headers.get("location");
    if (!session) throw new Error("upload session started without a Location header");
    writeSecret(stateFile, { uri: session, created: Date.now(), video: p.video });
  }
  const status = async () => {
    const r = await call(session, { method: "PUT", headers: { "Content-Length": "0", "Content-Range": `bytes */${p.size}` } });
    if (r.status === 200 || r.status === 201) return { done: await r.json() };
    if (r.status === 308) return { offset: nextOffset(r.headers.get("range")) };
    if (r.status === 404 || r.status === 410) { rmSync(stateFile, { force: true }); throw new Error("the upload session expired; run the command again to start over"); }
    await json(r, "upload status");
    return { offset: 0 };
  };
  let { offset = 0, done } = await status();
  const fd = openSync(p.video, "r");
  const t0 = Date.now(), start = offset;
  try {
    while (!done) {
      const end = Math.min(offset + CHUNK, p.size);
      const buf = Buffer.allocUnsafe(end - offset);
      readSync(fd, buf, 0, buf.length, offset);
      let r = null;
      try {
        r = await fetch(session, { method: "PUT", headers: { Authorization: `Bearer ${await accessToken()}`, "Content-Length": String(buf.length), "Content-Range": contentRange(offset, end, p.size) }, body: buf });
      } catch (e) { console.warn(`  connection dropped at ${humanSize(offset)} (${e.cause?.code ?? e.message}), resuming`); }
      if (r && (r.status === 200 || r.status === 201)) { done = await r.json(); break; }
      if (r && r.status === 308) offset = nextOffset(r.headers.get("range"));
      else {
        if (r && !RETRY.has(r.status) && r.status !== 401) await json(r, "uploading a chunk");
        await sleep(5000);
        ({ offset = offset, done } = await status());
      }
      const rate = (offset - start) / Math.max(1, (Date.now() - t0) / 1000);
      process.stdout.write(`  ${((offset / p.size) * 100).toFixed(1)}%  ${humanSize(offset)} of ${humanSize(p.size)}  ${humanSize(rate)}/s\n`);
    }
  } finally { closeSync(fd); }
  rmSync(stateFile, { force: true });
  return done;
}

async function setThumbnail(videoId, file) {
  const type = /\.png$/i.test(file) ? "image/png" : "image/jpeg";
  const r = await call(`https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${videoId}&uploadType=media`, { method: "POST", headers: { "Content-Type": type }, body: readFileSync(file) }, "thumbnails.set");
  await json(r, "thumbnails.set");
}

async function playlistId(arg) {
  if (isPlaylistId(arg)) return arg;
  const all = [];
  let page = "";
  do {
    const j = await json(await call(`${API}/playlists?part=snippet&mine=true&maxResults=50${page ? `&pageToken=${page}` : ""}`, {}, "playlists.list"), "playlists.list");
    all.push(...j.items);
    page = j.nextPageToken ?? "";
  } while (page);
  const hit = all.filter((pl) => pl.snippet.title === arg);
  if (hit.length !== 1) throw new Error(`playlist "${arg}" ${hit.length ? "matches several" : "not found"}; channel playlists: ${all.map((pl) => `${pl.snippet.title} (${pl.id})`).join(", ") || "none"}`);
  return hit[0].id;
}

function record(p, video, extra) {
  const rec = { videoId: video.id, url: `https://youtu.be/${video.id}`, title: video.snippet?.title, privacy: video.status?.privacyStatus, publishAt: video.status?.publishAt ?? null, uploadedAt: new Date().toISOString(), ...extra };
  try { writeFileSync(p.sidecar, `${JSON.stringify(rec, null, 1)}\n`); } catch (e) { console.warn(`warning: could not write ${p.sidecar}: ${e.message}`); }
  const reg = registry();
  if (p.id && reg?.episodes?.[p.id]) {
    reg.episodes[p.id].youtube = rec;
    writeFileSync(REG_FILE, `${JSON.stringify(reg, null, 1)}\n`);
    const r = spawnSync(process.execPath, [join(REPO, "engine3d/tools/episodes.mjs"), "--set", p.id, "uploaded"], { stdio: "inherit" });
    if (r.status) console.warn("warning: episodes.mjs --set failed; the video id is in episodes.json but the status may be stale");
  }
}

async function upload(arg) {
  const p = plan(episodeDir(arg));
  show(p);
  if (opt["dry-run"]) { console.log("\nDry run: nothing was sent."); return; }
  if (p.prior && !opt.force) throw new Error(`already uploaded as ${p.prior} (https://youtu.be/${p.prior}); pass --force to upload again`);
  if (!opt.yes) {
    if (!process.stdin.isTTY) throw new Error("not a terminal: pass --yes once the upload is approved");
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const a = await rl.question(`\nUpload this as ${p.body.status.privacyStatus}? Type yes: `);
    rl.close();
    if (a.trim().toLowerCase() !== "yes") { console.log("Not uploaded."); return; }
  }
  const me = await json(await call(`${API}/channels?part=snippet&mine=true`, {}, "channels.list"), "channels.list");
  console.log(`Channel:    ${me.items?.[0]?.snippet?.title ?? "none"} (${me.items?.[0]?.id ?? "–"})`);
  const plId = p.playlist ? await playlistId(p.playlist.id) : null; // fail before the long upload, not after
  console.log(`\nUploading ${humanSize(p.size)}…`);
  const video = await uploadVideo(p);
  console.log(`Uploaded: https://youtu.be/${video.id}  (${video.status?.privacyStatus}, made for kids: ${video.status?.selfDeclaredMadeForKids})`);
  const extra = { thumbnail: null, playlist: null };
  if (p.thumb) {
    try { await setThumbnail(video.id, p.thumb); extra.thumbnail = basename(p.thumb); console.log(`Thumbnail set: ${basename(p.thumb)}`); }
    catch (e) { console.warn(`warning: ${e.message} (custom thumbnails need a phone-verified channel)`); }
  }
  if (plId) {
    try { await json(await call(`${API}/playlistItems?part=snippet`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(buildPlaylistItem(plId, video.id)) }, "playlistItems.insert"), "playlistItems.insert"); extra.playlist = plId; console.log(`Added to playlist ${plId}`); }
    catch (e) { console.warn(`warning: ${e.message}`); }
  }
  record(p, video, extra);
  console.log(`Recorded in ${p.sidecar}${p.id ? ` and episodes.json (${p.id})` : ""}.`);
}

// ---------- main ----------
try {
  if (opt.auth) await signIn();
  else if (opt.check) await check();
  else if (opt._.length === 1) await upload(opt._[0]);
  else { console.log(readFileSync(fileURLToPath(import.meta.url), "utf8").split("\n").slice(1, 18).map((l) => l.replace(/^\/\/ ?/, "")).join("\n")); process.exit(opt._.length ? 1 : 0); }
} catch (e) {
  console.error(`error: ${e.message}`);
  process.exit(1);
}
