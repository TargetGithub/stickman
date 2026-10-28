// Tracing letters (WORKBOOK_SPEC 6, 8.2): stroke glyphs from education/letters.json drawn along their
// centrelines. A model glyph is solid with a numbered green dot where each stroke starts and an arrow along its
// first step; a trace glyph is dashed grey. Glyph coordinates: an em box, y 0 at the cap line, 1 at the baseline.

const START = "#2a9d3a";

/** The direction of a stroke's first step (unit vector in em units), from its first two points. */
export function firstStep(stroke) {
  const [, x0, y0] = stroke[0];
  const next = stroke[1];
  const [x1, y1] = next[0] === "C" ? [next[1], next[2]] : [next[1], next[2]];
  const len = Math.hypot(x1 - x0, y1 - y0) || 1;
  return [(x1 - x0) / len, (y1 - y0) / len];
}

function strokePath(ctx, stroke, x, y, h) {
  ctx.beginPath();
  for (const c of stroke) {
    if (c[0] === "M") ctx.moveTo(x + c[1] * h, y + c[2] * h);
    else if (c[0] === "L") ctx.lineTo(x + c[1] * h, y + c[2] * h);
    else if (c[0] === "C") ctx.bezierCurveTo(x + c[1] * h, y + c[2] * h, x + c[3] * h, y + c[4] * h, x + c[5] * h, y + c[6] * h);
    else if (c[0] === "Q") ctx.quadraticCurveTo(x + c[1] * h, y + c[2] * h, x + c[3] * h, y + c[4] * h);
  }
}

/**
 * Draw one glyph with its cap line at y and its left edge at x, cap height h (points).
 * @param {{ x, y, h, style?: "model"|"trace", width?: number, colour?: string, font?: string }} at
 */
export function drawGlyph(ctx, glyph, at) {
  const { x, y, h } = at;
  const model = at.style === "model";
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = at.width ?? h * 0.06;
  ctx.strokeStyle = at.colour || (model ? "#000000" : "#888888");
  ctx.setLineDash(model ? [] : [h * 0.07, h * 0.06]);
  for (const s of glyph.strokes) {
    strokePath(ctx, s, x, y, h);
    ctx.stroke();
  }
  if (model) {
    ctx.setLineDash([]);
    const r = Math.max(5, h * 0.09);
    const dots = [];
    glyph.strokes.forEach((s, i) => {
      const [dx, dy] = firstStep(s);
      // A stroke that starts where an earlier one did (the two legs of A) has its dot moved along its own first
      // step, so both numbers show.
      let sx = x + s[0][1] * h;
      let sy = y + s[0][2] * h;
      for (let n = 0; n < 4 && dots.some(([px, py]) => Math.hypot(px - sx, py - sy) < r * 2.1); n++) {
        sx += dx * r * 2.2;
        sy += dy * r * 2.2;
      }
      dots.push([sx, sy]);
      // The arrow sits beside the stroke's first step, pointing along it.
      const ax = sx + dx * r * 2.4 - dy * r * 1.6;
      const ay = sy + dy * r * 2.4 + dx * r * 1.6;
      ctx.strokeStyle = START;
      ctx.fillStyle = START;
      ctx.lineWidth = Math.max(1, h * 0.025);
      ctx.beginPath();
      ctx.moveTo(ax - dx * r * 1.2, ay - dy * r * 1.2);
      ctx.lineTo(ax + dx * r * 1.2, ay + dy * r * 1.2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(ax + dx * r * 1.8, ay + dy * r * 1.8);
      ctx.lineTo(ax + dx * r * 0.8 - dy * r * 0.6, ay + dy * r * 0.8 + dx * r * 0.6);
      ctx.lineTo(ax + dx * r * 0.8 + dy * r * 0.6, ay + dy * r * 0.8 - dx * r * 0.6);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.font = `bold ${r * 1.4}px ${at.font || "Andika"}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(i + 1), sx, sy + r * 0.05);
    });
  }
  ctx.restore();
}
