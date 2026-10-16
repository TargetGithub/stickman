// Audio events (spec 15.4): SFX records { t, sfx, volume, pan } in video seconds, from the sim's
// event log. Pan comes from the source's screen x at that frame. Milestone: M5 (mixed in M6).

import { frameView } from "./framestore.js";
import { unpackJoints } from "./skeleton.js";
import { FPS, PHYSICS, COMBAT } from "./config.js";
import { syllables, voiceOf } from "./story/speech.js";

const VOLUME = { step: 0.35, whoosh: 0.55, crowd_cheer: 0.6, crowd_gasp: 0.6 };
const PAN_WIDTH = 0.8; // keep stereo placement subtle

/**
 * @param {object} sim  simulate() result (non-dry)
 * @returns {Array<{ t:number, sfx:string, volume:number, pan:number }>}
 */
export function collectAudioEvents(sim) {
  const W = sim.format.width;
  const last = sim.store.length - 1;
  // Hold frames (transitions) have no camera or characters: use the nearest scene frame before them.
  const sceneFrame = (t) => {
    let f = frameView(sim.store, Math.min(last, Math.max(0, Math.round(t * FPS))), FPS);
    if (f.hold) f = frameView(sim.store, f.prevFrame ?? f.nextFrame, FPS);
    return f;
  };
  const panAt = (t, x) => {
    const f = sceneFrame(t);
    const sx = W / 2 + (x - f.cam.x + f.cam.shakeX) * f.cam.zoom;
    return Math.max(-1, Math.min(1, (sx / W) * 2 - 1)) * PAN_WIDTH;
  };
  const actorX = (t, id) => {
    const c = sceneFrame(t).chars.find((ch) => ch.id === id);
    return c ? unpackJoints(c.joints).hip.x : null;
  };
  const out = [];
  const add = (t, sfx, volume, x) => out.push({ t, sfx, volume, pan: x == null ? 0 : panAt(t, x) });

  for (const e of sim.events) {
    if (e.type === "moveEvent" && e.sfx) add(e.videoT, e.sfx, VOLUME[e.sfx] ?? 0.8, actorX(e.videoT, e.actor));
    else if (e.type === "hit" && e.sfx) {
      // Heavy hits sound heavy even when the move names its light variant.
      const heavy = e.kind === "hit" && e.damage >= COMBAT.reactionThresholds.heavy;
      add(e.videoT, heavy ? e.sfx.replace(/_light$/, "_heavy") : e.sfx, e.kind === "hit" ? 1 : 0.8, e.point.x);
    }
    else if (e.type === "land" && !e.launched) {
      if (e.speed > PHYSICS.shakeImpactSpeed) add(e.videoT, "land_heavy", 0.9, actorX(e.videoT, e.actor));
      else if (e.speed > PHYSICS.dustImpactSpeed) add(e.videoT, "land", 0.7, actorX(e.videoT, e.actor));
    } else if (e.type === "world" && e.do === "explosion") add(e.videoT, "explosion", 1, e.params.x);
    else if (e.type === "object" && e.sfx) add(e.videoT, e.sfx, e.volume ?? 0.7, e.x);
  }
  if (sim.story && !sim.story.legacy) out.push(...storySounds(sim, actorX, panAt));
  return out.sort((a, b) => a.t - b.t);
}

/** Speech babble (one event per syllable) and narration chimes for story scripts (S2, ADR-017). */
function storySounds(sim, actorX, panAt) {
  const out = [];
  const story = sim.story;
  const voices = new Map(story.cast.map((c) => [c.id, voiceOf(c.voice)]));
  const seed = story.meta.seed ?? 1;
  for (const e of sim.events) {
    if (e.type === "world" && e.do === "narrate") out.push({ t: e.videoT, sfx: "narrate_chime", volume: 0.45, pan: 0 });
    if (e.type !== "say" || story.audio?.voices === false) continue;
    const v = voices.get(e.actor) || voiceOf(null);
    for (const sy of syllables({ ...e, at: e.videoT }, v, seed)) {
      const t = e.videoT + sy.t;
      const x = actorX(t, e.actor);
      // Key: voice:<timbre>:<vowel>:<semitones from A3 at pitch 1>; the synthesizer caches each key.
      const semi = Math.round(12 * Math.log2(v.pitch)) + sy.semi;
      out.push({ t, sfx: `voice:${v.timbre}:${sy.vowel}:${semi}`, volume: 0.42 * sy.gain, pan: x == null ? 0 : panAt(t, x) });
    }
  }
  return out;
}

/** Music cues from world beats: [{ t, cue, volume }]. */
export function collectMusicCues(sim) {
  return sim.events.filter((e) => e.type === "world" && e.do === "music_cue").map((e) => ({ t: e.videoT, cue: e.params.cue, volume: e.params.volume }));
}
