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
| `runtime/` | Plain ES modules. Pure (Node + page): `timeline.js`, `ease.js`, `rng.js`, `particles.js`, `director.js`, `director_extras.js`, `lipsync.js`, `look.js`, `camera_moves.js`, `bounds.js`, `bounds_teach.js`, `stage_set.js`, `stage_change.js`, `compile.js`, `validate.js`, `validate_look.js`, `validate_r3.js`, `plan.js`, teaching kit `teach_layout.js`, `director_teach.js`, `director_kit2.js`, `validate_teach.js`, `validate_kit2.js`, `place_value.js`, `card_words.js`, `xform.js`. Page (three.js; the teach builders also load in Node for tests): `stage.js`, `objects.js`, `objects_extra.js`, `models.js`, `faces.js`, `talk.js`, `geometry.js`, `overlay.js`, `player.js`, `page.html`, `teach.js`, `teach_more.js`, `teach_draw.js`, `teach_text.js`, `teach_marks.js`, `teach_common.js`. |
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
| Lids, doors, planks, tails, heads | Named parts are targets: `{ "do": "turn", "target": "box#lid", "to": [-100, 0, 0] }`. `turn`, `move`, `wiggle` and `spin` take parts; mirrored copies move as mirror images. To start with a part already moved (a curtain up, a lever pulled), give the object `pose: { "lever": { "rotation": [0, 0, -45] } }` (rotation, position; a letter word's c1..cN also take scale) instead of a t = 0 action. Tour: `scripts/tour/start_pose.json`. |
| Turning about a point | `pivot: [x, y, z]` on any object: it turns and grows about that point. |
| Feelings | `feel` with happy, sad, surprised, angry, worried, sleepy or joyful (a big smile, eyes shut in happy arcs): eyebrows, mouth, eyes and a head tilt on critters and face shapes; Robo uses his face morphs. `feeling` sets the starting one. |
| Plush and fur | The `plush` material (matte with a velvety sheen) and a part's `fur` (shells cut into strands by a hash of the surface point, no textures, no randomness: `runtime/fur.js`); `denim` for cloth. Fluffy (`species: "fluffy"` and six looks, `catalog/models/fluffy.json`) is the plush mascot: walk it by turning `#leg_left` and `#leg_right` in turn, wave with `#arm` `lift` (`liftSide: -1` is its right arm). Sheet: `scenes/fluffy_sheet.js`; demo: `scenes/fluffy_demo.js`. |
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
| Old-movie look, title cards | `filmLook(d, { irises })` (`runtime/film_look.js`, JS scenes): warm vignette, grain, iris in/out (an iris can follow an object id). Caption style `intertitle`: a full-frame silent-movie title card. Demo: `scenes/dumpydoo_silent_movie.js` |
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

### Teaching kit, round 2 (strokes, flows, text, reparent, point)

Gaps the batch 3 specs found (`runtime/teach_draw.js`, `teach_text.js`, `director_kit2.js`, `validate_kit2.js`,
`place_value.js`, `card_words.js`, `xform.js`). `scripts/round2_tour.json` shows every item in about 90 seconds.

| Kind | Fields (defaults) | Notes |
|---|---|---|
| `stroke` | `points` (2–400 `[x, y, z]`, relative to `at`), `smooth` false, `closed` false, `width` 0.08, `color` blue, `pen` false | A round tube. `smooth`: a curve through the points (waves, loops); otherwise straight rods with round joints, so zigzag corners stay sharp. `draw` reveals it by length; `pen: true` / `"pencil"` shows a pencil at the tip while drawing, `"dot"` a glowing dot. Prewriting: draw strokes on an upright `plate` (z just in front of it). |
| `flow` | `points`, `smooth` false, `closed` false, `count` 12, `speed` 0.6 m/s, `size` 0.14, `color` red, `changes` [], `track` false | Evenly spaced dots running along the path while shown, from `t` alone. `changes: [{ "at": 0.4, "color": "red" }]` turns dots that colour from that share of the path on (a short blend); list one change back for a loop (blue → red at the lungs, red → blue at the body). Open paths shrink dots in and out at the ends. `track` draws the path faintly. |
| `fraction_text` | `numerator`, `denominator` (required: a number to 9999 or up to 4 characters), `whole`, `color` ink, `size` 0.5, `depth` 0.2 | A stacked fraction; `whole` makes a mixed number (full-size figure, centred on the bar). See "Fractions in equations" below. |
| `place_value_chart` | `columns` [hundreds, tens, ones, ".", tenths, hundredths], `digits`, `cell` 0.8, `color` blue, `bg` white, `digitColor` ink, `zeroColor` orange | Upright, standing on `at`; 1.6 × `cell` tall, `cell` per column (the `"."` column 0.4 × `cell`). Headers are any strings (short ones like "H", "T", "O" work); all are drawn at one size that fits the longest. `digits` ("35.2") sit right-aligned at the point; with no `"."` column the last column is the ones. |
| `text_card` | `text` (≤ 300 characters, ≤ 6 wrapped lines; `\n` breaks a line), `width` 4, `size` 0.2 (font size, m), `color` ink, `bg` white | Word-wrapped by the page and drawn into a canvas texture at the render height (crisp at 720p and 4K); `at` is the bottom centre. A line is 1.4 × `size`; the card is about (lines + 1) × 1.4 × `size` tall (`teach_layout.js cardHeight` is the estimate the validator and `shot` use, about 0.5 × `size` per character). |

| Action | Params (defaults) | What it does |
|---|---|---|
| `shift` | `target` (chart), `places` (+ left: × 10 each, − right: ÷ 10), `dur` 1.2, `sound` whoosh | Digits slide; the point stays. Zeros pop in (in `zeroColor`) to hold empty places between the digits and the ones (35 × 100 → 3500, 35 ÷ 1000 → 0.035); leading zeros and zeros left trailing after the point fade out (0.07 × 100 → 7). The validator follows each chart through its shifts and sets and flags digits pushed off the chart (`E3D_PV_RANGE`). |
| `set` | `target` (chart), `digits`, `pop` true, `dur` 0.4, `sound` (pop) | New digits pop in (old ones shrink away), or swap at once with `pop: false`. |
| `emphasize` | `target` (card), `words` ("an exact phrase", first match, case and punctuation ignored; or `[start, end]` word numbers from 0), `color` yellow, `dur` 0.4 (a still taken during the sweep shows a part highlight), `clear` | A marker highlight sweeps behind the words, left to right across lines, and stays. `clear: true` wipes the earlier highlights first (alone, it just clears). Words are numbered by splitting on white space, so the plan never depends on text metrics. |
| `reparent` | `target`, `parent` (id, or `null` for the world), `part`, `to`, `rotation`, `dur` 0.6, `ease` | The object rides on the new parent (or its named part) from `at`, keeping where it is in the world then; with `to` it then glides to that spot in the new parent's frame (a hat hopping from Turtle's head to Squirrel's: `"parent": "squirrel", "part": "head", "to": [0, 0.28, 0]`). |
| `point` | `target` (Robo, or a critter or prop with an `arm`, `wing`, `hand`, `paw` or `flipper` part), `to` (id or `[x, y, z]`), `arm` (left/right, his own; default the side the target is on), `part`, `dur` 0.5, `hold` 1.5, `look` true | Robo: the upper arm and forearm bones turn (blended on top of the playing clip) so the arm points straight at the target, then lower again after `hold`. Critters: one copy of the part (the owl's left or right wing, the monkey's arm) turns so it points from its pivot at the target. The head `look`s there too and turns back after. |

**Options on older kinds and actions.** `letter` takes `colors`: a colour per character (`[null, "orange",
"orange"]` keeps the first in `color`), for blends and rhyme endings; the letters are cut into one mesh each, laid
out and centred exactly as the one-mesh word (absent: unchanged). `fraction_bar` and `fraction_circle` take
`sizes` (a share per part adding up to 1, for "not fair shares"). `shade` takes `cells` (piece numbers from 1)
instead of `to`: exactly those pieces shade, one after another; pieces from an earlier `cells` that are not listed
again unshade, and `[]` clears them; labels count shaded pieces either way. `trace` takes `count: true`: 1, 2,
3... pop beside each unit edge as the dot finishes it. `grid` takes `labels: "numbers"` (1 to rows × cols in the
cells, row by row: a hundred chart; three-digit numbers shrink to fit). `draw` also draws strokes. `spin` takes
`axis` (`x`, `y` default, `z`) and `ease` (default cubicInOut; `linear` for steady turning); `turn` takes `by`
(degrees) with `axis` instead of `to`. `say` `who` may now name a prop: a prop with a face (eyes or a mouth, like
`pattern_machine`) opens its mouth, a `light` part swells and glows with the voice, and a prop with neither bobs.

**Pointer lines.** `pointer` takes `head` (the `to` end: `arrow` default, `dot`, `none`) and `tail` (the
`from` end: `none` default, `arrow`, `dot`): a line is `none`/`none` (give it `width` 0.03–0.06 and `color` ink),
a segment `dot`/`dot`, a ray `dot` tail with an `arrow` head, a double arrow `arrow`/`arrow`; a drop line or a
string is a thin `none`/`none` with `bend` (negative sags). `fromTarget` / `toTarget` (object ids placed before
it) make an end follow that object: the end sits at the centre of the object's rest-pose box plus `from` / `to`
as an offset in metres, worked out each frame from where the object is posed at `t` (a kite string from Turtle
to the kite, food-web arrows between moving animals). The tube is rebuilt only when an end moves.

**Fractions in equations.** Give a `fraction_text` the same `size` and the same `at` y as the `letter`s around
it (their baseline): its bar sits on the maths axis, level with the bars of `+`, `−` and `=` (measured from the
font's "+"). At size 1 it reaches 1.95 above the baseline and 0.5 below; it is about 0.72 wide per figure of the
longer number plus 0.36 (a whole number adds 0.72 per figure plus 0.3), centred on its `at`. A `+` letter is
about 0.9 × size wide; leave about 0.15 × size between pieces: "1/4 + 2/4 = 3/4" at size 0.55 fits with the pieces
0.85 m apart.

**Spinning about a tilted axis.** `spin` adds whole turns to one Euler angle (three.js order XYZ, so z is the
innermost turn): `axis: "z"` spins about the object's own z axis after its x and y tilt. The batch3 `globe` prop's
`#globe` part (the ball and its continents) is tilted 23° and spins about its own axis rod with `{ "do": "spin",
"target": "globe#globe", "axis": "z", "turns": 3, "dur": 9, "ease": "linear" }` (checked in a still: the polar
caps stay on the rod while the continents go round). For a tilted object of your own, tilt it with `rotation:
[0, 0, 23]` on a `group` parent and spin the child about `y`, or tilt the object itself with x/y angles and spin
it about `z`.

**Reparent limits.** The world position comes from the plan's own transforms: positions, rotations and scales on
the timeline, parents and named critter/prop parts (their catalog pivots and rest angles plus their timeline
offsets). Idle motion (a body's bob, a head's sway, `look`, feeling tilts) and hops are left out, so a hat may
shift by a centimetre or two at the hand-over; teaching-kit pieces are not parents. After a reparent, `move` and
`path` points are in the new parent's frame; `show`, `pop` and `drop` still restore the spawn scale, so hand
over between parents of similar size (or hide it first), and do not reparent while a `move` on the object is
still running. `shot` and `look` boxes use the spawn parent.

**Lip-sync polish.** Open mouths are at least 0.15 of a critter's size wide (the cat's smile is 0.1) and open
taller and further down from the nose, so a talking cat reads in a medium shot.

Validator codes: `E3D_POINTS`, `E3D_PEN`, `E3D_CHANGES`, `E3D_FRACTION`, `E3D_COLUMNS`, `E3D_PV_DIGITS`,
`E3D_PV_RANGE`, `E3D_TEXT`, `E3D_SIZES`, `E3D_LABELS`, `E3D_ENDS`, `E3D_CELLS`, `E3D_EMPHASIZE`, `E3D_REPARENT`,
`E3D_POINT`, `E3D_AXIS` (fixtures `tests/fixtures/bad/bad_kit2_*.json`).

### Round 3 (framing, voices, stage changes and smaller fixes)

Limits the batch 3 writers hit (`runtime/bounds_teach.js`, `stage_change.js`, `validate_r3.js`, plus small
changes elsewhere). Every option is new; scripts that do not use them build the same plans as before.
`scripts/round3_tour.json` shows them all in 44 seconds.

| Need | How |
|---|---|
| A group framed whole (words above cards) | `shot` now frames each target's **children** (anything whose `parent` points at it, recursively; internal marks and arcs left out), counted whether shown yet or not, so a shot made before the words pop in leaves room for them. An empty `group` with children is framed by its children alone. **Teaching-kit kinds** get real boxes with their labels: a number line's beam, legs and numbers, fraction labels, array/grid/cube sizes, a pointer's arc, a callout's dot and card, an angle's rays (`teachBox`). Targets with neither keep their old box. |
| More room round a shot | `shot` `pad` (0–2): the framed box grows by that share about its centre (`0.2`: 20% bigger). |
| Plates, discs and stood-up signs framed tightly | `shot` `fit: "exact"`: thin shapes at their real height (plate 0.04, disc 0.12, bowl and dome 0.5) and every turn applied, the object's and its parents' (a sign with `rotation: [90, 0, 0]`, a turned number line, cards on a turned group). The default (`approx`) keeps the old position-only boxes, which `look` and `point` also use. |
| Repaint teaching pieces | `paint` takes `stroke`, `pointer`, `number_line` (its beam and legs; ticks and numbers stay ink) and `fraction_bar` / `fraction_circle` (their shaded colour, as `shade color` does; `from: "<its empty colour>"`, e.g. `"cream"`, repaints the unshaded parts). A `letter` with `colors` blends **every** character from its own colour (timeline props `tint@<character index>`). |
| A sorting hoop | Shape `hoop`: a flat band lying on the floor, 1 m across (outer radius 0.5, inner 0.45), 0.03 tall, rounded edges; `size: 2.2` for a 2.2 m hoop. `ring` stays the upright puffy cut-out. |
| Q, g, j, p, q, y above the floor | `letter` `lift: "descender"`: the text stands on its lowest point instead of the baseline (Q's tail touches `at`'s y). Words without descenders hardly move, so use it per word, not for words that must share a baseline. |
| Characters with their own voices | `meta.cast: { "<object id>": { "voice": "soft", "pitch": 0.8–1.3, "speed": 0.8–1.2 } }`. A `say` with `who` uses the speaker's entry unless it gives `voice`, `pitch` or `speed` itself (a `say` takes both too). Defaults are unchanged: pitch 1.1, speed 1 (× `meta.voiceSpeed`, default 0.95). Pitch goes through the 2D cast's `resolveVoice` (`tools/lib/tts/lines.mjs`): semitones = round(12 log2(pitch) × the timbre's pitchScale) + its offset, clamped to its range, and Piper's clip is shifted by ffmpeg at constant length; speed scales Piper's rate. On `soft`: 0.8 → −2, 0.9 → −1, 1.0 → 0, 1.1 → +1, 1.2 → +2, 1.3 → +3 semitones (`squeaky` is clamped to +3…+7, `deep` −6…−2). Pitch and rate are in the TTS cache key, so each voice gets its own clips. Use pitches at least 0.15 apart for two characters on one timbre. |
| Two lines in one beat that must not overlap | `say` `at: "after"`: starts when the beat's previous line ends (its measured clip) plus 0.25 s; the beat stretches to fit. |
| Travel mid-episode | Action `stage` `{ preset, dur (2), ease }`: background, floor, rug, fog distances, light rig (hemisphere, sun intensity and direction, environment; the shadow switches half way) crossfade to the preset, the old preset's set pieces fade out (opacity) and the new one's fade in. All set pieces of every preset the script visits are plan objects from the start: the first preset's keep `set_<id>`, later presets' are `set_<preset>_<id>` (`set_forest_tree1`), hidden until their preset comes, and actions may target them. A preset without a floor or rug fades them out; without fog it pushes the fog past the far plane. Everything is a timeline segment, so any frame is a pure function of t. `lights` after a change still blends from wherever the stage is. |
| Clear leap arcs | Action `clear` `{ target: "<number line>", dur 0.4 }`: the arcs drawn on that line so far shrink away; later leaps draw new ones. `leap` `arcs: false` still leaps without arcs. |
| A clearly darker evening | Light rig `dusk` (hemisphere 0.42, a low orange sun at 1.15, environment 0.2): dimmer and warmer than `evening`, which is unchanged. It brings its own background (`dusk_sky`, a rose-violet sky) when `lights` names none. |
| A block of a grid | `shade` `rect: [row, col, rows, cols]` (from 1, row 1 on top) on a grid or array: those cells, row by row, like `cells`. |
| A count beside the picture | `caption` `pos`: `left`, `right` or `top` puts the caption there (centre at 22% / 78% across, 62% up; top: 86% up) instead of its style's place. |
| A music dip for a freeze | Action `music` `{ gain 0–1, dur 0.5 }`: the bed ramps to `gain` × the scene's level and holds until the next `music` (gain 1 brings it back); `plan.musicCues`, applied in `tools/lib/music3d.mjs` `applyMusicCues`. |
| Children sized with their parent | `inherit: "size"` on a child with `parent` (no `part`): its `at` and `scale` are multiplied by the parent's `size` (a mini scene on a `story_card` of size 0.6). Default unchanged: a child is placed in metres. |
| Other fixes | `show` then `reparent` at once (a hidden hat onto Turtle's head) hands over at the scale the object is growing to and grows it in on the new parent. `emphasize` ignores quotes, commas and apostrophes, straight or curly (`can’t` matches `can't`), and steps over words that are only punctuation. `text_card` `width` may be 0.5 m. Number lines may have up to 201 ticks (0–100 by halves, 0–20 with tenths…). A `mark` on a tilted object (a stood-up sign) floats upright above its world box. |

Validator codes: `E3D_CAST`, `E3D_STAGE`, `E3D_LIFT`, `E3D_INHERIT`, `E3D_FIT`, `E3D_POS`, `E3D_PAINT_FROM`
(fractions), `E3D_CELLS` (rect), `E3D_RANGE` (pitch, speed, pad), `E3D_REQUIRED` (music gain, stage preset)
(fixture `tests/fixtures/bad/bad_r3.json`).

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
line ends, whichever is longer, so measured TTS clips stretch beats like 2D speech does. `dur: "fit"` makes a
beat last until its last timed action (a move, a draw, a pop) ends as well. Kinds and their
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
`stage.set` replaces the preset's list. Script object ids may not start with `set_`. `stage.hide: ["machine", "window_*"]` drops single pieces (an id, or every id with a prefix; children go with their parent) and `stage.move: { "plant": { "at": [9, 0, -5] } }` places one elsewhere (at, rotation, scale). Thumbnails on the same preset keep both, and a concept's `stage` may be a full stage object.

**Depth of field: not built.** A test with three's `BokehPass` (EffectComposer, 4× MSAA target, the extra depth
pass) on `scripts/look_tour.json` at 4K60 (`--bench 240 --frames 300:540`) drew 37.6 fps against 183.3 fps
without it (draw + readback: 36.2 vs 78.7): about 80% of the draw time, far over the 25% budget, and the
WebCodecs render (54 fps at 4K60, encoder-bound) would drop below 37 fps. Soft focus can come later from a
cheaper pass (blurred background layer) if a spec needs it.

`scripts/look_tour.json` shows lip-sync (Robo, Duck, Cat and a talking circle), `look`, `shot` and `orbit` in
the classroom in about 45 seconds.

### Baby rhymes (sung lines, the HUD, Robo's voice)

Built for the baby and toddler rhyme series (`scripts/series/toybox/specs/baby_rhymes.md`, br01–br20).
`tests/unit/rhymes.test.js` covers them.

| Need | How |
|---|---|
| Robo's voice | Robo speaks in his own catalog voice (`characters.json` robot `voice`: `soft` at pitch 1.1, the voice of the Toy Box grade episodes such as g103; the `toddler` timbre is still available for a say's `voice`) in every script, old ones included: it wins over `meta.cast`; a `say`'s own `voice`/`pitch` still overrides it. The `toddler` timbre (`catalog/story/tts_voices.json`, tagged `engine3d`) is kristin with her formants lifted a little (ffmpeg, +3 semitones at pitch 1.1) and her pitch lifted 7 more by PSOLA (`lift`, `tools/lib/tts/psola.mjs`, which keeps the formants), with livelier Piper intonation (`noise` 0.6, `noiseW` 0.75): about 257 Hz against the old 155 Hz. `lift`, `noise` and `noiseW` join the TTS cache key only when set, so other voices keep their clips. |
| Who speaks lines without `who` | `meta.host`: an object id, or `null` for the plain `meta.voice` narrator. By default the host is the script's one character with a catalog voice (Robo), so the narration of Robo-hosted episodes (pk01–pk16, g1, g2) is in his voice too; host lines do not lip-sync. Episodes without Robo (bb01–bb04) are unchanged. |
| A sung line | `say` with `tune: "G4 G4 G4 D4 E4 E4 D4:2"`: one note per syllable (`C4` = middle C, `#`/`b`, `:2` = two beats, `:0.5` half a beat, `|` ignored; `runtime/tune.js`) at `tempo` beats a minute (default 112). The voice speaks the line normally and a toy glockenspiel plays each note as its syllable starts (`tools/lib/tune3d.mjs`). `rhythm: true` chants the voice on the beat instead (each syllable held to fill its note, `tools/lib/tts/chant.mjs`): experimental, it sounded choppy on br01, so normal speech is the default. `tunePatch` (glock, bell, music_box, toy, pluck_high, flute, glass), `tuneGain` (default 0.16: 10–14 dB under the voice). `sing: true` (or 0.3–1) also moves the voice onto the notes' pitch: experimental, check it by ear. Turn the music bed off in sung scenes (`"music": false`): the procedural bed is in its own key. Validator: `E3D_TUNE`, `E3D_RANGE` (tempo 60–180), `W3D_TUNE_SYLLABLES` (notes vs syllables off by more than 1). |
| Trackers and word pops that stay put | `hud: true` on any object draws it in screen space after the 3D picture (`stage.js` `createHud`): `at` in HUD units, the frame 16 wide and 9 tall with (0, 0) at its centre (x −8…8, y −4.5…4.5, z toward the viewer for layering); a size-1 critter is about 1 unit tall. Front-lit, no shadows or fog; every action works on it (`pop`, `hide`, `wiggle`, `grow`). A child and its parent share a layer; `shot` cannot frame a HUD object (`E3D_HUD`). Props for it: `tracker_slot` (a card whose rim takes `color`) and `word_bubble`. br01 has a six-slot tracker top left, a 3-2-1 countdown (letters on a white `circle`) and a word bubble top right. |
| A farm | Stage `farm` (sky, grass, a dirt yard, fence, trees, hills, sun and clouds behind z = −2.4) and `catalog/models/farm.json`: `horse`, `barn` (doors `barn#door_left` / `barn#door_right`, open with `turn` to [0, −100, 0] / [0, 100, 0]), `hay_bale`. Camera for a barn at [0, 0, −1.5]: position [0, 2.1, 9.4], lookAt [0, 1.35, −0.4], fov 40. |

### Retention kit (hooks, timers, options, keywords, trackers, call-and-response)

Features that keep children watching past the first minute. The full reference, with every parameter and the
screen zones, is `/Volumes/DISK1MAC/AI Backup files - Youtube/Toybox/10K/ENGINE_RETENTION_KIT.md`. The demo is
`scripts/demos/retention_kit.json` (rendered to `out/demos/3d/retention_kit/`), and `tests/unit/retain.test.js`
covers the kit.

| Need | How |
|---|---|
| Where a word on a text card is | Text cards lay out from the font's glyph advances (`runtime/text_layout.js`), so the page and the director agree: `wordSpots(card, catalog.fontMetrics)` gives each word's centre and box in the card's frame, and `point { to: "card#w3" }` aims at word 3 (`"word#c3"` at a letter). Tour: `scripts/tour/point_words.json`. |
| A page's height and line spots (tools) | `pageLayout(page, catalog)` from `runtime/composite.js` gives `{ width, height, lines: [{ id, y, height }] }` in the page's own frame. `shot` on the page id frames the whole page, on `<id>_l3` one line. |
| A photo comes alive | `alive { target: <card or page> }`: its flat picture swells to full depth, steps out toward the camera and wiggles; `back: true` flattens it again; animate it further as `<id>_pic`. Tour: `scripts/tour/photo_alive.json`. |
| Bigger card type, side-on pictures | A `card` takes `textSize` (metres; word, tile, strip and name_tag cards grow with it) and `pictureRotation: [0, 90, 0]` (a bike, van or boat shown along its length, refitted to the card). |
| Reorder letters or tiles; change a number block | `swap { target: <word>, chars: [1, 4] }` or `swap { target: "tile1", with: "tile3" }` (same parent): the two arc to each other's places, one in front, one behind. `retext` on a `number_block` takes its new value as text ("7"). Tour: `scripts/tour/cards_swap.json`. |
| Whisper, shout, groan; stress one word | `say` takes `style` (whisper, shout, groan, or a mood such as happy, sad, tired) and `stress: "she"` (that word a little higher and louder inside the one clip, so fluency lines are not chopped up). Tour: `scripts/tour/voice_styles.json`. |
| Answer cards for a challenge | `choices` (`options`: 2-6 texts, `style` word / tile / strip, `layout` auto / row / column): cards `<id>_o1..` side by side when they fit, stacked as a list when the answers are long. Tour: `scripts/tour/choices_fit.json`. |
| A fast hook | `hook` (`question`, `behind`, `target` hidden, `style` lift / slide / tip / open / none, `answer`, `answerWho`): a question, a "?" cue, two cover wiggles, then the reveal with a sparkle, a glow and a camera push. `target` may be a list of up to 4 ids (a small group pops in turn); `style: "none"` moves no cover, so the answer pops out of the object or part (`behind: "mach#slot"`, `out: [0, 0, 0.8]` slides it out of the slot). Tour: `scripts/tour/school_stage_hooks.json`.  A lifted cover is put back where it started, unseen, so a later `show` finds it in place; `reset: true` glides a slid, tipped or opened cover back after the hook. Any object: `reset { target, dur }` (0: at once) returns it to its `at`, rotation and size.  The push-in frames a big cover (over 1.6 m) at medium instead of close.  `peek: true` lets the target show a little under the cover (a letter's tail) and hops it at the reveal (tour `scripts/tour/hook_peek.json`). |
| A countdown | kind `timer_ring` (HUD, top right by default; it drains green, then yellow, then orange) and `timer` (`dur`, `count`, `keep`); with no target, the action adds a ring. Sounds: `timer_tick`, `timer_chime`. |
| Answer choices | `options` (`targets`, `style` pulse / blink) and `answer` (`result` correct: tick, glow, hop, ding, `confetti`; wrong: soft shake, soft cross, `wrong_soft`, `hint` glow). `challenge` chains a prompt, options with a timer, the answer and `praise`. |
| Keyword pop-ins | `say` `keywords: { "water": "drop" }` (an icon, a prop or text), or a `keyword` action: a HUD badge pops when the word is spoken, on the side away from the camera's look point (or `avoid`), stacking and keeping clear of trackers. |
| Progress | kind `tracker` (`style` train / checklist / stars / path, `slots`, `labels`, `surprise`, `corner`) and `progress` (`step` next or a number, `tease`). |
| Call-and-response | `call` (`prompt`, `cue` ear / hand / mouth / eye / question, `wait`, `answer`, `reveal`): the music dips in the pause. |
| Lints | Warnings `W3D_HOOK_LATE` (first interaction after 8 s), `W3D_TALK_STRETCH` (over 15 s of talk without one), `W3D_STATIC_CAMERA` (camera still for over 20 s), `W3D_TRACKER_UNFILLED`. They run when `meta.retention` is set, when the kit is used, or with `validateScript(s, catalog, { retention: true })`, so older scripts stay warning-free. `plan.engagement` lists the cues they time. |

### Toybox 10K asset wave (cards, pages, boards, variants, trackers)

What the 10K specs needed beyond the kits above (`runtime/composite.js`, `catalog/variants.mjs`,
`runtime/retain_tracker_styles.js`, `tools/assets10k.mjs`). Tours: `scripts/tour/composite_tour.json`,
`composite_boards.json`, `tracker_<style>.json`.

| Need | How |
|---|---|
| Picture cards, word cards and tiles, letter tiles, quote cards, sentence strips, name tags | `kind: "card"` with `style` card / tile / word / strip / quote / name_tag, `text`, `picture` (a prop, critter or shape, fitted and flattened onto the card), `tag` (S3, P2). Pieces `<id>_text` (emphasize it), `_back`, `_pic`, `_tag`. Flip with `turn`, glow with `highlight`, wrong with `wiggle`. |
| Story, article and script pages, poem scrolls, big books | `kind: "page"` with `style` book / article / script / scroll / letter, `title`, `lines` (each line is the text_card `<id>_l<n>`, numbered `<id>_n<n>`), `picture`, `caption`, `sidebar`. `size` is the font size; scale the page with `scale`. Lift a line: `move` it toward the camera. |
| Evidence board, T-chart, comparison chart, Venn board, timeline | `kind: "board"` with `layout` pins / columns / venn / timeline, `labels`, `rows`, `title`, `style` cork / white / chalk. Cards snap into the sockets `<id>_s<slot>_<row>` with `reparent { parent, to: [0, 0, 0] }`; sockets are scaled for a `cardWidth` × `cardHeight` card (default a size-1 card). |
| Text that must fit a box | `text_card` takes `height` (fixed; the font shrinks until the text fits), `align: "center"`, `bg: "none"` (only the words), `depth`. |
| Family members, babies, recolors, dressed-up looks | A model entry `{ "like": "<base>", "scale", "recolor", "drop", "add", "eyes": {...} }` is expanded from its base when the catalog loads (`catalog/variants.mjs`). |
| Island map, town map, gauges, growing pencil trackers | `tracker` `style`: `islands` (flags rise; the surprise island waits in mist), `town` (windows light), `gauges` (needles swing to full), `pencil` (a page writes one line per step). |
| Which spec needs exist | `node tools/assets10k.mjs` writes 10K/ASSETS_STATUS.md and 10K/assets_map.json: built, mapped (`catalog/asset_map.json`: how to make a need from existing assets), in script (10K/script_composed.json) or remaining. |
| Saying a sound, syllable or word part exactly | `say` takes `spoken`: what the voice reads while `text` stays the caption (and the keyword timing). A respelling works for words; for sounds use IPA in `[[ ]]`, which Piper speaks exactly: open syllables `ca` `[[ kˈeɪ ]]`, `ma` `[[ mˈeɪ ]]`, `ti` `[[ tˈaɪ ]]`, `go` `[[ ɡˈoʊ ]]`; -le endings `ble` `[[ bəl ]]`, `dle` `[[ dəl ]]`, `tle` `[[ təl ]]`; the letter name A `[[ ˈeɪ ]]`; short a `[[ ˈæ ]]`. Punctuation after `]]` becomes a pause inside the block (runtime/spoken.js). `hook`, `challenge` and `call` take `questionSpoken`, `answerSpoken`, `promptSpoken`, `praiseSpoken`. Tour: `scripts/tour/say_spoken.json`. |
| One letter of a word (point under it, mark it, slide it out) | A `letter` word's characters are pieces `<id>#c1` .. `#cN` (every character, spaces too): `mark`, `highlight`, `move`, `turn`, `wiggle` and `spin` target them, a child rides on one (`parent: "word", part: "c3", at: [0, -0.25, 0.1]` is a finger dot under the third letter) and `reparent` slides it to another. Positions come from `catalog/font_metrics.json` (`tools/gen_font_metrics.mjs`) through `runtime/letter_layout.js`, the same numbers the page lays the word out with. Tour: `scripts/tour/letter_pieces.json`. |
| Syllables and chunks of a word | `split { target: <letter word>, after: [3], gap, blade: true }` slides the characters after each split apart ("tab" + "let"), a gold blade slicing down through the gap; `after: []` joins the word again. A word that starts split takes the object field `split: [3]` (and `splitGap`). Stress: `stress { target, chars: [1, 2, 3], color, count 3, dur 1.2 }` sends glowing rings out from the stressed syllable while it swells (tour `scripts/tour/stress_ring.json`). `ripple { target }` (the same action) sends rings off any object: upright round a standing one, flat round a lying one, never stretched by its scale (use it instead of `grow` on a stood-up ring; tour `scripts/tour/ripple.json`). Chunks stay pieces (`highlight` "word#c5", `wiggle` a vowel to flex it). Tour: `scripts/tour/syllable_split.json`. |
| A label on a stretched box (scale) | A child takes its parent's whole transform, `scale` included, so a letter on a box scaled [3, 0.2, 1] is squashed and sinks into it. Either put the box and its label side by side in a `group` (scale only the box), give the label the inverse scale (`scale: [0.33, 5, 1]` on that box), or use a `card` / `text_card`, which size themselves without scale. `inherit: "size"` only passes a parent's `size`, never its `scale`. |
| A sign, a word train, a storybook | `kind: "sign"` (style post / hanging / wall, its text laid out on the board), `kind: "word_train"` (`words`: one word tile per car, reading left to right; move the whole train) and `kind: "book"` (`spreads` of left / right pages with text and pictures; `turn_page` turns the next leaf over the spine, `back: true` turns it back). `retext` changes a word, a card or a text card in place (go -> got). Tours: `scripts/tour/book_sign_train.json`, `retext.json`.  Only the open spread's words and pictures show (turn_page swaps them as leaves turn), so a later picture never shows through. A word train's long word gets a stretched car and keeps its tile at least `tileSize` 0.6.  Book pictures sit on a pale panel (`frame` colour, default sky) with real depth; `alive` on `<id>_leaf<k>_f_pic` makes one pop out of the page. `kind: "track"` lays a rail track (`style: "rail"`) or a plank bridge (`"plank"`) along x (tour `scripts/tour/track_bridge.json`). |
| Where a shape's `at` is; words on a board | Every shape stands on its `at` (its lowest point: a star, an octagon, a snowflake or a circle sits on it like a sign on the floor). A shape stood up with `rotation: [90, 0, 0]` (a plate, a disc, a hoop) is then centred on its `at` and its face is in front of it by its thickness (a plate: 0.04 x its scale y). So words on a stood-up plate need `at.z` at least that far forward plus 0.035 (a text_card's face is 0.032 in front of its own `at`): plate at z 0, scale y 1 → text at z 0.08. To turn or grow a shape about its middle give it `pivot: [0, h/2, 0]` (any kind: a letter word flips about `pivot: [0, 0.55 × size, 0]`, its `at` then that point; tour `scripts/tour/letter_pivot.json`). A `sign`, `card` or `board` does all of this for you. A shape turns about that foot, so a turned one sinks or floats: give it `base: true` and it is turned about its middle and set down with its lowest point on `at`, its middle over `at`, like a prop (a box on its corner, a torus laid flat with `rotation: [90, 0, 0]`, an upturned dome; tour `scripts/tour/shape_base.json`). None is centred: a `box` or `cube` stands on its bottom face, a `torus` on its rim (it stands upright facing the camera; its hole's centre is at y 0.5 × size), a `dome` on its flat base. Props and critters stand on their base, x and z at the middle of the footprint, facing +z (the camera) unless their description says otherwise; vehicles face their travel direction: `train_engine` faces +x, so as it is a train runs left to right with the engine at the right and the cars behind it at smaller x (`word_train` does this). For a train going right to left turn the engine and cars `[0, 180, 0]` and place the cars at larger x. A `letter`'s `at` is the middle of its baseline (`lift: "descender"`: its lowest point; letters riding in a `train_car` get that automatically). Composites (`card`, `sign`, `choices`...) stand on the foot of their middle. |
| Extra stages | `catalog/stages/*.json` files are merged into `stages.json` (a name once). |

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

**Captions on screen.** A subtitle that wraps grows upward from a 3% bottom margin, so three-line subtitles stay inside the frame; a `label` caption (without `pos`) rises above whatever subtitle is showing, so the two never overlap. Both are renderer-only (`runtime/overlay.js`); plans are unchanged.
