// The stage: a plan (director.js) turned into a three.js scene, drawn at any time t. drawAt(t) is a pure
// function of t: it evaluates the timeline, poses every object and character clip, then renders the 3D scene
// and the caption overlay. Frames can be drawn in any order, so render chunks run in parallel.

import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { buildObject, createMaterials } from "./objects.js";
import { createOverlay } from "./overlay.js";
import { NO_FOG } from "./stage_change.js";

const DEG = Math.PI / 180;
const KIT_PAINT = new Set(["stroke", "pointer", "number_line"]);

/**
 * @param {HTMLCanvasElement} canvas
 * @param {object} plan  director plan
 * @param {{ catalog, assets, width:number, height:number }} o
 */
export function createStage(canvas, plan, { catalog, assets, width, height }) {
  // stencil: 3D toon mouths (toon_mouth.js) draw their insides only through the opening.
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, stencil: true, powerPreference: "high-performance", preserveDrawingBuffer: false });
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
  // A plan with `stage` changes lists every preset it shows: fog, floor, rug and shadows exist for all of them.
  const visits = (plan.stage.presets ?? []).map((p) => ({ ...catalog.stages[p], rig: catalog.lights[catalog.stages[p].lights] }));
  const changes = visits.length > 0;
  const scene = new THREE.Scene();
  scene.background = color(preset.background);
  if (preset.fog || changes) scene.fog = new THREE.Fog(color(preset.background), ...(preset.fog ?? NO_FOG));
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = rig.environment;

  const [hi, sky, ground] = rig.hemisphere;
  const hemi = new THREE.HemisphereLight(sky, ground, hi);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, rig.sun.intensity);
  sun.position.set(...rig.sun.dir);
  if (rig.sun.shadow || visits.some((v) => v.rig.sun.shadow)) {
    sun.castShadow = !!rig.sun.shadow;
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
  const floorColor = preset.floor ?? visits.find((v) => v.floor)?.floor;
  if (floorColor) {
    floor = new THREE.Mesh(new THREE.CircleGeometry(60, 96), changes ? material(floorColor, "matte").clone() : material(floorColor, "matte"));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);
  }
  if (preset.rug || visits.some((v) => v.rug)) {
    // A thin rug (6 mm): everything stands on y = 0, so a thicker rug would swallow mats and boards on the floor.
    rug = new THREE.Mesh(new THREE.CylinderGeometry(4.6, 4.6, 0.006, 128), material(preset.rug ?? floorColor ?? preset.background, "matte").clone());
    rug.position.y = 0.003;
    rug.receiveShadow = true;
    scene.add(rug);
  }

  const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 200);
  const look = new THREE.Vector3();
  const handles = new Map();
  for (const o of plan.objects) {
    // Painted strokes, pointers and number lines get their own copies of their colour's materials (also for
    // meshes rebuilt later, like a pointer's head), which "tint" drives.
    const own = o.paint && KIT_PAINT.has(o.kind) ? ownColor(material, o.paint) : null;
    const h = buildObject(o, { catalog, assets, material: own?.material ?? material, seed: plan.seed, height, handles });
    if (o.pivot) for (const c of h.group.children) c.position.sub(new THREE.Vector3(...o.pivot));
    if (own) h.tinted = own.copies;
    else if (o.paint) h.tinted = paintable(h.group, catalog.colors[o.paint].hex);
    // paint with from: one material list per colour, driven by the timeline prop "tint:<colour>".
    h.tints = (o.paintParts ?? []).map((c) => [`tint:${c}`, paintable(h.group, catalog.colors[c].hex)]);
    // A child rides on its parent (or on one of the parent's named parts): its at is relative to it.
    const parent = o.parent ? handles.get(o.parent) : null;
    (parent ? parent.named?.get(o.part) ?? parent.group : scene).add(h.group);
    h.parentRef = o.parent == null ? "" : o.part != null ? `${o.parent}#${o.part}` : o.parent;
    for (const w of h.world ?? []) scene.add(w);
    h.group.userData.handle = true;
    handles.set(o.id, h);
  }
  /** reparent: hang an object on the node its "parentRef" prop names at t ("id", "id#part" or "" for the world). */
  const attach = (h, ref) => {
    const [pid, part] = ref.split("#");
    const p = pid ? handles.get(pid) : null;
    (p ? (part ? p.named?.get(part) ?? p.group : p.group) : scene).add(h.group);
    h.parentRef = ref;
  };
  const clipLen = (id) => (name) => handles.get(id).actions.get(name)?.getClip().duration ?? 1;
  const overlay = createOverlay(width, height, plan.captions);
  const tl = plan.timeline;

  function pose(t) {
    const state = tl.evaluate(t);
    for (const [id, h] of handles) {
      const s = state[id];
      const g = h.group;
      if (s.parentRef != null && s.parentRef !== h.parentRef) attach(h, s.parentRef);
      g.position.set(s.position[0], s.position[1] + (s.hop ?? 0), s.position[2]);
      g.rotation.set(s.rotation[0] * DEG, s.rotation[1] * DEG, s.rotation[2] * DEG);
      g.scale.set(...s.scale.map((x) => Math.max(1e-4, x)));
      g.visible = s.visible && s.scale.some((x) => x > 1e-3) && (s.fade == null || s.fade > 0.002);
      if (s.fade != null) fadeTo(g, s.fade); // set pieces of a stage change
      if (h.actions) {
        h.beforeMix?.(); // the clip pose under last frame's look/point/talk turns (talk.js)
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
      // Stage changes (stage_change.js): fog distances, floor and rug fading in and out, the sun's way and shadow.
      if (st.fog && scene.fog) [scene.fog.near, scene.fog.far] = st.fog;
      if (floor && st.floorFade != null) fadeTo(floor, st.floorFade);
      if (rug && st.rugFade != null) fadeTo(rug, st.rugFade);
      if (st.sunDir) sun.position.set(...st.sunDir);
      if (st.shadow != null) sun.castShadow = st.shadow;
    }
    const cam = state.camera;
    camera.position.set(...cam.position);
    camera.fov = cam.fov;
    camera.updateProjectionMatrix();
    camera.lookAt(look.set(...cam.lookAt));
    for (const fn of plan.hooks) fn(t, { scene, camera, objects: handles, THREE });
    overlay.update(t);
  }

  /**
   * Fade an object (a set piece, the floor, the rug) to opacity k (0-1): the first time, its meshes get their own
   * material copies (not those of objects riding on it, which fade themselves); see-through while k < 1.
   */
  function fadeTo(root, k) {
    if (!root.userData.fade) {
      const list = [];
      const walk = (n) => {
        if (n !== root && n.userData.handle) return;
        if (n.isMesh) {
          n.material = n.material.clone();
          list.push({ m: n.material, opacity: n.material.opacity, transparent: n.material.transparent, depthWrite: n.material.depthWrite });
        }
        for (const c of n.children) walk(c);
      };
      walk(root);
      root.userData.fade = list;
    }
    const u = Math.max(0, Math.min(1, k));
    for (const f of root.userData.fade) {
      const see = f.transparent || u < 0.999;
      if (f.m.transparent !== see) {
        f.m.transparent = see;
        f.m.needsUpdate = true;
      }
      f.m.opacity = f.opacity * u;
      f.m.depthWrite = f.depthWrite && u >= 0.999;
    }
    if (root !== floor && root !== rug) return;
    root.visible = u > 0.002;
  }

  /** A material function that hands out the object's own copies for one colour (any style); copies lists them. */
  function ownColor(material, color) {
    const mine = new Map();
    const copies = [];
    const fn = (c = "white", style = "toy") => {
      if (c !== color) return material(c, style);
      if (!mine.has(style)) {
        mine.set(style, material(c, style).clone());
        copies.push(mine.get(style));
      }
      return mine.get(style);
    };
    return { material: fn, copies };
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
