// SVG → catalog path data (STORY_SPEC 5.5, S4.9). Pure functions, no dependencies.
// Supports path (M L H V C S Q T A Z, absolute and relative; arcs become lines to their end point),
// rect (with rx), circle, ellipse, line, polyline, polygon, nested <g> with translate/scale/matrix
// transforms, and fill/stroke from attributes or style. Output commands are absolute M/L/C/Q/Z.

const NUM = /-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi;

/** Parse a path's d attribute into absolute M/L/C/Q/Z commands. */
export function parsePathD(d) {
  const out = [];
  const tokens = d.match(/[a-z]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi) || [];
  let i = 0;
  let cmd = null;
  let x = 0, y = 0, sx = 0, sy = 0;
  let lastC = null; // last cubic control point (for S)
  let lastQ = null; // last quadratic control point (for T)
  const num = () => Number(tokens[i++]);
  while (i < tokens.length) {
    if (/[a-z]/i.test(tokens[i])) cmd = tokens[i++];
    if (!cmd) break;
    const rel = cmd === cmd.toLowerCase();
    const C = cmd.toUpperCase();
    const ox = rel ? x : 0;
    const oy = rel ? y : 0;
    if (C === "Z") {
      out.push(["Z"]);
      x = sx; y = sy;
      lastC = lastQ = null;
      cmd = null;
      continue;
    }
    if (C === "M") {
      x = ox + num(); y = oy + num();
      sx = x; sy = y;
      out.push(["M", x, y]);
      cmd = rel ? "l" : "L"; // following pairs are line-tos
      lastC = lastQ = null;
    } else if (C === "L") {
      x = ox + num(); y = oy + num();
      out.push(["L", x, y]);
      lastC = lastQ = null;
    } else if (C === "H") {
      x = (rel ? x : 0) + num();
      out.push(["L", x, y]);
      lastC = lastQ = null;
    } else if (C === "V") {
      y = (rel ? y : 0) + num();
      out.push(["L", x, y]);
      lastC = lastQ = null;
    } else if (C === "C") {
      const x1 = ox + num(), y1 = oy + num(), x2 = ox + num(), y2 = oy + num();
      x = ox + num(); y = oy + num();
      out.push(["C", x1, y1, x2, y2, x, y]);
      lastC = [x2, y2]; lastQ = null;
    } else if (C === "S") {
      const x1 = lastC ? 2 * x - lastC[0] : x, y1 = lastC ? 2 * y - lastC[1] : y;
      const x2 = ox + num(), y2 = oy + num();
      x = ox + num(); y = oy + num();
      out.push(["C", x1, y1, x2, y2, x, y]);
      lastC = [x2, y2]; lastQ = null;
    } else if (C === "Q") {
      const x1 = ox + num(), y1 = oy + num();
      x = ox + num(); y = oy + num();
      out.push(["Q", x1, y1, x, y]);
      lastQ = [x1, y1]; lastC = null;
    } else if (C === "T") {
      const x1 = lastQ ? 2 * x - lastQ[0] : x, y1 = lastQ ? 2 * y - lastQ[1] : y;
      x = ox + num(); y = oy + num();
      out.push(["Q", x1, y1, x, y]);
      lastQ = [x1, y1]; lastC = null;
    } else if (C === "A") {
      i += 5; // rx ry rotation large-arc sweep: approximated by a straight line
      x = ox + num(); y = oy + num();
      out.push(["L", x, y]);
      lastC = lastQ = null;
    } else break;
  }
  return out;
}

const K = 0.5523; // cubic Bézier circle constant

function ellipseD(cx, cy, rx, ry) {
  return [
    ["M", cx + rx, cy],
    ["C", cx + rx, cy + ry * K, cx + rx * K, cy + ry, cx, cy + ry],
    ["C", cx - rx * K, cy + ry, cx - rx, cy + ry * K, cx - rx, cy],
    ["C", cx - rx, cy - ry * K, cx - rx * K, cy - ry, cx, cy - ry],
    ["C", cx + rx * K, cy - ry, cx + rx, cy - ry * K, cx + rx, cy],
    ["Z"],
  ];
}

function rectD(x, y, w, h, r) {
  if (!r) return [["M", x, y], ["L", x + w, y], ["L", x + w, y + h], ["L", x, y + h], ["Z"]];
  r = Math.min(r, w / 2, h / 2);
  return [
    ["M", x + r, y], ["L", x + w - r, y], ["Q", x + w, y, x + w, y + r], ["L", x + w, y + h - r], ["Q", x + w, y + h, x + w - r, y + h],
    ["L", x + r, y + h], ["Q", x, y + h, x, y + h - r], ["L", x, y + r], ["Q", x, y, x + r, y], ["Z"],
  ];
}

