// Steps 12 (pixel hash) and 13 (render smoke and budget) of CATALOG_BUNDLE_SPEC 6.2, and the contact sheet
// of section 8. They need a canvas, so they run after checkBundle in hosts that have one: the Node tools
// (@napi-rs/canvas) and the import page. Browser-safe; `io` brings the canvas and the clock:
//   io.createCanvas(w, h)  a canvas with getContext("2d")
//   io.now()               milliseconds (performance.now)

import { createEngine } from "../../../engine/index.js";
import { computeJoints, lowestPoint } from "../../../engine/skeleton.js";
import { drawCharacter } from "../../../engine/renderer/character.js";
import { fillPose } from "../../../engine/pose.js";
import { showcaseScripts } from "./determinism.mjs";
import { moveScript, characterScript, faceScript, fxScript, placeScript, objectScript, activityScript } from "../../../web/lib/showcase_scripts.js";
import { catalogFragment, presetsOf } from "./layout.mjs";

/** A fast 32-bit FNV-1a over the RGBA words: pixel hashes are only compared within one run on one machine. */
function pixelHash(data) {
  const words = new Uint32Array(data.buffer, data.byteOffset, data.byteLength >> 2);
  let h = 0x811c9dc5;
  for (let i = 0; i < words.length; i++) h = Math.imul(h ^ words[i], 0x01000193);
  return (h >>> 0).toString(16).padStart(8, "0");
}

const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
/** Five frames spread over the script. */
const spread = (total) => [...new Set([0, 0.25, 0.5, 0.75, 1].map((f) => Math.min(total - 1, Math.round(f * (total - 1)))))];

/** Base scripts of the same kind, for the frame-time budget (13). */
function baselineFor(label, merged, look) {
  const kind = label.split(" ")[0];
  return {
    move: () => moveScript(merged, merged.moves.find((m) => m.name === "wave"), look),
    body: () => characterScript({ ...look, body: "buddy" }),
    face: () => faceScript(look, "happy"),
    fx: () => fxScript(merged, "sparkle", look),
    theme: () => placeScript(look, "city_park"),
    object: () => objectScript(merged, "bench", look),
    prop: () => objectScript(merged, "staff", look, true),
    activity: () => activityScript(merged, "dance_together", look),
  }[kind];
}

/** Render a script's frames in a fresh engine: { hashes, ms } (ms per frame), or throws. */
function renderRun(script, merged, io, frames, order) {
  const engine = createEngine({ catalog: merged, createCanvas: io.createCanvas });
  const r = engine.load(script);
  if (!r.ok) return null;
  const canvas = io.createCanvas(r.width, r.height);
  const ctx = canvas.getContext("2d");
  const pick = frames(r.totalFrames);
  const hashes = {};
  const ms = [];
  for (const n of order === "reverse" ? [...pick].reverse() : pick) {
    const t = io.now();
    engine.renderFrame(ctx, n);
    ms.push(io.now() - t);
    hashes[n] = pixelHash(ctx.getImageData(0, 0, r.width, r.height).data);
  }
  return { hashes, ms };
}

/**
 * @param {Array<{ label, file?, script }>} scripts  examples and showcase scripts (with the bundle pins)
 * @returns {{ issues: object[], report: { renders, slow } }}
 */
export function renderChecks(scripts, merged, io, { slowFactor = 1.5, slackMs = 4 } = {}) {
  const issues = [];
  const timings = {};
  const look = { body: "stickman", color: "#3fd8ff" };
  for (const { label, file, path = "", script } of scripts) {
    let a;
    let b;
    try {
      a = renderRun(script, merged, io, spread, "forward");
      if (!a) continue; // not a valid script: step 11 reports examples; showcase gaps are not errors
      b = renderRun(script, merged, io, spread, "reverse");
    } catch (err) {
      issues.push({ code: "E_BUNDLE_RENDER", file: file || "", path, message: `${label}: rendering failed (${String(err.message).split("\n")[0]}).`, fix: "This is an engine bug the data triggers: report it with this bundle." });
      continue;
    }
    const differ = Object.keys(a.hashes).filter((n) => a.hashes[n] !== b.hashes[n]);
    if (differ.length) issues.push({ code: "E_BUNDLE_DETERMINISM", file: file || "", path, message: `${label}: frames ${differ.join(", ")} look different when rendered in another order.`, fix: "Bundles hold no code, so this is an engine bug triggered by the data: report it with this bundle." });
    const own = median(a.ms);
    timings[label] = Math.round(own * 10) / 10;
    const base = baselineFor(label, merged, look);
    if (!base) continue;
    const ref = renderRun({ ...base(), bundles: script.bundles }, merged, io, spread, "forward");
    const refMs = ref ? median(ref.ms) : null;
    if (refMs !== null && own > refMs * slowFactor + slackMs) {
      issues.push({ code: "W_BUNDLE_SLOW", file: file || "", path, message: `${label}: ${own.toFixed(1)} ms per frame, against ${refMs.toFixed(1)} ms for the same kind of base entry.`, fix: "Simplify the drawing (fewer path commands, layers or particles)." });
    }
  }
  return { issues, report: { frameMs: timings } };
}

