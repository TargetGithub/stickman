// Paired moves (STORY_SPEC 9, S5.1-S5.2). Milestone: S5.
// A paired move has a `pair` block:
//   { partnerMove, gap (hip to hip px for two stickmen), leadFaces: "toward"|"away", partnerFaces: "toward"|"same",
//     contacts: [{ t0, t1, from: "lead"|"partner", part: "rHand"|"lHand", to: "rHand"|"lHand"|"head"|"top"|"back"|"chest"|"shoulder", meet? }],
//     attach: { t0, t1?, anchor: "<lead joint>", offset: [forward, down], mode: "hold"|"x", until: "detach" },
//     inheritAttach: true (put_down: keeps the running carry or piggyback until its own detach event),
//     sync: true (the partner's speed matches the lead's ground speed: walking together) }
// The director positions the lead and starts both moves; updatePairs (after each world step) applies
// the contacts with IK (both hands meet halfway for high fives and handshakes) and keeps attached
// partners on their anchor (carried, piggybacked, lifted, dragged). Gaps scale with both bodies' arms.

import { BODY, dimsOf } from "../skeleton.js";
import { applyAimIK, motionScale } from "../combat.js";
import { poseActor } from "../actor.js";

const RAMP = 0.12; // normalized move time over which a contact blends in and out
const ARM = BODY.upperArm + BODY.forearm;

/** Hip-to-hip distance for a pair: the authored gap, scaled by both characters' arm reach. */
export function pairDistance(lead, partner, pair) {
  const reach = (a) => ((dimsOf(a).upperArm + dimsOf(a).forearm) / ARM) * a.scale;
  // Filled torsos (the buddy, bulky) are thicker than a stick: keep that much more room.
  const extra = (a) => Math.max(0, (dimsOf(a).torsoWidth ?? 0) * 0.8 - (dimsOf(a).lineWidth / 2 + 4)) * a.scale;
  return pair.gap * (reach(lead) + reach(partner)) / 2 + (pair.gap ? extra(lead) + extra(partner) : 0);
}

/** Where the lead must stand: on its own side of the partner, at the pair distance. */
export function pairStartX(lead, partner, pair) {
  const side = Math.sign(lead.x - partner.x) || -partner.facing;
  return partner.x + side * pairDistance(lead, partner, pair);
}

/** Start a paired move: facings, both moves, and the pair record. */
export function startPair(world, lead, partner, def, opts, command) {
  const pair = def.pair;
  const toward = Math.sign(partner.x - lead.x) || lead.facing;
  lead.facing = pair.leadFaces === "away" ? -toward : toward;
  partner.facing = pair.partnerFaces === "same" ? lead.facing : -toward;
  command(world, lead.id, def.name, { ...opts, target: undefined });
  // sync (walk_together): the partner's steps speed up or slow down so both cover the same ground together.
  const speed = pair.sync ? (opts.speed ?? 1) * (motionScale(lead) / motionScale(partner)) : opts.speed;
  command(world, partner.id, pair.partnerMove, { params: opts.params, speed });
  lead.pairedWith = partner.id;
  partner.pairedWith = lead.id;
  // A new pair with the same partner replaces a running one; put_down takes over its attachment.
  const prev = (world.pairs || []).find((p) => p.partner === partner && p.attached);
  world.pairs = (world.pairs || []).filter((p) => p.partner !== partner);
  const record = { lead, partner, def, attached: false };
  if (pair.inheritAttach && prev) Object.assign(record, { inherit: { ...prev.def.pair.attach, t0: 0, t1: undefined, until: "detach" }, attached: true });
  world.pairs.push(record);
}

function weight(t, c) {
  if (t < c.t0 - RAMP || t > c.t1 + RAMP) return 0;
  if (t < c.t0) return (t - (c.t0 - RAMP)) / RAMP;
  if (t > c.t1) return 1 - (t - c.t1) / RAMP;
  return 1;
}

/** A target point on a body: a joint, the top of the head, the chest, the back or the shoulder. */
function targetOn(a, to, other) {
  const j = a.joints;
  const d = dimsOf(a);
  if (to === "rHand" || to === "lHand" || to === "shoulder") return j[to];
  if (to === "head") return j.head;
  if (to === "top") return { x: j.head.x, y: j.head.y - d.headR * a.scale * 1.05 };
  // On the torso: the point nearest the reacher's shoulder height, between the hip and the chest
  // (a short buddy hugs a tall friend round the waist).
  const u = Math.max(0.2, Math.min(0.78, (other.joints.shoulder.y - j.hip.y) / ((j.shoulder.y - j.hip.y) || -1)));
  const chest = { x: j.hip.x + (j.shoulder.x - j.hip.x) * u, y: j.hip.y + (j.shoulder.y - j.hip.y) * u };
  if (to === "chest") return chest;
  // The back: past the far side of the body from the one reaching around it (a hug).
  const away = Math.sign(chest.x - other.joints.hip.x) || 1;
  const r = Math.max(d.lineWidth / 2 + 4, (d.torsoWidth ?? 0) * 0.9) * a.scale;
  return { x: chest.x + away * r * 1.1, y: chest.y };
}

