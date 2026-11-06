// three.js builders for text in the teaching kit: stacked fractions (numerator, bar, denominator, an optional
// whole number), place value charts (headers, digit cells, a fixed decimal point and digits that slide) and text
// cards (a short passage on a card, drawn as a crisp canvas texture, with marker-pen highlights). Text layout
// happens here only; the plan never depends on it. Browser and Node (a card without a canvas is left blank).

import * as THREE from "three";
import { FONT } from "./overlay.js";
import { cardParagraphs, cardWords } from "./card_words.js";
import { placeX, pvLayout, POINT } from "./place_value.js";
import { cardHeight } from "./teach_layout.js";
import { roundedBox, setPiece, solid } from "./teach_common.js";

const box = (g) => g.boundingBox;
const width = (g) => box(g).max.x - box(g).min.x;

/**
 * A stacked fraction standing on the baseline at its at, like a letter of the same size: the bar sits on the
 * maths axis (the middle of "+"), the numerator and denominator are 0.7 × size, a whole number (mixed number)
 * is full size and centred on the axis to the left.
 */
export function buildFractionText(o, group, { material, font, textGeometry }) {
  const S = o.size;
  const depth = o.depth * S;
  const mat = material(o.color, "toy");
  const plus = textGeometry("+", font, S, depth, { baseline: true });
  const axis = (box(plus).min.y + box(plus).max.y) / 2;
  plus.dispose();
  const num = textGeometry(String(o.numerator), font, S * 0.7, depth, { baseline: true });
  const den = textGeometry(String(o.denominator), font, S * 0.7, depth, { baseline: true });
  const barW = Math.max(width(num), width(den)) + 0.3 * S;
  const barH = 0.085 * S;
  const gap = 0.14 * S;
  const whole = o.whole != null ? textGeometry(String(o.whole), font, S, depth, { baseline: true }) : null;
  const space = 0.14 * S;
  const total = (whole ? width(whole) + space : 0) + barW;
  const fx = total / 2 - barW / 2;
  const bar = solid(roundedBox(barW, barH, depth * 0.9, barH * 0.45), mat);
  bar.position.set(fx, axis, 0);
  const n = solid(num, mat);
  n.position.set(fx, axis + barH / 2 + gap, 0);
  const d = solid(den, mat);
  d.position.set(fx, axis - barH / 2 - gap - box(den).max.y, 0);
  group.add(bar, n, d);
  if (whole) {
    const w = solid(whole, mat);
    w.position.set(-total / 2 + width(whole) / 2, axis - (box(whole).min.y + box(whole).max.y) / 2, 0);
    group.add(w);
  }
  return {};
}

/**
 * An upright place value chart standing on its at: header labels over a row of digit cells, a narrow column
 * with the decimal point, and one digit per slot the director made (o.pvSlots), placed at its timeline place
 * ("pvp<i>", a column; fractional while it slides) and shown by "pvs<i>" (0-1, popping in).
 */
export function buildPlaceValueChart(o, group, { material, font, textGeometry }) {
  const L = pvLayout(o);
  const c = L.cell;
  const m = 0.07;
  const hh = 0.42 * c;
  const g = 0.04;
  const H = m + c + g + hh + m;
  const board = solid(roundedBox(L.width + 2 * m, H, 0.08, 0.05), material(o.color, "toy"));
  board.position.y = H / 2;
  group.add(board);
  const rowY = m + c / 2;
  const headY = m + c + g + hh / 2;
  const cellMat = material(o.bg, "matte");
  const ink = material("white", "toy");
  // Every header at one size: the largest that lets the longest fit its column.
  const heads = L.cols.map((col) => (col.header && col.header !== POINT ? textGeometry(String(col.header), font, 0.15 * c, 0.02) : null));
  const k = Math.min(1, ...heads.map((geo, j) => (geo ? Math.min((L.cols[j].w * 0.95) / width(geo), (hh * 0.8) / (box(geo).max.y - box(geo).min.y)) : 1)));
  for (const [j, col] of L.cols.entries()) {
    const cell = solid(roundedBox(col.w - 0.04, c - 0.04, 0.04, 0.03), cellMat);
    cell.position.set(col.x, rowY, 0.04);
    group.add(cell);
    const geo = heads[j];
    if (col.header === POINT) {
      const dot = solid(new THREE.SphereGeometry(0.075 * c, 20, 14), material(o.digitColor, "glossy"));
      dot.position.set(col.x, rowY - 0.3 * c, 0.1);
      group.add(dot);
    } else if (geo) {
      const t = new THREE.Mesh(geo, ink);
      t.scale.set(k, k, 1);
      t.position.set(col.x, headY - (box(geo).max.y * k) / 2, 0.05);
      group.add(t);
    }
  }
  const slots = (o.pvSlots ?? []).map(({ ch, zero }) => {
    const holder = new THREE.Group();
    const geo = textGeometry(ch, font, 0.5 * c, 0.07 * c);
    const mesh = solid(geo, material(zero ? o.zeroColor : o.digitColor, "toy"));
    mesh.position.set(0, -box(geo).max.y / 2, 0);
    holder.add(mesh);
    holder.position.set(0, rowY, 0.06 + 0.035 * c + 0.01);
    group.add(holder);
    return holder;
  });
  return {
    update(t, s) {
      slots.forEach((h, i) => {
        h.position.x = placeX(L, s[`pvp${i}`] ?? 0);
        setPiece(h, s[`pvs${i}`] ?? 0);
      });
    },
  };
}

