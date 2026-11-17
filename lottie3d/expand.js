// Lottie3D v0.2 expansion (EDITOR_SPEC.md 5): stage + cast + timeline blocks → keyframe channels per cast member,
// camera tracks and events. Pure: the result depends only on the document and the catalog, never on a clock.
// evaluateCast(resolved, t) then gives everything the renderer needs at time t.
import { CAMERA_MOVES, MOVES } from "./moves.js";
import { sampleTrack } from "./sample.js";

const EPS = 1e-9;

/** A keyframe list that only grows forward in time; a key at the same time as the last one replaces it. */
export class Channel {
  constructor(v0) {
    this.keys = [{ t: 0, v: copy(v0) }];
  }
  set(t, v, ease) {
    const last = this.keys[this.keys.length - 1];
    if (t < last.t - EPS) throw new Error(`channel keys must move forward in time: ${t} after ${last.t}`);
    const key = { t: round(t), v: copy(v) };
    if (ease) key.ease = ease;
    if (Math.abs(t - last.t) < EPS) this.keys[this.keys.length - 1] = key;
    else this.keys.push(key);
  }
  get last() {
    return this.keys[this.keys.length - 1];
  }
}

const copy = (v) => (Array.isArray(v) ? v.map(round) : round(v));
const round = (x) => Math.round(x * 1e6) / 1e6;

/** Options with their catalog defaults filled in. */
function withDefaults(move, given = {}) {
  const out = {};
  for (const [k, spec] of Object.entries(move.options ?? {})) out[k] = given[k] ?? spec.default;
  return out;
}

/** Blocks for one row (a cast id or "camera"), sorted by start time, with dur and options filled in. */
function rowBlocks(doc, catalog, who) {
  return (doc.timeline ?? [])
    .filter((b) => b.who === who)
    .map((b) => {
      const move = catalog.moves[b.do];
      return { ...b, dur: b.dur ?? move.dur, with: withDefaults(move, b.with) };
    })
    .sort((a, b) => a.at - b.at);
}

/** Expand one cast member. `lookup(id, t)` gives another member's position (for look_at), or null. */
function expandMember(doc, catalog, member, lookup) {
  const model = catalog.models[member.name];
  const blocks = rowBlocks(doc, catalog, member.id);
  const startHidden = blocks[0]?.do === "show";
  const st = {
    pos: member.at.length === 3 ? member.at.slice() : [member.at[0], 0, member.at[1]],
    rot: [0, member.facing ?? 0, 0],
    scale: 1,
    eyes: 1,
    hidden: startHidden,
    asleep: false,
  };
  const ch = {
    position: new Channel(st.pos),
    rotation: new Channel(st.rot),
    scale: new Channel(startHidden ? [0, 0, 0] : [1, 1, 1]),
    eyes: new Channel(1),
  };
  const joints = {};
  const clips = [];
  const events = [];
  const ctx = {
    st, ch, model, catalog, lookup, size: member.size ?? 1, poses: doc.poses ?? {},
    joint: (name) => (joints[name] ??= new Channel([0, 0, 0])),
    clip: (t0, t1, name) => clips.push({ t0: round(t0), t1: round(t1), name, loop: !!model.clips?.[name]?.loop }),
    event: (e) => events.push({ t: round(ctx.b.at), dur: ctx.b.dur, who: member.id, ...e }),
  };
  for (const b of blocks) {
    ctx.b = b;
    MOVES[b.do](ctx);
  }
  const tracks = { position: ch.position.keys, rotation: ch.rotation.keys, scale: ch.scale.keys };
  if (ch.eyes.keys.length > 1) tracks.eyes = ch.eyes.keys;
  return {
    id: member.id,
    kind: model.kind,
    name: member.name,
    size: member.size ?? 1,
    color: member.color ?? null,
    height: model.height,
    tracks,
    joints: Object.fromEntries(Object.entries(joints).map(([k, c]) => [k, c.keys])),
    clips,
    events,
  };
}

/** Frame a set of standing things ({ p, h }) in a 16:9 shot with a vertical fov. */
export function frameShot(items, fov = 40) {
  if (!items.length) return { position: [0, 1.6, 6], target: [0, 0.8, 0] };
  const cx = items.reduce((s, i) => s + i.p[0], 0) / items.length;
  const cz = items.reduce((s, i) => s + i.p[2], 0) / items.length;
  const top = Math.max(...items.map((i) => i.p[1] + i.h));
  const spread = Math.max(...items.map((i) => Math.hypot(i.p[0] - cx, i.p[2] - cz)));
  const tan = Math.tan(((fov / 2) * Math.PI) / 180);
  // Things nearer the camera look wider, so the side margin grows with the spread.
  const dist = Math.max(3, (top * 0.6 + 0.4) / tan, (spread + 1.2) / (tan * (16 / 9))) + spread * 0.35;
  const target = [cx, top * 0.45, cz];
  return { position: [cx, target[1] + dist * 0.22, cz + dist], target };
}

