# The Baaaanas: plan

Status: **draft for Sridhar's review** (2026-10-23).

A new channel for everyone (kids, parents, adults, grandparents): a happy little species called the **Baaaanas**, grown from Mooka of Doopi & Friends. Pure fun, innocent activities, no villains needed. Four leads carry each story; a crowd of extra Baaaanas does the group gags.

## 1. What makes it work for all ages

- **Almost no words.** Baaaanas babble ("Baaaana!", "Ooh!", "Pa-pa-poo!") plus a handful of real words borrowed from many languages ("namaste", "gracias", "bonjour", "arigato"). Jokes land without translation, so the whole world can watch.
- **Two layers of humour.** Kids get the slapstick (slips, bonks, wobbly towers, food chaos). Adults get the situations: queueing at a bank, a yoga class, a wedding photo, a job interview, assembling flat-pack furniture, a cooking show, a group selfie that never works.
- **The crowd is a character.** One Baaaana does something; fifty copy it, badly, at once. That escalation is the signature gag.
- **Music and dance.** Every video ends with a short song or dance number (reuses the music generator and `dance_together`).
- **Gentle always.** No blood, no harm, no "die/kill"; every fall ends in a giggle. Same rules as the Doopi bible.

## 2. Keep it original (important)

Minions are yellow capsules with goggles, blue overalls, and banana jokes. Being too close to that look is the risk, not the word "minion". So:

