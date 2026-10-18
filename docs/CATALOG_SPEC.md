# Catalog Specification: one folder for the engine, the showcase page and AI tools

Version 0.3 (decisions in section 13 made by Sridhar, 2026-10-18). **Status:** C1-C3 committed; C4 and C5 built, waiting for review (notes in section 13.1). Owner: Sridhar. Related: [STORY_SPEC.md](STORY_SPEC.md), [ARCHITECTURE.md](ARCHITECTURE.md) (ADR-006 catalog injection), [USER_GUIDE.md](USER_GUIDE.md) section 7.

## 1. Goal

Everything the engine can show lives in one folder, `catalog/`. Three consumers read it:
- **The engine**, through the injected catalog object (`createEngine({ catalog })`).
- **The showcase web page**, which shows what is available: characters, faces, moves, effects, places, objects, activities, macros, music moods and examples.
- **AI tools** such as Claude Desktop (Projects), ChatGPT or any chat app. They get small, ready-made context files instead of reading the codebase or pasting 30,000-character prompts.

Adding a character look, a move, a theme, an object or an effect means editing `catalog/` and nothing else. The engine, the page and the AI context all pick it up.

## 2. Problem today

| Today | Effect |
|---|---|
| Authored data lives in `data/*.js` as JS modules with helper functions (`sword(...)`, `pose(...)`, `...STAND`) | Readable for the engine, opaque for AI tools and the web page; no descriptions or tags |
| Prompt tables are generated at prompt time (`tools/lib/prompt_tables.mjs`, `story_tables.mjs`) and embedded in every prompt | The copy-paste prompts are large: clip writer about 32,000 characters, story scene about 30,000, outline about 9,500. Each scene of a story pastes the same tables again. |
| Engine vocabularies (schema enums, world commands, macro params, validator codes, camera modes) live in engine code | They are correct, but not visible to users or AI tools without reading the code |
| `web/catalog.html` shows moves only | There is no showcase for characters, faces, places, objects, effects, activities, macros or moods |
| Examples sit in `prompts/examples/` and `scripts/samples/` | They are not indexed or described |

Size today: 147 moves, 102 poses, 33 FX, 44 SFX keys, 12 themes, 27 objects, 6 props, 16 faces, 6 body plans, 9 activities, 11 moods, 14 macros. The whole catalog serializes to about 127 KB of JSON, of which the moves' keyframes are about 80 KB.

## 3. Principles

1. **One source.** `catalog/` is the only place catalog content is authored. Everything else is code that reads it, or files generated from it.
2. **Two kinds of files, clearly marked:**
   - **authored** files, which people (or drafting tools) edit;
   - **generated** files, built by `npm run catalog:build`, which are never edited by hand. They start with a "generated, do not edit" header and live under `catalog/generated/`.
3. **Engine-owned vocabularies stay in engine code**: the schema, world commands, macro params, validator codes, camera modes and defeat rules, because the validator enforces them. The build exports them into `catalog/generated/engine_vocab.json`. Their human descriptions are authored in `catalog/docs/`, and a test fails when an engine name has no description, or a description names something the engine does not have.
4. **Every entry has a description**: one plain sentence for people and AI tools, plus tags. A missing description is a test failure.
5. **Deterministic and bit-identical.** Moving data into `catalog/` must not change any simulation, golden frame or determinism hash. The migration is checked by deep-equality against the old `data/` catalog before `data/` is retired.
6. **Engine rules unchanged**: `/engine` never imports `catalog/` (the catalog stays injected), with no I/O, no globals and no `Math.random`.
7. **JSON first.** Authored files are JSON wherever the content is plain data, which is nearly all of it. JS is allowed only where JSON cannot express the data, and must then export plain data. There are no functions in catalog data.

## 4. Folder layout

