# Story Engine Execution Plan

How to build [STORY_SPEC.md](STORY_SPEC.md) on top of the finished fight engine (M0-M8). Milestones are S0-S9, in the same style as [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md): each ends with green tests, a demo artifact in `out/demos/`, and a review checkpoint where needed.

## Starting point (what already exists)

| Area | State after M8 |
|---|---|
| **Engine** | Deterministic simulate-then-render. FK poses + IK aiming, 72 moves, choreographed combat, director with 4 `at` forms, three clocks (story/fx/video), FX, camera, 7 themes, accessories, frame store, public API (`createEngine`) |
| **Validator** | Schema → semantic → dry run, with error codes and fix lines; schema v1 frozen |
| **Tools** | `record` (MP4 + audio + thumbnail + contact sheet), `validate`, `generate` (any LLM provider), `manual` (copy-paste), browser player/editor/catalog |
| **Tests** | 360 passing: unit, integration, golden frames, determinism |
| **Docs** | Spec v1.1.10, ARCHITECTURE (ADR-001..013), USER_GUIDE |

Key code facts the new work must respect:
- `BODY` in `engine/skeleton.js` is a global constant. Body plans make it per-character (S3).
- The mouth is stored as an index into `MOUTHS` in the frame store (CHAR_STRIDE 33). Faces replace it (S2).
- Props are held objects only. Objects generalize them (S4).
- One scene per script. `set_theme` is the only location change. Scenes are added in S1.
- The prompt/validator sync test (`tests/unit/generate.test.js`) fails if a validator code is missing from `prompts/system.md`. Every milestone that adds codes must update the prompt.

## Milestones

### S0 Spec freeze (0.5 day)

The product decisions are already made (STORY_SPEC section 21, signed off 2026-10-16):
- speech sounds only;
- procedural music;
- stories ≥ 5 min, fights ≥ 3 min;
- kids-first audience;
- minimal manual art work.

| Task | Output |
|---|---|
| Freeze schema v2 field names, macro names and params, face list, body-plan list, object behaviors | Done: `docs/schema/script-v2.schema.json` generated from `engine/validator/schema_v2.js` (+ `macro_params.js`, `v2_names.js`); STORY_SPEC v2.0-rc section 4.4; reference story fixture `tests/fixtures/v2/reference_abridged.json` and `tests/unit/schema_v2.test.js` |
| Write ADRs: ADR-014 two-level scripts and the compiler; ADR-015 body plans share the humanoid skeleton; ADR-016 scenes in one world with state carry-over; ADR-017 procedural music and speech sounds in /tools; ADR-018 audience rules (kids default) | Done: `docs/ARCHITECTURE.md` section 9 |

**Exit:** the product owner signs off the spec. **Signed off 2026-10-16**, with one clarification: a villain's energy attack on a defenseless character is fine as a story incident in kids mode.

### S1 Scenes, locations, transitions, cards (4-5 days)

| Task | Output |
|---|---|
| S1.1 Wire the v2 schema (written in S0) into `validate()`; v1 → v2 conversion on load | `engine/validator/schema_v2.js`, `engine/story/normalize.js` |
| S1.2 Scenes in the director: scene-local `at`, scene boundaries reset stage/positions/camera/set, character state carries over | `engine/director.js` (split: `engine/story/scenes.js`) |
| S1.3 Locations: theme, stage width, set pieces (static drawing only for now); frame store scene index | `engine/framestore.js`, renderer background per scene |
| S1.4 Transitions: cut, fade, dissolve, wipe, iris; scene `transitionIn`/`transitionOut` | `engine/renderer/transitions.js` |
| S1.5 Cards: `title_card`, `chapter_card`, `time_card`, `end_card`; `narrate` box with typewriter reveal | `engine/renderer/overlays.js` (split if over 350 lines) |
| S1.6 `set_time` and `set_weather`: color grades, rain/fog layers | `engine/renderer/grade.js`, new layer kinds |
| S1.7 Five new themes needed by the reference story: `city_park`, `city_street`, `villain_lair`, `home_interior`, `alley_night` | `data/themes.js`, new layer kinds |
| S1.8 Validator: E_VERSION, E_LOCATION_UNKNOWN, E_TRANSITION, E_SCENE_EMPTY, E_SIM_SCENE_LENGTH, E_CAST_ABSENT | Validator + fixtures in `tests/fixtures/bad/` |
| S1.9 `record --scene N`; player shows scene markers on the scrubber | `tools/record.mjs`, `web/player.html` |
| S1.10 Long-form limits for v1 and v2: max duration 900 s, beats 600 authored / 4,000 compiled, script 512 KB; W_STORY_SHORT and W_FIGHT_SHORT; the dry run of a 5-minute script takes under 5 s | `engine/config.js`, validator, benchmark |
| S1.11 `meta.audience` (default `kids`) in the schema; the soft list with suggested alternatives (W_TEXT_SOFT) | `data/blocklist.js`, validator |

