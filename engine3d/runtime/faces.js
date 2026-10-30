// Feelings on toy faces (critters and shapes with face: true): eyebrows, mouth shapes, eye size and a head
// tilt, blended from the last feeling to the new one over feelDur seconds (the "feel" move). Everything is a
// function of the timeline state at t. Browser only.

import * as THREE from "three";
import { shapeGeometry } from "./geometry.js";

const DEG = Math.PI / 180;
const FROWN = shapeGeometry("smile").clone().rotateZ(Math.PI);

// brow: [visible 0-1, inner-end tilt in degrees (+ up), lift in eye sizes]; eye: openness factor;
// mouth: which mouth shows; tilt: head pitch in degrees (+ looks down), roll in degrees.
const LOOK = {
  happy: { brow: [0, 0, 0], eye: 1, mouth: "smile", tilt: [0, 0] },
  sad: { brow: [1, 22, 0.1], eye: 0.85, mouth: "frown", tilt: [14, 0] },
  surprised: { brow: [1, 0, 0.55], eye: 1.3, mouth: "o", tilt: [-8, 0] },
  angry: { brow: [1, -24, -0.1], eye: 0.75, mouth: "flat", tilt: [4, 0] },
  worried: { brow: [1, 16, 0.3], eye: 1.12, mouth: "wobble", tilt: [6, 7] },
  sleepy: { brow: [0, 0, 0], eye: 0.3, mouth: "o_small", tilt: [10, -5] },
};

const lerp = (a, b, k) => a + (b - a) * k;
const smooth = (k) => k * k * (3 - 2 * k);

/**
 * @param {{ parent: THREE.Object3D, eyes: THREE.Object3D[], eyeSize: number, mouth?: THREE.Mesh, head?: THREE.Object3D,
 *   material: Function }} o  eyes: the two eye groups (x > 0 first or second, either way); mouth: the smile mesh
 * @returns {(t:number, s:object, blink:number) => number[]}  sets brows, mouth and eye scale; returns the head tilt [pitch, roll] in degrees
 */
export function createFaceRig({ parent, eyes, eyeSize, mouth, material }) {
  const browMat = material("ink", "matte");
  const brows = eyes.map((e) => {
    const b = new THREE.Mesh(shapeGeometry("box"), browMat);
    b.scale.set(eyeSize * 1.5, eyeSize * 0.32, eyeSize * 0.3);
    b.visible = false;
    b.userData.side = Math.sign(e.position.x) || 1;
    b.userData.rest = e.position.clone();
    parent.add(b);
    return b;
  });
  const mouths = {};
  if (mouth) {
    const { position: p, scale: sc } = mouth;
    const add = (geo, scale, dy = 0) => {
      const m = new THREE.Mesh(geo, mouth.material);
      m.scale.set(...scale);
      m.position.set(p.x, p.y + dy, p.z);
      m.visible = false;
      parent.add(m);
      return m;
    };
    mouths.smile = mouth;
    mouths.frown = add(FROWN, [sc.x * 0.8, sc.y * 0.6, sc.z], -sc.y * 0.25);
    mouths.wobble = add(FROWN, [sc.x * 0.5, sc.y * 0.3, sc.z], -sc.y * 0.2);
    mouths.o = add(shapeGeometry("torus"), [sc.x * 0.42, sc.x * 0.52, sc.z * 0.8], -sc.y * 0.2);
    mouths.o_small = add(shapeGeometry("torus"), [sc.x * 0.26, sc.x * 0.3, sc.z * 0.8], -sc.y * 0.15);
    mouths.flat = add(shapeGeometry("box"), [sc.x * 0.75, sc.y * 0.16, sc.z * 0.5], -sc.y * 0.12);
  }

  return (t, s, blink) => {
    const to = LOOK[s.feeling] ?? LOOK.happy;
    const from = LOOK[s.feelingFrom] ?? LOOK.happy;
    const u = s.feelAt >= 0 ? Math.min(1, Math.max(0, (t - s.feelAt) / Math.max(0.01, s.feelDur ?? 0.35))) : 1;
    const k = smooth(u);
    const show = lerp(from.brow[0], to.brow[0], k);
    const tilt = lerp(from.brow[1], to.brow[1], k);
    const lift = lerp(from.brow[2], to.brow[2], k);
    for (const b of brows) {
      const { side, rest } = b.userData;
      b.visible = show > 0.02;
      b.scale.y = eyeSize * 0.32 * Math.max(0.05, show);
      b.position.set(rest.x, rest.y + eyeSize * (1.35 + lift), rest.z + eyeSize * 0.1);
      // The inner end (toward the middle of the face) goes up by `tilt`.
      b.rotation.z = -side * tilt * DEG;
    }
    if (mouth) {
      const which = u < 0.5 ? from.mouth : to.mouth;
      for (const [name, m] of Object.entries(mouths)) m.visible = name === which;
      // A little squeeze as one mouth changes into the next.
      const sq = 1 - 0.35 * Math.sin(Math.PI * u);
      mouths[which].scale.x = (mouths[which].userData.sx ??= mouths[which].scale.x) * sq;
    }
    const open = Math.max(0.08, Math.min(1, s.eyes ?? 1)) * blink;
    const big = lerp(from.eye, to.eye, k);
    for (const e of eyes) {
      e.scale.x = Math.max(1, big);
      e.scale.y = Math.max(0.08, open * big);
    }
    return [lerp(from.tilt[0], to.tilt[0], k), lerp(from.tilt[1], to.tilt[1], k)];
  };
}

/** Robo's face morphs (Angry, Surprised, Sad) for each feeling. */
const MORPHS = {
  happy: {},
  sad: { Sad: 1 },
  surprised: { Surprised: 1 },
  angry: { Angry: 1 },
  worried: { Sad: 0.6, Surprised: 0.45 },
  sleepy: { Sad: 0.35 },
};

/** Blend a glTF character's face morph targets for the feeling at t. */
export function morphFeeling(meshes, t, s) {
  if (!meshes.length || s.feeling == null) return;
  const u = s.feelAt >= 0 ? Math.min(1, Math.max(0, (t - s.feelAt) / Math.max(0.01, s.feelDur ?? 0.35))) : 1;
  const k = smooth(u);
  const to = MORPHS[s.feeling] ?? {};
  const from = MORPHS[s.feelingFrom] ?? {};
  for (const m of meshes) {
    for (const [name, i] of Object.entries(m.morphTargetDictionary)) m.morphTargetInfluences[i] = lerp(from[name] ?? 0, to[name] ?? 0, k);
  }
}
