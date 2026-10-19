#!/usr/bin/env node
// Copy-paste workflow for any chat UI (ChatGPT, Claude.ai, Gemini, Copilot, a local chat app ...).
// No API key, no network: this tool only writes prompts and checks the replies you paste back.
//
//   node tools/manual.mjs prompt --premise "A tiny ninja vs a giant robot" [--format portrait] [--length 30] [--tone comedic] [--copy]
//       → out/manual/prompt.md: paste it into a new chat
//   node tools/manual.mjs check <reply.txt | -> [--paste] [--render] [--copy]
//       → validates the reply. Valid: saves out/scripts/<slug>.json (and renders with --render).
//         Invalid: writes out/manual/fix_prompt.md: paste it into the same chat, then check again.
//   node tools/manual.mjs ideas [--count 5] [--tone T] [--format F] [--copy]   → premise brainstorm prompt
//   node tools/manual.mjs critique <script.json> [--copy]   → contact_sheet.png + critique prompt (attach the image)
//   node tools/manual.mjs meta <script.json> [--copy]       → YouTube title/description/tags prompt
//
// Stories and fight videos, two stages (STORY_SPEC 18): the outline in one chat, then each scene (a new chat
// per scene is fine; send fix prompts to the scene's own chat). State lives in out/manual/story/.
//   story-outline --premise "..." [--fight] [--length S] [--audience kids|general] [--format F]  → outline_prompt.md
//   check-outline <reply | --paste>     → saves the outline, or writes fix_prompt.md
//   story-scene N                       → scene_N_prompt.md (needs scenes 1..N-1 checked)
//   check-scene N <reply | --paste>     → saves scene N, or writes fix_prompt.md
//   extend N                            → a prompt asking scene N's chat to make it longer
//   assemble [--render]                 → out/scripts/<slug>.json with its score and length
//
// --copy puts the prompt on the clipboard; --paste reads the reply from the clipboard (macOS pbcopy/
// pbpaste, Windows clip, Linux xclip/wl-copy). Output folder: --out (default out).
//
// --lean (prompt, check, story-outline; CATALOG_SPEC 7.3): short prompts for a chat project that has the
// catalog pack as project knowledge (npm run catalog:pack; docs/USER_GUIDE.md 7.6). They name the pack
// version from catalog/manifest.json; a story keeps the mode for all its commands (--full switches back).

import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { randomInt } from "node:crypto";
import { catalog as baseCatalog } from "../catalog/index.js";
import { catalogFromArgs } from "./lib/bundle_args.mjs";
import { createEngine } from "../engine/index.js";
import { manualWritePrompt, manualIdeasPrompt, manualCritiquePrompt, manualMetadataPrompt, checkReply } from "./lib/manual.mjs";
import { loadHistory, avoidList } from "./lib/history.mjs";
import { manualOutlinePrompt, checkOutlineReply, manualScenePrompt, checkSceneReply, manualExtendPrompt, assembleManual } from "./lib/manual_story.mjs";
import { MIN_LENGTH } from "./lib/story_prompts.mjs";
import { packVersion, withBundleLine } from "./lib/lean_prompts.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const { args: argv, catalog, bundles } = await catalogFromArgs(process.argv.slice(2), baseCatalog); // --bundle <dir|zip>, repeatable
const [cmd, ...args] = argv;
const opt = (name, dflt) => (args.includes(name) ? args[args.indexOf(name) + 1] : dflt);
const flag = (name) => args.includes(name);
const positional = (skip = 0) => args.filter((a, i) => (a === "-" || !a.startsWith("--")) && !/^--(premise|format|length|tone|count|out|slug|audience)$/.test(args[i - 1] || ""))[skip];
const OUT = opt("--out", "out");
const DIR = join(OUT, "manual");

function copy(text) {
  const tries = process.platform === "darwin" ? [["pbcopy", []]] : process.platform === "win32" ? [["clip", []]] : [["wl-copy", []], ["xclip", ["-selection", "clipboard"]]];
  for (const [c, a] of tries) if (spawnSync(c, a, { input: text }).status === 0) return true;
  return false;
}
function paste() {
  const tries = process.platform === "darwin" ? [["pbpaste", []]] : process.platform === "win32" ? [["powershell", ["-command", "Get-Clipboard"]]] : [["wl-paste", []], ["xclip", ["-selection", "clipboard", "-o"]]];
  for (const [c, a] of tries) {
    const r = spawnSync(c, a, { encoding: "utf8" });
    if (r.status === 0) return r.stdout;
  }
  throw new Error("could not read the clipboard; save the reply to a file and pass its path");
}

