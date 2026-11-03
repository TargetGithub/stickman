# Toy Box Friends: batch 3 plan (30 videos, pre-K to grade 5)

Batch 3 adds 5 videos each for pre-K, grade 1 and grade 2, and opens grades 3, 4 and 5. The specs use the
template in [README.md](README.md) and live in the grade files: `prek.md` (PK-17 to PK-21), `grade1.md`
(G1-11 to G1-15), `grade2.md` (G2-11 to G2-15), `grade3.md`, `grade4.md`, `grade5.md`. The tracked list of every
episode is [../EPISODES.md](../EPISODES.md) (generated; edit `../episodes.json`).

## Topic allocation (no duplicates)

Each topic comes from a skill in `catalog/education/skills.json` that no earlier episode teaches (the "gaps"
section of EPISODES.md), except `life_cycles_3`, which batch 3 adds.

| Id | Title idea | Subject | Skills |
|---|---|---|---|
| PK-17 | Letters M to S | English | capital_letters_prek, letter_look_alikes_prek |
| PK-18 | Dot Dice: Zero to Five | Math | count_to_5_prek, number_order_prek |
| PK-19 | Lines and Curves | Handwriting readiness | prewriting_strokes_prek |
| PK-20 | Rhyme Time | English | rhyming_k |
| PK-21 | Alive or Not? | Science | living_things_k |
| G1-11 | Blend Bridges (bl, cr, st...) | English / phonics | blends_1 |
| G1-12 | Naming Words and Doing Words | English / grammar | nouns_verbs_1 |
| G1-13 | Sentence Builders | English / writing | sentences_1 |
| G1-14 | Skip Count Parade: 2s, 5s, 10s | Math | skip_count_patterns_1 |
| G1-15 | Story Detectives: who, where, what happened | English / reading | story_details_1 |
| G2-11 | Pizza Party Thirds | Math / fractions | thirds_2 |
| G2-12 | Quarters to a Dollar | Math / money | coins_quarters_2 |
| G2-13 | First, Next, Then, Last | English / reading | sequence_inference_2 |
| G2-14 | Needs and Wants Market | Social studies | needs_wants_2 |
| G2-15 | Number Pattern Machine | Math / patterns | number_sequences_2 |
| G3-01 | Array Garden: multiplication | Math | times_tables_3, missing_factor_3 |
| G3-02 | Fractions on a Number Line | Math | fractions_3 |
| G3-03 | Area and Perimeter Playground | Math / geometry | area_perimeter_3 |
| G3-04 | Word Builder Workshop: prefixes and suffixes | English / vocabulary | prefixes_suffixes_3 |
| G3-05 | Life Cycles: frog, butterfly, bean | Science | life_cycles_3 (new) |
| G4-01 | Equivalent Fractions Bakery | Math | equivalent_fractions_4 |
| G4-02 | Tenths Track: decimals | Math | decimals_tenths_4 |
| G4-03 | Angle Explorers | Math / geometry | angles_4 |
| G4-04 | Spinning Earth: day, night, year and seasons | Science / space | earth_space_4 |
| G4-05 | Chain Reaction: cause and effect | English / reading | cause_effect_4 |
| G5-01 | Adding Fractions with Unlike Denominators | Math | fraction_operations_5 |
| G5-02 | Powers of Ten Elevator | Math / place value | powers_of_ten_5 |
| G5-03 | Volume Box Factory | Math / measurement | volume_conversion_5 |
| G5-04 | Body Systems Tour: heart and lungs | Science / life | body_systems_5 |
| G5-05 | Ecosystem Energy: food chains and webs | Science | ecosystems_5 |

### Kept apart

