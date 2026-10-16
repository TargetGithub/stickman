// Body plans (STORY_SPEC 6.1, ADR-015). Every plan is the humanoid skeleton with its own bone lengths
// (world px at scale 1), line width and a draw style; all moves work on all plans.
//   draw: stick (lines), capsule (filled round torso, the buddy), trapezoid (filled broad chest)
//   torsoWidth: half-width of a filled torso (also widens the torso hurtbox)
//   posture: pose offsets added to every pose (the elder's stoop); thighs follow the lean so legs stay upright
//   appearance: default appearance options for the plan (a cast entry's appearance wins)
// The stickman plan equals the v1 body exactly (engine/skeleton.js BODY), so v1 output is unchanged.

export const bodies = {
  stickman: {
    rig: "humanoid", draw: "stick",
    dims: { headR: 22, neck: 8, torso: 78, upperArm: 38, forearm: 36, thigh: 48, shin: 46, lineWidth: 9 },
  },
  buddy: {
    rig: "humanoid", draw: "capsule", torsoWidth: 27,
    dims: { headR: 26, neck: 2, torso: 42, upperArm: 22, forearm: 20, thigh: 24, shin: 22, lineWidth: 8 },
    appearance: { eyes: "big", brows: "thin" },
  },
  kid: {
    rig: "humanoid", draw: "stick",
    dims: { headR: 21, neck: 5, torso: 52, upperArm: 26, forearm: 25, thigh: 32, shin: 31, lineWidth: 8 },
    appearance: { eyes: "big" },
  },
  bulky: {
    rig: "humanoid", draw: "trapezoid", torsoWidth: 30,
    dims: { headR: 20, neck: 6, torso: 82, upperArm: 42, forearm: 40, thigh: 46, shin: 44, lineWidth: 13 },
    appearance: { brows: "thick" },
  },
  slim: {
    rig: "humanoid", draw: "stick",
    dims: { headR: 18, neck: 10, torso: 90, upperArm: 45, forearm: 43, thigh: 57, shin: 55, lineWidth: 7 },
    appearance: { eyes: "oval" },
  },
  elder: {
    rig: "humanoid", draw: "stick", posture: { lean: 12, head: 8 },
    dims: { headR: 21, neck: 7, torso: 72, upperArm: 36, forearm: 34, thigh: 44, shin: 42, lineWidth: 8 },
    appearance: { brows: "thick", eyes: "sleepy", hair: "bob", hairColor: "#e8e8e8" },
  },
};

export const BODY_NAMES = Object.keys(bodies);
