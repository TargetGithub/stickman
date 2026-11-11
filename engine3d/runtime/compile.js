// JSON script → director calls (docs: engine3d/README.md "Script format"). Beats run one after another; an
// action's `at` is seconds from its beat's start. A beat lasts its `dur` or until its last voice line ends
// (plus SAY_TAIL), whichever is longer, so a measured TTS clip stretches its beat the way 2D speech does. With
// dur "fit" it lasts until its last timed action ends too (plus 0.2 s).

import { createDirector } from "./director.js";
import { TEACH_ACTIONS } from "./director_teach.js";
import { KIT2_ACTIONS } from "./director_kit2.js";
import { ENGAGING, RETAIN_ACTIONS } from "./director_retain.js";
import { RETAIN_MACROS, runMacro, sayKeywords } from "./retain_compile.js";

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
  const speakerVoice = characterVoices(script, catalog);
  const host = hostOf(script, catalog);

  let t = 0;
  const scenes = [];
  for (const scene of script.scenes) {
    scenes.push({ id: scene.id, title: scene.title ?? null, start: t });
    scene.beats.forEach((beat, bi) => {
      const beatId = beat.id ?? `${scene.id}.${bi + 1}`;
      // dur "fit": the beat lasts until its last timed action (a move, a draw, a pop) ends, or its last line.
      const fit = beat.dur === "fit";
      let len = fit ? 0.5 : beat.dur ?? 1;
      const mark = d.timeline.mark();
      const later = [];
      let sayEnd = 0; // where the beat's last line so far ends (seconds from the beat start)
      let kitLines = 0;
      // Speak a line at rel (seconds from the beat start); returns its length. The beat grows to fit it.
      const speak = (a, rel, ai) => {
        // The speaker is `who`, else the episode's host (Robo, see hostOf). A character's own catalog voice (Robo's
        // toddler voice) comes first, then meta.cast; the line's own settings win over both.
        const speaker = a.who ?? host;
        const own = speaker != null ? speakerVoice.get(speaker) ?? {} : {};
        const cast = speaker != null ? meta.cast?.[speaker] ?? {} : {};
        const voice = { voice: a.voice ?? own.voice ?? cast.voice, pitch: a.pitch ?? own.pitch ?? cast.pitch, speed: a.speed ?? cast.speed ?? own.speed };
        const id = a.id ?? (ai != null ? `${beatId}.${ai + 1}` : `${beatId}.k${++kitLines}`);
        const dur = d.say(a.text, { at: t + rel, ...voice, id, who: a.who, spoken: a.spoken, tune: a.tune, sing: a.sing, tunePatch: a.tunePatch, tuneGain: a.tuneGain, tempo: a.tempo, rhythm: a.rhythm, style: a.style, stress: a.stress });
        sayEnd = Math.max(sayEnd, rel + dur);
        len = Math.max(len, rel + dur + SAY_TAIL);
        if (a.caption) later.push({ do: "caption", text: a.text, at: rel, dur: a.dur ?? dur + SAY_TAIL });
        if (a.keywords) sayKeywords(d, { text: a.text, keywords: a.keywords, start: t + rel, dur, catalog });
        return dur;
      };
      // Three passes, each in script order: plain moves first, then lines and kit macros (a challenge's options pulse
      // from how they look after a pop in the same beat), then shots (they frame where their targets end up after the
      // beat's moves). Times come from each action's own at, so the passes change only what each step can see.
      const pass = (a) => (a.do === "shot" ? 2 : a.do === "say" || a.do === "caption" || RETAIN_MACROS.includes(a.do) ? 1 : 0);
      const ordered = (beat.do ?? []).map((a, ai) => [a, ai]).sort((x, y) => pass(x[0]) - pass(y[0]) || x[1] - y[1]);
      ordered.forEach(([a, ai]) => {
        // look's at may name what to look at (an id or a point); a number is always the time.
        // A say with at: "after" starts when the beat's previous line ends (its measured clip), plus SAY_GAP.
        const rel = a.do === "say" && a.at === "after" ? sayEnd + (sayEnd > 0 ? SAY_GAP : 0) : typeof a.at === "number" ? a.at : 0;
        const start = t + rel;
        if (a.do === "say") speak(a, rel, ai);
        else if (a.do === "caption") later.push(a);
        // A beat's caption: false reaches the kit macros' spoken lines too (#111), unless the macro says otherwise.
        else if (RETAIN_MACROS.includes(a.do)) len = Math.max(len, runMacro(beat.caption === false && a.caption == null ? { ...a, caption: false } : a, { d, t, rel, speak: (l, r) => speak(l, r), audience: meta.audience }));
        else {
          // sound who: a letter sound in that speaker's voice (its catalog voice, else meta.cast).
          if (a.do === "sound" && a.who != null && a.voice == null) {
            const v = { ...meta.cast?.[a.who], ...speakerVoice.get(a.who) };
            a = { ...a, voice: v.voice ?? meta.voice ?? "soft", pitch: a.pitch ?? v.pitch };
          }
          run(d, a, start);
          if (ENGAGING.includes(a.do)) d.engage(a.do, { at: start });
        }
      });
      if (fit) len = Math.max(len, d.timeline.endSince(mark) - t + 0.2);
      // Captions without a dur last to the end of their beat, known only now.
      for (const c of later) d.caption(c.text, { at: t + (c.at ?? 0), dur: c.dur ?? Math.max(0.5, len - (c.at ?? 0)), style: c.style ?? captionStyle(c.text, meta), color: c.color, pos: c.pos });
      t += len;
    });
  }
  d.end(t);
  return { ...d.plan(), scenes };
}

