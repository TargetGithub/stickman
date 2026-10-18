// Drafting catalog data with an LLM (STORY_SPEC 5.5, S4.10, S5.0): prompts, automatic checks and an
// offline mock reply. Kinds: object, theme, move. Pure functions; tools/draft.mjs is the CLI.
// The person reviews the rendered sheet; tools/draft.mjs --write adds an accepted draft to catalog/.

import { OBJECT_SHAPES } from "../../engine/renderer/objects.js";
import { PROP_SHAPES } from "../../engine/renderer/props.js";
import { LAYER_KINDS } from "../../engine/renderer/background.js";
import { contrastRatio } from "../../engine/validator/semantic.js";
import { readFileSync } from "node:fs";
import { prepareCatalog, CATEGORIES } from "../../engine/moves.js";
import { createActor, playMove, stepActor } from "../../engine/actor.js";
import { lowestPoint } from "../../engine/skeleton.js";
import { bodyPlan } from "../../engine/story/bodies.js";
import { holdableData, holdableProps } from "../../engine/objects.js";

const BEHAVIORS = ["static", "seat", "holdable", "ball", "floater", "vehicle", "breakable"];
const HEX = /^#[0-9a-fA-F]{6}$/;
const NAME = /^[a-z][a-z0-9_]{1,31}$/;
// Common character colors a theme's backdrop should let read (two of these at least).
const CAST_COLORS = ["#3fd8ff", "#2fd3c0", "#8a2be2", "#ffc04d", "#ff3b3b", "#1a1a1a", "#ffffff"];

const words = (s) => new Set(String(s).toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2));

/** The table a kind drafts into (moves are a list in the catalog; keyed by name here). */
export const tableOf = (kind, catalog) => (kind === "object" ? catalog.objects : kind === "theme" ? catalog.themes : Object.fromEntries(catalog.moves.map((m) => [m.name, m])));

/** The existing entries most like the description (shared words in name and data), at most n. */
export function similarEntries(table, description, n = 3) {
  const want = words(description);
  return Object.entries(table)
    .map(([name, entry]) => ({ name, entry, score: [...words(`${name} ${JSON.stringify(entry)}`)].filter((w) => want.has(w)).length }))
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .slice(0, n);
}

const MOVE_FORMAT = () => readFileSync(new URL("../../prompts/draft_move.md", import.meta.url), "utf8");

const FORMAT = {
  object: `An object entry:
{ "behavior": one of ${BEHAVIORS.join(", ")},
  "draw": a built-in shape (${OBJECT_SHAPES().join(", ")}) OR "paths" with a "paths" list (preferred for a new look),
  "paths": [{ "d": [["M",x,y],["L",x,y],["C",x1,y1,x2,y2,x,y],["Q",x1,y1,x,y],["Z"]], "fill": "#rrggbb", "stroke": "#111111", "width": 3 }],
  "w": width px, "h": height px, "colors": { name: "#rrggbb" } (for built-in shapes),
  "states": optional list of state names (first is the default),
  behavior extras: seat → "seatY"; ball → "r", "bounce" (0.3-0.8); floater → "r", "life": [min,max] s, "rise" px/s, "drift", "wobble", "pop": true|false;
    vehicle → "wheelR", "speed" px/s, "seat": {"x","y"}; holdable → "hold": { "kind", "shape": one of ${PROP_SHAPES.join(", ")}, "len", "width", "gripAt" 0-1, "grip": "rHand"|"lHand", "color", "trim", "hitRadius" } }
Object space for paths: x is centered on the object (negative = left), y = 0 is the floor and up is NEGATIVE (a 200 px tall object spans y from -200 to 0). Keep to 3-15 simple filled shapes, flat colors, a dark #111111 outline: the look of a children's cartoon.`,
  theme: `A theme entry:
{ "sky": { "top": "#rrggbb", "bottom": "#rrggbb" }, "ground": { "color": "#rrggbb", "line": "#rrggbb" },
  "layers": [ { "kind": one of ${LAYER_KINDS.join(", ")}, "factor": parallax 0-1 (0 = fixed to the screen, 1 = moves with the stage), ...that kind's fields } ],
  "characterBg": the color usually behind the characters (mid-tone, so light and dark characters both read) }
Copy each layer kind's fields from the examples; y values are measured from the floor, negative is up.`,
};

