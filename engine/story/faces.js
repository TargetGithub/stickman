// Face state (STORY_SPEC 7.1). Milestone: S2. Story scripts only: v1 characters have no face.
// actor.face is the base emotion (scene cast `face`, beat `face`, carried across scenes);
// actor.shownFace is what is drawn this frame, after automatic faces:
//   defeated with a style that has a face (captured: scared) → that face;  knocked out → dizzy;  hit → hurt for 0.4 s;  a move with its own face (cry, sigh...) → that face;
//   attacking with a neutral base → determined;  otherwise the base face.

export const HURT_SECONDS = 0.4;
const KO_MOVES = ["ko_fall", "ko_spin"];

/** Note hits so the target shows "hurt" for a moment. */
export function faceEvents(world, events, storyT) {
  for (const e of events) {
    if (e.type !== "hit" || e.kind !== "hit") continue;
    const target = world.byId.get(e.target);
    if (target && target.face) target.hurtUntil = storyT + HURT_SECONDS;
  }
}

/** The face to draw for an actor now (null for v1 actors). */
export function shownFace(actor, dead, storyT) {
  if (!actor.face) return null;
  const def = actor.move?.def;
  if (dead.has(actor.id) && actor.defeatFace) return actor.defeatFace; // a defeat style's own face (S5)
  if (dead.has(actor.id) || (def && KO_MOVES.includes(def.name))) return "dizzy";
  if (actor.hurtUntil > storyT) return "hurt";
  if (def?.face) return def.face;
  if (def?.category === "attack" && actor.face === "neutral") return "determined";
  return actor.face;
}

/** Update shownFace on every actor (call once per frame, before the frame is stored). */
export function updateFaces(world, dead, storyT) {
  for (const a of world.actors) a.shownFace = shownFace(a, dead, storyT);
}
