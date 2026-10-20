// Director: turns script beats into commands at the right story time (spec 11).
// Milestone: M3. Resolves the four `at` forms, records anchors, inserts approaches, queues beats
// for busy characters, dispatches world beats, and reports runtime issues for the validator.

import { command } from "./world.js";
import { requestSlowmo, requestFreeze } from "./clock.js";
import { requiredStartX, motionScale } from "./combat.js";
import { COMBAT, LIMITS } from "./config.js";
import { CARD_COMMANDS, WORLD_DURATION } from "./story/timing.js";
import { readingTime } from "./story/speech.js";
import { moveSpeed, pacedReadingTime, travelFactor } from "./story/pace.js";
import { pairGate } from "./story/pair_beats.js";
import { resolveMove, isIdleMove } from "./moves.js";
import { startPair } from "./story/pairs.js";
import { defeatStart } from "./story/defeat.js";
import { startActivity, stopActivity } from "./story/activities.js";
import { OBJECT_COMMANDS, walkToSeat } from "./story/scene_beats.js";
import { TO_MOVES, startTo } from "./story/destinations.js";
import { zOf } from "./depth.js";

export const ANCHORS = ["start", "windowOpen", "hit", "end"];
export const KO_MOVES = ["ko_fall", "ko_spin"];
export const REVIVE_MOVES = ["get_up", "spawn", "return"];

/** Parse a beat's `at` into a dependency. */
export function parseAt(at) {
  if (typeof at === "number") return { kind: "abs", t: at };
  if (at && typeof at === "object") {
    const delay = at.delay ?? 0;
    if (typeof at.after === "string") return { kind: "after", ref: at.after, anchor: "end", delay };
    if (typeof at.with === "string") return { kind: "with", ref: at.with, anchor: "start", delay };
    if (typeof at.on === "string") {
      const dot = at.on.lastIndexOf(".");
      return { kind: "on", ref: at.on.slice(0, dot), anchor: at.on.slice(dot + 1), delay };
    }
  }
  return null;
}

/**
 * @param {object} script  a schema-valid script
 * @param {Map<string, object>} moves  prepared catalog
 */
export function createDirector(script, moves, opts = {}) {
  // Scenes (S1): absolute times are scene-local, so they are offset by the scene's story start t0;
  // paths get the scene prefix; KO status carries over from earlier scenes through `dead`.
  const t0 = opts.t0 ?? 0;
  const prefix = opts.prefix ?? "";
  const tag = opts.tag ?? "";
  // Camera keys run through the same scheduler as beats (same `at` forms), as who: "camera".
  const cameraBeats = (script.camera || []).map((k, i) => ({ at: k.at, who: "camera", do: k.mode, key: k, id: `camera#${tag}${i}`, path: `${prefix}camera[${i}]` }));
  const beats = [...(script.beats || []), ...cameraBeats].map((b, index) => {
    const dep = parseAt(b.at);
    return {
      ...b,
      index,
      path: b.path ?? `${prefix}beats[${index}]`,
      id: b.id ?? `#${tag}${index}`,
      dep,
      due: dep?.kind === "abs" ? dep.t + t0 : null,
      state: "pending", // pending → (waiting | approaching) → running → done | skipped
      firedAt: null,
      startedAt: null,
      hitAt: null,
      endedAt: null,
      notes: [],
    };
  });
  return {
    beats,
    byId: new Map(beats.map((b) => [b.id, b])),
    moves,
    waiting: new Map(), // actorId → beats in order
    timers: [], // world beat end anchors { t, beat }
    anchors: [],
    issues: [],
    dead: new Set(opts.dead || []),
    story: !!opts.story, // story scripts: reading-time bubble defaults, faces, bubble kinds
  };
}

function issue(director, code, beat, message, fix, severity = "error") {
  director.issues.push({ code, path: beat ? beat.path : "", message, fix, severity });
}

/** Record an anchor of a beat and release beats waiting on it. */
function anchor(director, beat, name, t) {
  const field = { start: "startedAt", hit: "hitAt", end: "endedAt", windowOpen: "windowAt" }[name];
  if (beat[field] != null) return;
  beat[field] = t;
  director.anchors.push({ beatId: beat.id, anchor: name, t });
  for (const b of director.beats) {
    if (b.state === "pending" && b.due === null && b.dep && b.dep.ref === beat.id && b.dep.anchor === name) b.due = t + b.dep.delay;
  }
}

