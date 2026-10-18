// The rally runner for activities (STORY_SPEC 10, S5.6): two players pass a ball back and forth.
// Milestone: S5. The hitter's move has a `contact` event (racket swing, toss, kick); the ball flies
// from that point to where the receiver will meet it, timed so the receiver's own contact lands as
// it arrives. With a catch move the receiver catches and holds the ball, then throws it back.
// After `reps` passes the receiver misses (late), the ball bounces past, and the ending plays.
// Heights are measured up from the floor (objects); a ball's y is its bottom.

import { command } from "../world.js";
import { spawnObject, GRAVITY } from "../objects.js";
import { isIdleMove } from "../moves.js";

const REACH = { propTip: 62, hands: 40, foot: 26 }; // px forward of the hip where the ball is met (scale 1)
const FRICTION = 3; // the ground ball's rolling friction in objects.js (1/s)
const LATE = 0.3; // s the loser reaches too late
const CATCH_PAUSE = 0.35; // s holding the ball before throwing it back
const SETTLE = 3; // s after the miss before the ending starts anyway
const WHIFF = 110; // px: farther from the ball at contact is a miss
const MISS_LATE = 0.5; // s a scheduled swing may wait for its player before it counts as a miss

const free = (a) => !a.move || isIdleMove(a.move.def) || a.holding;

/** When a move's contact event happens, in seconds from its start. */
function contactLead(world, name, speed = 1) {
  const def = world.moves.get(name);
  const e = (def?.events || []).find((x) => x.contact);
  return ((e?.t ?? 0.5) * (def?.duration ?? 0.7)) / speed;
}

/** Where a player meets the ball right now (world x, height above the floor). */
function meetPoint(world, act, a) {
  const at = act.def.rally.at;
  const groundY = world.objects.ctx.groundY;
  const j = a.joints;
  if (at === "propTip" && j.propTip) return { x: j.propTip.x, y: groundY - j.propTip.y };
  if (at === "foot") {
    const foot = a.facing * j.lFoot.x > a.facing * j.rFoot.x ? j.lFoot : j.rFoot;
    return { x: foot.x + a.facing * act.ball.def.r, y: 0 };
  }
  return { x: (j.lHand.x + j.rHand.x) / 2, y: groundY - (j.lHand.y + j.rHand.y) / 2 - act.ball.def.r };
}

/**
 * Where the receiver will meet the ball: where its own contacts have been so far (forward of the
 * hip, height), or a default reach before its first one.
 */
function aimPoint(act, a) {
  const r = act.def.rally;
  const seen = act.rally.meets.get(a.id);
  if (seen) return { x: a.x + a.facing * seen.dx, y: seen.h };
  return { x: a.x + a.facing * REACH[r.at] * a.scale, y: r.height * a.scale };
}

function hold(act, a) {
  act.ball.held = a;
  act.ball.vx = act.ball.vy = 0;
}

export function rallyStart(world, act, t, events) {
  const r = act.def.rally;
  const [first] = act.players;
  const id = `${act.beatId}_ball`;
  events.push(...spawnObject(world.objects, { object: r.ball, id, x: first.x, y: r.height, layer: "mid" }, t));
  act.ball = world.objects.byId.get(id);
  hold(act, first);
  let reps = act.params.reps ?? act.def.reps ?? 6;
  // The last receiver misses: pass index k is hit by player k % 2, so the loser is player reps % 2.
  if (act.params.winner && act.players[reps % 2].id === act.params.winner) reps += 1;
  act.rally = { reps, hits: 0, loser: null, missAt: null, meets: new Map(), next: { who: 0, at: t + 0.3, move: pickHit(act) } };
}

function pickHit(act) {
  const list = act.def.rally.hit;
  return list[Math.floor(act.rng() * list.length) % list.length];
}

/** Each step: keep a held ball at its holder, start scheduled moves, end after the miss. */
export function rallyStep(world, act, t, events) {
  const rs = act.rally;
  const b = act.ball;
  if (b?.held && b.alive) {
    const p = meetPoint(world, act, b.held);
    b.x = p.x;
    b.y = Math.max(0, p.y);
  }
  if (act.phase !== "run") return;
  const n = rs.next;
  if (n && t >= n.at - 1e-9 && free(act.players[n.who])) {
    command(world, act.players[n.who].id, n.move, {});
    rs.next = null;
  } else if (n && t > n.at + MISS_LATE && !rs.loser) {
    rs.loser = act.players[n.who]; // still busy when the ball came: a miss
    rs.missAt = t;
    rs.next = null;
  }
  if (rs.loser) {
    const settled = !b.alive || (b.vx === 0 && b.vy === 0 && b.y <= 0);
    // activities.js starts the ending (it owns the phases; this keeps the imports one-way).
    if ((settled && t >= rs.missAt) || t - rs.missAt > SETTLE) act.endRequest = { loser: rs.loser };
  }
}

/** A player's contact event: hit the ball on (or catch it). */
export function rallyContact(world, act, a, t, events) {
  const rs = act.rally;
  const r = act.def.rally;
  const b = act.ball;
  if (!b?.alive || a === rs.loser) return;
  const i = act.players.indexOf(a);
  const other = act.players[1 - i];
  if (r.catch && a.move?.def.name === r.catch) {
    hold(act, a);
    events.push({ type: "object", what: "catch", id: b.id, kind: b.kind, x: b.x, y: b.y, sfx: "ball_bounce", volume: 0.5 });
    rs.next = { who: i, at: t + CATCH_PAUSE * act.speed, move: pickHit(act) };
    return;
  }
  const from = meetPoint(world, act, a);
  rs.meets.set(a.id, { dx: (from.x - a.x) * a.facing, h: Math.max(0, from.y) });
  if (b.held !== a && Math.hypot(b.x - from.x, b.y - from.y) > WHIFF * a.scale) {
    rs.loser = a; // nowhere near: a whiff, and the rally ends
    rs.missAt = t;
    rs.next = null;
    return;
  }
  b.held = null;
  b.x = from.x;
  b.y = Math.max(0, from.y);
  const to = aimPoint(act, other);
  const T = r.flight * act.speed;
  if (r.height === 0) {
    // Along the ground: rolling friction slows it, so start fast enough to arrive in T.
    b.vx = (FRICTION * (to.x - b.x)) / (1 - Math.exp(-FRICTION * T));
    if (rs.hits + 1 >= rs.reps) b.vx *= 1.8; // the last one rolls past the loser
    b.vy = 0;
  } else {
    b.vx = (to.x - b.x) / T;
    b.vy = (to.y - b.y + 0.5 * GRAVITY * T * T) / T + GRAVITY / 120; // + half a step of the Euler integration
  }
  events.push({ type: "object", what: "launch", id: b.id, kind: b.kind, x: b.x, y: b.y, ...(r.at === "propTip" ? { sfx: "racket_hit", volume: 0.6 } : {}) });
  rs.hits++;
  const move = r.catch || pickHit(act);
  const lead = contactLead(world, move);
  if (rs.hits >= rs.reps) {
    rs.loser = other; // reaches too late: the ball goes past
    rs.missAt = t + T;
    rs.next = { who: 1 - i, at: t + T - lead + LATE, move };
  } else rs.next = { who: 1 - i, at: t + T - lead, move };
}

/** Interrupted: a held ball drops where it is. */
export function rallyRelease(act) {
  if (act.ball?.held) act.ball.held = null;
}
