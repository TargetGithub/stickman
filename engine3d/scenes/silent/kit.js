// Shared moves for DumpyDoo's silent movie (scenes/dumpydoo_silent_movie.js): the waddle walk (toes out, a roll
// side to side), a hat that hops off his head and back, a cane twirl, poses for sitting and falling, title cards
// and quick set changes. Every helper takes the director and a start time and returns when it ends.
// Arm angles were tried on DumpyDoo (scenes/dumpydoo_motions.js): "#arm" is the upper arm, "#forearm" the
// forearm; "rotation" moves both sides as mirror images, "lift" with liftSide moves one (-1: his right).

export const ID = "dd";
/** Where the hat sits on his head (head part frame) and its size. */
export const HAT = { at: [0, 0.63, 0], size: 1.2 };
/** The cane in his left hand: where the hand is (forearm frame), its size, and the point of the cane held there (inside the hook), which it also twirls about. */
export const CANE = { at: [0, -0.14, 0.01], size: 1.6, pivot: [0.055, 0.45, 0] };

const P = (part) => `${ID}#${part}`;

/** Tween a list of [target, prop, value] together. */
export function pose(d, t, dur, list, ease = "sineInOut") {
  for (const [target, prop, to] of list) d.tween(target, prop, to, { at: t, dur, ease });
  return t + dur;
}

/** Arms (both, mirror images): upper arm and forearm angles. */
export const arms = (d, t, dur, arm, fore = [0, 0, 0], ease) => pose(d, t, dur, [[P("arm"), "rotation", arm], [P("forearm"), "rotation", fore]], ease);

/** One arm: side -1 his right, 1 his left (lift on top of the rotation). */
export function oneArm(d, t, dur, side, arm, fore = [0, 0, 0], ease) {
  d.set(P("arm"), "liftSide", side, t).set(P("forearm"), "liftSide", side, t);
  return pose(d, t, dur, [[P("arm"), "lift", arm], [P("forearm"), "lift", fore]], ease);
}

/** Legs: [left, right] angles (x < 0 swings a foot forward). */
export const legs = (d, t, dur, left, right = left, ease) => pose(d, t, dur, [[P("leg_left"), "rotation", left], [P("leg_right"), "rotation", right]], ease);

/** Everything back to standing: arms, legs, lifts, body squash and tilt (keeps where he faces). */
export function rest(d, t, dur = 0.35, face = 0) {
  arms(d, t, dur, [0, 0, 0]);
  pose(d, t, dur, [[P("arm"), "lift", [0, 0, 0]], [P("forearm"), "lift", [0, 0, 0]]]);
  legs(d, t, dur, [0, 0, 0]);
  pose(d, t, dur, [[ID, "scale", [1, 1, 1]], [ID, "rotation", [0, face, 0]], [P("head"), "rotation", [0, 0, 0]]]);
  return t + dur;
}

/**
 * The waddle: toes turned out, stiff little steps, a roll side to side and a bob, gliding to `to`. Facing is
 * the caller's (turn first). Returns the end time.
 */
export function waddle(d, t, to, { steps = 6, step = 0.32, face = 0, sound = true } = {}) {
  const dur = steps * step;
  d.move(ID, { at: t, to, dur, ease: "linear" });
  for (let i = 0; i < steps; i++) {
    const s = i % 2 ? 1 : -1, at = t + i * step;
    pose(d, at, step, [
      [P("leg_left"), "rotation", [-24 * s, 22, 0]], [P("leg_right"), "rotation", [24 * s, -22, 0]],
      [ID, "rotation", [0, face, 6 * s]],
      [P("arm"), "rotation", [-14 * s, 0, 6]],
    ]);
    d.hop(ID, { at, height: 0.03, dur: step });
    if (sound) d.sound("footstep_soft", { at: at + step * 0.5, volume: 0.35 });
  }
  pose(d, t + dur, 0.2, [[P("leg_left"), "rotation", [0, 0, 0]], [P("leg_right"), "rotation", [0, 0, 0]], [ID, "rotation", [0, face, 0]], [P("arm"), "rotation", [0, 0, 0]]]);
  return t + dur + 0.2;
}

