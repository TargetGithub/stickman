// Three.js builders for the Lottie3D player: v0.1 rigs and props, v0.2 stages, part models (critters and props from
// the kids catalog, after engine3d/runtime/models.js) and glTF characters. Renderer only: nothing here decides
// where things are; it only draws what expand/evaluate computed. Idle motion and blinks are closed-form in t.
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.170.0/+esm";
import { GLTFLoader } from "https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/loaders/GLTFLoader.js/+esm";
import { clone as cloneSkinned } from "https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/utils/SkeletonUtils.js/+esm";
import { HEAD_CENTER, SKELETON } from "./rig.js";

export { THREE };
const DEG = Math.PI / 180;

export function mesh(geometry, material) {
  const m = new THREE.Mesh(geometry, material);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export function makeLight(l) {
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
      Object.assign(light.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 0.5, far: 40 });
      light.shadow.bias = -0.0005;
    }
  }
  if (l.position) light.position.fromArray(l.position);
  return light;
}

/** A stage from the kids catalog: background, fog, light rig, floor and rug. */
export function buildStage(stage) {
  const group = new THREE.Group();
  const background = new THREE.Color(stage.background);
  const fog = stage.fog ? new THREE.Fog(stage.background, stage.fog[0], stage.fog[1]) : null;
  const [hi, sky, ground] = stage.lights.hemisphere;
  group.add(new THREE.HemisphereLight(sky, ground, hi));
  if (stage.lights.ambient) group.add(new THREE.AmbientLight("#ffffff", stage.lights.ambient));
  const sun = stage.lights.sun;
  const d = new THREE.Vector3(...sun.dir).normalize().multiplyScalar(14);
  group.add(makeLight({ type: "directional", intensity: sun.intensity, position: d.toArray(), shadow: sun.shadow }));
  if (stage.floor) {
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshStandardMaterial({ color: stage.floor, roughness: 0.95 }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    group.add(floor);
  }
  if (stage.rug) {
    const rug = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 0.02, 64), new THREE.MeshStandardMaterial({ color: stage.rug, roughness: 0.9 }));
    rug.position.y = 0.01;
    rug.receiveShadow = true;
    group.add(rug);
  }
  return { group, background, fog };
}

