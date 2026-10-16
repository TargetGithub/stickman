// Audio events (spec 15.4): SFX records { t, sfx, volume, pan } in video seconds, from the sim's
// event log. Pan comes from the source's screen x at that frame. Milestone: M5 (mixed in M6).

import { frameView } from "./framestore.js";
import { unpackJoints } from "./skeleton.js";
import { FPS, PHYSICS } from "./config.js";

const VOLUME = { step: 0.35, whoosh: 0.55, crowd_cheer: 0.6, crowd_gasp: 0.6 };
const PAN_WIDTH = 0.8; // keep stereo placement subtle

/**
 * @param {object} sim  simulate() result (non-dry)
 * @returns {Array<{ t:number, sfx:string, volume:number, pan:number }>}
 */
export function collectAudioEvents(sim) {
  const W = sim.format.width;
  const last = sim.store.length - 1;
  const index = new Map(sim.store.chars.map((c, i) => [c.id, i]));
  const panAt = (t, x) => {
    const f = frameView(sim.store, Math.min(last, Math.max(0, Math.round(t * FPS))), FPS);
    const sx = W / 2 + (x - f.cam.x + f.cam.shakeX) * f.cam.zoom;
    return Math.max(-1, Math.min(1, (sx / W) * 2 - 1)) * PAN_WIDTH;
  };
  const actorX = (t, id) => {
    const i = index.get(id);
    if (i === undefined) return null;
    const f = frameView(sim.store, Math.min(last, Math.max(0, Math.round(t * FPS))), FPS);
    return unpackJoints(f.chars[i].joints).hip.x;
  };
  const out = [];
  const add = (t, sfx, volume, x) => out.push({ t, sfx, volume, pan: x == null ? 0 : panAt(t, x) });

  for (const e of sim.events) {
    if (e.type === "moveEvent" && e.sfx) add(e.videoT, e.sfx, VOLUME[e.sfx] ?? 0.8, actorX(e.videoT, e.actor));
    else if (e.type === "hit" && e.sfx) add(e.videoT, e.sfx, e.kind === "hit" ? 1 : 0.8, e.point.x);
    else if (e.type === "land" && !e.launched) {
      if (e.speed > PHYSICS.shakeImpactSpeed) add(e.videoT, "land_heavy", 0.9, actorX(e.videoT, e.actor));
      else if (e.speed > PHYSICS.dustImpactSpeed) add(e.videoT, "land", 0.7, actorX(e.videoT, e.actor));
    } else if (e.type === "world" && e.do === "explosion") add(e.videoT, "explosion", 1, e.params.x);
  }
  return out.sort((a, b) => a.t - b.t);
}

/** Music cues from world beats: [{ t, cue, volume }]. */
export function collectMusicCues(sim) {
  return sim.events.filter((e) => e.type === "world" && e.do === "music_cue").map((e) => ({ t: e.videoT, cue: e.params.cue, volume: e.params.volume }));
}