| Pair | Earlier | Later |
|---|---|---|
| G1-07 halves / G2-11 thirds / G3-02 / G4-01 / G5-01 | G1: halves and quarters of one shape. G2: thirds, and "same size whole" | G3: a fraction is a number on a line. G4: equal value, different names. G5: add with unlike denominators |
| PK-18 dice / PK-01 counting | Seeing small amounts at a glance (subitising), 0 as "none" | PK-01 counts to 10 in a row |
| G1-14 skip counting / G2-04 skip_count_2 / G3-01 | Count by 2s, 5s, 10s with real groups | G2-04 counts by 10s and 100s; G3-01 turns equal groups into multiplication |
| G1-06 coins / G2-12 quarters / G5 economics | Penny, nickel, dime | G2-12 adds the quarter and makes a dollar |
| G2-15 number rules / PK-06 AB patterns | PK-06: repeating colour patterns | G2-15: growing number patterns with a rule (+3, −2) |
| G2-13 story order / G1-15 story details / G4-05 cause and effect | G1: who, where, what happened, feelings | G2: order and why; G4: cause → effect chains and signal words |
| G2-10 states of matter / G4-04 earth / G5-04, G5-05 | – | No repeats: G4-04 is Earth's motion only; seasons are explained by tilt, not re-taught as weather (G1-08) |
| PK-21 alive or not / G2-08 habitats / G3-05 life cycles / G5-05 ecosystems | Living things grow, need food and water, have babies | Habitats: where they live; life cycles: how they change; ecosystems: how energy moves |

## Cast

Robo hosts every video. Each grade has one recurring sidekick, and guests have one clear job.

| Grade | Sidekick | Personality |
|---|---|---|
| Pre-K | Duck | Eager, quacks when excited, tries first |
| Grade 1 | Frog | Bouncy and silly, loves big jumps |
| Grade 2 | Cat | Clever and a little cool; asks "but why?" and checks answers |
| Grade 3 | Fox (`fox`) | A builder and tinkerer: "Let's build it and see!" Measures twice |
| Grade 4 | Owl (`owl`) | The careful explainer with a notebook; loves the word "evidence" |
| Grade 5 | Monkey (`monkey`) | Quick and playful; makes confident mistakes kids get to catch |

## New building blocks for batch 3 (engine contract)

Built in batch 3 (see `engine3d/README.md` once merged; names here are the contract the specs and scripts use).

**Teaching kit (object kinds).**

| Kind | Fields | Notes |
|---|---|---|
| `number_line` | `from`, `to`, `length` (m), `step` (labelled tick every step), `minor` (equal parts between labelled ticks, e.g. 4 for quarters), `labels` (`"numbers"`, `"fractions"`, `"none"` or a list of strings), `color` | Other objects can stand on it: `on: { "line": "<id>", "value": 0.75 }` instead of `at`. |
| `fraction_bar` | `parts`, `shaded`, `length`, `height`, `color` (shaded), `empty` (colour), `label` (true shows "shaded/parts" over it) | A bar cut into equal parts. |
| `fraction_circle` | `parts`, `shaded`, `radius`, `color`, `empty`, `label` | A pie cut into equal slices; slices are parts `#s1`… for `move` (pull a slice out). |
| `array` | `rows`, `cols`, `item` (`dot`, any shape name, or a prop model), `gap`, `color`, `size`, `trays` (true puts a tray under each row: equal groups) | Rows and columns of equal things. |
| `grid` | `rows`, `cols`, `cell` (m), `color`, `upright` (true stands it like a wall chart, else it lies flat) | Unit squares for area. |
| `cubes` | `l`, `w`, `h`, `cell`, `color`, `box` (true draws a clear box around them) | Unit cubes for volume. |
| `pointer` | `from`, `to`, `color`, `width`, `bend` (arc height; 0 = straight) | A 3D arrow (cause → effect, food chains, energy flow). |
| `callout` | `text`, `point` ([x, y, z]) or `target` (object id), `offset` ([x, y, z] from the point to the label), `color`, `bg` | A label on a card with a leader line to what it names. |
| `angle` | `degrees`, `radius`, `color`, `arc` (true), `label` (true shows the degrees) | Two rays from a vertex with an arc. |

**Teaching actions.**

