// Audio events (spec 15.4): SFX records { t, sfx, volume, pan } in video seconds, from the sim's
// event log. Pan comes from the source's screen x at that frame. Milestone: M5 (mixed in M6).

import { frameView } from "./framestore.js";
import { unpackJoints } from "./skeleton.js";
import { FPS, PHYSICS, COMBAT } from "./config.js";
import { syllables, voiceOf } from "./story/speech.js";
import { storyToVideo } from "./clock.js";
import { CARD_COMMANDS } from "./story/timing.js";

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

  const story = sim.story && !sim.story.legacy;
  const heavyFeet = story ? new Set(sim.story.cast.filter((c) => c.body === "bulky" || (c.scale ?? 1) >= 1.3).map((c) => c.id)) : null;
  for (const e of sim.events) {
    // Story scripts (S7): footsteps by weight instead of the v1 step.
    const sfx = story && e.sfx === "step" ? (heavyFeet.has(e.actor) ? "footstep_hard" : "footstep_soft") : e.sfx;
    if (e.type === "moveEvent" && e.sfx) add(e.videoT, sfx, VOLUME[sfx] ?? (story && sfx.startsWith("footstep") ? 0.4 : 0.8), actorX(e.videoT, e.actor));
    else if (e.type === "hit" && e.sfx) {
      // Heavy hits sound heavy even when the move names its light variant.
      const heavy = e.kind === "hit" && e.damage >= COMBAT.reactionThresholds.heavy;
      add(e.videoT, heavy ? e.sfx.replace(/_light$/, "_heavy") : e.sfx, e.kind === "hit" ? 1 : 0.8, e.point.x);
    }
    else if (e.type === "land" && !e.launched) {
      if (e.speed > PHYSICS.shakeImpactSpeed) add(e.videoT, "land_heavy", 0.9, actorX(e.videoT, e.actor));
      else if (e.speed > PHYSICS.dustImpactSpeed) add(e.videoT, "land", 0.7, actorX(e.videoT, e.actor));
    } else if (e.type === "world" && e.do === "explosion") add(e.videoT, "explosion", 1, e.params.x);
    else if (e.type === "world" && e.do === "sfx") add(e.videoT, e.params.name, e.params.volume ?? 0.8, e.params.x); // a sound on its own (off-screen horns, thunder)
    else if (e.type === "object" && e.sfx) add(e.videoT, e.sfx, e.volume ?? 0.7, e.x);
  }
  if (story) out.push(...storySounds(sim, actorX, panAt), ...storyCues(sim, actorX, panAt));
  return out.sort((a, b) => a.t - b.t);
}

/** Speech babble (one event per syllable) and narration chimes for story scripts (S2, ADR-017). */
function storySounds(sim, actorX, panAt) {
  const out = [];
  const story = sim.story;
  const voices = new Map(story.cast.map((c) => [c.id, voiceOf(c.voice)]));
  const seed = story.meta.seed ?? 1;
  for (const e of sim.events) {
    // `line` names the beat a sound belongs to, so hosts can swap a whole line's babble for recorded speech.
    if (e.type === "world" && e.do === "narrate") out.push({ t: e.videoT, sfx: "narrate_chime", volume: 0.45, pan: 0, line: e.beatId });
    if (e.type !== "say" || story.audio?.voices === false) continue;
    const v = voices.get(e.actor) || voiceOf(null);
    for (const sy of syllables({ ...e, at: e.videoT }, v, seed)) {
      const t = e.videoT + sy.t;
      const x = actorX(t, e.actor);
      // Key: voice:<timbre>:<vowel>:<semitones from A3 at pitch 1>; the synthesizer caches each key.
      const semi = Math.round(12 * Math.log2(v.pitch)) + sy.semi;
      out.push({ t, sfx: `voice:${v.timbre}:${sy.vowel}:${semi}`, volume: 0.42 * sy.gain, pan: x == null ? 0 : panAt(t, x), line: e.beatId });
    }
  }
  return out;
}

const VOCAL = { laugh: "laugh_small", cry: "cry_small", gasp: "gasp" };
const CARTOON = ["pow", "bonk", "boing"];
const CARTOON_GAP = 0.6; // s, as the impact words (presentation.js)

/**
 * Story sound cues (S7.5): little voices for laugh, cry and gasp; a magic sparkle when someone returns;
 * a heartbeat and a sad sting at a vanish or ghost defeat; a whoosh as each card comes in; and in kids
 * stories a cartoon impact (pow, bonk, boing) with each impact word.
 */
function storyCues(sim, actorX, panAt) {
  const out = [];
  const at = (t, sfx, volume, id) => {
    const x = id ? actorX(t, id) : null;
    out.push({ t, sfx, volume, pan: x == null ? 0 : panAt(t, x) });
  };
  for (const b of sim.beats) {
    if (b.firedAt == null || b.who === "world") continue;
    const t = storyToVideo(sim.clock, b.firedAt);
    if (VOCAL[b.do]) at(t + 0.08, VOCAL[b.do], 0.5, b.who);
    if (b.do === "return") at(t, "magic_sparkle", 0.6, b.who);
  }
  let lastPop = -Infinity;
  let pops = 0;
  const kids = (sim.story.meta.audience ?? "kids") === "kids";
  for (const e of sim.events) {
    if (e.type === "defeat" && (e.move === "vanish" || e.move === "ghost")) {
      at(e.videoT, "heartbeat", 0.7, e.actor);
      at(e.videoT + 0.6, "sad_sting", 0.55);
    }
    if (e.type === "world" && CARD_COMMANDS.includes(e.do)) at(e.videoT, "card_whoosh", 0.5);
    if (kids && e.type === "hit" && e.kind === "hit" && e.videoT - lastPop > CARTOON_GAP) {
      at(e.videoT + 0.02, CARTOON[pops++ % CARTOON.length], 0.55, e.target);
      lastPop = e.videoT;
    }
  }
  for (const seg of sim.store?.segments || []) {
    if (seg.kind === "hold" && seg.info.type === "card") out.push({ t: seg.start / FPS, sfx: "card_whoosh", volume: 0.5, pan: 0 });
  }
  return out;
}

/** Music cues from world beats: [{ t, cue, volume }]. */
export function collectMusicCues(sim) {
  return sim.events.filter((e) => e.type === "world" && e.do === "music_cue").map((e) => ({ t: e.videoT, cue: e.params.cue, volume: e.params.volume }));
}
