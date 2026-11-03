// Talking and looking in the page: the open mouth a speaker shows while its "talk" prop (lipsync.js) is above
// zero, a dropping lower beak for birds, and Robo's head bone, which nods and tilts with his voice and turns
// for `look`. Built only for objects that speak (o.talks), so scripts without `who` draw exactly as before.
// Everything is set from the timeline state at t. Browser only.

import * as THREE from "three";
import { shapeGeometry } from "./geometry.js";

const DEG = Math.PI / 180;
const OPEN = 0.06; // below this the face keeps its own (feeling) mouth
const MIN_WIDTH = 0.15; // narrowest open mouth, in the model's units (critter heads are about 0.5 across)

/**
 * An open mouth: a dark oval (with a tongue once it is wide) that grows from a thin line as the voice gets
 * louder, replacing the smile while it shows. jaw: an extra part (a lower beak) that drops as it opens.
 * @param {THREE.Object3D} parent  the head (or the shape's group)
 * @param {{ at:number[], width:number, jaw?: { p?:string, at:number[], s:number[], c?:string, drop?:number } }} spec
 * @returns {(k:number, feelingMouth?: THREE.Object3D) => void}
 */
export function createTalkMouth(parent, { at, width: w, jaw }, material, fallbackColor = "orange") {
  const oval = new THREE.Mesh(shapeGeometry("sphere"), material("ink", "matte"));
  oval.position.set(...at);
  oval.visible = false;
  const tongue = new THREE.Mesh(shapeGeometry("sphere"), material("rose", "matte"));
  tongue.visible = false;
  parent.add(oval, tongue);
  let lower = null;
  if (jaw) {
    lower = new THREE.Mesh(shapeGeometry(jaw.p ?? "sphere"), material(jaw.c ?? fallbackColor, "toy"));
    lower.scale.set(...jaw.s);
    lower.position.set(...jaw.at);
    lower.castShadow = true;
    lower.visible = false;
    parent.add(lower);
  }
  return (k, feelingMouth) => {
    const open = k > OPEN;
    oval.visible = open;
    tongue.visible = open && k > 0.3;
    if (feelingMouth && open) feelingMouth.visible = false;
    if (lower) {
      lower.visible = open;
      lower.position.y = jaw.at[1] - (jaw.drop ?? 0.06) * k;
      lower.rotation.x = 12 * DEG * k;
    }
    if (!open) return;
    const sx = w * (0.95 - 0.12 * k);
    const sy = w * (0.18 + 0.85 * k);
    // A beak opens downward: the mouth follows the lower beak; other mouths open down, away from the nose.
    const dy = lower ? -(jaw.drop ?? 0.06) * k * 0.5 : -sy * 0.3;
    oval.scale.set(sx, sy, w * 0.28);
    oval.position.y = at[1] + dy;
    tongue.scale.set(sx * 0.55, sy * 0.38, w * 0.12);
    tongue.position.set(at[0], at[1] + dy - sy * 0.24, at[2] + w * 0.09);
  };
}

/** Where a critter without a drawn mouth opens one: its catalog `talk` spec, else under the eyes. */
export function talkSpec(model) {
  // Small smiles (a cat's is 0.1 of its size) open at least MIN_WIDTH wide, so the mouth reads in a medium shot.
  const w = (x) => Math.max(x, MIN_WIDTH);
  if (model.mouth) return { at: model.mouth.at, width: w(model.mouth.size), jaw: model.talk?.jaw };
  if (model.talk) return { at: model.talk.at, width: w(model.talk.size ?? 0.12), jaw: model.talk.jaw };
  const e = model.eyes?.at ?? [0.12, 0.06, 0.25];
  return { at: [0, e[1] - 0.2, e[2] + 0.03], width: w(0.12) };
}

