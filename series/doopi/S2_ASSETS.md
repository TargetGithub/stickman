# Doopi & Friends season 2 ("The Whispering Horn"): assets and engine work

What the storyline (`docs/DOOPI_SEASON2_STORYLINE.md`) needs that season 1 did not have, and how each piece
is built. Nothing here is a stand-in: each row is a real catalog entry, preset or engine behaviour.

## Engine behaviours

| Id | What | Where | Episodes |
|---|---|---|---|
| E1 | `set_cloud`: a grey rain cloud over one character's head that grows, shrinks and pops into a glowing music note; the character's colours dim while it sits there | world command; `engine/renderer/cloud.js` | 2, 3, 5, 6, 8–11, 14, 16–18, 21, 22 |
| E2 | `wisp` body plan: a floating puff body with a curling tail, little puff hands and two glowing eyes (the Hush, the Hush Storm, the grey pretend-monsters) | `catalog/characters/bodies.json`, `engine/renderer/wisp.js` | all |
| E3 | Spoken echo: a `say` beat with `echo` (1–3) repeats the line fainter in the mix and shows it as fading words drifting away | validator, `tools/lib/tts/synth.mjs`, renderer overlay | 15, 19 |
| E4 | Whisper voice filter: `voice.tts.filter: "whisper"` for the Hush (breathy, phase-scrambled, soft reverb) | `tools/lib/tts/lines.mjs`, `piper.mjs` | all |

## Characters (presets in `catalog/characters/presets/`)

| Id | Body | Look | Voice |
|---|---|---|---|
| `hush` | wisp, scale 0.55 | light violet `#c4a3ff` puff with a pale aura, glowing eyes | kristin, pitch +2, slow, whisper filter |
| `hush_storm` | wisp, scale 3.2 | dark storm violet-grey, the same face, big | john, pitch -6, whisper filter |
| `gappu` | kid | big round glasses, mop of hair, striped shirt | john, pitch +6 |
| `bansuri_baba` | elder | long saffron scarf, white beard, turban, flute | john, pitch -3, slow |
| `zippy` | kid | cap, courier backpack, roller skates | kristin, pitch +5, fast |
| `ghadi_dada` | elder | glasses, moustache, coat, cane | john, pitch -5, slow |
| `tinku` | robot, scale 0.7 | small scrap robot, antenna, visor | john, robot filter, high |
| `bijli` | kid, scale 0.7 | tiny, two buns, bright yellow, scarf | cori, pitch +7 |
| `chintu`, `pinky` | kid | the season 1 village kids as presets | as season 1 |

## Props and objects (`catalog/world/objects.json`)

| Id | Kind | Notes |
|---|---|---|
| `bansuri` | holdable | golden bamboo flute (the Banyan Flute); `use` plays a tune |
| `leaf_whistle` | holdable | a folded green leaf |
| `glass_jar` | holdable | states `empty`, `hush` (a violet puff inside, eyes blinking), `open` |
| `tiffin` | holdable | a stacked steel tiffin carrier |
| `tiffin_stack` | static | a crate of tiffins for the courier race |
| `cloud_radar` | holdable | Tinku's radar: states `off`, `scan` (sweeping), `found` (blinking) |
| `desert_well` | static | stone well with a winch; states `broken` (snapped rope), `fixed` |
| `tower_clock` | static, animated | a huge clock face with gears; states `ticking`, `stopped` |
| `carrom_board` | static | a carrom board on a low stand |
| `stone_door` | static | the Echo Cave's carved door; states `closed`, `open` |
| `banyan_crack` | static | the crack in the Rainbow Banyan's trunk; states `cracked`, `healed` (golden seam) |
| `paper_boat` | static | the season 3 hook |
| accessory `skates` | appearance | roller skates on the feet (Zippy) |

## Places (`catalog/world/themes.json`)

| Id | What |
|---|---|
| `clock_tower` | inside the clock tower: brick walls, big turning gears, a round window |
| `khel_arena` | a sunny sports ground: stands with flags, a running track, a scoreboard |
| `frozen_river` | a snowy valley with a frozen river across the middle |
| (existing) | `city_street`, `rooftop_city`, `alley_night`, `desert_noon`, `snow_mountain`, `grey_peak`, `mountain_cave`, `crystal_cave`, `whispering_forest`, `tokyo_village`, `banyan_hill` |

## Effects and sounds

| Id | Kind | What |
|---|---|---|
| `fireflies` | fx | slow drifting yellow-green glows (ep6, finale) |
| `sandstorm` | fx | a band of blowing sand (ep12) |
| `hush_zip` | fx | the violet streak and puffs the Hush leaves as it zips away |
| `note_burst` | fx | gold sparkle around a popping cloud |
| `cloud_pop`, `whisper`, `flute_tune`, `leaf_tune`, `clock_tick_big`, `thunder` | sfx | new synth recipes |
