# Catalog Bundle Specification: user-made asset packs for the catalog

Version 0.2 (decisions in section 12 made by Sridhar, 2026-10-18). **Status:** B1 done (2026-10-18: checker keywords, catalog-driven mood and activity names, the schema files); B2-B6 (section 10) not scheduled yet. Owner: Sridhar. Related: [CATALOG_SPEC.md](CATALOG_SPEC.md) (the catalog, the build, the context pack), [../catalog/README.md](../catalog/README.md) (field notes), [STORY_SPEC.md](STORY_SPEC.md) 6.2 (quadruped rig) and 13 (content policy), [../stickman-engine-spec.md](../stickman-engine-spec.md) 8.1 (moves), 15.2 (determinism), 21 (safety), [ARCHITECTURE.md](ARCHITECTURE.md) section 4 and ADR-006 (catalog injection).

## 1. Purpose and non-goals

A **catalog bundle** is a small package of catalog data made by someone outside the project: a few characters, poses, moves, effects, places, objects, activities or music moods. A user imports a bundle after it passes validation; scripts that declare the bundle can then use its entries by name. Videos are still made from scripts only.

Goals:
- Anyone can author a bundle by hand or with an AI chat, using the same JSON shapes as `catalog/`.
- A bundle can be checked fully before import, in the browser or in Node, with stable error codes.
- The same script plus the same bundle hashes gives the same frames (section 7.3).
- A bad bundle cannot crash the engine, hang a page or make a video unsafe for its audience.

**Bundles are data only.** A bundle contains JSON files and, optionally, a README and a licence text. It never contains:
- code of any kind (JS, WASM, expressions beyond the move expression grammar of spec 8.1);
- raw SVG, images, fonts, audio or video (imported vector art comes in as `paths` data, section 2.8);
- scripts that run at import time; example scripts are only validated and rendered.

**Engine behaviour cannot be bundled.** These are code, and the validator, compiler or renderer must know them:

| Not bundleable | Lives in | Why |
|---|---|---|
| Story macros (`@fight`, `@chase` ...) | `engine/story/macros/`, `engine/validator/macro_params.js` | Each macro is a compiler with its own params, anchors and seeded stream |
| World commands | `engine/validator/semantic.js` (`WORLD_COMMANDS_V2`), director, presentation | Each command is interpreted by the director and renderer |
| Camera modes, transitions, cards | `engine/camera*.js`, `engine/renderer/transitions.js`, `V2_ENUMS` | Framing and drawing code |
| Validator codes | `engine/validator/` | A code is a rule the validator enforces |
| Renderer primitives: theme layer kinds, object shapes, prop shapes, face parts, appearance options, FX particle shapes and glyphs | `engine/renderer/*.js` | Each is drawing code (section 2) |
| Sound recipes (SFX keys, ambience beds, instrument patches) | `tools/lib/synth.mjs`, `ambience.mjs`, `instruments.mjs` | Procedural audio code |
| Defeat styles, the paired-move engine, activity runners | `engine/story/defeat.js`, `pairs.js`, `activities.js` | Story-engine behaviour (a bundle can add paired moves as data, 2.2; it cannot change how pairs work) |
| Rigs (`humanoid`, `quadruped`) | `engine/skeleton*.js`, `engine/renderer/quadruped.js` | Forward kinematics and drawing |

A bundle may only **use** these by name (a move event plays an existing SFX key; an object draws with an existing shape).

**A future extension for behaviour** would need, at the least: a sandbox with no access to the engine instance, the canvas beyond a clipped drawing context, the clock or randomness except an injected seeded stream; a hard time and memory budget per call; a declarative interface (inputs and outputs as data) so the validator can check uses; signed, reviewed code rather than open uploads; and a way to keep determinism across engine versions. That is out of scope here and should get its own spec.

Non-goals for v1:
- Overriding or patching built-in entries or another bundle's entries (v1 is add-only, section 5).
- New SFX keys, voices, roles, appearance options, ambience beds or macro lines.
- Defeat styles (`defeat`): the styles are an engine enum with story logic in `defeat.js` (counts as defeated, `return`, audience rules).
- A public hosting service. This spec covers the format, the checks and local import. Sharing and a gallery are sketched only (sections 8 and 10).

## 2. What a bundle may contain

Every limit below comes from engine or tools code (file named in each subsection), checked on 2026-10-18 against commit `36ae27e`. When the code grows (a new layer kind, a new face part), the bundle schemas grow with it in the same change (section 9).

| Kind | Bundle file | Engine catalog key | Bundleable in v1 |
|---|---|---|---|
| Poses | `moves/poses.json` | `poses` | yes |
| Moves | `moves/<group>.json` | `moves` | yes, every category except `defeat`; paired moves included |
| Body plans | `characters/bodies.json` | `bodies` | yes, rigs `humanoid` and `quadruped` |
| Faces | `characters/faces.json` | `faces` | yes, from existing face parts |
| Character presets | `characters/presets/<name>.json` | (not engine data) | yes |
| FX presets | `effects/fx.json` | `fxPresets` | yes, not `internal` |
| Themes (places) | `world/themes.json` | `themes` | yes, existing layer kinds only |
| Objects | `world/objects.json` | `objects` | yes, existing behaviours and shapes, or `paths` |
| Props (v1 holdables) | `world/props.json` | `props` | yes, existing prop shapes |
| Activities | `story/activities.json` | `activities` | yes, runners `loop` and `rally`, after engine change B1.2 |
| Music moods and scales | `story/music_moods.json` | `musicMoods`, `scales` | yes, existing patches and drums, after engine change B1.2 |
| Examples | `examples/` | (not engine data) | yes, at least one is required |
| Appearance options, voices, roles, SFX keys, ambience, macro lines, blocklist, docs | | | no (engine- or tools-owned) |

### 2.1 Poses (`engine/moves.js`, `engine/types.js`)

- Channels are exactly `POSE_CHANNELS`: `rot`, `lean`, `head`, `lUA`, `lFA`, `rUA`, `rFA`, `lTH`, `lSH`, `rTH`, `rSH`, `dx`, `dy`. Angles in degrees, authored facing right; `dx`, `dy` in px. Missing channels fill from the move's base pose.
- A pose is used by humanoid moves (base pose `stand`) or quadruped moves (base pose `dog_stand`), with the channel meanings of STORY_SPEC 6.2.
- Bundle caps: angles -360..360, `dx`/`dy` -400..400 (section 6, step 9).

### 2.2 Moves (`engine/moves.js` `prepareMove`, `tools/lib/draft.mjs` `checkMove`)

