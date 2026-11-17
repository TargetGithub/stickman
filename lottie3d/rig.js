// Rig and catalog data for Lottie3D v0.1 (SPEC.md sections 3.1 and 4). Pure data, no Three.js.

/**
 * @typedef {{ name: string, parent: string|null, offset: [number, number, number], bone: number, end?: "head"|"hand"|"foot" }} Joint
 * `bone` is the signed length along +Y from the joint (negative hangs down). `end` marks what sits at the bone's tip.
 */

/** @type {Joint[]} Parents always come before children. */
export const SKELETON = [
  { name: "root", parent: null, offset: [0, 0.95, 0], bone: 0 },
  { name: "spine", parent: "root", offset: [0, 0, 0], bone: 0.5 },
  { name: "neck", parent: "spine", offset: [0, 0.5, 0], bone: 0.1, end: "head" },
  { name: "shoulderL", parent: "spine", offset: [0.18, 0.46, 0], bone: -0.3 },
  { name: "elbowL", parent: "shoulderL", offset: [0, -0.3, 0], bone: -0.28, end: "hand" },
  { name: "shoulderR", parent: "spine", offset: [-0.18, 0.46, 0], bone: -0.3 },
  { name: "elbowR", parent: "shoulderR", offset: [0, -0.3, 0], bone: -0.28, end: "hand" },
  { name: "hipL", parent: "root", offset: [0.1, 0, 0], bone: -0.45 },
  { name: "kneeL", parent: "hipL", offset: [0, -0.45, 0], bone: -0.45, end: "foot" },
  { name: "hipR", parent: "root", offset: [-0.1, 0, 0], bone: -0.45 },
  { name: "kneeR", parent: "hipR", offset: [0, -0.45, 0], bone: -0.45, end: "foot" },
];

export const JOINT_NAMES = SKELETON.map((j) => j.name);
export const HEAD_CENTER = 0.2; // above the neck joint
export const RIGS = ["stick", "block"];
export const PROP_TYPES = ["box", "sphere", "ball", "cylinder", "cone"];
export const LIGHT_TYPES = ["ambient", "directional", "point", "hemisphere"];
