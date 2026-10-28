// clock (WORKBOOK_SPEC 5): clock faces with the numbers 1-12. "read": the hands are drawn, the child writes the
// time; "draw": the time is printed, the child draws the hands. Times are given or drawn from the stream on the
// grade's step (hours, half hours, quarters, five minutes, minutes). The key writes the time or draws the hands in red.

import { GRADES } from "../grades.js";
import { gridCells, numberLabel } from "./qa_items.js";

const STEP_BY_GRADE = { prek: 60, k: 60, 1: 30, 2: 5, 3: 1, 4: 1, 5: 1 };
const RAD = Math.PI / 180;

/** "3:05" → { h: 3, m: 5 }, or null when it is not a clock time. */
export function parseTime(s) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  return h >= 1 && h <= 12 && min <= 59 ? { h, m: min } : null;
}

export const timeText = (t) => `${t.h}:${String(t.m).padStart(2, "0")}`;

/** Hand angles in degrees clockwise from 12: the hour hand moves on between hours. */
export const handAngles = (t) => ({ hour: ((t.h % 12) + t.m / 60) * 30, minute: t.m * 6 });

export const clock = {
  name: "clock",
  params: {
    times: { type: "array", minItems: 1, maxItems: 12, items: { type: "string", pattern: "^\\d{1,2}:\\d{2}$" }, description: 'Times such as "3:00" or "7:45" (default: drawn on the grade\'s step).' },
    count: { type: "integer", minimum: 1, maximum: 12, description: "How many clocks when times are not given (default 4)." },
    step: { enum: [60, 30, 15, 5, 1], description: "Minutes between drawn times (default by grade: hours to K, half hours in 1, 5 minutes in 2, any minute from 3)." },
    task: { enum: ["read", "draw"], description: "read: write the time; draw: draw the hands (default read)." },
  },
  required: [],
  artPaths: () => [],
  check(block, path) {
    return (block.times || []).flatMap((s, i) => (parseTime(s) ? [] : [{ code: "E_WB_VALUE", path: `${path}.times[${i}]`, message: `'${s}' is not a clock time.`, fix: "Use hours 1-12 and minutes 00-59, like 7:30." }]));
  },
  generate(block, box, env) {
    const step = block.step ?? STEP_BY_GRADE[env.grade] ?? STEP_BY_GRADE[GRADES[GRADES.length - 1]];
    const times = block.times ? block.times.map(parseTime) : Array.from({ length: block.count ?? 4 }, () => ({ h: 1 + Math.floor(env.rng() * 12), m: Math.floor(env.rng() * (60 / step)) * step }));
    const n = times.length;
    const cols = n <= 2 ? n : n <= 4 ? 2 : n <= 6 ? 3 : 4;
    const cells = gridCells(box, n, cols);
    const r = env.rules;
    const items = [];
    const answers = [];
    const issues = [];
    times.forEach((t, i) => {
      const c = cells[i];
      const labelH = r.body * 1.6;
      const R = Math.min(c.w * 0.4, (c.h - labelH - 10) / 2);
      if (R < r.minItem * 0.7) issues.push({ code: "E_WB_FIT", path: "times", message: `${n} clocks are too small to read in this slot.`, fix: "Use fewer clocks or a bigger slot." });
      const cx = c.x + c.w / 2;
      const cy = c.y + 4 + R;
      if (n > 1) items.push(numberLabel(c, i, env));
      items.push(...face(cx, cy, R, env));
      const hands = handItems(cx, cy, R, t, env);
      const label = { x: cx - R, y: cy + R + 6, w: 2 * R, h: labelH };
      if (block.task === "draw") {
        items.push({ type: "text", ...label, text: timeText(t), size: r.body, align: "center", valign: "middle", weight: "bold", lines: 1 });
        answers.push(...hands.map((h) => ({ ...h, colour: env.ink.answer })));
      } else {
        items.push(...hands);
        items.push({ type: "line", points: [[cx - R * 0.6, label.y + labelH - 3], [cx + R * 0.6, label.y + labelH - 3]], width: r.weight * 0.6 });
        answers.push({ type: "text", ...label, text: timeText(t), size: r.body, align: "center", valign: "middle", colour: env.ink.answer, lines: 1 });
      }
    });
    return { items, answers, issues: issues.slice(0, 1) };
  },
};

/** The face: rim, hour ticks, minute ticks when there is room, the numbers 1-12 and the centre dot. */
function face(cx, cy, R, env) {
  const r = env.rules;
  const at = (deg, d) => [cx + Math.sin(deg * RAD) * d, cy - Math.cos(deg * RAD) * d];
  const items = [{ type: "circle", x: cx, y: cy, r: R, width: r.weight }];
  for (let k = 0; k < 60; k++) {
    if (k % 5 && R < 60) continue;
    const long = k % 5 === 0;
    items.push({ type: "line", points: [at(k * 6, R * (long ? 0.86 : 0.92)), at(k * 6, R * 0.97)], width: long ? r.weight * 0.6 : 0.8 });
  }
  const size = Math.max(7, Math.min(r.body, R * 0.24));
  for (let h = 1; h <= 12; h++) {
    const [x, y] = at(h * 30, R * 0.7);
    items.push({ type: "text", x: x - size, y: y - size * 0.62, w: size * 2, h: size * 1.24, text: String(h), size, align: "center", valign: "middle", lines: 1 });
  }
  items.push({ type: "circle", x: cx, y: cy, r: Math.max(2.5, R * 0.04), width: 0, fill: "#000000" });
  return items;
}

/** The hour hand (short, thick) and the minute hand (long, thin), each with an arrow tip. */
function handItems(cx, cy, R, t, env) {
  const a = handAngles(t);
  const hand = (deg, len, width) => {
    const tip = [cx + Math.sin(deg * RAD) * len, cy - Math.cos(deg * RAD) * len];
    const back = (d) => [tip[0] - Math.sin((deg + d) * RAD) * R * 0.1, tip[1] + Math.cos((deg + d) * RAD) * R * 0.1];
    return [{ type: "line", points: [[cx, cy], tip], width }, { type: "line", points: [back(-25), tip, back(25)], width }];
  };
  return [...hand(a.hour, R * 0.48, env.rules.weight * 1.3), ...hand(a.minute, R * 0.78, env.rules.weight * 0.8)];
}
