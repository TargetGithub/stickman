// Pure helpers for tools/youtube_upload.mjs: read an episode's youtube.txt, build the YouTube Data API v3
// request bodies, validate them against YouTube's limits, and count quota. No I/O, no network, so the unit
// tests (tests/unit/youtube_upload.test.js) cover everything that decides what gets sent.

/** API quota costs in units (YouTube Data API v3 quota calculator). The default project quota is 10,000 a day. */
export const QUOTA = { "videos.insert": 1600, "thumbnails.set": 50, "playlistItems.insert": 50, "playlists.list": 1, "channels.list": 1, "videos.list": 1 };
export const DAILY_QUOTA = 10000;
export const CATEGORY_EDUCATION = "27";
export const PRIVACY = ["private", "unlisted", "public"];
export const SCOPES = ["https://www.googleapis.com/auth/youtube.upload", "https://www.googleapis.com/auth/youtube"];

/**
 * Parse a youtube.txt written by engine3d/tools/episode3d.mjs:
 *   TITLE: …  /  DESCRIPTION: (block)  /  Skills: …  /  TAGS: a, b  /  AUDIENCE: Made for kids (grade1). Length 6:14.
 * The internal "Skills:" line is dropped from the description. Unknown text before TAGS stays in the description.
 * @param {string} text
 * @returns {{ title:string, description:string, tags:string[], audience:string|null, madeForKids:boolean, skills:string[] }}
 */
export function parseYoutubeTxt(text) {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  let title = "", tags = [], audience = null, skills = [];
  const desc = [];
  let inDesc = false;
  for (const line of lines) {
    let m;
    if ((m = /^TITLE:\s*(.*)$/.exec(line))) { title = m[1].trim(); inDesc = false; continue; }
    if (/^DESCRIPTION:\s*$/.test(line)) { inDesc = true; continue; }
    if ((m = /^DESCRIPTION:\s*(.+)$/.exec(line))) { inDesc = true; desc.push(m[1]); continue; }
    if ((m = /^TAGS:\s*(.*)$/.exec(line))) { tags = m[1].split(",").map((t) => t.trim()).filter(Boolean); inDesc = false; continue; }
    if ((m = /^AUDIENCE:\s*(.*)$/.exec(line))) { audience = m[1].trim(); inDesc = false; continue; }
    if ((m = /^Skills:\s*(.*)$/.exec(line))) { skills = m[1].split(",").map((t) => t.trim()).filter(Boolean); continue; }
    if (inDesc) desc.push(line);
  }
  const description = desc.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  if (!title) throw new Error("youtube.txt has no TITLE: line");
  return { title, description, tags: [...new Set(tags)], audience, madeForKids: audience == null || /made for kids/i.test(audience), skills };
}

/** Characters YouTube counts for a tag list: tags joined by commas, a tag with a space counts its two quotes. */
export function tagsLength(tags) {
  return tags.reduce((n, t, i) => n + t.length + (/\s/.test(t) ? 2 : 0) + (i ? 1 : 0), 0);
}

/** Keep tags in order while they fit YouTube's 500-character limit. Returns { tags, dropped }. */
export function fitTags(tags, limit = 500) {
  const kept = [], dropped = [];
  for (const t of tags) {
    if (t.length > 100 || /[<>]/.test(t) || tagsLength([...kept, t]) > limit) dropped.push(t);
    else kept.push(t);
  }
  return { tags: kept, dropped };
}

/**
 * Check metadata against YouTube's limits. Returns a list of problems (empty when it can be sent).
 * @param {{ title:string, description:string, tags:string[] }} meta
 */
export function validateMeta(meta) {
  const out = [];
  if (!meta.title) out.push("title is empty");
  if ([...meta.title].length > 100) out.push(`title is ${[...meta.title].length} characters (max 100)`);
  if (/[<>]/.test(meta.title)) out.push("title contains < or >");
  if (Buffer.byteLength(meta.description, "utf8") > 5000) out.push(`description is ${Buffer.byteLength(meta.description, "utf8")} bytes (max 5000)`);
  if (/[<>]/.test(meta.description)) out.push("description contains < or >");
  if (tagsLength(meta.tags) > 500) out.push(`tags are ${tagsLength(meta.tags)} characters (max 500)`);
  return out;
}

/**
 * Parse --publish-at into an ISO 8601 UTC string that is in the future. Accepts anything Date can read,
 * but a time without a zone is refused so a schedule is never off by hours.
 * @param {string} s
 * @param {number} now  ms since epoch (injected so tests stay deterministic)
 */
export function parsePublishAt(s, now) {
  if (!/(Z|[+-]\d\d:?\d\d)$/i.test(s.trim())) throw new Error(`--publish-at needs a time zone, e.g. 2026-11-10T16:00:00-08:00 or …Z (got ${s})`);
  const t = Date.parse(s);
  if (Number.isNaN(t)) throw new Error(`--publish-at: cannot read ${s}`);
  if (t <= now + 60_000) throw new Error(`--publish-at ${s} is not in the future`);
  return new Date(t).toISOString();
}

/**
 * The videos.insert resource (part=snippet,status). Every upload is Made for kids, category Education.
 * A scheduled video must be private until publishAt, so publishAt forces privacyStatus "private".
 * @param {{ title:string, description:string, tags:string[] }} meta
 * @param {{ privacy?:string, publishAt?:string|null, language?:string }} [o]
 */
