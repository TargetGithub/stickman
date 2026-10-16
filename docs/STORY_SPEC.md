# Story Engine Specification (v2)

Version **2.0-rc** (S0 freeze, signed off by the product owner 2026-10-16; S1 scenes, locations, transitions and cards S2 faces, dialogue and speech sounds, and S3 body plans and appearance implemented): decisions signed off (section 21); field, macro and param names frozen (section 4.4). Schema draft: [`docs/schema/script-v2.schema.json`](schema/script-v2.schema.json), generated from `engine/validator/schema_v2.js`; decision records ADR-014..018 in [ARCHITECTURE.md](ARCHITECTURE.md). Extends [stickman-engine-spec.md](../stickman-engine-spec.md) (v1.1, fights) into a general storytelling engine in which fights are one major kind of scene. Execution plan: [STORY_PLAN.md](STORY_PLAN.md).

Contents:
1. Goal and scope
2. Reference story and gap analysis
3. Design principles
4. Script format v2
5. Scenes, locations and transitions (5.5: art pipeline)
6. Cast: body plans, appearance and faces
7. Emotions, dialogue and narration
8. Objects and set pieces
9. Interactions (paired moves)
10. Activities
11. Story macros and the compiler
12. Fights at story scale
13. Defeat, sadness and content policy
14. Depth, extras and crowds
15. Audio: moods, ambience, voice
16. Camera for stories
17. Validator v2
18. LLM generation for stories
19. Limits and performance
20. Backward compatibility
21. Open decisions
22. Appendix A: the reference story as a v2 script
23. Appendix B: new error codes

---

## 1. Goal and scope

**Goal:** turn the engine from a fight-clip generator into a short-story generator. Scripts describe a cast, places, scenes, narration, dialogue, everyday activities, emotions and fights. One script still produces one deterministic MP4.

Target output:
- **Stories: at least 5 minutes** (typically 5-8). **Fight-only videos: at least 3 minutes** (typically 3-5). Landscape first; portrait supported.
- **Audience: kids first, general audiences too.** Everything is kid-friendly by default (section 13).
- 2-12 named characters, plus background extras.
- Several locations.
- Narration and dialogue.
- Slice-of-life activities, emotional beats, travel and multi-opponent fights.

**In scope:**
- Scenes and locations.
- New body plans (non-stickman characters).
- Faces and emotions.
- Objects and set pieces.
- Paired interactions.
- Activity macros.
- Story-level fight macros.
- Narration cards.
- Procedurally generated mood music and ambience.
- Character speech sounds (no recorded or synthesized words).
- A story compiler.
- Validator v2.
- An LLM story pipeline.

**Out of scope (v2):**
- Free-form character rigs with different skeleton topologies (animals, vehicles as characters). They are planned for a later version; section 6 keeps the door open.
- Voice-over and text-to-speech (decision 3: speech sounds only).
- Lip-sync.
- Physics-driven ragdolls.
- 3D.

The hard rules stay:
- Determinism, so the same script and seed give the same frames.
- No network in `/engine`.
- No blood or gore.
- Simulate first, then random-access rendering.
- Catalog injected as data.

## 2. Reference story and gap analysis

The reference story, used as the acceptance test (Appendix A has the full script):

> Kai (a stickman) and Pip (a small round sidekick) are best friends in the city. They blow bubbles in the park and play tennis. One day a villain, Vex, appears and defeats Pip. Furious, Kai sets out to find Vex. On the way he beats four guards, then defeats Vex in a final fight.

| Story need | v1 today | Gap |
|---|---|---|
| A non-stickman friend (Pip) | Every character is the same stickman skeleton and proportions (`BODY` is global) | Per-character **body plans**: proportions, body shape, face |
| Friendship, happiness, grief, fury | Mouth: neutral/shout/grin; a few emotes | **Faces**: eyes, brows, mouths, tears, blush; emotion state per beat; slice-of-life moves |
| Blowing bubbles, playing tennis | Props are held weapons; FX are effects only | **Objects** with simple behaviors (ball arcs, floating bubbles); **activities** that sync moves with objects |
| Hugs, high fives, walking together | Moves are single-character (except attack/defense) | **Paired interactions** with partner positioning |
| City, park, streets, the villain's lair | One theme per script (`set_theme` swaps the background) | **Scenes and locations**, each with its own stage, set pieces and lighting |
| "One sudden day..." | Captions | **Narration cards**, title and chapter cards, time-skip transitions |
| Pip is "killed" | KO poses; validator blocklist | A **stylized defeat** vocabulary (faint, fade to sparkles, ghost) and a content policy |
| A journey to find the villain | Approach runs up to 3 s | **Travel** macro: long walks, montage cuts, scrolling scenery |
| Four guards, then the boss | 1v1 choreography beat by beat | **Fight macros**: gauntlet, group fight, boss fight compiled into beats |
| A 2-4 minute script from an LLM | ~60 beats, one prompt | A **story compiler** (macros → beats) and a **two-stage LLM pipeline** (outline → per-scene scripts) |
| Mood | Synth SFX; one optional music file | **Generated mood music** per scene with crossfades, ambience beds, new SFX |

## 3. Design principles

1. **Two levels, one engine.**
   - Authors (people and LLMs) write a **story script** (v2) with high-level intent: scenes, macros like `fight` and `rally`, narration.
   - A deterministic **story compiler** expands it into **shot-level beats**: the v1 beat model, plus new commands.
   - The engine simulates and renders the compiled form. Every macro can also be written out by hand as beats.
2. **Data, not code.** Body plans, faces, objects, activities, locations and moods are catalog data, like moves and themes today. New content needs no engine changes.
3. **Fights stay first-class.** The v1 fight system (choreographed outcomes, approach, aim, reactions, hitstop, camera emphasis) is reused unchanged inside fight scenes and fight macros.
4. **Readable silhouettes and family-friendly tone**, in every style.
5. **v1 compatibility.** A v1 script is a v2 story with one scene, and it renders exactly as before (golden frames unchanged).
6. **Validation explains itself.** Every new rule gets an error code with a fix line, and appears in the LLM prompt (a test keeps them in sync, as in M8).

## 4. Script format v2

```json
{
  "version": 2,
  "meta": { "title": "Bubbles and the Brave Heart", "format": "landscape", "seed": 2024, "kind": "story", "audience": "kids" },
  "cast": [ ... ],
  "locations": [ ... ],
  "scenes": [ ... ],
  "audio": { "musicVolume": 0.35 }
}
```

| Field | Meaning |
|---|---|
| `meta` | As v1 (title, format, seed, mode, hpBars, tail), plus `kind` (`story` default, `fight`, `clip`: picks the length minimum), `audience` (`kids` default, `general`), `style` (section 6.4), `speakerNames`, and `autoCamera` (`true`, `false` or `"story"`). No theme or stageWidth here: they move to locations. |
| `cast` | Every character in the story, defined once: id, name, body plan, appearance, voice. Positions are set per scene. |
| `locations` | Reusable places: background theme, set pieces, stage width, default lighting and ambience. |
| `scenes` | Ordered list. Each scene has a location, the cast present and their starting positions, a camera track, beats, and transitions in and out. |
| `audio` | Global levels: `musicVolume`, `ambienceVolume`, `voices` (speech sounds on/off). Music moods are set per scene. |

### 4.1 Cast entry

```json
{ "id": "pip", "name": "Pip", "body": "buddy", "color": "#2fd3c0",
  "appearance": { "eyes": "big", "accessories": { "antenna": "#ffcc00" } },
  "voice": { "pitch": 1.4, "timbre": "squeaky" }, "hp": 60 }
```

| Field | Meaning |
|---|---|
| `id` | Lowercase id used everywhere (v2 ids: up to 32 characters) |
| `name` | Display name for HP bars, narration and the speaker label (optional, max 16) |
| `body` | Body plan from the catalog (section 6): `stickman` (default), `buddy`, `kid`, `bulky`, `slim`, `elder` |
| `color`, `scale`, `hp`, `prop`, `style` | As v1 characters |
| `appearance` | Face and decoration options (section 6.3) |
| `voice` | Speech-sound settings: pitch, speed, timbre (section 15) |

