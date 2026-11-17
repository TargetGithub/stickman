#!/usr/bin/env node
// Build lottie3d/catalog/kids.json from engine3d/catalog and the hand-written allowlist (lottie3d/EDITOR_SPEC.md 6).
// Only allowlisted items are exported; colour names are resolved to hex; rigged glTF files are copied next to it.
// Usage: node tools/lottie3d_catalog.mjs [--check]   (--check: fail if kids.json or a copied asset is stale)
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const src = join(root, "engine3d/catalog");
const outDir = join(root, "lottie3d/catalog");
const read = (p) => JSON.parse(readFileSync(p, "utf8"));

/** Shapes the Lottie3D part builder (lottie3d/models.js) can draw. */
export const PART_SHAPES = ["sphere", "cone", "capsule", "torus", "cylinder", "block", "box", "cube", "smile"];
const LOOP_CLIPS = ["Idle", "Dance", "Walking", "Running"];
const RIGS = {
  stick: { rig: "stick", color: "#33415c", accent: "#f2c48d" },
  block: { rig: "block", color: "#2a9d8f", accent: "#ffd6a5" },
};

/**
 * @param {{ allow: any, engine: { colors: any, materials: any, stages: any, lights: any, models: any, characters: any, actions: any } }} input
 * @returns {{ catalog: any, copies: Array<[string, string]> }}  copies: [from (repo-relative), to (relative to lottie3d/catalog)]
 */
export function buildKidsCatalog({ allow, engine }) {
  const problems = [];
  const colorsUsed = {};
  const hex = (name, where) => {
    if (typeof name === "string" && name.startsWith("#")) return name;
    const c = engine.colors[name];
    if (!c) {
      problems.push(`${where}: unknown colour "${name}"`);
      return "#888888";
    }
    colorsUsed[name] = c.hex;
    return c.hex;
  };
  const materialsUsed = new Set(["toy"]);

  const stages = {};
  for (const [name, a] of Object.entries(allow.stages)) {
    const s = engine.stages[name];
    if (!s) { problems.push(`stages.${name}: not in engine3d/catalog/stages.json`); continue; }
    const l = engine.lights[s.lights];
    if (!l) { problems.push(`stages.${name}: unknown light rig "${s.lights}"`); continue; }
    stages[name] = {
      label: a.label, emoji: a.emoji, mode: a.mode, description: s.description,
      background: hex(s.background, `stages.${name}.background`),
      floor: s.floor ? hex(s.floor, `stages.${name}.floor`) : null,
      rug: s.rug ? hex(s.rug, `stages.${name}.rug`) : null,
      fog: s.fog ?? null,
      lights: { hemisphere: l.hemisphere, sun: l.sun, ambient: l.environment ?? 0 },
    };
  }

  const copies = [];
  const models = {};
  for (const [name, a] of Object.entries(allow.models)) {
    const base = { label: a.label, emoji: a.emoji, group: a.group, mode: a.mode };
    if (a.from === "rigs") {
      if (!RIGS[name]) { problems.push(`models.${name}: unknown rig`); continue; }
      models[name] = { ...base, kind: "rig", description: `The Lottie3D ${name} rig (SPEC.md 3.1).`, ...RIGS[name], height: 1.88, caps: ["body", "limbs", "joints"] };
    } else if (a.from === "characters") {
      const c = engine.characters[name];
      if (!c) { problems.push(`models.${name}: not in engine3d/catalog/characters.json`); continue; }
      const file = `assets/${name}.glb`;
      copies.push([c.file, file]);
      const clips = Object.fromEntries(Object.keys(c.clips).map((k) => [k, { loop: LOOP_CLIPS.includes(k), description: c.clips[k] }]));
      const caps = ["body", "clips"];
      if (clips.Wave) caps.push("limbs");
      models[name] = { ...base, kind: "character", description: c.description, license: c.license, author: c.author, file, scale: c.scale, height: c.height, idle: c.idle, clips, caps };
    } else if (a.from === "critters" || a.from === "props") {
      const m = engine.models[a.from]?.[name];
      if (!m) { problems.push(`models.${name}: not in engine3d/catalog/models.json ${a.from}`); continue; }
      const where = `models.${name}`;
      const color = hex(m.color ?? "white", `${where}.color`);
      const parts = m.parts.map((p, i) => {
        if (!PART_SHAPES.includes(p.p)) problems.push(`${where}.parts[${i}]: shape "${p.p}" is not drawn by lottie3d/models.js yet`);
        const out = { p: p.p };
        for (const k of ["at", "s", "r", "on", "mirror", "hang", "hr", "idle", "repeat", "name"]) if (p[k] !== undefined) out[k] = p[k];
        if (p.c) out.c = hex(p.c, `${where}.parts[${i}].c`);
        if (p.m) { out.m = p.m; materialsUsed.add(p.m); }
        return out;
      });
      const entry = { ...base, kind: a.from === "critters" ? "critter" : "prop", description: m.description, color, parts };
      if (m.head) entry.head = { at: m.head.at };
      if (m.eyes) entry.eyes = { at: m.eyes.at, size: m.eyes.size ?? 0.1, color: hex(m.eyes.color ?? "ink", `${where}.eyes`) };
      if (m.cheeks) entry.cheeks = { at: m.cheeks.at, size: m.cheeks.size, tall: m.cheeks.tall ?? 0.6, color: hex(m.cheeks.color ?? "pink", `${where}.cheeks`) };
      if (m.mouth) entry.mouth = { at: m.mouth.at, size: m.mouth.size, color: hex(m.mouth.color ?? "ink", `${where}.mouth`) };
      if (m.bob) entry.bob = m.bob;
      if (m.sound) entry.sound = m.sound;
      entry.height = round(modelHeight(m));
      entry.caps = m.eyes ? ["body", "face"] : ["body"];
      materialsUsed.add("glossy");
      materialsUsed.add("glow");
      materialsUsed.add("matte");
      models[name] = entry;
    } else problems.push(`models.${name}: unknown source "${a.from}"`);
  }

  const moves = {};
  for (const [name, a] of Object.entries(allow.moves)) {
    const { engine3d, ...rest } = a;
    const description = a.description ?? (engine3d ? engine.actions[engine3d]?.description : undefined);
    if (engine3d && !engine.actions[engine3d]) problems.push(`moves.${name}: engine3d action "${engine3d}" does not exist`);
    if (!description) problems.push(`moves.${name}: needs a description`);
    moves[name] = { ...rest, description, ...(engine3d ? { engine3d } : {}) };
  }

  const materials = {};
  for (const m of [...materialsUsed].sort()) {
    const d = engine.materials[m];
    if (!d) { problems.push(`material "${m}" is not in engine3d/catalog/materials.json`); continue; }
    const out = {};
    for (const k of ["roughness", "metalness", "clearcoat", "clearcoatRoughness", "emissive"]) if (d[k] !== undefined) out[k] = d[k];
    materials[m] = out;
  }

  if (problems.length) throw new Error(`kids catalog build failed:\n  ${problems.join("\n  ")}`);
  const catalog = {
    generated: "Generated by tools/lottie3d_catalog.mjs from engine3d/catalog and lottie3d/catalog/kids_allow.json. Do not edit; run npm run lottie3d:catalog.",
    version: "0.2",
    stages,
    models,
    moves,
    sounds: allow.sounds,
    words: allow.words,
    colors: Object.fromEntries(Object.entries(colorsUsed).sort()),
    materials,
  };
  return { catalog, copies };
}

