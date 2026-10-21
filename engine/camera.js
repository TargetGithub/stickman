// Camera: modes, framing, spring smoothing, shake, zoom punch (spec 11.5, 13.3).
// Milestone: M4. Smoothing runs on video time; shake decays on the fx clock.

import { dimsOf } from "./skeleton.js";
import { valueNoise1D, easings } from "./math.js";
import { CAMERA, SHAKE } from "./config.js";
import { storyFraming } from "./camera_story.js";

const ZOOM_MIN = 0.4;
const ZOOM_MAX = 1.8;
const TOP_MARGIN = 0.17; // fraction of frame height kept free above the tallest head (clears HP bars)

/**
 * @param {{ width, height, groundScreenRatio, stageWidth, groundY, rng }} opts
 */
export function createCamera({ width, height, groundScreenRatio, stageWidth, groundY, rng }) {
  return {
    W: width,
    H: height,
    gsr: groundScreenRatio,
    stageWidth,
    groundY,
    x: stageWidth / 2,
    zoom: 1,
    vx: 0,
    vz: 0,
    key: { mode: "follow" },
    keyT0: 0,
    keyFrom: null,
    cut: true, // the first frame snaps
    widen: 1,
    shakes: [],
    punches: [],
    noiseX: valueNoise1D(rng),
    noiseY: valueNoise1D(rng),
    state: { x: stageWidth / 2, y: groundY, zoom: 1, shakeX: 0, shakeY: 0 },
  };
}

/** Apply a camera key (spec 11.5). Transitions start from the current framing. */
export function setCameraKey(cam, key, videoT) {
  cam.key = key;
  cam.keyT0 = videoT;
  cam.keyFrom = { x: cam.x, zoom: cam.zoom };
}

/** Hard cut: the next frame jumps to the target framing without smoothing. */
export function cutCamera(cam) {
  cam.cut = true;
}

/**
 * Glide (pace.glide, ADR-038): instead of a hard cut, ease from the current framing to the new key's over `dur`
 * video seconds (ease in and out; zoom eased in log space), then follow as usual. A hard cut cancels it.
 */
export function glideCamera(cam, dur, videoT) {
  cam.glide = { t0: videoT, dur, x: cam.x, zoom: cam.zoom };
}

export function addShake(cam, preset, fxT) {
  const p = SHAKE[preset] || SHAKE.small;
  cam.shakes.push({ amp: p.amplitude, dur: p.duration, t0: fxT });
}

export function addZoomPunch(cam, amount, dur, videoT) {
  cam.punches.push({ amount, dur, t0: videoT });
}

export function bounds(all) {
  // Hidden characters (not spawned yet, despawned, mid-teleport) do not pull the camera.
  const visible = all.filter((a) => !a.hidden);
  const actors = visible.length ? visible : all;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  for (const a of actors) {
    for (const p of Object.values(a.joints)) {
      if (!p || !Number.isFinite(p.x)) continue; // never let one bad point poison the camera springs
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
    }
    minY = Math.min(minY, a.joints.head.y - dimsOf(a).headR * a.scale);
  }
  return { minX, maxX, minY };
}

/** Zoom that fits a horizontal span plus padding, and keeps the top of the group inside the frame. */
export function fitZoom(cam, span, top, padding) {
  const byWidth = cam.W / (span + 2 * padding);
  const above = cam.groundY - top;
  const byHeight = above > 0 ? (cam.H * (cam.gsr - TOP_MARGIN)) / above : ZOOM_MAX;
  // Narrow frames cap auto zoom lower: a quick dodge would otherwise leave the frame before the camera catches up.
  const max = cam.W < cam.H ? 1.4 : ZOOM_MAX;
  return Math.max(ZOOM_MIN, Math.min(max, byWidth, byHeight));
}

/** Target framing { x, zoom, y? } for the current key. */
function desired(cam, actors, videoT) {
  const k = cam.key;
  const byId = (id) => actors.find((a) => a.id === id);
  const story = storyFraming(cam, actors, k, { bounds, fitZoom }); // story shot modes (S6)
  if (story) return story;
  const u = k.dur ? Math.min(1, (videoT - cam.keyT0) / k.dur) : 1;
  const ease = easings[k.ease] || easings.inOutCubic;
  if (k.mode === "focus") {
    const t = byId(k.target);
    const b = t ? bounds([t]) : null;
    const zoom = typeof k.zoom === "number" ? k.zoom : fitZoom(cam, b.maxX - b.minX, b.minY, 220);
    return { x: t ? (b.minX + b.maxX) / 2 : cam.x, zoom };
  }
  if (k.mode === "fixed") return { x: k.x, zoom: typeof k.zoom === "number" ? k.zoom : 1, y: k.y };
  if (k.mode === "pan") {
    const from = cam.keyFrom || { x: cam.x, zoom: cam.zoom };
    const zoom = typeof k.zoom === "number" ? k.zoom : from.zoom;
    return { x: from.x + (k.x - from.x) * ease(u), zoom: from.zoom + (zoom - from.zoom) * ease(u), y: k.y, direct: true };
  }
  if (k.mode === "push") {
    const from = cam.keyFrom || { x: cam.x, zoom: cam.zoom };
    const to = typeof k.zoom === "number" ? k.zoom : from.zoom * 1.3;
    const group = (k.targets || []).map(byId).filter(Boolean);
    const b = bounds(group.length ? group : actors);
    return { x: (b.minX + b.maxX) / 2, zoom: from.zoom + (to - from.zoom) * ease(u), direct: true };
  }
  const group = (k.targets || []).map(byId).filter(Boolean);
  const b = bounds(group.length ? group : actors);
  // Padding is authored for a 1920-wide frame; narrow (portrait) frames scale it down so fighters stay large.
  const padding = (k.padding ?? CAMERA.padding) * cam.widen * Math.max(0.7, Math.min(1, cam.W / 1920));
  const zoom = typeof k.zoom === "number" ? k.zoom : fitZoom(cam, b.maxX - b.minX, b.minY, padding);
  return { x: (b.minX + b.maxX) / 2, zoom };
}

