// Semantic checks (spec 16.2): references, move/world commands and their params, anchors, cycles,
// camera, text and content. Runs after the schema stage, so shapes are already valid.

import { parseAt, ANCHORS } from "../director.js";
import { closestMatch, nearest } from "./report.js";
import { STAGE } from "../config.js";
import { easings } from "../math.js";
import { V2_ENUMS, catalogNames } from "./v2_names.js";
import { STORY_ONLY } from "../moves.js";
import { beatRigIssues } from "./rigs.js";

const HEX = { type: "color" };
/** World commands and their params (spec 11.3). */
export const WORLD_COMMANDS = {
  shake: { preset: { enum: ["small", "med", "big"], required: true } },
  slowmo: { scale: { min: 0.1, max: 1, required: true }, duration: { min: 0.05, max: 5, required: true }, easeIn: { min: 0, max: 1 }, easeOut: { min: 0, max: 2 } },
  freeze: { duration: { min: 0.05, max: 3, required: true } },
  zoom_punch: { amount: { min: 0, max: 0.5 }, dur: { min: 0.05, max: 1 } },
  flash: { color: HEX, dur: { min: 0.02, max: 1 } },
  fade: { to: { enum: ["black", "white"], required: true }, dur: { min: 0.1, max: 5 }, dir: { enum: ["out", "in"] } },
  desaturate: { amount: { min: 0, max: 1 }, dur: { min: 0, max: 5 } },
  text_pop: { text: { text: 16, required: true }, x: { min: 0, max: 1 }, y: { min: 0, max: 1 }, color: HEX },
  caption: { text: { text: 80, required: true }, pos: { enum: ["top", "bottom", "center"] }, dur: { min: 0.3, max: 10 } },
  explosion: { x: { min: 0, max: 8000, required: true }, y: { min: 0, max: 2000 } },
  spawn_prop: { prop: { prop: true, required: true }, x: { min: 0, max: 8000, required: true }, y: { min: 0, max: 2000 } },
  prop_break: { owner: { character: true, required: true } },
  set_theme: { theme: { theme: true, required: true } },
  music_cue: { cue: { enum: ["start", "stop", "duck"], required: true }, volume: { min: 0, max: 1 } },
  cut: {},
};