### 4.2 Scene entry

```json
{
  "id": "park",
  "location": "city_park",
  "time": "day",
  "weather": "clear",
  "transitionIn": { "type": "fade", "dur": 0.8 },
  "music": { "mood": "happy", "volume": 0.35 },
  "cast": [ { "id": "kai", "x": 900, "facing": 1 }, { "id": "pip", "x": 1100, "facing": -1, "face": "happy" }, { "id": "vex", "x": 2300, "hidden": true } ],
  "camera": [ { "at": 0, "mode": "follow", "targets": ["kai", "pip"], "zoom": "auto" } ],
  "beats": [ ... ]
}
```

- Scene timing is local: `at` numbers are seconds from the scene start (max 300). `after`/`with`/`on` may only refer to beats in the same scene. Beat ids are unique across the story.
- `location` is a location id from `locations`, or a theme name (a location with default settings).
- `cast[]` entries place characters for this scene (`id`, `x`, `facing`) and may override `face`, `prop`, `hp` and `layer`. `hidden: true` places a character invisibly until it enters (the `enter` macro, `spawn`, or `return`). Characters not listed are absent. At most 8 per scene.
- Optional: `time`, `weather`, `ambience` (override the location), `duration`, `tail`, `set` (extra set pieces), `extras`, `camera` (v1 camera keys plus the story shot modes), `music` (`{ "mood", "intensity", "volume" }` or `null` for silence).
- Character state carries over between scenes unless overridden:
  - **Carries over:** hp, defeated status, held prop and appearance changes.
  - **Does not carry over:** position (set per scene).
- A scene ends when its last beat ends plus `tail` (default 0.5 s), or at `duration` if given.

### 4.3 Beats in v2

Beats keep the v1 shape. The full v1 field list stays: `id`, `at`, `who`, `do`, `target`, `outcome`, `params`, `speed`, `approach`, `interrupt`, `fx`, `say`, `sayDur`.

New fields:

| Field | Meaning |
|---|---|
| `face` | Emotion to show from this beat on (section 7): `"face": "angry"` |
| `partner` | The other character in a paired interaction (section 9) |
| `object` | The object a beat acts on: a set piece id or a spawned object id (section 8) |
| `to` | A destination: `{ "x": 2400 }`, `{ "near": "<character or object id>", "gap": 80 }`, or `{ "exit": "right" }` |
| `bubble` | How `say` is drawn: `speech` (default), `think`, `shout`, `whisper` (section 7.2) |
| `layer` | Depth layer change (section 14) |

`who` is a character id or `"world"` (effects, camera, objects, narration and cards), as in v1.

A **macro beat** has its own shape: `{ "id", "at", "macro": "<name>", "params": { ... } }`, with no `who` or `do`. The compiler expands it into beats (section 11). In prose, macros are written with an `@` (`@fight`), but scripts use the `macro` field.

### 4.4 Frozen names (S0)

The full list of names lives in `engine/validator/v2_names.js` and the schema's `$defs`. Changes after S0 need a spec change.

| Group | Frozen names |
|---|---|
| `meta.kind` | `story`, `fight`, `clip` |
| `meta.audience` | `kids` (default), `general` |
| `meta.style` | `default`, `soft`, `ink` |
| Body plans | `stickman`, `buddy`, `kid`, `bulky`, `slim`, `elder` (all `rig: "humanoid"`; catalog names, checked by `E_BODY_UNKNOWN` since S3) |
| Faces | `neutral`, `happy`, `laugh`, `sad`, `cry`, `angry`, `furious`, `scared`, `surprised`, `determined`, `smug`, `tired`, `love`, `dizzy`, `hurt` (catalog names: the schema takes a string and the semantic stage checks it, `E_FACE_UNKNOWN`, like moves and themes) |
| Appearance | `eyes`, `brows`, `mouthStyle`, `cheeks`, `hair`, `hairColor`, `outfit`, `outfitColor`, `accessories` (name → color); option values are catalog strings checked by `E_APPEARANCE` since S3 |
| Voice | `pitch` 0.5-2, `speed` 0.7-1.4, `timbre`: `soft`, `squeaky`, `deep`, `robot` |
| Time / weather | `dawn`, `day`, `dusk`, `night` / `clear`, `cloudy`, `rain`, `snow`, `wind`, `fog` |
| Layers | `back`, `mid`, `front` |
| Transitions | `cut`, `fade`, `dissolve`, `wipe`, `iris`, `card`; fields `dur`, `color`, `dir`, `target`, `kind` (`title`, `chapter`, `time`, `end`), `title`, `subtitle`, `text` |
| Bubbles | `speech`, `think`, `shout`, `whisper` |
| Camera modes | v1 (`follow`, `focus`, `fixed`, `pan`, `push`) plus `two_shot`, `close_up`, `wide`, `over_shoulder` (with `from`), `track` |
| Moods | `happy`, `playful`, `calm`, `sad`, `tense`, `mysterious`, `heroic`, `battle`, `boss`, `triumphant`, `lullaby` |
| Ambience | `none`, `city_traffic`, `park_birds`, `rain`, `wind`, `crowd_murmur`, `cave_drip` |
| Extras behaviors | `walk_by`, `idle_chat`, `cheer`, `flee` |
| Beat macros | `dialogue`, `activity`, `walk_together`, `travel`, `enter`, `exit`, `fight`, `gauntlet`, `brawl`, `chase`, `defeat`, `grief` |
| Scene macros | `fight_card`, `montage` (each expands into several scenes) |
| Defeat styles | `ko`, `faint`, `vanish`, `ghost` (`general` only), `captured`, `flee` |
| Activities | `blow_bubbles`, `tennis_rally`, `play_catch`, `kick_ball`, `eat_together`, `dance_together`, `selfie`, `sleep`, `comfort` |
| Object behaviors | `static`, `seat`, `holdable`, `ball`, `floater`, `vehicle`, `breakable` |
| New world commands | `narrate`, `title_card`, `chapter_card`, `time_card`, `end_card`, `set_time`, `set_weather`, `set_music`, `shot`, `spawn_object`, `remove_object`, `set_object`, `set_appearance` (all v1 world commands stay) |
| New character commands | `use`, `ride`, `dismount`, `return` (sparkles re-form a vanished character) |
| New FX presets | `sparkle`, `sparkle_rise`, `tears`, `zzz`, `camera_flash`, `rope_bind`, `cage_drop`, `bubble_pop`, `confetti`, `halo` |

Renamed at the freeze (the old draft names now fail the schema): `"who": "@macro"` → `"macro"`; `think` field → `"bubble": "think"`; `appearance.accessory` → `accessories`; activity `rallies` → `reps`; transition `params` → flat fields; `audio.musicLibrary` removed (override files go in `assets/music/`).

## 5. Scenes, locations and transitions (5.5: art pipeline)

### 5.1 Locations (catalog + script)

A location bundles:
- a background theme;
- set pieces: static or interactive objects at stage positions;
- stage width;
- floor style;
- default ambience.

