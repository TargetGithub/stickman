// A real night on any theme (STORY_SPEC 5.2, ENGINE_V3_SPEC 5.9, ADR-037). Draw time only.
// Night used to be one blue multiply over the whole frame: a daytime theme kept its bright sky and its sun, and
// the characters were dimmed as much as the sky. Now the background itself goes dark:
// - the theme's layers and floor are drawn over a cleared frame, darkened and a little desaturated by a filter;
// - lights come on where the theme has them, each right after its own layer so nearer layers cover it: lit
//   windows in buildings, huts and skylines, brighter lamp and lantern glows, a night sky in a room's windows;
// - the sky goes in behind everything (destination-over): a dark gradient with stars and a moon where the
//   sun was; the sun fades out;
// - the grade over the whole frame (grade.js) is lighter than before, matching the moonlit light rig's
//   ambient, so characters stay readable.
// How much of this a theme gets comes from its tags: daytime outdoor themes all of it, rooms half (no sky to
// see but through windows), themes that are already dark or night a little.

import { mulberry32, hash32 } from "../math.js";
import { mixHex } from "../lighting.js";
import { layerTransform, screen } from "./layer_util.js";
import { STAGE } from "../config.js";

export const NIGHT_SKY = Object.freeze({ top: "#060a1c", bottom: "#1c2a58" });
/** The darkening of a theme's layers at night share n: a canvas filter (the grade then tints it moonlit blue). */
export const nightFilter = (n) => `brightness(${(1 - 0.6 * n).toFixed(3)}) saturate(${(1 - 0.3 * n).toFixed(3)})`;
export const LIT_WINDOW = "#ffd98a";
const MOON = { color: "#f3f0dc", glow: "rgba(190,210,255,0.32)" };
const STARS = (() => {
  const rng = mulberry32(0x6e16);
  return Array.from({ length: 110 }, () => ({ x: rng(), y: rng() * 0.58, r: 0.7 + rng() * 1.6, ph: rng() * 6.283 }));
})();

/**
 * How much of the night look a theme takes (0..1) and whether it shows the sky: daytime outdoor themes 1 with a
 * sky, rooms ("indoor") 0.5 without, themes already dark ("night", "dark") 0.35 with their own sky.
 * @returns {{ amount: number, sky: boolean }}
 */
export function nightLook(theme) {
  const tags = theme?.tags || [];
  if (tags.includes("night") || tags.includes("dark")) return { amount: 0.35, sky: false };
  if (tags.includes("indoor")) return { amount: 0.5, sky: false };
  return { amount: 1, sky: true };
}