/** A tiptoe sneak: high slow steps, arms up like paws, eyes darting. */
export function sneak(d, t, to, { steps = 4, step = 0.55, face = 0 } = {}) {
  arms(d, t, 0.3, [-50, 0, 30], [-60, 0, 0]);
  d.move(ID, { at: t, to, dur: steps * step, ease: "linear" });
  for (let i = 0; i < steps; i++) {
    const s = i % 2 ? 1 : -1, at = t + i * step;
    legs(d, at, step / 2, s < 0 ? [-50, 0, 0] : [0, 0, 0], s < 0 ? [0, 0, 0] : [-50, 0, 0], "quadOut");
    legs(d, at + step / 2, step / 2, [0, 0, 0], [0, 0, 0], "quadIn");
    d.hop(ID, { at, height: 0.06, dur: step });
    d.sound("squeak", { at: at + step * 0.8, volume: 0.25 });
  }
  pose(d, t + steps * step, 0.2, [[ID, "rotation", [0, face, 0]]]);
  return t + steps * step;
}

/** The hat hops off his head and lands back: a cheeky hello (the tip of the hat). */
export function tipHat(d, t, hat = "hat") {
  oneArm(d, t, 0.25, -1, [70, 0, -96], [45, 0, -40], "quadOut");
  d.tween(hat, "position", [HAT.at[0], HAT.at[1] + 0.16, HAT.at[2]], { at: t + 0.1, dur: 0.25, ease: "quadOut" });
  d.tween(hat, "rotation", [0, 0, 18], { at: t + 0.1, dur: 0.25, ease: "quadOut" });
  d.nod(ID, { at: t + 0.2, deg: 14, dur: 0.5 });
  d.tween(hat, "position", HAT.at, { at: t + 0.6, dur: 0.22, ease: "bounceOut" });
  d.tween(hat, "rotation", [0, 0, 0], { at: t + 0.6, dur: 0.22, ease: "quadIn" });
  d.sound("pop", { at: t + 0.12, volume: 0.5 });
  oneArm(d, t + 0.75, 0.3, -1, [0, 0, 0], [0, 0, 0]);
  return t + 1.05;
}

/** The cane spins round in his left hand like a propeller. */
export function twirl(d, t, turns = 2, dur = 0.8) {
  d.spin("cane", { at: t, turns, dur, axis: "z", ease: "quadInOut" });
  d.sound("whoosh", { at: t, volume: 0.35 });
  return t + dur;
}

/** A squash: he lands flat (body wide and low) and springs back. */
export function squash(d, t, { dur = 0.5, k = 0.72, sound = "boing" } = {}) {
  d.tween(ID, "scale", [1 + (1 - k), k, 1 + (1 - k)], { at: t, dur: 0.1, ease: "quadOut" });
  d.tween(ID, "scale", [1, 1, 1], { at: t + 0.1, dur: dur - 0.1, ease: "elasticOut" });
  if (sound) d.sound(sound, { at: t, volume: 0.7 });
  return t + dur;
}

/** Sit down on the spot (legs out in front, body lowered by `drop`), facing `face`. */
export function sit(d, t, { drop = 0.17, dur = 0.3, face = 0, base = [0, 0, 0] } = {}) {
  legs(d, t, dur, [-82, 10, 0], [-82, -10, 0], "quadOut");
  d.tween(ID, "position", [base[0], base[1] - drop, base[2]], { at: t, dur, ease: "quadIn" });
  d.tween(ID, "rotation", [0, face, 0], { at: t, dur });
  return t + dur;
}

/** A dizzy wobble after a bump: rolls round twice, eyes squeezed. */
export function dizzy(d, t, dur = 1.4, face = 0) {
  d.feel(ID, { at: t, feeling: "worried", dur: 0.2 });
  for (let i = 0; i < 4; i++) d.tween(ID, "rotation", [i % 2 ? 6 : -6, face, i % 2 ? -10 : 10], { at: t + (i * dur) / 4, dur: dur / 4, ease: "sineInOut" });
  d.tween(ID, "rotation", [0, face, 0], { at: t + dur, dur: 0.25 });
  return t + dur + 0.25;
}

/** A shrug to the camera: arms out, head tilt, a little "what can you do". */
export function shrug(d, t, face = 0) {
  arms(d, t, 0.25, [10, 0, 55], [40, 0, 40], "quadOut");
  d.tween(P("head"), "rotation", [0, 0, 12], { at: t, dur: 0.25 });
  d.hop(ID, { at: t, height: 0.05, dur: 0.3 });
  d.tween(P("head"), "rotation", [0, 0, 0], { at: t + 0.9, dur: 0.3 });
  arms(d, t + 0.9, 0.3, [0, 0, 0]);
  d.tween(ID, "rotation", [0, face, 0], { at: t, dur: 0.25 });
  return t + 1.2;
}