/** Feed world events (anchors, windowOpen, moveEnd) to the director. */
export function onEvents(director, events, storyT) {
  for (const e of events) {
    const beat = e.beatId ? director.byId.get(e.beatId) : null;
    if (e.type === "positionError") {
      issue(director, "E_SIM_UNREACHABLE", beat, `'${e.actor}' starts ${Math.abs(e.error).toFixed(0)}px from where '${e.move}' needs to start (max ${COMBAT.maxNudge}px x scale without approach).`,
        `Add "approach": "run" to ${beat ? `beat '${beat.id}'` : "the beat"}, or move the characters closer first.`);
    }
    if (e.type === "propMissing") {
      if (e.give) issue(director, "W_NO_PROP", beat, `'${e.actor}' has nothing in hand to give.`, `Give '${e.actor}' a "prop" or pick one up before this beat.`, "warning");
      else issue(director, "W_NO_PROP", beat, `'${e.actor}' tried to pick up a prop, but none was lying within reach.`, "Spawn one nearby (world spawn_prop) or drop/throw one there first.", "warning");
    }
    if (e.type === "reachWarning") {
      issue(director, "W_REACH", beat, `'${e.actor}' ${e.move} cannot physically reach '${e.target}' at these sizes; the hit will look like it lands in the air.`,
        `Use a move that reaches (a kick, jump or flying attack for big height differences), or bring the sizes closer.`, "warning");
    }
    if (!beat) continue;
    if (e.type === "anchor") anchor(director, beat, e.anchor, storyT);
    if (e.type === "windowOpen") {
      anchor(director, beat, "windowOpen", storyT);
      if (beat.outcome === "whiff" || beat.outcome === "dodged") anchor(director, beat, "hit", storyT);
    }
    if (e.type === "activityEnd") anchor(director, beat, "end", storyT);
    if (e.type === "moveEnd") {
      anchor(director, beat, "end", storyT);
      beat.state = "done";
      if (e.interrupted) beat.notes.push("interrupted");
    }
    if (e.type === "hit" && e.attacker && beat) beat.notes.push(`${e.kind} ${e.target} @${storyT.toFixed(2)}`);
  }
}

// A player in an activity (S5) is busy until it ends; an interrupting beat stops the activity.
const isFree = (actor) => (!actor.move || isIdleMove(actor.move.def) || actor.holding) && !actor.activity;

function dispatchWorld(director, beat, ctx) {
  const p = beat.params || {};
  const { clock, emit, storyT } = ctx;
  if (OBJECT_COMMANDS[beat.do] && ctx.world.objects) {
    for (const e of OBJECT_COMMANDS[beat.do](ctx.world, beat, p, storyT)) emit({ ...e, beatId: beat.id });
  }
  if (beat.do === "spawn_prop") {
    const data = ctx.catalog?.props?.[p.prop];
    if (data) ctx.world.groundProps.push({ name: p.prop, kind: data.kind, data, x: p.x, y: p.y ?? ctx.world.actors[0].groundY - 4, angle: 0 });
  } else if (beat.do === "prop_break") {
    const owner = ctx.world.byId.get(p.owner);
    if (owner?.prop) {
      emit({ type: "fx", names: ["prop_break"], actor: owner.id, color: owner.prop.data.color, at: owner.joints.rHand });
      owner.prop = null;
    }
  }
  if (beat.do === "slowmo") requestSlowmo(clock, { scale: p.scale ?? 0.3, duration: p.duration ?? 0.5, easeIn: p.easeIn, easeOut: p.easeOut });
  else if (beat.do === "freeze") requestFreeze(clock, p.duration ?? 0.5);
  else if (CARD_COMMANDS.includes(beat.do)) requestFreeze(clock, WORLD_DURATION[beat.do](p));
  emit({ type: "world", do: beat.do, params: p, beatId: beat.id });
  // A colour wave from a character (A3, F3): the renderer spreads the grade from them; sparkles burst there.
  if (beat.do === "set_grade" && ctx.world.byId.get(p.from)) emit({ type: "fx", names: ["colour_return"], actor: p.from, beatId: beat.id });
  if (beat.do === "activity") {
    // Ends with its activityEnd event (onEvents), not a timer.
    const started = startActivity(ctx.world, beat, p, storyT, ctx.catalog);
    for (const e of started || []) emit(e);
    onEvents(director, started || [], storyT);
    if (started) return;
  }
  // Cards hold the story clock, so in story time they end where they start.
  const dur = CARD_COMMANDS.includes(beat.do) ? 0 : (WORLD_DURATION[beat.do] || (() => 0))(p);
  director.timers.push({ t: storyT + dur, beat });
  director.timers.sort((a, b) => a.t - b.t || a.beat.index - b.beat.index);
}

