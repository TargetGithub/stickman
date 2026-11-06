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
| `dumpydoo.json` | DumpyDoo, a smooth steamed-bun mascot (dough body cut at the collar into a tilting head and a belly, top knot, leaf collar with an orange button, stubby arms and feet). **Generated** by `tools/gen_dumpydoo.mjs`; its shapes (`bao_drop`, `bao_head`, `bao_belly`, `bao_knot`, `leaf_collar`, `brow_thin`, `eyelid`) live in `runtime/dough.js` |
| `silent_movie.json` | DumpyDoo's silent movie (`scenes/dumpydoo_silent_movie.js`, script `scripts/series/dumpydoo/SILENT_MOVIE.md`): `bowler_hat` (sits on DumpyDoo's head at `[0, 0.63, 0]`, size 1.2), `cane` (hangs from a glove by its hook: give it `pivot: [0.055, 0.45, 0]`), `banana_peel`, `mirror_frame` (no glass) and `street_lamp`. Shapes `bowler_crown`, `bowler_brim` and `crook` live in `runtime/silent_shapes.js` |

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
