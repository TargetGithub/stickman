// Lesson (the authored source of one 10K video) -> engine3d video3d script. The lesson keeps what makes the
// video its own (cast, objects, scenes, lines, demonstrations, thumbnails); this file adds what every video
// shares: meta from the spec, the HUD tracker and its fills, confetti, voices, beat sugar for say / shot /
// pop / progress, and the kit macros (hook, call, challenge). Format: tools/script10k/README.md.

import { BANDS, bandOf } from "./bands.mjs";
import { buildMeta } from "./meta.mjs";
import { buildThumbnails } from "./thumbs.mjs";
import { cardHeight } from "../../runtime/teach_layout.js";

export const LESSON_SCHEMA = "toybox-10k-lesson/1";
export const TRACKER_ID = "trk";
export const CONFETTI_ID = "party";

const asList = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);
const round = (x) => Math.round(x * 1000) / 1000;

/** Trackers from the spec's progress_tracker: style from its words or the band, labels fitted to the style. */
export function trackerFrom(spec, lesson) {
  const band = bandOf(spec.id);
  const pt = spec.progress_tracker ?? {};
  const own = lesson.tracker ?? {};
  const text = String(pt.style ?? "").toLowerCase();
  let style = own.style ?? (/\btrain|\bcars?\b|caboose|wagon/.test(text) ? "train" : /check|list|tick|clipboard/.test(text) ? "checklist" : /\bstar/.test(text) ? "stars" : /path|map|island|road|trail|stone|step|bridge|ladder/.test(text) ? "path" : BANDS[band].tracker);
  if (band === "bb" && !own.style) style = "stars";
  const raw = pt.labels ?? [];
  const slots = Math.min(10, own.slots ?? own.labels?.length ?? (pt.steps || raw.length || 4));
  let labels = own.labels;
  if (!labels && raw.length) {
    if (style === "checklist") labels = raw.slice(0, slots).map((l) => fitLabel(String(l), 14));
    else if ((style === "train" || style === "path") && raw.every((l) => String(l).length <= 2)) labels = raw.slice(0, slots).map(String);
    else if (style === "train" || style === "path") labels = Array.from({ length: slots }, (_, i) => String(i + 1));
  }
  if (style === "checklist" && raw.length > slots) labels = undefined; // too many steps for the card: unlabelled ticks
  const t = { id: TRACKER_ID, kind: "tracker", hud: true, style, slots, surprise: own.surprise ?? true, color: own.color ?? "red", accent: own.accent ?? "yellow", hidden: true };
  if (labels?.length === slots) t.labels = labels;
  if (own.corner) t.corner = own.corner;
  return t;
}

/** A label shortened to `max` characters at a word boundary ("scatter of 6" stays, "the golden tenth one" -> "golden tenth"). */
export function fitLabel(s, max) {
  s = s.replace(/\s+/g, " ").trim();
  if (s.length <= max) return s;
  const words = s.replace(/^(the|a|an) /i, "").split(" ");
  let out = "";
  for (const w of words) { if ((out ? out.length + 1 : 0) + w.length > max) break; out = out ? `${out} ${w}` : w; }
  return out || s.slice(0, max);
}

/** Lay out `ids` in a row centred on `center` (x axis by default), `gap` metres apart. */
function spreadPositions({ ids, center = [0, 0, 0], gap = 1.2, axis = "x" }) {
  const k = axis === "z" ? 2 : 0;
  return ids.map((id, i) => {
    const p = [...center];
    p[k] = round(center[k] + (i - (ids.length - 1) / 2) * gap);
    return [id, p];
  });
}

/** Distinct pitches for speakers sharing a timbre (Robo keeps soft at 1.1 from the catalog). */
const PITCHES = { soft: [1.3, 0.9, 1.2, 0.85], squeaky: [1.1, 1.25, 0.95, 1.2], deep: [1.0, 0.85, 1.15, 0.9], toddler: [1.1, 1.0, 1.2, 0.95], narrator: [1.0, 0.9, 1.1, 0.85], robot: [1.0, 1.15, 0.9, 1.1] };

/**
 * The script's objects and meta.cast from the lesson cast and objects.
 * @returns {{ objects: object[], cast: Record<string, object>, ids: Set<string> }}
 */
