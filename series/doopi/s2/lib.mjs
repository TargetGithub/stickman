// Doopi & Friends season 2: helpers that turn a compact episode file (series/doopi/s2/eps/epNN.mjs) into a version
// 3 story script with season 1's approved settings (series/doopi/v3_profile.json: speech, lip-sync, narrator, ducking,
// look, motion, ep01's pace block with glide 1.2 and calm framing, light by place, vignette by time of day) and the
// doopi_intro template. Cast entries come from series/doopi/s2/cast.json, so looks and voices match across episodes.
//
// A scene's beats are short arrays; each starts after the one before unless its first element is a timing tag:
//   "~"   with the previous beat;  "~0.6"  0.6 s after the previous beat starts;  "+0.6"  0.6 s after it ends.
// Beat forms (after an optional timing tag):
//   [who, text, face?, move?, opts?]   a spoken line (move: talk by default; opts as for "@")
//   ["N", text]                        the narrator
//   ["D", [who, text, face], ...]      a dialogue exchange (the dialogue macro)
//   ["@", who, move, opts?]            a move; opts: to, face, fx, params, say, bubble, object, target, echo
//   ["C", who, size, dur?]             a feeling cloud grows or shrinks over who's head (set_cloud)
//   ["POP", who, note?]                the cloud pops into a music note
//   ["IN", who, side, x?, mode?]       enter;  ["OUT", who, side, mode?]  exit
//   ["W", command, params?, object?]   a world command
//   ["ACT", name, [who...], params?]   an activity
//   ["WAIT", who, seconds]
//   ["END", text?]                     the end card ("To be continued..." by default)

import { readFileSync } from "node:fs";

const read = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url), "utf8"));
const PROFILE = read("../v3_profile.json");
const CAST = read("./cast.json").cast;

const LIGHT = { ...PROFILE.lightByTheme, clock_tower: "indoor", clock_tower_still: "indoor" };
const VIGNETTE = { ...PROFILE.vignetteByTime };
const TRANSITIONS = {
  fade: { type: "fade", dur: 0.6 },
  dissolve: { type: "dissolve", dur: 0.6 },
  wipeL: { type: "wipe", dur: 0.5, dir: "left" },
  wipeR: { type: "wipe", dur: 0.5, dir: "right" },
  cut: { type: "cut" },
};
const FACING = { r: 1, l: -1 };

/** "doopi 1300 r happy, hush 2600 l smug hidden" → scene cast entries. */
export function castLine(spec) {
  return spec.split(",").map((s) => s.trim()).filter(Boolean).map((s) => {
    const [id, x, f, ...rest] = s.split(/\s+/);
    const e = { id, x: Number(x), facing: FACING[f] ?? 1 };
    for (const w of rest) {
      if (w === "hidden") e.hidden = true;
      else if (w.startsWith("z")) e.z = Number(w.slice(1));
      else e.face = w;
    }
    return e;
  });
}

function timing(tag, prev) {
  if (!prev) return 0.4;
  if (!tag) return { after: prev };
  if (tag === "~") return { with: prev };
  if (tag.startsWith("~")) return { with: prev, delay: Number(tag.slice(1)) };
  return { after: prev, delay: Number(tag.slice(1)) };
}

const isTag = (x) => typeof x === "string" && /^[~+]/.test(x);

function actionFields(opts = {}) {
  const out = {};
  for (const k of ["to", "face", "fx", "params", "say", "bubble", "object", "target", "echo", "speed", "partner", "view", "outcome", "approach"]) if (opts[k] !== undefined) out[k] = opts[k];
  return out;
}

/** One compact beat → a script beat (without id or at). */
function beatOf(b, castIds) {
  const [k, ...a] = b;
  switch (k) {
    case "N": return { who: "world", do: "narrate", params: { text: a[0] } };
    case "D": return { macro: "dialogue", params: { lines: a.map(([w, t, f]) => (f ? [w, t, f] : [w, t])) } };
    case "@": return { who: a[0], do: a[1], ...actionFields(a[2]) };
    case "C": return { who: "world", do: "set_cloud", params: { who: a[0], size: a[1], dur: a[2] ?? 1.2 } };
    case "POP": return { who: "world", do: "set_cloud", params: { who: a[0], pop: true, ...(a[1] ? { note: a[1] } : {}) } };
    case "IN": return { macro: "enter", params: { who: a[0], side: a[1], ...(a[2] !== undefined ? { to: { x: a[2] } } : {}), ...(a[3] ? { mode: a[3] } : {}) } };
    case "OUT": return { macro: "exit", params: { who: a[0], side: a[1], ...(a[2] ? { mode: a[2] } : {}) } };
    case "W": return { who: "world", do: a[0], ...(a[1] ? { params: a[1] } : {}), ...(a[2] ? { object: a[2] } : {}) };
    case "ACT": return { macro: "activity", params: { name: a[0], with: a[1], ...(a[2] || {}) } };
    case "WAIT": return { who: a[0], do: "wait", params: { seconds: a[1] } };
    case "END": return { who: "world", do: "end_card", params: { text: a[0] || "To be continued..." } };
    default:
      if (!castIds.has(k)) throw new Error(`unknown beat kind or speaker '${k}' in ${JSON.stringify(b)}`);
      // A say holds 40 characters; a longer line goes through the dialogue macro, which splits it into bubbles.
      if (a[0].length > 40) return { macro: "dialogue", params: { lines: [a[1] ? [k, a[0], a[1]] : [k, a[0]]] } };
      return { who: k, do: a[2] || "talk", say: a[0], ...(a[1] ? { face: a[1] } : {}), ...actionFields(a[3]) };
  }
}

