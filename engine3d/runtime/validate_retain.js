// Validation for the retention kit (ENGINE_RETENTION_KIT.md): its kinds and actions, plus the retention lints
// (warnings) that time a script the way compile.js does: the first interaction by 8 s, no talk stretch over 15 s
// without an interaction, no camera still for over 20 s, and every tracker filled to the end.

import { spokenError } from "./spoken.js";
import { compileScript } from "./compile.js";
import { RETAIN_ACTIONS, trackerSteps } from "./director_retain.js";
import { RETAIN_MACROS } from "./retain_compile.js";
import { CAPTION_TOP, CUES, ICONS, RETAIN_KINDS, TRACKER_CORNERS, TRACKER_STYLES, trackerRect, wordShare } from "./retain_layout.js";

export const RETAIN_FIELDS = {
  timer_ring: ["size", "color", "fixed", "face"],
  tracker: ["style", "slots", "labels", "surprise", "color", "accent", "corner", "size", "filled", "hideEmptyLabels"],
  badge: ["icon", "text", "color", "size"],
};
/** Every action name the kit adds. */
export const KIT_ACTIONS = [...RETAIN_ACTIONS, ...RETAIN_MACROS];
export const LINT_DEFAULTS = { hookBy: 8, talkMax: 15, staticMax: 20 };
const LIMITS = { hookBy: [1, 30], talkMax: [5, 60], staticMax: [5, 120] };
/** Lines closer than this (seconds) count as one stretch of talk. */
const TALK_GAP = 1.5;

const isNum = (v, lo = -Infinity, hi = Infinity) => typeof v === "number" && Number.isFinite(v) && v >= lo && v <= hi;
const isStr = (v, lo = 1, hi = 400) => typeof v === "string" && v.trim().length >= lo && v.length <= hi;

/** meta.retention: true, false or { hookBy, talkMax, staticMax }. */
export function checkRetentionMeta(r, err) {
  if (r == null || typeof r === "boolean") return;
  if (typeof r !== "object" || Array.isArray(r)) return err("E3D_RETENTION", "meta.retention", "retention must be true, false or { hookBy, talkMax, staticMax }");
  for (const [k, v] of Object.entries(r)) {
    if (k === "lint") continue;
    if (!LIMITS[k]) err("E3D_RETENTION", `meta.retention.${k}`, `unknown retention limit "${k}" (known: ${Object.keys(LIMITS).join(", ")})`);
    else if (!isNum(v, ...LIMITS[k])) err("E3D_RANGE", `meta.retention.${k}`, `${k} must be ${LIMITS[k][0]}-${LIMITS[k][1]} s`);
  }
}

/** Checks for a timer_ring, tracker or badge object. */
export function checkRetainObject(o, p, { err, warn, name }) {
  if (!RETAIN_KINDS.includes(o.kind)) return;
  for (const k of ["color", "accent", "face"]) name(o[k]);
  if (o.kind !== "badge" && !o.hud) warn("W3D_KIT_NOT_HUD", `${p}.hud`, `a ${o.kind} is made for the screen: give it hud: true`);
  if (o.kind === "badge") {
    if (o.icon != null && !ICONS[o.icon]) err("E3D_ICON", `${p}.icon`, `unknown icon "${o.icon}" (known: ${Object.keys(ICONS).join(", ")})`);
    if (o.icon == null && !isStr(o.text, 1, 4)) err("E3D_BADGE", p, "a badge needs icon or text (1-4 characters)");
  }
  if (o.kind !== "tracker") return;
  if (o.style != null && !TRACKER_STYLES.includes(o.style)) err("E3D_TRACKER", `${p}.style`, `style must be ${TRACKER_STYLES.join(", ")}`);
  if (!(Number.isInteger(o.slots) && o.slots >= 1 && o.slots <= 10)) return err("E3D_TRACKER", `${p}.slots`, "slots must be a whole number 1-10");
  if (o.hideEmptyLabels != null && typeof o.hideEmptyLabels !== "boolean") err("E3D_TRACKER", `${p}.hideEmptyLabels`, "hideEmptyLabels must be true or false");
  // Labels: a checklist line up to 14 characters; a train car, gauge, island, town, star or path stop up to 7 ("scarf",
  // "flex"; longer words shrink to fit); pencil and rainbow 1-2.
  const max = o.style === "checklist" ? 14 : ["gauges", "islands", "town", "train", "stars", "path", undefined].includes(o.style) ? 7 : 2;
  if (o.labels != null && !(Array.isArray(o.labels) && o.labels.length <= o.slots && o.labels.every((l) => isStr(l, 1, max)))) err("E3D_TRACKER", `${p}.labels`, `labels must be at most ${o.slots} strings of 1-${max} characters`);
  if (o.surprise != null && typeof o.surprise !== "boolean" && !isStr(o.surprise, 1, max)) err("E3D_TRACKER", `${p}.surprise`, `surprise must be true or 1-${max} characters`);
  if (o.corner != null && !TRACKER_CORNERS.includes(o.corner)) err("E3D_TRACKER", `${p}.corner`, `corner must be ${TRACKER_CORNERS.join(", ")}`);
  if (o.filled != null && !(Number.isInteger(o.filled) && o.filled >= 0 && o.filled <= trackerSteps(o))) err("E3D_TRACKER", `${p}.filled`, `filled must be 0-${trackerSteps(o)}`);
  if (o.hud && Array.isArray(o.at)) {
    const r = trackerRect(o, o.at);
    if (r.y0 < CAPTION_TOP || r.x0 < -8 || r.x1 > 8 || r.y1 > 4.5) warn("W3D_HUD_ZONE", `${p}.at`, "the tracker runs off the frame or into the caption band; leave at out to use its corner");
  }
}

