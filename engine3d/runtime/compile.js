// JSON script → director calls (docs: engine3d/README.md "Script format"). Beats run one after another; an
// action's `at` is seconds from its beat's start. A beat lasts its `dur` or until its last voice line ends
// (plus SAY_TAIL), whichever is longer, so a measured TTS clip stretches its beat the way 2D speech does.

import { createDirector } from "./director.js";

export const SAY_TAIL = 0.35;

/**
 * @param {object} script  a validated video3d script
 * @param {{ catalog: object, speech?: Record<string, { dur:number }> }} o
 * @returns {ReturnType<ReturnType<typeof createDirector>["plan"]>}
 */
export function compileScript(script, { catalog, speech = {} }) {
  const meta = script.meta ?? {};
  const d = createDirector({ catalog, seed: meta.seed ?? 1, speech, voice: meta.voice ?? "soft" });
  d.stage(script.stage ?? {});
  if (script.camera) {
    for (const k of ["position", "lookAt", "fov"]) if (script.camera[k] != null) d.set("camera", k, script.camera[k], 0);
  }
  for (const o of script.objects ?? []) d.add(o);

  let t = 0;
  const scenes = [];
  for (const scene of script.scenes) {
    scenes.push({ id: scene.id, title: scene.title ?? null, start: t });
    scene.beats.forEach((beat, bi) => {
      const beatId = beat.id ?? `${scene.id}.${bi + 1}`;
      let len = beat.dur ?? 1;
      const later = [];
      (beat.do ?? []).forEach((a, ai) => {
        const start = t + (a.at ?? 0);
        if (a.do === "say") {
          const dur = d.say(a.text, { at: start, voice: a.voice, id: a.id ?? `${beatId}.${ai + 1}` });
          len = Math.max(len, (a.at ?? 0) + dur + SAY_TAIL);
          if (a.caption) later.push({ do: "caption", text: a.text, at: a.at, dur: a.dur ?? dur + SAY_TAIL });
        } else if (a.do === "caption") later.push(a);
        else run(d, a, start);
      });
      // Captions without a dur last to the end of their beat, known only now.
      for (const c of later) d.caption(c.text, { at: t + (c.at ?? 0), dur: c.dur ?? Math.max(0.5, len - (c.at ?? 0)), style: c.style, color: c.color });
      t += len;
    });
  }
  d.end(t);
  return { ...d.plan(), scenes };
}

function run(d, a, start) {
  const o = { ...a, at: start };
  switch (a.do) {
    case "show": return d.show(a.target, o);
    case "hide": return d.hide(a.target, o);
    case "pop": return d.pop(a.target, o);
    case "drop": return d.drop(a.target, o);
    case "move": return d.move(a.target, o);
    case "turn": return d.turn(a.target, o);
    case "spin": return d.spin(a.target, o);
    case "hop": return d.hop(a.target, o);
    case "grow": return d.grow(a.target, o);
    case "clip": return d.clip(a.target, a.clip, o);
    case "burst": return d.burst(a.target, o);
    case "wiggle": return d.wiggle(a.target, o);
    case "nod": return d.nod(a.target, o);
    case "sleep": return d.sleep(a.target, o);
    case "wake": return d.wake(a.target, o);
    case "camera": return d.camera(o);
    case "sound": return d.sound(a.sound, o);
    default: throw new Error(`unknown action "${a.do}"`);
  }
}
