// Per-frame face drawing options (STORY_SPEC 7.1). Milestone: S2.
// Combines the stored face with things derived from the event log at render time (ADR-012):
// the mouth shape while a line is spoken (lip-sync, ADR-032), blinking, gaze toward whoever is talking,
// and the level of detail (a neutral face far away keeps the classic two dots).

import { blinkAt } from "./face.js";
import { idleGazeAt, doubleBlinkAt } from "./lively.js";
import { syllables, mouthOpenAt } from "../story/speech.js";
import { dimsOf } from "../skeleton.js";
import { visemeTable, audioPlan, textPlan, visemeAt } from "../lipsync.js";

const DETAIL_PX = 30; // head radius on screen above which the neutral face shows its full features

function activeSay(sv, id, t) {
  for (let i = sv.says.length - 1; i >= 0; i--) {
    const s = sv.says[i];
    if (s.actor === id && t >= s.videoT && t < s.videoT + s.dur) return s;
  }
  return null;
}

function sylls(r, say) {
  if (!r.syllables.has(say)) r.syllables.set(say, syllables({ ...say, at: say.videoT }, r.voices.get(say.actor), r.seed));
  return r.syllables.get(say);
}

/**
 * The lip-sync shape for a spoken line at video time t, or null when lip-sync is off (meta.lipSync false,
 * v1 scripts, a catalog without visemes). Lines with a host audio track (engine.load(script, { lipSync }))
 * follow the audio; the later bubbles of a line spoken as one clip (track.head) follow the head line's clip.
 */
function lipAt(r, sv, say, t) {
  const story = r.sim.story;
  if (!story || story.legacy || story.meta?.lipSync === false || !r.catalog.visemes) return null;
  r.lip ??= { table: visemeTable(r.catalog.visemes), plans: new Map() };
  const track = r.lipTracks?.[say.beatId];
  const head = track?.head ? sv.says.find((s) => s.beatId === track.head) ?? say : say;
  const key = track ? `audio:${track.head ?? say.beatId}` : say;
  if (!r.lip.plans.has(key)) r.lip.plans.set(key, track ? audioPlan(track, r.lip.table) : textPlan(sylls(r, say), say.text, r.lip.table));
  const at = visemeAt(r.lip.plans.get(key), t - head.videoT);
  return { ...at, shape: r.catalog.visemes[at.v] ?? r.catalog.visemes.rest };
}

/**
 * @param {object} r  renderer; c: character view (with j, face, mouth); chars: all characters this frame
 * @param {object} sv  scene view (says); f: frame view (videoT, cam)
 * @returns {{ face:object, faceOpts:object }}
 */
export function faceStyle(r, c, chars, sv, f) {
  const t = f.videoT;
  let data = r.catalog.faces?.[c.face];
  if (!data) return {};
  const neutral = c.face === "neutral" && c.mouth === "neutral";
  // A neutral face takes the move's v1 mouth (shout, grin) so attacks and emotes still read.
  if (c.face === "neutral" && c.mouth === "shout") data = { ...data, mouth: "open" };
  if (c.face === "neutral" && c.mouth === "grin") data = { ...data, mouth: "grin" };
  const own = activeSay(sv, c.id, t);
  const lip = own ? lipAt(r, sv, own, t) : null;
  const talking = lip ? lip.v !== "rest" : own ? mouthOpenAt(sylls(r, own), t - own.videoT) : false;
  // Look at another character who is talking; otherwise straight ahead.
  let gaze = { f: 0, u: 0 };
  for (const o of chars) {
    if (o.id === c.id || o.alpha <= 0.01 || !activeSay(sv, o.id, t)) continue;
    const dx = (o.j.head.x - c.j.head.x) * c.facing;
    gaze = { f: dx >= 0 ? 1 : -1, u: Math.max(-1, Math.min(1, (c.j.head.y - o.j.head.y) / 200)) };
    break;
  }
  const screenR = dimsOf(c).headR * c.scale * f.cam.zoom;
  return {
    face: data,
    faceOpts: { blink: blinkAt(r.seed, c.id, t), blink2: doubleBlinkAt(r.seed, c.id, t), idle: idleGazeAt(r.seed, c.id, t), talking, gaze, t, neutral, detail: screenR >= DETAIL_PX ? "full" : "simple",
      ...(lip ? { lip: { ...lip, jaw: !!c.quad } } : {}) },
  };
}