/** Start movement toward the spot an attack needs (spec 11.4); the attack then waits for it to finish. */
function approach(director, beat, actor, ctx) {
  const target = ctx.world.byId.get(beat.target);
  const def = resolveMove(director.moves, actor, beat.do);
  const params = { ...def.params, ...(beat.params || {}) };
  const dir = Math.sign(target.x - actor.x) || actor.facing;
  let need;
  if (def.flags.ranged) {
    // Ranged attacks only need to be inside their distance band.
    const [min, max] = def.flags.ranged.map((v) => v * actor.scale);
    const dist = Math.abs(target.x - actor.x);
    need = dist > max ? dist - max * 0.85 : dist < min ? dist - min * 1.15 : 0;
  } else need = (requiredStartX(actor, target, def, params, beat.outcome || "hit") - actor.x) * dir;
  const slack = COMBAT.maxNudge * actor.scale * 0.5;
  if (Math.abs(need) <= slack) return false;
  if (need > 0) {
    const mode = beat.approach === "walk" ? "walk" : "run";
    const speed = (mode === "walk" ? 120 : 550) * motionScale(actor) * travelFactor(ctx.world.pace, mode); // px/s from the walk/run strides
    const seconds = need / speed;
    if (seconds > LIMITS.maxApproach) {
      issue(director, "E_SIM_APPROACH", beat, `'${beat.who}' would ${mode} ${seconds.toFixed(1)}s to reach '${beat.target}' (max ${LIMITS.maxApproach}s).`,
        `Start the characters closer, add a "run" beat earlier, or use "approach": "run" instead of "walk".`);
    }
    command(ctx.world, beat.who, mode, { target: beat.target, params: { distance: need } });
    beat.notes.push(`${mode} ${need.toFixed(0)}px`);
  } else {
    command(ctx.world, beat.who, "dodge_back", { target: beat.target, params: { distance_back: -need / (1.08 * motionScale(actor)) } });
    beat.notes.push(`step back ${(-need).toFixed(0)}px`);
  }
  return true;
}

