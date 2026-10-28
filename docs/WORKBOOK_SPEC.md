# Workbooks: printable PDF activity books from the StickMan catalog

Status: 0.2 (2026-10-28). W0 signed off (two PDFs, student book and answer key; black-and-white covers); W1 reviewed (print approvals in `education/line_art.json`); W2-W4 reviewed; W5 built, waiting for the review of three AI-written workbooks. Owner: Sridhar. Builds on [CATALOG_SPEC.md](CATALOG_SPEC.md) (the catalog and the AI context pack), [ARCHITECTURE.md](ARCHITECTURE.md) (ADR-040) and the engine rules in `CLAUDE.md`.

## 1. Goal and scope

The engine also makes **printable activity workbooks for young children**, in the spirit of the activity books sold in school book fairs: shape lessons, tracing, colouring pages, counting, find-the-shapes, matching, mazes, dot-to-dot, word searches, patterns and drawing prompts. The pages use the catalog's own characters, props and objects as line art, so a Doopi workbook looks like Doopi.

- **One script, several PDFs.** A workbook script lists documents (a student book, its answer key, a colouring book ...); `tools/print.mjs` writes one PDF per document.
- **Written by an AI from the catalog**, the same way video scripts are: a prompt plus the context pack, then the validator and a fix prompt.
- **Deterministic.** The same script and catalog give byte-identical PDFs. Every maze, word search and scatter comes from the script's seed.

First release (W0-W5):
- grades **pre-K, K, 1 and 2** (`grade` "prek", "k", "1", "2"); grades 3-5 come later;
- **US Letter** by default, A4 as an option; portrait (landscape is allowed for colouring pages);
- black and white pages for home printers; answer keys may use colour.

Not in scope: fillable or interactive PDFs, booklet imposition (pages in print order for folding), cut-and-paste pages, languages other than English, and any publisher's names, characters or page designs (we make the same *kinds* of activity with our own art).

## 2. Decision: a workbook is its own document kind (ADR-040)

Sridhar's first idea was a `medium` field in the video script (MP4 or PDF). A workbook page is not a timeline, though: it has no cast blocking, beats, camera or seconds. It has a page size, margins, a layout grid, activity blocks and answer keys. Folding both into one schema would make each harder to validate and harder for a model to write.

So a workbook is a separate script **kind**:

| Script | Marker | Output | Tool |
|---|---|---|---|
| Video (clip, story, v3 story) | `version` 1, 2 or 3, no `kind` | MP4 | `tools/record.mjs` |
| Workbook | `"kind": "workbook"`, `"version": 1` | one PDF per document | `tools/print.mjs` |

The medium follows from the kind; a script never names it. Both kinds share the catalog, the drawing code (characters, props, objects, shapes), the seeded random streams, the validator's issue format and the AI pipeline. `validate()` sends a script with `kind: "workbook"` to the workbook validator; video scripts are unchanged. Later, `print.mjs --from-story <script>` can make a companion colouring book from a video script's cast and places (section 12).

## 3. Architecture

```
workbook script (JSON)         catalog (injected)
        |                            |
        v                            v
+------------------------- engine (pure) --------------------------+
|  workbook/validate.js   schema + semantic checks (E_WB_*, W_WB_*)  |
|  workbook/layout.js     page size, margins, header, slots (pt)     |
|  workbook/activities/   one generator per activity: seed -> items  |
|                         + answer items                             |
|  workbook/build.js      documents -> pages -> display lists        |
|  renderer/page_draw.js  draws one page's display list on any ctx   |
|  renderer/line_art.js   context wrapper: black lines on white      |
|  renderer/shapes_draw.js  the 2D shapes from catalog geometry      |
+--------------------------------------------------------------------+
        |
        v
tools/print.mjs: PDF per document (@napi-rs/canvas PDFDocument, vector), PNG previews, contact sheet
```

