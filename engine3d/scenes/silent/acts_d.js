// DumpyDoo's silent movie, part D: four more gags: the paint bucket, the balloon ride, the hungry pup and the
// skateboard.

import { ID, HAT, pose, arms, oneArm, legs, rest, waddle, sneak, tipHat, twirl, squash, sit, dizzy, shrug, card, appear, vanish, place, cam, curtain, speak, exclaim } from "./kit.js";
import { stars } from "./acts_a.js";

const P = (part) => `${ID}#${part}`;

/** A sunny lawn with trees and bushes; returns the ids. */
function lawn(d, prefix) {
  const ids = [];
  const add = (o) => (d.add({ ...o, id: `${prefix}_${o.id}`, hidden: true }), ids.push(`${prefix}_${o.id}`));
  add({ id: "tree1", kind: "prop", model: "tree", at: [-3.4, 0, -3.6], size: 2.5 });
  add({ id: "tree2", kind: "prop", model: "tree", at: [3.6, 0, -3.9], size: 2.4 });
  add({ id: "bush1", kind: "prop", model: "bush", at: [-2.6, 0, -2], size: 1.1 });
  add({ id: "bush2", kind: "prop", model: "bush", at: [2.7, 0, -2.2], size: 1 });
  add({ id: "flower1", kind: "prop", model: "flower", at: [-1.8, 0, 1], size: 0.6, color: "pink" });
  add({ id: "flower2", kind: "prop", model: "flower", at: [2.1, 0, 1.2], size: 0.6, color: "purple" });
  return ids;
}

