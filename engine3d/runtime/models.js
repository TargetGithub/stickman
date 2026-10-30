// Toy animals ("critters") and props built from primitive parts listed in catalog/models.json. Original
// designs, so there is nothing to license. A critter has a body and a head group, eyes that blink, cheeks, a
// gentle idle bob and per-part idle motion (wagging tails, flapping wings), all closed-form in t.
// Timeline sub-targets "<id>#head" (and any named part) add rotation/position offsets on top of the rest pose;
// the object's "eyes" prop (1 open, 0 shut) closes the eyes for sleepy scenes. Browser only.

import * as THREE from "three";
import { shadowed, shapeGeometry } from "./geometry.js";
import { hash32 } from "./rng.js";
import { createFaceRig } from "./faces.js";

const DEG = Math.PI / 180;
const vec = (v, d = 1) => (Array.isArray(v) ? v : [v ?? d, v ?? d, v ?? d]);

/** One part (or its mirror / its repeats) as meshes under `parent`. */
function addPart(parent, p, material, fallbackColor) {
  const made = [];
  const copies = [];
  if (p.repeat) {
    const { n, radius, start = 0 } = p.repeat;
    for (let k = 0; k < n; k++) {
      const a = start * DEG + (k * 2 * Math.PI) / n;
      copies.push({ at: [p.at[0] + Math.cos(a) * radius, p.at[1] + Math.sin(a) * radius, p.at[2]], r: [0, 0, (a / DEG) - 90 + (p.r?.[2] ?? 0)] });
    }
  } else copies.push({ at: p.at ?? [0, 0, 0], r: p.r ?? [0, 0, 0] });
  if (p.mirror) for (const c of [...copies]) copies.push({ at: [-c.at[0], c.at[1], c.at[2]], r: [c.r[0], -c.r[1], -c.r[2]], mirrored: true });
  for (const c of copies) {
    const pivot = new THREE.Group();
    pivot.position.set(...c.at);
    pivot.rotation.set(c.r[0] * DEG, c.r[1] * DEG, c.r[2] * DEG);
    const mesh = shadowed(new THREE.Mesh(shapeGeometry(p.p), material(p.c ?? fallbackColor, p.m ?? "toy")));
    mesh.scale.set(...vec(p.s, 0.2));
    // A part can hang from its pivot (ears, tails, wings): offset the mesh inside the pivot.
    if (p.hang) mesh.position.set(c.mirrored ? -p.hang[0] : p.hang[0], p.hang[1], p.hang[2]);
    pivot.add(mesh);
    pivot.userData = { rest: pivot.rotation.clone(), idle: p.idle, mirrored: !!c.mirrored };
    parent.add(pivot);
    made.push(pivot);
  }
  return made;
}

/** Shiny button eyes with a highlight; returns the eye groups (scaled on y to blink). */
function addEyes(parent, { at, size = 0.1, color = "ink" }, material) {
  const eyes = [];
  for (const side of [1, -1]) {
    const g = new THREE.Group();
    g.position.set(side * at[0], at[1], at[2]);
    const ball = shadowed(new THREE.Mesh(shapeGeometry("sphere"), material(color, "glossy")));
    ball.scale.set(size, size * 1.15, size * 0.6);
    const shine = new THREE.Mesh(shapeGeometry("sphere"), material("white", "glow"));
    shine.scale.setScalar(size * 0.32);
    shine.position.set(-size * 0.18, size * 0.22, size * 0.26);
    g.add(ball, shine);
    parent.add(g);
    eyes.push(g);
  }
  return eyes;
}

/** Eyes, cheeks and a smile on the front of anything (shapes with face: true); returns the face's feeling rig. */
export function addFace(parent, { center, size, eyes, cheeks, mouth }, material) {
  const [cx, cy, cz] = center;
  const e = addEyes(parent, { at: [cx + (eyes?.gap ?? size * 0.26), cy + (eyes?.y ?? size * 0.08), cz], size: eyes?.size ?? size * 0.17 }, material);
  if (cheeks !== false) {
    for (const side of [1, -1]) {
      const c = new THREE.Mesh(shapeGeometry("sphere"), material(cheeks?.color ?? "pink", "matte"));
      c.scale.set(size * 0.16, size * 0.1, size * 0.05);
      c.position.set(cx + side * size * 0.42, cy - size * 0.1, cz - size * 0.02);
      parent.add(c);
    }
  }
  let m;
  if (mouth !== false) {
    m = new THREE.Mesh(shapeGeometry("smile"), material(mouth?.color ?? "ink", "matte"));
    m.scale.set(size * (mouth?.size ?? 0.3), size * (mouth?.size ?? 0.3) * 0.9, size * 0.3);
    m.position.set(cx, cy - size * 0.12 + (mouth?.y ?? 0), cz);
    parent.add(m);
  }
  return createFaceRig({ parent, eyes: e, eyeSize: eyes?.size ?? size * 0.17, mouth: m, material });
}

