// Objects in the world (STORY_SPEC 8). Milestone: S4. Behaviors: static, seat, holdable, ball,
// floater, vehicle, breakable (data/objects.js). Heights (y) are measured up from the floor.
// Balls and vehicles step with story dt; floaters are closed-form in time (like particles).
// Changes are reported as "object" events ({ what, id, kind, x, y, fx?, sfx?, volume? }) so the
// presentation can add effects and sounds, and the renderer can show static objects from the log.

import { mulberry32, hash32 } from "./math.js";

export const GRAVITY = 1800; // px/s², objects only
const BOUNCE_MIN = 140; // px/s: slower impacts stop the bounce

/** Prop-format data for anything holdable: a v1 prop or a holdable object's `hold`. */
export function holdableData(catalog, name) {
  return catalog.props?.[name] || catalog.objects?.[name]?.hold || null;
}

/** Names that can be held (v1 props first, so v1 prop indices never change). */
export function holdableNames(catalog) {
  const extra = Object.entries(catalog.objects || {}).filter(([k, o]) => o.hold && !catalog.props?.[k]).map(([k]) => k);
  return [...Object.keys(catalog.props || {}), ...extra];
}

/** Per-frame stored behaviors (everything else is static and drawn from the event log). */
export const MOVING = ["ball", "floater", "vehicle"];

/**
 * @param {Array<{ id, object, x, y?, layer?, facing?, state? }>} set  the scene's set pieces
 * @param {{ catalog, seed, sceneId, groundY, stageWidth }} ctx
 */
export function createObjects(set, ctx) {
  const objs = { list: [], byId: new Map(), ctx, rng: mulberry32(hash32(`objects:${ctx.seed}:${ctx.sceneId}`)), seq: 0 };
  for (const p of set || []) add(objs, p, 0, true);
  return objs;
}

function add(objs, p, t, isSet) {
  const def = objs.ctx.catalog.objects?.[p.object];
  if (!def) return null;
  const o = {
    id: p.id || `${p.object}#${++objs.seq}`, kind: p.object, def, behavior: def.behavior, set: !!isSet,
    x: p.x, y: p.y ?? 0, vx: p.vx ?? 0, vy: p.vy ?? 0, angle: 0, wheel: 0, facing: p.facing ?? 1,
    layer: p.layer || "mid", state: p.state ?? def.states?.[0] ?? null, alive: true, t0: t, target: null, exit: null, speed: def.speed ?? 0,
  };
  if (o.behavior === "floater") {
    const r = objs.rng;
    o.x0 = o.x;
    o.y0 = o.y;
    o.life = def.life[0] + (def.life[1] - def.life[0]) * r();
    o.phase = r() * Math.PI * 2;
    o.driftDir = r() < 0.5 ? -1 : 1;
  }
  objs.list.push(o);
  objs.byId.set(o.id, o);
  return o;
}

/** Spawn an object (spawn_object or use). Returns its events. */
export function spawnObject(objs, p, t) {
  const o = add(objs, p, t, false);
  if (!o) return [];
  return [{ type: "object", what: "spawn", id: o.id, kind: o.kind, x: o.x, y: o.y, layer: o.layer, state: o.state, facing: o.facing }];
}

export function removeObject(objs, id) {
  const o = objs.byId.get(id);
  if (!o || !o.alive) return [];
  o.alive = false;
  return [{ type: "object", what: "remove", id, kind: o.kind, x: o.x, y: o.y }];
}

/**
 * set_object: a state change, a ball launch (toX + height, or vx/vy), a vehicle drive (toX + speed, or exit).
 * @returns {object[]} events
 */
export function setObject(objs, id, p) {
  const o = objs.byId.get(id);
  if (!o || !o.alive) return [];
  const ev = [];
  const base = { type: "object", id, kind: o.kind, x: o.x, y: o.y };
  if (p.state !== undefined && p.state !== o.state) {
    o.state = p.state;
    if (o.behavior === "breakable" && p.state === "broken") {
      o.alive = false;
      ev.push({ ...base, what: "break", fx: ["prop_break"], sfx: "land", volume: 0.8 });
    } else ev.push({ ...base, what: "state", state: p.state, ...(o.def.sfx?.[p.state] ? { sfx: o.def.sfx[p.state], volume: 0.7 } : {}) });
  }
  if (o.behavior === "ball" && (p.toX !== undefined || p.vx !== undefined)) {
    if (p.toX !== undefined) {
      const h = Math.max(20, p.height ?? 160);
      o.vy = Math.sqrt(2 * GRAVITY * h);
      const T = (o.vy + Math.sqrt(o.vy * o.vy + 2 * GRAVITY * o.y)) / GRAVITY; // until it lands
      o.vx = (p.toX - o.x) / T;
    } else {
      o.vx = p.vx;
      o.vy = p.vy ?? 0;
    }
    ev.push({ ...base, what: "launch", sfx: "racket_hit", volume: 0.5 });
  }
  if (o.behavior === "vehicle" && (p.toX !== undefined || p.exit)) {
    const W = objs.ctx.stageWidth;
    o.exit = p.exit || null;
    o.target = p.exit === "left" ? -o.def.w : p.exit === "right" ? W + o.def.w : p.toX;
    o.speed = p.speed ?? o.def.speed;
    ev.push({ ...base, what: "drive", sfx: "car_pass", volume: 0.7 });
  }
  return ev;
}