/** Camera channels from the camera row (wide, close, follow, orbit); a wide shot at t = 0 when there is none. */
function expandCamera(doc, catalog, cast) {
  const fov = 40;
  const at = (m, t) => sampleTrack(m.tracks.position, t);
  const visible = (m, t) => sampleTrack(m.tracks.scale, t)[1] > 1e-3;
  const item = (m, t) => ({ p: at(m, t), h: m.height * m.size * sampleTrack(m.tracks.scale, t)[1] });
  const wide = (t) => {
    // Frame what stands on the floor; things placed up in the sky (a sun, a cloud) may fall outside the shot.
    const shown = cast.filter((m) => visible(m, t));
    const grounded = shown.filter((m) => at(m, t)[1] < 0.5);
    const list = grounded.length ? grounded : shown.length ? shown : cast;
    return frameShot(list.map((m) => item(m, t)), fov);
  };
  const close = (m, t) => {
    const i = item(m, t);
    const h = Math.max(0.5, i.h);
    const target = [i.p[0], i.p[1] + h * 0.6, i.p[2]];
    const dist = Math.max(1.4, h * 2.4);
    return { position: [target[0], target[1] + h * 0.25, target[2] + dist], target };
  };
  const pos = new Channel([0, 0, 0]);
  const tgt = new Channel([0, 0, 0]);
  const put = (t, shot, ease) => {
    pos.set(t, shot.position, ease);
    tgt.set(t, shot.target, ease);
  };
  // A cut: the last key holds ("step") until the new shot's first key, just after the block starts.
  const cut = (t, shot, ease) => {
    if (t > EPS) {
      pos.last.ease = "step";
      tgt.last.ease = "step";
      t = Math.max(t, pos.last.t + 1e-3);
    }
    put(t, shot, ease);
  };
  put(0, wide(0));
  const byId = new Map(cast.map((m) => [m.id, m]));
  for (const b of rowBlocks(doc, catalog, "camera")) {
    const t0 = b.at;
    const t1 = b.at + b.dur;
    const steps = Math.max(1, Math.round(b.dur / 0.25));
    if (b.do === "wide") cut(t0, wide(t0));
    else if (b.do === "close") cut(t0, close(byId.get(b.with.target), t0));
    else if (b.do === "follow") {
      const m = byId.get(b.with.target);
      const off = (t) => {
        const p = at(m, t);
        const h = Math.max(0.5, m.height * m.size);
        const target = [p[0], h * 0.5, p[2]];
        return { position: [p[0], h * 0.5 + 1.2, p[2] + Math.max(4, h * 3)], target };
      };
      cut(t0, off(t0));
      for (let i = 1; i <= steps; i++) put(t0 + ((t1 - t0) * i) / steps, off(t0 + ((t1 - t0) * i) / steps));
    } else if (b.do === "orbit") {
      // Circle the whole cast at wide-shot distance, starting from the front.
      const w = wide(t0);
      const centre = w.target;
      const r = Math.max(2, Math.hypot(w.position[0] - centre[0], w.position[2] - centre[2]));
      const y = w.position[1];
      for (let i = 0; i <= steps; i++) {
        const u = i / steps;
        const e = -(Math.cos(Math.PI * u) - 1) / 2;
        const a = (b.with.degrees * Math.PI * e) / 180;
        const shot = { position: [centre[0] + Math.sin(a) * r, y, centre[2] + Math.cos(a) * r], target: centre };
        if (i === 0) cut(t0, shot);
        else put(t0 + b.dur * u, shot);
      }
    }
  }
  return { position: pos.keys, target: tgt.keys, fov: [{ t: 0, v: fov }] };
}

/**
 * Expand a v0.2 document. The document must already be valid (validate(doc, { catalog })).
 * @returns {{ duration: number, fps: number, loop: boolean, stage: string|null, cast: any[], camera: any|null, events: any[] }}
 */
export function expand(doc, catalog) {
  const cast = doc.cast ?? [];
  // look_at needs other members' positions, which never depend on look_at: expand once without it, then again.
  const first = new Map(cast.map((m) => [m.id, expandMember(doc, catalog, m, () => null)]));
  const lookup = (id, t) => (first.has(id) ? sampleTrack(first.get(id).tracks.position, t) : null);
  const members = cast.map((m) => expandMember(doc, catalog, m, lookup));
  const hasCameraRow = (doc.timeline ?? []).some((b) => b.who === "camera");
  const camera = hasCameraRow || !doc.scene ? expandCamera(doc, catalog, members) : null;
  const events = members.flatMap((m) => m.events).sort((a, b) => a.t - b.t || (a.who < b.who ? -1 : 1));
  for (const m of members) delete m.events;
  return { duration: doc.duration, fps: doc.fps, loop: doc.loop !== false, stage: doc.stage ?? null, cast: members, camera, events };
}

/** Clip state for a glTF character at time t: the active clip (or the idle) and its local time. */
export function clipAt(member, idle, t) {
  for (const c of member.clips) {
    if (t >= c.t0 && t < c.t1) {
      const blend = Math.min(1, (t - c.t0) / 0.2, (c.t1 - t) / 0.2);
      return { name: c.name, time: t - c.t0, loop: c.loop, weight: Math.max(0, blend), idle, idleTime: t };
    }
  }
  return { name: idle, time: t, loop: true, weight: 1, idle: null, idleTime: t };
}

/** Everything the renderer needs at time t (pure). */
export function evaluateCast(resolved, t, catalog) {
  const camera = resolved.camera
    ? { position: sampleTrack(resolved.camera.position, t), target: sampleTrack(resolved.camera.target, t), fov: sampleTrack(resolved.camera.fov, t) }
    : null;
  const cast = resolved.cast.map((m) => {
    const joints = {};
    for (const name of Object.keys(m.joints).sort()) joints[name] = sampleTrack(m.joints[name], t);
    const model = catalog.models[m.name];
    return {
      id: m.id,
      position: sampleTrack(m.tracks.position, t),
      rotation: sampleTrack(m.tracks.rotation, t),
      scale: sampleTrack(m.tracks.scale, t),
      eyes: m.tracks.eyes ? sampleTrack(m.tracks.eyes, t) : 1,
      joints,
      clip: m.kind === "character" ? clipAt(m, model.idle, t) : null,
    };
  });
  const events = resolved.events.filter((e) => t >= e.t && t < e.t + e.dur);
  return { t, camera, cast, events };
}
