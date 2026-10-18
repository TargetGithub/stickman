// Story beats the director hands off (S4, S5): object world commands and walking to a seat.
// Milestone: S4/S5. Split from director.js to keep it small.

import { spawnObject, removeObject, setObject } from "../objects.js";

/** Object world commands (S4): spawn_object (params.kind, id, x, ...), remove_object / set_object (beat.object). */
export const OBJECT_COMMANDS = {
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

/**
 * sit with an object (S5): walk to the seat first (the beat waits), then sit at the seat's height.
 * @returns {boolean} true when the character still has to walk there
 */
export function walkToSeat(director, beat, actor, ctx, command) {
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
