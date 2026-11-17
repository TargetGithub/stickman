// Keyframe sampling for Lottie3D (SPEC.md section 5). Pure functions of (document, time): no Three.js,
// no clocks, no randomness, so the same t always gives the same frame (in Node and in the browser).

const c1 = 1.70158;
const c3 = c1 + 1;

function bounceOut(u) {
  const n = 7.5625;
  const d = 2.75;
  if (u < 1 / d) return n * u * u;
  if (u < 2 / d) return n * (u -= 1.5 / d) * u + 0.75;
  if (u < 2.5 / d) return n * (u -= 2.25 / d) * u + 0.9375;
  return n * (u -= 2.625 / d) * u + 0.984375;
}

/** @type {Record<string, (u: number) => number>} */
export const EASES = {
  linear: (u) => u,
  step: (u) => (u < 1 ? 0 : 1),
  quadIn: (u) => u * u,
  quadOut: (u) => 1 - (1 - u) * (1 - u),
  quadInOut: (u) => (u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2),
  cubicIn: (u) => u * u * u,
  cubicOut: (u) => 1 - (1 - u) ** 3,
  cubicInOut: (u) => (u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2),
  sineIn: (u) => 1 - Math.cos((Math.PI * u) / 2),
  sineOut: (u) => Math.sin((Math.PI * u) / 2),
  sineInOut: (u) => -(Math.cos(Math.PI * u) - 1) / 2,
  backIn: (u) => c3 * u * u * u - c1 * u * u,
  backOut: (u) => 1 + c3 * (u - 1) ** 3 + c1 * (u - 1) ** 2,
  elasticOut: (u) => (u === 0 || u === 1 ? u : 2 ** (-10 * u) * Math.sin((u * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1),
  bounceOut,
};

export const EASE_NAMES = Object.keys(EASES);

/** CSS-style cubic-bezier easing. Fixed iteration counts keep it deterministic. */
export function cubicBezier(x1, y1, x2, y2) {
  const coord = (s, a, b) => 3 * a * s * (1 - s) ** 2 + 3 * b * s * s * (1 - s) + s * s * s;
  const slope = (s, a, b) => 3 * a * (1 - s) ** 2 + 6 * (b - a) * s * (1 - s) + 3 * (1 - b) * s * s;
  return (u) => {
    if (u <= 0) return 0;
    if (u >= 1) return 1;
    let s = u;
    for (let i = 0; i < 8; i++) {
      const d = slope(s, x1, x2);
      if (Math.abs(d) < 1e-6) break;
      s -= (coord(s, x1, x2) - u) / d;
    }
    if (!(s >= 0 && s <= 1) || Math.abs(coord(s, x1, x2) - u) > 1e-5) {
      let lo = 0;
      let hi = 1;
      for (let i = 0; i < 40; i++) {
        s = (lo + hi) / 2;
        if (coord(s, x1, x2) < u) lo = s;
        else hi = s;
      }
    }
    return coord(s, y1, y2);
  };
}

/** @param {string | number[] | undefined} ease */
export function easeFn(ease) {
  if (ease === undefined) return EASES.linear;
  if (Array.isArray(ease)) return cubicBezier(ease[0], ease[1], ease[2], ease[3]);
  return EASES[ease] || EASES.linear;
}

const lerp = (a, b, e) => (Array.isArray(a) ? a.map((x, i) => x + (b[i] - x) * e) : a + (b - a) * e);
const copy = (v) => (Array.isArray(v) ? v.slice() : v);

/**
 * Sample one track at time t.
 * @param {Array<{t:number, v:number|number[], ease?:string|number[]}> | {keys: any[], repeat?: boolean}} track
 * @param {number} t
 */
export function sampleTrack(track, t) {
  const keys = Array.isArray(track) ? track : track.keys;
  if (!Array.isArray(track) && track.repeat) {
    const period = keys[keys.length - 1].t;
    t = ((t % period) + period) % period;
  }
  if (t <= keys[0].t) return copy(keys[0].v);
  const last = keys[keys.length - 1];
  if (t >= last.t) return copy(last.v);
  let i = 0;
  while (keys[i + 1].t <= t) i++;
  const a = keys[i];
  const b = keys[i + 1];
  const u = (t - a.t) / (b.t - a.t);
  return lerp(a.v, b.v, easeFn(a.ease)(u));
}

/** Map a clock time (seconds since play started) to document time, snapped to whole frames. */
export function docTime(doc, clock) {
  const d = doc.duration;
  const loop = doc.loop !== false;
  let t = loop ? ((clock % d) + d) % d : Math.min(Math.max(clock, 0), d);
  t = Math.floor(t * doc.fps + 1e-9) / doc.fps;
  return Math.min(t, d);
}

const add3 = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

/**
 * Everything the renderer needs for one frame. Pure: no Three.js objects.
 * @returns {{ t: number, camera: {position:number[], target:number[], fov:number},
 *   characters: Array<{id:string, position:number[], yaw:number, scale:number, joints: Record<string, number[]>}>,
 *   props: Array<{id:string, position:number[], rotation:number[], scale:number[]}> }}
 */
export function evaluate(doc, t) {
  const cam = doc.scene.camera;
  const ct = cam.tracks || {};
  const camera = {
    position: ct.position ? sampleTrack(ct.position, t) : cam.position.slice(),
    target: ct.target ? sampleTrack(ct.target, t) : (cam.target || [0, 1, 0]).slice(),
    fov: ct.fov ? sampleTrack(ct.fov, t) : cam.fov ?? 40,
  };
  const characters = (doc.characters || []).map((c) => {
    const tracks = c.tracks || {};
    const base = c.position || [0, 0, 0];
    const joints = {};
    for (const name of Object.keys(tracks).sort()) {
      if (name !== "position") joints[name] = sampleTrack(tracks[name], t);
    }
    return {
      id: c.id,
      position: tracks.position ? add3(base, sampleTrack(tracks.position, t)) : base.slice(),
      yaw: c.yaw ?? 0,
      scale: c.scale ?? 1,
      joints,
    };
  });
  const props = (doc.props || []).map((p) => {
    const tr = p.tracks || {};
    return {
      id: p.id,
      position: tr.position ? sampleTrack(tr.position, t) : (p.position || [0, 0, 0]).slice(),
      rotation: tr.rotation ? sampleTrack(tr.rotation, t) : (p.rotation || [0, 0, 0]).slice(),
      scale: tr.scale ? sampleTrack(tr.scale, t) : [1, 1, 1],
    };
  });
  return { t, camera, characters, props };
}
