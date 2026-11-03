// JSON script → director calls (docs: engine3d/README.md "Script format"). Beats run one after another; an
// action's `at` is seconds from its beat's start. A beat lasts its `dur` or until its last voice line ends
// (plus SAY_TAIL), whichever is longer, so a measured TTS clip stretches its beat the way 2D speech does.

import { createDirector } from "./director.js";
import { TEACH_ACTIONS } from "./director_teach.js";
import { KIT2_ACTIONS } from "./director_kit2.js";

export const SAY_TAIL = 0.35;
/** Pause between a line and the next one queued with at: "after". */
export const SAY_GAP = 0.25;

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
      let sayEnd = 0; // where the beat's last line so far ends (seconds from the beat start)
      (beat.do ?? []).forEach((a, ai) => {
        // look's at may name what to look at (an id or a point); a number is always the time.
        // A say with at: "after" starts when the beat's previous line ends (its measured clip), plus SAY_GAP.
        const rel = a.do === "say" && a.at === "after" ? sayEnd + (sayEnd > 0 ? SAY_GAP : 0) : typeof a.at === "number" ? a.at : 0;
        const start = t + rel;
        if (a.do === "say") {
          // meta.cast gives a speaker its own voice, pitch and speed; the line's own settings win.
          const cast = a.who != null ? meta.cast?.[a.who] ?? {} : {};
          const voice = { voice: a.voice ?? cast.voice, pitch: a.pitch ?? cast.pitch, speed: a.speed ?? cast.speed };
          const dur = d.say(a.text, { at: start, ...voice, id: a.id ?? `${beatId}.${ai + 1}`, who: a.who });
          sayEnd = Math.max(sayEnd, rel + dur);
          len = Math.max(len, (a.at === "after" ? rel : a.at ?? 0) + dur + SAY_TAIL);
          if (a.caption) later.push({ do: "caption", text: a.text, at: rel, dur: a.dur ?? dur + SAY_TAIL });
        } else if (a.do === "caption") later.push(a);
        else run(d, a, start);
      });
      // Captions without a dur last to the end of their beat, known only now.
      for (const c of later) d.caption(c.text, { at: t + (c.at ?? 0), dur: c.dur ?? Math.max(0.5, len - (c.at ?? 0)), style: c.style, color: c.color, pos: c.pos });
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
    case "feel": return d.feel(a.target, o);
    case "paint": return d.paint(a.target, o);
    case "clock": return d.clock(a.target, o);
    case "aim": return d.aim(a.target, o);
    case "path": return d.path(a.target, o);
    case "lights": return d.lights(o);
    case "camera": return d.camera(o);
    case "shot": return d.shot(o);
    case "orbit": return d.orbit(o);
    case "look": return d.look(a.target, { ...o, to: a.to ?? (typeof a.at === "number" ? undefined : a.at) });
    case "sound": return d.sound(a.sound, o);
    case "set": return d.setDigits(a.target, o);
    case "stage": return d.changeStage(a.preset, o);
    case "music": return d.music(o);
    default:
      if (TEACH_ACTIONS.includes(a.do) || KIT2_ACTIONS.includes(a.do)) return d[a.do](a.target, o);
      throw new Error(`unknown action "${a.do}"`);
  }
}
