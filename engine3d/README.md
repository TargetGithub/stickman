# engine3d (prototype)

A deterministic 3D video engine for kids' learning videos (counting, letters, vowels, rhymes), next to the 2D
StickMan engine in `/engine`. Three.js draws in headless Chromium (Playwright) on the Mac's GPU; every frame
is drawn from an explicit clock `t = frame / fps`, so any frame can be drawn on its own and render chunks
run in parallel. Findings and the plan for a full engine: `docs/ENGINE3D_PROTOTYPE.md`.

This folder has its own `package.json` (three, playwright) so `/engine` keeps its no-dependency rule.

```bash
cd engine3d && npm install && npx playwright install chromium
```

## Layout

| Path | What |
|---|---|
| `runtime/` | Plain ES modules. Pure (Node + page): `timeline.js`, `ease.js`, `rng.js`, `particles.js`, `director.js`, `director_extras.js`, `lipsync.js`, `look.js`, `camera_moves.js`, `bounds.js`, `stage_set.js`, `compile.js`, `validate.js`, `validate_look.js`, `plan.js`. Page only (three.js): `stage.js`, `objects.js`, `objects_extra.js`, `models.js`, `faces.js`, `talk.js`, `geometry.js`, `overlay.js`, `player.js`, `page.html`. |
| `catalog/` | JSON catalog: colours, materials, shapes (solids and flat 2D shapes), fonts, characters (glTF), models (toy animals and props built from parts), stages and lights, sounds, object kinds, actions. `index.mjs` loads it in Node. |
| `assets/characters/` | glTF characters (CC0), with `LICENSES.md`. |
| `scripts/` | JSON scripts (`count_to_five.json`); series in `scripts/series/<name>/` (Toy Box Friends: `scripts/series/toybox/SERIES.md`). |
| `scenes/` | JS scene modules (`vowels.js`, `model_sheet.js` for checking the catalog by eye). |
| `tools/` | `render3d.mjs` (render, stills, hashes, benchmarks), `episode3d.mjs` (an episode's YouTube kit), `thumbnail3d.mjs` (designed thumbnails), `compile3d.mjs` (join episodes), `determinism.sh`, `lib/` (server, WebSocket, browser, encoder, audio, memory). |
| `tests/` | `node --test`: timeline, validator fixtures, plan determinism, no-clock rule. |

## One timeline, two ways in

Everything goes through the **director** (`runtime/director.js`): it records objects, timeline segments,
captions, sounds and spoken lines into a plan. `stage.js` draws a plan at any `t`; the tools read the same
plan for TTS, the audio mix and the length.

**JSON script** (for AI-written videos; validated against the catalog by `validate.js`):

```json
{
  "kind": "video3d", "version": 1,
  "meta": { "title": "Count to Five", "seed": 5, "voice": "soft" },
  "stage": { "preset": "playroom" },
  "camera": { "position": [0.4, 1.9, 8.2], "lookAt": [0.4, 1.3, 0], "fov": 40 },
  "objects": [
    { "id": "robo", "kind": "character", "character": "robot", "at": [-2.3, 0, 0.9] },
    { "id": "b1", "kind": "number_block", "value": 1, "color": "red", "size": 0.9, "hidden": true }
  ],
  "scenes": [{ "id": "count", "beats": [
    { "dur": 2.6, "do": [
      { "do": "drop", "target": "b1", "to": [0.6, 0, 0] },
      { "do": "say", "text": "One! A red block.", "at": 0.5, "caption": true },
      { "do": "clip", "target": "robo", "clip": "Yes", "at": 0.6 }
    ] }
  ] }]
}
```

Object kinds: `shape` (add `face: true` for eyes and a smile), `number_block` (0–999), `letter` (up to 24
characters), `critter` (toy animals that bob, blink and wag), `prop`, `character` (glTF), `confetti`, `bubbles`,
`stars`, `clock`, `lamp`, `weather` and `group`. Script `meta` also takes `music` (a mood), `musicGain`,
`voiceSpeed`, `series`, `episode`, `audience` (babies, prek, k, grade1 to grade5), `skills`, `thumbnail` and
`youtube`. `thumbnail: { "scene": "<scene id>", "at": 2.5 }` picks the frame 2.5 s into that scene, measured on
the plan timed with the real TTS clips, so it stays on the right picture when speech changes beat lengths;
`thumbnail: { "t": 12 }` (absolute seconds) still works. New episodes use designed thumbnails instead (below).

### Designed thumbnails (`meta.thumbnails`)

A thumbnail is never a video frame: each concept is a small scene of its own plus crisp 2D title text.

```json
"thumbnails": [{
  "name": "lab", "title": "PLANT LAB!", "subtitle": "What do plants need?", "titleColor": "yellow",
  "side": "left", "badge": "GRADE 2", "stage": "garden", "at": 1,
  "camera": { "position": [0, 1.35, 5.6], "lookAt": [0, 1.05, 0], "fov": 34 },
  "objects": [
    { "id": "plant", "kind": "prop", "model": "flowering_plant", "at": [0.85, 0, 0], "size": 2.6 },
    { "id": "cat", "kind": "critter", "species": "cat", "at": [2.05, 0, 0.9], "size": 1.1, "rotation": [0, -30, 0], "feeling": "happy" }
  ]
}]
```

| Field | |
|---|---|
| `name` | lower_snake_case, unique: names `thumbnail_<name>.jpg` |
| `title` | ≤ 18 characters (1–3 words); `subtitle` ≤ 32; `badge` ≤ 12 (a grade pill, e.g. `GRADE 2`) |
| `titleColor` | a colour name or `#rrggbb` (default yellow) |
| `side` | `left` (default), `right`, `top`, `bottom`: where the title goes; keep that part of the picture empty |
| `stage`, `camera`, `objects`, `lights` | the scene, checked with the script's own rules (`lights`: `{ rig, background, floor, rug }`). Objects are at rest; characters take `clip` and `feeling`, critters `feeling` |
| `at` | seconds into the pose when the still is taken (default 1, 0.2–30) |

1–4 concepts; the first is the episode's `thumbnail.jpg`. `runtime/thumbnails.js` turns a concept into a
one-beat script and validates it (errors point into `meta.thumbnails[i]`). `tools/thumbnail3d.mjs <script>
[--out dir] [--only name] [--no-render]` renders each concept as one 4K still (no speech, no music), lays the
text over it at 1280×720 (Andika Bold with a dark outline, white rim and soft shadow, about a fifth of the
height, shrunk or wrapped onto two lines to fit its box, over a soft gradient scrim; a grade badge and a small
"Toy Box Friends" mark; nothing in the bottom-right corner, where YouTube shows the length) and writes
`thumbnail_<name>.jpg`, `thumbnail.jpg` and `thumbnails_sheet.jpg` (all concepts, with phone-size copies).
`episode3d.mjs` calls it for scripts with `meta.thumbnails`. Demo: `scripts/thumb_demo.json`. The 4K still and
the text helpers are shared with the channel art (`tools/lib/art3d.mjs`).

**Letter size.** A `letter`'s `size` is a type size, not its height: with Andika the cap height is about
1.41 × `size`, the x-height 0.98 × `size`, and descenders reach 0.47 × `size` below the baseline. A letter
stands on the font baseline (its `at`), so "dog" and "cat" share one baseline and the g hangs below it.

**Thin things.** Use the `plate` shape (a 1 × 0.04 × 1 rounded slab) for boards, mats, signs, trays and plates:
scale x and z for its size and stand it up with `rotation: [90, 0, 0]`. `box` and `block` round their corners
by a share of the unit cube, so they turn to slivers when squashed thinner than about 0.05. The playroom rug
is 6 mm thick, so anything on the floor thicker than that shows.

**See-through things.** Meshes in a material with opacity under 0.5 (`glass`, bubbles) cast no shadow; `water`
and `ice` keep theirs.

Critters and props come from `catalog/models.json` plus one file per theme in `catalog/models/` (animals,
home and school, outdoor and science). `scenes/model_sheet.js` shows them all.

### Building blocks for the batch 2 specs

| Need | How |
|---|---|
| Things that move as one (a rocket, a train with letters riding in it, pans on a balance) | Any object can have `parent` (its `at` is then relative to the parent, in metres) and `part` (ride on a named part). `kind: "group"` is an empty holder. |
| Hats, goggles, a bow on a head | `parent: "cat", part: "head"`: the child follows the head's bob, nods and turns. Its `at` is measured from the part's pivot (the centre of the head, see `head.at` in the model) in the critter's own units, so it and the child's `size` are multiplied by the critter's `size`. A hat on a cat: `at: [0, 0.28, 0]`. An offset of 1.5 or more warns (`W3D_PART_FAR`): that is a world position. |
| Lids, doors, planks, tails, heads | Named parts are targets: `{ "do": "turn", "target": "box#lid", "to": [-100, 0, 0] }`. `turn`, `move`, `wiggle` and `spin` take parts; mirrored copies move as mirror images. |
| Turning about a point | `pivot: [x, y, z]` on any object: it turns and grows about that point. |
| Feelings | `feel` with happy, sad, surprised, angry, worried or sleepy: eyebrows, mouth, eyes and a head tilt on critters and face shapes; Robo uses his face morphs. `feeling` sets the starting one. |
| Telling time | `kind: "clock"` (numbers, ticks, blue hour hand, red minute hand); `clock` turns the hands forward to a time, the hour hand creeping with the minutes; `minuteHand: false` for hour-only lessons. |
| Colour changes | `paint` blends an object's main colour to another one; `from: "leaf"` blends only the parts drawn in that colour (critters and props). `recolor: { "leaf": "brown", "pink": "yellow" }` on a critter or prop builds the parts drawn in one colour in another (a wilted plant, a blue duck). |
| Filling a glass, growing a stem | `grow` with `to: [1, 3, 1]` stretches one way (from the base). |
| Day to night, dim theatre, winter sky | `lights` blends to another rig (`evening`, `dim`, `overcast`, `hot_sun`, ...) and to new background, floor and rug colours. Stages: `beach`, `snow`, `desert`, `town`, `theatre`, `space` as well. |
| Shadow puppets, torches | `kind: "lamp"`: a spotlight that casts real shadows, with an optional fading `beam`; `aim` points it. |
| Rain, snow, falling leaves | `kind: "weather"` (`rain`, `snow`, `leaves`, `petals`): falls while shown. |
| Routes, tracks, rocket arcs | `path` travels through points at an even speed; `face: true` turns toward the way it goes. |
| Containers and new shapes | `cup`, `pot`, `bowl`, `tube`, `bottle`, `dome`, `disc`, `wedge`; flat `pentagon`, `hexagon`, `octagon`, `half_circle`, `quarter_circle`, `arrow`, `cross`, `snowflake`, `drop`, `leaf`, `ring`. Materials `water`, `glass`, `ice`, `paper`, `light`. |
| Sounds | `tick`, `fizz`, `rain`, `twang`, `drum`, `train_whistle`, `cha_ching`, `clink`, `rocket`, `pour`, plus `splash`, `heartbeat`, `gasp`, `sneeze`, `step` and more (`catalog/sounds.json`). |
| Letter sounds (phonics) | `ph_a_short` … `ph_u_short`, `ph_a_long` … `ph_u_long`, `ph_oo`, consonants `ph_b` … `ph_z` (plus `ph_c`, `ph_qu`, `ph_x`), and `ph_sh`, `ph_ch`, `ph_th`, `ph_th_voiced`, `ph_wh`, `ph_ng`: cue them like any sound. `tools/phonemes.mjs` makes them (see below). |
| Calmer music in a chapter | A scene takes `music` (a mood, or `false` for none) and `musicGain` (see below). |

`scripts/feature_tour.json` shows all of these in 50 seconds.

### Teaching kit (batch 3, grades 3–5)

Toy-material models for maths and science lessons (`runtime/teach*.js`, `director_teach.js`,
`validate_teach.js`). Every piece is its own node driven by timeline props, so any frame is a pure function of
`t`. Fields and defaults: `catalog/kinds.json`; actions: `catalog/actions.json`; the contract is
`scripts/series/toybox/specs/batch3.md`.

| Kind | Fields (defaults) | Pieces |
|---|---|---|
| `number_line` | `from` 0, `to` 10, `length` 8, `step` 1, `minor` 1, `labels` (`numbers`, `fractions`, `none` or a list), `color` blue | A beam on two legs (`at` is its centre on the floor); its top is 0.56 m up. Ticks hang down its front, numbers under them; `fractions` labels every tick (1/4, 2/4, 3/4, 1). |
| `fraction_bar` | `parts` 4, `shaded` 0, `length` 3, `height` 0.5, `color` orange (shaded), `empty` cream, `label` | Parts `#p1`… (left to right) |
| `fraction_circle` | `parts` 4, `shaded` 0, `radius` 1, `color`, `empty`, `label` | Slices `#s1`… from 12 o'clock, clockwise; stands on its rim facing the camera |
| `array` | `rows` 3, `cols` 4, `item` (`dot`, a shape or a prop model), `gap` 0.2, `color` red, `size` 0.4, `trays` | Items `#i1`… row by row; stands up like a pegboard, row 1 on top |
| `grid` | `rows` 3, `cols` 4, `cell` 0.5, `color` sky, `upright` | Cells `#c1`… row by row; flat on the floor unless `upright` |
| `cubes` | `l` 3, `w` 2, `h` 2, `cell` 0.4, `color` orange, `box` | Cubes `#c1`… bottom layer first; alternate layers a little lighter |
| `pointer` | `from`, `to` (required, relative to `at`), `color` orange, `width` 0.1, `bend` 0 | A chunky arrow, arched `bend` m high |
| `callout` | `text`, `point` or `target`, `offset` [1.2, 1, 0], `color` ink, `bg` white | A card with a leader and a dot; with `target` the dot sits on the front of that object, 0.6 of the way up |
| `angle` | `degrees` 45, `radius` 1.2, `color` blue, `arc` true, `label` true | Rays from the vertex (`at`; lift it off the floor); a square corner at 90°; "45°" outside the arc |

**Standing on a line.** Any object can take `on: { "line": "<number_line id>", "value": 0.75 }` instead of
`at`: the director turns it into a position from the line's `at`, `rotation` (y) and `from`/`to`/`length`
(`teach_layout.js linePoint`), so Node and the page agree. JS scenes can call `d.lineAt(line, value)`.

| Action | Params (defaults) | What it does |
|---|---|---|
| `build` | `target`, `order` (`items`; `rows`/`cols` for arrays and grids; `rows`/`layers` for cubes), `dur`, `sound` (pop, `false` for none) | Shows the object and pops its pieces in one step at a time, a sound per step (count along). |
| `shade` | `target`, `to` (parts shaded), `color`, `dur`, `sound` | Shades parts in order (fewer unshades); labels follow. |
| `leap` | `target`, `line`, `values`, `dur` 0.7 per leap, `height` 0.8, `sound` boing, `arcs` true, `color` orange | Arcs value to value and leaves each jump's arrow on the line (the arcs ride on the line, so hiding it hides them). |
| `draw` | `target` (pointer, number line, callout), `dur` 1.2 | Grows it from start to end. |
| `open` | `target` (angle), `to` degrees, `dur` 1.2 | Turns the second ray; arc and label follow. |
| `mark` | `target` (object or `<id>#<piece>`), `result` correct/incorrect, `dur` 1.8, `sound` | A green tick or a soft coral cross badge with a ring: above an object, in front of a piece. Sounds `ding` or a soft `boing`. |
| `highlight` | `target` (object or piece), `color` gold, `dur` 2 | A glowing rounded hoop that pulses round it (flat round flat things). |
| `trace` | `target` (grid), `dur`, `sound` (pop per unit) | A glowing dot runs clockwise round the edge from the top-left corner, lighting each unit edge; the lit edge stays. |

Fraction bar parts and circle slices also take `move`, `turn`, `wiggle` and `spin` (`"pie#s1"`: pull a slice
out). Marks and glows are internal helper objects (`<id>~mark1`, kinds `_mark` and `_glow`) that fit the
target's box as posed at `t`. Text uses the Andika font, which has `/` and `°`. The validator checks fields,
ranges, piece names, line placement and leap values (codes `E3D_PARTS`, `E3D_SHADED`, `E3D_ITEM`, `E3D_LABELS`,
`E3D_ON_LINE`, `E3D_ON_VALUE`, `E3D_LEAP_VALUE`, `E3D_ORDER`, `E3D_RESULT`, plus the usual ones).
`scripts/teach_tour.json` shows every kind and action in about 70 seconds.

**Scene music.** `meta.music` and `meta.musicGain` set the bed for the whole episode. A scene may override
them with `"music": "calm"` (any mood in `catalog/story/music_moods.json`, or `false` for no music) and/or
`"musicGain": 0.2` (0–1); a scene without them goes back to the episode's. Changes crossfade over 2 s centred
on the scene start (`tools/lib/music3d.mjs`); `render3d` rejects unknown moods, and `--music off` silences all
music.

**Letter sounds.** Piper reads letters by their names, but takes raw IPA inside `[[ ]]`, so
`node engine3d/tools/phonemes.mjs` renders each `ph_*` entry of `catalog/sounds.json` (its `ipa`, optionally
cropped to `maxDur`) in the `soft` voice, levelled like speech, into `assets/sfx/generated/` (git-ignored; a
render makes any missing clip it cues). It prints each clip's length, level and bursts to check by eye.

Beats run one after another; `at` is seconds from the beat start. A beat lasts `dur` or until its last voice
line ends, whichever is longer, so measured TTS clips stretch beats like 2D speech does. Kinds and their
fields: `catalog/kinds.json`. Actions and their parameters: `catalog/actions.json`.

**JS scene** (for custom animation): a module whose default export receives the director, plus optional
`meta` `{ seed, voice, stage }`. It can loop, compute layouts and add `d.onFrame((t, { scene, camera, objects, THREE }) => …)`
hooks for motion with no JSON action. Hooks must be pure functions of `t`. See `scenes/vowels.js`.

### Talking, looking and framing (batch 3)

| Need | How |
|---|---|
| A character's mouth moving with its voice | `say` with `who` (the speaker's object id: a critter, a character or a shape with `face: true`). Critters and face shapes open an oval mouth (with a tongue when wide) in place of their smile; birds drop a lower beak (`talk.jaw` in the model); Robo has no mouth, so his head nods a little with each loud syllable and tips slowly side to side, and his Surprised face morph opens slightly. The mouth follows the TTS clip's loudness envelope, smoothed to stay under about 12 Hz and shut in pauses; with `--speech off` a syllable pattern from the text stands in, so stills and reviews still move. Lines without `who` change nothing. |
| A head turning toward something | `look` with `target` (a critter or Robo) and `at`: an object id, `[x, y, z]` or `"ahead"`. It eases over `dur` (0.6 s) and holds until the next look; a neck turns at most 70° (Robo 60°) and tips 25–30°. A number in `at` is the start time as for every action: then put what to look at in `to` (`{ "do": "look", "target": "cat", "at": 1.2, "to": "apple" }`). Angles are worked out from where both are when the turn ends. |
| Framing without cropping | `shot` with `target` (an id or a list), `framing` (`wide` fills about 64% of the frame, `medium` 78%, `close` 90%), `yaw` (degrees round the targets, 0 = from the front, 90 = from the right), `height` (camera elevation in degrees, default 8), `dur` (0 = a cut), `ease`. The camera position comes from the targets' approximate boxes (`runtime/bounds.js`: shape size, critter and prop parts, Robo 1.6 m) at the end of the move, the current fov and 16:9; targets sit slightly above centre, clear of subtitles. |
| A slow arc round a model | `orbit` with `around` ([x, y, z]), `degrees` (positive: the camera moves to its right), `dur`, optional `radius` and `height` (metres above `around`, blended in). It starts from wherever the camera is and turns to look at the point. |

