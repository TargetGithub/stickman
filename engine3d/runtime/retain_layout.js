// The retention kit's screen layout (ENGINE_RETENTION_KIT.md): where the HUD pieces go, how big a tracker is, the
// badge icon list and which side a keyword badge takes. Units are HUD units (the frame is 16 × 9, (0, 0) at its
// centre, y up). Shared by the director, the validator and the page builders. Pure: no three.js, no clocks.

/** The kit's object kinds (catalog/kinds.json). */
export const RETAIN_KINDS = ["timer_ring", "tracker", "badge"];
/** Icons a badge can draw (retain_icons.js), with the colour and sound each uses by default. */
export const ICONS = {
  ear: { color: "orange", sound: "listen_cue" }, hand: { color: "blue", sound: "listen_cue" }, mouth: { color: "pink", sound: "listen_cue" },
  eye: { color: "teal", sound: "pop" }, question: { color: "purple", sound: "pop" }, star: { color: "gold", sound: "sparkle" },
  check: { color: "green", sound: "ding" }, heart: { color: "red", sound: "pop" }, drop: { color: "blue", sound: "splash" },
  sun: { color: "orange", sound: "sparkle" }, leaf: { color: "green", sound: "pop" }, apple: { color: "red", sound: "pop" },
  music: { color: "purple", sound: "ding" }, home: { color: "brown", sound: "pop" }, moon: { color: "midnight", sound: "crystal_chime" },
  snow: { color: "sky", sound: "crystal_chime" },
};
/** Cues a call-and-response pause can show. */
export const CUES = ["ear", "hand", "mouth", "eye", "question"];
export const TRACKER_STYLES = ["train", "checklist", "stars", "path", "islands", "town", "gauges", "pencil", "rainbow"];
export const TRACKER_CORNERS = ["top_left", "top_right", "top"];

/** Fixed screen spots (HUD units). */
export const SPOTS = {
  timer: [6.7, 3.15, 0],
  cue: [0, 3.15, 0],
  keyword: { left: [[-6.5, 1.3, 0], [-6.5, -0.2, 0]], right: [[6.5, 1.3, 0], [6.5, -0.2, 0]] },
};
/** Diameter of a size-1 badge and timer ring (HUD units). */
export const BADGE_D = 1.3;
export const TIMER_D = 1.5;
/** The tracker band: trackers are fitted inside it (top-left by default; top_right mirrors it, top centres it). */
export const BAND = { width: 6.2, height: 1.2, left: -7.6, top: 4.25 };
/** Below this line (HUD y) live the captions; nothing in the kit goes there. */
export const CAPTION_TOP = -2.5;

const CAR = 0.82, GAP = 0.1, ENGINE = 1.12, ROW = 0.5, STAR = 0.72, DOT = 0.9;

/**
 * A tracker's slot layout in its own units (before the fit): slot centres from its anchor (the left end of the
 * row for a train, stars and path; the card's top-left corner for a checklist), its size and the engine's spot.
 * Slot i (0-based) of n = slots (+1 with a surprise, which is always last).
 * @returns {{ slots: number[][], width: number, height: number, engine?: number[] }}
 */
export function trackerLayout(o) {
  const n = (o.slots ?? 1) + (o.surprise ? 1 : 0);
  const style = o.style ?? "train";
  if (style === "train") {
    const slots = Array.from({ length: n }, (_, i) => [ENGINE + GAP + CAR / 2 + i * (CAR + GAP), -0.02, 0]);
    return { slots, width: ENGINE + n * (CAR + GAP), height: 0.95, engine: [ENGINE / 2, 0.02, 0] };
  }
  if (style === "checklist") {
    const width = 3.3;
    const slots = Array.from({ length: n }, (_, i) => [0.4, -0.38 - i * ROW, 0]);
    return { slots, width, height: 0.26 + n * ROW };
  }
  if (style === "rainbow") {
    // All bands share one centre; the arch is 2.3 wide (2.9 with the surprise sun) and 1.2 tall.
    const slots = Array.from({ length: n }, () => [1.15, -0.55, 0]);
    return { slots, width: o.surprise ? 2.9 : 2.3, height: 1.25 };
  }
  if (style === "gauges") {
    const slots = Array.from({ length: n }, (_, i) => [0.4 + i * 0.86, 0, 0]);
    return { slots, width: n * 0.86 - 0.06, height: 1.0 };
  }
  if (style === "pencil") {
    const slots = Array.from({ length: n }, (_, i) => [0.12, -0.3 - i * 0.26, 0]);
    return { slots, width: 1.5, height: 0.36 + n * 0.26 };
  }
  if (style === "stars") {
    const slots = Array.from({ length: n }, (_, i) => [STAR / 2 + i * (STAR + 0.1), 0, 0]);
    return { slots, width: n * (STAR + 0.1) - 0.1, height: STAR };
  }
  const slots = Array.from({ length: n }, (_, i) => [0.35 + i * DOT, 0.18 * Math.sin(i * 1.3), 0]);
  return { slots, width: 0.7 + (n - 1) * DOT, height: 1.1 };
}

