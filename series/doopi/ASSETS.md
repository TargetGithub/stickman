# Doopi & Friends: assets to create first

Status: **draft for Sridhar's review** (2026-10-18). Story: [BIBLE.md](BIBLE.md), [EPISODES.md](EPISODES.md).

Everything the series needs that the engine and catalog don't have today (catalog as of the C1-C3 reorganization: 6 humanoid body plans, 12 themes, 32 objects, 36 FX, 147 moves). Each item says **what kind of work** it is, **which episodes** need it, and gives a **spec** plus a **creation prompt** you can paste into `tools/draft.mjs` (any chat with `--manual`), an image tool for SVG art, or hand to a coding session.

Kinds of work:
- **Engine:** code in `engine/` (and the validator, tests, docs). Needs its own milestone or session.
- **Renderer:** drawing code in `engine/renderer/` plus a catalog entry (new accessory, hair style, draw style, layer kind).
- **Data:** catalog JSON only, drafted with `node tools/draft.mjs object|theme|move "<prompt>" --manual`, reviewed by eye, added with `--write`, then `npm run catalog:build`.
- **SVG:** art drawn in any vector tool (or generated, then cleaned), imported with `node tools/svg_import.mjs art.svg --name <id> --height <px> --source "<author, license>"`. Flat colours, 2-3 px dark outlines, no gradients, no text, facing right, standing on the floor line.
- **Audio:** SFX recipes in `tools/lib/synth.mjs` plus `catalog/effects/sfx.json`.

Reuse first: where something existing is close enough, the item says so (for example `snow_mountain` for Grey Peak, `dojo_dusk` for the training ground, `cage`, `rope`, `aura`, `desaturate`).

## Build order

| Batch | Unlocks | Items |
|---|---|---|
| **A** (do first) | Act 1, eps 1-5 | R1, C1-C10, E1-E3, T1, T2, T13, O1-O9, F1-F3, S1, S2, S6, S7 |
| **B** | eps 6-11 | R1 swim, C11-C14, T4-T10, O10-O20, F4-F6, S3, S4 |
| **C** | eps 12-18 | C15-C17, E4, G1, T11, T12, T14-T16, O21-O27, F7-F9, S5 |
| **D** | eps 19-24 | T17, O28, O29, F10-F15, M1 |

---

## R. Rigs (engine)

### R1. Quadruped rig for Becky (Engine, eps 1-24) **blocks everything**
Becky appears in every episode, so this is the first item. It is the "later version" door left open in STORY_SPEC 6.2 (`rig` field, `E_MOVE_RIG`).