```
catalog/
  README.md                    how to add things (section 9), file map, the authored/generated rule
  manifest.json                schema version, list of authored files, counts (written by the build)
  index.js                     loadCatalog(read) → the engine catalog object (Node and browser; section 5)

  characters/
    bodies.json                body plans: dims, draw style, torsoWidth, posture, default appearance, avoid list
    appearance.json            eyes, brows, mouthStyle, hair, outfit, accessories, conflicts
    faces.json                 16 faces: eye/brow/mouth shapes
    voices.json                timbres, plus descriptions (the ranges are in generated/engine_vocab.json)
    roles.json                 the closed list of preset roles
    presets/                   NEW: ready-made characters, one JSON file per preset (section 4.1); not
                               required by the engine

  moves/
    poses.json                 named poses (102)
    <category>.json            one file per category: movement, unarmed, armed, defensive, reactions,
                               emotes, utility, life, interactions, defeat (keys, root, hits, events, flags, pair)

  effects/
    fx.json                    FX presets (particles, trails, internal impact words marked internal)
    sfx.json                   SFX keys, plus a description and the category of each sound

  world/
    themes.json                themes: sky, layers, ground, characterBg
    objects.json               objects: behavior, shape, colors, states, slots, hold data
    props.json                 v1 props
    ambience.json              ambience beds (names, descriptions; the recipes stay in tools/)

  story/
    activities.json            activities (players, roles, objects, endings)
    music_moods.json           moods and scales
    macro_lines.json           the compiler's built-in lines
    blocklist.json             blocked and soft-listed words (with alternatives)

  docs/                        descriptions of engine-owned vocabularies (authored)
    world_commands.json        each world command: description, example beat
    macros.json                each macro: description, defaults, what it expands to, an example
    camera.json                camera modes and shot beats
    transitions.json           transitions and cards
    codes.json                 every validator code: meaning and typical fix (replaces CODE_HELP)
    format.md                  the script format (v1 clip and v2 story) in short, with the four `at` forms
    start.md, rules.md         the pack's prose: what the engine does, the key rules and the checklist
    project_instructions.md    the project instructions for chat apps (the build adds the version)

  schemas/                     JSON Schemas for the authored files (hand-written)

  examples/
    clips/*.json               v1 example scripts (today prompts/examples/*.json)
    stories/*.json             story examples with their outlines (today prompts/examples/stories/)
    index.json                 title, kind, length, what each example shows, features used

  generated/                   built by `npm run catalog:build`; never edited (section 6)
    engine_vocab.json          enums, world command params, macro params and anchors, limits, codes
    catalog.json               the full catalog as one file (for the web page and tools)
    context/                   the AI context pack (section 7)
```

### 4.1 Character presets (scalable)

A preset is a ready-made cast entry that an author or AI tool can use as it is or adapt. Presets scale by being data, one file each, with no fixed list:
- **Files:** `catalog/characters/presets/<id>.json`, each a valid v2 cast entry plus metadata: `{ "id", "name", "description", "role", "tags": [...], "audience": ["kids", "general"], "cast": { body, color, appearance, voice, style, prop, hp } }`. Adding a preset means adding one file. The build validates each one with the engine's own cast checks (body, appearance, voice) and adds it to the generated index.
- **Roles** are a closed list in `catalog/characters/roles.json` (hero, sidekick, friend, family, mentor, villain, henchman, rival, guard, crowd, animal-like), so the showcase and AI tools can group and search them. New roles are added there.
- **Contrast is checked:** the build records, for each preset, the themes it is easy to see on (W_CONTRAST rules). The showcase and the context pack list those themes, so a model can pick suitable places.
- **Starter set (C2):** 12 presets covering the roles and all six body plans:
  - from the stories: Kai (hero, stickman), Pip (sidekick, buddy), Vex (villain, slim), a guard (bulky);
  - new: a kid friend, an elder mentor, a rival fighter with a staff, a big bruiser, a friendly shopkeeper (kid or elder), a sneaky henchman (slim), and two crowd types for extras.
- **Growth:** the copy-paste and automatic pipelines may save a story's cast as presets on request (`node tools/manual.mjs save-presets <story.json>`). They are reviewed like any catalog change, never added automatically.
- **Context pack:** presets appear as one compact table (id, role, body, colors, look, good themes). The full JSON stays in the catalog: the model only needs the id to say "use preset kai" and copy the fields from the table.

