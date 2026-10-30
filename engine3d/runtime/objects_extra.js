// three.js builders for the newer object kinds: clock (hands driven by the "minutes" prop), lamp (a spotlight
// that casts real shadows, with an optional soft beam) and weather (rain, snow, falling leaves or petals, all
// closed-form in t). Browser only; objects.js dispatches to these.

import * as THREE from "three";
import { deriveRng } from "./rng.js";
import { shapeGeometry } from "./geometry.js";

const DEG = Math.PI / 180;

/**
 * A teaching clock: face, rim, numbers 1-12, minute ticks (long every five), a short hour hand and a long
 * minute hand. Origin at the bottom of the rim; the face looks along +z. size = diameter (default 2).
 */
export function buildClock(o, group, { material, font, textGeometry }) {
  const D = o.size ?? 2;
  const R = D / 2;
  const depth = D * 0.06;
  const face = new THREE.Group();
  face.position.y = R * 1.07;
  group.add(face);
  const disc = new THREE.Mesh(shapeGeometry("cylinder"), material(o.face ?? "white", "matte"));
  disc.scale.set(D, depth, D);
  disc.rotation.x = Math.PI / 2;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(R, R * 0.07, 16, 96), material(o.color ?? "red", "toy"));
  rim.position.z = depth * 0.2;
  face.add(disc, rim);
  for (const m of [disc, rim]) m.castShadow = m.receiveShadow = true;
  const front = depth / 2 + 0.002;

  // Ticks: 60 small marks, every fifth one longer.
  const tickGeo = shapeGeometry("box");
  const ticks = new THREE.InstancedMesh(tickGeo, material(o.ticks ?? "ink", "matte"), 60);
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  for (let i = 0; i < 60; i++) {
    const a = Math.PI / 2 - (i * 2 * Math.PI) / 60;
    const big = i % 5 === 0;
    const len = R * (big ? 0.11 : 0.05);
    const r = R * 0.9 - len / 2;
    q.setFromAxisAngle(new THREE.Vector3(0, 0, 1), a - Math.PI / 2);
    m4.compose(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, front), q, new THREE.Vector3(R * (big ? 0.035 : 0.018), len, depth * 0.15));
    ticks.setMatrixAt(i, m4);
  }
  face.add(ticks);

  if (o.numbers !== false) {
    const numMat = material(o.numberColor ?? "ink", "toy");
    const size = R * 0.13;
    for (let n = 1; n <= 12; n++) {
      const a = Math.PI / 2 - (n * 2 * Math.PI) / 12;
      const g = textGeometry(String(n), font, size, depth * 0.25);
      const mesh = new THREE.Mesh(g, numMat);
      mesh.position.set(Math.cos(a) * R * 0.62, Math.sin(a) * R * 0.62 - size * 0.5, front);
      face.add(mesh);
    }
  }

  const hand = (len, width, color, z) => {
    const pivot = new THREE.Group();
    pivot.position.z = front + z;
    const m = new THREE.Mesh(shapeGeometry("box"), material(color, "toy"));
    m.scale.set(width, len, depth * 0.18);
    m.position.y = len / 2 - width * 0.6; // a short tail behind the centre
    m.castShadow = true;
    pivot.add(m);
    face.add(pivot);
    return pivot;
  };
  const hour = hand(R * 0.5, R * 0.085, o.hourColor ?? "blue", depth * 0.1);
  const minute = hand(R * 0.78, R * 0.055, o.minuteColor ?? "red", depth * 0.25);
  const cap = new THREE.Mesh(shapeGeometry("sphere"), material("gold", "glossy"));
  cap.scale.set(R * 0.12, R * 0.12, depth * 0.5);
  cap.position.z = front + depth * 0.4;
  face.add(cap);

  return (t, s) => {
    const mins = s.minutes ?? 0;
    minute.rotation.z = -((mins % 60) / 60) * 2 * Math.PI;
    hour.rotation.z = -((mins / 60) % 12 / 12) * 2 * Math.PI;
    const k = Math.max(0, Math.min(1, s.minuteHand ?? 1));
    minute.visible = k > 0.01;
    minute.scale.setScalar(Math.max(0.001, k));
  };
}

/**
 * A spotlight at the object's position, pointed at its "aim" prop (world coordinates). Its brightness follows
 * the object's scale, so show and hide fade it. beam: true adds a faint cone of light. Returns world-space
 * helpers the stage must add to the scene (the light's target and the beam).
 */
