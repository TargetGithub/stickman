// Word search grids (WORKBOOK_SPEC 5): words placed longest first in the allowed directions (seeded tries),
// then filler letters; no line of the finished grid may spell a blocked word.

import { atLeast } from "./grades.js";

/** Directions by name: [dx, dy]. */
export const WORD_DIRS = { right: [1, 0], down: [0, 1], downRight: [1, 1], upRight: [1, -1] };

/** Directions a grade may use (diagonals from grade 2). */
export const gradeDirections = (grade) => (atLeast(grade, "2") ? ["right", "down", "downRight", "upRight"] : ["right", "down"]);

const LETTERS = "ABCDEFGHIJKLMNOPRSTUVWY"; // filler: no Q, X or Z, which children read as clues
const TRIES = 200;

/** Every straight line of the grid (rows, columns, both diagonals) as text, both ways. */
function lines(grid, n) {
  const at = (x, y) => grid[y * n + x];
  const out = [];
  for (let i = 0; i < n; i++) {
    out.push(Array.from({ length: n }, (_, k) => at(k, i)).join(""), Array.from({ length: n }, (_, k) => at(i, k)).join(""));
  }
  for (let d = -n + 1; d < n; d++) {
    let a = "";
    let b = "";
    for (let x = 0; x < n; x++) {
      const y1 = x + d;
      const y2 = n - 1 - x + d;
      if (y1 >= 0 && y1 < n) a += at(x, y1);
      if (y2 >= 0 && y2 < n) b += at(x, y2);
    }
    out.push(a, b);
  }
  return out.flatMap((l) => [l, [...l].reverse().join("")]);
}

/** Blocked words (letters only, 3 or more) that appear anywhere in the grid. */
export function blockedIn(grid, n, blocklist) {
  const text = lines(grid, n).join("|");
  return blocklist.map((w) => w.toUpperCase()).filter((w) => /^[A-Z]{3,}$/.test(w) && text.includes(w));
}

/**
 * @param {string[]} words  uppercase A-Z
 * @returns {{ grid: string[], n, placed: { word, x, y, dir }[] } | null}  null when a word does not fit
 */
export function makeWordGrid(words, n, dirs, rng, blocklist = []) {
  const grid = Array(n * n).fill("");
  const placed = [];
  const order = words.map((w, i) => [w, i]).sort((a, b) => b[0].length - a[0].length || a[1] - b[1]);
  for (const [word] of order) {
    let spot = null;
    for (let t = 0; t < TRIES && !spot; t++) {
      const dir = dirs[Math.floor(rng() * dirs.length)];
      const [dx, dy] = WORD_DIRS[dir];
      const x = Math.floor(rng() * n);
      const y = Math.floor(rng() * n);
      const ex = x + dx * (word.length - 1);
      const ey = y + dy * (word.length - 1);
      if (ex < 0 || ex >= n || ey < 0 || ey >= n) continue;
      if ([...word].every((ch, k) => [ch, ""].includes(grid[(y + dy * k) * n + x + dx * k]))) spot = { word, x, y, dir };
    }
    if (!spot) return null;
    const [dx, dy] = WORD_DIRS[spot.dir];
    [...word].forEach((ch, k) => (grid[(spot.y + dy * k) * n + spot.x + dx * k] = ch));
    placed.push(spot);
  }
  const free = grid.map((c, i) => (c ? -1 : i)).filter((i) => i >= 0);
  for (const i of free) grid[i] = LETTERS[Math.floor(rng() * LETTERS.length)];
  // Re-draw filler letters until no line spells a blocked word (words themselves are checked by the validator).
  for (let pass = 0; pass < 50 && blockedIn(grid, n, blocklist).length; pass++) {
    for (const i of free) grid[i] = LETTERS[Math.floor(rng() * LETTERS.length)];
  }
  placed.sort((a, b) => words.indexOf(a.word) - words.indexOf(b.word));
  return { grid, n, placed };
}
