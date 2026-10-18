// Activities at runtime (STORY_SPEC 10, S5.6). Milestone: S5.
// The world command {"do": "activity", "params": { name, with, reps?, dur?, intensity?, ending?, winner?, object? }}
// starts one; data comes from catalog.activities (catalog/story/activities.json). Phases:
//   setup   the players walk to their places (around `object` if given, else around where they stand)
//   run     the runner: "loop" here (each player repeats its role's moves), "rally" in rally.js, "fetch" in fetch.js
//   ending  the ending moves (laugh, win, miss, hug), then an activityEnd event (the beat's end anchor)
// Players are busy for the director while an activity runs; a beat with "interrupt": true for one
// of them stops it (ending "interrupted").

import { command } from "../world.js";
import { startPair, pairStartX } from "./pairs.js";
import { holdableData } from "../objects.js";
import { mulberry32, hash32 } from "../math.js";
import { rallyStart, rallyStep, rallyContact, rallyRelease } from "./rally.js";
import { fetchStart, fetchStep, fetchContact, fetchRelease } from "./fetch.js";
import { isIdleMove } from "../moves.js";

const ARRIVE = 12; // px: close enough to a place to settle there
const MAX_SETUP = 10; // s of walking into place before the activity starts anyway
const RUN_OVER = 260; // px: farther places are reached at a run
const FX_EVERY = 1.4; // s between a role's fx (tears)
export const INTENSITY = { low: 1.25, medium: 1, high: 0.8 }; // time factor (rally flight, waits)

const free = (a) => !a.move || isIdleMove(a.move.def) || a.holding;

/**
 * Start an activity for a world beat. Returns its events, or null when it cannot run (the validator
 * reports why: unknown name, players missing).
 */
export function startActivity(world, beat, p, t, catalog) {
  const def = catalog.activities?.[p.name];
  const players = (p.with || []).map((id) => world.byId.get(id)).filter(Boolean);
  if (!def || !players.length) return null;
  const events = [];
  for (const a of players) if (a.activity) events.push(...stopActivity(world, a.activity, t));
  const object = p.object ? world.objects?.byId.get(p.object) ?? null : null;
  const act = {
    beatId: beat.id, name: p.name, def, params: p, players, object, catalog, phase: "setup", t0: t,
    rng: mulberry32(hash32(`activity:${beat.id}`)), speed: INTENSITY[p.intensity ?? "medium"],
    states: players.map((a, i) => ({ actor: a, role: def.roles[Math.min(i, def.roles.length - 1)], cycle: 0, nextAt: 0, fxAt: 0, started: false, done: false, x: a.x, slot: null })),
  };
  for (const a of players) a.activity = act;
  place(world, act);
  world.activities = [...(world.activities || []), act];
  events.push({ type: "activity", what: "start", name: p.name, beatId: beat.id });
  return events;
}

/** Places for the players, then walk there. Ordered left to right as they stand (stable). */
function place(world, act) {
  const { def, states, object } = act;
  const order = [...states].sort((u, v) => u.actor.x - v.actor.x || states.indexOf(u) - states.indexOf(v));
  const scale = states.reduce((s, q) => s + q.actor.scale, 0) / states.length;
  const center = object ? object.x : states.reduce((s, q) => s + q.actor.x, 0) / states.length;
  const lead = states.find((q) => q.role.partner !== undefined);
  if (lead) {
    // A paired role (comfort): the partner stays, the lead goes to the pair distance.
    const partner = states[lead.role.partner].actor;
    lead.x = pairStartX(lead.actor, partner, world.moves.get(lead.role.moves[0]).pair);
  } else if (object?.behavior === "seat") {
    const slots = object.def.slots || [0];
    order.forEach((q, k) => {
      if (k < slots.length) {
        q.x = object.x + slots[k];
        q.slot = k;
      } else q.x = object.x + (k - slots.length / 2 + 1) * def.spacing * scale * Math.sign(slots[slots.length - 1] || 1);
    });
  } else {
    order.forEach((q, k) => { q.x = center + (k - (order.length - 1) / 2) * (def.spacing ?? 150) * scale; });
  }
  for (const q of states) {
    const d = q.x - q.actor.x;
    if (Math.abs(d) <= ARRIVE) continue;
    q.actor.facing = Math.sign(d);
    command(world, q.actor.id, Math.abs(d) > RUN_OVER * q.actor.scale ? "run" : "walk", { params: { distance: Math.abs(d) } });
  }
}

/** Facing for the run: toward the group's middle, or all to the right (a selfie). */
function faceRun(act) {
  const mid = act.states.reduce((s, q) => s + q.actor.x, 0) / act.states.length;
  for (const q of act.states) {
    if (act.def.facing === "right") q.actor.facing = 1;
    else q.actor.facing = Math.sign(mid - q.actor.x) || q.actor.facing;
  }
}

function beginRun(world, act, t, events) {
  for (const q of act.states) {
    const a = q.actor;
    if (Math.abs(q.x - a.x) <= ARRIVE * 3) a.x = q.x;
    if (q.role.face && a.face) a.face = q.role.face;
    if (q.role.holds && a.prop?.name !== q.role.holds) {
      const data = holdableData(act.catalog, q.role.holds);
      if (data) {
        a.prop = { name: q.role.holds, kind: data.kind, data };
        a.propAngle = 0;
        events.push({ type: "fx", names: ["sparkle"], actor: a.id, at: a.joints.rHand });
      }
    }
    if (q.slot !== null && act.object) {
      a.seatY = act.object.def.seatY ?? 60;
      a.seatId = act.object.id;
      a.seatSlot = q.slot;
    }
  }
  if (!act.states.some((q) => q.role.partner !== undefined)) faceRun(act);
  act.phase = "run";
  act.runT0 = t;
  if (act.def.runner === "rally") rallyStart(world, act, t, events);
  if (act.def.runner === "fetch") fetchStart(world, act, t, events);
}