`shot`, `orbit` and `camera` all add camera segments: a later one takes over from where the camera is when it
starts. An orbit is one timeline segment with a closed-form arc (`curve` in `timeline.js`), so a later move
can start mid-orbit. Lip-sync data flows like clip lengths: `render3d` (via `tools/lib/audio3d.mjs`
`speakPlan`) reads each spoken clip's loudness envelope (`tools/lib/tts/lipsync.mjs` `envelope()`, 100 values
per second) for lines with `who` and passes it to the page in `speech`; the director turns it into the
speaker's `talk` prop (`runtime/lipsync.js`), the same in Node and in the page.

**Stages with set dressing.** `classroom` (peach wall, green chalkboard, window, plant, light wood floor), `lab`
(white and teal, a bench of glassware along the back), `forest` (trees, bushes, a log, soft green light) and
`pond` (water with lily pads, reeds, a rock) are presets with a `set`: a list of ordinary objects (shapes and
props from the catalog) that join the plan before the script's own objects, with ids prefixed `set_`
(`set_board`, `set_water`), so actions can target them. Set pieces stay behind z = -2.4 (the walls at z = -6.6),
clear of the teaching area. `stage: { "preset": "classroom", "set": [] }` turns the dressing off; a script's
`stage.set` replaces the preset's list. Script object ids may not start with `set_`.