Notes:
- **Descriptions and tags** sit next to the data they describe: `{ "name": "hug", "description": "Two characters hug; a short buddy hugs a tall friend round the waist.", "tags": ["paired", "kind"], ... }`. The engine ignores fields it does not use.
- **Media for the showcase** (rendered thumbnails, sound and music clips) is generated into `out/catalog_media/`, not committed. The page renders live where it can (section 8).
- `data/` is retired after the migration. `data/index.js` stays one release as a re-export of `catalog/index.js`, so old imports keep working, then it is deleted.
- `prompts/*.md` stay where they are (they are instructions, not catalog). Their catalog tables are replaced by references to the context pack (section 7.3).

## 5. Loading the catalog

`catalog/index.js` exports `loadCatalog(read)`, where `read(relativePath)` returns parsed JSON:

- **Node** (tools, tests): `loadCatalogSync()` reads with `fs`. A ready-made `catalog` export keeps today's `import { catalog } from "../data/index.js"` pattern working as `import { catalog } from "../catalog/index.js"`.
- **Browser** (player, editor, showcase): `await loadCatalog((p) => fetch("../catalog/" + p).then((r) => r.json()))`, or one fetch of `generated/catalog.json`.
- The loader assembles exactly today's catalog object shape: `poses`, `moves`, `props`, `fxPresets`, `fxNames`, `themes`, `themeNames`, `sfxKeys`, `blocklist`, `softWords`, `objects`, `faces`, `faceNames`, `bodies`, `bodyNames`, `appearance`, `activities`, `activityNames`, `macroLines`, `musicMoods` and `scales`. Description and tag fields pass through untouched.
- The loader does no I/O itself (`read` is injected), so it can also run inside tests with fixture folders.

## 6. The build: `npm run catalog:build`

`tools/catalog_build.mjs`:
1. Loads `catalog/` and validates it:
   - every authored file against its JSON Schema (`catalog/schemas/*.schema.json`, generated or hand-written);
   - names are unique;
   - every entry has a description;
   - references resolve: moves → poses, objects → shapes, activities → moves and objects, bodies → avoid moves, presets → bodies and appearance options.
2. Runs the engine's own data checks (the move checks used by the draft tool, every move on every body plan without NaN), so a bad entry fails here and not in a video.
3. Writes `generated/engine_vocab.json` from the engine modules (V2_ENUMS, WORLD_COMMANDS_V2, MACRO_PARAMS, MACRO_ANCHORS, LIMITS, codes).
4. Writes `generated/catalog.json` and `manifest.json`.
5. Writes the AI context pack (section 7).

A test (`tests/unit/catalog.test.js`) runs the build in memory and fails when a committed generated file differs ("run npm run catalog:build"). That keeps the generated files from going stale.

The existing tools change to read the catalog:
- `tools/lib/prompt_tables.mjs` and `story_tables.mjs` render from `catalog/` (descriptions included).
- `CODE_HELP` moves to `catalog/docs/codes.json`.
- `tools/draft.mjs` writes new moves, objects and themes into `catalog/` files.
- `tools/catalog.mjs` prints from `catalog/`.

## 7. The AI context pack (`catalog/generated/context/`)

### 7.1 Files

Each file is Markdown with compact tables. A model reads them as project knowledge; a person can read them too.

