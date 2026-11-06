// DumpyDoo's silent movie, part C: Chapter 7 (the cupcake factory), Chapter 8 (his very own rain cloud) and the
// finale (a cupcake for the bee, then off down the road into the sunset, iris out, The End).

import { ID, HAT, pose, arms, oneArm, legs, rest, waddle, tipHat, twirl, squash, shrug, card, appear, vanish, place, cam, curtain, exclaim, speak } from "./kit.js";
import { stars } from "./acts_a.js";

const P = (part) => `${ID}#${part}`;

/** Chapter 7: the cupcake factory. The belt runs left to right in front of him; the box is on his left. */
export function chapterFactory(d, t) {
  const BELT = { x0: -0.63, x1: 0.63, y: 0.465, z: 0.38 };
  const BOX = [1.15, 0, -0.15];
  d.add({ id: "belt", kind: "prop", model: "conveyor_belt", at: [0, 0, BELT.z], size: 0.6, hidden: true });
  d.add({ id: "cbox", kind: "prop", model: "toy_box", at: BOX, size: 1, hidden: true });
  d.add({ id: "bell", kind: "prop", model: "bell", at: [-1.5, 0, -0.6], size: 0.9, hidden: true });
  d.add({ id: "fshelf", kind: "prop", model: "shelf", at: [-2.4, 0, -2], hidden: true });
  d.add({ id: "fclock", kind: "clock", at: [1.9, 1.6, -2.3], size: 0.8, time: "8:00", hidden: true });
  const N = 15;
  for (let i = 0; i < N; i++) d.add({ id: `cup${i}`, kind: "prop", model: "cupcake", at: [BELT.x0, BELT.y, BELT.z], size: 0.55, hidden: true });
  d.add({ id: "hatcake", kind: "prop", model: "cupcake", parent: "hat", at: [0, 0.25, 0], size: 0.5, hidden: true });
  const ids = ["belt", "cbox", "bell", "fshelf", "fclock"];
  t = card(d, "Chapter Twelve\n\nThe Cupcake Factory", t, 4.5, { music: "battle" });
  d.changeStage("classroom", { at: t - 0.6, dur: 0.1 });
  appear(d, ids, t - 0.5);
  d.set("cbox#lid", "rotation", [-100, 0, 0], t - 0.5);
  place(d, t - 0.5, [0, 0, -0.2], 0);
  cam(d, t - 0.5, [0.2, 1.35, 4.2], [0.2, 0.7, 0], 40);
  t = card(d, "First day at work.\nThe job: put every cupcake in the box!", t, 3.6);

  // The bell rings and the belt starts. Rollers spin the whole time (faster later).
  d.wiggle("bell#bell", { at: t, deg: 20, dur: 0.8 });
  d.sound("bell", { at: t });
  d.tween("belt#roller", "rotation", [0, 360 * 40, 0], { at: t, dur: 40, ease: "linear" });
  d.feel(ID, { at: t, feeling: "joyful" });
  d.clock("fclock", { at: t, to: "8:30", dur: 30 });
  t += 1;
  let k = 0;
  /** A cupcake rides the belt to the middle in `ride` s; he grabs it and tosses it in the box. Returns the time it lands. */
  const grab = (at, ride, { miss = false, eat = false, onHat = false } = {}) => {
    const id = `cup${k++}`;
    appear(d, [id], at);
    d.move(id, { at, to: [0, BELT.y, BELT.z], dur: ride, ease: "linear" });
    const g = at + ride;
    if (miss) {
      // Too quick: it rides on past him, off the end of the belt and onto the floor.
      d.move(id, { at: g, to: [BELT.x1, BELT.y, BELT.z], dur: ride / 2, ease: "linear" });
      d.path(id, { at: g + ride / 2, dur: 0.4, points: [[BELT.x1, BELT.y, BELT.z], [BELT.x1 + 0.25, 0.4, BELT.z + 0.2], [BELT.x1 + 0.4, 0, BELT.z + 0.35]] });
      d.sound("land", { at: g + ride / 2 + 0.4, volume: 0.4 });
      return g;
    }
    arms(d, g - 0.25, 0.25, [-70, 0, 8], [-25, 0, 0], "quadOut");
    if (eat) {
      d.path(id, { at: g, dur: 0.3, points: [[0, BELT.y, BELT.z], [0, 0.85, 0.3], [0, 0.85, 0.2]] });
      vanish(d, [id], g + 0.3);
      d.feel(ID, { at: g + 0.2, feeling: "joyful", dur: 0.05 });
      d.tween(ID, "scale", [1.12, 0.95, 1.12], { at: g + 0.3, dur: 0.15, ease: "backOut" });
      for (let j = 0; j < 3; j++) d.nod(ID, { at: g + 0.35 + j * 0.25, deg: 8, dur: 0.25 });
      d.sound("crack", { at: g + 0.35, volume: 0.4 });
      d.tween(ID, "scale", [1, 1, 1], { at: g + 1.2, dur: 0.3 });
      arms(d, g, 0.25, [0, 0, 0]);
      return g;
    }
    if (onHat) {
      d.path(id, { at: g, dur: 0.5, points: [[0, BELT.y, BELT.z], [0.1, 1.9, 0.1], [0, 1.47, -0.2]] });
      vanish(d, [id], g + 0.5);
      appear(d, ["hatcake"], g + 0.5);
      d.sound("ding", { at: g + 0.5, volume: 0.5 });
      arms(d, g, 0.25, [0, 0, 0]);
      return g;
    }
    // Into the box: a little arc over his shoulder.
    arms(d, g, 0.25, [-10, 0, 40], [10, 0, 0], "quadOut");
    d.path(id, { at: g, dur: 0.45, points: [[0, BELT.y, BELT.z], [0.6, 1.2, 0.2], [BOX[0], 0.3, BOX[2]]] });
    vanish(d, [id], g + 0.45);
    d.sound("pop", { at: g + 0.45, volume: 0.5 });
    arms(d, g + 0.3, 0.2, [0, 0, 0]);
    return g;
  };

  // Slow and easy: three cupcakes, one, two, three. He is very good at this.
  for (let i = 0; i < 3; i++) grab(t + i * 2.2, 1.6);
  d.feel(ID, { at: t + 6.5, feeling: "happy" });
  t += 7.2;
  t = tipHat(d, t) + 0.4;
  // The bell again: faster! One in the box, one in his mouth, one on his hat, one in the box.
  d.wiggle("bell#bell", { at: t, deg: 20, dur: 0.8 });
  d.sound("bell", { at: t });
  d.feel(ID, { at: t + 0.3, feeling: "surprised", dur: 0.1 });
  t += 0.6;
  d.feel(ID, { at: t + 0.4, feeling: "worried" });
  grab(t, 0.9);
  grab(t + 1.05, 0.9, { eat: true });
  grab(t + 2.6, 0.9, { onHat: true });
  grab(t + 3.5, 0.9);
  t += 4.8;
  d.sound("giggle", { at: t - 0.5, volume: 0.5 });
  // Faster still! They come too quick: he grabs at one, misses it, misses the next...
  d.wiggle("bell#bell", { at: t, deg: 25, dur: 0.8 });
  d.sound("bell", { at: t });
  d.feel(ID, { at: t + 0.3, feeling: "surprised", dur: 0.1 });
  exclaim(d, "Too fast!", t + 0.4);
  t += 0.5;
  for (let i = 0; i < 6; i++) {
    const at = t + i * 0.45;
    grab(at, 0.55, { miss: i % 2 === 1 || i > 3 });
    if (i % 2 === 1) {
      arms(d, at + 0.4, 0.15, [-70, 0, 8], [-25, 0, 0], "quadOut");
      arms(d, at + 0.55, 0.15, [0, 0, 0]);
    }
  }
  d.feel(ID, { at: t + 1, feeling: "worried" });
  for (let i = 0; i < 6; i++) d.tween(ID, "gaze", [i % 2 ? 1 : -1, -0.6], { at: t + i * 0.45, dur: 0.12 });
  t += 3.4;
  d.set(ID, "gaze", null, t);
  // He jumps up onto the belt to catch them all... and the belt carries him away, running on the spot.
  d.feel(ID, { at: t, feeling: "angry" });
  d.hop(ID, { at: t, height: 0.35, dur: 0.45 });
  d.move(ID, { at: t, to: [-0.3, BELT.y, BELT.z], dur: 0.45 });
  d.sound("boing", { at: t });
  t += 0.5;
  d.turn(ID, { at: t, to: [0, -90, 0], dur: 0.2 });
  d.move(ID, { at: t, to: [BELT.x1 + 0.05, BELT.y, BELT.z], dur: 2.6, ease: "linear" });
  for (let i = 0; i < 12; i++) {
    const s = i % 2 ? 1 : -1;
    pose(d, t + i * 0.2, 0.2, [[P("leg_left"), "rotation", [-40 * s, 0, 0]], [P("leg_right"), "rotation", [40 * s, 0, 0]], [P("arm"), "rotation", [40 * s, 0, 10]]]);
    d.sound("footstep_soft", { at: t + i * 0.2 + 0.1, volume: 0.35 });
  }
  d.feel(ID, { at: t + 1, feeling: "worried" });
  t += 2.6;
  // Off the end, into the box. The lid slams.
  rest(d, t, 0.2, -90);
  d.feel(ID, { at: t, feeling: "surprised", dur: 0.1 });
  d.path(ID, { at: t, dur: 0.6, points: [[BELT.x1 + 0.05, BELT.y, BELT.z], [0.95, 0.9, 0.15], [BOX[0], -0.5, BOX[2]]] });
  d.sound("slide_whistle", { at: t });
  d.tween("cbox#lid", "rotation", [0, 0, 0], { at: t + 0.7, dur: 0.2, ease: "quadIn" });
  d.sound("clang", { at: t + 0.9 });
  d.tween("belt#roller", "rotation", [0, 360 * 41, 0], { at: t + 0.9, dur: 0.6, ease: "quadOut" });
  t += 2.2;
  // Silence... then the lid creaks up and out he pops, a cupcake still on his hat.
  d.tween("cbox#lid", "rotation", [-100, 0, 0], { at: t, dur: 0.35, ease: "backOut" });
  d.sound("door_open", { at: t, volume: 0.5 });
  d.set(ID, "rotation", [0, 0, 0], t);
  d.move(ID, { at: t + 0.2, to: [BOX[0], 0.02, BOX[2]], dur: 0.4, ease: "backOut" });
  d.feel(ID, { at: t + 0.2, feeling: "joyful" });
  d.sound("pop", { at: t + 0.25 });
  t += 1.4;
  t = speak(d, "All done, boss!", t);
  d.sound("giggle", { at: t, volume: 0.6 });
  d.hop(ID, { at: t, height: 0.12, dur: 0.35 });
  t += 1.4;
  t = curtain(d, t);
  vanish(d, [...ids, "hatcake", ...Array.from({ length: N }, (_, i) => `cup${i}`)], t);
  return t;
}

