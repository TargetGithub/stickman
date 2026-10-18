// Director: turns script beats into commands at the right story time (spec 11).
// Milestone: M3. Resolves the four `at` forms, records anchors, inserts approaches, queues beats
// for busy characters, dispatches world beats, and reports runtime issues for the validator.

import { command } from "./world.js";
import { requestSlowmo, requestFreeze } from "./clock.js";
import { requiredStartX, motionScale } from "./combat.js";
import { COMBAT, LIMITS } from "./config.js";
import { CARD_COMMANDS, cardDuration, narrateDuration } from "./story/timing.js";
import { readingTime } from "./story/speech.js";
import { spawnObject, removeObject, setObject } from "./objects.js";
import { pairGate } from "./story/pair_beats.js";
import { startPair } from "./story/pairs.js";

export const ANCHORS = ["start", "windowOpen", "hit", "end"];
export const KO_MOVES = ["ko_fall", "ko_spin"];
export const REVIVE_MOVES = ["get_up", "spawn"];

/** Object world commands (S4): spawn_object (params.kind, id, x, ...), remove_object / set_object (beat.object). */
const OBJECT_COMMANDS = {
  spawn_object: (world, beat, p, t) => {
    const def = world.objects.ctx.catalog.objects?.[p.kind];
    if (def?.behavior === "holdable") {
      // A spawned holdable lies on the floor, ready for pick_prop.
      world.groundProps.push({ name: p.kind, kind: def.hold.kind, data: def.hold, x: p.x, y: world.actors[0]?.groundY - 4 - (p.y ?? 0), angle: 0 });
      return [];
    }
    return spawnObject(world.objects, { object: p.kind, id: p.id, x: p.x, y: p.y, layer: p.layer, facing: p.facing, state: p.state }, t);
  },
  remove_object: (world, beat) => removeObject(world.objects, beat.object),
  set_object: (world, beat, p) => setObject(world.objects, beat.object, p),
};

/** World beat durations in story seconds, for their end anchor. */
const WORLD_DURATION = {
  slowmo: (p) => p.duration ?? 0,
  fade: (p) => p.dur ?? 1,
  flash: (p) => p.dur ?? 0.1,
  caption: (p) => p.dur ?? 2,
  desaturate: (p) => p.dur ?? 0.5,
  zoom_punch: (p) => p.dur ?? 0.2,
  text_pop: (p) => p.dur ?? 0.8,
  shake: () => 0.3,
  narrate: (p) => narrateDuration(p),
  title_card: (p) => cardDuration("title_card", p),
  chapter_card: (p) => cardDuration("chapter_card", p),
  time_card: (p) => cardDuration("time_card", p),
  end_card: (p) => cardDuration("end_card", p),
  set_time: (p) => p.dur ?? 0,
  set_weather: (p) => p.dur ?? 0,
};

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
    if (e.type === "moveEnd") {
      anchor(director, beat, "end", storyT);
      beat.state = "done";
      if (e.interrupted) beat.notes.push("interrupted");
    }
    if (e.type === "hit" && e.attacker && beat) beat.notes.push(`${e.kind} ${e.target} @${storyT.toFixed(2)}`);
  }
}

const isFree = (actor) => !actor.move || actor.move.def.name === "idle" || actor.holding;

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
  // Cards hold the story clock, so in story time they end where they start.
  const dur = CARD_COMMANDS.includes(beat.do) ? 0 : (WORLD_DURATION[beat.do] || (() => 0))(p);
  director.timers.push({ t: storyT + dur, beat });
  director.timers.sort((a, b) => a.t - b.t || a.beat.index - b.beat.index);
}