function spring(value, vel, target, dt, omega = CAMERA.omega) {
  const w = omega;
  const acc = w * w * (target - value) - 2 * w * vel;
  const v = vel + acc * dt;
  return [value + v * dt, v];
}

/**
 * Advance one video frame and return the camera state for that frame:
 * { x, y, zoom, shakeX, shakeY } with shake in world units.
 * @param {object[]} actors  world actors (joints, scale, launched, vx)
 */
export function stepCamera(cam, videoDt, actors, videoT, fxT, { autoCamera = true } = {}) {
  const fast = autoCamera && actors.some((a) => a.launched || Math.abs(a.vx) > 300);
  cam.widen += ((fast ? 1.3 : 1) - cam.widen) * Math.min(1, videoDt * 3);
  const d = desired(cam, actors, videoT);
  const snapped = cam.cut || d.direct;
  const g = cam.glide && !snapped && videoT - cam.glide.t0 < cam.glide.dur ? cam.glide : null;
  if (!g) cam.glide = null;
  if (cam.cut || d.direct) {
    cam.x = d.x;
    cam.zoom = d.zoom;
    cam.vx = 0;
    cam.vz = 0;
    cam.cut = false;
  } else if (g) {
    const u = easings.inOutCubic(Math.max(0, Math.min(1, (videoT - g.t0) / g.dur)));
    cam.x = g.x + (d.x - g.x) * u;
    cam.zoom = Math.exp(Math.log(g.zoom) + (Math.log(d.zoom) - Math.log(g.zoom)) * u);
    cam.vx = 0;
    cam.vz = 0;
  } else {
    // Follow with lag (V3.4: a v3 camera key's `lag`, 0-1): a slower spring trails the action.
    const lag = typeof cam.key.lag === "number" ? 1 - 0.8 * Math.max(0, Math.min(1, cam.key.lag)) : 1;
    // Narrow frames leave less room: follow sideways faster.
    [cam.x, cam.vx] = spring(cam.x, cam.vx, d.x, videoDt, (cam.W < cam.H ? CAMERA.omega * 1.6 : CAMERA.omega) * lag);
    // Zoom out quickly (keep jumps and launches in frame), zoom back in gently.
    [cam.zoom, cam.vz] = spring(cam.zoom, cam.vz, d.zoom, videoDt, (d.zoom < cam.zoom ? CAMERA.omega * 2 : CAMERA.omega) * lag);
  }
  cam.zoom = Math.max(ZOOM_MIN, Math.min(d.maxZoom ?? ZOOM_MAX * 1.2, cam.zoom));

  let punch = 1;
  cam.punches = cam.punches.filter((p) => videoT - p.t0 < p.dur);
  for (const p of cam.punches) punch *= 1 + p.amount * Math.sin(Math.PI * ((videoT - p.t0) / p.dur));
  const zoom = cam.zoom * punch;

  const half = cam.W / (2 * zoom);
  const x = cam.stageWidth <= 2 * half ? cam.stageWidth / 2 : Math.max(half, Math.min(cam.stageWidth - half, cam.x));
  const ground = cam.groundY - (cam.H * cam.gsr - cam.H / 2) / zoom;
  let y = d.y ?? ground;
  // Story shots (close-ups) lift the frame off the ground line smoothly; v1 keys never set yOff.
  if (d.smoothY || cam.yOff) {
    const want = d.smoothY ? d.y - ground : 0;
    if (snapped) [cam.yOff, cam.vyOff] = [want, 0];
    else [cam.yOff, cam.vyOff] = spring(cam.yOff ?? 0, cam.vyOff ?? 0, want, videoDt);
    if (!d.smoothY && Math.abs(cam.yOff) < 0.5) cam.yOff = 0;
    y = (d.smoothY ? ground : y) + cam.yOff;
  }

  let sx = 0;
  let sy = 0;
  cam.shakes = cam.shakes.filter((s) => fxT - s.t0 < s.dur);
  for (const s of cam.shakes) {
    const k = (1 - (fxT - s.t0) / s.dur) ** 2;
    sx += s.amp * k * cam.noiseX(fxT * 30);
    sy += s.amp * k * cam.noiseY(fxT * 30 + 100);
  }
  cam.state = { x, y, zoom, shakeX: sx / zoom, shakeY: sy / zoom };
  return cam.state;
}

export function cameraState(cam) {
  return cam.state;
}

/** World → screen for a camera state (used by the renderer for screen-space overlays). */
export function toScreen(state, W, H, p) {
  return { x: W / 2 + (p.x - state.x + state.shakeX) * state.zoom, y: H / 2 + (p.y - state.y + state.shakeY) * state.zoom };
}
