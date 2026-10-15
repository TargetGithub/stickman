// Shared JSDoc typedefs. See docs/ARCHITECTURE.md section 3.

/** @typedef {{x:number, y:number}} Vec */

/** @typedef {{ rot?:number, lean?:number, head?:number,
 *   lUA?:number, lFA?:number, rUA?:number, rFA?:number,
 *   lTH?:number, lSH?:number, rTH?:number, rSH?:number,
 *   dx?:number, dy?:number }} Pose */

/** @typedef {{ hip:Vec, shoulder:Vec, neckTop:Vec, head:Vec, center:Vec,
 *   lElbow:Vec, lHand:Vec, rElbow:Vec, rHand:Vec,
 *   lKnee:Vec, lFoot:Vec, rKnee:Vec, rFoot:Vec }} Joints */

/** @typedef {{ code:string, path:string, message:string, fix?:string }} Issue */

export const JOINT_ORDER = [
  "hip", "shoulder", "neckTop", "head", "lElbow", "lHand",
  "rElbow", "rHand", "lKnee", "lFoot", "rKnee", "rFoot", "center",
];

export const POSE_CHANNELS = [
  "rot", "lean", "head", "lUA", "lFA", "rUA", "rFA",
  "lTH", "lSH", "rTH", "rSH", "dx", "dy",
];