**Tests:**
- v1 golden frames and determinism hashes unchanged.
- Scene boundary unit tests.
- A transition golden frame per type.

**Demo:** 3 scenes (park → card → street → lair) with existing stickmen, a narration box and transitions.

**Review:** themes and transitions (15 min).

**Status (2026-10-16):** built; waiting for the review. Demo: `out/demos/s1_scenes/final.mp4` from `scripts/samples/s1_scenes.json` (5 scenes, all five new themes, every transition type, narration, time/weather changes, cards). Notes:
- Set pieces are drawn statically from a first `data/objects.js` (11 objects); S4 turns it into the full object catalog.
- Macro beats are accepted by the schema but report `E_MACRO_UNKNOWN` until S6.
- The narration chime (S2.6) and per-scene music/ambience (S7) are not in yet; stories render with SFX only.

### S2 Faces, emotions, dialogue (3-4 days)

| Task | Output |
|---|---|
| S2.1 Face data model: eyes, brows, mouths, extras; 15 faces | `data/faces.js` |
| S2.2 Face renderer for the stickman head (dot eyes stay the default; faces show at close range or when set) | `engine/renderer/face.js` |
| S2.3 Face state: beat `face`, automatic faces on hits/attacks/KO, blinking, gaze toward target/partner/speaker | `engine/actor.js`, `engine/story/faces.js` |
| S2.4 Frame store: face index + mouth-open bit (CHAR_STRIDE 34) | `engine/framestore.js` |
| S2.5 Bubbles: `bubble` = `think`, `shout`, `whisper`; speaker names; reading-time `sayDur` default | `engine/renderer/overlays.js` |
| S2.6 Mouth flap while talking; speech sounds: seeded syllable babble per character (`voice.pitch`, `speed`, `timbre`), narration chime | `tools/lib/speech.mjs`, `audio_events.js` |
| S2.7 New emotes: `cry`, `clench_fist`, `sigh`, `gasp`, `jump_joy`, `hold_head`, `nod`, `shake_head`, `look_around`, `talk` (gesture loop) | `data/moves/emotes.js` |
| S2.8 Validator: E_FACE_UNKNOWN, W_DIALOGUE_FAST | Validator + fixtures |

**Demo:** a 20 s dialogue scene with five emotions.

**Review:** faces at three zoom levels (15 min).

**Status (2026-10-16):** built; waiting for the review. Demos: `out/demos/s2_dialogue/final.mp4` (from `scripts/samples/s2_dialogue.json`: 9 emotions, every bubble kind, speaker names, close-ups, babble) and `out/demos/s2_faces.png` (`node tools/face_sheet.mjs`: 15 faces × 3 sizes). Notes:
- The mouth-open state is derived at render time from the say events instead of a stored bit (same result, smaller store).
- Gaze follows whoever is talking; looking at a `target` or `partner` comes with paired moves (S5).
- The face field in the schema is a catalog string (checked by `E_FACE_UNKNOWN`), like moves and themes.

