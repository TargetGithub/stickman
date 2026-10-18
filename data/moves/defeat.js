// Defeat styles (STORY_SPEC 13, S5.5). Category "defeat": story moves, not in v1 scripts.
// flags.defeat: the character counts as defeated (like a KO) until `return` or `get_up` (all but flee).
// Event flags read by the story layer (engine/story/defeat.js):
//   fade: { to, dur }   fade the character's opacity (0 hides it at the end)
//   reform: true        a vanished character reappears (opacity back from 0)
//   cage: true          drop a cage over the character
// `flee` runs off toward the nearer stage edge, away from whoever is closest, then fades out.
import { moves as movement } from "./movement.js";

const run = movement.find((m) => m.name === "run");
// Lying on the back (the "down" pose) and a bound stance: arms pinned to the sides, feet together.
const BOUND = { lean: 0, head: 4, lUA: 4, lFA: 4, rUA: -4, rFA: 4, lTH: 3, lSH: 0, rTH: -3, rSH: 0 };
const FLINCH = { lean: -10, head: -12, lUA: 60, lFA: 110, rUA: 40, rFA: 120, lTH: -4, lSH: 6, rTH: -14, rSH: 6 };
const SLUMP = { lean: 30, head: -6, lUA: 40, lFA: 40, rUA: 35, rFA: 40, lTH: 95, lSH: 110, rTH: 70, rSH: 115, dy: 30 };
const FLOAT = { lean: 0, head: -6, lUA: 70, lFA: 30, rUA: -70, rFA: -30, lTH: 10, lSH: 20, rTH: -6, rSH: 26 };

export const moves = [
  {
    // Comedic: wobble, eyes spin, flop onto the back.
    name: "faint", category: "defeat", duration: 1.8, face: "dizzy", flags: { hold: true, defeat: true },
    keys: [
      { t: 0, pose: "stand", ease: "inOutQuad" },
      { t: 0.2, pose: "dizzyA", ease: "inOutQuad" },
      { t: 0.4, pose: "dizzyB", ease: "inOutQuad" },
      { t: 0.6, pose: SLUMP, ease: "inQuad" },
      { t: 0.8, pose: "down", ease: "outQuad", snapHard: true },
      { t: 1, pose: "down" },
    ],
    root: [{ t: 0, dx: 0, dy: 0 }, { t: 0.6, dx: -10, dy: 0, ease: "inQuad" }, { t: 1, dx: -30, dy: 0 }],
    events: [{ t: 0.05, fx: ["stars_dizzy"], sfx: "boing" }, { t: 0.8, sfx: "land", fx: ["dust_land"] }],
  },
  {
    // A sidekick's loss, non-graphic: sinks to the knees and dissolves into rising sparkles.
    name: "vanish", category: "defeat", duration: 2.6, face: "sad", flags: { hold: true, defeat: true },
    keys: [
      { t: 0, pose: "stand", ease: "outQuad" },
      { t: 0.2, pose: "koKneel", ease: "inOutQuad" },
      { t: 1, pose: "koKneel" },
    ],
    events: [
      { t: 0.25, fx: ["sparkle"], sfx: "sparkle" },
      { t: 0.35, fade: { to: 0, dur: 1.5 }, fx: ["sparkle_rise"] },
      { t: 0.6, fx: ["sparkle_rise"] },
    ],
  },
  {
    // Emotional loss for the general audience only: falls, then floats up translucent with a halo and fades.
    name: "ghost", category: "defeat", duration: 3.2, face: "sad", flags: { hold: true, defeat: true },
    keys: [
      { t: 0, pose: "stand", ease: "inQuad" },
      { t: 0.15, pose: SLUMP, ease: "inQuad" },
      { t: 0.3, pose: "down", ease: "outQuad", snapHard: true },
      { t: 0.4, pose: "down", ease: "inOutQuad" },
      { t: 0.6, pose: FLOAT, ease: "inOutQuad" },
      { t: 1, pose: FLOAT },
    ],
    root: [{ t: 0, dx: 0, dy: 0 }, { t: 0.45, dx: 0, dy: 0, ease: "inOutQuad" }, { t: 1, dx: 0, dy: -320 }],
    events: [
      { t: 0.3, sfx: "land" },
      { t: 0.42, fade: { to: 0.45, dur: 0.5 }, fx: ["halo"], sfx: "sparkle" },
      { t: 0.75, fade: { to: 0, dur: 0.8 }, fx: ["sparkle_rise"] },
    ],
  },
  {
    // Not lethal: rope loops bind the arms, then a cage drops over the character.
    name: "captured", category: "defeat", duration: 1.8, face: "scared", flags: { hold: true, defeat: true },
    params: { cage: 1 },
    keys: [
      { t: 0, pose: "stand", ease: "outQuad" },
      { t: 0.15, pose: FLINCH, ease: "inOutQuad" },
      { t: 0.35, pose: BOUND, ease: "outBack" },
      { t: 1, pose: BOUND },
    ],
    events: [{ t: 0.12, fx: ["rope_bind"], sfx: "whoosh" }, { t: 0.55, cage: true, fx: ["cage_drop"], sfx: "clang", shake: "small" }],
  },
  {
    // Comic villain ending: turn and run off the stage (the director picks the side and the distance).
    // Not a knockout: a character who fled can come back in a later scene.
    ...run, name: "flee", category: "defeat", face: "scared",
  },
  {
    // A vanished (or defeated) character re-forms from sparkles: for kids endings.
    name: "return", category: "defeat", duration: 1.6, face: "happy",
    keys: [
      { t: 0, pose: "crouch", ease: "inOutQuad" },
      { t: 0.5, pose: "crouch", ease: "outBack" },
      { t: 0.85, pose: "stand", ease: "inOutQuad" },
      { t: 1, pose: "stand" },
    ],
    events: [{ t: 0, reform: true, fx: ["sparkle"], sfx: "sparkle" }, { t: 0.3, fx: ["sparkle"] }, { t: 0.8, fx: ["confetti"] }],
  },
];
