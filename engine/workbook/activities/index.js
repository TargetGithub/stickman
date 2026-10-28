// The workbook activities (WORKBOOK_SPEC 5). Each one: { name, params (schema properties), required,
// artPaths(block) → [[ref, path]], limits?(block, rules) → [[path, value, max]], generate(block, box, env) }.
// generate returns { items, answers, issues } (display list items, answer items, E_WB_FIT issues).

import { colourPage } from "./colour_page.js";
import { drawPrompt } from "./draw_prompt.js";
import { count } from "./count.js";
import { shapeLesson } from "./shape_lesson.js";

export const ACTIVITIES = Object.fromEntries([colourPage, drawPrompt, count, shapeLesson].map((a) => [a.name, a]));
export const ACTIVITY_NAMES = Object.keys(ACTIVITIES);
