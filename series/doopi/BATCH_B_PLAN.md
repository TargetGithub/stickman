# Doopi & Friends: batch B plan (assets for episodes 6-11)

Built in slices, one episode's assets at a time, each followed by its script (Sridhar, 2026-10-18: "continue with all your future pending items; do not wait for my approval"). Asset ids refer to [ASSETS.md](ASSETS.md).

| Slice | For | Assets | Status |
|---|---|---|---|
| B1 | ep 6 | C11 Tara preset, O10 `bus` (vehicle), O11 `campfire` (static, flickering, `lit`/`out`), T4 `whispering_forest` (layer kinds `vines`, `ferns`), F4 `chilli_smoke` | done 2026-10-18 |
| B2 | ep 7-8 | C12 Madam Mirchi + `chilli_hat`, T5 `mirchi_hill` (`fort_wall`), T6 `spice_kitchen` (`shelves`), O12 `giant_pot`, O13 `ladle`, O14 `lever`/`trapdoor`, O15 `rope_bridge`, S3 `pirate_horn`, T7 `lotus_lake` | next |
| B3 | ep 9-11 | C13 Captain Kanta + `pirate_hat`, C14 Mallu Uncle + `beard`, T8 `pirate_deck` (`sway`), T9 `crystal_cave`, T10 `underwater`, O16-O20, F5 `whirlpool`, F6 `splash`, S4, R1 `swim` | |

Notes:
- Set pieces with `"animated": true` get the frame's fx time as `piece.t` (the campfire's flames).
- The AI context pack cap went from 80 KB to 100 KB for the series assets (CATALOG_SPEC); per-file budgets were raised to match.