- Format of spec 8.1. `category` from `CATEGORIES` minus `defeat`. `rig` is `humanoid` (default) or `quadruped`; `any` is reserved for the engine's keyless utility moves.
- `keys`: sorted, first `t` 0, last `t` 1; `pose` is a pose name or a partial pose; `ease` from `easings` (`linear`, `inQuad`, `outQuad`, `inOutQuad`, `inCubic`, `outCubic`, `inOutCubic`, `outBack`, `outElastic`, `outBounce`, `snap`, `holdThenSnap`).
- `root` `dx`/`dy`: numbers or expressions over the move's `params` (`expr.js`: numbers, param names, `+ - * / ( )`, unary minus).
- `hits[].part` from `HIT_PARTS`; `shake` from `SHAKES` (`small`, `med`, `big`); `dodge` `duck`/`back`; `aim` `auto`, `head`, `torso`, `legs`; `reaction` `hit_light`, `hit_heavy`, `hit_launch`.
- **Attacks need `hits`** and the first window opens at `t0 >= MIN_WINDUP` (0.15). Bundles may not use projectile events in v1 (they need `flags.ranged` and engine-side projectile kinds).
- `events`: bundles may use only `t`, `sfx`, `fx`, `turn`, `shake`, and `detach` (ends a paired move's `attach` that runs `until: "detach"`). The other event fields in the base catalog (`cage`, `teleport`, `give`, `unseat`, `pick`, `drop`, `use`, `hide`, `show`, `contact`, `reform`, `fade`, `poke`, `part`) drive story-engine behaviour and stay built-in.
- `flags`: `loop`, `hold`, `airborne`, `lockFacing`, `keepPose`, `partner` (a paired move's partner side), `guard` (`[t0, t1, "block"|"parry"|"catch"]`), `invulnerable` (`[t0, t1]`). Not `defeat`, `idle`, `durationParam`, `ranged`.
- **Paired moves** (`category: "interaction"`, `engine/story/pairs.js`): the lead move carries a `pair` block, read by `pairs.js` as plain data: `partnerMove`, `gap` (hip to hip for two stickmen; scaled by both bodies' arms), `leadFaces` (`toward`, `away`), `partnerFaces` (`toward`, `same`, `away`), `contacts` (`[{ t0, t1, from: "lead"|"partner", part: "rHand"|"lHand", to: "rHand"|"lHand"|"head"|"top"|"back"|"chest"|"shoulder", meet? }]`, applied with IK), `attach` (`{ t0, t1?, anchor, offset, mode: "hold"|"x", until: "detach" }`: carry, lift, drag), `inheritAttach`, `sync` (walking together). The partner move has `flags.partner: true` and is never played alone. Pairs with a quadruped follow the rig rules (`E_MOVE_RIG` with the moves that fit).
- `needsProp`: a prop or holdable `kind` (base or own) or `"any"`. `mouth`: `neutral`, `shout`, `grin`. `face`: a face name. `chain`: a move name.
- **Tightening over the base catalog:** the draft rules apply (`checkMove` with `draft: true`): duration 0.2-6 s, feet on the floor at the start and end unless the move holds or lifts. Three approved base moves break these rules; bundle moves may not.

### 2.3 Body plans (`engine/story/bodies.js`, `engine/renderer/bodies.js`, `character.js`, `quadruped.js`, `engine/validator/rigs.js`)

Humanoid (`rig: "humanoid"`):
- `draw`: `stick`, `capsule` or `trapezoid` (the only branches in `renderer/bodies.js`); `capsule` and `trapezoid` need `torsoWidth`.
- `dims`: `headR`, `neck`, `torso`, `upperArm`, `forearm`, `thigh`, `shin`, `lineWidth` (all required; the base plans range from headR 18-26, torso 42-90, lineWidth 7-13).
- `posture`: offsets added to every pose (`rot`, `lean`, `head`).
- `appearance`: defaults from the existing option names (`V2_ENUMS` eyes, brows, mouthStyle, hair, outfit; colours `hairColor`, `outfitColor`, `cheeks`).
- `avoid`: attack names the fight compiler leaves out for this plan.

Quadruped (`rig: "quadruped"`, STORY_SPEC 6.2, ADR-020):
- `draw: "quad"`, `dims` with the quadruped meanings (`torso` = spine, `upperArm`/`forearm` = front leg, `thigh`/`shin` = rear leg), `bodyWidth` (half the body's height).
- `quad`: `ears` `floppy` or `pointy`; `tail` `wag`, `curly`, `stub` or `none` (the renderer special-cases `stub` and `none`; `curly` currently draws like `wag`); colours `earColor`, `patch`, `belly`, `collar`, `bell`.
- `grip`: `offset` `[x, y]` and `angle`, where the mouth holds things.
- `moves`: the generic-name map. **Required:** every generic name that any base quadruped plan maps (today the 51 keys of `dog_small.moves`), so destinations, `@chase`, `@travel`, `@enter`, `@exit` and activities work. Targets are quadruped moves (base, own, or a dependency's).
- `appearance`: only `eyes` and `cheeks` apply (hair, outfits and humanoid accessories do not).
- Quadrupeds never fight (`E_TARGET_RIG`, `E_MACRO_RIG` still apply to bundle plans; nothing to declare).

### 2.4 Faces (`engine/renderer/face.js`)

- `eyes`: `dot`, `wide`, `happy`, `closed`, `squeeze`, `half`, `spiral`, `heart` (the `switch` in `face.js`; `big` and `oval` are appearance styles, not face eyes).
- `mouth` and `talk`: `line`, `smile`, `frown`, `smirk`, `o`, `open`, `wavy`, `grin`, `teeth`.
- `brows`: `null` or `{ tilt, lift }` (degrees and head-radius fraction; base values tilt -34..28, lift -0.06..0.16).
- `extras`: `blush`, `cheeks`, `tears`, `sweat`, `vein`, `hearts`. No blood-like extras exist and none can be added.

### 2.5 Character presets (`catalog/characters/presets/`, CATALOG_SPEC 4.1)

A preset wraps a v2 cast entry (`engine/validator/schema_v2.js` `castEntry`) with metadata. `role` comes from the closed list in `catalog/characters/roles.json` (hero, sidekick, friend, family, mentor, villain, henchman, rival, guard, crowd, animal-like). `voice.timbre` from `V2_ENUMS.timbre`. The cast is validated on stage like a base preset (`presetStory`).

### 2.6 FX presets (`engine/fx.js`, `engine/renderer/particles.js`, `engine/presentation.js`)

- `anchor`: `hip`, `head`, `feet`, `point`.
- Layer `shape`: `line`, `dot`, `puff`, `ring`, `ellipse`, `star`, `glow`, `glyph`. `glyph`: `drop`, `anger`, `heart`, `exclaim`, `question`, `zzz`, `word` (`word` draws `text`).
- `attach`: one of the 13 joints (`hip`, `shoulder`, `neckTop`, `head`, `lElbow`, `lHand`, `rElbow`, `rHand`, `lKnee`, `lFoot`, `rKnee`, `rFoot`, `center`).
- `trail.kind`: `afterimage` or `slash` (the two branches in `renderer/index.js`). `flash`, `glow`, `sustain` as in the base presets.
- Engine caps already in place: particle life is clamped to `MAX_LIFE` (3 s); live particles are capped by `LIMITS.particles` (2,000; extra ones are dropped). Bundle caps tighten per preset (section 6).
- `internal` presets (spawned by the engine only) cannot be bundled.

### 2.7 Themes (`engine/renderer/background.js`, `background_kinds.js`)

- `sky` `{top, bottom}`, `ground` `{color, line}`, `characterBg` (the contrast check's background), `layers`.
- Layer kinds are exactly `LAYER_KINDS` (28): `sun`, `stars`, `mountains`, `dunes`, `skyline`, `wall`, `lanterns`, `crowd`, `spotlights`, `floorGrid`, `floorStripes`, `snowfall`, `planks`, and the story kinds `clouds`, `trees`, `bushes`, `buildings`, `lampposts`, `fence`, `bricks`, `interior_wall`, `windows`, `furniture`, `cave`, `crystals`, `puddles`, `hills`. Each kind reads its own fields (section 4.9).
- **Why tight ranges matter here:** generators loop over the stage span with the layer's `spacing` or `step` (`for (x = SPAN[0]; x < SPAN[1]; x += l.spacing ...)`). A `spacing` of 0 never ends; a tiny one makes tens of thousands of items. `count` drives arrays of that length. Every loop-driving field has a minimum in the schema.
- Colours: `#rrggbb`, or `rgba(r, g, b, a)` (glows and translucent layers). The `crystals` glow uses the literal `A` for the pulsing alpha (`rgba(192, 77, 255, A)`).

### 2.8 Objects and props (`engine/objects.js`, `engine/renderer/objects.js`, `object_shapes.js`, `paths.js`, `props.js`)

- `behavior`: `OBJECT_BEHAVIORS`: `static`, `seat`, `holdable`, `ball`, `floater`, `vehicle`, `breakable`.
- `draw`: one of the 19 shapes in `object_shapes.js` (`bench`, `chair`, `table`, `tree`, `bush`, `lamppost`, `net`, `sign`, `crate`, `fountain`, `cage`, `box`, `car`, `bike`, `ball`, `football`, `bubble`, `balloon`, `door`), `"paths"` (vector data), or `"held"` (holdables drawn as a prop).
- `colors`: the keys a shape reads. The schema lists them per shape (for example `bench`: `wood`, `metal`; `car`: `body`, `window`, `wheel`).
- `paths` (`paths.js`): `[{ d: [["M", x, y], ["L", x, y], ["C", x1, y1, x2, y2, x, y], ["Q", x1, y1, x, y], ["Z"]], fill?, stroke?, width? }]` in object space (x centred, y up is negative). `fill`/`stroke` are a colour, `"colors.<key>"` or `"none"`. No other commands, no transforms, no text, no images.
- `breakable` objects have states `["whole", "broken"]` (`objects.js` breaks on the state `broken`).
- `hold` (holdables and floaters): the props format; `shape` from `PROP_SHAPES` (`sword`, `club`, `bat`, `staff`, `disc`, `blaster`, `racket`, `wand`, `phone`, `book`, `ice_cream`, `flower`, `rope`, `cane`, `balloon`); `grip` `rHand` or `lHand`.
- `use` (holdables): `spawn` (an object), `count`, `fx`, `sfx`.
- Props (`world/props.json`): the same hold fields with a `kind` and `shape`.

### 2.9 Activities (`engine/story/activities.js`)

- `runner`: `loop` or `rally` (the `fetch` runner is dog-specific and stays built-in). `players [min, max]` (1-4), `spacing`, `facing` (`center`, `left`, `right`), `dur` or `reps`, `ending` (`win`, `miss`, `laugh`, `hug`, `none`), `roles` (`start`, `moves`, `wait`, `face`, `fx`, `holds`, `partner`), `objects`, `rally` (`ball`, `hit`, `at` `hands`/`foot`/`propTip`, `flight`, `height`, `catch`).
- **Engine prerequisite (done in B1.2):** the validator reads activity names from `catalog.activityNames` (`macroParamsFor`, `worldCommandsV2For`), falling back to the frozen `V2_ENUMS.activity` when the catalog has none.

### 2.10 Music moods (`catalog/story/music_moods.json`, `tools/lib/music_gen.mjs`, `patterns.mjs`, `instruments.mjs`)

- `patches` from `PATCHES` (19: `square_soft`, `square`, `toy`, `flute`, `reed`, `brass`, `soft_bass`, `bouncy_bass`, `saw_bass`, `pulse_bass`, `warm_pad`, `soft_pad`, `dark_pad`, `bell`, `music_box`, `glass`, `pluck`, `pluck_high`, `pluck_dark`).
- Pattern strings: bass `.`, `r` (root), `5` (fifth), `o` (octave); drums `.`, `k`, `s`, `h`, `o` (`DRUM_OF`); melody rhythms `x` (note), `-` (hold), `.` (rest).
- `scale` names a base scale or one of the bundle's own `scales` (5-12 semitone steps 0-11).
- Music renders in tools only (Node), never in the browser or the engine.
- **Engine prerequisite (done in B1.2):** the validator reads mood names from `Object.keys(catalog.musicMoods)` (`schemaV2For` for scene `music`, `worldCommandsV2For` for `set_music`), falling back to the frozen `V2_ENUMS.mood`.

## 3. Bundle layout

A bundle is a folder, or a zip of that folder (stored or deflate entries only), with `bundle.json` at the root and catalog files that mirror `catalog/`:

```
bundle.json                       the manifest (section 4.2)
README.md                         optional: plain text for people (shown on the import page, never rendered as HTML)
LICENSE.txt                       optional: the licence text
characters/bodies.json            body plans
characters/faces.json             faces
characters/presets/<name>.json    one preset per file; <name> is the local part of its id
moves/poses.json                  named poses
moves/<group>.json                moves; <group> is movement, unarmed, armed, defensive, reactions, emotes,
                                  utility, life, interactions or quadruped (the catalog's MOVE_FILES minus defeat)
effects/fx.json                   FX presets
world/themes.json                 themes
world/objects.json                objects
world/props.json                  props
story/activities.json             activities
story/music_moods.json            scales and moods
examples/index.json               the examples (at least one)
examples/clips/<name>.json        v1 example clips
examples/stories/<name>.json      v2 example stories ({ "story": ..., "outline"?: ... } as in catalog/examples)
```

- Every file is optional except `bundle.json`, `examples/index.json` and at least one example. A bundle must add at least one catalog entry.
- The set of allowed paths is closed: the manifest's `files[].path` pattern (section 4.2) is the whole list. Anything else in the archive is an error, so path traversal, hidden files, symlinks and unknown extensions are rejected by construction.
- Files are UTF-8 JSON without a BOM (README and LICENSE: UTF-8 text). Line endings do not matter (section 4.1).
- Entries keep the catalog's container shapes: keyed objects for poses, bodies, faces, FX, themes, objects, props, activities and moods; arrays for move files.

## 4. Strict schemas

### 4.1 Conventions

The schemas below are JSON Schema draft 2020-12, written to become `catalog/schemas/bundle/<name>.schema.json` unchanged. Rules:
- Every object has `additionalProperties: false` (keyed maps use `propertyNames` plus an `additionalProperties` schema).
- Every value has an explicit type, and every number a range.
- `$ref` only points into `common.schema.json` or the same file's `$defs`.
- **Checker support.** The engine's schema checker (`engine/validator/check_value.js` `checkValue`, re-exported by `schema.js`) implements a subset: `type`, `enum`, `const`, `oneOf`, `minimum`/`maximum`, `minLength`/`maxLength`, `pattern`, `minItems`/`maxItems`, `items`, `required`, `properties`, `additionalProperties`, and since B1.1 also `$ref`/`$defs`, `propertyNames`, `minProperties`/`maxProperties`, `uniqueItems` and the checker-only `x-discriminator` (which `oneOf` branch to report, chosen by a field's value, like the existing `x-select`). `"common.schema.json#/$defs/x"` refs resolve through a map the caller passes (`checkValue(value, schema, path, { schemas })`, built by `tools/lib/catalog_files.mjs` `readBundleSchemas`), so the engine does no I/O. Codes: `propertyNames` issues keep the inner code at the key's path; `min/maxProperties` give `E_SCHEMA_SIZE`; a repeated item gives `E_REF_DUPLICATE`; an `x-discriminator` value no branch has gives `E_SCHEMA_ENUM` at that field. `x-*` keywords are dropped on export, as today.
- **Canonical form.** Hashes are taken over the canonical JSON of each file: RFC 8785 (JCS: keys sorted, no whitespace, ECMAScript number formatting, UTF-8). Duplicate keys are a parse error, so the canonical form is unambiguous. README and LICENSE are hashed as UTF-8 bytes with line endings normalised to `\n`.

**Checked while drafting** (2026-10-18, with a standard draft 2020-12 validator): every schema below is a valid schema; the worked example of 11.1 passes; and the base catalog's own themes, objects, faces, bodies, props, activities, moods and paired moves pass too, once their names are prefixed and the bundle count caps are ignored. The base entries that fail are the ones bundles leave out on purpose: `internal` FX, the `fetch` activity, and move fields such as `projectile`, `contact`, `hide` and `give`.

**Names.** Every entry a bundle adds has a **namespaced id** `bundleId:name`. Names without a colon always mean the base catalog (section 5).

### 4.2 `common.schema.json`

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "common.schema.json",
  "title": "Shared definitions for catalog bundle files.",
  "$defs": {
    "bundleId": { "type": "string", "pattern": "^[a-z][a-z0-9_]{2,31}$" },
    "localName": { "type": "string", "pattern": "^[a-z][a-z0-9_]{0,31}$" },
    "ownName": { "type": "string", "pattern": "^[a-z][a-z0-9_]{2,31}:[a-z][a-z0-9_]{0,31}$", "description": "An entry this bundle adds: <bundleId>:<name> (step 7 checks the prefix is this bundle's id)." },
    "ref": { "type": "string", "pattern": "^([a-z][a-z0-9_]{2,31}:[a-z][a-z0-9_]{0,31}|[a-zA-Z][a-zA-Z0-9_]{0,31})$", "description": "A base name (no colon; base pose names are camelCase, such as walkA) or a namespaced name of this bundle or a declared dependency." },
    "refList": { "type": "array", "maxItems": 8, "uniqueItems": true, "items": { "$ref": "#/$defs/ref" } },
    "sfxKey": { "type": "string", "pattern": "^[a-z][a-z0-9_]{0,31}$", "description": "A base SFX key (catalog/effects/sfx.json); bundles cannot add sounds." },
    "hex": { "type": "string", "pattern": "^#[0-9a-fA-F]{6}$" },
    "color": { "type": "string", "pattern": "^(#[0-9a-fA-F]{6}|rgba\\([0-9]{1,3}, ?[0-9]{1,3}, ?[0-9]{1,3}, ?(0|1|0?\\.[0-9]{1,3})\\))$", "description": "#rrggbb or rgba(r, g, b, a); step 9 checks r, g, b <= 255." },
    "pulseColor": { "type": "string", "pattern": "^rgba\\([0-9]{1,3}, ?[0-9]{1,3}, ?[0-9]{1,3}, ?A\\)$", "description": "rgba with the literal A, replaced by the pulsing alpha (crystals)." },
    "description": { "type": "string", "minLength": 8, "maxLength": 200 },
    "tags": { "type": "array", "minItems": 1, "maxItems": 6, "uniqueItems": true, "items": { "type": "string", "pattern": "^[a-z][a-z0-9-]{1,23}$" } },
    "audience": { "type": "array", "minItems": 1, "maxItems": 2, "uniqueItems": true, "items": { "enum": ["kids", "general"] } },
    "unit": { "type": "number", "minimum": 0, "maximum": 1 },
    "factor": { "type": "number", "minimum": 0, "maximum": 1, "description": "Parallax: 0 fixed to the screen, 1 moves with the world." },
    "angle": { "type": "number", "minimum": -360, "maximum": 360 },
    "pair01": { "type": "array", "minItems": 2, "maxItems": 2, "items": { "type": "number", "minimum": 0, "maximum": 1 } },
    "semver": { "type": "string", "pattern": "^(0|[1-9][0-9]{0,3})\\.(0|[1-9][0-9]{0,3})\\.(0|[1-9][0-9]{0,3})$" },
    "semverRange": { "type": "string", "pattern": "^(\\^|~|>=)?(0|[1-9][0-9]{0,3})\\.(0|[1-9][0-9]{0,3})\\.(0|[1-9][0-9]{0,3})( <(0|[1-9][0-9]{0,3})\\.(0|[1-9][0-9]{0,3})\\.(0|[1-9][0-9]{0,3}))?$", "description": "^1.2.3, ~1.2.3, >=1.2.3, >=1.2.3 <2.0.0 or an exact 1.2.3." },
    "sha256": { "type": "string", "pattern": "^sha256-[0-9a-f]{64}$" },
    "pin": {
      "type": "object", "required": ["id", "version", "hash"], "additionalProperties": false,
      "properties": { "id": { "$ref": "#/$defs/bundleId" }, "version": { "$ref": "#/$defs/semver" }, "hash": { "$ref": "#/$defs/sha256" } }
    },
    "poseChannels": {
      "type": "object", "additionalProperties": false, "minProperties": 1,
      "properties": {
        "rot": { "$ref": "#/$defs/angle" }, "lean": { "$ref": "#/$defs/angle" }, "head": { "$ref": "#/$defs/angle" },
        "lUA": { "$ref": "#/$defs/angle" }, "lFA": { "$ref": "#/$defs/angle" }, "rUA": { "$ref": "#/$defs/angle" }, "rFA": { "$ref": "#/$defs/angle" },
        "lTH": { "$ref": "#/$defs/angle" }, "lSH": { "$ref": "#/$defs/angle" }, "rTH": { "$ref": "#/$defs/angle" }, "rSH": { "$ref": "#/$defs/angle" },
        "dx": { "type": "number", "minimum": -400, "maximum": 400 }, "dy": { "type": "number", "minimum": -400, "maximum": 400 }
      }
    },
    "joint": { "enum": ["hip", "shoulder", "neckTop", "head", "lElbow", "lHand", "rElbow", "rHand", "lKnee", "lFoot", "rKnee", "rFoot", "center"] }
  }
}
```

(`minProperties` is in the same B1.1 checker extension. Appearance option names are spelled out as enums in the schemas that use them, copied from `V2_ENUMS`; a test keeps them equal.)

### 4.3 `bundle.schema.json` (the manifest)

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "bundle.schema.json",
  "title": "bundle.json: the manifest of a catalog bundle.",
  "type": "object",
  "required": ["schemaVersion", "id", "version", "name", "description", "author", "license", "engineVersion", "catalogVersion", "audience", "files", "contentHash"],
  "additionalProperties": false,
  "properties": {
    "schemaVersion": { "const": 1 },
    "id": { "$ref": "common.schema.json#/$defs/bundleId" },
    "version": { "$ref": "common.schema.json#/$defs/semver" },
    "name": { "type": "string", "minLength": 3, "maxLength": 48 },
    "description": { "type": "string", "minLength": 8, "maxLength": 300 },
    "author": {
      "type": "object", "required": ["name"], "additionalProperties": false,
      "properties": {
        "name": { "type": "string", "minLength": 2, "maxLength": 64 },
        "url": { "type": "string", "pattern": "^https://[^\\s\"<>]{3,200}$" }
      }
    },
    "license": { "enum": ["CC0-1.0", "CC-BY-4.0", "CC-BY-SA-4.0", "CC-BY-NC-4.0", "MIT", "Apache-2.0"] },
    "engineVersion": { "$ref": "common.schema.json#/$defs/semverRange" },
    "catalogVersion": { "type": "string", "pattern": "^([1-9][0-9]{0,2}|>=[1-9][0-9]{0,2}( <[1-9][0-9]{0,2})?)$", "description": "Catalog format (manifest.json schemaVersion): 1, >=1 or >=1 <3." },
    "testedWith": { "type": "string", "pattern": "^[1-9][0-9]{0,2}-[0-9a-f]{10}$", "description": "Informative: the catalog version (manifest.json version) the author tested with." },
    "audience": { "$ref": "common.schema.json#/$defs/audience" },
    "tags": { "$ref": "common.schema.json#/$defs/tags" },
    "dependencies": { "type": "array", "maxItems": 4, "items": { "$ref": "common.schema.json#/$defs/pin" } },
    "files": {
      "type": "array", "minItems": 2, "maxItems": 64,
      "items": {
        "type": "object", "required": ["path", "sha256"], "additionalProperties": false,
        "properties": {
          "path": { "type": "string", "pattern": "^(README\\.md|LICENSE\\.txt|characters/(bodies|faces)\\.json|characters/presets/[a-z][a-z0-9_]{0,31}\\.json|moves/(poses|movement|unarmed|armed|defensive|reactions|emotes|utility|life|interactions|quadruped)\\.json|effects/fx\\.json|world/(themes|objects|props)\\.json|story/(activities|music_moods)\\.json|examples/index\\.json|examples/(clips|stories)/[a-z][a-z0-9_]{0,31}\\.json)$" },
          "sha256": { "$ref": "common.schema.json#/$defs/sha256" }
        }
      }
    },
    "contentHash": { "$ref": "common.schema.json#/$defs/sha256" }
  }
}
```

- `files` lists every file except `bundle.json`, sorted by path, each with the SHA-256 of its canonical form (4.1).
- `contentHash` is the SHA-256 of the canonical JSON of the manifest **without** `contentHash`. Because the manifest carries every file's hash, this one value pins the id, version, metadata and every byte of content. It is the value scripts pin (section 7).
- `tools/bundle.mjs pack` writes `files` and `contentHash`; authors never compute them by hand.

### 4.4 `poses.schema.json` (`moves/poses.json`)

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "poses.schema.json",
  "title": "moves/poses.json: named poses, channel → degrees (dx, dy in px), authored facing right.",
  "type": "object",
  "maxProperties": 128,
  "propertyNames": { "$ref": "common.schema.json#/$defs/ownName" },
  "additionalProperties": { "$ref": "common.schema.json#/$defs/poseChannels" }
}
```

Poses have no description or tags (as in the base catalog).

### 4.5 `moves.schema.json` (`moves/<group>.json`)

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "moves.schema.json",
  "title": "moves/<group>.json: a list of moves (spec 8.1) with the bundle tightening.",
  "type": "array",
  "minItems": 1,
  "maxItems": 64,
  "items": { "$ref": "#/$defs/move" },
  "$defs": {
    "expr": {
      "type": ["number", "string"], "minimum": -5000, "maximum": 5000, "minLength": 1, "maxLength": 40,
      "pattern": "^[a-z0-9_+\\-*/(). ]+$",
      "description": "A number, or an expression over the move's params (expr.js)."
    },
    "move": {
      "type": "object",
      "required": ["name", "description", "tags", "category", "duration", "keys"],
      "additionalProperties": false,
      "properties": {
        "name": { "$ref": "common.schema.json#/$defs/ownName" },
        "description": { "$ref": "common.schema.json#/$defs/description" },
        "tags": { "$ref": "common.schema.json#/$defs/tags" },
        "category": { "enum": ["attack", "movement", "reaction", "defensive", "emote", "utility", "life", "interaction"] },
        "rig": { "enum": ["humanoid", "quadruped"] },
        "duration": { "type": "number", "minimum": 0.2, "maximum": 6 },
        "params": {
          "type": "object", "maxProperties": 4,
          "propertyNames": { "$ref": "common.schema.json#/$defs/localName" },
          "additionalProperties": { "type": "number", "minimum": -5000, "maximum": 5000 }
        },
        "needsProp": { "type": "string", "pattern": "^(any|[a-z][a-z0-9_]{2,31}:[a-z][a-z0-9_]{0,31}|[a-z][a-z0-9_]{0,31})$" },
        "keys": {
          "type": "array", "minItems": 2, "maxItems": 24,
          "items": {
            "type": "object", "required": ["t", "pose"], "additionalProperties": false,
            "properties": {
              "t": { "$ref": "common.schema.json#/$defs/unit" },
              "pose": { "oneOf": [{ "$ref": "common.schema.json#/$defs/ref" }, { "$ref": "common.schema.json#/$defs/poseChannels" }] },
              "ease": { "enum": ["linear", "inQuad", "outQuad", "inOutQuad", "inCubic", "outCubic", "inOutCubic", "outBack", "outElastic", "outBounce", "snap", "holdThenSnap"] },
              "snapHard": { "type": "boolean" },
              "propAngle": { "type": "number", "minimum": -720, "maximum": 720, "description": "Spins go past 360 (base moves use 720)." }
            }
          }
        },
        "root": {
          "type": "array", "minItems": 2, "maxItems": 12,
          "items": {
            "type": "object", "required": ["t"], "additionalProperties": false,
            "properties": {
              "t": { "$ref": "common.schema.json#/$defs/unit" },
              "dx": { "$ref": "#/$defs/expr" },
              "dy": { "$ref": "#/$defs/expr" },
              "ease": { "enum": ["linear", "inQuad", "outQuad", "inOutQuad", "inCubic", "outCubic", "inOutCubic", "outBack", "outElastic", "outBounce", "snap", "holdThenSnap"] }
            }
          }
        },
        "hits": {
          "type": "array", "minItems": 1, "maxItems": 6,
          "items": {
            "type": "object", "required": ["t0", "t1", "part", "damage"], "additionalProperties": false,
            "properties": {
              "t0": { "$ref": "common.schema.json#/$defs/unit" },
              "t1": { "$ref": "common.schema.json#/$defs/unit" },
              "part": { "enum": ["rHand", "lHand", "rFoot", "lFoot", "rKnee", "lKnee", "rElbow", "lElbow", "head", "propTip"] },
              "aim": { "enum": ["auto", "head", "torso", "legs"] },
              "damage": { "type": ["number", "string"], "minimum": 0, "maximum": 40, "minLength": 1, "maxLength": 40, "pattern": "^[a-z0-9_+\\-*/(). ]+$" },
              "knock": { "type": "array", "minItems": 2, "maxItems": 2, "items": { "type": "number", "minimum": -1200, "maximum": 1200 } },
              "hitstop": { "type": "number", "minimum": 0, "maximum": 0.2 },
              "reaction": { "enum": ["hit_light", "hit_heavy", "hit_launch"] },
              "fx": { "type": "array", "maxItems": 3, "items": { "$ref": "common.schema.json#/$defs/ref" } },
              "shake": { "enum": ["small", "med", "big"] },
              "sfx": { "$ref": "common.schema.json#/$defs/sfxKey" },
              "dodge": { "enum": ["duck", "back"] }
            }
          }
        },
        "events": {
          "type": "array", "minItems": 1, "maxItems": 12,
          "items": {
            "type": "object", "required": ["t"], "additionalProperties": false,
            "properties": {
              "t": { "$ref": "common.schema.json#/$defs/unit" },
              "sfx": { "$ref": "common.schema.json#/$defs/sfxKey" },
              "fx": { "type": "array", "minItems": 1, "maxItems": 3, "items": { "$ref": "common.schema.json#/$defs/ref" } },
              "turn": { "const": true },
              "shake": { "enum": ["small", "med", "big"] },
              "detach": { "const": true }
            }
          }
        },
        "flags": {
          "type": "object", "additionalProperties": false,
          "properties": {
            "loop": { "type": "boolean" },
            "hold": { "type": "boolean" },
            "airborne": { "type": "boolean" },
            "lockFacing": { "type": "boolean" },
            "keepPose": { "type": "boolean" },
            "partner": { "const": true },
            "guard": { "type": "array", "minItems": 3, "maxItems": 3, "items": { "type": ["number", "string"], "minimum": 0, "maximum": 1, "pattern": "^(block|parry|catch)$" }, "description": "[t0, t1, block|parry|catch]; step 11 checks the positions." },
            "invulnerable": { "type": "array", "minItems": 2, "maxItems": 2, "items": { "$ref": "common.schema.json#/$defs/unit" } }
          }
        },
        "mouth": { "enum": ["neutral", "shout", "grin"] },
        "face": { "$ref": "common.schema.json#/$defs/ref" },
        "chain": { "$ref": "common.schema.json#/$defs/ref" },
        "pair": { "$ref": "#/$defs/pair" }
      }
    },
    "pair": {
      "type": "object",
      "required": ["partnerMove", "gap", "leadFaces", "partnerFaces", "contacts"],
      "additionalProperties": false,
      "properties": {
        "partnerMove": { "$ref": "common.schema.json#/$defs/ref" },
        "gap": { "type": "number", "minimum": 0, "maximum": 200 },
        "leadFaces": { "enum": ["toward", "away"] },
        "partnerFaces": { "enum": ["toward", "same", "away"] },
        "contacts": {
          "type": "array", "maxItems": 6,
          "items": {
            "type": "object", "required": ["t0", "t1", "from", "part", "to"], "additionalProperties": false,
            "properties": {
              "t0": { "$ref": "common.schema.json#/$defs/unit" },
              "t1": { "$ref": "common.schema.json#/$defs/unit" },
              "from": { "enum": ["lead", "partner"] },
              "part": { "enum": ["rHand", "lHand"] },
              "to": { "enum": ["rHand", "lHand", "head", "top", "back", "chest", "shoulder"] },
              "meet": { "const": true }
            }
          }
        },
        "attach": {
          "type": "object", "required": ["t0", "anchor", "offset"], "additionalProperties": false,
          "properties": {
            "t0": { "$ref": "common.schema.json#/$defs/unit" },
            "t1": { "$ref": "common.schema.json#/$defs/unit" },
            "anchor": { "$ref": "common.schema.json#/$defs/joint" },
            "offset": { "type": "array", "minItems": 2, "maxItems": 2, "items": { "type": "number", "minimum": -200, "maximum": 200 } },
            "mode": { "enum": ["hold", "x"] },
            "until": { "const": "detach" }
          }
        },
        "inheritAttach": { "const": true },
        "sync": { "const": true }
      }
    }
  }
}
```

(A tuple cannot be expressed in the checker's subset, so `guard` accepts numbers in 0-1 and the three kind names in any position, and step 11 checks the order `[number, number, string]`.)

Semantic rules on moves (step 11, not expressible in the schema): `keys` sorted with first `t` 0 and last `t` 1; `root` and `events` sorted; `hits` only on `attack` moves and required there; first `t0 >= 0.15`; `t0 < t1`; every expression parses against the move's `params`; the move runs on every body plan of its rig (section 6, step 11). Paired moves: `pair` exactly on `interaction` moves without `flags.partner`; `pair.partnerMove` names a move with `flags.partner: true`; a partner move has no `pair`; `attach` with `until: "detach"` needs a `detach` event (in the lead move or the partner move), and a `detach` event needs such an `attach`; `inheritAttach` (as in `put_down`) takes over a running `attach` of an earlier pair with the same partner, so it needs no `attach` of its own.

### 4.6 `bodies.schema.json` (`characters/bodies.json`)

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "bodies.schema.json",
  "title": "characters/bodies.json: body plans (humanoid or quadruped rig).",
  "type": "object",
  "maxProperties": 4,
  "propertyNames": { "$ref": "common.schema.json#/$defs/ownName" },
  "additionalProperties": { "oneOf": [{ "$ref": "#/$defs/humanoid" }, { "$ref": "#/$defs/quadruped" }], "x-discriminator": "rig" },
  "$defs": {
    "humanoid": {
      "type": "object",
      "required": ["description", "tags", "rig", "draw", "dims"],
      "additionalProperties": false,
      "properties": {
        "description": { "$ref": "common.schema.json#/$defs/description" },
        "tags": { "$ref": "common.schema.json#/$defs/tags" },
        "rig": { "const": "humanoid" },
        "draw": { "enum": ["stick", "capsule", "trapezoid"] },
        "torsoWidth": { "type": "number", "minimum": 12, "maximum": 40 },
        "dims": {
          "type": "object",
          "required": ["headR", "neck", "torso", "upperArm", "forearm", "thigh", "shin", "lineWidth"],
          "additionalProperties": false,
          "properties": {
            "headR": { "type": "number", "minimum": 14, "maximum": 32 },
            "neck": { "type": "number", "minimum": 0, "maximum": 14 },
            "torso": { "type": "number", "minimum": 34, "maximum": 110 },
            "upperArm": { "type": "number", "minimum": 18, "maximum": 54 },
            "forearm": { "type": "number", "minimum": 16, "maximum": 52 },
            "thigh": { "type": "number", "minimum": 20, "maximum": 68 },
            "shin": { "type": "number", "minimum": 18, "maximum": 66 },
            "lineWidth": { "type": "number", "minimum": 5, "maximum": 15 }
          }
        },
        "posture": {
          "type": "object", "additionalProperties": false, "minProperties": 1,
          "properties": {
            "rot": { "type": "number", "minimum": -20, "maximum": 20 },
            "lean": { "type": "number", "minimum": -20, "maximum": 20 },
            "head": { "type": "number", "minimum": -20, "maximum": 20 }
          }
        },
        "appearance": {
          "type": "object", "additionalProperties": false,
          "properties": {
            "eyes": { "enum": ["dot", "big", "oval", "sleepy", "visor", "glasses"] },
            "brows": { "enum": ["none", "thin", "thick"] },
            "mouthStyle": { "enum": ["line", "cartoon"] },
            "hair": { "enum": ["none", "spiky", "bob", "ponytail", "cap", "bun"] },
            "hairColor": { "$ref": "common.schema.json#/$defs/hex" },
            "outfit": { "enum": ["none", "shirt", "coat", "armor", "robe"] },
            "outfitColor": { "$ref": "common.schema.json#/$defs/hex" },
            "cheeks": { "$ref": "common.schema.json#/$defs/hex" }
          }
        },
        "avoid": { "type": "array", "maxItems": 24, "uniqueItems": true, "items": { "$ref": "common.schema.json#/$defs/ref" } }
      }
    },
    "quadruped": {
      "type": "object",
      "required": ["description", "tags", "rig", "draw", "dims", "bodyWidth", "quad", "grip", "moves"],
      "additionalProperties": false,
      "properties": {
        "description": { "$ref": "common.schema.json#/$defs/description" },
        "tags": { "$ref": "common.schema.json#/$defs/tags" },
        "rig": { "const": "quadruped" },
        "draw": { "const": "quad" },
        "bodyWidth": { "type": "number", "minimum": 8, "maximum": 30 },
        "dims": {
          "type": "object",
          "required": ["headR", "neck", "torso", "upperArm", "forearm", "thigh", "shin", "lineWidth"],
          "additionalProperties": false,
          "properties": {
            "headR": { "type": "number", "minimum": 10, "maximum": 30 },
            "neck": { "type": "number", "minimum": 0, "maximum": 20 },
            "torso": { "type": "number", "minimum": 24, "maximum": 90 },
            "upperArm": { "type": "number", "minimum": 8, "maximum": 40 },
            "forearm": { "type": "number", "minimum": 8, "maximum": 40 },
            "thigh": { "type": "number", "minimum": 8, "maximum": 40 },
            "shin": { "type": "number", "minimum": 8, "maximum": 40 },
            "lineWidth": { "type": "number", "minimum": 4, "maximum": 12 }
          }
        },
        "quad": {
          "type": "object", "required": ["ears", "tail"], "additionalProperties": false,
          "properties": {
            "ears": { "enum": ["floppy", "pointy"] },
            "earColor": { "$ref": "common.schema.json#/$defs/hex" },
            "tail": { "enum": ["wag", "curly", "stub", "none"] },
            "patch": { "$ref": "common.schema.json#/$defs/hex" },
            "belly": { "$ref": "common.schema.json#/$defs/hex" },
            "collar": { "$ref": "common.schema.json#/$defs/hex" },
            "bell": { "$ref": "common.schema.json#/$defs/hex" }
          }
        },
        "grip": {
          "type": "object", "required": ["offset", "angle"], "additionalProperties": false,
          "properties": {
            "offset": { "type": "array", "minItems": 2, "maxItems": 2, "items": { "type": "number", "minimum": -60, "maximum": 60 } },
            "angle": { "type": "number", "minimum": -180, "maximum": 180 }
          }
        },
        "appearance": {
          "type": "object", "additionalProperties": false,
          "properties": {
            "eyes": { "enum": ["dot", "big", "oval", "sleepy"] },
            "cheeks": { "$ref": "common.schema.json#/$defs/hex" }
          }
        },
        "moves": {
          "type": "object", "minProperties": 1, "maxProperties": 96,
          "propertyNames": { "$ref": "common.schema.json#/$defs/localName" },
          "additionalProperties": { "$ref": "common.schema.json#/$defs/ref" }
        }
      }
    }
  }
}
```

Semantic rules (step 8 and 11): `capsule`/`trapezoid` need `torsoWidth`; a quadruped `moves` map covers every key of every base quadruped plan's map, keys are base generic names (no colon), targets are quadruped moves; `avoid` names attack moves.

### 4.7 `faces.schema.json` (`characters/faces.json`)

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "faces.schema.json",
  "title": "characters/faces.json: faces made from the renderer's existing face parts.",
  "type": "object",
  "maxProperties": 16,
  "propertyNames": { "$ref": "common.schema.json#/$defs/ownName" },
  "additionalProperties": {
    "type": "object",
    "required": ["description", "tags", "eyes", "brows", "mouth"],
    "additionalProperties": false,
    "properties": {
      "description": { "$ref": "common.schema.json#/$defs/description" },
      "tags": { "$ref": "common.schema.json#/$defs/tags" },
      "eyes": { "enum": ["dot", "wide", "happy", "closed", "squeeze", "half", "spiral", "heart"] },
      "brows": {
        "type": ["object", "null"], "required": ["tilt", "lift"], "additionalProperties": false,
        "properties": { "tilt": { "type": "number", "minimum": -40, "maximum": 40 }, "lift": { "type": "number", "minimum": -0.1, "maximum": 0.2 } }
      },
      "mouth": { "enum": ["line", "smile", "frown", "smirk", "o", "open", "wavy", "grin", "teeth"] },
      "talk": { "enum": ["line", "smile", "frown", "smirk", "o", "open", "wavy", "grin", "teeth"] },
      "extras": { "type": "array", "maxItems": 3, "uniqueItems": true, "items": { "enum": ["blush", "cheeks", "tears", "sweat", "vein", "hearts"] } }
    }
  }
}
```

### 4.8 `preset.schema.json` (`characters/presets/<name>.json`)

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "preset.schema.json",
  "title": "characters/presets/<name>.json: a ready-made character (CATALOG_SPEC 4.1).",
  "type": "object",
  "required": ["id", "name", "description", "role", "tags", "audience", "cast"],
  "additionalProperties": false,
  "properties": {
    "id": { "$ref": "common.schema.json#/$defs/ownName" },
    "name": { "type": "string", "minLength": 1, "maxLength": 16, "pattern": "^[A-Za-z][A-Za-z0-9 '.-]{0,15}$" },
    "description": { "$ref": "common.schema.json#/$defs/description" },
    "role": { "enum": ["hero", "sidekick", "friend", "family", "mentor", "villain", "henchman", "rival", "guard", "crowd", "animal-like"] },
    "tags": { "$ref": "common.schema.json#/$defs/tags" },
    "series": { "type": "string", "pattern": "^[a-z][a-z0-9_]{0,31}$", "description": "The series this character belongs to; the context pack lists series presets by id only." },
    "audience": { "$ref": "common.schema.json#/$defs/audience" },
    "cast": {
      "type": "object", "required": ["color"], "additionalProperties": false,
      "properties": {
        "body": { "$ref": "common.schema.json#/$defs/ref" },
        "color": { "$ref": "common.schema.json#/$defs/hex" },
        "scale": { "type": "number", "minimum": 0.4, "maximum": 4 },
        "hp": { "type": "number", "minimum": 1, "maximum": 1000 },
        "prop": { "type": ["string", "null"], "pattern": "^([a-z][a-z0-9_]{2,31}:[a-z][a-z0-9_]{0,31}|[a-z][a-z0-9_]{0,31})$" },
        "appearance": {
          "type": "object", "additionalProperties": false,
          "properties": {
            "eyes": { "enum": ["dot", "big", "oval", "sleepy", "visor", "glasses"] },
            "brows": { "enum": ["none", "thin", "thick"] },
            "mouthStyle": { "enum": ["line", "cartoon"] },
            "cheeks": { "$ref": "common.schema.json#/$defs/hex" },
            "hair": { "enum": ["none", "spiky", "bob", "ponytail", "cap", "bun"] },
            "hairColor": { "$ref": "common.schema.json#/$defs/hex" },
            "outfit": { "enum": ["none", "shirt", "coat", "armor", "robe"] },
            "outfitColor": { "$ref": "common.schema.json#/$defs/hex" },
            "belly": { "$ref": "common.schema.json#/$defs/hex" },
            "slots": { "type": "integer", "minimum": 0, "maximum": 7 },
            "accessories": {
              "type": "object", "additionalProperties": false, "maxProperties": 4,
              "properties": {
                "headband": { "$ref": "common.schema.json#/$defs/hex" }, "scarf": { "$ref": "common.schema.json#/$defs/hex" },
                "cape": { "$ref": "common.schema.json#/$defs/hex" }, "hat": { "$ref": "common.schema.json#/$defs/hex" },
                "antenna": { "$ref": "common.schema.json#/$defs/hex" }, "bowtie": { "$ref": "common.schema.json#/$defs/hex" },
                "mask": { "$ref": "common.schema.json#/$defs/hex" }, "crown": { "$ref": "common.schema.json#/$defs/hex" },
                "backpack": { "$ref": "common.schema.json#/$defs/hex" }, "eyepatch": { "$ref": "common.schema.json#/$defs/hex" },
                "hair_flower": { "$ref": "common.schema.json#/$defs/hex" }, "sprout": { "$ref": "common.schema.json#/$defs/hex" },
                "mittens": { "$ref": "common.schema.json#/$defs/hex" }, "horns": { "$ref": "common.schema.json#/$defs/hex" },
                "turban": { "$ref": "common.schema.json#/$defs/hex" }, "moustache": { "$ref": "common.schema.json#/$defs/hex" },
                "stub_horns": { "$ref": "common.schema.json#/$defs/hex" }, "bracelet": { "$ref": "common.schema.json#/$defs/hex" }, "chilli_hat": { "$ref": "common.schema.json#/$defs/hex" }, "pirate_hat": { "$ref": "common.schema.json#/$defs/hex" }, "beard": { "$ref": "common.schema.json#/$defs/hex" }
              }
            }
          }
        },
        "voice": {
          "type": "object", "additionalProperties": false,
          "properties": {
            "pitch": { "type": "number", "minimum": 0.5, "maximum": 2 },
            "speed": { "type": "number", "minimum": 0.7, "maximum": 1.4 },
            "timbre": { "enum": ["soft", "squeaky", "deep", "robot", "bark"] }
          }
        },
        "style": {
          "type": "object", "additionalProperties": false,
          "properties": {
            "overlap": { "type": "boolean" }, "outline": { "type": "boolean" }, "squash": { "type": "boolean" },
            "glow": { "$ref": "common.schema.json#/$defs/hex" }, "headband": { "$ref": "common.schema.json#/$defs/hex" },
            "cape": { "$ref": "common.schema.json#/$defs/hex" }, "hat": { "$ref": "common.schema.json#/$defs/hex" },
            "scarf": { "$ref": "common.schema.json#/$defs/hex" }
          }
        }
      }
    }
  }
}
```

Tightening over the base preset schema: `cast` is fully typed (the base schema only requires `color`); the display name has a character pattern; the file name must equal the id's local part (step 7). Appearance conflicts (`catalog/characters/appearance.json` `conflicts`) are checked by the cast validation (step 11).

### 4.9 `fx.schema.json` (`effects/fx.json`)

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "fx.schema.json",
  "title": "effects/fx.json: FX presets from the existing particle shapes and glyphs.",
  "type": "object",
  "maxProperties": 24,
  "propertyNames": { "$ref": "common.schema.json#/$defs/ownName" },
  "additionalProperties": { "$ref": "#/$defs/preset" },
  "$defs": {
    "preset": {
      "type": "object",
      "required": ["description", "tags", "anchor"],
      "additionalProperties": false,
      "properties": {
        "description": { "$ref": "common.schema.json#/$defs/description" },
        "tags": { "$ref": "common.schema.json#/$defs/tags" },
        "anchor": { "enum": ["hip", "head", "feet", "point"] },
        "layers": { "type": "array", "minItems": 1, "maxItems": 6, "items": { "$ref": "#/$defs/layer" } },
        "trail": {
          "type": "object", "required": ["kind", "duration"], "additionalProperties": false,
          "properties": { "kind": { "enum": ["afterimage", "slash"] }, "duration": { "type": "number", "minimum": 0.05, "maximum": 1 } }
        },
        "flash": {
          "type": "object", "required": ["color", "dur"], "additionalProperties": false,
          "properties": { "color": { "$ref": "common.schema.json#/$defs/hex" }, "dur": { "type": "number", "minimum": 0.05, "maximum": 0.2 } }
        },
        "glow": {
          "type": "object", "required": ["attach", "life", "size", "color", "alpha"], "additionalProperties": false,
          "properties": {
            "attach": { "$ref": "common.schema.json#/$defs/joint" },
            "life": { "type": "number", "minimum": 0.1, "maximum": 3 },
            "size": { "type": "array", "minItems": 2, "maxItems": 2, "items": { "type": "number", "minimum": 0, "maximum": 300 } },
            "color": { "$ref": "common.schema.json#/$defs/color" },
            "alpha": { "$ref": "common.schema.json#/$defs/pair01" }
          }
        },
        "sustain": {
          "type": "object", "required": ["duration", "rate"], "additionalProperties": false,
          "properties": { "duration": { "type": "number", "minimum": 0.1, "maximum": 3 }, "rate": { "type": "number", "minimum": 1, "maximum": 40 } }
        }
      }
    },
    "layer": {
      "type": "object",
      "required": ["shape", "count", "life", "size", "color", "alpha"],
      "additionalProperties": false,
      "properties": {
        "shape": { "enum": ["line", "dot", "puff", "ring", "ellipse", "star", "glow", "glyph"] },
        "count": { "type": "integer", "minimum": 1, "maximum": 40 },
        "angle": { "type": ["number", "array"], "minimum": -360, "maximum": 360, "minItems": 2, "maxItems": 2, "items": { "type": "number", "minimum": -360, "maximum": 360 } },
        "speed": { "type": ["number", "array"], "minimum": 0, "maximum": 1500, "minItems": 2, "maxItems": 2, "items": { "type": "number", "minimum": 0, "maximum": 1500 } },
        "life": { "type": "array", "minItems": 2, "maxItems": 2, "items": { "type": "number", "minimum": 0.05, "maximum": 3 } },
        "size": { "type": "array", "minItems": 2, "maxItems": 2, "items": { "type": "number", "minimum": 0, "maximum": 300 } },
        "width": { "type": "number", "minimum": 0.5, "maximum": 12 },
        "gravity": { "type": "number", "minimum": -2000, "maximum": 2000 },
        "drag": { "type": "number", "minimum": 0, "maximum": 6 },
        "color": { "type": ["string", "array"], "pattern": "^(#[0-9a-fA-F]{6}|rgba\\([0-9]{1,3}, ?[0-9]{1,3}, ?[0-9]{1,3}, ?(0|1|0?\\.[0-9]{1,3})\\))$", "minItems": 1, "maxItems": 6, "items": { "$ref": "common.schema.json#/$defs/color" } },
        "alpha": { "$ref": "common.schema.json#/$defs/pair01" },
        "offset": { "type": "number", "minimum": 0, "maximum": 150 },
        "offsetXY": { "type": "array", "minItems": 2, "maxItems": 2, "items": { "type": "number", "minimum": -150, "maximum": 150 } },
        "spreadY": { "type": "number", "minimum": 0, "maximum": 200 },
        "vrot": { "type": ["number", "array"], "minimum": -1000, "maximum": 1000, "minItems": 2, "maxItems": 2, "items": { "type": "number", "minimum": -1000, "maximum": 1000 } },
        "attach": { "$ref": "common.schema.json#/$defs/joint" },
        "orbit": {
          "type": "object", "required": ["r", "w"], "additionalProperties": false,
          "properties": { "r": { "type": "number", "minimum": 0, "maximum": 120 }, "w": { "type": "number", "minimum": -12, "maximum": 12 } }
        },
        "glyph": { "enum": ["drop", "anger", "heart", "exclaim", "question", "zzz", "word"] },
        "text": { "type": "string", "minLength": 1, "maxLength": 8, "pattern": "^[A-Z][A-Z!?]{0,7}$" },
        "tintable": { "type": "boolean" }
      }
    }
  }
}
```

Semantic rules: a preset has at least one of `layers`, `trail`, `flash`, `glow`, `sustain` (`afterimage` and `slash_arc` in the base catalog are trails only); `glyph` only with `shape: "glyph"`, `text` only with `glyph: "word"` (and checked as on-screen text in step 10); the sum of `count` over a preset's layers is at most 120; a sustained preset emits at most `rate × duration ≤ 60` bursts.

### 4.10 `themes.schema.json` (`world/themes.json`)

Each layer kind is one branch, holding exactly the fields its generator and drawer read (`background.js`, `background_kinds.js`). Fields that drive a loop over the stage (`spacing`, `step`, `wavelength`, `minW`) or an array length (`count`, `rows`) have minimums or maximums that keep the geometry under about 400 items per layer.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "themes.schema.json",
  "title": "world/themes.json: themes built from the existing layer kinds.",
  "type": "object",
  "maxProperties": 8,
  "propertyNames": { "$ref": "common.schema.json#/$defs/ownName" },
  "additionalProperties": { "$ref": "#/$defs/theme" },
  "$defs": {
    "c": { "$ref": "common.schema.json#/$defs/color" },
    "f": { "$ref": "common.schema.json#/$defs/factor" },
    "u": { "$ref": "common.schema.json#/$defs/unit" },
    "up": { "type": "number", "minimum": -1400, "maximum": 0, "description": "World y above the ground line (negative is up)." },
    "theme": {
      "type": "object",
      "required": ["description", "tags", "sky", "ground", "layers", "characterBg"],
      "additionalProperties": false,
      "properties": {
        "description": { "$ref": "common.schema.json#/$defs/description" },
        "tags": { "$ref": "common.schema.json#/$defs/tags" },
        "sky": { "type": "object", "required": ["top", "bottom"], "additionalProperties": false, "properties": { "top": { "$ref": "common.schema.json#/$defs/hex" }, "bottom": { "$ref": "common.schema.json#/$defs/hex" } } },
        "ground": { "type": "object", "required": ["color", "line"], "additionalProperties": false, "properties": { "color": { "$ref": "common.schema.json#/$defs/hex" }, "line": { "$ref": "common.schema.json#/$defs/hex" } } },
        "characterBg": { "$ref": "common.schema.json#/$defs/hex" },
        "layers": {
          "type": "array", "maxItems": 12,
          "items": {
            "x-discriminator": "kind",
            "oneOf": [
              { "$ref": "#/$defs/sun" }, { "$ref": "#/$defs/stars" }, { "$ref": "#/$defs/mountains" }, { "$ref": "#/$defs/dunes" },
              { "$ref": "#/$defs/skyline" }, { "$ref": "#/$defs/wall" }, { "$ref": "#/$defs/lanterns" }, { "$ref": "#/$defs/crowd" },
              { "$ref": "#/$defs/spotlights" }, { "$ref": "#/$defs/floorGrid" }, { "$ref": "#/$defs/floorStripes" }, { "$ref": "#/$defs/snowfall" },
              { "$ref": "#/$defs/planks" }, { "$ref": "#/$defs/clouds" }, { "$ref": "#/$defs/trees" }, { "$ref": "#/$defs/bushes" },
              { "$ref": "#/$defs/buildings" }, { "$ref": "#/$defs/lampposts" }, { "$ref": "#/$defs/fence" }, { "$ref": "#/$defs/bricks" },
              { "$ref": "#/$defs/interior_wall" }, { "$ref": "#/$defs/windows" }, { "$ref": "#/$defs/furniture" }, { "$ref": "#/$defs/cave" },
              { "$ref": "#/$defs/crystals" }, { "$ref": "#/$defs/puddles" }, { "$ref": "#/$defs/hills" }, { "$ref": "#/$defs/huts" },
              { "$ref": "#/$defs/bunting" }, { "$ref": "#/$defs/banyan" }, { "$ref": "#/$defs/pillars" }, { "$ref": "#/$defs/mist" }, { "$ref": "#/$defs/vines" }, { "$ref": "#/$defs/ferns" }, { "$ref": "#/$defs/fort_wall" }, { "$ref": "#/$defs/shelves" }, { "$ref": "#/$defs/water" }, { "$ref": "#/$defs/huts_stilts" } ]
          }
        }
      }
    },
    "sun": { "type": "object", "required": ["kind", "x", "y", "r", "color", "glow", "factor"], "additionalProperties": false, "properties": { "kind": { "const": "sun" }, "x": { "$ref": "#/$defs/u" }, "y": { "$ref": "#/$defs/u" }, "r": { "type": "number", "minimum": 10, "maximum": 300 }, "color": { "$ref": "#/$defs/c" }, "glow": { "$ref": "#/$defs/c" }, "factor": { "$ref": "#/$defs/f" } } },
    "stars": { "type": "object", "required": ["kind", "count", "color"], "additionalProperties": false, "properties": { "kind": { "const": "stars" }, "count": { "type": "integer", "minimum": 1, "maximum": 300 }, "top": { "$ref": "#/$defs/u" }, "color": { "$ref": "#/$defs/c" } } },
    "mountains": { "type": "object", "required": ["kind", "step", "height", "rough", "color", "factor"], "additionalProperties": false, "properties": { "kind": { "const": "mountains" }, "step": { "type": "number", "minimum": 40, "maximum": 800 }, "height": { "type": "number", "minimum": 20, "maximum": 900 }, "rough": { "$ref": "#/$defs/u" }, "caps": { "$ref": "#/$defs/c" }, "color": { "$ref": "#/$defs/c" }, "factor": { "$ref": "#/$defs/f" } } },
    "dunes": { "type": "object", "required": ["kind", "wavelength", "height", "color", "factor"], "additionalProperties": false, "properties": { "kind": { "const": "dunes" }, "wavelength": { "type": "number", "minimum": 320, "maximum": 4000 }, "height": { "type": "number", "minimum": 20, "maximum": 600 }, "color": { "$ref": "#/$defs/c" }, "factor": { "$ref": "#/$defs/f" } } },
    "skyline": { "type": "object", "required": ["kind", "minW", "maxW", "minH", "maxH", "color", "factor"], "additionalProperties": false, "properties": { "kind": { "const": "skyline" }, "minW": { "type": "number", "minimum": 40, "maximum": 600 }, "maxW": { "type": "number", "minimum": 40, "maximum": 800 }, "minH": { "type": "number", "minimum": 40, "maximum": 1200 }, "maxH": { "type": "number", "minimum": 40, "maximum": 1400 }, "lit": { "$ref": "#/$defs/u" }, "windows": { "$ref": "#/$defs/c" }, "color": { "$ref": "#/$defs/c" }, "factor": { "$ref": "#/$defs/f" } } },
    "wall": { "type": "object", "required": ["kind", "top", "spacing", "color", "beam", "factor"], "additionalProperties": false, "properties": { "kind": { "const": "wall" }, "top": { "$ref": "#/$defs/up" }, "spacing": { "type": "number", "minimum": 80, "maximum": 2000 }, "color": { "$ref": "#/$defs/c" }, "beam": { "$ref": "#/$defs/c" }, "factor": { "$ref": "#/$defs/f" } } },
    "lanterns": { "type": "object", "required": ["kind", "spacing", "y", "color", "glow", "factor"], "additionalProperties": false, "properties": { "kind": { "const": "lanterns" }, "spacing": { "type": "number", "minimum": 80, "maximum": 2000 }, "y": { "$ref": "#/$defs/up" }, "color": { "$ref": "#/$defs/c" }, "glow": { "$ref": "#/$defs/c" }, "factor": { "$ref": "#/$defs/f" } } },
    "crowd": { "type": "object", "required": ["kind", "rows", "y", "color", "factor"], "additionalProperties": false, "properties": { "kind": { "const": "crowd" }, "rows": { "type": "integer", "minimum": 1, "maximum": 4 }, "y": { "type": "number", "minimum": -400, "maximum": 0 }, "excite": { "type": "number", "minimum": 0, "maximum": 2 }, "color": { "$ref": "#/$defs/c" }, "factor": { "$ref": "#/$defs/f" } } },
    "spotlights": { "type": "object", "required": ["kind", "at", "color"], "additionalProperties": false, "properties": { "kind": { "const": "spotlights" }, "at": { "type": "array", "minItems": 1, "maxItems": 6, "items": { "$ref": "#/$defs/u" } }, "color": { "$ref": "#/$defs/c" } } },
    "floorGrid": { "type": "object", "required": ["kind", "spacing", "color"], "additionalProperties": false, "properties": { "kind": { "const": "floorGrid" }, "spacing": { "type": "number", "minimum": 40, "maximum": 800 }, "color": { "$ref": "#/$defs/c" } } },
    "floorStripes": { "type": "object", "required": ["kind", "at", "width", "color"], "additionalProperties": false, "properties": { "kind": { "const": "floorStripes" }, "at": { "type": "array", "minItems": 1, "maxItems": 8, "items": { "type": "number", "minimum": 0, "maximum": 400 } }, "width": { "type": "number", "minimum": 1, "maximum": 400 }, "color": { "$ref": "#/$defs/c" } } },
    "snowfall": { "type": "object", "required": ["kind", "count", "speed", "color"], "additionalProperties": false, "properties": { "kind": { "const": "snowfall" }, "count": { "type": "integer", "minimum": 1, "maximum": 300 }, "speed": { "type": "number", "minimum": 10, "maximum": 400 }, "color": { "$ref": "#/$defs/c" } } },
    "planks": { "type": "object", "required": ["kind", "spacing", "color"], "additionalProperties": false, "properties": { "kind": { "const": "planks" }, "spacing": { "type": "number", "minimum": 40, "maximum": 800 }, "color": { "$ref": "#/$defs/c" } } },
    "clouds": { "type": "object", "required": ["kind", "color", "factor"], "additionalProperties": false, "properties": { "kind": { "const": "clouds" }, "count": { "type": "integer", "minimum": 1, "maximum": 20 }, "top": { "$ref": "#/$defs/u" }, "band": { "$ref": "#/$defs/u" }, "color": { "$ref": "#/$defs/c" }, "factor": { "$ref": "#/$defs/f" } } },
    "trees": { "type": "object", "required": ["kind", "spacing", "height", "crown", "color", "trunk", "factor"], "additionalProperties": false, "properties": { "kind": { "const": "trees" }, "spacing": { "type": "number", "minimum": 80, "maximum": 2000 }, "height": { "type": "number", "minimum": 60, "maximum": 900 }, "crown": { "type": "number", "minimum": 20, "maximum": 250 }, "color": { "$ref": "#/$defs/c" }, "color2": { "$ref": "#/$defs/c" }, "trunk": { "$ref": "#/$defs/c" }, "factor": { "$ref": "#/$defs/f" } } },
    "bushes": { "type": "object", "required": ["kind", "spacing", "size", "color", "factor"], "additionalProperties": false, "properties": { "kind": { "const": "bushes" }, "spacing": { "type": "number", "minimum": 60, "maximum": 2000 }, "size": { "type": "number", "minimum": 10, "maximum": 150 }, "y": { "type": "number", "minimum": -400, "maximum": 0 }, "color": { "$ref": "#/$defs/c" }, "factor": { "$ref": "#/$defs/f" } } },
    "buildings": { "type": "object", "required": ["kind", "minW", "maxW", "minH", "maxH", "palette", "window", "door", "awning", "factor"], "additionalProperties": false, "properties": { "kind": { "const": "buildings" }, "minW": { "type": "number", "minimum": 80, "maximum": 600 }, "maxW": { "type": "number", "minimum": 80, "maximum": 800 }, "minH": { "type": "number", "minimum": 160, "maximum": 1200 }, "maxH": { "type": "number", "minimum": 160, "maximum": 1400 }, "gap": { "type": "number", "minimum": 0, "maximum": 200 }, "palette": { "type": "array", "minItems": 1, "maxItems": 6, "items": { "$ref": "#/$defs/c" } }, "window": { "$ref": "#/$defs/c" }, "door": { "$ref": "#/$defs/c" }, "awning": { "$ref": "#/$defs/c" }, "factor": { "$ref": "#/$defs/f" } } },
    "lampposts": { "type": "object", "required": ["kind", "spacing", "height", "color", "glow", "light", "factor"], "additionalProperties": false, "properties": { "kind": { "const": "lampposts" }, "spacing": { "type": "number", "minimum": 120, "maximum": 2000 }, "height": { "type": "number", "minimum": 100, "maximum": 700 }, "color": { "$ref": "#/$defs/c" }, "glow": { "$ref": "#/$defs/c" }, "light": { "$ref": "#/$defs/c" }, "factor": { "$ref": "#/$defs/f" } } },
    "fence": { "type": "object", "required": ["kind", "spacing", "height", "color", "factor"], "additionalProperties": false, "properties": { "kind": { "const": "fence" }, "spacing": { "type": "number", "minimum": 24, "maximum": 400 }, "height": { "type": "number", "minimum": 30, "maximum": 300 }, "color": { "$ref": "#/$defs/c" }, "factor": { "$ref": "#/$defs/f" } } },
    "bricks": { "type": "object", "required": ["kind", "top", "color", "mortar", "factor"], "additionalProperties": false, "properties": { "kind": { "const": "bricks" }, "top": { "type": "number", "minimum": -1400, "maximum": -50 }, "color": { "$ref": "#/$defs/c" }, "mortar": { "$ref": "#/$defs/c" }, "escape": { "$ref": "#/$defs/c" }, "factor": { "$ref": "#/$defs/f" } } },
    "interior_wall": { "type": "object", "required": ["kind", "ceiling", "color", "stripe", "trim", "factor"], "additionalProperties": false, "properties": { "kind": { "const": "interior_wall" }, "ceiling": { "type": "number", "minimum": -1400, "maximum": -200 }, "color": { "$ref": "#/$defs/c" }, "stripe": { "$ref": "#/$defs/c" }, "trim": { "$ref": "#/$defs/c" }, "factor": { "$ref": "#/$defs/f" } } },
    "windows": { "type": "object", "required": ["kind", "spacing", "y", "w", "h", "frame", "skyTop", "skyBottom", "curtain", "factor"], "additionalProperties": false, "properties": { "kind": { "const": "windows" }, "spacing": { "type": "number", "minimum": 150, "maximum": 2000 }, "y": { "type": "number", "minimum": -1200, "maximum": -50 }, "w": { "type": "number", "minimum": 40, "maximum": 500 }, "h": { "type": "number", "minimum": 40, "maximum": 600 }, "frame": { "$ref": "#/$defs/c" }, "skyTop": { "$ref": "#/$defs/c" }, "skyBottom": { "$ref": "#/$defs/c" }, "curtain": { "$ref": "#/$defs/c" }, "factor": { "$ref": "#/$defs/f" } } },
    "furniture": { "type": "object", "required": ["kind", "spacing", "color", "accent", "leaf", "factor"], "additionalProperties": false, "properties": { "kind": { "const": "furniture" }, "spacing": { "type": "number", "minimum": 200, "maximum": 3000 }, "color": { "$ref": "#/$defs/c" }, "accent": { "$ref": "#/$defs/c" }, "leaf": { "$ref": "#/$defs/c" }, "factor": { "$ref": "#/$defs/f" } } },
    "cave": { "type": "object", "required": ["kind", "step", "depth", "rocks", "ceiling", "wall", "color", "factor"], "additionalProperties": false, "properties": { "kind": { "const": "cave" }, "step": { "type": "number", "minimum": 40, "maximum": 800 }, "depth": { "type": "number", "minimum": 10, "maximum": 400 }, "rocks": { "type": "number", "minimum": 10, "maximum": 400 }, "ceiling": { "type": "number", "minimum": -1400, "maximum": -100 }, "wall": { "$ref": "#/$defs/c" }, "color": { "$ref": "#/$defs/c" }, "factor": { "$ref": "#/$defs/f" } } },
    "crystals": { "type": "object", "required": ["kind", "spacing", "height", "color", "glow", "factor"], "additionalProperties": false, "properties": { "kind": { "const": "crystals" }, "spacing": { "type": "number", "minimum": 60, "maximum": 2000 }, "height": { "type": "number", "minimum": 20, "maximum": 400 }, "color": { "$ref": "#/$defs/c" }, "glow": { "$ref": "common.schema.json#/$defs/pulseColor" }, "factor": { "$ref": "#/$defs/f" } } },
    "puddles": { "type": "object", "required": ["kind", "spacing", "color"], "additionalProperties": false, "properties": { "kind": { "const": "puddles" }, "spacing": { "type": "number", "minimum": 80, "maximum": 2000 }, "color": { "$ref": "#/$defs/c" } } },
    "hills": { "type": "object", "required": ["kind", "step", "height", "color", "factor"], "additionalProperties": false, "properties": { "kind": { "const": "hills" }, "step": { "type": "number", "minimum": 40, "maximum": 800 }, "height": { "type": "number", "minimum": 20, "maximum": 900 }, "color": { "$ref": "#/$defs/c" }, "factor": { "$ref": "#/$defs/f" } } },
    "huts": { "type": "object", "required": ["kind", "size", "spacing", "walls", "doors", "thatch", "factor"], "additionalProperties": false, "properties": { "kind": { "const": "huts" }, "size": { "type": "number", "minimum": 40, "maximum": 600 }, "spacing": { "type": "number", "minimum": 80, "maximum": 3000 }, "scale": { "type": "number", "minimum": 0.05, "maximum": 2 }, "y": { "$ref": "#/$defs/up" }, "walls": { "type": "array", "minItems": 1, "maxItems": 6, "items": { "$ref": "#/$defs/c" } }, "doors": { "type": "array", "minItems": 1, "maxItems": 6, "items": { "$ref": "#/$defs/c" } }, "thatch": { "$ref": "#/$defs/c" }, "thatch2": { "$ref": "#/$defs/c" }, "band": { "$ref": "#/$defs/c" }, "frame": { "$ref": "#/$defs/c" }, "factor": { "$ref": "#/$defs/f" } } },
    "bunting": { "type": "object", "required": ["kind", "y", "spacing", "colors", "factor"], "additionalProperties": false, "properties": { "kind": { "const": "bunting" }, "y": { "$ref": "#/$defs/up" }, "spacing": { "type": "number", "minimum": 120, "maximum": 2000 }, "sag": { "type": "number", "minimum": 0, "maximum": 300 }, "vary": { "type": "number", "minimum": 0, "maximum": 200 }, "flag": { "type": "number", "minimum": 6, "maximum": 80 }, "line": { "$ref": "#/$defs/c" }, "pole": { "$ref": "#/$defs/c" }, "colors": { "type": "array", "minItems": 1, "maxItems": 8, "items": { "$ref": "#/$defs/c" } }, "factor": { "$ref": "#/$defs/f" } } },
    "banyan": { "type": "object", "required": ["kind", "at", "height", "spread", "trunk", "color", "factor"], "additionalProperties": false, "properties": { "kind": { "const": "banyan" }, "at": { "type": "array", "minItems": 1, "maxItems": 6, "items": { "type": "number", "minimum": -2400, "maximum": 12400 } }, "scale": { "type": "number", "minimum": 0.1, "maximum": 2 }, "height": { "type": "number", "minimum": 100, "maximum": 1000 }, "spread": { "type": "number", "minimum": 100, "maximum": 1600 }, "trunk": { "$ref": "#/$defs/c" }, "trunk2": { "$ref": "#/$defs/c" }, "roots": { "$ref": "#/$defs/c" }, "color": { "$ref": "#/$defs/c" }, "color2": { "$ref": "#/$defs/c" }, "color3": { "$ref": "#/$defs/c" }, "factor": { "$ref": "#/$defs/f" } } },
    "pillars": { "type": "object", "required": ["kind", "spacing", "top", "wall", "color", "factor"], "additionalProperties": false, "properties": { "kind": { "const": "pillars" }, "spacing": { "type": "number", "minimum": 150, "maximum": 2000 }, "width": { "type": "number", "minimum": 20, "maximum": 300 }, "top": { "type": "number", "minimum": -1400, "maximum": -100 }, "wall": { "$ref": "#/$defs/c" }, "color": { "$ref": "#/$defs/c" }, "color2": { "$ref": "#/$defs/c" }, "cap": { "$ref": "#/$defs/c" }, "beam": { "$ref": "#/$defs/c" }, "window": { "$ref": "#/$defs/c" }, "glow": { "$ref": "#/$defs/c" }, "windowW": { "type": "number", "minimum": 20, "maximum": 600 }, "windowH": { "type": "number", "minimum": 20, "maximum": 900 }, "windowY": { "$ref": "#/$defs/up" }, "factor": { "$ref": "#/$defs/f" } } },
    "mist": { "type": "object", "required": ["kind", "color"], "additionalProperties": false, "properties": { "kind": { "const": "mist" }, "spacing": { "type": "number", "minimum": 40, "maximum": 2000 }, "size": { "type": "number", "minimum": 20, "maximum": 600 }, "depth": { "type": "number", "minimum": 0, "maximum": 400 }, "speed": { "type": "number", "minimum": 0, "maximum": 200 }, "color": { "$ref": "#/$defs/c" }, "factor": { "$ref": "#/$defs/f" } } },
    "vines": { "type": "object", "required": ["kind", "spacing", "length", "color", "factor"], "additionalProperties": false, "properties": { "kind": { "const": "vines" }, "spacing": { "type": "number", "minimum": 40, "maximum": 2000 }, "length": { "type": "number", "minimum": 50, "maximum": 1400 }, "top": { "type": "number", "minimum": -1600, "maximum": -100 }, "width": { "type": "number", "minimum": 1, "maximum": 20 }, "sway": { "type": "number", "minimum": 0, "maximum": 80 }, "color": { "$ref": "#/$defs/c" }, "leaf": { "$ref": "#/$defs/c" }, "factor": { "$ref": "#/$defs/f" } } },
    "ferns": { "type": "object", "required": ["kind", "spacing", "size", "color", "factor"], "additionalProperties": false, "properties": { "kind": { "const": "ferns" }, "spacing": { "type": "number", "minimum": 40, "maximum": 2000 }, "size": { "type": "number", "minimum": 10, "maximum": 300 }, "mushrooms": { "type": "number", "minimum": 0, "maximum": 1 }, "color": { "$ref": "#/$defs/c" }, "cap": { "$ref": "#/$defs/c" }, "stem": { "$ref": "#/$defs/c" }, "factor": { "$ref": "#/$defs/f" } } },
    "fort_wall": { "type": "object", "required": ["kind", "spacing", "height", "color", "factor"], "additionalProperties": false, "properties": { "kind": { "const": "fort_wall" }, "spacing": { "type": "number", "minimum": 200, "maximum": 3000 }, "height": { "type": "number", "minimum": 50, "maximum": 1200 }, "merlon": { "type": "number", "minimum": 10, "maximum": 200 }, "gates": { "type": "array", "maxItems": 6, "items": { "type": "number", "minimum": -2400, "maximum": 12400 } }, "gateW": { "type": "number", "minimum": 40, "maximum": 800 }, "color": { "$ref": "#/$defs/c" }, "line": { "$ref": "#/$defs/c" }, "gate": { "$ref": "#/$defs/c" }, "chillies": { "$ref": "#/$defs/c" }, "factor": { "$ref": "#/$defs/f" } } },
    "shelves": { "type": "object", "required": ["kind", "spacing", "colors", "color", "factor"], "additionalProperties": false, "properties": { "kind": { "const": "shelves" }, "spacing": { "type": "number", "minimum": 200, "maximum": 2000 }, "top": { "type": "number", "minimum": -1400, "maximum": -100 }, "gap": { "type": "number", "minimum": 60, "maximum": 400 }, "rows": { "type": "integer", "minimum": 1, "maximum": 6 }, "colors": { "type": "array", "minItems": 1, "maxItems": 8, "items": { "$ref": "#/$defs/c" } }, "color": { "$ref": "#/$defs/c" }, "lid": { "$ref": "#/$defs/c" }, "sack": { "$ref": "#/$defs/c" }, "factor": { "$ref": "#/$defs/f" } } },
    "water": { "type": "object", "required": ["kind", "spacing", "color", "factor"], "additionalProperties": false, "properties": { "kind": { "const": "water" }, "spacing": { "type": "number", "minimum": 40, "maximum": 2000 }, "top": { "type": "number", "minimum": -1400, "maximum": 0 }, "bottom": { "type": "number", "minimum": -1400, "maximum": 400 }, "flowers": { "type": "number", "minimum": 0, "maximum": 1 }, "color": { "$ref": "#/$defs/c" }, "color2": { "$ref": "#/$defs/c" }, "wave": { "$ref": "#/$defs/c" }, "leaf": { "$ref": "#/$defs/c" }, "flower": { "$ref": "#/$defs/c" }, "factor": { "$ref": "#/$defs/f" } } },
    "huts_stilts": { "type": "object", "required": ["kind", "spacing", "size", "factor"], "additionalProperties": false, "properties": { "kind": { "const": "huts_stilts" }, "spacing": { "type": "number", "minimum": 200, "maximum": 4000 }, "size": { "type": "number", "minimum": 40, "maximum": 600 }, "y": { "type": "number", "minimum": -800, "maximum": 0 }, "wood": { "$ref": "#/$defs/c" }, "wall": { "$ref": "#/$defs/c" }, "roof": { "$ref": "#/$defs/c" }, "doors": { "type": "array", "minItems": 1, "maxItems": 8, "items": { "$ref": "#/$defs/c" } }, "factor": { "$ref": "#/$defs/f" } } }
  }
}
```

Semantic rules: `maxW >= minW`, `maxH >= minH`; the theme's character colours are checked for contrast as base themes are (`W_CONTRAST` against `characterBg`, informative).

### 4.11 `objects.schema.json` (`world/objects.json`)

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "objects.schema.json",
  "title": "world/objects.json: objects with an existing behavior, drawn by an existing shape or by paths.",
  "type": "object",
  "maxProperties": 32,
  "propertyNames": { "$ref": "common.schema.json#/$defs/ownName" },
  "additionalProperties": {
    "x-discriminator": "behavior",
    "oneOf": [{ "$ref": "#/$defs/static" }, { "$ref": "#/$defs/seat" }, { "$ref": "#/$defs/holdable" }, { "$ref": "#/$defs/ball" }, { "$ref": "#/$defs/floater" }, { "$ref": "#/$defs/vehicle" }, { "$ref": "#/$defs/breakable" }]
  },
  "$defs": {
    "d": { "$ref": "common.schema.json#/$defs/description" },
    "t": { "$ref": "common.schema.json#/$defs/tags" },
    "size": { "type": "number", "minimum": 10, "maximum": 800 },
    "colors": {
      "type": "object", "maxProperties": 12,
      "propertyNames": { "$ref": "common.schema.json#/$defs/localName" },
      "additionalProperties": { "$ref": "common.schema.json#/$defs/color" },
      "description": "For a shape: exactly the keys that shape reads (table in 4.11). For paths: the palette that \"colors.<key>\" names."
    },
    "shape": { "enum": ["bench", "chair", "table", "tree", "bush", "lamppost", "net", "sign", "crate", "fountain", "cage", "box", "car", "bike", "ball", "football", "bubble", "balloon", "door", "haystack", "cart", "market_stall", "basket", "kite", "apple", "bus", "campfire", "giant_pot", "lever", "trapdoor", "rope_bridge", "crystal_socket", "throne", "crystal_ball", "paths"] },
    "paths": {
      "type": "array", "minItems": 1, "maxItems": 64,
      "items": {
        "type": "object", "required": ["d"], "additionalProperties": false,
        "properties": {
          "d": { "type": "array", "minItems": 2, "maxItems": 400, "items": { "type": "array", "minItems": 1, "maxItems": 7, "items": { "type": ["string", "number"], "pattern": "^[MLCQZ]$", "minimum": -1200, "maximum": 1200 } } },
          "fill": { "type": "string", "pattern": "^(none|colors\\.[a-z][a-z0-9_]{0,31}|#[0-9a-fA-F]{6}|rgba\\([0-9]{1,3}, ?[0-9]{1,3}, ?[0-9]{1,3}, ?(0|1|0?\\.[0-9]{1,3})\\))$" },
          "stroke": { "type": "string", "pattern": "^(none|colors\\.[a-z][a-z0-9_]{0,31}|#[0-9a-fA-F]{6}|rgba\\([0-9]{1,3}, ?[0-9]{1,3}, ?[0-9]{1,3}, ?(0|1|0?\\.[0-9]{1,3})\\))$" },
          "width": { "type": "number", "minimum": 0.5, "maximum": 20 }
        }
      }
    },
    "hold": {
      "type": "object", "required": ["kind", "shape", "len", "width", "gripAt", "grip", "color", "trim", "hitRadius"], "additionalProperties": false,
      "properties": {
        "kind": { "$ref": "common.schema.json#/$defs/ref" },
        "shape": { "enum": ["sword", "club", "bat", "staff", "disc", "blaster", "racket", "wand", "phone", "book", "ice_cream", "flower", "rope", "cane", "balloon", "crystal", "horn", "jalebi", "plate", "apple", "kite", "basket", "ladle"] },
        "len": { "type": "number", "minimum": 8, "maximum": 200 },
        "width": { "type": "number", "minimum": 1, "maximum": 40 },
        "gripAt": { "$ref": "common.schema.json#/$defs/unit" },
        "grip": { "enum": ["rHand", "lHand"] },
        "color": { "$ref": "common.schema.json#/$defs/hex" },
        "trim": { "$ref": "common.schema.json#/$defs/hex" },
        "hitRadius": { "type": "number", "minimum": 4, "maximum": 40 }
      }
    },
    "static": { "type": "object", "required": ["description", "tags", "behavior", "draw", "w", "h"], "additionalProperties": false, "properties": { "description": { "$ref": "#/$defs/d" }, "tags": { "$ref": "#/$defs/t" }, "behavior": { "const": "static" }, "draw": { "$ref": "#/$defs/shape" }, "animated": { "type": "boolean" }, "w": { "$ref": "#/$defs/size" }, "h": { "$ref": "#/$defs/size" }, "colors": { "$ref": "#/$defs/colors" }, "paths": { "$ref": "#/$defs/paths" }, "states": { "type": "array", "minItems": 2, "maxItems": 8, "uniqueItems": true, "items": { "$ref": "common.schema.json#/$defs/localName" } }, "sfx": { "type": "object", "maxProperties": 4, "propertyNames": { "$ref": "common.schema.json#/$defs/localName" }, "additionalProperties": { "$ref": "common.schema.json#/$defs/sfxKey" } } } },
    "seat": { "type": "object", "required": ["description", "tags", "behavior", "draw", "w", "h", "seatY", "slots"], "additionalProperties": false, "properties": { "description": { "$ref": "#/$defs/d" }, "tags": { "$ref": "#/$defs/t" }, "behavior": { "const": "seat" }, "draw": { "$ref": "#/$defs/shape" }, "w": { "$ref": "#/$defs/size" }, "h": { "$ref": "#/$defs/size" }, "seatY": { "type": "number", "minimum": 20, "maximum": 200 }, "slots": { "type": "array", "minItems": 1, "maxItems": 4, "items": { "type": "number", "minimum": -200, "maximum": 200 } }, "colors": { "$ref": "#/$defs/colors" }, "paths": { "$ref": "#/$defs/paths" } } },
    "holdable": { "type": "object", "required": ["description", "tags", "behavior", "draw", "hold"], "additionalProperties": false, "properties": { "description": { "$ref": "#/$defs/d" }, "tags": { "$ref": "#/$defs/t" }, "behavior": { "const": "holdable" }, "draw": { "const": "held" }, "hold": { "$ref": "#/$defs/hold" }, "states": { "type": "array", "minItems": 2, "maxItems": 8, "uniqueItems": true, "items": { "$ref": "common.schema.json#/$defs/localName" } }, "sfx": { "type": "object", "maxProperties": 8, "propertyNames": { "$ref": "common.schema.json#/$defs/localName" }, "additionalProperties": { "$ref": "common.schema.json#/$defs/sfxKey" } }, "use": { "type": "object", "additionalProperties": false, "minProperties": 1, "properties": { "spawn": { "$ref": "common.schema.json#/$defs/ref" }, "count": { "type": "array", "minItems": 2, "maxItems": 2, "items": { "type": "integer", "minimum": 1, "maximum": 8 } }, "fx": { "type": "array", "minItems": 1, "maxItems": 2, "items": { "$ref": "common.schema.json#/$defs/ref" } }, "sfx": { "$ref": "common.schema.json#/$defs/sfxKey" } } } } },
    "ball": { "type": "object", "required": ["description", "tags", "behavior", "draw", "r"], "additionalProperties": false, "properties": { "description": { "$ref": "#/$defs/d" }, "tags": { "$ref": "#/$defs/t" }, "behavior": { "const": "ball" }, "draw": { "enum": ["ball", "football", "apple", "paths"] }, "r": { "type": "number", "minimum": 4, "maximum": 60 }, "bounce": { "type": "number", "minimum": 0, "maximum": 0.95 }, "colors": { "$ref": "#/$defs/colors" }, "paths": { "$ref": "#/$defs/paths" }, "hold": { "$ref": "#/$defs/hold" } } },
    "floater": { "type": "object", "required": ["description", "tags", "behavior", "draw", "r", "life", "rise", "drift", "wobble", "pop"], "additionalProperties": false, "properties": { "description": { "$ref": "#/$defs/d" }, "tags": { "$ref": "#/$defs/t" }, "behavior": { "const": "floater" }, "draw": { "enum": ["bubble", "balloon", "kite", "paths"] }, "r": { "type": "number", "minimum": 4, "maximum": 80 }, "life": { "type": "array", "minItems": 2, "maxItems": 2, "items": { "type": "number", "minimum": 0.5, "maximum": 15 } }, "rise": { "type": "number", "minimum": 0, "maximum": 300 }, "drift": { "type": "number", "minimum": 0, "maximum": 200 }, "wobble": { "type": "number", "minimum": 0, "maximum": 60 }, "pop": { "type": "boolean" }, "colors": { "$ref": "#/$defs/colors" }, "paths": { "$ref": "#/$defs/paths" }, "hold": { "$ref": "#/$defs/hold" } } },
    "vehicle": { "type": "object", "required": ["description", "tags", "behavior", "draw", "w", "h", "wheelR", "seat", "speed"], "additionalProperties": false, "properties": { "description": { "$ref": "#/$defs/d" }, "tags": { "$ref": "#/$defs/t" }, "behavior": { "const": "vehicle" }, "draw": { "enum": ["car", "bike", "cart", "bus"] }, "w": { "$ref": "#/$defs/size" }, "h": { "$ref": "#/$defs/size" }, "wheelR": { "type": "number", "minimum": 8, "maximum": 60 }, "seat": { "type": "object", "required": ["x", "y"], "additionalProperties": false, "properties": { "x": { "type": "number", "minimum": -400, "maximum": 400 }, "y": { "type": "number", "minimum": 0, "maximum": 300 } } }, "speed": { "type": "number", "minimum": 20, "maximum": 1200 }, "colors": { "$ref": "#/$defs/colors" } } },
    "breakable": { "type": "object", "required": ["description", "tags", "behavior", "draw", "w", "h", "states"], "additionalProperties": false, "properties": { "description": { "$ref": "#/$defs/d" }, "tags": { "$ref": "#/$defs/t" }, "behavior": { "const": "breakable" }, "draw": { "$ref": "#/$defs/shape" }, "w": { "$ref": "#/$defs/size" }, "h": { "$ref": "#/$defs/size" }, "states": { "type": "array", "minItems": 2, "maxItems": 2, "items": { "enum": ["whole", "broken"] } }, "colors": { "$ref": "#/$defs/colors" }, "paths": { "$ref": "#/$defs/paths" }, "hold": { "$ref": "#/$defs/hold" } } }
  }
}
```

Colour keys per shape (step 11 checks `colors` has exactly these when `draw` is a shape):

| Shape | Keys | Shape | Keys |
|---|---|---|---|
| bench | wood, metal | cage | bar, base |
| chair, table | wood | box | card, tape |
| tree | leaves, leaves2, trunk | car | body, window, wheel |
| bush | leaves, leaves2 | bike | frame, wheel |
| lamppost | light, metal | ball | fill, seam |
| net | net, post | football | fill, patch |
| sign | board, post | bubble | rim, shine |
| crate | wood, dark | balloon | fill |
| fountain | stone, water | door | door, frame |
| crystal_socket | wood, rim, hollow, and one per state colour (red ... violet) | throne | frame, cushion, horn, gem |
| crystal_ball | stand, trim, ball, swirl, glow | | |

Semantic rules: `paths` is present exactly when `draw` is `"paths"`; each path command has the arity of its letter (`M`/`L` 2 numbers, `Q` 4, `C` 6, `Z` none) and starts with `M`; every `colors.<key>` a path names exists in `colors`; `cage` and `door` use their `states` (`cage` reads the state, `door` open/closed); `use.spawn` names a ball or floater object; the bundle total of path commands is at most 4,000 (step 9).

### 4.12 `props.schema.json` (`world/props.json`)

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "props.schema.json",
  "title": "world/props.json: v1 holdable props drawn by an existing prop shape.",
  "type": "object",
  "maxProperties": 8,
  "propertyNames": { "$ref": "common.schema.json#/$defs/ownName" },
  "additionalProperties": {
    "type": "object",
    "required": ["description", "tags", "kind", "shape", "len", "width", "gripAt", "grip", "color", "trim", "hitRadius"],
    "additionalProperties": false,
    "properties": {
      "description": { "$ref": "common.schema.json#/$defs/description" },
      "tags": { "$ref": "common.schema.json#/$defs/tags" },
      "kind": { "$ref": "common.schema.json#/$defs/ref" },
      "shape": { "enum": ["sword", "club", "bat", "staff", "disc", "blaster", "racket", "wand", "phone", "book", "ice_cream", "flower", "rope", "cane", "balloon", "crystal", "horn", "jalebi", "plate", "apple", "kite", "basket", "ladle"] },
      "len": { "type": "number", "minimum": 8, "maximum": 200 },
      "width": { "type": "number", "minimum": 1, "maximum": 40 },
      "gripAt": { "$ref": "common.schema.json#/$defs/unit" },
      "grip": { "enum": ["rHand", "lHand"] },
      "color": { "$ref": "common.schema.json#/$defs/hex" },
      "trim": { "$ref": "common.schema.json#/$defs/hex" },
      "hitRadius": { "type": "number", "minimum": 4, "maximum": 40 },
      "twoHand": { "type": "boolean", "description": "Spec 12; documented but not read by the engine today." }
    }
  }
}
```

A prop's `kind` is either an existing base kind (so existing armed moves play with it) or a namespaced kind of this bundle (then the bundle should add moves with that `needsProp`).

### 4.13 `activities.schema.json` (`story/activities.json`)

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "activities.schema.json",
  "title": "story/activities.json: activities for the loop and rally runners.",
  "type": "object",
  "maxProperties": 8,
  "propertyNames": { "$ref": "common.schema.json#/$defs/ownName" },
  "additionalProperties": {
    "type": "object",
    "required": ["description", "tags", "runner", "players", "facing", "ending", "roles"],
    "additionalProperties": false,
    "properties": {
      "description": { "$ref": "common.schema.json#/$defs/description" },
      "tags": { "$ref": "common.schema.json#/$defs/tags" },
      "runner": { "enum": ["loop", "rally"] },
      "players": { "type": "array", "minItems": 2, "maxItems": 2, "items": { "type": "integer", "minimum": 1, "maximum": 4 } },
      "spacing": { "type": "number", "minimum": 60, "maximum": 800 },
      "facing": { "enum": ["center", "left", "right"] },
      "dur": { "type": "number", "minimum": 1, "maximum": 30 },
      "reps": { "type": "integer", "minimum": 1, "maximum": 20 },
      "ending": { "enum": ["win", "miss", "laugh", "hug", "none"] },
      "objects": { "type": "array", "maxItems": 3, "uniqueItems": true, "items": { "$ref": "common.schema.json#/$defs/ref" } },
      "roles": {
        "type": "array", "minItems": 1, "maxItems": 4,
        "items": {
          "type": "object", "additionalProperties": false, "minProperties": 1,
          "properties": {
            "start": { "$ref": "common.schema.json#/$defs/ref" },
            "moves": { "type": "array", "minItems": 0, "maxItems": 4, "items": { "$ref": "common.schema.json#/$defs/ref" }, "description": "Empty: the role only reacts (face, fx)." },
            "wait": { "type": "number", "minimum": 0, "maximum": 3 },
            "face": { "$ref": "common.schema.json#/$defs/ref" },
            "fx": { "$ref": "common.schema.json#/$defs/ref", "description": "One FX preset, played once (activities.js)." },
            "holds": { "$ref": "common.schema.json#/$defs/ref" },
            "partner": { "type": "integer", "minimum": 0, "maximum": 3 }
          }
        }
      },
      "rally": {
        "type": "object", "required": ["ball", "hit", "at", "flight", "height"], "additionalProperties": false,
        "properties": {
          "ball": { "$ref": "common.schema.json#/$defs/ref" },
          "hit": { "type": "array", "minItems": 1, "maxItems": 3, "items": { "$ref": "common.schema.json#/$defs/ref" } },
          "at": { "enum": ["hands", "foot", "propTip"] },
          "flight": { "type": "number", "minimum": 0.3, "maximum": 2 },
          "height": { "type": "number", "minimum": 0, "maximum": 400, "description": "Arc height in px; 0 rolls along the floor (kick_ball)." },
          "catch": { "$ref": "common.schema.json#/$defs/ref" }
        }
      }
    }
  }
}
```