/** Chapter 8: his very own rain cloud. The cloud follows him everywhere; the rain falls only on him. */
export function chapterCloud(d, t) {
  const ids = ["c_house1", "c_house2", "c_lamp1", "c_lamp2", "c_tree"];
  d.add({ id: "c_house1", kind: "prop", model: "house", at: [-3.2, 0, -3.2], size: 2.2, hidden: true });
  d.add({ id: "c_house2", kind: "prop", model: "house", at: [3.4, 0, -3.6], size: 2.4, rotation: [0, -10, 0], hidden: true });
  d.add({ id: "c_lamp1", kind: "prop", model: "street_lamp", at: [-1.9, 0, -1.4], hidden: true });
  d.add({ id: "c_lamp2", kind: "prop", model: "street_lamp", at: [2.1, 0, -1.4], hidden: true });
  d.add({ id: "c_tree", kind: "prop", model: "tree", at: [0.4, 0, -3.4], size: 2.2, hidden: true });
  d.add({ id: "raincloud", kind: "prop", model: "rain_cloud", at: [-4, 2.2, 0.4], size: 0.85, hidden: true });
  d.add({ id: "rain", kind: "weather", type: "rain", parent: "raincloud", at: [0, -2.2, 0], count: 90, area: [0.8, 0.5], height: 1.9, hidden: true });
  d.add({ id: "brolly", kind: "prop", model: "umbrella", parent: ID, at: [0.12, 0.62, 0.05], size: 0.85, hidden: true });
  d.add({ id: "rainbow", kind: "prop", model: "rainbow", at: [0, 0.2, -2.6], size: 2.2, hidden: true });
  d.add({ id: "csun", kind: "prop", model: "sun", at: [-2.6, 3.6, -3], size: 1.1, hidden: true });
  t = card(d, "Chapter Fourteen\n\nHis Very Own Cloud", t, 4.5, { music: "sad" });
  d.changeStage("town", { at: t - 0.6, dur: 0.1 });
  appear(d, ids, t - 0.5);
  place(d, t - 0.5, [-1.2, 0, 0.4], 90);
  cam(d, t - 0.5, [0, 1.25, 4.8], [0, 0.95, 0], 40);
  // A sunny stroll... and a small grey cloud sneaks up over him.
  t = waddle(d, t, [-0.3, 0, 0.4], { steps: 3, face: 90 });
  d.turn(ID, { at: t, to: [0, 0, 0], dur: 0.3 });
  appear(d, ["raincloud"], t);
  d.move("raincloud", { at: t, to: [-0.3, 2.2, 0.4], dur: 1.6, ease: "quadOut" });
  t = twirl(d, t + 0.3, 2, 0.8) + 0.6;
  appear(d, ["rain"], t);
  d.sound("rain", { at: t, volume: 0.6 });
  exclaim(d, "Hey! Rain!", t + 0.5);
  d.feel(ID, { at: t + 0.2, feeling: "surprised", dur: 0.15 });
  d.tween(ID, "gaze", [0, 1], { at: t + 0.3, dur: 0.25 });
  t += 1.4;
  d.feel(ID, { at: t, feeling: "sad" });
  d.set(ID, "gaze", null, t + 0.8);
  t += 1.4;
  // He steps to the right: the cloud follows. To the left: it follows. A quick dash: it catches up.
  const follow = (to, at, lag, dur) => d.move("raincloud", { at: at + lag, to: [to[0], 2.2, to[2]], dur, ease: "sineInOut" });
  d.turn(ID, { at: t, to: [0, 90, 0], dur: 0.2 });
  t = waddle(d, t + 0.2, [0.8, 0, 0.4], { steps: 3, face: 90 });
  follow([0.8, 0, 0.4], t - 0.9, 0.5, 0.9);
  d.turn(ID, { at: t + 0.4, to: [0, 0, 0], dur: 0.2 });
  d.tween(ID, "gaze", [0, 1], { at: t + 0.6, dur: 0.2 });
  d.set(ID, "gaze", null, t + 1.2);
  t += 1.6;
  d.turn(ID, { at: t, to: [0, -90, 0], dur: 0.2 });
  t = waddle(d, t + 0.2, [-0.8, 0, 0.4], { steps: 5, face: -90 });
  follow([-0.8, 0, 0.4], t - 1.4, 0.5, 1.2);
  d.turn(ID, { at: t + 0.4, to: [0, 0, 0], dur: 0.2 });
  d.feel(ID, { at: t + 0.4, feeling: "angry" });
  t += 1.6;
  d.turn(ID, { at: t, to: [0, 90, 0], dur: 0.15 });
  t = waddle(d, t + 0.15, [1.6, 0, 0.5], { steps: 8, step: 0.17, face: 90 });
  follow([1.6, 0, 0.5], t - 1.2, 0.6, 1);
  d.turn(ID, { at: t, to: [0, 0, 0], dur: 0.2 });
  d.feel(ID, { at: t, feeling: "happy" });
  d.sound("giggle", { at: t + 0.2, volume: 0.4 });
  d.feel(ID, { at: t + 1.2, feeling: "sad" });
  t += 2;
  // An umbrella! Pop! The rain stops... the cloud drifts aside and rains on him from the side. He tilts it. It moves again.
  appear(d, ["brolly"], t);
  d.pop("brolly", { at: t, dur: 0.4 });
  oneArm(d, t, 0.3, 1, [10, 0, 60], [50, 0, 30]);
  d.feel(ID, { at: t + 0.4, feeling: "joyful" });
  t += 1.4;
  d.move("raincloud", { at: t, to: [2.25, 2.0, 0.5], dur: 0.8 });
  d.feel(ID, { at: t + 0.8, feeling: "surprised", dur: 0.15 });
  d.tween("brolly", "rotation", [0, 0, -30], { at: t + 1.3, dur: 0.3 });
  d.feel(ID, { at: t + 1.3, feeling: "happy" });
  t += 2.2;
  d.move("raincloud", { at: t, to: [0.95, 2.0, 0.5], dur: 0.6 });
  d.tween("brolly", "rotation", [0, 0, 30], { at: t + 0.8, dur: 0.3 });
  t += 1.6;
  d.move("raincloud", { at: t, to: [1.6, 2.0, 1.1], dur: 0.6 });
  d.feel(ID, { at: t + 0.6, feeling: "angry" });
  d.tween("brolly", "rotation", [0, 0, 0], { at: t + 0.6, dur: 0.3 });
  t += 1.4;
  // He folds the umbrella and gives the cloud a big sad look. The cloud stops raining... and blushes pink.
  vanish(d, ["brolly"], t);
  d.sound("pop", { at: t, volume: 0.5 });
  oneArm(d, t, 0.3, 1, [0, 0, 0], [0, 0, 0]);
  d.move("raincloud", { at: t, to: [1.6, 2.0, 0.5], dur: 0.6 });
  d.feel(ID, { at: t + 0.4, feeling: "sad" });
  d.tween(ID, "gaze", [0, 1], { at: t + 0.4, dur: 0.3 });
  t += 2.2;
  d.hide("rain", { at: t, dur: 0.2 });
  d.paint("raincloud", { at: t + 0.4, color: "pink", dur: 0.8, from: "grey" });
  d.wiggle("raincloud", { at: t + 0.4, deg: 10, dur: 0.8 });
  d.sound("ooh", { at: t + 0.4, volume: 0.5 });
  t += 1.8;
  // The sun comes out, the cloud floats away, and a rainbow appears over him. He dances!
  d.chapter("rainbow", { at: t, music: "happy" });
  d.set(ID, "gaze", null, t);
  appear(d, ["csun"], t);
  d.move("csun", { at: t, to: [-2.6, 3.6, -3], dur: 0.01 });
  d.pop("csun", { at: t, dur: 0.6, sound: "sparkle" });
  d.move("raincloud", { at: t + 0.3, to: [6, 3.4, -1], dur: 2.2, ease: "quadIn" });
  appear(d, ["rainbow"], t + 0.8);
  d.pop("rainbow", { at: t + 0.8, dur: 0.8, sound: "magic_sparkle" });
  d.feel(ID, { at: t + 0.8, feeling: "joyful" });
  exclaim(d, "A rainbow!", t + 0.9);
  t += 1.6;
  for (let i = 0; i < 6; i++) {
    const s = i % 2 ? 1 : -1, at = t + i * 0.5;
    d.set(P("arm"), "liftSide", s, at).set(P("forearm"), "liftSide", s, at);
    pose(d, at, 0.25, [[P("arm"), "lift", [70, 0, 96 * s]], [P("forearm"), "lift", [45, 0, 40 * s]]], "quadOut");
    pose(d, at + 0.25, 0.25, [[P("arm"), "lift", [0, 0, 0]], [P("forearm"), "lift", [0, 0, 0]]]);
    d.tween(ID, "rotation", [0, 12 * s, 6 * s], { at, dur: 0.5 });
    d.hop(ID, { at: at + 0.05, height: 0.08, dur: 0.4 });
  }
  d.sound("crowd_cheer", { at: t, volume: 0.35 });
  t += 3;
  rest(d, t, 0.3, 0);
  t += 1;
  t = curtain(d, t);
  vanish(d, [...ids, "raincloud", "rain", "rainbow", "csun"], t);
  return t;
}

