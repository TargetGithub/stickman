# Architecture and Design

This document describes how the engine is built: module boundaries, interfaces, data shapes and the decisions behind them. Behavior and the script schema are defined in `../stickman-engine-spec.md` (the spec). Section references like "spec 8.3" point there.

## 1. Principles

1. **Pure core, thin edges.** `/engine` has no I/O, no globals beyond an engine instance, no dependencies. `/tools` and `/web` own files, processes, network and the canvas backend.
2. **Data over code.** Poses, moves, props, FX presets, themes, objects, faces, bodies, activities, moods and SFX keys live in `catalog/` (JSON, with a description for every entry). Adding one should not need a code change.
3. **Simulate once, render many.** All state changes happen in `sim.js`. The renderer only reads the frame store.
4. **One clock owner.** Only `clock.js` decides how far story, fx and video time advance.
5. **Explicit randomness.** Every module that needs randomness receives its own `rng` stream. No module creates one.
6. **Errors are product.** Validator messages are written for an LLM to act on: code, path, message, fix.

## 2. Module dependency graph

Arrows mean "imports". There are no cycles.

```
index.js ──► sim.js ──► world.js ──► actor.js ──► moves.js ──► pose.js ──► skeleton.js ──► math.js
   │           │           ├──► physics.js, combat.js
   │           ├──► presentation.js ──► fx.js, camera.js
   │           ├──► director.js
   │           │            │             │                                        ▲
   │           │            │             └──► expr.js                             │
   │           │            └──► combat.js (reach, required start x)               │
   │           ├──► clock.js                                                       │
   │           ├──► physics.js ────────────────────────────────────────────────────┤
   │           ├──► combat.js ──► skeleton.js (IK, hurtboxes)                      │
   │           ├──► props.js                                                       │
   │           ├──► fx.js                                                          │
   │           ├──► camera.js                                                      │
   │           ├──► audio_events.js                                                │
   │           └──► framestore.js                                                  │
   ├──► validator/index.js ──► schema.js, semantic.js, report.js, sim.js (dry run)
   └──► renderer/index.js ──► character.js, background.js, particles.js, overlays.js
                                   (renderer reads framestore.js accessors only)
config.js is imported by any module. catalog/ is passed in as a catalog object, never imported by /engine.
```

The catalog (`catalog/`, loaded by `catalog/index.js`) is injected through `createEngine({ catalog })`. This keeps the engine testable with tiny fixture catalogs and lets the editor hot-swap moves.

## 3. Core data shapes (JSDoc typedefs live in `engine/types.js`)

```js
/** @typedef {{x:number, y:number}} Vec */

/** @typedef {{ rot?:number, lean?:number, head?:number,
 *   lUA?:number, lFA?:number, rUA?:number, rFA?:number,
 *   lTH?:number, lSH?:number, rTH?:number, rSH?:number,
 *   dx?:number, dy?:number }} Pose */

/** @typedef {{ hip:Vec, shoulder:Vec, neckTop:Vec, head:Vec, center:Vec,
 *   lElbow:Vec, lHand:Vec, rElbow:Vec, rHand:Vec,
 *   lKnee:Vec, lFoot:Vec, rKnee:Vec, rFoot:Vec }} Joints */
// Packed order in the frame store (13 points → Float32Array(26)):
// hip, shoulder, neckTop, head, lElbow, lHand, rElbow, rHand, lKnee, lFoot, rKnee, rFoot, center

/** @typedef {{ name:string, category:string, duration:number, params:Object,
 *   needsProp:string|null, keys:Array, root:Array, hits:Array, events:Array,
 *   flags:Object, mouth?:string, chain?:string|null,
 *   derived?: { hits: Array<{ reach:number, contactHeight:number, tmid:number }> } }} MoveDef */

/** @typedef {{ id:string, body:Body, facing:1|-1, scale:number, hp:number,
 *   move:MoveState, queue:Array, prop:PropState|null, style:Object,
 *   springs:Object, snapOffset:number, alive:boolean }} Character */

/** @typedef {{ x:number, y:number, vx:number, vy:number, grounded:boolean,
 *   mass:number, launched:boolean, spin:number }} Body */

/** @typedef {{ def:MoveDef, t:number, speed:number, params:Object, beatId:string|null,
 *   anchorX:number, anchorY:number, lastRoot:{dx:number, dy:number},
 *   blendFrom:Pose|null, blendT:number, hitIds:Set<string>,
 *   target:string|null, outcome:string|null }} MoveState */

/** @typedef {{ code:string, path:string, message:string, fix?:string }} Issue */
```

## 4. Module interfaces

Signatures are the contract between milestones. Changing one needs a note in the change and an update here.

### math.js
```js
export const DEG: number;
export function lerp(a, b, u): number;
export function clamp(v, lo, hi): number;
export function vec(x, y): Vec;  add, sub, scale, len, norm, dist, rotate(v, rad)
export const easings: Record<string, (u:number)=>number>;
export function mulberry32(seed): () => number;          // [0, 1)
export function hash32(str): number;                      // FNV-1a
export function deriveRng(seed, name): () => number;      // mulberry32(seed ^ hash32(name))
export function valueNoise1D(rng): (t:number) => number;  // for shake; lattice drawn once from rng
```

### expr.js
```js
export function compileExpr(src: string, allowedNames: string[]): (params) => number; // throws ExprError
export function evalParam(value: number|string, params): number;
```

### skeleton.js
```js
export const BODY: { headR, neck, torso, upperArm, forearm, thigh, shin, lineWidth };
export function computeJoints(pose: Pose, root: Vec, facing, scale): Joints;
export function solveIK2(a: Vec, len1, len2, target: Vec, bendSign: 1|-1): { mid: Vec, end: Vec, reached: boolean };
export function bendSignOf(a: Vec, mid: Vec, end: Vec): 1|-1;
export function lowestPoint(j: Joints, scale): number;
export function packJoints(j: Joints, out: Float32Array): void;
export function unpackJoints(buf: Float32Array, offset?): Joints;
```

### pose.js
```js
export function fillPose(partial: Pose, base: Pose): Pose;
export function blendPose(a: Pose, b: Pose, u: number): Pose;
export function segmentAt(keys, t): number;
export function samplePoseKeys(preparedKeys, t): Pose;   // t normalized; a key's ease shapes the segment leaving it
```

### moves.js
```js
export const CATEGORIES, HIT_PARTS, SHAKES, MIN_WINDUP;
export function prepareCatalog(rawMoves, poses): Map<string, MoveDef>;   // validates (throws listing all problems), resolves poses
export function startMove(actor, def, opts:{ speed, params, beatId, target, outcome, blend }): void;
export function stepMove(actor, dt): { pose, rootDx, rootDy, openWindows, events, ended, snapHard, mouth };
//   rootDx: forward travel this tick; rootDy: current visual root offset (absolute)
//   events: moveEvent (sfx/fx from data), windowOpen
export function rootOffsetAt(def, t, params): { dx, dy };
```
Reach derivation (`deriveReach`) is added to the catalog in M2.

### actor.js
```js
export function createActor({ id, x, facing, scale, groundY }): Actor;
export function playMove(actor, name, moves, opts:{ queue?, speed?, params?, blend?, beatId? }): void;
export function stepActor(actor, dt, moves): { joints, events, openWindows };   // events add moveEnd
```
Owns the queue (chain → queue → idle) and ground contact (spec 5.4). From M3, `sim.js` drives actors and adds physics, combat and IK on top.

### props.js
```js
export function propTransform(joints, propData, propAngleDeg, facing, scale): { grip, butt, tip, angle };
export function propByKind(props, kind): propData | null;
```
Prop state lives on the actor: `actor.prop = { name, kind, data } | null`, `actor.propAngle`. `poseActor` adds `joints.propTip` (`withPropTip`). World keeps `groundProps`; thrown props are projectiles with an `item`. Drawing: `renderer/props.js` `drawProp(ctx, data, { butt, tip, grip }, scale)`. Frame store: `CHAR_STRIDE` 33 (adds prop index, prop angle, alpha) plus sparse per-frame `items`. Actors also carry `hidden`/`alpha` (visibility for teleport, spawn, despawn).

### physics.js
Bodies are actors (no separate Body object): `x, vx, vy, airY, airborne, launched, spin, spinRot`.
```js
export function stepBody(actor, dt, opts:{ stageWidth?, margin?, wallBounce? }): Event[];   // land, wall
export function launch(actor, vx, vy, spinDegPerSec): void;
export function separate(actors, skip(a, b) => boolean): Array<[actor, shift]>;
export function stepProjectiles(list, dt): Event[];   // ballistic only; hit tests in combat.js
```

