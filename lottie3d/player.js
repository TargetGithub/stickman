// Lottie3D web player: plays a Lottie3D JSON document (SPEC.md v0.1, EDITOR_SPEC.md v0.2) on a <canvas>.
//
//   import { createPlayer } from "./player.js";
//   const p = createPlayer(canvas, json, { catalog });   // catalog (catalog/kids.json) is needed for v0.2
//   await p.ready;                                         // glTF characters loaded
//   p.play(); p.pause(); p.seek(1.25);
//
// Deterministic: every frame is a pure function of the document and t (sample.js evaluate, expand.js evaluateCast),
// with t snapped to whole frames. The only clock is the requestAnimationFrame timestamp that moves t while playing.
import { THREE, bubbleSprite, buildCharacter, buildPartsModel, buildProp, buildStage, disposeScene, loadCharacter, makeLight, materialFactory, mesh } from "./models.js";
import { docTime, evaluate } from "./sample.js";
import { evaluateCast, expand } from "./expand.js";
import { formatErrors, validate } from "./validate.js";

export { validate, formatErrors, evaluate, expand, evaluateCast };
export const VERSION = "0.2";

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
 * @param {{ catalog?: any, assetBase?: string|URL, autoplay?: boolean, onTime?: (t: number) => void,
 *   onEnd?: () => void, pixelRatio?: number }} [options]
 */