function buildObjects(lesson, band) {
  const objects = [];
  const cast = {};
  const used = {};
  for (const [id, c] of Object.entries(lesson.cast ?? {})) {
    const { voice, pitch, speed, species, character, ...rest } = c;
    if (character) objects.push({ id, kind: "character", character, ...rest });
    else objects.push({ id, kind: "critter", species: species ?? id, ...rest });
    if (character === "robot") continue;
    if (voice && voice !== "bark") {
      const list = PITCHES[voice] ?? [1];
      const p = pitch ?? list[(used[voice] = (used[voice] ?? -1) + 1) % list.length];
      cast[id] = { voice, pitch: p, ...(speed ? { speed } : {}) };
    }
  }
  const spread = new Map();
  for (const o of lesson.objects ?? []) if (o.spread) for (const [id, p] of spreadPositions(o.spread)) spread.set(id, p);
  // stack: text cards listed top to bottom, one size, `gap` metres apart; `top` is the top edge of the first card
  // (a text_card grows upward from its at, so each at is that card's bottom).
  const stackSize = new Map();
  for (const o of lesson.objects ?? []) {
    if (!o.stack) continue;
    const { ids, top = [0, 2.2, 1], gap = 0.12, size } = o.stack;
    let y = top[1];
    for (const id of ids) {
      const card = (lesson.objects ?? []).find((c) => c.id === id);
      if (!card) continue;
      const c = { ...card, ...(size ? { size } : {}) };
      delete c.height;
      y -= cardHeight(c);
      spread.set(id, [top[0], round(y), top[2]]);
      stackSize.set(id, c.size);
      y -= gap;
    }
  }
  for (const o of lesson.objects ?? []) {
    if (o.spread || o.stack) continue;
    let out = spread.has(o.id) && o.at == null ? { ...o, at: spread.get(o.id) } : o;
    if (stackSize.has(o.id)) { out = { ...out, size: stackSize.get(o.id) }; delete out.height; }
    objects.push(out);
  }
  return { objects, cast, ids: new Set(objects.map((o) => o.id)) };
}

const SHOT_DEFAULT = { framing: "medium", dur: 1.5, pad: 0.15 };

/** Beat sugar -> engine actions. Returns one or more engine beats. */
function expandBeat(b, ctx) {
  const acts = [];
  const extra = [];
  if (b.hook) {
    acts.push({ do: "hook", ...b.hook });
    if (ctx.tracker && !ctx.trackerShown) { acts.push({ do: "pop", target: TRACKER_ID, at: 0.6, sound: false }); ctx.trackerShown = true; }
  }
  if (b.call) acts.push({ do: "call", ...b.call });
  if (b.challenge) acts.push({ do: "challenge", ...b.challenge });
  if (b.say != null) {
    const a = { do: "say", text: b.say, caption: b.caption ?? true };
    for (const k of ["who", "voice", "pitch", "speed", "spoken"]) if (b[k] != null) a[k] = b[k];
    if (b.at != null) a.at = b.at;
    if (b.keywords && Object.keys(b.keywords).length) a.keywords = b.keywords;
    acts.push(a);
  }
  if (b.shot) {
    const s = typeof b.shot === "string" || Array.isArray(b.shot) ? { target: b.shot } : b.shot;
    acts.push({ do: "shot", ...SHOT_DEFAULT, ...s });
    ctx.lastShot = { ...SHOT_DEFAULT, ...s };
  }
  if (b.orbit != null) {
    const o = typeof b.orbit === "number" ? { degrees: b.orbit } : b.orbit;
    acts.push({ do: "orbit", dur: 5, ...o, around: o.around ?? ctx.focus(o.target ?? ctx.lastShot?.target) });
  }
  asList(b.show).forEach((id, i) => acts.push({ do: "show", target: id, at: round((b.showAt ?? 0) + i * 0.25) }));
  asList(b.hide).forEach((id) => acts.push({ do: "hide", target: id, at: b.hideAt ?? 0 }));
  asList(b.pop).forEach((id, i) => acts.push({ do: "pop", target: id, at: round((b.popAt ?? 0.2) + i * (b.popGap ?? 0.45)) }));
  for (const [k, op, field] of [["clip", "clip", "clip"], ["feel", "feel", "feeling"], ["look", "look", "at"]]) {
    for (const [id, v] of Object.entries(b[k] ?? {})) acts.push(op === "look" ? { do: "look", target: id, at: 0, to: v } : { do: op, target: id, [field]: v, at: 0.2 });
  }
  if (b.progress != null && b.progress !== false && ctx.tracker) {
    const at = b.progressAt ?? 0.8;
    if (b.progress === "tease") acts.push({ do: "progress", target: TRACKER_ID, tease: true, at });
    else if (typeof b.progress === "number") acts.push({ do: "progress", target: TRACKER_ID, step: b.progress, at });
    else acts.push({ do: "progress", target: TRACKER_ID, at });
    if (!ctx.trackerShown) { acts.unshift({ do: "pop", target: TRACKER_ID, at: 0, sound: false }); ctx.trackerShown = true; }
  }
  if (b.confetti && ctx.confetti) acts.push({ do: "burst", target: CONFETTI_ID, at: b.confettiAt ?? 0.6 });
  for (const a of b.do ?? []) acts.push(a);
  const beat = { do: acts };
  if (b.dur != null) beat.dur = b.dur;
  if (b.magic) beat.id = `${ctx.sceneId}.magic`;
  const out = [beat];
  // A thinking pause after the line: silent, with a soft click so the child knows it is their turn.
  if (b.pause) extra.push({ dur: b.pause, do: b.pauseSound === false ? [] : [{ do: "sound", sound: b.pauseSound ?? "windup_click", at: 0.1, volume: 0.6 }] });
  return out.concat(extra);
}