function round(x) {
  return Math.round(x * 100) / 100;
}

/** Rough standing height of a parts model: the highest part top (ignores part rotation). */
function modelHeight(m) {
  let top = 0;
  const headY = m.head?.at?.[1] ?? 0;
  for (const p of m.parts) {
    const s = Array.isArray(p.s) ? p.s[1] : p.s ?? 0.2;
    const y = (p.at?.[1] ?? 0) + (p.on === "head" ? headY : 0) + (p.hang?.[1] ?? 0);
    top = Math.max(top, y + s / 2);
  }
  return top || 1;
}

function loadEngine() {
  return {
    colors: read(join(src, "colors.json")).colors,
    materials: read(join(src, "materials.json")).materials,
    stages: read(join(src, "stages.json")).stages,
    lights: read(join(src, "stages.json")).lights,
    models: read(join(src, "models.json")),
    characters: read(join(src, "characters.json")).characters,
    actions: read(join(src, "actions.json")).actions,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const check = process.argv.includes("--check");
  const { catalog, copies } = buildKidsCatalog({ allow: read(join(outDir, "kids_allow.json")), engine: loadEngine() });
  const text = JSON.stringify(catalog, null, 1) + "\n";
  const target = join(outDir, "kids.json");
  const stale = [];
  if (!existsSync(target) || readFileSync(target, "utf8") !== text) stale.push("kids.json");
  for (const [from, to] of copies) {
    const dest = join(outDir, to);
    if (!existsSync(dest) || !readFileSync(dest).equals(readFileSync(join(root, from)))) stale.push(to);
  }
  if (check) {
    if (stale.length) {
      console.error(`stale: ${stale.join(", ")} (run npm run lottie3d:catalog)`);
      process.exit(1);
    }
    console.log("lottie3d kids catalog is up to date");
  } else {
    writeFileSync(target, text);
    for (const [from, to] of copies) {
      mkdirSync(dirname(join(outDir, to)), { recursive: true });
      copyFileSync(join(root, from), join(outDir, to));
    }
    const n = (o) => Object.keys(o).length;
    console.log(`wrote lottie3d/catalog/kids.json: ${n(catalog.stages)} stages, ${n(catalog.models)} models, ${n(catalog.moves)} moves, ${copies.length} asset(s)`);
  }
}
