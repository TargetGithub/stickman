// draw_prompt (WORKBOOK_SPEC 5): a prompt above a framed drawing box, with an optional starter picture.

import { ART_SCHEMA } from "../art.js";

export const drawPrompt = {
  name: "draw_prompt",
  params: {
    prompt: { type: "string", minLength: 3, maxLength: 80, description: "What to draw, for example: Draw a hat for Mooka." },
    starter: { ...ART_SCHEMA, description: "A picture to draw on or next to (optional)." },
  },
  required: ["prompt"],
  artPaths: (block) => (block.starter ? [[block.starter, "starter"]] : []),
  generate(block, box, env) {
    const r = env.rules;
    const textH = r.body * 1.3 * 2;
    const frame = { x: box.x, y: box.y + textH + 6, w: box.w, h: box.h - textH - 6 };
    const items = [
      { type: "text", x: box.x, y: box.y, w: box.w, h: textH, text: block.prompt, size: r.body, align: "left", lines: 2 },
      { type: "rect", x: frame.x, y: frame.y, w: frame.w, h: frame.h, width: r.weight * 0.8, radius: 12 },
    ];
    if (block.starter) {
      const h = Math.min(frame.h * 0.55, frame.w * 0.45);
      items.push({ type: "art", ref: block.starter, x: frame.x + frame.w / 2 - h / 2, y: frame.y + frame.h - h - 12, w: h, h, align: "bottom" });
    }
    return { items, answers: [], issues: [] };
  },
};