/**
 * Checks for a kit action and say keywords. Returns true when the action was the kit's (fully checked here).
 * @param {{ err, ids: Map, catalog, progress: Map }} k  progress: tracker id → steps filled so far (in script order)
 */
export function checkRetainAction(a, p, { err, ids, catalog, progress }) {
  const exists = (id, path, kinds) => {
    const o = typeof id === "string" ? ids.get(id) : null;
    if (!o) return err("E3D_TARGET", path, `no object "${id}"`), null;
    if (kinds && !kinds.includes(o.kind)) return err("E3D_TARGET_KIND", path, `needs a ${kinds.join(" or ")}, "${id}" is a ${o.kind}`), null;
    return o;
  };
  const text = (k, code) => !isStr(a[k]) && err(code, `${p}.${k}`, `${a.do} needs ${k}: a line of text`);
  const list = (k, code) => {
    const v = a[k];
    if (!(Array.isArray(v) && v.length >= 2 && v.length <= 6 && new Set(v).size === v.length)) return err(code, `${p}.${k}`, `${k} must be 2-6 different object ids`), false;
    v.forEach((id, i) => exists(id, `${p}.${k}[${i}]`));
    return true;
  };
  // keywords: on a say's text, or on the opening line of a hook (question), challenge or call (prompt).
  const keyLine = a.do === "say" ? a.text : a.do === "hook" ? a.question : a.do === "challenge" || a.do === "call" ? a.prompt : null;
  if ((a.do === "say" || KIT_ACTIONS.includes(a.do)) && a.keywords != null) {
    if (typeof a.keywords !== "object" || Array.isArray(a.keywords)) return err("E3D_KEYWORD", `${p}.keywords`, "keywords must map words to icons, props or keyword options"), false;
    for (const [w, spec] of Object.entries(a.keywords)) {
      if (typeof keyLine === "string" && wordShare(keyLine, w) == null) err("E3D_KEYWORD", `${p}.keywords.${w}`, `"${w}" is not a word in the line`);
      if (typeof spec === "string") {
        if (!ICONS[spec] && !catalog.props[spec] && !catalog.shapes[spec] && !isStr(spec, 1, 4)) err("E3D_KEYWORD", `${p}.keywords.${w}`, `"${spec}" is not an icon (${Object.keys(ICONS).join(", ")}), a prop, a shape or 1-4 characters`);
      } else keywordFace(spec ?? {}, `${p}.keywords.${w}`);
    }
  }
  if (a.do === "say") return false;
  if (!KIT_ACTIONS.includes(a.do)) return false;
  if (a.sound != null && a.sound !== false && !catalog.sounds[a.sound]) err("E3D_SOUND", `${p}.sound`, `unknown sound "${a.sound}"`);
  for (const f of ["questionSpoken", "answerSpoken", "promptSpoken", "praiseSpoken"]) {
    const why = a[f] != null ? spokenError(a[f]) : null;
    if (why) err("E3D_SPOKEN", `${p}.${f}`, why);
  }
  if (a.do === "hook") {
    text("question", "E3D_HOOK");
    // behind may be a named part of an object ("toy_box#lid"); it then opens (style "open") instead of lifting.
    const [ownerId, partName] = typeof a.behind === "string" ? a.behind.split("#") : [];
    const b = exists(ownerId ?? a.behind, `${p}.behind`);
    if (b && partName != null) {
      const m = b.kind === "critter" ? catalog.critters[b.species] : b.kind === "prop" ? catalog.props[b.model] : null;
      const names = (m?.parts ?? []).filter((x) => x.name).map((x) => x.name);
      if (!names.includes(partName)) err("E3D_HOOK", `${p}.behind`, `"${ownerId}" has no named part "${partName}" (known: ${names.join(", ") || "none"})`);
      if (a.style != null && !["open", "none"].includes(a.style)) err("E3D_HOOK", `${p}.style`, 'a part cover (behind "<id>#<part>") opens or stays: style must be "open", "none" or left out');
    }
    if (a.style === "open" && partName == null) err("E3D_HOOK", `${p}.style`, 'style "open" needs behind to be a named part, like "toy_box#lid"');
    if (a.open != null && !(Array.isArray(a.open) && a.open.length === 3 && a.open.every((x) => typeof x === "number"))) err("E3D_VEC", `${p}.open`, "open must be [x, y, z] degrees");
    if (a.out != null && !(Array.isArray(a.out) && a.out.length === 3 && a.out.every((x) => typeof x === "number"))) err("E3D_VEC", `${p}.out`, "out must be [x, y, z] metres");
    if (a.slow != null && typeof a.slow !== "boolean") err("E3D_HOOK", `${p}.slow`, "slow must be true or false");
    if (a.reset != null && typeof a.reset !== "boolean") err("E3D_HOOK", `${p}.reset`, "reset must be true or false");
    if (a.peek != null && typeof a.peek !== "boolean") err("E3D_HOOK", `${p}.peek`, "peek must be true or false");
    // target: one hidden object, or a small group of up to 4 that pop in turn.
    const tids = Array.isArray(a.target) ? a.target : [a.target];
    if (Array.isArray(a.target) && (a.target.length < 1 || a.target.length > 4)) err("E3D_HOOK", `${p}.target`, "target is one object id or a list of 1-4");
    tids.forEach((id, i) => {
      const tp = Array.isArray(a.target) ? `${p}.target[${i}]` : `${p}.target`;
      const t = exists(id, tp);
      if (b && t && ownerId === id) err("E3D_HOOK", tp, "the target must be a different object from behind");
      if (t && !t.hidden && !a.peek) err("E3D_HOOK", tp, `"${id}" must start hidden (hidden: true) so the reveal is a surprise, or give the hook peek: true when a bit of it shows under the cover on purpose`);
      if (t && t.hidden && a.peek) err("E3D_HOOK", tp, `peek: true is for a target that shows a little under the cover; "${id}" starts hidden`);
    });
    if (a.style != null && !["lift", "slide", "tip", "open", "none"].includes(a.style)) err("E3D_HOOK", `${p}.style`, "style must be lift, slide, tip, open or none");
    for (const k of ["who", "answerWho"]) if (a[k] != null) exists(a[k], `${p}.${k}`);
    if (a.answer != null) text("answer", "E3D_HOOK");
    if (a.reveal != null && !isNum(a.reveal, 0, 5)) err("E3D_RANGE", `${p}.reveal`, "reveal must be 0-5 s");
  } else if (a.do === "challenge") {
    text("prompt", "E3D_CHALLENGE");
    if (list("options", "E3D_OPTIONS") && !a.options.includes(a.answer)) err("E3D_CHALLENGE", `${p}.answer`, "answer must be one of the options");
    timerParams();
    if (a.timer != null) exists(a.timer, `${p}.timer`, ["timer_ring"]);
    if (a.confetti != null) exists(a.confetti, `${p}.confetti`, ["confetti"]);
    if (a.praise != null) text("praise", "E3D_CHALLENGE");
  } else if (a.do === "call") {
    text("prompt", "E3D_CALL");
    text("answer", "E3D_CALL");
    if (a.cue != null && !CUES.includes(a.cue)) err("E3D_CALL", `${p}.cue`, `cue must be ${CUES.join(", ")}`);
    if (a.wait != null && !isNum(a.wait, 1, 6)) err("E3D_RANGE", `${p}.wait`, "wait must be 1-6 s");
    for (const k of ["who", "answerWho", "reveal"]) if (a[k] != null) exists(a[k], `${p}.${k}`);
  } else if (a.do === "timer") {
    if (a.target != null) exists(a.target, `${p}.target`, ["timer_ring"]);
    timerParams();
    for (const k of ["chime"]) if (a[k] != null && a[k] !== false && !catalog.sounds[a[k]]) err("E3D_SOUND", `${p}.${k}`, `unknown sound "${a[k]}"`);
  } else if (a.do === "options") {
    list("targets", "E3D_OPTIONS");
    if (a.style != null && !["pulse", "blink"].includes(a.style)) err("E3D_OPTIONS", `${p}.style`, "style must be pulse or blink");
    if (a.color != null && !catalog.colors[a.color]) err("E3D_COLOR", `${p}.color`, `unknown color "${a.color}"`);
  } else if (a.do === "answer") {
    exists(a.target, `${p}.target`);
    if (a.result != null && !["correct", "wrong"].includes(a.result)) err("E3D_ANSWER", `${p}.result`, "result must be correct or wrong");
    if (a.hint != null) exists(a.hint, `${p}.hint`);
    if (a.confetti != null) exists(a.confetti, `${p}.confetti`, ["confetti"]);
  } else if (a.do === "keyword") {
    keywordFace(a, p);
    if (a.side != null && !["auto", "left", "right"].includes(a.side)) err("E3D_KEYWORD", `${p}.side`, "side must be auto, left or right");
    if (a.avoid != null) exists(a.avoid, `${p}.avoid`);
  } else if (a.do === "progress") {
    const o = exists(a.target, `${p}.target`, ["tracker"]);
    if (!o || !Number.isInteger(o.slots)) return true;
    const total = trackerSteps(o);
    if (a.tease) {
      if (!o.surprise) err("E3D_PROGRESS", `${p}.tease`, `"${a.target}" has no surprise slot to tease`);
      return true;
    }
    const from = progress.get(a.target) ?? o.filled ?? 0;
    const to = a.step == null || a.step === "next" ? from + 1 : a.step;
    if (!(Number.isInteger(to) && to > from && to <= total)) err("E3D_PROGRESS", `${p}.step`, `step must be "next" or ${from + 1}-${total} here (trackers only move forward), got ${JSON.stringify(a.step)}`);
    else progress.set(a.target, to);
  }
  return true;

  function timerParams() {
    if (a.dur != null && !isNum(a.dur, 2, 30)) err("E3D_RANGE", `${p}.dur`, "the timer's dur must be 2-30 s");
    if (a.count != null && !(Number.isInteger(a.count) && a.count >= 0 && a.count <= 5)) err("E3D_RANGE", `${p}.count`, "count must be 0-5");
  }
  function keywordFace(k, path) {
    const faces = ["icon", "model", "shape", "text"].filter((f) => k[f] != null);
    if (faces.length !== 1) return err("E3D_KEYWORD", path, "a keyword needs exactly one of icon, model, shape or text");
    if (k.shape != null && !catalog.shapes[k.shape]) err("E3D_SHAPE", `${path}.shape`, `unknown shape "${k.shape}"`);
    if (k.icon != null && !ICONS[k.icon]) err("E3D_ICON", `${path}.icon`, `unknown icon "${k.icon}" (known: ${Object.keys(ICONS).join(", ")})`);
    if (k.model != null && !catalog.props[k.model]) err("E3D_MODEL", `${path}.model`, `unknown prop "${k.model}"`);
    if (k.text != null && !isStr(String(k.text), 1, 4)) err("E3D_KEYWORD", `${path}.text`, "text must be 1-4 characters");
    if (k.color != null && !catalog.colors[k.color]) err("E3D_COLOR", `${path}.color`, `unknown color "${k.color}"`);
    if (k.dur != null && !isNum(k.dur, 0.6, 10)) err("E3D_RANGE", `${path}.dur`, "dur must be 0.6-10 s");
  }
}