/** The finale: an evening street, a cupcake for the bee, a last hat tip, and off he waddles into the sunset. */
export function finale(d, t) {
  const ids = ["f_house1", "f_house2", "f_lamp1", "f_lamp2", "f_lamp3", "f_lamp4", "f_tree1", "f_tree2"];
  d.add({ id: "f_house1", kind: "prop", model: "house", at: [-3, 0, -4.2], size: 2.2, hidden: true });
  d.add({ id: "f_house2", kind: "prop", model: "house", at: [3, 0, -5.2], size: 2.4, rotation: [0, -10, 0], hidden: true });
  d.add({ id: "f_lamp1", kind: "prop", model: "street_lamp", at: [-1.3, 0, -0.6], hidden: true });
  d.add({ id: "f_lamp2", kind: "prop", model: "street_lamp", at: [1.3, 0, -0.6], hidden: true });
  d.add({ id: "f_lamp3", kind: "prop", model: "street_lamp", at: [-1.3, 0, -5], hidden: true });
  d.add({ id: "f_lamp4", kind: "prop", model: "street_lamp", at: [1.3, 0, -5], hidden: true });
  d.add({ id: "f_tree1", kind: "prop", model: "tree", at: [-2.6, 0, -8.5], size: 2.6, hidden: true });
  d.add({ id: "f_tree2", kind: "prop", model: "tree", at: [2.6, 0, -9], size: 2.4, hidden: true });
  d.add({ id: "fbee", kind: "critter", species: "bee", at: [3, 1.5, 0.6], size: 0.32, hidden: true });
  d.add({ id: "fcake", kind: "prop", model: "cupcake", parent: ID, part: "forearm", at: [0, -0.19, 0.08], size: 0.45, hidden: true });
  t = card(d, "And so, at the end\nof a very silly day...", t, 3.6, { music: "triumphant" });
  d.lights({ at: t - 0.6, dur: 0.1, rig: "evening", background: "dusk_sky" });
  appear(d, ids, t - 0.5);
  place(d, t - 0.5, [-0.2, 0, 0.6], 0);
  cam(d, t - 0.5, [0, 1.2, 4.6], [0, 0.8, -1], 38);
  // The bee buzzes back. DumpyDoo flinches... but it only wants to say sorry. He shares a cupcake.
  appear(d, ["fbee"], t);
  d.path("fbee", { at: t, dur: 1.6, points: [[3, 1.5, 0.6], [1.6, 1.3, 0.9], [0.6, 1.1, 0.8]], face: true });
  d.tween("fbee", "rotation", [0, -60, 0], { at: t + 1.6, dur: 0.3 });
  d.sound("buzz", { at: t, volume: 0.5 });
  d.feel(ID, { at: t + 0.8, feeling: "worried" });
  d.look(ID, { at: t + 0.8, to: "fbee", dur: 0.4 });
  t += 2.2;
  d.wiggle("fbee", { at: t, deg: 15, dur: 0.8 });
  d.feel(ID, { at: t + 0.6, feeling: "happy" });
  t += 1.4;
  appear(d, ["fcake"], t);
  d.pop("fcake", { at: t, dur: 0.4 });
  oneArm(d, t, 0.4, 1, [-60, 0, 10], [-20, 0, 0]);
  t += 0.9;
  d.reparent("fcake", { at: t + 0.4, parent: "fbee", to: [0, -0.5, 0.3], dur: 0.4 });
  d.move("fbee", { at: t, to: [0.45, 0.85, 0.85], dur: 0.4 });
  d.sound("pop", { at: t + 0.8, volume: 0.5 });
  t += 1.2;
  oneArm(d, t, 0.3, 1, [0, 0, 0], [0, 0, 0]);
  d.path("fbee", { at: t, dur: 1.8, points: [[0.45, 0.85, 0.85], [1, 1.6, 0.6], [0.2, 2, 0.2], [-1.5, 2.6, -1], [-4, 3, -2]] });
  d.sound("buzz", { at: t, volume: 0.4 });
  d.look(ID, { at: t, to: [0, 2.2, 0], dur: 0.6 });
  d.feel(ID, { at: t, feeling: "joyful" });
  t += 2;
  vanish(d, ["fbee", "fcake"], t);
  // One more for the audience: cane twirl, hat tip, heel click.
  d.look(ID, { at: t, to: "ahead", dur: 0.4 });
  d.feel(ID, { at: t + 0.4, feeling: "happy" });
  t = twirl(d, t + 0.5, 2, 0.9) + 0.2;
  t = tipHat(d, t) + 0.3;
  legs(d, t, 0.15, [0, 0, -25], [0, 0, 25]);
  d.hop(ID, { at: t, height: 0.3, dur: 0.5 });
  d.sound("clink", { at: t + 0.22, volume: 0.6 });
  legs(d, t + 0.35, 0.15, [0, 0, 0]);
  t += 1.2;
  // Then off down the road, away from us, getting smaller; one look back and a wave; on he goes. Iris closes.
  d.turn(ID, { at: t, to: [0, 180, 0], dur: 0.4 });
  t = waddle(d, t + 0.4, [-0.2, 0, -2.4], { steps: 10, face: 180 });
  d.turn(ID, { at: t, to: [0, 0, 0], dur: 0.4 });
  d.set(P("arm"), "liftSide", -1, t + 0.4).set(P("forearm"), "liftSide", -1, t + 0.4);
  pose(d, t + 0.4, 0.3, [[P("arm"), "lift", [70, 0, -96]], [P("forearm"), "lift", [45, 0, -40]]], "quadOut");
  for (let i = 0; i < 6; i++) d.tween(P("forearm"), "lift", [45, i % 2 ? 25 : -15, -40], { at: t + 0.7 + i * 0.22, dur: 0.22 });
  pose(d, t + 2.1, 0.3, [[P("arm"), "lift", [0, 0, 0]], [P("forearm"), "lift", [0, 0, 0]]]);
  d.feel(ID, { at: t + 0.4, feeling: "joyful" });
  exclaim(d, "Bye-bye, friends!", t + 0.5);
  t += 2.6;
  d.turn(ID, { at: t, to: [0, 180, 0], dur: 0.4 });
  t = waddle(d, t + 0.4, [-0.2, 0, -6.5], { steps: 14, face: 180 });
  t += 0.6;
  return t;
}