Themes grow from 7 to 15-20, using the existing layer-kind registry and new layer kinds:
- **New layer kinds:** `buildings` (street level, doors/windows), `trees`, `bushes`, `benches`, `lampposts`, `fence`, `clouds`, `rain`, `interior_wall`, `windows`, `furniture`, `cave`, `lair`.
- **New themes:** `city_street`, `city_park`, `home_interior`, `alley_night`, `rooftop_city` (exists), `forest_path`, `bridge`, `warehouse`, `villain_lair`, `tennis_court`, `cemetery_hill` (for a respectful memorial scene), `sunset_hill`.
- **Built in S1:** themes `city_park`, `city_street`, `home_interior`, `alley_night`, `villain_lair`; layer kinds `clouds`, `hills`, `trees`, `bushes`, `fence`, `buildings`, `lampposts`, `bricks`, `puddles`, `interior_wall`, `windows`, `furniture`, `cave`, `crystals`. The backdrop behind characters is kept mid-tone so both light and dark character colors pass `W_CONTRAST`.
- **Set pieces in S1** are drawn statically from `data/objects.js`: `bench`, `chair`, `table`, `tree_big`, `bush`, `lamppost`, `tennis_net`, `sign`, `crate`, `fountain`, `door` (with `state` open/closed). Back-layer pieces draw at 0.75 scale and 80% opacity, front-layer pieces at 1.15 after the characters. S4 adds behaviors.

```json
"locations": [
  { "id": "city_park", "theme": "city_park", "stageWidth": 3600,
    "set": [ { "id": "bench1", "object": "bench", "x": 1500 }, { "id": "tree1", "object": "tree_big", "x": 600, "layer": "back" } ],
    "ambience": "park_birds" }
]
```

### 5.2 Time of day and weather

- Each scene sets `time` (`dawn`, `day`, `dusk`, `night`) and `weather` (`clear`, `cloudy`, `rain`, `snow`, `wind`, `fog`). Both are presentation layers over the theme.
- `time` sets a color grade (tint, sky gradient shift, lit windows at night). `weather` adds particle layers and ambience.
- Both can change mid-scene with world commands `set_time` (`time`*, `dur` 0-10) and `set_weather` (`weather`*, `dur` 0-10), blending over `dur` (a happy scene turning grey and rainy).
- Grades: `dawn` warm pink, `day` none, `dusk` orange, `night` deep blue (multiply tints over the whole picture). Weather: `cloudy` grey tint, `rain` tint plus slanted streaks, `snow` flakes, `wind` drifting streaks, `fog` a light gradient, heavier near the floor.

### 5.3 Transitions

Transitions are set per scene (`transitionIn`, `transitionOut`). At a boundary the next scene's `transitionIn` wins, then the previous scene's `transitionOut`, else `cut`. Transitions hold the story clock (ADR-016). Mid-scene, the v1 `fade` and `cut` world commands still work.

| type | Look |
|---|---|
| `cut` | Instant |
| `fade` | Through black (or `color`) |
| `dissolve` | Cross-fade between the last frame of one scene and the first of the next (both are rendered; random access keeps this simple) |
| `wipe` | Directional wipe (`dir`) |
| `iris` | Circle closing on a character (`target`; the first character if it is not in the previous scene) and opening on it in the next scene |
| `card` | A full-screen card between scenes: `kind` `title` (`title`, `subtitle`), `chapter`, `time` or `end` (`text`) (section 7.3) |

### 5.4 Timeline model

- The story clock runs continuously across scenes. Scene k starts when scene k-1 ends. Transitions and cards between them hold the story clock: they add video time but no simulation time (ADR-016).
- RNG streams are scoped per scene, so editing one scene does not change the randomness of another.
- The engine simulates scenes one after another in one world. At a scene boundary it resets stage, positions, camera and set pieces, and keeps character state.
- The frame store records a scene index per frame, so the renderer picks the location.

## 5.5 Art pipeline (minimal manual work)

Decision 6: code-drawn or imported SVG, whichever needs less manual work.

- **Default: procedural.** Backgrounds, objects, bodies and faces are drawn in code from catalog data (shapes, colors, seeded variation). Adding a theme or object means adding data, not drawing.
- **Optional SVG import** for things that are hard to draw in code (a detailed castle, a car):
  - `tools/svg_import.mjs` converts an SVG file into catalog data (paths, fills, anchor points) at build time, so the engine stays I/O-free and deterministic.
  - Imported art is flattened to the style palette and outline width, so it matches the stick look.
  - License/source is recorded in `assets/art/SOURCES.md`.
- **LLM-assisted authoring, reviewed by eye.** Instead of hand-posing every new move, object or theme:
  - `tools/draft.mjs move|object|theme "<description>"` asks an LLM (any provider, or copy-paste) to draft catalog data from the description, the data format and similar existing entries.
  - The draft is checked automatically: move data checks (anticipation, ground contact, hit windows), render sanity (no NaN, on stage), and a filmstrip/contact sheet.
  - A person only approves or rejects the filmstrip, and touches the editor when needed.

## 6. Cast: body plans, appearance and faces

### 6.1 Body plans (same skeleton, different bodies)

Every body plan keeps the **same joint topology and pose channels** as the stickman: head, neck, torso, two arms and two legs. **All 72 existing moves therefore work for every body plan.** A body plan changes:
- bone lengths and head size (proportions);
- the body shape drawn over the bones;
- the face;
- default style and hurtboxes.

| Body plan | Look | Notes |
|---|---|---|
| `stickman` | Today's figure | Default |
| `buddy` | Short, round capsule body (torso drawn as a filled capsule), short limbs, large eyes, optional antenna or hat | The "sidekick" friend. **Must be an original design**: not yellow with goggles and overalls, which is trademarked trade dress (section 21). |
| `kid` | Small, big head ratio | Children, younger siblings |
| `bulky` | Wide chest (filled trapezoid torso), thick limbs | Guards, brutes; combines with `scale` |
| `slim` | Long limbs, small head | Villain, elegant characters |
| `elder` | Slight stoop baked into the default pose offsets (a cane comes with the S4 objects) | Mentors, shopkeepers |