### combat.js (geometry only)
```js
export const CHAINS, IK_RAMP, IK_RELEASE;
export function buildHurtboxes(joints, scale): Array<{ part, a, b, r }>;
export function segSegDist2(p1, q1, p2, q2): number;
export function sweptHit(prev, cur, radius, hurtboxes): hurtbox | null;
export function deriveReach(def): Array<{ tmid, reach, height }>;     // cached on def.derived
export function aimCandidates(joints, scale?, side?): Array<{ name, point }>;   // near-surface when side given
export function aimPointByName(joints, name, scale?, side?): Vec;
export function resolveAimPoint(attackerJoints, part, scale, targetJoints, aim, fkPoint, targetScale?, side?): { name, point };
export function ikWeight(t, hit): number;
export function applyAimIK(joints, part, aimPoint, weight, scale): Joints;
export function whiffGap(attacker, target): number;
export function requiredStartX(attacker, target, def, params, outcome, hitIndex?): number;  // spec 11.4
```

### hit_apply.js, projectiles.js (M7)
```js
// hit_apply.js — shared by melee and projectiles
export function applyHit(world, attacker, target, hit, kind, point, src:{ params, beatId, moveName, facing, ranged? }): Event[];
export function reactionFor(world, hit, damage): string;
export function inWindow(move, flag): value | null;
// projectiles.js
export function spawnProjectile(world, actor, spec, events): void;
export function stepWorldProjectiles(world, dt): Event[];
export function projectileArrival(actor, target, def, move): number;   // seconds, for defender timing
```
combat.js also exports `LEVERS` (one-bone aiming for elbows and knees), `limbReach`, `canReach` (W_REACH), `maxForward` (whiff spacing) and `MAX_ASSIST_LEAN`.

### world.js
```js
export const OUTCOMES;   // hit, whiff, blocked, parried, dodged
export function createWorld({ actors, moves, mode?, stageWidth? }): World;
export function command(world, actorId, moveName, opts:{ target?, outcome?, params?, speed?, queue?, beatId?, blend? }): void;
export function stepWorld(world, storyDt): Event[];
//   dt > 0: scheduled defender commands → advanceMove → attack setup (nudge, defender timing) → nudge
//           → stepBody (land → knockdown) → separate
//   always: poseActor → aim IK
//   dt > 0: resolve hits (spec 10.3) → hit, hitstop, anchor events
//   events: moveEvent, windowOpen, moveEnd, anchor(start|hit), hit, hitstop, land, wall, positionError
```
sim.js (M3) owns the clock: it passes storyDt = 0 during hitstop/freeze and handles `hitstop` events.

### clock.js
```js
export function createClock(): Clock;   // { frame, videoT, storyT, fxT, slowmo, hitstopLeft, freezeLeft, storyAt[], fxAt[] }
export function requestSlowmo(clock, { scale, duration, easeIn?, easeOut? }): void;   // newest wins
export function requestHitstop(clock, seconds): void;   // overlapping → longer
export function requestFreeze(clock, seconds): void;
export function slowmoFactor(clock): number;
export function timeEffectsActive(clock): boolean;
export function tick(clock): { storyDt, fxDt, videoDt };   // exactly one call per video frame
export function storyToVideo(clock, storyT): number;       // from the recorded storyAt[] mapping
```

### fx.js
```js
export const MAX_LIFE;   // 3 s
export function createFx(rng, presets, budget?): { log, trails, sustains, flashes, dropped, ... };
export function emitFx(fx, name, at: Vec, opts:{ dir, scale, actorId, part, color }, fxT): boolean;
export function stepFx(fx, fxDt, fxT, anchorOf(sustain) => Vec): void;   // sustained emitters (aura)
export function particleAt(record, fxT): { x, y, size, alpha, rot, vx, vy } | null;   // closed form
export function liveParticles(log, fxT): record[];                                      // binary search + window
```
Shake moved to camera.js.

### presentation.js
```js
export function createPresentation(script, catalog): { fx, cam, format, autoCamera, ... };
export function presentEvent(p, event, world, clock): void;   // hit/moveEvent/land/fx/world/camera → FX + camera
export function stepPresentation(p, world, clock, fxDt, videoDt): CameraState;
export function anchorPoint(actor, "head"|"hip"|"feet"|"point"): Vec;
```

### camera.js
```js
export function createCamera({ width, height, groundScreenRatio, stageWidth, groundY, rng }): Camera;
export function setCameraKey(cam, key, videoT): void;
export function cutCamera(cam): void;
export function addShake(cam, preset, fxT): void;
export function addZoomPunch(cam, amount, dur, videoT): void;
export function stepCamera(cam, videoDt, actors, videoT, fxT, { autoCamera }): { x, y, zoom, shakeX, shakeY };
export function cameraState(cam): CameraState;
export function toScreen(state, W, H, worldPoint): Vec;
```

### director.js
```js
export const ANCHORS, KO_MOVES, REVIVE_MOVES;
export function parseAt(at): { kind: "abs"|"after"|"with"|"on", t?, ref?, anchor?, delay? };
export function createDirector(script, moves): Director;
export function stepDirector(director, { world, clock, storyT, emit }): void;   // timers → due beats → waiting queues
export function onEvents(director, worldEvents, storyT): void;                  // anchors, windowOpen, moveEnd, positionError
export function directorIdle(director): boolean;
export function finishDirector(director): Issue[];                              // + E_SIM_UNRESOLVED
```
Beats whose `at` depends on an anchor get a due time when that anchor happens. Ties run in script order. The director keeps its own per-character waiting queues (not the actor queue) so approach is computed when the beat actually starts. Runtime problems are collected as validator issues (`E_SIM_*`, `W_QUEUE_DRIFT`).

### sim.js
```js
export function movesFor(catalog): Map<string, MoveDef>;   // prepared once per catalog object
export function simulate(script, catalog, opts:{ dryRun?, maxSeconds? }):
  { store, events, anchors, beats, issues, totalFrames, durationSec, clock, fx, format, meta };
export function frameAt(sim, n): FrameView;
```
Frame 0 is the initial state. Each later frame:
1. `tick(clock)` → `storyDt` (0 during hitstop/freeze, scaled during slowmo)
2. `stepDirector` (fires due beats → `command(world, …)`, world beats → clock / events)
3. `stepWorld(world, storyDt)` (moves, physics, aim IK, hits)
4. `hitstop` events → `requestHitstop`; all events logged with story and video time; `onEvents(director, …)`
5. `stepPresentation` (FX sustain, camera) → `writeFrame` into the packed store
The run ends after `meta.tail` seconds of quiet: director idle, everyone settled, no time effects.

