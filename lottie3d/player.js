// Lottie3D web player v0.1: plays a Lottie3D JSON document (SPEC.md) on a <canvas> with Three.js.
//
//   import { createPlayer } from "./player.js";
//   const p = createPlayer(canvas, json);   // throws Lottie3DError if json is invalid
//   p.play(); p.pause(); p.seek(1.25);
//
// Deterministic: each frame is evaluate(doc, t) from sample.js, a pure function of time snapped to whole
// frames. The only clock is the requestAnimationFrame timestamp, used to advance t while playing.
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js";
import { HEAD_CENTER, SKELETON } from "./rig.js";
import { docTime, evaluate } from "./sample.js";
import { formatErrors, validate } from "./validate.js";

export { validate, formatErrors, evaluate };
export const VERSION = "0.1";

export class Lottie3DError extends Error {
  /** @param {import("./validate.js").ValidationError[]} errors */
  constructor(errors) {
    super(`invalid Lottie3D document:\n${formatErrors(errors)}`);
    this.name = "Lottie3DError";
    this.errors = errors;
  }
}

const DEG = Math.PI / 180;
const DEFAULT_LIGHTS = [
  { type: "ambient", intensity: 0.6 },
  { type: "directional", intensity: 1.2, position: [3, 6, 4], shadow: true },
];

/**
 * @param {HTMLCanvasElement} canvas
 * @param {object|string} json  a Lottie3D document or its JSON text
 * @param {{ autoplay?: boolean, onTime?: (t: number) => void, onEnd?: () => void, pixelRatio?: number }} [options]
 */