/** The paint bucket: painting a fence, a foot in the bucket, the bucket on his head, and a very yellow face. */
export function chapterPaint(d, t) {
  const set = lawn(d, "p");
  const fence = [0, 1, 2, 3].map((i) => `pfence${i}`);
  fence.forEach((id, i) => d.add({ id, kind: "prop", model: "fence", at: [-1.5 + i, 0, -0.6], hidden: true }));
  d.add({ id: "pbucket", kind: "prop", model: "bucket", at: [0.25, 0, 0.35], size: 0.8, recolor: { blue: "yellow" }, hidden: true });
  d.add({ id: "brush", kind: "prop", model: "paintbrush", parent: ID, part: "forearm", at: [0, -0.15, 0.05], rotation: [180, 0, 0], size: 0.45, recolor: { blue: "yellow" }, hidden: true });
  d.add({ id: "headbucket", kind: "prop", model: "bucket", parent: ID, part: "head", at: [0, 0.98, 0], rotation: [180, 0, 0], size: 1.5, recolor: { blue: "yellow" }, hidden: true });
  const ids = [...set, ...fence, "pbucket"];
  appear(d, ids, t);
  vanish(d, ["cane"], t);
  appear(d, ["brush"], t);
  place(d, t, [-1.5, 0, 0.1], 180);
  cam(d, t, [0, 1.2, 4.8], [0, 0.75, 0], 40);
  t = card(d, "Chapter Four\n\nWet Paint!", t, 4.5, { over: true, music: "happy" });
  // He paints the first fence section yellow, up and down, humming along.
  d.feel(ID, { at: t, feeling: "happy" });
  const paintSection = (id, at) => {
    for (let i = 0; i < 4; i++) {
      oneArm(d, at + i * 0.4, 0.2, 1, [-80, 0, 10], [-50, 0, 0], "sineInOut");
      oneArm(d, at + i * 0.4 + 0.2, 0.2, 1, [-40, 0, 10], [-20, 0, 0], "sineInOut");
      d.sound("pour", { at: at + i * 0.4, volume: 0.15 });
    }
    d.paint(id, { at, color: "yellow", from: "white", dur: 1.6 });
    return at + 1.7;
  };
  t = paintSection("pfence0", t) + 0.2;
  d.move(ID, { at: t, to: [-0.5, 0, 0.1], dur: 0.6 });
  t = paintSection("pfence1", t + 0.6) + 0.2;
  oneArm(d, t, 0.3, 1, [0, 0, 0], [0, 0, 0]);
  // He steps back to admire it... right into the bucket.
  d.turn(ID, { at: t, to: [0, 0, 0], dur: 0.3 });
  d.feel(ID, { at: t + 0.3, feeling: "joyful" });
  d.sound("ooh", { at: t + 0.3, volume: 0.5 });
  t += 1.4;
  d.turn(ID, { at: t, to: [0, 90, 0], dur: 0.3 });
  t = waddle(d, t + 0.3, [0.1, 0, 0.35], { steps: 2, face: 90 });
  vanish(d, ["pbucket"], t);
  d.add({ id: "footbucket", kind: "prop", model: "bucket", parent: ID, part: "leg_right", at: [0, -0.3, 0.04], size: 0.8, recolor: { blue: "yellow" }, hidden: true });
  appear(d, ["footbucket"], t);
  d.sound("clang", { at: t });
  d.feel(ID, { at: t, feeling: "surprised", dur: 0.1 });
  d.hop(ID, { at: t, height: 0.15, dur: 0.3 });
  t += 0.8;
  d.turn(ID, { at: t, to: [0, 0, 0], dur: 0.3 });
  d.tween(ID, "gaze", [0, -1], { at: t + 0.3, dur: 0.2 });
  d.feel(ID, { at: t + 0.4, feeling: "worried" });
  t += 1.4;
  d.set(ID, "gaze", null, t);
  // Clonk, clonk, clonk: he walks with a bucket on one foot.
  d.turn(ID, { at: t, to: [0, 90, 0], dur: 0.3 });
  d.move(ID, { at: t + 0.3, to: [1.3, 0, 0.35], dur: 2.4, ease: "linear" });
  for (let i = 0; i < 6; i++) {
    const at = t + 0.3 + i * 0.4;
    legs(d, at, 0.2, i % 2 ? [0, 0, 0] : [-10, 0, 0], i % 2 ? [-45, 0, 0] : [0, 0, 0], "quadOut");
    legs(d, at + 0.2, 0.2, [0, 0, 0], [0, 0, 0], "quadIn");
    d.tween(ID, "rotation", [0, 90, i % 2 ? 10 : -4], { at, dur: 0.4 });
    if (i % 2) d.sound("clang", { at: at + 0.35, volume: 0.6 });
  }
  t += 3;
  d.sound("giggle", { at: t - 1, volume: 0.6 });
  // He shakes his foot: the bucket flies up... and lands upside down on his head. Bong!
  d.turn(ID, { at: t, to: [0, 0, 0], dur: 0.3 });
  d.feel(ID, { at: t + 0.3, feeling: "angry" });
  for (let i = 0; i < 4; i++) legs(d, t + 0.3 + i * 0.15, 0.15, [0, 0, 0], i % 2 ? [-20, 0, -15] : [-50, 0, 15]);
  t += 1;
  legs(d, t, 0.2, [0, 0, 0]);
  vanish(d, ["footbucket"], t);
  d.add({ id: "flybucket", kind: "prop", model: "bucket", at: [1.2, 0.2, 0.4], size: 1.1, recolor: { blue: "yellow" }, hidden: true });
  appear(d, ["flybucket"], t);
  d.path("flybucket", { at: t, dur: 0.9, points: [[1.2, 0.2, 0.4], [1.4, 2.6, 0.4], [1.3, 1.6, 0.35]] });
  d.tween("flybucket", "rotation", [180, 0, 0], { at: t, dur: 0.9 });
  d.sound("whoosh", { at: t });
  d.look(ID, { at: t, to: [1.4, 3, 0.4], dur: 0.4 });
  t += 0.9;
  vanish(d, ["flybucket", "hat"], t);
  appear(d, ["headbucket"], t);
  d.sound("clang", { at: t });
  d.sound("bell", { at: t + 0.05, volume: 0.3 });
  squash(d, t, { dur: 0.5, k: 0.82, sound: null });
  d.look(ID, { at: t, to: "ahead", dur: 0.2 });
  d.feel(ID, { at: t, feeling: "surprised", dur: 0.1 });
  t += 0.9;
  // Blind, he wanders about with his arms out and bumps into the fence. Bonk.
  arms(d, t, 0.3, [-80, 0, 10], [-10, 0, 0]);
  d.turn(ID, { at: t, to: [0, 150, 0], dur: 0.4 });
  d.move(ID, { at: t + 0.4, to: [1.0, 0, -0.25], dur: 1.4, ease: "linear" });
  for (let i = 0; i < 4; i++) legs(d, t + 0.4 + i * 0.35, 0.35, i % 2 ? [-20, 0, 0] : [20, 0, 0], i % 2 ? [20, 0, 0] : [-20, 0, 0]);
  t += 1.8;
  d.sound("block", { at: t });
  d.wiggle("pfence2", { at: t, deg: 6, dur: 0.5 });
  d.move(ID, { at: t, to: [1.0, 0, 0], dur: 0.3, ease: "quadOut" });
  d.tween(ID, "rotation", [-15, 150, 0], { at: t, dur: 0.15 });
  d.tween(ID, "rotation", [0, 150, 0], { at: t + 0.15, dur: 0.3 });
  t += 0.8;
  d.turn(ID, { at: t, to: [0, 0, 0], dur: 0.5 });
  arms(d, t + 0.5, 0.3, [10, 0, 100], [80, 0, 60]);
  t += 1.2;
  // He pulls it off: pop! His face is all yellow. He blinks at us.
  vanish(d, ["headbucket"], t);
  appear(d, ["hat"], t);
  d.sound("pop", { at: t });
  d.paint(ID, { at: t, color: "yellow", from: "bao_dough", dur: 0.05 });
  arms(d, t, 0.3, [0, 0, 0]);
  d.feel(ID, { at: t + 0.1, feeling: "surprised", dur: 0.1 });
  t += 1;
  exclaim(d, "I'm all yellow!", t + 1.2);
  for (let i = 0; i < 2; i++) {
    d.sleep(ID, { at: t + i * 0.6, dur: 0.12 });
    d.wake(ID, { at: t + i * 0.6 + 0.15, dur: 0.12 });
  }
  d.sound("giggle", { at: t + 0.4 });
  t += 1.6;
  d.feel(ID, { at: t, feeling: "sad" });
  shrug(d, t + 0.2);
  t += 1.6;
  // A big shake like a wet puppy: the yellow flies off and he is his own colour again.
  d.feel(ID, { at: t, feeling: "joyful" });
  for (let i = 0; i < 6; i++) d.tween(ID, "rotation", [0, i % 2 ? 25 : -25, 0], { at: t + i * 0.12, dur: 0.12 });
  d.tween(ID, "rotation", [0, 0, 0], { at: t + 0.72, dur: 0.2 });
  d.paint(ID, { at: t + 0.2, color: "bao_dough", from: "bao_dough", dur: 0.5 });
  d.sound("whoosh", { at: t });
  d.sound("sparkle", { at: t + 0.6, volume: 0.6 });
  t += 1.4;
  d.feel(ID, { at: t, feeling: "happy" });
  t = tipHat(d, t) + 0.6;
  t = curtain(d, t);
  vanish(d, [...ids, "brush"], t);
  appear(d, ["cane"], t);
  return t;
}

