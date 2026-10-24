// Group activity runners (series/baaaana/PLAN.md task 8b), beside loop, rally and fetch in activities.js:
//   race     everyone lines up and runs `race.distance` px on "go"; seeded speeds (a forced `winner` is the
//            fastest); the first across the line cheers, the rest clap
//   tug      two teams (left and right halves of the line) pull a rope that sways back and forth and then
//            drifts to the winning side; the losers stumble forward, the winners fall on their bottoms laughing
//   pyramid  the bottom row stands shoulder to shoulder, the last player climbs onto their heads, everyone
//            poses, the top wobbles more and more and the pyramid topples (the top falls with physics)
// A runner is { start(world, act, t, events), step(world, act, t, events) } and sets act.endRequest when the
// run is over; activities.js then plays the ending. Pure functions of the world and the activity's own rng.

import { command } from "../world.js";
import { isIdleMove } from "../moves.js";
import { dimsOf } from "../skeleton.js";
import { STAGE } from "../config.js";
import { dropFrom } from "./climb.js";

const free = (a) => !a.move || isIdleMove(a.move.def) || a.holding;
const RUN_SPEED = 330; // px/s of the run move at speed 1 and scale 1 (its stride and duration)

const race = {
  start(world, act, t) {
    const dist = act.def.race?.distance ?? 900;
    const lane = act.players.map((a) => ({ a, f: 0.8 + act.rng() * 0.45 }));
    const forced = act.params.winner && lane.find((l) => l.a.id === act.params.winner);
    if (forced) forced.f = Math.max(...lane.map((l) => l.f)) + 0.08;
    for (const a of act.players) a.facing = 1;
    act.race = { dist, lane, go: t + 1.2, started: false, finish: [] };
  },
  step(world, act, t) {
    const r = act.race;
    if (!r.started && t >= r.go) {
      r.started = true;
      for (const { a, f } of r.lane) command(world, a.id, "run", { params: { distance: r.dist }, speed: f });
      return;
    }
    if (!r.started || t < r.go + 0.2) return;
    for (const { a, f } of r.lane) if (free(a) && !r.finish.includes(a)) r.finish.push(a);
    if (r.finish.length === r.lane.length || t - r.go > r.dist / (RUN_SPEED * 0.6) + 6) {
      act.params = { ...act.params, winner: (r.finish[0] ?? r.lane[0].a).id };
      act.endRequest = { loser: null };
    }
  },
};

const tug = {
  start(world, act, t, events) {
    const line = [...act.players].sort((u, v) => u.x - v.x);
    const half = Math.ceil(line.length / 2);
    const left = line.slice(0, half);
    const right = line.slice(half);
    for (const a of left) a.facing = 1;
    for (const a of right) a.facing = -1;
    const winner = act.params.winner ?? (act.rng() < 0.5 ? left[0].id : right[0].id);
    act.tug = { left, right, base: new Map(line.map((a) => [a.id, a.x])), t0: t, dur: act.params.dur ?? act.def.dur ?? 7, side: left.some((a) => a.id === winner) ? -1 : 1, winner };
    events.push({ type: "tug", what: "start", beatId: act.beatId, ids: line.map((a) => a.id) }); // the renderer draws the rope
    for (const a of line) command(world, a.id, "tug_pull", { params: { cycles: Math.ceil(act.tug.dur / 1.2) } });
  },
  step(world, act, t, events) {
    const g = act.tug;
    const u = (t - g.t0) / g.dur;
    // Back and forth, then a drift to the winning side over the last third.
    const sway = Math.sin((t - g.t0) * 2.6) * 26 * (1 - Math.max(0, u - 0.6) * 2);
    const drift = g.side * Math.max(0, u - 0.66) * 3 * 160;
    for (const [id, x] of g.base) world.byId.get(id).x = x + sway + drift;
    if (u < 1) return;
    events.push({ type: "tug", what: "end", beatId: act.beatId });
    const winners = g.side < 0 ? g.left : g.right;
    for (const a of act.players) {
      const won = winners.includes(a);
      command(world, a.id, won ? "sit" : "stagger", {});
      if (a.face) a.face = won ? "laugh" : "surprised";
    }
    act.params = { ...act.params, winner: g.winner };
    act.endRequest = { loser: null };
  },
};

/** How high a character's head top is above its feet when standing (the top of the pyramid stands there). */
const headTop = (a) => {
  const d = dimsOf(a);
  return (d.thigh + d.shin + d.torso + d.neck + d.headR * 1.7) * a.scale;
};

const pyramid = {
  start(world, act, t) {
    const line = [...act.players].sort((u, v) => u.x - v.x);
    const top = line.length >= 3 ? line[Math.floor(line.length / 2)] : line[line.length - 1];
    const bottom = line.filter((a) => a !== top);
    const mid = bottom.reduce((s, a) => s + a.x, 0) / bottom.length;
    bottom.forEach((a, k) => {
      a.x = mid + (k - (bottom.length - 1) / 2) * 52 * a.scale;
      a.facing = 1;
    });
    top.facing = 1;
    const up = Math.min(...bottom.map(headTop)) - 6;
    top.climb = { t0: t, dur: 1.4, from: 0, to: up, x0: top.x, x1: mid, platform: null };
    command(world, top.id, "climb_up", { params: { cycles: 1 } });
    act.pyramid = { top, bottom, up, t0: t, phase: "climb" };
  },
  step(world, act, t) {
    const p = act.pyramid;
    const { top } = p;
    if (p.phase === "climb" && !top.climb) {
      p.phase = "pose";
      p.posed = t;
      p.x0 = top.x;
      // climb.js leaves no platform for a pyramid: keep the top standing up there by hand.
      top.elev = p.up;
      top.groundY = STAGE.groundY - p.up;
      command(world, top.id, "cheer", { params: { cycles: 3 } });
      for (const a of p.bottom) command(world, a.id, "flex", {});
    } else if (p.phase === "pose") {
      const w = t - p.posed;
      top.x = p.x0 + Math.sin(w * 7) * Math.min(14, w * 6); // the wobble grows
      if (w > 2.6) {
        p.phase = "fall";
        top.facing = act.rng() < 0.5 ? 1 : -1;
        dropFrom(top);
        for (const a of p.bottom) command(world, a.id, "stagger", {});
        if (top.face) top.face = "surprised";
      }
    } else if (p.phase === "fall" && !top.airborne && free(top)) {
      act.endRequest = { loser: null };
    }
  },
};

export const GROUP_RUNNERS = { race, tug, pyramid };
