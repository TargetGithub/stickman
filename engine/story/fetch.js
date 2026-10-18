// The fetch runner for activities (STORY_SPEC 10, package A1): a thrower tosses a ball, the fetcher
// (a dog) runs after it, catches it in its mouth, brings it back and gives it to the thrower; `reps`
// times, then the ending. Generic move names are used, so a dog plays its own versions through its
// body plan's move map (catch_ball → catch_mouth, run → run_dog). Heights are up from the floor; a
// ball's y is its bottom (objects.js).

import { command } from "../world.js";
import { spawnObject, GRAVITY } from "../objects.js";
import { isIdleMove } from "../moves.js";
import { mouthOf } from "../skeleton_quad.js";

const MARGIN = 220; // px from the stage edges where a ball may land
const NEAR = 120; // px: farther from the settled ball, the fetcher trots up to it before the catch
const GIVE_GAP = 70; // px from the thrower where the fetcher gives the ball back
const RUN_OVER = 260; // px: farther than this the fetcher runs, else walks
const PAUSE = 0.6; // s between giving the ball back and the next throw
const GIVE_UP = 4; // s: a chase or return that takes longer moves on anyway

const free = (a) => !a.move || isIdleMove(a.move.def) || a.holding;

/** Where a holder holds the ball right now: in the mouth (a plan grip) or between the hands. */
function holdPoint(world, a, r) {
  const groundY = world.objects.ctx.groundY;
  if (a.grip) {
    const m = mouthOf(a.joints, a.facing, a.scale, a.grip).point;
    return { x: m.x, y: groundY - m.y - r };
  }
  const j = a.joints;
  return { x: (j.lHand.x + j.rHand.x) / 2, y: groundY - (j.lHand.y + j.rHand.y) / 2 - r };
}

function hold(act, a) {
  act.ball.held = a;
  act.ball.vx = act.ball.vy = 0;
}

/** Go somewhere along the floor: walk when near, run when far. */
function goTo(world, a, x) {
  const d = x - a.x;
  if (Math.abs(d) < 8) return;
  a.facing = Math.sign(d);
  command(world, a.id, Math.abs(d) > RUN_OVER * a.scale ? "run" : "walk", { params: { distance: Math.abs(d) } });
}

export function fetchStart(world, act, t, events) {
  const f = act.def.fetch;
  const [thrower, fetcher] = act.players;
  const id = `${act.beatId}_ball`;
  events.push(...spawnObject(world.objects, { object: f.ball, id, x: thrower.x, y: 60, layer: "mid" }, t));
  act.ball = world.objects.byId.get(id);
  hold(act, thrower);
  // Throw toward the side of the stage with more room; both face that way.
  const W = world.objects.ctx.stageWidth;
  const dir = thrower.x < W / 2 ? 1 : -1;
  thrower.facing = fetcher.facing = dir;
  act.fetch = { dir, reps: act.params.reps ?? act.def.reps ?? 3, done: 0, phase: "throw", at: t + 0.3, since: t };
}

export function fetchStep(world, act, t) {
  const fs = act.fetch;
  const b = act.ball;
  const [thrower, fetcher] = act.players;
  if (b?.held && b.alive) {
    const p = holdPoint(world, b.held, b.def.r ?? 8);
    b.x = p.x;
    b.y = Math.max(0, p.y);
  }
  if (act.phase !== "run") return;
  if (fs.phase === "throw" && t >= fs.at && free(thrower)) {
    thrower.facing = fs.dir;
    command(world, thrower.id, "toss", {});
    fs.phase = "tossing";
  } else if (fs.phase === "chase" && free(fetcher)) {
    const settled = b.vx === 0 && b.vy === 0 && b.y <= 0;
    if (settled || t - fs.since > GIVE_UP) {
      fetcher.facing = Math.sign(b.x - fetcher.x) || fetcher.facing;
      if (Math.abs(b.x - fetcher.x) > NEAR * fetcher.scale && !fs.closer) {
        fs.closer = true; // the ball rolled on: one more trot up to it
        goTo(world, fetcher, b.x - fetcher.facing * 40 * fetcher.scale);
      } else {
        command(world, fetcher.id, "catch_ball", {});
        fs.phase = "catching";
      }
    }
  } else if (fs.phase === "return" && free(fetcher)) {
    fetcher.facing = Math.sign(thrower.x - fetcher.x) || fetcher.facing;
    command(world, fetcher.id, fetcher.grip ? "drop_ball" : "toss", {});
    fs.phase = "giving";
  }
}

/** A contact event during fetch: the toss leaves the hands, the catch, or the give-back. */
export function fetchContact(world, act, a, t, events) {
  const fs = act.fetch;
  const b = act.ball;
  const [thrower, fetcher] = act.players;
  if (!b?.alive) return;
  if (a === thrower && fs.phase === "tossing") {
    const f = act.def.fetch;
    const W = world.objects.ctx.stageWidth;
    const from = holdPoint(world, thrower, b.def.r ?? 8);
    const toX = Math.max(MARGIN, Math.min(W - MARGIN, thrower.x + fs.dir * f.distance * thrower.scale));
    const T = f.flight * act.speed;
    b.held = null;
    b.x = from.x;
    b.y = Math.max(0, from.y);
    b.vx = (toX - b.x) / T;
    b.vy = (-b.y + 0.5 * GRAVITY * T * T) / T + GRAVITY / 120; // lands at toX after T (+ half an Euler step)
    fs.phase = "chase";
    fs.since = t;
    fs.closer = false;
    goTo(world, fetcher, toX - fs.dir * 30 * fetcher.scale);
    events.push({ type: "object", what: "launch", id: b.id, kind: b.kind, x: b.x, y: b.y, sfx: "whoosh", volume: 0.5 });
    return;
  }
  if (a === fetcher && fs.phase === "catching") {
    hold(act, fetcher); // a near miss still counts: the dog always gets its ball
    fs.phase = "return";
    events.push({ type: "object", what: "catch", id: b.id, kind: b.kind, x: b.x, y: b.y, sfx: "ball_bounce", volume: 0.5 });
    goTo(world, fetcher, thrower.x + Math.sign(fetcher.x - thrower.x || 1) * GIVE_GAP * fetcher.scale);
    return;
  }
  if (a === fetcher && fs.phase === "giving") {
    hold(act, thrower);
    fs.done++;
    if (fs.done >= fs.reps) act.endRequest = { loser: null };
    else Object.assign(fs, { phase: "throw", at: t + PAUSE * act.speed, since: t });
  }
}

/** Interrupted: a held ball drops where it is. */
export function fetchRelease(act) {
  if (act.ball?.held) act.ball.held = null;
}
