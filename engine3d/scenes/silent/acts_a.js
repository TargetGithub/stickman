// DumpyDoo's silent movie, part A: the opening, Chapter 1 (the runaway hat), Chapter 2 (the banana peel) and
// Chapter 3 (the door). Each chapter adds its own set (hidden), shows it during its title card, plays its gags
// and hides the set again; it returns the time it ends.

import { ID, HAT, CANE, pose, arms, oneArm, legs, rest, waddle, sneak, tipHat, twirl, squash, sit, dizzy, shrug, card, appear, vanish, place, cam, curtain, speak, exclaim, IRISES } from "./kit.js";

const P = (part) => `${ID}#${part}`;

/** The star and its cast: DumpyDoo with his bowler hat and cane, and the dizzy stars that circle his head. */
export function cast(d) {
  d.add({ id: ID, kind: "critter", species: "dumpydoo", at: [0, 0, 0] });
  d.add({ id: "hat", kind: "prop", model: "bowler_hat", parent: ID, part: "head", at: HAT.at, size: HAT.size });
  d.add({ id: "cane", kind: "prop", model: "cane", parent: ID, part: "forearm", at: CANE.at, size: CANE.size, pivot: CANE.pivot });
  d.add({ id: "stars", kind: "group", parent: ID, part: "head", at: [0, 0.98, 0], hidden: true });
  for (let i = 0; i < 3; i++) {
    const a = (i * 2 * Math.PI) / 3;
    d.add({ id: `star${i}`, kind: "shape", shape: "star", color: "gold", material: "glow", parent: "stars", at: [Math.cos(a) * 0.32, 0, Math.sin(a) * 0.32], size: 0.13 });
  }
}

/** Dizzy stars circle his head for dur seconds. */
export function stars(d, t, dur = 2) {
  appear(d, ["stars"], t);
  d.spin("stars", { at: t, turns: dur * 0.9, dur, ease: "linear" });
  d.sound("magic_sparkle", { at: t, volume: 0.4 });
  vanish(d, ["stars"], t + dur);
  return t + dur;
}

/** A street: houses, lamps and a fence behind the pavement. */
function street(d, prefix) {
  const ids = [];
  const add = (o) => (d.add({ ...o, id: `${prefix}_${o.id}`, hidden: true }), ids.push(`${prefix}_${o.id}`));
  add({ id: "house1", kind: "prop", model: "house", at: [-3.2, 0, -3.2], size: 2.2 });
  add({ id: "house2", kind: "prop", model: "house", at: [3.4, 0, -3.6], size: 2.4, rotation: [0, -10, 0] });
  add({ id: "lamp1", kind: "prop", model: "street_lamp", at: [-1.9, 0, -1.4] });
  add({ id: "lamp2", kind: "prop", model: "street_lamp", at: [2.1, 0, -1.4] });
  for (let i = 0; i < 6; i++) add({ id: `fence${i}`, kind: "prop", model: "fence", at: [-2.5 + i, 0, -2.2], size: 1 });
  add({ id: "tree", kind: "prop", model: "tree", at: [0.4, 0, -3.4], size: 2.2 });
  return ids;
}

/** Opening titles and the iris opening on DumpyDoo. Returns the end time. */
export function opening(d, t) {
  const set = street(d, "o");
  t = card(d, "DumpyDoo Pictures\npresents", t, 3.5, { music: "happy" });
  t = card(d, "DumpyDoo\nin\nTHE SILLY DAY", t, 4.5);
  t = card(d, "A little bun with a big hat\nand a very bouncy day.", t, 4);
  IRISES.push({ at: t, dur: 1.4, to: 1 }); // the iris opens on the street
  appear(d, set, t - 0.5);
  place(d, t - 0.5, [-2.4, 0, 0.3], 90);
  cam(d, t - 0.5, [0, 1.15, 4.6], [0, 0.75, 0], 38);
  // In he waddles, stops, turns to us, twirls his cane and tips his hat.
  t = waddle(d, t, [-0.2, 0, 0.3], { steps: 8, face: 90 });
  d.turn(ID, { at: t, to: [0, 0, 0], dur: 0.35 });
  t += 0.5;
  t = twirl(d, t, 2, 0.9) + 0.2;
  t = tipHat(d, t) + 0.3;
  d.feel(ID, { at: t, feeling: "joyful" });
  exclaim(d, "Hello, everybody!", t);
  d.hop(ID, { at: t, height: 0.25, dur: 0.45, sound: "boing" });
  t += 0.9;
  d.feel(ID, { at: t, feeling: "happy" });
  // A little heel-click hop to the side and a bow.
  legs(d, t, 0.15, [0, 0, -25], [0, 0, 25]);
  d.hop(ID, { at: t, height: 0.3, dur: 0.5 });
  d.sound("clink", { at: t + 0.22, volume: 0.6 });
  legs(d, t + 0.35, 0.15, [0, 0, 0]);
  t += 0.8;
  d.nod(ID, { at: t, deg: 30, dur: 0.9 });
  t += 1.4;
  vanish(d, set, t);
  return t;
}

