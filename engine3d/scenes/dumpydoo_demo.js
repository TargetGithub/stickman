// DumpyDoo in motion (catalog/models/dumpydoo.json): the eyes glance around on their own, then follow a scripted
// gaze (left, right, up, down), lead a head look at a ball, the long arm waves hello, and the grin talks.
//   node engine3d/tools/render3d.mjs engine3d/scenes/dumpydoo_demo.js --res 720p --fps 30 --speech off --music off

export const meta = { seed: 12, stage: { preset: "studio", lights: "portrait", fog: [5, 11], background: "grey", floor: "grey" }, music: false };

/** Swing a part back and forth: n half-swings of dur seconds between a and b, then back to rest. */
function swing(d, target, prop, a, b, { at, n, dur, rest }) {
  for (let i = 0; i < n; i++) d.tween(target, prop, i % 2 ? b : a, { at: at + i * dur, dur, ease: "sineInOut" });
  d.tween(target, prop, rest, { at: at + n * dur, dur, ease: "sineInOut" });
  return at + (n + 1) * dur;
}

export default function dumpyDooDemo(d) {
  d.add({ id: "bao", kind: "critter", species: "dumpydoo", at: [0, 0, 0] });
  d.add({ id: "ball", kind: "prop", model: "basketball", at: [1.6, 0, 0.6], size: 0.5 });
  d.set("camera", "position", [0, 1.05, 2.9]).set("camera", "lookAt", [0, 0.68, 0]).set("camera", "fov", 32);

  // 0-3 s: idle, the eyes dart about on their own. 3-7 s: a scripted gaze (x + its left, y + up).
  let t = 3;
  for (const g of [[1, 0.2], [-1, 0.2], [0, 1], [0, -1], [0, 0]]) {
    d.tween("bao", "gaze", g, { at: t, dur: 0.18, ease: "quadOut" });
    t += 0.8;
  }
  // 7-9 s: look at the ball (its right, our left): the eyes get there first, the head follows.
  d.look("bao", { at: t, to: "ball", dur: 0.7 });
  t += 1.6;
  d.look("bao", { at: t, to: "ahead", dur: 0.5 });
  t += 0.6;
  // 9.5 s: wave hello with the long right arm (the mirrored copy).
  // The upper arm swings forward and out under the collar, the forearm bends up at the elbow, and the hand
  // waves above the collar and in front of it (a pose searched clear of the collar).
  d.set("bao#arm", "liftSide", -1, t).set("bao#forearm", "liftSide", -1, t);
  d.tween("bao#arm", "lift", [70, 0, -96], { at: t, dur: 0.4, ease: "quadOut" });
  d.tween("bao#forearm", "lift", [45, 0, -40], { at: t, dur: 0.4, ease: "quadOut" });
  t = swing(d, "bao#forearm", "lift", [45, -15, -40], [45, 25, -40], { at: t + 0.4, n: 6, dur: 0.22, rest: [45, 0, -40] });
  d.tween("bao#arm", "lift", [0, 0, 0], { at: t, dur: 0.4 }).tween("bao#forearm", "lift", [0, 0, 0], { at: t, dur: 0.4 });
  // Then a line: the grin shuts to a smile and opens with each syllable, and rests on the full grin after.
  t += 0.5;
  t += d.say("Hi! I'm DumpyDoo. Let's learn and play together!", { at: t, who: "bao" });
  d.end(t + 1.2);
}
