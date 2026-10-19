# Doopi & Friends: batch A build plan (Act 1 assets)

Status: **approved by Sridhar** (2026-10-18). Nothing is built yet: building starts once the catalog reorganization (C1-C3) is committed.

Decisions (2026-10-18):
- All the frozen-name additions in section 0 are approved, including the `bark` voice timbre.
- Becky's back sits at about the stickman's knee (a small pup).
- A2, A4 and A5 run in parallel sessions next to A1; A3 follows A1.

Progress: A1.1-A1.4 done and approved (reviews 1-2, 2026-10-18). A1.5-A1.8 done 2026-10-18, review 3 approved: mouth grip (`grip`, `mouthOf`), paired moves with people (`pet_dog`, `hug_dog`, `lick`, `carry`/`put_down` via `carried_dog`/`set_down_dog`, `bite_hold` + `hop_partner`), the partner rig check, the `fetch` activity (engine/story/fetch.js), the `bark` voice timbre, `@walk_together` side by side and `@chase` catching with `bite_hold`, a dog close-up, docs (STORY_SPEC 6.2/9/10, USER_GUIDE 4.1, catalog README), tests (tests/unit/quadruped_story.test.js) and the demo `scripts/samples/r1_becky.json` → `out/demos/r1_becky/final.mp4`. Still open: `swim` (batch B). Finding: the bible's Doopi blue #3fb8ff fails W_CONTRAST on city_park (1.54); #5ec8ff passes on park, street and home (for A2/A4).
 Asset ids refer to [ASSETS.md](ASSETS.md).