function execute(director, beat, ctx) {
  const { world, emit, storyT } = ctx;
  if (beat.who === "camera") {
    beat.firedAt = storyT;
    beat.state = "done";
    anchor(director, beat, "start", storyT);
    anchor(director, beat, "end", storyT);
    return emit({ type: "camera", key: beat.key });
  }
  if (beat.who === "world") {
    beat.firedAt = storyT;
    beat.state = "done";
    anchor(director, beat, "start", storyT);
    return dispatchWorld(director, beat, ctx);
  }
  const actor = world.byId.get(beat.who);
  if (director.dead.has(beat.who) && beat.do === "despawn" && director.story) {
    // A knocked-out character fades away where it lies (the gauntlet's afterDefeat "fade").
    beat.firedAt = storyT;
    beat.state = "done";
    actor.fade = { a0: actor.alpha, a1: 0, t0: storyT, dur: 0.6 };
    anchor(director, beat, "start", storyT);
    anchor(director, beat, "end", storyT);
    return;
  }
  if (director.dead.has(beat.who) && !REVIVE_MOVES.includes(beat.do)) {
    beat.firedAt = storyT;
    issue(director, "E_SIM_DEAD_ACTOR", beat, `'${beat.who}' was knocked out and cannot '${beat.do}'.`, `Add a "get_up" beat for '${beat.who}' first, or remove this beat.`);
    beat.state = "skipped";
    anchor(director, beat, "start", storyT);
    anchor(director, beat, "end", storyT);
    return;
  }
  const walksTo = beat.to && TO_MOVES.includes(beat.do); // a hidden character with a destination walks in
  if (actor.hidden && beat.do !== "spawn" && beat.do !== "return" && !walksTo && !beat.warnedHidden) {
    beat.warnedHidden = true;
    issue(director, "W_HIDDEN", beat, `'${beat.who}' is hidden (not spawned yet, or despawned) when '${beat.do}' runs.`, `Add a "spawn" beat for '${beat.who}' before this one.`, "warning");
  }
  if (actor.activity && beat.interrupt) {
    const ended = stopActivity(world, actor.activity, storyT);
    for (const e of ended) emit(e);
    onEvents(director, ended, storyT);
  }
  if (!isFree(actor) && !beat.interrupt) {
    beat.state = "waiting";
    const q = director.waiting.get(actor.id) || [];
    if (!q.includes(beat)) q.push(beat);
    director.waiting.set(actor.id, q);
    return;
  }
  const def = resolveMove(director.moves, actor, beat.do);
  // Walking somewhere first (a seat, a partner, attack range): approachAt marks when the walk began.
  if (beat.do === "sit" && beat.object && walkToSeat(director, beat, actor, ctx, command)) return void (beat.approachAt ??= storyT);
  if (def.pair && beat.partner && pairGate({ director, beat, actor, def, ctx, issue, command, isFree })) return void (beat.approachAt ??= storyT);
  // Story scripts re-check after the run (the target may have been knocked or pushed meanwhile): up to 3 runs.
  const again = director.story ? (beat.approaches ?? 0) < 3 : beat.state !== "approached";
  if (beat.approach && beat.target && def.category === "attack" && again && approach(director, beat, actor, ctx)) {
    beat.approaches = (beat.approaches ?? 0) + 1;
    beat.approachAt ??= storyT;
    beat.state = "approached";
    director.waiting.set(actor.id, [beat, ...(director.waiting.get(actor.id) || []).filter((b) => b !== beat)]);
    return;
  }
  const lateBy = storyT - beat.due;
  // Macro beats (S6) wait for busy characters on purpose: only authored timing can drift.
  if (lateBy > LIMITS.queueDriftWarn && beat.state !== "approached" && !beat.expandedFrom) {
    issue(director, "W_QUEUE_DRIFT", beat, `Beat '${beat.id}' (${beat.who} ${beat.do}) starts ${lateBy.toFixed(2)}s after its time because '${beat.who}' was busy.`,
      `Use "at": {"after": "<previous beat id>"} to chain it, or set "interrupt": true.`, "warning");
  }
  if (def.needsProp && (def.needsProp === "any" ? !actor.prop : actor.prop?.kind !== def.needsProp)) {
    issue(director, "E_MOVE_NEEDS_PROP", beat, `'${beat.do}' needs a ${def.needsProp}, but '${beat.who}' has ${actor.prop ? `a ${actor.prop.kind}` : "no prop"} at this point.`,
      `Give '${beat.who}' "prop": "${def.needsProp}" or add a "pick_prop" beat first.`);
  }
  beat.firedAt = storyT;
  if (beat.face && actor.face) actor.face = beat.face; // "from this beat on" (STORY_SPEC 4.3)
  if (beat.do === "ride") actor.riding = beat.object; // the sim keeps riders on their vehicle
  if (actor.seatY != null && (def.category === "movement" || def.category === "attack")) actor.seatY = actor.seatId = null;
  if (beat.do === "dismount") actor.riding = null;
  let opts = { target: beat.target, outcome: beat.outcome, params: beat.params, speed: beat.speed ?? moveSpeed(world.pace, def, beat), beatId: beat.id, blend: beat.interrupt ? 0.04 : undefined,
    ...(director.story && beat.approach && def.category === "attack" ? { approached: true } : {}) };
  if (def.category === "defeat") opts = defeatStart(world, actor, def, opts); // defeat styles (S5): face, flee side
  if (walksTo) opts = startTo(world, actor, beat, opts, storyT, !!def.pair) ?? opts; // S6: distance from where everyone is
  if (actor.depthMove?.t0 === storyT) emit({ type: "depth", actor: beat.who, beatId: beat.id, ...actor.depthMove }); // V3.2: the renderer lerps the same z
  // Turnaround views (V3.6, v3 scenes): a beat's view lasts from it on; a move's hint lasts while it runs.
  if (world.depth && beat.view) emit({ type: "view", actor: beat.who, view: beat.view, beatId: beat.id });
  if (world.depth && def.view) emit({ type: "viewHint", actor: beat.who, view: def.view, beatId: beat.id });
  if (beat.layer && director.story) {
    actor.layer = beat.layer;
    emit({ type: "layer", actor: beat.who, layer: beat.layer, beatId: beat.id });
    if (world.depth) {
      // In a v3 scene a layer beat is a jump to the layer's z preset.
      const z1 = zOf({ layer: beat.layer }, world.depth);
      emit({ type: "depth", actor: beat.who, beatId: beat.id, z0: actor.z || 0, z1, t0: storyT, dur: 0 });
      actor.z = z1;
      actor.depthMove = null;
    }
  }
  if (def.pair && world.byId.get(beat.partner)) startPair(world, actor, world.byId.get(beat.partner), def, opts, command);
  else command(world, beat.who, beat.do, opts);
  beat.state = "running";
  if (KO_MOVES.includes(beat.do) || def.flags.defeat) {
    director.dead.add(beat.who);
    actor.hp = 0;
    // Crowds gasp (S6); a petrify carries how long the grey takes (A3).
    if (director.story) emit({ type: "defeat", actor: beat.who, move: beat.do, beatId: beat.id, ...(def.flags.petrify ? { dur: opts.params?.dur ?? def.params.dur } : {}) });
  }
  if (REVIVE_MOVES.includes(beat.do)) director.dead.delete(beat.who);
  if (beat.do === "return") actor.hp = actor.maxHp; // sparkles re-form a vanished character whole (S8: the end state shows it)
  if (beat.fx?.length) emit({ type: "fx", names: beat.fx, actor: beat.who, beatId: beat.id });
  if (beat.say) {
    const dur = beat.sayDur ?? (world.pace ? pacedReadingTime(beat.say) : director.story ? readingTime(beat.say) : 1.2);
    // Under a pace the auto camera cuts to the listener for reactions (camera_cuts.js), so the say names it.
    emit({ type: "say", actor: beat.who, text: beat.say, dur, beatId: beat.id, ...(beat.bubble ? { bubble: beat.bubble } : {}), ...(world.pace && beat.target ? { to: beat.target } : {}) });
  }
}

