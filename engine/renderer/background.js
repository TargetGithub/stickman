// Procedural theme backgrounds with parallax (spec 14.1 step 1, 14.3). Milestone: M4.
// Geometry is generated once per theme from a seeded stream; drawing is a pure function of the camera.

import { mulberry32, hash32 } from "../math.js";
import { STAGE } from "../config.js";

const SPAN = [-2400, 8000]; // world x range covered by generated geometry (any stage up to 8000 px)

function mountains(rng, layer) {
  const pts = [];
  for (let x = SPAN[0]; x <= SPAN[1]; x += layer.step) {
    const h = layer.height * (1 - layer.rough + layer.rough * rng());
    pts.push({ x, y: -h });
  }
  return pts;
}

/** Background for one theme: cached geometry plus the theme data. */
export function createBackground(theme, name, seed = 1) {
  const rng = mulberry32((seed ^ hash32(`bg:${name}`)) >>> 0);
  const geom = theme.layers.map((layer) => (layer.kind === "mountains" ? mountains(rng, layer) : null));
  return { theme, geom };
}

/** Screen transform for a layer: world x scrolls by `factor`, y is measured from the ground line. */
function layerTransform(ctx, cam, W, H, factor) {
  const z = 1 + (cam.zoom - 1) * factor;
  const groundScreen = H / 2 + (STAGE.groundY - cam.y + cam.shakeY) * cam.zoom;
  ctx.setTransform(z, 0, 0, z, W / 2 - (cam.x - cam.shakeX) * factor * z, groundScreen);
  return z;
}

/**
 * Draw sky, parallax layers and ground for a camera state.
 * Leaves the transform reset; the caller sets the world transform afterwards.
 */
export function drawBackground(ctx, bg, cam, W, H) {
  const t = bg.theme;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, t.sky.top);
  sky.addColorStop(1, t.sky.bottom);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  t.layers.forEach((layer, i) => {
    const z = layerTransform(ctx, cam, W, H, layer.factor);
    const left = (cam.x - cam.shakeX) * layer.factor - W / (2 * z) - 50;
    const right = (cam.x - cam.shakeX) * layer.factor + W / (2 * z) + 50;
    if (layer.kind === "sun") {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      const x = layer.x * W - (cam.x - STAGE.width / 2) * layer.factor;
      const y = layer.y * H;
      const g = ctx.createRadialGradient(x, y, layer.r * 0.6, x, y, layer.r * 2.4);
      g.addColorStop(0, layer.glow);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(x - layer.r * 2.4, y - layer.r * 2.4, layer.r * 4.8, layer.r * 4.8);
      ctx.fillStyle = layer.color;
      ctx.beginPath();
      ctx.arc(x, y, layer.r, 0, Math.PI * 2);
      ctx.fill();
    } else if (layer.kind === "mountains") {
      const pts = bg.geom[i];
      ctx.fillStyle = layer.color;
      ctx.beginPath();
      ctx.moveTo(left, 4000);
      for (const p of pts) if (p.x >= left - layer.step && p.x <= right + layer.step) ctx.lineTo(p.x, p.y);
      ctx.lineTo(right, 4000);
      ctx.closePath();
      ctx.fill();
    } else if (layer.kind === "wall") {
      ctx.fillStyle = layer.color;
      ctx.fillRect(left, layer.top, right - left, 4000);
      ctx.fillStyle = layer.beam;
      ctx.fillRect(left, layer.top, right - left, 18);
      const first = Math.floor(left / layer.spacing) * layer.spacing;
      for (let x = first; x < right; x += layer.spacing) ctx.fillRect(x - 9, layer.top, 18, -layer.top);
    } else if (layer.kind === "lanterns") {
      const first = Math.floor(left / layer.spacing) * layer.spacing + layer.spacing / 2;
      for (let x = first; x < right; x += layer.spacing) {
        const g = ctx.createRadialGradient(x, layer.y, 6, x, layer.y, 90);
        g.addColorStop(0, layer.glow);
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.fillRect(x - 90, layer.y - 90, 180, 180);
        ctx.strokeStyle = "#1a0f14";
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(x, layer.y - 60); ctx.lineTo(x, layer.y - 26); ctx.stroke();
        ctx.fillStyle = layer.color;
        ctx.beginPath(); ctx.ellipse(x, layer.y, 18, 26, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#1a0f14";
        ctx.fillRect(x - 12, layer.y - 28, 24, 5);
        ctx.fillRect(x - 12, layer.y + 23, 24, 5);
      }
    } else if (layer.kind === "grid") {
      ctx.strokeStyle = layer.color;
      ctx.lineWidth = 2;
      const first = Math.floor(left / layer.spacing) * layer.spacing;
      for (let x = first; x < right; x += layer.spacing) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + (x - (cam.x - cam.shakeX)) * 0.6, 600); ctx.stroke();
      }
      for (let y = 30; y < 600; y *= 1.6) {
        ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(right, y); ctx.stroke();
      }
    }
  });

  layerTransform(ctx, cam, W, H, 1);
  const left = cam.x - cam.shakeX - W / (2 * cam.zoom) - 50;
  const right = cam.x - cam.shakeX + W / (2 * cam.zoom) + 50;
  ctx.fillStyle = t.ground.color;
  ctx.fillRect(left, 0, right - left, 4000);
  if (t.ground.planks) {
    ctx.strokeStyle = t.ground.planks.color;
    ctx.lineWidth = 3;
    const sp = t.ground.planks.spacing;
    for (let x = Math.floor(left / sp) * sp; x < right; x += sp) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x - (x - (cam.x - cam.shakeX)) * 0.35, 400); ctx.stroke();
    }
  }
  ctx.strokeStyle = t.ground.line;
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(left, 0); ctx.lineTo(right, 0); ctx.stroke();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}
