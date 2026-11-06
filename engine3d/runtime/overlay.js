// Captions drawn over the 3D picture in the same WebGL frame (so one readback holds everything). Each caption
// is rasterised once with canvas 2D into a texture the size of its box; its pop-in and fade are done with the
// sprite's scale and opacity, so a 4K frame never re-uploads a full-screen texture. Layout is in units of the
// frame height, so 1080p and 4K look the same. Renderer only: the timeline never sees text metrics.

import * as THREE from "three";
import { ease } from "./ease.js";

const STYLES = {
  subtitle: { size: 0.062, x: 0.5, y: 0.1, fill: "#2b2d42", box: "rgba(255,255,255,0.92)", stroke: null },
  count: { size: 0.2, x: 0.76, y: 0.62, fill: "#ffffff", box: null, stroke: "#2b2d42" },
  title: { size: 0.12, x: 0.5, y: 0.62, fill: "#ffd23f", box: null, stroke: "#2b2d42" },
  // A word naming what is on screen (shape, colour, animal), above the subtitle line.
  label: { size: 0.1, x: 0.5, y: 0.22, fill: "#ffd23f", box: null, stroke: "#2b2d42" },
  // A title card for kids: the whole frame, a bright gradient with confetti, big outlined words (cut in, no pop).
  intertitle: { size: 0.085, x: 0.5, y: 0.5, fill: "#ffffff", box: null, stroke: null, card: true },
};
/** Title card colours: gradient top and bottom, the badge, and the dark ink for outlines and badge words. */
const CARD_THEMES = [
  { top: "#5fd0ff", bottom: "#1e7be0", badge: "#ffd23f", ink: "#0d2f66" },
  { top: "#ff9ec4", bottom: "#e8467e", badge: "#fff176", ink: "#5c1035" },
  { top: "#86ecb0", bottom: "#1fa463", badge: "#ffd23f", ink: "#0b4228" },
  { top: "#ffc46b", bottom: "#f4611e", badge: "#fff59d", ink: "#5a230a" },
  { top: "#c3a8ff", bottom: "#7a4fd6", badge: "#ffe066", ink: "#2c1463" },
  { top: "#6be3ee", bottom: "#0f8f9a", badge: "#ffee58", ink: "#033a3f" },
];
const CONFETTI = ["#ffffff", "#ffd23f", "#ff6b9a", "#7cf29a", "#7ad3ff", "#ffa94d", "#c39bff"];
/** caption pos: where the caption's centre goes instead of its style's spot (fractions of the frame, from the bottom left). */
export const CAPTION_POS = { left: [0.22, 0.62], right: [0.78, 0.62], top: [0.5, 0.86] };
/** The page's canvas font family (Andika Bold, loaded by loadCaptionFont); text cards draw with it too. */
export const FONT = "Andika3D";

/** Load the caption font into the document (FontFace), before the first caption is drawn. */
export async function loadCaptionFont(url) {
  const f = new FontFace(FONT, `url(${url})`);
  await f.load();
  document.fonts.add(f);
}