/**
 * Expand a lesson into a video3d script (no polishing passes: see polish.mjs).
 * @param {object} lesson
 * @param {object} spec
 * @param {{ catalog: object, skills?: object }} o
 */
export function expandLesson(lesson, spec, { catalog, skills }) {
  if (lesson.lesson !== LESSON_SCHEMA) throw new Error(`${lesson.id}: lesson must say "lesson": "${LESSON_SCHEMA}"`);
  if (lesson.id !== spec.id) throw new Error(`lesson ${lesson.id} does not match spec ${spec.id}`);
  const band = bandOf(spec.id);
  const meta = buildMeta(spec, lesson, { skills });
  const { objects, cast, ids } = buildObjects(lesson, band);
  if (Object.keys(cast).length) meta.cast = cast;
  if (!objects.some((o) => o.kind === "character" && o.character === "robot")) meta.host = null;
  const tracker = lesson.tracker === false ? null : trackerFrom(spec, lesson);
  if (tracker) objects.push(tracker);
  const confetti = BANDS[band].confetti && lesson.confetti !== false;
  if (confetti && !ids.has(CONFETTI_ID)) objects.push({ id: CONFETTI_ID, kind: "confetti", count: 120, area: [7, 3], height: 6 });
  const byId = new Map(objects.map((o) => [o.id, o]));
  const focus = (target) => {
    const o = byId.get(asList(target)[0]);
    const p = o?.at ?? [0, 0, 0];
    return [p[0], round((p[1] ?? 0) + 0.8), p[2] ?? 0];
  };
  const ctx = { tracker, confetti, trackerShown: false, lastShot: null, focus, sceneId: "" };
  const scenes = (lesson.scenes ?? []).map((s, si) => {
    ctx.sceneId = s.id ?? `s${si + 1}`;
    const out = { id: ctx.sceneId, title: s.title, beats: (s.beats ?? []).flatMap((b) => expandBeat(b, ctx)) };
    for (const k of ["music", "musicGain"]) if (s[k] !== undefined) out[k] = s[k];
    return out;
  });
  meta.thumbnails = buildThumbnails(lesson.thumbnails ?? [], { spec, band, catalog });
  const script = {
    kind: "video3d",
    version: 1,
    description: `Toybox 10K ${spec.id}: ${spec.objective}`,
    meta,
    stage: typeof lesson.stage === "string" ? { preset: lesson.stage } : lesson.stage ?? { preset: "playroom" },
    camera: lesson.camera ?? { position: [0, 1.9, 9], lookAt: [0, 1.2, 0], fov: 40 },
    objects,
    scenes,
  };
  return script;
}
