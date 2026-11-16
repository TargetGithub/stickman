// Named spots on a glTF character's rig (#148): a child object with parent + part rides a bone. Browser only.

import * as THREE from "three";

/** Bones a child can ride on (#148: a badge on Robo's chest panel): part name -> bone name in the glTF rig. */
export const CHARACTER_PARTS = { head: "Head", chest: "Torso", hand_l: "Palm2.L", hand_r: "Palm2.R" };

/**
 * One anchor per riding bone, set under the bone so it cancels the bone's rest turn and scale: a child's at is in
 * the character's own units (from the bone), and it follows the bone as the clips play.
 */
export function characterAnchors(group, model) {
  group.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(group.matrixWorld).invert();
  const named = new Map();
  for (const [part, name] of Object.entries(CHARACTER_PARTS)) {
    let bone = null;
    model.traverse((n) => n.isBone && n.name === name && !bone && (bone = n));
    if (!bone) continue;
    const pos = new THREE.Vector3();
    const quat = new THREE.Quaternion();
    const scl = new THREE.Vector3();
    new THREE.Matrix4().multiplyMatrices(inv, bone.matrixWorld).decompose(pos, quat, scl);
    const anchor = new THREE.Group();
    anchor.quaternion.copy(quat.invert());
    anchor.scale.set(1 / scl.x, 1 / scl.y, 1 / scl.z);
    bone.add(anchor);
    named.set(part, anchor);
  }
  return named;
}