export function createPlayer(canvas, json, options = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(options.pixelRatio ?? Math.min(globalThis.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const assetBase = new URL(options.assetBase ?? "./catalog/", import.meta.url);

  let doc = null;
  let resolved = null; // v0.2 expansion
  let scene = null;
  let camera = null;
  const target = new THREE.Vector3();
  let chars = new Map(); // v0.1 characters
  let props = new Map(); // v0.1 props
  let cast = new Map(); // v0.2 cast: { outer, scaler, tilt, model }
  let bubbleLayer = null;
  let ready = Promise.resolve();
  let generation = 0;

  let clock = 0;
  let playing = false;
  let lastTs = null;
  let raf = 0;
  let disposed = false;

  function build(input) {
    const res = validate(input, { catalog: options.catalog });
    if (!res.ok) throw new Lottie3DError(res.errors);
    const v02 = res.doc.version === "0.2";
    if (v02 && !options.catalog) throw new Error("a v0.2 document needs the kids catalog: createPlayer(canvas, json, { catalog })");
    if (scene) disposeScene(scene);
    generation++;
    doc = res.doc;
    resolved = v02 ? expand(doc, options.catalog) : null;
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(doc.scene?.camera?.fov ?? 40, 1, 0.05, 200);
    if (doc.stage) {
      const stage = buildStage(options.catalog.stages[doc.stage]);
      scene.background = stage.background;
      scene.fog = stage.fog;
      scene.add(stage.group);
    } else buildScene(doc.scene);
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
    cast = new Map();
    const loads = [];
    if (resolved) {
      const material = materialFactory(options.catalog.materials);
      for (const m of resolved.cast) {
        const model = options.catalog.models[m.name];
        const slot = castSlot(m.height);
        scene.add(slot.outer);
        cast.set(m.id, slot);
        if (m.kind === "rig") {
          const built = buildCharacter({ rig: model.rig, color: m.color ?? model.color, accent: model.accent });
          slot.inner.add(built.group);
          slot.model = { joints: built.joints };
        } else if (m.kind === "character") {
          const gen = generation;
          loads.push(loadCharacter(new URL(model.file, assetBase).href, model).then((c) => {
            if (gen !== generation) return;
            slot.inner.add(c.group);
            slot.model = { pose: c.pose };
          }));
        } else {
          const built = buildPartsModel(model, { id: m.id, color: m.color }, material);
          slot.inner.add(built.group);
          slot.model = { update: built.update };
        }
      }
      bubbleLayer = new THREE.Group();
      scene.add(bubbleLayer);
    }
    ready = Promise.all(loads).then(() => render());
    clock = 0;
    lastTs = null;
    resize();
    render();
  }

  function buildScene(s) {
    scene.background = new THREE.Color(s.background);
    for (const l of s.lights ?? DEFAULT_LIGHTS) scene.add(makeLight(l));
    if (s.ground) {
      const size = s.ground.size ?? 20;
      const ground = mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshStandardMaterial({ color: s.ground.color ?? "#dddddd", roughness: 0.95 }));
      ground.rotation.x = -Math.PI / 2;
      ground.castShadow = false;
      scene.add(ground);
    }
  }

  /** outer (position, yaw) → scaler (size × scale) → tilt (pitch and roll about the middle) → inner (model). */
  function castSlot(height) {
    const outer = new THREE.Group();
    const scaler = new THREE.Group();
    const tilt = new THREE.Group();
    const inner = new THREE.Group();
    tilt.position.y = height / 2;
    inner.position.y = -height / 2;
    outer.add(scaler);
    scaler.add(tilt);
    tilt.add(inner);
    return { outer, scaler, tilt, inner, model: null };
  }

  function render() {
    if (!doc || disposed) return;
    const t = docTime(doc, clock);
    const low = evaluate({ ...doc, scene: doc.scene ?? { camera: { position: [0, 1.6, 6] } } }, t);
    const high = resolved ? evaluateCast(resolved, t, options.catalog) : null;
    const cam = high?.camera ?? low.camera;
    camera.position.fromArray(cam.position);
    target.fromArray(cam.target);
    camera.lookAt(target);
    if (camera.fov !== cam.fov) {
      camera.fov = cam.fov;
      camera.updateProjectionMatrix();
    }
    for (const c of low.characters) {
      const built = chars.get(c.id);
      built.group.position.fromArray(c.position);
      built.group.rotation.set(0, c.yaw * DEG, 0);
      built.group.scale.setScalar(c.scale);
      applyJoints(built.joints, c.joints);
    }
    for (const p of low.props) {
      const obj = props.get(p.id);
      obj.position.fromArray(p.position);
      obj.rotation.set(p.rotation[0] * DEG, p.rotation[1] * DEG, p.rotation[2] * DEG, "XYZ");
      obj.scale.fromArray(p.scale);
    }
    if (high) renderCast(high, t);
    renderer.render(scene, camera);
    options.onTime?.(t);
  }

  function renderCast(f, t) {
    for (const c of f.cast) {
      const slot = cast.get(c.id);
      const m = resolved.cast.find((x) => x.id === c.id);
      slot.outer.position.fromArray(c.position);
      slot.outer.rotation.set(0, c.rotation[1] * DEG, 0);
      slot.scaler.scale.set(c.scale[0] * m.size, c.scale[1] * m.size, c.scale[2] * m.size);
      slot.tilt.rotation.set(c.rotation[0] * DEG, 0, c.rotation[2] * DEG);
      slot.outer.visible = c.scale[1] > 1e-4;
      if (slot.model?.joints) applyJoints(slot.model.joints, c.joints);
      if (slot.model?.update) slot.model.update(t, c.eyes);
      if (slot.model?.pose && c.clip) slot.model.pose(c.clip);
    }
    bubbleLayer.clear();
    const stacked = new Map();
    for (const e of f.events) {
      const slot = cast.get(e.who);
      const m = resolved.cast.find((x) => x.id === e.who);
      const c = f.cast.find((x) => x.id === e.who);
      if (!slot?.outer.visible) continue;
      const sprite = bubbleSprite(e.type === "sound" ? `🔊 ${e.text}` : e.text);
      const k = stacked.get(e.who) ?? 0;
      stacked.set(e.who, k + 1);
      sprite.position.set(c.position[0], c.position[1] + m.height * m.size * c.scale[1] + 0.25 + k * 0.5, c.position[2]);
      bubbleLayer.add(sprite);
    }
  }

  function applyJoints(nodes, rotations) {
    for (const name in nodes) {
      const r = rotations[name];
      if (r) nodes[name].rotation.set(r[0] * DEG, r[1] * DEG, r[2] * DEG, "XYZ");
      else nodes[name].rotation.set(0, 0, 0);
    }
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
    /** Resolves when every glTF character of the current document has loaded. */
    get ready() { return ready; },
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

/**
 * Register <lottie3d-player src="anim.json" catalog="catalog/kids.json" autoplay></lottie3d-player>.
 * @param {string} [tag]
 */
export function defineElement(tag = "lottie3d-player") {
  if (customElements.get(tag)) return;
  customElements.define(tag, class extends HTMLElement {
    async connectedCallback() {
      const shadow = this.shadowRoot ?? this.attachShadow({ mode: "open" });
      shadow.innerHTML = `<style>:host{display:block;aspect-ratio:16/9}canvas{width:100%;height:100%;display:block}</style><canvas></canvas>`;
      const text = await (await fetch(this.getAttribute("src"))).text();
      const cat = this.getAttribute("catalog");
      const catalog = cat ? await (await fetch(cat)).json() : undefined;
      this.player = createPlayer(shadow.querySelector("canvas"), text, { catalog, autoplay: this.hasAttribute("autoplay") });
    }
    disconnectedCallback() {
      this.player?.dispose();
    }
  });
}
