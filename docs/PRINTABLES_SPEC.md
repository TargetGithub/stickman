# Printables: the workbook set for KidsLearningPlatform

Status: 0.1 (2026-10-28). Built and generated; waiting for Sridhar's review. Owner: Sridhar. Builds on [WORKBOOK_SPEC.md](WORKBOOK_SPEC.md) (v0.3, W6: the `kind: "workbook"` pipeline, activities, grade rules and the education catalog) and `catalog/education/skills.json` (the skills map).

## 1. Goal and scope

KidsLearningPlatform (a separate Vite web app, `/Users/a81133017/SRIDHAR/PROJECT/KidsLearningPlatform`) gets a **Printables** page laid out like a search engine's home page: one search box, the top materials under it, and a "Show everything" button that lists every category and item. The page fetches one manifest, searches it in the browser and lazy-loads thumbnails and PDFs.

This spec defines what this repo hands that page:
- **the set**: about 300 standalone printables, pre-K to grade 5, every subject, 1-4 pages each, plus an answer key wherever the pages have answers (section 4);
- **the taxonomy** for browsing and search: category (subject), strand, grade, skills, type, tags and keywords (section 2);
- **files**: the PDFs, a WebP thumbnail of page 1 per item, and one `manifest.json` (sections 5-7);
- **the tool**: `tools/printables.mjs` builds the whole set and the manifest deterministically (section 8).

Not in scope: the site's UI and routing (built in the KidsLearningPlatform session), user accounts, analytics-driven popularity (section 7.3 leaves room for it), languages other than English, and A4 (the set is US Letter; `print.mjs --size a4` stays available for one-off books).

All content is original: the pages come from the engine's generators and the education catalog (original questions, passages, word lists and prompts), drawn with the catalog's own characters as line art.

## 2. Taxonomy

### 2.1 Category (subject) and strand

`category` is the subject a parent or teacher browses by. Each holds one or more `strand`s, the ten strands of the skills map plus `art`:

| Category id | Label | Strands (skills map, WORKBOOK_SPEC 8.6) |
|---|---|---|
| `math` | Math | `numbers` (counting, addition, subtraction), `operations` (place value, multiplication, division, fractions, decimals), `measure_shapes` (time, money, measurement, shapes, geometry) |
| `phonics` | Phonics & Sight Words | `phonics` (letters, sounds, word families, vowels, blends), `sight_words` (sight words, spelling lists) |
| `reading` | Reading | `reading` (listening, stories, nonfiction, comprehension) |
| `writing` | Writing & Handwriting | `handwriting` (pre-writing, copying, sentences, paragraphs, essays) |
| `grammar` | Grammar & Vocabulary | `grammar` (parts of speech, sentences, word meanings, figurative language; topic vocabulary) |
| `science` | Science & Social Studies | `science_social` (living things, weather, matter, space, maps, communities, economics) |
| `logic` | Logic & Puzzles | `logic` (patterns, mazes, dot-to-dot, riddles, analogies, deduction) |
| `art` | Colouring & Drawing | `art` (colouring pages, colour by shape, drawing prompts) |

The strand labels in the manifest come from `skills.json` (`strands.<id>.label`), so the two never disagree.

### 2.2 Grade

`grade` is one of `prek`, `k`, `1` ... `5` (labels Pre-K, Kindergarten, Grade 1 ... Grade 5): the grade the item is written for, which sets its type sizes, line weights and difficulty (WORKBOOK_SPEC 6). Each item has one grade. In ids and folder names a digit grade is written `g1` ... `g5`.

### 2.3 Skills

`skills` lists skill ids from `education/skills.json` the item practises (for example `rhyming_k`, `times_tables_3`). Every one of the 133 skills is practised by at least one item; packs that span skills list all of them (a letter pack lists `capital_letters_prek` and `lowercase_letters_k`). Items with no matching skill (colouring pages, topic word searches outside the map) have an empty list.

### 2.4 Type

`types` is what the child does on the page, from the engine activities used:

| Type | Activities |
|---|---|
| `worksheet` | `math_facts`, `number_line`, `place_value`, `clock`, `coins`, `fractions`, `count` |
| `quiz` | `choose` (multiple choice) |
| `reading` | `read_passage` |
| `writing` | `write_lines` |
| `tracing` | `trace_letters`, `trace_shapes` |
| `lesson` | `shape_lesson` |
| `word-search` | `word_search` |
| `maze` | `maze` |
| `dot-to-dot` | `dot_to_dot` |
| `puzzle` | `find_shapes`, `match`, `pattern` |
| `colouring` | `colour_page`, `colour_by_shape` |
| `drawing` | `draw_prompt` |

