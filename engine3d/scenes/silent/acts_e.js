// DumpyDoo's silent movie, part E: bubble trouble (a bath with a slippery soap and a cheeky duck) and forty
// winks (a nap in the farmyard that the sheep keep jumping over).

import { ID, HAT, pose, arms, oneArm, legs, rest, waddle, tipHat, squash, sit, shrug, card, appear, vanish, place, cam, curtain, speak, exclaim, VOICE } from "./kit.js";

const P = (part) => `${ID}#${part}`;

/** Chapter: bubble trouble. He takes a bath with his hat on; the soap will not stay in his glove. */
export function chapterBath(d, t, title, music = "playful") {
  d.add({ id: "tub", kind: "prop", model: "bathtub", at: [0, 0, 0], hidden: true });
  d.add({ id: "bsoap", kind: "prop", model: "soap", parent: ID, part: "forearm", at: [0, -0.17, 0.06], size: 0.55, hidden: true });
  d.add({ id: "fsoap", kind: "prop", model: "soap", at: [0, 0, 0], size: 0.55, hidden: true });
  d.add({ id: "bduck", kind: "critter", species: "duck", at: [0.5, 0.42, 0.1], size: 0.4, hidden: true });
  d.add({ id: "suds", kind: "bubbles", at: [0, 0.6, 0], count: 26, area: [1.6, 0.7], height: 2.4, size: 0.22, hidden: true });
  d.add({ id: "suds2", kind: "bubbles", at: [0, 0.6, 0], count: 40, area: [1.8, 0.8], height: 3, size: 0.3, hidden: true });
  d.add({ id: "bshelf", kind: "prop", model: "shelf", at: [-2.4, 0, -1.8], hidden: true });
  d.add({ id: "bsink", kind: "prop", model: "sink", at: [2.3, 0, -1.6], hidden: true });
  const ids = ["tub", "bshelf", "bsink"];
  t = card(d, title, t, 4.5, { music });
  d.changeStage("playroom", { at: t - 0.6, dur: 0.1 });
  appear(d, ids, t - 0.5);
  vanish(d, ["cane"], t - 0.5);
  place(d, t - 0.5, [-2.4, 0, 0.75], 90);
  cam(d, t - 0.5, [0, 1.7, 4.4], [0, 0.6, 0], 40);
  // Bath time! He waddles up, keeps his hat on (of course) and hops in. Splash!
  t = waddle(d, t, [-0.9, 0, 0.75], { steps: 5, face: 90 });
  d.turn(ID, { at: t, to: [0, 0, 0], dur: 0.3 });
  d.feel(ID, { at: t + 0.3, feeling: "joyful" });
  t += 0.8;
  d.path(ID, { at: t, dur: 0.7, points: [[-0.9, 0, 0.75], [-0.5, 1, 0.3], [-0.2, -0.12, 0]] });
  d.sound("splash", { at: t + 0.7 });
  d.burst("suds", { at: t + 0.7, dur: 5 });
  // In the tub his arms rest on the rim (hands up out of the water, not through the sides).
  arms(d, t + 0.7, 0.3, [-25, 0, 70], [-40, 0, 40]);
  t += 1.5;
  // Soap in hand: a little scrub... squeak! It shoots out of his glove, straight up, and lands on his hat.
  appear(d, ["bsoap"], t);
  d.pop("bsoap", { at: t, dur: 0.3 });
  oneArm(d, t, 0.3, 1, [-50, 0, 20], [-40, 0, 0]);
  d.feel(ID, { at: t, feeling: "happy" });
  for (let i = 0; i < 4; i++) d.tween(P("forearm"), "lift", [-40, i % 2 ? 30 : -30, 0], { at: t + 0.4 + i * 0.25, dur: 0.25 });
  d.sound("squeak", { at: t + 0.6, volume: 0.4 });
  t += 1.6;
  vanish(d, ["bsoap"], t);
  appear(d, ["fsoap"], t);
  d.path("fsoap", { at: t, dur: 0.9, points: [[0.05, 0.62, 0.3], [0.1, 2.2, 0.2], [-0.2, 1.42, 0]] });
  d.tween("fsoap", "rotation", [0, 540, 180], { at: t, dur: 0.9 });
  d.set("fsoap", "rotation", [0, 0, 0], t + 0.9);
  d.sound("squeak", { at: t });
  d.sound("slide_whistle", { at: t + 0.1, volume: 0.4 });
  d.feel(ID, { at: t, feeling: "surprised", dur: 0.1 });
  d.look(ID, { at: t, to: [0, 2.4, 0.4], dur: 0.3 });
  oneArm(d, t + 0.2, 0.3, 1, [0, 0, 0], [0, 0, 0]);
  t += 1;
  d.look(ID, { at: t, to: "ahead", dur: 0.3 });
  d.tween(ID, "gaze", [0, 1], { at: t + 0.3, dur: 0.2 });
  d.feel(ID, { at: t + 0.4, feeling: "worried" });
  t += 1.4;
  // He tips his head to look: the soap slides off the back of his hat and plops into the water.
  d.tween(P("head"), "rotation", [-20, 0, 0], { at: t, dur: 0.3 });
  d.path("fsoap", { at: t + 0.2, dur: 0.6, points: [[-0.2, 1.42, 0], [-0.25, 1.3, -0.35], [-0.3, 0.45, -0.4]] });
  d.sound("splash", { at: t + 0.8, volume: 0.6 });
  vanish(d, ["fsoap"], t + 0.85);
  d.tween(P("head"), "rotation", [0, 0, 0], { at: t + 0.6, dur: 0.3 });
  d.set(ID, "gaze", null, t + 0.6);
  t += 1.4;
  // He feels around under the water for it... and up pops a rubber duck, holding the soap!
  d.feel(ID, { at: t, feeling: "worried" });
  arms(d, t, 0.3, [-50, 0, 20], [-20, 0, 0]);
  d.tween(ID, "rotation", [20, 0, 0], { at: t, dur: 0.3 });
  for (let i = 0; i < 4; i++) d.tween(ID, "rotation", [20, i % 2 ? 20 : -20, 0], { at: t + 0.3 + i * 0.35, dur: 0.35 });
  d.sound("pour", { at: t + 0.3, volume: 0.3 });
  t += 1.8;
  d.tween(ID, "rotation", [0, 0, 0], { at: t, dur: 0.3 });
  arms(d, t, 0.3, [-25, 0, 70], [-40, 0, 40]);
  appear(d, ["bduck"], t + 0.3);
  d.pop("bduck", { at: t + 0.3, dur: 0.5, sound: "squeak" });
  exclaim(d, "A duck!", t + 0.8);
  d.set("bduck", "rotation", [0, -40, 0], t + 0.3);
  d.add({ id: "dsoap", kind: "prop", model: "soap", parent: "bduck", part: "head", at: [0, -0.1, 0.45], size: 0.9, hidden: true });
  appear(d, ["dsoap"], t + 0.3);
  d.look(ID, { at: t + 0.5, to: "bduck", dur: 0.3 });
  d.feel(ID, { at: t + 0.6, feeling: "surprised", dur: 0.1 });
  d.hop(ID, { at: t + 0.6, height: 0.1, dur: 0.3 });
  t += 1.6;
  // The duck paddles off round the tub with it; he chases it round and round (in a very small bathtub).
  d.feel(ID, { at: t, feeling: "angry" });
  const lap = [[0.5, 0.42, 0.1], [0.55, 0.42, 0.3], [0, 0.42, 0.35], [-0.55, 0.42, 0.25], [-0.6, 0.42, -0.15], [0, 0.42, -0.3], [0.55, 0.42, -0.15], [0.5, 0.42, 0.1]];
  d.path("bduck", { at: t, dur: 3.2, points: [...lap, ...lap.slice(1)], face: true });
  for (let i = 0; i < 8; i++) d.tween(ID, "rotation", [0, 90 + i * 90, 0], { at: t + i * 0.4, dur: 0.4, ease: "linear" });
  d.set(ID, "rotation", [0, 0, 0], t + 3.2);
  d.sound("squeak", { at: t + 0.8, volume: 0.4 });
  d.sound("squeak", { at: t + 2, volume: 0.4 });
  d.sound("giggle", { at: t + 1.6, volume: 0.6 });
  t += 3.4;
  // Dizzy, he flops back. The duck hops up onto his hat, sets the soap down beside him and gives a squeak. Friends.
  d.look(ID, { at: t, to: "ahead", dur: 0.3 });
  d.feel(ID, { at: t, feeling: "worried" });
  d.tween(ID, "rotation", [-15, 0, 0], { at: t, dur: 0.4 });
  d.reparent("bduck", { at: t + 0.4, parent: ID, part: "head", to: [0, 0.92, 0], rotation: [0, 0, 0], dur: 0.5 });
  d.sound("boing", { at: t + 0.9, volume: 0.5 });
  t += 1.4;
  d.tween(ID, "gaze", [0, 1], { at: t, dur: 0.2 });
  d.wiggle("bduck", { at: t + 0.3, deg: 15, dur: 0.6 });
  d.sound("squeak", { at: t + 0.4 });
  d.feel(ID, { at: t + 0.6, feeling: "joyful" });
  t += 1.4;
  d.set(ID, "gaze", null, t);
  d.tween(ID, "rotation", [0, 0, 0], { at: t, dur: 0.3 });
  d.burst("suds2", { at: t, dur: 4 });
  d.sound("giggle", { at: t + 0.2 });
  arms(d, t, 0.3, [70, 0, 96], [45, 0, 40], "quadOut");
  t += 2.6;
  arms(d, t, 0.3, [-25, 0, 70], [-40, 0, 40]);
  t += 0.6;
  t = curtain(d, t);
  arms(d, t, 0.01, [0, 0, 0]);
  vanish(d, [...ids, "bduck", "dsoap"], t);
  appear(d, ["cane"], t);
  return t;
}