### S3 Body plans and appearance (4-5 days)

| Task | Output |
|---|---|
| S3.1 Body plan data: proportions, hurtbox scales, draw style; `stickman`, `buddy`, `kid`, `bulky`, `slim`, `elder` | `data/bodies.js` |
| S3.2 Make `BODY` per-character. Update everything that reads it: `computeJoints`, `lowestPoint`, `limbReach`, `canReach`, `resolveAimPoint`, hurtboxes, camera framing, accessories | `engine/skeleton.js`, `combat.js`, `world.js`, `camera.js`, `renderer/*` |
| S3.3 Root motion and reach scale by plan ratios. Re-run the combat world matrix (all attacks × outcomes × size pairings) for every body plan | `tests/unit/world.test.js` extended |
| S3.4 Body renderers: capsule torso (buddy), trapezoid torso (bulky), outfits, hair | `engine/renderer/bodies.js` |
| S3.5 Appearance options: eyes, brows, cheeks, hair, new accessories (antenna, bowtie, mask, crown, backpack, eyepatch) | `engine/renderer/accessories.js`, face renderer |
| S3.6 Cast entries in the schema; `E_BODY_UNKNOWN`, `E_APPEARANCE` | Validator |
| S3.7 Pose viewer and catalog page get a body-plan selector | `web/index.html`, `web/catalog.html` |

**Tests:**
- Every move on every body plan: no NaN, feet on the ground, hits connect across plan pairings.
- v1 goldens unchanged.

**Demo:** catalog strip of 8 moves × 6 body plans.

**Review:** body plan look and the buddy design (15 min).

**Status (2026-10-16):** built; waiting for the review. Demos: `out/demos/s3_bodies.png` (`node tools/body_sheet.mjs`: 6 plans × 8 moves) and `out/demos/s3_bodies/final.mp4` (from `scripts/samples/s3_bodies.json`: all six plans in one scene, a buddy-vs-bulky exchange, a `set_appearance` change). Notes:
- The combat matrix runs every attack × outcome over six plan pairings; to pass it, jump heights do not scale with leg length and the elder's stoop is released while attacking.
- Kicks get no lean assist in the reach check, so impossible kicks warn (`W_REACH`); no v1 sample's warnings changed.
- `set_appearance` (frozen in S0) is implemented here. The elder's cane comes with the S4 objects.

### S4 Objects and set pieces (4-5 days)

| Task | Output |
|---|---|
| S4.1 Object catalog and behaviors: static, seat, holdable, ball, floater, vehicle, breakable | `data/objects.js`, `engine/objects.js` |
| S4.2 Migrate v1 props to holdable objects; the `prop` field and the pick/drop/throw moves keep working | `engine/props.js` → `engine/objects.js` |
| S4.3 Object simulation: ball arcs and bounces, floaters with seeded wobble and pop, vehicles with wheels | `engine/objects.js` (split by behavior if needed) |
| S4.4 Object drawing (procedural shapes) and frame store items | `engine/renderer/objects.js` |
| S4.5 World commands: `spawn_object`, `remove_object`, `set_object`; character `use`, `ride`, `dismount` | Director, validator |
| S4.6 Initial object set (about 30): bench, chair, table, tree_big, bush, lamppost, car, bike, door, sign, fountain, tennis_net, racket, tennis_ball, football, bubble_wand, bubble, balloon, phone, ice_cream, flower, book, crate, box, rope, cage, plus the 6 v1 props | `data/objects.js` |
| S4.7 SFX: bubble_blow, bubble_pop, racket_hit, ball_bounce, door_open, car_pass | `data/sfx.js`, `tools/lib/synth.mjs` |
| S4.8 Validator: E_OBJECT_UNKNOWN, E_OBJECT_STATE, E_SIM_OBJECT_OFFSTAGE | Validator + fixtures |
| S4.9 SVG import: SVG file → catalog path data (flattened to the palette and outline style); used for objects and theme layers | `tools/svg_import.mjs`, `engine/renderer/paths.js` |
| S4.10 Draft tool: `tools/draft.mjs object|theme "<description>"` drafts catalog data with an LLM (any provider or copy-paste), checks it automatically, and renders a review sheet | `tools/draft.mjs` |