/** Whether the retention lints run: forced by the caller, asked for in meta.retention, or the script uses the kit. */
export function lintsOn(script, force) {
  const r = script.meta?.retention;
  if (force != null) return !!force;
  if (r === false) return false;
  if (r != null) return true;
  const objs = Array.isArray(script.objects) ? script.objects : [];
  if (objs.some((o) => RETAIN_KINDS.includes(o?.kind))) return true;
  return (script.scenes ?? []).some((s) => (s?.beats ?? []).some((b) => (b?.do ?? []).some((a) => KIT_ACTIONS.includes(a?.do) || a?.keywords != null)));
}

/**
 * The retention lints (warnings), timed on the compiled plan (measured clips when given, else estimates).
 * @returns {Array<{ code, path, message }>}
 */
export function retentionLints(script, catalog, { speech } = {}) {
  const out = [];
  const lim = { ...LINT_DEFAULTS, ...(typeof script.meta?.retention === "object" ? script.meta.retention : {}) };
  let plan;
  try {
    plan = compileScript(script, { catalog, speech });
  } catch (e) {
    return [{ code: "W3D_RETENTION_COMPILE", path: "", message: `could not time the script for the retention lints: ${e.message}` }];
  }
  const sceneAt = (t) => Math.max(0, plan.scenes.findLastIndex((s) => s.start <= t + 1e-6));
  const where = (t) => `scenes[${sceneAt(t)}]`;
  const clock = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;
  const cues = plan.engagement.map((e) => e.t).sort((a, b) => a - b);

  // 1. The first interaction.
  if (!cues.length) out.push({ code: "W3D_HOOK_LATE", path: "scenes[0]", message: "no interaction anywhere (hook, challenge, call, keyword, progress, pop, mark, highlight...)" });
  else if (cues[0] > lim.hookBy) out.push({ code: "W3D_HOOK_LATE", path: where(cues[0]), message: `the first interaction is at ${cues[0].toFixed(1)} s; open with a hook within ${lim.hookBy} s` });

  // 2. Talk stretches without an interaction.
  const lines = [...plan.lines].sort((a, b) => a.t - b.t);
  const runs = [];
  for (const l of lines) {
    const last = runs[runs.length - 1];
    if (last && l.t <= last[1] + TALK_GAP) last[1] = Math.max(last[1], l.t + l.dur);
    else runs.push([l.t, l.t + l.dur]);
  }
  for (const [a, b] of runs) {
    const marks = [a, ...cues.filter((c) => c > a && c < b), b];
    for (let i = 1; i < marks.length; i++) {
      if (marks[i] - marks[i - 1] > lim.talkMax) {
        out.push({ code: "W3D_TALK_STRETCH", path: where(marks[i - 1]), message: `${(marks[i] - marks[i - 1]).toFixed(1)} s of talk from ${clock(marks[i - 1])} with no interaction, pop-in or prompt (limit ${lim.talkMax} s)` });
      }
    }
  }

  // 3. A camera that does not move.
  const tl = plan.timeline;
  const cam = (t) => [...tl.valueAt("camera", "position", t), ...tl.valueAt("camera", "lookAt", t), tl.valueAt("camera", "fov", t)];
  const STEP = 0.25;
  let from = 0;
  let prev = cam(0);
  for (let t = STEP; t <= plan.duration + 1e-9; t += STEP) {
    const c = cam(t);
    const moved = c.some((x, i) => Math.abs(x - prev[i]) > 1e-4);
    if (moved || t + STEP > plan.duration) {
      const end = moved ? t - STEP : t;
      if (end - from > lim.staticMax) out.push({ code: "W3D_STATIC_CAMERA", path: where(from), message: `the camera holds still for ${(end - from).toFixed(1)} s from ${clock(from)} (limit ${lim.staticMax} s): add a shot, orbit or camera move` });
      from = t;
    }
    prev = c;
  }

  // 4. Trackers that never fill to the end.
  (script.objects ?? []).forEach((o, i) => {
    if (o?.kind !== "tracker") return;
    const got = tl.valueAt(o.id, "step", plan.duration) ?? 0;
    if (got < trackerSteps(o) - 1e-6) out.push({ code: "W3D_TRACKER_UNFILLED", path: `objects[${i}]`, message: `tracker "${o.id}" fills ${Math.round(got)} of ${trackerSteps(o)} steps${o.surprise ? " (the surprise is the last)" : ""}` });
  });
  return out;
}