- **Pure core.** `buildWorkbook(script, catalog)` returns plain data: `{ documents: [{ id, title, file, pages: [{ width, height, items }] }], issues }`. Items are a small display list (section 9). No canvas, no fonts, no I/O.
- **Drawing on any 2D context.** `drawPage(ctx, page, catalog, opts)` draws a page's items with the same Canvas 2D calls the video renderer uses. A PDF page context, a PNG canvas and a browser canvas all work.
- **Vector PDF without a new dependency.** `@napi-rs/canvas` (already a dev dependency) has `PDFDocument`: `beginPage(w, h)` returns a 2D context that records vectors; fonts are embedded and subset; no creation date is written, so the bytes are deterministic (checked in W0 with a two-page probe). `tools/lib/canvas.mjs` gets `backend.createPdf(meta)` so tools never import a backend directly (ADR-001).
- **Units are PDF points** (1/72 inch). Letter is 612 x 792, A4 595 x 842 (whole points: Skia rounds page sizes).
- **Text.** The layout never measures text. Text items carry a box, a size and `fit: "shrink"`; the renderer shrinks the font until the text fits (renderer-only, as subtitles do). Grids that hold letters (word search) use fixed cells, so no metrics are needed there either.
- **Public API** (`engine/index.js`): `validateWorkbook(script, catalog)`, `buildWorkbook(script, catalog)`, `drawPage(ctx, page, catalog, opts)`, `workbookSchema(catalog)`. `validate(script, catalog)` dispatches on `kind`.
- **Files.** New logic lives in `engine/workbook/` and three renderer files. Each module stays under about 350 lines; each activity is its own file.

## 4. Script format (`kind: "workbook"`, version 1)

```json
{
  "kind": "workbook",
  "version": 1,
  "title": "Shapes with Doopi",
  "seed": 4207,
  "grade": "k",
  "page": { "size": "letter", "margin": 36 },
  "style": { "cast": ["doopi", "mooka"], "nameLine": true },
  "documents": [
    {
      "id": "student",
      "title": "Shapes with Doopi",
      "cover": { "art": [{ "preset": "doopi", "pose": "wave" }] },
      "pages": [
        {
          "id": "triangle",
          "title": "Meet the Triangle",
          "layout": "full",
          "blocks": [{ "activity": "shape_lesson", "shape": "triangle" }]
        },
        {
          "id": "find_triangles",
          "title": "Find the Triangles",
          "instructions": "Colour every triangle. How many did you find?",
          "layout": "full",
          "blocks": [{ "activity": "find_shapes", "target": "triangle", "count": 6, "distractors": ["circle", "square"] }]
        },
        {
          "id": "maze_and_count",
          "title": "Help Doopi Home",
          "layout": "halves",
          "blocks": [
            { "slot": 0, "activity": "maze", "size": [7, 7], "start": { "preset": "doopi" }, "end": { "object": "house" } },
            { "slot": 1, "activity": "count", "item": { "shape": "star" }, "groups": [3, 5, 2] }
          ]
        }
      ]
    },
    { "id": "answers", "answersFor": "student", "title": "Answer Key" }
  ]
}
```

### 4.1 Top level

| Field | Type | Notes |
|---|---|---|
| `kind` | `"workbook"` | required |
| `version` | `1` | required |
| `title` | string, 1-60 | the book's title (PDF metadata, cover) |
| `seed` | integer 0-2^31 | required; every generator draws from it (section 7) |
| `grade` | `prek`, `k`, `1`, `2` | required; sets type sizes, line weights and difficulty limits (section 6) |
| `page` | object | `size` letter (default) or a4; `margin` 27-72 pt (default 36, half an inch); `orientation` portrait (default) or landscape |
| `style` | object | `cast`: preset ids used as decoration and in default art (print-approved only, section 8.3); `nameLine` (default true): a "Name: ____" line on each page; `pageNumbers` (default true); `font` andika (default) |
| `documents` | list, 1-6 | each becomes one PDF |

### 4.2 Documents

A document is either **authored** (`pages`) or an **answer key** (`answersFor`):

| Field | Notes |
|---|---|
| `id` | lowercase id, unique; also the PDF file suffix (`<slug>-<id>.pdf`) |
| `title` | shown on the cover and in PDF metadata |
| `cover` | optional: a cover page with the title, `subtitle` and up to 4 `art` items |
| `pages` | 1-64 pages (authored documents) |
| `answersFor` | the id of an authored document: one page per page that has answers, the student page drawn with its answers on top. A page without answers (colouring, drawing) is left out. |
| `answerStyle` | `overlay` (the default and, for now, the only one: the student page with its answers in red); `compact` (four pages per sheet) may come later |