/** One loop-runner step: each free player starts its next move (after its wait), until time or reps run out. */
function loopStep(world, act, t, events) {
  const { def, params } = act;
  const dur = params.dur ?? (params.reps === undefined ? def.dur : undefined);
  const reps = params.reps ?? def.reps ?? 1;
  for (const q of act.states) {
    const a = q.actor;
    if (q.role.fx && t >= q.fxAt && !q.done) {
      events.push({ type: "fx", names: [q.role.fx], actor: a.id });
      q.fxAt = t + FX_EVERY;
    }
    if (q.done || !free(a) || (q.role.partner === undefined && a.pairedWith)) continue;
    if (q.busy) { // the last move just ended: wait before the next one
      q.busy = false;
      q.nextAt = t + (q.role.wait ?? 0) * act.speed;
    }
    if (t < q.nextAt) continue;
    if (q.role.start && !q.started) {
      q.started = true;
      q.busy = true;
      command(world, a.id, q.role.start, {});
      continue;
    }
    const moves = q.role.moves;
    const over = dur !== undefined ? t - act.runT0 >= dur : q.cycle >= reps * Math.max(1, moves.length);
    if (over || !moves.length) {
      q.done = moves.length > 0 || act.states.every((o) => o === q || o.done);
      continue;
    }
    const name = moves[q.cycle % moves.length];
    if (q.role.partner !== undefined) {
      const partner = act.states[q.role.partner].actor;
      if (!free(partner)) continue;
      startPair(world, a, partner, world.moves.get(name), {}, command);
    } else command(world, a.id, name, {});
    q.cycle++;
    q.busy = true;
  }
  if (act.states.every((q) => q.done)) beginEnding(world, act, t);
}

/** The ending moves. `loser` (a rally) misses; everyone else reacts. */
export function beginEnding(world, act, t, loser = null) {
  const ending = act.params.ending ?? act.def.ending;
  act.phase = "ending";
  act.endT0 = t;
  const winnerId = act.params.winner ?? (loser ? act.players.find((a) => a !== loser)?.id : act.players[0].id);
  for (const a of act.players) {
    if (ending === "none") break;
    if (ending === "hug") {
      const partner = act.players[1];
      if (a === act.players[0] && partner) startPair(world, a, partner, world.moves.get("hug"), {}, command);
      if (a.face) a.face = "happy";
      continue;
    }
    let move = "laugh";
    if (ending === "win") move = a.id === winnerId ? "cheer" : a === loser ? "shrug" : "clap";
    else if (ending === "miss" && a === loser) move = "facepalm";
    command(world, a.id, move, move === "cheer" || move === "clap" ? { params: { cycles: 2 } } : {});
    if (a.face && move !== "facepalm" && move !== "shrug") a.face = "laugh";
  }
}

function finish(world, act, t, interrupted = false) {
  if (act.def.runner === "fetch") fetchRelease(act); // the ball drops from the thrower's hands when it's over
  for (const a of act.players) if (a.activity === act) a.activity = null;
  world.activities = world.activities.filter((x) => x !== act);
  act.phase = "done";
  return [{ type: "activityEnd", name: act.name, beatId: act.beatId, interrupted }];
}

/** Stop an activity now (an interrupting beat, or a new activity for one of its players). */
export function stopActivity(world, act, t) {
  if (act.def.runner === "rally") rallyRelease(act);
  if (act.def.runner === "fetch") fetchRelease(act);
  return finish(world, act, t, true);
}

/** After each world step: advance every running activity. Returns events (activityEnd ends the beat). */
export function updateActivities(world, t) {
  const events = [];
  for (const act of [...(world.activities || [])]) {
    if (act.phase === "setup") {
      const ready = act.states.every((q) => free(q.actor));
      if (ready || t - act.t0 > MAX_SETUP) beginRun(world, act, t, events);
    } else if (act.phase === "run") {
      if (act.def.runner === "rally" || act.def.runner === "fetch") {
        if (act.def.runner === "rally") rallyStep(world, act, t, events);
        else fetchStep(world, act, t);
        if (act.endRequest) beginEnding(world, act, t, act.endRequest.loser);
      } else loopStep(world, act, t, events);
    } else if (act.phase === "ending") {
      if (act.def.runner === "rally") rallyStep(world, act, t, events);
      if (act.def.runner === "fetch") fetchStep(world, act, t);
      if (act.players.every((a) => free(a) && !a.pairedWith) || t - act.endT0 > 8) events.push(...finish(world, act, t));
    }
  }
  return events;
}

/** Move events during an activity: a ball contact (racket, hands or foot). */
export function activityMoveEvent(world, actor, e, events, t) {
  const act = actor.activity;
  if (e.contact && act?.def.runner === "rally" && act.phase === "run") rallyContact(world, act, actor, t, events);
  if (e.contact && act?.def.runner === "fetch" && act.phase === "run") fetchContact(world, act, actor, t, events);
}