/** Chapter: forty winks. A nap against a hay bale; the sheep jump over him, one... two... three... */
export function chapterNap(d, t, title, music = "lullaby") {
  d.add({ id: "nbale", kind: "prop", model: "hay_bale", at: [0, 0, -0.45], size: 1, hidden: true });
  d.add({ id: "nbale2", kind: "prop", model: "hay_bale", at: [-2.4, 0, -1.6], size: 1, rotation: [0, 20, 0], hidden: true });
  d.add({ id: "nfence0", kind: "prop", model: "fence", at: [1.8, 0, -1.3], recolor: { white: "wood" }, hidden: true });
  d.add({ id: "nfence1", kind: "prop", model: "fence", at: [2.8, 0, -1.3], recolor: { white: "wood" }, hidden: true });
  const flock = [0, 1, 2, 3, 4].map((i) => `sheep${i}`);
  flock.forEach((id) => d.add({ id, kind: "critter", species: "sheep", at: [-3.2, 0, 0.9], size: 0.55, hidden: true }));
  const ids = ["nbale", "nbale2", "nfence0", "nfence1"];
  t = card(d, title, t, 4.5, { music });
  d.changeStage("farm", { at: t - 0.6, dur: 0.1 });
  appear(d, ids, t - 0.5);
  place(d, t - 0.5, [-2.4, 0, 0.3], 90);
  cam(d, t - 0.5, [0, 1.3, 5], [0, 0.7, 0], 40);
  // A big yawn; he sits against the hay bale and pulls his hat down over his eyes. Zzz.
  t = waddle(d, t, [0, 0, 0.3], { steps: 7, face: 90 });
  d.turn(ID, { at: t, to: [0, 0, 0], dur: 0.3 });
  d.feel(ID, { at: t + 0.3, feeling: "sleepy" });
  arms(d, t + 0.3, 0.5, [10, 0, 120], [60, 0, 40]);
  d.sound("ooh", { at: t + 0.4, volume: 0.4 });
  arms(d, t + 1.3, 0.4, [0, 0, 0]);
  t += 1.9;
  const BASE = [0, 0, 0.3];
  sit(d, t, { base: BASE });
  d.tween(ID, "rotation", [-10, 0, 0], { at: t, dur: 0.4 });
  d.tween("hat", "position", [0, HAT.at[1] - 0.12, 0.05], { at: t + 0.5, dur: 0.3 });
  d.sleep(ID, { at: t + 0.6, dur: 0.8 });
  t += 2;
  /** One sheep jumps over him, left to right, with a boing. */
  const jump = (id, at, dur = 1.1) => {
    appear(d, [id], at);
    d.set(id, "rotation", [0, 90, 0], at);
    d.path(id, { at, dur, points: [[-3.2, 0, 0.9], [-1.2, 0, 0.7], [0, 1.5, 0.45], [1.2, 0, 0.7], [3.4, 0, 0.9]] });
    d.sound("boing", { at: at + dur * 0.35, volume: 0.5 });
    vanish(d, [id], at + dur);
  };
  // Sheep one. He wakes, peeks under his hat... nobody there. Back to sleep.
  jump("sheep0", t);
  d.wake(ID, { at: t + 0.6, dur: 0.2 });
  d.tween("hat", "position", HAT.at, { at: t + 0.6, dur: 0.2 });
  d.feel(ID, { at: t + 0.6, feeling: "surprised", dur: 0.1 });
  d.tween(ID, "gaze", [-1, 0], { at: t + 1.2, dur: 0.15 });
  d.tween(ID, "gaze", [1, 0], { at: t + 1.7, dur: 0.15 });
  d.feel(ID, { at: t + 2.2, feeling: "sleepy" });
  d.set(ID, "gaze", null, t + 2.4);
  d.tween("hat", "position", [0, HAT.at[1] - 0.12, 0.05], { at: t + 2.6, dur: 0.3 });
  d.sleep(ID, { at: t + 2.7, dur: 0.6 });
  t += 4;
  // Sheep two: he sits bolt upright, hat flying up, and lands on his head again.
  jump("sheep1", t);
  d.wake(ID, { at: t + 0.5, dur: 0.1 });
  d.feel(ID, { at: t + 0.5, feeling: "angry", dur: 0.1 });
  d.tween("hat", "position", [0, HAT.at[1] + 0.3, 0], { at: t + 0.5, dur: 0.2, ease: "quadOut" });
  d.tween("hat", "position", HAT.at, { at: t + 0.7, dur: 0.3, ease: "bounceOut" });
  d.hop(ID, { at: t + 0.5, height: 0.15, dur: 0.3 });
  t += 1.6;
  t = speak(d, "Counting sheep is meant to help me sleep!", t);
  // So he counts them. One... two... three... sleepier with every sheep.
  const counts = ["One...", "Two...", "Three..."];
  for (let i = 0; i < 3; i++) {
    const at = t + i * 1.7;
    jump(`sheep${2 + i}`, at, 1.4);
    d.say(counts[i], { at: at + 0.4, who: ID, voice: VOICE.voice, pitch: VOICE.dumpy });
    d.caption(counts[i], { at: at + 0.4, dur: 1.2, style: "label" });
    d.nod(ID, { at: at + 0.5, deg: 10 + i * 4, dur: 0.5 });
    d.tween(ID, "eyes", 0.7 - i * 0.25, { at: at + 0.6, dur: 0.5 });
  }
  d.feel(ID, { at: t, feeling: "sleepy" });
  t += 5.2;
  d.sleep(ID, { at: t, dur: 0.5 });
  d.sound("ooh", { at: t, volume: 0.3 });
  d.caption("Zzz...", { at: t + 0.6, dur: 2.4, style: "label" });
  t += 1.2;
  // The last sheep stops mid-jump, lands softly on his lap and falls asleep too. The others come back and snuggle in.
  appear(d, ["sheep4"], t);
  d.set("sheep4", "rotation", [0, 90, 0], t);
  d.path("sheep4", { at: t, dur: 1, points: [[-3.2, 0, 0.9], [-1.2, 0, 0.7], [0, 1.2, 0.5], [0.05, 0.42, 0.55]] });
  d.turn("sheep4", { at: t + 1, to: [0, 0, 0], dur: 0.3 });
  d.sleep("sheep4", { at: t + 1.3, dur: 0.5 });
  d.sound("squeak", { at: t + 1, volume: 0.3 });
  t += 1.8;
  [[-0.7, 0, 0.6], [0.7, 0, 0.6], [-0.45, 0, 1.05]].forEach((to, i) => {
    const id = `sheep${i}`;
    appear(d, [id], t + i * 0.4);
    d.set(id, "position", i === 1 ? [3.4, 0, 0.9] : [-3.2, 0, 0.9], t + i * 0.4).set(id, "rotation", [0, i === 1 ? -90 : 90, 0], t + i * 0.4);
    d.move(id, { at: t + i * 0.4, to, dur: 1.2 });
    d.turn(id, { at: t + i * 0.4 + 1.2, to: [0, 0, 0], dur: 0.3 });
    d.sleep(id, { at: t + i * 0.4 + 1.5, dur: 0.5 });
  });
  d.sound("giggle", { at: t + 2, volume: 0.4 });
  t += 3.6;
  d.lights({ at: t - 1.5, dur: 1.5, rig: "dusk" });
  t += 1;
  t = curtain(d, t, { feeling: "sleepy" });
  vanish(d, [...ids, ...flock], t);
  d.wake(ID, { at: t, dur: 0.05 });
  d.set("hat", "position", HAT.at, t);
  return t;
}