/** The iris moves of the whole film (filmLook reads them): chapters push their closing irises here. */
export const IRISES = [];

/**
 * The end of a chapter, silent-movie style: he turns to us and gives the audience a look (a little nod and a
 * smile), then the iris closes on him. It opens again on the next chapter's scene. Returns the end time.
 */
export function curtain(d, t, { feeling = "joyful", face = 0 } = {}) {
  d.turn(ID, { at: t, to: [0, face, 0], dur: 0.3 });
  d.look(ID, { at: t, to: "ahead", dur: 0.3 });
  d.tween(ID, "gaze", [0, 0], { at: t, dur: 0.2 });
  d.feel(ID, { at: t + 0.3, feeling });
  d.nod(ID, { at: t + 0.5, deg: 12, dur: 0.5 });
  // Closed by t + 2.7; the next chapter's set swaps in at t + 2.8 and the iris opens on it.
  IRISES.push({ at: t + 0.6, dur: 1.4, to: 0.16, center: ID }, { at: t + 2.4, dur: 0.3, to: 0 }, { at: t + 2.85, dur: 0.01, to: 0, center: [0.5, 0.48] }, { at: t + 2.9, dur: 1.1, to: 1 });
  d.set(ID, "gaze", null, t + 2.7);
  return t + 2.8;
}

/** The baby voice: the toddler timbre; the storyteller a touch lower than DumpyDoo himself. */
export const VOICE = { voice: "toddler", narrator: 1.1, dumpy: 1.25 };

/** A card's words as spoken: a blank line ends a sentence, a line break is a space, SHOUTED words read normally. */
export const spoken = (text) => text.replace(/\n\n+/g, ". ").replace(/\n/g, " ").replace(/\b([A-Z]{2,})\b/g, (w) => w[0] + w.slice(1).toLowerCase());

/**
 * A title, read aloud in the baby voice; it stays up until the reading ends (at least `dur`). A full-frame card,
 * or with over: true a title over the live scene (the chapter titles: DumpyDoo is in the picture under it).
 * music: start a chapter there with that music mood (director.chapter).
 */
export function card(d, text, t, dur = 3, { music, over = false } = {}) {
  if (music) d.chapter(`card${t.toFixed(2)}`, { at: t, music });
  const said = d.say(spoken(text), { at: t + 0.35, voice: VOICE.voice, pitch: VOICE.narrator });
  dur = Math.max(dur, said + 1);
  d.caption(text, { at: t, dur, style: over ? "chapter" : "intertitle" });
  return t + dur;
}

/** DumpyDoo says a line himself (his mouth moves with it), with a subtitle. Returns when he has finished. */
export function speak(d, text, t, { who = ID, pitch = VOICE.dumpy } = {}) {
  const dur = d.say(text, { at: t, who, voice: VOICE.voice, pitch });
  d.caption(text, { at: t, dur: dur + 0.4, style: "subtitle" });
  return t + dur + 0.3;
}

/** A quick exclamation in the middle of a gag ("Wheee!"): like speak, but the gag carries on underneath. */
export function exclaim(d, text, t, o) {
  speak(d, text, t, o);
}

/** Show objects at once at t (from hidden; objects here are sized with size, so their scale is 1), or hide them. */
export function appear(d, ids, t) {
  for (const id of ids) d.set(id, "visible", true, t).set(id, "scale", [1, 1, 1], t);
}
export function vanish(d, ids, t) {
  for (const id of ids) d.set(id, "visible", false, t).set(id, "scale", [0, 0, 0], t);
}

/** Put DumpyDoo somewhere at once (during a title card), facing `face`, standing, happy. */
export function place(d, t, at, face = 0, feeling = "happy") {
  d.set(ID, "position", at, t).set(ID, "rotation", [0, face, 0], t).set(ID, "scale", [1, 1, 1], t);
  d.feel(ID, { at: t, feeling, dur: 0.01 });
  rest(d, t, 0.01, face);
}

/** Set the camera at once. */
export function cam(d, t, position, lookAt, fov = 38) {
  d.set("camera", "position", position, t).set("camera", "lookAt", lookAt, t).set("camera", "fov", fov, t);
}
