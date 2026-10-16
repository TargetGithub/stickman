// Move runtime: catalog preparation, keys, root motion, events, hit windows, looping.
// Milestone: M1. Spec: section 8. Interfaces: docs/ARCHITECTURE.md section 4.

import { POSE_CHANNELS } from "./types.js";
import { easings } from "./math.js";
import { compileExpr, evalParam, ExprError } from "./expr.js";
import { fillPose, blendPose, samplePoseKeys, segmentAt } from "./pose.js";
import { MOTION } from "./config.js";

export const CATEGORIES = ["attack", "movement", "reaction", "defensive", "emote", "utility"];
export const HIT_PARTS = ["rHand", "lHand", "rFoot", "lFoot", "rKnee", "lKnee", "rElbow", "lElbow", "head", "propTip"];
export const SHAKES = ["small", "med", "big"];
export const MIN_WINDUP = 0.15;

// ---------- catalog preparation ----------

function checkTimes(list, path, problems, { first0 = false, last1 = false, strict = true } = {}) {
  list.forEach((k, i) => {
    if (typeof k.t !== "number" || k.t < 0 || k.t > 1) problems.push(`${path}[${i}].t must be a number in [0, 1]`);
    if (i > 0 && (strict ? k.t <= list[i - 1].t : k.t < list[i - 1].t)) problems.push(`${path} must be sorted by t (index ${i})`);
  });
  if (first0 && list.length && list[0].t !== 0) problems.push(`${path}[0].t must be 0`);
  if (last1 && list.length > 1 && list[list.length - 1].t !== 1) problems.push(`${path} last t must be 1`);
}

function checkExpr(value, names, path, problems) {
  if (typeof value === "number") return;
  try {
    compileExpr(value, names);
  } catch (e) {
    problems.push(`${path}: ${e instanceof ExprError ? e.message : String(e)}`);
  }
}

function prepareMove(raw, poses, problems) {
  const p = (msg) => problems.push(`move '${raw.name}': ${msg}`);
  if (!CATEGORIES.includes(raw.category)) p(`category must be one of ${CATEGORIES.join(", ")}`);
  if (!(raw.duration > 0)) p("duration must be > 0");
  const params = { ...(raw.params || {}) };
  const names = Object.keys(params);

  const rawKeys = raw.keys || [];
  if (rawKeys.length === 0) p("needs at least one key");
  checkTimes(rawKeys, `move '${raw.name}' keys`, problems, { first0: true, last1: true });
  let prev = poses.stand;
  const keys = rawKeys.map((k, i) => {
    let partial = k.pose;
    if (typeof partial === "string") {
      if (!poses[partial]) p(`keys[${i}].pose '${partial}' is not a named pose`);
      partial = fillPose(poses[partial] || {}, poses.stand);
    } else if (partial && typeof partial === "object") {
      for (const ch of Object.keys(partial)) if (!POSE_CHANNELS.includes(ch)) p(`keys[${i}].pose has unknown channel '${ch}'`);
    } else p(`keys[${i}].pose must be a pose name or object`);
    if (k.ease && !easings[k.ease]) p(`keys[${i}].ease '${k.ease}' is unknown`);
    const pose = fillPose(partial || {}, prev);
    prev = pose;
    return { t: k.t, pose, ease: k.ease || "linear", snapHard: !!k.snapHard, propAngle: k.propAngle };
  });

  const root = raw.root && raw.root.length ? raw.root : [{ t: 0, dx: 0, dy: 0 }, { t: 1, dx: 0, dy: 0 }];
  checkTimes(root, `move '${raw.name}' root`, problems);
  root.forEach((k, i) => {
    checkExpr(k.dx ?? 0, names, `move '${raw.name}' root[${i}].dx`, problems);
    checkExpr(k.dy ?? 0, names, `move '${raw.name}' root[${i}].dy`, problems);
    if (k.ease && !easings[k.ease]) p(`root[${i}].ease '${k.ease}' is unknown`);
  });

  const hits = raw.hits || [];
  if (raw.category === "attack" && hits.length === 0) p("attacks need at least one hits entry");
  hits.forEach((h, i) => {
    if (!(h.t0 >= 0 && h.t1 <= 1 && h.t0 < h.t1)) p(`hits[${i}] needs 0 <= t0 < t1 <= 1`);
    if (!HIT_PARTS.includes(h.part)) p(`hits[${i}].part must be one of ${HIT_PARTS.join(", ")}`);
    if (h.shake && !SHAKES.includes(h.shake)) p(`hits[${i}].shake must be small, med or big`);
    checkExpr(h.damage ?? 0, names, `move '${raw.name}' hits[${i}].damage`, problems);
  });
  if (raw.category === "attack" && hits.length && hits[0].t0 < MIN_WINDUP) {
    p(`first hit window opens at t=${hits[0].t0}; windup must take at least ${MIN_WINDUP * 100}% of the move`);
  }

  const events = (raw.events || []).slice().sort((a, b) => a.t - b.t);
  checkTimes(events, `move '${raw.name}' events`, problems, { strict: false });

  return {
    name: raw.name,
    category: raw.category,
    duration: raw.duration,
    params,
    needsProp: raw.needsProp ?? null,
    keys,
    root: root.map((k) => ({ t: k.t, dx: k.dx ?? 0, dy: k.dy ?? 0, ease: k.ease || "linear" })),
    hits,
    events,
    flags: { ...(raw.flags || {}) },
    mouth: raw.mouth || "neutral",
    chain: raw.chain ?? null,
  };
}

/**
 * Validate and normalize move data (spec 8.1). Throws one Error listing every problem.
 * @returns {Map<string, object>} prepared moves by name
 */
