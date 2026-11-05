// Toy animals ("critters") and props built from primitive parts listed in catalog/models.json. Original
// designs, so there is nothing to license. A critter has a body and a head group, eyes that blink, cheeks, a
// gentle idle bob and per-part idle motion (wagging tails, flapping wings), all closed-form in t.
// Timeline sub-targets "<id>#head" (and any named part) add rotation/position offsets on top of the rest pose;
// the object's "eyes" prop (1 open, 0 shut) closes the eyes for sleepy scenes. Browser only.

import * as THREE from "three";
import { shadowed, shapeGeometry } from "./geometry.js";
import { hash32 } from "./rng.js";
import { createFaceRig } from "./faces.js";
import { createTalkMouth, talkSpec } from "./talk.js";
import { addFur } from "./fur.js";
import { movableLayer } from "./toon_face.js";
import { gazeOffset } from "./gaze.js";
import { createMouth3d } from "./toon_mouth.js";

const DEG = Math.PI / 180;
const vec = (v, d = 1) => (Array.isArray(v) ? v : [v ?? d, v ?? d, v ?? d]);

/**
 * One part (or its mirror / its repeats) as meshes under `parent`: an object, or a list with one parent per copy
 * (a part hung on another named part: its mirrored copy goes on that part's mirrored copy).
 */
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
  for (const [k, c] of copies.entries()) {
    const pivot = new THREE.Group();
    pivot.position.set(...c.at);
    pivot.rotation.set(c.r[0] * DEG, c.r[1] * DEG, c.r[2] * DEG);
    const mesh = shadowed(new THREE.Mesh(shapeGeometry(p.p), material(p.c ?? fallbackColor, p.m ?? "toy")));
    mesh.scale.set(...vec(p.s, 0.2));
    // A part can hang from its pivot (ears, tails, wings): offset the mesh inside the pivot.
    if (p.hang) mesh.position.set(c.mirrored ? -p.hang[0] : p.hang[0], p.hang[1], p.hang[2]);
    // hr turns the mesh inside its pivot (a thumb on a hand that swings from the shoulder).
    if (p.hr) mesh.rotation.set(p.hr[0] * DEG, (c.mirrored ? -p.hr[1] : p.hr[1]) * DEG, (c.mirrored ? -p.hr[2] : p.hr[2]) * DEG);
    // fur: plush shells (fur.js) that move with the part.
    if (p.fur) addFur(mesh, p.fur);
    pivot.add(mesh);
    pivot.userData = { rest: pivot.rotation.clone(), idle: p.idle, mirrored: !!c.mirrored };
    (Array.isArray(parent) ? parent[k] ?? parent[0] : parent).add(pivot);
    made.push(pivot);
  }
  return made;
}

/**
 * Shiny button eyes with a highlight; returns the eye groups (scaled on y to blink). With iris (a colour),
 * a big cartoon eye instead: a white ball, a coloured iris with a dark pupil and two highlights. With lid (a
 * colour) too, a flat toon anime eye (toonEye) with lid lines that blink with it.
 */
function addEyes(parent, spec, material) {
  const { at, size = 0.1, color = "ink", iris, lid, turn } = spec;
  const eyes = [];
  for (const side of [1, -1]) {
    const g = new THREE.Group();
    g.position.set(side * at[0], at[1], at[2]);
    // turn: [pitch, yaw] in degrees, so a flat toon eye lies on a face that curves away (mirrored for the other eye).
    if (turn) g.rotation.set(turn[0] * DEG, side * turn[1] * DEG, 0, "YXZ"); // yaw after pitch: lash lines stay level
    if (iris && lid) {
      const eye = toonEye(side, size, spec, material);
      g.add(...eye.meshes);
      g.userData.gaze = eye.gaze;
    }
    else if (iris) {
      const white = shadowed(new THREE.Mesh(shapeGeometry("sphere"), material("white", "glossy")));
      white.scale.set(size, size * 1.12, size * 0.62);
      const ring = new THREE.Mesh(shapeGeometry("sphere"), material(iris, "glossy"));
      ring.scale.set(size * 0.72, size * 0.8, size * 0.3);
      ring.position.set(side * size * 0.04, -size * 0.02, size * 0.2);
      const pupil = new THREE.Mesh(shapeGeometry("sphere"), material(color, "glossy"));
      pupil.scale.set(size * 0.4, size * 0.46, size * 0.2);
      pupil.position.set(side * size * 0.04, -size * 0.02, size * 0.27);
      const shine = new THREE.Mesh(shapeGeometry("sphere"), material("white", "glow"));
      shine.scale.setScalar(size * 0.2);
      shine.position.set(side * size * 0.04 - size * 0.14, size * 0.14, size * 0.33);
      const dot = new THREE.Mesh(shapeGeometry("sphere"), material("white", "glow"));
      dot.scale.setScalar(size * 0.09);
      dot.position.set(side * size * 0.04 + size * 0.13, -size * 0.14, size * 0.32);
      g.add(white, ring, pupil, shine, dot);
    } else {
      const ball = shadowed(new THREE.Mesh(shapeGeometry("sphere"), material(color, "glossy")));
      ball.scale.set(size, size * 1.15, size * 0.6);
      const shine = new THREE.Mesh(shapeGeometry("sphere"), material("white", "glow"));
      shine.scale.setScalar(size * 0.32);
      shine.position.set(-size * 0.18, size * 0.22, size * 0.26);
      g.add(ball, shine);
    }
    parent.add(g);
    eyes.push(g);
  }
  return eyes;
}

