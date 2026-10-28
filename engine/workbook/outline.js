// Outlines for dot-to-dot (WORKBOOK_SPEC 5): a shape's edge as a dense closed polyline (unit box, y down), then
// resampled to n dots at even arc length that keeps every corner, numbered clockwise from the top.

import { cornerPoints } from "./shape_facts.js";
import { regularPoints, starPoints } from "../renderer/shapes_draw.js";

const RAD = Math.PI / 180;
const SEG = 48; // samples per curve

const ellipse = (rx, ry, a0, a1, n = SEG) => Array.from({ length: n + 1 }, (_, i) => {
  const a = (a0 + ((a1 - a0) * i) / n) * RAD;
  return [rx * Math.cos(a), ry * Math.sin(a)];
});

/** Straight edges split into steps, so dots can fall between corners; the corners stay exact. */
const dense = (pts, n = SEG / 2) => pts.flatMap(([x, y], i) => {
  const [nx, ny] = pts[(i + 1) % pts.length];
  return Array.from({ length: n }, (_, k) => (k ? [x + ((nx - x) * k) / n, y + ((ny - y) * k) / n] : [x, y]));
});

/** A dense closed outline of a shape geometry (rings use their outer edge). */
export function outlineOf(g) {
  switch (g.kind) {
    case "regular": return dense(regularPoints(g.sides));
    case "polygon": return dense(g.points);
    case "star": return dense(starPoints(g.points, g.inner));
    case "ellipse": return ellipse(g.rx, g.ry, -90, 270).slice(0, -1);
    case "ring": return ellipse(1, 1, -90, 270).slice(0, -1);
    case "sector": return dense([[0, 0], ...ellipse(1, 1, g.from, g.to)], 6);
    case "crescent": {
      // As renderer/shapes_draw.js draws it: the outer arc round the left from the top tip to the bottom tip,
      // then the inner arc back.
      const [[x, ty]] = cornerPoints(g);
      const t1 = Math.atan2(ty, x) / RAD;
      const a0 = Math.atan2(-ty, x - g.offset) / RAD;
      const outer = ellipse(1, 1, t1, -360 - t1);
      const inner = ellipse(g.inner, g.inner, a0, 360 - a0).map(([px, py]) => [px + g.offset, py]);
      return [...outer, ...inner.slice(1, -1)];
    }
    case "path": {
      const out = [];
      let p = [0, 0];
      for (const c of g.d) {
        if (c[0] === "M" || c[0] === "L") out.push((p = [c[1], c[2]]));
        else if (c[0] === "C") {
          for (let i = 1; i <= SEG / 4; i++) {
            const t = i / (SEG / 4);
            const u = 1 - t;
            out.push([u * u * u * p[0] + 3 * u * u * t * c[1] + 3 * u * t * t * c[3] + t * t * t * c[5], u * u * u * p[1] + 3 * u * u * t * c[2] + 3 * u * t * t * c[4] + t * t * t * c[6]]);
          }
          p = [c[5], c[6]];
        }
      }
      const [a, b] = [out[0], out[out.length - 1]];
      return Math.hypot(a[0] - b[0], a[1] - b[1]) < 1e-6 ? out.slice(0, -1) : out;
    }
  }
  return [];
}

/** Clockwise on screen (y down) from the topmost point (leftmost of ties). */
export function clockwiseFromTop(pts) {
  const area = pts.reduce((s, [x, y], i) => {
    const [nx, ny] = pts[(i + 1) % pts.length];
    return s + x * ny - nx * y;
  }, 0);
  const cw = area >= 0 ? pts : [...pts].reverse();
  let top = 0;
  cw.forEach(([x, y], i) => {
    const [tx, ty] = cw[top];
    if (y < ty - 1e-9 || (Math.abs(y - ty) < 1e-9 && x < tx)) top = i;
  });
  return [...cw.slice(top), ...cw.slice(0, top)];
}

/**
 * n dots along a closed outline: every corner kept, the other dots shared out over the edges between corners in
 * proportion to their length (largest remainder) and spaced evenly along each edge.
 * @param {number[][]} pts  dense outline;  @param {number[][]} corners  points that must be dots
 */
export function resample(pts, n, corners = []) {
  const m = pts.length;
  const step = pts.map((p, i) => Math.hypot(pts[(i + 1) % m][0] - p[0], pts[(i + 1) % m][1] - p[1]));
  const pos = [0];
  for (let i = 1; i <= m; i++) pos.push(pos[i - 1] + step[i - 1]);
  const total = pos[m];
  let keep = pts.map((_, i) => i).filter((i) => corners.some(([cx, cy]) => Math.hypot(cx - pts[i][0], cy - pts[i][1]) < 1e-6));
  if (!keep.length) keep = [0]; // round shapes: start anywhere, the caller turns the list to the top
  const extra = Math.max(0, n - keep.length);
  const edges = keep.map((a, k) => {
    const b = keep[(k + 1) % keep.length];
    const len = b > a ? pos[b] - pos[a] : total - pos[a] + pos[b];
    return { a, len };
  });
  const share = edges.map((e) => (extra * e.len) / total);
  const count = share.map(Math.floor);
  const left = extra - count.reduce((x, y) => x + y, 0);
  share.map((v, i) => [v - Math.floor(v), i]).sort((x, y) => y[0] - x[0] || x[1] - y[1]).slice(0, left).forEach(([, i]) => count[i]++);
  const nearest = (d) => {
    const want = d % total;
    let best = 0;
    for (let i = 0; i < m; i++) if (Math.abs(pos[i] - want) < Math.abs(pos[best] - want)) best = i;
    return best;
  };
  const out = [];
  edges.forEach((e, k) => {
    out.push(e.a);
    for (let j = 1; j <= count[k]; j++) out.push(nearest(pos[e.a] + (e.len * j) / (count[k] + 1)));
  });
  return out.map((i) => pts[i]);
}
