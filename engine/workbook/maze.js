// Perfect mazes (WORKBOOK_SPEC 5): one path between any two cells, no loops, carved by a seeded depth-first walk.
// The entrance is on the left wall and the exit on the right; the generator keeps the try whose solution is
// longest, so the path is never a short cut.

/** Neighbours in a stable order: right, down, left, up. */
const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]];

/**
 * Carve a maze. walls: for each cell, [right, down] (true = wall); the outer frame is always walled except the
 * openings. @returns {{ cols, rows, right: boolean[], down: boolean[] }}
 */
export function carve(cols, rows, rng) {
  const right = Array(cols * rows).fill(true);
  const down = Array(cols * rows).fill(true);
  const seen = Array(cols * rows).fill(false);
  const stack = [0];
  seen[0] = true;
  while (stack.length) {
    const c = stack[stack.length - 1];
    const x = c % cols;
    const y = Math.floor(c / cols);
    const open = DIRS.map(([dx, dy]) => [x + dx, y + dy]).filter(([nx, ny]) => nx >= 0 && ny >= 0 && nx < cols && ny < rows && !seen[ny * cols + nx]);
    if (!open.length) {
      stack.pop();
      continue;
    }
    const [nx, ny] = open[Math.floor(rng() * open.length)];
    const n = ny * cols + nx;
    if (nx > x) right[c] = false;
    else if (nx < x) right[n] = false;
    else if (ny > y) down[c] = false;
    else down[n] = false;
    seen[n] = true;
    stack.push(n);
  }
  return { cols, rows, right, down };
}

/** Whether two side-by-side cells are joined. */
function joined(m, a, b) {
  const [ax, ay] = [a % m.cols, Math.floor(a / m.cols)];
  const [bx, by] = [b % m.cols, Math.floor(b / m.cols)];
  if (ay === by) return !m.right[ay * m.cols + Math.min(ax, bx)];
  return !m.down[Math.min(ay, by) * m.cols + ax];
}

/** The cells from a to b (breadth-first; a perfect maze has exactly one path). */
export function solve(m, a, b) {
  const prev = new Map([[a, -1]]);
  const queue = [a];
  while (queue.length) {
    const c = queue.shift();
    if (c === b) break;
    const [x, y] = [c % m.cols, Math.floor(c / m.cols)];
    for (const [dx, dy] of DIRS) {
      const [nx, ny] = [x + dx, y + dy];
      const n = ny * m.cols + nx;
      if (nx < 0 || ny < 0 || nx >= m.cols || ny >= m.rows || prev.has(n) || !joined(m, c, n)) continue;
      prev.set(n, c);
      queue.push(n);
    }
  }
  const path = [];
  for (let c = b; c !== -1; c = prev.get(c)) path.unshift(c);
  return path;
}

/**
 * A maze with its entrance (left wall) and exit (right wall) and the solution, the longest of `tries` mazes.
 * @returns {{ cols, rows, right, down, start: number, end: number, path: number[] }}
 */
export function makeMaze(cols, rows, rng, tries = 6) {
  let best = null;
  for (let t = 0; t < tries; t++) {
    const m = carve(cols, rows, rng);
    const start = Math.floor(rng() * rows) * cols;
    const end = Math.floor(rng() * rows) * cols + cols - 1;
    const path = solve(m, start, end);
    if (!best || path.length > best.path.length) best = { ...m, start, end, path };
  }
  return best;
}