export function prepareCatalog(rawMoves, poses) {
  const problems = [];
  const out = new Map();
  if (!poses || !poses.stand) throw new Error("prepareCatalog: poses.stand is required");
  for (const raw of rawMoves) {
    if (!raw || typeof raw.name !== "string") {
      problems.push("every move needs a string name");
      continue;
    }
    if (out.has(raw.name)) problems.push(`duplicate move name '${raw.name}'`);
    out.set(raw.name, prepareMove(raw, poses, problems));
  }
  for (const def of out.values()) {
    if (def.chain && !out.has(def.chain)) problems.push(`move '${def.name}': chain '${def.chain}' is not a move`);
  }
  if (problems.length) throw new Error(`move catalog has ${problems.length} problem(s):\n- ${problems.join("\n- ")}`);
  return out;
}

// ---------- runtime ----------

/** Root offset {dx, dy} at normalized time t, in facing space. */
export function rootOffsetAt(def, t, params) {
  const keys = def.root;
  const val = (k) => ({ dx: evalParam(k.dx, params), dy: evalParam(k.dy, params) });
  if (keys.length === 1 || t <= keys[0].t) return val(keys[0]);
  const last = keys[keys.length - 1];
  if (t >= last.t) return val(last);
  const i = segmentAt(keys, t);
  const a = keys[i];
  const b = keys[i + 1];
  const u = easings[a.ease]((t - a.t) / (b.t - a.t));
  const va = val(a);
  const vb = val(b);
  return { dx: va.dx + (vb.dx - va.dx) * u, dy: va.dy + (vb.dy - va.dy) * u };
}

/**
 * Begin a move on an actor.
 * @param {object} actor  needs { pose } (last displayed pose, may be null)
 * @param {object} def    prepared move
 * @param {{ speed?, params?, beatId?, target?, outcome?, blend? }} opts
 */
export function startMove(actor, def, opts = {}) {
  const params = { ...def.params, ...(opts.params || {}) };
  actor.move = {
    def,
    t: 0,
    speed: opts.speed ?? 1,
    params,
    beatId: opts.beatId ?? null,
    target: opts.target ?? null,
    outcome: opts.outcome ?? null,
    scale: actor.scale ?? 1, // root motion is authored at scale 1 and scales with the character
    blendFrom: actor.pose || null,
    blendT: 0,
    blendDur: opts.blend ?? (def.category === "reaction" ? 0 : MOTION.blend),
    lastRoot: rootOffsetAt(def, 0, params),
    eventIndex: 0,
    openedWindows: new Set(),
    cycle: 0,
    traveled: 0,
  };
}

/**
 * Advance the actor's current move by dt story seconds.
 * @returns {{ pose, rootDx, rootDy, openWindows, events, ended, snapHard, mouth }}
 *   rootDx: forward distance moved this tick (facing space); rootDy: current visual root offset.
 *   Both are in world px: authored values times the actor's scale. params.distance is in world px too.
 */
export function stepMove(actor, dt) {
  const m = actor.move;
  const def = m.def;
  const loop = !!def.flags.loop;
  const events = [];
  const tPrev = m.t;
  let t = m.t + (dt * m.speed) / def.duration;
  let ended = false;
  let snapHard = false;

  const fireUpTo = (limit) => {
    while (m.eventIndex < def.events.length && def.events[m.eventIndex].t <= limit) {
      events.push({ type: "moveEvent", move: def.name, ...def.events[m.eventIndex] });
      m.eventIndex++;
    }
  };
  const snapCrossed = (from, to) => def.keys.some((k) => k.snapHard && k.t > from && k.t <= to);

  let rootDx = 0;
  if (t >= 1 && loop) {
    fireUpTo(1);
    snapHard ||= snapCrossed(tPrev, 1);
    rootDx += rootOffsetAt(def, 1, m.params).dx - m.lastRoot.dx;
    m.cycle++;
    t -= Math.floor(t);
    m.eventIndex = 0;
    m.lastRoot = rootOffsetAt(def, 0, m.params);
    if (m.params.cycles !== undefined && m.cycle >= m.params.cycles) {
      ended = true;
      t = 1;
    } else {
      fireUpTo(t);
      snapHard ||= snapCrossed(0, t);
    }
  } else {
    if (t >= 1) {
      t = 1;
      ended = true;
    }
    fireUpTo(t);
    snapHard ||= snapCrossed(tPrev, t);
  }
  const root = rootOffsetAt(def, t, m.params);
  if (!(ended && loop)) rootDx += root.dx - m.lastRoot.dx;
  m.lastRoot = root;
  rootDx *= m.scale;

  if (m.params.distance !== undefined) {
    const remaining = m.params.distance - m.traveled;
    if (Math.abs(rootDx) >= Math.abs(remaining)) {
      rootDx = remaining;
      ended = true;
    }
    m.traveled += rootDx;
  }
  m.t = t;

  const openWindows = [];
  def.hits.forEach((hit, index) => {
    if (t >= hit.t0 && t <= hit.t1) {
      openWindows.push({ index, hit });
      if (!m.openedWindows.has(index)) {
        m.openedWindows.add(index);
        events.push({ type: "windowOpen", move: def.name, index, beatId: m.beatId });
      }
    }
  });

  let pose = samplePoseKeys(def.keys, t);
  if (m.blendFrom && m.blendT < m.blendDur) {
    pose = blendPose(m.blendFrom, pose, easings.outQuad(m.blendT / m.blendDur));
    m.blendT += dt;
  }
  return { pose, rootDx, rootDy: root.dy * m.scale, openWindows, events, ended, snapHard, mouth: def.mouth };
}