/** Advance moving objects by dt story seconds at story time t. */
export function stepObjects(objs, dt, t) {
  const ev = [];
  const W = objs.ctx.stageWidth;
  for (const o of objs.list) {
    if (!o.alive) continue;
    if (o.behavior === "ball" && dt > 0 && (o.y > 0 || o.vy !== 0 || o.vx !== 0)) {
      o.vy -= GRAVITY * dt;
      o.x += o.vx * dt;
      o.y += o.vy * dt;
      o.angle += (o.vx * dt) / (o.def.r || 10);
      if (o.y <= 0) {
        o.y = 0;
        if (Math.abs(o.vy) > BOUNCE_MIN) {
          ev.push({ type: "object", what: "bounce", id: o.id, kind: o.kind, x: o.x, y: 0, sfx: "ball_bounce", volume: Math.min(1, Math.abs(o.vy) / 900) });
          o.vy = -o.vy * (o.def.bounce ?? 0.6);
          o.vx *= 0.8;
        } else {
          o.vy = 0;
          o.vx *= Math.max(0, 1 - 3 * dt); // rolling friction
          if (Math.abs(o.vx) < 4) o.vx = 0;
        }
      }
      if (o.x < 0 || o.x > W) {
        ev.push({ type: "object", what: "offstage", id: o.id, kind: o.kind, x: o.x, y: o.y });
        o.alive = false;
      }
    } else if (o.behavior === "floater") {
      const age = t - o.t0;
      const d = o.def;
      o.x = o.x0 + o.driftDir * d.drift * age + d.wobble * Math.sin(age * 2.6 + o.phase);
      o.y = o.y0 + d.rise * age;
      o.angle = 0.15 * Math.sin(age * 1.7 + o.phase);
      if (age >= o.life) {
        o.alive = false;
        ev.push(d.pop
          ? { type: "object", what: "pop", id: o.id, kind: o.kind, x: o.x, y: o.y, fx: ["bubble_pop"], sfx: "bubble_pop", volume: 0.35 }
          : { type: "object", what: "remove", id: o.id, kind: o.kind, x: o.x, y: o.y });
      }
    } else if (o.behavior === "vehicle" && o.target !== null && dt > 0) {
      const dir = Math.sign(o.target - o.x);
      const step = Math.min(Math.abs(o.target - o.x), o.speed * dt);
      o.x += dir * step;
      o.facing = dir || o.facing;
      o.wheel += step / (o.def.wheelR || 20);
      if (Math.abs(o.target - o.x) < 1e-6) {
        o.target = null;
        if (o.exit) {
          o.alive = false;
          ev.push({ type: "object", what: "remove", id: o.id, kind: o.kind, x: o.x, y: 0 });
        } else ev.push({ type: "object", what: "stop", id: o.id, kind: o.kind, x: o.x, y: 0 });
      } else if (!o.exit && (o.x < 0 || o.x > W)) {
        ev.push({ type: "object", what: "offstage", id: o.id, kind: o.kind, x: o.x, y: 0 });
        o.target = null;
      }
    }
  }
  return ev;
}

/**
 * The use move: what a held object does (bubble_wand → bubbles from the tip, phone → a flash).
 * @param {{ x, y }} tip  world point (screen y) of the held object's tip; groundY to convert heights
 */
export function useHeld(objs, actor, tip, t) {
  const use = objs.ctx.catalog.objects?.[actor.prop?.name]?.use;
  if (!use) return [];
  const ev = [];
  if (use.spawn) {
    const [a, b] = use.count || [1, 1];
    const n = a + Math.floor(objs.rng() * (b - a + 1));
    for (let i = 0; i < n; i++) {
      ev.push(...spawnObject(objs, {
        object: use.spawn, x: tip.x + actor.facing * (10 + objs.rng() * 30), y: objs.ctx.groundY - tip.y + (objs.rng() - 0.5) * 30,
        layer: "mid",
      }, t));
    }
  }
  ev.push({ type: "object", what: "use", id: actor.prop.name, kind: actor.prop.name, x: tip.x, y: objs.ctx.groundY - tip.y, actor: actor.id,
    ...(use.fx ? { fx: use.fx } : {}), ...(use.sfx ? { sfx: use.sfx, volume: 0.6 } : {}) });
  return ev;
}

/** True while a ball moves, a vehicle drives or a bubble floats: the scene is not quiet yet. */
export function objectsBusy(objs) {
  return objs.list.some((o) => o.alive && ((o.behavior === "ball" && (o.vx !== 0 || o.vy !== 0 || o.y > 0))
    || (o.behavior === "vehicle" && o.target !== null) || (o.behavior === "floater" && o.def.pop)));
}

/** Frame items for moving objects (static ones are drawn from the scene set and the event log). */
export function movingItems(objs, groundY) {
  const out = [];
  for (const o of objs.list) {
    if (!o.alive || !MOVING.includes(o.behavior)) continue;
    out.push({ obj: o.id, kind: o.kind, x: o.x, y: groundY - o.y, angle: o.angle, wheel: o.wheel, facing: o.facing, layer: o.layer });
  }
  return out;
}