const SPAN = 1100; // px: the widest a scene's group stands, so the calm camera frames people at a readable size

/**
 * Pull a scene's people together around their middle when they stand wider than `span` (people standing in depth,
 * with a z, stay where they are: they belong to a set piece). Returns x → x', which leaves off-stage targets
 * (within 300 px of an edge or beyond) alone, so exits still leave.
 */
function compactor(cast, width, span) {
  const xs = cast.filter((c) => c.z === undefined).map((c) => c.x);
  const lo = Math.min(...xs);
  const hi = Math.max(...xs);
  if (!xs.length || hi - lo <= span) return null;
  const mid = (lo + hi) / 2;
  const k = span / (hi - lo);
  const f = (x) => (x < 300 || x > width - 300 ? x : Math.round(mid + (x - mid) * k));
  for (const c of cast) if (c.z === undefined) c.x = f(c.x);
  return f;
}

function squeezeBeat(b, f) {
  if (!f) return b;
  if (typeof b.to?.x === "number") b.to = { ...b.to, x: f(b.to.x) };
  if (typeof b.params?.to?.x === "number") b.params = { ...b.params, to: { ...b.params.to, x: f(b.params.to.x) } };
  return b;
}

/**
 * A scene. opt: { time, mood, int, vol, tr, cast, weather, grade, extras, set, pace, span, vignette }.
 * @param {Array<Array>} beats  compact beats (see the top of this file)
 */
export function scene(id, location, opt, beats) {
  return { id, location, opt, beats };
}

function buildScene(sc, locs, castIds) {
  const o = sc.opt;
  const loc = locs[sc.location];
  if (!loc) throw new Error(`scene ${sc.id}: no location ${sc.location}`);
  const out = { id: sc.id, location: sc.location, time: o.time || "day" };
  if (o.weather) out.weather = o.weather;
  out.transitionIn = TRANSITIONS[o.tr || "dissolve"];
  if (o.grade) out.grade = o.grade;
  out.music = { mood: o.mood || "calm", intensity: o.int ?? 0.4, volume: o.vol ?? 0.3 };
  if (o.extras) out.extras = o.extras;
  if (o.pace) out.pace = o.pace;
  if (o.set) out.set = o.set;
  out.cast = castLine(o.cast);
  for (const c of out.cast) if (!castIds.has(c.id)) throw new Error(`scene ${sc.id}: ${c.id} is not in the episode cast`);
  const squeeze = compactor(out.cast, loc.stageWidth ?? 3200, o.span ?? SPAN);
  let prev = null;
  out.beats = sc.beats.map((b, i) => {
    const tag = isTag(b[0]) ? b[0] : null;
    const body = tag ? b.slice(1) : b;
    const beat = squeezeBeat({ id: `${sc.id}_${i + 1}`, at: timing(tag, prev), ...beatOf(body, castIds) }, squeeze);
    prev = beat.id;
    return beat;
  });
  const v = o.vignette ?? VIGNETTE[out.time];
  if (v) out.lens = { vignette: v };
  return out;
}

/**
 * A whole episode.
 * @param {{ n:number, title:string, cast:string[], props?:Record<string,string>, locs:Record<string,{theme:string, set?:object[], stageWidth?:number}>, scenes:object[], intro?:string }} def
 */
export function episode(def) {
  const castIds = new Set(def.cast);
  const cast = def.cast.map((id) => {
    if (!CAST[id]) throw new Error(`no cast entry for ${id} in series/doopi/s2/cast.json`);
    const c = structuredClone(CAST[id]);
    if (def.props && id in def.props) {
      if (def.props[id]) c.prop = def.props[id];
      else delete c.prop;
    }
    return c;
  });
  const locations = Object.entries(def.locs).map(([id, l]) => ({ id, theme: l.theme, stageWidth: l.stageWidth ?? 3200, ...(l.set ? { set: l.set } : {}), ...(LIGHT[l.theme] ? { light: LIGHT[l.theme] } : {}) }));
  const intro = { id: "intro", use: { template: "doopi_intro", params: { episode: def.n, title: def.title, location: def.intro || "tokyo_village", season: "Season 2 - " } } };
  return {
    version: 3,
    meta: {
      title: `Doopi & Friends S2E${String(def.n).padStart(2, "0")}: ${def.title}`,
      format: "landscape", seed: 3000 + def.n, kind: "story", audience: "kids", speakerNames: true, autoCamera: "story", style: "soft",
      ...PROFILE.meta,
    },
    cast,
    locations,
    scenes: [intro, ...def.scenes.map((s) => buildScene(s, def.locs, castIds))],
    audio: { musicVolume: 0.3, ...PROFILE.audio },
    look: PROFILE.look,
    motion: PROFILE.motion,
    pace: PROFILE.pace,
  };
}