/**
 * The contact sheet (section 8): every pose, a filmstrip per move, every body plan, preset, face, FX, theme,
 * object, prop and activity, rendered by the engine into one canvas for a reviewer.
 */
export function contactSheet(files, merged, io, { title = "", pins = [] } = {}) {
  const f = catalogFragment(files);
  const TW = 384;
  const TH = 216;
  const COLS = 4;
  const rows = [];
  const look = { body: "stickman", color: "#3fd8ff" };
  const tiles = (label, script, picks) => rows.push({ label, script: { ...script, bundles: pins }, picks });
  for (const s of showcaseScripts(files, merged, pins)) {
    const kind = s.label.split(" ")[0];
    tiles(s.label, s.script, kind === "move" ? [0.15, 0.35, 0.55, 0.75] : [0.5]);
  }
  for (const p of presetsOf(files)) tiles(`preset ${p.id}`, characterScript(look, { ...p.cast, name: p.name }), [0.5]);
  const poseNames = Object.keys(f.poses);
  const tileRows = [Math.ceil(poseNames.length / COLS), ...groupRows(rows, COLS)];
  const header = 60;
  const canvas = io.createCanvas(COLS * TW, header + tileRows.reduce((a, b) => a + b, 0) * (TH + 24));
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#222222";
  ctx.font = "28px Inter";
  ctx.fillText(title, 16, 40);
  let y = header;
  const label = (text, x, yy) => {
    ctx.fillStyle = "#333333";
    ctx.font = "15px Inter";
    ctx.fillText(text.length > 44 ? `${text.slice(0, 43)}…` : text, x + 6, yy + TH + 17);
  };
  // Poses: drawn directly, facing right, on a ground line.
  poseNames.forEach((name, i) => {
    const x = (i % COLS) * TW;
    const yy = y + Math.floor(i / COLS) * (TH + 24);
    const pose = fillPose(f.poses[name], merged.poses.stand);
    const raw = computeJoints(pose, { x: x + TW / 2, y: 0 }, 1, 0.8);
    const j = computeJoints(pose, { x: x + TW / 2, y: yy + TH - 20 - lowestPoint(raw, 0.8) }, 1, 0.8);
    ctx.strokeStyle = "#dddddd";
    ctx.beginPath();
    ctx.moveTo(x + 20, yy + TH - 20);
    ctx.lineTo(x + TW - 20, yy + TH - 20);
    ctx.stroke();
    drawCharacter(ctx, j, { color: "#3d7bd9", scale: 0.8, facing: 1 });
    label(`pose ${name}`, x, yy);
  });
  y += tileRows[0] * (TH + 24);
  let col = 0;
  for (const r of rows) {
    if (col + r.picks.length > COLS) (col = 0), (y += TH + 24);
    let engine;
    let loaded;
    try {
      engine = createEngine({ catalog: merged, createCanvas: io.createCanvas });
      loaded = engine.load(r.script);
    } catch {
      loaded = null;
    }
    const scratch = loaded?.ok ? io.createCanvas(loaded.width, loaded.height) : null;
    r.picks.forEach((p, k) => {
      const x = (col + k) * TW;
      if (scratch) {
        engine.renderFrame(scratch.getContext("2d"), Math.round(p * (loaded.totalFrames - 1)));
        ctx.drawImage(scratch, 0, 0, loaded.width, loaded.height, x, y, TW, TH);
      } else {
        ctx.fillStyle = "#f3d6d6";
        ctx.fillRect(x, y, TW, TH);
      }
      label(k ? `${Math.round(p * 100)}%` : r.label, x, y);
    });
    col += r.picks.length;
    if (col >= COLS) (col = 0), (y += TH + 24);
  }
  return canvas;
}

/** How many tile rows the scripted tiles take (a filmstrip never wraps). */
function groupRows(rows, cols) {
  let col = 0;
  let n = 0;
  for (const r of rows) {
    if (col + r.picks.length > cols) (col = 0), n++;
    col += r.picks.length;
    if (col >= cols) (col = 0), n++;
  }
  return [n + (col ? 1 : 0)];
}

