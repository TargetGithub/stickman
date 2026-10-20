# catalog/

Everything the engine can show, in one folder: characters, moves, effects, places, objects, activities, music moods, examples and the descriptions of the engine's own vocabularies. Three consumers read it (docs/CATALOG_SPEC.md):

- **the engine**, through the injected catalog object: `import { catalog } from "../catalog/index.js"` then `createEngine({ catalog })` (the engine never imports this folder);
- **web pages and tools**, through `catalog/index.js` or one file, `generated/catalog.json` (the showcase page, `/web/showcase.html`, shows every entry with a live preview);
- **AI tools** (Claude Desktop Projects, any chat with project files), through the context pack in `generated/context/`.

## The one rule: authored or generated

| Kind | Where | Who edits it |
|---|---|---|
| Authored | everything except `generated/` and `manifest.json` | people, `tools/draft.mjs --write`, `tools/svg_import.mjs --write` |
| Generated | `generated/` and `manifest.json` | only `npm run catalog:build`; never by hand |

After any change here run `npm run catalog:build`. It checks the whole catalog (schemas, descriptions, references, every move on every body plan, every example) and rewrites the generated files. A test fails when a committed generated file is stale. `npm run catalog:check` checks without writing; `npm run catalog:pack` also writes `out/context_pack.zip`.

## Files