/**
 * A toon anime eye drawn in thin layers on the face (toon_face.js): white, iris rim, iris, a pupil that turns
 * blue below, a crescent, shines, and the lid lines (and a cool shade under the upper lid). The layers' inner corner is +x, so the eye at +x is
 * mirrored to keep it toward the nose. Colours: iris (the ring), color (pupil), lid, and o.white, o.shade, o.rim,
 * o.pupilLow, o.crescent. The iris layers (rim to shine) are own copies that slide: returns the meshes for the
 * eye group and gaze(dx, dy), which moves the iris dx, dy eye widths in the critter's axes (x + its left).
 */
function toonEye(side, size, o, material) {
  const movers = [];
  const layer = (shape, c, style, moves = false) => {
    const mover = moves ? movableLayer(shapeGeometry(shape)) : null;
    if (mover) movers.push(mover);
    const m = new THREE.Mesh(mover?.geometry ?? shapeGeometry(shape), material(c, style));
    m.scale.set(-side * size, size, size); // the layers' +x is the inner corner: mirror the +x eye
    return m;
  };
  const meshes = [
    layer("eye_white", o.white ?? "white", "glow"), // lit from inside a little, so it reads white on pale dough
    layer("eye_shade", o.shade ?? "eye_shade_cool", "matte"),
    layer("eye_rim", o.rim ?? "brow", "matte", true),
    layer("eye_iris", o.iris, "toy", true),
    layer("eye_pupil_low", o.pupilLow ?? "blue", "toy", true),
    layer("eye_pupil", o.color ?? "ink", "toy", true),
    layer("eye_crescent", o.crescent ?? "cream", "matte", true),
    layer("eye_shine", "white", "glow", true),
    layer("eyelid", o.lid, "matte"),
  ];
  return { meshes, gaze: (dx, dy) => movers.forEach((m) => m.move(-side * dx, dy)) };
}

/**
 * A plush grin: the open mouth (its own colour) with a row of top teeth and a tongue, for faces with mouth.open.
 * shape "mouth3d": a real opening instead, with a lit cavity, teeth and a tongue on a moving jaw.
 */
function addGrin(parent, spec, paint) {
  if (spec.shape === "mouth3d") {
    const m = createMouth3d(spec, paint); // an opening with a cavity, teeth and a tongue on a jaw (toon_mouth.js)
    parent.add(m);
    return m;
  }
  // Options: shape (default "grin"; "grin_wide"), tilt (degrees about x), tall (deeper mouth), teeth [width, height]
  // (their top stays under the lip line), tongueSize [w, h]; teethShape / tongueShape: shapes built in the mouth's
  // own frame (grin_wide_teeth, grin_wide_tongue) used as they are.
  const m = new THREE.Mesh(shapeGeometry(spec.shape ?? "grin"), paint(spec.color ?? "mouth", "matte"));
  m.scale.set(spec.size, spec.size * (spec.tall ?? 1), spec.size * 0.6);
  m.position.set(...spec.at);
  m.rotation.x = (spec.tilt ?? 0) * DEG; // lean back with a face that slopes (degrees, + tips the top back)
  const teeth = new THREE.Mesh(shapeGeometry(spec.teethShape ?? "box"), paint("white", "toy"));
  const [tw, th] = Array.isArray(spec.teeth) ? spec.teeth : [0.6, spec.teeth ?? 0.11];
  if (!spec.teethShape) {
    teeth.scale.set(tw, th, 0.06);
    teeth.position.set(0, 0.155 - th / 2, 0.06);
  }
  const tongue = new THREE.Mesh(shapeGeometry(spec.tongueShape ?? "sphere"), paint(spec.tongue ?? "rose", "matte"));
  const [gw, gh] = spec.tongueSize ?? [0.46, 0.2];
  if (spec.tongueShape) tongue.scale.set(1, 1, 1); // a shape built in the mouth's own frame (grin_wide_tongue)
  else {
    tongue.scale.set(gw, gh, 0.1);
    tongue.position.set(0.02, -0.21 + gh / 2, 0.05);
  }
  m.add(teeth, tongue);
  parent.add(m);
  return m;
}

