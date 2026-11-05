// DumpyDoo motion test (catalog/models/dumpydoo.json): one clip of everything he can do, each move captioned:
// hello wave, walk, hops, spin, dance, look around, eyes, feelings, tummy pat, talk, point, sleep and wake, goodbye.
//   node engine3d/tools/render3d.mjs engine3d/scenes/dumpydoo_motions.js --res 1080p --fps 30 --music off
// Arm poses: the upper arm is "#arm", the forearm "#forearm" (it hangs on the arm at the elbow); "rotation" moves
// both sides as mirror images, "lift" with liftSide moves one. Legs: "#leg_left", "#leg_right".

export const meta = { seed: 31, stage: { preset: "studio", lights: "portrait", fog: [6, 14], background: "grey", floor: "grey" }, music: false };

const ID = "dd";

/** Tween a list of [target, prop, value] together. */
function pose(d, t, dur, list, ease = "sineInOut") {
  for (const [target, prop, to] of list) d.tween(target, prop, to, { at: t, dur, ease });
}

/** Back to the rest pose: arms, forearms and legs. */
const REST = [[`${ID}#arm`, "rotation", [0, 0, 0]], [`${ID}#forearm`, "rotation", [0, 0, 0]], [`${ID}#leg_left`, "rotation", [0, 0, 0]], [`${ID}#leg_right`, "rotation", [0, 0, 0]]];

/** The elbow wave with the right hand (searched clear of the collar), n swings; returns when it is done. */
function wave(d, t, n = 6) {
  d.set(`${ID}#arm`, "liftSide", -1, t).set(`${ID}#forearm`, "liftSide", -1, t);
  pose(d, t, 0.35, [[`${ID}#arm`, "lift", [70, 0, -96]], [`${ID}#forearm`, "lift", [45, 0, -40]]], "quadOut");
  for (let i = 0; i < n; i++) d.tween(`${ID}#forearm`, "lift", [45, i % 2 ? 25 : -15, -40], { at: t + 0.35 + i * 0.22, dur: 0.22, ease: "sineInOut" });
  const end = t + 0.35 + n * 0.22;
  pose(d, end, 0.35, [[`${ID}#arm`, "lift", [0, 0, 0]], [`${ID}#forearm`, "lift", [0, 0, 0]]]);
  return end + 0.35;
}

/** A walk: legs and arms swing in turn while he glides and bobs; steps of 0.32 s. */
function walk(d, t, to, steps) {
  const dur = steps * 0.32;
  d.move(ID, { at: t, to, dur, ease: "linear" });
  for (let i = 0; i < steps; i++) {
    const s = i % 2 ? 1 : -1, at = t + i * 0.32;
    pose(d, at, 0.32, [
      [`${ID}#leg_left`, "rotation", [28 * s, 0, 0]], [`${ID}#leg_right`, "rotation", [-28 * s, 0, 0]],
      [`${ID}#arm`, "rotation", [-22 * s, 0, 4]], [`${ID}#forearm`, "rotation", [-10, 0, 0]],
    ]);
    d.hop(ID, { at, height: 0.035, dur: 0.32 });
  }
  pose(d, t + dur, 0.3, REST);
  return t + dur + 0.3;
}

