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
};
const FONT = "Andika3D";

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
    const key = `${c.style}|${c.fill ?? ""}|${c.text}`;
    if (sprites.has(key)) return sprites.get(key);
    const st = STYLES[c.style] ?? STYLES.subtitle;
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
    mesh.position.set(width * st.x, height * st.y, 0); // x, y: fractions of the frame from the bottom left
    mesh.visible = false;
    scene.add(mesh);
    sprites.set(key, mesh);
    return mesh;
  }

  return {
    scene,
    camera,
    update(t) {
      for (const m of sprites.values()) m.visible = false;
      for (const c of captions) {
        if (t < c.start || t >= c.start + c.dur) continue;
        const m = sprite(c);
        const k = ease("backOut", (t - c.start) / 0.3);
        const out = Math.min(1, (c.start + c.dur - t) / 0.2);
        m.visible = true;
        m.scale.setScalar(Math.max(0.001, k * (0.6 + 0.4 * out)));
        m.material.opacity = Math.max(0, out);
      }
    },
  };
}