Semantic rules: `rally` exactly when `runner` is `rally`; `dur` or `reps`, not both; `players[0] <= players[1]`; `rally.ball` is a `ball` object; `holds` is a holdable or prop; role moves are humanoid moves (activities with animals stay built-in in v1).

### 4.14 `music_moods.schema.json` (`story/music_moods.json`)

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "music_moods.schema.json",
  "title": "story/music_moods.json: scales and moods for the procedural music generator.",
  "type": "object",
  "required": ["moods"],
  "additionalProperties": false,
  "properties": {
    "scales": {
      "type": "object", "maxProperties": 4,
      "propertyNames": { "$ref": "common.schema.json#/$defs/ownName" },
      "additionalProperties": { "type": "array", "minItems": 5, "maxItems": 12, "uniqueItems": true, "items": { "type": "integer", "minimum": 0, "maximum": 11 } }
    },
    "moods": {
      "type": "object", "minProperties": 1, "maxProperties": 8,
      "propertyNames": { "$ref": "common.schema.json#/$defs/ownName" },
      "additionalProperties": {
        "type": "object",
        "required": ["description", "tags", "scale", "roots", "tempo", "meter", "swing", "progressions", "bass", "drums", "melody", "arp", "patches", "intensity"],
        "additionalProperties": false,
        "properties": {
          "description": { "$ref": "common.schema.json#/$defs/description" },
          "tags": { "$ref": "common.schema.json#/$defs/tags" },
          "scale": { "$ref": "common.schema.json#/$defs/ref" },
          "melodyScale": { "type": "array", "minItems": 3, "maxItems": 12, "uniqueItems": true, "items": { "type": "integer", "minimum": 0, "maximum": 11 }, "description": "Optional: the notes the melody may use (playful uses a pentatonic)." },
          "roots": { "type": "array", "minItems": 1, "maxItems": 6, "items": { "type": "integer", "minimum": 36, "maximum": 84 } },
          "tempo": { "type": "array", "minItems": 2, "maxItems": 2, "items": { "type": "number", "minimum": 50, "maximum": 180 } },
          "meter": { "enum": [3, 4] },
          "swing": { "type": "number", "minimum": 0, "maximum": 0.5 },
          "progressions": { "type": "array", "minItems": 1, "maxItems": 8, "items": { "type": "array", "minItems": 2, "maxItems": 8, "items": { "type": "integer", "minimum": 0, "maximum": 6 } } },
          "bass": { "type": "array", "minItems": 1, "maxItems": 6, "items": { "type": "string", "pattern": "^[.r5o]{6,8}$" } },
          "drums": {
            "type": "object", "required": ["low", "medium", "high"], "additionalProperties": false,
            "properties": {
              "low": { "type": "array", "minItems": 1, "maxItems": 4, "items": { "type": "string", "pattern": "^[.ksho]{12,16}$" } },
              "medium": { "type": "array", "minItems": 1, "maxItems": 4, "items": { "type": "string", "pattern": "^[.ksho]{12,16}$" } },
              "high": { "type": "array", "minItems": 1, "maxItems": 4, "items": { "type": "string", "pattern": "^[.ksho]{12,16}$" } }
            }
          },
          "melody": {
            "type": "object", "required": ["rhythms", "range", "leap"], "additionalProperties": false,
            "properties": {
              "rhythms": { "type": "array", "minItems": 1, "maxItems": 8, "items": { "type": "string", "pattern": "^[x.-]{6,8}$" } },
              "range": { "type": "array", "minItems": 2, "maxItems": 2, "items": { "type": "integer", "minimum": -7, "maximum": 14 } },
              "leap": { "$ref": "common.schema.json#/$defs/unit" }
            }
          },
          "arp": { "type": "array", "minItems": 1, "maxItems": 16, "items": { "type": "integer", "minimum": 0, "maximum": 7 } },
          "patches": {
            "type": "object", "required": ["lead", "bass", "pad", "arp"], "additionalProperties": false,
            "properties": {
              "lead": { "$ref": "#/$defs/patch" }, "bass": { "$ref": "#/$defs/patch" },
              "pad": { "$ref": "#/$defs/patch" }, "arp": { "$ref": "#/$defs/patch" }
            }
          },
          "intensity": { "$ref": "common.schema.json#/$defs/unit" }
        }
      }
    }
  },
  "$defs": {
    "patch": { "enum": ["square_soft", "square", "toy", "flute", "reed", "brass", "soft_bass", "bouncy_bass", "saw_bass", "pulse_bass", "warm_pad", "soft_pad", "dark_pad", "bell", "music_box", "glass", "pluck", "pluck_high", "pluck_dark"] }
  }
}
```

Semantic rules: bass patterns and melody rhythms have `meter × 2` steps, drum patterns `meter × 4` (the base lullaby in 3/4 uses 6 and 12); `tempo[0] <= tempo[1]`; `scale` names a base scale or one of this file's `scales`.

### 4.15 `examples.schema.json` (`examples/index.json`)

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "examples.schema.json",
  "title": "examples/index.json: the bundle's example scripts.",
  "type": "object",
  "required": ["examples"],
  "additionalProperties": false,
  "properties": {
    "examples": {
      "type": "array", "minItems": 1, "maxItems": 4,
      "items": {
        "type": "object", "required": ["path", "kind", "title", "description", "tags"], "additionalProperties": false,
        "properties": {
          "path": { "type": "string", "pattern": "^(clips|stories)/[a-z][a-z0-9_]{0,31}\\.json$" },
          "kind": { "enum": ["clip", "story"] },
          "title": { "type": "string", "minLength": 1, "maxLength": 80 },
          "description": { "$ref": "common.schema.json#/$defs/description" },
          "tags": { "$ref": "common.schema.json#/$defs/tags" }
        }
      }
    }
  }
}
```

