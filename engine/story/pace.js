// Pace (ADR-038): the snappy preschool-show timing for version 3 stories, opt-in with a `pace` block on the
// script (and per scene: an object over the script's, or false to turn it off). Without a block nothing
// here applies, so v1/v2 scripts and v3 scripts without one simulate exactly as before.
//   travel     speed multipliers for walk, run, sneak, tiptoe, walk_together and swim: the cycle plays faster
//              (f^0.45) and each step reaches further (f^0.55), so feet still plant
//   moves      playback speed of other one-shot moves started by beats (not attacks, defeats, paired moves,
//              timed holds or a beat that speaks: its length is the line's)
//   gap        seconds between dialogue lines; reading time is 0.5 s + 0.05 s per character (at least 1 s), or
//              the voice clip's length with TTS (tools/lib/tts/lines.mjs)
//   maxTravel  seconds of travel on screen: a longer walk becomes a short walk out, a cut, and the arrival
//              (an entering walker starts close to where it is going); an exit walk lasts at most maxExit
//   shot       [min, max] seconds a dialogue shot lasts (the story auto camera cuts; camera_cuts.js)
//   establish  seconds of the opening wide
//   minCut     fewest seconds between two auto camera cuts (default shot[0] / 2); the camera also holds a
//              medium that long when who is acting changes
//   reactions  false: no reaction close-ups of the listener during long lines (default true)
//   keepSpeakers  false: a script shot holds even when someone it leaves out speaks (default true: the
//              camera moves to the speaker)
//   glide      seconds the camera eases between framings instead of cutting (default 0: hard cuts); scene
//              changes, cut-to-arrival and script `cut` commands still cut
//   captions   "auto" (subtitles when the script speaks with TTS, else bubbles), "bubbles" or "subtitles"
//   bubble     bubble and text scale (times look.bubble)

export const PACE_DEFAULTS = Object.freeze({
  travel: Object.freeze({ walk: 1.7, run: 1.25, sneak: 2.5, tiptoe: 2, walk_together: 1.6, swim: 1.3 }),
  moves: 1.25,
  gap: 0.2,
  maxTravel: 3,
  maxExit: 1.5,
  arrive: 1.2, // s of walking after a travel cut
  leave: 0.9, // s of walking before it
  shot: Object.freeze([2, 4]),
  establish: 2,
  captions: "auto",
  bubble: 1.5,
});

/** The shortest a spoken line shows under a pace (s): with TTS the voice sets the rest (tools/lib/tts/lines.mjs). */
export const PACED_MIN = 0.6;

/** Moves that play at `moves` speed only when the beat does not time them itself. */
const UNPACED = ["attack", "defeat"];

/**
 * The pace of one scene of a normalized story, or null (no pace: not version 3, no block, or the scene turns it off).
 * @param {object} story  a normalize()d story (story.v3 marks a version 3 script) or a plain version 3 script
 * @param {object} [scene]
 */
export function paceOf(story, scene) {
  if (!(story?.v3 || story?.version === 3) || !story.pace || scene?.pace === false) return null;
  const own = typeof scene?.pace === "object" ? scene.pace : {};
  const top = typeof story.pace === "object" ? story.pace : {};
  return {
    ...PACE_DEFAULTS,
    ...top,
    ...own,
    travel: { ...PACE_DEFAULTS.travel, ...(top.travel || {}), ...(own.travel || {}) },
    speech: story.meta?.speech === "tts",
  };
}

/** Speed multiplier for a travel move (1 for other moves). */
export const travelFactor = (pace, name) => (pace ? pace.travel[name] ?? 1 : 1);

/**
 * Command options for a move started under a pace: travel moves step faster and further.
 * A travel move counted in cycles (no distance) keeps its stride, so it covers the same ground.
 */
export function pacedOpts(pace, name, opts) {
  const f = travelFactor(pace, name);
  if (f === 1) return opts;
  const byCycles = opts.params?.cycles !== undefined && opts.params?.distance === undefined;
  return { ...opts, speed: (opts.speed ?? 1) * (byCycles ? f : f ** 0.45), stride: byCycles ? 1 : f ** 0.55 };
}

/** Playback speed for a beat's own move under a pace, or undefined to keep the move's timing. */
export function moveSpeed(pace, def, beat) {
  if (!pace || beat.speed !== undefined || beat.say || def.pair || def.flags.durationParam || def.flags.loop) return undefined;
  if (UNPACED.includes(def.category) || def.flags.defeat || travelFactor(pace, def.name) !== 1) return undefined;
  return pace.moves;
}

/** Reading time for a bubble under a pace (no voice clip): 0.5 s + 0.05 s per character, at least 1 s. */
export function pacedReadingTime(text) {
  return Math.max(1, 0.5 + 0.05 * String(text).length);
}

/**
 * A talk gesture that lasts `seconds`: whole cycles of the 0.8 s loop, played at the speed that ends them on time.
 * @returns {{ cycles:number, speed:number }}
 */
export function talkFor(seconds, cycle = 0.8) {
  const cycles = Math.max(1, Math.round(seconds / cycle));
  return { cycles, speed: Math.round(((cycles * cycle) / Math.max(0.3, seconds)) * 1000) / 1000 };
}

/** True when a scene shows spoken lines as subtitles instead of bubbles. */
export function subtitlesOn(pace) {
  return !!pace && (pace.captions === "subtitles" || (pace.captions === "auto" && pace.speech));
}