/**
 * point for a glTF character: turn the upper arm so the elbow lies on the line to the target, then the
 * forearm so the hand does too (a straight arm), each blended by k on top of the clip's pose, in world space.
 * Bones UpperArm.L / LowerArm.L (and .R), as in Robo's rig; .L is his own left (+x when he faces +z).
 * @returns {(side:"L"|"R", target:number[], k:number) => void}
 */
function createArmAim(model) {
  // GLTFLoader drops the "." from node names (UpperArm.L becomes UpperArmL); accept either.
  const bone = (name) => {
    let b = null;
    model.traverse((n) => {
      if (n.isBone && (n.name === name || n.name === name.replace(".", "")) && !b) b = n;
    });
    return b;
  };
  const arms = {};
  for (const side of ["L", "R"]) {
    const upper = bone(`UpperArm.${side}`);
    const lower = bone(`LowerArm.${side}`);
    const hand = lower?.children.find((c) => c.isBone) ?? null;
    if (upper && lower && hand) arms[side] = [[upper, lower], [lower, hand]];
  }
  const [a, b, goal] = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  const [dq, qp, rel] = [new THREE.Quaternion(), new THREE.Quaternion(), new THREE.Quaternion()];
  const id = new THREE.Quaternion();
  return (side, target, k) => {
    const arm = arms[side];
    if (!arm) return;
    goal.set(...target);
    model.updateWorldMatrix(true, true);
    for (const [from, to] of arm) {
      from.getWorldPosition(a);
      to.getWorldPosition(b);
      dq.setFromUnitVectors(b.sub(a).normalize(), goal.clone().sub(a).normalize());
      rel.copy(id).slerp(dq, Math.min(1, k));
      from.parent.getWorldQuaternion(qp);
      // A world-space turn, expressed in the bone's parent frame and put before its clip rotation.
      from.quaternion.premultiply(qp.clone().invert().multiply(rel).multiply(qp));
      from.updateWorldMatrix(false, true);
    }
  };
}

/**
 * Robo (a glTF character): look turns his head bone ([yaw, pitch] degrees in his own frame, after the clip
 * pose), and talk nods it a little and tips it side to side; the Surprised face morph opens slightly on loud
 * syllables.
 * @returns {(t:number, s:object) => void}
 */
export function createCharacterRig(model, faces) {
  let head = null;
  model.traverse((n) => {
    if (n.isBone && n.name === "Head" && !head) head = n;
  });
  const q = new THREE.Quaternion();
  const qp = new THREE.Quaternion();
  const e = new THREE.Euler(0, 0, 0, "YXZ");
  const surprised = faces.map((m) => m.morphTargetDictionary?.Surprised);
  const point = createArmAim(model);
  return (t, s) => {
    if (s.point > 0.001 && s.pointAt) point(s.pointArm === "left" ? "L" : "R", s.pointAt, s.point);
    const k = s.talk ?? 0;
    if (!head || (!s.look && !k)) return;
    const [yaw, pitch] = s.look ?? [0, 0];
    // Talking: a small nod with each loud syllable and a slow side-to-side tilt while the line lasts.
    const nod = 7 * k;
    const tilt = k > 0 ? 3.5 * Math.sin(t * 2 * Math.PI * 0.45) * Math.min(1, k * 3) : 0;
    e.set((pitch + nod) * DEG, yaw * DEG, tilt * DEG);
    // The turn is in the model's frame: bring it into the head's parent frame, then apply it on top of the clip.
    model.updateWorldMatrix(true, false);
    head.parent.updateWorldMatrix(true, false);
    const qm = model.getWorldQuaternion(new THREE.Quaternion());
    head.parent.getWorldQuaternion(qp);
    q.setFromEuler(e);
    const rel = qp.clone().invert().multiply(qm).multiply(q).multiply(qm.clone().invert()).multiply(qp);
    head.quaternion.premultiply(rel);
    faces.forEach((m, i) => {
      if (surprised[i] != null) m.morphTargetInfluences[surprised[i]] = Math.min(1, m.morphTargetInfluences[surprised[i]] + 0.3 * k);
    });
  };
}
