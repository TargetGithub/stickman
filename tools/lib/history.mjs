// Generation history (spec 18.4): out/history.json records used premises, moves, themes and palettes
// so prompts can ask for something different. The review queue (spec 18.6) is out/review_queue.json.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

function readJson(file, fallback) {
  if (!existsSync(file)) return fallback;
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(file, data) {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
}

export function loadHistory(file) {
  const h = readJson(file, null);
  return h && Array.isArray(h.entries) ? h : { version: 1, entries: [] };
}

export const saveHistory = writeJson;

/** History entry for a finished script. */
export function historyEntry(premise, script, extra = {}) {
  return {
    title: script.meta.title,
    logline: premise.logline,
    theme: script.meta.theme ?? "white_stage",
    format: script.meta.format,
    moves: [...new Set(script.beats.filter((b) => b.who !== "world").map((b) => b.do))],
    palette: script.characters.map((c) => c.color),
    ...extra,
  };
}

/** "Avoid repeating" summary for prompts, from the most recent entries. */
export function avoidList(history, { recent = 30 } = {}) {
  const last = history.entries.slice(-recent);
  if (!last.length) return { premises: [], themes: [], palettes: [] };
  const themeCount = {};
  for (const e of last.slice(-10)) themeCount[e.theme] = (themeCount[e.theme] || 0) + 1;
  return {
    premises: last.map((e) => `${e.title}: ${e.logline || ""}`.trim()),
    themes: Object.entries(themeCount).filter(([, n]) => n >= 3).map(([t]) => t),
    palettes: last.slice(-8).map((e) => e.palette.join("/")),
  };
}

export function appendReviewQueue(file, item) {
  const q = readJson(file, []);
  const list = Array.isArray(q) ? q : [];
  list.push(item);
  writeJson(file, list);
  return list.length;
}
