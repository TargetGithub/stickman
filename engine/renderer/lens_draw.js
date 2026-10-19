// Drawing the v3 lens (ENGINE_V3_SPEC 5.3, ADR-025). Milestone: V3.4.
// - A frame context: the renderer sets absolute transforms (setTransform) everywhere, so tilt and roll are a
//   base matrix composed into every setTransform call, like web/lib/scaled_ctx.js does for thumbnails.
// - Depth of field: nodes are drawn into a scratch canvas per blur level and composited with a canvas blur
//   filter; the background is blurred over its own sharp copy, so the frame edges never show a fringe.
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

/** Blur what is already on the frame (the background) by px, over its sharp copy. */
export function blurFrame(ctx, r, px) {
  const s = dofScratch(r);
  if (!s || px <= 0) return;
  const real = realOf(ctx);
  const sc = s.ctx;
  sc.setTransform(1, 0, 0, 1, 0, 0);
  sc.clearRect(0, 0, r.W, r.H);
  sc.drawImage(real.canvas, 0, 0);
  real.save();
  real.setTransform(1, 0, 0, 1, 0, 0);
  real.filter = `blur(${(px * r.H / 1080).toFixed(2)}px)`;
  real.drawImage(s.canvas, 0, 0);
  real.restore();
}

/**
 * A blur layer: begin() returns a context to draw the nodes into (with the frame's current transform);
 * end() composites them onto the frame with the blur. Without a scratch canvas it draws straight to the frame.
 */
export function blurLayer(ctx, r, px) {
  const s = dofScratch(r);
  if (!s || px <= 0) return { ctx, end() {} };
  const real = realOf(ctx);
  const m = real.getTransform();
  const sc = s.ctx;
  sc.setTransform(1, 0, 0, 1, 0, 0);
  sc.clearRect(0, 0, r.W, r.H);
  sc.setTransform(m.a, m.b, m.c, m.d, m.e, m.f);
  sc.filter = "none"; // the frame's own filter (a grade) is applied once, when the layer is composited
  sc.globalAlpha = 1;
  return {
    ctx: sc,
    end() {
      real.save();
      real.setTransform(1, 0, 0, 1, 0, 0);
      const f = real.filter && real.filter !== "none" ? `${real.filter} ` : "";
      real.filter = `${f}blur(${(px * r.H / 1080).toFixed(2)}px)`;
      real.drawImage(s.canvas, 0, 0);
      real.restore();
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