| File | Contents | Budget |
|---|---|---|
| `00_start_here.md` | What the engine does, how the files fit together, the two-stage workflow, and what to return (one JSON object) | 3 KB |
| `01_script_format.md` | v1 clip format and v2 story format (cast, locations, scenes, beats, macro beats, the four `at` forms), with one minimal example of each | 8 KB |
| `02_characters.md` | Body plans (height, look), appearance options and conflicts, faces, voices, character presets, contrast guidance | 6 KB |
| `03_moves.md` | Every move: category, seconds, params, needsProp, anchors, notes (paired, loop, defeat), one description line. No keyframes. | 18 KB |
| `04_effects_and_sound.md` | Beat FX, world FX commands, SFX keys (automatic), impact words | 4 KB |
| `05_places_and_objects.md` | Themes (background, good character colors), time, weather, ambience, objects (behavior, states), props, set pieces, extras | 6 KB |
| `06_story_tools.md` | Macros (params, defaults, anchors, what you get, an example each), activities, defeat styles, music moods, camera shots, transitions and cards, audience rules | 12 KB |
| `07_rules_and_codes.md` | Validation rules, every validator code with its fix, limits, the "before you answer" checklist | 9 KB |
| `08_examples.md` | One clip, one story scene of each kind (play, talk, fight, defeat, journey), one outline | 12 KB |

The whole pack stays under about 80 KB (about 20,000 tokens), and the build reports each file's size. A test fails when a file exceeds its budget by more than 25%, so the pack stays cheap to attach.