### 4.3 Pages and layouts

| Field | Notes |
|---|---|
| `id` | unique in the document; also names the page's random streams |
| `title` | the page heading (grade sizes, section 6) |
| `instructions` | one or two short sentences read aloud by a grown-up (length limits by grade) |
| `layout` | `full`, `halves` (top, bottom), `thirds` (three rows), `grid2x2`, `grid2x3` (two columns, three rows); default `full` |
| `blocks` | 1 block per slot at most; `slot` is the slot index (default 0) or a span `[first, last]` of adjacent slots |
| `art` | optional decoration: a character beside the title (`{ "preset", "pose", "face" }`), as tall as the header band; the title and instructions keep clear of it |

Each page has a header band (name line, title, instructions) and a footer (page number); an answer-key page replaces the name line with an "Answer Key: page N" tag and has no page number; the layout divides the rest of the safe area into slots with a gutter of 18 pt. A block's own `instructions` (optional) is drawn at the top of its slot.

### 4.4 Art references

Activities draw catalog things through one **art reference** form:

| Form | What it draws |
|---|---|
| `{ "shape": "triangle" }` | a 2D shape from `education/shapes.json` (optional `filled`, `rotate` in degrees) |
| `{ "preset": "doopi", "pose": "wave", "face": "happy" }` | a character preset, posed (any catalog pose; default `stand`), facing right unless `facing: -1` |
| `{ "prop": "ball" }` | a v1 prop |
| `{ "object": "house" }` | a catalog object (its default state) |

Every preset, prop and object must be **print-approved** (section 8.3). Art is always drawn as line art on student pages.

## 5. Activities (version 1)

The activity names are engine-owned (they are behaviors), described in `catalog/docs/workbook_activities.json` like the world commands (W5, with the pack). Each activity is one module in `engine/workbook/activities/` with its schema params, the art references it uses (`artPaths`), its grade limits (`limits`) and a pure generator `generate(block, box, env) → { items, answers, issues }`, where `env` is `{ rules, grade, rng, catalog, ink, measure }`.