/** How much a tracker shrinks to fit the band (its size times the fit), and its default anchor for a corner. */
export function trackerFit(o) {
  const L = trackerLayout(o);
  const vertical = ["checklist", "pencil"].includes(o.style ?? "train");
  const fit = vertical ? Math.min(1, (BAND.top - 0.4 - 0.3) / L.height) : Math.min(1, BAND.width / L.width, BAND.height / L.height);
  const k = (o.size ?? 1) * fit;
  const corner = o.corner ?? "top_left";
  const y = vertical ? BAND.top - 0.1 : BAND.top - BAND.height / 2;
  const x = corner === "top_left" ? BAND.left : corner === "top_right" ? -BAND.left - L.width * k : (-L.width * k) / 2;
  return { k, anchor: [x, y, 0], layout: L };
}

/** The screen rectangle a tracker covers ({ x0, x1, y0, y1 } in HUD units), at its at and fit. */
export function trackerRect(o, at) {
  const { k, anchor, layout } = trackerFit(o);
  const [x, y] = at ?? o.at ?? anchor;
  const vertical = ["checklist", "pencil"].includes(o.style ?? "train");
  return vertical
    ? { x0: x, x1: x + layout.width * k, y0: y - layout.height * k, y1: y }
    : { x0: x, x1: x + layout.width * k, y0: y - (layout.height * k) / 2 - 0.15, y1: y + (layout.height * k) / 2 + 0.15 };
}

/** Where a world point shows on screen at camera { position, lookAt, fov }: x and y in -1..1 (NDC, 16:9), z > 0 in front. */
export function projectPoint(p, cam, aspect = 16 / 9) {
  const f = norm(sub(cam.lookAt, cam.position));
  let r = cross(f, [0, 1, 0]);
  if (Math.hypot(...r) < 1e-6) r = [1, 0, 0];
  r = norm(r);
  const u = cross(r, f);
  const q = sub(p, cam.position);
  const z = dot(q, f);
  const tan = Math.tan(((cam.fov ?? 40) * Math.PI) / 360);
  return { x: dot(q, r) / (Math.max(z, 1e-3) * tan * aspect), y: dot(q, u) / (Math.max(z, 1e-3) * tan), z };
}

/**
 * The side a keyword badge takes: away from the point to keep clear (on screen), skipping sides a tracker or
 * another badge already uses. busy: rectangles ({ x0, x1, y0, y1 }) on screen then.
 * @returns {number[]}  the spot (HUD [x, y, z])
 */
export function keywordSpot({ side = "auto", avoidX = 0, busy = [] }) {
  const order = side === "left" ? ["left", "right"] : side === "right" ? ["right", "left"] : avoidX > 0.05 ? ["left", "right"] : ["right", "left"];
  const half = BADGE_D / 2 + 0.1;
  const free = (s) => !busy.some((b) => s[0] + half > b.x0 && s[0] - half < b.x1 && s[1] + half > b.y0 && s[1] - half < b.y1);
  for (const name of order) for (const s of SPOTS.keyword[name]) if (free(s)) return [...s];
  return [...SPOTS.keyword[order[0]][0]];
}

/** A badge's screen rectangle at spot s and size k. */
export const badgeRect = (s, k = 1) => ({ x0: s[0] - (BADGE_D * k) / 2, x1: s[0] + (BADGE_D * k) / 2, y0: s[1] - (BADGE_D * k) / 2, y1: s[1] + (BADGE_D * k) / 2 });

/** Where a word sits in a line, as a share of its spoken length (0-1): the middle of its first whole-word match. */
export function wordShare(text, word) {
  const m = new RegExp(`(^|[^\\p{L}\\p{N}])(${escape(word)})(?=$|[^\\p{L}\\p{N}])`, "iu").exec(text);
  if (!m) return null;
  const start = m.index + m[1].length;
  return Math.max(0, Math.min(1, (start + 0.25 * word.length) / Math.max(1, text.length)));
}

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const sub = (a, b) => a.map((x, i) => x - b[i]);
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (v) => {
  const l = Math.hypot(...v) || 1;
  return v.map((x) => x / l);
};