**Demo:** a park scene with benches, a tree, a ball bouncing and bubbles floating.

**Review:** object look (10 min).

**Status (2026-10-16):** built; waiting for the review. Demo: `out/demos/s4_park/final.mp4` (from `scripts/samples/s4_park.json`: bench, tree, fountain, lamppost, bubbles from a wand, a kicked football, a car passing, a crate breaking; a racket and a cane held). Notes:
- `data/props.js` is unchanged (v1 schema, prompt and prop indices stay); story holdables live in `data/objects.js` with a `hold` entry.
- Seats wait for the sit moves and breakables for attacks on objects (both S5).
- Static objects are drawn from the event log, so only balls, floaters and vehicles are stored per frame.

### S5 Interactions, activities and the slice-of-life move pack (6-8 days)

| Task | Output |
|---|---|
| S5.1 Paired move format (lead + partner tracks), partner positioning and approach, partner busy/queue rules | `engine/moves.js`, `engine/story/pairs.js` |
| S5.2 Hand targets with IK across body plans (hug a short buddy) | `engine/combat.js` aim code reused |
| S5.3 Paired moves: hug, high_five, fist_bump, handshake, pat_head, carry/put_down, give/receive, piggyback, lift_up, drag, lean_on, comfort, walk_together | `data/moves/interactions.js` |
| S5.0 Move drafting: `tools/draft.mjs move "<description>"` drafts move data (poses, keys, root motion, hits) from a description plus similar moves, runs the data checks, and renders a filmstrip. The person approves or nudges in the editor. Most new moves are made this way to minimize manual posing. | `tools/draft.mjs`, prompt in `prompts/draft_move.md` |
| S5.4 Solo slice-of-life moves (about 25): sit, stand_up, lie_down, sleep, eat, drink, read, phone_talk, cheer, clap, kneel, wave_goodbye, sneak, tiptoe, peek, hide, push, pull, climb_up, jump_down, swing_forehand, swing_backhand, blow_wand, poke, stretch | `data/moves/life.js` (drafted with S5.0, reviewed in batches) |
| S5.5 Defeat styles: faint, vanish (sparkle dissolve), ghost (halo float-up, `general` only), captured (rope/cage FX), flee; `return` (sparkles re-form a vanished character) for kids endings; cartoon impact text pops (POW, BONK) in kids mode | `data/moves/reactions.js`, FX presets |
| S5.6 Activities as data: blow_bubbles, tennis_rally, play_catch, kick_ball, eat_together, dance_together, selfie, sleep, comfort | `data/activities.js`, `engine/story/activities.js` |
| S5.7 Validator: E_PARTNER_MISSING, E_PARTNER_SELF, E_SIM_PARTNER_UNREACHABLE, E_ACTIVITY_OBJECT, E_DEFEAT_STYLE, W_KIDS_NO_HOPE | Validator + fixtures |

**Demo:** the reference story's scene 1 (bubbles, tennis, high five), hand-written as beats.

**Review:** each move batch in the catalog page (3 batches × 15 min).

**Status (2026-10-16):** batch 1 approved (S5.0 move drafting, S5.4 the 25 solo moves, seats with slots). Batch 2 built (S5.1-S5.3: the `pair` format, positioning and partner queueing in `engine/story/pair_beats.js`, contacts with IK and attachments in `engine/story/pairs.js`, 14 paired moves in `data/moves/interactions.js`, and E_PARTNER_MISSING, E_PARTNER_SELF and E_SIM_PARTNER_UNREACHABLE from S5.7), waiting for the review. Demo: `out/demos/s5_batch2_pairs/final.mp4` (from `scripts/samples/s5_pairs.json`: stickman with buddy, bulky with kid). Batch 3 (defeat styles, activities, the remaining validator codes, the scene-1 demo) follows.

