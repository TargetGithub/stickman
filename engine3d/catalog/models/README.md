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
| `bao_buddy.json` | Bao Buddy, a smooth steamed-bun mascot (dough body cut at the collar into a tilting head and a belly, top knot, leaf collar with an orange button, stubby arms and feet). **Generated** by `tools/gen_bao_buddy.mjs`; its shapes (`bao_drop`, `bao_head`, `bao_belly`, `bao_knot`, `leaf_collar`, `brow_thin`, `eyelid`) live in `runtime/dough.js` |

## Part fields beyond the basics

| Field | |
|---|---|
| `fur` | `true` or `{ length, shells, density, clump }`: plush fur shells on the part (`runtime/fur.js`). Use with the `plush` material. |
| `hr` | `[x, y, z]` degrees: turns the mesh inside its pivot (a thumb on a mitten that swings from the shoulder). |
| `hang` | Offset of the mesh from its pivot, so several parts can share one pivot and swing together (arm, mitten and thumb; leg and sneaker). |

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
lead a `look`, and follow a `gaze` prop (`d.tween(id, "gaze", [x, y])`, -1..1, x + toward the critter's left, y + up). `mouth.talk: "grin"`: when the
critter speaks (`say` with `who`), its own grin talks (thin smile to full grin with the voice) instead of a dark oval. Soft blush: stack a
few flat ovals in the see-through `blush` material. A material may set `sheenColor` (hex) for its sheen tint.
