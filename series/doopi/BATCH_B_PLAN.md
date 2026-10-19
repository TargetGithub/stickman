# Doopi & Friends: batch B plan (assets for episodes 6-11)

Built in slices, one episode's assets at a time, each followed by its script (Sridhar, 2026-10-18: "continue with all your future pending items; do not wait for my approval"). Asset ids refer to [ASSETS.md](ASSETS.md).

| Slice | For | Assets | Status |
|---|---|---|---|
| B1 | ep 6 | C11 Tara preset, O10 `bus` (vehicle), O11 `campfire` (static, flickering, `lit`/`out`), T4 `whispering_forest` (layer kinds `vines`, `ferns`), F4 `chilli_smoke` | done 2026-10-18 (ep06 written) |
| B2 | ep 7-8 | C12 Madam Mirchi + `chilli_hat`, T5 `mirchi_hill` (`fort_wall`), T6 `spice_kitchen` (`shelves`), O12 `giant_pot`, O13 `ladle`, O14 `lever`/`trapdoor`, O15 `rope_bridge`, S3 `pirate_horn`, T7 `lotus_lake` | done 2026-10-18: also `spice_cellar`, a Grey Goon preset, and the C13/C14 hats (`pirate_hat`, `beard`) with Kanta and Mallu presets early |
| B3 | ep 9-11 | C13 Captain Kanta + `pirate_hat`, C14 Mallu Uncle + `beard`, T8 `pirate_deck` (`sway`), T9 `crystal_cave`, T10 `underwater`, O16-O20, F5 `whirlpool`, F6 `splash`, S4, R1 `swim` | done 2026-10-18: themes `pirate_deck` (`ship_rail`), `crystal_cave`, `underwater` (`seaweed`, `bubbles_bg`); objects `pirate_ship`, `rowboat`, `raft`, `fishing_net` (`captured` with `net: 1`), `treasure_chest`; FX `whirlpool`, `splash`; sfx `splash`; moves `swim` (takes `to`), `sink`, `swim_dog`. Not done: the deck `sway` theme param, a `lake_waves` ambience bed |

Notes:
- Set pieces with `"animated": true` get the frame's fx time as `piece.t` (the campfire's flames).
- The AI context pack cap went from 80 KB to 100 KB for the series assets (CATALOG_SPEC); per-file budgets were raised to match.
- Batch B also added the `sfx` world command (a sound on its own) and `petrify` `params.dur`.
- The context pack's core tier cap went from 50 KB to 60 KB.

## Batch C (episodes 12-18)

| Slice | For | Assets | Status |
|---|---|---|---|
| C1 | ep 12-15 | C15 `robot` body plan (`draw: "box"`: box torso, square head, joint bolts) + `windup_key` accessory, Iron Ghoom preset; T11 `iron_canyon` (`gears_bg`), T12 `iron_workshop` (`machines`); O21 `lantern_string` (animated), O22 `dhol`, O23 `ribbon`, O24 `windup_key`, O25 `pot_and_pan`; F7 `visor_beam`; S5 `robot_stomp`, `robot_beep`, `windup_click` | done 2026-10-18 |
| C2 | ep 16-18 | C17 shadow look (authoring only: Doopi's look in `#1a0f3a` with a purple `set_glow`), T14 `shadow_valley` (`dead_trees`), T15 `mirror_maze` (`mirrors`), T16 `gloom_castle_gate` (`castle`), O26 `snowball`/`rock_round`, O27 `mirror` (breakable), F8 `avalanche`, F9 `mirror_ripple`; also `grey_peak`, `mountain_cave` | done 2026-10-18 |

## Batch D (episodes 19-24)

| Slice | For | Assets | Status |
|---|---|---|---|
| D1 | ep 19-24 | O29 layer kind `moon` + theme `banyan_moon`; T17 `grey_moon` (`moon_surface`); O28 `hanging_cage`; F15 `rainbow_bridge` and F13 `rainbow_shield` as animated objects; FX F10 `crystal_pull`, F11 `grow_giant`, F12 `giant_blast`, F14 `beam_clash` | done 2026-10-18 |

Authoring choices instead of engine work: Giant Peepa is a second cast entry (`body: slim`, `scale: 3`) that spawns with `grow_giant` while Peepa despawns (no `set_appearance scale` tween); the beam clash is two `energy_blast` beats facing each other plus `beam_clash`.

## Episode scripts

All 24 scripts are in `scripts/series/doopi/ep01.json` ... `ep24.json` (2026-10-18). Each validates with no errors and runs 5-6.5 minutes (about 2 h 5 min in all). The only warnings left are `W_KIDS_NO_HOPE` on the cliffhanger episodes, where a friend stays stone until a later episode (Mooka eps 2-4, Nani eps 5-21, Mooka and Becky eps 19-20); series mode (E5) would turn these into info.

Story adaptations made while writing (EPISODES.md has the outlines):
- Mooka stays a statue from ep 2 to ep 5 (petrify freezes), and the Yellow crystal thaws him through Kony's kindness.
- Nani's dream visits (ep 11, ep 14) are glowing visions, and a stone friend is placed with `petrify` `params.dur: 0` when an episode starts.
- Fights with the scale-3 Giant Peepa are split into short `@fight` runs (5 exchanges): longer runs drift out of reach (the G1 giant checks were not built).
- Ghoomu does not join `@brawl` (a scale-2.4 fighter stalls it); he stomps on his own beside it.

Render: `node tools/record.mjs scripts/series/doopi/epNN.json --out-dir out/series/doopi --slug epNN` (about 10-20 minutes per episode; each final.mp4 is about 170 MB, so watch the free disk space).
