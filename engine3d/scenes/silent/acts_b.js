// DumpyDoo's silent movie, part B: Chapter 4 (the busy bee on the park bench), Chapter 5 (the seesaw) and
// Chapter 6 (the mirror that was not a mirror).

import { ID, HAT, pose, arms, oneArm, legs, rest, waddle, tipHat, twirl, squash, sit, dizzy, shrug, card, appear, vanish, place, cam, curtain, exclaim } from "./kit.js";
import { stars } from "./acts_a.js";

const P = (part, who = ID) => `${who}#${part}`;

/** Park scenery: trees, bushes and flowers (ids returned so the chapter can show and hide them). */
function park(d, prefix, extra = []) {
  const ids = [];
  const add = (o) => (d.add({ ...o, id: `${prefix}_${o.id}`, hidden: true }), ids.push(`${prefix}_${o.id}`));
  add({ id: "tree1", kind: "prop", model: "tree", at: [-3.3, 0, -3.4], size: 2.6 });
  add({ id: "tree2", kind: "prop", model: "tree", at: [3.5, 0, -3.8], size: 2.3 });
  add({ id: "bush1", kind: "prop", model: "bush", at: [-2.4, 0, -1.9], size: 1.1 });
  for (const [i, x] of [-1.6, -1.1, 1.3, 1.9].entries()) add({ id: `flower${i}`, kind: "prop", model: "flower", at: [x, 0, -1.2 + (i % 2) * 0.3], size: 0.6, color: ["pink", "yellow", "purple", "red"][i] });
  for (const o of extra) add(o);
  return ids;
}

