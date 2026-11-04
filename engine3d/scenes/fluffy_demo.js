// Fluffy demo: Fluffy waves hello, walks across the garden, and shows its feelings; its friends cheer at the end.
//   node engine3d/tools/render3d.mjs engine3d/scenes/fluffy_demo.js --res 1080p --fps 30 --speech off --music off
// Walk cycles and waves are plain tweens on the named parts (#leg_left, #leg_right, #arm with lift).

export const meta = { seed: 21, stage: { preset: "garden" }, music: false };

/** Swing a part back and forth: `n` half-swings of `dur` seconds between a and b, starting at t, then back to rest. */
function swing(d, target, prop, a, b, { at, n, dur, rest = [0, 0, 0] }) {
  for (let i = 0; i < n; i++) d.tween(target, prop, i % 2 ? b : a, { at: at + i * dur, dur, ease: "sineInOut" });
  d.tween(target, prop, rest, { at: at + n * dur, dur: dur, ease: "sineInOut" });
  return at + (n + 1) * dur;
}

export default function fluffyDemo(d) {
  d.add({ id: "f", kind: "critter", species: "fluffy", at: [-2.6, 0, 0.4], rotation: [0, 20, 0] });
  d.add({ id: "y", kind: "critter", species: "yogurt_man", at: [3.2, 0, -0.6], size: 0.85, rotation: [0, -30, 0], hidden: true });
  d.add({ id: "b", kind: "critter", species: "dumpling_buddy", at: [4.3, 0, -0.2], size: 0.85, rotation: [0, -35, 0], hidden: true });
  d.add({ id: "party", kind: "confetti", count: 160, area: [8, 3], height: 5 });
  d.set("camera", "position", [-2.5, 1.0, 4.6]).set("camera", "lookAt", [-2.55, 0.95, 0.3]).set("camera", "fov", 36);

  // 1. Hello! The right arm (the mirrored copy, liftSide -1) goes up and waves.
  let t = 0.6;
  d.caption("Hi! I'm Fluffy!", { at: t, dur: 2.6, style: "title", pos: "top" });
  d.set("f#arm", "liftSide", -1, t);
  d.tween("f#arm", "lift", [0, 0, -95], { at: t, dur: 0.4, ease: "quadOut" });
  t = swing(d, "f#arm", "lift", [0, 0, -120], [0, 0, -80], { at: t + 0.4, n: 6, dur: 0.22, rest: [0, 0, -95] });
  d.tween("f#arm", "lift", [0, 0, 0], { at: t, dur: 0.4 });
  d.feel("f", { at: t, feeling: "joyful" });
  d.hop("f", { at: t + 0.1, height: 0.25 });
  t += 1.2;

  // 2. A walk across the garden: turn to face the way, legs and arms swing in turn, a little bob each step.
  d.feel("f", { at: t, feeling: "happy" });
  d.turn("f", { at: t, to: [0, 90, 0], dur: 0.4 });
  d.camera({ at: t, dur: 3.6, position: [0.4, 1.3, 5.0], lookAt: [0.2, 0.7, 0.2] });
  const walkAt = t + 0.35;
  const steps = 10;
  const step = 0.3;
  d.move("f", { at: walkAt, to: [1.6, 0, 0.4], dur: steps * step, ease: "linear" });
  swing(d, "f#leg_left", "rotation", [-32, 0, 0], [28, 0, 0], { at: walkAt, n: steps, dur: step });
  swing(d, "f#leg_right", "rotation", [28, 0, 0], [-32, 0, 0], { at: walkAt, n: steps, dur: step });
  swing(d, "f#arm", "rotation", [20, 0, 0], [-20, 0, 0], { at: walkAt, n: steps, dur: step });
  for (let i = 0; i < steps; i++) d.hop("f", { at: walkAt + i * step, height: 0.05, dur: step });
  t = walkAt + (steps + 1) * step;
  d.turn("f", { at: t, to: [0, 0, 0], dur: 0.5 });
  t += 0.7;

  // 3. Feelings, one after another, close up.
  d.camera({ at: t, dur: 1.2, position: [1.6, 1.05, 3.7], lookAt: [1.6, 0.78, 0.4] });
  t += 1.2;
  for (const [feeling, label] of [["surprised", "Surprised!"], ["sad", "Sad..."], ["worried", "Worried"], ["angry", "Grumpy!"], ["sleepy", "Sleepy"], ["joyful", "Happy again!"]]) {
    d.feel("f", { at: t, feeling, dur: 0.4 });
    d.caption(label, { at: t + 0.1, dur: 1.5 });
    if (feeling === "surprised") d.tween("f#arm", "rotation", [95, 0, 145], { at: t, dur: 0.35 }).tween("f#arm", "position", [-0.04, -0.015, 0.13], { at: t, dur: 0.35 });
    if (feeling === "sad") d.tween("f#arm", "rotation", [0, 0, -25], { at: t, dur: 0.5 }).tween("f#arm", "position", [0, 0, 0], { at: t, dur: 0.5 });
    if (feeling === "joyful") d.tween("f#arm", "rotation", [0, 0, 70], { at: t, dur: 0.4, ease: "backOut" });
    t += 1.7;
  }

  // 4. Friends pop in and everyone cheers.
  d.camera({ at: t, dur: 1.6, position: [2.4, 1.5, 6.4], lookAt: [2.6, 0.7, 0] });
  d.pop("y", { at: t + 0.4 });
  d.pop("b", { at: t + 0.7 });
  d.feel("y", { at: t + 0.8, feeling: "joyful" });
  d.feel("b", { at: t + 1.0, feeling: "joyful" });
  d.burst("party", { at: t + 1.4, dur: 3 });
  for (const [id, k] of [["f", 0], ["y", 1], ["b", 2]]) {
    d.hop(id, { at: t + 1.5 + k * 0.15, height: 0.4 });
    d.hop(id, { at: t + 2.3 + k * 0.15, height: 0.4 });
  }
  d.caption("Fluffy and friends!", { at: t + 1.4, dur: 2.6, style: "title", pos: "top" });
  d.end(t + 4.5);
}
