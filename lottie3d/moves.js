// Move rules for Lottie3D v0.2 (EDITOR_SPEC.md 5-6): each turns one timeline block into keyframes on a cast
// member's channels. Pure and deterministic: the output depends only on the block, the member's state and the
// catalog. A rule starts from the member's state at the block start and leaves the state where the move ends.
//
// Channels: position [x, y, z] (feet on the floor at y = 0), rotation [pitch, yaw, roll] in degrees (yaw turns about
// +Y, pitch and roll turn about the member's middle), scale (a factor of its size, as [x, y, z]), eyes (1 open, 0 shut),
// joints (rig joint rotations, rest [0, 0, 0]). Clips (glTF characters) and events (say, sound) are lists.

const R = 180 / Math.PI;
const lerp = (a, b, u) => a + (b - a) * u;
const S = (s) => [s, s, s];

/** Shortest equivalent of `to` measured from `from` (degrees), so a turn never goes the long way round. */
export function nearestAngle(from, to) {
  let d = (((to - from) % 360) + 540) % 360 - 180;
  return from + d;
}

const yawToward = (from, to) => Math.atan2(to[0] - from[0], to[2] - from[2]) * R;

/** Turn to face a point quickly at the start of a block; returns when the turn ends. */
function quickTurn(c, t0, dur, point) {
  const { st, ch } = c;
  const dx = point[0] - st.pos[0];
  const dz = point[2] - st.pos[2];
  if (Math.hypot(dx, dz) < 1e-6) return t0;
  const yaw = nearestAngle(st.rot[1], yawToward(st.pos, point));
  const tt = Math.min(0.3, dur * 0.2);
  ch.rotation.set(t0, st.rot.slice(), "sineInOut");
  st.rot[1] = yaw;
  ch.rotation.set(t0 + tt, st.rot.slice());
  return t0 + tt;
}

/** Joint keys for a rig: rest at t0, then [time, {joint: value}] frames, rest again at t1. */
function jointFrames(c, t0, t1, frames, ease = "sineInOut") {
  const names = new Set(frames.flatMap(([, j]) => Object.keys(j)));
  for (const n of names) {
    const tr = c.joint(n);
    tr.set(t0, [0, 0, 0], ease);
    for (const [t, j] of frames) tr.set(t, j[n] ?? [0, 0, 0], ease);
    tr.set(t1, [0, 0, 0]);
  }
}

/** Walk-cycle joint frames for a rig between t0 and t1 (a step every 0.25 s). */
function rigWalk(c, t0, t1) {
  const steps = Math.max(2, Math.round((t1 - t0) / 0.25));
  const frames = [];
  for (let i = 1; i < steps; i++) {
    const s = i % 2 ? 1 : -1;
    frames.push([lerp(t0, t1, i / steps), {
      hipL: [-25 * s, 0, 0], hipR: [25 * s, 0, 0], kneeL: [s > 0 ? 10 : 45, 0, 0], kneeR: [s > 0 ? 45 : 10, 0, 0],
      shoulderL: [20 * s, 0, 4], shoulderR: [-20 * s, 0, -4], elbowL: [-20, 0, 0], elbowR: [-20, 0, 0],
    }]);
  }
  jointFrames(c, t0, t1, frames);
}

/** Travel to `to` with a gait that fits the member: Walking clip, rig walk cycle, or a toy waddle. */
function travel(c, t0, t1, to) {
  const { st, ch, model } = c;
  const from = st.pos.slice();
  const steps = Math.max(1, Math.round((t1 - t0) / 0.25));
  const waddle = model.kind === "critter" || model.kind === "prop";
  ch.position.set(t0, from.slice());
  if (waddle) ch.rotation.set(t0, st.rot.slice());
  for (let i = 1; i <= steps; i++) {
    const u = i / steps;
    const up = i < steps && i % 2 === 1 ? (waddle ? 0.08 : 0.03) : 0;
    ch.position.set(lerp(t0, t1, u), [lerp(from[0], to[0], u), from[1] + up, lerp(from[2], to[2], u)]);
    if (waddle) ch.rotation.set(lerp(t0, t1, u), [st.rot[0], st.rot[1], i < steps ? (i % 2 ? 7 : -7) : st.rot[2]]);
  }
  st.pos = [to[0], from[1], to[2]];
  if (model.kind === "character") c.clip(t0, t1, "Walking");
  if (model.kind === "rig") rigWalk(c, t0, t1);
}