/** Chapter 4: the busy bee. */
export function chapterBee(d, t) {
  const set = park(d, "k");
  d.add({ id: "bench", kind: "prop", model: "bench", at: [0, 0, -0.25], size: 1.15, hidden: true });
  d.add({ id: "bee", kind: "critter", species: "bee", at: [-3, 1.6, 0.5], size: 0.32, hidden: true });
  const ids = [...set, "bench"];
  t = card(d, "Chapter Five\n\nThe Busy Bee", t, 4.5, { music: "tense" });
  appear(d, ids, t - 0.5);
  place(d, t - 0.5, [-2.4, 0, 0.45], 90);
  cam(d, t - 0.5, [0, 1.15, 4.4], [0, 0.8, 0], 38);
  t = waddle(d, t, [0, 0, 0.45], { steps: 7, face: 90 });
  // A rest on the bench: a hop up, a happy sigh, a stretch and a yawn.
  d.turn(ID, { at: t, to: [0, 0, 0], dur: 0.3 });
  d.hop(ID, { at: t + 0.3, height: 0.35, dur: 0.45 });
  d.move(ID, { at: t + 0.3, to: [0, 0.44, -0.12], dur: 0.45, ease: "quadOut" });
  sit(d, t + 0.75, { base: [0, 0.44, -0.12], drop: 0.17 });
  d.sound("land", { at: t + 0.75, volume: 0.4 });
  t += 1.4;
  d.feel(ID, { at: t, feeling: "joyful" });
  arms(d, t + 0.4, 0.5, [10, 0, 120], [60, 0, 40]);
  d.feel(ID, { at: t + 0.8, feeling: "sleepy" });
  d.sound("ooh", { at: t + 0.8, volume: 0.4 });
  arms(d, t + 1.9, 0.5, [0, 0, 0]);
  t += 2.6;

  // Bzzz! A bee arrives and loops round his head; his eyes follow it round and round.
  appear(d, ["bee"], t);
  d.feel(ID, { at: t, feeling: "surprised", dur: 0.2 });
  d.sound("buzz", { at: t, volume: 0.6 });
  const loop = [[-3, 1.6, 0.5], [-1, 1.5, 0.8], [0.6, 1.5, 0.7], [0.5, 1.4, -0.5], [-0.5, 1.5, -0.4], [-0.6, 1.2, 0.6], [0.4, 1.1, 0.8], [0.8, 1.6, 0.2]];
  d.path("bee", { at: t, dur: 4, points: loop, face: true });
  const gaze = [[0, 0], [1, 0.2], [0.8, 0.8], [-0.9, 0.8], [-1, 0.4], [1, -0.2], [-1, 0.6], [0, 0]];
  gaze.forEach((g, i) => d.tween(ID, "gaze", g, { at: t + i * 0.5, dur: 0.25 }));
  d.sound("buzz", { at: t + 2, volume: 0.5 });
  t += 4;
  d.set(ID, "gaze", null, t);
  // He swats at it with his cane: whoosh... miss! whoosh... miss!
  d.feel(ID, { at: t, feeling: "angry" });
  exclaim(d, "Shoo, bee!", t);
  for (let i = 0; i < 2; i++) {
    const at = t + i * 1.1;
    oneArm(d, at, 0.2, 1, [20, 0, 120], [40, 0, 30], "quadOut");
    oneArm(d, at + 0.25, 0.25, 1, [-30, 0, 30], [-20, 0, 0], "quadIn");
    d.sound("whoosh", { at: at + 0.25 });
    d.path("bee", { at: at + 0.2, dur: 0.6, points: [i ? [-0.6, 1.6, 0.4] : [0.8, 1.6, 0.2], [0, 2.1, 0.5], i ? [0.7, 1.5, 0.3] : [-0.6, 1.6, 0.4]] });
    d.tween(ID, "rotation", [0, 0, i ? -10 : 10], { at: at + 0.25, dur: 0.25 });
    d.tween(ID, "rotation", [0, 0, 0], { at: at + 0.6, dur: 0.3 });
  }
  t += 2.4;
  oneArm(d, t, 0.3, 1, [0, 0, 0], [0, 0, 0]);
  // The bee lands right on top of his hat. Where did it go? He bonks his own hat: it slips down over his eyes!
  d.path("bee", { at: t, dur: 0.8, points: [[0.7, 1.5, 0.3], [0.3, 1.9, 0], [0, 1.55, -0.1]] });
  d.tween("bee", "rotation", [0, 0, 0], { at: t + 0.8, dur: 0.2 });
  d.tween(ID, "gaze", [1, 0], { at: t + 0.9, dur: 0.15 });
  d.tween(ID, "gaze", [-1, 0], { at: t + 1.4, dur: 0.15 });
  d.tween(ID, "gaze", [0, 1], { at: t + 1.9, dur: 0.2 });
  d.feel(ID, { at: t + 2, feeling: "angry" });
  t += 2.5;
  oneArm(d, t, 0.25, 1, [30, 0, 140], [60, 0, 50], "quadOut");
  d.path("bee", { at: t + 0.2, dur: 0.5, points: [[0, 1.55, -0.1], [0.4, 2.1, 0.2], [0.8, 1.7, 0.4]] });
  d.sound("buzz", { at: t + 0.2, volume: 0.4 });
  d.sound("clang", { at: t + 0.3 });
  d.tween("hat", "position", [0, HAT.at[1] - 0.2, 0.02], { at: t + 0.3, dur: 0.15, ease: "quadIn" });
  d.feel(ID, { at: t + 0.3, feeling: "surprised", dur: 0.1 });
  squash(d, t + 0.3, { dur: 0.4, k: 0.9, sound: null });
  oneArm(d, t + 0.6, 0.3, 1, [0, 0, 0], [0, 0, 0]);
  t += 0.8;
  // Blind! He waves his arms about; the bee giggles and wiggles.
  for (let i = 0; i < 4; i++) arms(d, t + i * 0.35, 0.35, i % 2 ? [-40, 0, 70] : [-70, 0, 30], [-30, 0, 0]);
  d.wiggle("bee", { at: t, deg: 25, dur: 1 });
  d.sound("giggle", { at: t + 0.3, volume: 0.7 });
  t += 1.6;
  arms(d, t, 0.3, [0, 0, 0]);
  d.tween("hat", "position", HAT.at, { at: t + 0.2, dur: 0.3, ease: "backOut" });
  d.sound("pop", { at: t + 0.25, volume: 0.5 });
  d.feel(ID, { at: t + 0.5, feeling: "worried" });
  t += 1.2;
  // The bee lands on his nose. Ah... ah... ah... CHOO! The bee goes flying, and so does he: over the back of the bench.
  d.path("bee", { at: t, dur: 0.9, points: [[0.8, 1.7, 0.4], [0.5, 1.2, 0.8], [0.03, 0.97, 0.48]] });
  d.tween("bee", "rotation", [0, 0, 0], { at: t + 0.9, dur: 0.1 });
  d.tween(ID, "gaze", [0, -1], { at: t + 0.8, dur: 0.2 });
  d.feel(ID, { at: t + 0.9, feeling: "surprised", dur: 0.15 });
  t += 1.6;
  for (let i = 0; i < 3; i++) {
    d.tween(P("head"), "rotation", [-12 - i * 6, 0, 0], { at: t + i * 0.55, dur: 0.4, ease: "sineInOut" });
    d.tween(P("head"), "rotation", [-4, 0, 0], { at: t + i * 0.55 + 0.4, dur: 0.15 });
    d.sound("gasp", { at: t + i * 0.55 + 0.1, volume: 0.25 + i * 0.1 });
  }
  t += 1.8;
  d.sound("sneeze", { at: t });
  d.tween(P("head"), "rotation", [22, 0, 0], { at: t, dur: 0.12, ease: "quadOut" });
  d.feel(ID, { at: t, feeling: "joyful", dur: 0.05 });
  d.set(ID, "gaze", null, t);
  d.path("bee", { at: t, dur: 1.2, points: [[0.03, 0.97, 0.48], [0.4, 1.4, 2], [1.5, 2.6, 3.4]] });
  d.spin("bee", { at: t, turns: 3, dur: 1.2, axis: "z" });
  d.path(ID, { at: t + 0.1, dur: 0.7, points: [[0, 0.27, -0.12], [0, 0.9, -0.4], [0, 0, -1.1]] });
  d.tween(ID, "rotation", [-200, 0, 0], { at: t + 0.1, dur: 0.6, ease: "quadOut" });
  d.sound("slide_whistle", { at: t + 0.1, volume: 0.5 });
  d.sound("land", { at: t + 0.8 });
  vanish(d, ["bee"], t + 1.2);
  t += 1.8;
  // A pause... and up he pops from behind the bench, hat on crooked.
  d.set(ID, "rotation", [0, 0, 0], t).set(ID, "position", [0, -0.9, -1.1], t);
  rest(d, t, 0.01, 0);
  d.set("hat", "rotation", [0, 0, 22], t);
  d.move(ID, { at: t + 0.6, to: [0, -0.15, -1.1], dur: 0.35, ease: "backOut" });
  d.feel(ID, { at: t + 0.6, feeling: "worried" });
  d.sound("pop", { at: t + 0.6 });
  t = stars(d, t + 1, 1.8);
  d.sound("giggle", { at: t - 1, volume: 0.7 });
  d.tween("hat", "rotation", [0, 0, 0], { at: t, dur: 0.3, ease: "backOut" });
  d.feel(ID, { at: t, feeling: "happy" });
  t += 1;
  t = curtain(d, t);
  vanish(d, ids, t);
  return t;
}

