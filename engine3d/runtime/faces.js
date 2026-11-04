// Feelings on toy faces (critters and shapes with face: true): eyebrows, mouth shapes, eye size and a head
// tilt, blended from the last feeling to the new one over feelDur seconds (the "feel" move). Everything is a
// function of the timeline state at t. Browser only.

import * as THREE from "three";
import { shapeGeometry } from "./geometry.js";

const DEG = Math.PI / 180;
const FROWN = shapeGeometry("smile").clone().rotateZ(Math.PI);

// brow: [visible 0-1, inner-end tilt in degrees (+ up), lift in eye sizes]; eye: openness factor;
// mouth: which mouth shows; tilt: head pitch in degrees (+ looks down), roll in degrees; shut: 1 closes the
// eyes into happy arcs (joyful).
const LOOK = {
  happy: { brow: [0, 0, 0], eye: 1, mouth: "smile", tilt: [0, 0] },
  sad: { brow: [1, 22, 0.1], eye: 0.85, mouth: "frown", tilt: [14, 0] },
  surprised: { brow: [1, 0, 0.55], eye: 1.3, mouth: "o", tilt: [-8, 0] },
  angry: { brow: [1, -24, -0.1], eye: 0.75, mouth: "flat", tilt: [4, 0] },
  worried: { brow: [1, 16, 0.3], eye: 1.12, mouth: "wobble", tilt: [6, 7] },
  sleepy: { brow: [0, 0, 0], eye: 0.3, mouth: "o_small", tilt: [10, -5] },
  joyful: { brow: [0, -6, 0.25], eye: 1, mouth: "smile", tilt: [-6, 4], shut: 1 },
};

const lerp = (a, b, k) => a + (b - a) * k;
const smooth = (k) => k * k * (3 - 2 * k);

/**
 * @param {{ parent: THREE.Object3D, eyes: THREE.Object3D[], eyeSize: number, mouth?: THREE.Mesh, head?: THREE.Object3D,
 *   material: Function, talk?: Function, brows?: { color?: string, size?: number, lift?: number, dz?: number }, open?: boolean }} o
 *   eyes: the two eye groups (x > 0 first or second, either way); mouth: the smile mesh;
 *   talk: the open mouth for lip-sync (talk.js createTalkMouth), driven by the "talk" prop;
 *   brows: thick arched brows that always show (plush faces; dz sets them back from the eyes onto a round brow),
 *   else thin bars that show only for some feelings;
 *   open: an open-mouth face (a grin): its surprised "o" is a filled dark oval, not a ring
 * @returns {(t:number, s:object, blink:number) => number[]}  sets brows, mouth and eye scale; returns the head tilt [pitch, roll] in degrees
 */
export function createFaceRig({ parent, eyes, eyeSize, mouth, material, talk, brows: arch, open: grin = false }) {
  const browMat = material(arch?.color ?? "ink", "matte");
  const browSize = eyeSize * (arch?.size ?? 1.5);
  const brows = eyes.map((e) => {
    const b = new THREE.Mesh(shapeGeometry(arch ? "brow" : "box"), browMat);
    if (arch) b.scale.setScalar(browSize);
    else b.scale.set(eyeSize * 1.5, eyeSize * 0.32, eyeSize * 0.3);
    b.visible = !!arch;
    b.userData.side = Math.sign(e.position.x) || 1;
    b.userData.rest = e.position.clone();
    parent.add(b);
    return b;
  });
  // Shut happy eyes (joyful): an arc where each eye is, shown as the eye closes.
  const arcs = eyes.map((e) => {
    const a = new THREE.Mesh(FROWN, material("ink", "matte"));
    a.scale.set(eyeSize * 1.5, eyeSize * 1.1, eyeSize * 0.5);
    a.position.set(e.position.x, e.position.y - eyeSize * 0.2, e.position.z + eyeSize * 0.35);
    a.visible = false;
    parent.add(a);
    return a;
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
    mouths.o = grin ? add(shapeGeometry("sphere"), [sc.x * 0.42, sc.x * 0.5, sc.z * 0.5], -sc.y * 0.05) : add(shapeGeometry("torus"), [sc.x * 0.42, sc.x * 0.52, sc.z * 0.8], -sc.y * 0.2);
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
      if (arch) b.position.set(rest.x + side * eyeSize * 0.14, rest.y + eyeSize * (1.25 + (arch.lift ?? 0) + lift), rest.z + (arch.dz ?? -eyeSize * 0.1));
      else {
        b.visible = show > 0.02;
        b.scale.y = eyeSize * 0.32 * Math.max(0.05, show);
        b.position.set(rest.x, rest.y + eyeSize * (1.35 + lift), rest.z + eyeSize * 0.1);
      }
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
    talk?.(s.talk ?? 0, mouth ? mouths[(u < 0.5 ? from : to).mouth] : null);
    const open = Math.max(0.08, Math.min(1, s.eyes ?? 1)) * blink;
    const big = lerp(from.eye, to.eye, k);
    const shut = lerp(from.shut ?? 0, to.shut ?? 0, k);
    for (const e of eyes) {
      e.scale.x = Math.max(1, big);
      e.scale.y = Math.max(0.08, open * big * (1 - shut));
      e.visible = shut < 0.9;
    }
    for (const a of arcs) a.visible = shut > 0.5;
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
  joyful: {},
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