### S6 Story compiler and macros (5-6 days)

| Task | Output |
|---|---|
| S6.1 Compiler framework: macro registry, generated ids, exposed anchors, `compile` RNG stream, expansion report in the timeline | `engine/story/compile.js` |
| S6.2 Macros: @dialogue, @activity, @walk_together, @enter, @exit, @travel, @montage | `engine/story/macros/*.js` |
| S6.3 Fight macros: @fight (exchange generator, intensity, comeback, finisher), @gauntlet (waiting ring, turn-taking), @brawl, boss phases, @fight_card (a 3+ minute fight video: intro, rounds, breathers, finale) | `engine/story/macros/fight.js`, `fight_card.js` |
| S6.4 @defeat and @grief sequences (moves, faces, FX, weather, music cues) | `engine/story/macros/*.js` |
| S6.5 Extras and crowds: walk_by, idle_chat, cheer, flee; layers back/mid/front | `engine/story/extras.js`, renderer layers |
| S6.6 `tools/compile.mjs` prints the expanded script; `--eject <macroId>` writes the beats back | Tool |
| S6.7 Story camera: two_shot, close_up, wide, over_shoulder, track; `autoCamera: "story"` | `engine/camera.js` (split: `camera_story.js`) |
| S6.8 Validator: E_MACRO_UNKNOWN, E_MACRO_PARAM, W_SCENE_STATIC, W_CAST_UNUSED; dry run on compiled output | Validator + fixtures |

**Tests:**
- Determinism of compilation.
- Every macro with every body plan.
- Gauntlet with 1-6 opponents.
- Fight macro outcomes match `winner`.

**Demo:** the reference story's scene 3 (gauntlet against 4 guards) written as a single macro beat.

**Review:** the fight macros (15 min).

### S7 Generated music and ambience (6-8 days)

| Task | Output |
|---|---|
| S7.1 Mood data: scales, tempo ranges, chord and drum pattern pools, instrument patches, intensity levels; 11 moods | `data/music_moods.js` |
| S7.2 Music generator: seeded per scene, 8/16-bar loops with intro and ending, follows scene length, intensity follows fight macros, stings for defeats and reunions | `tools/lib/music_gen.mjs` (split: `patterns.mjs`, `instruments.mjs`) |
| S7.3 Mixer: crossfades at scene boundaries, ducking under dialogue/narration, ending lands on the final beat; file override per mood (`assets/music/<mood>.mp3`) | `tools/lib/mixer.mjs` |
| S7.4 Ambience beds per location and weather (city traffic, park birds, rain, wind, crowd murmur, cave drip), procedural | `tools/lib/ambience.mjs` |
| S7.5 Remaining SFX: footsteps, sad_sting, heartbeat, magic_sparkle, gasp, laugh_small, cry_small, card_whoosh, cartoon impacts (bonk, boing, pow) | `tools/lib/synth.mjs` |
| S7.6 Loudness: kids-friendly levels, a limiter, long-video loudness check (EBU R128 integrated about -16 LUFS for YouTube) | `tools/lib/mixer.mjs`, `tools/loudness.mjs` |

**Tests:**
- Same seed gives byte-identical audio.
- Every mood renders 30 s without clipping.
- Crossfade timing matches scene boundaries.

**Review:** a 2-minute mix that moves through five moods (15 min). This is the subjective quality gate for the music; iterate on patterns and patches until approved.

### S8 LLM story pipeline (4-5 days)

