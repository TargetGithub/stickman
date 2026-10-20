// Story camera (STORY_SPEC 16). Milestone: S6.
// Shot modes (camera keys and `shot` beats):
//   two_shot       frame two characters tightly
//   close_up       head and shoulders of `target` (a quadruped: the whole animal)
//   wide           the whole stage
//   over_shoulder  past `from`, looking at `target`
//   track          follow `target` with lead room ahead of it
// Auto camera for stories (meta.autoCamera "story", scenes without camera keys): a wide at the scene start,
// two-shots while someone talks to a neighbour, close-ups when a face turns cry, furious or determined,
// and the v1 follow during fights. A `shot` beat or a camera key always wins. In version 3 scripts (V3.9,
// `tight`) the rest of the time frames only the characters who spoke or moved in the last few seconds (and
// the nearest one to a lone actor), not the whole cast, so the shot is as close as the action.

import { dimsOf } from "./skeleton.js";
import { isIdleMove } from "./moves.js";
import { mediumFraming, createCuts, cutsEvent, cutsKey } from "./camera_cuts.js";

export const STORY_MODES = ["two_shot", "close_up", "wide", "over_shoulder", "track"];
const CLOSE_UP_MAX = 3; // zoom
const CLOSE_FACES = ["cry", "furious", "determined"];
const AUTO = { wide: 2.5, closeUp: 2, sayPad: 0.5, fight: 1.5, talkReach: 800, active: 3.5, activePad: 200 }; // seconds, px

/**
 * Target framing for a story shot mode, or null for other modes.
 * helpers: { bounds(actors), fitZoom(cam, span, top, padding) } from camera.js
 */
export function storyFraming(cam, actors, k, helpers) {
  const byId = (id) => actors.find((a) => a.id === id && !a.hidden) || null;
  const { bounds, fitZoom } = helpers;
  if (k.mode === "medium") {
    // Paced scenes (ADR-038, camera_cuts.js): an internal mode of the auto camera, not a shot mode.
    const group = (k.targets || []).map(byId).filter(Boolean);
    return group.length ? mediumFraming(cam, group, k, helpers) : null;
  }
  if (k.mode === "wide") {
    return { x: cam.stageWidth / 2, zoom: typeof k.zoom === "number" ? k.zoom : Math.max(0.4, Math.min(1, cam.W / cam.stageWidth)) };
  }
  if (k.mode === "two_shot") {
    const group = (k.targets || []).map(byId).filter(Boolean);
    if (!group.length) return null;
    const b = bounds(group);
    return { x: (b.minX + b.maxX) / 2, zoom: typeof k.zoom === "number" ? k.zoom : fitZoom(cam, b.maxX - b.minX, b.minY, 150) };
  }
  if (k.mode === "close_up") {
    const t = byId(k.target);
    if (!t) return null;
    const j = t.joints;
    const top = j.head.y - dimsOf(t).headR * t.scale;
    if (dimsOf(t).rig === "quadruped") {
      // A four-legged close-up: the whole animal, head to paws, centred on its body (ADR-020).
      const floor = Math.max(j.lFoot.y, j.rFoot.y, j.lHand.y, j.rHand.y);
      const zoom = typeof k.zoom === "number" ? k.zoom : Math.min(CLOSE_UP_MAX, (cam.H * 0.45) / Math.max(40, floor - top));
      return { x: (j.hip.x + j.head.x) / 2, zoom, y: (top + floor) / 2, smoothY: true, maxZoom: CLOSE_UP_MAX };
    }
    const span = Math.max(40, j.hip.y - top);
    const zoom = typeof k.zoom === "number" ? k.zoom : Math.min(CLOSE_UP_MAX, (cam.H * 0.5) / span);
    // Head in the upper part of the frame, shoulders below it.
    return { x: j.neckTop.x, zoom, y: (top + j.hip.y) / 2 + (cam.H * 0.06) / zoom, smoothY: true, maxZoom: CLOSE_UP_MAX };
  }
  if (k.mode === "over_shoulder") {
    const from = byId(k.from);
    const t = byId(k.target);
    if (!from || !t) return null;
    const b = bounds([from, t]);
    return { x: from.x + (t.x - from.x) * 0.62, zoom: typeof k.zoom === "number" ? k.zoom : Math.min(2.2, fitZoom(cam, b.maxX - b.minX, b.minY, 40) * 1.25), maxZoom: 2.2 };
  }
  if (k.mode === "track") {
    const t = byId(k.target);
    if (!t) return null;
    const zoom = typeof k.zoom === "number" ? k.zoom : 1;
    const dir = Math.sign(t.vx || 0) || t.facing;
    return { x: t.joints.hip.x + (dir * cam.W * 0.18) / zoom, zoom };
  }
  return null;
}