/**
 * Build a critter or prop from its catalog model.
 * @returns {{ group: THREE.Group, update: (t:number, s:object, state:object) => void }}
 */
export function buildModel(o, model, material) {
  const group = new THREE.Group();
  const root = new THREE.Group(); // scaled to size, bobs
  root.scale.setScalar(o.size ?? 1);
  group.add(root);
  const body = new THREE.Group();
  root.add(body);
  const head = new THREE.Group();
  head.position.set(...(model.head?.at ?? [0, 0, 0]));
  body.add(head);
  const named = new Map([["head", head], ["body", body]]);
  // Every node a part name moves: mirrored copies and other parts with the same name (a tail and its tip).
  const groups = new Map([["head", [head]], ["body", [body]]]);
  const idlers = [];
  // recolor maps the colour names the model's parts use to new ones ({ "leaf": "brown" }), main colour included.
  const rc = (c) => o.recolor?.[c] ?? c;
  const paint = (c, style) => material(rc(c), style);
  const color = o.color ?? model.color;
  for (const p of model.parts) {
    const made = addPart(p.on === "head" ? head : body, p, paint, color);
    if (p.name) {
      if (!named.has(p.name)) named.set(p.name, made[0]);
      groups.set(p.name, [...(groups.get(p.name) ?? []), ...made]);
    }
    for (const m of made) if (m.userData.idle) idlers.push(m);
  }
  let eyes = [];
  if (model.eyes) {
    eyes = addEyes(head, model.eyes, paint);
    if (model.cheeks) {
      for (const side of [1, -1]) {
        const c = new THREE.Mesh(shapeGeometry("sphere"), paint(model.cheeks.color ?? "pink", "matte"));
        c.scale.set(model.cheeks.size, model.cheeks.size * 0.6, model.cheeks.size * 0.35);
        c.position.set(side * model.cheeks.at[0], model.cheeks.at[1], model.cheeks.at[2]);
        head.add(c);
      }
    }
  }
  let mouth;
  if (model.mouth) {
    mouth = new THREE.Mesh(shapeGeometry("smile"), paint(model.mouth.color ?? "ink", "matte"));
    mouth.scale.set(model.mouth.size, model.mouth.size * 0.8, model.mouth.size * 0.6);
    mouth.position.set(...model.mouth.at);
    head.add(mouth);
  }
  const face = eyes.length ? createFaceRig({ parent: head, eyes, eyeSize: model.eyes.size ?? 0.1, mouth, material }) : null;
  // Each critter blinks on its own beat (from its id), every ~3.6 s for 0.14 s.
  const phase = (hash32(o.id) % 3600) / 1000;
  const bob = model.bob ?? 0;
  // Every frame starts from the rest pose, so a frame never depends on the frames drawn before it.
  const rests = [...new Set([...groups.values()].flat())].map((n) => [n, n.userData.rest ?? n.rotation.clone(), n.position.clone()]);
  return {
    group,
    named,
    update(t, s, state) {
      for (const [n, r, p] of rests) {
        n.rotation.copy(r);
        n.position.copy(p);
      }
      body.position.y = bob * (0.5 + 0.5 * Math.sin(t * Math.PI * 1.1 + phase));
      head.rotation.z += (model.bob ? 2.5 : 0) * DEG * Math.sin(t * 0.9 + phase);
      for (const m of idlers) {
        const { rest, idle, mirrored } = m.userData;
        const k = Math.sin(2 * Math.PI * idle.hz * t + phase + (idle.phase ?? 0));
        const r = idle.r ?? [0, 0, 0];
        const sgn = mirrored ? -1 : 1;
        m.rotation.set(rest.x + r[0] * DEG * k, rest.y + sgn * r[1] * DEG * k, rest.z + sgn * r[2] * DEG * k);
      }
      // Timeline offsets for sub-targets: <id>#head, <id>#lid, ... (rotation in degrees, position in metres).
      // A mirrored copy takes the mirror image of the offset, so both wings flap together.
      for (const [name, nodes] of groups) {
        const sub = state[`${o.id}#${name}`];
        if (!sub) continue;
        for (const node of nodes) {
          const m = node.userData.mirrored ? -1 : 1;
          if (sub.rotation) node.rotation.set(node.rotation.x + sub.rotation[0] * DEG, node.rotation.y + m * sub.rotation[1] * DEG, node.rotation.z + m * sub.rotation[2] * DEG);
          if (sub.position) node.position.set(node.position.x + m * sub.position[0], node.position.y + sub.position[1], node.position.z + sub.position[2]);
        }
      }
      const blink = ((t + phase) % 3.6) < 0.14 ? 0.12 : 1;
      if (face) {
        // A feeling also tilts the head: down when sad or sleepy, back when surprised.
        const [pitch, roll] = face(t, s, blink);
        head.rotation.x += pitch * DEG;
        head.rotation.z += roll * DEG;
      }
    },
  };
}