/** @type {Record<string, (c: any) => void>} */
export const MOVES = {
  hop(c) {
    const { b, st, ch } = c;
    const n = b.with.times;
    const d = b.dur / n;
    const y0 = st.pos[1];
    for (let k = 0; k < n; k++) {
      const t = b.at + k * d;
      ch.position.set(t, [st.pos[0], y0, st.pos[2]], "quadOut");
      ch.position.set(t + d / 2, [st.pos[0], y0 + b.with.height, st.pos[2]], "quadIn");
      ch.position.set(t + d, [st.pos[0], y0, st.pos[2]]);
    }
  },
  spin(c) {
    const { b, st, ch } = c;
    ch.rotation.set(b.at, st.rot.slice(), "sineInOut");
    st.rot[1] += 360 * b.with.turns;
    ch.rotation.set(b.at + b.dur, st.rot.slice());
  },
  wiggle(c) {
    const { b, st, ch } = c;
    const a = b.with.amount;
    const swings = [a, -a * 0.8, a * 0.6, -a * 0.4, a * 0.2, 0];
    ch.rotation.set(b.at, st.rot.slice(), "sineInOut");
    swings.forEach((s, i) => ch.rotation.set(b.at + (b.dur * (i + 1)) / swings.length, [st.rot[0], st.rot[1], st.rot[2] + s], "sineInOut"));
  },
  nod(c) {
    const { b, st, ch } = c;
    const n = b.with.times;
    ch.rotation.set(b.at, st.rot.slice(), "sineInOut");
    for (let k = 0; k < n; k++) {
      ch.rotation.set(b.at + (b.dur * (k + 0.5)) / n, [st.rot[0] + b.with.amount, st.rot[1], st.rot[2]], "sineInOut");
      ch.rotation.set(b.at + (b.dur * (k + 1)) / n, st.rot.slice(), "sineInOut");
    }
  },
  show(c) {
    const { b, st, ch } = c;
    ch.scale.set(b.at, S(st.hidden ? 0 : st.scale * 0.6), "backOut");
    ch.scale.set(b.at + b.dur, S(st.scale));
    st.hidden = false;
  },
  hide(c) {
    const { b, st, ch } = c;
    ch.scale.set(b.at, S(st.hidden ? 0 : st.scale), "backIn");
    ch.scale.set(b.at + b.dur, S(0));
    st.hidden = true;
  },
  grow(c) {
    const { b, st, ch } = c;
    ch.scale.set(b.at, S(st.hidden ? 0 : st.scale), "backOut");
    st.scale = b.with.to;
    ch.scale.set(b.at + b.dur, S(st.hidden ? 0 : st.scale));
  },
  shrink(c) {
    MOVES.grow(c);
  },
  walk_to(c) {
    const { b } = c;
    const to = [b.with.to[0], c.st.pos[1], b.with.to[1]];
    const t = quickTurn(c, b.at, b.dur, to);
    travel(c, t, b.at + b.dur, to);
  },
  leap(c) {
    const { b, st, ch, model } = c;
    const to = [b.with.to[0], st.pos[1], b.with.to[1]];
    const t0 = quickTurn(c, b.at, b.dur, to);
    const t1 = b.at + b.dur;
    const from = st.pos.slice();
    const n = 8;
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      ch.position.set(lerp(t0, t1, u), [lerp(from[0], to[0], u), from[1] + 4 * b.with.height * u * (1 - u), lerp(from[2], to[2], u)]);
    }
    st.pos = to;
    if (model.kind === "character") c.clip(b.at, t1, "Jump");
    if (model.kind === "rig") {
      const tuck = { hipL: [-60, 0, 0], hipR: [-60, 0, 0], kneeL: [90, 0, 0], kneeR: [90, 0, 0], shoulderL: [-150, 0, 20], shoulderR: [-150, 0, -20] };
      jointFrames(c, t0, t1, [[lerp(t0, t1, 0.5), tuck]]);
    }
  },
  roll(c) {
    const { b, st, ch, size } = c;
    const yaw = st.rot[1] / R;
    const d = b.with.distance;
    const r = Math.max(0.1, (c.model.height * size * st.scale) / 2);
    const turns = Math.max(1, Math.round(Math.abs(d) / (2 * Math.PI * r))) * Math.sign(d || 1);
    const to = [st.pos[0] + Math.sin(yaw) * d, st.pos[1], st.pos[2] + Math.cos(yaw) * d];
    ch.position.set(b.at, st.pos.slice(), "sineInOut");
    ch.rotation.set(b.at, st.rot.slice(), "sineInOut");
    st.pos = to;
    st.rot[0] += 360 * turns;
    ch.position.set(b.at + b.dur, st.pos.slice());
    ch.rotation.set(b.at + b.dur, st.rot.slice());
  },
  turn(c) {
    const { b, st, ch } = c;
    ch.rotation.set(b.at, st.rot.slice(), "sineInOut");
    st.rot[1] = nearestAngle(st.rot[1], b.with.to);
    ch.rotation.set(b.at + b.dur, st.rot.slice());
  },
  look_at(c) {
    const { b, st, ch } = c;
    const p = c.lookup(b.with.target, b.at);
    ch.rotation.set(b.at, st.rot.slice(), "sineInOut");
    if (p) st.rot[1] = nearestAngle(st.rot[1], yawToward(st.pos, p));
    ch.rotation.set(b.at + b.dur, st.rot.slice());
  },
  say(c) {
    const { b, st, ch } = c;
    c.event({ type: "say", text: b.with.words.join(" ") });
    // A little bounce while talking.
    const n = Math.max(1, Math.round(b.dur / 0.5));
    ch.rotation.set(b.at, st.rot.slice(), "sineInOut");
    for (let k = 0; k < n; k++) {
      ch.rotation.set(b.at + (b.dur * (k + 0.5)) / n, [st.rot[0] - 4, st.rot[1], st.rot[2]], "sineInOut");
      ch.rotation.set(b.at + (b.dur * (k + 1)) / n, st.rot.slice(), "sineInOut");
    }
  },
  sound(c) {
    const { b, model, catalog } = c;
    const name = b.with.name;
    const text = name === "own" ? model.sound ?? "♪" : catalog.sounds[name]?.label ?? name;
    c.event({ type: "sound", name, text });
  },
  dance(c) {
    const { b, st, ch, model } = c;
    const t1 = b.at + b.dur;
    if (model.kind === "character") return c.clip(b.at, t1, "Dance");
    const beats = Math.max(2, Math.round(b.dur / 0.5));
    ch.position.set(b.at, st.pos.slice(), "sineInOut");
    ch.rotation.set(b.at, st.rot.slice(), "sineInOut");
    const frames = [];
    for (let k = 1; k <= beats; k++) {
      const t = lerp(b.at, t1, k / beats);
      const th = lerp(b.at, t1, (k - 0.5) / beats);
      const s = k % 2 ? 1 : -1;
      const last = k === beats;
      ch.position.set(th, [st.pos[0], st.pos[1] + (model.kind === "rig" ? 0.06 : 0.15), st.pos[2]], "sineInOut");
      ch.position.set(t, st.pos.slice(), "sineInOut");
      ch.rotation.set(t, last ? st.rot.slice() : [st.rot[0], st.rot[1] + 20 * s, st.rot[2] + 10 * s], "sineInOut");
      if (model.kind === "rig" && !last) {
        frames.push([th, { kneeL: [25, 0, 0], kneeR: [25, 0, 0], hipL: [-12, 0, 0], hipR: [-12, 0, 0] }]);
        frames.push([t, { shoulderL: [0, 0, s > 0 ? 150 : 30], shoulderR: [0, 0, s > 0 ? -30 : -150], spine: [0, 0, 8 * s], neck: [0, 0, -6 * s] }]);
      }
    }
    if (frames.length) jointFrames(c, b.at, t1, frames);
  },
  wave(c) {
    const { b, model } = c;
    const t0 = b.at;
    const t1 = b.at + b.dur;
    if (model.kind === "character") return c.clip(t0, t1, "Wave");
    const up = Math.min(0.35, b.dur * 0.25);
    const frames = [[t0 + up, { shoulderR: [0, 0, -155], neck: [-5, 10, -8] }]];
    const swings = Math.max(2, Math.round((b.dur - 2 * up) / 0.25));
    for (let k = 1; k <= swings; k++) {
      frames.push([lerp(t0 + up, t1 - up, k / swings), { shoulderR: [0, 0, -155], elbowR: [0, 0, k % 2 ? -35 : 25], neck: [-5, 10, -8] }]);
    }
    jointFrames(c, t0, t1, frames);
  },
  sleep(c) {
    const { b, st, ch } = c;
    ch.eyes.set(b.at, st.eyes, "sineInOut");
    ch.rotation.set(b.at, st.rot.slice(), "sineInOut");
    st.eyes = 0;
    if (!st.asleep) st.rot[0] += 8;
    st.asleep = true;
    ch.eyes.set(b.at + b.dur, 0);
    ch.rotation.set(b.at + b.dur, st.rot.slice());
  },
  wake(c) {
    const { b, st, ch } = c;
    ch.eyes.set(b.at, st.eyes, "backOut");
    ch.rotation.set(b.at, st.rot.slice(), "sineInOut");
    st.eyes = 1;
    if (st.asleep) st.rot[0] -= 8;
    st.asleep = false;
    ch.eyes.set(b.at + b.dur * 0.5, 1);
    ch.rotation.set(b.at + b.dur, st.rot.slice());
  },
  clip(c) {
    c.clip(c.b.at, c.b.at + c.b.dur, c.b.with.name);
  },
  pose(c) {
    const { b } = c;
    const pose = c.poses[b.with.name];
    const t1 = b.at + b.dur;
    const inT = Math.min(0.4, b.dur * 0.3);
    const outT = Math.min(0.4, b.dur * 0.25);
    jointFrames(c, b.at, t1, [[b.at + inT, pose.joints], [t1 - outT, pose.joints]], "backOut");
  },
};

export const MOVE_NAMES = Object.keys(MOVES);
export const CAMERA_MOVES = ["wide", "close", "follow", "orbit"];
