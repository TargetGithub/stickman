// Imported vector art (STORY_SPEC 5.5). Milestone: S4. tools/svg_import.mjs turns an SVG file into
// catalog data: a list of paths with absolute commands and palette colors. This draws them without
// Path2D, so it works the same on every canvas backend.
//   paths: [{ d: [["M", x, y], ["L", x, y], ["C", x1, y1, x2, y2, x, y], ["Q", x1, y1, x, y], ["Z"]],
//             fill?: color or "colors.<key>", stroke?: color, width? }]
// Coordinates are object space: x centered, y up from the floor is negative (as the shapes).

const color = (v, colors) => (typeof v === "string" && v.startsWith("colors.") ? colors?.[v.slice(7)] : v);

export function drawPaths(ctx, paths, colors) {
  for (const p of paths) {
    ctx.beginPath();
    for (const c of p.d) {
      if (c[0] === "M") ctx.moveTo(c[1], c[2]);
      else if (c[0] === "L") ctx.lineTo(c[1], c[2]);
      else if (c[0] === "C") ctx.bezierCurveTo(c[1], c[2], c[3], c[4], c[5], c[6]);
      else if (c[0] === "Q") ctx.quadraticCurveTo(c[1], c[2], c[3], c[4]);
      else if (c[0] === "Z") ctx.closePath();
    }
    const fill = color(p.fill, colors);
    const stroke = color(p.stroke, colors);
    if (fill && fill !== "none") {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke && stroke !== "none") {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = p.width ?? 3;
      ctx.lineJoin = "round";
      ctx.stroke();
    }
  }
}