/** Start movement toward the spot an attack needs (spec 11.4); the attack then waits for it to finish. */
function approach(director, beat, actor, ctx) {
  const target = ctx.world.byId.get(beat.target);
  const def = director.moves.get(beat.do);
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
    const speed = (mode === "walk" ? 120 : 550) * motionScale(actor); // px/s from the walk/run strides
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

/**
 * sit with an object (S5): walk to the seat first (the beat waits), then sit at the seat's height.
 * @returns {boolean} true when the character still has to walk there
 */
function walkToSeat(director, beat, actor, ctx) {
  const seat = ctx.world.objects?.byId.get(beat.object);
  if (!seat || seat.behavior !== "seat") return false;
  // The free slot nearest to the character (a bench seats two).
  const taken = new Set(ctx.world.actors.filter((a) => a !== actor && a.seatId === seat.id).map((a) => a.seatSlot));
  const slots = (seat.def.slots || [0]).map((o, i) => ({ i, x: seat.x + o })).filter((s) => !taken.has(s.i));
  const slot = (slots.length ? slots : [{ i: 0, x: seat.x }]).reduce((b, s) => (Math.abs(s.x - actor.x) < Math.abs(b.x - actor.x) ? s : b));
  const d = slot.x - actor.x;
  if (beat.state === "approached" || Math.abs(d) <= 24 * actor.scale) { // arrived (or close enough): sit down
    actor.x = slot.x;
    actor.seatY = seat.def.seatY ?? 60;
    actor.seatId = seat.id;
    actor.seatSlot = slot.i;
    return false;
  }
  actor.facing = Math.sign(d);
  command(ctx.world, beat.who, "walk", { params: { distance: Math.abs(d) } });
  beat.notes.push(`walk ${Math.abs(d).toFixed(0)}px to ${beat.object}`);
  beat.state = "approached";
  director.waiting.set(actor.id, [beat, ...(director.waiting.get(actor.id) || []).filter((b) => b !== beat)]);
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
  if (director.dead.has(beat.who) && !REVIVE_MOVES.includes(beat.do)) {
    beat.firedAt = storyT;
    issue(director, "E_SIM_DEAD_ACTOR", beat, `'${beat.who}' was knocked out and cannot '${beat.do}'.`, `Add a "get_up" beat for '${beat.who}' first, or remove this beat.`);
    beat.state = "skipped";
    anchor(director, beat, "start", storyT);
    anchor(director, beat, "end", storyT);
    return;
  }
  if (actor.hidden && beat.do !== "spawn" && !beat.warnedHidden) {
    beat.warnedHidden = true;
    issue(director, "W_HIDDEN", beat, `'${beat.who}' is hidden (not spawned yet, or despawned) when '${beat.do}' runs.`, `Add a "spawn" beat for '${beat.who}' before this one.`, "warning");
  }
  if (!isFree(actor) && !beat.interrupt) {
    beat.state = "waiting";
    const q = director.waiting.get(actor.id) || [];
    if (!q.includes(beat)) q.push(beat);
    director.waiting.set(actor.id, q);
    return;
  }
  const def = director.moves.get(beat.do);
  if (beat.do === "sit" && beat.object && walkToSeat(director, beat, actor, ctx)) return;
  if (def.pair && beat.partner && pairGate({ director, beat, actor, def, ctx, issue, command, isFree })) return;
  if (beat.approach && beat.target && def.category === "attack" && beat.state !== "approached" && approach(director, beat, actor, ctx)) {
    beat.state = "approached";
    director.waiting.set(actor.id, [beat, ...(director.waiting.get(actor.id) || []).filter((b) => b !== beat)]);
    return;
  }
  const lateBy = storyT - beat.due;
  if (lateBy > LIMITS.queueDriftWarn && beat.state !== "approached") {
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
  const opts = { target: beat.target, outcome: beat.outcome, params: beat.params, speed: beat.speed, beatId: beat.id, blend: beat.interrupt ? 0.04 : undefined };
  if (def.pair && world.byId.get(beat.partner)) startPair(world, actor, world.byId.get(beat.partner), def, opts, command);
  else command(world, beat.who, beat.do, opts);
  beat.state = "running";
  if (KO_MOVES.includes(beat.do)) {
    director.dead.add(beat.who);
    actor.hp = 0;
  }
  if (REVIVE_MOVES.includes(beat.do)) director.dead.delete(beat.who);
  if (beat.fx?.length) emit({ type: "fx", names: beat.fx, actor: beat.who, beatId: beat.id });
  if (beat.say) {
    const dur = beat.sayDur ?? (director.story ? readingTime(beat.say) : 1.2);
    emit({ type: "say", actor: beat.who, text: beat.say, dur, beatId: beat.id, ...(beat.bubble ? { bubble: beat.bubble } : {}) });
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