/** Pull a point toward a limb's root until that limb can reach it (95% of its length). */
function withinReach(a, part, point) {
  const d = dimsOf(a);
  const root = part === "rHand" || part === "lHand" ? a.joints.shoulder : a.joints.hip;
  const len = (part.endsWith("Hand") ? d.upperArm + d.forearm : d.thigh + d.shin) * a.scale * 0.95;
  const dx = point.x - root.x;
  const dy = point.y - root.y;
  const dist = Math.hypot(dx, dy);
  return dist <= len ? point : { x: root.x + (dx / dist) * len, y: root.y + (dy / dist) * len };
}

function attachPoint(pair, lead) {
  const a = pair.inherit || pair.def.pair.attach;
  const at = lead.joints[a.anchor] || lead.joints.hip;
  const [fwd, down] = a.offset || [0, 0];
  return { x: at.x + lead.facing * fwd * lead.scale, y: at.y + down * lead.scale };
}

/**
 * After each world step: attachments, then contacts. Returns events (pick-up and set-down).
 * Move events with `detach` end an attachment; `give` hands the lead's prop to the partner.
 */
export function updatePairs(world) {
  const events = [];
  for (const p of [...(world.pairs || [])]) {
    const { lead, partner, def } = p;
    const running = lead.move?.def.name === def.name;
    const t = running ? lead.move.t : null;
    const at = p.inherit || def.pair.attach;
    // Attachments: active inside their window, and until a detach for persistent ones (carry, piggyback).
    if (at) {
      const inWindow = running && t >= at.t0 && (at.t1 === undefined || t <= at.t1);
      if (inWindow && !p.attached) {
        p.attached = true;
        events.push({ type: "pair", what: "attach", actor: lead.id, partner: partner.id, move: def.name });
      }
      const persistent = at.until === "detach";
      if (p.attached && !inWindow && !(persistent && !p.detached)) p.attached = false;
      if (p.attached) {
        const pt = attachPoint(p, lead);
        if (at.mode === "x") {
          partner.x = pt.x;
          poseActor(partner, 0);
        } else {
          partner.carryTarget = pt;
          poseActor(partner, 0);
        }
      } else if (partner.carryTarget) partner.carryTarget = null;
    }
    // Contacts (hands meeting, reaching a head, a shoulder or around the back).
    if (running) {
      for (const c of def.pair.contacts || []) {
        const w = weight(t, c);
        if (w <= 0) continue;
        const [from, to] = c.from === "partner" ? [partner, lead] : [lead, partner];
        let point = targetOn(to, c.to, from);
        if (c.meet) {
          // Hands meet in the open space halfway between the two heads, at the lower of the two hands
          // (the taller one reaches down; a short buddy's hand stays in front of its face).
          const mine = from.joints[c.part];
          point = { x: (from.joints.head.x + to.joints.head.x) / 2, y: Math.max(mine.y, point.y) };
          point = withinReach(to, c.to, withinReach(from, c.part, point)); // short arms: meet where both reach
          to.joints = applyAimIK(to.joints, c.to, point, w, to.scale, dimsOf(to));
        }
        from.joints = applyAimIK(from.joints, c.part, point, w, from.scale, dimsOf(from));
      }
    }
    // The pair ends when neither move runs and nothing is attached.
    const partnerRunning = partner.move?.def.name === def.pair.partnerMove;
    if (!running && !partnerRunning && !p.attached) {
      world.pairs.splice(world.pairs.indexOf(p), 1);
      if (lead.pairedWith === partner.id) lead.pairedWith = null;
      if (partner.pairedWith === lead.id) partner.pairedWith = null;
      partner.carryTarget = null;
    }
  }
  return events;
}

/** Story move events for pairs: give (hand over the held prop) and detach (end a carry or piggyback). */
export function pairMoveEvent(world, actor, e, events) {
  const p = (world.pairs || []).find((q) => q.lead === actor);
  if (!p) return;
  if (e.detach) {
    p.detached = true;
    p.attached = false;
    p.partner.carryTarget = null;
    events.push({ type: "pair", what: "detach", actor: actor.id, partner: p.partner.id });
  }
  if (e.give) {
    if (!actor.prop) {
      events.push({ type: "propMissing", actor: actor.id, beatId: actor.move?.beatId, give: true });
      return;
    }
    p.partner.prop = actor.prop;
    p.partner.propAngle = 0;
    actor.prop = null;
    events.push({ type: "give", actor: actor.id, partner: p.partner.id, name: p.partner.prop.name });
  }
}
