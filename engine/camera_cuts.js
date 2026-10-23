// Paced story camera (ADR-038): the story auto camera of a scene with a pace cuts like a preschool show.
//   - a wide only to establish (pace.establish s at the scene start);
//   - dialogue: a medium two-shot on the first line of an exchange, then shot/reverse-shot (over the listener's
//     shoulder, a close-up of the speaker, alternating) on each new line, and a reaction close-up of the listener
//     when a line runs past pace.shot[1] (unless pace.reactions is false); no cut comes sooner than
//     pace.minCut (default pace.shot[0] / 2) after the last one;
//   - otherwise a medium shot (characters about 60% of the frame height) on whoever is acting, cut to a looser
//     (or tighter) medium when it has run longer than 1.25 x pace.shot[1];
//   - a travel cut (cut-to-arrival) cuts with the walker.
// Every framing change is a hard cut, except a medium that keeps one of its characters (it follows smoothly).
// Pure state; the keys are read by camera.js (storyFraming → mediumFraming).

const MEDIUM = { height: 0.6, loose: 0.42, pad: 170, maxZoom: 2.4, lift: 0.07 };
const TALK = { reach: 800, exchange: 3, reaction: 1.6, hold: 0.8 }; // px, s, s, s

/**
 * Framing for a "medium" key: the targets standing about MEDIUM.height of the frame tall (k.loose: smaller),
 * feet near the lower edge and room above the heads.
 */
export function mediumFraming(cam, group, k, { bounds }) {
  const b = bounds(group);
  const floor = Math.max(...group.map((a) => Math.max(a.joints.lFoot.y, a.joints.rFoot.y, a.groundY ?? -Infinity)));
  const tall = Math.max(60, floor - b.minY);
  const byHeight = (cam.H * (k.loose ? MEDIUM.loose : MEDIUM.height)) / tall;
  const byWidth = cam.W / (b.maxX - b.minX + 2 * MEDIUM.pad);
  const fav = k.favor && group.find((a) => a.id === k.favor);
  const zoom = Math.max(0.45, Math.min(MEDIUM.maxZoom, byHeight, fav ? byWidth * 1.35 : byWidth));
  const mid = (b.minX + b.maxX) / 2;
  const x = fav ? mid + Math.sign(fav.x - mid) * Math.min(Math.abs(fav.x - mid), (cam.W * 0.18) / zoom) : mid;
  return { x, zoom, y: (b.minY + floor) / 2 - (cam.H * MEDIUM.lift) / zoom, smoothY: true, maxZoom: MEDIUM.maxZoom };
}

/** Paced state on the story auto camera (camera_story.js createStoryAuto). */
export function createCuts(pace) {
  return { pace, key: null, since: -Infinity, line: null, lineSeen: null, lines: 0, lastLineEnd: -Infinity, travelCut: false, variant: 0 };
}

/** A say or travel cut event (story seconds). */
export function cutsEvent(cuts, e, t) {
  if (e.type === "travelCut") cuts.travelCut = true;
  if (e.type === "say" && e.bubble !== "think") {
    // Someone else still talking (two lines at once): the shot frames both.
    const prev = cuts.line && t < cuts.line.until - 0.05 && cuts.line.actor !== e.actor ? cuts.line.actor : null;
    cuts.line = { actor: e.actor, to: e.to ?? null, t0: t, until: t + e.dur, ...(prev ? { also: prev } : {}) };
  }
}

/** Whether a key's framing is built around a character (a wide shows everyone). */
export const framed = (key, id) => !key || key.mode === "wide" || key.target === id || !!key.targets?.includes(id);

const sameKey = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const keeps = (a, b) => a?.mode === "medium" && b?.mode === "medium" && a.loose === b.loose && !a.favor && !b.favor && a.targets.some((id) => b.targets.includes(id));

/** The listener of a line: the beat's target, else the nearest visible character within talking reach. */
function listenerOf(line, actors) {
  const speaker = actors.find((a) => a.id === line.actor && !a.hidden);
  if (!speaker) return null;
  const named = line.to && actors.find((a) => a.id === line.to && !a.hidden);
  if (named) return named;
  const others = actors.filter((a) => a !== speaker && !a.hidden && Math.abs(a.x - speaker.x) < TALK.reach);
  return others.length ? others.reduce((b, a) => (Math.abs(a.x - speaker.x) < Math.abs(b.x - speaker.x) ? a : b)) : null;
}

