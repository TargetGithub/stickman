// three.js builders for catalog object kinds (catalog/kinds.json). Every builder returns a Group whose origin
// is the object's base (y = 0 touches the floor), so drops land on their spot and squashes keep the feet down.
// Browser only. Assets (fonts, glTF) are loaded once up front by loadAssets.

import * as THREE from "three";
import { TextGeometry } from "three/addons/geometries/TextGeometry.js";
import { Font } from "three/addons/loaders/FontLoader.js";
import { TTFLoader } from "three/addons/loaders/TTFLoader.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import * as SkeletonUtils from "three/addons/utils/SkeletonUtils.js";
import { deriveRng } from "./rng.js";
import { shapeGeometry } from "./geometry.js";
import { addFace, buildModel } from "./models.js";
import { bubbleAt, bubblePaths, starField } from "./particles.js";

/** Load the fonts and characters a plan uses. @returns {Promise<{ fonts: Map, characters: Map }>} */
export async function loadAssets(plan, catalog, base) {
  const fonts = new Map();
  const characters = new Map();
  const fontNames = new Set(["andika_bold"]);
  for (const o of plan.objects) if (o.kind === "letter" && o.font) fontNames.add(o.font);
  const ttf = new TTFLoader();
  for (const name of [...fontNames].sort()) fonts.set(name, new Font(await ttf.loadAsync(base + catalog.fonts[name].file)));
  const gltf = new GLTFLoader();
  for (const name of [...new Set(plan.objects.filter((o) => o.kind === "character").map((o) => o.character))].sort()) {
    characters.set(name, await gltf.loadAsync(base + catalog.characters[name].file));
  }
  return { fonts, characters };
}

export function createMaterials(catalog) {
  const cache = new Map();
  return (color = "white", style = "toy") => {
    const key = `${color}|${style}`;
    if (!cache.has(key)) {
      const s = catalog.materials[style];
      const c = new THREE.Color(catalog.colors[color].hex);
      cache.set(key, new THREE.MeshPhysicalMaterial({
        color: c, roughness: s.roughness, metalness: s.metalness, clearcoat: s.clearcoat ?? 0, clearcoatRoughness: s.clearcoatRoughness ?? 0,
        emissive: s.emissive ? c : new THREE.Color(0), emissiveIntensity: s.emissive ?? 0,
      }));
    }
    return cache.get(key);
  };
}

/** Extruded text geometry, centred on x/z, standing on y = 0, cap height ≈ size. */
function textGeometry(text, font, size, depth) {
  const g = new TextGeometry(text, { font, size: size * 1.42, depth, curveSegments: 10, bevelEnabled: true, bevelThickness: depth * 0.18, bevelSize: size * 0.025, bevelSegments: 4 });
  g.computeBoundingBox();
  const b = g.boundingBox;
  g.translate(-(b.min.x + b.max.x) / 2, -b.min.y, -(b.min.z + b.max.z) / 2);
  return g;
}

const shadowed = (m) => {
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
};

/**
 * @returns {{ group: THREE.Group, mixer?: THREE.AnimationMixer, actions?: Map, named?: Map, update?: (t:number, s:object, state:object) => void }}
 */
export function buildObject(o, { catalog, assets, material, seed }) {
  const group = new THREE.Group();
  group.name = o.id;
  const size = o.size ?? 1;
  if (o.kind === "shape") {
    const geo = shapeGeometry(o.shape);
    const mesh = shadowed(new THREE.Mesh(geo, material(o.color ?? "red", o.material ?? "toy")));
    const box = geo.boundingBox;
    mesh.scale.setScalar(size);
    mesh.position.y = -box.min.y * size;
    group.add(mesh);
    if (o.face) {
      const h = (box.max.y - box.min.y) * size;
      const w = (box.max.x - box.min.x) * size;
      const eyes = addFace(group, { center: [0, h * 0.5 + h * 0.06, box.max.z * size + 0.01 * size], size: Math.min(w, h) * 0.95 }, material);
      return { group, update: (t, s) => blinkEyes(eyes, o.id, t, s) };
    }
  } else if (o.kind === "critter" || o.kind === "prop") {
    const m = o.kind === "critter" ? catalog.critters[o.species] : catalog.props[o.model];
    const built = buildModel(o, m, material);
    group.add(built.group);
    return { group, named: built.named, update: built.update };
  } else if (o.kind === "bubbles") {
    return { group, update: buildBubbles(o, group, seed) };
  } else if (o.kind === "stars") {
    return { group, update: buildStars(o, group, seed, material) };
  } else if (o.kind === "number_block") {
    const box = shadowed(new THREE.Mesh(shapeGeometry("block"), material(o.color ?? "red", "toy")));
    box.scale.setScalar(size);
    box.position.y = size / 2;
    group.add(box);
    // Two digits get smaller type so "10" still fits the face.
    const two = String(o.value).length > 1;
    const digits = textGeometry(String(o.value), assets.fonts.get("andika_bold"), size * (two ? 0.4 : 0.52), size * 0.06);
    digits.translate(0, size * (two ? 0.28 : 0.21), 0);
    const mat = material(o.digitColor ?? "white", "glossy");
    for (const side of [1, -1]) {
      const d = shadowed(new THREE.Mesh(digits, mat));
      d.position.z = side * size * 0.49;
      d.rotation.y = side > 0 ? 0 : Math.PI;
      group.add(d);
    }
  } else if (o.kind === "letter") {
    const font = assets.fonts.get(o.font ?? "andika_bold");
    group.add(shadowed(new THREE.Mesh(textGeometry(o.text, font, size, (o.depth ?? 0.35) * size), material(o.color ?? "blue", o.material ?? "toy"))));
  } else if (o.kind === "character") {
    const ch = catalog.characters[o.character];
    const gltf = assets.characters.get(o.character);
    const model = SkeletonUtils.clone(gltf.scene);
    model.scale.setScalar(ch.scale ?? 1);
    model.traverse((m) => m.isMesh && shadowed(m));
    group.add(model);
    const mixer = new THREE.AnimationMixer(model);
    const actions = new Map();
    for (const clip of gltf.animations) {
      const a = mixer.clipAction(clip);
      a.play();
      a.setEffectiveWeight(0);
      actions.set(clip.name, a);
    }
    return { group, mixer, actions };
  } else if (o.kind === "confetti") {
    const confetti = buildConfetti(o, group, catalog, seed);
    return { group, update: (t, s) => confetti.update(s.burst >= 0 ? t - s.burst : -1) };
  }
  return { group };
}