/** Chapter 1: the hat that would not stay. */
export function chapterHat(d, t) {
  const set = street(d, "h");
  d.add({ id: "leaves", kind: "weather", type: "leaves", count: 40, area: [9, 3], height: 3, speed: 2.2, hidden: true });
  t = card(d, "Chapter One\n\nThe Hat That Would Not Stay", t, 4.5, { music: "playful" });
  appear(d, set, t - 0.5);
  place(d, t - 0.5, [-2.3, 0, 0.4], 90);
  cam(d, t - 0.5, [0, 1.15, 4.6], [0, 0.75, 0], 38);
  t = waddle(d, t, [-0.8, 0, 0.4], { steps: 5, face: 90 });
  d.turn(ID, { at: t, to: [0, 20, 0], dur: 0.3 });
  t = twirl(d, t + 0.3, 1, 0.6) + 0.3;

  // A gust! The hat flies off and lands on the pavement.
  d.show("leaves", { at: t, dur: 0.2 });
  d.sound("whoosh", { at: t });
  d.feel(ID, { at: t + 0.1, feeling: "surprised", dur: 0.15 });
  d.reparent("hat", { at: t + 0.1, parent: null });
  exclaim(d, "My hat!", t + 0.4);
  d.path("hat", { at: t + 0.15, dur: 1.4, points: [[-0.8, 1.15, 0.4], [-0.1, 1.6, 0.5], [0.5, 0.8, 0.5], [0.9, 0.02, 0.5]] });
  d.tween("hat", "rotation", [0, 300, 40], { at: t + 0.15, dur: 1.2 });
  d.tween("hat", "rotation", [0, 360, 0], { at: t + 1.35, dur: 0.25, ease: "bounceOut" });
  d.sound("ball_bounce", { at: t + 1.55, volume: 0.5 });
  arms(d, t + 0.1, 0.2, [-20, 0, 70], [20, 0, 30], "quadOut");
  d.tween(ID, "rotation", [0, 90, -10], { at: t + 0.1, dur: 0.3 });
  d.hide("leaves", { at: t + 2, dur: 0.2 });
  t += 2;
  arms(d, t, 0.3, [0, 0, 0]);
  d.look(ID, { at: t, to: [0.9, 0.1, 0.5], dur: 0.4 });
  d.tween(ID, "rotation", [0, 90, 0], { at: t, dur: 0.3 });
  d.feel(ID, { at: t + 0.4, feeling: "worried" });
  t += 1.1;

  // Try 1: he waddles over and bends for it; it hops away just in time.
  d.feel(ID, { at: t, feeling: "happy" });
  t = waddle(d, t, [0.45, 0, 0.45], { steps: 4, face: 90 });
  d.tween(ID, "rotation", [28, 90, 0], { at: t, dur: 0.35 }); // a bow forward to pick it up
  arms(d, t, 0.35, [-60, 0, 10], [-20, 0, 0]);
  d.path("hat", { at: t + 0.25, dur: 0.6, points: [[0.9, 0.02, 0.5], [1.25, 0.45, 0.5], [1.6, 0.02, 0.45]] });
  d.sound("boing", { at: t + 0.25, volume: 0.6 });
  t += 1;
  rest(d, t, 0.3, 90);
  d.look(ID, { at: t, to: [1.6, 0.1, 0.45], dur: 0.3 });
  d.feel(ID, { at: t, feeling: "surprised", dur: 0.15 });
  t += 0.9;

  // Try 2: a quicker grab; the hat hops right over his head and lands behind him.
  d.feel(ID, { at: t, feeling: "angry" });
  t = waddle(d, t, [1.15, 0, 0.45], { steps: 3, step: 0.22, face: 90 });
  d.tween(ID, "rotation", [28, 90, 0], { at: t, dur: 0.25 });
  arms(d, t, 0.25, [-60, 0, 10], [-20, 0, 0]);
  d.path("hat", { at: t + 0.15, dur: 0.9, points: [[1.6, 0.02, 0.45], [1.3, 1.7, 0.55], [0.6, 0.02, 0.6]] });
  d.tween("hat", "rotation", [0, 720, 0], { at: t + 0.15, dur: 0.9 });
  d.sound("slide_whistle", { at: t + 0.15, volume: 0.6 });
  d.look(ID, { at: t + 0.2, to: [1.3, 2, 0.6], dur: 0.3 });
  t += 1.2;
  rest(d, t, 0.25, 90);
  // He looks left, right... where is it?
  d.turn(ID, { at: t, to: [0, 0, 0], dur: 0.3 });
  d.tween(ID, "gaze", [1, 0], { at: t + 0.3, dur: 0.15 });
  d.tween(ID, "gaze", [-1, 0], { at: t + 0.9, dur: 0.15 });
  d.tween(ID, "gaze", [0, 0], { at: t + 1.5, dur: 0.15 });
  d.feel(ID, { at: t + 1.5, feeling: "worried" });
  shrug(d, t + 1.7);
  d.look(ID, { at: t + 3, to: [0.6, 0.1, 0.6], dur: 0.4 });
  d.turn(ID, { at: t + 3, to: [0, -90, 0], dur: 0.4 });
  d.feel(ID, { at: t + 3.2, feeling: "surprised", dur: 0.15 });
  d.set(ID, "gaze", null, t + 3);
  t += 4;

  // Try 3: the sneak, then the pounce. He lands flat on his tummy; the hat squirts into the sky.
  d.feel(ID, { at: t, feeling: "happy" });
  t = sneak(d, t, [0.95, 0, 0.5], { steps: 2, face: -90 }) + 0.3;
  d.tween(ID, "rotation", [0, -90, 0], { at: t, dur: 0.1 });
  d.feel(ID, { at: t, feeling: "joyful" });
  d.move(ID, { at: t, to: [0.6, 0, 0.6], dur: 0.5, ease: "quadOut" });
  d.hop(ID, { at: t, height: 0.35, dur: 0.5 });
  arms(d, t, 0.2, [-90, 0, 20], [0, 0, 0]);
  d.path("hat", { at: t + 0.4, dur: 0.6, points: [[0.6, 0.02, 0.6], [0.6, 2.6, 0.6], [0.6, 4, 0.6]] });
  d.sound("whoosh", { at: t + 0.4 });
  t += 0.5;
  squash(d, t, { dur: 0.9, k: 0.55, sound: "land" });
  d.feel(ID, { at: t, feeling: "worried", dur: 0.1 });
  t += 1.2;
  rest(d, t, 0.3, 0);
  d.turn(ID, { at: t, to: [0, 0, 0], dur: 0.3 });
  d.look(ID, { at: t + 0.4, to: [0.6, 3.5, 1], dur: 0.5 });
  d.feel(ID, { at: t + 0.4, feeling: "sad" });
  t += 2.2;
  // ...and back it comes, right onto his head. Ding!
  d.path("hat", { at: t, dur: 0.9, points: [[0.6, 4, 0.6], [0.6, 2, 0.6], [0.6, 1.14, 0.6]] });
  d.reparent("hat", { at: t + 0.9, parent: ID, part: "head", to: HAT.at, rotation: [0, 0, 0], dur: 0.1 });
  d.sound("ding", { at: t + 0.95 });
  squash(d, t + 0.9, { dur: 0.5, k: 0.85, sound: null });
  d.look(ID, { at: t + 1, to: "ahead", dur: 0.3 });
  d.feel(ID, { at: t + 1.2, feeling: "joyful" });
  exclaim(d, "Yay!", t + 1.3);
  t += 2.4;
  d.feel(ID, { at: t, feeling: "happy" });
  t = tipHat(d, t) + 0.4;

  // Another gust: he leans into the wind, his shoes skid backward, and he holds on to his hat with both hands.
  d.show("leaves", { at: t, dur: 0.2 });
  d.sound("whoosh", { at: t });
  d.feel(ID, { at: t, feeling: "worried" });
  d.tween(ID, "rotation", [0, 0, -18], { at: t, dur: 0.3 });
  arms(d, t, 0.3, [20, 0, 100], [80, 0, 60], "quadOut");
  d.move(ID, { at: t, to: [1.6, 0, 0.6], dur: 2.4, ease: "sineInOut" });
  for (let i = 0; i < 6; i++) legs(d, t + i * 0.4, 0.4, i % 2 ? [-20, 0, 0] : [20, 0, 0], i % 2 ? [20, 0, 0] : [-20, 0, 0]);
  d.tween("hat", "rotation", [0, 0, -15], { at: t + 0.4, dur: 0.4, ease: "wiggle" });
  d.hide("leaves", { at: t + 2.4, dur: 0.2 });
  t += 2.6;
  rest(d, t, 0.3, 0);
  d.feel(ID, { at: t + 0.3, feeling: "joyful" });
  d.hop(ID, { at: t + 0.3, height: 0.2, dur: 0.4 });
  d.sound("crowd_cheer", { at: t + 0.4, volume: 0.35 });
  t += 1.6;
  // Off he goes, very proud.
  d.turn(ID, { at: t, to: [0, 90, 0], dur: 0.3 });
  d.feel(ID, { at: t, feeling: "happy" });
  t = waddle(d, t + 0.3, [3.4, 0, 0.6], { steps: 6, face: 90 });
  vanish(d, set, t);
  return t;
}