/** The balloon ride: four balloons lift him off his feet; he pops them one by one to float back down. */
export function chapterBalloons(d, t) {
  const set = lawn(d, "l");
  const colors = ["red", "yellow", "blue", "green"];
  const tips = [[-0.16, 0.86, 0], [0.02, 0.98, 0.06], [0.18, 0.88, -0.02], [0.04, 0.76, -0.12]];
  d.add({ id: "bpost", kind: "prop", model: "street_lamp", at: [0.6, 0, -0.6], hidden: true });
  colors.forEach((c, i) => d.add({ id: `bal${i}`, kind: "prop", model: "balloon", at: [0.4 + tips[i][0], 0.35, -0.3], color: c, size: 0.9, hidden: true }));
  const ids = [...set, "bpost"];
  appear(d, [...ids, ...colors.map((_, i) => `bal${i}`)], t);
  place(d, t, [-1.75, 0, 0.4], 0);
  cam(d, t, [0, 1.4, 5.4], [0, 1.1, 0], 42);
  t = card(d, "Chapter Seven\n\nThe Balloon Ride", t, 4.5, { over: true, music: "calm" });
  // Balloons tied to the lamp post. He looks around... nobody watching... and takes them all.
  t = waddle(d, t, [0.05, 0, 0.3], { steps: 7, face: 90 });
  d.turn(ID, { at: t, to: [0, 0, 0], dur: 0.3 });
  d.tween(ID, "gaze", [1, 0], { at: t + 0.4, dur: 0.15 });
  d.tween(ID, "gaze", [-1, 0], { at: t + 0.9, dur: 0.15 });
  d.tween(ID, "gaze", [0, 0], { at: t + 1.4, dur: 0.15 });
  d.feel(ID, { at: t + 1.5, feeling: "joyful" });
  t += 1.8;
  d.set(ID, "gaze", null, t);
  oneArm(d, t, 0.3, 1, [-60, 0, 30], [-30, 0, 0]);
  // He gathers the strings; the balloons ride with him (on his body, by his raised left glove: on the forearm
  // they would hang upside down once the arm is up).
  colors.forEach((_, i) => d.reparent(`bal${i}`, { at: t + 0.3, parent: ID, to: [0.5 + tips[i][0] * 0.5, 0.82, 0.08 + tips[i][2]], rotation: [0, 0, tips[i][0] * -60], dur: 0.6 }));
  d.sound("squeak", { at: t + 0.4, volume: 0.4 });
  t += 1;
  oneArm(d, t, 0.6, 1, [10, 0, 140], [20, 0, 20]);
  d.feel(ID, { at: t, feeling: "happy" });
  t += 1;
  // Up... up... his toes leave the ground. He kicks his little legs.
  d.feel(ID, { at: t, feeling: "surprised", dur: 0.2 });
  exclaim(d, "Up, up, up!", t + 0.4);
  d.move(ID, { at: t, to: [0.4, 1.2, 0.3], dur: 3, ease: "quadInOut" });
  d.sound("slide_whistle", { at: t, volume: 0.4 });
  for (let i = 0; i < 8; i++) legs(d, t + 0.5 + i * 0.3, 0.3, i % 2 ? [-35, 0, 0] : [25, 0, 0], i % 2 ? [25, 0, 0] : [-35, 0, 0]);
  d.feel(ID, { at: t + 1, feeling: "worried" });
  d.camera({ at: t, dur: 3, position: [0.3, 1.9, 5.4], lookAt: [0.3, 1.6, 0] });
  t += 3.2;
  legs(d, t, 0.3, [0, 0, 0]);
  // A gentle drift to the right, past the lamp, his feet dangling.
  d.move(ID, { at: t, to: [1.4, 1.5, 0.3], dur: 2.2, ease: "sineInOut" });
  d.tween(ID, "rotation", [0, 0, -8], { at: t, dur: 1.1, ease: "sineInOut" });
  d.tween(ID, "rotation", [0, 0, 6], { at: t + 1.1, dur: 1.1, ease: "sineInOut" });
  d.sound("giggle", { at: t + 1, volume: 0.5 });
  t += 2.4;
  // An idea: he pops one balloon with his cane. Pop! Down a bit. Pop! Down a bit more.
  d.feel(ID, { at: t, feeling: "happy" });
  d.sound("ding", { at: t, volume: 0.4 });
  const pop = (i, at, to) => {
    d.wiggle("cane", { at: at - 0.2, deg: 40, dur: 0.3 });
    vanish(d, [`bal${i}`], at);
    d.sound("pop", { at });
    d.feel(ID, { at, feeling: "surprised", dur: 0.1 });
    d.move(ID, { at, to, dur: 0.5, ease: "bounceOut" });
    d.feel(ID, { at: at + 0.6, feeling: "happy" });
  };
  pop(0, t + 0.6, [1.4, 1.1, 0.3]);
  pop(2, t + 2, [1.4, 0.7, 0.3]);
  d.camera({ at: t + 2, dur: 1.4, position: [0.6, 1.4, 5.4], lookAt: [0.6, 1.1, 0] });
  t += 3.2;
  // One more... and down he comes, gently, to land on his feet. Ta-da! He lets the last one go.
  pop(3, t, [1.4, 0.4, 0.3]);
  d.move(ID, { at: t + 0.6, to: [1.4, 0, 0.3], dur: 1.6, ease: "sineInOut" });
  t += 2.4;
  squash(d, t, { dur: 0.4, k: 0.9, sound: "land" });
  d.feel(ID, { at: t + 0.2, feeling: "joyful" });
  exclaim(d, "Ta-da!", t + 0.2);
  d.sound("crowd_cheer", { at: t + 0.3, volume: 0.35 });
  t += 1;
  d.reparent("bal1", { at: t, parent: null });
  d.move("bal1", { at: t, to: [2.6, 4.5, -0.6], dur: 3, ease: "quadIn" });
  oneArm(d, t, 0.3, 1, [0, 0, 0], [0, 0, 0]);
  d.look(ID, { at: t, to: [2.4, 3.4, -0.4], dur: 0.8 });
  t += 1.4;
  // He waves it goodbye (with his right hand), then turns to us: a bow.
  d.set(P("arm"), "liftSide", -1, t).set(P("forearm"), "liftSide", -1, t);
  pose(d, t, 0.3, [[P("arm"), "lift", [70, 0, -96]], [P("forearm"), "lift", [45, 0, -40]]], "quadOut");
  for (let i = 0; i < 4; i++) d.tween(P("forearm"), "lift", [45, i % 2 ? 25 : -15, -40], { at: t + 0.3 + i * 0.22, dur: 0.22 });
  pose(d, t + 1.3, 0.3, [[P("arm"), "lift", [0, 0, 0]], [P("forearm"), "lift", [0, 0, 0]]]);
  t += 1.8;
  d.look(ID, { at: t, to: "ahead", dur: 0.4 });
  d.nod(ID, { at: t + 0.4, deg: 30, dur: 0.9 });
  t += 1.8;
  t = curtain(d, t);
  vanish(d, [...ids, "bal1"], t);
  return t;
}

