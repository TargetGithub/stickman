// JS scene example: "The vowels". The same director calls a JSON script compiles to, written as code: a loop
// places the letters on an arc, and an onFrame hook adds a custom motion (the current vowel floats and
// glows) that has no JSON action. Run: node engine3d/tools/render3d.mjs engine3d/scenes/vowels.js

export const meta = { seed: 11, voice: "soft", stage: { preset: "studio" } };

const VOWELS = [
  { text: "A", color: "red", word: "A, like apple." },
  { text: "E", color: "orange", word: "E, like egg." },
  { text: "I", color: "green", word: "I, like igloo." },
  { text: "O", color: "blue", word: "O, like octopus." },
  { text: "U", color: "purple", word: "U, like umbrella." },
];

export default function vowels(d) {
  d.set("camera", "position", [0, 1.9, 7.8]).set("camera", "lookAt", [0, 1.0, 0]);
  VOWELS.forEach((v, i) => {
    const a = ((i - 2) * 22 * Math.PI) / 180;
    d.add({ id: `v${i}`, kind: "letter", text: v.text, color: v.color, size: 1.25, at: [Math.sin(a) * 6, 0, 6 - Math.cos(a) * 6 - 1.5], rotation: [0, -(i - 2) * 22, 0], hidden: true });
  });
  d.add({ id: "party", kind: "confetti", count: 180, area: [10, 4], height: 6 });

  let t = 0.3;
  d.caption("The Vowels", { at: t, dur: 2.2, style: "title" });
  t += d.say("Let's meet the vowels!", { at: t + 0.2 }) + 0.6;
  const spans = [];
  VOWELS.forEach((v, i) => {
    d.pop(`v${i}`, { at: t });
    d.spin(`v${i}`, { at: t + 0.4, dur: 0.9 });
    d.camera({ at: t, dur: 1.2, lookAt: [((i - 2) * 1.6), 1.1, 0] });
    const len = d.say(v.word, { at: t + 0.3 });
    d.caption(v.word, { at: t + 0.3, dur: len + 0.3 });
    spans.push([i, t, t + len + 0.6]);
    t += len + 0.8;
  });
  d.camera({ at: t, dur: 1.4, lookAt: [0, 1.2, 0], position: [0, 3, 11] });
  VOWELS.forEach((_, i) => d.hop(`v${i}`, { at: t + 0.3 + i * 0.25, height: 0.5, sound: "pop" }));
  d.burst("party", { at: t + 1.6, dur: 3 });
  t += d.say("A, E, I, O, U!", { at: t + 0.3 }) + 1.2;
  d.end(t + 1.5);

  // Custom motion: the vowel being spoken floats and glows. Pure function of t, so any frame renders alone.
  d.onFrame((now, { objects }) => {
    for (const [i, a, b] of spans) {
      const g = objects.get(`v${i}`).group;
      const on = now >= a + 0.5 && now < b;
      g.position.y += on ? 0.25 + 0.12 * Math.sin((now - a) * 4) : 0;
      g.traverse((m) => m.isMesh && (m.material.emissiveIntensity = on ? 0.25 : 0, m.material.emissive?.copy(m.material.color)));
    }
  });
}