/** The v0.1 skeleton dressed as a stick or block figure. */
export function buildCharacter(c) {
  const block = c.rig === "block";
  const body = new THREE.MeshStandardMaterial({ color: c.color ?? "#333333", roughness: 0.6, flatShading: block });
  const skin = new THREE.MeshStandardMaterial({ color: c.accent ?? "#f2c48d", roughness: 0.5, flatShading: block });
  const dark = new THREE.MeshStandardMaterial({ color: "#1a1a1a", roughness: 0.4 });
  const group = new THREE.Group();
  const joints = {};
  for (const j of SKELETON) {
    const node = new THREE.Object3D();
    node.name = j.name;
    node.position.fromArray(j.offset);
    (j.parent ? joints[j.parent] : group).add(node);
    joints[j.name] = node;
    const len = Math.abs(j.bone);
    if (len > 0 && j.name !== "neck") {
      const limb = j.name === "spine";
      const geo = block
        ? new THREE.BoxGeometry(limb ? 0.34 : 0.12, len, limb ? 0.2 : 0.12)
        : new THREE.CylinderGeometry(limb ? 0.05 : 0.035, limb ? 0.05 : 0.035, len, 12);
      const part = mesh(geo, body);
      part.position.y = (Math.sign(j.bone) * len) / 2;
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
  const shoulders = mesh(block ? new THREE.BoxGeometry(0.46, 0.1, 0.18) : new THREE.CylinderGeometry(0.035, 0.035, 0.36, 8), body);
  if (!block) shoulders.rotation.z = Math.PI / 2;
  shoulders.position.y = 0.46;
  joints.spine.add(shoulders);
  const pelvis = mesh(block ? new THREE.BoxGeometry(0.32, 0.14, 0.2) : new THREE.CylinderGeometry(0.04, 0.04, 0.24, 8), body);
  if (!block) pelvis.rotation.z = Math.PI / 2;
  joints.root.add(pelvis);
  return { group, joints };
}

/** A v0.1 prop: box, sphere, ball, cylinder or cone. */
export function buildProp(p) {
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

const geometries = new Map();
function shapeGeometry(name) {
  if (!geometries.has(name)) {
    let g;
    if (name === "sphere") g = new THREE.SphereGeometry(0.5, 40, 28);
    else if (name === "cylinder") g = new THREE.CylinderGeometry(0.5, 0.5, 1, 40);
    else if (name === "cone") g = new THREE.ConeGeometry(0.5, 1, 40);
    else if (name === "capsule") g = new THREE.CapsuleGeometry(0.25, 0.5, 8, 24).scale(2, 1, 2);
    else if (name === "torus") g = new THREE.TorusGeometry(0.35, 0.15, 24, 64);
    else if (name === "smile") g = new THREE.TorusGeometry(0.5, 0.09, 12, 32, Math.PI * 0.7).rotateZ(Math.PI + Math.PI * 0.15);
    else g = new THREE.BoxGeometry(1, 1, 1); // box, block, cube (engine3d rounds their edges)
    geometries.set(name, g);
  }
  return geometries.get(name);
}

/** Materials from the catalog's surface styles, one per (colour, style). */
export function materialFactory(styles) {
  const cache = new Map();
  return (hex, style = "toy") => {
    const key = `${hex}|${style}`;
    if (!cache.has(key)) {
      const s = styles[style] ?? styles.toy ?? {};
      const m = new THREE.MeshPhysicalMaterial({ color: hex, roughness: s.roughness ?? 0.4, metalness: s.metalness ?? 0, clearcoat: s.clearcoat ?? 0, clearcoatRoughness: s.clearcoatRoughness ?? 0 });
      if (s.emissive) {
        m.emissive = new THREE.Color(hex);
        m.emissiveIntensity = s.emissive;
      }
      cache.set(key, m);
    }
    return cache.get(key);
  };
}

/** Deterministic 32-bit string hash (blink phases), so no randomness is needed. */
function hash32(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/**
 * A critter or prop from its parts. update(t, eyes) applies idle motion, blinks and the eyes channel.
 * @returns {{ group: THREE.Group, update: (t: number, eyes: number) => void }}
 */
export function buildPartsModel(model, { id, color }, material) {
  const group = new THREE.Group();
  const body = new THREE.Group();
  group.add(body);
  const head = new THREE.Group();
  head.position.fromArray(model.head?.at ?? [0, 0, 0]);
  body.add(head);
  const named = new Map([["head", [head]]]);
  const main = color ?? model.color;
  const idlers = [];
  for (const p of model.parts) {
    const parents = p.on === "head" ? [head] : p.on ? named.get(p.on) ?? [body] : [body];
    const copies = [];
    if (p.repeat) {
      const { n, radius, start = 0 } = p.repeat;
      for (let k = 0; k < n; k++) {
        const a = start * DEG + (k * 2 * Math.PI) / n;
        copies.push({ at: [p.at[0] + Math.cos(a) * radius, p.at[1] + Math.sin(a) * radius, p.at[2]], r: [0, 0, a / DEG - 90 + (p.r?.[2] ?? 0)] });
      }
    } else copies.push({ at: p.at ?? [0, 0, 0], r: p.r ?? [0, 0, 0] });
    if (p.mirror) for (const c of [...copies]) copies.push({ at: [-c.at[0], c.at[1], c.at[2]], r: [c.r[0], -c.r[1], -c.r[2]], mirrored: true });
    const made = copies.map((c, k) => {
      const pivot = new THREE.Group();
      pivot.position.fromArray(c.at);
      pivot.rotation.set(c.r[0] * DEG, c.r[1] * DEG, c.r[2] * DEG);
      const m = mesh(shapeGeometry(p.p), material(p.c ?? main, p.m ?? "toy"));
      const s = Array.isArray(p.s) ? p.s : [p.s ?? 0.2, p.s ?? 0.2, p.s ?? 0.2];
      m.scale.fromArray(s);
      if (p.hang) m.position.set(c.mirrored ? -p.hang[0] : p.hang[0], p.hang[1], p.hang[2]);
      if (p.hr) m.rotation.set(p.hr[0] * DEG, (c.mirrored ? -p.hr[1] : p.hr[1]) * DEG, (c.mirrored ? -p.hr[2] : p.hr[2]) * DEG);
      pivot.add(m);
      (parents[k] ?? parents[0]).add(pivot);
      if (p.idle) idlers.push({ pivot, rest: pivot.rotation.clone(), idle: p.idle, sign: c.mirrored ? -1 : 1 });
      return pivot;
    });
    if (p.name) named.set(p.name, [...(named.get(p.name) ?? []), ...made]);
  }
  const eyes = [];
  if (model.eyes) {
    for (const side of [1, -1]) {
      const g = new THREE.Group();
      g.position.set(side * model.eyes.at[0], model.eyes.at[1], model.eyes.at[2]);
      const size = model.eyes.size;
      const ball = mesh(shapeGeometry("sphere"), material(model.eyes.color, "glossy"));
      ball.scale.set(size, size * 1.15, size * 0.6);
      const shine = new THREE.Mesh(shapeGeometry("sphere"), material("#ffffff", "glow"));
      shine.scale.setScalar(size * 0.32);
      shine.position.set(-size * 0.18, size * 0.22, size * 0.26);
      g.add(ball, shine);
      head.add(g);
      eyes.push(g);
    }
  }
  if (model.cheeks) {
    for (const side of [1, -1]) {
      const c = new THREE.Mesh(shapeGeometry("sphere"), material(model.cheeks.color, "matte"));
      c.scale.set(model.cheeks.size, model.cheeks.size * model.cheeks.tall, model.cheeks.size * 0.35);
      c.position.set(side * model.cheeks.at[0], model.cheeks.at[1], model.cheeks.at[2]);
      head.add(c);
    }
  }
  if (model.mouth) {
    const m = new THREE.Mesh(shapeGeometry("smile"), material(model.mouth.color, "matte"));
    m.scale.set(model.mouth.size, model.mouth.size * 0.8, model.mouth.size * 0.6);
    m.position.fromArray(model.mouth.at);
    head.add(m);
  }
  const phase = (hash32(id) % 3600) / 1000;
  const bob = model.bob ?? 0;
  return {
    group,
    update(t, open) {
      body.position.y = bob * Math.abs(Math.sin(Math.PI * 1.2 * t));
      for (const { pivot, rest, idle, sign } of idlers) {
        const w = Math.sin(2 * Math.PI * (idle.hz ?? 1) * t);
        const r = idle.r ?? [0, 0, 0];
        pivot.rotation.set(rest.x + r[0] * w * DEG, rest.y + sign * r[1] * w * DEG, rest.z + sign * r[2] * w * DEG);
      }
      const blink = (t + phase) % 3.6 < 0.14 ? 0.1 : 1;
      for (const e of eyes) e.scale.y = Math.max(0.08, Math.min(open, blink));
    },
  };
}

const gltfCache = new Map();
/** Load a glTF character once per URL; each cast member gets its own skinned clone and mixer. */
export async function loadCharacter(url, model) {
  if (!gltfCache.has(url)) gltfCache.set(url, new GLTFLoader().loadAsync(url));
  const gltf = await gltfCache.get(url);
  const root = cloneSkinned(gltf.scene);
  root.scale.setScalar(model.scale ?? 1);
  root.traverse((o) => {
    o.userData.keep = true;
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  const mixer = new THREE.AnimationMixer(root);
  const actions = new Map();
  for (const clip of gltf.animations) {
    const a = mixer.clipAction(clip);
    a.play();
    a.setEffectiveWeight(0);
    actions.set(clip.name, a);
  }
  /** Pose the clips for one frame from a clip state (expand.js clipAt): times are set, never advanced. */
  const pose = (state) => {
    for (const a of actions.values()) a.setEffectiveWeight(0);
    const put = (name, time, loop, weight) => {
      const a = actions.get(name);
      if (!a || weight <= 0) return;
      const d = a.getClip().duration;
      a.time = loop ? time % d : Math.min(time, d - 1e-4);
      a.setEffectiveWeight(weight);
    };
    put(state.name, state.time, state.loop, state.weight);
    if (state.idle && state.weight < 1) put(state.idle, state.idleTime, true, 1 - state.weight);
    mixer.update(0);
  };
  return { group: root, pose };
}

/** A speech bubble sprite (canvas text is renderer-only); the texture is cached per text. */
const bubbles = new Map();
export function bubbleSprite(text) {
  if (!bubbles.has(text)) {
    const font = "600 44px system-ui, -apple-system, sans-serif";
    const c = document.createElement("canvas");
    const g = c.getContext("2d");
    g.font = font;
    const w = Math.ceil(g.measureText(text).width) + 56;
    c.width = w;
    c.height = 110;
    g.font = font;
    g.fillStyle = "#ffffff";
    g.strokeStyle = "#2b2d42";
    g.lineWidth = 5;
    g.beginPath();
    g.roundRect(4, 4, w - 8, 80, 34);
    g.moveTo(w / 2 - 14, 82);
    g.lineTo(w / 2, 104);
    g.lineTo(w / 2 + 14, 82);
    g.fill();
    g.stroke();
    g.fillStyle = "#2b2d42";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(text, w / 2, 45);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    bubbles.set(text, { material: new THREE.SpriteMaterial({ map: tex, depthTest: false }), width: (0.42 * w) / c.height });
  }
  const { material, width } = bubbles.get(text);
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(width, 0.42, 1);
  sprite.center.set(0.5, 0);
  sprite.renderOrder = 10;
  sprite.userData.keep = true;
  return sprite;
}

export function disposeScene(scene) {
  scene.traverse((o) => {
    // Sprites, cached part geometries and glTF clones (they share the loaded file's buffers) are kept.
    if (o.isSprite || o.userData.keep) return;
    if (o.geometry && ![...geometries.values()].includes(o.geometry)) o.geometry.dispose();
    if (o.material) [].concat(o.material).forEach((m) => m.dispose());
  });
}
