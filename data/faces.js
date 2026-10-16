// Faces (STORY_SPEC 7.1). Catalog data drawn by engine/renderer/face.js on any head.
// eyes:  dot | wide | happy (^ arcs) | closed (v arcs) | squeeze (> <) | half (heavy lids) | spiral | heart
// brows: null (none) or { tilt, lift }: tilt in degrees, positive = worried (inner ends up),
//        negative = angry (inner ends down); lift moves both brows up (fraction of head radius).
// mouth: line | smile | grin | open | frown | o | wavy | smirk | teeth
// extras: tears | vein | sweat | hearts | blush
// talk:  the mouth used while the character's mouth is open during speech (default "open").

export const faces = {
  neutral: { eyes: "dot", brows: null, mouth: "line" },
  happy: { eyes: "dot", brows: { tilt: 6, lift: 0.04 }, mouth: "smile", talk: "grin" },
  laugh: { eyes: "happy", brows: { tilt: 8, lift: 0.08 }, mouth: "grin", talk: "grin" },
  sad: { eyes: "dot", brows: { tilt: 22, lift: 0 }, mouth: "frown" },
  cry: { eyes: "closed", brows: { tilt: 28, lift: 0.02 }, mouth: "wavy", extras: ["tears"] },
  angry: { eyes: "dot", brows: { tilt: -22, lift: -0.04 }, mouth: "frown", talk: "teeth" },
  furious: { eyes: "dot", brows: { tilt: -34, lift: -0.06 }, mouth: "teeth", talk: "teeth", extras: ["vein"] },
  scared: { eyes: "wide", brows: { tilt: 26, lift: 0.12 }, mouth: "wavy", extras: ["sweat"] },
  surprised: { eyes: "wide", brows: { tilt: 4, lift: 0.16 }, mouth: "o" },
  determined: { eyes: "dot", brows: { tilt: -14, lift: -0.02 }, mouth: "line", talk: "teeth" },
  smug: { eyes: "half", brows: { tilt: -6, lift: 0.04 }, mouth: "smirk" },
  tired: { eyes: "half", brows: { tilt: 10, lift: -0.02 }, mouth: "line", extras: ["sweat"] },
  love: { eyes: "heart", brows: { tilt: 8, lift: 0.06 }, mouth: "smile", talk: "grin", extras: ["blush", "hearts"] },
  dizzy: { eyes: "spiral", brows: null, mouth: "wavy" },
  hurt: { eyes: "squeeze", brows: { tilt: 18, lift: 0 }, mouth: "open" },
  asleep: { eyes: "closed", brows: null, mouth: "o" }, // S5 (sleep)
};

export const FACE_NAMES = Object.keys(faces);