export default function dumpyDooMotions(d) {
  d.add({ id: ID, kind: "critter", species: "dumpydoo", at: [0, 0, 0] });
  d.add({ id: "ball", kind: "prop", model: "basketball", at: [-0.95, 0, 0.7], size: 0.4, hidden: true });
  d.set("camera", "position", [0, 1.05, 2.9]).set("camera", "lookAt", [0, 0.66, 0]).set("camera", "fov", 34);
  const label = (text, at, dur) => d.caption(text, { at, dur, style: "subtitle" });
  let t = 0.6;

  // 1. Hello: a wave and a line.
  label("Hello wave", t, 3);
  d.say("Hi! I'm DumpyDoo!", { at: t + 0.2, who: ID });
  t = wave(d, t + 0.1) + 0.4;

  // 2. Walk to the side and back (turning to face where he goes).
  label("Walk", t, 6.4);
  d.turn(ID, { at: t, to: [0, 90, 0], dur: 0.35 });
  // The camera follows him out and back.
  d.camera({ at: t + 0.3, dur: 2.56, ease: "sineInOut", position: [0.7, 1.05, 3.1], lookAt: [0.7, 0.66, 0] });
  t = walk(d, t + 0.3, [1.1, 0, 0], 8);
  d.turn(ID, { at: t, to: [0, -90, 0], dur: 0.5 });
  d.camera({ at: t + 0.45, dur: 2.56, ease: "sineInOut", position: [0, 1.05, 2.9], lookAt: [0, 0.66, 0] });
  t = walk(d, t + 0.45, [0, 0, 0], 8);
  d.turn(ID, { at: t, to: [0, 0, 0], dur: 0.4 });
  t += 0.6;

  // 3. Three happy hops, arms up.
  label("Hop hop hop!", t, 2.6);
  d.feel(ID, { at: t, feeling: "joyful" });
  pose(d, t, 0.3, [[`${ID}#arm`, "rotation", [70, 0, 96]], [`${ID}#forearm`, "rotation", [45, 0, 40]]], "quadOut");
  for (let i = 0; i < 3; i++) d.hop(ID, { at: t + 0.35 + i * 0.6, height: 0.32, dur: 0.55, sound: i === 0 ? "boing" : undefined });
  t += 0.35 + 3 * 0.6;
  pose(d, t, 0.35, REST);
  t += 0.6;

  // 4. A spin with a wiggle.
  label("Spin!", t, 2.2);
  d.feel(ID, { at: t, feeling: "happy" });
  d.spin(ID, { at: t, turns: 1, dur: 1.2 });
  d.wiggle(ID, { at: t + 1.25, deg: 10, dur: 0.7 });
  t += 2.3;

  // 5. Dance: arms up in turn, a side-to-side sway and little steps.
  label("Dance", t, 4.6);
  d.feel(ID, { at: t, feeling: "joyful" });
  for (let i = 0; i < 8; i++) {
    const s = i % 2 ? 1 : -1, at = t + i * 0.5;
    d.set(`${ID}#arm`, "liftSide", s, at).set(`${ID}#forearm`, "liftSide", s, at);
    pose(d, at, 0.25, [[`${ID}#arm`, "lift", [70, 0, 96 * s]], [`${ID}#forearm`, "lift", [45, 0, 40 * s]]], "quadOut");
    pose(d, at + 0.25, 0.25, [[`${ID}#arm`, "lift", [0, 0, 0]], [`${ID}#forearm`, "lift", [0, 0, 0]]]);
    d.tween(ID, "rotation", [0, 12 * s, 6 * s], { at, dur: 0.5, ease: "sineInOut" });
    pose(d, at, 0.25, [[`${ID}#leg_left`, "rotation", [s > 0 ? -20 : 0, 0, 0]], [`${ID}#leg_right`, "rotation", [s < 0 ? -20 : 0, 0, 0]]]);
    d.hop(ID, { at: at + 0.05, height: 0.06, dur: 0.4 });
  }
  t += 4;
  d.tween(ID, "rotation", [0, 0, 0], { at: t, dur: 0.4 });
  pose(d, t, 0.4, REST);
  t += 0.8;

  // 6. Look around: the eyes lead, the head follows.
  label("Look around", t, 4.4);
  d.feel(ID, { at: t, feeling: "happy" });
  d.look(ID, { at: t, to: [-2.5, 0.8, 1.5], dur: 0.6 });
  d.look(ID, { at: t + 1.2, to: [2.5, 0.8, 1.5], dur: 0.8 });
  d.look(ID, { at: t + 2.4, to: [0, 2.6, 1.6], dur: 0.6 });
  d.look(ID, { at: t + 3.4, to: "ahead", dur: 0.5 });
  t += 4.4;

  // 7. Just the eyes: left, right, up, down, a roll.
  label("Eyes", t, 3.6);
  [[1, 0.2], [-1, 0.2], [0, 1], [0, -1], [1, 1], [-1, 1], [0, 0]].forEach((g, i) => d.tween(ID, "gaze", g, { at: t + i * 0.5, dur: 0.16, ease: "quadOut" }));
  t += 3.8;

  // 8. Feelings, each with its own pose.
  const feelings = [
    ["surprised", "Surprised!", [-20, 0, 70], [0, 0, 0]],
    ["sad", "Sad", [12, 0, -14], [0, 0, 0]],
    ["angry", "Grumpy", [-15, 0, 30], [-60, 0, -30]],
    ["worried", "Worried", [-42, 0, 8], [-70, 0, -60]], // hands to the tummy (a pose searched clear of the body)
  ];
  for (const [feeling, text, arm, fore] of feelings) {
    label(text, t, 1.8);
    d.feel(ID, { at: t, feeling, dur: 0.35 });
    pose(d, t, 0.35, [[`${ID}#arm`, "rotation", arm], [`${ID}#forearm`, "rotation", fore]], "quadOut");
    if (feeling === "surprised") d.hop(ID, { at: t, height: 0.12, dur: 0.35 });
    t += 1.9;
  }
  d.feel(ID, { at: t, feeling: "happy" });
  pose(d, t, 0.35, REST);
  t += 0.5;

  // 9. Tummy pat: both hands pat the tummy, again and again (his arms are too short to clap across his middle).
  label("Pat pat!", t, 2);
  d.feel(ID, { at: t, feeling: "joyful" });
  pose(d, t, 0.3, [[`${ID}#arm`, "rotation", [-42, 0, 8]], [`${ID}#forearm`, "rotation", [-40, 0, -28]]]);
  for (let i = 0; i < 6; i++) d.tween(`${ID}#forearm`, "rotation", i % 2 ? [-40, 0, -28] : [-60, 0, -50], { at: t + 0.3 + i * 0.22, dur: 0.22, ease: "sineInOut" });
  t += 0.3 + 6 * 0.22;
  pose(d, t, 0.35, REST);
  t += 0.6;

  // 10. Talk: the mouth shapes each vowel.
  label("Talk", t, 4);
  d.feel(ID, { at: t, feeling: "happy" });
  t += d.say("Ooh, look! I can talk, and smile, and sing along with you!", { at: t, who: ID }) + 0.4;

  // 11. Point at a ball.
  label("Point", t, 2.8);
  d.show("ball", { at: t, dur: 0.4 });
  d.point(ID, { at: t + 0.4, to: "ball", dur: 0.5, hold: 1.6 });
  d.say("A ball!", { at: t + 0.7, who: ID });
  t += 3.2;
  d.hide("ball", { at: t - 0.4, dur: 0.4 });
  d.look(ID, { at: t - 0.3, to: "ahead", dur: 0.4 });

  // 12. Sleep and wake.
  label("Sleepy... and awake!", t, 3.6);
  d.feel(ID, { at: t, feeling: "sleepy" });
  d.sleep(ID, { at: t + 0.2, dur: 1 });
  d.wake(ID, { at: t + 2.4, dur: 0.4 });
  d.feel(ID, { at: t + 2.4, feeling: "surprised", dur: 0.2 });
  d.hop(ID, { at: t + 2.4, height: 0.2, dur: 0.4 });
  d.feel(ID, { at: t + 3.1, feeling: "happy" });
  t += 3.8;

  // 13. Goodbye.
  label("Bye bye!", t, 3);
  d.say("Bye bye!", { at: t + 0.2, who: ID });
  t = wave(d, t, 6);
  d.hop(ID, { at: t, height: 0.15, dur: 0.45 });
  d.end(t + 1);
}
