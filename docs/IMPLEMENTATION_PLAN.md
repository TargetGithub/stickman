# Implementation Plan

Who builds it: Claude (implementation, tests, data authoring) with Sridhar (decisions, visual review, assets, API key).
Spec: `../stickman-engine-spec.md` v1.1. Design: `ARCHITECTURE.md`. Needs: `REQUIREMENTS.md`.

Estimates are working days of focused development. Calendar time depends mostly on how quickly visual reviews come back.

## Working agreement

- Each milestone ends with: tests green (`npm test`), a short demo artifact (PNG, GIF or MP4 in `out/demos/`), and a review checkpoint where Sridhar looks at it.
- Every change keeps the spec, `ARCHITECTURE.md` and code consistent.
- Visual quality is judged by eye in `web/catalog.html` and rendered clips. Tests catch regressions, not ugliness.
- Commit per task once the project is a git repository.

## Milestones

### M0 Foundations (2-3 days) — DONE 2026-10-15, reviewed
| Task | Output |
|---|---|
| M0.1 Repo scaffold, `npm test`, lint conventions, `CLAUDE.md` | runnable empty test suite (done in setup) |
| M0.2 `math.js` (vectors, easing, mulberry32, hash32, value noise) + tests | |
| M0.3 `expr.js` safe evaluator + tests (accepted and rejected inputs) | |
| M0.4 `skeleton.js` FK incl. `rot`, mirror, `solveIK2`, `lowestPoint`, pack/unpack + table tests | |
| M0.5 `data/poses.js` first 10 poses | |
| M0.6 `renderer/character.js` basic stick figure drawing | |
| M0.7 Canvas backend spike: render 1,800 frames with `skia-canvas` and `@napi-rs/canvas`, measure ms/frame and determinism, pick one (ADR-001) | benchmark table in `docs/benchmarks.md` |
| M0.8 `web/index.html` pose viewer with sliders for every channel | |
**Exit**: FK/IK tests pass; poses render to PNG from Node and in the browser; backend chosen.
**Review**: Sridhar checks pose proportions and line style.

### M1 Move runtime + editor (3-4 days) — DONE 2026-10-15, reviewed
| Task | Output |
|---|---|
| M1.1 `pose.js` blending and key sampling | |
| M1.2 `moves.js` runtime: keys, root motion deltas, events, speed, blending, chain, queue | |
| M1.3 Ground contact with rate-limited snap and `snapHard` | |
| M1.4 `web/editor.html`: drag joints, pose channels, keyframe timeline, root track, IK preview against dummies (scale 0.6/1/2.2), export to `data/moves/*.js` format | the main authoring tool |
| M1.5 Moves: `idle`, `walk`, `run`, `jump`, `jab`, `cross`, `front_kick`, `hit_light` | |
| M1.6 `web/catalog.html` first version | |
**Exit**: 8 moves loop cleanly in the catalog page.
**Review**: Sridhar rates the 8 moves; feedback becomes authoring rules in `docs/ANIMATION_GUIDE.md`.

### M2 Physics + combat (3-4 days) — DONE 2026-10-15, reviewed
| Task | Output |
|---|---|
| M2.1 `physics.js`: bodies, gravity, friction, landing events, bounds, wall bounce, separation | |
| M2.2 Hurtboxes and swept hit tests | |
| M2.3 `deriveReach`, `requiredStartX`, aim point resolution, IK blend in hit windows | |
| M2.4 Hit resolution order, reactions, knockback, launch spin, `knockdown`, `get_up` | |
| M2.5 Outcomes: hit, whiff, blocked, parried, dodged | |
| M2.6 Moves: `hit_heavy`, `hit_launch`, `knockdown`, `get_up`, `block`, `parry`, `dodge_back`, `duck`, `stagger` | |
| M2.7 Hit connectivity test matrix (every attack × outcome × target scale) | |
**Exit**: a hard-coded fight between a 1.0 and a 2.2 character shows all five outcomes.

### M3 Clocks + director + validator (4-5 days) — DONE 2026-10-15, awaiting review. Schema v1 frozen.
| Task | Output |
|---|---|
| M3.1 `clock.js`: story/fx/video, slowmo ramps, hitstop, freeze, story→video mapping | |
| M3.2 `director.js`: four `at` forms, anchors, approach insertion, queue/interrupt, world beats dispatch | |
| M3.3 `sim.js` step loop (ARCHITECTURE 4, sim.js order) | |
| M3.4 `validator/schema.js` + exported JSON Schema | |
| M3.5 `validator/semantic.js` incl. prop tracking over time | |
| M3.6 Dry run, timeline report, closest-match suggestions | |
| M3.7 Bad-script corpus (30+ fixtures) | |
| M3.8 `tools/validate.mjs` CLI | |
**Exit**: Appendix A plays from JSON; validator returns errors and a timeline. **Script schema v1 frozen.**
**Review**: Sridhar reads validator output for 5 broken scripts and confirms it is understandable.