/** Chapter 5: the seesaw. */
export function chapterSeesaw(d, t) {
  const set = park(d, "s");
  d.add({ id: "seesaw", kind: "prop", model: "seesaw", at: [0, 0, 0], hidden: true });
  d.add({ id: "pumpkin", kind: "prop", model: "pumpkin", at: [0.95, 0.75, 0], size: 1.6, hidden: true });
  d.add({ id: "sbush", kind: "prop", model: "bush", at: [2.9, 0, -1.6], size: 1.5, hidden: true });
  const ids = [...set, "seesaw", "sbush"];
  const tilt = 14; // the plank's tilt, its left end down
  const s = Math.sin((tilt * Math.PI) / 180);
  t = card(d, "Chapter Six\n\nUp, Up and Away!", t, 4.5, { music: "heroic" });
  appear(d, ids, t - 0.5);
  d.set("seesaw#plank", "rotation", [0, 0, tilt], t - 0.5);
  place(d, t - 0.5, [-2.6, 0, 0.5], 90);
  cam(d, t - 0.5, [0, 1.3, 5.2], [0, 0.9, 0], 40);
  t = waddle(d, t, [-1.05, 0, 0.5], { steps: 5, face: 90 });
  // He climbs on the low end and sits, bouncing, waiting to go up. Nothing happens.
  d.turn(ID, { at: t, to: [0, 0, 0], dur: 0.3 });
  const low = [-1.05, 0.48 - 1.05 * s - 0.02, 0];
  d.hop(ID, { at: t + 0.3, height: 0.3, dur: 0.4 });
  d.move(ID, { at: t + 0.3, to: [low[0], low[1] + 0.17, low[2]], dur: 0.4 });
  sit(d, t + 0.7, { base: [low[0], low[1] + 0.17, low[2]], drop: 0.17 });
  t += 1.3;
  for (let i = 0; i < 3; i++) d.hop(ID, { at: t + i * 0.5, height: 0.12, dur: 0.45, sound: "squeak" });
  d.feel(ID, { at: t + 1.6, feeling: "worried" });
  d.look(ID, { at: t + 1.6, to: [1.1, 0.75, 0], dur: 0.4 });
  t += 2.6;
  d.look(ID, { at: t, to: "ahead", dur: 0.3 });
  shrug(d, t + 0.3);
  t += 1.8;
  // He walks up the plank to the high end... past the middle the plank tips the other way. He walks back: it tips again.
  d.feel(ID, { at: t, feeling: "happy" });
  legs(d, t, 0.3, [0, 0, 0]);
  d.move(ID, { at: t, to: low, dur: 0.3 });
  d.turn(ID, { at: t, to: [0, 90, 0], dur: 0.3 });
  t += 0.4;
  const along = (x, tl) => [x, 0.48 + x * Math.sin((tl * Math.PI) / 180) - 0.02, 0];
  t = waddle(d, t, along(0.12, tilt), { steps: 4, face: 90, sound: false });
  d.tween("seesaw#plank", "rotation", [0, 0, -tilt], { at: t, dur: 0.35, ease: "quadIn" });
  d.sound("block", { at: t + 0.35 });
  d.move(ID, { at: t, to: along(0.12, -tilt), dur: 0.35, ease: "quadIn" });
  d.feel(ID, { at: t + 0.2, feeling: "surprised", dur: 0.1 });
  t += 0.9;
  d.turn(ID, { at: t, to: [0, -90, 0], dur: 0.3 });
  t = waddle(d, t + 0.3, along(-0.12, -tilt), { steps: 2, face: -90, sound: false });
  d.tween("seesaw#plank", "rotation", [0, 0, tilt], { at: t, dur: 0.35, ease: "quadIn" });
  d.sound("block", { at: t + 0.35 });
  d.move(ID, { at: t, to: along(-0.12, tilt), dur: 0.35, ease: "quadIn" });
  t += 0.7;
  d.turn(ID, { at: t, to: [0, 90, 0], dur: 0.3 });
  t = waddle(d, t + 0.3, along(0.12, tilt), { steps: 2, face: 90, sound: false });
  d.tween("seesaw#plank", "rotation", [0, 0, -tilt], { at: t, dur: 0.35, ease: "quadIn" });
  d.sound("block", { at: t + 0.35 });
  d.move(ID, { at: t, to: along(0.12, -tilt), dur: 0.35, ease: "quadIn" });
  t += 0.7;
  // He stops dead in the middle and balances: wobble, wobble...
  d.turn(ID, { at: t, to: [0, 0, 0], dur: 0.3 });
  d.move(ID, { at: t, to: [0, 0.48, 0], dur: 0.3 });
  d.tween("seesaw#plank", "rotation", [0, 0, 0], { at: t, dur: 0.3 });
  arms(d, t + 0.2, 0.3, [10, 0, 90], [20, 0, 10]);
  for (let i = 0; i < 4; i++) {
    const k = i % 2 ? -1 : 1;
    d.tween("seesaw#plank", "rotation", [0, 0, 6 * k], { at: t + 0.5 + i * 0.5, dur: 0.5, ease: "sineInOut" });
    d.tween(ID, "rotation", [0, 0, -8 * k], { at: t + 0.5 + i * 0.5, dur: 0.5, ease: "sineInOut" });
  }
  d.feel(ID, { at: t + 0.5, feeling: "worried" });
  t += 2.6;
  d.tween("seesaw#plank", "rotation", [0, 0, 0], { at: t, dur: 0.3 });
  d.tween(ID, "rotation", [0, 0, 0], { at: t, dur: 0.3 });
  d.feel(ID, { at: t + 0.3, feeling: "joyful" });
  d.sound("ding", { at: t + 0.3, volume: 0.6 });
  arms(d, t + 0.3, 0.3, [70, 0, 96], [45, 0, 40], "quadOut");
  t += 1.5;
  // Proud of himself, he hops down to the low end and sits. A pumpkin falls from the sky onto the high end...
  arms(d, t, 0.3, [0, 0, 0]);
  d.hop(ID, { at: t, height: 0.3, dur: 0.45 });
  d.tween("seesaw#plank", "rotation", [0, 0, tilt], { at: t + 0.35, dur: 0.2, ease: "quadIn" });
  d.move(ID, { at: t, to: [low[0], low[1] + 0.17, low[2]], dur: 0.45 });
  sit(d, t + 0.45, { base: [low[0], low[1] + 0.17, low[2]], drop: 0.17 });
  d.sound("block", { at: t + 0.55 });
  t += 1.4;
  d.feel(ID, { at: t, feeling: "happy" });
  d.look(ID, { at: t, to: [1, 3, 0], dur: 0.4 });
  d.sound("slide_whistle", { at: t, volume: 0.5 });
  appear(d, ["pumpkin"], t);
  d.feel(ID, { at: t + 0.5, feeling: "surprised", dur: 0.1 });
  d.drop("pumpkin", { at: t, to: [0.97, 0.48 + 1.05 * s - 0.05, 0], height: 4, dur: 0.6, sound: "drum" });
  t += 0.25;
  // ...and WHEE! Up he goes, spinning, right out of the picture.
  d.tween("seesaw#plank", "rotation", [0, 0, -tilt], { at: t, dur: 0.12, ease: "quadIn" });
  d.move("pumpkin", { at: t, to: [0.97, 0.48 - 1.05 * s + 0.1, 0], dur: 0.12, ease: "quadIn" });
  d.path(ID, { at: t + 0.1, dur: 1.4, points: [[low[0], 0.3, 0], [-0.4, 2.5, -0.3], [0.8, 4.8, -0.8]] });
  d.spin(ID, { at: t + 0.1, turns: 3, dur: 1.4, axis: "z", ease: "linear" });
  d.sound("rocket", { at: t + 0.1, volume: 0.5 });
  exclaim(d, "Wheee!", t + 0.1);
  d.camera({ at: t + 0.2, dur: 1.2, position: [0, 2.3, 5.4], lookAt: [0.3, 2.4, 0], ease: "quadOut" });
  t += 2.4;
  // A long wait... the camera comes back down. Then down he comes, straight into the bush. Rustle rustle!
  d.camera({ at: t, dur: 1.2, position: [0.8, 1.3, 5.2], lookAt: [1.2, 0.9, -0.6] });
  t += 1.6;
  rest(d, t, 0.01, 0);
  d.path(ID, { at: t, dur: 0.6, points: [[2.9, 5, -1.6], [2.9, 1.5, -1.6], [2.9, -0.5, -1.6]] });
  d.sound("slide_whistle", { at: t - 0.4, volume: 0.6 });
  d.sound("crack", { at: t + 0.6 });
  d.wiggle("sbush", { at: t + 0.6, deg: 14, dur: 1 });
  t += 2.2;
  // Out pops his head, leaves and all; then his hat floats down after him, swinging like a leaf.
  d.feel(ID, { at: t, feeling: "worried" });
  d.reparent("hat", { at: t - 1, parent: null });
  d.set("hat", "position", [3.6, 4, -1.3], t - 1).set("hat", "rotation", [0, 0, 0], t - 1);
  d.move(ID, { at: t, to: [2.9, 0.15, -1.45], dur: 0.35, ease: "backOut" });
  d.sound("pop", { at: t });
  d.tween(ID, "gaze", [0, 1], { at: t + 0.5, dur: 0.3 });
  d.path("hat", { at: t, dur: 2.6, points: [[3.6, 4, -1.3], [2.4, 3.1, -1.3], [3.4, 2.3, -1.4], [2.6, 1.7, -1.45], [2.9, 1.29, -1.45]] });
  for (let i = 0; i < 4; i++) d.tween("hat", "rotation", [0, 0, i % 2 ? -25 : 25], { at: t + i * 0.65, dur: 0.65, ease: "sineInOut" });
  d.sound("slide_whistle", { at: t + 0.3, volume: 0.35 });
  d.reparent("hat", { at: t + 2.6, parent: ID, part: "head", to: HAT.at, rotation: [0, 0, 0], dur: 0.15 });
  d.sound("ding", { at: t + 2.7 });
  t += 3;
  d.set(ID, "gaze", null, t);
  d.feel(ID, { at: t, feeling: "joyful" });
  d.sound("giggle", { at: t, volume: 0.7 });
  d.sound("crowd_cheer", { at: t + 0.3, volume: 0.3 });
  t += 2;
  t = curtain(d, t);
  vanish(d, [...ids, "pumpkin"], t);
  return t;
}