An item has one or more types (a shape pack is `lesson`, `tracing` and `puzzle`).

### 2.5 Tags and keywords

- `tags`: a controlled list of lowercase kebab-case topic words from the catalog (the skill's tags, the question set's or word list's tags) plus the pack's own (`letters`, `alphabet`, `mazes`, `fine-motor` ...). Good for chips and filters.
- `keywords`: one free-text string of extra search words that do not belong in tags: the words hidden in a word search, a shape's real-life examples, a passage title, a letter ("letter A"), US spellings and synonyms ("coloring page", "connect the dots", "labyrinth").

Search should match the query against `title`, `description`, `tags`, `keywords`, the category and strand labels, and the grade label.

## 3. Item rules

- **Standalone.** One item is one printable a parent prints on its own: 1-4 student pages, no cover, a "Name:" line and a page number on each page.
- **Answer key.** A second PDF with one page per student page that has answers (the student page with the answers in red, WORKBOOK_SPEC 4.2). Colouring, tracing, drawing, writing and lesson pages have none; an item whose pages all lack answers has no key.
- **Valid.** Every item is a workbook script that validates with **no errors and no warnings**; the tool refuses to write anything otherwise and a unit test checks the whole set.
- **Page heading.** Each page has a title (the item's title or a page title such as "Trace the Hexagon") and one short instruction read aloud by a grown-up, within the grade's length (pre-K 50 characters).
- **Black and white.** Student pages print on a home printer; answer keys may use colour.
- **Deterministic.** Each item's seed is a hash of its id (FNV-1a), so the same catalog and engine give byte-identical PDFs and thumbnails. One item (`g3-money-dollars`) salts its seed because the `coins` generator can draw a total it cannot make in nine pieces (a known gap, section 10).

## 4. The set

The set is built in `tools/lib/printables_set.mjs` from the education catalog, in this order:

| Kind | Source | Pages | Key | Grades | Items |
|---|---|---|---|---|---|
| Skill sheets | one per skill in `skills.json` (its `example` block), except skills a pack below covers (shape lessons, mazes, dot-to-dot) | 1-3: the example, plus a second page of new practice where the activity can make one (new problems, the other clock or fraction task, the other math form, the rest of the question set; patterns get AAB and ABB) | where answers | pre-K-5 | 127 |
| Shape packs | every shape in `shapes.json`, at its grade | 3: lesson, trace, find the shape | yes (find) | pre-K-4 | 25 |
| Letter packs | A-Z | 2: capital, lowercase (stroke starts and arrows) | no | K | 26 |
| Number packs | 0-9 | 1-2: trace the digit, count groups of it | yes (count) | pre-K-K | 10 |
| Topic word searches | each word list in `words.json` not already used by a skill sheet; words at or below the grade, sized to the grade's grid | 1 | yes | K-5 | 35 |
| Maze packs | two per grade, four mazes growing to the grade's largest, cast start and object goal | 4 | yes | pre-K-5 | 14 |
| Dot-to-dot | the five dot pictures; a shape pack per grade 1-5 with dots up to the grade's limit | 1 or 4 | yes | K-5 | 10 |
| Colour by shape | the five shape pictures | 1 | yes (the coloured picture) | K | 5 |
| Colouring pages | twelve friendly cast members with an object (no fight gear), plus a drawing page | 2 | no | pre-K-K | 12 |
| Patterns and matching | "What Comes Next?" (pre-K, K, 1); "Match the Shape Names" (K, 1, 2) | 1-4 | yes | pre-K-2 | 6 |
| Leftover sources | math templates, question sets and passages no skill sheet uses | 1-2 | yes | K-5 | 15 |
| Writing sheets | original model sentences and prompts, two sheets per grade | 2 | no | K-5 | 12 |
| Draw and write | original drawing prompts with lines to write about the picture, two per grade | 1 | no | 1-5 | 10 |

Generated counts (307 items, 554 student pages, 236 answer keys with 374 pages):

| Category | Pre-K | K | 1 | 2 | 3 | 4 | 5 | Total |
|---|---|---|---|---|---|---|---|---|
| Math | 16 | 18 | 17 | 15 | 19 | 13 | 10 | 108 |
| Phonics & Sight Words | 3 | 39 | 6 | 7 | 3 | 2 | 2 | 62 |
| Reading | 1 | 2 | 2 | 2 | 2 | 2 | 2 | 13 |
| Writing & Handwriting | 1 | 3 | 3 | 3 | 3 | 3 | 3 | 19 |
| Grammar & Vocabulary | 0 | 4 | 5 | 2 | 2 | 2 | 1 | 16 |
| Science & Social Studies | 1 | 2 | 4 | 7 | 6 | 4 | 4 | 28 |
| Logic & Puzzles | 4 | 9 | 5 | 4 | 4 | 4 | 4 | 34 |
| Colouring & Drawing | 6 | 11 | 2 | 2 | 2 | 2 | 2 | 27 |
| **Total** | **32** | **88** | **44** | **42** | **41** | **32** | **28** | **307** |

Every category has items at every grade except pre-K grammar: the skills map has no pre-K grammar or operations, and pre-K children are not yet reading. Breadth follows the education catalog; growing it means adding catalog entries (skills, question sets, passages, word lists), after which the set picks them up with no code change.

## 5. Naming and folder layout

The set lives in one folder, served as static files. For KidsLearningPlatform that is **`public/assets/printables/`** (Vite copies `public/` to the site root, so the URL is `/assets/printables/...`).

```
printables/
  manifest.json
  math/      g3-times-tables.pdf, g3-times-tables-answers.pdf, ...
  phonics/   k-letter-a.pdf, ...
  reading/  writing/  grammar/  science/  logic/  art/
  thumbs/    g3-times-tables.webp, k-letter-a.webp, ...
```

- **Item id**: `<grade>-<slug>`, lowercase kebab-case, unique: `prek-shape-circle`, `k-letter-a`, `g1-word-search-weather`, `g4-mazes-2`. The grade is `prek`, `k` or `g1`-`g5`. Ids are stable: an item keeps its id across rebuilds, so links and bookmarks hold.
- **Student PDF**: `<category>/<id>.pdf`. **Answer key**: `<category>/<id>-answers.pdf`. **Thumbnail**: `thumbs/<id>.webp`.
- Paths in the manifest are relative to the manifest, so the folder can move (CDN, another path) without a rebuild.
- The folder holds nothing else: the tool removes PDFs and thumbnails of items that left the set, so the folder always matches the manifest.

## 6. Thumbnails

- Page 1 of the student PDF, on white, **240 x 311 px WebP** (quality 72), about 4 KB each. 240 px suits a results grid card at up to 120 CSS px on 2x screens or 240 px on 1x; `--thumb-width` changes it.
- The manifest gives `thumbW` and `thumbH` so the page can reserve the space before the image loads (no layout shift) and use `loading="lazy"`.

## 7. Manifest (`manifest.json`, schema 1)

One minified JSON file (183 KB, 29 KB gzipped), fetched once and searched on the client.

### 7.1 Top level

| Field | Type | Notes |
|---|---|---|
| `schema` | integer | `1`; a change of meaning bumps it |
| `version` | string | 8 hex digits, a hash of every item's id and file hash: changes whenever any file changes. Use it to cache-bust (`manifest.json?v=` is not needed; use it for item URLs or a service worker cache name) |
| `generator` | string | `StickMan tools/printables.mjs` |
| `count` | integer | number of items |
| `totalBytes` | integer | all PDFs (student and keys) |
| `grades` | list | `{ id, label, count }` in grade order |
| `categories` | list | `{ id, label, count, strands: [{ id, label, count }] }` in display order (section 2.1) |
| `types` | list | `{ id, label, count }` (section 2.4) |
| `items` | list | sorted by `rank` (section 7.2) |

### 7.2 Item

| Field | Type | Notes |
|---|---|---|
| `id` | string | section 5 |
| `title` | string | up to 40 characters |
| `description` | string | one or two sentences for the result card |
| `category` | string | a category id |
| `strand` | string | a strand id inside the category |
| `grade` | string | `prek`, `k`, `1` ... `5` |
| `skills` | string[] | skill ids (may be empty) |
| `types` | string[] | section 2.4 |
| `tags` | string[] | section 2.5 |
| `keywords` | string | free text, space-separated |
| `pages` | integer | student pages (1-4) |
| `pdf` | string | relative path |
| `pdfBytes` | integer | file size |
| `answerKey` | string or null | relative path, null when the item has no key |
| `answerKeyPages` | integer | 0 when no key |
| `answerKeyBytes` | integer | 0 when no key |
| `thumb` | string | relative path |
| `thumbW`, `thumbH` | integer | pixels |
| `rank` | integer | 1 = top; a total order over all items (7.3) |
| `featured` | boolean | true for the hand-picked top materials (24) |
| `version` | integer | starts at 1, +1 each time this item's files change |
| `hash` | string | 12 hex digits of SHA-256 over the item's PDF, key and thumbnail |

Example:

```json
{
  "id": "k-letter-a", "title": "Letter Aa",
  "description": "Trace and write the capital A and the lowercase a, with stroke order shown.",
  "category": "phonics", "strand": "phonics", "grade": "k",
  "skills": ["capital_letters_prek", "lowercase_letters_k"], "types": ["tracing"],
  "tags": ["letters", "alphabet", "handwriting", "uppercase", "lowercase"], "keywords": "letter A letter a abc",
  "pages": 2, "pdf": "phonics/k-letter-a.pdf", "pdfBytes": 334150,
  "answerKey": null, "answerKeyPages": 0, "answerKeyBytes": 0,
  "thumb": "thumbs/k-letter-a.webp", "thumbW": 240, "thumbH": 311,
  "rank": 1, "featured": true, "version": 1, "hash": "a7199206b737"
}
```

### 7.3 Rank and featured

There is no usage data yet, so the rank is editorial and deterministic:
1. the `FEATURED` list in `printables_set.mjs` (24 ids spanning grades and subjects), in its order, `featured: true`;
2. then the categories taken in turn (math, phonics, reading, writing, grammar, science, logic, art, math ...), each category's items ordered by how often families look for that type (tracing, mazes, colouring, dot-to-dot, worksheets, word searches, lessons, reading, puzzles, quizzes, writing, drawing), then grade, then id. Any slice of the ranking mixes subjects.

"Top materials" on the page are the featured items (or the first N by rank, filtered by a chosen grade). When the site collects downloads it can re-rank on its side; the manifest's `rank` stays the fallback.

### 7.4 Versions and updates

- An item's `version` is compared with the previous `manifest.json` in the output folder: same `hash`, same version; different, version + 1; new item, 1. So rebuilding with no change leaves every version (and the top-level `version`) as it was.
- Item URLs never change; append `?v=<version>` to a PDF or thumbnail URL so a browser cache never serves an old file.

## 8. The tool

```
node tools/printables.mjs --out-dir ../KidsLearningPlatform/public/assets/printables
```

| Option | Notes |
|---|---|
| `--out-dir DIR` | the set's folder (default `out/printables`) |
| `--only PREFIX` | build only items whose id starts with PREFIX (repeatable, for checking a few); does not write the manifest or remove files |
| `--check` | validate every item and stop |
| `--thumb-width N`, `--quality N` | thumbnail width (240) and WebP quality (72) |

It validates every item first (any error or warning stops it before writing), then for each item builds the workbook (`buildWorkbook`), draws each document into a vector PDF (`backend.createPdf`, @napi-rs/canvas, no creation date) and page 1 into a thumbnail, and finally writes the manifest with `buildManifest()` (`tools/lib/printables_manifest.mjs`, pure, unit-tested in `tests/unit/printables.test.js`). The whole set takes about 5 seconds.

Sizes (307 items): PDFs 25.6 MB (student and keys), thumbnails 1.2 MB, manifest 183 KB; 27 MB in all. The largest files are the letter-tracing packs (300-430 KB, long content streams from the faded, dashed tracing letters). Most worksheets are 15-40 KB.

## 9. Using the set on the site (notes for the KidsLearningPlatform session)

- Fetch `/assets/printables/manifest.json` once; build a small in-memory index (lowercased `title`, `description`, `tags`, `keywords`, labels).
- Home view: the search box, then featured items as cards (thumbnail, title, grade label, category label). "Show everything" groups `items` by `categories` (and strand), each group sorted by `rank`.
- Filters: grade, category, type; counts come ready in the manifest.
- Cards: `<img loading="lazy" width=thumbW height=thumbH>`; open or download `pdf`, and `answerKey` when present.
- The files are static: no server code needed.

## 10. Known gaps and follow-ups

- `coins` can draw a total it cannot make in nine pieces (for example $4.59 at grade 3); the validator catches it and the set salts one seed. The generator should redraw instead (engine follow-up).
- Letter-tracing PDFs are the largest (up to 430 KB; their page content streams are 0.5-0.8 MB before compression). Worth profiling the tracing renderer's PDF output (dashes and fades) to shrink them.
- Pre-K has no grammar items (none in the skills map).
- A4 copies, a colour cover option and analytics-based ranking are not done.