function emit(file, text, what) {
  // Lean prompts name the attached bundle packs and the "bundles" line (CATALOG_BUNDLE_SPEC 10.3).
  if (bundles.length && text.startsWith("Use the Stickman catalog files")) text = withBundleLine(text, bundles);
  const path = join(DIR, file);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text);
  const copied = flag("--copy") && copy(text);
  console.log(`${what}: ${path} (${text.length} characters)${copied ? " — copied to the clipboard" : ""}`);
  return path;
}

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "video";
const format = opt("--format", "landscape");
const lean = () => (flag("--lean") ? packVersion() : null);
const warnVersion = (r) => r.versionWarning && console.log(`warning: ${r.versionWarning}`);
const length = Number(opt("--length", 30));

if (cmd === "prompt") {
  const text = opt("--premise", null);
  if (!text) {
    console.error('usage: node tools/manual.mjs prompt --premise "your idea" [--format portrait] [--length 30] [--tone comedic] [--copy]');
    process.exit(2);
  }
  const premise = { title: text.split(/[.!?]/)[0].slice(0, 60), logline: text, tone: opt("--tone", "any") };
  emit("prompt.md", manualWritePrompt(catalog, premise, { format, length, seed: randomInt(1, 2 ** 31 - 1), lean: lean() }), flag("--lean") ? "lean prompt" : "prompt");
  console.log(`Next: paste it into a new chat${flag("--lean") ? " in the project with the catalog pack" : ""}. Save the reply (or copy it) and run:\n  node tools/manual.mjs check --paste${flag("--lean") ? " --lean" : ""}      (or: check reply.txt)`);
} else if (cmd === "ideas") {
  const count = Number(opt("--count", 5));
  emit("ideas_prompt.md", manualIdeasPrompt(catalog, { count, tone: opt("--tone", null), format, length }, avoidList(loadHistory(join(OUT, "history.json")))), "ideas prompt");
  console.log('Next: paste it into a chat, pick a premise you like, then: node tools/manual.mjs prompt --premise "<its logline>"');
} else if (cmd === "check") {
  const src = flag("--paste") ? null : positional();
  if (!flag("--paste") && !src) {
    console.error("usage: node tools/manual.mjs check <reply.txt | -> [--render]   or   check --paste");
    process.exit(2);
  }
  const text = flag("--paste") ? paste() : src === "-" ? readFileSync(0, "utf8") : readFileSync(src, "utf8");
  const r = checkReply(text, catalog, { lean: lean() });
  console.log(r.ok ? `VALID. ${r.message}` : `NOT VALID YET. ${r.message}`);
  warnVersion(r);
  if (r.result) for (const i of [...r.result.errors, ...r.result.warnings]) console.log(`  ${i.code} at ${i.path || "(root)"}: ${i.message}`);
  if (!r.ok) {
    emit("fix_prompt.md", r.fixPrompt, "fix prompt");
    console.log("Next: paste the fix prompt into the SAME chat, then check the new reply.");
    process.exit(1);
  }
  let slug = opt("--slug", null) || slugify(r.script.meta.title);
  for (let i = 2; !opt("--slug", null) && existsSync(join(OUT, "scripts", `${slug}.json`)); i++) slug = `${slugify(r.script.meta.title)}-${i}`;
  const path = join(OUT, "scripts", `${slug}.json`);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(r.script, null, 2) + "\n");
  console.log(`saved: ${path}`);
  if (flag("--render")) {
    const rec = spawnSync(process.execPath, [join(HERE, "record.mjs"), path, "--out-dir", OUT, "--slug", slug], { stdio: "inherit" });
    process.exit(rec.status ?? 1);
  }
  console.log(`Next: preview it in the browser player (npm run serve, /web/player.html) or render it:\n  npm run record -- ${path}`);
} else if (cmd && (cmd.startsWith("story-") || ["check-outline", "check-scene", "extend", "assemble"].includes(cmd))) {
  await storyCommand();
} else if (cmd === "critique" || cmd === "meta") {
  const file = positional();
  if (!file) {
    console.error(`usage: node tools/manual.mjs ${cmd} <script.json> [--copy]`);
    process.exit(2);
  }
  const script = JSON.parse(readFileSync(file, "utf8"));
  const engine = createEngine({ catalog });
  const loaded = engine.load(script);
  if (!loaded.ok) {
    console.error(`the script is not valid; run: node tools/validate.mjs ${file}`);
    process.exit(1);
  }
  if (cmd === "meta") {
    emit("meta_prompt.md", manualMetadataPrompt(script, opt("--premise", null), loaded.timeline), "metadata prompt");
  } else {
    const { loadBackend } = await import("./lib/canvas.mjs");
    const { contactSheet } = await import("./lib/review_images.mjs");
    const backend = await loadBackend();
    mkdirSync(DIR, { recursive: true });
    const png = join(DIR, "contact_sheet.png");
    await backend.savePng(contactSheet(engine, backend), png);
    console.log(`image: ${png}`);
    emit("critique_prompt.md", manualCritiquePrompt(script, loaded.timeline), "critique prompt");
    console.log("Next: attach the image and paste the prompt into a chat that accepts images. Paste its notes into the writing chat and ask it to apply them.");
  }
} else {
  console.error("usage: node tools/manual.mjs <prompt|check|ideas|critique|meta|story-outline|check-outline|story-scene|check-scene|extend|assemble> ...  (see the header of tools/manual.mjs or docs/USER_GUIDE.md)");
  process.exit(2);
}