### validator/index.js
```js
export function validate(script, catalog): { ok, errors, warnings, timeline, durationSec, stage };
export { jsonSchema, buildJsonSchema, WORLD_COMMANDS, formatIssues, formatTimeline };
```
Stages: `bundles.js` (a script's `bundles` against `catalog.bundles`, namespaced names, `catalog.bundleCombos`; first, whenever the pin list itself is well formed, so a missing bundle explains names the schema would reject) → `schema.js` (the script schemas; the JSON Schema subset checker is `check_value.js`) → `semantic.js` → dry run (`simulate` with `dryRun`) + pacing. Each stage stops the next on errors.

### framestore.js
```js
export const MOUTHS;
export function createStore(chars:[{ id, color, scale, maxHp }], estFrames): Store;   // grows by doubling
export function writeFrame(store, actors, clock, camState): void;
export function frameView(store, n, fps?): { storyT, fxT, videoT, cam, chars[] };   // zero-copy joints
export function jointsAt(store, n, charIndex): Float32Array;
export function storeBytes(store): number;
```

### audio_events.js
```js
export function collectAudioEvents(sim): Array<{ t, sfx, volume, pan, line? }>;   // video seconds; pan from screen x; line: the beat id of a babble syllable or narration chime
export function collectMusicCues(sim): Array<{ t, cue, volume }>;
```

### renderer/character.js
```js
export function drawCharacter(ctx, joints, style:{ color, scale, facing, mouth?, outline?, outlineColor?, farBrightness?, alpha? }): void;
export function shade(hex, k): string;
```

### renderer/index.js
```js
export function createRenderer(catalog, sim): Renderer;   // sim = simulate() result (store, events, fx, format, meta)
export function renderFrame(renderer, ctx, n): void;      // pure in (sim, n); random access
export function frameCount(renderer): number;
```
Modules: `background.js` (registry of procedural layer kinds with parallax; geometry generated once per theme from the seeded `bg` stream; animated kinds use fx time), `accessories.js` (headband, scarf, cape, hat from frame history; squash), `particles.js` (analytic particles, glyphs), `overlays.js` (post-world desaturate and slow-motion vignette, then bubbles, HP bars, text pops, captions, flashes, fades), `character.js`. Fonts are referenced by family name ("Bangers", "Inter"); the host registers them (Node: `tools/lib/canvas.mjs`; browser: `@font-face`). Background layers are drawn as shapes each frame (no offscreen cache yet): render cost is ~10 ms/frame at 1080p, so caching was not needed.



### index.js (public)
See spec 15.1. `createEngine({ catalog })` validates on `load` (including the dry run), then simulates once more with the frame store; everything after that is read-only.

### catalog/index.js (outside /engine; CATALOG_SPEC 5)
```js
export const MOVE_FILES: string[];                         // moves/<file>.json, in catalog order
export const ENGINE_FILES: string[];                       // the authored files the engine catalog is built from
export function assembleCatalog(files): Catalog;           // path → parsed JSON; today's catalog object shape
export function loadCatalog(read): Catalog | Promise<Catalog>; // read(path) → JSON or a promise; no I/O of its own
export function loadCatalogSync(root?): Catalog;           // Node only
export const catalog: Catalog;                             // the default catalog (fs in Node, fetch in the browser)
```
Description and tag fields pass through; prepared moves (`prepareCatalog`) drop them.

## 5. Error code families

| Prefix | Stage | Examples |
|---|---|---|
| `E_SCHEMA_*` | schema | `E_SCHEMA_TYPE`, `E_SCHEMA_REQUIRED`, `E_SCHEMA_RANGE`, `E_SCHEMA_ENUM`, `E_SCHEMA_SIZE` |
| `E_REF_*` | semantic | `E_REF_CHARACTER`, `E_REF_BEAT`, `E_REF_CYCLE`, `E_REF_ANCHOR` |
| `E_MOVE_*` | semantic | `E_MOVE_UNKNOWN`, `E_MOVE_PARAM`, `E_MOVE_NEEDS_PROP`, `E_MOVE_TARGET` |
| `E_TEXT_*` | semantic | `E_TEXT_LENGTH`, `E_TEXT_GLYPH`, `E_TEXT_BLOCKED` |
| `E_SIM_*` | dry run | `E_SIM_UNREACHABLE`, `E_SIM_DURATION`, `E_SIM_DEAD_ACTOR` |
| `W_*` | any | `W_QUEUE_DRIFT`, `W_PACING_GAP`, `W_NO_HITSTOP`, `W_PARTICLE_BUDGET`, `W_CONTRAST`, `W_OUTCOME_IGNORED` |

## 6. Testing strategy

- `node --test tests/` runs everything; no test framework dependency.
- Unit tests sit next to their topic in `tests/unit/<module>.test.js`, table-driven.
- Validator corpus: `tests/fixtures/bad/*.json` with a sibling `*.expect.json` listing error codes.
- Golden frames: `tests/golden/<script>/<frame>.png`, regenerated only with `npm run golden:update` and reviewed by a human.
- Determinism and render tests need the canvas backend and are tagged `integration`; unit tests never need it.

## 7. Decision records

### ADR-001 Record in Node, not in a headless browser
- **Context**: browser canvas capture costs 40-100 ms per frame and adds Playwright and GPU nondeterminism.
- **Decision**: render frames in Node with a Skia canvas and pipe raw RGBA to ffmpeg. The browser is for preview and authoring only.
- **Consequences**: two canvas backends to support (browser and Node); pixel parity between them is not required.
- **Result (M0.7)**: `@napi-rs/canvas` chosen; see `docs/benchmarks.md`. Tools load it through `tools/lib/canvas.mjs`. `skia-canvas` removed in M6.

### ADR-002 Three clocks
- **Context**: v1.0 contradicted itself on slowmo and did not say what time beats use.
- **Decision**: story, fx and video clocks (spec 6). One sim step per video frame with fractional `dt`.
- **Consequences**: anchors and audio need a story→video mapping, which `clock.js` records.

### ADR-003 Analytic particles
- **Context**: storing 2,000 particles per frame for 10,800 frames is over 1 GB.
- **Decision**: particles are closed-form functions of an emit record and fx time.
- **Consequences**: no particle collisions in v1. Frame store stays about 20 MB.

### ADR-004 Derived reach and outcomes
- **Context**: fixed `range` conflicted with root travel, and choreography could not show misses.
- **Decision**: reach is computed from move data; attacks carry an `outcome`; positioning uses one formula.
- **Consequences**: catalog load does a small FK pass per attack (cached).

### ADR-005 IK only during hit windows
- **Context**: full IK authoring is heavy; fixed angles cannot hit other-size targets.
- **Decision**: keep FK authoring; blend the hitting limb to analytic 2-bone IK around hit windows.
- **Consequences**: the editor previews IK against dummies of several scales.

### ADR-006 Catalog injection
- **Decision**: `/engine` never imports `catalog/` (formerly `/data`); the catalog is passed to `createEngine`.
- **Consequences**: tests use tiny fixture catalogs; the editor can swap moves live. A test scans `/engine` for imports of `catalog/` or `data/`.

### ADR-007 Procedural SFX first
- **Decision**: `sfxgen.mjs` makes every required sound so the pipeline needs no downloads or licenses. Real assets override them later.

### ADR-008 World layer between actors and sim
- **Context**: physics, aim IK, hit resolution and outcome scheduling need one place that sees all actors, and M2 needed it before the clock and director exist.
- **Decision**: `world.js` runs one story tick for all actors. `sim.js` (M3) wraps it with clocks, director, FX, camera and the frame store. Hitstop is reported as an event; the caller passes `dt = 0`.
- **Consequences**: combat.js stays pure geometry; world.js is the only module that mutates several actors at once.

### ADR-009 Choreographed contact is positioned, aimed, then guaranteed
- **Decision**: `requiredStartX` + a nudge spread over the windup put the authored contact point on a near-surface aim point; IK corrects height; a `hit`/`blocked`/`parried` outcome applies at the window middle even if geometry is a few px off. Whiffs start `whiffGap` further back and aim short; dodges lock the aim where the target was.
- **Consequences**: verified by the connectivity matrix in `tests/unit/world.test.js` (attack × outcome × 5 size pairings).

### ADR-010 One schema for validation and for the LLM
- **Decision**: the script schema is a JSON Schema object (`engine/validator/schema.js`). A small checker validates scripts against it; `buildJsonSchema(catalog)` exports it with move/theme/prop enums for structured output. Checker-only keywords (`x-formMessage`) are stripped on export.
- **Consequences**: the LLM and the validator cannot drift apart. The v1 snapshot lives in `docs/schema/script-v1.schema.json`; any change to it must stay backward-compatible (S1 widened duration to 900 s and beats to 600).

### ADR-011 Director-owned queues
- **Decision**: beats for busy characters wait in the director, not in the actor's move queue.
- **Consequences**: `approach` is planned when the beat actually starts, and queue drift can be measured and reported.

### ADR-012 Overlays drawn from the event log
- **Decision**: speech bubbles, captions, text pops, flashes, fades and desaturate are computed at render time from logged events and the frame's video time; only the camera (stateful smoothing) is stored per frame.
- **Consequences**: frames stay small; overlay styling can change without re-simulating; random access is preserved.

## 8. Tools layer (M6)

| Module | Role |
|---|---|
| `tools/record.mjs` | script → `out/<slug>/` (final.mp4, thumb.png, contact_sheet.png, script.json, meta.json) |
| `tools/sfxgen.mjs`, `tools/lib/synth.mjs` | deterministic procedural SFX for every required key |
| `tools/lib/mixer.mjs` | pure mixing: pan, events, music cues and ducking, lookahead limiter |
| `tools/lib/sfx_library.mjs` | override/variant lookup in `assets/sfx`, generated fallback, music lookup |
| `tools/lib/prompt_tables.mjs` | catalog → prompt tables (moves, world commands, fx, props, themes); used by `tools/catalog.mjs` |
| `tools/lib/catalog_files.mjs` | reads the whole `catalog/` folder (engine catalog, docs, presets, examples, schemas); the engine's validator codes |
| `tools/lib/catalog_check.mjs`, `catalog_harness.mjs` | catalog checks: schemas, descriptions, references, move checks on every body plan, engine vocabulary coverage, every example validated in a tiny story |
| `tools/lib/catalog_build.mjs` + `tools/catalog_build.mjs` | `npm run catalog:build`: checks, then `catalog/generated/` (engine vocabulary, full catalog, context pack) and `catalog/manifest.json`; deterministic |
| `tools/lib/context_pack.mjs` | the AI context pack (Markdown tables, budgets, core and reference tiers), rendered with the prompt table helpers |
| `tools/lib/lean_prompts.mjs` | lean copy-paste prompts for chat projects with the pack: the pack line and version, files to read, reminders, the full prompts' task text (`manual.mjs --lean`) |
| `tools/lib/catalog_write.mjs` | adds a reviewed draft to `catalog/` (`draft.mjs --write`, `svg_import.mjs --write`) |
| `tools/lib/json_format.mjs`, `zip.mjs` | stable JSON formatting for catalog files; a small zip writer for `catalog:pack` |
| `tools/lib/move_check.mjs` | `checkMove(def, catalog, { draft, plans })` and `runMove(def, moves, catalog, opts)`: the move checks shared by drafts, the catalog build and bundles (browser-safe) |
| `tools/lib/bundle_args.mjs` | `--bundle <dir\|zip>` for validate, record, generate and manual: check, merge (`tools/lib/bundle/load.mjs` `catalogWithBundles`, with the combination check), credits for `meta.json`; the player uses `web/lib/bundles.js` |
| `tools/lib/bundle_store.mjs` | the Node bundle store: `bundles/<id>/<hash>/` (or `$STICKMAN_BUNDLES`), served at `/bundles/`; the browser keeps bundles in IndexedDB (`web/lib/bundle_store.js`) |
| `tools/lib/bundle/render.mjs` | `renderChecks` (step 12 pixel hashes in two orders, step 13 render smoke and frame budget) and `contactSheet`, with a canvas and a clock passed in |
| `tools/lib/bundle/` + `tools/bundle.mjs` | catalog bundles (CATALOG_BUNDLE_SPEC): `checkBundle(entries, ctx)` runs steps 1-11 and 14 (pure, browser-safe: strict JSON and JCS, SHA-256, zip reading through an inflate adapter); `bundle.mjs check` and `pack`; Node adapters in `tools/lib/bundle_node.mjs`; `catalog/merge.js` `mergeBundles(base, bundles)` |
| `tools/catalog_media.mjs` | `npm run catalog:media`: music mood clips for the showcase (`out/catalog_media/`) |
| `web/showcase.html`, `web/showcase.js`, `web/lib/showcase_data.js`, `showcase_scripts.js`, `scaled_ctx.js` | the showcase page: cards from `catalog/generated/catalog.json`, preview stories run through the public engine, drawn at thumbnail size (a context that scales `setTransform`), lazy and paused off-screen |
| `tools/lib/prompt_pack.mjs` | assembles `prompts/*.md` + tables + examples into byte-stable system prompts; builds user turns |
| `tools/lib/llm_schema.mjs` | script schema → structured-output subset; ideation/critique/metadata schemas |
| `tools/lib/llm/index.mjs` | provider-neutral core: one request shape, schema downgrade, typed failures (refusal, max_tokens, parse), usage and cost; `loadProvider` from `tools/llm.config.json` |
| `tools/lib/llm/anthropic.mjs` | Claude API adapter (official SDK, loaded only when used): cached system block, `output_config`, refusal fallbacks |
| `tools/lib/llm/openai_compat.mjs` | any `/chat/completions` endpoint via fetch (OpenAI, Gemini, OpenRouter, Groq, Ollama, LM Studio, vLLM ...): `response_format` ladder json_schema → json_object → off, image parts as data URLs |
| `tools/lib/llm/mock.mjs` | offline adapter (tests, `--mock`) |
| `tools/lib/manual.mjs` + `tools/manual.mjs` | copy-paste workflow for chat apps: self-contained prompts, reply checking, fix prompts; no network |
| `tools/lib/pipeline.mjs` | one premise: write → validate → repair ladder → score/improve → critique/revise → metadata (provider-agnostic) |
| `tools/lib/scoring.mjs`, `history.mjs` | quality score and feedback; history avoid list and review queue |
| `tools/lib/wav.mjs` | WAV writing, ffmpeg-based decoding of any audio file |
| `tools/lib/encode.mjs` | raw RGBA → ffmpeg → H.264 with backpressure |
| `tools/lib/review_images.mjs` | thumbnail choice and contact sheets via the public API |

### ADR-013 Reach assist and honest reach warnings
- **Context**: scale contrast (spec 19.8) means giants strike small fighters; fixed poses plus arm IK stopped ~30 px short, and the matrix tolerance hid it.
- **Decision**: at runtime the attacker leans into the strike (up to 40°) until the aim point is in reach; the dry run checks reach (with that lean and with jump height) and warns `W_REACH` when contact is physically impossible, instead of faking it.
- **Consequences**: big-vs-small fights look right; impossible choices (a giant's headbutt on a small fighter) reach the LLM as a warning with a fix.

## 9. Story engine (v2) decisions

Frozen in S0 (2026-10-16). Behavior is in [STORY_SPEC.md](STORY_SPEC.md); the schema draft is `docs/schema/script-v2.schema.json`, generated from `engine/validator/schema_v2.js` (`node tools/validate.mjs --schema-v2`).

### Schema v2 modules (S0; wired into `validate()` in S1.1)
```js
// validator/schema_v2.js
export const jsonSchemaV2;          // same JSON Schema subset as v1; $defs carries enums, macro params, anchors
export function schemaV2For(catalog): object;   // jsonSchemaV2 with the catalog's mood and activity names (B1.2)
// validator/macro_params.js
export const MACRO_PARAMS;          // macro name → params schema (beat and scene macros)
export function macroParamsFor(catalog): object;  // MACRO_PARAMS with the catalog's activity names
export const MACRO_ANCHORS;         // beat macro → anchor names ("line<N>" = line1, line2, ...)
// validator/v2_names.js
export const ID, COLOR, V2_ENUMS, DEST, OBJECT_BEHAVIORS, OBJECT_KINDS,
  V2_WORLD_COMMANDS, V2_CHARACTER_COMMANDS, DEFEAT_STYLES_BY_AUDIENCE, V2_FX;
export function catalogNames(catalog): { mood, activity, frozen };   // musicMoods keys, activityNames; frozen lists as fallback
// validator/check_value.js (re-exported by schema.js)
export function checkValue(value, schema, path?, { schemas?, root? }?): Issue[];   // checker for any schema in the subset;
//   "<file>#/$defs/x" refs resolve in opts.schemas (no I/O), "#/$defs/x" in root (default: schema)
export function exportSchema(schema): object;                // deep copy without x-* keywords
```
The checker gains one checker-only keyword, `x-select: "<key>"` on a `oneOf`: the presence of that key picks the branch, so a macro beat or an action beat gets precise messages instead of a generic form error. v1 does not use it, so v1 messages are unchanged.

For catalog bundles (CATALOG_BUNDLE_SPEC 4.1, B1.1) the checker also implements `$ref`/`$defs`, `propertyNames` (key issues are reported at the key's path), `minProperties`/`maxProperties` (`E_SCHEMA_SIZE`), `uniqueItems` (`E_REF_DUPLICATE` on the repeat) and the checker-only `x-discriminator: "<field>"` on a `oneOf`: the branch whose `properties[field].const` equals the value's field is the one checked; an unknown value is `E_SCHEMA_ENUM` at that field. Mood and activity names come from the catalog (B1.2): `validate()` checks v2 scripts with `schemaV2For(catalog)`, macro params with `macroParamsFor(catalog)` and world commands with `worldCommandsV2For(catalog)`; all three return the prebuilt objects when the catalog has exactly the frozen names.

### Scenes and story modules (S1)
```js
// story/normalize.js
export function normalize(script): Story;                 // v1 → one legacy scene "main"; v2 → { ...script, legacy: false }
export function resolveLocation(story, scene, catalog): Location | null;   // location id, else a theme name
export function sceneLook(scene, location): { time, weather, ambience };
export function flatScene(story, i, catalog): { meta, characters, camera, beats, scene, location, look, hidden:Set };
export function transitionInto(story, i): Transition | null;   // next.transitionIn ?? prev.transitionOut
export function transitionDuration(t): number;                // seconds of hold frames (0 for cut)
// story/timing.js
export const CARD_COMMANDS; export function cardKind(cmd), cardDuration(cmd, params), narrateDuration(params);
// framestore.js (segments)
export function createStore(chars | null, estFrames, propNames): Store;   // null: start empty
export function startScene(store, chars, { scene }, estFrames): void;
export function addHold(store, frames, info): void;            // transition frames, no per-frame data
export function segmentIndexAt(store, n), segmentLength(store, i), storyTimeAt(store, n);
export function frameView(store, n, fps): SceneFrame | HoldFrame;   // hold: { hold, u, prevFrame, nextFrame, chars: [] }
// clock.js
export function holdTick(clock): void;                         // a frame with story and fx clocks held
// director.js
export function createDirector(script, moves, { t0, prefix, tag, dead }?): Director;
// presentation.js
export function createPresentation(script, catalog, { suffix, fx }?): Presentation;   // per-scene streams, shared fx log
// sim.js: simulate(...) also returns { story, scenes: [{ index, id, theme, stageWidth, look, location, set,
//   startFrame, frames, storyStart, fxStart, fxEnd, fxT0, characters }] }
// validator/story.js
export function checkStory(story, catalog, moves): Issue[];   // story checks + v1 checks per flat scene
export function softWordIssues(text, path, catalog, audience): Issue[];
// validator/semantic.js: checkSemantics(script, catalog, moves, { worldCommands }?); WORLD_COMMANDS_V2;
//   worldCommandsV2For(catalog) (set_music moods and activity names from the catalog)
// renderer: transitions.js drawHold; cards.js drawCard, drawNarration; grade.js gradeState, drawGrade;
//   objects.js drawSetPieces; background_kinds.js STORY_KINDS; layer_util.js (shared layer helpers)
// index.js: createEngine({ catalog, createCanvas? }); engine.getScenes()
```
- Validation of a v2 script: `E_VERSION` check → v2 schema (`checkValue` + authored-beat limit) → `checkStory` → dry run → `W_STORY_SHORT`/`W_FIGHT_SHORT` → pacing (`W_NO_IMPACT` only for fight videos).
- Each scene gets new actors (hp and held prop carried over), a new world, director, camera and presentation; the fx log is shared, with each scene's range recorded so the renderer never draws another scene's particles, trails, flashes, captions or fades.
- Hold frames call back into the scene renderer for the neighbouring frames; dissolves need a scratch canvas from the host (`createCanvas`), and fall back to a fade without one.
- Cards as world commands request a freeze for their duration; their `end` anchor fires when the hold ends.

### Faces, dialogue and speech (S2)
```js
// story/faces.js
export const HURT_SECONDS;                                  // 0.4
export function faceEvents(world, events, storyT): void;    // hits → hurtUntil
export function shownFace(actor, dead, storyT): string|null; // dizzy > hurt > move face > determined > base
export function updateFaces(world, dead, storyT): void;     // sets actor.shownFace each frame
// story/speech.js
export function readingTime(text): number;                  // max(1.5, 1.2 + 0.06 × chars)
export function voiceOf(voice): { pitch, speed, timbre };
export function syllables({ text, dur, bubble, actor, at }, voice, seed): [{ t, dur, vowel, semi, gain }];
export function mouthOpenAt(syllables, age): boolean;
// renderer/face.js: drawFace(ctx, center, r, { u, f }, faceData, { blink, talking, gaze, detail, neutral, t }); blinkAt(seed, id, t)
// renderer/face_state.js: faceStyle(renderer, char, chars, sceneView, frame) → { face, faceOpts }
// renderer/bubbles.js: BUBBLE_KINDS.{ think, shout, whisper }(ctx, text, head, W, H, scale, safe) → rect; nameTag(...)
// tools/lib/speech.mjs: isVoiceKey(key), synthVoice("voice:<timbre>:<vowel>:<semi>") → Float32Array (48 kHz mono)
```
- Actors get `face` (base), `shownFace` and `hurtUntil` (story scripts only). `writeFrame` stores the face index in slot 33 (`CHAR_STRIDE` 34; -1 = no face, the v1 look).
- The director sets `actor.face` from a beat's `face` when the beat starts, and emits `say` events with `bubble` and a reading-time `dur` (story scripts).
- `collectAudioEvents` adds one `voice:*` event per syllable and a `narrate_chime` per narration for story scripts; `createSfxLibrary().sampleFor` synthesizes `voice:*` keys on demand.
- `tools/face_sheet.mjs` renders every face at three on-screen sizes (review sheet).

### Body plans and appearance (S3)
```js
// skeleton.js
export const BODY;                                          // the stickman (and the stickman plan's dims object)
export const dimsOf = (actorOrChar) => dims;                // its plan's dims or BODY
export function strideOf(dims): number;                     // (thigh + shin) / 94
export function withPosture(pose, posture, w?): Pose;       // the elder's stoop at weight w
export function computeJoints(pose, root, facing, scale, dims = BODY): Joints;
export function lowestPoint(joints, scale, dims = BODY): number;
// combat.js: fkJoints, limbReach, buildHurtboxes, aimCandidates, aimPointByName, applyAimIK, maxForward
//   take dims (default BODY); resolveAimPoint(..., rootShift, dims, targetDims); deriveReach(def, dims)
//   caches per dims object; whiffGap/requiredStartX/canReach read actor dims; motionScale(actor) = scale × stride
// story/bodies.js
export function bodyPlan(catalog, name): { dims, stride, posture, plan };   // actor fields; one dims object per plan
// renderer: bodies.js drawTorso, drawOutfit; appearance.js drawHair, drawHairBack, drawMask, drawEyepatch,
//   drawHeadTop, drawBowtie, drawBackpack; looks.js lookFor(catalog, cast), lookAt(look, changes, t)
// validator/story.js: castLookIssues(cast, path, catalog) → E_BODY_UNKNOWN, E_APPEARANCE
```
- Move state keeps `scale` (heights) and `strideScale` (forward root motion). Actors with a posture keep `postureW`, eased toward 0 during attack moves.
- `drawCharacter` style gains `dims`, `draw`, `torsoWidth` and `look`; draw order: backpack, far limbs, torso (filled or stroked), outfit (or the belly patch), bowtie, head (far horn, ponytail, head, mask, face, hair, eyepatch, moustache/turban/horns/sprout/flower, antenna/crown), near leg, near arm. The renderer draws the far mitten before the character and the near mitten and the bracelet after it (`accessories_more.js` `drawLookBehind`/`drawLookFront`).
- Tools: `tools/body_sheet.mjs` (plans × moves review sheet); the catalog page and the pose viewer have a body-plan selector.

### Objects (S4)
```js
// objects.js
export const GRAVITY, MOVING;                               // MOVING = ["ball", "floater", "vehicle"] (frame items)
export function holdableData(catalog, name), holdableNames(catalog);   // v1 props first, then story holdables
export function createObjects(setPieces, { catalog, seed, sceneId, groundY, stageWidth }): Objects;
export function spawnObject(objs, { object, id, x, y, layer, facing, state, vx, vy }, t): Event[];
export function removeObject(objs, id), setObject(objs, id, params): Event[];
export function stepObjects(objs, dt, t): Event[];          // balls (dt), floaters (closed form in t), vehicles
export function useHeld(objs, actor, tipPoint, t): Event[]; // the use move
export function objectsBusy(objs): boolean;                 // keeps a scene from ending
export function movingItems(objs, groundY): Item[];
// Event: { type: "object", what: spawn|remove|state|break|launch|bounce|pop|drive|stop|offstage|use, id, kind, x, y, fx?, sfx?, volume? }
// renderer/objects.js: OBJECT_SHAPES(), staticObjectsAt(catalog, set, objectEvents, t), drawSetPieces, drawMovingObjects
// renderer/object_shapes.js: SHAPES (procedural object drawings)
// renderer/paths.js: drawPaths(ctx, paths, colors); renderer/props.js: PROP_SHAPES
```
- `world.objects` (story scenes) and `world.onMoveEvent(actor, event, events)` (a hook in `stepWorld`, used for the `use` event); the sim steps objects after the world, keeps riders on their vehicle (`actor.riding`) and adds moving items to the frame. The director dispatches `spawn_object`, `remove_object`, `set_object` and sets `actor.riding` on `ride`/`dismount`.
- Presentation turns object events into effects; `collectAudioEvents` adds their sounds. `E_SIM_OBJECT_OFFSTAGE` comes from "offstage" events.
- Tools: `tools/lib/svg.mjs` + `tools/svg_import.mjs` (SVG → path data), `tools/lib/draft.mjs` + `tools/draft.mjs` (LLM drafts with checks and a review sheet).

### Slice-of-life moves and seats (S5 batch 1)
- `moves.js` `CATEGORIES` adds `life` and `interaction`. `objects.js` `holdableProps(catalog)` is the prop table the move loader resolves `needsProp` against (v1 props first); every `prepareCatalog` call in the engine, tools, page and tests passes it.
- Seats: the director's `walkToSeat` walks a sitting character to the nearest free slot of a seat, then sets `actor.seatY`, `seatId`, `seatSlot`; `poseActor` places the hip at the seat height and `displayPose` applies the seated leg mask. The `unseat` move event (and movement or attack moves) clears it.
- Tools: `tools/lib/filmstrip.mjs` `moveSheet(defs, out, { plans, frames })` (used by `tools/draft.mjs move` and `tools/move_sheet.mjs`); `tools/lib/move_check.mjs` `checkMove(def, catalog)` (re-exported by `draft.mjs`).

### Paired moves (S5 batch 2)
```js
// story/pairs.js
pairDistance(lead, partner, pair) -> number       // gap × average arm reach + room for filled torsos
pairStartX(lead, partner, pair) -> number
startPair(world, lead, partner, def, opts, command) // facings, both moves, world.pairs record
updatePairs(world) -> events                      // after stepWorld: attachments, then IK contacts
pairMoveEvent(world, actor, e, events)            // `detach` and `give` move events
// story/pair_beats.js
pairGate({ director, beat, actor, def, ctx, issue, command, isFree }) -> boolean // true = wait
```
- Move defs keep `pair` (`prepareMove`). The director calls `pairGate` before a paired move (queue on a busy partner, walk to `pairStartX`, `E_SIM_PARTNER_UNREACHABLE`), then `startPair`. `actor.pairedWith` makes `world.js` skip separation for the pair. Separation is also skipped between a character on an approach (a movement move with a `target`, which only the director sets) and anyone but its target, so bystanders never block it (spec 9.1 rule 6).
- Attachments set `partner.carryTarget` (hip position; `poseActor` places the partner there) or pin `partner.x` (`mode: "x"`). Contacts reuse `applyAimIK` from `combat.js`.
- `sim.js` `v1MoveNames(catalog)`: the moves a v1 script may use (no `interaction` or `defeat` moves (`moves.js` `STORY_ONLY`), none needing a story holdable). The v1 schema export, the prompt tables and the v1 semantic checks use it, so v1 stays frozen.

### Defeat styles, activities and impact words (S5 batch 3)
```js
// story/defeat.js
defeatMoveEvent(world, actor, e, events, t)   // move events: fade { to, dur }, reform, cage
defeatStart(world, actor, def, opts) -> opts  // before a defeat move: actor.defeatFace; flee side + distance
updateDefeats(world, events, t)               // after each step: opacity fades (to 0 hides), flee fade-out
// story/activities.js
startActivity(world, beat, params, t, catalog) -> events | null   // the `activity` world command
updateActivities(world, t) -> events          // setup → run (loop runner) → ending → activityEnd
stopActivity(world, act, t) -> events         // an interrupting beat
activityMoveEvent(world, actor, e, events, t) // `contact` events of rally players
// story/rally.js (used by activities.js only)
rallyStart / rallyStep / rallyContact / rallyRelease
// story/scene_beats.js (split from director.js)
OBJECT_COMMANDS, walkToSeat(director, beat, actor, ctx, command)
// objects.js
popNear(objs, point, reach, groundY) -> events  // the poke move pops the nearest bubble
// validator/story_s5.js
activityIssues(scene, si, story, catalog), defeatIssues(story)
```
- Data: `catalog/moves/defeat.json` (category `defeat`: faint, vanish, ghost, captured, flee, return), `catalog/story/activities.json` (`catalog.activities`), three ball moves in `catalog/moves/life.json`, FX presets `sparkle`, `sparkle_rise`, `tears`, `rope_bind`, `cage_drop`, `confetti`, `halo` and the internal `pop_*` words (`internal: true` keeps them out of `catalog.fxNames`), sounds `sparkle`, `clang`, `ball_kick`.
- The director counts `flags.defeat` moves as KOs (`dead`), `return` revives, and `isFree` is false while `actor.activity` is set. The `activity` world command has no timer: its `end` anchor comes from the `activityEnd` event.
- Activity players are commanded without a beat id (no anchors); balls held by a player (`o.held`) skip object physics and follow the holder's racket tip, hands or foot.
- `presentation.js`: with `opts.kids` (v2 stories with audience `kids`) a hit emits the next `pop_*` preset (word glyph particles; `fx.js` copies a layer's `text`, `renderer/particles.js` draws it).
- `faces.js`: a defeated character with `actor.defeatFace` shows it instead of the knocked-out face.

### Story compiler, macros, story camera, extras and layers (S6)
```js
// story/compile.js (pure; no I/O; uses the injected catalog and prepared moves)
compileStory(story, catalog, moves) -> { story, expansions }  // macros → beats; idempotent (story.compiled)
ejectMacro(story, macroId, catalog, moves) -> script | null   // one macro written back as beats (or scenes)
plainScript(compiled) -> script                               // without path / expandedFrom / srcPath
// builder context (one per macro beat): id, rng (compile:<macroId>), catalog, moves, story, scene, castById,
//   pos (id → estimated x), placement(id) (mutable scene placement), present(id), addSet(piece),
//   add(beat), after(ref, beat, delay), with(ref, beat, delay)
// story/macros/index.js   BEAT_MACROS: (ctx, params) -> { anchors: { start, end, ...: "beatId.anchor" } }
//   basic.js       dialogue, activity, enter, exit, walk_together, travel; splitText(text), destX(ctx, who, to)
//   group.js       gauntlet, brawl, chase
//   sequences.js   fight, defeat, grief
//   fight_core.js  addFight(ctx, o) -> { first, last, finisher, ko }; canHit(ctx, a, b, move) (canReach on probe actors)
//   pools.js       attackPool(ctx, id) -> { light, heavy, launchers }; finisherFor; heldKind; emotes
//   scenes.js      SCENE_MACROS: fight_card, montage: (ctx, params) -> scenes
// story/destinations.js
TO_MOVES; destinationX(world, actor, to, move); startTo(world, actor, beat, opts, t, paired) -> opts; updateExits(world, events, t)
// story/extras.js
planExtras(scene, location, catalog, seed, stageWidth) -> extras[]; EXTRA_MOVES
// camera_story.js
storyFraming(cam, actors, key, { bounds, fitZoom }) -> { x, zoom, y?, smoothY?, maxZoom? } | null
shotKey(params); createStoryAuto(t0); storyAutoEvent(auto, e, t); storyAutoKey(auto, actors, t) -> key | null
// renderer/extras.js
drawExtras(ctx, r, sceneView, frame, layer); withLayer(ctx, layer, x, draw); LAYER_LOOK
// validator/macros.js
macroIssues(story, catalog, moves) -> issues   // before compiling: E_MACRO_UNKNOWN, E_MACRO_PARAM, E_REF_ANCHOR, `to`
// index.js (public)
compileScript(script, catalog) -> { script, expansions }; ejectMacro(script, macroId, catalog)
```
- **Load order** (ADR-014): normalize → schema → `macroIssues` → compile → `checkStory` on the compiled story → dry run. `validate` maps compiled issue paths back to what the author wrote (`srcPath` on scenes, `path` on beats; issues inside an expansion name the macro). `simulate` compiles too, so every caller (record, player, golden tests) sees the same beats.
- **Ordering and ids:** a macro's beats replace it in place in the scene's beat list; the first beat takes the macro's `at`, the rest chain on each other (`after`/`with`/`on`). Generated ids are `<macroId>_<n>`; a macro without an id is `<macro><beat index>`. References to a macro are rewritten through its anchor map (`after` → `end`, `with` → `start`, `on` → the named anchor).
- **Fights:** every attack has `"approach": "run"`. Outcomes are weighted toward the winner, damage is budgeted (`budget()`: the loser runs down toward the finisher, the winner keeps a share by style), breathers keep runs of attacks at 6 or fewer, and pauses follow hits, dodges and parries so the next attacker is free. Pools leave out head strikes (they cannot aim), special-set-up attacks, the body plan's `avoid` list, and moves `canHit` says cannot reach; automatic finishers avoid long run-ups. A KO waits 0.8 s for a launched loser to land.
- **Director changes for stories only** (v1 unchanged): an attack with `approach` may run up to three times (the target may have been pushed) and gets twice the nudge; `to` on walk/run/sneak/tiptoe/walk_together sets the distance at start; a hidden walker with `to` fades in; `{exit}` fades out at the end; `despawn` on a knocked-out character fades it where it lies; a placement with `hp` clears the KO (fight card rounds); `layer` beats emit `layer` events; KO and defeat moves emit `defeat` events (crowds); generated beats never report W_QUEUE_DRIFT (they wait for busy characters on purpose).
- **Camera:** `shot` beats set a key; with `dur` the previous key returns afterwards, without it the framing lasts (and turns the story auto camera off for the scene). Camera keys end any shot. Close-ups may zoom to 3 and lift the frame with a smoothed y offset; v1 keys never set it.
- **Extras** are plans (`sim.scenes[i].extras`) posed by the renderer from scene time with `sim.extraMoves`; they never enter the frame store or the simulation. The v1 `crowd` layer bobs with `react` (story scripts only): up after hits, hushed after a defeat.
- **Layers:** characters on `back`/`front` (scene placement or `layer` beats) are drawn scaled about their feet (0.75 / 1.15) with the extras of that layer: back before mid set pieces, front after front set pieces. All-mid scenes draw exactly as before.
- **Data:** `catalog/story/macro_lines.json` (`catalog.macroLines`: fight card intro, breather, challenge and victory lines), `avoid` lists in `catalog/characters/bodies.json`.

### Generated music, ambience and the story mix (S7)
```js
// engine/audio_plan.js (data only, ADR-017)
collectMusicPlan(sim) -> { segments: [{ t0, t1, mood, seed, fadeIn, fadeOut, intensity: [{t,v}], volume: [{t,v,fade}] }], duck, dips } | null
collectAmbiencePlan(sim) -> [{ t0, t1, beds: { name: level } }] | null      // null for v1 scripts
// engine/index.js: engine.getMusicPlan(), engine.getAmbiencePlan()
// tools/lib/patterns.mjs   compose(mood, scales, { seed, seconds, intensityAt }) -> { notes, tempo, bars, barSec }
// tools/lib/instruments.mjs renderNote(stereo, note); addRoom(stereo); dcBlock(stereo); PATCHES, DRUMS
// tools/lib/music_gen.mjs  renderMusic({ mood, catalog, seed, seconds, intensity }) -> { samples, tempo, bars, barSec }
// tools/lib/ambience.mjs   renderAmbience(bed, seconds, seed) -> stereo; BEDS, AMBIENCE_LUFS (-30)
// tools/lib/score.mjs      renderScore({ musicPlan, ambiencePlan, seconds, seed, catalog, musicVolume, ambienceVolume, loadOverride })
//                          -> { music, ambience, segments }; segmentGain(seg, t, total); storyDuck(t, duck, dips)
// tools/lib/loudness.mjs   measureLoudness(stereo) -> { integrated, shortTermMax, peak }; normalizeLoudness(stereo, lufs)
// tools/lib/mixer.mjs      mixdownStory({ events, durationSec, sampleFor, music, ambience, duck, dips, storyDuck, normalize, loudness })
```
- **Plan:** a scene's span starts at the hold before it, so cards carry their scene's music. Segments merge across scenes with the same mood; a mood change crossfades (equal power, centred on the boundary). Intensity points come from `set_music` beats (fight macros emit them); the score turns them into steps, and the composer reads intensity per bar.
- **Composer:** the tempo is nudged so a whole number of bars fills the segment exactly. Form: intro, 8-bar sections (A, A', B), a dominant bar and a final tonic bar. The melody is a 2-bar motif, snapped to chord tones on strong beats, varied in A'. Layers by intensity: pad always, bass from 0.15, lead from 0.25, drums from 0.3 (low/medium/high patterns), arpeggio from 0.6; fills end sections.
- **Instruments:** polyBLEP saw/pulse (pulses centred, no DC), Karplus-Strong plucks with a smoothed excitation, FM bells, detuned pads, synthetic drums; a small Schroeder room; a 25 Hz DC blocker. Each render is levelled to -16 LUFS and soft-clipped under -1 dBFS.
- **Mix (stories):** SFX and speech at unity, music × `musicVolume` (0.35) ducked -8 dB under speech and narration, -9 dB for 4 s after a vanish or ghost defeat and under heavy hits; ambience × `ambienceVolume` (0.8), 3 dB lower under speech. The whole mix is levelled to -16 LUFS (at most +18 dB) and limited at -1 dBFS. v1 scripts keep the M6 mix unchanged.
- **Story sounds:** footsteps by weight (`footstep_hard` for bulky or scale ≥ 1.3), `laugh_small`/`cry_small`/`gasp` with those emotes, `magic_sparkle` on `return`, `heartbeat` and `sad_sting` at a vanish or ghost, `card_whoosh` on cards, and in kids stories `pow`/`bonk`/`boing` with the impact words. v1 scripts get none of these.
- **Data:** `catalog/story/music_moods.json` (`catalog.musicMoods`, `catalog.scales`).

### LLM story pipeline (S8)
```js
// tools/lib/story_prompts.mjs
storyIdeationSystem(catalog, audience); storyOutlineSystem(catalog, { kind, minLength, audience }); storySceneSystem(catalog, { audience })
outlineRequest / outlineRepairRequest / sceneRequest(outline, i, { endState, stageWidths }) / sceneRepairRequest / extendRequest / reviseSceneRequest
assembleStory(outline, scenes, { seed, format, kind, audience }) -> v2 script; normalizeScene(scene, entry); checkOutline(outline, catalog, opts) -> [strings]
exampleStories() -> [{ name, outline, story }]; MIN_LENGTH { story: 300, fight: 180 }
// tools/lib/story_tables.mjs   outline/scene catalog markdown, macroMarkdown(), CODE_HELP (every validator code), audienceMarkdown()
// tools/lib/story_pipeline.mjs generateStory(ctx, premise, opts) -> { status, script, outline, score, ... }; checkSceneInContext; sceneSeconds
// tools/lib/story_score.mjs    scoreStory(script, outline, catalog, { minLength }) -> { score, parts, stats }; storyFeedback()
// tools/lib/manual_story.mjs   manualOutlinePrompt / checkOutlineReply / manualScenePrompt / checkSceneReply / manualExtendPrompt / assembleManual
// tools/lib/review_images.mjs  storySheet(engine, backend) (a row of frames per scene)
// engine: validate() returns scenes [{ id, seconds }] and endState { id: { hp, prop, face, hidden, scene, defeated } } for v2 scripts
```
- Each scene has its own conversation, so repairs, the extend round and critique revisions keep that scene's context. System prompts are byte-stable for a catalog and options, so prompt caching hits across scenes.
- Scenes ask for plain JSON (no structured-output schema). The validator is the contract, and the scene shape (action and macro beats) is too open for the providers' schema subsets.
- The mock adapter answers story stages from the `brave_heart` example (with a broken first draft of scene 2), so tests run the whole pipeline offline.
- The sync test (`tests/unit/story_gen.test.js`) checks that the scene prompt explains every code the engine reports, and that `CODE_HELP` lists exactly those codes.
- Small engine changes found by the pipeline:
  - `return` restores full HP.
  - W_DIALOGUE_FAST compares bubbles within a scene only.
  - Group travel ends with the slowest walker (leg length and scale).

### ADR-014 Two-level scripts and the story compiler
- **Context**: a 5-minute story compiles to roughly 1,000-4,000 shot-level beats. LLMs cannot write that many consistent beats, and authors should not have to.
- **Decision**: authored v2 scripts may contain **macro beats** (`{"id", "at", "macro": "fight", "params"}`) and **scene macros** (`fight_card`, `montage`, which expand into several scenes). A macro is a distinct beat shape with its own `macro` key, not `"who": "@fight"`, so the schema tells the two apart and structured output stays strict. Load order:
  1. normalize (v1 → v2, ADR-016);
  2. schema v2;
  3. semantic checks, including macro params against `MACRO_PARAMS`;
  4. **compile**: `engine/story/compile.js`, pure, expands macros into a flat v2 script with no macros;
  5. semantic checks on the compiled beats;
  6. dry run, then simulation.
  
  Each macro draws from its own stream `deriveRng(seed, "compile:" + macroId)`, so editing one macro never changes another macro's expansion. Generated beat ids are `<macroId>_<n>`; anchors per macro are listed in `MACRO_ANCHORS` and addressed as `{"on": "boss.finisher"}`. Issues inside an expansion are reported at the authored macro beat's path with an `expandedFrom` note.
- **Consequences**: the simulation never sees macros. `tools/compile.mjs` prints the expansion and `--eject <macroId>` writes it back as beats. Limits are split into authored (600) and compiled (4,000) beats. The compiler reads move pools from the injected catalog (category, held prop, body plan `avoid` lists) and checks reach with the same `canReach` the world uses.
- **Status (S6):** built as described; see "Story compiler, macros, story camera, extras and layers (S6)" above.

### ADR-015 Body plans share the humanoid skeleton
- **Context**: stories need characters that are not stickmen (a round sidekick, bulky guards), while 72 tuned moves and the aiming/reach system must keep working.
- **Decision**: a body plan is data: bone-length ratios, head size, hurtbox scale, a draw function key and `rig: "humanoid"`. Every plan keeps the same 13 joints and pose channels. `BODY` becomes `bodyFor(plan)`. The `stickman` plan's values are exactly today's `BODY`, so v1 output is bit-identical. Moves are authored once (for the stickman); root motion and reach scale by the plan's leg and arm ratios, as they already scale by `scale`. The plan index is stored once per character in the frame store header.
- **Consequences**: every move works on every plan. The combat matrix (every attack × outcome) runs across six plan pairings (`tests/unit/bodies.test.js`). Two rules came out of it: jump heights do not scale with leg length (only forward travel does), and a posture is released while attacking. Non-humanoid rigs later need a new `rig` value and `E_MOVE_RIG`; nothing in v2 assumes they never come.

### ADR-016 Scenes in one world with state carry-over
- **Context**: stories move between places, but characters must keep hp, defeats, held objects and looks across scenes, and the engine must stay simulate-once, render-anywhere.
- **Decision**:
  - One simulation and one world; scenes run one after another. At a boundary the engine resets stage width, positions, set pieces, spawned objects, FX sustains and the camera (a cut). It keeps hp, defeated/vanished status, held prop, appearance and face.
  - Beat `at` times and `after`/`with`/`on` references are **scene-local**; beat ids are unique across the story.
  - The story clock is continuous. Transitions and cards **hold the story clock** (frames are produced, simulation does not advance), so they never change what happens in a scene. A dissolve blends the stored last frame of one scene with the first frame of the next (random access makes this free).
  - The transition used at a boundary is the next scene's `transitionIn`, else the previous scene's `transitionOut`, else `cut`.
  - RNG streams are scoped per scene (`deriveRng(seed, name + "@" + sceneId)`), so editing one scene does not reshuffle another. A converted v1 script is flagged `legacy` and keeps the unscoped stream names.
  - The frame store records a scene index per frame; the renderer picks the location from it.
  - A v1 script converts on load to one scene `main` (cast from `characters`, location from `meta.theme`/`stageWidth`, `meta.kind: "clip"`, `meta.audience: "general"`). v1 golden frames and determinism hashes must not change; `set_theme` keeps working inside v2 scenes.
- **Consequences**: `record --scene N` renders one scene. Cross-scene timing references are an error (`E_REF_BEAT` with a fix line pointing at scene order). The director gains a per-scene lifecycle (`engine/story/scenes.js`).

### ADR-017 Procedural music and speech sounds live in /tools
- **Context**: decisions 3 and 4 (STORY_SPEC 21): speech sounds only, generated music, no licenses, no manual work. `/engine` must stay free of I/O and audio synthesis.
- **Decision**: the engine only emits audio **data**: per-scene music specs (mood, intensity changes from fight macros, stings at defeats and reunions), speech segments (character, start, end, syllable count, voice settings), narration chimes and ambience per scene. `tools/lib/music_gen.mjs`, `speech.mjs` and `ambience.mjs` turn that data into PCM, seeded from the script seed, scene id and character id. The mixer crossfades, ducks and limits. A file in `assets/music/<mood>.*` overrides a generated mood.
- **Consequences**: the audio event list stays part of the determinism test; the same script gives byte-identical audio. The browser player previews SFX only until a Web Audio port of the generators exists (not planned for v2).
- **Status (S7):** built as described: the plan is `engine/audio_plan.js`; stings are the `sad_sting` SFX plus a music dip rather than a separate music render. See "Generated music, ambience and the story mix (S7)" above.

### ADR-018 Audience rules, kids by default
- **Context**: decision 7: kids first. Stories may contain loss and fights, so rules must shape them without removing them.
- **Decision**: `meta.audience` is `kids` (default) or `general`. The rules are data plus checks:
  - `catalog/story/blocklist.json` keeps the hard list (errors) and gains a soft list with suggested alternatives (`W_TEXT_SOFT`);
  - `DEFEAT_STYLES_BY_AUDIENCE` drives `E_DEFEAT_STYLE`;
  - `W_KIDS_NO_HOPE` checks that a vanished or captured friend returns or is shown safe;
  - the renderer draws cartoon impacts (stars, "POW!") in kids mode;
  - generation prompts include the kids rules.
  
  Converted v1 scripts are `general`, so their frames and validation results do not change.
- **Consequences**: kids rules are checks and presentation defaults, not a separate engine. The review queue suggests `madeForKids` from the audience; publishing stays with the reviewer.

### ADR-019 One catalog folder for the engine, pages and AI tools
- **Context**: the catalog was JS modules in `/data` (helpers, spreads, no descriptions); prompts embedded about 30,000 characters of tables in every scene prompt, and pages and AI tools could not read the catalog without the code.
- **Decision** (docs/CATALOG_SPEC.md): authored JSON in `catalog/` with a description for every entry; `catalog/index.js` assembles today's catalog object (`loadCatalog(read)`, sync or async readers; fs in Node, fetch in the browser). Engine-owned names stay in engine code; their descriptions live in `catalog/docs/` and a check keeps the two one to one. `npm run catalog:build` writes `catalog/generated/` (never edited by hand): the engine vocabulary, the full catalog as one file, and a Markdown context pack within byte budgets. The prompt tables and the pack share the same renderers.
- **Consequences**: the migration was checked by deep equality with the frozen `data/` catalog (C1; retired with `data/` in C5); golden frames, determinism hashes and the existing prompts are unchanged byte for byte. Prepared moves drop the description fields, so they never reach the simulation. A stale generated file fails a test.

### ADR-020 Quadruped rig by reinterpreting the humanoid joints
- **Context**: the Doopi & Friends series needs a real four-legged dog (Becky) in every episode. Every part of the engine stores and passes 13 joints and 13 pose channels; about 20 modules start moves by name (`walk`, `run`, `idle`, `get_up`).
- **Decision** (STORY_SPEC 6.2): a quadruped keeps the 13 joints and channels and gives them other meanings (rear hip as the root, the spine running forward to the shoulders, arms as front legs, legs as rear legs). `computeJoints` branches on `dims.rig` to `computeJointsQuad` (`engine/skeleton_quad.js`); nothing else in the simulation changes shape. Tail and ears are drawn procedurally by the renderer, not stored. A body plan's `moves` map renames generic moves for its rig through one resolver, so callers keep asking for `walk`.
- **Consequences**: the frame store, determinism and every humanoid frame are unchanged; a quadruped costs no extra memory. Quadruped moves are authored per rig (`rig` on each move); the catalog checks run each move on the plans of its rig only. A rig whose topology doesn't fit 13 joints (a bird with wings and legs, a snake) would need a real per-rig joint list later.


### ADR-021 Colour effects are drawn from the event log (A3)
- **Context**: the series needs a lasting Heart Glow, a per-scene "how grey the world is" grade with a colour wave, and friends frozen to stone grey across scenes.
- **Decision**: no new frame-store fields. The renderer reads the effects from the event log (`set_glow` and `set_grade` world events, the `defeat` event of `petrify` and the `thaw` event that `return` emits for a petrified character), as it already does for `set_appearance`; `engine/renderer/colour.js` holds the pure state functions. A grey world is a `saturation` composite pass after the world (it can leave a growing circle for a wave `from` a character); with `keepCast`, and for a stone-grey character, a canvas `filter` is set while drawing. The simulation only holds the petrified pose (`keepPose`, no idle) and carries it into later scenes.
- **Consequences**: the frame store, golden frames and determinism are unchanged, and glow and petrify carry over between scenes for free. With `keepCast` a wave blends evenly instead of spreading. The canvas backend must support `ctx.filter` (`@napi-rs/canvas` and current browsers do).