export function createPlayer(canvas, json, options = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(options.pixelRatio ?? Math.min(globalThis.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  let doc = null;
  let scene = null;
  let camera = null;
  let target = new THREE.Vector3();
  /** @type {Map<string, {group: THREE.Group, joints: Record<string, THREE.Object3D>}>} */
  let chars = new Map();
  /** @type {Map<string, THREE.Object3D>} */
  let props = new Map();

  let clock = 0; // seconds of document time before snapping/looping
  let playing = false;
  let lastTs = null;
  let raf = 0;
  let disposed = false;

  function build(input) {
    const res = validate(input);
    if (!res.ok) throw new Lottie3DError(res.errors);
    if (scene) disposeScene(scene);
    doc = res.doc;
    scene = new THREE.Scene();
    scene.background = new THREE.Color(doc.scene.background);
    camera = new THREE.PerspectiveCamera(doc.scene.camera.fov ?? 40, 1, 0.05, 200);
    for (const l of doc.scene.lights ?? DEFAULT_LIGHTS) scene.add(makeLight(l));
    if (doc.scene.ground) {
      const size = doc.scene.ground.size ?? 20;
      const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(size, size),
        new THREE.MeshStandardMaterial({ color: doc.scene.ground.color ?? "#dddddd", roughness: 0.95 }),
      );
      ground.rotation.x = -Math.PI / 2;
      ground.receiveShadow = true;
      scene.add(ground);
    }
    chars = new Map();
    for (const c of doc.characters ?? []) {
      const built = buildCharacter(c);
      scene.add(built.group);
      chars.set(c.id, built);
    }
    props = new Map();
    for (const p of doc.props ?? []) {
      const obj = buildProp(p);
      scene.add(obj);
      props.set(p.id, obj);
    }
    clock = 0;
    lastTs = null;
    resize();
    render();
  }

  function render() {
    if (!doc || disposed) return;
    const t = docTime(doc, clock);
    const f = evaluate(doc, t);
    camera.position.fromArray(f.camera.position);
    target.fromArray(f.camera.target);
    camera.lookAt(target);
    if (camera.fov !== f.camera.fov) {
      camera.fov = f.camera.fov;
      camera.updateProjectionMatrix();
    }
    for (const c of f.characters) {
      const built = chars.get(c.id);
      built.group.position.fromArray(c.position);
      built.group.rotation.set(0, c.yaw * DEG, 0);
      built.group.scale.setScalar(c.scale);
      for (const name in built.joints) {
        const r = c.joints[name];
        if (r) built.joints[name].rotation.set(r[0] * DEG, r[1] * DEG, r[2] * DEG, "XYZ");
        else built.joints[name].rotation.set(0, 0, 0);
      }
    }
    for (const p of f.props) {
      const obj = props.get(p.id);
      obj.position.fromArray(p.position);
      obj.rotation.set(p.rotation[0] * DEG, p.rotation[1] * DEG, p.rotation[2] * DEG, "XYZ");
      obj.scale.fromArray(p.scale);
    }
    renderer.render(scene, camera);
    options.onTime?.(t);
  }

  function tick(ts) {
    raf = 0;
    if (!playing || disposed) return;
    if (lastTs !== null) clock += (ts - lastTs) / 1000;
    lastTs = ts;
    if (doc.loop === false && clock >= doc.duration) {
      clock = doc.duration;
      playing = false;
      render();
      options.onEnd?.();
      return;
    }
    render();
    raf = requestAnimationFrame(tick);
  }

  function resize() {
    const w = canvas.clientWidth || canvas.width || 640;
    const h = canvas.clientHeight || canvas.height || 360;
    renderer.setSize(w, h, false);
    if (camera) {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
  }
  const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => { resize(); render(); }) : null;
  ro?.observe(canvas);

  build(json);

  const api = {
    play() {
      if (playing || disposed) return;
      if (doc.loop === false && clock >= doc.duration) clock = 0;
      playing = true;
      lastTs = null;
      raf = requestAnimationFrame(tick);
    },
    pause() {
      playing = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    },
    /** Jump to document time t (seconds); keeps playing if it was playing. */
    seek(t) {
      clock = Math.min(Math.max(Number(t) || 0, 0), doc.duration);
      lastTs = null;
      render();
    },
    /** Replace the document (validated) and show its first frame. */
    load(input) {
      const was = playing;
      api.pause();
      build(input);
      if (was) api.play();
    },
    get time() { return docTime(doc, clock); },
    get duration() { return doc.duration; },
    get fps() { return doc.fps; },
    get playing() { return playing; },
    get document() { return doc; },
    dispose() {
      api.pause();
      disposed = true;
      ro?.disconnect();
      if (scene) disposeScene(scene);
      renderer.dispose();
    },
  };
  if (options.autoplay) api.play();
  return api;
}

function makeLight(l) {
  const color = l.color ?? "#ffffff";
  const intensity = l.intensity ?? 1;
  let light;
  if (l.type === "ambient") light = new THREE.AmbientLight(color, intensity);
  else if (l.type === "hemisphere") light = new THREE.HemisphereLight(color, l.groundColor ?? "#444444", intensity);
  else if (l.type === "point") light = new THREE.PointLight(color, intensity, 0, 2);
  else {
    light = new THREE.DirectionalLight(color, intensity);
    if (l.shadow) {
      light.castShadow = true;
      light.shadow.mapSize.set(1024, 1024);
      Object.assign(light.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 0.5, far: 30 });
      light.shadow.bias = -0.0005;
    }
  }
  if (l.position) light.position.fromArray(l.position);
  return light;
}