| Task | Output |
|---|---|
| S8.1 Prompt pack for stories:<br>- outline prompt;<br>- scene prompt with a story rules section;<br>- macro reference, face/object/activity/body tables generated from the catalog;<br>- content policy;<br>- two example stories. | `prompts/story_*.md`, `prompts/examples/stories/` |
| S8.2 Two-stage generation: outline → per-scene scripts → assemble → validate → per-scene repair. Uses the existing provider-neutral LLM layer. | `tools/lib/story_pipeline.mjs`, `tools/generate.mjs --story` |
| S8.3 Copy-paste mode: `manual.mjs story-outline`, `story-scene N`, `check-scene`, `assemble` | `tools/manual.mjs` |
| S8.4 Story scoring: arc, scene variety, emotional range, narration coverage, fight quality, length targets (stories ≥ 300 s, fights ≥ 180 s, with an "extend" round when short), kids rules | `tools/lib/scoring.mjs` |
| S8.7 Update the M8 fight pipeline: default length 180 s via @fight_card; generate/manual defaults `--length 180` for fights and `300` for stories; prompts carry the kids rules | `tools/generate.mjs`, `tools/manual.mjs`, `prompts/` |
| S8.5 Story critique: contact sheet per scene plus a story-level critique | Pipeline |
| S8.6 Prompt/validator sync test extended to all new codes | `tests/unit/generate.test.js` |

**Exit:**
- 5 generated stories (≥ 5 min each) and 3 fight videos (≥ 3 min each) reviewed.
- At least 3 stories and 2 fight videos are judged watchable without hand edits.

**Review:** 5 stories and 3 fights (about 2 hours).

### S9 Hardening and acceptance (3-4 days)

| Task | Output |
|---|---|
| S9.1 The reference story (STORY_SPEC Appendix A, full ≥ 5-minute version, kids audience) renders end to end; plus a ≥ 3-minute fight card sample | `scripts/samples/story_bubbles_and_the_brave_heart.json`, `scripts/samples/fight_card_rooftop.json`, `out/demos/s9_*.mp4` |
| S9.2 Fuzz: 200 generated v2 scripts through the validator and simulator; no crash, no NaN, every failure has a code | `tests/integration/fuzz_v2.test.js` |
| S9.3 Performance: a 5-minute story renders at ≥ 1x real time at 1080p60 (about 5 minutes); profile extras, faces, objects and the music generator | `docs/benchmarks.md` |
| S9.4 Docs: USER_GUIDE story chapters (cast, scenes, macros, objects, faces, narration); spec v2.0 final; ARCHITECTURE updated | Docs |
| S9.5 Portrait acceptance for stories (cards, narration, faces in 9:16) | Golden frames |

**Exit:** the reference story is approved by the product owner.

## Schedule

| Milestone | Days | Cumulative | Can run in parallel with |
|---|---|---|---|
| S0 | 0.5 | 0.5 | - |
| S1 | 5-6 | 6 | - |
| S2 | 3-4 | 10 | S3 (different files, after S1) |
| S3 | 4-5 | 14 | S2 |
| S4 | 5-6 | 20 | S7 |
| S5 | 6-8 | 28 | - |
| S6 | 6-7 | 35 | - |
| S7 | 6-8 | 43 (or earlier if run in parallel with S4-S6) | S4, S5, S6 (separate files under `tools/`) |
| S8 | 5-6 | 41-49 | - |
| S9 | 3-4 | 45-53 | - |

That is about 9-11 weeks of calendar time including review turnaround, or about 8 weeks with S7 in parallel.

**Shortest path to the reference story:** S1 → S2 → S3 (buddy only) → S4 (needed objects only) → S5 (scene 1 moves, vanish, return, captured) → S6 (@gauntlet, @fight, @defeat) → S7 (music), with the remaining scenes written by hand as beats. This takes about 6 weeks; finish the remaining items afterwards.

## Module impact

| Module | Change |
|---|---|
| `engine/skeleton.js` | `BODY` → per-character body plan argument |
| `engine/director.js` | Scenes; split scene and macro code into `engine/story/` |
| `engine/world.js`, `combat.js`, `hit_apply.js` | Body-plan-aware reach and aim; paired moves; defeat styles |
| `engine/props.js` | Becomes `engine/objects.js` (behaviors) |
| `engine/framestore.js` | Scene index, face index, body plan per character, object items, absent characters skipped |
| `engine/camera.js` | Story shot modes; split |
| `engine/renderer/*` | Bodies, faces, objects, transitions, grades, layers, cards |
| `engine/validator/*` | v2 schema, new semantic checks, compile-then-dry-run |
| `engine/story/*` (new) | normalize, scenes, compile, macros, activities, pairs, extras, faces |
| `data/*` | bodies, faces, objects, activities, new moves, new themes, music manifest |
| `tools/*` | `compile.mjs`, `draft.mjs`, `svg_import.mjs`, `loudness.mjs`, music/speech/ambience generators in `tools/lib/`, generate `--story`, manual story commands, `record --scene` |
| `prompts/*` | Story prompts and examples |