- Baaaanas stay **mint and green family**, round jelly beans, with a **leaf sprout** on top, a **lavender belly**, and **orange mittens** (Mooka's look). Never yellow, never goggles, never overalls or dungarees, never one big central eye.
- No "serving an evil master" premise. Baaaanas are gardeners and helpers who live in a meadow village and love sunshine, music and snacks.
- Food obsession is **berries / jalebis / dumplings**, not bananas. The name "Baaaana" is a sound they make, never shown as a fruit.
- Before going public, run the name and character sheet past a quick trademark search (this plan is not legal advice).

## 3. The four leads

All four are the `buddy` body plan; they differ in silhouette so you can tell them apart at a glance, even tiny on screen.

| Id | Name | Silhouette | Sprout | Personality | Voice |
|---|---|---|---|---|---|
| `bn_mooka` (copy of `mooka`) | **Mooka** | small and round (scale 0.85) | single leaf | the innocent giggler; copies everyone, falls asleep at the worst time, says the wise thing by accident | pitch 1.9, squeaky |
| `bobo` | **Bobo** | tall and thin (scale 1.05, narrow torso) | twin leaves | the planner: clipboard, whistle, big ideas that go wrong; acts like a worried parent | pitch 1.5, soft |
| `tutu` | **Tutu** | wide and chubby (scale 0.95, wide torso) | flower bud | the foodie and dancer; strongest, gentlest, cries happy tears | pitch 1.3, soft |
| `zizi` | **Zizi** | tiny and quick (scale 0.7) | curly vine | the mischief maker and inventor; tiny backpack of gadgets | pitch 2.0, squeaky |

Each lead keeps the shared look and adds one colour tweak inside the green family (mint, teal-mint, lime-mint, sea-green) so they read as one species.

**Extras:** `baaaana_crowd` preset with seeded variation (shade, height 0.65-1.0, sprout kind, belly shade) through `deriveRng`, so a crowd of 30 never looks copy-pasted and stays the same every render.

## 4. Making Mooka fun-looking (enhancements)

Reuse first: Doopi's `buddy` body, faces, visemes, `sprout` and `mittens` accessories, themes, objects, music and SFX.

New work:
1. **Squash and stretch** on the buddy body (land, jump, bump, giggle wobble). Renderer + small engine param.
2. **Livelier eyes:** bigger whites, pupils that dart and look at the camera, double blink. Faces catalog + renderer.
3. **Sprout physics:** the leaf bounces and droops with mood (like Becky's ears). Renderer, procedural.
4. **Belly jiggle** on laugh and walk. Renderer.
5. **New sprout kinds:** `twin_leaf`, `flower_bud`, `curly_vine`; accessories `clipboard`, `whistle`, `backpack_mini`, `party_hat`. Renderer + catalog.
6. **Big-grin and buck-tooth mouth styles** (cute, toothy grin). Faces.
7. **Babble voice:** gibberish TTS lines with timbre `squeaky`, plus giggle, "ooh", gasp and raspberry SFX. Audio.

## 5. Group activities (the crowd machinery)

Scripts allow 2-12 named characters, so big group gags need extras that can do more than `walk_by` / `cheer`:

- **Extras behaviours:** `copy_leader` (do the same move with a small seeded delay, some get it wrong), `sync_dance`, `conga`, `wave` (stadium wave), `pile_on`, `scatter_giggle`.
- **Group activities** (catalog `activities.json`): `human_pyramid` (Baaaana tower that wobbles and falls), `tug_of_war`, `conga_line`, `band_play` (drums, trumpet, triangle), `group_photo`, `pillow_fight`, `bubble_party`, `picnic`, `sports_day_race`, `garden_planting`.
- **Props:** drum, trumpet, triangle, pillow, picnic blanket, cake, balloon bunch, watering can, camera on tripod, flat-pack box, yoga mat.
- **Place:** `baaaana_meadow` (village of round mushroom-huts), plus reuse of Doopi's city, park, beach and snow themes.

## 6. Task list (one at a time)

Each task is one session that ends with green tests and a commit, so we can stop cleanly at any task boundary. Size: S = small, M = medium, L = large. ★ = stop for Sridhar's visual review.

| # | Task | Kind | Size | Done when |
|---|---|---|---|---|
| 1 | Write `series/baaaana/BIBLE.md`: world, the four leads, rules, tone, humour guide, originality rules | Docs | S | bible reviewed |
| 2 | Sprout kinds + new accessories (`leaf_sprout`, `curly_vine`, `flower_bud` / `flower_bloom`, `party_hat`, `whistle`, `clipboard`; Bobo keeps the two-leaf `sprout`, Zizi reuses `backpack`) **done 2026-10-24** | Renderer + catalog | M | sheet `out/demos/baaaana_t2_accessories.png` (`node tools/baaaana_acc_sheet.mjs`) |
| 3 | Four lead presets (`bn_mooka`, `bobo`, `tutu`, `zizi`, all `"series": "baaaana"`) on new chunky body plans `baaaana`, `baaaana_tall`, `baaaana_wide` (thick outlined limbs, `shoes`, `gloss`), at least Becky's drawing level ★ **done 2026-10-24** | Catalog + renderer | M | `out/demos/baaaana_t3_cast.png` (`node tools/baaaana_cast_sheet.mjs`) |
| 4 | Livelier eyes (`lively`: darting pupils, camera glances, double blink), `big_grin` / `toothy` mouths, belly jiggle (plan `jiggle`) ★ **done 2026-10-24** | Faces + renderer | M | `out/demos/baaaana_t4_faces.png` (`node tools/baaaana_face_sheet.mjs`) |
| 5 | Squash and stretch (jelly wobble on landing and bumps, step squash, air stretch, laugh shake) + sprout physics (trails motion, droops or perks with mood) on squishy plans ★ **done 2026-10-24** | Engine + renderer | L | `out/demos/baaaana_t5_motion.png` (`node tools/baaaana_motion_sheet.mjs`), clip `scripts/series/baaaana/t5_motion.json` |
| 6 | `baaaana_crowd` crowd kind (`catalog/characters/crowds.json`) with seeded variation; extras take `"crowd": "baaaana_crowd"` and are drawn with faces; crowd sheet of 30 ★ **done 2026-10-24** | Catalog + engine | M | `out/demos/baaaana_t6_crowd.png` (`node tools/baaaana_crowd_sheet.mjs`), clip `scripts/series/baaaana/t6_crowd.json` |
| 7 | Extras behaviours: `copy_leader`, `sync_dance`, `conga`, `wave`, `pile_on`, `scatter_giggle` (with `leader`, `at`, `bpm`; up to 40 extras per scene; code `E_EXTRAS_LEADER`) **done 2026-10-24** | Engine + validator | L | unit tests + demo `out/demos/baaaana_t7_crowd/final.mp4` (`scripts/series/baaaana/t7_crowd_moves.json`) |
| 8a | Group activities on the loop runner: `band_play`, `group_photo`, `bubble_party`, `picnic`, `garden_planting`, `conga_line`, with 10 new moves (crowds join in with task 7 behaviours) **done 2026-10-24** | Catalog | M | demo `out/demos/baaaana_t8_activities/final.mp4` (`scripts/series/baaaana/t8_activities.json`) |
| 8b | The rest: `tug_of_war` and `sports_day_race` (new runners), `pillow_fight` (after task 9's pillow prop), `human_pyramid` (after task 10b's heights) | Engine + catalog | L | demo clip each |
| 9 | Props (`trumpet`, `triangle`, `pillow`, `watering_can`; set pieces `picnic_blanket`, `cake`, `camera_tripod`, `yoga_mat`, `mushroom_hut`; dhol, phone, balloon and box reused) and the `baaaana_meadow` theme (mushroom-house village, flowers in the grass) **done 2026-10-24** | SVG + catalog | M | `out/demos/baaaana_t9_meadow/` (`scripts/series/baaaana/t9_meadow.json`) |
| 10 | Babble voice + giggle / ooh / gasp / raspberry SFX + a bouncy music mood | Audio | M | listen test |
| 10a | **3D: walking toward and away from the camera.** A ground with perspective (a road or path narrowing to a vanishing point, markings that slide toward the camera), a camera that travels in depth with a walker (the walker keeps its size, the world streams past), and set pieces placed in depth that grow and slide out of frame as they pass. Walking away is the same in reverse **done 2026-10-24**: lens `travel`, scene `road` and `roadside` (ENGINE_V3_SPEC 5.10) | Engine + renderer | L | review clip `out/demos/baaaana_t10a_road/final.mp4` (`scripts/series/baaaana/t10a_road.json`) ★ |
| 10b | **3D: heights and climbing.** Set pieces with a top a character can stand on (ladder, stairs, tree, wall, rooftop); characters standing at a height; climbing up and down moves that really change height; jumping down **done 2026-10-24**: platforms (`garden_wall`, `lookout_tower`), `climb_up` / `climb_down` / `jump_down` (ENGINE_V3_SPEC 5.11) | Engine | L | unit tests + demo `out/demos/baaaana_t10b_climb/final.mp4` (`scripts/series/baaaana/t10b_climb.json`) |
| 10c | **3D: vertical camera and parallax.** The camera follows a climber up and down; background layers move down as it rises, sky and far hills less than near things (and the reverse coming down) **done 2026-10-24**: camera lift and vertical parallax (ENGINE_V3_SPEC 5.12) | Engine + renderer | M | review clip `out/demos/baaaana_t10c_lift/final.mp4` (`scripts/series/baaaana/t10c_lift.json`) ★ |
| 11 | Idea bank: 12 standalone video ideas, about 20 min each = cold open + 4 segments of about 4.5 min + closing song (`series/baaaana/IDEAS.md`) | Docs | M | list reviewed |
| 12 | First video script (cold open + 4 segment scripts + song), review render 720p 30 fps ★ | Script | L (split per segment) | approved |
| 13 | First video final at 4K 60 fps, Short, thumbnail, channel art | Render | M | uploaded files ready |
| 14 | Each further video on its own, picked from the idea bank (segment scripts, review render, final) | Script | L each | per video review |

Engine work (tasks 7, 8 and 10a-10c) happens on the `baaaana-engine` branch. Order rationale: the look comes first (tasks 2-6) because everything else is judged by eye; crowd behaviour (7-8) and movement in all three directions (10a-10c, Sridhar 2026-10-24: walking toward and away from the camera and climbing must move the world, not only side-scrolling) are the engine gaps; stories come after the assets exist so scripts don't ask for things we can't draw.

## 7. Decisions (Sridhar, 2026-10-23)

1. **No crossover** with Doopi & Friends. Baaaana is a **separate channel**.
2. Channel title: **"Baaaana"**.
3. Mooka's Doopi babble ("Bana-na-na") stays as it is.
4. Every video is **about 20 minutes** (structure in BIBLE.md section 7). Not a series: every video is unique and independent, with no running story, numbering or seasons. Only the cast and world carry over.

Because the channels are separate, Doopi's `mooka` preset is never changed. The Baaaana leads are new presets (`bn_mooka` starts as a copy), so already-rendered Doopi episodes keep their look. The new renderer features (sprout physics, livelier eyes, squash and stretch) are opt-in per character, so Doopi's cast doesn't change unless we choose to turn them on.