/** Camera key for a `shot` beat's params. */
export function shotKey(p) {
  const key = { mode: p.mode };
  for (const f of ["target", "targets", "from", "zoom"]) if (p[f] !== undefined) key[f] = p[f];
  if (p.mode === "focus" && !key.target && key.targets) key.target = key.targets[0];
  return key;
}

/** State for the story auto camera of one scene. */
export function createStoryAuto(t0, { tight = false, pace = null } = {}) {
  return { t0, lastHit: -Infinity, say: null, close: null, faces: new Map(), current: "start", tight, active: new Map(), cuts: pace ? createCuts(pace) : null };
}

/** Record the events the auto camera reacts to (story seconds). */
export function storyAutoEvent(auto, e, t) {
  if (e.type === "hit") auto.lastHit = t;
  if (auto.cuts) cutsEvent(auto.cuts, e, t);
  if (e.type === "say") {
    auto.say = { actor: e.actor, until: t + e.dur + AUTO.sayPad };
    auto.active.set(e.actor, t + e.dur);
  }
}

/**
 * The auto camera key for this moment, or null to keep the scene's own key (follow).
 * Priority: fights, then close-ups on strong faces, then two-shots for talk, then the opening wide.
 */
export function storyAutoKey(auto, actors, t) {
  for (const a of actors) {
    if (auto.tight && !a.hidden && ((a.move && !isIdleMove(a.move.def)) || Math.abs(a.vx || 0) > 20)) auto.active.set(a.id, t);
    const prev = auto.faces.get(a.id);
    if (prev !== undefined && a.face !== prev && CLOSE_FACES.includes(a.face) && !a.hidden) auto.close = { target: a.id, until: t + AUTO.closeUp };
    auto.faces.set(a.id, a.face);
  }
  if (t - auto.lastHit < AUTO.fight) return null;
  if (auto.cuts) return cutsKey(auto, auto.cuts, actors, t, (all, now) => activeIds(auto, all, now)); // a pace (ADR-038)
  if (auto.close && t < auto.close.until) return { mode: "close_up", target: auto.close.target };
  if (auto.say && t < auto.say.until) {
    const speaker = actors.find((a) => a.id === auto.say.actor);
    const others = actors.filter((a) => a !== speaker && !a.hidden && speaker && Math.abs(a.x - speaker.x) < AUTO.talkReach);
    if (speaker && others.length) {
      const near = others.reduce((b, a) => (Math.abs(a.x - speaker.x) < Math.abs(b.x - speaker.x) ? a : b));
      return { mode: "two_shot", targets: [speaker.id, near.id] };
    }
  }
  if (t - auto.t0 < AUTO.wide) return { mode: "wide" };
  return auto.tight ? activeKey(auto, actors, t) : null;
}

/** Follow the characters active in the last AUTO.active seconds (a lone one with its nearest neighbour); null: none. */
function activeKey(auto, actors, t) {
  const targets = activeIds(auto, actors, t);
  return targets.length ? { mode: "follow", targets, padding: AUTO.activePad } : null;
}

/** Ids of the characters active in the last AUTO.active seconds (a lone one with its nearest neighbour), in cast order. */
function activeIds(auto, actors, t) {
  const shown = actors.filter((a) => !a.hidden);
  const active = shown.filter((a) => t - (auto.active.get(a.id) ?? -Infinity) < AUTO.active);
  if (!active.length) return [];
  if (active.length === 1) {
    const [one] = active;
    const others = shown.filter((a) => a !== one && Math.abs(a.x - one.x) < AUTO.talkReach);
    if (others.length) active.push(others.reduce((b, a) => (Math.abs(a.x - one.x) < Math.abs(b.x - one.x) ? a : b)));
  }
  const ids = new Set(active.map((a) => a.id));
  return shown.filter((a) => ids.has(a.id)).map((a) => a.id);
}
