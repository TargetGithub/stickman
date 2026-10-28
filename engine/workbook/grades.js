// Workbook page sizes and grade rules (WORKBOOK_SPEC 4.1, 6). All lengths in PDF points (1/72 inch).

export const PT_PER_INCH = 72;

/** Page sizes, portrait. */
export const PAGE_SIZES = { letter: [612, 792], a4: [595, 842] };

export const GRADES = ["prek", "k", "1", "2", "3", "4", "5"];

/** True when grade is the same as or above min (both GRADES names). */
export const atLeast = (grade, min) => GRADES.indexOf(grade) >= GRADES.indexOf(min);

/**
 * Per grade: type sizes (title, body, small), outline weight, the smallest drawn item, and the limits
 * the validator and the generators use.
 */
export const GRADE_RULES = {
  prek: { title: 32, body: 22, small: 14, weight: 3.5, minItem: 72, maxBlocks: 1, instructions: 50, countMax: 5, mazeMax: 5, dotsMax: 10, wordGrid: 0 },
  k: { title: 30, body: 20, small: 13, weight: 3, minItem: 54, maxBlocks: 2, instructions: 60, countMax: 10, mazeMax: 7, dotsMax: 15, wordGrid: 6 },
  1: { title: 26, body: 17, small: 12, weight: 2.5, minItem: 43, maxBlocks: 4, instructions: 90, countMax: 20, mazeMax: 10, dotsMax: 25, wordGrid: 8 },
  2: { title: 22, body: 15, small: 11, weight: 2, minItem: 36, maxBlocks: 6, instructions: 120, countMax: 20, mazeMax: 14, dotsMax: 40, wordGrid: 10 },
  3: { title: 20, body: 14, small: 11, weight: 2, minItem: 32, maxBlocks: 6, instructions: 140, countMax: 20, mazeMax: 16, dotsMax: 50, wordGrid: 12 },
  4: { title: 19, body: 13, small: 10, weight: 1.8, minItem: 29, maxBlocks: 6, instructions: 160, countMax: 20, mazeMax: 18, dotsMax: 60, wordGrid: 13 },
  5: { title: 18, body: 13, small: 10, weight: 1.6, minItem: 27, maxBlocks: 6, instructions: 160, countMax: 20, mazeMax: 20, dotsMax: 75, wordGrid: 14 },
};

/** Print colours: tracing guides, answers (answer keys only). */
export const INK = { line: "#000000", trace: "#888888", guide: "#bbbbbb", answer: "#d62828", start: "#2a9d3a" };

/** Layouts: slot rectangles as [col, row, cols, rows] in a grid of [gridCols, gridRows]. */
export const LAYOUTS = {
  full: { grid: [1, 1], slots: [[0, 0]] },
  halves: { grid: [1, 2], slots: [[0, 0], [0, 1]] },
  thirds: { grid: [1, 3], slots: [[0, 0], [0, 1], [0, 2]] },
  grid2x2: { grid: [2, 2], slots: [[0, 0], [1, 0], [0, 1], [1, 1]] },
  grid2x3: { grid: [2, 3], slots: [[0, 0], [1, 0], [0, 1], [1, 1], [0, 2], [1, 2]] },
};

export const GUTTER = 18;