Example scripts themselves are not checked by a bundle schema: they are scripts, checked by the engine's validator (step 11) after the bundle is merged. Each must declare this bundle in `bundles` (section 7), stay under 60 s, and together the examples must use every entry the bundle adds, except presets, which are checked on their own stage (step 11).

### 4.16 Tightening over the base catalog schemas

| Base schema | Bundle schema |
|---|---|
| `described`: `description` and `tags`, any other field | every field typed, ranged and closed (`additionalProperties: false`) |
| `moves`: name, description, tags, category, duration, keys; anything else passes | every move field typed; categories, events and flags reduced; duration 0.2-6; draft rules |
| `poses`: any number per channel | only the 13 channels, ranged |
| `preset`: `cast` only needs `color` | `cast` fully typed |
| `music_moods`: `description`, `tags`, `scale` | every field typed |
| names `^[a-z][a-z0-9_]{0,31}$` | namespaced `bundleId:name` |
| no size caps | `maxProperties` / `maxItems` everywhere plus the caps of step 9 |

Descriptions (8-200 characters) and tags (1-6) are required on every entry except poses, as in the base catalog.

## 5. Naming and references

### 5.1 Namespaced ids

- **Bundle id:** `^[a-z][a-z0-9_]{2,31}$`. Reserved, never allowed: `base`, `core`, `catalog`, `stickman`, `engine`, `self`, `user`, `test`, `draft`, `local`, `world`, and every bundle id on the blocklist (section 8).
- **Entry name:** `<bundleId>:<name>` with `<name>` matching `^[a-z][a-z0-9_]{0,31}$`, at most 64 characters in all. Inside the bundle's own files, own entries are always written in full (`robo_pals:boxbot`), both as keys and as references.
- **A name without a colon always means the base catalog** (lowercase with `_`, except base pose names, which are camelCase: `walkA`, `swordGuard`; a bundle's own names are always lowercase). The base catalog never uses colons, so base growth can never collide with a bundle entry, and a reader can tell at a glance where a name comes from.
- Scripts use the same full names: `{"id": "bolt", "body": "robo_pals:boxbot", ...}`, `{"who": "bolt", "do": "robo_pals:robot_dance"}`.
- Engine fields that hold catalog names (move names in `do`, `body`, `theme`, `object`, `kind`, `fx`, `face`, `prop`, `needsProp`, `chain`) have no pattern, so `:` passes the schemas. `tests/unit/namespaced_names.test.js` (B1.2) checks every catalog-name field of the v1 and v2 schemas and the macro params with `"acme:robo"`, and validates a v1 script and a v2 story that use a namespaced theme, body, face, FX, move, prop, object, activity and mood in fields, macro params and world-command params (`set_theme`, `set_music`, `activity`, `spawn_prop`, `spawn_object`); ids (characters, beats, scenes, locations, set pieces) keep their patterns.

### 5.2 Add-only (v1)

A bundle never replaces, patches or removes an entry. Its keys all start with its own id, so it cannot shadow a base entry; the merge (7.2) refuses two loaded bundles with the same id unless they are byte-identical (same hash). Changing a built-in look means adding a new entry (a new body plan, a new face) and using it.

Why add-only: overrides would make a script's meaning depend on which bundles happen to be loaded and in which order, break the base catalog's own checks (a base move re-tested on an overridden pose), and give a bundle a way to change other people's videos. An override mechanism can come later as an explicit, declared `patches` list (section 9).

### 5.3 How references resolve

| From → to | Allowed | Rule |
|---|---|---|
| bundle → base | yes | bare names; must exist in the base catalog the bundle is checked against |
| bundle → same bundle | yes | full names with the bundle's own id |
| bundle → another bundle | yes, through `dependencies` | full names; the other bundle must be listed in the manifest's `dependencies` with id, version and hash |
| base → bundle | never | the base catalog is checked alone by `catalog:build`; it cannot know bundles |

**Decision (Sridhar, 2026-10-18): bundle-to-bundle references are allowed, pinned and shallow.** Reason: shared pieces are likely (a pose pack used by several move packs, a body plan used by a costume pack), and copying them would make conflicting copies under different ids. Rules that keep it safe:
- A dependency is pinned by hash, so the referenced content never changes under the dependant.
- At most 4 direct dependencies; no cycles; a dependency's own dependencies must also be listed by the dependant (no hidden transitive loads), so the full set is visible in one manifest.
- A script that declares a bundle must also declare that bundle's dependencies (E_BUNDLE_DEPENDENCY otherwise), so every script states its complete content.
- References may only point to what the dependency **adds**; they cannot change it.

**Which entries can refer to which** (checked in step 8):

| Entry | May reference |
|---|---|
| move | poses (keys), faces (`face`), FX (`hits[].fx`, `events[].fx`), moves (`chain`, `pair.partnerMove`), prop/holdable kinds (`needsProp`); SFX keys from the base only |
| body plan | moves (`avoid`; quadruped `moves` map targets) |
| preset | body plans, props/holdables (`prop`) |
| object | objects (`use.spawn`), FX (`use.fx`); prop/holdable kinds (`hold.kind`) |
| activity | moves, faces, FX, objects, props |
| mood | scales |
| example | anything in the merged catalog |

## 6. Validation before import

### 6.1 The pipeline

Steps run in order; a step runs only when the steps before it passed, except that steps 8-11 each report all their issues. Each issue is `{ code, file, path, message, fix }`, the same shape as validator issues, so `formatIssues` can print them. **Required** steps must pass for any import; **recommended** steps run in the tools and the showcase but may be skipped by a lightweight importer, which must then label the bundle "not fully checked" and never use it in the review queue or a published video.

| # | Step | Code(s) | Level | Browser | Node |
|---|---|---|---|---|---|
| 1 | Archive and size limits | `E_BUNDLE_ARCHIVE`, `E_BUNDLE_SIZE`, `E_BUNDLE_PATH` | required | yes | yes |
| 2 | JSON parse | `E_BUNDLE_JSON` | required | yes | yes |
| 3 | Manifest schema | `E_BUNDLE_MANIFEST`, `E_BUNDLE_RESERVED` | required | yes | yes |
| 4 | Version compatibility | `E_BUNDLE_COMPAT` | required | yes | yes |
| 5 | File list and content hash | `E_BUNDLE_FILES`, `E_BUNDLE_HASH` | required | yes (SubtleCrypto) | yes |
| 6 | Per-file schemas | `E_BUNDLE_SCHEMA` | required | yes | yes |
| 7 | Namespacing and collisions | `E_BUNDLE_NAMESPACE`, `E_BUNDLE_COLLISION` | required | yes | yes |
| 8 | Reference resolution | `E_BUNDLE_REF`, `E_BUNDLE_DEPENDENCY` | required | yes | yes |
| 9 | Resource caps | `E_BUNDLE_CAP` | required | yes | yes |
| 10 | Text and audience checks | `E_BUNDLE_TEXT`, `W_BUNDLE_SOFT`, `E_BUNDLE_AUDIENCE` | required | yes | yes |
| 11 | Semantic checks (the catalog build's own) | `E_BUNDLE_MOVE`, `E_BUNDLE_BODY`, `E_BUNDLE_ENTRY`, `E_BUNDLE_PRESET`, `E_BUNDLE_EXAMPLE` | required | yes | yes |
| 12 | Determinism | `E_BUNDLE_DETERMINISM` | sim hash required; pixel hash recommended | sim yes; pixels yes (same browser only) | sim yes; pixels with `@napi-rs/canvas` |
| 13 | Render smoke and budget | `E_BUNDLE_RENDER`, `W_BUNDLE_SLOW` | recommended | yes | with `@napi-rs/canvas` |
| 14 | Blocklist and review status | `E_BUNDLE_BLOCKED`, `W_BUNDLE_UNREVIEWED` | required (hash blocklist); review status informative | yes | yes |

Step 14 is cheap and can also run right after step 5, as soon as the hash is known; it is listed last because it does not depend on content.

All steps are pure functions over the parsed files and the base catalog, with no I/O of their own (like `catalog_check.mjs`), so the same code runs in Node and in the browser. Node-only pieces are adapters: reading a folder or zip from disk, the canvas backend for pixel hashes, and music previews (`music_gen.mjs`).

### 6.2 Step details

**1. Archive and size limits** (required).
- Zip: stored or deflate entries only; no encryption, no ZIP64, no multi-disk; central directory and local headers agree. Folder: regular files only, no symlinks.
- Caps: archive at most 1 MB compressed; at most 2 MB uncompressed in total; at most 256 KB per file; at most 65 entries (64 files plus `bundle.json`); compression ratio at most 20:1 per entry (zip bombs); decompression stops at the cap, not after it.
- Paths: each path matches the closed grammar of 4.3 (or is `bundle.json`): no `..`, no leading `/`, no `\`, no drive letters, no duplicates (also after Unicode NFC and case folding), no directories other than those in section 3.
- Codes: `E_BUNDLE_ARCHIVE` (unreadable or unsupported archive), `E_BUNDLE_SIZE` (a size or count cap), `E_BUNDLE_PATH` (a path outside the grammar, a duplicate, a symlink).

**2. JSON parse** (required). Strict UTF-8 without a BOM; strict JSON (no comments, trailing commas, `NaN` or `Infinity`); **duplicate keys are an error** (needs a small parser, since `JSON.parse` keeps the last one); nesting at most 32 levels; strings at most 4,096 characters except `README.md`/`LICENSE.txt` (text files, 64 KB, no control characters except `\n` and `\t`). Code `E_BUNDLE_JSON`.

**3. Manifest schema** (required). `bundle.json` against `bundle.schema.json`; the id is not reserved. Codes `E_BUNDLE_MANIFEST`, `E_BUNDLE_RESERVED`.

**4. Version compatibility** (required). `engineVersion` contains the running `ENGINE_VERSION` (today 0.1.0); `catalogVersion` contains the base catalog's format (`manifest.json` `schemaVersion`, today 1); `schemaVersion` is one the importer supports, else it is migrated first (section 9). A mismatch of `testedWith` with the running catalog version is a warning in the import report, not an error. Code `E_BUNDLE_COMPAT`.

**5. File list and content hash** (required). The archive's files equal `manifest.files` exactly (no missing, no extra); each file's canonical SHA-256 equals its `files[].sha256`; `contentHash` equals the SHA-256 of the canonical manifest without `contentHash`. Codes `E_BUNDLE_FILES`, `E_BUNDLE_HASH`.

**6. Per-file schemas** (required). Each file against its schema (4.4-4.15), with the checker's existing codes kept in the message (`E_SCHEMA_TYPE`, `E_SCHEMA_RANGE` ...). Code `E_BUNDLE_SCHEMA`.

**7. Namespacing and collisions** (required).
- Every key and every own-entry id starts with `<manifest.id>:`; a preset file is named after its id's local part.
- No name is defined twice in the bundle (move names are unique across all move files; poses, moves and every other kind have separate name spaces, as in the base catalog).
- The bundle id is not already loaded with a different hash; a different version of the same id cannot be loaded beside it (one version per id per session).
- Codes `E_BUNDLE_NAMESPACE`, `E_BUNDLE_COLLISION`.

**8. Reference resolution** (required). Every reference in the table of 5.3 resolves: bare names in the base catalog, own names in this bundle, other namespaced names in a declared and loaded dependency (pinned hash matches). Dependencies form no cycle and list their own dependencies. Generic names in a quadruped `moves` map are base generic names. Codes `E_BUNDLE_REF` (unknown name, with the closest match as the fix, like the validator), `E_BUNDLE_DEPENDENCY` (undeclared bundle, missing or mismatched dependency, cycle).

**9. Resource caps** (required). Per bundle, beyond the schema's per-file caps:

| Cap | Limit | Why |
|---|---|---|
| entries in all | 256 | keeps the merged catalog, the showcase and the context pack small |
| moves / poses / body plans / faces / presets | 64 / 128 / 4 / 16 / 24 | |
| FX / themes / objects / props / activities / moods | 24 / 8 / 32 / 8 / 8 / 8 | |
| keyframes per move / root keys / hits / events | 24 / 12 / 6 / 12 | prepare and sampling cost |
| particles per FX burst (sum of `count`) | 120 | `LIMITS.particles` is 2,000 for the whole video |
| sustained bursts per FX (`rate × duration`) | 60 | |
| path commands per object / per bundle | 1,600 / 4,000 | drawing cost per frame |
| path coordinates | x -600..600, y -1,200..50 | stays inside the object's box |
| theme layers per theme / generated items per layer | 12 / 400 (computed from span ÷ spacing or `count`) | generator loops (2.7) |
| move expressions | 40 characters, 16 tokens | `expr.js` cost |
| colours | `#rrggbb` or `rgba(r, g, b, a)` with r, g, b 0-255, a 0-1 (plus `A` only in a crystals glow) | the canvas accepts many more formats (named colours, `hsl`, `url(...)` patterns in some backends); only these two are allowed |

Code `E_BUNDLE_CAP`.

**10. Text and audience checks** (required).
- Every text a person can see (bundle name, description, entry descriptions, tags, preset names, README, FX `word` texts, example titles and on-screen text) is checked with the validator's own text check (`checkText` against `catalog/story/blocklist.json` `blocklist`): a blocked word is `E_BUNDLE_TEXT`; a soft word for any audience the bundle claims is `W_BUNDLE_SOFT` with its alternative.
- Audience: **the existing script rules, nothing stricter** (decision 4). A bundle that lists `kids` is held to exactly what the validator already applies to `kids` scripts (STORY_SPEC 13): the kids soft words, and every example validates with `meta.audience: "kids"` (a bundle that lists both audiences validates its examples under both). Each preset's `audience` must be a subset of the bundle's. Code `E_BUNDLE_AUDIENCE`.
- No gore: no entry, tag or text may describe blood, wounds or injury (blocklist), and red-only particle FX attached to a hit (`hits[].fx` presets whose colours are all reds) are flagged `W_BUNDLE_REVIEW` for the human review (section 8). Schemas cannot tell a red spark from blood; this is a hint, not a rule.
- Text length: descriptions 8-200 characters, one sentence, no URLs except `author.url`, no `@` handles, no emoji in names.

**11. Semantic checks** (required), reusing the catalog build (`tools/lib/catalog_check.mjs`) on the merged catalog (base + dependencies + this bundle):
- Moves: `prepareCatalog` accepts the merged move list; `checkMove(def, catalog, { draft: true })` runs **every bundle move on every base and bundle body plan of its rig** (no NaN joint, no sinking below the floor, feet on the floor at the start and end); attacks have `hits` and the first window at `t >= 0.15` of the duration; `chain` resolves; the `guard` tuple is `[t0, t1, kind]` with `t0 < t1`. Code `E_BUNDLE_MOVE`.
- Body plans: **every base move and every bundle move of the plan's rig runs on each bundle body plan** (the same `checkMove` loop, in reverse); a quadruped map covers the required generic names and points at quadruped moves; the stickman's `walk` and `run` root motion scales sensibly (`strideOf` finite and between 0.4 and 2.5). Code `E_BUNDLE_BODY`.
- Paired moves: each lead runs with its partner in a two-character harness story (like `presetStory`) for stickman with stickman and stickman with each bundle body plan of the partner's rig; no validator errors, no NaN joint, contacts within reach. Code `E_BUNDLE_MOVE`.
- Other entries (`E_BUNDLE_ENTRY`): the semantic rules listed under each schema in section 4 (object colour keys and path arity, activity runner fields, FX glyph/text pairing, theme min/max pairs, mood scale exists).
- Presets: the cast entry validates on stage (`presetStory`), with no errors; the build records its good themes (`goodThemes`). Code `E_BUNDLE_PRESET`.
- Examples: each example script validates cleanly (no errors) against the merged catalog with the bundle declared; together they use every non-preset entry the bundle adds. Code `E_BUNDLE_EXAMPLE`.

**12. Determinism** (simulation hash required; pixel hash recommended). For each example and for one generated showcase script per entry (the showcase's own tiny stories, `web/lib/showcase_scripts.js`):
- **Simulation hash** (no canvas): load the script twice in two fresh engines, step to N frames (default every 30th frame up to 600, plus the last) and hash `getFrame(n)` (camera and joints, rounded to 1e-4) with SHA-256; both runs must match.
- **Pixel hash:** render the same frames twice, the second time in reverse order (random access, as `tests/integration/render.test.js` does), hash the RGBA bytes, compare. In a browser this compares two renders in the same browser only; pixel hashes are never compared across machines (15.2 rule 5).
- Any difference is `E_BUNDLE_DETERMINISM`. Bundles have no code, so a failure points at an engine bug triggered by the data; it blocks the import and should be reported as an engine issue.

**13. Render smoke and budget** (recommended). Render every theme, object, face, FX and body plan once through the showcase scripts: no exception (`E_BUNDLE_RENDER`); the median frame time stays within 1.5 times that of the same script with base entries (`W_BUNDLE_SLOW`).

**14. Blocklist and review status** (required). The content hash is not on the bundle hash blocklist (`E_BUNDLE_BLOCKED`, section 8). A bundle whose hash is not on the allow list (`catalog/bundle_allowlist.json`) is imported with `W_BUNDLE_UNREVIEWED`, which the UI shows as a banner.

### 6.3 Import result

```js
importBundle(files, { base, loaded }) →
  { ok, bundle: { id, version, hash, manifest, entries }, errors: [...], warnings: [...],
    report: { counts, goodThemes, sizes, steps: [{ step, ms, skipped? }] } }
```

`ok` is true when no required step reported an error. Imported bundles are stored by hash and never edited after import:
- **Node:** `bundles/<id>/<hash>/` at the project root (git-ignored, like `out/`), or the folder in `STICKMAN_BUNDLES` when set (to share one store between clones). Reason: everything the tools use stays inside the project, and `npm run serve` already serves the project root, so the player and showcase can read the same store over HTTP with no copy.
- **Browser:** IndexedDB keyed by hash for bundles imported on the page; the player also looks in `/bundles/` when served by `npm run serve`.

## 7. Using bundles in scripts

### 7.1 Declaring bundles

Both script versions gain an optional top-level field (a schema change in v1 and v2, B3):

```json
"bundles": [
  { "id": "robo_pals", "version": "1.0.0", "hash": "sha256-9c4e…" }
]
```

- At most 8 entries, unique ids, each `pin`-shaped (4.2). The list must include every dependency of every listed bundle.
- A script may use a namespaced name only when its bundle is declared (`E_BUNDLE_UNDECLARED`, even if that bundle happens to be loaded).
- Scripts without `bundles` behave exactly as today.

### 7.2 Merge order

The player or tool resolves the declared bundles from the local store by hash, then builds the engine catalog:

1. Start from the base catalog (`loadCatalog`).
2. Add bundles in **ascending id order** (not script order; with add-only entries the order only affects list order, and a fixed order makes `moves`, `themeNames`, `fxNames` and every derived list identical for the same set). Dependencies need no special order because references are resolved by name after the merge.
3. Within a bundle, files in the order of section 3 (move files in `MOVE_FILES` order), entries in file order.
4. Run the **combination check**: the move/body checks of step 11 for every pair (a move from one declared bundle, a body plan from another) that no single bundle's import already covered. A failure is `E_BUNDLE_COMBO`, reported at script load. The result is cached by the sorted list of hashes.
5. Attach `catalog.bundles = [{ id, version, hash }]` (sorted) and pass the result to `createEngine({ catalog })`. The engine still never imports `catalog/` or a bundle; it only sees the merged object (ADR-006).

The merge itself is `assembleCatalog` over concatenated files: a new pure helper `mergeBundles(base, bundles)` in `catalog/` (it does no I/O).

### 7.3 The determinism guarantee

> For a fixed engine version, canvas backend and platform (spec 15.2 rule 5) and a fixed base catalog version, the same script with the same bundle hashes produces the same frames, audio events and music cues.

It holds because bundles are data only, content is pinned by `contentHash`, the merge order depends only on the set of hashes, and every random stream stays `deriveRng(seed, name)`. The base catalog version is part of the guarantee as it is today (a retuned base move changes old videos too); the review queue records `catalog/manifest.json` `version` next to the bundle hashes.

### 7.4 Missing bundle or wrong hash

The validator compares the script's `bundles` with `catalog.bundles` before anything else:

| Case | Result |
|---|---|
| A declared bundle is not loaded | `E_BUNDLE_MISSING` with its id, version and hash; the fix names where to import it. The script does not load: no fallback, no substitution, no "skip unknown names". |
| A bundle with the declared id is loaded but its hash differs | `E_BUNDLE_HASH`; the fix says which hash is loaded. Never "close enough": a different hash is different content. |
| A namespaced name whose bundle is not declared | `E_BUNDLE_UNDECLARED` |
| A declared bundle's dependency is not declared | `E_BUNDLE_DEPENDENCY` |
| The script is for `kids` and a declared bundle does not list `kids` | `E_BUNDLE_AUDIENCE` |
| A declared bundle is not used by any name in the script | `W_BUNDLE_UNUSED` |

These codes are reported by the engine's validator, so they get entries in `catalog/docs/codes.json` and fixtures in `tests/fixtures/bad/` (CLAUDE.md). The import-only codes of section 6 belong to the bundle tool, not the validator, and are documented in the bundle tool's own codes file.

AI tools: when a model writes a script that uses a bundle (from that bundle's context pack, 10.3), it copies the `bundles` line from the pack, so the script carries its pins.

## 8. Security and moderation

**Denial of service.** The caps of steps 1, 2 and 9 bound everything an importer reads, every loop a generator runs and every particle and path the renderer draws. The engine's own limits stay in force on top (`LIMITS.particles`, `MAX_LIFE`, script size, beats). The importer runs steps 1-11 in a Web Worker in the browser and with a 30 s wall-clock budget in Node, and aborts on timeout (`E_BUNDLE_SIZE`, "took too long").

**No code paths.** Nothing in a bundle is evaluated except move expressions, which go through `expr.js` (numbers, param names, `+ - * / ( )`). Colours are restricted to two formats (no `url(...)`, gradients or patterns). README is shown as plain text. No file is ever written outside the bundle store; nothing is fetched by URL (`author.url` is shown, not followed).

**What schemas cannot catch.** A schema can't see what data draws:
- `paths` can trace a rude drawing, a hate symbol, a trademarked logo or a real person's likeness;
- poses and moves can form rude gestures;
- theme colours and layer choices can imitate a flag or a symbol;
- names, descriptions and tags can carry coded words the blocklist misses;
- FX colours can read as blood.

Measures:
- **Contact sheet.** `tools/bundle.mjs sheet` renders one PNG per bundle: every pose, a filmstrip per move (`tools/move_sheet.mjs`), every face (`tools/face_sheet.mjs`), every body plan, object, prop, theme and FX. A reviewer looks at one image, not at JSON.
- **Sharing (decision 7):** bundles travel as zip files (by email, chat or a file host the author chooses). There is no upload service or gallery in v1.
- **Review levels:** `private` (the default: imported by a user for their own use, shown with the unreviewed banner, never published from the review queue without a human look at the contact sheet), `listed` (reviewed by Sridhar from its contact sheet; its hash goes on the allow list `catalog/bundle_allowlist.json`, `[{ "hash", "id", "version", "reviewed" }]`, so the showcase shows it as reviewed and the unreviewed banner disappears), `blocked` (its hash goes on the blocklist). Both lists are authored catalog files, reviewed like any catalog change and shipped with releases. A gallery can later be built on the allow list without format changes.
- **Publishing.** The review queue (REQUIREMENTS 6) shows the contact sheets of every bundle a video uses next to the video, and keeps a human sign-off before upload, as today.
- **Reporting.** The showcase and the player get a "report this bundle" action that records id, version, hash and a reason locally and opens a prepared issue text for the user to send; nothing is sent automatically.
- **Blocklist.** `catalog/bundle_blocklist.json` (authored, part of the catalog, so it ships with releases): `[{ "hash", "id", "reason", "date" }]`. Step 14 refuses blocked hashes; the player refuses scripts that declare one.

**Licensing and attribution.**
- `license` comes from a short SPDX allow list: `CC0-1.0`, `CC-BY-4.0`, `CC-BY-SA-4.0`, `CC-BY-NC-4.0`, `MIT`, `Apache-2.0`.
- **Non-commercial bundles** (`CC-BY-NC-4.0`): allowed (decision 2). A video that uses one is marked `nonCommercial: true` in its review-queue metadata and credits; the review queue shows `W_BUNDLE_NC` ("this video uses a non-commercial bundle: do not monetize it") and the human reviewer decides. The showcase and the import page show an NC badge.
- The author confirms by packing that they made the content or may share it under that licence (`bundle pack` prints this and requires `--i-made-this`). Imported SVG art (`svg_import.mjs`) must be the author's own or under one of these licences.
- Attribution: a video made with bundles gets a credits list (bundle name, version, author, licence) in the review-queue metadata, the YouTube description draft and the player's info panel; `CC-BY*` bundles also on the end card when one exists. `tools/record.mjs` writes it into the output's metadata file.
- No trademarks, brands or real people (spec 21) in names, descriptions or drawings.

## 9. Versioning and migration

- **`schemaVersion`** (an integer, 1 now) is the version of the bundle format: the manifest and every file schema together. Because every object is closed (`additionalProperties: false`), any new field or kind needs a new `schemaVersion`; new enum values that the engine gains (a new layer kind, a new face eye) also bump it, since an old importer would reject them.
- **Importers** support the current version and the previous one. An older bundle is migrated in memory by a pure function per step (`migrate_1_to_2(files) → files`) before step 3; migrations never drop content silently (a field that cannot be carried over is an error). **The content hash is always computed over the files as authored**, so a migrated bundle keeps its hash and old scripts keep working.
- **`bundle.mjs upgrade`** writes a migrated copy with a new version and hash, for authors who want to move on.
- **Engine and catalog compatibility.** `engineVersion` and `catalogVersion` are ranges; the importer refuses out-of-range bundles. Bundles reference base names, so once bundles ship, **base names become a public interface** (decision 5): a base entry referenced by bundles is renamed only with an alias kept for one catalog format version, and removed only with a `catalogVersion` bump. `catalog:build` gets a check (B4) that compares base names against the previous release.
- **Possible later versions:** `patches` (declared overrides of own or dependency entries), defeat styles, new rigs once the engine has them, projectile moves, localized descriptions.

## 10. Tooling sketch (milestones B1-B6)

Same style as `docs/IMPLEMENTATION_PLAN.md`; this plan is not part of that file until Sridhar schedules it.

| Milestone | Work | Done when |
|---|---|---|
| **B1 Schemas and engine prerequisites** (done 2026-10-18) | B1.1 checker: add `$ref`/`$defs` (local and `common.schema.json`), `propertyNames`, `maxProperties`, `minProperties`, `uniqueItems`, `x-discriminator` to `checkValue` (pure; existing schemas unchanged). B1.2 engine: validator reads mood and activity names from the catalog (`musicMoods`, `activityNames`) instead of the frozen enums; a test that every catalog-name field accepts `bundle:name`. `catalog/schemas/bundle/*.schema.json` from section 4 (description tests as for the base schemas). | All tests, golden frames and determinism hashes unchanged; each schema accepts the worked example and rejects the bad fixtures. **Done:** see the B1 notes below |
| **B2 Check pipeline** | `tools/lib/bundle/` (pure, browser-safe): read (folder or zip via `DecompressionStream`/`zlib` adapters), canonical JSON and hashes, steps 1-11 and 14 with their codes, `mergeBundles`. `tools/bundle.mjs check <dir|zip>` and `pack <dir>` (writes `files`, `contentHash`). Table-driven unit tests with one fixture per code in `tests/fixtures/bundles/bad/`. | Every code has a fixture; the worked example (section 11) packs and checks clean; checking a 2 MB bundle takes under 2 s in Node |
| **B3 Scripts and the engine** | `bundles` in schema v1 and v2; `E_BUNDLE_MISSING`, `E_BUNDLE_HASH`, `E_BUNDLE_UNDECLARED`, `E_BUNDLE_DEPENDENCY`, `E_BUNDLE_AUDIENCE`, `W_BUNDLE_UNUSED`, `E_BUNDLE_COMBO` in the validator and `catalog/docs/codes.json`; tools (`validate`, `record`, `generate`, `manual`) and the player accept `--bundle <dir|zip>` / a bundle store. Step 12 (sim hash) and the combination check. | A script using the example bundle validates, records and plays; the bad scripts give their codes; same frames twice |
| **B4 Import and store** | `tools/bundle.mjs import <dir|zip>` (Node store) and an import page (`web/bundles.html`: drop a zip, see the report and the contact sheet, keep it in IndexedDB); `bundle.mjs sheet`; steps 12 (pixels) and 13; the base-name stability check in `catalog:build`; `catalog/bundle_blocklist.json` and `catalog/bundle_allowlist.json`; `bundles/` in `.gitignore`. | Import works in Node and in the browser with the same report; the blocklist refuses a listed hash |
| **B5 Showcase, player and context pack** | Showcase: a "Bundles" switch that adds loaded bundles' entries to every section, marked with the bundle name; deep links `showcase.html#moves/robo_pals:robot_dance`. Player: loads a script's declared bundles from the store, shows credits (with the NC badge) and a missing-bundle message. Bundle music moods have no browser preview (music is rendered in Node only, decision 8): their cards say so and play a clip only when `npm run catalog:media` has rendered one. Context pack per bundle (10.3). | A loaded bundle's entries appear in every section with no page change; a Claude Desktop project with the base pack plus a bundle pack writes a valid script that uses the bundle (manual check) |
| **B6 Authoring help** | `tools/draft.mjs ... --bundle <dir>` and `svg_import.mjs --bundle <dir>` write drafts into a bundle folder with namespaced names; `bundle.mjs new <id>` scaffolds a folder; a lean "make a bundle" prompt for chat apps (the bundle schemas plus the field notes, no keyframe examples beyond one). | A bundle drafted through the copy-paste flow checks clean after review |

**B1 notes (2026-10-18).**
- B1.1: the checker moved to `engine/validator/check_value.js` (schema.js re-exports `checkValue`); the new keywords are listed in 4.1 and tested in `tests/unit/check_value.test.js`. No new codes. Existing schemas take the same paths through the checker (a `$ref`-free `oneOf` sees the same branches), so every earlier message is unchanged.
- B1.2: `catalogNames(catalog)` (`v2_names.js`) gives the mood and activity names; `schemaV2For`, `macroParamsFor` and `worldCommandsV2For` return the prebuilt `jsonSchemaV2`, `MACRO_PARAMS` and `WORLD_COMMANDS_V2` when the names equal the frozen lists (the base catalog today), so `docs/schema/script-v2.schema.json`, `generated/engine_vocab.json` and the catalog version (`1-2f7e7addb9`) are unchanged. The context pack and prompt tables still list the frozen tables; listing bundle names there is B5.
- B1.3: `catalog/schemas/bundle/*.schema.json` are the section 4 blocks verbatim (`tests/unit/bundle_schemas.test.js` compares them with this file, checks the 4.1 conventions, and keeps the enums equal to the engine's lists: pose channels, categories, easings, hit parts, shakes, appearance options, accessories, timbres, roles, layer kinds, object shapes and behaviours, prop shapes, patches). `readCatalogDir` keeps only top-level `schemas/*.schema.json` as catalog schemas; `readBundleSchemas` reads the bundle ones. The worked example (`tests/fixtures/bundles/robo_pals/`, full hashes computed over sorted-key compact JSON) passes; `zz_bad` gives the 11.2 checker codes (`tests/fixtures/bundles/zz_bad.expect.json`); the base catalog's themes, faces, props, objects, bodies (dog included), activities (not `fetch`), FX (not `internal`) and moods pass once prefixed, as 4.1 claims. The unused `range` def of `fx.schema.json` (an unranged number, against 4.1) was removed.
- **Open for B2:** an example script that pins its own bundle (`bundles: [{ "id": "robo_pals", "hash": ... }]`, 11.1) cannot hold the right `contentHash`, since that hash covers the example file. The fixture uses 64 zeros there. B2 must pick a rule, for example: the own bundle's pin in `examples/` is written without `hash` (or hashed with the pin blanked), and the pipeline checks it against the manifest instead.

Suggested commands:

```
node tools/bundle.mjs new robo_pals                 scaffold a bundle folder
node tools/bundle.mjs check bundles/robo_pals       steps 1-14, prints issues with fixes
node tools/bundle.mjs pack bundles/robo_pals --i-made-this   writes files[], contentHash and robo_pals-1.0.0.zip
node tools/bundle.mjs sheet robo_pals-1.0.0.zip     contact sheet PNG for review
node tools/bundle.mjs import robo_pals-1.0.0.zip    check, then store by hash
node tools/bundle.mjs pack-context robo_pals-1.0.0.zip   the bundle's AI context file
```

### 10.3 The AI context pack per bundle

`bundle.mjs pack-context` (and the import page) writes one Markdown file, `bundle_<id>.md`, in the style of the base pack (CATALOG_SPEC 7.1: tables, defaults omitted, no keyframes):
- a header with the bundle name, id, version, licence and the exact `bundles` line to copy into scripts;
- tables of what the bundle adds: body plans (height, look, rig), presets (cast fields as compact JSON), faces, moves (category, seconds, params, rig; no keyframes), FX, themes (good character colours), objects (behaviour, states), props, activities and moods;
- the rule "names with a colon come from this bundle; declare it in `bundles`".

Budget: 6 KB per bundle (a test fails above 7.5 KB). It is attached next to the base pack in a Claude Desktop project; lean prompts gain an optional line naming the attached bundles and their hashes.

## 11. Worked examples

### 11.1 A valid bundle: `robo_pals`

A friendly boxy robot: a body plan, a pose, a move, a preset, an object and an example. Hash values are shortened here (`…`); `bundle.mjs pack` writes the full 64-digit values. The full bundle is `tests/fixtures/bundles/robo_pals/` (see the B1 notes in section 10 about the example's own pin).

`bundle.json`:

```json
{
  "schemaVersion": 1,
  "id": "robo_pals",
  "version": "1.0.0",
  "name": "Robo Pals",
  "description": "A friendly boxy robot with a little robot dance and a charging pad.",
  "author": { "name": "Example Author", "url": "https://example.com/robo-pals" },
  "license": "CC-BY-4.0",
  "engineVersion": "^0.1.0",
  "catalogVersion": "1",
  "testedWith": "1-2f7e7addb9",
  "audience": ["kids", "general"],
  "tags": ["robot", "friendly"],
  "files": [
    { "path": "characters/bodies.json", "sha256": "sha256-1f0a…" },
    { "path": "characters/presets/bolt.json", "sha256": "sha256-77c2…" },
    { "path": "examples/index.json", "sha256": "sha256-0b9d…" },
    { "path": "examples/stories/bolt_dances.json", "sha256": "sha256-e41a…" },
    { "path": "moves/emotes.json", "sha256": "sha256-5d3e…" },
    { "path": "moves/poses.json", "sha256": "sha256-a8f1…" },
    { "path": "world/objects.json", "sha256": "sha256-3c6b…" }
  ],
  "contentHash": "sha256-9c4e…"
}
```

`characters/bodies.json`:

```json
{
  "robo_pals:boxbot": {
    "description": "A sturdy boxy robot with a filled square chest, visor eyes and an antenna.",
    "tags": ["robot", "sturdy"],
    "rig": "humanoid",
    "draw": "trapezoid",
    "torsoWidth": 28,
    "dims": { "headR": 22, "neck": 6, "torso": 70, "upperArm": 36, "forearm": 34, "thigh": 42, "shin": 40, "lineWidth": 11 },
    "appearance": { "eyes": "visor", "brows": "none" },
    "avoid": ["flying_kick", "spinning_kick"]
  }
}
```

`moves/poses.json`:

```json
{
  "robo_pals:arms_square": { "lean": 0, "lUA": 80, "lFA": 90, "rUA": -80, "rFA": 90, "lTH": 6, "rTH": -6 }
}
```

`moves/emotes.json`:

```json
[
  {
    "name": "robo_pals:robot_dance",
    "description": "A stiff, happy robot dance: square arms, two jerky turns and a little bounce.",
    "tags": ["dance", "robot", "happy"],
    "category": "emote",
    "duration": 1.6,
    "face": "happy",
    "keys": [
      { "t": 0, "pose": "stand" },
      { "t": 0.2, "pose": "robo_pals:arms_square", "ease": "snap" },
      { "t": 0.45, "pose": { "rot": 0, "lean": 6, "head": -10, "lUA": 100, "lFA": 70 }, "ease": "snap" },
      { "t": 0.7, "pose": { "lean": -6, "head": 10, "rUA": -100, "rFA": 70 }, "ease": "snap" },
      { "t": 1, "pose": "stand", "ease": "outQuad" }
    ],
    "root": [
      { "t": 0, "dx": 0, "dy": 0 },
      { "t": 0.5, "dx": 0, "dy": -10, "ease": "outQuad" },
      { "t": 1, "dx": 0, "dy": 0, "ease": "inQuad" }
    ],
    "events": [
      { "t": 0.45, "turn": true, "sfx": "pop" },
      { "t": 0.7, "turn": true, "sfx": "pop" }
    ]
  }
]
```

`characters/presets/bolt.json`:

```json
{
  "id": "robo_pals:bolt",
  "name": "Bolt",
  "description": "A cheerful blue helper robot who loves to dance and fix things.",
  "role": "friend",
  "tags": ["robot", "helper", "cheerful"],
  "audience": ["kids", "general"],
  "cast": {
    "body": "robo_pals:boxbot",
    "color": "#3d7bd9",
    "appearance": { "accessories": { "antenna": "#ffcc33" } },
    "voice": { "pitch": 1.1, "timbre": "robot" }
  }
}
```

`world/objects.json`:

```json
{
  "robo_pals:charging_pad": {
    "description": "A round charging pad that glows when a robot stands on it.",
    "tags": ["robot", "tech"],
    "behavior": "static",
    "draw": "paths",
    "w": 160,
    "h": 24,
    "colors": { "base": "#4a4f5c", "glow": "#7fe3ff" },
    "states": ["off", "on"],
    "paths": [
      { "d": [["M", -80, 0], ["L", 80, 0], ["L", 70, -18], ["L", -70, -18], ["Z"]], "fill": "colors.base" },
      { "d": [["M", -50, -18], ["Q", 0, -30, 50, -18], ["Z"]], "fill": "colors.glow" }
    ]
  }
}
```

`examples/index.json` and `examples/stories/bolt_dances.json`:

```json
{ "examples": [{ "path": "stories/bolt_dances.json", "kind": "story", "title": "Bolt Dances",
  "description": "Bolt walks to the charging pad and does the robot dance for Kai.", "tags": ["robot", "dance"] }] }
```

```json
{ "story": {
  "version": 2,
  "bundles": [{ "id": "robo_pals", "version": "1.0.0", "hash": "sha256-9c4e…" }],
  "meta": { "title": "Bolt Dances", "format": "landscape", "seed": 3, "kind": "clip", "audience": "kids" },
  "cast": [
    { "id": "kai", "name": "Kai", "color": "#3fd8ff" },
    { "id": "bolt", "name": "Bolt", "body": "robo_pals:boxbot", "color": "#3d7bd9", "voice": { "timbre": "robot" } }
  ],
  "locations": [{ "id": "park", "theme": "city_park", "set": [{ "id": "pad", "object": "robo_pals:charging_pad", "x": 1700 }] }],
  "scenes": [{ "id": "s1", "location": "park", "music": { "mood": "playful" },
    "cast": [{ "id": "kai", "x": 1300, "facing": 1 }, { "id": "bolt", "x": 1900, "facing": -1 }],
    "beats": [
      { "id": "s1_hi", "at": 0.5, "macro": "dialogue", "params": { "lines": [["bolt", "Watch this!", "happy"]] } },
      { "id": "s1_dance", "at": { "after": "s1_hi" }, "who": "bolt", "do": "robo_pals:robot_dance" },
      { "id": "s1_glow", "at": { "with": "s1_dance" }, "who": "world", "do": "set_object", "object": "pad", "params": { "state": "on" } },
      { "id": "s1_clap", "at": { "after": "s1_dance" }, "who": "kai", "do": "clap" }
    ] }]
} }
```

What the checks do with it: steps 1-10 pass (closed paths, schemas, own prefixes, refs to base `stand`, `happy`, `pop`, `flying_kick`, `spinning_kick`, `clap`, `city_park`, `playful`). Step 11 runs `robo_pals:robot_dance` on the six base humanoid plans and `robo_pals:boxbot`, and every base humanoid move on `robo_pals:boxbot`; the preset validates on stage; the example validates and uses every non-preset entry (body plan, pose through the move, move, object). Step 12 hashes the example and one showcase script per entry twice.

### 11.2 An invalid bundle: `zz_bad`

`bundle.json` (abridged; `files` and `contentHash` correct for the files below):

```json
{ "schemaVersion": 1, "id": "zz_bad", "version": "1.0", "name": "Bad Pack", "description": "Shows the error codes.",
  "author": { "name": "Tester" }, "license": "CC-BY-ND-4.0", "engineVersion": "^0.1.0", "catalogVersion": "1",
  "audience": ["kids"], "files": [ … ], "contentHash": "sha256-…" }
```

`moves/unarmed.json`:

```json
[
  { "name": "zz_bad:mega_punch", "description": "Punch.", "tags": ["fight"], "category": "attack", "duration": 0.5,
    "keys": [{ "t": 0, "pose": "guard" }, { "t": 1, "pose": "zz_bad:wind_up" }],
    "hits": [{ "t0": 0.05, "t1": 0.3, "part": "rHand", "damage": 30, "shake": "big", "sfx": "punch_heavy" }] },
  { "name": "other:kick", "description": "A kick that belongs to someone else.", "tags": ["fight"], "category": "attack",
    "duration": 0.6, "keys": [{ "t": 0, "pose": "stand" }, { "t": 1, "pose": "stand" }],
    "hits": [{ "t0": 0.3, "t1": 0.5, "part": "rFoot", "damage": 8 }] }
]
```

`world/themes.json`:

```json
{ "zz_bad:forest": { "description": "An endless forest.", "tags": ["forest"],
  "sky": { "top": "skyblue", "bottom": "#cfe8ff" }, "ground": { "color": "#3c8f45", "line": "#2b6a33" }, "characterBg": "#cfe8ff",
  "layers": [{ "kind": "trees", "spacing": 0, "height": 300, "crown": 80, "color": "#2f7d3a", "trunk": "#6b4a2f", "factor": 0.6 },
             { "kind": "lasers", "color": "#ff0000" }] } }
```

`effects/fx.json`:

```json
{ "zz_bad:blink": { "description": "A blinding flash for big hits.", "tags": ["impact"], "anchor": "point",
  "flash": { "color": "#ffffff", "dur": 0.1 },
  "layers": [{ "shape": "glyph", "glyph": "word", "text": "GORE", "count": 1, "life": [0.5, 0.5], "size": [40, 40], "color": "#ff0000", "alpha": [1, 0] }] } }
```

The archive also holds `assets/logo.svg`, and `examples/` is missing.

Issues, in pipeline order (the pipeline stops after the first failing required step among 1-7; the later rows show what the same files give once the earlier problems are fixed):

| Step | Code | File and path | Why |
|---|---|---|---|
| 1 | `E_BUNDLE_PATH` | `assets/logo.svg` | outside the closed path grammar (raw SVG is not allowed) |
| 3 | `E_BUNDLE_MANIFEST` | `bundle.json` `version` | `1.0` is not `major.minor.patch` |
| 3 | `E_BUNDLE_MANIFEST` | `bundle.json` `license` | `CC-BY-ND-4.0` is not on the allow list (no-derivatives licences don't fit remixable assets) |
| 5 | `E_BUNDLE_FILES` | `examples/index.json` | required file missing |
| 6 | `E_BUNDLE_SCHEMA` (`E_TEXT_LENGTH`) | `moves/unarmed.json` `[0].description` | "Punch." is under 8 characters |
| 6 | `E_BUNDLE_SCHEMA` (`E_SCHEMA_PATTERN`) | `world/themes.json` `zz_bad:forest.sky.top` | `skyblue` is not `#rrggbb` |
| 6 | `E_BUNDLE_SCHEMA` (`E_SCHEMA_RANGE`) | `world/themes.json` `zz_bad:forest.layers[0].spacing` | 0 is below 80 (a spacing of 0 would loop forever) |
| 6 | `E_BUNDLE_SCHEMA` (`E_SCHEMA_ENUM`) | `world/themes.json` `zz_bad:forest.layers[1].kind` | `lasers` is not a layer kind (new drawing needs engine code) |
| 7 | `E_BUNDLE_NAMESPACE` | `moves/unarmed.json` `[1].name` | `other:kick` does not start with `zz_bad:` |
| 8 | `E_BUNDLE_REF` | `moves/unarmed.json` `[0].keys[1].pose` | `zz_bad:wind_up` is not a pose in this bundle |
| 10 | `E_BUNDLE_TEXT` | `effects/fx.json` `zz_bad:blink.layers[0].text` | `GORE` is a blocked word (the blocklist; a soft word such as `KILL` would give `W_BUNDLE_SOFT` instead) |
| 10 | `W_BUNDLE_REVIEW` | `effects/fx.json` `zz_bad:blink` | all-red particles on an impact FX: check it does not read as blood |
| 11 | `E_BUNDLE_MOVE` | `moves/unarmed.json` `zz_bad:mega_punch` | first hit window opens at t=0.05; windup must take at least 15% of the move |

## 12. Decisions (Sridhar, 2026-10-18)

1. **Bundle-to-bundle dependencies:** allowed, pinned by hash, at most 4, no cycles, all listed (5.3).
2. **Licences:** `CC-BY-NC-4.0` is allowed; videos using it are marked non-commercial and the review queue warns (`W_BUNDLE_NC`, section 8).
3. **Paired moves:** allowed (`interaction` with a `pair` block and its partner move, 2.2, 4.5). Defeat styles stay built-in.
4. **Kids rules:** the existing script rules (STORY_SPEC 13) apply to bundles unchanged; no extra limits (step 10).
5. **Base names:** a public interface once bundles ship; renames keep an alias for one catalog format version (section 9).
6. **Store:** `bundles/<id>/<hash>/` at the project root, git-ignored, overridable with `STICKMAN_BUNDLES`; IndexedDB in the browser (6.3).
7. **Sharing:** zip files for now; `listed` means reviewed by Sridhar and added to `catalog/bundle_allowlist.json`; a gallery later (section 8).
8. **Music moods:** no browser preview; cards say so and play a clip only after `npm run catalog:media` (B5).
