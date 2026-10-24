# Baaaana: Picnic Day

The first Baaaana video (series/baaaana/IDEAS.md idea 1), about 19 minutes, as seven standalone v3 scripts that
are rendered separately and joined with chapters:

| Part | Script | Length | What happens |
|---|---|---|---|
| Cold open | `0_cold_open.json` | 0:49 | Bobo's perfect line-up, Mooka sneezes, everyone scatters giggling |
| The Basket | `1_basket.json` | 4:21 | the plan, the checklist, Tutu eats the sandwiches, a bench taste test, Zizi's three gadgets (the basket vanishes, four baskets, balloons), a rain shower and a rainbow, a bubble party, band practice, Mooka packs only flowers, the village waves them off |
| The Road | `2_road.json` | 3:37 | walking toward the camera with the world streaming past, which way, a puddle, a conga line behind them, roadside friends, a nap, the forgotten basket, back again, a bus that will not stop, walking away up the road |
| Interlude | `3_interlude.json` | 0:19 | a stadium wave across the meadow |
| The Blanket | `4_blanket.json` | 4:06 | the picnic, a bee and a scatter, a pillow fight, catch and football, the group photo where Mooka sleeps, a kite, a race, a nap, a dance, the cake |
| The Hill | `5_hill.json` | 4:04 | Zizi up the lookout tower, tug of war, a human pyramid, hide and seek, Mooka asleep on the wall, a stadium wave, a conga round the tower, a sunset on the tower, planting flowers, the last photo, the group hug, the walk home |
| Song | `6_song.json` | 1:48 | the band and a conga line at sunset, the whole village dancing |

`build.py` writes all seven scripts (run from the repo root: `python3 scripts/series/baaaana/picnic_day/build.py`);
edit it rather than the JSON, so the timing helpers (chained beats, road walks cut into 3.5-second steps with
lines on them) stay consistent.

Review render (720p, 30 fps) of every part, then one video with chapters:

```bash
for p in 0_cold_open 1_basket 2_road 3_interlude 4_blanket 5_hill 6_song; do node tools/record.mjs scripts/series/baaaana/picnic_day/$p.json --out-dir "$PWD/out/series/baaaana/picnic_day" --slug $p --res 720p --fps 30; done
```

```bash
node tools/compilation.mjs out/series/baaaana/picnic_day/{0_cold_open,1_basket,2_road,3_interlude,4_blanket,5_hill,6_song} --out out/series/baaaana/picnic_day/review --title "Baaaana: Picnic Day"
```

The final is the same with `--res 4k --fps 60` (and `--out` a `final` folder).