export function buildLamp(o, group, { catalog, height }) {
  const color = new THREE.Color(o.color ? catalog.colors[o.color].hex : 0xfff4dd);
  const light = new THREE.SpotLight(color, o.intensity ?? 60, o.distance ?? 30, (o.angle ?? 24) * DEG, o.soft ?? 0.35, 2);
  if (o.shadow !== false) {
    light.castShadow = true;
    light.shadow.mapSize.setScalar(height > 1500 ? 2048 : 1024);
    light.shadow.bias = -0.0006;
    light.shadow.normalBias = 0.02;
    light.shadow.camera.near = 0.2;
    light.shadow.camera.far = 40;
  }
  group.add(light);
  const target = new THREE.Object3D();
  light.target = target;
  const world = [target];
  let beam = null;
  if (o.beam) {
    // A cone from the lamp (apex) to the lit spot, brightest at the lamp and fading to nothing (added light).
    const geo = new THREE.ConeGeometry(Math.tan((o.angle ?? 24) * DEG), 1, 48, 8, true).translate(0, -0.5, 0);
    const pos = geo.attributes.position;
    const fade = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) fade.fill(Math.max(0, 1 + pos.getY(i)) ** 2.2, i * 3, i * 3 + 3);
    geo.setAttribute("color", new THREE.BufferAttribute(fade, 3));
    beam = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xfff1c4, vertexColors: true, transparent: true, opacity: 0.15, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, fog: false }));
    world.push(beam);
  }
  const base = o.scale?.[0] ?? 1;
  const p = new THREE.Vector3();
  const aim = new THREE.Vector3();
  const down = new THREE.Vector3(0, -1, 0);
  return {
    world,
    update(t, s) {
      const k = Math.max(0, Math.min(1, s.scale[0] / base));
      light.intensity = (o.intensity ?? 60) * k;
      group.scale.set(1, 1, 1);
      target.position.set(...(s.aim ?? [0, 0, 0]));
      if (beam) {
        group.updateWorldMatrix(true, false);
        group.getWorldPosition(p);
        aim.set(...(s.aim ?? [0, 0, 0])).sub(p);
        const len = aim.length();
        beam.position.copy(p);
        beam.quaternion.setFromUnitVectors(down, aim.normalize());
        beam.scale.set(len, len, len);
        beam.visible = group.visible && k > 0.01;
        beam.material.opacity = 0.15 * k;
      }
    },
  };
}

const WEATHER = {
  rain: { count: 420, speed: 7, colors: ["sky"], drift: 0, spin: 0 },
  snow: { count: 260, speed: 0.9, colors: ["white"], drift: 0.35, spin: 0 },
  leaves: { count: 70, speed: 0.75, colors: ["orange", "red", "yellow", "brown"], drift: 0.6, spin: 2.2 },
  petals: { count: 90, speed: 0.6, colors: ["pink", "rose", "white"], drift: 0.5, spin: 1.8 },
};

/** Rain, snow, leaves or petals falling for as long as the object is shown (a loop, so it never runs out). */
export function buildWeather(o, group, { catalog, seed }) {
  const kind = WEATHER[o.type ?? "rain"];
  const n = o.count ?? kind.count;
  const [w, dz] = o.area ?? [14, 6];
  const h = o.height ?? 7;
  const speed = kind.speed * (o.speed ?? 1);
  const rng = deriveRng(seed, `weather:${o.id}`);
  const geo = o.type === "rain" || !o.type ? shapeGeometry("cylinder") : o.type === "snow" ? shapeGeometry("sphere") : shapeGeometry(o.type === "leaves" ? "leaf" : "heart");
  const mat = new THREE.MeshPhysicalMaterial({ roughness: 0.4, clearcoat: o.type === "rain" || !o.type ? 1 : 0, transparent: !o.type || o.type === "rain", opacity: !o.type || o.type === "rain" ? 0.55 : 1, side: THREE.DoubleSide });
  const mesh = new THREE.InstancedMesh(geo, mat, n);
  mesh.frustumCulled = false;
  const c = new THREE.Color();
  const bits = [];
  for (let i = 0; i < n; i++) {
    bits.push({ x: rng.range(-w / 2, w / 2), z: rng.range(-dz / 2, dz / 2), off: rng.next(), v: speed * rng.range(0.85, 1.15), ph: rng.range(0, 6.283),
      f: rng.range(0.6, 1.4), size: rng.range(0.7, 1.3), spin: [rng.range(-1, 1), rng.range(-1, 1), rng.range(-1, 1)] });
    mesh.setColorAt(i, c.set(catalog.colors[rng.pick(o.colors ?? kind.colors)].hex));
  }
  group.add(mesh);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const p = new THREE.Vector3();
  const sc = new THREE.Vector3();
  const unit = o.type === "snow" ? 0.09 : o.type === "rain" || !o.type ? 1 : 0.24;
  return (t) => {
    group.scale.set(1, 1, 1); // show and hide switch it on and off; they must not shrink the whole sky
    bits.forEach((b, i) => {
      const y = h - ((t * b.v + b.off * h) % h);
      const sway = Math.sin(t * b.f + b.ph) * kind.drift;
      p.set(b.x + sway, y, b.z + Math.cos(t * b.f * 0.7 + b.ph) * kind.drift * 0.5);
      if (unit === 1) sc.set(0.018, 0.32, 0.018);
      else sc.setScalar(unit * b.size);
      e.set(b.spin[0] * kind.spin * t + b.ph, b.spin[1] * kind.spin * t, b.spin[2] * kind.spin * t);
      mesh.setMatrixAt(i, m.compose(p, q.setFromEuler(e), sc));
    });
    mesh.instanceMatrix.needsUpdate = true;
  };
}
