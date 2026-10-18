// A 2D context that draws everything scaled by s, so a full-size engine frame can render straight into a
// small canvas (showcase thumbnails). The renderer sets absolute transforms, so setTransform is scaled too.
// (ox, oy) crops: the canvas shows the frame from that point on (a face close-up).

/**
 * @param {CanvasRenderingContext2D} ctx  the small canvas's context
 * @param {number} s  canvas px per frame px
 * @param {number} [ox]  frame px at the canvas's left edge
 * @param {number} [oy]  frame px at the canvas's top edge
 */
export function scaledContext(ctx, s, ox = 0, oy = 0) {
  const wrapped = new Proxy(ctx, {
    get(t, p) {
      if (p === "setTransform") return (a, b, c, d, e, f) => t.setTransform(a * s, b * s, c * s, d * s, (e - ox) * s, (f - oy) * s);
      if (p === "resetTransform") return () => t.setTransform(s, 0, 0, s, -ox * s, -oy * s);
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