function mesh(geometry, material) {
  const m = new THREE.Mesh(geometry, material);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/** Build the shared skeleton and dress it with stick or block parts. */
function buildCharacter(c) {
  const block = c.rig === "block";
  const body = new THREE.MeshStandardMaterial({ color: c.color ?? "#333333", roughness: 0.6, flatShading: block });
  const skin = new THREE.MeshStandardMaterial({ color: c.accent ?? "#f2c48d", roughness: 0.5, flatShading: block });
  const dark = new THREE.MeshStandardMaterial({ color: "#1a1a1a", roughness: 0.4 });
  const group = new THREE.Group();
  /** @type {Record<string, THREE.Object3D>} */
  const joints = {};
  for (const j of SKELETON) {
    const node = new THREE.Object3D();
    node.name = j.name;
    node.position.fromArray(j.offset);
    (j.parent ? joints[j.parent] : group).add(node);
    joints[j.name] = node;
    const len = Math.abs(j.bone);
    const dir = Math.sign(j.bone);
    if (len > 0 && j.name !== "neck") {
      const limb = j.name === "spine";
      const geo = block
        ? new THREE.BoxGeometry(limb ? 0.34 : 0.12, len, limb ? 0.2 : 0.12)
        : new THREE.CylinderGeometry(limb ? 0.05 : 0.035, limb ? 0.05 : 0.035, len, 12);
      const part = mesh(geo, body);
      part.position.y = (dir * len) / 2;
      node.add(part);
    }
    if (j.name === "neck") {
      const neck = mesh(block ? new THREE.BoxGeometry(0.08, 0.1, 0.08) : new THREE.CylinderGeometry(0.03, 0.03, 0.1, 8), body);
      neck.position.y = 0.05;
      node.add(neck);
      const head = mesh(block ? new THREE.BoxGeometry(0.26, 0.26, 0.26) : new THREE.SphereGeometry(0.13, 24, 16), skin);
      head.position.y = HEAD_CENTER;
      node.add(head);
      for (const x of [-0.045, 0.045]) {
        const eye = mesh(block ? new THREE.BoxGeometry(0.035, 0.05, 0.02) : new THREE.SphereGeometry(0.018, 10, 8), dark);
        eye.position.set(x, HEAD_CENTER + 0.03, block ? 0.13 : 0.118);
        node.add(eye);
      }
    }
    if (j.end === "hand") {
      const hand = mesh(block ? new THREE.BoxGeometry(0.1, 0.1, 0.1) : new THREE.SphereGeometry(0.05, 12, 10), skin);
      hand.position.y = j.bone;
      node.add(hand);
    }
    if (j.end === "foot") {
      const foot = mesh(new THREE.BoxGeometry(block ? 0.13 : 0.09, 0.05, 0.2), body);
      foot.position.set(0, j.bone - 0.025, 0.05);
      node.add(foot);
    }
  }
  // Shoulder bar and pelvis join the limbs to the torso.
  const shoulders = mesh(block ? new THREE.BoxGeometry(0.46, 0.1, 0.18) : new THREE.CylinderGeometry(0.035, 0.035, 0.36, 8), body);
  if (!block) shoulders.rotation.z = Math.PI / 2;
  shoulders.position.y = 0.46;
  joints.spine.add(shoulders);
  const pelvis = mesh(block ? new THREE.BoxGeometry(0.32, 0.14, 0.2) : new THREE.CylinderGeometry(0.04, 0.04, 0.24, 8), body);
  if (!block) pelvis.rotation.z = Math.PI / 2;
  joints.root.add(pelvis);
  return { group, joints };
}

function buildProp(p) {
  const size = p.size ?? 0.5;
  const s = Array.isArray(size) ? size : [size, size, size];
  const mat = new THREE.MeshStandardMaterial({ color: p.color ?? "#888888", roughness: 0.5 });
  const outer = new THREE.Group();
  let geo;
  if (p.type === "box") geo = new THREE.BoxGeometry(1, 1, 1);
  else if (p.type === "cylinder") geo = new THREE.CylinderGeometry(0.5, 0.5, 1, 24);
  else if (p.type === "cone") geo = new THREE.ConeGeometry(0.5, 1, 24);
  else geo = new THREE.SphereGeometry(0.5, 32, 20);
  const body = mesh(geo, mat);
  body.scale.fromArray(s);
  outer.add(body);
  if (p.type === "ball") {
    const stripe = mesh(new THREE.TorusGeometry(0.5, 0.06, 8, 40), new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.5 }));
    stripe.scale.fromArray(s);
    outer.add(stripe);
  }
  return outer;
}

function disposeScene(scene) {
  scene.traverse((o) => {
    o.geometry?.dispose();
    if (o.material) [].concat(o.material).forEach((m) => m.dispose());
  });
}

/**
 * Register <lottie3d-player src="anim.json" autoplay></lottie3d-player>, the drop-in embed.
 * @param {string} [tag]
 */
export function defineElement(tag = "lottie3d-player") {
  if (customElements.get(tag)) return;
  customElements.define(tag, class extends HTMLElement {
    async connectedCallback() {
      const shadow = this.shadowRoot ?? this.attachShadow({ mode: "open" });
      shadow.innerHTML = `<style>:host{display:block;aspect-ratio:16/9}canvas{width:100%;height:100%;display:block}</style><canvas></canvas>`;
      const res = await fetch(this.getAttribute("src"));
      this.player = createPlayer(shadow.querySelector("canvas"), await res.text(), { autoplay: this.hasAttribute("autoplay") });
    }
    disconnectedCallback() {
      this.player?.dispose();
    }
  });
}