/** World commands added for story scripts (v2 only; STORY_SPEC 5.2, 7.3). Later milestones add more. */
export const WORLD_COMMANDS_V2 = {
  ...WORLD_COMMANDS,
  narrate: { text: { text: 160, required: true }, pos: { enum: ["top", "bottom"] }, dur: { min: 0.5, max: 15 }, style: { enum: ["box", "plain"] } },
  title_card: { title: { text: 60, required: true }, subtitle: { text: 80 }, dur: { min: 0.5, max: 10 }, bg: HEX },
  chapter_card: { text: { text: 80, required: true }, dur: { min: 0.5, max: 10 }, bg: HEX },
  time_card: { text: { text: 80, required: true }, dur: { min: 0.5, max: 10 }, bg: HEX },
  end_card: { text: { text: 80, required: true }, dur: { min: 0.5, max: 10 }, bg: HEX },
  set_time: { time: { enum: ["dawn", "day", "dusk", "night"], required: true }, dur: { min: 0, max: 10 } },
  set_weather: { weather: { enum: ["clear", "cloudy", "rain", "snow", "wind", "fog"], required: true }, dur: { min: 0, max: 10 } },
  // Objects (S4): spawn_object params; remove_object and set_object name the object in the beat's `object` field.
  spawn_object: { kind: { required: true }, id: {}, x: { min: -2000, max: 14000, required: true }, y: { min: 0, max: 2000 }, layer: { enum: ["back", "mid", "front"] }, state: {}, facing: { enum: [1, -1] } },
  remove_object: {},
  set_object: { state: {}, toX: { min: -2000, max: 14000 }, height: { min: 0, max: 1500 }, vx: { min: -3000, max: 3000 }, vy: { min: -3000, max: 3000 }, speed: { min: 10, max: 3000 }, exit: { enum: ["left", "right"] } },
  // Appearance changes (S3): who* plus any of the appearance fields; accessory with color, or remove.
  set_appearance: {
    who: { character: true, required: true },
    accessory: { enum: V2_ENUMS.accessory }, color: HEX, remove: { enum: [true, false] },
    eyes: { enum: V2_ENUMS.eyes }, brows: { enum: V2_ENUMS.brows }, mouthStyle: { enum: V2_ENUMS.mouthStyle },
    hair: { enum: V2_ENUMS.hair }, hairColor: HEX, outfit: { enum: V2_ENUMS.outfit }, outfitColor: HEX, cheeks: HEX,
    belly: HEX, slots: { min: 0, max: 7 },
  },
  // A3: a lasting glow around a character (level 0 turns it off) and the scene's colour grade.
  set_glow: { who: { character: true, required: true }, color: { glowColor: true }, level: { min: 0, max: 1, required: true }, dur: { min: 0, max: 10 } },
  // A sound on its own (batch B): an off-screen horn, thunder, a knock; x pans it (stage px).
  sfx: { name: { sfx: true, required: true }, volume: { min: 0, max: 1 }, x: { min: -2000, max: 14000 } },
  set_grade: { saturation: { min: 0, max: 1, required: true }, dur: { min: 0, max: 10 }, keepCast: { enum: [true, false] }, from: { character: true } },
  // The light rig (V3.3): a preset, or overrides of the current one (angle, strength, fog density), over dur.
  set_light: { preset: { light: true }, angle: { min: 0, max: 180 }, strength: { min: 0, max: 1 }, fog: { min: 0, max: 1 }, dur: { min: 0, max: 10 } },
  // The v3 lens (V3.4): channels blend over dur with ease; move plays a named camera move.
  set_camera: {
    move: { cameraMove: true }, dur: { min: 0, max: 30 }, ease: { enum: Object.keys(easings) },
    dolly: { min: -1500, max: 1500 }, truck: { min: -3000, max: 3000 }, crane: { min: -1000, max: 1000 }, tilt: { min: -30, max: 30 }, roll: { min: -45, max: 45 },
    push: { min: 0.3, max: 4 }, handheld: { min: 0, max: 1 }, dof: { min: 0, max: 1 }, focus: { character: true }, focusZ: { min: -4000, max: 2000 },
    vignette: { min: 0, max: 1 }, letterbox: { min: 0, max: 1 },
  },
  // Story camera shots (S6): a camera key from a beat; with dur, the previous framing comes back after it.
  shot: {
    mode: { enum: V2_ENUMS.cameraMode, required: true }, target: { character: true }, targets: { characters: 4 }, from: { character: true },
    zoom: { min: 0.3, max: 4 }, dur: { min: 0.2, max: 30 },
  },
  // Music changes inside a scene (S6 emits them, S7 plays them): mood, intensity, volume, fade seconds.
  set_music: { mood: { enum: V2_ENUMS.mood }, intensity: { min: 0, max: 1 }, volume: { min: 0, max: 1 }, fade: { min: 0, max: 10 } },
  // Activities (S5): the runtime form of the @activity macro; `object` is checked by the story stage.
  activity: {
    name: { enum: V2_ENUMS.activity, required: true }, with: { characters: 4, required: true },
    reps: { min: 1, max: 40 }, dur: { min: 1, max: 120 }, intensity: { enum: V2_ENUMS.intensity }, ending: { enum: V2_ENUMS.ending },
    winner: { character: true }, object: {},
  },
};

/**
 * WORLD_COMMANDS_V2 with the catalog's mood (set_music) and activity (activity) names; the same object
 * when the catalog has exactly the frozen names (catalogNames).
 */
export function worldCommandsV2For(catalog) {
  const names = catalogNames(catalog);
  if (names.frozen) return WORLD_COMMANDS_V2;
  const w = WORLD_COMMANDS_V2;
  return { ...w, set_music: { ...w.set_music, mood: { enum: names.mood } }, activity: { ...w.activity, name: { ...w.activity.name, enum: names.activity } } };
}

/** Fields each story camera mode needs (S6), for camera keys and shot beats. */
const SHOT_FIELDS = { focus: ["target"], two_shot: ["targets"], close_up: ["target"], over_shoulder: ["target", "from"], track: ["target"] };