/** The shot for a line: a medium two-shot opens an exchange, then over-the-shoulder and close-up alternate. */
function lineShot(cuts, line, actors, t) {
  if (cuts.pace.framing === "calm") return calmLineShot(cuts, line, actors, t);
  if (line.also) return { mode: "medium", targets: [line.actor, line.also] };
  const listener = listenerOf(line, actors);
  if (!listener) return { mode: "medium", targets: [line.actor] };
  const opening = t - cuts.lastLineEnd > TALK.exchange;
  if (opening) cuts.lines = 0;
  const n = cuts.lines++;
  if (n === 0) return { mode: "medium", targets: [line.actor, listener.id] };
  // Over the listener's shoulder: a medium on both, pushed toward the speaker (the listener half out of frame).
  return n % 2 ? { mode: "medium", targets: [listener.id, line.actor], favor: line.actor } : { mode: "close_up", target: line.actor };
}

/**
 * Calm framing (pace.framing "calm", Sridhar's review 2026-10-23: fewer camera changes): one medium for a whole
 * exchange, on everyone who has spoken in it and the listener; a line keeps the shot while its speaker is in it,
 * and the shot widens only for a speaker who is not.
 */
function calmLineShot(cuts, line, actors, t) {
  const listener = listenerOf(line, actors);
  if (t - cuts.lastLineEnd > TALK.exchange || !cuts.group) {
    // A new exchange frames everyone near the speaker at once, so the shot rarely has to widen later.
    const speaker = actors.find((a) => a.id === line.actor && !a.hidden);
    cuts.group = new Set(speaker ? actors.filter((a) => !a.hidden && Math.abs(a.x - speaker.x) < TALK.reach).map((a) => a.id) : []);
  }
  const before = cuts.group.size;
  for (const id of [line.actor, line.also, listener?.id]) if (id) cuts.group.add(id);
  const shown = new Set(actors.filter((a) => !a.hidden).map((a) => a.id));
  for (const id of [...cuts.group]) if (!shown.has(id)) cuts.group.delete(id);
  if (cuts.key?.mode === "medium" && before && [...cuts.group].every((id) => cuts.key.targets.includes(id))) return cuts.key;
  return { mode: "medium", targets: [...cuts.group] };
}

/**
 * The paced auto key at story time t, with `cut` set when the change is a hard cut.
 * @param {{ t0, active: Map, close }} auto  the story auto camera state (its close-up and activity tracking)
 * @param {Function} activeIds  (actors, t) → ids of the characters acting now (camera_story.js)
 */