/** Chapter 2: beware the banana. */
export function chapterBanana(d, t) {
  const set = street(d, "b");
  d.add({ id: "bin", kind: "prop", model: "bin", at: [1.9, 0, -0.3], hidden: true });
  d.add({ id: "banana", kind: "prop", model: "banana", parent: ID, part: "forearm", at: [0, -0.2, 0.1], rotation: [0, 0, 90], size: 0.5, hidden: true });
  d.add({ id: "peel", kind: "prop", model: "banana_peel", at: [0, 0, 0], size: 1.4, hidden: true });
  d.add({ id: "flower", kind: "prop", model: "flower", at: [-2.1, 0, 0.1], size: 0.9, hidden: true });
  t = card(d, "Chapter Two\n\nBeware the Banana!", t, 4.5, { music: "bouncy" });
  appear(d, [...set, "bin", "flower"], t - 0.5);
  vanish(d, ["cane"], t - 0.5);
  appear(d, ["banana"], t - 0.5);
  place(d, t - 0.5, [-0.4, 0, 0.4], 0);
  cam(d, t - 0.5, [0.2, 1.2, 5], [0.2, 0.75, 0], 40);

  // Lunch! Three big bites, the banana getting smaller each time.
  oneArm(d, t, 0.4, 1, [-75, 0, 20], [-60, 0, -35], "quadOut");
  for (let i = 0; i < 3; i++) {
    const at = t + 0.6 + i * 0.9;
    d.feel(ID, { at, feeling: "joyful", dur: 0.1 });
    d.feel(ID, { at: at + 0.3, feeling: "happy", dur: 0.1 });
    d.nod(ID, { at, deg: 12, dur: 0.35 });
    d.tween("banana", "scale", [1 - (i + 1) * 0.28, 1, 1], { at: at + 0.15, dur: 0.1 });
    d.sound("crack", { at: at + 0.15, volume: 0.4 });
  }
  t += 3.4;
  vanish(d, ["banana"], t);
  d.set("peel", "visible", true, t).set("peel", "position", [-0.25, 0.6, 0.55], t).set("peel", "scale", [1, 1, 1], t);
  d.feel(ID, { at: t, feeling: "joyful" });
  d.sound("giggle", { at: t, volume: 0.3 });
  t += 0.8;
  // Over his shoulder it goes, without a look.
  oneArm(d, t, 0.25, 1, [40, 0, 30], [30, 0, 0], "quadOut");
  d.path("peel", { at: t + 0.1, dur: 0.8, points: [[-0.25, 0.6, 0.55], [0.3, 1.5, 0.4], [0.75, 0, 0.5]] });
  d.tween("peel", "rotation", [0, 400, 0], { at: t + 0.1, dur: 0.8 });
  d.sound("whoosh", { at: t + 0.1, volume: 0.4 });
  d.sound("squeak", { at: t + 0.9, volume: 0.4 });
  t += 1.3;
  rest(d, t, 0.3, 0);
  // Off to smell the flower, very pleased with himself.
  d.turn(ID, { at: t, to: [0, -90, 0], dur: 0.3 });
  t = waddle(d, t + 0.3, [-1.8, 0, 0.4], { steps: 5, face: -90 });
  d.tween(ID, "rotation", [20, -90, 0], { at: t, dur: 0.4 });
  d.feel(ID, { at: t + 0.3, feeling: "joyful" });
  d.sound("ooh", { at: t + 0.4, volume: 0.5 });
  d.tween(ID, "rotation", [0, -90, 0], { at: t + 1.6, dur: 0.4 });
  t += 2.2;
  t = speak(d, "Oh! I left my lunch box by the bin!", t);
  cam(d, t - 0.1, [0.6, 1.2, 5], [0.6, 0.75, 0], 40);
  // Back he goes, walking backwards (he is still looking at the flower)... onto the peel!
  d.feel(ID, { at: t, feeling: "happy" });
  t = waddle(d, t, [0.62, 0, 0.5], { steps: 7, step: 0.28, face: -90 });
  d.sound("slide_whistle", { at: t });
  exclaim(d, "Whoa-oh!", t);
  d.feel(ID, { at: t, feeling: "surprised", dur: 0.1 });
  arms(d, t, 0.2, [20, 0, 110], [40, 0, 40], "quadOut");
  legs(d, t, 0.2, [-70, 0, 0], [-40, 0, 0], "quadOut");
  d.move(ID, { at: t, to: [1.7, 0, 0.6], dur: 1.1, ease: "quadOut" });
  d.move("peel", { at: t, to: [1.6, 0, 0.6], dur: 1.1, ease: "quadOut" });
  d.hop(ID, { at: t + 0.1, height: 0.6, dur: 0.9 });
  d.tween(ID, "rotation", [0, -90 + 720, 0], { at: t, dur: 0.9, ease: "quadOut" });
  d.set(ID, "rotation", [0, -90, 0], t + 0.9);
  t += 1;
  sit(d, t, { base: [1.7, 0, 0.6], drop: 0.17, face: 0 });
  squash(d, t, { dur: 0.6, k: 0.75, sound: "land" });
  t = stars(d, t + 0.3, 2.2);
  d.feel(ID, { at: t - 1.5, feeling: "worried" });
  d.sound("giggle", { at: t - 1, volume: 0.6 });
  // Up he gets, picks up the peel and puts it in the bin, like a good bun.
  d.feel(ID, { at: t, feeling: "angry" });
  legs(d, t, 0.3, [0, 0, 0]);
  d.tween(ID, "position", [1.7, 0, 0.6], { at: t, dur: 0.3, ease: "backOut" });
  t += 0.6;
  d.tween(ID, "rotation", [28, 0, 0], { at: t, dur: 0.3 });
  arms(d, t, 0.3, [-60, 0, 10], [-20, 0, 0]);
  d.path("peel", { at: t + 0.3, dur: 0.4, points: [[1.6, 0, 0.6], [1.75, 0.45, 0.75]] });
  t += 0.8;
  rest(d, t, 0.3, 0);
  d.turn(ID, { at: t, to: [0, 180, 0], dur: 0.4 });
  d.tween("bin#lid", "rotation", [-100, 0, 0], { at: t + 0.3, dur: 0.3, ease: "backOut" });
  d.sound("door_open", { at: t + 0.3, volume: 0.4 });
  d.path("peel", { at: t + 0.4, dur: 0.5, points: [[1.75, 0.45, 0.75], [1.85, 1.1, 0.2], [1.9, 0.5, -0.3]] });
  vanish(d, ["peel"], t + 0.9);
  d.tween("bin#lid", "rotation", [0, 0, 0], { at: t + 1, dur: 0.15, ease: "quadIn" });
  d.sound("clang", { at: t + 1.15, volume: 0.6 });
  t += 1.6;
  d.turn(ID, { at: t, to: [0, 0, 0], dur: 0.4 });
  d.feel(ID, { at: t + 0.3, feeling: "happy" });
  // Dusting off his gloves: done!
  for (let i = 0; i < 4; i++) arms(d, t + 0.4 + i * 0.18, 0.18, i % 2 ? [-40, 0, 0] : [-40, 0, -14], [-60, 0, i % 2 ? -50 : -30]);
  t += 1.3;
  rest(d, t, 0.3, 0);
  t = tipHat(d, t + 0.2) + 0.5;
  // The lid pops: the peel flies out and lands right on his hat.
  d.tween("bin#lid", "rotation", [-110, 0, 0], { at: t, dur: 0.15, ease: "quadOut" });
  d.sound("boing", { at: t });
  d.set("peel", "visible", true, t).set("peel", "scale", [1, 1, 1], t).set("peel", "position", [1.9, 0.6, -0.3], t);
  d.path("peel", { at: t, dur: 0.8, points: [[1.9, 0.6, -0.3], [1.8, 2.2, 0.2], [1.7, 1.37, 0.6]] });
  d.tween("peel", "rotation", [0, 360, 0], { at: t, dur: 0.8 });
  d.tween("bin#lid", "rotation", [0, 0, 0], { at: t + 0.6, dur: 0.2, ease: "bounceOut" });
  d.feel(ID, { at: t + 0.8, feeling: "surprised", dur: 0.1 });
  d.sound("squeak", { at: t + 0.8 });
  squash(d, t + 0.8, { dur: 0.4, k: 0.88, sound: null });
  d.move("peel", { at: t + 0.8, to: [1.7, 1.33, 0.6], dur: 0.4, ease: "bounceOut" });
  t += 1.6;
  d.tween(ID, "gaze", [0, 1], { at: t, dur: 0.3 });
  t += 1.2;
  d.set(ID, "gaze", null, t);
  d.feel(ID, { at: t, feeling: "sad" });
  shrug(d, t + 0.3);
  exclaim(d, "Silly peel!", t + 0.4);
  t += 2.2;
  d.feel(ID, { at: t, feeling: "joyful" });
  d.hop(ID, { at: t, height: 0.2, dur: 0.4 });
  d.move("peel", { at: t, to: [1.7, 1.53, 0.6], dur: 0.4, ease: "hop" });
  t += 1.4;
  t = curtain(d, t);
  vanish(d, [...set, "bin", "flower", "peel"], t);
  appear(d, ["cane"], t);
  return t;
}