**Depth of field: not built.** A test with three's `BokehPass` (EffectComposer, 4× MSAA target, the extra depth
pass) on `scripts/look_tour.json` at 4K60 (`--bench 240 --frames 300:540`) drew 37.6 fps against 183.3 fps
without it (draw + readback: 36.2 vs 78.7): about 80% of the draw time, far over the 25% budget, and the
WebCodecs render (54 fps at 4K60, encoder-bound) would drop below 37 fps. Soft focus can come later from a
cheaper pass (blurred background layer) if a spec needs it.

`scripts/look_tour.json` shows lip-sync (Robo, Duck, Cat and a talking circle), `look`, `shot` and `orbit` in
the classroom in about 45 seconds.

## Rules (as for /engine)

- No `Math.random`, `Date.now`, `performance.now`, `requestAnimationFrame` in `runtime/` or `scenes/` (a test
  checks). Randomness comes from `rng.js` streams named off the script seed.
- Motion is closed-form (eases, bounce curves, confetti paths), never a stepped simulation.
- The timeline never reads text metrics or GPU state; text layout is in `overlay.js` only.
- Catalog entries need a description and tags. No blood or gore.

## Commands

```bash
node engine3d/tools/render3d.mjs engine3d/scripts/count_to_five.json --res 1080p --fps 30
node engine3d/tools/render3d.mjs engine3d/scripts/count_to_five.json --res 4k --fps 60
node engine3d/tools/render3d.mjs engine3d/scenes/vowels.js --stills 2,6,12        # PNGs
node engine3d/tools/render3d.mjs <input> --bench 150 --frames 300:450              # draw / readback / upload fps
node engine3d/tools/render3d.mjs <input> --hash out/x.json                         # sha256 per raw frame
engine3d/tools/determinism.sh                                                      # GPU x2, 3 pages, SwiftShader x2
node engine3d/tools/episode3d.mjs engine3d/scripts/series/toybox/pk01_count_to_ten.json --review --final
node engine3d/tools/episode3d.mjs <script> --out-dir out/somewhere                     # all outputs there
node engine3d/tools/thumbnail3d.mjs engine3d/scripts/thumb_demo.json --out out/demos/thumbnails
node engine3d/tools/compile3d.mjs --name prek_mix_1 --title "..." pk01_count_to_ten pk02_shapes   # from finals
```

Options: `--jobs N` (pages rendering contiguous chunks in parallel), `--gl gpu|swiftshader`,
`--encoder webcodecs|x264|vt`, `--speech tts|off`, `--music <mood>|off`, `--out file.mp4`, `--frames a:b`.

`--encoder webcodecs` (default) encodes H.264 inside the page on the GPU and sends only compressed chunks to
Node; `x264` and `vt` read every frame back and pipe raw RGBA to ffmpeg (slower: ~17 fps at 1080p, limited by
Chromium's socket throughput). Hash and still modes always read back raw pixels.