/** System and user prompt for a draft. */
export function draftPrompt(kind, description, catalog) {
  const table = tableOf(kind, catalog);
  const examples = similarEntries(table, description).map((e) => `"${e.name}": ${JSON.stringify(e.entry)}`).join("\n");
  const system = `You draft catalog data for a deterministic 2D stick-figure animation engine for kids' videos. You reply with JSON only.

${kind === "move" ? `${MOVE_FORMAT()}
Named poses: ${Object.keys(catalog.poses).join(", ")}.` : FORMAT[kind]}

Rules: original designs only (no look-alikes of trademarked characters or logos); family friendly; colors as "#rrggbb".
Reply with {"name": "<lowercase_name>", "entry": { ... }}.`;
  const user = `Draft a ${kind} for: ${description}

Similar existing entries, for the format and the style:
${examples}`;
  return { system, user };
}

/**
 * Automatic checks for a draft. Returns problems (empty when it is usable).
 * @param {{ name, entry }} draft
 */
export function checkDraft(kind, draft, catalog) {
  const p = [];
  const e = draft?.entry;
  if (!draft || typeof draft !== "object" || !e || typeof e !== "object") return ['Reply with {"name": ..., "entry": {...}}.'];
  if (!NAME.test(draft.name || "")) p.push(`name "${draft.name}" must be lowercase letters, digits and _ (2-32 characters)`);
  const table = tableOf(kind, catalog);
  if (table[draft.name]) p.push(`"${draft.name}" already exists; pick a new name`);
  const color = (v, where) => { if (!HEX.test(v || "")) p.push(`${where} must be a "#rrggbb" color (got ${JSON.stringify(v)})`); };
  if (kind === "move") return [...p, ...checkMove({ ...e, name: draft.name }, catalog)];
  if (kind === "object") {
    if (!BEHAVIORS.includes(e.behavior)) p.push(`behavior must be one of ${BEHAVIORS.join(", ")}`);
    if (e.draw === "paths" || e.paths) {
      if (!Array.isArray(e.paths) || !e.paths.length) p.push('"paths" must be a non-empty list');
      else e.paths.forEach((path, i) => {
        if (!Array.isArray(path.d) || !path.d.length || path.d[0][0] !== "M") p.push(`paths[${i}].d must start with ["M", x, y]`);
        for (const c of path.d || []) {
          const n = { M: 2, L: 2, C: 6, Q: 4, Z: 0 }[c[0]];
          if (n === undefined || c.length !== n + 1 || c.slice(1).some((v) => !Number.isFinite(v))) { p.push(`paths[${i}] has a bad command ${JSON.stringify(c)}`); break; }
        }
        if (path.fill && path.fill !== "none") color(path.fill, `paths[${i}].fill`);
        const ys = (path.d || []).flatMap((c) => c.slice(1).filter((_, k) => k % 2 === 1));
        if (ys.some((y) => y > 2)) p.push(`paths[${i}] goes below the floor (y must be <= 0; up is negative)`);
      });
    } else if (!OBJECT_SHAPES().includes(e.draw)) p.push(`draw must be "paths" or one of ${OBJECT_SHAPES().join(", ")}`);
    for (const [k, v] of Object.entries(e.colors || {})) if (!String(v).startsWith("rgba")) color(v, `colors.${k}`);
    if (e.behavior === "holdable") {
      const h = e.hold || {};
      if (!PROP_SHAPES.includes(h.shape)) p.push(`hold.shape must be one of ${PROP_SHAPES.join(", ")}`);
      if (!(h.len > 0 && h.width > 0 && h.gripAt >= 0 && h.gripAt <= 1)) p.push("hold needs len > 0, width > 0 and gripAt 0-1");
      if (!["rHand", "lHand"].includes(h.grip)) p.push('hold.grip must be "rHand" or "lHand"');
      color(h.color, "hold.color");
    }
    if (e.behavior === "ball" && !(e.r > 0 && e.bounce > 0 && e.bounce < 1)) p.push("a ball needs r > 0 and bounce between 0 and 1");
    if (e.behavior === "floater" && !(Array.isArray(e.life) && e.rise > 0)) p.push('a floater needs "life": [min, max] and "rise" > 0');
    if (e.behavior === "vehicle" && !(e.wheelR > 0 && e.speed > 0)) p.push("a vehicle needs wheelR and speed > 0");
    if (e.states && (!Array.isArray(e.states) || !e.states.every((s) => typeof s === "string"))) p.push("states must be a list of names");
  } else {
    color(e.sky?.top, "sky.top");
    color(e.sky?.bottom, "sky.bottom");
    color(e.ground?.color, "ground.color");
    color(e.ground?.line, "ground.line");
    color(e.characterBg, "characterBg");
    if (!Array.isArray(e.layers)) p.push('"layers" must be a list');
    for (const [i, l] of (e.layers || []).entries()) {
      if (!LAYER_KINDS.includes(l.kind)) p.push(`layers[${i}].kind "${l.kind}" is unknown; use one of ${LAYER_KINDS.join(", ")}`);
      if (l.factor !== undefined && !(l.factor >= 0 && l.factor <= 1)) p.push(`layers[${i}].factor must be 0-1`);
    }
    if (HEX.test(e.characterBg || "")) {
      // Extremes hide half the cast: near-white swallows light characters, near-black dark ones.
      if (contrastRatio(e.characterBg, "#ffffff") < 1.3) p.push(`characterBg ${e.characterBg} is almost white: light characters vanish; use a mid-tone backdrop`);
      if (contrastRatio(e.characterBg, "#000000") < 1.3) p.push(`characterBg ${e.characterBg} is almost black: dark characters vanish; use a mid-tone backdrop`);
      if (CAST_COLORS.filter((c) => contrastRatio(c, e.characterBg) >= 1.6).length < 3) p.push(`characterBg ${e.characterBg} lets too few common character colors read; use a mid-tone backdrop`);
    }
  }
  return p;
}