/** Eyes, cheeks and a smile on the front of anything (shapes with face: true); returns the face's feeling rig. */
export function addFace(parent, { center, size, eyes, cheeks, mouth, talks = false }, material) {
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
  // A speaker (say with who) also gets an open mouth for lip-sync where its smile is.
  const talk = talks ? createTalkMouth(parent, { at: m ? m.position.toArray() : [cx, cy - size * 0.12, cz], width: m ? m.scale.x : size * 0.3 }, material) : null;
  return createFaceRig({ parent, eyes: e, eyeSize: eyes?.size ?? size * 0.17, mouth: m, material, talk });
}

/**
 * A prop speaking (say with who): its "light" parts swell and glow brighter with the voice; without a light
 * (and without a face) the whole body bobs and squashes a little instead. Set after the rest pose each frame.
 * @returns {((k:number) => void) | null}
 */
function propVoice(lights, body) {
  const meshes = (lights ?? []).flatMap((n) => n.children.filter((m) => m.isMesh));
  const mats = new Map();
  for (const m of meshes) {
    if (!mats.has(m.material)) mats.set(m.material, m.material.clone());
    m.material = mats.get(m.material);
  }
  const glow = [...mats.values()].map((m) => [m, m.emissiveIntensity]);
  const scales = meshes.map((m) => m.scale.clone());
  if (!meshes.length && !body) return null;
  return (k) => {
    meshes.forEach((m, i) => m.scale.copy(scales[i]).multiplyScalar(1 + 0.6 * k));
    for (const [m, e] of glow) m.emissiveIntensity = e + 2 * k;
    if (!meshes.length && body) {
      body.scale.set(1 + 0.03 * k, 1 - 0.05 * k, 1 + 0.03 * k);
      body.position.y += 0.04 * k;
    }
  };
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
    // on: "head", or another named part listed before it (an elbow: a forearm on the arm swings with it).
    const made = addPart(p.on === "head" ? head : p.on ? groups.get(p.on) ?? body : body, p, paint, color);
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
        c.scale.set(model.cheeks.size, model.cheeks.size * (model.cheeks.tall ?? 0.6), model.cheeks.size * 0.35);
        c.position.set(side * model.cheeks.at[0], model.cheeks.at[1], model.cheeks.at[2]);
        head.add(c);
      }
    }
  }
  let mouth;
  if (model.mouth?.open) mouth = addGrin(head, model.mouth, paint);
  else if (model.mouth) {
    mouth = new THREE.Mesh(shapeGeometry("smile"), paint(model.mouth.color ?? "ink", "matte"));
    mouth.scale.set(model.mouth.size, model.mouth.size * 0.8, model.mouth.size * 0.6);
    mouth.position.set(...model.mouth.at);
    head.add(mouth);
  }
  const hasFace = !!(model.mouth || model.eyes);
  const talk = o.talks && (o.kind === "critter" || hasFace) ? createTalkMouth(head, talkSpec(model), paint, color) : null;
  const face = eyes.length ? createFaceRig({ parent: head, eyes, eyeSize: model.eyes.size ?? 0.1, mouth, material, talk, brows: model.brows, open: !!model.mouth?.open, line: model.eyes.lid, flat: !!model.eyes.lid }) : null;
  // A talking prop's light part pulses with the voice; a prop with neither face nor light bobs instead.
  const voice = o.talks && o.kind === "prop" ? propVoice(groups.get("light"), hasFace ? null : body) : null;
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
      // look (look.js): [yaw, pitch] in degrees on top of the rest pose, held until the next look.
      // head.look scales it (a head that is most of the body turns less; its toon eyes still lead the whole way).
      if (s.look) {
        const k = model.head?.look ?? 1;
        const [ky, kp] = Array.isArray(k) ? k : [k, k];
        head.rotation.y += s.look[0] * ky * DEG;
        head.rotation.x += s.look[1] * kp * DEG;
      }
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
          // point: "lift" turns one copy only (liftSide 1: the part as listed, -1: its mirror image).
          if (sub.lift && m === (sub.liftSide ?? 1)) node.rotation.set(node.rotation.x + sub.lift[0] * DEG, node.rotation.y + sub.lift[1] * DEG, node.rotation.z + sub.lift[2] * DEG);
        }
      }
      if (voice) voice(s.talk ?? 0);
      const blink = ((t + phase) % 3.6) < 0.14 ? 0.12 : 1;
      // Toon eyes glance around, lead a look and follow a gaze prop (gaze.js).
      if (eyes[0]?.userData.gaze) {
        const [gx, gy] = gazeOffset(o.id, t, s);
        for (const e of eyes) e.userData.gaze(gx, gy);
      }
      if (face) {
        // A feeling also tilts the head: down when sad or sleepy, back when surprised.
        // head.tilt scales it (a head that is most of the body, like Bao Buddy's, tips less).
        const [pitch, roll] = face(t, s, blink);
        const k = model.head?.tilt ?? 1;
        head.rotation.x += pitch * k * DEG;
        head.rotation.z += roll * k * DEG;
      }
    },
  };
}
