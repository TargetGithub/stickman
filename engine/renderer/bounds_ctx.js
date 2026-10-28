// A 2D context that draws nothing and records the bounding box of everything drawn (WORKBOOK_SPEC 3).
// Workbook art is fitted into its box from these bounds, so catalog drawings need no size metadata.
// Arcs add their end points and the quarter-turn points they sweep; curves add their (conservative) control
// points; strokes add half the line width.

const NOOP = () => {};
const IDENTITY = [1, 0, 0, 1, 0, 0];
const mul = (m, n) => [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3], m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]];
const apply = (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
const scaleOf = (m) => Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2]));

/** @returns {{ ctx: object, bounds: () => ({ x0, y0, x1, y1 } | null) }} */
export function boundsContext() {
  let m = IDENTITY;
  let path = [];
  let box = null;
  const stack = [];
  const props = { lineWidth: 1, font: "10px sans-serif", globalAlpha: 1, canvas: { width: 4096, height: 4096 } };
  const add = (x, y, pad = 0) => {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    if (!box) box = { x0: x - pad, y0: y - pad, x1: x + pad, y1: y + pad };
    else {
      box.x0 = Math.min(box.x0, x - pad);
      box.y0 = Math.min(box.y0, y - pad);
      box.x1 = Math.max(box.x1, x + pad);
      box.y1 = Math.max(box.y1, y + pad);
    }
  };
  const pt = (x, y) => path.push(apply(m, x, y));
  const square = (cx, cy, rx, ry) => {
    pt(cx - rx, cy - ry);
    pt(cx + rx, cy - ry);
    pt(cx - rx, cy + ry);
    pt(cx + rx, cy + ry);
  };
  // An arc's end points plus every quarter-turn point it sweeps through (exact for unrotated arcs).
  const sweep = (cx, cy, rx, ry, a0 = 0, a1 = Math.PI * 2, ccw = false) => {
    const TAU = Math.PI * 2;
    let span = ccw ? a0 - a1 : a1 - a0;
    if (span >= TAU - 1e-9 || span <= -TAU + 1e-9) span = TAU;
    else span = ((span % TAU) + TAU) % TAU;
    const at = (a) => pt(cx + rx * Math.cos(a), cy + ry * Math.sin(a));
    at(a0);
    at(ccw ? a0 - span : a0 + span);
    for (let k = -8; k <= 8; k++) {
      const q = (k * Math.PI) / 2;
      const u = ccw ? a0 - q : q - a0;
      if (((u % TAU) + TAU) % TAU <= span + 1e-9) at(q);
    }
  };
  const commit = (pad) => {
    for (const [x, y] of path) add(x, y, pad);
  };
  const fontSize = () => Number(/(\d+(?:\.\d+)?)px/.exec(props.font)?.[1] ?? 10);
  const methods = {
    save: () => stack.push({ m, lineWidth: props.lineWidth, font: props.font }),
    restore: () => {
      const s = stack.pop();
      if (s) ({ m } = s), (props.lineWidth = s.lineWidth), (props.font = s.font);
    },
    translate: (x, y) => (m = mul(m, [1, 0, 0, 1, x, y])),
    scale: (x, y) => (m = mul(m, [x, 0, 0, y, 0, 0])),
    rotate: (a) => (m = mul(m, [Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a), 0, 0])),
    transform: (a, b, c, d, e, f) => (m = mul(m, [a, b, c, d, e, f])),
    setTransform: (a, b, c, d, e, f) => (m = typeof a === "object" ? [a.a, a.b, a.c, a.d, a.e, a.f] : [a, b, c, d, e, f]),
    resetTransform: () => (m = IDENTITY),
    getTransform: () => ({ a: m[0], b: m[1], c: m[2], d: m[3], e: m[4], f: m[5] }),
    beginPath: () => (path = []),
    moveTo: pt,
    lineTo: pt,
    closePath: NOOP,
    quadraticCurveTo: (x1, y1, x, y) => (pt(x1, y1), pt(x, y)),
    bezierCurveTo: (x1, y1, x2, y2, x, y) => (pt(x1, y1), pt(x2, y2), pt(x, y)),
    arcTo: (x1, y1, x2, y2) => (pt(x1, y1), pt(x2, y2)),
    arc: (x, y, r, a0, a1, ccw) => sweep(x, y, r, r, a0, a1, ccw),
    ellipse: (x, y, rx, ry, rot, a0, a1, ccw) => (rot ? square(x, y, Math.max(rx, ry), Math.max(rx, ry)) : sweep(x, y, rx, ry, a0, a1, ccw)),
    rect: (x, y, w, h) => (pt(x, y), pt(x + w, y + h), pt(x + w, y), pt(x, y + h)),
    roundRect: (x, y, w, h) => (pt(x, y), pt(x + w, y + h), pt(x + w, y), pt(x, y + h)),
    fill: () => commit(0),
    stroke: () => commit((props.lineWidth * scaleOf(m)) / 2),
    fillRect: (x, y, w, h) => [[x, y], [x + w, y], [x, y + h], [x + w, y + h]].forEach(([a, b]) => add(...apply(m, a, b))),
    strokeRect: (x, y, w, h) => [[x, y], [x + w, y], [x, y + h], [x + w, y + h]].forEach(([a, b]) => add(...apply(m, a, b), props.lineWidth / 2)),
    fillText: (text, x, y) => {
      const s = fontSize();
      [[x - text.length * s * 0.3, y - s], [x + text.length * s * 0.3, y + s * 0.25]].forEach(([a, b]) => add(...apply(m, a, b)));
    },
    measureText: (text) => ({ width: String(text).length * fontSize() * 0.55, actualBoundingBoxAscent: fontSize() * 0.75, actualBoundingBoxDescent: fontSize() * 0.2 }),
    createLinearGradient: () => ({ addColorStop: NOOP }),
    createRadialGradient: () => ({ addColorStop: NOOP }),
    createPattern: () => ({}),
    getLineDash: () => [],
    isPointInPath: () => false,
  };
  methods.strokeText = methods.fillText;
  const ctx = new Proxy(props, {
    get: (t, k) => (k in methods ? methods[k] : k in t ? t[k] : typeof k === "string" ? NOOP : undefined),
    set: (t, k, v) => ((t[k] = v), true),
  });
  return { ctx, bounds: () => box && { ...box } };
}