/** Chapter 6: the mirror (it was his twin cousin all along). The frame stands at x = 0 facing +x; DumpyDoo is on
 * the left facing right-and-a-little-toward-us, the twin is his mirror image on the right. */
export function chapterMirror(d, t) {
  const T = "dd2";
  d.add({ id: T, kind: "critter", species: "dumpydoo", at: [3, 0, 0], hidden: true });
  d.add({ id: "hat2", kind: "prop", model: "bowler_hat", parent: T, part: "head", at: HAT.at, size: HAT.size });
  d.add({ id: "mirror", kind: "prop", model: "mirror_frame", at: [0, 0, 0], rotation: [0, 90, 0], hidden: true });
  d.add({ id: "mshelf", kind: "prop", model: "shelf", at: [-2.6, 0, -2.2], hidden: true });
  d.add({ id: "mlamp", kind: "prop", model: "street_lamp", at: [2.8, 0, -2.4], size: 0.8, hidden: true });
  const ids = ["mirror", "mshelf", "mlamp"];
  const yaw = 62; // facing the frame, turned a little toward the camera
  const X = 0.62; // how far each stands from the frame
  t = card(d, "Chapter Nine\n\nThe Mirror", t, 4.5, { music: "playful" });
  d.changeStage("playroom", { at: t - 0.6, dur: 0.1 });
  appear(d, ids, t - 0.5);
  vanish(d, ["cane"], t - 0.5);
  place(d, t - 0.5, [-2.2, 0, 0.3], 90);
  appear(d, [T], t - 0.5);
  d.set(T, "position", [X, 0, 0], t - 0.5).set(T, "rotation", [0, -yaw, 0], t - 0.5);
  // From a little to the right, so the frame shows as a frame and not edge-on; he starts just in the picture.
  cam(d, t - 0.5, [1.5, 1.15, 4.1], [-0.1, 0.75, 0], 40);
  // While DumpyDoo is still walking up, his "reflection" stands frozen like a picture.
  d.set(T, "gaze", [0, 0], t - 0.5);
  t = waddle(d, t, [-X, 0, 0], { steps: 7, face: 90 });
  d.turn(ID, { at: t, to: [0, yaw, 0], dur: 0.3 });
  t += 0.6;
  d.feel(ID, { at: t, feeling: "surprised", dur: 0.15 });
  d.feel(T, { at: t, feeling: "surprised", dur: 0.15 });
  d.hop(ID, { at: t, height: 0.12, dur: 0.3 });
  d.hop(T, { at: t, height: 0.12, dur: 0.3 });
  t += 1;
  d.set(ID, "gaze", [0, 0], t);

  /** Both do the same move, mirror images: fn(id, mirror) where mirror is 1 for him and -1 for the twin. `late` delays the twin. */
  const both = (fn, late = 0) => {
    fn(ID, 1, t);
    fn(T, -1, t + late);
  };
  const tip = (id, m, at) => {
    const h = id === ID ? "hat" : "hat2";
    d.set(P("arm", id), "liftSide", -m, at).set(P("forearm", id), "liftSide", -m, at);
    pose(d, at, 0.25, [[P("arm", id), "lift", [70, 0, -96 * m]], [P("forearm", id), "lift", [45, 0, -40 * m]]], "quadOut");
    d.tween(h, "position", [0, HAT.at[1] + 0.16, 0], { at: at + 0.1, dur: 0.25, ease: "quadOut" });
    d.tween(h, "position", HAT.at, { at: at + 0.6, dur: 0.22, ease: "bounceOut" });
    pose(d, at + 0.75, 0.3, [[P("arm", id), "lift", [0, 0, 0]], [P("forearm", id), "lift", [0, 0, 0]]]);
  };
  // He tips his hat: so does the reflection.
  d.feel(ID, { at: t, feeling: "happy" });
  d.feel(T, { at: t, feeling: "happy" });
  both(tip);
  d.sound("pop", { at: t + 0.12, volume: 0.5 });
  t += 1.6;
  // A hop. A hop.
  both((id, m, at) => d.hop(id, { at, height: 0.3, dur: 0.45 }));
  d.sound("boing", { at: t, volume: 0.5 });
  t += 1;
  // A wiggle.
  both((id, m, at) => d.tween(id, "rotation", [0, m * yaw, 12 * m], { at, dur: 0.6, ease: "wiggle" }));
  t += 1.2;
  // A funny face: cross eyes and a grumpy mouth.
  both((id, m, at) => {
    d.feel(id, { at, feeling: "angry" });
    d.tween(id, "gaze", [m * -0.8, -0.3], { at, dur: 0.2 });
    d.tween(id, "gaze", [0, 0], { at: at + 1, dur: 0.2 });
    d.feel(id, { at: at + 1, feeling: "happy" });
  });
  t += 1.6;
  // A slow lean out of the frame... and a peek back.
  both((id, m, at) => {
    d.tween(id, "rotation", [0, m * yaw, 24 * m], { at, dur: 0.8 });
    d.tween(id, "rotation", [0, m * yaw, 0], { at: at + 1.4, dur: 0.3, ease: "backOut" });
  });
  t += 2;
  // He gets suspicious: a quick one. Arm up! The twin is a little late...
  d.feel(ID, { at: t, feeling: "angry" });
  d.feel(T, { at: t, feeling: "angry" });
  t += 0.8;
  both((id, m, at) => {
    d.set(P("arm", id), "liftSide", m, at).set(P("forearm", id), "liftSide", m, at);
    pose(d, at, 0.15, [[P("arm", id), "lift", [70, 0, 96 * m]], [P("forearm", id), "lift", [45, 0, 40 * m]]], "quadOut");
    pose(d, at + 0.6, 0.15, [[P("arm", id), "lift", [0, 0, 0]], [P("forearm", id), "lift", [0, 0, 0]]]);
  }, 0.45);
  d.sound("ding", { at: t + 0.45, volume: 0.4 });
  t += 1.5;
  d.tween(ID, "gaze", [0.6, 0], { at: t, dur: 0.2 });
  d.tween(ID, "gaze", [0, 0], { at: t + 0.8, dur: 0.2 });
  // ...and a leg. The twin lifts the WRONG leg, then quickly swaps.
  t += 1.1;
  legs(d, t, 0.2, [-60, 0, 0], [0, 0, 0], "quadOut");
  pose(d, t + 0.1, 0.2, [[P("leg_right", T), "rotation", [-60, 0, 0]]], "quadOut");
  pose(d, t + 0.6, 0.15, [[P("leg_right", T), "rotation", [0, 0, 0]], [P("leg_left", T), "rotation", [-60, 0, 0]]]);
  d.sound("squeak", { at: t + 0.6 });
  legs(d, t + 1.6, 0.2, [0, 0, 0]);
  pose(d, t + 1.6, 0.2, [[P("leg_left", T), "rotation", [0, 0, 0]]]);
  d.sound("giggle", { at: t + 0.8, volume: 0.6 });
  t += 2.3;
  // He reaches through the frame... and the twin's glove meets his. Both jump with a yelp!
  d.feel(ID, { at: t, feeling: "worried" });
  d.feel(T, { at: t, feeling: "worried" });
  both((id, m, at) => {
    d.move(id, { at, to: [-m * 0.42, 0, 0], dur: 0.8, ease: "sineInOut" });
    d.tween(id, "rotation", [0, m * 90, 0], { at, dur: 0.5 });
    d.set(P("arm", id), "liftSide", m, at).set(P("forearm", id), "liftSide", m, at);
    pose(d, at + 0.3, 0.6, [[P("arm", id), "lift", [-70, 0, 0]], [P("forearm", id), "lift", [-20, 0, 0]]]);
  });
  t += 1.2;
  both((id, m, at) => {
    d.feel(id, { at, feeling: "surprised", dur: 0.1 });
    d.hop(id, { at, height: 0.45, dur: 0.5 });
    d.move(id, { at, to: [-m * 1.0, 0, 0], dur: 0.5, ease: "quadOut" });
    pose(d, at, 0.2, [[P("arm", id), "lift", [0, 0, 0]], [P("forearm", id), "lift", [0, 0, 0]], [P("arm", id), "rotation", [-20, 0, 80]], [P("forearm", id), "rotation", [20, 0, 30]]]);
  });
  d.sound("gasp", { at: t });
  d.sound("boing", { at: t + 0.05, volume: 0.5 });
  t += 1.2;
  // The twin bursts out laughing, waves bye-bye and waddles off. DumpyDoo stares.
  d.set(T, "gaze", null, t);
  d.set(ID, "gaze", null, t);
  rest(d, t, 0.3, 90);
  pose(d, t, 0.3, [[P("arm", T), "rotation", [0, 0, 0]], [P("forearm", T), "rotation", [0, 0, 0]], [T, "rotation", [0, -45, 0]]]);
  d.feel(T, { at: t + 0.3, feeling: "joyful" });
  d.sound("giggle", { at: t + 0.3 });
  for (let i = 0; i < 3; i++) d.hop(T, { at: t + 0.3 + i * 0.35, height: 0.12, dur: 0.33 });
  d.feel(ID, { at: t + 0.3, feeling: "surprised" });
  t += 1.6;
  d.set(P("arm", T), "liftSide", -1, t).set(P("forearm", T), "liftSide", -1, t);
  pose(d, t, 0.3, [[P("arm", T), "lift", [70, 0, -96]], [P("forearm", T), "lift", [45, 0, -40]]], "quadOut");
  for (let i = 0; i < 4; i++) d.tween(P("forearm", T), "lift", [45, i % 2 ? 25 : -15, -40], { at: t + 0.3 + i * 0.22, dur: 0.22 });
  pose(d, t + 1.3, 0.3, [[P("arm", T), "lift", [0, 0, 0]], [P("forearm", T), "lift", [0, 0, 0]]]);
  t += 1.7;
  d.turn(T, { at: t, to: [0, 90, 0], dur: 0.3 });
  d.move(T, { at: t + 0.3, to: [3.6, 0, 0.2], dur: 2.6, ease: "linear" });
  for (let i = 0; i < 9; i++) {
    const k = i % 2 ? 1 : -1;
    pose(d, t + 0.3 + i * 0.29, 0.29, [[P("leg_left", T), "rotation", [-24 * k, 22, 0]], [P("leg_right", T), "rotation", [24 * k, -22, 0]], [T, "rotation", [0, 90, 6 * k]]]);
    d.hop(T, { at: t + 0.3 + i * 0.29, height: 0.03, dur: 0.29 });
  }
  d.turn(ID, { at: t + 0.4, to: [0, 0, 0], dur: 0.4 });
  exclaim(d, "Bye-bye, DumpyDee!", t + 0.9);
  t += 3;
  vanish(d, [T], t);
  t = card(d, "That was no mirror...\nit was his twin cousin, DumpyDee!", t, 3.6);
  // Back to DumpyDoo, who checks the empty frame with his glove, then shrugs at us.
  d.turn(ID, { at: t, to: [0, 90, 0], dur: 0.3 });
  oneArm(d, t + 0.3, 0.4, 1, [-70, 0, 0], [-20, 0, 0]);
  d.move(ID, { at: t + 0.3, to: [-0.45, 0, 0], dur: 0.5 });
  d.tween(P("forearm"), "lift", [-20, 30, 0], { at: t + 0.8, dur: 0.3, ease: "wiggle" });
  t += 1.6;
  oneArm(d, t, 0.3, 1, [0, 0, 0], [0, 0, 0]);
  d.turn(ID, { at: t, to: [0, 0, 0], dur: 0.3 });
  d.feel(ID, { at: t + 0.3, feeling: "worried" });
  shrug(d, t + 0.4);
  t += 1.8;
  d.feel(ID, { at: t, feeling: "joyful" });
  d.sound("giggle", { at: t, volume: 0.5 });
  t += 1.2;
  t = curtain(d, t);
  vanish(d, ids, t);
  appear(d, ["cane"], t);
  return t;
}