### M4 FX + camera + themes + overlays (4-5 days)
| Task | Output |
|---|---|
| M4.1 `fx.js` emit log, analytic particles, presets: impacts, block_spark, dust, shockwave, speed_lines | |
| M4.2 Stateful FX: afterimage, slash_arc, aura, glyphs, text_pop | |
| M4.3 `camera.js`: modes, spring smoothing, vertical framing, shake, zoom_punch, autoCamera | |
| M4.4 Overlays: speech bubbles, captions, HP bars, flash, fade, desaturate, vignette | |
| M4.5 Themes: `white_stage`, `dojo_dusk` with offscreen caching | |
| M4.6 Bundled fonts registered in Node and browser | |
**Exit**: a 15 s clip with impacts, shake, slowmo, hitstop and follow cam.
**Review**: Sridhar watches the clip ("does it feel punchy?").

### M5 Frame store + API + determinism (2 days)
| Task | Output |
|---|---|
| M5.1 `framestore.js` packed layout, accessors | |
| M5.2 `index.js` public API; `renderFrame` random access | |
| M5.3 Determinism test (SHA-256 per frame, two runs) | |
| M5.4 Golden frame tests (5 scripts × 10 frames) | |
**Exit**: determinism and golden tests pass.

### M6 Recorder + audio (2-3 days)
| Task | Output |
|---|---|
| M6.1 `record.mjs`: raw RGBA → ffmpeg with backpressure, flags `--from/--to/--frames-only/--hash` | |
| M6.2 `sfxgen.mjs` procedural SFX for all 23 keys | |
| M6.3 `mix.mjs`: event mix, pan, music decode/loop/duck/fade, limiter | |
| M6.4 Mux, thumbnail scoring, contact sheet, `meta.json` | |
**Exit**: `npm run record -- scripts/samples/showdown.json` produces `out/showdown/final.mp4` with sound.
**Review**: Sridhar watches the first full MP4.

### M7 Catalog completion (10-15 days, iterative)
| Batch | Moves |
|---|---|
| A Movement | dash, slide, backflip, frontflip, dodge_roll, side_step, land_roll |
| B Strikes | hook, uppercut, haymaker, roundhouse, axe_kick, sweep, elbow, knee, headbutt |
| C Specials | flying_kick, spinning_kick, flurry, ground_pound, energy_blast, charge_up, counter |
| D Armed + props | sword_slash, sword_thrust, sword_spin, sword_overhead, staff_swing, staff_spin, bat_swing, throw_prop, shoot, catch_weapon, pick_prop, drop_prop; all props |
| E Reactions + emotes | ko_fall, ko_spin, dizzy, taunt, wave, bow, flex, laugh, shrug, facepalm, victory, cower, dance_a, dance_b, point |
| F Utility | face, wait, teleport, spawn, despawn |
| G Themes + format | void_grid, rooftop_city, desert_noon, arena, snow_mountain; portrait framing and safe areas; accessories (headband, cape, hat, scarf) |
Each batch: author in the editor → catalog page review → fix → connectivity tests.
**Exit**: Sridhar signs off every move in `web/catalog.html`.

### M8 LLM loop (3-4 days)
| Task | Output |
|---|---|
| M8.1 `catalog.mjs` prompt tables | |
| M8.2 Prompt pack + 3 few-shot scripts | |
| M8.3 `generate.mjs`: ideation, structured-output script writing, repair loop, scoring, history, review queue | |
| M8.4 Optional vision critique with contact sheet | |
| M8.5 Batch metrics: first-pass and 3-attempt validity over 100 scripts | |
**Exit**: 10 videos generated unattended into `out/review_queue.json`.

### M9 Hardening (2-3 days)
Fuzz test (200 scripts), performance pass against spec 14.4, portrait acceptance, README and docs pass, full acceptance run (spec 20.2).

## Schedule summary

| Milestone | Days | Cumulative |
|---|---|---|
| M0 | 2-3 | 3 |
| M1 | 3-4 | 7 |
| M2 | 3-4 | 11 |
| M3 | 4-5 | 16 |
| M4 | 4-5 | 21 |
| M5 | 2 | 23 |
| M6 | 2-3 | 26 |
| M7 | 10-15 | 41 |
| M8 | 3-4 | 45 |
| M9 | 2-3 | 48 |

About 7-10 weeks of calendar time including review turnaround. A first watchable MP4 (end of M6) arrives after roughly 4-5 weeks.

**Fast path option**: if an early end-to-end video matters more than polish, do a thin M6 (recorder only, no audio) right after M3 with the 8 M1 moves. That gives a first MP4 in about 2.5 weeks.

## Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Moves look stiff or wrong | High: quality is the product | Editor in M1, review per batch, animation guide, anticipation/follow-through rules in data checks |
| IK aiming looks rubbery | Medium | Short blend windows, clamp reach, keep bend side; fall back to FK when the aim error is small |
| Canvas backend lacks a feature | Medium | M0 spike tests every Canvas 2D call the renderer uses; renderer avoids `ctx.filter` |
| Timing surprises (approach, queue drift) | Medium | Dry-run timeline in every validator result; warnings for drift |
| LLM validity under target | Medium | Structured output, catalog tables, few-shot scripts, repair with timeline |
| Render speed under target | Low | Background caching, particle budget, raw pipe; measure from M0 |
| Platform policy (repetitive content) | Medium | Variety scoring, history, human review queue |
| Asset licensing | Low | Procedural SFX by default; source logs for any added asset |
