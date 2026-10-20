// Drawing the v3 lens (ENGINE_V3_SPEC 5.3, ADR-025). Milestone: V3.4.
// - A frame context: the renderer sets absolute transforms (setTransform) everywhere, so tilt and roll are a
//   base matrix composed into every setTransform call, like web/lib/scaled_ctx.js does for thumbnails.
// - Depth of field: nodes are drawn into a scratch canvas per blur level and composited with a canvas blur
//   filter; the background is blurred over its own sharp copy, so the frame edges never show a fringe. Wide
//   blurs are made on a 2x or 4x smaller copy and scaled back up (V3.9), which is ~4-16x cheaper.
// - Vignette and letterbox are screen-space passes after the world.

const mul = (A, B) => [
  A[0] * B[0] + A[2] * B[1], A[1] * B[0] + A[3] * B[1],
  A[0] * B[2] + A[2] * B[3], A[1] * B[2] + A[3] * B[3],
  A[0] * B[4] + A[2] * B[5] + A[4], A[1] * B[4] + A[3] * B[5] + A[5],
];

/** The base matrix for a roll (radians) and a tilt shift (px), about the frame centre, scaled to cover. */
export function lensMatrix(W, H, roll, tiltPx, cover) {
  const c = Math.cos(roll) * cover;
  const s = Math.sin(roll) * cover;
  const cx = W / 2;
  const cy = H / 2;
  // translate(c) · rotate·scale · translate(-c) · translate(0, tilt)
  return [c, s, -s, c, cx - c * cx + s * cy + -s * tiltPx, cy - s * cx - c * cy + c * tiltPx];
}

/**
 * A context whose setTransform/resetTransform compose with a base matrix. Everything else passes through.
 * @param {CanvasRenderingContext2D} ctx  @param {number[]} B  [a, b, c, d, e, f]
 */
export function framedContext(ctx, B) {
  const set = (m) => {
    const r = mul(B, m);
    ctx.setTransform(r[0], r[1], r[2], r[3], r[4], r[5]);
  };
  const wrapped = new Proxy(ctx, {
    get(t, p) {
      if (p === "setTransform") return (a, b, c, d, e, f) => (typeof a === "object" ? set([a.a, a.b, a.c, a.d, a.e, a.f]) : set([a, b, c, d, e, f]));
      if (p === "resetTransform") return () => set([1, 0, 0, 1, 0, 0]);
      if (p === "__real") return t;
      const v = t[p];
      return typeof v === "function" ? v.bind(t) : v;
    },
    set(t, p, v) {
      t[p] = v;
      return true;
    },
  });
  wrapped.resetTransform();
  return wrapped;
}

const realOf = (ctx) => ctx.__real || ctx;

/** The renderer's scratch canvas for depth of field (null without a host canvas factory). */
export function dofScratch(r) {
  if (!r.createCanvas) return null;
  if (!r.dof || r.dof.canvas.width !== r.W || r.dof.canvas.height !== r.H) {
    const canvas = r.createCanvas(r.W, r.H);
    r.dof = { canvas, ctx: canvas.getContext("2d") };
  }
  return r.dof;
}

/**
 * The downsampling factor for a blur of px frame pixels (V3.9): a blur this wide hides the lost detail, and the
 * canvas blur costs about pixels times radius, so a 2x smaller copy is ~4x cheaper to blur.
 */
export const blurDownscale = (px) => (px >= 6 ? 4 : px >= 1.2 ? 2 : 1);

/** A screen rect { x0, y0, x1, y1 } grown by m px and clamped to the frame, in whole pixels (null: empty). */
export function padRect(rect, m, W, H) {
  const x0 = Math.max(0, Math.floor(rect.x0 - m));
  const y0 = Math.max(0, Math.floor(rect.y0 - m));
  const x1 = Math.min(W, Math.ceil(rect.x1 + m));
  const y1 = Math.min(H, Math.ceil(rect.y1 + m));
  return x1 > x0 && y1 > y0 ? { x0, y0, x1, y1 } : null;
}

/** The union of two rects (either may be null). */
export const unionRect = (a, b) => (!a ? b : !b ? a : { x0: Math.min(a.x0, b.x0), y0: Math.min(a.y0, b.y0), x1: Math.max(a.x1, b.x1), y1: Math.max(a.y1, b.y1) });

/**
 * Draw the rect of the scratch canvas onto the frame through a blur of px frame pixels (and the frame's own filter,
 * if any). Wide blurs are made on a smaller copy and scaled back up.
 */