The hard rules from CLAUDE.md still apply to all new engine code:
- No I/O.
- No `Math.random`.
- No `/data` imports.
- Modules under ~350 lines.
- JSDoc.

## Test strategy

- **Compatibility first:** every milestone keeps the v1 golden frames, determinism hashes and the 360 existing tests green.
- **Table-driven unit tests per new module:** compile, macros, objects, faces, bodies, pairs, scenes.
- **Matrices:**
  - moves × body plans;
  - paired moves × body plan pairs;
  - fight macros × opponent counts;
  - transitions × formats.
- **Golden frames per milestone demo,** updated only with `npm run golden:update` and reviewed by eye.
- Validator fixtures for every new code (`tests/fixtures/bad/<code>.json`).
- Prompt/validator sync test covers all codes.

## Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Body plans break combat tuning (reach, aim, nudge) | High | S3.3 re-runs the full world matrix per plan; plans share the skeleton |
| Paired moves look stiff | Medium | Editor support for two-track moves; IK hand targets; review per batch |
| Macro output feels repetitive | Medium | Seeded variety pools, intensity/style params, eject-and-edit path |
| LLM story scripts too long or inconsistent | Medium | Two-stage generation, per-scene repair, macros keep scenes short |
| Scope creep (animals, vehicles as characters, lip-sync) | Medium | Out of scope for v2 (spec section 1); a rig field keeps the door open |
| Content policy (loss/revenge themes) | Medium | Stylized defeat styles, soft-list warnings, audience setting |
| Trademarked character look-alikes | Medium | Original body plans; validator does not ship look-alike presets |
| Render time for long stories | Low | Simplified extras, per-scene rendering, benchmarks in S9 |
| Generated music sounds repetitive or amateur over 5+ minutes | High | Pattern pools and variation per scene, intensity curves, a dedicated review gate in S7, file override per mood |
| 5-minute stories feel padded | Medium | 10-16 scenes with distinct purposes, activity and travel macros, story score penalizes static scenes (W_SCENE_STATIC) |
| Kids rules too strict for fights | Medium | Cartoon impact language instead of removing fights; the `general` audience remains available |
| LLM-drafted moves look wrong | Medium | Automatic data checks + filmstrip review; editor fallback |

## Kickoff prompt for the new chat

Paste this into a new Claude Code session opened in `/Users/a81133017/SRIDHAR/PROJECT/StickMan`:

```text
You are continuing development of the Stickman engine in this folder. Read, in order:
CLAUDE.md, README.md, docs/STORY_SPEC.md, docs/STORY_PLAN.md, docs/ARCHITECTURE.md,
stickman-engine-spec.md (v1, fights), docs/USER_GUIDE.md.

The fight engine (M0-M8) is finished: 360 tests pass, schema v1 is frozen and must keep
working unchanged (golden frames and determinism hashes must not change).

Your job is the story expansion in docs/STORY_PLAN.md. The product decisions are made
(STORY_SPEC section 21): speech sounds only, procedural music, stories >= 5 min and
fights >= 3 min, kids-first audience, minimal manual art work. Start with S0: freeze the
v2 schema draft and ADRs and show them to me. After my sign-off, do the milestones in
order (S1, S2, ...). Follow the
milestone workflow in CLAUDE.md: green tests, a demo in out/demos/, and stop at each
review checkpoint for my approval. Keep docs and code in sync in the same change.
```
