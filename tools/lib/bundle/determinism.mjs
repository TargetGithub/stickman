// Step 12 (CATALOG_BUNDLE_SPEC 6.2), the simulation hash: each example and one showcase script per entry is
// loaded twice in fresh engines; the frames at every 30th frame up to 600, plus the last, are hashed
// (camera and joints, numbers rounded to 1e-4) and must match. Pixel hashes need a canvas backend (B4).
// Pure: the engine factory is passed in, so a test can hand it a broken one.

import { createEngine as realEngine } from "../../../engine/index.js";
import { sha256Tag } from "./sha256.mjs";
import { moveScript, characterScript, faceScript, fxScript, placeScript, objectScript, activityScript } from "../../../web/lib/showcase_scripts.js";
import { catalogFragment } from "./layout.mjs";

const round = (_k, v) => (typeof v === "number" ? Math.round(v * 1e4) / 1e4 : v);

/** The frames step 12 samples for a script of `total` frames. */
export const sampleFrames = (total) => [...new Set([...Array.from({ length: Math.min(21, Math.ceil(total / 30)) }, (_, i) => i * 30), total - 1])].filter((n) => n < total);

/** The simulation hash of a script, or null when it does not load. */
export function simHash(script, catalog, createEngine = realEngine) {
  const engine = createEngine({ catalog });
  const r = engine.load(script);
  if (!r.ok) return null;
  return sha256Tag(sampleFrames(r.totalFrames).map((n) => JSON.stringify(engine.getFrame(n), round)).join("\n"));
}

/** One showcase script per entry the bundle adds (web/lib/showcase_scripts.js), with the bundle pins. */
export function showcaseScripts(files, merged, pins) {
  const f = catalogFragment(files);
  const look = { body: "stickman", color: "#3fd8ff" };
  const out = [];
  const add = (label, build) => {
    try {
      out.push({ label, script: { ...build(), bundles: pins } });
    } catch {
      // an entry the showcase cannot stage is reported by the render smoke test (step 13, B4)
    }
  };
  for (const m of f.moves) if (!m.flags?.partner) add(`move ${m.name}`, () => moveScript(merged, merged.moves.find((x) => x.name === m.name), look));
  for (const b of Object.keys(f.bodies)) add(`body ${b}`, () => characterScript({ ...look, body: b }));
  for (const name of Object.keys(f.faces)) add(`face ${name}`, () => faceScript(look, name));
  for (const name of Object.keys(f.fxPresets)) add(`fx ${name}`, () => fxScript(merged, name, look));
  for (const name of Object.keys(f.themes)) add(`theme ${name}`, () => placeScript(look, name));
  for (const name of Object.keys(f.objects)) add(`object ${name}`, () => objectScript(merged, name, look));
  for (const name of Object.keys(f.props)) add(`prop ${name}`, () => objectScript(merged, name, look, true));
  for (const name of Object.keys(f.activities)) add(`activity ${name}`, () => activityScript(merged, name, look));
  return out;
}

/**
 * @param {Array<{ label: string, file?: string, script: object }>} scripts
 * @returns {{ issues: object[], hashes: Record<string, string> }}
 */
export function checkDeterminism(scripts, merged, createEngine = realEngine) {
  const issues = [];
  const hashes = {};
  for (const { label, file, script } of scripts) {
    const a = simHash(script, merged, createEngine);
    if (a === null) continue; // scripts that do not validate are step 11's (examples) or step 13's (showcase) to report
    const b = simHash(script, merged, createEngine);
    hashes[label] = a;
    if (a !== b) issues.push({ code: "E_BUNDLE_DETERMINISM", file: file || "", path: "", message: `${label}: two runs of the same script give different frames (${a} vs ${b}).`, fix: "Bundles hold no code, so this is an engine bug triggered by the data: report it with this bundle." });
  }
  return { issues, hashes };
}
