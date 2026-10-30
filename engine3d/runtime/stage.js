// The stage: a plan (director.js) turned into a three.js scene, drawn at any time t. drawAt(t) is a pure
// function of t: it evaluates the timeline, poses every object and character clip, then renders the 3D scene
// and the caption overlay. Frames can be drawn in any order, so render chunks run in parallel.

import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { buildObject, createMaterials } from "./objects.js";
import { createOverlay } from "./overlay.js";

const DEG = Math.PI / 180;

/**
 * @param {HTMLCanvasElement} canvas
 * @param {object} plan  director plan
 * @param {{ catalog, assets, width:number, height:number }} o
 */
export function createStage(canvas, plan, { catalog, assets, width, height }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance", preserveDrawingBuffer: false });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.autoClear = false;

  const preset = { ...catalog.stages[plan.stage.preset ?? "playroom"], ...plan.stage };
  const rig = catalog.lights[preset.lights];
  const color = (name) => new THREE.Color(catalog.colors[name].hex);
  const scene = new THREE.Scene();
  scene.background = color(preset.background);
  if (preset.fog) scene.fog = new THREE.Fog(color(preset.background), preset.fog[0], preset.fog[1]);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = rig.environment;

  const [hi, sky, ground] = rig.hemisphere;
  const hemi = new THREE.HemisphereLight(sky, ground, hi);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, rig.sun.intensity);
  sun.position.set(...rig.sun.dir);
  if (rig.sun.shadow) {
    sun.castShadow = true;
    sun.shadow.mapSize.setScalar(height > 1500 ? 4096 : 2048);
    Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 0.5, far: 40 });
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.02;
    sun.shadow.radius = 4;
  }
  scene.add(sun, sun.target);

  const material = createMaterials(catalog);
  let floor = null;
  let rug = null;
  if (preset.floor) {
    floor = new THREE.Mesh(new THREE.CircleGeometry(60, 96), material(preset.floor, "matte"));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);
  }
  if (preset.rug) {
    // A thin rug (6 mm): everything stands on y = 0, so a thicker rug would swallow mats and boards on the floor.
    rug = new THREE.Mesh(new THREE.CylinderGeometry(4.6, 4.6, 0.006, 128), material(preset.rug, "matte").clone());
    rug.position.y = 0.003;
    rug.receiveShadow = true;
    scene.add(rug);
  }

  const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 200);
  const look = new THREE.Vector3();
  const handles = new Map();
  for (const o of plan.objects) {
    const h = buildObject(o, { catalog, assets, material, seed: plan.seed, height });
    if (o.pivot) for (const c of h.group.children) c.position.sub(new THREE.Vector3(...o.pivot));
    if (o.paint) h.tinted = paintable(h.group, catalog.colors[o.paint].hex);
    // paint with from: one material list per colour, driven by the timeline prop "tint:<colour>".
    h.tints = (o.paintParts ?? []).map((c) => [`tint:${c}`, paintable(h.group, catalog.colors[c].hex)]);
    // A child rides on its parent (or on one of the parent's named parts): its at is relative to it.
    const parent = o.parent ? handles.get(o.parent) : null;
    (parent ? parent.named?.get(o.part) ?? parent.group : scene).add(h.group);
    for (const w of h.world ?? []) scene.add(w);
    handles.set(o.id, h);
  }
  const clipLen = (id) => (name) => handles.get(id).actions.get(name)?.getClip().duration ?? 1;
  const overlay = createOverlay(width, height, plan.captions);
  const tl = plan.timeline;

  function pose(t) {
    const state = tl.evaluate(t);
    for (const [id, h] of handles) {
      const s = state[id];
      const g = h.group;
      g.position.set(s.position[0], s.position[1] + (s.hop ?? 0), s.position[2]);
      g.rotation.set(s.rotation[0] * DEG, s.rotation[1] * DEG, s.rotation[2] * DEG);
      g.scale.set(...s.scale.map((x) => Math.max(1e-4, x)));
      g.visible = s.visible && s.scale.some((x) => x > 1e-3);
      if (h.actions) {
        for (const a of h.actions.values()) a.setEffectiveWeight(0);
        for (const c of tl.clipsAt(id, t, clipLen(id))) {
          const a = h.actions.get(c.name);
          if (!a) continue;
          a.time = c.time;
          a.setEffectiveWeight(c.weight);
        }
        h.mixer.update(0);
      }
      if (h.tinted && s.tint) for (const m of h.tinted) m.color.setRGB(...s.tint, THREE.SRGBColorSpace);
      for (const [prop, mats] of h.tints) if (s[prop]) for (const m of mats) m.color.setRGB(...s[prop], THREE.SRGBColorSpace);
      h.update?.(t, s, state);
    }
    const st = state.stage;
    if (st) {
      scene.background.setRGB(...st.background, THREE.SRGBColorSpace);
      scene.fog?.color.copy(scene.background);
      if (floor && st.floor) floor.material.color.setRGB(...st.floor, THREE.SRGBColorSpace);
      if (rug && st.rug) rug.material.color.setRGB(...st.rug, THREE.SRGBColorSpace);
      sun.intensity = st.sun;
      hemi.intensity = st.hemi;
      hemi.color.setRGB(...st.sky, THREE.SRGBColorSpace);
      hemi.groundColor.setRGB(...st.ground, THREE.SRGBColorSpace);
      scene.environmentIntensity = st.environment;
    }
    const cam = state.camera;
    camera.position.set(...cam.position);
    camera.fov = cam.fov;
    camera.updateProjectionMatrix();
    camera.lookAt(look.set(...cam.lookAt));
    for (const fn of plan.hooks) fn(t, { scene, camera, objects: handles, THREE });
    overlay.update(t);
  }

  /** Give an object its own copies of the materials drawn in its main colour, so "paint" can change them. */
  function paintable(group, hex) {
    const want = new THREE.Color(hex).getHexString();
    const copies = new Map();
    group.traverse((m) => {
      if (!m.isMesh || m.material.color?.getHexString() !== want) return;
      if (!copies.has(m.material)) copies.set(m.material, m.material.clone());
      m.material = copies.get(m.material);
    });
    return [...copies.values()];
  }

  return {
    renderer,
    scene,
    camera,
    handles,
    /** Pose everything for time t and draw the frame into the canvas's drawing buffer. */
    drawAt(t) {
      pose(t);
      renderer.clear();
      renderer.render(scene, camera);
      renderer.clearDepth();
      renderer.render(overlay.scene, overlay.camera);
    },
  };
}
