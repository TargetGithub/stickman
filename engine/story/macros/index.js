// Beat macro registry (STORY_SPEC 11.1). Milestone: S6. Each builder is (ctx, params) → { anchors }.

import { BASIC_MACROS } from "./basic.js";
import { GROUP_MACROS } from "./group.js";
import { SEQUENCE_MACROS } from "./sequences.js";

export const BEAT_MACROS = { ...BASIC_MACROS, ...GROUP_MACROS, ...SEQUENCE_MACROS };