/**
 * Move data checks: the catalog loader's rules (keys, poses, expressions, hits, wind-up), then a run on
 * every body plan: finite joints, the body never below the floor, feet on the floor at the start and
 * the end (unless the move holds a pose or jumps). draft: false (the catalog build, for moves already
 * reviewed) skips the style rules for new drafts: the 0.2-6 s duration and the feet at the start and end.
 */
export function checkMove(def, catalog, { draft = true } = {}) {
  const p = [];
  if (!CATEGORIES.includes(def.category)) p.push(`category must be one of ${CATEGORIES.join(", ")}`);
  if (draft && !(def.duration >= 0.2 && def.duration <= 6)) p.push("duration must be 0.2-6 s");
  if (def.face && !catalog.faces?.[def.face]) p.push(`face "${def.face}" is unknown`);
  let moves;
  try {
    moves = prepareCatalog([...catalog.moves.filter((m) => m.name !== def.name), def], catalog.poses, holdableProps(catalog));
  } catch (err) {
    return [...p, ...err.message.split("\n").filter((l) => l.includes(def.name) || !l.startsWith("move '")).map((l) => l.replace(/^\s*-\s*/, ""))];
  }
  const prepared = moves.get(def.name);
  const GROUND = 880;
  // Each move runs on the body plans of its rig (STORY_SPEC 6.2): humanoid moves on the six humanoid plans, dog moves on dog plans.
  const rig = prepared.rig === "any" ? null : prepared.rig;
  for (const plan of Object.keys(catalog.bodies || { stickman: {} }).filter((n) => !rig || (catalog.bodies?.[n]?.rig || "humanoid") === rig)) {
    const a = Object.assign(createActor({ id: "a", x: 1000, facing: 1, groundY: GROUND }), bodyPlan(catalog, plan));
    if (prepared.needsProp) {
      const kind = prepared.needsProp === "any" ? catalog.props.sword?.kind : prepared.needsProp; // "any": whatever is held
      const name = Object.keys(catalog.objects || {}).find((k) => catalog.objects[k].hold?.kind === kind) || Object.keys(catalog.props).find((k) => catalog.props[k].kind === kind);
      const data = name ? holdableData(catalog, name) : null;
      if (!data) { p.push(`needsProp "${prepared.needsProp}" matches no holdable`); break; }
      a.prop = { name, kind: data.kind, data };
    }
    playMove(a, def.name, moves);
    const steps = Math.ceil(prepared.duration * (prepared.params.cycles || 1) * 60) + 2;
    let start = null;
    let end = null;
    for (let i = 0; i <= steps; i++) {
      const j = stepActor(a, i ? 1 / 60 : 0, moves).joints;
      if (Object.values(j).some((q) => !Number.isFinite(q.x) || !Number.isFinite(q.y))) { p.push(`${plan}: a joint becomes NaN`); break; }
      const low = lowestPoint(j, 1, a.dims);
      if (low > GROUND + 1.5) { p.push(`${plan}: the body sinks ${(low - GROUND).toFixed(1)} px below the floor`); break; }
      if (i === 1) start = low;
      if (i === steps - 2) end = low;
    }
    const lifts = (def.root || []).some((k) => typeof k.dy === "number" && k.dy < 0);
    if (draft && !def.flags?.hold && !lifts && [start, end].some((v) => v !== null && Math.abs(v - GROUND) > 3)) p.push(`${plan}: feet are off the floor at the start or the end`);
    if (p.length) break;
  }
  return p;
}

/** Offline reply (--mock): the most similar entry under a new name, so the whole flow can be tried. */
export function mockDraft(kind, description, catalog) {
  const base = similarEntries(tableOf(kind, catalog), description, 1)[0];
  const name = `${[...words(description)][0] || "draft"}_${kind}`.replace(/[^a-z0-9_]/g, "_").slice(0, 32);
  const entry = structuredClone(base.entry);
  if (kind === "move") delete entry.name;
  return { name, entry };
}