export function cutsKey(auto, cuts, actors, t, activeIds) {
  const { pace } = cuts;
  const age = t - cuts.since;
  const minCut = pace.minCut ?? pace.shot[0] / 2;
  let want = null;
  const line = cuts.line && t < cuts.line.until ? cuts.line : null;
  if (cuts.travelCut) {
    cuts.travelCut = false;
    // During the opening wide the walker just jumps ahead inside it: a medium here lasted one frame before
    // the wide came back (a flash of zoom, ep01 review 2026-10-21).
    if (t - auto.t0 < pace.establish && !line) return choose(cuts, { mode: "wide" }, t, true);
    want = mediumOf(activeIds(actors, t), actors, 0);
    return choose(cuts, want, t, true);
  }
  // A face close-up gives way to a line by someone else (speakers stay in frame).
  const calm = pace.framing === "calm";
  const closeOk = !calm && auto.close && t < auto.close.until && !(line && (line.actor !== auto.close.target || line.also));
  if (closeOk) want = { mode: "close_up", target: auto.close.target };
  else if (t - auto.t0 < pace.establish && !line) want = { mode: "wide" };
  else if (line) {
    cuts.lastLineEnd = line.until;
    if (cuts.lineSeen !== line) {
      // The speaker must be in the shot (ep01 review, 2026-10-21): minCut only delays a new shot while they are.
      const shows = framed(cuts.key, line.actor);
      if (age < minCut && cuts.key && shows) return cuts.key; // too soon after the last cut: wait
      // The next bubble of the same speaker (a long line split into sentences) keeps the shot.
      const more = shows && cuts.seen?.actor === line.actor && line.t0 - cuts.seen.until < TALK.hold;
      cuts.lineSeen = line;
      cuts.seen = { actor: line.actor, until: line.until };
      want = more ? cuts.key : lineShot(cuts, line, actors, t);
      if (!shows && want !== cuts.key) want = { ...want, quick: true }; // bring an unseen speaker in fast
    } else if (!calm && pace.reactions !== false && age > pace.shot[1] && !cuts.key?.reaction) {
      const listener = listenerOf(line, actors);
      if (listener) want = { mode: "close_up", target: listener.id, reaction: t + TALK.reaction };
    } else if (cuts.key?.reaction && t > cuts.key.reaction) want = { mode: "close_up", target: line.actor };
    want ??= cuts.key;
  } else if (t - cuts.lastLineEnd < TALK.hold && cuts.key) {
    want = cuts.key; // between two lines of an exchange: no cut
  } else if (calm) {
    // Keep the shot while everyone acting is in it and its own characters are still on stage.
    const ids = activeIds(actors, t);
    const shown = new Set(actors.filter((a) => !a.hidden).map((a) => a.id));
    const k = cuts.key;
    const holds = k?.mode === "medium" && k.targets.some((id) => shown.has(id)) && ids.every((id) => k.targets.includes(id));
    want = holds ? k : mediumOf(nearby(ids, actors), actors, 0);
    if (!holds && k && age < minCut && ids.every((id) => framed(k, id))) return k;
  } else {
    if (age > pace.shot[1] * 1.25 && cuts.key?.mode === "medium") cuts.variant++;
    want = mediumOf(activeIds(actors, t), actors, cuts.variant);
    // Who is acting changes often in action: hold the shot at least minCut, so the camera does not jump.
    if (cuts.key && age < minCut && !keeps(cuts.key, want) && !sameKey(want, cuts.key)) return cuts.key;
  }
  return choose(cuts, want, t, false);
}

/** The acting characters and everyone visible within talking reach of them (calm framing). */
function nearby(ids, actors) {
  const shown = actors.filter((a) => !a.hidden);
  const active = shown.filter((a) => ids.includes(a.id));
  if (!active.length) return ids;
  return shown.filter((a) => active.some((b) => Math.abs(a.x - b.x) < TALK.reach)).map((a) => a.id);
}

function mediumOf(ids, actors, variant) {
  const shown = actors.filter((a) => !a.hidden);
  const targets = ids.length ? ids : shown.map((a) => a.id);
  if (!targets.length) return { mode: "wide" };
  return { mode: "medium", targets, ...(variant % 2 ? { loose: true } : {}) };
}

function choose(cuts, wanted, t, force) {
  const { cut: _w, ...want } = wanted;
  // Calm framing: a group is the same shot whatever order its characters come in.
  if (cuts.pace.framing === "calm" && want.mode === "medium" && !want.favor) want.targets = [...want.targets].sort();
  const { cut: _p, ...prev } = cuts.key || {};
  if (!force && cuts.key && sameKey(want, prev)) return cuts.key;
  const cut = force || !keeps(prev, want);
  if (cut) cuts.since = t;
  cuts.key = { ...want, cut };
  return cuts.key;
}

/**
 * A script shot gives way to a speaker it leaves out (pace.keepSpeakers, default true; ep review 2026-10-21):
 * true while a line runs (more than SPEAKER_LEFT s of it left) whose speaker the shot's key does not frame.
 * The auto camera then takes over from the shot's key, bringing the speaker in with a quick glide.
 */
const SPEAKER_LEFT = 0.5; // s: the end of a line is not worth leaving a shot for

export function speakerLeftOut(cuts, shotKey, t) {
  if (!cuts || cuts.pace.keepSpeakers === false) return false;
  const line = cuts.line && t < cuts.line.until ? cuts.line : null;
  return !!line && line.until - t > SPEAKER_LEFT && !framed(shotKey, line.actor);
}