/** Fire every beat that is due, then start queued beats for characters that became free. */
export function stepDirector(director, ctx) {
  const { storyT } = ctx;
  while (director.timers.length && director.timers[0].t <= storyT + 1e-9) {
    // A card ends when its hold ends (the story clock does not move while it shows).
    if (CARD_COMMANDS.includes(director.timers[0].beat.do) && ctx.clock.freezeLeft > 1e-9) break;
    const { beat } = director.timers.shift();
    anchor(director, beat, "end", storyT);
  }
  const due = director.beats
    .filter((b) => b.state === "pending" && b.due !== null && b.due <= storyT + 1e-9)
    .sort((a, b) => a.due - b.due || a.index - b.index);
  for (const beat of due) execute(director, beat, ctx);
  for (const [actorId, q] of director.waiting) {
    const actor = ctx.world.byId.get(actorId);
    while (q.length && isFree(actor)) execute(director, q.shift(), ctx);
  }
}

/** True when nothing is left to fire or run. */
export function directorIdle(director) {
  return !director.timers.length
    && [...director.waiting.values()].every((q) => !q.length)
    && director.beats.every((b) => b.state === "done" || b.state === "skipped" || (b.state === "pending" && b.due === null));
}

/** Issues for beats that never fired (their anchor never happened). */
export function finishDirector(director) {
  for (const b of director.beats) {
    if (b.state !== "pending") continue;
    const dep = b.dep;
    const why = dep?.kind === "on" ? `'${dep.ref}.${dep.anchor}' never happened` : `'${dep?.ref}' never ${dep?.kind === "with" ? "started" : "ended"}`;
    issue(director, "E_SIM_UNRESOLVED", b, `Beat '${b.id}' never ran: ${why}.`,
      dep?.anchor === "hit" ? `'${dep.ref}' may miss (whiff/dodged fall back to windowOpen) or never start; anchor on "${dep.ref}.end" instead.` : "Check the referenced beat runs.");
  }
  return director.issues;
}
