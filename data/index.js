// Default catalog passed to createEngine({ catalog }).
import { poses } from "./poses.js";
import { props } from "./props.js";
import { fxPresets, FX_NAMES } from "./fx.js";
import { themes, THEME_NAMES } from "./themes.js";
import { SFX_KEYS } from "./sfx.js";
import { blocklist, softWords } from "./blocklist.js";
import { objects } from "./objects.js";
import { faces, FACE_NAMES } from "./faces.js";
import { bodies, BODY_NAMES } from "./bodies.js";
import { appearance } from "./appearance.js";
import { activities, ACTIVITY_NAMES } from "./activities.js";
import { moves as movement } from "./moves/movement.js";
import { moves as unarmed } from "./moves/unarmed.js";
import { moves as armed } from "./moves/armed.js";
import { moves as defensive } from "./moves/defensive.js";
import { moves as reactions } from "./moves/reactions.js";
import { moves as emotes } from "./moves/emotes.js";
import { moves as utility } from "./moves/utility.js";
import { moves as life } from "./moves/life.js";
import { moves as interactions } from "./moves/interactions.js";
import { moves as defeat } from "./moves/defeat.js";

export const catalog = {
  poses,
  moves: [...movement, ...unarmed, ...armed, ...defensive, ...reactions, ...emotes, ...utility, ...life, ...interactions, ...defeat],
  props,
  fxPresets,
  fxNames: FX_NAMES,
  themes,
  themeNames: THEME_NAMES,
  sfxKeys: SFX_KEYS,
  blocklist,
  softWords,
  objects,
  faces,
  faceNames: FACE_NAMES,
  bodies,
  bodyNames: BODY_NAMES,
  appearance,
  activities,
  activityNames: ACTIVITY_NAMES,
};