const MIN_CONTRAST = 1.6;

/** WCAG contrast ratio between two #rrggbb colors. */
export function contrastRatio(a, b) {
  const lum = (hex) => {
    const n = parseInt(hex.slice(1), 16);
    const [r, g, bl] = [16, 8, 0].map((sh) => {
      const c = ((n >> sh) & 255) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const GLYPHS = /^[\x20-\x7E -ÿ’…]*$/;

export function checkText(text, path, blocklist, out) {
  if (!GLYPHS.test(text)) {
    const bad = [...text].find((ch) => !GLYPHS.test(ch));
    out.push({ code: "E_TEXT_GLYPH", path, message: `Character '${bad}' is not supported by the bundled fonts.`, fix: "Use plain Latin letters, digits and punctuation." });
  }
  const lower = text.toLowerCase();
  const hit = blocklist.find((w) => new RegExp(`(^|[^a-z])${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|[^a-z])`).test(lower));
  if (hit) out.push({ code: "E_TEXT_BLOCKED", path, message: "Text contains a blocked word.", fix: "Keep text family-friendly (no gore, self-harm or slurs)." });
}

function checkWorldParams(beat, path, ctx, out) {
  const spec = ctx.worldCommands[beat.do];
  const params = beat.params || {};
  for (const [name, rule] of Object.entries(spec)) {
    if (rule.required && !(name in params)) {
      out.push({ code: "E_WORLD_PARAM", path: `${path}.params`, message: `'${beat.do}' needs params.${name}.`, fix: `Add "${name}" to params.` });
    }
  }
  for (const [name, v] of Object.entries(params)) {
    const rule = spec[name];
    const p = `${path}.params.${name}`;
    if (!rule) {
      const allowed = Object.keys(spec);
      out.push({ code: "E_WORLD_PARAM", path: p, message: `'${beat.do}' has no param '${name}'.`, fix: allowed.length ? `Allowed: ${allowed.join(", ")}.` : `'${beat.do}' takes no params.` });
      continue;
    }
    const bad = (fix) => out.push({ code: "E_WORLD_PARAM", path: p, message: `Bad value ${JSON.stringify(v)} for ${beat.do}.${name}.`, fix });
    if (rule.enum && !rule.enum.includes(v)) bad(`Use one of: ${rule.enum.join(", ")}.`);
    else if (rule.min !== undefined && (typeof v !== "number" || v < rule.min || v > rule.max)) bad(`Use a number from ${rule.min} to ${rule.max}.`);
    else if (rule.type === "color" && !/^#[0-9a-fA-F]{6}$/.test(v)) bad('Use a color like "#ffffff".');
    else if (rule.glowColor && v !== "rainbow" && !/^#[0-9a-fA-F]{6}$/.test(v)) bad('Use a color like "#ffd23f", or "rainbow".');
    else if (rule.text) {
      if (typeof v !== "string" || !v.length || v.length > rule.text) bad(`Use text of 1 to ${rule.text} characters.`);
      else checkText(v, p, ctx.catalog.blocklist, out);
    } else if (rule.prop && !(v in ctx.catalog.props)) bad(`Use one of: ${Object.keys(ctx.catalog.props).join(", ")}.`);
    else if (rule.character && !ctx.charIds.has(v)) bad(`Use a character id: ${[...ctx.charIds].join(", ")}.`);
    else if (rule.characters && !(Array.isArray(v) && v.length && v.length <= rule.characters && v.every((id) => ctx.charIds.has(id)) && new Set(v).size === v.length)) {
      bad(`Use a list of 1 to ${rule.characters} different character ids in this scene: ${[...ctx.charIds].join(", ")}.`);
    }
    else if (rule.theme && !ctx.catalog.themeNames.includes(v)) bad(`Use one of: ${ctx.catalog.themeNames.join(", ")}.`);
    else if (rule.sfx && !ctx.catalog.sfxKeys.includes(v)) bad(`Use one of: ${nearest(v, ctx.catalog.sfxKeys).join(", ")}.`);
    else if (rule.cameraMove && !ctx.catalog.cameraMoves?.[v]) out.push({ code: "E_CAMERA_MOVE", path: p, message: `Unknown camera move '${v}'.`, fix: `Use one of: ${(ctx.catalog.cameraMoveNames || []).join(", ")}.` });
    else if (rule.light && !ctx.catalog.lights?.rigs[v]) out.push({ code: "E_LIGHT_UNKNOWN", path: p, message: `Unknown light preset '${v}'.`, fix: `Use one of: ${(ctx.catalog.lightNames || []).join(", ")}.` });
  }
}

function checkAt(at, path, ctx, out, selfId) {
  const dep = parseAt(at);
  if (!dep || dep.kind === "abs") return;
  const ref = ctx.beatsById.get(dep.ref);
  if (!ref) {
    const near = closestMatch(dep.ref, [...ctx.beatsById.keys()]);
    out.push({ code: "E_REF_BEAT", path: `${path}.at`, message: `No beat with id '${dep.ref}'.`, fix: near ? `Did you mean '${near}'?` : "Give the referenced beat an \"id\"." });
    return;
  }
  if (dep.ref === selfId) out.push({ code: "E_REF_CYCLE", path: `${path}.at`, message: "A beat cannot wait for itself.", fix: "Reference an earlier beat." });
  if (!ANCHORS.includes(dep.anchor)) return;
  if (ref.who !== "world" && !ctx.moves.has(ref.do)) return; // unknown move: reported on that beat
  const isAttack = ref.who !== "world" && ctx.moves.get(ref.do)?.category === "attack";
  if ((dep.anchor === "hit" || dep.anchor === "windowOpen") && !isAttack) {
    out.push({ code: "E_REF_ANCHOR", path: `${path}.at`, message: `'${dep.ref}' (${ref.do}) is not an attack, so it has no '${dep.anchor}' moment.`, fix: `Use "${dep.ref}.start" or "${dep.ref}.end".` });
  }
}

function findCycles(beats, out) {
  const deps = new Map(beats.filter((b) => b.id).map((b) => [b.id, parseAt(b.at)?.ref]));
  const reported = new Set();
  for (const [id] of deps) {
    const seen = new Set([id]);
    let cur = deps.get(id);
    while (cur && deps.has(cur)) {
      if (seen.has(cur)) {
        const key = [...seen].sort().join(",");
        if (cur === id && !reported.has(key)) {
          reported.add(key);
          out.push({ code: "E_REF_CYCLE", path: "beats", message: `Beats wait for each other in a loop: ${[...seen].join(" → ")} → ${id}.`, fix: "Make one of them use an absolute time." });
        }
        break;
      }
      seen.add(cur);
      cur = deps.get(cur);
    }
  }
}

/**
 * @param {object} script  schema-valid script
 * @param {object} catalog  data catalog
 * @param {Map<string, object>} moves  prepared moves
 * @returns {Array<object>} issues (errors and warnings)
 */
export function checkSemantics(script, catalog, moves, opts = {}) {
  const worldCommands = opts.worldCommands || WORLD_COMMANDS;
  const out = [];
  const meta = script.meta;
  const stageWidth = meta.stageWidth ?? STAGE.width;
  const charIds = new Set();
  script.characters.forEach((c, i) => {
    const p = `characters[${i}]`;
    if (charIds.has(c.id)) out.push({ code: "E_REF_DUPLICATE", path: `${p}.id`, message: `Character id '${c.id}' is used twice.`, fix: "Give every character a unique id." });
    charIds.add(c.id);
    if (c.x < STAGE.margin || c.x > stageWidth - STAGE.margin) {
      out.push({ code: "E_SCHEMA_RANGE", path: `${p}.x`, message: `x=${c.x} is off the stage.`, fix: `Use x from ${STAGE.margin} to ${stageWidth - STAGE.margin}.` });
    }
    const holdables = opts.holdables || Object.keys(catalog.props);
    if (c.prop && !holdables.includes(c.prop)) out.push({ code: "E_PROP_UNKNOWN", path: `${p}.prop`, message: `Unknown prop '${c.prop}'.`, fix: `Use one of: ${holdables.join(", ")}.` });
  });
  const theme = catalog.themes[meta.theme ?? "white_stage"];
  if (theme) {
    script.characters.forEach((c, i) => {
      const ratio = contrastRatio(c.color, theme.characterBg);
      if (ratio < MIN_CONTRAST) {
        out.push({ code: "W_CONTRAST", path: `characters[${i}].color`, message: `'${c.id}' (${c.color}) is hard to see on ${meta.theme ?? "white_stage"} (contrast ${ratio.toFixed(2)}).`,
          fix: `Pick a color that stands out against ${theme.characterBg}.` });
      }
    });
  }
  if (meta.theme && !catalog.themeNames.includes(meta.theme)) {
    out.push({ code: "E_THEME_UNKNOWN", path: "meta.theme", message: `Unknown theme '${meta.theme}'.`, fix: `Use one of: ${catalog.themeNames.join(", ")}.` });
  }

  const beatsById = new Map();
  script.beats.forEach((b, i) => {
    if (!b.id) return;
    if (beatsById.has(b.id)) out.push({ code: "E_REF_DUPLICATE", path: `beats[${i}].id`, message: `Beat id '${b.id}' is used twice.`, fix: "Give every beat a unique id." });
    beatsById.set(b.id, b);
  });
  const ctx = { catalog, moves, charIds, beatsById, worldCommands };
  const moveNames = [...moves.keys()];
  const bodyOf = new Map(script.characters.map((c) => [c.id, c.body]));
  const worldNames = Object.keys(worldCommands);

  script.beats.forEach((b, i) => {
    const p = `beats[${i}]`;
    checkAt(b.at, p, ctx, out, b.id);
    if (b.say) checkText(b.say, `${p}.say`, catalog.blocklist, out);
    for (const fx of b.fx || []) {
      if (!catalog.fxNames.includes(fx)) out.push({ code: "E_FX_UNKNOWN", path: `${p}.fx`, message: `Unknown effect '${fx}'.`, fix: `Use one of: ${nearest(fx, catalog.fxNames).join(", ")}.` });
    }
    if (b.who === "world") {
      if (!worldCommands[b.do]) {
        const asMove = moves.has(b.do) ? ` '${b.do}' is a move: set "who" to a character.` : "";
        out.push({ code: "E_WORLD_UNKNOWN", path: `${p}.do`, message: `Unknown world command '${b.do}'.${asMove}`, fix: `Use one of: ${worldNames.join(", ")}.` });
      } else {
        checkWorldParams(b, p, ctx, out);
        if (b.do === "shot") {
          for (const f of SHOT_FIELDS[b.params?.mode] || []) {
            if (b.params[f] === undefined) out.push({ code: "E_WORLD_PARAM", path: `${p}.params`, message: `A '${b.params.mode}' shot needs params.${f}.`, fix: `Add "${f}" to params.` });
          }
        }
      }
      for (const k of ["target", "outcome", "approach", "say"]) {
        if (k in b) out.push({ code: "E_WORLD_FIELD", path: `${p}.${k}`, message: `World beats do not use '${k}'.`, fix: `Remove '${k}'.` });
      }
      return;
    }
    if (!charIds.has(b.who)) {
      const near = closestMatch(b.who, [...charIds, "world"]);
      out.push({ code: "E_REF_CHARACTER", path: `${p}.who`, message: `No character '${b.who}'.`, fix: near ? `Did you mean '${near}'?` : `Use one of: ${[...charIds, "world"].join(", ")}.` });
      return;
    }
    let def = moves.get(b.do);
    // Version 1 scripts cannot use paired moves, defeat styles or story-holdable moves (S5).
    if (def && !opts.worldCommands && (STORY_ONLY.includes(def.category) || (def.needsProp && def.needsProp !== "any" && !Object.values(catalog.props).some((q) => q.kind === def.needsProp)))) def = null;
    if (!def) {
      // A beat with a target or outcome wants an attack: suggest attacks first.
      const pool = (b.target || b.outcome ? moveNames.filter((n) => moves.get(n).category === "attack") : moveNames).filter((n) => opts.worldCommands || !STORY_ONLY.includes(moves.get(n).category));
      const near = closestMatch(b.do, pool) || closestMatch(b.do, moveNames);
      const isWorld = worldCommands[b.do] ? ` '${b.do}' is a world command: set "who": "world".` : "";
      out.push({ code: "E_MOVE_UNKNOWN", path: `${p}.do`, message: `Unknown move '${b.do}'.${isWorld}`, fix: `Use one of: ${nearest(b.do, pool).join(", ")}${near ? ` (closest match: ${near})` : ""}.` });
      return;
    }
    out.push(...beatRigIssues(b, p, catalog, moves, bodyOf)); // E_MOVE_RIG, E_TARGET_RIG (ADR-020)
    if (b.target !== undefined) {
      if (!charIds.has(b.target)) out.push({ code: "E_REF_CHARACTER", path: `${p}.target`, message: `No character '${b.target}'.`, fix: `Use one of: ${[...charIds].join(", ")}.` });
      else if (b.target === b.who) out.push({ code: "E_MOVE_TARGET", path: `${p}.target`, message: `'${b.who}' cannot target itself.`, fix: "Target another character." });
    }
    // Loop moves (walk, run, dances) also take distance and cycles (spec 8.2).
    const accepted = [...Object.keys(def.params), ...(def.flags.loop ? ["distance", "cycles"] : [])];
    for (const k of Object.keys(b.params || {})) {
      if (!accepted.includes(k)) {
        const allowed = accepted;
        out.push({ code: "E_MOVE_PARAM", path: `${p}.params.${k}`, message: `'${b.do}' has no param '${k}'.`, fix: allowed.length ? `Allowed: ${allowed.join(", ")}.` : `'${b.do}' takes no params.` });
      } else if (typeof b.params[k] !== "number") {
        out.push({ code: "E_MOVE_PARAM", path: `${p}.params.${k}`, message: `params.${k} must be a number.`, fix: "Use a number." });
      }
    }
    const attack = def.category === "attack";
    if (b.outcome && !attack) out.push({ code: "E_MOVE_OUTCOME", path: `${p}.outcome`, message: `'${b.do}' is not an attack, so it has no outcome.`, fix: "Remove 'outcome'." });
    if (b.approach && !def.pair && (!attack || !b.target)) { // paired moves (S5) approach their partner
      out.push({ code: "E_MOVE_APPROACH", path: `${p}.approach`, message: "'approach' needs an attack with a target (or a paired move).", fix: "Remove 'approach' or add a 'target'." });
    }
    if (attack && !b.target) out.push({ code: "W_ATTACK_NO_TARGET", path: p, message: `'${b.do}' has no target, so it cannot hit anyone.`, fix: "Add a 'target'." });
  });
  findCycles(script.beats, out);

  script.camera.forEach((k, i) => {
    const p = `camera[${i}]`;
    checkAt(k.at, p, ctx, out, null);
    for (const t of [...(k.targets || []), ...(k.target ? [k.target] : [])]) {
      if (!charIds.has(t)) out.push({ code: "E_REF_CHARACTER", path: `${p}.target`, message: `No character '${t}'.`, fix: `Use one of: ${[...charIds].join(", ")}.` });
    }
    if (k.mode === "focus" && !k.target) out.push({ code: "E_CAMERA_FIELD", path: p, message: "'focus' needs a 'target'.", fix: "Add \"target\": \"<character id>\"." });
    if ((k.mode === "fixed" || k.mode === "pan") && k.x === undefined) out.push({ code: "E_CAMERA_FIELD", path: p, message: `'${k.mode}' needs 'x'.`, fix: "Add \"x\"." });
    for (const f of SHOT_FIELDS[k.mode] || []) {
      if (k[f] === undefined) out.push({ code: "E_CAMERA_FIELD", path: p, message: `'${k.mode}' needs '${f}'.`, fix: f === "targets" ? 'Add "targets": ["<id>", "<id>"].' : `Add "${f}": "<character id>".` });
    }
    if (k.from !== undefined && !charIds.has(k.from)) out.push({ code: "E_REF_CHARACTER", path: `${p}.from`, message: `No character '${k.from}'.`, fix: `Use one of: ${[...charIds].join(", ")}.` });
  });
  if (script.camera.length && script.camera[0].at !== 0) {
    out.push({ code: "E_CAMERA_START", path: "camera[0].at", message: "The first camera key must be at 0.", fix: "Set camera[0].at to 0." });
  }
  return out;
}
