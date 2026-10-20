// Step 11, the data rules (CATALOG_BUNDLE_SPEC 4.5-4.14 "Semantic rules"): what the schemas cannot
// express about moves, body plans, FX, themes, objects, activities and moods. The runs (moves on body
// plans, presets and examples on stage) are in runs.mjs. Pure.

import { MOVE_GROUPS } from "./layout.mjs";

/** Colour keys each object shape reads (4.11 table). */
export const SHAPE_COLORS = {
  bench: ["wood", "metal"], chair: ["wood"], table: ["wood"], tree: ["leaves", "leaves2", "trunk"], bush: ["leaves", "leaves2"], lamppost: ["light", "metal"],
  net: ["net", "post"], sign: ["board", "post"], crate: ["wood", "dark"], fountain: ["stone", "water"], cage: ["bar", "base"], box: ["card", "tape"],
  car: ["body", "window", "wheel"], bike: ["frame", "wheel"], ball: ["fill", "seam"], football: ["fill", "patch"], bubble: ["rim", "shine"], balloon: ["fill"], door: ["door", "frame"],
};
const ARITY = { M: 2, L: 2, Q: 4, C: 6, Z: 0 };

const issue = (code, file, path, message, fix) => ({ code, file, path, message, fix });
const sorted = (list) => list.every((k, i) => i === 0 || k.t >= list[i - 1].t);

/**
 * @param {Record<string, any>} files  the bundle's parsed files
 * @param {object} merged  base + dependencies + this bundle (mergeBundles)
 * @param {object} base  the base catalog (for the quadruped generic names)
 */