/**
 * Chapter: the magic hat. On a little stage he puts his hat upside down on a stool and taps it with a wand: a
 * bunny, then a chick, then (with a lot of squeezing) a whole piglet. Then the bunny takes the wand and taps HIM.
 */
export function chapterMagic(d, t, title, music = "mysterious") {
  const STOOL = [0.55, 0, 0.35];
  const TOP = 0.42; // the stool's top
  const IN_HAT = [STOOL[0], TOP + 0.33, STOOL[2]]; // where the animals come out
  d.add({ id: "stool", kind: "shape", shape: "cylinder", color: "red", at: STOOL, size: TOP, hidden: true });
  d.add({ id: "stooltop", kind: "shape", shape: "disc", color: "gold", material: "metal", at: [STOOL[0], TOP - 0.03, STOOL[2]], size: 0.48, hidden: true });
  d.add({ id: "wand", kind: "prop", model: "magic_wand", parent: ID, part: "forearm", at: [0, -0.15, 0.05], rotation: [-100, 0, 0], size: 0.5, hidden: true });
  d.add({ id: "spot", kind: "lamp", at: [0, 4.5, 2.5], aim: [0.2, 0, 0.3], angle: 30, intensity: 90, beam: true, hidden: true });
  d.add({ id: "mbunny", kind: "critter", species: "bunny", at: IN_HAT, size: 0.45, hidden: true });
  d.add({ id: "mchick", kind: "critter", species: "chick", at: IN_HAT, size: 0.4, hidden: true });
  d.add({ id: "mpig", kind: "critter", species: "pig", at: IN_HAT, size: 0.6, hidden: true });
  d.add({ id: "mconf", kind: "confetti", at: [0, 0, 0], count: 120, area: [4, 2], height: 3.5, hidden: true });
  const ids = ["stool", "stooltop"];
  t = card(d, title, t, 4.5, { music });
  d.changeStage("theatre", { at: t - 0.6, dur: 0.1 });
  appear(d, ids, t - 0.5);
  d.show("spot", { at: t - 0.5, dur: 0.1 });
  vanish(d, ["cane"], t - 0.5);
  place(d, t - 0.5, [-0.35, 0, 0.35], 0);
  cam(d, t - 0.5, [0, 1.25, 4.4], [0.1, 0.7, 0], 38);
  // A bow to the audience. Applause.
  d.sound("crowd_cheer", { at: t, volume: 0.4 });
  d.nod(ID, { at: t + 0.2, deg: 30, dur: 0.9 });
  t += 1.6;
  // He puts his hat upside down on the stool and shows us it is empty.
  d.reparent("hat", { at: t, parent: null, to: [STOOL[0], TOP + 0.36, STOOL[2]], rotation: [180, 0, 0], dur: 0.6 });
  oneArm(d, t, 0.3, 1, [-40, 0, 30], [-20, 0, 0]);
  oneArm(d, t + 0.6, 0.3, 1, [0, 0, 0], [0, 0, 0]);
  t += 1.2;
  d.tween("hat", "rotation", [140, 0, 0], { at: t, dur: 0.3 });
  d.tween("hat", "rotation", [180, 0, 0], { at: t + 0.8, dur: 0.3 });
  d.feel(ID, { at: t, feeling: "joyful" });
  t += 1.4;
  // The wand: tap, tap... sparkle! A bunny!
  appear(d, ["wand"], t);
  d.pop("wand", { at: t, dur: 0.3, sound: "sparkle" });
  const tap = (at) => {
    oneArm(d, at, 0.2, 1, [-70, 0, 40], [-50, 0, 0], "quadOut");
    oneArm(d, at + 0.2, 0.15, 1, [-50, 0, 40], [-30, 0, 0], "quadIn");
    oneArm(d, at + 0.35, 0.15, 1, [-70, 0, 40], [-50, 0, 0], "quadOut");
    oneArm(d, at + 0.5, 0.15, 1, [-50, 0, 40], [-30, 0, 0], "quadIn");
    d.sound("clink", { at: at + 0.35, volume: 0.4 });
    d.sound("clink", { at: at + 0.65, volume: 0.4 });
    d.sound("magic_sparkle", { at: at + 0.8 });
    oneArm(d, at + 0.9, 0.3, 1, [0, 0, 0], [0, 0, 0]);
    return at + 1;
  };
  /** An animal jumps out of the hat and lands at `to`. */
  const out = (id, at, to, wobble = 0) => {
    if (wobble) {
      d.wiggle("hat", { at, deg: 18, dur: wobble });
      d.sound("squeak", { at, volume: 0.4 });
      d.sound("squeak", { at: at + wobble / 2, volume: 0.5 });
      at += wobble;
    }
    appear(d, [id], at);
    d.pop(id, { at, dur: 0.4 });
    d.path(id, { at, dur: 0.7, points: [IN_HAT, [(IN_HAT[0] + to[0]) / 2, 1.5, (IN_HAT[2] + to[2]) / 2], to] });
    d.sound("boing", { at, volume: 0.5 });
    d.sound("crowd_cheer", { at: at + 0.8, volume: 0.3 });
    d.feel(ID, { at: at + 0.2, feeling: "surprised", dur: 0.1 });
    d.feel(ID, { at: at + 0.9, feeling: "joyful" });
    return at + 1.2;
  };
  exclaim(d, "Abracadabra!", t + 0.3);
  t = tap(t + 0.4);
  t = out("mbunny", t, [1.3, 0, 0.2]) + 0.6;
  // Again: a chick!
  t = tap(t);
  t = out("mchick", t, [1.0, 0, 0.75]) + 0.6;
  d.sound("giggle", { at: t - 0.4, volume: 0.5 });
  // Once more, with feeling... the hat shakes and shakes... and out squeezes a whole piglet!
  t = tap(t);
  t = out("mpig", t, [1.7, 0, 0.6], 1.6);
  d.hop(ID, { at: t - 1, height: 0.2, dur: 0.35 });
  d.tween(ID, "gaze", [-0.6, -0.3], { at: t, dur: 0.2 });
  d.tween(ID, "gaze", [0, 0], { at: t + 0.8, dur: 0.2 });
  d.set(ID, "gaze", null, t + 1.1);
  t += 1.4;
  t = speak(d, "How did that fit in there?", t);
  // The bunny hops over, takes the wand and taps DumpyDoo on the head. He shrinks to half his size! Tap: back again.
  d.move("mbunny", { at: t, to: [0.15, 0, 0.6], dur: 0.6 });
  for (let i = 0; i < 3; i++) d.hop("mbunny", { at: t + i * 0.2, height: 0.1, dur: 0.2 });
  vanish(d, ["wand"], t + 0.7);
  d.add({ id: "bwand", kind: "prop", model: "magic_wand", parent: "mbunny", at: [0.25, 0.5, 0.2], rotation: [0, 0, 40], size: 0.6, hidden: true });
  appear(d, ["bwand"], t + 0.7);
  d.turn(ID, { at: t + 0.7, to: [0, 40, 0], dur: 0.3 });
  d.feel(ID, { at: t + 0.8, feeling: "worried" });
  t += 1.4;
  d.wiggle("mbunny", { at: t, deg: -20, dur: 0.4 });
  d.sound("magic_sparkle", { at: t + 0.2 });
  d.tween(ID, "scale", [0.5, 0.5, 0.5], { at: t + 0.2, dur: 0.4, ease: "backOut" });
  d.feel(ID, { at: t + 0.3, feeling: "surprised", dur: 0.1 });
  d.sound("slide_whistle", { at: t + 0.2, volume: 0.4 });
  t += 1;
  d.feel(ID, { at: t, feeling: "sad" });
  d.sound("giggle", { at: t + 0.2 });
  d.hop(ID, { at: t + 0.4, height: 0.15, dur: 0.3 });
  d.hop(ID, { at: t + 0.8, height: 0.15, dur: 0.3 });
  t += 1.6;
  d.wiggle("mbunny", { at: t, deg: -20, dur: 0.4 });
  d.sound("magic_sparkle", { at: t + 0.2 });
  d.tween(ID, "scale", [1, 1, 1], { at: t + 0.2, dur: 0.5, ease: "elasticOut" });
  d.feel(ID, { at: t + 0.4, feeling: "joyful" });
  t += 1.2;
  // Hat back on; everybody bows together; confetti.
  d.turn(ID, { at: t, to: [0, 0, 0], dur: 0.3 });
  d.reparent("hat", { at: t, parent: ID, part: "head", to: HAT.at, rotation: [0, 0, 0], dur: 0.6 });
  t += 0.8;
  for (const id of [ID, "mbunny", "mchick", "mpig"]) d.nod(id, { at: t, deg: 30, dur: 0.9 });
  d.burst("mconf", { at: t, dur: 4, sound: "crowd_cheer" });
  t += 2.6;
  t = curtain(d, t);
  vanish(d, [...ids, "mbunny", "mchick", "mpig", "bwand"], t);
  d.hide("spot", { at: t, dur: 0.1 });
  appear(d, ["cane"], t);
  return t;
}