const attrsOf = (tag) => Object.fromEntries([...tag.matchAll(/([a-zA-Z:-]+)\s*=\s*"([^"]*)"/g)].map((m) => [m[1], m[2]]));

function styleOf(a, inherited) {
  const st = { ...inherited };
  if (a.fill) st.fill = a.fill;
  if (a.stroke) st.stroke = a.stroke;
  for (const part of (a.style || "").split(";")) {
    const [k, v] = part.split(":").map((q) => q && q.trim());
    if (k === "fill" || k === "stroke") st[k] = v;
  }
  return st;
}

/** 2D affine matrix [a b c d e f] from a transform attribute (translate, scale, matrix). */
function matrixOf(t) {
  let m = [1, 0, 0, 1, 0, 0];
  for (const [, name, args] of (t || "").matchAll(/(translate|scale|matrix)\s*\(([^)]*)\)/g)) {
    const n = (args.match(NUM) || []).map(Number);
    const step = name === "translate" ? [1, 0, 0, 1, n[0] || 0, n[1] || 0] : name === "scale" ? [n[0], 0, 0, n[1] ?? n[0], 0, 0] : n;
    m = mul(m, step);
  }
  return m;
}
const mul = (p, q) => [p[0] * q[0] + p[2] * q[1], p[1] * q[0] + p[3] * q[1], p[0] * q[2] + p[2] * q[3], p[1] * q[2] + p[3] * q[3], p[0] * q[4] + p[2] * q[5] + p[4], p[1] * q[4] + p[3] * q[5] + p[5]];
const apply = (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];

function transform(d, m) {
  return d.map((c) => {
    if (c[0] === "Z") return c;
    const out = [c[0]];
    for (let k = 1; k < c.length; k += 2) out.push(...apply(m, c[k], c[k + 1]));
    return out;
  });
}

/** Every drawable shape in document order: [{ d, fill, stroke }] in SVG user units. */
export function parseSvg(text) {
  const shapes = [];
  const stack = [{ m: [1, 0, 0, 1, 0, 0], style: { fill: "#000000" } }];
  for (const [tag] of text.matchAll(/<[^!?][^>]*>/g)) {
    const close = tag.startsWith("</");
    const name = (tag.match(/^<\/?\s*([a-zA-Z]+)/) || [])[1];
    const selfClose = tag.endsWith("/>");
    const top = stack[stack.length - 1];
    if (name === "g" || name === "svg") {
      if (close) stack.length > 1 && stack.pop();
      else if (!selfClose) {
        const a = attrsOf(tag);
        stack.push({ m: mul(top.m, matrixOf(a.transform)), style: styleOf(a, top.style) });
      }
      continue;
    }
    if (close) continue;
    const a = attrsOf(tag);
    const n = (k) => Number(a[k] || 0);
    let d = null;
    if (name === "path") d = parsePathD(a.d || "");
    else if (name === "rect") d = rectD(n("x"), n("y"), n("width"), n("height"), n("rx") || n("ry"));
    else if (name === "circle") d = ellipseD(n("cx"), n("cy"), n("r"), n("r"));
    else if (name === "ellipse") d = ellipseD(n("cx"), n("cy"), n("rx"), n("ry"));
    else if (name === "line") d = [["M", n("x1"), n("y1")], ["L", n("x2"), n("y2")]];
    else if (name === "polyline" || name === "polygon") {
      const p = (a.points.match(NUM) || []).map(Number);
      d = [["M", p[0], p[1]]];
      for (let k = 2; k + 1 < p.length; k += 2) d.push(["L", p[k], p[k + 1]]);
      if (name === "polygon") d.push(["Z"]);
    }
    if (!d || !d.length) continue;
    const st = styleOf(a, top.style);
    shapes.push({ d: transform(d, mul(top.m, matrixOf(a.transform))), fill: st.fill, stroke: st.stroke });
  }
  return shapes;
}

const hex = (c) => {
  if (!c || c === "none") return null;
  const m = c.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return null;
  const h = m[1].length === 3 ? [...m[1]].map((x) => x + x).join("") : m[1];
  return [0, 2, 4].map((k) => parseInt(h.slice(k, k + 2), 16));
};

/**
 * Catalog paths for an object: scaled to `height` px, centered on x, standing on y = 0 (up is
 * negative), colors snapped to the nearest palette color, a uniform outline.
 * @returns {{ paths, w, h }}
 */
export function toCatalogPaths(shapes, { height = 200, palette = null, outline = "#111111", outlineWidth = 3 } = {}) {
  const pts = shapes.flatMap((s) => s.d.flatMap((c) => (c[0] === "Z" ? [] : c.slice(1).reduce((acc, v, k, arr) => (k % 2 ? acc : [...acc, [v, arr[k + 1]]]), []))));
  if (!pts.length) return { paths: [], w: 0, h: 0 };
  const minX = Math.min(...pts.map((p) => p[0])), maxX = Math.max(...pts.map((p) => p[0]));
  const minY = Math.min(...pts.map((p) => p[1])), maxY = Math.max(...pts.map((p) => p[1]));
  const k = height / Math.max(1e-6, maxY - minY);
  const cx = (minX + maxX) / 2;
  const snap = (c) => {
    const rgb = hex(c);
    if (!rgb) return c === "none" ? null : c || null;
    if (!palette?.length) return c.toLowerCase();
    let best = palette[0];
    let bd = Infinity;
    for (const p of palette) {
      const q = hex(p);
      const dd = (q[0] - rgb[0]) ** 2 + (q[1] - rgb[1]) ** 2 + (q[2] - rgb[2]) ** 2;
      if (dd < bd) { bd = dd; best = p; }
    }
    return best;
  };
  const round = (v) => Math.round(v * 10) / 10;
  const paths = shapes.map((s) => ({
    d: s.d.map((c) => (c[0] === "Z" ? c : [c[0], ...c.slice(1).map((v, i) => round(i % 2 === 0 ? (v - cx) * k : (v - maxY) * k))])),
    fill: snap(s.fill),
    stroke: outline,
    width: outlineWidth,
  }));
  return { paths, w: round((maxX - minX) * k), h: round(height) };
}