export function checkRules(files, merged, base) {
  const out = [];
  const moveBy = new Map(merged.moves.map((m) => [m.name, m]));
  const own = MOVE_GROUPS.flatMap((g) => (files[`moves/${g}.json`] || []).map((m, i) => ({ m, file: `moves/${g}.json`, at: `[${i}]` })));
  const detachIn = (m) => (m?.events || []).some((e) => e.detach);
  for (const { m, file, at } of own) {
    const bad = (path, message, fix) => out.push(issue("E_BUNDLE_MOVE", file, `${at}${path}`, `'${m.name}': ${message}`, fix));
    if (m.hits && m.category !== "attack") bad(".hits", "only attack moves have hits.", "Remove 'hits' or make it an attack.");
    if (m.events && !sorted(m.events)) bad(".events", "events are not sorted by t.", "Sort events by t.");
    const g = m.flags?.guard;
    if (g && !(typeof g[0] === "number" && typeof g[1] === "number" && typeof g[2] === "string" && g[0] < g[1])) bad(".flags.guard", "guard must be [t0, t1, kind] with t0 < t1.", 'Write it like [0.1, 0.6, "block"].');
    if (m.pair) {
      if (m.category !== "interaction" || m.flags?.partner) bad(".pair", "only the lead side of an interaction move has a pair block.", "Move 'pair' to the lead move.");
      const partner = moveBy.get(m.pair.partnerMove);
      if (partner && !partner.flags?.partner) bad(".pair.partnerMove", `'${m.pair.partnerMove}' is not a partner move (flags.partner).`, "Point at a move with flags.partner: true.");
      if (partner?.pair) bad(".pair.partnerMove", `'${m.pair.partnerMove}' has a pair block of its own.`, "A partner move has no pair block.");
      if (m.pair.attach?.until === "detach" && !detachIn(m) && !detachIn(partner)) bad(".pair.attach", "attach runs until a detach event, but neither move has one.", 'Add {"t": ..., "detach": true} to the lead or the partner move.');
    }
    if (detachIn(m) && !m.flags?.partner && m.pair?.attach?.until !== "detach" && !m.pair?.inheritAttach) bad(".events", "a detach event needs an attach that runs until: detach.", "Remove the detach event or add the attach.");
    if (m.flags?.partner && m.pair) bad(".pair", "a partner move has no pair block.", "Remove 'pair'.");
  }

  const generic = Object.values(base.bodies || {}).filter((b) => b.rig === "quadruped").flatMap((b) => Object.keys(b.moves || {}));
  for (const [name, b] of Object.entries(files["characters/bodies.json"] || {})) {
    const bad = (path, message, fix) => out.push(issue("E_BUNDLE_BODY", "characters/bodies.json", `${name}${path}`, `'${name}': ${message}`, fix));
    if ((b.draw === "capsule" || b.draw === "trapezoid") && b.torsoWidth === undefined) bad(".torsoWidth", `the ${b.draw} drawing needs torsoWidth.`, "Add torsoWidth (12-40).");
    for (const a of b.avoid || []) if (moveBy.get(a) && moveBy.get(a).category !== "attack") bad(".avoid", `'${a}' is not an attack.`, "avoid lists attack moves only.");
    if (b.rig === "quadruped") {
      const missing = [...new Set(generic)].filter((g) => !(g in (b.moves || {})));
      if (missing.length) bad(".moves", `the move map lacks ${missing.length} generic names: ${missing.slice(0, 8).join(", ")}${missing.length > 8 ? " ..." : ""}.`, "Map every generic name the base quadruped plans map (STORY_SPEC 6.2).");
      for (const [gname, target] of Object.entries(b.moves || {})) {
        const t = moveBy.get(target);
        if (t && (t.rig || "humanoid") !== "quadruped") bad(`.moves.${gname}`, `'${target}' is not a quadruped move.`, "Map generic names to quadruped moves.");
      }
    }
  }

  const entry = (file, path, message, fix) => out.push(issue("E_BUNDLE_ENTRY", file, path, message, fix));
  for (const [name, fx] of Object.entries(files["effects/fx.json"] || {})) {
    if (!["layers", "trail", "flash", "glow", "sustain"].some((k) => fx[k])) entry("effects/fx.json", name, `'${name}' draws nothing.`, "Add layers, a trail, a flash, a glow or a sustain.");
    (fx.layers || []).forEach((l, i) => {
      const p = `${name}.layers[${i}]`;
      if (l.glyph && l.shape !== "glyph") entry("effects/fx.json", `${p}.glyph`, "glyph is only for shape \"glyph\".", 'Set shape to "glyph" or remove glyph.');
      if (l.shape === "glyph" && !l.glyph) entry("effects/fx.json", p, 'A "glyph" layer needs a glyph.', "Add glyph (drop, anger, heart, exclaim, question, zzz or word).");
      if (l.text && l.glyph !== "word") entry("effects/fx.json", `${p}.text`, 'text is only for glyph "word".', 'Set glyph to "word" or remove text.');
      if (l.glyph === "word" && !l.text) entry("effects/fx.json", p, 'A "word" glyph needs text.', "Add text (capital letters, up to 8).");
    });
  }
  for (const [name, t] of Object.entries(files["world/themes.json"] || {})) {
    (t.layers || []).forEach((l, i) => {
      for (const [lo, hi] of [["minW", "maxW"], ["minH", "maxH"]]) {
        if (l[lo] !== undefined && l[hi] < l[lo]) entry("world/themes.json", `${name}.layers[${i}].${hi}`, `${hi} (${l[hi]}) is below ${lo} (${l[lo]}).`, `Make ${hi} at least ${lo}.`);
      }
    });
  }
  for (const [name, o] of Object.entries(files["world/objects.json"] || {})) {
    const f = "world/objects.json";
    const isPaths = o.draw === "paths";
    if (isPaths !== Boolean(o.paths)) entry(f, `${name}.paths`, isPaths ? "draw is \"paths\" but there are no paths." : `paths are only used with draw "paths" (this one draws "${o.draw}").`, isPaths ? "Add paths." : "Remove paths or set draw to \"paths\".");
    const want = SHAPE_COLORS[o.draw];
    if (want) {
      const have = Object.keys(o.colors || {});
      if (want.some((k) => !have.includes(k)) || have.some((k) => !want.includes(k))) entry(f, `${name}.colors`, `The '${o.draw}' shape reads exactly these colours: ${want.join(", ")}.`, `Give colors the keys ${want.join(", ")}.`);
    }
    (o.paths || []).forEach((p, i) => {
      (p.d || []).forEach((cmd, j) => {
        const at = `${name}.paths[${i}].d[${j}]`;
        if (j === 0 && cmd[0] !== "M") entry(f, at, "A path starts with an M command.", 'Begin with ["M", x, y].');
        if (typeof cmd[0] !== "string" || ARITY[cmd[0]] === undefined) entry(f, at, "A command starts with M, L, C, Q or Z.", 'Write commands like ["L", x, y].');
        else if (cmd.length - 1 !== ARITY[cmd[0]] || cmd.slice(1).some((n) => typeof n !== "number")) entry(f, at, `${cmd[0]} takes ${ARITY[cmd[0]]} numbers.`, `Write ["${cmd[0]}"${", n".repeat(ARITY[cmd[0]])}].`);
      });
      for (const k of ["fill", "stroke"]) {
        const m = typeof p[k] === "string" && p[k].match(/^colors\.(.+)$/);
        if (m && !(m[1] in (o.colors || {}))) entry(f, `${name}.paths[${i}].${k}`, `colors.${m[1]} is not in this object's colors.`, `Add '${m[1]}' to colors.`);
      }
    });
    const spawn = o.use?.spawn && merged.objects[o.use.spawn];
    if (spawn && !["ball", "floater"].includes(spawn.behavior)) entry(f, `${name}.use.spawn`, `'${o.use.spawn}' is a ${spawn.behavior} object.`, "use.spawn names a ball or floater object.");
  }
  for (const [name, a] of Object.entries(files["story/activities.json"] || {})) {
    const f = "story/activities.json";
    if ((a.runner === "rally") !== Boolean(a.rally)) entry(f, `${name}.rally`, a.rally ? "rally settings are only for the rally runner." : "the rally runner needs rally settings.", a.rally ? 'Remove rally or set runner to "rally".' : "Add rally (ball, hit, at, flight, height).");
    if (a.dur !== undefined && a.reps !== undefined) entry(f, name, "Use dur or reps, not both.", "Remove one of them.");
    if (a.players[0] > a.players[1]) entry(f, `${name}.players`, "players must be [min, max].", `Write [${a.players[1]}, ${a.players[0]}].`);
    const ball = a.rally && merged.objects[a.rally.ball];
    if (ball && ball.behavior !== "ball") entry(f, `${name}.rally.ball`, `'${a.rally.ball}' is not a ball object.`, "Use an object with behavior \"ball\".");
    (a.roles || []).forEach((r, i) => [r.start, ...(r.moves || [])].filter(Boolean).forEach((mv) => {
      const d = moveBy.get(mv);
      if (d && (d.rig || "humanoid") !== "humanoid") entry(f, `${name}.roles[${i}]`, `'${mv}' is not a humanoid move.`, "Bundle activities use humanoid moves (animals stay built-in in v1).");
    }));
  }
  for (const [name, m] of Object.entries(files["story/music_moods.json"]?.moods || {})) {
    const f = "story/music_moods.json";
    const at = `moods.${name}`;
    if (m.tempo[0] > m.tempo[1]) entry(f, `${at}.tempo`, "tempo must be [min, max].", `Write [${m.tempo[1]}, ${m.tempo[0]}].`);
    const check = (list, steps, path) => list.forEach((s, i) => { if (s.length !== steps) entry(f, `${at}.${path}[${i}]`, `This pattern has ${s.length} steps; in ${m.meter}/4 it needs ${steps}.`, `Use ${steps} characters.`); });
    check(m.bass, m.meter * 2, "bass");
    check(m.melody.rhythms, m.meter * 2, "melody.rhythms");
    for (const lvl of ["low", "medium", "high"]) check(m.drums[lvl], m.meter * 4, `drums.${lvl}`);
  }
  return out;
}