Implementation (S3, ADR-015):
- Plans are data (`data/bodies.js`): bone lengths and line width (`dims`), a draw style (`stick`, `capsule` for the buddy, `trapezoid` for bulky), `torsoWidth` for filled torsos, an optional `posture` (the elder's stoop) and default `appearance`.
- `computeJoints(pose, root, facing, scale, dims)` and `lowestPoint(joints, scale, dims)` take the plan's dims (default: the stickman). Ground contact, reach and aim (`limbReach`, `canReach`, `resolveAimPoint`, `applyAimIK`), hurtboxes (filled torsos have wider torso hurtboxes), whiff gaps, projectile heights, the camera and the accessories all read them.
- Moves stay authored for the stickman. Reach is derived per plan (cached per dims). Forward root motion (steps, travel, approach speed, dodge distance) scales with the plan's leg ratio; heights (jumps) scale with `scale` only, so contact heights stay comparable across plans.
- The elder's stoop eases out over about 0.17 s while attacking, so strikes use the plan's plain geometry (the geometry reach derivation assumes).
- The reach check gives the lean assist only to shoulder-rooted strikes (arms, weapons); kicks and knees get none, so impossible kicks (a tall slim fighter's flying kick on a kid) are reported (`W_REACH`) instead of faked.
- Frame store: the plan name is stored once per character per scene segment (constant), not per frame.
- Renderer: `renderer/bodies.js` draws filled torsos and outfits (below the hips, garments hang straight down); `renderer/appearance.js` draws hair, masks, eyepatches, antennas, crowns, bowties and backpacks; `renderer/looks.js` merges plan defaults, the cast appearance and `set_appearance` changes.
- The stickman plan is the v1 body object itself, so v1 scripts compute and render exactly as before (golden frames and every sample's warnings unchanged).

### 6.2 Future: other topologies

Animals, birds and vehicles need different skeletons. The design keeps the door open: a body plan has a `rig` field (`"humanoid"` for all v2 plans). A later version can add `quadruped` with its own pose channels and move set. The validator rejects humanoid moves on non-humanoid rigs (`E_MOVE_RIG`).

### 6.3 Appearance

| Field | Options |
|---|---|
| `eyes` | `dot` (default stickman), `big`, `oval`, `sleepy`, `visor`, `glasses` |
| `brows` | `none`, `thin`, `thick` |
| `mouthStyle` | `line` (default), `cartoon` |
| `cheeks` | color (blush) |
| `hair`, `hairColor` | `none`, `spiky`, `bob`, `ponytail`, `cap`; a color |
| `accessories` | Name → color. Existing (headband, scarf, cape, hat; also accepted in the v1 `style`) plus `antenna`, `bowtie`, `mask`, `crown`, `backpack`, `eyepatch` |
| `outfit`, `outfitColor` | Optional filled torso garment: `none`, `shirt`, `coat`, `armor`, `robe`; a color |

- Option names are catalog data (`data/appearance.js`); the schema takes strings and the validator checks them (`E_APPEARANCE`), together with things worn in the same place (`hat` + `crown`, a `cap` hairstyle with a hat or crown, `mask` or `eyepatch` with `visor` eyes) and colors without their item (`hairColor` without `hair`, `outfitColor` without `outfit`). An unknown body plan is `E_BODY_UNKNOWN`.
- A body plan's `appearance` gives defaults (buddy: big eyes; elder: sleepy eyes, thick brows, white bob); the cast entry's appearance wins.
- Eye styles replace the plain dot of neutral-type faces (`big`, `oval`, `sleepy`); `visor` replaces the eyes with a glowing band; `glasses` adds rings. Expressive eyes (happy arcs, tears, spirals) still win. `brows: "none"` hides brows; `thick` draws them heavier. `mouthStyle: "cartoon"` makes mouths about a third bigger. `cheeks` adds a soft blush in that color.

Appearance may change in a beat with the `set_appearance` world command: `params.who`* is the character, plus flat fields such as `"accessory": "headband", "color": "#ff3b5c"`, `"remove": true`, or any of `eyes`, `brows`, `mouthStyle`, `hair`, `hairColor`, `outfit`, `outfitColor`, `cheeks`. Changes carry across scenes. For example, the hero ties on a headband before the journey.

### 6.4 Visual style presets

`meta.style` picks the line and face style:
- `default`: today's outlined sticks.
- `soft`: rounder joints, thicker outline.
- `ink`: hand-drawn wobble, deterministic from the seed.

Faces scale with the camera so they read in close-ups.

## 7. Emotions, dialogue and narration

### 7.1 Emotions (faces)

- `face` values: `neutral`, `happy`, `laugh`, `sad`, `cry`, `angry`, `furious`, `scared`, `surprised`, `determined`, `smug`, `tired`, `love`, `dizzy`, `hurt`.
- Each face is catalog data (`data/faces.js`): `eyes` (`dot`, `wide`, `happy`, `closed`, `squeeze`, `half`, `spiral`, `heart`), `brows` (`tilt` in degrees, positive = worried, negative = angry; `lift`), `mouth` (`line`, `smile`, `grin`, `open`, `frown`, `o`, `wavy`, `smirk`, `teeth`), `talk` (the mouth used while speaking) and `extras` (`tears`, `vein`, `sweat`, `hearts`, `blush`).
- The base face is set by a scene cast entry's `face` or a beat's `face` ("from this beat on"), and carries over to later scenes unless the scene cast sets one. Story characters start `neutral`; v1 characters have no face (the v1 dots and mouth).
- What is drawn each frame (highest first): knocked out → `dizzy`; hit → `hurt` for 0.4 s; a move with its own face (`cry`, `sigh`, `gasp`, ... via the move's `face` field) → that face; an attack with a neutral base face → `determined`; otherwise the base face. A neutral face takes the move's v1 mouth (`shout` → open, `grin` → grin).
- Level of detail: a neutral face on a head smaller than 30 px on screen draws only the two dots (the classic look); every other face, and any close-up, draws brows, mouth and extras.
- Blinking is automatic: every 2.6-5 s per character, 0.12 s, deterministic from the seed and the id. Eyes look toward whoever else is talking.
- Mouth flaps while a character speaks: the mouth is open exactly while a speech syllable sounds (section 15), so sound and mouth match. No lip-sync.
- Frame store: one face index per character is added (CHAR_STRIDE 34). The mouth flap is derived from the say events at render time (ADR-012), so no mouth-open bit is stored.
- A headband sits higher on story characters so it never covers brows and eyes.

### 7.2 Dialogue

| Field / command | Effect |
|---|---|
| `say` | Speech bubble (as v1) with the speaker's name when `meta.speakerNames` is true |
| `"bubble": "think"` | Cloud-shaped thought bubble |
| `"bubble": "shout"` | Jagged bubble, larger font |
| `"bubble": "whisper"` | Small dotted bubble |
| `sayDur` | As v1. In story scripts the default is the reading time: 1.2 s + 0.06 s per character, minimum 1.5 s (kids read slower). v1 keeps 1.2 s. |

- Bubble looks: speech is the v1 bubble; `think` is a cloud with two trailing puffs (silent: no speech sounds); `shout` is a jagged yellow burst with larger red letters; `whisper` is a small dashed bubble in italic, played quieter.
- With `meta.speakerNames`, a tag with the cast `name` (in the character's color) sits on the bubble's top-left corner.
- `W_DIALOGUE_FAST` warns when an explicit `sayDur` is shorter than the reading time, or when a character starts a new line while its previous bubble is still showing.
- New emotes (S2): `cry`, `clench_fist`, `sigh`, `gasp`, `jump_joy`, `hold_head`, `nod` (loop, `cycles`), `shake_head` and `look_around` (in profile, turning the head is a facing flip), `talk` (gesture loop, `cycles`). Each may carry a `face` shown while it runs.

- Dialogue exchanges use the `@dialogue` macro (section 11): a list of `[speaker, text, face?, bubble?]` lines, timed automatically, with faces and `talk` gestures.
- The text limit per bubble stays at 40 characters. The macro splits longer lines into consecutive bubbles.

### 7.3 Narration and cards

New world commands:

| do | params | Look |
|---|---|---|
| `narrate` | `text`* (max 160), `pos` (top, default; bottom), `dur` (default: reading time), `style` (box, default; plain) | Narration box with a typewriter reveal and a soft chime (S2, section 15) |
| `title_card` | `title`* (max 60), `subtitle`, `dur` (default 3), `bg` | Full-screen title, for example at the start |
| `chapter_card` | `text`* (max 80), `dur` (default 2.5), `bg` | "Chapter 2: The Path" |
| `time_card` | `text`*, `dur` (default 2.5), `bg` | "One sudden day..." between scenes |
| `end_card` | `text`*, `dur` (default 3), `bg` | "The End" / "To be continued" |

Cards pause character simulation: the story clock holds, like `freeze`, and the card has its own duration. A beat chained `after` a card starts when the card ends.

## 8. Objects and set pieces

Objects are non-character things in the world: catalog data with a shape, a size, and one **behavior**.

| Behavior | Examples | What it does |
|---|---|---|
| `static` | bench, tree, lamppost, car, door, sign, table, fountain | Drawn at x (and layer); characters can stand in front of or behind it; doors and boxes have open/closed states |
| `seat` | bench, chair, rock | `sit` moves snap the character's hip to the seat point |
| `holdable` | racket, bubble wand, balloon, phone, ice cream, flower, book, the v1 weapons | Held like v1 props (grip hand, angle), picked up, given, dropped, thrown |
| `ball` | tennis ball, football, basketball | Follows deterministic arcs between points; bounces on the floor; hit events |
| `floater` | bubbles, balloons, leaves, petals | Rises or drifts with seeded wobble; pops or fades after a lifetime |
| `vehicle` | car, bike, scooter, bus | Moves along the floor with wheels turning; characters can ride (hip snapped to the seat) |
| `breakable` | crate, vase, wall panel | Breaks into pieces (reuses `prop_break` FX) when hit |

- v1 `props` become `holdable` objects. The `prop` field and `pick_prop`, `drop_prop` and `throw_prop` keep working.
- Objects are simulated in the world and stored in the frame store's sparse item list: position, angle, state and a visibility frame range.
- Object commands (who `world`, or a character acting on `object`):

| Command | Meaning |
|---|---|
| `spawn_object` / `remove_object` | Place or remove an object (x, y, layer) |
| `set_object` | Change state (door open, light on, color) |
| `give` | Character hands a holdable to `partner` (paired move) |
| `use` | Character uses a holdable: the object's `use` animation, for example the bubble wand emitting bubbles |
| `ride` / `dismount` | Get on or off a vehicle |

## 9. Interactions (paired moves)

Paired moves are move data with two tracks: the **lead** (the beat's `who`) and the **partner**.

```js
{ name: "hug", category: "interaction", duration: 1.6, pair: { gap: 18, partnerMove: "hug_partner" },
  keys: [...], partnerKeys: [...] }
```

- **Positioning:** like attacks today, the lead needs to stand at `gap` from the partner, facing them. `approach` works for interactions too: walk is fine here, and the default is `"walk"`.
- **Timing:** the partner is busy for the duration. A partner that is busy waits, like the v1 queue.
- **Body-plan aware:** the gap and hand targets use 2-bone IK so a hug between a stickman and a short buddy lines up. This is the same aiming system attacks use.
- **Starter set (S5):** `hug`, `high_five`, `fist_bump`, `handshake`, `pat_head`, `carry` / `put_down`, `give` / `receive`, `piggyback`, `lift_up`, `drag`, `lean_on`, `comfort` (hand on shoulder), `walk_together` (synchronized walking, hand in hand optional).

## 10. Activities

An activity is a short loop of moves synchronized with objects. It is catalog data and is used through the `@activity` macro or the activity's own command.

| Activity | Parts | Compiles to |
|---|---|---|
| `blow_bubbles` | wand (holdable), bubbles (floater) | `use` loops; each puff spawns 3-6 bubbles with seeded wobble; a partner can `pop_bubble` (poke move + pop FX + `pop` SFX) |
| `tennis_rally` | two rackets, a ball, an optional net set piece | Both players `swing_forehand` / `swing_backhand` with the ball arcing between racket tips; `reps: N` rallies; a `miss` ending (ball bounces past one player, who laughs or flops) |
| `play_catch` | ball | throw/catch moves with arcs |
| `kick_ball` | football | dribble/kick/goal |
| `eat_together` | food items, table | sit, eat loops, laugh |
| `dance_together` | none | Mirrored dance moves (existing `dance_a`/`dance_b`, plus new ones) |
| `selfie` | phone | Pose plus a flash FX |
| `sleep` | bench or bed | lie down, `zzz` FX |
| `cry_together`, `comfort` | none | sad faces, `comfort` paired move, tears FX |

Each activity is parameterized:
- `dur` or `reps`;
- intensity;
- an ending: `win`, `miss`, `laugh` or `interrupted`.

**Interruptions:** an activity can be cut off by any later beat with `interrupt`. The villain's arrival interrupts the tennis.

## 11. Story macros and the compiler

Macros are written as macro beats, `{ "id": "boss", "at": ..., "macro": "fight", "params": { ... } }` (section 4.3). The **story compiler** (deterministic; `engine/story/compile.js`, ADR-014) expands them into ordinary beats with generated ids (`<macroId>_<n>`). It also exposes the macro's anchors so other beats can chain on them: `{ "on": "boss.finisher" }`.

### 11.1 Beat macros (frozen params; required params in bold)

| Macro | Params | Anchors | Expands to |
|---|---|---|---|
| `@dialogue` | **`lines`** `[[who, text, face?, bubble?], ...]` (text ≤ 120, split into 40-character bubbles), `gap`, `gestures`, `camera` (`auto`/`none`) | `line<N>` | Alternating `say` beats with talk gestures, automatic timing, faces |
| `@activity` | **`name`**, **`with`** `[ids]`, `reps` or `dur`, `intensity`, `ending` (`win`/`miss`/`laugh`/`interrupted`), `winner`, `object` (a set piece to use) | `ending` | The activity's synchronized moves and object events (section 10) |
| `@walk_together` | **`who`** `[ids]`, **`to`**, `pace` (walk/run), `holdHands` | | Synchronized walk/run |
| `@travel` | **`who`** `[ids]`, **`to`**, `mode` (walk/run/sneak), `camera` (track/wide/none) | | A long move with camera follow |
| `@enter` / `@exit` | **`who`**, **`side`**, `mode`; enter also `to` (default: the cast `x`) | | Walk or run in or out of frame |
| `@fight` | **`sides`** `[a, b]`, **`winner`**, `exchanges` (1-30), `intensity` (low/medium/high), `style` (even/dominant/comeback/close), `finisher`, `ko` (default true), `phases` `[{exchanges, style, intensity, chargeUp}]` | `finisher`, `ko` | A full choreographed 1v1 using v1 attacks (section 12) |
| `@gauntlet` | **`hero`**, **`opponents`** `[ids]` (1-6), `per`, `travel` (walk/run/none), `intensity`, `finisher`, `afterDefeat` (stay/fade) | `opponent<N>`, `finisher` | Sequential fights: each opponent engages in turn, the others wait in a ring |
| `@brawl` | **`teams`** `{a: [ids], b: [ids]}`, **`winner`** (`a`/`b`), `dur`, `intensity` | | Group fight with turn-taking attackers |
| `@chase` | **`runner`**, **`chasers`** `[ids]`, `dur`, `obstacles` (0-6), `caught` | `caught` | Runs, jumps over obstacles, near misses |
| `@defeat` | **`who`**, **`style`**, `by` | `gone` | The stylized defeat sequence (section 13) |
| `@grief` | **`who`**, `over`, `dur`, `rain` | | Kneel, cry, rain, desaturate, slow music |

Every beat macro also has the anchors `start` and `end`. `<N>` is 1-based (`line2`, `opponent3`).

### 11.2 Scene macros

A scene macro is an entry in `scenes` with `{ "id", "macro", "params" }` (plus optional `transitionIn`, `transitionOut`, `music`). It expands into several scenes.

| Macro | Params | Expands to |
|---|---|---|
| `@fight_card` | **`matchups`** `[{sides, winner, location?, exchanges?, style?}]` (1-6), `title`, `intro`, `breathers`, `finale` (boss/plain), `minDur` (default 180) | A fight-only video: title card, intro, rounds, breathers, finale, end card (section 12) |
| `@montage` | **`clips`** `[{location, who, do?, time?, weather?, text?}]` (2-8), `clipDur`, `cut` (cut/dissolve/wipe) | Short sub-scenes with quick cuts and one music bed |

### 11.3 Compiler rules

- **Deterministic:** the same input and seed give the same beats. Each macro uses its own stream `compile:<macroId>`, so editing one macro never changes another's expansion.
- **Inspectable:** `node tools/compile.mjs story.json` prints the expanded beats, and the validator's timeline shows them.
- **Expansions respect the catalog:** move pools come from catalog categories and tags, and filter by held prop and body plan.
- An author can "eject" a macro, replacing it with its expanded beats to hand-tune them.

## 12. Fights at story scale

- `@fight` generates a 1v1:
  - opening stance and taunt;
  - N exchanges with mixed outcomes, weighted toward the eventual winner as `intensity` rises;
  - a mid-fight reversal for `style: "comeback"`;
  - an emphasized finisher (slowmo, focus camera, text pop).
  It uses the v1 approach/aim system, so every attack has `"approach": "run"` by construction.
- `@gauntlet` and `@brawl` handle many opponents:
  - Opponents not currently engaged hold a **waiting ring** at 300-600 px. They taunt, circle or hold guard.
  - At most two attack at once, with staggered timing.
  - Defeated opponents stay down; they are faded out after the fight, or kept.
- **Boss fights** use the same machinery, with phases (`phases: [{ exchanges, style }]`) and optional `charge_up` and energy moves between phases.
- Positions and the camera are handled by the compiler. Scripts only state who fights whom, how long, and who wins.
- **Fight-only videos (at least 3 minutes)** are a story with fight-focused scenes, which keeps them watchable at that length:
  - an intro (rivalry, taunts, a title card);
  - 3-5 **rounds** in varied locations or arena states, each a `@fight` or `@brawl` with rising intensity;
  - breathers between rounds (recovery, banter, `charge_up`, crowd reactions);
  - a final round with a boss phase and an emphasized finisher;
  - a victory and an end card.
  The `@fight_card` macro builds this structure from a list of matchups.

## 13. Defeat, sadness and content policy

The engine stays **family friendly and gore free**. Stories may include loss and revenge, shown in a stylized way.

| Defeat style | Look | Use |
|---|---|---|
| `ko` | v1 KO: falls and stays down | Ordinary fight losers |
| `faint` | Slumps, eyes become X or spirals | Comedic or mild |
| `vanish` | Falls, then dissolves into rising sparkles | A sidekick's loss, non-graphic |
| `ghost` | A translucent copy floats up with a halo; the body fades | Emotional loss, still non-graphic |
| `captured` | Bound by a stylized rope/cage effect, dragged off | Villain defeat that isn't lethal |
| `flee` | Defeated character runs off-screen | Comedic villain ending |

- **On-screen text:** narration and dialogue avoid explicit words such as "killed" and "dead body". Use "defeated", "taken from him", "gone", "lost". The blocklist keeps graphic terms and gains a **soft list**: words that produce warnings (`W_TEXT_SOFT`) with a suggested alternative, rather than errors.
- The villain's final defeat should prefer `ko`, `captured`, `vanish` or `flee` over anything that reads as an execution.
- **Audience setting:** `meta.audience: "kids" | "general"`. **The default is `kids`** (decision 7).

| Rule | `kids` (default) | `general` |
|---|---|---|
| Defeat styles allowed | ko, faint, vanish, captured, flee | all, including ghost |
| A loved character's loss | Must be temporary or hopeful: the story should bring them back or show they're safe by the end (W_KIDS_NO_HOPE if not) | May be permanent |
| Soft-list words (warnings with alternatives) | kill, killed, die, dead, death, murder, hate, stupid, idiot, shut up, weapon names in dialogue | kill, killed, murder |
| Impacts | Cartoon only: stars, "POW!", "BONK!" text pops, squash; no lingering on a hurt face | As v1 |
| Weapons | Swords, bats and staffs allowed in fights; blasters fire cartoon energy; no held weapon aimed at a defenseless character. A villain's energy attack on a defenseless character is allowed as a story incident (S0 sign-off), for example Vex's blast at Pip | As v1 |
| Revenge arcs | Reframed as rescue or justice in narration ("Kai set out to save Pip"); the villain is captured, flees or reforms | Revenge allowed; the villain is defeated |
| Narration tone | Short sentences, simple words, a clear lesson at the end (friendship, courage) | Free |

- **YouTube "made for kids":** the review queue metadata suggests `madeForKids: true` for `kids` scripts. Publishing settings stay with the human reviewer.

## 14. Depth, extras and crowds

- **Layers:** `back` (scaled 0.75, desaturated a little, behind set pieces), `mid` (default, interactive), and `front` (scaled 1.15, may blur by alpha, drawn last).
- Characters and objects have a layer. Only `mid` takes part in combat and interactions.
- **Extras:** non-named background characters, generated by a location or scene `extras` entry:
  `{ "count": 6, "layer": "back", "behavior": "walk_by" | "idle_chat" | "cheer" | "flee" }`.
  They use seeded colors and body plans and do not need cast entries. They are rendered with reduced detail so they never compete with the leads.
- **Crowds** (the v1 `crowd` layer kind) gain reactions tied to events: cheering on hits, gasping on a defeat.

## 15. Audio: moods, ambience, voice

**Music is generated procedurally** (decision 4), in `/tools` like the SFX synth, so there are no licenses to manage and no manual work.

- **Moods:** `happy`, `playful`, `calm`, `sad`, `tense`, `mysterious`, `heroic`, `battle`, `boss`, `triumphant`, `lullaby`.
- **A mood is data** (`data/music_moods.js`):
  - key and scale (major, minor, dorian, pentatonic);
  - tempo range;
  - chord progression pool;
  - drum pattern pool;
  - instrument patches (built from the existing synth: square/triangle leads, plucked bass, soft pads, noise drums);
  - intensity levels.
- **Generator** (`tools/lib/music_gen.mjs`):
  - seeded per scene, so the same script gives the same music;
  - builds 8- or 16-bar loops with an intro and an ending;
  - follows scene length;
  - raises intensity on fight macros;
  - drops to a sting at defeats.
- **Mixing:** music crossfades at scene boundaries, ducks under dialogue and narration, and lands the ending on the last scene's final beat.
- **Kids-friendly sound:** bright timbres, no harsh distortion, gentle levels (music bus about -18 LUFS short-term under dialogue).
- **Override:** a file placed in `assets/music/` with the mood name (`happy.mp3`) replaces the generated track.
- **Mid-scene changes:** the `set_music` world command (`mood`, `intensity`, `volume`, `fade`) changes the music inside a scene; fight macros raise `intensity` on their own.

**Ambience beds** per location or weather (`city_traffic`, `park_birds`, `rain`, `wind`, `crowd_murmur`, `cave_drip`). They are procedural, like the SFX, or come from files.

**New SFX keys:**
- `bubble_blow`, `bubble_pop`, `racket_hit`, `ball_bounce`;
- `footstep_soft` / `footstep_hard`, `door_open`, `car_pass`;
- `sad_sting`, `heartbeat`, `magic_sparkle`, `gasp`, `laugh_small`, `cry_small`;
- `card_whoosh`.

**Voice: speech sounds only** (decision 3).
- Each speaking character makes procedural babble ("Animal Crossing"-style syllables) while its mouth flaps. It is language-free, so videos work for any audience, and deterministic.
- `voice` per cast member: `pitch` (0.5-2), `speed` (0.7-1.4), `timbre` (`soft`, `squeaky`, `deep`, `robot`).
- Narration has no voice: a soft "page" chime (`narrate_chime`) when a narration box appears, with the text on screen long enough to read (kids reading speed: 0.06 s per character + 1.2 s, minimum 2.5 s).
- **How it works (S2):** `engine/story/speech.js` turns a line into syllables, one per vowel group of the text (at most 30, fitted inside the bubble time): 0.13 s apart at speed 1, 0.09 s long, with a small seeded pitch wobble; questions rise at the end, exclamations and shouts start higher, whispers are quieter, thoughts are silent. Each syllable is an audio event `voice:<timbre>:<vowel>:<semitones>`; `tools/lib/speech.mjs` synthesizes it (harmonics of the pitch shaped by two vowel formants; `squeaky` +5 semitones and brighter, `deep` -7, `robot` odd harmonics with ring modulation). The base pitch is 220 Hz × `pitch`. `audio.voices: false` turns speech sounds off.

## 16. Camera for stories

- **New shot modes:**
  - `two_shot` (frame two characters tightly);
  - `close_up` (head and shoulders on `target`, for emotional beats);
  - `wide` (whole stage);
  - `over_shoulder` (offset toward `target`, past `from`);
  - `track` (follow one character during travel with lead room).
- **Auto camera for stories (`meta.autoCamera: "story"`):**
  - picks two-shots for dialogue;
  - close-ups on `cry`, `furious` and `determined` faces;
  - wides on scene starts;
  - v1 fight rules during fights.
  Explicit camera keys always win.
- `shot` beats for quick cut sequences: `{ "who": "world", "do": "shot", "params": { "mode": "close_up", "target": "kai" } }`.

## 17. Validator v2

The validator keeps its three stages:
1. **Structure:** the v2 schema; the v1 schema is still accepted.
2. **Meaning:** semantic checks.
3. **Dry run:** compile, then simulate.

New semantic checks:
- Cast, locations, scenes and objects are referenced correctly.
- Macro params are valid.
- Paired moves have a partner.
- Activities have their objects.
- Faces exist.
- Body plans exist.
- The defeat style is allowed for the audience.
- Characters act only in scenes where they are present.

New dry-run checks:
- Interaction partners are reachable.
- Ball and object paths stay on stage.
- Macro expansions are valid.
- Scene lengths are within limits.
- Dialogue reading speed is not too fast.

The timeline report groups events by scene and shows macro expansions indented under the macro beat. The full list of new codes is in Appendix B. Every code appears in the LLM prompt, enforced by the existing prompt/validator sync test.

## 18. LLM generation for stories

**Two-stage generation** keeps prompts small and lets each stage be repaired on its own:

1. **Story outline** (one call): logline, cast (with body plans and looks), locations, and a scene list (purpose, mood, approximate length, key events, narration lines). A 5-minute story has 10-16 scenes of 15-40 s each. A 3-minute fight video has 6-10 scenes (intro, rounds, breathers, finale).
2. **Scene scripts** (one call per scene): each gets the outline, the cast and location definitions, the previous scene's end state, the catalog subset relevant to it, and the scene-writing rules. Macros are preferred, so scenes stay short.
3. **Assembly and validation:** scenes are assembled into one v2 script and validated. Repairs target the failing scene only, with the error codes and the scene's timeline.
4. **Critique** (optional): a contact sheet per scene plus a story-level critique (does the arc land?).

Other changes:
- **Copy-paste mode** (`tools/manual.mjs story ...`) follows the same flow: an outline prompt, then one prompt per scene, `check` per scene, and `assemble`.
- **Prompt pack additions:** a story rules section, a macro reference, face/activity/object tables generated from the catalog, two example stories (one slice-of-life, one with the full arc), and the content policy (section 13).
- **Length targets:** the outline must add up to the minimum length (300 s stories, 180 s fights) with a margin. After assembly, the dry-run length is checked; short stories get one "extend" round (add a scene or lengthen activities) before being dropped.
- **Kids rules in every prompt** when `meta.audience` is `kids`: the table in section 13, plus the soft-list words.
- **Scoring for stories:**
  - an arc (setup → incident → journey → climax → resolution);
  - variety of scene types (not all fights);
  - emotional beats (faces other than neutral);
  - narration coverage;
  - the v1 fight score inside fight scenes.

## 19. Limits and performance

| Limit | v1 | v2 |
|---|---|---|
| Duration (max) | 180 s | 900 s for every script (v1 fight scripts too: raising the maximum keeps v1 scripts valid) |
| Duration (minimum for generated videos) | none | stories 300 s, fight-only videos 180 s (decision 5). The validator warns (`W_STORY_SHORT`, `W_FIGHT_SHORT`); the generation pipeline treats it as a failed score |
| Characters on stage | 6 | 8 named + 12 extras per scene; 16 in the cast |
| Beats | 200 | 4,000 after compilation; 600 authored |
| Script size | 64 KB | 512 KB |
| Scenes | 1 | 40; each at most 300 s |
| Stage width | 1,600-8,000 | 1,600-12,000 per location |
| Locations | - | 20 |

- **Performance target:** rendering at least real time at 1080p60 on an M-series Mac, so a 5-minute story renders in about 5 minutes. Extras use simplified drawing.
- **Frame store:** per-frame size grows with characters on stage, not with the cast size, because absent characters aren't stored. About 1 KB/frame at 8 characters, or 54 MB for 15 minutes: fine.
- **Validation of long scripts** (dry run of a 5-minute story) should take under 5 s.
- **Long videos:** `record.mjs --scene N` renders one scene for quick review.

## 20. Backward compatibility

- `version: 1` scripts are converted on load into a v2 story (ADR-016): one cast built from `characters`, one location from `meta.theme` and `meta.stageWidth`, one scene `main`, `meta.kind: "clip"`, `meta.audience: "general"`, and the unscoped RNG stream names. Golden frames and determinism hashes for v1 samples must not change.
- v1 beat fields, world commands (including `set_theme`), camera keys and character `style` stay valid inside v2 scenes. v2 has no `characters` alias: v2 scripts use `cast`.
- v1 tools (`validate`, `record`, `generate`, `manual`) accept both versions.

## 21. Decisions (signed off 2026-10-16)

| # | Question | Decision |
|---|---|---|
| 1 | How to show "killing" | Stylized and non-graphic. A loved character vanishes into sparkles (or ghost, `general` only); villains end knocked out, captured or fleeing. "Kill", "dead" and similar words are soft-listed with suggested alternatives (section 13). |
| 2 | Sidekick design | An original `buddy` body plan (default: teal, round, one antenna, big eyes). No look-alikes of trademarked characters. |
| 3 | Voice | Speech sounds only: procedural babble per character. No TTS and no voice-over (section 15). |
| 4 | Music | Generated procedurally by mood, deterministic per seed; a file override is possible (section 15). |
| 5 | Length | Stories at least 5 minutes; fight-only videos at least 3 minutes (sections 12, 18, 19). |
| 6 | Art | Procedural by default; optional SVG import; LLM-drafted catalog data reviewed by eye, to minimize manual work (section 5.5). |
| 7 | Audience | Kids first, general too: `meta.audience` defaults to `kids` with kid-friendly rules (section 13). |

---

## 22. Appendix A: the reference story as a v2 script (abridged)

This is the acceptance script for the story milestones, in the frozen v2 names. It is kept as a test fixture (`tests/fixtures/v2/reference_abridged.json`) that must pass the schema.

- It is abridged: the full acceptance version stretches each scene and adds a city intro, a morning routine, a travel montage and a homecoming, to reach the 5-minute minimum (about 12 scenes).
- It uses the **kids** default:
  - Pip vanishes into sparkles ("Vex took Pip away");
  - Kai sets out to save him;
  - Vex is captured;
  - Pip's sparkles return at the end (`return`) for a reunion hug.

```json
{
  "version": 2,
  "meta": { "title": "Bubbles and the Brave Heart", "format": "landscape", "seed": 2024, "kind": "story", "audience": "kids", "autoCamera": "story", "speakerNames": true },
  "cast": [
    { "id": "kai", "name": "Kai", "body": "stickman", "color": "#3fd8ff", "style": { "headband": "#ff3b5c" }, "voice": { "pitch": 1.0, "timbre": "soft" } },
    { "id": "pip", "name": "Pip", "body": "buddy", "color": "#2fd3c0", "appearance": { "eyes": "big", "accessories": { "antenna": "#ffcc00" } }, "voice": { "pitch": 1.5, "timbre": "squeaky" } },
    { "id": "vex", "name": "Vex", "body": "slim", "color": "#8a2be2", "style": { "cape": "#1a1a1a" }, "appearance": { "eyes": "oval", "brows": "thick" }, "voice": { "pitch": 0.7, "timbre": "deep" }, "hp": 200 },
    { "id": "g1", "body": "bulky", "color": "#ff7a3d" },
    { "id": "g2", "body": "bulky", "color": "#ffb13d" },
    { "id": "g3", "body": "bulky", "color": "#e04f8a", "prop": "staff" },
    { "id": "g4", "body": "bulky", "color": "#c8c84a", "scale": 1.6 }
  ],
  "locations": [
    { "id": "park", "theme": "city_park", "stageWidth": 3600, "ambience": "park_birds",
      "set": [ { "id": "bench1", "object": "bench", "x": 900 }, { "id": "tree1", "object": "tree_big", "x": 600, "layer": "back" }, { "id": "net", "object": "tennis_net", "x": 1700 } ],
      "extras": [ { "count": 3, "behavior": "walk_by", "layer": "back" } ] },
    { "id": "street", "theme": "city_street", "stageWidth": 6000, "ambience": "city_traffic" },
    { "id": "lair", "theme": "villain_lair", "ambience": "cave_drip" }
  ],
  "scenes": [
    { "id": "s1", "location": "park", "time": "day", "music": { "mood": "happy" },
      "transitionIn": { "type": "card", "kind": "title", "title": "Bubbles and the Brave Heart" },
      "cast": [ { "id": "kai", "x": 1300, "facing": 1, "face": "happy" }, { "id": "pip", "x": 1550, "facing": -1, "face": "happy" } ],
      "beats": [
        { "at": 0.3, "who": "world", "do": "narrate", "params": { "text": "Kai and Pip were the best of friends." } },
        { "id": "bub", "at": 1, "macro": "activity", "params": { "name": "blow_bubbles", "with": ["pip", "kai"], "dur": 6, "ending": "laugh" } },
        { "id": "ten", "at": { "after": "bub", "delay": 0.4 }, "macro": "activity", "params": { "name": "tennis_rally", "with": ["kai", "pip"], "reps": 4, "ending": "miss", "object": "net" } },
        { "id": "hf", "at": { "after": "ten" }, "who": "kai", "do": "high_five", "partner": "pip", "approach": "walk", "face": "laugh" }
      ] },
    { "id": "s2", "location": "park", "time": "dusk", "music": { "mood": "tense" },
      "transitionIn": { "type": "card", "kind": "time", "text": "One day, everything changed..." },
      "cast": [ { "id": "kai", "x": 1200, "facing": 1 }, { "id": "pip", "x": 1450, "facing": -1 }, { "id": "vex", "x": 2300, "facing": -1, "hidden": true } ],
      "beats": [
        { "id": "arrive", "at": 0.5, "macro": "enter", "params": { "who": "vex", "side": "right", "mode": "walk" } },
        { "at": { "with": "arrive" }, "who": "pip", "do": "point", "target": "vex", "face": "scared", "say": "Who is that?" },
        { "id": "blast", "at": { "after": "arrive" }, "who": "vex", "do": "energy_blast", "target": "pip", "outcome": "hit", "face": "smug" },
        { "id": "gone", "at": { "after": "blast", "delay": 0.4 }, "macro": "defeat", "params": { "who": "pip", "by": "vex", "style": "vanish" } },
        { "at": { "with": "gone" }, "macro": "exit", "params": { "who": "vex", "side": "right", "mode": "walk" } },
        { "id": "grief", "at": { "after": "gone" }, "macro": "grief", "params": { "who": "kai", "over": "pip", "rain": true } },
        { "at": { "after": "grief" }, "who": "kai", "do": "clench_fist", "face": "determined", "say": "I will bring you back!" }
      ] },
    { "id": "s3", "location": "street", "time": "night", "weather": "rain", "music": { "mood": "heroic" },
      "transitionIn": { "type": "card", "kind": "chapter", "text": "The path to save Pip" },
      "cast": [ { "id": "kai", "x": 300, "facing": 1, "face": "determined" }, { "id": "g1", "x": 1600, "facing": -1 }, { "id": "g2", "x": 2600, "facing": -1 },
                { "id": "g3", "x": 3600, "facing": -1 }, { "id": "g4", "x": 4800, "facing": -1 } ],
      "beats": [
        { "id": "path", "at": 0.3, "macro": "gauntlet", "params": { "hero": "kai", "opponents": ["g1", "g2", "g3", "g4"], "per": 3, "travel": "run", "finisher": "spinning_kick" } }
      ] },
    { "id": "s4", "location": "lair", "time": "night", "music": { "mood": "boss" },
      "transitionIn": { "type": "iris", "target": "kai", "dur": 1.2 },
      "transitionOut": { "type": "fade", "dur": 1.5 },
      "cast": [ { "id": "kai", "x": 1100, "facing": 1, "face": "furious" }, { "id": "vex", "x": 2000, "facing": -1, "face": "smug" }, { "id": "pip", "x": 1400, "facing": 1, "hidden": true } ],
      "beats": [
        { "id": "talk", "at": 0.4, "macro": "dialogue", "params": { "lines": [["vex", "You came all this way?", "smug"], ["kai", "Give Pip back!", "furious", "shout"]] } },
        { "id": "boss", "at": { "after": "talk" }, "macro": "fight", "params": { "sides": ["kai", "vex"], "winner": "kai", "exchanges": 10, "intensity": "high", "style": "comeback", "finisher": "flying_kick", "ko": false } },
        { "id": "end", "at": { "after": "boss" }, "macro": "defeat", "params": { "who": "vex", "by": "kai", "style": "captured" } },
        { "id": "back", "at": { "after": "end", "delay": 0.5 }, "who": "pip", "do": "return", "face": "happy", "say": "Kai!" },
        { "id": "hug", "at": { "after": "back" }, "who": "kai", "do": "hug", "partner": "pip", "approach": "walk", "face": "cry" },
        { "at": { "after": "hug" }, "who": "world", "do": "narrate", "params": { "text": "Friends never give up on each other." } },
        { "at": { "after": "hug", "delay": 3 }, "who": "world", "do": "end_card", "params": { "text": "The End" } }
      ] }
  ]
}
```

## 23. Appendix B: new error codes

| Code | Stage | Meaning |
|---|---|---|
| `E_VERSION` | structure | `version` is not 1 or 2 |
| `E_CAST_UNKNOWN` | semantic | A beat or scene uses an id not in `cast` |
| `E_CAST_ABSENT` | semantic | A character acts in a scene it isn't placed in |
| `E_BODY_UNKNOWN` | semantic | Unknown body plan |
| `E_APPEARANCE` | semantic | Unknown appearance option or value |
| `E_FACE_UNKNOWN` | semantic | Unknown face/emotion |
| `E_LOCATION_UNKNOWN` | semantic | Scene uses an unknown location |
| `E_OBJECT_UNKNOWN` | semantic | Unknown object kind or object id |
| `E_OBJECT_STATE` | semantic | Invalid state for that object |
| `E_PARTNER_MISSING` | semantic | Paired move without `partner`, or partner absent |
| `E_PARTNER_SELF` | semantic | Partner is the acting character |
| `E_MACRO_UNKNOWN` | semantic | Unknown `@macro`; until the story compiler lands (S6), every macro reports this code with "not available yet" |
| `E_MACRO_PARAM` | semantic | Bad or missing macro param |
| `E_ACTIVITY_OBJECT` | semantic | Activity needs an object that isn't available |
| `E_TRANSITION` | semantic | Unknown transition type or bad params |
| `E_SCENE_EMPTY` | semantic | Scene with no beats and no duration |
| `E_THEME_UNKNOWN`, `E_REF_BEAT`, `E_REF_DUPLICATE` (v1 codes) | semantic | Also used for locations (unknown theme), references to a beat in another scene, and ids repeated across scenes |
| `E_DEFEAT_STYLE` | semantic | Defeat style not allowed for `meta.audience` |
| `E_MOVE_RIG` | semantic | Move not available for the character's rig |
| `E_SIM_PARTNER_UNREACHABLE` | dry run | Partner can't be reached for an interaction (add approach) |
| `E_SIM_OBJECT_OFFSTAGE` | dry run | A ball, vehicle or floater path leaves the stage |
| `E_SIM_SCENE_LENGTH` | dry run | Scene longer than the limit |
| `W_DIALOGUE_FAST` | dry run | A line shows for less than its reading time |
| `W_TEXT_SOFT` | semantic | Soft-listed word (for example "killed"); suggests an alternative |
| `W_SCENE_STATIC` | dry run | A scene with over 4 s of no movement and no narration |
| `W_NO_ARC` | dry run | The story has no climax or resolution scene (story pacing heuristic) |
| `W_CAST_UNUSED` | semantic | A cast member never appears |
| `W_STORY_SHORT` | dry run | A story (2+ scenes) is shorter than 300 s |
| `W_FIGHT_SHORT` | dry run | A fight-only video is shorter than 180 s |
| `W_KIDS_NO_HOPE` | dry run | `kids` audience: a cast member is defeated with `vanish`/`captured` and never returns or is shown safe |