/** The sky colours at night share n: the theme's mixed toward the night sky (non-hex colours jump at half). */
export function nightSky(sky, n) {
  const mix = (a, b) => (/^#[0-9a-f]{6}$/i.test(a) ? mixHex(a, b, n) : n < 0.5 ? a : b);
  return { top: mix(sky.top, NIGHT_SKY.top), bottom: mix(sky.bottom, NIGHT_SKY.bottom) };
}

/** Where the moon rises: where the theme's sun was (screen fractions, parallax factor), else high on the right. */
export function moonOf(theme) {
  const sun = (theme?.layers || []).find((l) => l.kind === "sun");
  return sun ? { x: sun.x, y: Math.min(sun.y, 0.3), r: Math.max(30, Math.min(58, sun.r * 0.62)), factor: sun.factor } : { x: 0.78, y: 0.16, r: 44, factor: 0.02 };
}

/** Is window k of block b lit at night? A fixed share, the same in every frame. */
export const windowLit = (b, k, share = 0.55) => (hash32(`win:${b}:${k}`) % 1000) / 1000 < share;

/** Lights that come on at night, per layer kind: (ctx, layer, geom, view, n). */
const LIGHTS = {
  buildings(ctx, layer, blocks, view, n) {
    const { left, right } = layerTransform(ctx, view, layer.factor);
    ctx.fillStyle = LIT_WINDOW;
    blocks.forEach((b, i) => {
      if (b.x + b.w < left || b.x > right) return;
      const cols = Math.max(1, Math.floor((b.w - 40) / 80));
      for (let r = 0; r < b.rows; r++) for (let c = 0; c < cols; c++) {
        if (!windowLit(i, r * 16 + c)) continue;
        ctx.globalAlpha = n;
        ctx.fillRect(b.x + 30 + c * ((b.w - 60) / cols), -b.h + 40 + r * 110, 46, 62);
      }
    });
    ctx.globalAlpha = 1;
  },
  skyline(ctx, layer, blocks, view, n) {
    const { left, right } = layerTransform(ctx, view, layer.factor);
    ctx.fillStyle = LIT_WINDOW;
    ctx.globalAlpha = 0.85 * n;
    blocks.forEach((b, i) => {
      if (b.x + b.w < left || b.x > right) return;
      let k = 0;
      for (let wy = 20; wy < b.h - 20; wy += 34) for (let wx = 14; wx < b.w - 20; wx += 26) if (windowLit(i, k++, 0.22)) ctx.fillRect(b.x + wx, -b.h + wy, 10, 14);
    });
    ctx.globalAlpha = 1;
  },
  huts(ctx, layer, huts, view, n) {
    const { left, right } = layerTransform(ctx, view, layer.factor);
    ctx.translate(0, layer.y ?? 0);
    for (const h of huts) {
      if (!h.window || h.x + h.w < left || h.x - h.w > right) continue;
      const wx = h.x - h.doorAt * h.w * 0.28;
      const wy = -h.wallH * 0.62;
      const g = ctx.createRadialGradient(wx, wy, 1, wx, wy, h.w * 0.22);
      g.addColorStop(0, `rgba(255,214,140,${(0.45 * n).toFixed(3)})`);
      g.addColorStop(1, "rgba(255,214,140,0)");
      ctx.fillStyle = g;
      ctx.fillRect(wx - h.w * 0.22, wy - h.w * 0.22, h.w * 0.44, h.w * 0.44);
      ctx.globalAlpha = n;
      ctx.fillStyle = LIT_WINDOW;
      ctx.beginPath();
      ctx.arc(wx, wy, h.w * 0.05, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  },
  lampposts(ctx, layer, _g, view, n) {
    const { left, right } = layerTransform(ctx, view, layer.factor);
    for (let x = Math.floor(left / layer.spacing) * layer.spacing + layer.spacing / 2; x < right; x += layer.spacing) {
      glow(ctx, x, -layer.height + 9, 210, `rgba(255,232,160,${(0.42 * n).toFixed(3)})`);
      ctx.globalAlpha = n;
      ctx.fillStyle = "#fff6c8";
      ctx.fillRect(x - 16, -layer.height, 32, 18);
      ctx.globalAlpha = 1;
    }
  },
  lanterns(ctx, layer, _g, view, n) {
    const { left, right } = layerTransform(ctx, view, layer.factor);
    for (let x = Math.floor(left / layer.spacing) * layer.spacing + layer.spacing / 2; x < right; x += layer.spacing) {
      glow(ctx, x, layer.y, 150, layer.glow);
      ctx.globalAlpha = 0.8 * n;
      ctx.fillStyle = layer.color;
      ctx.beginPath();
      ctx.ellipse(x, layer.y, 18, 22, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  },
  windows(ctx, layer, _g, view, n) {
    // A room's windows show the night sky (four panes between the frame's bars) with a few stars.
    const { left, right } = layerTransform(ctx, view, layer.factor);
    for (let x = Math.floor(left / layer.spacing) * layer.spacing + layer.spacing / 2; x < right; x += layer.spacing) {
      const g = ctx.createLinearGradient(0, layer.y, 0, layer.y + layer.h);
      g.addColorStop(0, NIGHT_SKY.top);
      g.addColorStop(1, NIGHT_SKY.bottom);
      ctx.fillStyle = g;
      ctx.globalAlpha = n;
      const hw = layer.w / 2;
      const hh = layer.h / 2;
      for (const [px, py] of [[x - hw, layer.y], [x + 5, layer.y], [x - hw, layer.y + hh + 5], [x + 5, layer.y + hh + 5]]) ctx.fillRect(px, py, hw - 5, hh - 5);
      ctx.fillStyle = "#ffffff";
      for (const s of STARS.slice(0, 9)) ctx.fillRect(x - hw + s.x * layer.w, layer.y + (s.y / 0.58) * layer.h * 0.9, 2, 2);
      ctx.globalAlpha = 1;
    }
  },
};

function glow(ctx, x, y, r, color) {
  const g = ctx.createRadialGradient(x, y, 4, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

/** Layer kinds that light up at night. */
export const NIGHT_LIGHT_KINDS = Object.freeze(Object.keys(LIGHTS));

/**
 * Draw a theme's background at night share n (0..1, already scaled by nightLook().amount).
 * @param {object} kinds  the layer kinds (background.js)
 * @param {{ cam, W, H, fxT, react }} view
 * @param {boolean} sky  whether the theme shows the night sky (moon and stars)
 */
export function drawNightBackground(ctx, bg, kinds, view, n, sky) {
  const t = bg.theme;
  const { W, H } = view;
  const real = ctx.__real || ctx;
  real.save();
  real.setTransform(1, 0, 0, 1, 0, 0);
  real.clearRect(0, 0, real.canvas?.width ?? W, real.canvas?.height ?? H);
  real.restore();
  // The layers and the floor on a clear frame, each darkened by a filter as it is drawn and its lights switched on
  // right after it, so nearer layers still cover the lights of farther ones; the sun fades as the night comes.
  const base = ctx.filter && ctx.filter !== "none" ? `${ctx.filter} ` : "";
  const dark = nightFilter(n);
  const lights = (layer, i) => {
    if (!LIGHTS[layer.kind]) return;
    ctx.save();
    ctx.filter = base || "none";
    LIGHTS[layer.kind](ctx, layer, bg.geom[i], view, n);
    ctx.restore();
  };
  const draw = (onGround) => t.layers.forEach((layer, i) => {
    const kind = kinds[layer.kind];
    if (!kind || !!kind.onGround !== onGround) return;
    if (layer.kind === "sun") ctx.globalAlpha = Math.max(0, 1 - n * 1.6);
    ctx.filter = base + dark;
    if (ctx.globalAlpha > 0.004) kind.draw(ctx, layer, bg.geom[i], view);
    ctx.globalAlpha = 1;
    lights(layer, i);
  });
  draw(false);
  ctx.filter = base + dark;
  const { left, right } = layerTransform(ctx, view, 1);
  ctx.fillStyle = t.ground.color;
  ctx.fillRect(left, 0, right - left, 4000);
  draw(true);
  ctx.filter = base + dark;
  layerTransform(ctx, view, 1);
  ctx.strokeStyle = t.ground.line;
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(left, 0); ctx.lineTo(right, 0); ctx.stroke();
  ctx.filter = base || "none";
  // The sky behind everything: the moon, the stars, then the gradient (destination-over draws back to front).
  screen(ctx);
  ctx.globalCompositeOperation = "destination-over";
  if (sky) {
    const m = moonOf(t);
    const mx = m.x * W - (view.cam.x - STAGE.width / 2) * (m.factor ?? 0.02); // drifts with the camera as the sun did
    const my = m.y * H;
    ctx.globalAlpha = n;
    ctx.fillStyle = MOON.color;
    ctx.beginPath();
    ctx.arc(mx, my, m.r, 0, Math.PI * 2);
    ctx.fill();
    glow(ctx, mx, my, m.r * 3, MOON.glow);
    ctx.fillStyle = "#ffffff";
    for (const s of STARS) {
      ctx.globalAlpha = n * (0.4 + 0.6 * (0.5 + 0.5 * Math.sin(view.fxT * 2 + s.ph)));
      ctx.fillRect(s.x * W, s.y * H, s.r, s.r);
    }
    ctx.globalAlpha = 1;
  }
  const c = nightSky(t.sky, n);
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, c.top);
  g.addColorStop(1, c.bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = "source-over";
  screen(ctx);
}