**Spec**
- New `rig: "quadruped"` with its own joint topology: head, neck, spine (2 segments), tail (2-3 segments, procedural wag), 4 legs (upper and lower each), ears (2, floppy, procedural bounce).
- Body plan `dog_small` in `catalog/characters/bodies.json`: `rig: "quadruped"`, height about 0.45 of the stickman (knee-high to Doopi), filled oval body (draw style `quad_body`), round head with a snout, floppy ears. Plan appearance: `ears: floppy`, `tail: wag`, `snout: short`, `patch` (eye patch color), `collar` (color, with a bell).
- Its own pose channels and a move set in `catalog/moves/quadruped.json` (category per move), authored facing right:
  - Movement: `idle_dog` (breathing, tail wag), `walk_dog`, `trot`, `run_dog` (gallop), `jump_dog`, `sit_dog`, `lie_dog`, `roll_over`, `swim` (paddle, head above a water line).
  - Life and emotes: `bark` (head up, mouth open, `bark` event for SFX), `whimper`, `growl`, `wag` (happy, fast tail), `sniff` (nose to floor, walking slowly; a loop with `stride`), `dig`, `play_bow`, `beg`, `lick` (paired with a humanoid: `lick_partner` is the humanoid's giggle), `shake_off` (water), `sleep_dog`.
  - Action: `pounce`, `tug` (holding rope or cloth in the mouth, pulling back), `bite_hold` (grabs a villain's cape or pants: comic, never a real bite: no damage, the victim plays `stagger` and hops), `dodge_dog`.
  - Carry: holdables attach to a `mouth` anchor (rope, key, headband, bone, ball) instead of a hand.
- Faces: the faces catalog works on the dog head (eyes, brows, mouth), with the snout drawn under the eyes.
- Validator: `E_MOVE_RIG` for humanoid moves on Becky (no `jab` for dogs); paired humanoid moves that a dog can take part in get a quadruped partner move (`pat_head` → `pat_head_dog`, `hug` → `hug_dog`, `carry` → humanoid carries the dog in arms, `piggyback` → dog rides on a shoulder for Ghoomu).
- Macros: `@chase` (Becky as runner or chaser), `@travel`, `@enter`/`@exit`, `@walk_together` must accept a quadruped. `@fight` does not (Becky never fights; she distracts, tugs, barks).
- Activities: `play_catch` and `kick_ball` with Becky as the catcher (ball in mouth); a new `fetch` activity (a humanoid throws, Becky runs, brings it back).
- Speech: `say` with `bubble: "think"` only (pictures like "?!", a bone, a heart in text); barks are SFX (S1).

**Creation prompt (for the coding session)**
> Add a quadruped rig to the StickMan engine (STORY_SPEC 6.2) for a small cartoon puppy named Becky: cream body (#f3e3c3), a brown patch over the left eye (#8a5a3c), floppy brown ears, a wagging tail, a red collar with a gold bell. Knee-high to the stickman, cute and round, big eyes. Joints: head, neck, two spine segments, a 3-segment tail with procedural wag, four 2-bone legs, two floppy ears with procedural bounce. Add body plan `dog_small` (rig quadruped) and the move set listed in series/doopi/ASSETS.md R1, with ground contact, a 4-beat walk, a gallop for run, a swim paddle and a mouth anchor for holdables. Validator: E_MOVE_RIG for humanoid moves on a quadruped. Keep moves deterministic; add table-driven unit tests and a filmstrip review sheet of every dog move.

### R1-swim. Water line (Engine, eps 9-11)
A scene-level `water: { y }` (or a theme layer kind `water` with a level) so characters below it are tinted blue and sway slowly, the `swim` move keeps the head above the line, and boats float on it. Needed for the lake, the whirlpool and the underwater rescue.

---

## C. Characters and looks

Accessories and hair styles are renderer code (`engine/renderer/appearance.js`) plus a `catalog/characters/appearance.json` entry with a description. Colours are given; all can be changed in the cast entry.

| Id | Item | Kind | Eps | Spec | Creation prompt |
|---|---|---|---|---|---|
| C1 | **Doopi** cast entry + preset | Data | all | `stickman`, `#5ec8ff` (was `#3fb8ff`: W_CONTRAST on city_park), `eyes: big`, `hair: spiky` (`#2a1a14`), `mouthStyle: cartoon`, headband `#ff3b5c` | Preset `doopi.json`, role hero |
| C2 | **Dony** preset | Data | all | `kid`, `scale 1.1`, `#4cd964`, `hair: cap` `#ffcc00`, scarf `#ffcc00` | Preset `dony.json`, role friend |
| C3 | **Doomi** preset + accessory `hair_flower` | Renderer | all | `stickman`, `#ff7eb6`, ponytail `#5a3a2c`, cheeks `#ff9db8`, shirt `#ffd1e3`; NEW `hair_flower`: a 5-petal flower clip on the side of the head (16 px), petal colour + yellow centre | "A small five-petal flower hair clip worn above the right ear, flat cartoon, petals in the given colour, a yellow dot centre, dark outline." |
| C4 | **Becky** look (on R1) | Renderer | all | see R1: cream, eye patch, floppy ears, red collar + bell | (in R1) |
| C5 | **Mooka** preset + accessory `sprout` | Renderer | all | `buddy`, `scale 0.85`, `#7fe8c4`, NEW `belly` patch `#c9b6ff` (a soft oval on the capsule), cheeks `#ffb3c7`, big eyes, cartoon mouth, NEW `sprout`: two small leaves on a short stem on top of the head; NEW `mittens` (orange hands, `#ff9f43`). **Original design: never yellow, no goggles, no overalls.** | "A tiny two-leaf sprout growing from the top of a round head, short curved stem, two bright green leaves, flat cartoon, dark outline. Also: rounded mitten hands in orange." |
| C6 | **Peepa** preset + accessory `horns`; **Giant Peepa** | Renderer | all; giant 20-24 | `slim`, `scale 1.15` (giant: `scale 3` with `set_appearance` aura), `#7b4bd8`, oval eyes, thick brows, cape `#2a1b3d`; NEW `horns`: two curly ram-style horns curving back and out from the top of the head, golden `#e6b84a`, with 3 ring grooves; must read in silhouette at 30 px | "Two curly ram horns for a cartoon villain's head, curving back and outward, golden with three darker ring grooves, flat cartoon, thick dark outline, friendly-scary not demonic." |
| C7 | **Nani Nimbu** preset + hair `bun` | Renderer | 1-6, 14, 24 | `elder`, `scale 0.9`, purple shawl (`outfit: robe` `#8e5bd6`), glasses, NEW hair `bun`: a round white bun on top of the head with a hairpin; holds `cane` | "A round hair bun on top of an old lady's head, white-grey, a small wooden hairpin through it, flat cartoon." |
| C8 | **Mayor Motumal** preset + accessory `turban` | Renderer | 1-6, 12, 15, 21-24 | `bulky`, `#e07b39`, coat `#ff9f1c`, NEW `turban`: a rounded wrapped turban with a jewel at the front (counts as headwear, conflicts with hat/cap/crown) | "A cartoon wrapped turban, rounded, saffron coloured with a small round red jewel at the front, flat, outlined." |
| C9 | Accessory `moustache` | Renderer | Mayor, Thunda, gag disguises (ep 5) | A big curly moustache under the nose; sizes `small`/`big` via colour only (one shape is fine) | "A big curly handlebar moustache, flat cartoon, one colour, outlined." |
| C10 | **Tony & Kony** presets + accessory `stub_horns` | Renderer | 1-5, 9-11, 19-24 | `kid`, `scale 0.8`, grey `#9a9aa8`; Tony `hair: cap` red, Kony `hair: cap` blue (drawn backwards: NEW cap option `cap_back`, optional); NEW `stub_horns`: two tiny cone horns that can fall off (`set_appearance remove` for the gag) | "Two tiny cone-shaped toy horns stuck on a kid's head, slightly crooked, grey-purple, flat cartoon." |
| C11 | **Tara Treetop** preset | Data | 6-8, 15, 22-24 | `kid`, `#ff8c42`, ponytail `#3a2414`, scarf `#3fae5a`; swings on vines (O-vine optional: a `climb_up` on a vine set piece) | Preset only |
| C12 | **Madam Mirchi** preset + accessory `chilli_hat` | Renderer | 6-8, 19, 22 | `slim`, `#e63946`, `outfit: robe` `#ff6b35`; NEW `chilli_hat`: a tall curved red-chilli-shaped hat with a green stem tip | "A tall pointy hat shaped like a curved red chilli pepper, green stem at the tip, flat cartoon, outlined." |
| C13 | **Captain Kanta** preset + accessory `pirate_hat` | Renderer | 8-11 | `stickman`, `#264653`, eyepatch, coat `#1d3557`, toy cutlass (`sword` prop); NEW `pirate_hat`: a tricorn with a cartoon fish emblem (not a skull) | "A cartoon tricorn pirate hat, dark navy with a gold trim and a small white fish emblem at the front, flat, outlined." |
| C14 | **Mallu Uncle** preset + accessory `beard` | Renderer | 9-12, 22-24 | `elder`, `#8d6e63`, `hair: cap` `#f4f1de`; NEW `beard`: a round white beard | "A round fluffy white beard for a cheerful old boatman, flat cartoon." |
| C15 | **Iron Ghoom** body plan `robot` + accessory `windup_key` | Renderer (draw style) | 11-24 | NEW body plan `robot`: humanoid rig, box torso (draw style `box`, rounded corners), cylinder limbs (thick lines with joint bolts), a square head, `eyes: visor`, voice `robot`. `scale 2.4` as Ghoom. NEW `windup_key`: a big wind-up key on the back (behind the torso, turns slowly while "controlled"; `set_appearance remove` when freed). Ghoomu = same plan, friendlier colour (`#a8c5da`) and happy faces | "A friendly-looking big cartoon robot made of boxes: rounded box torso, square head with a glowing visor, cylinder arms and legs with bolts at the joints, grey steel with rust-orange patches, a large wind-up key on its back. Flat colours, thick outline, 2D side view facing right." |
| C16 | **Grey Goons** preset | Data (+ optional renderer alpha) | 7-8, 15, 19, 22 | `stickman`, `#8a8a99`, `stub_horns` `#5a5a66`, dot eyes, a little see-through (NEW cast option `alpha: 0.8`, optional); they `vanish` into grey puffs | Preset only |
| C17 | **Shadow look** for Shadow Doopi | Renderer | 16-18 | NEW cast/appearance option `look: "shadow"`: draws the character in a flat dark indigo (`#2b1d5c`) with a soft purple outer glow and glowing purple eyes, ignoring the cast colours; uses Doopi's own appearance (spiky hair, headband) | "A shadow copy of a stick figure: flat deep indigo silhouette with a faint purple glow around the edges and two glowing purple eyes." |

---

## E. Engine effects on characters and scenes

| Id | Item | Kind | Eps | Spec |
|---|---|---|---|---|
| E1 | **Heart Glow** (a lasting aura) | Engine + data | 2-24 | A character state `glow: { color, level 0-1 }` set by `set_appearance` (or a new world command `set_glow`), drawn as a soft halo behind the body that pulses with the music beat and brightens with `level`; `level: 0` turns it off (ep 13). Today's `aura` FX lasts 1.6 s only. The Friendship Blast uses `color: "rainbow"` (cycling hue). |
| E2 | **Colour freeze** (friends "turned grey") | Engine (a defeat-like style) | 2-5, 19-21, 24 | NEW defeat style `petrify` (allowed for kids): the character holds its current pose, its colours fade to stone grey over 1.5 s, eyes close, no blinking or breathing, a little `sparkle` when it finishes. It counts as defeated (cannot act) and carries over between scenes. Undone by the existing `return` move (colour floods back from the feet up, `confetti` or F3). Validator: `W_KIDS_NO_HOPE` must accept a `return` in a later episode (series mode, see E5). |
| E3 | **Per-scene colour grade** | Engine | 2-24 | A scene field `grade: { saturation: 0-1 }` (and `set_grade` world command with `dur`) so "how grey Tokyo is" is set per episode and per scene, persisting for the whole scene. `saturation` is applied to the background and set pieces; an optional `keepCast: true` keeps the heroes in colour while the world is grey (a strong look for eps 20-23). Workaround today: one `desaturate` world beat at `at: 0` per scene. |
| E4 | **Dream look** | Data (FX) + E3 | 14 | A warm golden vignette with slow `sparkle_rise` particles and a soft blur at the edges, for dream and vision scenes (Nani's dream visit, the crystal visions in eps 4, 15). Could be a `grade` preset `dream`. |
| E5 | **Series mode for the validator** (optional) | Engine/tools | all | `meta.series: { id: "doopi", episode: N }`: lets an episode end with a loved character still frozen or taken (`W_KIDS_NO_HOPE` becomes info when a later episode in `series/doopi/` brings them back) and checks the shared cast file. Without it the cliffhanger episodes get `W_KIDS_NO_HOPE` warnings, which is acceptable if you prefer. |

---

## G. Scale

| Id | Item | Kind | Eps | Spec |
|---|---|---|---|---|
| G1 | **Giants in fights and interactions** | Engine (checks) | 4 (Thunda 1.5), 12-15 (Ghoom 2.4), 20-24 (Giant Peepa 3) | `scale` already goes to 4. Check and fix: `@fight` reach and aim between scale 1 and scale 2.4-3 (punches at a giant's shin or knee, a giant's stomp on a small hero), `lift_up` of a normal character by a giant (Ghoom carries Doomi in his hand: a `hold` attach at the hand), `climb_up` onto a giant's back (Becky and Mooka in ep 15), and the camera framing a giant and a small hero (zoom out, frame the giant to the waist). Add a fight harness case per scale. |

---

## T. Themes (places)

Themes are data (sky, layers, ground) except where a NEW layer kind is needed (renderer code). Draft with `node tools/draft.mjs theme "<prompt>" --manual`. Every backdrop stays mid-tone behind characters (`W_CONTRAST`).

| Id | Theme id | Eps | New layer kinds | Creation prompt |
|---|---|---|---|---|
| T1 | `tokyo_village` | 1-6, 12, 15, 21, 24 | `huts` (round mud huts with bright painted doors and thatched roofs), `bunting` (strings of little flags) | "A cheerful Indian hill village square by day: green hills behind, round mud huts with thatched roofs and bright painted doors (red, blue, yellow), strings of colourful little festival flags between them, a dusty light-brown ground, a big tree in the far middle. Warm and sunny, kid-friendly." |
| T2 | `banyan_hill` | 1, 2, 12, 14, 22-24 | `banyan` (a giant banyan tree with hanging aerial roots and seven glowing crystal sockets among its roots; sockets light per colour via a theme param or set pieces) | "A grassy hill top with one giant old banyan tree, very wide canopy, many hanging aerial roots, seven small glowing gem sockets among the big roots, a valley of tiny huts far below, open sky. Magical but gentle." |
| T3 | `training_ground` (optional) | 3 | `water_pots` | "A dusty village training ground at sunrise: a low mud wall, wooden practice posts, clay water pots, a mango tree. Reuse dojo_dusk if close enough." |
| T4 | `whispering_forest` | 6, 13 | `vines` (hanging vines) | "A deep friendly forest path: tall trees with big round leaves, hanging vines, ferns, mushrooms, dappled light, a winding dirt path. Slightly mysterious at night, never scary." (Reuse `trees`, `bushes`.) |
| T5 | `mirchi_hill` | 7 | `fort_wall` (crenellated orange-red fort wall with a gate) | "A small hilltop fort made of red-orange stone with rounded crenellations and a big wooden gate, rows of red chillies drying on strings, a hot orange evening sky." |
| T6 | `spice_kitchen` | 7, 8 | `shelves` (jars and sacks) | "A big cartoon fort kitchen: brick walls, shelves of colourful spice jars and sacks, strings of red chillies, a huge cooking pot over a fire in the middle, steam. Warm orange light." (Cellar variant: darker, walls with grooves to slide.) |
| T7 | `lotus_lake` | 8-12 | `water` (lake surface with lotus leaves and gentle waves; works with R1-swim), `huts_stilts` (fishing huts on stilts) | "A wide calm lake with pink lotus flowers and round lotus leaves, a wooden jetty, fishing huts on stilts at the shore, hills far behind, a sandy shore floor. Blue and peaceful." |
| T8 | `pirate_deck` | 9, 10 | `ship_rail` (deck planks, rail, mast, sails, rigging; the whole stage rocks gently: NEW theme param `sway`) | "The deck of a cartoon pirate ship at sea: wooden planks, a rail, a tall mast with patched sails and rope ladders, barrels, a steering wheel at the back, a flag with a fish (no skull). Daylight over a blue lake." |
| T9 | `crystal_cave` | 11, 14, 16 (icy variant) | reuse `cave`, `crystals` | "A big cave inside an island with glowing blue crystals in the walls, a little pool, treasure piles, soft blue light." Variants: plain mountain cave (ep 14), ice cave (ep 16). |
| T10 | `underwater` | 11 | `seaweed`, `bubbles_bg` (rising bubbles) | "Underwater in a clear lake: blue-green water, light rays from above, swaying seaweed, round stones on the sandy bottom, small fish, rising bubbles. Calm, not dark." |
| T11 | `iron_canyon` | 13 | `gears_bg` (big rusty gears half buried in rock) | "A rocky canyon at dusk with half-buried giant rusty gears and pipes in the cliffs, fog on the floor, huge metal footprints in the dust." |
| T12 | `iron_workshop` | 14 | `machines` (pistons, chains, pipes) | "Peepa's iron workshop: grey metal walls, big pistons and chains, pipes with puffs of steam, a hanging cage, purple warning lights. Industrial but cartoonish." |
| T13 | `gloom_throne_room` | 2, 5, 19, 20 | reuse `lair`/`cave`; `throne` (a tall horned throne) | "A villain's throne room in purple and grey: tall stone pillars, a big throne with curly horns on its back, purple glowing windows, a crystal ball on a stand, grey mist on the floor." (Close to `villain_lair`: start from it.) |
| T14 | `shadow_valley` | 16, 17 | `dead_trees` (bare twisted trees, friendly shapes), purple fog | "A misty purple valley at night: bare twisted trees with curly branches, glowing purple fog close to the ground, a huge stone gate shaped like two horns in the distance." |
| T15 | `mirror_maze` | 17, 18 | `mirrors` (tall framed mirrors in rows that reflect a blurred copy of characters: NEW renderer reflection, or plain silvery panels if reflections are too costly) | "A maze made of tall silver mirrors with purple frames, each mirror showing a faint wobbly reflection, a starry dark ceiling, a shiny floor." |
| T16 | `gloom_castle_gate` | 18, 19, 21 (ruins) | `castle` (dark castle with horned towers) | "A gloomy cartoon castle on a cliff: dark purple-grey stone, two towers topped with curly horns, a huge round door, a moat bridge, a giant full grey moon behind. Spooky-fun, not horror." Ruins variant for ep 21. |
| T17 | `grey_moon` | 23, 24 | `moon_surface` (craters, the Earth-like valley seen far below, stars) | "Standing on the surface of a giant grey moon: round craters, grey dust, a black starry sky, and far below a tiny valley with a giant tree glowing faintly. Epic and quiet." |

---

## O. Objects and props

`behavior` is the engine's (`static`, `seat`, `holdable`, `ball`, `floater`, `vehicle`, `breakable`). Simple ones: `node tools/draft.mjs object "<prompt>" --manual`. Detailed ones (bus, ship, boat): SVG.

| Id | Object id | Behavior | Kind | Eps | Spec / creation prompt |
|---|---|---|---|---|---|
| O1 | `rainbow_crystal` (7 colours via `state`: red, orange, yellow, green, blue, indigo, violet; plus `dim`) | holdable + glow | Data (+ glow) | 1-24 | "A glowing six-sided gem crystal, 28 px tall, flat facets in two shades of one colour with a white highlight and a soft glow halo; states for the seven rainbow colours and a dull grey `dim` state." |
| O2 | `gloom_horn` | holdable, `use` = blows grey mist (F2) | Data + use FX | 2, 5, 19-24 | "A curled horn trumpet held in one hand, dark purple with gold rings, a wide mouth, faint grey mist at the end." `use`: emits F2 and plays S2. |
| O3 | `jalebi` (also `jalebi_plate`) | holdable | Data | 1, 3, 5, 8, 24 | "An orange spiral jalebi sweet, glossy, 18 px; and a small round plate with a stack of jalebis." Works with `eat`. |
| O4 | `kite` | floater on a string | Data | 1 | "A diamond-shaped paper kite with a tail of bows, bright colours." |
| O5 | `rainbow_bracelet` | accessory (wrist) | Renderer | 3-24 | NEW accessory on the left wrist: a band with seven small gem slots; NEW appearance param `slots` (0-7 lit, in rainbow order) changed with `set_appearance`. Visible in close-ups. |
| O6 | `apple` | ball (small) / holdable | Data | 3 | "A shiny red apple with a leaf." |
| O7 | `haystack`, `cart` | static / vehicle (pushed) | Data | 4 | "A round haystack." / "A wooden two-wheeled hand cart with vegetables." |
| O8 | `market_stall` | static | Data/SVG | 1, 5, 12 | "A village market stall: wooden table, a striped cloth awning, baskets of sweets and fruit, a small sign with a picture (no text)." |
| O9 | `basket` | breakable / holdable | Data | 5 | "A round woven basket with a lid." |
| O10 | `bus` | vehicle | SVG | 6, 12 | "A friendly cartoon village bus, side view facing right: rounded body, cream and teal with a red stripe, luggage on the roof rack, big round headlights, four windows, two black wheels. Flat colours, thick outline." `seat` for riders; `w` about 520. |
| O11 | `campfire` | static (flicker) | Data | 6, 16 | "A small campfire: crossed logs, orange-yellow flames that flicker (two states), a ring of stones." |
| O12 | `giant_pot` | static (steam) | Data | 7, 8 | "A huge round cooking pot on a fire with steam, big enough to stir with a long ladle." |
| O13 | `ladle` | holdable (staff moves) | Data | 7, 8 | "A long wooden ladle, staff length, held like a staff; the Orange crystal can sit in its cup." |
| O14 | `lever`, `trapdoor` | static with states | Data | 7, 8 | Lever `up`/`down`; trapdoor `closed`/`open` (a character on an open trapdoor plays `jump_down` out of the scene). |
| O15 | `rope_bridge` | breakable | Data/SVG | 8 | "A wooden rope bridge across a gap, planks and rope rails; breaks into falling planks." |
| O16 | `pirate_ship` | vehicle (on water) | SVG + R1-swim | 9-11 | "A small cartoon pirate ship, side view facing right: round wooden hull, one mast with a patched sail and a flag with a fish, portholes, a steering wheel at the back. Flat browns and cream, thick outline." `w` about 1,000; floats on the T7 water line. |
| O17 | `rowboat` | vehicle (on water) | SVG | 9-12, 15 | "A small wooden rowboat with two oars, seats for four, side view facing right." |
| O18 | `raft` | vehicle, `sink` state | Data | 9 | "A wobbly raft of tied logs." |
| O19 | `fishing_net` | holdable / used by `captured` (net instead of rope: `captured` param `wrap: "net"`) | Data + small engine | 9, 11 | "A fishing net with floats." |
| O20 | `treasure_chest` | static with states | Data | 11 | "A wooden treasure chest with gold trim; open state shows shiny coins (no skulls)." |
| O21 | `lantern_string` | static (glow at night) | Data | 12, 24 | "A string of round paper lanterns in many colours, glowing at night." |
| O22 | `dhol` | holdable (use: drum beat) | Data | 12, 24 | "A barrel-shaped Indian drum (dhol) on a strap, red and gold." |
| O23 | `ribbon` | spawned trail marker | Data | 13, 14 | "A pink ribbon bow lying on the ground." |
| O24 | `windup_key` | holdable (pulled off Ghoom's back) | Data | 14, 15 | "A big cartoon wind-up key, brass." (Paired with C15 accessory.) |
| O25 | `pot_and_pan` | holdable (staff/bat moves, cartoon) | Data | 15, 22 | "A kitchen pan and a metal pot, used as funny shields." |
| O26 | `snowball`, `rock_round` | ball | Data | 16 | "A big rolling snowball." / "A round grey rock." |
| O27 | `mirror` | breakable (shards sparkle, no sharp pieces shown) | Data/SVG | 17, 18 | "A tall standing mirror with a purple curly frame, silver glass with a light shine streak." |
| O28 | `hanging_cage` | static with states (`closed`/`open`), hangs from a chain | Data | 14, 19, 21 | "A round bird-cage style cage hanging from a chain, big enough for a person, dark iron with a little lock." (Reuse `cage` where it can stand on the floor.) |
| O29 | `grey_moon` | theme layer | Renderer (layer kind `moon`) | 18-24 | A huge full moon disc in the sky layer with craters, colour set by the theme (grey; rainbow-lit in ep 24). |

---

## F. Effects

FX presets are data in `catalog/effects/fx.json` (particles, glow, sustain); a few need a new shape.

| Id | FX id | Eps | Spec |
|---|---|---|---|
| F1 | `colour_powder` | 1, 12, 24 | A festival colour-powder burst: 3-4 puffs in pink, yellow, green and blue that expand and drift down. |
| F2 | `gloom_mist` | 2, 5, 19-24 | Rolling grey-purple mist from the Gloom Horn: slow wide puffs along the floor, sustained 3 s, low alpha. |
| F3 | `colour_return` | 4, 5, 8, 11, 15, 18, 21, 24 | A wave of colour that spreads from a point across the screen (ties into E3: saturation eases back up over 2 s) with `sparkle_rise` in the crystal's colour. |
| F4 | `chilli_smoke` | 6-8 | A red-orange puffy cloud with little chilli shapes; characters in it play `sneeze` (NEW emote: head back, then a sharp nod; `face: "hurt"` with funny `tears`). |
| F5 | `whirlpool` | 10 | A spinning spiral of water on the lake surface (shape `spiral`, sustained). |
| F6 | `splash` | 9-11 | A water splash with droplets. |
| F7 | `visor_beam` | 12, 13, 15 | A thick straight cyan beam from Ghoom's visor (like `energy_blast`, a beam shape instead of a ball). |
| F8 | `avalanche` | 16 | Snow puffs and rolling snowballs from one side, sustained, with a big shake. |
| F9 | `mirror_ripple` | 17, 18 | A ripple on a mirror surface when someone goes through it. |
| F10 | `crystal_pull` | 20 | Six coloured light streams flying from the bracelet to the horn. |
| F11 | `grow_giant` | 20 | A purple flash and swirling sparkles while a character's `scale` tweens up (NEW: `set_appearance scale` with `dur`, engine). |
| F12 | `giant_blast` | 22 | A huge purple-grey `energy_blast` with a shockwave. |
| F13 | `rainbow_shield` | 23 | A dome of rainbow light in front of the line of friends that bounces the blast. |
| F14 | `beam_clash` | 23 | Two energy beams meeting in the middle with sparks; the meeting point moves (NEW world command or paired move `beam_struggle`, engine). |
| F15 | `rainbow_bridge` | 24 | A rainbow arc rising from the friends below up to the moon (a long-lasting arc shape). |

---

## S. Sounds and music

| Id | SFX key | Eps | Recipe idea |
|---|---|---|---|
| S1 | `bark`, `bark_small`, `whimper`, `growl_soft`, `pant` | all | Short pitched noise bursts with a formant for "woof"; a high falling tone for the whimper. |
| S2 | `gloom_horn` | 2, 5, 19-24 | A low wobbly horn blast with a minor fall and a mist hiss. |
| S3 | `pirate_horn` | 8-10 | A bright two-note ship horn. |
| S4 | `splash`, `waves` (also an ambience bed `lake_waves`) | 9-12 | Noise burst with a low thump; slow wave noise bed. |
| S5 | `robot_stomp`, `robot_beep`, `windup_click` | 11-24 | A deep thud with metal ring; two-tone beeps; a ratchet click loop. |
| S6 | `sneeze` | 5-8 | "Ah-ah-CHOO": rising tone then a noise burst (comic). |
| S7 | `crystal_chime` | 1-24 | A bright bell arpeggio when a crystal returns. |
| M1 | music mood `festive` (optional) | 1, 12, 24 | An upbeat folk-style pentatonic mood with a dhol-like drum pattern; `happy` works until then. |

---

## What works today (no new assets)

Useful for testing scenes before the assets land:
- Humanoid cast: every character except Becky can be approximated now (Doopi, Dony, Doomi, Mooka as a green `buddy`, Nani, the Mayor, Peepa as a `slim` with a `crown` standing in for horns, Tony & Kony as `kid`s, Thunda as `bulky` with `scale 1.5`).
- Places: `city_park` (village), `home_interior` (Doopi's hut), `dojo_dusk` (training), `villain_lair` (throne room), `snow_mountain` (Grey Peak), `alley_night` (night market).
- Fights, chases, activities, dialogue, cards, narration, music moods, `desaturate`, `captured`, `faint`, `flee`, `vanish`, `return`, `aura`, `rope`, `cage`.

So a **placeholder cut of episode 1** (without Becky, with stand-in looks) could be written and rendered now to check pacing, if you want that before the assets exist.