/** The hungry pup: a picnic, a sneaky puppy, and a chase round and round a tree. */
export function chapterPup(d, t) {
  const set = lawn(d, "u");
  d.add({ id: "urug", kind: "prop", model: "rug", at: [-0.5, 0, 0.3], size: 1, hidden: true });
  d.add({ id: "ubasket", kind: "prop", model: "basket", at: [-1.1, 0, 0.25], size: 0.7, hidden: true });
  d.add({ id: "utree", kind: "prop", model: "tree", at: [1.5, 0, -0.9], size: 1.6, hidden: true });
  d.add({ id: "pup", kind: "critter", species: "dog", at: [3.6, 0, 0.6], size: 0.75, hidden: true });
  const sandwiches = [0, 1, 2].map((i) => `sand${i}`);
  sandwiches.forEach((id) => d.add({ id, kind: "prop", model: "sandwich", at: [-0.2, 0.01, 0.65], size: 0.5, hidden: true }));
  const ids = [...set, "urug", "ubasket", "utree"];
  d.changeStage("garden", { at: t, dur: 0.1 });
  appear(d, ids, t);
  place(d, t, [-1.75, 0, 0.3], 0);
  cam(d, t, [0.3, 1.25, 5.2], [0.3, 0.7, 0], 40);
  t = card(d, "Chapter Ten\n\nThe Hungry Pup", t, 4.5, { over: true, music: "bouncy" });
  // A picnic! He sits on the rug and sets out a sandwich.
  t = waddle(d, t, [-0.55, 0, 0.3], { steps: 6, face: 90 });
  d.turn(ID, { at: t, to: [0, 0, 0], dur: 0.3 });
  sit(d, t + 0.3, { base: [-0.55, 0, 0.3] });
  t += 1;
  appear(d, ["sand0"], t);
  d.pop("sand0", { at: t, dur: 0.4 });
  d.feel(ID, { at: t, feeling: "joyful" });
  d.sound("ooh", { at: t + 0.2, volume: 0.4 });
  t += 1.4;
  // A bird sings off to the left (ding, ding); he turns to look. The pup sneaks in, grabs the sandwich, and sneaks off.
  const steal = (sw, at, from) => {
    d.sound("ding", { at, volume: 0.35 });
    d.sound("ding", { at: at + 0.3, volume: 0.3 });
    d.look(ID, { at: at + 0.2, to: [-3, 1.5, 0.5], dur: 0.4 });
    d.feel(ID, { at: at + 0.3, feeling: "happy" });
    appear(d, ["pup"], at);
    d.set("pup", "position", from, at).set("pup", "rotation", [0, -90, 0], at);
    d.move("pup", { at: at + 0.2, to: [0.15, 0, 0.65], dur: 0.9, ease: "quadOut" });
    for (let i = 0; i < 4; i++) d.hop("pup", { at: at + 0.2 + i * 0.22, height: 0.05, dur: 0.22 });
    vanish(d, [sw], at + 1.2);
    d.sound("crack", { at: at + 1.2, volume: 0.3 });
    d.turn("pup", { at: at + 1.3, to: [0, 90, 0], dur: 0.2 });
    d.move("pup", { at: at + 1.5, to: from, dur: 0.7, ease: "quadIn" });
    d.wiggle("pup#tail", { at: at + 1.3, deg: 40, dur: 0.6 });
    d.look(ID, { at: at + 2.4, to: "ahead", dur: 0.3 });
    return at + 2.8;
  };
  t = steal("sand0", t, [3.6, 0, 0.6]);
  d.tween(ID, "gaze", [0, -1], { at: t, dur: 0.2 });
  d.feel(ID, { at: t + 0.2, feeling: "surprised", dur: 0.15 });
  d.hop(ID, { at: t + 0.2, height: 0.1, dur: 0.3 });
  t += 1;
  d.tween(ID, "gaze", [1, 0], { at: t, dur: 0.15 });
  d.tween(ID, "gaze", [-1, 0], { at: t + 0.5, dur: 0.15 });
  d.feel(ID, { at: t + 0.8, feeling: "worried" });
  t += 1.2;
  d.set(ID, "gaze", null, t);
  shrug(d, t);
  t += 1.4;
  // Another sandwich. The bird again. The pup again!
  appear(d, ["sand1"], t);
  d.pop("sand1", { at: t, dur: 0.4 });
  d.feel(ID, { at: t, feeling: "happy" });
  t += 1;
  t = steal("sand1", t, [3.6, 0, 0.6]);
  // This time he turns back just in time to see the pup's tail vanish behind the tree.
  d.look(ID, { at: t - 0.9, to: [1.8, 0.4, 0.3], dur: 0.2 });
  d.feel(ID, { at: t - 0.8, feeling: "angry" });
  d.sound("gasp", { at: t - 0.8, volume: 0.5 });
  t += 0.4;
  t = speak(d, "Hey! Come back here, you!", t);
  // The chase: round and round the tree. Then the pup turns about... and now it is chasing HIM.
  d.look(ID, { at: t, to: "ahead", dur: 0.01 });
  legs(d, t, 0.2, [0, 0, 0]);
  d.set(ID, "position", [-0.55, 0, 0.3], t);
  const C = [1.5, 0, -0.9], R = 1.25;
  const ring = (a0, turns, n) => Array.from({ length: n + 1 }, (_, i) => {
    const a = a0 + (i / n) * turns * Math.PI * 2;
    return [C[0] + Math.cos(a) * R, 0, C[2] + Math.sin(a) * R];
  });
  appear(d, ["pup"], t);
  d.set("pup", "position", [C[0] + R * Math.cos(-1), 0, C[2] + R * Math.sin(-1) + 0.1], t);
  d.feel(ID, { at: t, feeling: "angry" });
  d.path(ID, { at: t, dur: 1.2, points: [[-0.55, 0, 0.3], [0.4, 0, 0.6], [C[0] + R * Math.cos(1.6), 0, C[2] + R * Math.sin(1.6)]], face: true });
  t += 1.2;
  d.path(ID, { at: t, dur: 5, points: ring(1.6, 2, 32), face: true });
  d.path("pup", { at: t - 0.6, dur: 5.6, points: ring(-1, 2.1, 34), face: true });
  for (let i = 0; i < 16; i++) {
    const s = i % 2 ? 1 : -1;
    legs(d, t + i * 0.31, 0.31, [-35 * s, 0, 0], [35 * s, 0, 0]);
    d.hop(ID, { at: t + i * 0.31, height: 0.05, dur: 0.31 });
    d.hop("pup", { at: t + i * 0.31, height: 0.08, dur: 0.31 });
  }
  d.sound("bark_small", { at: t + 1, volume: 0.6 });
  d.sound("giggle", { at: t + 3, volume: 0.6 });
  t += 5;
  // The pup stops and turns. DumpyDoo, running, doesn't... and runs right into its nose. They both freeze.
  d.feel(ID, { at: t, feeling: "surprised", dur: 0.1 });
  d.feel("pup", { at: t, feeling: "surprised", dur: 0.1 });
  d.sound("boing", { at: t });
  t += 0.8;
  // Now the pup chases him, the other way round, barking. He runs and runs.
  d.feel(ID, { at: t, feeling: "worried" });
  d.feel("pup", { at: t, feeling: "joyful" });
  d.path(ID, { at: t, dur: 4, points: ring(1.6 + 4 * Math.PI, -1.6, 26), face: true });
  d.path("pup", { at: t + 0.3, dur: 4, points: ring(1.6 + 4 * Math.PI + 0.7, -1.6, 26), face: true });
  for (let i = 0; i < 13; i++) {
    const s = i % 2 ? 1 : -1;
    legs(d, t + i * 0.31, 0.31, [-35 * s, 0, 0], [35 * s, 0, 0]);
    d.hop(ID, { at: t + i * 0.31, height: 0.05, dur: 0.31 });
    d.hop("pup", { at: t + 0.3 + i * 0.31, height: 0.08, dur: 0.31 });
  }
  d.sound("bark_small", { at: t + 0.5, volume: 0.7 });
  d.sound("bark_small", { at: t + 1.6, volume: 0.7 });
  t += 4.3;
  // Puffed out, he plops down. The pup licks his face (a happy hop) and wags. Friends! He shares the last sandwich.
  legs(d, t, 0.2, [0, 0, 0]);
  const here = ring(1.6 + 4 * Math.PI, -1.6, 26).at(-1);
  d.tween(ID, "rotation", [0, 0, 0], { at: t, dur: 0.3 });
  sit(d, t, { base: here });
  d.feel(ID, { at: t + 0.3, feeling: "sleepy" });
  d.tween("pup", "rotation", [0, -90, 0], { at: t + 0.3, dur: 0.3 });
  t += 1.2;
  d.hop("pup", { at: t, height: 0.3, dur: 0.4 });
  d.feel(ID, { at: t + 0.3, feeling: "joyful" });
  exclaim(d, "Good puppy!", t + 0.4);
  d.wiggle("pup#tail", { at: t, deg: 40, dur: 1.5 });
  t += 1.4;
  appear(d, ["sand2"], t);
  d.set("sand2", "position", [here[0] + 0.45, 0.01, here[2] + 0.3], t);
  d.pop("sand2", { at: t, dur: 0.4 });
  t += 1.2;
  d.move("pup", { at: t, to: [here[0] + 0.65, 0, here[2] + 0.3], dur: 0.4 });
  d.tween("sand2", "scale", [0.5, 1, 1], { at: t + 0.6, dur: 0.2 });
  d.sound("crack", { at: t + 0.6, volume: 0.3 });
  d.wiggle("pup#tail", { at: t + 0.6, deg: 40, dur: 1.2 });
  t += 2;
  t = curtain(d, t);
  vanish(d, [...ids, "pup", "sand2"], t);
  return t;
}