**Format decision: Markdown only (no JSON copy in the pack).** The aim is the most knowledge for the fewest tokens:
- **Tables over JSON.** A Markdown table states each column name once; JSON repeats every key on every row (about 2-3 times the tokens for the move list). Models read both equally well.
- **Defaults omitted.** A row shows only what differs from the documented default (for example, a move's params only when it has any; "loops" only for loop moves).
- **No duplication across files.** Each fact lives in one file; other files point to it ("see 03_moves.md"). Only the checklist in `07_rules_and_codes.md` repeats the most common rules on purpose.
- **Short names, not keyframes.** Moves are listed by name, length, params and behaviour. Poses, keyframes, hit windows and FX particle settings are engine data the model never needs.
- **Examples trimmed to teaching value:** one clip and five short scenes, each picked to show different features, with a one-line note on what it shows.
- **Tiers for credit saving.** `00`-`02`, `05`-`07` form the core pack (about 45 KB). `03_moves.md`, `04_effects_and_sound.md` and `08_examples.md` are the reference pack. Projects can attach both (Claude Desktop pulls in what it needs). The lean prompts name the files to consult, so a model does not re-read everything for small tasks.
- **Stable order and wording** (generated, sorted), so a re-upload only changes what changed.

`generated/catalog.json` (the full data) still exists for the web page and tools, but it is not part of the AI pack.

### 7.2 Claude Desktop (or any chat with project files)

- **One-time set-up:** create a Project, add the files in `catalog/generated/context/` as project knowledge, and paste `catalog/generated/context/project_instructions.md` (also generated: a short role plus the rules of the copy-paste workflow) as the project instructions.
- **Then each prompt is only the task:** the premise and options for an outline, or the outline, the end state and the scene entry for a scene. The tables are not repeated.
- `npm run catalog:pack` also writes `out/context_pack.zip` for easy upload.

### 7.3 Lean prompts in `tools/manual.mjs`

- Add `--lean` to every manual command: `prompt`, `story-outline`, `story-scene`, `check-*` fix prompts and `extend`.
- Lean prompts drop the embedded catalog tables and examples, and start with one line: "Use the Stickman catalog files attached to this project (catalog version X)". The version and hash come from `manifest.json`, so a stale upload is noticed.
- **Targets:**
  - clip prompt under 3,000 characters (from about 32,000);
  - outline prompt under 2,500 (from about 9,500);
  - scene prompt under 5,000 (from about 30,000);
  - fix prompts unchanged (already small).
- Without `--lean` the prompts stay self-contained as today, for chats without project files. Their tables now come from the same catalog renderers, so both modes say the same thing.
- `manual.mjs` checks the pack version a reply was written against when the reply mentions it (optional), and warns on a mismatch.

### 7.4 Automatic generation

`generate.mjs` keeps embedding the tables in the cached system prompt (cheap with prompt caching). It renders them from the same catalog functions, so automatic and copy-paste generation never differ.

## 8. The showcase web page (`web/showcase.html`)

A static page served by `npm run serve`. It loads the catalog (section 5) and renders live with the public engine API (`createEngine`, small one-scene scripts built on the fly). It never uses a hard-coded list.

**Layout:** a sticky header with a search box, a tag filter, a light/dark toggle, and a body-plan and color picker that applies to every preview. A left navigation lists the sections below. Every card shows the name, its one-line description, tags, a live preview, and a "copy JSON" button that copies a ready beat or cast entry.

| Section | What it shows | Preview |
|---|---|---|
| Characters | Body plans; character presets | Each plan idling, turnable; presets with their looks |
| Looks | Eyes, brows, mouths, hair, outfits, accessories | A grid on one character, click to combine; conflicts shown |
| Faces | 16 faces | Three zoom levels, as in `tools/face_sheet.mjs` |
| Moves | All moves by category (today's catalog page folds in here) | Looping animation on the chosen body plan, speed and facing; paired moves with a partner |
| Effects | Beat FX and world effects (slowmo, shake, flash, text pop, ...) | A short loop that fires the effect |
| Sounds | SFX keys by category | A play button for the generated WAV (from `assets/sfx/generated/`) |
| Places | Themes with time of day and weather toggles | A live background with two characters for scale; ambience name |
| Objects | Objects and props by behavior | Static drawing; balls, floaters and vehicles animated; states switchable |
| Activities | The nine activities | A looping mini scene with the right players and objects |
| Story macros | Each macro: params, defaults, anchors, example | A short live render of the example; "copy macro beat" |
| Camera and transitions | Shot modes, transitions, cards | Mini scenes demonstrating each |
| Music moods | Eleven moods | A play button for a clip pre-rendered by `npm run catalog:media` (procedural music is tools-only); a note when clips are missing |
| Examples | Clips and stories from `catalog/examples/index.json` | A thumbnail, length and features; "open in player" |
| Rules | Audience rules, limits, validator codes | Tables |

**Requirements:**
- **No build step:** plain ES modules, as today.
- **Lazy previews:** they render only when scrolled into view and pause off-screen (the page has hundreds of cards).
- **Deep links:** `showcase.html#moves/hug` opens a card.
- **Phone width:** works at phone width.
- **Local only for now:** served by `npm run serve`. A static export for sharing (`catalog:site`) is deferred; the page uses relative paths only, so it can be added later without changes.
- **Stays current:** a new entry in `catalog/` shows up with no page change. A test loads the page's data module in Node and checks that every catalog section has a renderer.

## 9. Adding something new (the README checklist)

| To add | Edit | Then |
|---|---|---|
| A body plan or character preset | `catalog/characters/bodies.json` / `presets.json` | `npm run catalog:build`; check it on the showcase page |
| A face, appearance option | `faces.json` / `appearance.json` | build; if it needs new drawing, add the renderer code in `engine/renderer/` first |
| A move | `catalog/moves/<category>.json` (or `node tools/draft.mjs move "..."`, which writes there) | build (runs the move checks on every body plan); review on the page |
| A theme or object | `catalog/world/themes.json` / `objects.json` (or `draft.mjs theme|object`, `svg_import.mjs`) | build; review |
| An FX preset or SFX key | `catalog/effects/*.json` (+ an SFX recipe in `tools/lib/synth.mjs`) | build; `npm run sfx` |
| An activity, mood | `catalog/story/*.json` | build |
| A world command, macro, camera mode, validator code | engine code first (it is a behavior), then its description in `catalog/docs/*.json` | build; the docs test fails until the description exists |
| An example | `catalog/examples/...` and `index.json` | build; the example must validate cleanly (test) |

The CLAUDE.md rules change accordingly:
- "the catalog lives in `catalog/`";
- "never edit `catalog/generated/`";
- "every entry needs a description";
- "run `npm run catalog:build` after catalog changes".

## 10. Migration plan (milestones C1-C5)

| Milestone | Work | Done when |
|---|---|---|
| C1 Folder and loader | Create `catalog/` and `loadCatalog`. A one-time converter (`tools/migrate_catalog.mjs`) expands `data/*.js` (helpers, spreads, constants) into JSON. `data/index.js` re-exports. | The converted catalog deep-equals the old one. All tests, golden frames and determinism hashes unchanged. |
| C2 Descriptions and docs | Add a description and tags to every entry (drafted with an LLM via copy-paste, reviewed); `catalog/docs/*.json` for engine vocabularies; `codes.json` replaces CODE_HELP; roles and the 12 starter presets (section 4.1); examples index | The description-completeness and engine-vocab coverage tests pass |
| C3 Build and context pack | `catalog:build`, `generated/`, the context pack and project instructions, budgets, the stale-file test. Prompt tables render from the catalog. | The pack is under budget. Existing prompt sync tests pass. `generate.mjs --mock` output is unchanged. |
| C4 Lean prompts | `manual.mjs --lean` for every command; the version stamp. The USER_GUIDE gets a Claude Desktop how-to. | The lean prompt size targets are met. A story made with Claude Desktop and the pack validates (manual check). |
| C5 Showcase page | `web/showcase.html` with all sections, `catalog:media`. `web/catalog.html` redirects to the Moves section. Retire `data/`. | Every section renders. A new test entry appears without code changes. Review by Sridhar (20 min). |

## 11. Tests

- **Migration:** the old catalog deep-equals the new one (C1, kept until `data/` is deleted). The golden frames and determinism hashes are the final check.
- **Catalog validity:** schema per file, unique names, references resolve, every entry has a description and tags.
- **Engine vocab coverage:** every world command, macro, camera mode, transition and validator code has a doc entry, and every doc entry exists in the engine.
- **Generated files are current:** an in-memory build equals the committed `generated/`.
- **Context pack:** each file is within budget; the pack mentions every move, theme, object, face, macro and code (the extension of today's prompt/validator sync test); every example in the pack validates.
- **Lean prompts:** under their size targets, with no `{{placeholders}}`; same rules text as the full prompts.
- **Showcase:** every catalog section has a renderer; deep links resolve; previews build valid scripts (each preview script validates cleanly).

## 12. Out of scope

- Editing the catalog from the web page (the page is read-only; editing stays in files and the move editor).
- Rendering procedural music in the browser (it stays a tools job; the page plays pre-rendered clips).
- Changing any engine behavior, schema or name. This is a reorganization plus new views.

## 13. Decisions (Sridhar, 2026-10-18)

1. **Folder name:** `catalog/`.
2. **Character presets:** one file per preset under `catalog/characters/presets/`, grouped by a closed list of roles and validated by the engine's cast checks. 12 starter presets in C2, more added as files (section 4.1).
3. **Showcase hosting:** local only (`npm run serve`) for now; static export deferred.
4. **Context pack format:** chosen for knowledge per token: Markdown tables only, defaults omitted, no duplication, a core and a reference tier (section 7.1).

### 13.1 Implementation notes (C1-C3)

Choices made while building, for review:
- **Loader:** `catalog/index.js` uses top-level await: fs in Node, fetch (relative to the module) in the browser, so the existing pages keep a plain `import { catalog }`. `loadCatalog(read)` accepts a sync or an async reader.
- **Legacy copy (C1-C4):** `data/*.js` stayed frozen until C5; `data/legacy.js` assembles the old catalog for `tools/migrate_catalog.mjs` and the migration test, and `data/index.js` re-exports `catalog/index.js`. Every importer now uses `catalog/index.js`. The migration test compares every legacy entry (descriptions and tags aside); entries added later are left out of the comparison.
- **Descriptions:** drafted in this session (no local models), for review. Poses and keyframes have none. Option lists (appearance, SFX keys, voices, ambience, roles) have a description but no tags. SFX keys gained a `category`.
- **Unchanged outputs:** the system prompts (writer, ideation, outline, scene, story ideation), the v1 catalog tables and the JSON Schema are byte-identical to before; `CODE_HELP` and the macro help now read `catalog/docs/` with the same wording. `generate.mjs --mock` with a fixed seed gives identical scripts and run summaries for clip, story and fight.
- **Move checks:** the build runs `checkMove` from the draft tool on every move and body plan, without the draft-only style rules (0.2-6 s duration, feet on the floor at the start and end), which three approved moves (`face`, `duck`, `throw_prop`) do not follow. `needsProp: "any"` is now handled.
- **Examples:** every world command, macro, camera mode, transition and card has an example that the build validates in a small story (`tools/lib/catalog_harness.mjs`, seed 3). The build found that with other seeds `@brawl` and `@gauntlet` could hit `E_SIM_UNREACHABLE`: a bystander or a crossing team-mate blocked the approach runs. Fixed separately (an engine change, spec 9.1 rule 6 and STORY_SPEC 11): approach runs pass bystanders, and a brawl clash across zones runs over first.
- **Pack:** 69 KB in all (about 17,000 tokens), core 41 KB, every file within its budget. Presets show their cast fields as compact JSON and the themes they are hard to see on. Macro examples sit in `08_examples.md`. Each world command is listed once (screen effects in 04, places and objects in 05, story commands in 06).
- **Version:** `1-<hash>`: the catalog format version and a hash of the generated files; it is in `manifest.json`, `00_start_here.md` and `project_instructions.md`.
- **Lean prompts (C4):** `tools/lib/lean_prompts.mjs`; the story mode is kept in the story state. Sizes: clip about 1,000 characters, outline about 1,400, scenes 2,400-5,000 (a 16-scene, 8-character outline is the largest, just under 5,000). To fit, the scene request now prints the outline entry as compact JSON (full prompts too). Lean fix prompts are the full fix text with the pack line in front. The outline format was added to `docs/format.md`, so the pack covers the outline stage. Not done yet: the manual check of a story made in Claude Desktop with the pack.
- **Showcase (C5):** `web/showcase.html` + `web/showcase.js` render cards from `web/lib/showcase_data.js` (sections from `generated/catalog.json` and `engine_vocab.json`, which now also carry the SFX and appearance descriptions). Previews are tiny stories (`web/lib/showcase_scripts.js`, plus the catalog harness for docs examples) loaded with `createEngine` when a card scrolls into view, drawn at 640 px through `web/lib/scaled_ctx.js` (it scales the renderer's absolute transforms) at 30 fps, paused off-screen, at most 24 engines kept. Face cards crop around the head (`getFrame` joints), since the camera stops at zoom 3. Example stories preview on request. Sounds play `assets/sfx/generated/` (`npm run sfx`); moods play `out/catalog_media/` (`npm run catalog:media`). `player.html?src=` opens an example. `data/` is retired: only `data/index.js` stays, re-exporting `catalog/index.js`; the C1 migration test went with it (`tests/unit/catalog_loader.test.js` keeps the loader checks).
- **Drafts:** `tools/draft.mjs ... --write` and `tools/svg_import.mjs ... --write` add a reviewed draft to `catalog/` with its description and the tag `draft`.

## 14. Kickoff prompt for the new chat

```text
You are working on the Stickman engine in this folder. Read, in order: CLAUDE.md, docs/CATALOG_SPEC.md,
docs/ARCHITECTURE.md (ADR-006 and section 4), data/index.js, tools/lib/prompt_tables.mjs,
tools/lib/story_tables.mjs, tools/lib/manual.mjs, tools/lib/manual_story.mjs, web/catalog.html.

Goal: make catalog/ the single source of truth for the engine, a new showcase web page and AI tools
(a compact context pack for Claude Desktop projects, plus lean copy-paste prompts), as specified in
docs/CATALOG_SPEC.md. The decisions in section 13 are made. Do the milestones C1-C5 in order. Rules: no engine behavior changes; golden frames,
determinism hashes and all existing tests must stay green; the engine never imports catalog/; generated
files are never edited by hand; keep docs and code in sync in the same change. Do not use local LLMs
(Ollama, LM Studio) for anything; use the offline mock or the copy-paste flow. Start with C1, and stop
for my review after C3 (context pack) and C5 (showcase page), with a short demo each time.
```