/** The story commands (S8.3). State: out/manual/story/{state.json, outline.json, scenes/NN.json}. */
async function storyCommand() {
  const SDIR = join(DIR, "story");
  const file = (name) => join(SDIR, name);
  const readJson = (name) => (existsSync(file(name)) ? JSON.parse(readFileSync(file(name), "utf8")) : null);
  const save = (name, obj) => {
    mkdirSync(dirname(file(name)), { recursive: true });
    writeFileSync(file(name), JSON.stringify(obj, null, 2) + "\n");
  };
  const reply = (skip) => (flag("--paste") ? paste() : positional(skip) === "-" ? readFileSync(0, "utf8") : readFileSync(positional(skip), "utf8"));
  const state = readJson("state.json");
  // The lean mode is chosen at story-outline and kept for the story; --lean or --full on a later command wins.
  const opts = state && { ...state, lean: (flag("--lean") || state.lean) && !flag("--full") ? packVersion() : null };
  const outline = readJson("outline.json");
  const sceneFile = (i) => `scenes/${String(i + 1).padStart(2, "0")}.json`;
  const scenes = outline ? outline.scenes.map((_, i) => readJson(sceneFile(i))) : [];
  const need = (what, ok) => {
    if (!ok) {
      console.error(`${what} first (see: node tools/manual.mjs story-outline --premise "...")`);
      process.exit(2);
    }
  };
  const sceneNumber = () => {
    const n = Number(positional(0));
    need("a scene number from 1 to " + (outline?.scenes.length ?? "N"), outline && Number.isInteger(n) && n >= 1 && n <= outline.scenes.length);
    return n - 1;
  };

  if (cmd === "story-outline") {
    const text = opt("--premise", null);
    if (!text) {
      console.error('usage: node tools/manual.mjs story-outline --premise "your idea" [--fight] [--length S] [--audience kids|general] [--format F] [--copy]');
      process.exit(2);
    }
    const kind = flag("--fight") ? "fight" : "story";
    const st = { premise: { title: text.split(/[.!?]/)[0].slice(0, 60), logline: text }, kind, minLength: Number(opt("--length", MIN_LENGTH[kind])), format, audience: opt("--audience", "kids"), seed: randomInt(1, 2 ** 31 - 1), lean: flag("--lean") };
    save("state.json", st);
    // A new story: forget the previous outline and its scenes.
    rmSync(file("scenes"), { recursive: true, force: true });
    rmSync(file("outline.json"), { force: true });
    emit("story/outline_prompt.md", manualOutlinePrompt(catalog, st.premise, { ...st, lean: lean() }), st.lean ? "lean outline prompt" : "outline prompt");
    console.log("Next: paste it into a new chat, save the reply, then: node tools/manual.mjs check-outline reply.txt   (or --paste)");
  } else if (cmd === "check-outline") {
    need("Run story-outline", state);
    const r = checkOutlineReply(reply(0), catalog, opts);
    console.log(r.ok ? r.message : `NOT VALID YET. ${r.message}`);
    warnVersion(r);
    for (const i of r.issues || []) console.log(`  - ${i}`);
    if (!r.ok) {
      emit("fix_prompt.md", r.fixPrompt, "fix prompt");
      console.log("Next: paste the fix prompt into the SAME chat, then check the new reply.");
      process.exit(1);
    }
    rmSync(file("scenes"), { recursive: true, force: true }); // scenes written for an older outline no longer fit
    save("outline.json", r.outline);
    console.log(`saved: ${file("outline.json")}\nNext: node tools/manual.mjs story-scene 1`);
  } else if (cmd === "story-scene") {
    need("Check an outline (check-outline)", state && outline);
    const i = sceneNumber();
    let text;
    try {
      text = manualScenePrompt(catalog, outline, scenes, i, opts);
    } catch (e) {
      console.error(`cannot write scene ${i + 1} yet: ${e.message}`);
      process.exit(1);
    }
    emit(`story/scene_${i + 1}_prompt.md`, text, `scene ${i + 1} (${outline.scenes[i].id}) prompt`);
    console.log(`Next: paste it into a chat, save the reply, then: node tools/manual.mjs check-scene ${i + 1} reply.txt   (or --paste)`);
  } else if (cmd === "check-scene") {
    need("Check an outline (check-outline)", state && outline);
    const i = sceneNumber();
    const r = checkSceneReply(reply(1), outline, scenes, i, catalog, opts);
    console.log(r.ok ? r.message : `NOT VALID YET. ${r.message}`);
    warnVersion(r);
    if (r.result && !r.ok) for (const e of r.result.errors) console.log(`  ${e.code} at ${e.path || "(root)"}: ${e.message}`);
    if (!r.ok) {
      emit("fix_prompt.md", r.fixPrompt, "fix prompt");
      console.log("Next: paste the fix prompt into the SAME chat as this scene, then check the new reply.");
      process.exit(1);
    }
    // This scene's own warnings (story-wide ones such as the length settle once every scene is in).
    for (const w of r.result.warnings.filter((x) => x.path.startsWith(`scenes[${i}]`))) console.log(`  warning ${w.code} at ${w.path}: ${w.message}`);
    save(sceneFile(i), r.scene);
    console.log(`saved: ${file(sceneFile(i))}`);
    console.log(i + 1 < outline.scenes.length ? `Next: node tools/manual.mjs story-scene ${i + 2}` : "Next: node tools/manual.mjs assemble");
  } else if (cmd === "extend") {
    need("Check an outline (check-outline)", state && outline);
    const i = sceneNumber();
    const a = assembleManual(outline, scenes, catalog, state);
    const secs = a.sceneSeconds?.[i]?.seconds ?? outline.scenes[i].seconds / 2;
    const extra = Math.max(10, ((state.minLength ?? MIN_LENGTH[state.kind]) * 1.08 - (a.result?.durationSec ?? 0)) / 2);
    emit(`story/extend_${i + 1}_prompt.md`, manualExtendPrompt(secs, secs + extra, opts.lean), `extend scene ${i + 1} prompt`);
    console.log(`Next: paste it into scene ${i + 1}'s chat, then: node tools/manual.mjs check-scene ${i + 1} reply.txt`);
  } else if (cmd === "assemble") {
    need("Check an outline (check-outline)", state && outline);
    const missing = scenes.map((sc, i) => (sc ? null : i + 1)).filter(Boolean);
    if (missing.length) {
      console.error(`scenes not checked yet: ${missing.join(", ")}`);
      process.exit(1);
    }
    const a = assembleManual(outline, scenes, catalog, state);
    console.log(a.ok ? a.message : `NOT VALID. ${a.message}`);
    if (!a.ok) process.exit(1);
    if (a.short) {
      const worst = a.sceneSeconds.map((s, i) => ({ i, gap: outline.scenes[i].seconds - s.seconds })).sort((x, y) => y.gap - x.gap).slice(0, 2);
      console.log(`It is short. Lengthen a scene or two: ${worst.map((w) => `node tools/manual.mjs extend ${w.i + 1}`).join("  /  ")}`);
    }
    console.log(`score parts: ${JSON.stringify(a.score.parts)}`);
    let slug = slugify(a.script.meta.title);
    for (let k = 2; existsSync(join(OUT, "scripts", `${slug}.json`)); k++) slug = `${slugify(a.script.meta.title)}-${k}`;
    const path = join(OUT, "scripts", `${slug}.json`);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, JSON.stringify(a.script, null, 2) + "\n");
    writeFileSync(join(OUT, "scripts", `${slug}.outline.json`), JSON.stringify(outline, null, 2) + "\n");
    console.log(`saved: ${path}`);
    if (flag("--render")) {
      const rec = spawnSync(process.execPath, [join(HERE, "record.mjs"), path, "--out-dir", OUT, "--slug", slug], { stdio: "inherit" });
      process.exit(rec.status ?? 1);
    }
    console.log(`Next: render it: npm run record -- ${path}`);
  }
}