/** Chapter 3: the door in the middle of nowhere. */
export function chapterDoor(d, t) {
  const ids = ["door", "dtree1", "dtree2", "dbush1", "dbush2", "dflower1", "dflower2"];
  d.add({ id: "door", kind: "prop", model: "door", at: [0, 0, -0.3], size: 0.85, hidden: true });
  d.add({ id: "dtree1", kind: "prop", model: "tree", at: [-3.4, 0, -3.5], size: 2.4, hidden: true });
  d.add({ id: "dtree2", kind: "prop", model: "tree", at: [3.2, 0, -4], size: 2.8, hidden: true });
  d.add({ id: "dbush1", kind: "prop", model: "bush", at: [-2.3, 0, -1.6], size: 1.1, hidden: true });
  d.add({ id: "dbush2", kind: "prop", model: "bush", at: [2.4, 0, -1.8], size: 1.2, hidden: true });
  d.add({ id: "dflower1", kind: "prop", model: "flower", at: [-1.3, 0, 0.9], size: 0.7, hidden: true });
  d.add({ id: "dflower2", kind: "prop", model: "flower", at: [1.5, 0, 1.1], size: 0.8, hidden: true });
  t = card(d, "Chapter Three\n\nThe Door to Nowhere", t, 4.5, { music: "tense" });
  d.changeStage("garden", { at: t - 0.6, dur: 0.1 });
  appear(d, ids, t - 0.5);
  place(d, t - 0.5, [-2.6, 0, 0.55], 90);
  cam(d, t - 0.5, [0.2, 1.2, 4.8], [0, 0.85, 0], 38);
  t = waddle(d, t, [-0.1, 0, 0.55], { steps: 8, face: 90 });
  // A door! He faces it and knocks: knock, knock, knock.
  d.turn(ID, { at: t, to: [0, 180, 0], dur: 0.4 });
  t += 0.6;
  for (let i = 0; i < 3; i++) {
    oneArm(d, t + i * 0.35, 0.17, -1, [-80, 0, -10], [-30, 0, 0], "quadOut");
    oneArm(d, t + i * 0.35 + 0.17, 0.17, -1, [-60, 0, -10], [-10, 0, 0], "quadIn");
    d.sound("block", { at: t + i * 0.35 + 0.17, volume: 0.8 });
  }
  t += 1.3;
  oneArm(d, t, 0.3, -1, [0, 0, 0], [0, 0, 0]);
  // Nobody comes. He turns to us and shrugs.
  d.turn(ID, { at: t + 1, to: [0, 0, 0], dur: 0.4 });
  d.feel(ID, { at: t + 1.2, feeling: "worried" });
  shrug(d, t + 1.5);
  t += 3;
  // He pushes. And pushes. Nothing.
  d.turn(ID, { at: t, to: [0, 180, 0], dur: 0.4 });
  d.feel(ID, { at: t + 0.4, feeling: "angry" });
  arms(d, t + 0.4, 0.3, [-85, 0, 10], [0, 0, 0]);
  d.tween(ID, "rotation", [-14, 180, 0], { at: t + 0.6, dur: 0.3 });
  for (let i = 0; i < 6; i++) {
    legs(d, t + 0.7 + i * 0.25, 0.25, i % 2 ? [30, 0, 0] : [-10, 0, 0], i % 2 ? [-10, 0, 0] : [30, 0, 0]);
    d.sound("squeak", { at: t + 0.7 + i * 0.25, volume: 0.25 });
  }
  d.tween(ID, "position", [-0.1, 0, 0.62], { at: t + 0.7, dur: 1.5, ease: "sineInOut" });
  t += 2.4;
  rest(d, t, 0.3, 180);
  d.tween(ID, "position", [-0.1, 0, 0.55], { at: t, dur: 0.3 });
  t += 0.6;
  // He pulls the knob... and the door swings open, right into him. Bonk!
  oneArm(d, t, 0.3, 1, [-80, 0, 0], [-10, 0, 0]);
  d.tween("door#door", "rotation", [0, -100, 0], { at: t + 0.5, dur: 0.3, ease: "quadIn" });
  d.sound("clang", { at: t + 0.75 });
  d.feel(ID, { at: t + 0.75, feeling: "surprised", dur: 0.1 });
  d.path(ID, { at: t + 0.75, dur: 0.6, points: [[-0.1, 0, 0.55], [0.6, 0.3, 0.95], [1.1, 0, 1.1]] });
  d.tween(ID, "rotation", [0, 180 + 360, 0], { at: t + 0.75, dur: 0.6, ease: "quadOut" });
  d.set(ID, "rotation", [0, 180, 0], t + 1.35);
  t += 1.4;
  oneArm(d, t, 0.2, 1, [0, 0, 0], [0, 0, 0]);
  t = stars(d, t, 1.8) - 1.8;
  exclaim(d, "Oopsie!", t);
  t = dizzy(d, t, 1.6, 0) + 0.2;
  d.sound("giggle", { at: t - 1, volume: 0.6 });
  // The door creaks shut by itself.
  d.tween("door#door", "rotation", [0, 0, 0], { at: t, dur: 1.2, ease: "sineInOut" });
  d.sound("door_open", { at: t, volume: 0.5 });
  d.look(ID, { at: t, to: "door", dur: 0.4 });
  d.feel(ID, { at: t + 0.4, feeling: "angry" });
  t += 1.8;
  // Hmm. He walks round the side to look behind it: nothing there at all!
  d.turn(ID, { at: t, to: [0, 180, 0], dur: 0.3 });
  d.look(ID, { at: t, to: "ahead", dur: 0.3 });
  d.feel(ID, { at: t, feeling: "happy" });
  t = waddle(d, t + 0.3, [1.1, 0, -1.2], { steps: 5, face: 180 });
  d.turn(ID, { at: t, to: [0, 270, 0], dur: 0.3 });
  t = waddle(d, t + 0.3, [0.2, 0, -1.2], { steps: 3, face: 270 });
  d.turn(ID, { at: t, to: [0, 360, 0], dur: 0.3 });
  d.set(ID, "rotation", [0, 0, 0], t + 0.3);
  d.feel(ID, { at: t + 0.3, feeling: "surprised", dur: 0.15 });
  d.hop(ID, { at: t + 0.3, height: 0.2, dur: 0.35 });
  d.sound("gasp", { at: t + 0.3, volume: 0.6 });
  t += 1.4;
  t = speak(d, "It's a door... to nowhere!", t);
  // Good manners all the same: he opens the door from behind, tips his hat and walks through to the front.
  d.feel(ID, { at: t, feeling: "happy" });
  d.tween("door#door", "rotation", [0, 90, 0], { at: t + 0.2, dur: 0.6 });
  d.sound("door_open", { at: t + 0.2, volume: 0.5 });
  t = tipHat(d, t + 0.8) + 0.2;
  t = waddle(d, t, [0.05, 0, 0.6], { steps: 6, face: 0 });
  d.tween("door#door", "rotation", [0, 0, 0], { at: t, dur: 0.25, ease: "quadIn" });
  d.sound("clang", { at: t + 0.25, volume: 0.5 });
  d.hop(ID, { at: t + 0.25, height: 0.12, dur: 0.3 });
  d.feel(ID, { at: t + 0.25, feeling: "surprised", dur: 0.1 });
  t += 1;
  d.feel(ID, { at: t, feeling: "joyful" });
  d.sound("crowd_cheer", { at: t, volume: 0.3 });
  t += 1;
  // Off he goes round the side... and the door swings out and nudges him on his way. Bonk!
  d.turn(ID, { at: t, to: [0, 90, 0], dur: 0.3 });
  d.feel(ID, { at: t, feeling: "happy" });
  t = waddle(d, t + 0.3, [0.9, 0, 0.6], { steps: 3, face: 90 });
  d.tween("door#door", "rotation", [0, -120, 0], { at: t - 0.2, dur: 0.35, ease: "quadIn" });
  d.sound("clang", { at: t + 0.1 });
  d.feel(ID, { at: t + 0.1, feeling: "surprised", dur: 0.1 });
  d.path(ID, { at: t + 0.1, dur: 0.7, points: [[0.9, 0, 0.6], [1.7, 0.6, 0.7], [2.5, 0, 0.8]] });
  d.tween(ID, "rotation", [0, 90, -30], { at: t + 0.1, dur: 0.3 });
  t += 0.8;
  squash(d, t, { dur: 0.5, k: 0.75, sound: "land" });
  d.tween(ID, "rotation", [0, 0, 0], { at: t, dur: 0.3 });
  d.tween("door#door", "rotation", [0, 0, 0], { at: t + 0.4, dur: 1, ease: "sineInOut" });
  d.sound("giggle", { at: t + 0.3, volume: 0.7 });
  d.feel(ID, { at: t + 0.6, feeling: "angry" });
  t += 1.6;
  shrug(d, t);
  d.feel(ID, { at: t + 0.3, feeling: "joyful" });
  t += 1.8;
  t = curtain(d, t);
  vanish(d, ids, t);
  return t;
}
