# Theme model files

Each JSON file here adds critters and/or props to the catalog, in the same format as `../models.json`
(`{ "description", "critters": {}, "props": {} }`). `catalog/index.mjs` merges `models.json` and every file in
this folder (sorted by name); a model name may be defined only once across all files.

| File | What |
|---|---|
| `animals.json` | More toy animals for habitats, stories and phonics |
| `home_school.json` | Home, health, food, school and maths props |
| `outdoor_science.json` | Science kit, vehicles, town, playground, weather and plant props |
| `batch3.json` | Toy Box batch 3: life cycles (frog, butterfly, bean), globe and sun lamp, heart, lungs and body model, maths tools, school and lab sets, nature critters, everyday and story props |
| `batch3b.json` | Toy Box batch 3, second set: octopus, grasshopper, tadpole with legs; dice (1–6 and a 0–5 die) and dominoes with set pips and blank halves; counting hand, hatching egg, fence, carrot, thermometer, door, skateboard, stopwatch; heart cutaway, air sacs; berry bush, banana plant, milkweed, bean seed cutaway, open pod, butterfly egg; blender, measuring cup, juice carton, conveyor belt; padlock, hammer, paintbrush, ticket, token, prize ribbon, clapperboard, toy crane, oil can, story card, bell, puzzle pieces |
| `fluffy.json` | Fluffy and friends, a plush mascot in seven looks (fluffy, yogurt_man, dumpling_buddy, fluffy_smart, fluffy_magic, fluffy_sporty, fluffy_super) and their outfit props (basketball, magic_wand, round_glasses, wizard_hat, baseball_cap, eye_mask, hero_cape, star_badge). **Generated** by `tools/gen_fluffy.mjs` (it measures each body to place the face, cap and shorts): edit the generator and rerun it, not the JSON |
| `farm.json` | Farm rhymes (br01 Old MacDonald and later): the `horse` critter (named legs, tail, mane), the `barn` with doors `door_left`/`door_right` (open: turn to [0, -100, 0] / [0, 100, 0]; an animal inside at local z 0.3 shows through), `hay_bale`, and HUD pieces `tracker_slot` (rim takes `color`, inner card `face`) and `word_bubble` (a word in front at z 0.1). The `farm` stage is in `stages.json` |
| `rhymes_br02.json` | br02 Baa Baa Black Sheep: `wool_bag` (a stuffed wool sack, all in its main colour: set `color`) and `yarn_ball` (main colour, a trailing end). The coloured sheep are the `sheep` critter with `color` (the black one with `recolor: { charcoal: "grey" }` so its face shows) |
| `rhymes_br04.json` | br04 Head, Shoulders, Knees and Toes: `toddler` (Pip, a toddler who touches its own body parts: the head group is the hip pivot, so turning `#head` about x bends the upper body; separate `arm_l`/`arm_r` with forearms `fore_l`/`fore_r` on them; poses in `scripts/series/toybox/rhymes/br04.mjs`), `toddler_hands_on_head` (the same with both hands on its head, for thumbnails), HUD icons `icon_head`, `icon_shoulders`, `icon_knees`, `icon_toes`, `icon_face`. Colour `toddler_skin` |
| `rhymes_br06.json` | br06 Row, Row, Row Your Boat: `rowing_boat` (built along z, bow at +z: give it rotation [0, 90, 0] to row toward +x; named part `oar` turns both oars as mirror images, so `turn` it by [0, ±30, 0] in turn to row; Robo sits in it on the middle seat with `parent`, at [0, 0.12, 0], clip `Sitting`). The river is shapes and `flow` dots in the script |
| `rhymes_br07.json` | br07 Itsy Bitsy Spider: `spider` (Itsy, a friendly purple spider), `water_spout`, `spout_gush`, `sun_rays` |
| `rhymes_br08.json` | br08 Humpty Dumpty: `humpty` (a friendly egg critter with a bow tie, arms and legs), `brick_wall`, `pillow` (set `color`), stair blocks `step_rectangle`, `step_square`, `step_triangle`, `step_circle` (0.35 m tall, with a shape hole) |
| `rhymes_br09.json` | br09 Hot Cross Buns: `hot_cross_bun`, `baker_tray`, `bun_plate` (rim takes `color`), `baker_hat` (parent to Robo at [0, 1.6, 0]). Colours `bun_gold`, `bun_crumb`. The catalog `oven` door opens (turn `oven#door` to [85, 0, 0]) |
| `rhymes_br10.json` | br10 Rainbow Colours Song: `rainbow_band` (one arch stripe in its main colour, feet on y = 0; tracker icons and thumbnails), `paint_drop`, `paint_splash` (an upright splat, floats) and `rainbow_brush` (its wet tip is its main colour, so `paint` it to change paint; origin at the tip, handle up +y: rotation [0, 0, -150] holds it handle-down). The sky rainbow itself is six `stroke` objects revealed with `draw` |
| `rhymes_br11.json` | br11 Shapes Are Everywhere: `shape_sorter` (a purple cube, 1.1 m, with circle, square, triangle, star and heart holes on its cream top; flat shape pieces of size 0.24 turned [-90, 0, 0] drop in; hole centres in its description) and `heart_card` (a standing greeting card with a big red heart) |
| `rhymes_br12.json` | br12 This Is the Way We Start the Day: `alarm_clock` (twin bells, named part `bells` to wiggle while it rings; hands at seven), `nightstand` (top at y 0.6), `clothes_rail` (bar at y 1.45) with `tshirt_hanger` (origin at the hook top), `tshirt` (main colour, for tracker icons), `breakfast_bowl` (porridge and berries; tilt [35, 0, 0] as an icon) and `spoon`. Sink, toothbrush, toothpaste, soap, bed, table and chair are in `home_school.json` |
| `rhymes_br13.json` | br13 Pat-a-Cake: `baking_bowl` (main colour, batter inside; a `mixing_spoon` parented at about [0.04, 0.17, 0]), `mixing_spoon` (origin at the head's tip: tilt it [0, 0, 15] and `spin` it about y to stir), `plain_cake` (frosting in its main colour, flat top at y 0.21: parent a `letter` at [0, 0.2, 0] to mark it), HUD icons `clap_icon` and `pat_icon` (a disc in the main colour) |
| `rhymes_br14.json` | br14 Rain, Rain, Go Away: a pop-open umbrella in three props (`umbrella_stick`, `umbrella_furled` and `umbrella_canopy`, all taking `color`: parent the cover and canopy to the stick at [0, stick size, 0], hide the cover and `pop` the canopy to open it), `raincoat` (fits the bunny), `rain_boots` (fit Pip), `rain_hat` (a sou'wester; on Robo at [0, 1.56, 0], size 1.5), `puddle` and `splash_drops` |
| `rhymes_br16.json` | br16 Mary Had a Little Lamb: `mary` (a girl on Pip's toddler body: pink dress, pigtails with bows, red shoes; same named parts and poses as `toddler`, plus `dress`, `bows`), `lamb` (a small white lamb, 0.75 m at size 1; named parts `ears`, `tail`, `legs`), `schoolhouse` (red, 1.8 × 1.4 m, 2.6 m tall; bell tower with a swinging `bell`; sign board front at z 0.73, y 1.52), `cloth_table` (cloth to the floor in its main colour, top at y 0.66: a lamb behind it is hidden) and `paint_pots` |
| `rhymes_br15.json` | br15 This Old Man: `drum_sticks` (two named sticks `stick_l` / `stick_r` pivoting at the grip: put the origin on a drum skin and turn one to [-25, 0, 0] and back to tap), `bone` (lies flat), `shoe` (a toddler sneaker, toe +z), `beehive` (a straw skep on a stump), `garden_gate` (named part `gate`: turn to [0, -70, 0] to open), `washing_line` (clothes pegged on) and the critter `hen` (cream, red comb, talks with a dropping beak) |
| `rhymes_br17.json` | br17 B-I-N-G-O Clap Along: `letter_block` (a 0.5 m wooden toy block in its main colour with cream panels; parent a `letter` to its front: at size 1.2 a letter of size 0.23 at [0, 0.14, 0.33]) and `dog_collar` (main colour, gold name tag; on the catalog dog with `part: "head"` at [0, -0.27, -0.03]). The CLAP icon is `rhymes_br13.json` `clap_icon` |
| `rhymes_br19.json` | br19 Once I Caught a Fish Alive: `fishing_net` (a soft catch-and-release landing net; origin at the pole's foot, hoop centre at [0, 0.92, 0.38], see-through bag; a fish of size 0.5 sits in it at about [0, 0.6, 0.38]), `bubble` (a shiny see-through water bubble, size = width, main colour; rises from water and fills tracker slots) and `arrow_icon` (a round badge with an arrow pointing +x in the main colour; rotation [0, 0, 180] points left) |
| `rhymes_br20.json` | br20 Opposites Hop: four round HUD icons, one per pair of opposites (`opp_icon_big_small`, `opp_icon_up_down`, `opp_icon_loud_quiet`, `opp_icon_fast_slow`; a 0.9 m disc in the main colour, floating, origin in the middle, like `clap_icon`). The balls, balloon, rock, drum, bell, bunny and turtle are already in the catalog |
| `rhymes_br18.json` | br18 Hey Diddle Diddle: `fiddle` (a small violin; named part `bow` lies across the strings with its pivot at the middle: wiggle it to play; on the cat parent it at about [0.05, 0.19, 0.22], rotation [0, 0, -45]), the critters `dish` (a standing white plate with a face, blue arms, red shoes; the plate is the head group) and `spoon_friend` (a silver-grey spoon on its handle, the bowl is the head with the face; `spoon` is the br12 table spoon) with named parts `leg` and `arm`, and `moon_face` (a round glowing full moon with a face, 1.1 m across, no feet: lift it with `at` to float it) |
| `tk_wild.json`, `tk_wild2.json`, `tk_farm_pets.json`, `tk_birds.json`, `tk_family.json` | Toybox 10K characters (crab, hedgehog, otter, elephant, giraffe, goat, puppy, kitten, the Bear family, 25 birds...). **Generated** by `tools/gen_tk_*.mjs` (edit the generator, rerun it); many are `like` variants (see below). Review sheets: `scenes/sheet10k_tk_*.js`. Named parts and poses are in each description |
| `tk_phonics.json` | Picture props for grade 1 phonics words (generated by `tools/gen_tk_phonics.mjs`): `push_pin`, `zipper`, `wig`, `bib`, `pie`, `necktie`, `nine_dots`, `mop`, `spinning_top`, `rope_coil`, `nose_face`, `garden_hose`, `hand_fan`, `nail`, `road_piece`, `folded_map`, `hug_pair`, `fluffy_tail`, `frying_pan`, `music_note`, `ten_dots`, `bubble_gum`, `huge_ball`, `flute`, `prune`, `sack`, `ham`, `flag`, `ocean_wave`, `hand_wave`, `board_game`, `clothes_peg`. Each faces the camera so a picture card shows it; `asset_map.json` maps each word to its prop |
| `tk_props.json` | Toybox 10K behaviour props: `word_machine` (funnel, print `slot`, gauge needles `needle_1`/`needle_2`, `light`, `lever`) `stage_curtain` (mirrored `curtain` halves part when moved), `dress_form` (a mannequin torso on a stand: `torso`, `stand`, `tape`, `pins`; main colour) and others. Stages for the 10K set (school_stage, fox_workshop, ...) are in `catalog/stages/tk_stages.json` |
| `dumpydoo.json` | DumpyDoo, a smooth steamed-bun mascot (dough body cut at the collar into a tilting head and a belly, top knot, leaf collar with an orange button, stubby arms and feet). **Generated** by `tools/gen_dumpydoo.mjs`; its shapes (`bao_drop`, `bao_head`, `bao_belly`, `bao_knot`, `leaf_collar`, `brow_thin`, `eyelid`) live in `runtime/dough.js` |
| `silent_movie.json` | DumpyDoo's silent movie (`scenes/dumpydoo_silent_movie.js`, script `scripts/series/dumpydoo/SILENT_MOVIE.md`): `bowler_hat` (sits on DumpyDoo's head at `[0, 0.63, 0]`, size 1.2), `cane` (hangs from a glove by its hook: give it `pivot: [0.055, 0.45, 0]`), `banana_peel`, `mirror_frame` (no glass) and `street_lamp`. Shapes `bowler_crown`, `bowler_brim` and `crook` live in `runtime/silent_shapes.js` |

## Variants (`like`)

An entry `{ "like": "bear", "scale": 0.6, "recolor": { "brown": "honey" }, "drop": ["tail"], "add": [parts], "eyes": { "iris": "blue" } }`
is built from its base when the catalog loads (`catalog/variants.mjs`): `scale` multiplies every length, `recolor`
swaps colours, `drop` removes named parts, `add` appends parts (unscaled), face objects merge. It needs its own
description and tags. The expanded model keeps `variantOf`.

## Part fields beyond the basics

| Field | |
|---|---|
| `fur` | `true` or `{ length, shells, density, clump }`: plush fur shells on the part (`runtime/fur.js`). Use with the `plush` material. |
| `hr` | `[x, y, z]` degrees: turns the mesh inside its pivot (a thumb on a mitten that swings from the shoulder). |
| `hang` | Offset of the mesh from its pivot, so several parts can share one pivot and swing together (arm, mitten and thumb; leg and sneaker). |
| `on` | `"head"`, or the name of a part listed earlier: the part hangs on that part's pivot and swings with it (a forearm `on: "arm"` at the elbow; a mirrored part goes on that part's mirrored copy). Its `at` is then in that part's frame. |

Critter faces can also take `eyes.iris` (a colour: big cartoon eyes with a white ball, iris, pupil and two
shines), `brows` (`{ color, size, lift, dz }`: thick arched brows that always show and move with feelings) and
`mouth.open: true` (a grin with teeth and a tongue; its surprised mouth is a filled oval).

More face options: `eyes.lid` with `eyes.iris` draws a flat toon anime eye in layers (`runtime/toon_face.js`: white,
lid shade, iris rim, iris, pupil, crescent, shines, lid lines), coloured by `iris`, `color` (pupil), `lid`, `white`,
`shade`, `rim`, `pupilLow`, `crescent`; `eyes.turn` (`[pitch, yaw]` degrees) stands it on a face that curves away, and
the joyful arcs take the lid colour. `brows.shape` (`"brow"` thick, `"brow_thin"` peaking toward the nose),
`brows.tilt`; `mouth.shape` (`"grin"` or `"grin_wide"`), `mouth.teethShape` / `mouth.tongueShape` (`grin_wide_teeth`,
`grin_wide_tongue`: built in the mouth's frame), `mouth.tilt` (degrees about x), `mouth.tall`, `mouth.teeth`,
`mouth.tongueSize`; `cheeks.tall`; `head.tilt` (scales the head tilt feelings add, default 1), `head.look` (scales
how far a look turns the head, default 1, or `[yaw, pitch]` factors). Toon eyes also move (`runtime/gaze.js`): they glance around on their own,
lead a `look`, and follow a `gaze` prop (`d.tween(id, "gaze", [x, y])`, -1..1, x + toward the critter's left, y + up). `mouth.shape: "mouth3d"` (with
`mouth.open`): a real 3D mouth (`runtime/toon_mouth.js`): an opening you see into, a lit cavity, upper teeth
under the top lip and a tongue riding a moving jaw (drawn through the opening with the stencil buffer).
`mouth.talk: "grin"`: when the critter speaks (`say` with `who`), its own mouth talks instead of a dark oval: the
3D mouth Minion style, with rolled lips, the jaw following the voice, squash and stretch, and each vowel's shape
(round "oo", open "ah", wide "ee": the `mouthShape` prop from `lipsync.js`). `dumpydoo.json` also has a
`black_glove` prop; DumpyDoo wears black rubber gloves (`rubber` material) and Minion-style
overalls (`runtime/bao_clothes.js`: `bao_pants`, `bao_bib`, `bao_back`, `bao_straps`, `bao_pocket`, `bao_stitches`; twill
pattern in the surface, open at the sides for the arms); its arms are the curvy `bao_arm` shape. Soft blush: stack a
few flat ovals in the see-through `blush` material. A material may set `sheenColor` (hex) for its sheen tint.
