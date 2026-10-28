// three.js builders for catalog object kinds (catalog/kinds.json). Every builder returns a Group whose origin
// is the object's base (y = 0 touches the floor), so drops land on their spot and squashes keep the feet down.
// Browser only. Assets (fonts, glTF) are loaded once up front by loadAssets.

import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { TextGeometry } from "three/addons/geometries/TextGeometry.js";
import { Font } from "three/addons/loaders/FontLoader.js";
import { TTFLoader } from "three/addons/loaders/TTFLoader.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import * as SkeletonUtils from "three/addons/utils/SkeletonUtils.js";
import { deriveRng } from "./rng.js";

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

function puffy(shape, depth) {
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.08, bevelSegments: 6, curveSegments: 24 });
  g.center();
  return g;
}

function starShape() {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? 0.21 : 0.5;
    const a = Math.PI / 2 + (i * Math.PI) / 5;
    i ? s.lineTo(r * Math.cos(a), r * Math.sin(a)) : s.moveTo(r * Math.cos(a), r * Math.sin(a));
  }
  return s;
}

function heartShape() {
  const s = new THREE.Shape();
  s.moveTo(0, -0.45);
  s.bezierCurveTo(0.1, -0.3, 0.5, -0.1, 0.5, 0.15);
  s.bezierCurveTo(0.5, 0.42, 0.18, 0.5, 0, 0.28);
  s.bezierCurveTo(-0.18, 0.5, -0.5, 0.42, -0.5, 0.15);
  s.bezierCurveTo(-0.5, -0.1, -0.1, -0.3, 0, -0.45);
  return s;
}

/** Unit geometry (fits a 1 m box, centred) for a catalog shape. */
function shapeGeometry(name) {
  switch (name) {
    case "cube": return new THREE.BoxGeometry(1, 1, 1);
    case "block": return new RoundedBoxGeometry(1, 1, 1, 5, 0.12);
    case "sphere": return new THREE.SphereGeometry(0.5, 64, 40);
    case "cylinder": return new THREE.CylinderGeometry(0.5, 0.5, 1, 64);
    case "cone": return new THREE.ConeGeometry(0.5, 1, 64);
    case "pyramid": return new THREE.ConeGeometry(Math.SQRT1_2, 1, 4).rotateY(Math.PI / 4);
    case "torus": return new THREE.TorusGeometry(0.35, 0.15, 32, 96);
    case "star": return puffy(starShape(), 0.16);
    case "heart": return puffy(heartShape(), 0.16);
    default: throw new Error(`unknown shape "${name}"`);
  }
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
 * @returns {{ group: THREE.Group, mixer?: THREE.AnimationMixer, actions?: Map, confetti?: object }}
 */
export function buildObject(o, { catalog, assets, material, seed }) {
  const group = new THREE.Group();
  group.name = o.id;
  const size = o.size ?? 1;
  if (o.kind === "shape") {
    const mesh = shadowed(new THREE.Mesh(shapeGeometry(o.shape), material(o.color ?? "red", o.material ?? "toy")));
    mesh.scale.setScalar(size);
    mesh.position.y = size / 2;
    group.add(mesh);
  } else if (o.kind === "number_block") {
    const box = shadowed(new THREE.Mesh(shapeGeometry("block"), material(o.color ?? "red", "toy")));
    box.scale.setScalar(size);
    box.position.y = size / 2;
    group.add(box);
    const digits = textGeometry(String(o.value), assets.fonts.get("andika_bold"), size * 0.52, size * 0.06);
    digits.translate(0, size * 0.21, 0);
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
    return { group, confetti: buildConfetti(o, group, catalog, seed) };
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