/**
 * A card with a short passage, word-wrapped to its width, standing on its at (bottom centre). The text is
 * drawn into a canvas texture (sharp at the render height) on the card's face; emphasize marks ("hl<i>",
 * 0-1) sweep a marker highlight behind their words, left to right.
 */
export function buildTextCard(o, group, { material, catalog, height = 1080 }) {
  let S = o.size;
  const W = o.width;
  let pad = 0.7 * S;
  let lineH = 1.4 * S;
  // depth: card thickness (a chunky word tile is ~0.15); bg "none": no card at all, just the words (on a page).
  const depth = o.depth ?? 0.06;
  const plate = (h) => {
    if (o.bg === "none") return;
    const b = solid(roundedBox(W, h, depth, Math.min(0.12, S * 0.5, depth * 0.45)), material(o.bg, "matte"));
    b.position.y = h / 2;
    b.position.z = 0.03 - depth / 2;
    group.add(b);
  };
  const doc = typeof document !== "undefined" ? document : null;
  if (!doc) {
    plate(o.height ?? cardHeight(o)); // Node (tests): no canvas, so a blank card of the guessed height
    return {};
  }
  const ppm = Math.min(4096 / W, 260 * (height / 720));
  const cv = doc.createElement("canvas");
  const g = cv.getContext("2d");
  // Wrap: words in reading order (numbered as card_words.js numbers them), explicit line breaks kept.
  const text = cardWords(o.text);
  let font, space, lines;
  const wrap = () => {
    font = `bold ${Math.round(S * ppm)}px ${FONT}`;
    g.font = font;
    const maxW = (W - 2 * pad) * ppm;
    space = g.measureText(" ").width;
    lines = [];
    for (const para of cardParagraphs(o.text)) {
      let line = [];
      let x = 0;
      for (const i of para) {
        const w = g.measureText(text[i]).width;
        if (line.length && x + w > maxW) {
          lines.push(line);
          line = [];
          x = 0;
        }
        line.push({ i, x, w });
        x += w + space;
      }
      lines.push(line);
    }
    // align "center": each line centred in the card (word cards, tiles); left otherwise.
    for (const line of lines) {
      const used = line.length ? line.at(-1).x + line.at(-1).w : 0;
      line.dx = o.align === "center" ? (maxW - used) / 2 / ppm : 0;
    }
  };
  wrap();
  // height: a fixed card height; the font shrinks (never grows) until the wrapped text fits, so a laid-out page
  // never overlaps whatever the real glyph widths are.
  for (let k = 0; o.height && k < 12 && lines.length * lineH + 2 * pad > o.height + 1e-6; k++) {
    S *= 0.9;
    pad = 0.7 * S;
    lineH = 1.4 * S;
    wrap();
  }
  const H = o.height ?? lines.length * lineH + 2 * pad;
  const y0 = (H - lines.length * lineH) / 2; // top of the first line (text centred in a fixed-height card)
  cv.width = Math.round(W * ppm);
  cv.height = Math.round(H * ppm);
  plate(H);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const face = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false }));
  face.position.set(0, H / 2, 0.032);
  group.add(face);
  const ink = catalog.colors[o.color].hex;
  const marks = o.marks ?? [];
  const draw = (prog) => {
    g.clearRect(0, 0, cv.width, cv.height);
    const px = (v) => v * ppm;
    marks.forEach((mk, j) => {
      const k = prog[j];
      if (k <= 0.001) return;
      // The marked words, run by run (one run per line), swept in reading order.
      const runs = lines.map((line, li) => {
        const ws = line.filter((w) => w.i >= mk.words[0] && w.i <= mk.words[1]);
        return ws.length ? { li, dx: line.dx, x0: ws[0].x - space * 0.3, x1: ws.at(-1).x + ws.at(-1).w + space * 0.3 } : null;
      }).filter(Boolean);
      const total = runs.reduce((a, r) => a + r.x1 - r.x0, 0);
      let left = k * total;
      g.fillStyle = catalog.colors[mk.color].hex;
      g.globalAlpha = 0.85;
      for (const r of runs) {
        const w = Math.min(r.x1 - r.x0, left);
        if (w <= 0) break;
        left -= w;
        const y = px(y0 + r.li * lineH + 0.1 * lineH);
        roundRect(g, px(pad + r.dx) + r.x0, y, w, px(lineH * 0.84), px(lineH * 0.18));
      }
      g.globalAlpha = 1;
    });
    g.font = font;
    g.fillStyle = ink;
    g.textBaseline = "middle";
    lines.forEach((line, li) => {
      for (const w of line) g.fillText(text[w.i], px(pad + line.dx) + w.x, px(y0 + (li + 0.55) * lineH));
    });
    tex.needsUpdate = true;
  };
  let key = null;
  return {
    update(t, s) {
      const prog = marks.map((_, j) => Math.round((s[`hl${j}`] ?? 0) * 1000) / 1000);
      const k = prog.join(",");
      if (k !== key) {
        key = k;
        draw(prog);
      }
    },
  };
}

function roundRect(g, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  g.beginPath();
  g.moveTo(x + rr, y);
  g.arcTo(x + w, y, x + w, y + h, rr);
  g.arcTo(x + w, y + h, x, y + h, rr);
  g.arcTo(x, y + h, x, y, rr);
  g.arcTo(x, y, x + w, y, rr);
  g.closePath();
  g.fill();
}
