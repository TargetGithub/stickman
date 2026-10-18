// Beat macros for talking and moving around (STORY_SPEC 11.1). Milestone: S6.
//   @dialogue       alternating say beats with talk gestures, reading-time pacing, faces and a two-shot
//   @activity       the activity world command (S5)
//   @enter / @exit  walk or run in from a stage edge (the character starts hidden there) / off one
//   @walk_together  hand in hand (two walkers) or side by side
//   @travel         a long walk, run or sneak with the camera tracking the leader

import { readingTime } from "../speech.js";
import { round } from "../compile.js";
import { EXIT_REACH } from "../destinations.js";
import { strideOf } from "../../skeleton.js";

const BUBBLE_CHARS = 40;
const TALK_CYCLE = 0.8; // s, one cycle of the talk gesture loop
const SPACING = 90; // px between walkers side by side
export const PACE_SPEED = { walk: 120, run: 550, sneak: 58, tiptoe: 70 }; // px/s at scale 1

/** Split a line into bubbles of at most 40 characters, at word breaks. */
export function splitText(text) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const out = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (next.length <= BUBBLE_CHARS) cur = next;
    else {
      if (cur) out.push(cur);
      cur = w.slice(0, BUBBLE_CHARS);
    }
  }
  if (cur) out.push(cur);
  return out.length ? out : [String(text).slice(0, BUBBLE_CHARS)];
}

/** Estimated x of a destination, from the scene's position estimates. */
export function destX(ctx, who, to) {
  const lo = ctx.margin;
  const hi = ctx.stageWidth - ctx.margin;
  if (typeof to.x === "number") return Math.max(lo, Math.min(hi, to.x));
  if (to.exit) {
    const x = ctx.pos.get(who) ?? lo;
    return to.exit === "right" ? Math.min(hi, x + EXIT_REACH.walk) : Math.max(lo, x - EXIT_REACH.walk);
  }
  const at = ctx.pos.get(to.near) ?? ctx.pos.get(who) ?? lo;
  const from = ctx.pos.get(who) ?? at;
  return at + (Math.sign(from - at) || -1) * (to.gap ?? 110);
}

/** The k-th walker's destination in a group: spaced out behind the leader. */
function spaced(ctx, who, to, k) {
  if (!k) return to;
  if (to.exit) return to;
  if (to.near) return { near: to.near, gap: (to.gap ?? 110) + k * SPACING };
  const from = ctx.pos.get(who) ?? to.x;
  return { x: round(to.x + (Math.sign(from - to.x) || -1) * k * SPACING) };
}

function dialogue(ctx, p) {
  const gap = p.gap ?? 0.3;
  const gestures = p.gestures !== false;
  const speakers = [...new Set(p.lines.map((l) => l[0]))];
  const starts = [];
  let prev = null;
  let total = 0;
  p.lines.forEach(([who, text, face, bubble], k) => {
    // Talk toward the other speaker (or whoever spoke last), so speakers turn to each other.
    const listener = speakers.length === 2 ? speakers.find((s) => s !== who) : p.lines[k - 1]?.[0] !== who ? p.lines[k - 1]?.[0] : p.lines[k + 1]?.[0];
    splitText(text).forEach((chunk, ci) => {
      const rt = readingTime(chunk);
      const beat = {
        who, do: gestures ? "talk" : "wait",
        params: gestures ? { cycles: Math.max(1, Math.ceil(rt / TALK_CYCLE)) } : { seconds: round(rt) },
        say: chunk,
        ...(listener && listener !== who && ctx.present(listener) ? { target: listener } : {}),
        ...(face && ci === 0 ? { face } : {}),
        ...(bubble && bubble !== "speech" ? { bubble } : {}),
      };
      const id = prev ? ctx.after(prev, beat, ci === 0 ? gap : 0.05) : ctx.add({ ...beat, at: 0 });
      if (ci === 0) starts.push(id);
      total += rt + gap;
      prev = id;
    });
  });
  if (p.camera !== "none" && speakers.length === 2 && speakers.every((s) => ctx.present(s))) {
    ctx.with(starts[0], { who: "world", do: "shot", params: { mode: "two_shot", targets: speakers, dur: round(Math.min(30, total)) } });
  }
  const anchors = { start: `${starts[0]}.start`, end: `${prev}.end` };
  starts.forEach((id, k) => (anchors[`line${k + 1}`] = `${id}.start`));
  return { anchors };
}