| Activity | Key params | What the child does | Answer key |
|---|---|---|---|
| `shape_lesson` | `shape` | sees one shape big with its corners dotted, its name and facts (sides, corners; square corners from grade 1, lines of symmetry in grade 2; the shape's note from K), three dashed copies to trace with a green start dot, and three things in real life that have the shape | none |
| `trace_shapes` | `shapes` (1-6), `rows` (default one per shape) | traces a row of dashed copies of each shape, fading across the row, the first with a green start dot | none |
| `trace_letters` | `text` (capitals, digits and spaces, up to 16; lowercase in W4), `rows` (default: as many as fit) | traces on handwriting lines (cap line, dashed midline, baseline): each row starts with a solid model with numbered green stroke starts and arrows, then dashed copies that fade, and leaves the last place empty to write alone when the row holds three or more; cap height is the grade's smallest item (K 54 pt) | none |
| `colour_page` | `art` (1-4 art refs), `ground` | colours a large line-art picture | none |
| `colour_by_shape` | `picture` (a shape picture), `key` {shape: colour} (default: one crayon colour per shape, in order, never black) | colours each shape by the key below the picture (a small shape, "=", the colour word in an outlined crayon) | the coloured picture and crayons |
| `find_shapes` | `target` (one shape), `count`, `distractors` (1-5 other shapes), `others` (default count + 2), `askCount` (default true) | colours or circles every target among scattered shapes (no turning at pre-K and K; quarter turns from grade 1), writes how many | targets circled in red, the count |
| `count` | `item` (art ref), `groups` (1-6 numbers) | counts each group and writes the number in a box | the numbers |
| `match` | `pairs` (2-6): `[left, right]`, each an art reference or `{ "text" }` | draws a line from each dot on the left to its partner; the right column is shuffled so no item stays in its row | the lines |
| `maze` | `size` [cols, rows] (default the grade's largest), `start`, `end` (art refs, optional) | draws a path from the entrance (left) to the exit (right) | the path |
| `dot_to_dot` | `subject`: `{ "shape" }` (dots resampled from its outline: `points`, default its corners and at least 8) or `{ "picture" }` (a dot picture, `education/dot_pictures.json`, with details drawn as lines) | joins numbered dots from the green dot 1 | the outline |
| `word_search` | `words` (3-12, letters only), `size` (default the grade's grid) | finds the hidden words (right and down; grade 2 adds both diagonals) and ticks them off the list beside or below the grid | a red band over each word |
| `pattern` | `sequence` (2-3 art refs), `repeat` (AB, AAB, ABB, ABC; default AB, or ABC with three), `length` (4-10, default 8), `blanks` (1-3 at the end, default 2) | draws what comes next in the dashed boxes | the missing pictures |
| `draw_prompt` | `prompt`, `starter` (optional art ref drawn half), `box` | draws in a framed box (for example "Draw a hat for Mooka") | none |

Generators are exact about what a child can do:
- **Mazes** are perfect mazes (one path, no loops) from a seeded depth-first carve; the entrance and exit are on opposite sides; the path length is at least 1.5 x the grid's longer side.
- **Find-the-shapes** places shapes by seeded rejection sampling with a clear gap (no overlaps or touching), random rotation and sizes within the grade's minimum size; targets and distractors are counted exactly.
- **Word searches** place words longest first in the allowed directions, retrying up to 200 seeded attempts per word; filler letters avoid spelling any blocklisted word (checked after filling). A word that does not fit is `E_WB_FIT`.
- **Dot-to-dot** samples a shape's outline (straight edges and curves made dense first) at even arc length, keeps every corner, and numbers clockwise from the topmost dot; dot pictures keep their authored order. Numbers sit outside the outline, away from its centre. More dots than the grade allows is `E_WB_GRADE`.
- **Counting** scatters items per group in its own box; no group is over the grade's count limit.

## 6. Print style and grade rules

Line art is what makes the pages printable and colourable:
- **Line-art context** (`renderer/line_art.js`): a wrapper around the 2D context that the existing character, prop, object and shape drawing runs through unchanged. Strokes become black; light fills become white; dark fills (luminance under 0.25, such as pupils and outlines drawn as fills) stay black; gradients and patterns become white; shadows, filters and alpha are dropped. So every catalog drawing prints as a colouring outline with no change to its code.
- **Tracing** strokes are grey (#888888) dashes `[6, 4]` pt, with a green start dot and a small arrow.
- **Answers** are drawn in a strong red (#d62828) on answer-key pages, with solution colours from `education/colours.json`.

| Rule | prek | k | 1 | 2 |
|---|---|---|---|---|
| Title / body type (pt) | 32 / 22 | 30 / 20 | 26 / 17 | 22 / 15 |
| Outline weight (pt) | 3.5 | 3 | 2.5 | 2 |
| Smallest drawn item | 1 in | 0.75 in | 0.6 in | 0.5 in |
| Blocks per page (max) | 1 | 2 | 4 | 6 |
| Instructions (characters, warning above) | 50 | 60 | 90 | 120 |
| Count limit (per group) | 5 | 10 | 20 | 20 |
| Maze size (max cells) | 5 x 5 | 7 x 7 | 10 x 10 | 14 x 14 |
| Dot-to-dot points (max) | 10 | 15 | 25 | 40 |
| Word search grid / directions | none | 6 x 6, right and down | 8 x 8, right and down | 10 x 10, adds diagonals |
| Letter case for tracing | upper | upper and lower | both | both |

Fonts: **Andika** (SIL OFL, `assets/fonts/Andika-*.ttf`) for all workbook text: a school print face with the single-storey "a" and "g" that children learn to write. Tracing letters do not use the font: they come from stroke letters in the catalog (section 8.2), so the dashes run down the middle of each stroke in the order a child writes it.

## 7. Determinism

- Each block draws from `deriveRng(script.seed, "<documentId>/<pageId>/<slot>/<activity>")`, so editing or reordering one page never changes another.
- Arrays are iterated in stable order; no `Math.random`, `Date.now` or `performance.now` (the existing test covers `engine/workbook/`).
- The display list is the unit of truth: tests compare display lists and answer data, plus a few golden PNG renders of pages (integration). PDF bytes are deterministic too (no creation date); `print.mjs` writes the script's hash into the PDF's `keywords` metadata.
- An answer key never re-runs a generator with another seed: answers come out of the same generator call as the student page.

## 8. Education catalog

A new folder, `catalog/education/`, built and checked by `npm run catalog:build` like every other file (descriptions and tags required, JSON Schemas in `catalog/schemas/`).

### 8.1 Shapes (`education/shapes.json`)

Each entry: `name`, `description`, `tags`, `grade` (the first grade it is taught in), `sides`, `corners` (vertices), `rightAngles`, `equalSides` (all, pairs, some, none), `curved`, `symmetry` (lines of symmetry, `-1` for infinite), `examples` (2-4 real things: "pizza slice"), and `geometry` (how to draw it in a unit box): `regular` {sides, rotate}, `polygon` {points}, `ellipse` {rx, ry}, `star` {points, inner}, or `paths` (the object path format, `renderer/paths.js`).

Starter set (22). Curved shapes such as the heart and crescent have points, not corners, and the lesson says so:

| Shape | Sides | Corners | Grade |
|---|---|---|---|
| circle | 0 | 0 | prek |
| oval | 0 | 0 | prek |
| triangle | 3 | 3 | prek |
| square | 4 | 4 | prek |
| rectangle | 4 | 4 | prek |
| star | 10 | 10 | prek |
| heart | curved | none (1 point) | prek |
| diamond (rhombus) | 4 | 4 | k |
| semicircle | 1 straight, 1 curved | 2 | k |
| hexagon | 6 | 6 | k |
| pentagon | 5 | 5 | k |
| octagon | 8 | 8 | k |
| crescent | curved | none (2 points) | k |
| right_triangle | 3 | 3 | 1 |
| trapezoid | 4 | 4 | 1 |
| parallelogram | 4 | 4 | 1 |
| kite | 4 | 4 | 1 |
| quarter_circle | 2 straight, 1 curved | 3 | 1 |
| arrow | 7 | 7 | 1 |
| cross | 12 | 12 | 2 |
| heptagon | 7 | 7 | 2 |
| ring | 0 (curved) | 0 | 2 |

Shape pictures for `colour_by_shape` (a house of squares and triangles, a rocket, a robot, a fish ...) live in `education/shape_pictures.json`: named lists of shapes with position, size and rotation in a unit box.

### 8.2 Letters, words and colours

- `education/letters.json`: stroke letters A-Z, a-z and 0-9 as centrelines in an em box (y 0 cap line, 0.5 midline and x-height, 1 baseline, descenders to 1.45), each stroke in writing order (ball-and-stick; strokes use the object path commands). The renderer is `renderer/letters_draw.js`; a dot whose stroke starts where an earlier one did moves along its own stroke so every number shows.
- `education/words.json`: word lists by topic (shapes, colours, animals, family, school, K and grade 1 sight words), each word with the first grade it suits and checked against `story/blocklist.json`; scripts may use other words, which the validator checks the same way.
- `education/dot_pictures.json`: dot-to-dot pictures (fish, sailboat, house, rocket, cat): dots in joining order in a unit box, plus details (eyes, waves) drawn as lines; the build checks each against its grade's dot limit.
- `education/colours.json`: the crayon colours used by keys (red, orange, yellow, green, blue, purple, brown, black, pink, grey) with their hex for answer keys.

### 8.3 Print approval (`education/line_art.json`)

Not every catalog drawing reads well as a black outline (the line-art wrapper turns a drawing made of filled shapes into many small outlines). One file lists what may appear in workbooks, after Sridhar reviews the W1 line-art contact sheet:

```json
{
  "presets": { "doopi": { "status": "ok", "poses": ["stand", "wave", "cheer"] } },
  "props": { "ball": { "status": "ok" } },
  "objects": { "house": { "status": "ok" }, "tree": { "status": "redraw" } }
}
```

`status` is `ok` or `redraw` (needs a line-art version first). An entry that is not listed is not approved, so a new catalog entry appears in workbooks only after review. The build fails on an unknown id or pose; the validator rejects art that is not `ok` (`E_WB_ART`); the context pack lists only `ok` entries.

## 9. Display list (engine to renderer)

A page is `{ width, height, items }`. Items, drawn in order, all in points:

| Item | Fields |
|---|---|
| `text` | `x, y, w, h, text, size, weight, align, valign, lines` (most lines; the renderer wraps and shrinks to fit), `colour` |
| `line` / `poly` | `points, width, dash, colour, closed, fill` |
| `rect` / `circle` | geometry, `width, dash, colour, fill` |
| `shape` | `name, x, y, size, rotate, style` (`outline`, `trace`, `filled`, `answer`) |
| `art` | `ref` (an art reference) and a box `x, y, w, h`, `align` (`bottom` stands it on the box's floor, `center`); the renderer measures the drawing (`renderer/bounds_ctx.js`) and fits it, always as line art |
| `group` | `items`, `tag` (`<document>/<page>/<slot>/<activity>`, the block's random stream name) |

Answer items have the same form with `answer: true`; student pages leave them out, answer-key pages (`answerKey: true`) draw both.

Activities that size pictures by their shape (colour pages) get `env.measure(ref)`: the art's natural bounds from the same bounds recorder, pure geometry with no canvas.

## 10. Validation

`validateWorkbook()` returns the same report as `validate()` (`ok`, `errors`, `warnings`, `stage`: schema, semantic or build): the schema checks (`E_SCHEMA_*` from the existing checker on `workbookSchema()`; an unknown activity is `E_SCHEMA_ENUM`), then these. Text uses the video checks too: `E_TEXT_BLOCKED` and `E_TEXT_GLYPH` (errors) and `W_TEXT_SOFT` (the kids list). A top-level `kind` other than `workbook` is `E_KIND`. Each code gets a meaning and a fix in `catalog/docs/codes.json`.

| Code | When |
|---|---|
| `E_WB_ID` | a duplicate document or page id |
| `E_WB_ANSWERS_FOR` | `answersFor` names an unknown or answer-key document |
| `E_WB_SLOT` | a slot outside the layout, or two blocks covering one slot (a span covers the rectangle between its two slots) |
| `E_WB_SHAPE` | an unknown shape (the fix lists the nearest names), a colour key shape the picture does not have, or a find-the-shapes target also listed as a distractor |
| `E_WB_PICTURE` | an unknown shape picture |
| `E_WB_COLOUR` | a colour that is not in `education/colours.json` |
| `E_WB_LETTER` | a character with no tracing letter |
| `E_WB_ART` | an unknown preset, pose, face, prop or object, a dog pose on a two-legged preset (or the reverse), or art that is not print-approved (checked once `education/line_art.json` exists, W2) |
| `E_WB_WORD` | a word search word that is not letters only, is blocklisted, or is longer than the grid |
| `E_WB_PATTERN` | a pattern whose repeat needs a different number of pictures |
| `E_WB_FIT` | a generator could not place everything (word search, find-the-shapes, counting) in its slot |
| `E_WB_GRADE` | a number over the grade limit (count, maze size, dot points) |
| `W_WB_TEXT` | instructions over the grade's length |
| `W_WB_DENSE` | more blocks on a page than the grade allows |
| `W_WB_REPEAT` | the same activity with the same params twice in a document |

Like `W_CONTRAST`, `E_WB_FIT` needs the generator, so the validator runs the generators (they are cheap: under 50 ms for a 32-page book).

## 11. Tools and the AI pipeline

- `tools/print.mjs <workbook.json> [--out-dir DIR] [--slug S] [--doc ID] [--size a4] [--png] [--sheet]`: validates, builds and writes `<out-dir>/<slug>/<slug>-<doc>.pdf` per document (default `out/workbooks/`); `--png` writes page previews at 150 dpi; `--sheet` writes a contact sheet of every page per document. The printing itself is `tools/lib/print_book.mjs` (`printWorkbook`), shared with the two commands below.
- `tools/lib/canvas.mjs`: `backend.createPdf(meta)` → `{ page(w, h) → ctx, end(), close() → Buffer }` for the napi backend only (skia-canvas, when installed, writes PDF differently; not wired). Andika Regular and Bold are registered as the family `Andika`.
- **One text for the model.** `tools/lib/workbook_tables.mjs` `workbookBody()` puts together the prose (`catalog/docs/workbook.md`: what a good workbook is, the "Before you answer, check" list), the script format, the activity table (`catalog/docs/workbook_activities.json`: one entry per engine activity, each with an example the build validates), the grade rules, the shapes, the names a model may use (shape and dot pictures, crayon colours, print-approved presets with their poses, objects, word lists), the workbook validator codes and one example workbook. Fight gear (props and objects tagged `fight` or `weapon`) stays printable but is not offered.
- **Prompts**: `prompts/workbook.md` (the writer role around that body) and `prompts/workbook_repair.md` (the issues to fix), built by `tools/lib/workbook_prompts.mjs`.
- **Context pack**: `09_workbooks.md` is the same body (tier `workbook`, budget 16.5 KB, outside the 100 KB video pack); `00_start_here.md` and `project_instructions.md` point to it for workbook tasks.
- **Copy-paste**: `node tools/manual.mjs workbook-prompt --topic "..." [--grade prek|k|1|2] [--pages 10] [--cast doopi,mooka] [--size letter|a4] [--copy]` writes `out/manual/workbook_prompt.md`; `manual.mjs check-workbook <reply | --paste> [--print]` validates the reply, saves `out/workbooks/scripts/<slug>.json` and prints it, or writes `workbook_fix_prompt.md` for the same chat.
- **Automatic**: `node tools/generate.mjs --workbook --topic "..." [--grade k] [--pages N] [--cast ...] [--count N]` (`--mock` offline; `--print-prompt` shows the system prompt) writes, repairs (up to `maxAttempts`), saves, prints and adds the review queue entry. Local models are never used (project rule).
- **Examples**: `catalog/examples/workbooks/` (outside `examples/index.json`); the build validates each; the first one is the example in the prompt and the pack.

## 12. Milestones

Each milestone ends with green tests, docs updated in the same change, and a demo in `out/demos/` for Sridhar's review.

| # | Milestone | Done when | Review |
|---|---|---|---|
| W0 | This spec, Andika fonts, ADR-040 | signed off | spec sign-off |
| W1 | `kind` dispatch, workbook schema and validator (structure, ids, slots, art), layout and display list, `page_draw.js`, `line_art.js`, PDF in `canvas.mjs`, `tools/print.mjs`, `tools/line_art_sheet.mjs`; the first activities (colour_page, count, draw_prompt) to exercise them, with answer keys | a 2-document PDF with headers, slots and art; `out/demos/w1_line_art.pdf` shows every preset (3 poses), prop and object as line art | pick what is print-approved (fills `line_art.json`) |
| W2 | Education catalog: shapes, shape pictures, colours, line-art approvals; schemas, build checks (facts against drawings), showcase tab; `shapes_draw.js`; the shape_lesson activity | `npm run catalog:build` green; `out/demos/w2_shapes/` (one lesson page per shape) and `out/demos/w2_shape_sheet.pdf` (every shape with its facts, every shape picture) | shape drawings and facts |
| W3 | Activities 1: trace_shapes, trace_letters (uppercase, digits), colour_by_shape, find_shapes | `out/demos/w3_workbook/` student book and answer key | page look at K |
| W4 | Activities 2: maze, dot_to_dot, word_search, match, pattern; lowercase letters; `W_WB_*` checks | a 24-page K workbook and answer key, every activity at least twice | puzzles at each grade |
| W5 | AI: prompts, `09_workbooks.md`, manual and generate commands, mock replies, examples in `catalog/examples/workbooks/` | a workbook written through the copy-paste flow, validated and printed | 3 AI-written workbooks |

Later (not scheduled): grades 3-5 (multiplication grids, fractions with shapes, longer word searches), a companion colouring book from a video script (`print.mjs --from-story`), booklet imposition, stickers and certificates, more languages.

## 13. Open questions

1. Does Sridhar want a cover in colour (the characters in their colours) while inner pages stay black and white? The spec allows it (`cover.colour: true`) but defaults to line art.
2. Should the student book and the answer key be one PDF with the key at the back (many activity books do this) instead of two PDFs? Two documents is the default; `answersFor` with `"append": true` could put the key at the end of the student PDF.