export function createOverlay(width, height, captions) {
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(0, width, height, 0, -10, 10);
  const sprites = new Map();

  function sprite(c) {
    const key = `${c.style}|${c.fill ?? ""}|${c.pos ?? ""}|${c.text}`;
    if (sprites.has(key)) return sprites.get(key);
    const st = STYLES[c.style] ?? STYLES.subtitle;
    if (st.card) return card(c, st, key);
    const px = Math.round(height * st.size);
    const cv = document.createElement("canvas");
    const g = cv.getContext("2d");
    g.font = `bold ${px}px ${FONT}`;
    // Wrap onto more lines when a caption would be wider than 86% of the frame.
    const lines = [];
    for (const word of c.text.split(" ")) {
      const last = lines[lines.length - 1];
      if (last && g.measureText(`${last} ${word}`).width <= width * 0.86) lines[lines.length - 1] = `${last} ${word}`;
      else lines.push(word);
    }
    const tw = Math.ceil(Math.max(...lines.map((l) => g.measureText(l).width)));
    const pad = Math.round(px * 0.45);
    const lh = px * 1.22;
    cv.width = tw + pad * 2;
    cv.height = Math.round(px * 0.38 + lh * lines.length);
    g.font = `bold ${px}px ${FONT}`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    if (st.box) {
      g.fillStyle = st.box;
      g.beginPath();
      g.roundRect(0, 0, cv.width, cv.height, Math.min(cv.height / 2, px * 0.8));
      g.fill();
    }
    lines.forEach((l, i) => {
      const y = cv.height / 2 + (i - (lines.length - 1) / 2) * lh + px * 0.05;
      if (st.stroke) {
        g.lineJoin = "round";
        g.lineWidth = px * 0.16;
        g.strokeStyle = st.stroke;
        g.strokeText(l, cv.width / 2, y);
      }
      g.fillStyle = c.fill ?? st.fill;
      g.fillText(l, cv.width / 2, y);
    });
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false, depthTest: false });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(cv.width, cv.height), mat);
    const [x, y] = CAPTION_POS[c.pos] ?? [st.x, st.y];
    // x, y: fractions of the frame from the bottom left. A subtitle that wraps grows upward from a bottom margin
    // instead of running off the frame.
    const lift = st === STYLES.subtitle && !c.pos ? Math.max(0, height * 0.03 + cv.height / 2 - height * y) : 0;
    mesh.position.set(width * x, height * y + lift, 0);
    mesh.visible = false;
    scene.add(mesh);
    sprites.set(key, mesh);
    return mesh;
  }

  /**
   * A full-frame title card for kids, drawn at half size (a flat card scales up cleanly) so a 4K film of many
   * cards stays light: a bright gradient (one of CARD_THEMES, picked from the text so each card keeps its
   * colours), a soft glow, confetti dots and stars, a white rounded frame, and big white words with a dark
   * outline. A card "Chapter One\n\nThe Title" puts its first part in a coloured badge above the title.
   */
  function card(c, st, key) {
    const w = Math.round(width / 2), h = Math.round(height / 2);
    const cv = document.createElement("canvas");
    cv.width = w;
    cv.height = h;
    const g = cv.getContext("2d");
    let seed = 0;
    for (const ch of c.text) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
    const th = CARD_THEMES[seed % CARD_THEMES.length];
    const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
    const bg = g.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, th.top);
    bg.addColorStop(1, th.bottom);
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    const glow = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, h * 0.75);
    glow.addColorStop(0, "rgba(255,255,255,0.35)");
    glow.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = glow;
    g.fillRect(0, 0, w, h);
    // Confetti dots and little stars, kept to the edges so the words stay clear.
    const star = (x, y, r) => {
      g.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = (i * Math.PI) / 5 - Math.PI / 2, rr = i % 2 ? r * 0.45 : r;
        g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
      }
      g.closePath();
      g.fill();
    };
    for (let i = 0; i < 46; i++) {
      let x = rand() * w, y = rand() * h;
      if (Math.abs(x - w / 2) < w * 0.36 && Math.abs(y - h / 2) < h * 0.3) y = y < h / 2 ? y * 0.35 : h - (h - y) * 0.35;
      g.fillStyle = CONFETTI[Math.floor(rand() * CONFETTI.length)];
      g.globalAlpha = 0.85;
      if (i % 4 === 0) star(x, y, h * (0.018 + rand() * 0.02));
      else {
        g.beginPath();
        g.arc(x, y, h * (0.006 + rand() * 0.012), 0, Math.PI * 2);
        g.fill();
      }
    }
    g.globalAlpha = 1;
    g.strokeStyle = "rgba(255,255,255,0.95)";
    g.lineWidth = h * 0.012;
    g.beginPath();
    g.roundRect(h * 0.045, h * 0.045, w - h * 0.09, h - h * 0.09, h * 0.06);
    g.stroke();
    // The words: an optional badge (the part before a blank line), then the title, wrapped to 74% of the width.
    const parts = c.text.split("\n\n");
    const badge = parts.length > 1 ? parts[0] : null;
    const body = parts.length > 1 ? parts.slice(1).join("\n") : c.text;
    const px = Math.round(h * st.size * 1.3);
    g.font = `bold ${px}px ${FONT}`;
    const lines = [];
    for (const para of body.split("\n")) {
      lines.push("");
      for (const word of para.split(" ")) {
        const last = lines[lines.length - 1];
        if (last && g.measureText(`${last} ${word}`).width > w * 0.74) lines.push(word);
        else lines[lines.length - 1] = last ? `${last} ${word}` : word;
      }
    }
    const lh = px * 1.25;
    const bpx = Math.round(px * 0.62);
    const blockH = lines.length * lh + (badge ? bpx * 2.1 : 0);
    let y = h / 2 - blockH / 2;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.lineJoin = "round";
    if (badge) {
      g.font = `bold ${bpx}px ${FONT}`;
      const bw = g.measureText(badge).width + bpx * 1.4;
      g.fillStyle = th.badge;
      g.beginPath();
      g.roundRect(w / 2 - bw / 2, y, bw, bpx * 1.5, bpx * 0.75);
      g.fill();
      g.fillStyle = th.ink;
      g.fillText(badge, w / 2, y + bpx * 0.78);
      y += bpx * 2.1;
    }
    g.font = `bold ${px}px ${FONT}`;
    lines.forEach((l, i) => {
      const ly = y + lh * (i + 0.5);
      g.fillStyle = "rgba(0,0,0,0.25)";
      g.fillText(l, w / 2 + px * 0.05, ly + px * 0.07);
      g.strokeStyle = th.ink;
      g.lineWidth = px * 0.2;
      g.strokeText(l, w / 2, ly);
      g.fillStyle = "#ffffff";
      g.fillText(l, w / 2, ly);
    });
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false, depthTest: false });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), mat);
    mesh.position.set(width / 2, height / 2, 0);
    mesh.visible = false;
    mesh.userData.card = true;
    scene.add(mesh);
    sprites.set(key, mesh);
    return mesh;
  }

  return {
    scene,
    camera,
    update(t) {
      for (const m of sprites.values()) m.visible = false;
      // The top edge of the subtitle on screen, so a label above it moves up when it wraps onto two lines.
      let subTop = 0;
      for (const c of captions) {
        if (t < c.start || t >= c.start + c.dur || (c.style ?? "subtitle") !== "subtitle" || c.pos) continue;
        const m = sprite(c);
        subTop = Math.max(subTop, m.position.y + m.geometry.parameters.height / 2);
      }
      for (const c of captions) {
        if (t < c.start || t >= c.start + c.dur) continue;
        const m = sprite(c);
        if (m.userData.card) {
          // Title cards cut in and out with a short fade, at full size.
          m.visible = true;
          m.material.opacity = Math.max(0, Math.min(1, (t - c.start) / 0.12, (c.start + c.dur - t) / 0.12));
          continue;
        }
        const k = ease("backOut", (t - c.start) / 0.3);
        const out = Math.min(1, (c.start + c.dur - t) / 0.2);
        m.visible = true;
        m.scale.setScalar(Math.max(0.001, k * (0.6 + 0.4 * out)));
        m.material.opacity = Math.max(0, out);
        if (c.style === "label" && !c.pos) {
          const base = height * STYLES.label.y;
          const half = m.geometry.parameters.height / 2;
          m.position.y = Math.max(base, subTop + height * 0.015 + half);
        }
      }
    },
  };
}