function activity(ctx, p) {
  const id = ctx.add({ at: 0, who: "world", do: "activity", params: { ...p } });
  return { anchors: { start: `${id}.start`, end: `${id}.end`, ending: `${id}.end` } };
}

function enter(ctx, p) {
  const placed = ctx.placement(p.who);
  const to = p.to ?? { x: placed.x };
  const dest = to.exit ? { x: placed.x } : to;
  // Start hidden off to that side (toward the stage edge, at most EXIT_REACH away), facing in; the walk shows
  // the character and fades it in.
  const mode = p.mode ?? "walk";
  const reach = EXIT_REACH[mode] ?? 700;
  const edge = round(p.side === "right" ? Math.min(ctx.stageWidth - ctx.margin, destX(ctx, p.who, dest) + reach) : Math.max(ctx.margin, destX(ctx, p.who, dest) - reach));
  ctx.pos.set(p.who, edge);
  Object.assign(placed, { x: edge, facing: p.side === "right" ? -1 : 1, hidden: true });
  const id = ctx.add({ at: 0, who: p.who, do: mode, to: dest });
  ctx.pos.set(p.who, destX(ctx, p.who, dest));
  return { anchors: { start: `${id}.start`, end: `${id}.end` } };
}

function exit(ctx, p) {
  const id = ctx.add({ at: 0, who: p.who, do: p.mode ?? "walk", to: { exit: p.side } });
  ctx.pos.set(p.who, destX(ctx, p.who, { exit: p.side }));
  return { anchors: { start: `${id}.start`, end: `${id}.end` } };
}

/** Relative walking speed of a cast member: its body plan's leg length and its scale (the stickman is 1). */
function speedOf(ctx, id) {
  const c = ctx.castById.get(id) || {};
  const d = ctx.catalog.bodies?.[c.body]?.dims;
  return (c.scale ?? 1) * (d ? strideOf(d) : 1);
}

/** Everyone walks (or runs, sneaks) at once; the end anchor is whoever has the furthest to go. */
function group(ctx, who, to, mode) {
  let first = null;
  let longest = null;
  let far = -1;
  who.forEach((w, k) => {
    const dest = spaced(ctx, w, to, k);
    const beat = { who: w, do: mode, to: dest };
    const id = first ? ctx.with(first, beat, 0.1 * k) : ctx.add({ ...beat, at: 0 });
    first ??= id;
    // Whoever arrives last ends the group: distance over its walking speed (shorter legs are slower).
    const d = Math.abs(destX(ctx, w, dest) - (ctx.pos.get(w) ?? 0)) / speedOf(ctx, w);
    if (d > far) [far, longest] = [d, id];
  });
  who.forEach((w, k) => ctx.pos.set(w, destX(ctx, w, spaced(ctx, w, to, k))));
  return { first, longest, far };
}

function walkTogether(ctx, p) {
  const pace = p.pace ?? "walk";
  if (p.who.length === 2 && p.holdHands !== false && pace === "walk" && ctx.moves.has("walk_together")) {
    // Hand in hand: the lead walks away from its partner, so the lead is whoever is nearer the destination.
    const x = destX(ctx, p.who[0], p.to);
    const [a, b] = p.who;
    const lead = Math.abs((ctx.pos.get(a) ?? 0) - x) <= Math.abs((ctx.pos.get(b) ?? 0) - x) ? a : b;
    const id = ctx.add({ at: 0, who: lead, do: "walk_together", partner: lead === a ? b : a, to: p.to });
    for (const w of p.who) ctx.pos.set(w, x);
    return { anchors: { start: `${id}.start`, end: `${id}.end` } };
  }
  const g = group(ctx, p.who, p.to, pace);
  return { anchors: { start: `${g.first}.start`, end: `${g.longest}.end` } };
}

function travel(ctx, p) {
  const mode = p.mode ?? "walk";
  const g = group(ctx, p.who, p.to, mode);
  const dur = round(Math.max(1, Math.min(30, g.far / PACE_SPEED[mode] + 0.5))); // far: px at stickman speed
  const camera = p.camera ?? "track";
  if (camera === "track") ctx.with(g.first, { who: "world", do: "shot", params: { mode: "track", target: p.who[0], dur } });
  if (camera === "wide") ctx.with(g.first, { who: "world", do: "shot", params: { mode: "wide", dur } });
  return { anchors: { start: `${g.first}.start`, end: `${g.longest}.end` } };
}

export const BASIC_MACROS = { dialogue, activity, enter, exit, walk_together: walkTogether, travel };