| Path | What |
|---|---|
| `index.js` | `loadCatalog(read)`, `loadCatalogSync()`, the default `catalog`; Node reads with fs, the browser with fetch |
| `characters/bodies.json` | body plans: bone lengths (`dims`), draw style, `torsoWidth`, `posture`, default `appearance`, `avoid` |
| `characters/appearance.json` | eyes, brows, mouthStyle, hair, outfit, accessories (each `{name, description}`), `conflicts` |
| `characters/faces.json` | faces: eyes, brows, mouth, extras, talk mouth |
| `characters/visemes.json` | talking mouth shapes for lip-sync (STORY_SPEC 7.1a): `rest` plus A, E, O, U, M, F, L |
| `characters/voices.json` | voice timbres (the names are the engine's; descriptions here) |
| `characters/roles.json` | the closed list of preset roles |
| `characters/presets/<id>.json` | ready-made characters: `{ id, name, description, role, tags, audience, cast }` |
| `moves/poses.json` | named poses (channels in degrees, dx/dy in px; authored facing right) |
| `moves/<file>.json` | moves, one file per group: movement, unarmed, armed, defensive, reactions, emotes, utility, life, interactions, defeat (spec 8.1) |
| `effects/fx.json` | FX presets (particle layers, sustain, trail; `internal` ones are spawned by the engine only) |
| `effects/sfx.json` | SFX keys with a category (recipes in `tools/lib/synth.mjs`) |
| `world/themes.json` | themes: sky, layers, ground, `characterBg` |
| `world/objects.json` | objects: behavior, drawing, size, colors, states, slots, hold data |
| `world/props.json` | the six v1 props |
| `world/ambience.json` | ambience beds (names are the engine's; recipes in `tools/lib/ambience.mjs`) |
| `story/activities.json` | activities: players, roles, objects, endings, rally data |
| `story/music_moods.json` | `scales` and `moods` (read by `tools/lib/music_gen.mjs`) |
| `story/macro_lines.json` | lines the story compiler writes itself (under 40 characters) |
| `story/blocklist.json` | `blocklist` (errors) and `softWords` (warnings with a kinder word) |
| `story/tts_voices.json` | default Piper voices per timbre and the narrator for `--speech tts` (SPEECH_SPEC 5; tools only) |
| `docs/*.json` | descriptions of engine-owned names: world commands, macros, camera modes, transitions and cards, validator codes |
| `docs/*.md` | the pack's prose: script format (`format.md`), rules and checklist, start page, project instructions |
| `examples/` | example clips and stories, indexed by `examples/index.json` (which also picks the pack's examples) |
| `bundle_blocklist.json`, `bundle_allowlist.json` | catalog bundles that are blocked, and bundles Sridhar reviewed (by content hash; docs/CATALOG_BUNDLE_SPEC.md section 8) |
| `base_names.json` | base names as of the last release: bundles refer to them, so the build fails when one disappears. Update it only at a release: `node tools/catalog_build.mjs --release-names` |
| `schemas/` | JSON Schemas for the authored files, checked by the build with the engine's schema checker; `schemas/bundle/` holds the catalog bundle schemas (docs/CATALOG_BUNDLE_SPEC.md section 4), which the build does not apply to catalog files |
| `generated/` | `engine_vocab.json`, `catalog.json`, `context/` (the AI pack) |
| `manifest.json` | catalog version, authored file list, counts, pack sizes |

## Descriptions and tags

- Every entry has a `description`: one plain sentence (8-200 characters) that a person or a model can act on. Moves, bodies, faces, FX, themes, objects, props, activities, moods and presets also have 1-6 lowercase `tags`.
- Option lists (appearance options, SFX keys, voices, ambience, roles) have a description only; SFX keys also have a `category`.
- Poses and keyframes have none: they are engine data a model never needs.
- The engine ignores these fields (prepared moves drop them).

## Adding something

| To add | Edit | Then |
|---|---|---|
| A body plan | `characters/bodies.json` | build; the move checks run on the new plan. A four-legged plan (`rig: "quadruped"`, STORY_SPEC 6.2) also needs `quad` (look), `grip` (mouth) and `moves` (generic move name → its own move) |
| A character preset | a new `characters/presets/<id>.json` (role from `roles.json`; add `"series": "<name>"` for a series cast, listed by id only in the context pack) | build (validates the cast entry, records its good themes) |
| A face or an appearance option | `faces.json` / `appearance.json` | build; new drawing needs renderer code in `engine/renderer/` first |
| A move | `moves/<file>.json`, or `node tools/draft.mjs move "..." --reply r.txt --write`; a move for another rig carries `"rig": "quadruped"` (dog moves live in `moves/quadruped.json`) | build (checks it on every body plan of its rig); review the filmstrip (`tools/move_sheet.mjs --rig quadruped --plans dog_small`) |
| A theme or object | `world/themes.json` / `objects.json`, or `draft.mjs theme|object ... --write`, `svg_import.mjs ... --write` | build; review |
| An FX preset or SFX key | `effects/*.json` (+ an SFX recipe in `tools/lib/synth.mjs`) | build; `npm run sfx` |
| An activity or mood | `story/*.json` | build |
| A world command, macro, camera mode, transition or validator code | engine code first (it is a behavior), then its entry in `docs/*.json` with an example | build (fails until the description exists and its example validates) |
| An example | `examples/clips/` or `examples/stories/` and `examples/index.json` | build (the example must validate) |

Drafts added with `--write` get the tag `draft` and the description they were drafted from: replace both when you review them.

## Field notes

- **Moves** (spec 8.1): keys `{t, pose, ease, propAngle}`, root `{t, dx, dy, ease}` (numbers or param expressions such as `"travel*1.05"`), hits, events, flags (`loop`, `hold`, `airborne`, `ranged`, `guard [t0, t1, kind]`, `invulnerable [t0, t1]`, `keepPose`, `durationParam`, `partner`, `defeat`), `needsProp` (a prop kind, `"any"`), `pair` (paired moves, `engine/story/pairs.js`). Attack wind-ups take at least 15% of the duration.
- **Poses**: `+` is forward for rot, lean, head, UA, TH; FA `+` flexes the elbow; SH `+` flexes the knee. `l*` is the far limb, `r*` the near limb. Missing channels default to stand.
- **Bodies**: `draw` stick, capsule or trapezoid; `torsoWidth` is the half-width of a filled torso; `posture` offsets every pose; `avoid` lists attacks the compiler leaves out of generated fights.
- **FX layers**: shape, count, angle, speed, life, size, width, gravity, drag, color, alpha, offset, spreadY, vrot, attach, orbit, glyph, tintable (spec 13.1).
- **Themes**: sky gradient, parallax layers (`factor` 0-1; kinds in `engine/renderer/background.js`), ground, `characterBg` (the contrast check's background).
- **Objects**: behaviors static, seat (`seatY`, `slots`), holdable (`hold` in the props format, `use`), ball, floater, vehicle, breakable; `draw` is a shape in `engine/renderer/objects.js` or `paths`.
- **Activities**: runner loop or rally; `players [min, max]`, `spacing`, `facing`, `roles` (start, moves, wait, face, fx, holds, partner), `objects`, `dur`/`reps`, `ending`, `rally`.
- **Moods**: scale, roots, tempo, meter, progressions, bass, drums per intensity, melody, arp, patches, intensity, swing.
- **Visemes**: `open` and `width` in head radii (0-0.4), `round` 0-1 (0.5 and up is an oval), `teeth`, `tongue`, `tongueUp`, `press` (closed lips), `bite` (teeth on the lower lip), `letters` (lowercase graphemes, each on one viseme only). `rest` is required and draws the face's own mouth; drawing lives in `engine/renderer/mouth_shapes.js`.
