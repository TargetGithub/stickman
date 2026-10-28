// The line-art context (WORKBOOK_SPEC 6): a wrapper around a 2D context that turns any catalog drawing into a
// colouring outline, black lines on white, without changing the drawing code. Light fills become white and get
// a thin black outline; dark fills (pupils, mouths) stay black; the outline of a filled shape stays one black
// line; thick open strokes (limbs) become hollow tubes, and a coloured core over a dark limb rim adds nothing;
// light strokes (shines) stay white; gradient fills (glows, shading), faint layers (alpha under 0.3: shadows, glows), images, shadows and filters
// are dropped.

const DARK = 0.25; // fills darker than this stay solid black
const LIGHT = 0.85; // strokes lighter than this stay white (highlights)
const FAINT = 0.3; // alpha below this is not drawn

const NAMED = { white: [255, 255, 255, 1], black: [0, 0, 0, 1], transparent: [0, 0, 0, 0], none: [0, 0, 0, 0] };

/** [r, g, b, a] of a CSS colour (#rgb, #rgba, #rrggbb, #rrggbbaa, rgb(), rgba(), a few names); anything else is white. */
export function parseColour(c) {
  if (typeof c !== "string") return [255, 255, 255, 1];
  const s = c.trim().toLowerCase();
  if (NAMED[s]) return NAMED[s];
  if (s[0] === "#") {
    const h = s.length <= 5 ? [...s.slice(1)].map((d) => d + d).join("") : s.slice(1);
    const v = (i) => parseInt(h.slice(i, i + 2), 16);
    return [v(0), v(2), v(4), h.length >= 8 ? v(6) / 255 : 1];
  }
  const m = /rgba?\(([^)]*)\)/.exec(s);
  if (m) {
    const p = m[1].split(",").map((x) => parseFloat(x));
    return [p[0], p[1], p[2], p[3] ?? 1];
  }
  return [128, 128, 128, 1];
}

/** Relative luminance 0-1 of an [r, g, b] colour. */
export const luminance = ([r, g, b]) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

/**
 * @param {CanvasRenderingContext2D} real
 * @param {{ outline?: number, hollowMin?: number, ink?: string, paper?: string }} [opts]
 *   outline: the outline width in device units (default 1.4); hollowMin: strokes at least this wide (device units)
 *   become hollow tubes (default 5); ink and paper: the two colours (default black and white)
 */
export function lineArtContext(real, opts = {}) {
  const outline = opts.outline ?? 1.4;
  const hollowMin = opts.hollowMin ?? 5;
  const ink = opts.ink ?? "#000000";
  const paper = opts.paper ?? "#ffffff";
  let state = { fill: "#000000", stroke: "#000000", alpha: 1 };
  let filled = false; // the current path was filled (a stroke now is its outline)
  let rims = { n: 0, lw: 0 }; // dark limb rims waiting for their coloured cores (strokeGroup draws rims first)
  const stack = [];
  const scale = () => {
    const t = real.getTransform();
    return Math.sqrt(Math.abs(t.a * t.d - t.b * t.c)) || 1;
  };
  const visible = (rgba) => rgba[3] * state.alpha >= FAINT;
  const outlinePath = (args) => {
    const lw = real.lineWidth;
    const dash = real.getLineDash();
    real.lineWidth = outline / scale();
    real.setLineDash([]);
    real.strokeStyle = ink;
    real.stroke(...args.filter((a) => typeof a === "object"));
    real.lineWidth = lw;
    real.setLineDash(dash);
  };
  const methods = {
    save() {
      stack.push(state);
      state = { ...state };
      real.save();
    },
    restore() {
      state = stack.pop() || state;
      real.restore();
    },
    fill(...args) {
      if (typeof state.fill !== "string") return; // gradients and patterns are glows and shading: paper
      const c = parseColour(state.fill);
      if (!visible(c)) return;
      const dark = luminance(c) < DARK;
      real.fillStyle = dark ? ink : paper;
      real.fill(...args);
      if (!dark) outlinePath(args);
      filled = true;
      rims.n = 0;
    },
    beginPath() {
      filled = false;
      real.beginPath();
    },
    stroke(...args) {
      const c = parseColour(state.stroke);
      if (!visible(c)) return;
      if (luminance(c) > LIGHT) {
        real.strokeStyle = paper;
        real.stroke(...args);
        return;
      }
      const lw = real.lineWidth;
      const s = scale();
      real.strokeStyle = ink;
      if (filled) {
        // The outline of a shape just filled: one black line, a little over the outline width at most.
        real.lineWidth = Math.max(Math.min(lw, (outline * 2.2) / s), (outline * 0.6) / s);
        real.stroke(...args);
      } else if (lw * s >= hollowMin && rims.n > 0 && lw < rims.lw * 0.95) {
        // The coloured core over a dark rim (the drawing's own limb outline): the rim's tube already has it.
        rims.n--;
      } else if (lw * s >= hollowMin) {
        // A thick open stroke (a limb): a hollow tube, black edges with paper inside.
        real.stroke(...args);
        real.lineWidth = lw - (2 * outline) / s;
        real.strokeStyle = paper;
        real.stroke(...args);
        if (luminance(c) < DARK) rims = { n: rims.lw === lw ? rims.n + 1 : 1, lw };
      } else {
        real.lineWidth = Math.max(lw, (outline * 0.6) / s);
        real.stroke(...args);
      }
      real.lineWidth = lw;
    },
    fillRect(x, y, w, h) {
      if (typeof state.fill !== "string") return;
      const c = parseColour(state.fill);
      if (!visible(c)) return;
      const dark = luminance(c) < DARK;
      real.fillStyle = dark ? ink : paper;
      real.fillRect(x, y, w, h);
      if (!dark) {
        const lw = real.lineWidth;
        real.lineWidth = outline / scale();
        real.strokeStyle = ink;
        real.strokeRect(x, y, w, h);
        real.lineWidth = lw;
      }
    },
    strokeRect(x, y, w, h) {
      if (!visible(parseColour(state.stroke))) return;
      const lw = real.lineWidth;
      real.lineWidth = Math.min(lw, (outline * 2.2) / scale());
      real.strokeStyle = ink;
      real.strokeRect(x, y, w, h);
      real.lineWidth = lw;
    },
    fillText(...args) {
      real.fillStyle = ink;
      real.fillText(...args);
    },
    strokeText(...args) {
      real.strokeStyle = ink;
      real.strokeText(...args);
    },
    drawImage() {},
    clearRect() {},
  };
  const swallow = new Set(["shadowBlur", "shadowColor", "shadowOffsetX", "shadowOffsetY", "filter", "globalCompositeOperation"]);
  return new Proxy(real, {
    get(t, k) {
      if (k in methods) return methods[k];
      if (k === "fillStyle") return state.fill;
      if (k === "strokeStyle") return state.stroke;
      if (k === "globalAlpha") return state.alpha;
      if (k === "__real") return real;
      const v = t[k];
      return typeof v === "function" ? v.bind(t) : v;
    },
    set(t, k, v) {
      if (k === "fillStyle") state.fill = v;
      else if (k === "strokeStyle") state.stroke = v;
      else if (k === "globalAlpha") state.alpha = v;
      else if (!swallow.has(k)) t[k] = v;
      return true;
    },
  });
}