/** Babies' scripts show captions of up to three words ("Zip, zip!") in the bigger shout style; others as subtitles. */
export function captionStyle(text, meta) {
  return meta.audience === "babies" && String(text).trim().split(/\s+/).length <= 3 ? "shout" : undefined;
}

/** Object id → its catalog voice ({ voice, pitch, speed }) for characters whose catalog entry has one (Robo). */
function characterVoices(script, catalog) {
  const out = new Map();
  for (const o of script.objects ?? []) {
    const v = o.kind === "character" ? catalog.characters?.[o.character]?.voice : null;
    if (v) out.set(o.id, { voice: v.voice, pitch: v.pitch, speed: v.speed });
  }
  return out;
}

/**
 * Who speaks the lines without `who`: meta.host (an object id, or null for the plain meta.voice narrator), else
 * the episode's one character with a catalog voice (Robo hosts every Toy Box episode he is in), else nobody. Host
 * lines take the host's voice but do not lip-sync (no `who`).
 */
export function hostOf(script, catalog) {
  const meta = script.meta ?? {};
  if (meta.host !== undefined) return meta.host;
  const voiced = [...characterVoices(script, catalog).keys()];
  return voiced.length === 1 ? voiced[0] : null;
}

function run(d, a, start) {
  const o = { ...a, at: start };
  switch (a.do) {
    case "show": return d.show(a.target, o);
    case "hide": return d.hide(a.target, o);
    case "pop": return d.pop(a.target, o);
    case "drop": return d.drop(a.target, o);
    case "move": return d.move(a.target, o);
    case "roll": return d.roll(a.target, o);
    case "lie": return d.lie(a.target, o);
    case "split": return d.split(a.target, o);
    case "retext": return d.retext(a.target, o);
    case "turn_page": return d.turn_page(a.target, o);
    case "vowel_mark": return d.vowel_mark(a.target, o);
    case "stress": return d.stress(a.target, o);
    case "ripple": return d.stress(a.target, o);
    case "swap": return d.swap(a.target, o);
    case "reset": return d.reset(a.target, o);
    case "alive": return d.alive(a.target, o);
    case "mist": return d.mist(a.target, o);
    case "gesture": return d.gesture(a.target, o);
    case "rewind": return d.rewind(o);
    case "fog": return d.fog(o);
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
      if (TEACH_ACTIONS.includes(a.do) || KIT2_ACTIONS.includes(a.do) || RETAIN_ACTIONS.includes(a.do)) return d[a.do](a.target, o);
      throw new Error(`unknown action "${a.do}"`);
  }
}
