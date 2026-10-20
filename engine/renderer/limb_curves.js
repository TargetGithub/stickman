// Rubber-hose limbs (ENGINE_V3_SPEC 5.7, ADR-034). Draw-time only: arms and legs of v3 scenes drawn as smooth
// curves through the elbow and knee instead of two straight bones. The joints (stored, followed through,
// stretched, turned) are where they always were; only the line between them changes, so reach, hits and
// the frame store never see it.
// - straight: the v1/v2 polyline, returned unchanged (same points, so straight limbs draw exactly as before);
// - bendy: one quadratic curve that passes through the elbow or knee (a soft joint, the same silhouette);
// - rubber: a noodle that bows past the joint (1.45x the bend) and never goes quite straight (a small bow
//   in the bend's direction), the classic 1930s look; with the stretch channel (motion_fx.js limbStretch).
// The curve is returned as a sampled polyline, so outlines, V3.3 shading bands (which offset polylines) and
// cast shadows follow the curve with no changes of their own. Pure functions.

export const LIMB_STYLES = Object.freeze(["straight", "bendy", "rubber"]);

const STYLES = {
  bendy: { bow: 1, min: 0, samples: 10 },
  rubber: { bow: 1.45, min: 0.07, samples: 12 },
};

/** A known limb style, else "straight". */
export const limbStyleOf = (s) => (STYLES[s] ? s : "straight");

/**
 * The quadratic control point of a limb a → b → c in a style, or null for straight.
 * bendy: the curve passes through b at t = 0.5 (control 2b - (a + c) / 2).
 * rubber: the bend (b's offset from the chord's middle) is scaled by bow, and at least min x chord length.
 * @param {{x,y}} a root (shoulder or hip) @param {{x,y}} b joint (elbow or knee) @param {{x,y}} c end (hand or foot)
 */
export function limbControl(a, b, c, style) {
  const st = STYLES[style];
  if (!st) return null;
  const m = { x: (a.x + c.x) / 2, y: (a.y + c.y) / 2 };
  let dx = (b.x - m.x) * st.bow;
  let dy = (b.y - m.y) * st.bow;
  if (st.min > 0) {
    const cx = c.x - a.x;
    const cy = c.y - a.y;
    const len = Math.hypot(cx, cy);
    if (len > 1e-6) {
      // The bend across the chord, kept at least min x len on the side the joint already bends to.
      const n = { x: -cy / len, y: cx / len };
      const across = dx * n.x + dy * n.y;
      const want = st.min * len;
      if (Math.abs(across) < want && Math.abs(across) > 1e-9) {
        const add = Math.sign(across) * want - across;
        dx += n.x * add;
        dy += n.y * add;
      }
    }
  }
  return { x: m.x + 2 * dx, y: m.y + 2 * dy };
}

/**
 * The points to stroke for a limb chain [a, b, c] in a style: the chain itself when straight (or not a
 * three-point chain), else the sampled quadratic from a to c.
 */
export function limbLine(pts, style) {
  if (pts.length !== 3 || !STYLES[style]) return pts;
  const [a, b, c] = pts;
  const p = limbControl(a, b, c, style);
  const n = STYLES[style].samples;
  const out = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const u = 1 - t;
    out.push({ x: u * u * a.x + 2 * u * t * p.x + t * t * c.x, y: u * u * a.y + 2 * u * t * p.y + t * t * c.y });
  }
  return out;
}

/**
 * A straight two-point leg (a quadruped's front view) bowed outward for rubber limbs: side +1 bows right, -1 left.
 * Other styles return the two points.
 */
export function bowedLeg(top, bottom, style, side) {
  if (style !== "rubber") return [top, bottom];
  const len = Math.hypot(bottom.x - top.x, bottom.y - top.y);
  const mid = { x: (top.x + bottom.x) / 2 + side * len * STYLES.rubber.min * 1.5, y: (top.y + bottom.y) / 2 };
  return limbLine([top, mid, bottom], "bendy");
}