function compositeBlurred(real, r, s, px, frameFilter, rect) {
  const d = blurDownscale(px);
  // Snapped to the downsampling grid, so a region blurs exactly as the whole frame would there.
  const q = { x0: rect.x0 - (rect.x0 % d), y0: rect.y0 - (rect.y0 % d), x1: Math.min(r.W, rect.x1 + ((d - (rect.x1 % d)) % d)), y1: Math.min(r.H, rect.y1 + ((d - (rect.y1 % d)) % d)) };
  const w = q.x1 - q.x0;
  const h = q.y1 - q.y0;
  real.save();
  real.setTransform(1, 0, 0, 1, 0, 0);
  if (d === 1) {
    real.filter = `${frameFilter}blur(${px.toFixed(2)}px)`;
    real.drawImage(s.canvas, q.x0, q.y0, w, h, q.x0, q.y0, w, h);
  } else {
    const sw = Math.ceil(r.W / d);
    const sh = Math.ceil(r.H / d);
    if (!s.small || s.small.canvas.width !== sw || s.small.canvas.height !== sh) {
      const canvas = r.createCanvas(sw, sh);
      s.small = { canvas, ctx: canvas.getContext("2d") };
    }
    const sm = s.small.ctx;
    const tw = Math.ceil(w / d);
    const th = Math.ceil(h / d);
    sm.setTransform(1, 0, 0, 1, 0, 0);
    sm.filter = "none";
    sm.clearRect(0, 0, tw + 2, th + 2);
    sm.filter = `blur(${(px / d).toFixed(2)}px)`;
    sm.drawImage(s.canvas, q.x0, q.y0, w, h, 0, 0, tw, th);
    sm.filter = "none";
    real.filter = frameFilter ? frameFilter.trim() : "none";
    real.imageSmoothingEnabled = true;
    real.drawImage(s.small.canvas, 0, 0, tw, th, q.x0, q.y0, tw * d, th * d);
  }
  real.restore();
}

const FULL = (r) => ({ x0: 0, y0: 0, x1: r.W, y1: r.H });

/** Blur what is already on the frame (the background) by px, over its sharp copy. */
export function blurFrame(ctx, r, px) {
  const s = dofScratch(r);
  if (!s || px <= 0) return;
  const real = realOf(ctx);
  const sc = s.ctx;
  sc.setTransform(1, 0, 0, 1, 0, 0);
  sc.clearRect(0, 0, r.W, r.H);
  sc.drawImage(real.canvas, 0, 0);
  s.dirty = FULL(r);
  compositeBlurred(real, r, s, (px * r.H) / 1080, "", FULL(r));
}

/**
 * A blur layer: begin() returns a context to draw the nodes into (with the frame's current transform);
 * end() composites them onto the frame with the blur. Without a scratch canvas it draws straight to the frame.
 * add(rect) says where the next node draws (screen px; null: anywhere): only the union of these rects is
 * cleared, blurred and composited (V3.9), so a far character out of focus costs its own size, not the frame's.
 */
export function blurLayer(ctx, r, px) {
  const s = dofScratch(r);
  if (!s || px <= 0) return { ctx, add() {}, end() {} };
  const real = realOf(ctx);
  const m = real.getTransform();
  const sc = s.ctx;
  sc.setTransform(1, 0, 0, 1, 0, 0);
  if (s.dirty) sc.clearRect(s.dirty.x0, s.dirty.y0, s.dirty.x1 - s.dirty.x0, s.dirty.y1 - s.dirty.y0);
  s.dirty = null;
  sc.setTransform(m.a, m.b, m.c, m.d, m.e, m.f);
  sc.filter = "none"; // the frame's own filter (a grade) is applied once, when the layer is composited
  sc.globalAlpha = 1;
  const blur = (px * r.H) / 1080;
  let area = null;
  return {
    ctx: sc,
    add(rect) {
      area = unionRect(area, rect ? padRect(rect, 0, r.W, r.H) : FULL(r));
    },
    end() {
      // add() before every node: an unannounced layer is the whole frame.
      const q = padRect(area || FULL(r), Math.ceil(blur * 3) + 2, r.W, r.H);
      s.dirty = q;
      if (!q) return;
      const f = real.filter && real.filter !== "none" ? `${real.filter} ` : "";
      compositeBlurred(real, r, s, blur, f, q);
    },
  };
}

/** Darkened corners (screen space). */
export function drawVignette(ctx, W, H, amount) {
  if (amount <= 0.01) return;
  const real = realOf(ctx);
  real.save();
  real.setTransform(1, 0, 0, 1, 0, 0);
  const r = Math.hypot(W, H) / 2;
  const g = real.createRadialGradient(W / 2, H / 2, r * 0.45, W / 2, H / 2, r);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, `rgba(0,0,0,${(0.6 * Math.min(1, amount)).toFixed(3)})`);
  real.fillStyle = g;
  real.fillRect(0, 0, W, H);
  real.restore();
}

/** Black bars at the top and bottom (screen space), bar px each. */
export function drawLetterbox(ctx, W, H, bar) {
  if (bar <= 0.5) return;
  const real = realOf(ctx);
  real.save();
  real.setTransform(1, 0, 0, 1, 0, 0);
  real.fillStyle = "#000000";
  real.fillRect(0, 0, W, bar);
  real.fillRect(0, H - bar, W, bar);
  real.restore();
}