/** Confetti pieces with seeded fall paths: position is a closed-form function of the time since the burst. */
function buildConfetti(o, group, catalog, seed) {
  const n = o.count ?? 160;
  const [w, dz] = o.area ?? [8, 4];
  const h = o.height ?? 7;
  const colors = o.colors ?? ["red", "orange", "yellow", "green", "blue", "purple", "pink"];
  const rng = deriveRng(seed, `confetti:${o.id}`);
  const mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.14, 0.09), new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.6 }), n);
  mesh.castShadow = true;
  const pieces = [];
  const c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    pieces.push({ x: rng.range(-w / 2, w / 2), y: h + rng.range(0, 3), z: rng.range(-dz / 2, dz / 2), fall: rng.range(1.6, 2.8),
      amp: rng.range(0.1, 0.4), freq: rng.range(2, 5), phase: rng.range(0, 6.283), spin: [rng.range(-8, 8), rng.range(-8, 8), rng.range(-8, 8)] });
    mesh.setColorAt(i, c.set(catalog.colors[rng.pick(colors)].hex));
  }
  mesh.frustumCulled = false;
  group.add(mesh);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const p = new THREE.Vector3();
  const one = new THREE.Vector3(1, 1, 1);
  return {
    /** u: seconds since the burst (negative: not fired). */
    update(u) {
      mesh.visible = u >= 0;
      if (u < 0) return;
      pieces.forEach((k, i) => {
        const y = k.y - k.fall * u;
        const landed = y <= 0.01;
        const tu = landed ? (k.y - 0.01) / k.fall : u;
        p.set(k.x + Math.sin(k.freq * tu + k.phase) * k.amp, Math.max(0.01, y), k.z + Math.cos(k.freq * tu + k.phase) * k.amp * 0.5);
        e.set(landed ? -Math.PI / 2 : k.spin[0] * tu, k.spin[1] * tu, landed ? 0 : k.spin[2] * tu);
        mesh.setMatrixAt(i, m.compose(p, q.setFromEuler(e), one));
      });
      mesh.instanceMatrix.needsUpdate = true;
    },
  };
}

/** Shape faces blink like critters (every ~3.6 s, on a beat from the object's id). */
function blinkEyes(eyes, id, t, s) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 3600;
  const shut = ((t + h / 1000) % 3.6) < 0.14;
  const open = Math.max(0.08, Math.min(1, s.eyes ?? 1)) * (shut ? 0.12 : 1);
  for (const e of eyes) e.scale.y = Math.max(0.08, open);
}

/** Soap bubbles: an instanced sphere with an iridescent, mostly clear coat. */
function buildBubbles(o, group, seed) {
  const paths = bubblePaths(seed, o.id, o);
  const mat = new THREE.MeshPhysicalMaterial({ color: 0xdff3ff, roughness: 0.04, metalness: 0.1, transparent: true, opacity: 0.55, iridescence: 1, iridescenceIOR: 1.3, envMapIntensity: 2.5,
    iridescenceThicknessRange: [200, 700], clearcoat: 1, depthWrite: false });
  const mesh = new THREE.InstancedMesh(shapeGeometry("sphere"), mat, paths.length);
  mesh.frustumCulled = false;
  group.add(mesh);
  const m = new THREE.Matrix4();
  const zero = new THREE.Matrix4().makeScale(0, 0, 0);
  return (t, s) => {
    const u = s.burst >= 0 ? t - s.burst : -1;
    mesh.visible = u >= 0;
    if (u < 0) return;
    paths.forEach((b, i) => {
      const p = bubbleAt(b, u);
      mesh.setMatrixAt(i, p ? m.makeScale(p.scale, p.scale, p.scale).setPosition(p.x, p.y, p.z) : zero);
    });
    mesh.instanceMatrix.needsUpdate = true;
  };
}

/** A night sky: flat glowing stars on a backdrop, twinkling slowly (no flashing). */
function buildStars(o, group, seed, material) {
  const stars = starField(seed, o.id, o);
  // Its own material: the backdrop sits beyond the fog, which would otherwise hide it.
  const mat = material(o.color ?? "gold", "glow").clone();
  mat.fog = false;
  mat.emissiveIntensity = 0.9;
  const mesh = new THREE.InstancedMesh(shapeGeometry("star"), mat, stars.length);
  mesh.frustumCulled = false;
  group.add(mesh);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const p = new THREE.Vector3();
  const sc = new THREE.Vector3();
  return (t) => {
    stars.forEach((st, i) => {
      const k = st.size * (0.8 + 0.2 * Math.sin(2 * Math.PI * st.hz * t + st.phase));
      mesh.setMatrixAt(i, m.compose(p.set(st.x, st.y, st.z), q.setFromEuler(e.set(0, 0, st.phase)), sc.set(k, k, k * 0.3)));
    });
    mesh.instanceMatrix.needsUpdate = true;
  };
}