| Action | Params | What it does |
|---|---|---|
| `build` | `target` (array, grid, cubes, fraction bar or circle, number line), `order` (`items`, `rows`, `cols`, `layers`), `dur`, `sound` | Reveals the pieces one by one (count along). |
| `shade` | `target` (fraction bar or circle, grid, array), `to` (how many parts are shaded), `color`, `dur` | Shades parts in order. |
| `leap` | `target`, `line` (number line id), `values` (list), `dur` (per leap), `height` | Arcs from value to value along a number line. |
| `draw` | `target` (pointer, number line, callout), `dur` | Draws it from start to end. |
| `open` | `target` (angle), `to` (degrees), `dur` | Opens or closes an angle. |
| `mark` | `target`, `result` (`correct` or `incorrect`), `dur` | A green tick or a soft red cross badge with a ring over the target (correct vs incorrect). |
| `highlight` | `target`, `color`, `dur` | A soft glowing ring that pulses around the target (look here). |
| `trace` | `target` (grid), `dur` | A glowing dot runs round the grid's edge, counting units (perimeter). |

**Look, voices and camera.**

| Feature | How |
|---|---|
| Lip-sync | `say` takes `who` (the speaker's object id): critters and face shapes move their mouths with the voice's loudness; Robo bobs his head as he talks. |
| Look at | `look` with `target` and `at` (object id or [x, y, z]) turns a head (and Robo) toward something. |
| Framed shots | `shot` with `target` (id or list of ids), `framing` (`wide`, `medium`, `close`), optional `yaw` and `height` (degrees), `dur`: the camera frames the targets without cropping. |
| Orbit | `orbit` with `around` ([x, y, z]), `degrees`, `dur`: a slow arc round a 3D model (volume boxes, the Earth). |
| Stages | `classroom` (chalkboard wall, wood floor), `lab` (white and teal, benches), `forest`, `pond` (water, reeds), plus the 11 batch 2 stages. |
| Audiences | `grade3`, `grade4`, `grade5`. |

**Thumbnails** (designed, never a video frame): `meta.thumbnails` is a list of 2–3 concepts, each a small scene
of its own: `{ "name": "a", "title": "ARRAYS!", "subtitle": "Multiply with rows", "titleColor": "yellow",
"side": "left", "stage": "garden", "camera": {...}, "objects": [...] }`. `tools/thumbnail3d.mjs` renders each one
at 4K, lays the title text over it (large, outlined, readable at phone size) and writes
`thumbnail_<name>.jpg` (1280×720); the first concept is also `thumbnail.jpg`.

**New models** (`catalog/models/batch3.json`): life-cycle stages (frog eggs, tadpole, froglet, caterpillar,
chrysalis, bean sprout stages), globe, sun lamp, heart, lungs, a see-through body model, dominoes, protractor,
metre stick, dollar bill, chalkboard, lab bench, beaker, microscope, grass, mushroom, worm, hawk, market stall,
socks, mittens, a pattern machine, a crown, a nest, a hat, a bug, a rug, a jar, a bee.

## Pacing by grade

| Grade | Length | Sentence length | Voice speed | Pattern |
|---|---|---|---|---|
| Pre-K | 3–5 min | 3–7 words | 0.90–0.95 | Teach → repeat → quiz (2–3 s pauses) → cheer |
| Grade 1 | 5–7 min | up to 10 words | 0.95–1.0 | Story problem → model → try together → quiz |
| Grade 2 | 6–8 min | up to 14 words | 1.0 | Mission → explain why → practise → challenge |
| Grade 3 | 7–9 min | up to 16 words | 1.0 | Question → build a model → find the rule → practise → check |
| Grade 4 | 7–9 min | up to 18 words | 1.0 | Puzzle → model two ways → explain → apply → check |
| Grade 5 | 7–9.5 min | up to 18 words | 1.0–1.02 | Real problem → model → generalise → apply → check |

Every video stays under 10 minutes (the series test allows 40–600 s).