export function buildInsertBody(meta, o = {}) {
  const privacy = o.publishAt ? "private" : (o.privacy ?? "private");
  if (!PRIVACY.includes(privacy)) throw new Error(`privacy must be one of ${PRIVACY.join(", ")}`);
  const lang = o.language ?? "en";
  return {
    snippet: { title: meta.title, description: meta.description, tags: meta.tags, categoryId: CATEGORY_EDUCATION, defaultLanguage: lang, defaultAudioLanguage: lang },
    status: { privacyStatus: privacy, selfDeclaredMadeForKids: true, embeddable: true, license: "youtube", ...(o.publishAt ? { publishAt: o.publishAt } : {}) },
  };
}

/** The resumable-session start request (no network: just what fetch would get). */
export function buildResumableStart(body, size, notifySubscribers = true) {
  const q = new URLSearchParams({ uploadType: "resumable", part: "snippet,status", notifySubscribers: String(notifySubscribers) });
  return {
    url: `https://www.googleapis.com/upload/youtube/v3/videos?${q}`,
    method: "POST",
    headers: { "Content-Type": "application/json; charset=UTF-8", "X-Upload-Content-Length": String(size), "X-Upload-Content-Type": "video/mp4" },
    body: JSON.stringify(body),
  };
}

/** Next byte to send after a 308 reply's Range header ("bytes=0-1234" → 1235; none → 0). */
export function nextOffset(rangeHeader) {
  const m = /bytes=0-(\d+)/.exec(rangeHeader ?? "");
  return m ? Number(m[1]) + 1 : 0;
}

/** Content-Range for one chunk [start, end) of a file of size total. */
export function contentRange(start, end, total) {
  return `bytes ${start}-${end - 1}/${total}`;
}

/** The playlistItems.insert body. */
export function buildPlaylistItem(playlistId, videoId) {
  return { snippet: { playlistId, resourceId: { kind: "youtube#video", videoId } } };
}

/** A playlist argument that is already an id (PL…, 34 chars typical) rather than a title. */
export const isPlaylistId = (s) => /^(PL|UU|FL|OL)[A-Za-z0-9_-]{10,}$/.test(s);

/** The day YouTube quota is counted in (it resets at midnight Pacific time), as YYYY-MM-DD. */
export function quotaDay(ms) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(ms));
}

/** The OAuth consent URL (installed-app flow with PKCE S256). */
export function buildAuthUrl({ clientId, authUri, redirectUri, state, challenge }) {
  const q = new URLSearchParams({
    client_id: clientId, redirect_uri: redirectUri, response_type: "code", scope: SCOPES.join(" "),
    access_type: "offline", prompt: "consent", include_granted_scopes: "true", state, code_challenge: challenge, code_challenge_method: "S256",
  });
  return `${authUri ?? "https://accounts.google.com/o/oauth2/v2/auth"}?${q}`;
}

/**
 * Grade playlists that already exist on each channel, by the youtube.txt AUDIENCE grade. An upload with
 * --channel toybox goes into its grade's playlist unless --playlist or --no-playlist says otherwise.
 * Babies and K have no playlist yet.
 */
export const GRADE_PLAYLISTS = {
  toybox: {
    prek: { id: "PLc6zxJ3eah1I", title: "PreK Videos" },
    grade1: { id: "PLOorLwUSShGE", title: "Grade1 Videos" },
    grade2: { id: "PLfGKdlTpWUvM", title: "Grade2 Videos" },
    grade3: { id: "PLBP5gBqJoF0g", title: "Grade3 Videos" },
    grade4: { id: "PLBfTn8qbW6OE", title: "Grade4 Videos" },
    grade5: { id: "PLe7C64XuQHUQ", title: "Grade5 Videos" },
  },
};

/** The grade inside a youtube.txt AUDIENCE line: "Made for kids (grade1). Length 6:14." → "grade1". */
export function audienceGrade(audience) {
  return /\(([a-z0-9]+)\)/i.exec(audience ?? "")?.[1]?.toLowerCase() ?? null;
}

/** The playlist an upload goes into: an explicit --playlist wins, then the channel's grade playlist. */
export function choosePlaylist({ explicit, noPlaylist, channel, audience }) {
  if (noPlaylist) return null;
  if (explicit) return { id: explicit, title: null, auto: false };
  const hit = GRADE_PLAYLISTS[channel]?.[audienceGrade(audience)];
  return hit ? { ...hit, auto: true } : null;
}

/** Episode id from an episode folder name: "g101_short_vowel_island" → "g101". */
export function episodeIdFromDir(name) {
  const m = /^([a-z]+\d+)_/.exec(name);
  return m ? m[1] : null;
}

/** Pick the thumbnail: thumbnail.jpg wins, else the only designed thumbnail_*.jpg (not _old, not a sheet). */
export function pickThumbnail(files) {
  if (files.includes("thumbnail.jpg")) return "thumbnail.jpg";
  const designed = files.filter((f) => /^thumbnail_.+\.(jpe?g|png)$/i.test(f) && !/_old\./i.test(f)).sort();
  return designed.length === 1 ? designed[0] : null;
}

/** Human size: 1077873639 → "1.00 GiB". */
export function humanSize(n) {
  const u = ["B", "KiB", "MiB", "GiB"];
  let i = 0;
  while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(i ? 2 : 0)} ${u[i]}`;
}