/** The skateboard: it shoots out from under him; then he rides it, wobbling, over a ramp. */
export function chapterSkate(d, t) {
  const set = lawn(d, "z");
  d.add({ id: "board", kind: "prop", model: "skateboard", at: [-0.6, 0, 0.5], size: 0.9, hidden: true });
  d.add({ id: "ramp", kind: "shape", shape: "wedge", color: "wood", at: [1.3, 0, 0.5], rotation: [0, 180, 0], scale: [0.9, 0.3, 0.7], hidden: true });
  d.add({ id: "zcone1", kind: "shape", shape: "cone", color: "orange", at: [-2.2, 0, -0.4], size: 0.3, hidden: true });
  d.add({ id: "zcone2", kind: "shape", shape: "cone", color: "orange", at: [2.6, 0, -0.4], size: 0.3, hidden: true });
  const ids = [...set, "board", "zcone1", "zcone2"];
  d.changeStage("garden", { at: t, dur: 0.1 });
  appear(d, ids, t);
  d.set("ramp", "visible", true, t).set("ramp", "scale", [0.9, 0.3, 0.7], t);
  place(d, t, [-1.6, 0, 0.5], 90);
  cam(d, t, [0, 1.2, 5.2], [0, 0.7, 0], 40);
  t = card(d, "Chapter Thirteen\n\nThe Runaway Skateboard", t, 4.5, { over: true, music: "happy" });
  // He finds a skateboard. He puts one foot on it... it shoots out from under him! Down he sits. Bump.
  t = waddle(d, t, [-1.05, 0, 0.5], { steps: 2, face: 90 });
  d.feel(ID, { at: t, feeling: "joyful" });
  d.sound("ooh", { at: t, volume: 0.4 });
  t += 0.8;
  legs(d, t, 0.3, [0, 0, 0], [-40, 0, 0]);
  d.move(ID, { at: t, to: [-0.75, 0, 0.5], dur: 0.3 });
  t += 0.4;
  d.move("board", { at: t, to: [-2.8, 0, 0.5], dur: 0.6, ease: "quadOut" });
  d.tween("board#wheel", "rotation", [0, -720, 0], { at: t, dur: 0.6 });
  d.sound("whoosh", { at: t });
  d.feel(ID, { at: t, feeling: "surprised", dur: 0.1 });
  d.hop(ID, { at: t, height: 0.4, dur: 0.4 });
  legs(d, t, 0.2, [-60, 0, 0], [-80, 0, 0], "quadOut");
  t += 0.4;
  sit(d, t, { base: [-0.75, 0, 0.5], face: 90 });
  squash(d, t, { dur: 0.5, k: 0.75, sound: "land" });
  t = stars(d, t + 0.2, 1.4) + 0.2;
  d.feel(ID, { at: t, feeling: "angry" });
  d.sound("giggle", { at: t - 0.8, volume: 0.6 });
  // He fetches it, puts it down very carefully, steps on with both feet. Wobble... wobble... he's riding!
  legs(d, t, 0.3, [0, 0, 0]);
  d.tween(ID, "position", [-0.75, 0, 0.5], { at: t, dur: 0.3, ease: "backOut" });
  d.turn(ID, { at: t + 0.3, to: [0, -90, 0], dur: 0.3 });
  t = waddle(d, t + 0.6, [-2.3, 0, 0.5], { steps: 5, face: -90 });
  d.move("board", { at: t, to: [-2.3, 0, 0.5], dur: 0.3 });
  d.turn(ID, { at: t, to: [0, 90, 0], dur: 0.4 });
  t += 0.6;
  d.hop(ID, { at: t, height: 0.2, dur: 0.4 });
  d.move(ID, { at: t, to: [-2.3, 0.1, 0.5], dur: 0.4 });
  t += 0.6;
  d.feel(ID, { at: t, feeling: "worried" });
  arms(d, t, 0.3, [10, 0, 90], [20, 0, 10]);
  d.move("board", { at: t, to: [0.4, 0, 0.5], dur: 3.2, ease: "quadIn" });
  d.move(ID, { at: t, to: [0.4, 0.1, 0.5], dur: 3.2, ease: "quadIn" });
  d.tween("board#wheel", "rotation", [0, 2000, 0], { at: t, dur: 3.2, ease: "quadIn" });
  d.camera({ at: t, dur: 3.2, position: [0.2, 1.2, 5.2], lookAt: [0.2, 0.7, 0], ease: "quadIn" });
  for (let i = 0; i < 6; i++) {
    d.tween(ID, "rotation", [0, 90, i % 2 ? 12 : -12], { at: t + i * 0.5, dur: 0.5, ease: "sineInOut" });
    arms(d, t + i * 0.5, 0.5, i % 2 ? [-10, 0, 120] : [30, 0, 60], [30, 0, 10]);
  }
  d.sound("car_pass", { at: t, volume: 0.4 });
  t += 2.2;
  d.feel(ID, { at: t, feeling: "joyful" });
  t += 1;
  // Up the ramp and into the air: a spin... and he lands right back on the board. Ta-da!
  d.path("board", { at: t, dur: 1.2, points: [[0.4, 0, 0.5], [1.3, 0.3, 0.5], [1.9, 0.9, 0.5], [2.5, 0, 0.5]] });
  d.path(ID, { at: t, dur: 1.2, points: [[0.4, 0.1, 0.5], [1.3, 0.4, 0.5], [1.9, 1.1, 0.5], [2.5, 0.1, 0.5]] });
  d.spin(ID, { at: t + 0.2, turns: 1, dur: 0.9 });
  d.sound("slide_whistle", { at: t });
  exclaim(d, "Wheee!", t);
  d.sound("land", { at: t + 1.2 });
  t += 1.3;
  arms(d, t, 0.3, [70, 0, 96], [45, 0, 40], "quadOut");
  d.move("board", { at: t, to: [2.7, 0, 0.5], dur: 0.6, ease: "quadOut" });
  d.move(ID, { at: t, to: [2.7, 0.1, 0.5], dur: 0.6, ease: "quadOut" });
  d.turn(ID, { at: t + 0.3, to: [0, 0, 0], dur: 0.3 });
  d.sound("crowd_cheer", { at: t + 0.3, volume: 0.4 });
  d.camera({ at: t, dur: 1, position: [1.6, 1.2, 5], lookAt: [1.6, 0.7, 0] });
  t += 1.4;
  // Then the board rolls away on its own and leaves him standing on nothing. He looks down. He looks at us. Bump!
  d.move("board", { at: t, to: [4.5, 0, 0.6], dur: 1, ease: "quadIn" });
  d.tween("board#wheel", "rotation", [0, 3000, 0], { at: t, dur: 1 });
  d.tween(ID, "gaze", [0, -1], { at: t + 0.4, dur: 0.2 });
  d.feel(ID, { at: t + 0.6, feeling: "surprised" });
  exclaim(d, "Uh-oh!", t + 0.7);
  d.tween(ID, "gaze", [0, 0], { at: t + 1.4, dur: 0.2 });
  t += 2;
  arms(d, t, 0.2, [0, 0, 0]);
  sit(d, t, { base: [2.7, 0, 0.5], drop: 0.17 });
  squash(d, t + 0.2, { dur: 0.5, k: 0.75, sound: "land" });
  d.set(ID, "gaze", null, t + 0.4);
  d.sound("giggle", { at: t + 0.5 });
  t += 1.4;
  d.feel(ID, { at: t, feeling: "joyful" });
  t += 1.2;
  t = curtain(d, t);
  vanish(d, [...ids, "ramp"], t);
  return t;
}