Batch A unlocks episodes 1-5: **R1** (Becky's quadruped rig), **C1-C10** (core cast looks), **E1-E3** (Heart Glow, colour freeze, scene grade), **T1, T2, T13** (Tokyo, Banyan hill, throne room), **O1-O9** (crystals, Gloom Horn, jalebi, kite, bracelet, apple, haystack and cart, market stall, basket), **F1-F3**, **S1, S2, S6, S7**.

## 0. Before anything starts

1. **The catalog reorganization must be committed first.** Every package below edits `catalog/` and most edit `tools/lib/catalog_*`. Building on uncommitted C1-C3 work in the same folder would tangle two reviews. Start after that session's work is reviewed and committed.
2. **Spec changes need your sign-off.** STORY_SPEC 4.4 freezes several names. Batch A adds these:

| Frozen group | Addition | Why |
|---|---|---|
| Body plan `rig` | `quadruped` | Becky (spec 6.2 already reserves it) |
| Body plans | `dog_small` | Becky |
| Defeat styles | `petrify` (kids allowed) | Friends turned grey (Mooka, Nani, later Becky) |
| World commands | `set_glow`, `set_grade` | Heart Glow; how grey the world is |
| Scene fields | `grade` | The same, set per scene |
| Activities | `fetch` | Becky plays fetch |
| Voice timbres | `bark` (**optional, recommended**) | Becky's `say` lines play as barks with a thought-style bubble, so dialogue macros work for her |
| Validator codes | `E_TARGET_RIG`, `E_MACRO_RIG` | No attacks on Becky; no fight macros with a dog |

Everything else (accessories, hair styles, themes, objects, FX, SFX, moves) is catalog data, which isn't frozen.

## 1. Work packages

Five packages. A1 is the critical path; A2, A4 and A5 touch different files and can run next to it in separate sessions; A3 waits for A1 because both change the validator and the defeat code.

| Pkg | Assets | Main files | Depends on | Estimate |
|---|---|---|---|---|
| **A1** Quadruped rig | R1, C4 (Becky), S1 (bark) | `engine/skeleton.js`, `engine/moves.js`, `engine/actor.js`, `engine/director.js`, new `engine/renderer/quadruped.js`, `engine/renderer/character.js`, `engine/validator/*`, `catalog/characters/bodies.json`, new `catalog/moves/quadruped.json`, `tools/lib/catalog_check.mjs`, `tools/lib/synth.mjs` | catalog commit | 7-9 days |
| **A2** Cast looks | C1-C3, C5-C10, O5 (bracelet) | `engine/renderer/appearance.js`, `accessories.js` (+ a new `accessories_more.js` to stay under 350 lines), `catalog/characters/appearance.json`, new presets in `catalog/characters/presets/` | catalog commit | 3-4 days |
| **A3** Character and scene effects | E1, E2, E3, F3 | `engine/story/defeat.js`, `catalog/moves/defeat.json`, `engine/renderer/grade.js`, `overlays.js`, new `engine/renderer/glow.js`, `engine/validator/*`, `schema_v2.js` | A1 (validator), spec sign-off | 3-4 days |
| **A4** Places | T1, T2, T13 | `catalog/world/themes.json`, new `engine/renderer/background_village.js` (layer kinds `huts`, `bunting`, `banyan`, `throne`), `catalog/world/objects.json` (crystal sockets) | catalog commit | 3 days |
| **A5** Objects, FX, sounds | O1-O4, O6-O9, F1, F2, S2, S6, S7 (+ `sneeze` emote) | `catalog/world/objects.json`, `engine/renderer/object_shapes.js` (or SVG imports), `catalog/effects/fx.json`, `catalog/effects/sfx.json`, `tools/lib/synth.mjs`, `catalog/moves/emotes.json` | catalog commit | 3 days |

Calendar: about 2 weeks with A2, A4 and A5 alongside A1, then A3 (about 2.5-3 weeks in all, including review turnaround). Sequential it is about 4 weeks.

## 2. A1: the quadruped rig (R1) in detail

### 2.1 Key design: same storage, different skeleton

The engine stores every character as 13 joints (`JOINT_ORDER`, 26 floats per frame) driven by 13 pose channels (`POSE_CHANNELS`). A dog has the same number of main parts if the joints are **reinterpreted** rather than added:

| Joint (stored name) | Humanoid meaning | Quadruped meaning |
|---|---|---|
| `hip` | pelvis | rear hip (the root) |
| `shoulder` | shoulders | front shoulders (the spine runs forward, not up) |
| `neckTop`, `head` | neck, head | neck reaching forward-up, head (with snout) |
| `lElbow`, `lHand` / `rElbow`, `rHand` | arms | front legs: knee, paw (left = far side, right = near side) |
| `lKnee`, `lFoot` / `rKnee`, `rFoot` | legs | rear legs: hock, paw |
| `center` | mid torso | mid spine |

| Channel | Quadruped meaning |
|---|---|
| `lean` | spine pitch: positive raises the front (sit, beg), negative lowers it (play bow, sniff) |
| `head` | neck and head angle (up to bark, down to sniff) |
| `lUA`/`lFA`, `rUA`/`rFA` | front legs, 0° straight down |
| `lTH`/`lSH`, `rTH`/`rSH` | rear legs, 0° straight down |
| `rot`, `dx`, `dy` | as humanoid (roll over, jumps, offsets) |

So:
- **The frame store, the sim loop, physics, ground contact (`lowestPoint`), root motion (`strideOf`), the pose sampler and the move format don't change.** Only forward kinematics branches: `computeJoints` gets the plan's `rig` through `dims` and calls `computeJointsQuad` (a new function in a new `engine/skeleton_quad.js`). All six engine call sites go through `computeJoints`, so they pick it up.
- **Tail and ears are not stored.** The renderer draws them procedurally from the frame data: tail wag speed from the face (happy and love wag fast, sad droops, scared tucks) and the hip's speed between frames; ear bounce from the head's vertical movement. Deterministic (seeded by the id, like blinking), no new frame data.
- **Humanoid scripts and golden frames are untouched:** the stickman path doesn't change.

### 2.2 Moves: a per-rig move map

About 20 engine files ask for moves by name (`walk`, `run`, `idle`, `jump`, `get_up`, `cheer` ...): destinations, `@chase`, `@travel`, `@enter`, activities, reactions. Rather than teaching each one about dogs, a body plan gets a **move map**:

```json
"dog_small": { "rig": "quadruped", "moves": { "idle": "idle_dog", "walk": "walk_dog", "run": "run_dog",
  "jump": "jump_dog", "sit": "sit_dog", "lie_down": "lie_dog", "sleep": "sleep_dog", "sneak": "sniff",
  "cheer": "wag", "laugh": "wag", "jump_joy": "jump_dog", "hit_light": "yelp", "stagger": "yelp",
  "dizzy": "dizzy_dog", "faint": "faint_dog", "get_up": "get_up_dog", "pat_head_partner": "pat_head_dog",
  "hug_partner": "hug_dog", "carried": "carried_dog", "catch_ball": "catch_mouth" } }
```

- One resolver, `resolveMove(moves, actor, name)` in `engine/moves.js`, is used where a move starts (`actor.js` `startMove`, the director's timing lookups, activities, rally, the fight core's idle) and in the validator. So `{"who": "becky", "do": "walk", "to": {...}}` plays `walk_dog`, and `@chase` with Becky as runner or chaser works without macro changes.
- Moves carry `rig` (default `humanoid`). A move that a plan's rig can't play and the map doesn't cover gives `E_MOVE_RIG` with a fix line naming the nearest dog move.
- Utility moves without keys (`wait`, `face`, `spawn`, `despawn`, `teleport`) are `rig: "any"`.

**Dog move set** (`catalog/moves/quadruped.json`, about 26 moves, authored facing right; each gets a description and tags):

| Group | Moves |
|---|---|
| Movement | `idle_dog` (breathing), `walk_dog` (4-beat walk), `trot`, `run_dog` (gallop), `jump_dog`, `swim` (needs the R1-swim water line in batch B; drafted now, enabled then) |
| Rest | `sit_dog`, `lie_dog`, `sleep_dog` (Zs), `roll_over`, `get_up_dog` |
| Emotes | `bark` (head up, mouth open, `bark` sound event), `whimper`, `growl` (soft, comic), `wag`, `sniff` (a loop with `stride`, nose to the floor), `dig`, `play_bow`, `beg`, `shake_off`, `tilt_head` |
| Action (never an attack) | `pounce`, `tug` (pulls a held rope or cloth), `bite_hold` (grabs a villain's cape or pants: no damage; the partner plays `hop_partner`, a comic hop), `dodge_dog`, `yelp` (a startled jump, used as the hit reaction), `dizzy_dog`, `faint_dog` (kids-safe flop with stars) |
| Paired | `lick` (lead) with `lick_partner` (a humanoid giggles); humanoid-led `pat_head` → `pat_head_dog`, `hug` → `hug_dog`, `carry` → `carried_dog` (in arms), `piggyback` (for Ghoomu, later) |
| Ball | `catch_mouth`, `drop_ball` (for `fetch`) |

**Holding things:** a plan field `grip: { joint: "head", offset: [16, 6], angle: 0 }` puts held objects in the mouth instead of the hand (rope, key, headband, bone, ball). `pick_prop`, `drop_prop` and `give` keep working; `throw_prop` and weapon props are not allowed (`E_MOVE_RIG`).

### 2.3 Drawing (`engine/renderer/quadruped.js`)

- Body: a filled bean from the hip to the shoulder (`bodyWidth`), belly lighter; front and rear legs as tapered lines with round paws; neck; a round head with a short snout, a nose and the face drawn on the side of the head (eyes, brows, mouth from the faces catalog, so all 16 faces work).
- Look from the plan's appearance (cast entries can override): `ears` (`floppy`, `pointy`), `tail` (`wag`, `curly`, `stub`), `patch` (eye patch colour), `collar` (colour, with a bell), `snout` (`short`, `long`).
- Becky: body `#f3e3c3`, patch and ears `#8a5a3c`, collar `#e63946` with a gold bell, `scale 1`: her back is at about the stickman's knee.
- Level of detail like the faces: under 30 px on screen the face is two dots and a nose.
- Speech bubbles anchor above the head (as now); the camera's `close_up` frames the whole dog for a quadruped (head to tail), and two-shots with a tall humanoid zoom so both heads fit.

### 2.4 Combat, macros and the validator

- Becky never fights. `@fight`, `@gauntlet` and `@brawl` with a quadruped in a fighting role give `E_MACRO_RIG`; an attack beat targeting a quadruped gives `E_TARGET_RIG` (kids rule: never hit the pet). Hurtboxes for quadrupeds are still derived (so stray projectiles and crowd bumps resolve), from the spine and head.
- `@chase`, `@travel`, `@enter`/`@exit`, `@walk_together` (side by side, no hand holding with a dog), `@dialogue` (with timbre `bark`: babble syllables become barks; bubbles default to `think` for a dog unless the author says otherwise) and `@defeat` styles `faint` and `petrify` accept Becky.
- Activities: `blow_bubbles` (Becky pokes bubbles with her nose), `sleep`, `play_catch` (Becky as the catcher via the map) and the new **`fetch`**: a humanoid throws a ball, Becky runs, catches or picks it up, runs back and drops it at the thrower's feet; `reps`, endings `laugh` and `win`.
- Catalog build: "every move on every body plan" becomes "every move on every plan of its rig" (humanoid moves on six plans, dog moves on `dog_small`), with the same checks: finite joints, never below the floor, paws on the floor at the start and end unless it holds a pose or jumps.

### 2.5 A1 steps and review points

| Step | Output | Review |
|---|---|---|
| A1.1 Spec and ADR: STORY_SPEC 6.2 rewritten for the rig, 4.4 frozen names, ARCHITECTURE ADR-020 or the next free number (joint reinterpretation, move map) | Docs | You sign off the names |
| A1.2 `computeJointsQuad`, plan `dog_small`, `quadruped.js` renderer with a static pose | `out/demos/r1_becky_look.png`: Becky in 6 static poses (stand, sit, lie, bark, play bow, beg), next to Doopi, at three camera distances, in all 16 faces | **Review 1: Becky's look** (15 min) |
| A1.3 Move map + `resolveMove`, `rig` on moves, `E_MOVE_RIG`, `E_TARGET_RIG`, `E_MACRO_RIG` with fixtures in `tests/fixtures/bad/` | Validator + unit tests | |
| A1.4 The dog move set (drafted with `tools/draft.mjs move` taught the quadruped channels, then tuned by eye) | `catalog/moves/quadruped.json`, `out/demos/r1_becky_moves.png` filmstrip | **Review 2: the moves** (20 min) |
| A1.5 Mouth grip, paired moves with humanoids, `fetch` activity, `bark` timbre and SFX (`bark`, `bark_small`, `whimper`, `growl_soft`, `pant`) | Unit tests per module | |
| A1.6 Macros (`@chase`, `@travel`, `@enter`, `@exit`, `@walk_together`, `@dialogue`) and camera framing with a quadruped | Unit tests | |
| A1.7 Demo story `scripts/samples/r1_becky.json` (about 60 s): Becky wakes Doopi, fetch in the park, pat and hug, she sniffs a trail, chases two kids off, sits and barks; validated, rendered | `out/demos/r1_becky/final.mp4` | **Review 3: Becky in action** |
| A1.8 Docs: USER_GUIDE (using a dog), catalog README, context pack rebuilt | Docs | |

Tests: `tests/unit/quadruped.test.js` (table-driven FK: joints for known poses, ground contact, stride), move-map resolution, every dog move on `dog_small`, paired moves dog × each humanoid plan, `fetch` endings, the validator codes; all humanoid goldens and determinism hashes unchanged.

## 3. A2-A5 in brief

### A2 Cast looks
- New appearance options (each a `catalog/characters/appearance.json` entry with a description, drawn in the renderer): accessories `hair_flower` (C3), `sprout` and `mittens` (C5), `horns` (C6), `turban` (C8, headwear: conflicts with hat, cap and crown), `moustache` (C9), `stub_horns` (C10), `bracelet` (O5: seven gem slots; `set_appearance` param `slots` 0-7 lights them in rainbow order); hair `bun` (C7); a body `belly` patch colour for capsule bodies (C5).
- Presets (`catalog/characters/presets/`, with roles): `doopi`, `dony`, `doomi`, `mooka`, `nani`, `motumal`, `peepa`, `tony`, `kony`, `thunda`.
- Demo: `out/demos/a2_cast.png`, the whole cast lined up in neutral, happy, angry and scared faces, plus a close-up row. **Review: the cast sheet**, especially Mooka (original: green, leafy, no goggles, no overalls) and Peepa's horns.

### A3 Character and scene effects
- **E1 Heart Glow:** `set_glow` world command (`who`, `color` or `"rainbow"`, `level` 0-1, `dur`); drawn behind the body, pulsing gently; carries over between scenes.
- **E2 petrify:** a defeat style and move: holds the pose, fades to stone grey over 1.5 s, no blinking or breathing; `return` thaws it (colour floods up from the feet, `sparkle_rise`). Counts as defeated; allowed for kids. `W_KIDS_NO_HOPE` treats a petrified friend like a vanished one (fine across a series if E5 comes later, a warning until then).
- **E3 grade:** scene field `grade: { saturation, keepCast }` and `set_grade` (`saturation`, `dur`, `keepCast`). `keepCast: true` keeps characters in colour while the world is grey.
- **F3 colour_return:** FX + a `set_grade` up over 2 s, from a point outward.
- Demo: a 30 s scene: the village goes grey, Mooka petrifies, a crystal returns, colour floods back, Mooka thaws, Doopi's glow rises.

### A4 Places
- `Tokyo_village` (T1: hills, round huts with painted doors, bunting, a far tree), `banyan_hill` (T2: the giant banyan with aerial roots; the seven crystal sockets are set pieces `crystal_socket` with states per colour and `empty`), `gloom_throne_room` (T13: from `villain_lair`, plus a horned `throne` set piece and a crystal-ball stand).
- Drafted with `node tools/draft.mjs theme "<prompt from ASSETS.md>" --manual` (copy-paste, no local models), new layer kinds coded by hand. Each gets a review sheet at three camera distances, by day, dusk and night, and grey (with E3, once A3 lands).

### A5 Objects, FX and sounds
- Objects: `rainbow_crystal` (holdable, a glow, states for seven colours and `dim`), `gloom_horn` (holdable; `use` emits F2 and plays S2), `jalebi` and `jalebi_plate`, `kite` (a floater on a string), `apple`, `haystack`, `cart`, `market_stall`, `basket`.
- FX: `colour_powder` (F1), `gloom_mist` (F2). SFX: `gloom_horn` (S2), `sneeze` (S6), `crystal_chime` (S7); a `sneeze` emote move.
- Review sheet: every object at three distances plus a 20 s clip of the horn, mist and powder.

## 4. Exit for batch A

- `npm test` green; humanoid golden frames and determinism hashes unchanged; `npm run catalog:build` clean.
- Demos in `out/demos/`: `r1_becky_look.png`, `r1_becky_moves.png`, `r1_becky/final.mp4`, `a2_cast.png`, the A3 effects clip, the A4 place sheets, the A5 object sheet.
- `series/doopi/cast.json`: the shared cast for all 24 episodes, validated.
- Then: the episode 1 script (`scripts/series/doopi/ep01.json`), validated and rendered for your review.

## 5. Questions (answered 2026-10-18; see the decisions at the top)

1. **OK to add the frozen names in section 0** (especially the optional `bark` voice timbre)?
2. **Run A2, A4 and A5 in parallel sessions** next to A1 (faster, more reviews at once), or one at a time?
3. **Becky's size:** her back at about the stickman's knee (a small pup). Bigger (hip-high) reads better in wide shots. Which?
