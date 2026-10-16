# Stickman Action Engine: Technical Specification

Version 1.1.2 (supersedes 1.0, archived at `docs/archive/stickman-engine-spec-v1.0.md`). 1.1.1 adds the M1 clarifications: ease applies to the leaving segment (7.2), ground-contact rule (5.4), loop moves and `snapHard` (8.2). 1.1.2 adds the M2 results: root motion scales with the character, auto-aim rule, near-surface aim points, move flags `hold`/`guard`/`invulnerable`, dodge choice, whiff gap.

Companion documents:
- `docs/ARCHITECTURE.md`: module interfaces, data shapes, decision records
- `docs/IMPLEMENTATION_PLAN.md`: milestones, tasks, schedule, risks
- `docs/REQUIREMENTS.md`: what the project needs (tools, assets, decisions, access)

## 0. How to use this document

This spec defines a small, deterministic 2D stickman animation engine. An LLM never writes engine code at runtime. It only writes **scripts** (JSON) that the engine plays back. A Node process renders the playback frame by frame and encodes it into video. A browser page is used for human preview and authoring only.

This document is the source of truth for behavior and the script schema. When this document and code disagree, fix one of them in the same change.

---

## 1. Goals and non-goals

### Goals
1. Play a JSON script and produce a polished action or comedy stickman animation.
2. Be fully deterministic: the same script, seed and engine version always produce identical frames.
3. Be frame-exact recordable: output is rendered frame by frame, independent of wall-clock time.
4. Keep the LLM's job small: a script is 1-4 KB of JSON built from a fixed, validated vocabulary.
5. Keep the engine small and readable: about 3,200 lines of logic plus about 2,000 lines of data (see 20.3). No logic module over about 350 lines.
6. Be extensible by data: a new move, pose, effect, prop or theme is a data entry, not new logic, wherever possible.
7. Support 16:9 (1920x1080) and 9:16 (1080x1920).

### Non-goals (v1)
- No 3D, no skinning, no rigid-body or ragdoll physics.
- No realtime interactivity or game logic. Playback only.
- No text-to-speech or music generation.
- No automatic upload to YouTube. Every video passes a human review step (see 17.6).

---

## 2. Technology constraints

| Item | Decision |
|---|---|
| Language | Plain ES2022 JavaScript, ES modules, JSDoc types |
| Engine runtime dependencies | None. The engine core runs unchanged in Node 20+ and in Chromium |
| Rendering | Canvas 2D API. The renderer receives any `CanvasRenderingContext2D`-compatible context |
| Recording backend | Node + a Skia-based canvas (`skia-canvas` or `@napi-rs/canvas`, chosen by the M0 benchmark), raw RGBA piped to ffmpeg |
| Preview and authoring | Static HTML pages in `/web` using the browser's native canvas |
| Build step | None. Optional single-file bundle for the web pages |
| Dev tooling | Node 20+, ffmpeg 6+, `node:test` for tests |
| Time | Fixed simulation tick (see section 6). `Date.now()`, `performance.now()`, `Math.random()` are forbidden in `/engine` |
| Randomness | Seeded PRNG (mulberry32), one derived stream per subsystem |
| Units | World units are pixels at zoom 1. 1 unit = 1 px of a 1080-pixel-short-side frame |

**Why Node for recording.** Capturing a 1080p canvas from a headless browser costs 40-100 ms per frame (PNG encode plus transfer). Rendering in Node with a Skia canvas and piping raw pixels to ffmpeg is several times faster, has no browser in the loop, and lets the validator run the full simulation in the same process. Browser and Node output do not need to be pixel-identical to each other; each backend must be deterministic with itself.

---

## 3. High-level architecture

```
        script.json
             │
     ┌───────▼────────┐
     │   Validator    │  schema → semantics → dry-run simulation → timeline report
     └───────┬────────┘
             │ valid
     ┌───────▼────────┐
     │    Director    │  resolves beat times and anchors, inserts approaches, queues moves
     └───────┬────────┘
             │ per-tick commands
     ┌───────▼────────┐
     │  Simulation    │  clocks, moves, IK, physics, combat, FX emission, camera
     └───────┬────────┘
             │ snapshot per video frame
     ┌───────▼────────┐
     │  Frame Store   │  compact per-frame state + particle emit log (random access)
     └───────┬────────┘
             │ renderFrame(ctx, n)
     ┌───────▼────────┐
     │   Renderer     │  pure draw: (store, n) → pixels
     └───────┬────────┘
             │
   Recorder (Node canvas → ffmpeg) + Audio mixer (Node) → final.mp4
```

**Simulate first, render later.** `load(script)` runs the entire simulation and stores one snapshot per video frame. `renderFrame(ctx, n)` is a pure function of the store and `n`. This gives random access, trivial determinism and a recorder that cannot drop frames. The validator reuses the same simulation without rendering (a "dry run").

### 3.1 Repository layout

```
/engine                 runtime logic, zero dependencies
  index.js              public API: createEngine()
  config.js             constants and defaults
  math.js               vec, lerp, clamp, easing, mulberry32, hash
  expr.js               safe arithmetic evaluator for move params
  skeleton.js           forward kinematics, 2-bone IK, body rotation, ground contact
  pose.js               pose blending and channel defaults
  moves.js              move runtime (keyframes, root motion, events, hit windows)
  actor.js              one character's move state, queue, body fields and ground contact
  world.js              actors + physics + aim IK + hit resolution + choreographed outcomes, per story tick
  props.js              prop attachment, prop tip, prop state changes
  physics.js            bodies, gravity, friction, bounds, separation, projectiles
  combat.js             hurtboxes, hit resolution, aim, reach, outcomes, reactions
  clock.js              story/FX/video clocks, slowmo, hitstop, freeze
  fx.js                 FX preset runtime, analytic particle emit log
  camera.js             camera modes, framing, shake, zoom punch
  director.js           beat scheduling, anchors, approach, queue/interrupt
  sim.js                world step loop, builds the frame store
  framestore.js         snapshot layout and accessors
  audio_events.js       SFX event collection, video-time conversion
  /validator
    schema.js           JSON Schema (also exported for LLM structured output)
    semantic.js         reference, prop, reachability and content checks
    report.js           error formatting, closest-match suggestions, timeline text
    index.js            validate(script) entry point (runs dry-run simulation)
  /renderer
    index.js            renderFrame orchestration and draw order
    character.js        body, head, face, accessories, props
    background.js       procedural theme layers, offscreen caching
    particles.js        evaluate and draw analytic particles
    overlays.js         speech bubbles, HP bars, captions, text pops, flashes, fades
/data                   pure data, no logic
  poses.js
  moves/{movement,unarmed,armed,defensive,reactions,emotes,utility}.js
  props.js  fx.js  themes.js  sfx.js  blocklist.js
/tools                  Node CLIs (may use dev dependencies)
  validate.mjs          validate a script, print errors and timeline
  record.mjs            script → frames → ffmpeg → final.mp4
  mix.mjs               audio event list → mixed WAV
  sfxgen.mjs            deterministic procedural SFX generator
  catalog.mjs           move/FX/SFX catalog for prompts
  contact_sheet.mjs     frame grid PNG for review and vision critique
  generate.mjs          LLM ideation → script → repair → score loop
/web                    browser pages (preview and authoring)
  index.html            script player with scrubber
  editor.html           pose and move editor
  catalog.html          every move looping against a dummy
/assets
  fonts/  sfx/  music/  (see docs/REQUIREMENTS.md for sources and licenses)
/scripts/samples        sample scripts
/tests/{unit,integration,golden,fixtures}
/docs
/out                    render output (git-ignored)
```

---

## 4. Coordinate system and conventions

- World space: x to the right, **y down**. World origin is the left edge of the stage at the ground line's x origin.
- Stage: x range `[0, stageWidth]`, default `stageWidth = 3200`. Ground line `groundY = 880` in world units, for both formats.
- Formats: `landscape` = 1920x1080, `portrait` = 1080x1920. The format changes the canvas and camera framing (11.5), never world units.
- Script time: seconds of **story time** (section 6). Frames are an output concern.
- Facing: `+1` (right) or `-1` (left). Poses are authored facing right; kinematics mirrors them.
- Angles: degrees in data, radians internally.
- Naming: `l*` = far limb (drawn first, darker), `r*` = near limb (drawn last).

---

## 5. Skeleton model

### 5.1 Body dimensions (scale 1.0)

| Part | Length (px) |
|---|---|
| Head radius | 22 |
| Neck | 8 |
| Torso | 78 |
| Upper arm | 38 |
| Forearm | 36 |
| Thigh | 48 |
| Shin | 46 |
| Line width | 9 |

Standing hip height: `48 + 46 = 94` px. `scale` multiplies all lengths and line width. Valid range 0.4-4.0.

### 5.2 Pose channels

A **pose** is a set of angles (degrees) plus root offsets.

| Channel | Meaning | 0 means | Positive direction |
|---|---|---|---|
| `rot` | Whole-body rotation around the body center (flips, rolls, lying down) | upright | forward (top of body toward facing) |
| `lean` | Torso tilt from vertical around the hip | upright | forward |
| `head` | Head tilt relative to torso | aligned | forward (chin down) |
| `lUA`, `rUA` | Upper arms | hanging along torso | swinging forward |
| `lFA`, `rFA` | Forearms | straight continuation of upper arm | elbow flexing (forearm forward/up) |
| `lTH`, `rTH` | Thighs | straight down along torso axis | swinging forward |
| `lSH`, `rSH` | Shins | straight continuation of thigh | knee flexing (shin backward) |
| `dx`, `dy` | Visual root offset in px, facing space | none | forward / down |

### 5.3 Forward kinematics

`dir(a) = (facing * sin(a), cos(a))` in screen coordinates (y down): `a = 0` points straight down, `a = 90°` points forward, `a = 180°` points up.

```
hip         = root + (facing * dx, dy)
torsoAngle  = 180 - lean                       // up, tilted forward by lean
shoulder    = hip + dir(torsoAngle) * torsoLen
neckTop     = shoulder + dir(torsoAngle) * neckLen
headCenter  = neckTop + dir(180 - lean - head) * headRadius    // v1.1 fix: minus head

baseLimb    = -lean                            // "hanging along torso"
UA_world    = baseLimb + UA
FA_world    = UA_world + FA
elbow       = shoulder + dir(UA_world) * upperArmLen
hand        = elbow + dir(FA_world) * forearmLen

TH_world    = baseLimb + TH
SH_world    = TH_world - SH
knee        = hip + dir(TH_world) * thighLen
foot        = knee + dir(SH_world) * shinLen

// Whole-body rotation, applied last to every joint p:
center      = hip + dir(torsoAngle) * (torsoLen / 2)
p'          = center + R(facing * rot) * (p - center)
              // R(θ)(x, y) = (x cosθ - y sinθ, x sinθ + y cosθ); positive θ is
              // clockwise on a y-down screen, i.e. forward for facing +1
```

`skeleton.js` exports:
- `computeJoints(pose, root, facing, scale) → Joints` with `hip, shoulder, neckTop, head, lElbow, lHand, rElbow, rHand, lKnee, lFoot, rKnee, rFoot` (each `{x, y}`) plus `center`.
- `solveIK2(rootJoint, len1, len2, target, bendSign) → {mid, end}`: analytic two-bone IK. Clamps the target to `0.98 * (len1 + len2)` along the root-to-target direction. `bendSign` keeps the elbow or knee on the same side as the FK pose.
- `lowestPoint(joints, scale) → y`: maximum y over all joints, using `head.y + headRadius` for the head.

### 5.4 Ground contact

While a character is **grounded** (see 8.1) the engine shifts the root vertically so `lowestPoint == groundY`. This uses the lowest point of *any* joint, so lying, crouching and rolling poses sit on the ground correctly.

To avoid pops when the lowest joint switches (for example between feet during a walk), the vertical correction is rate-limited to `snapRate = 10 px * scale` per tick. Moves can set `flags.snapHard: true` on landing keys to apply the correction instantly.

While the root is lifted (current root `dy < 0`) or the body is airborne in physics, the offset is held and only corrected upward, so the body never sinks into the ground. `flags.airborne` does not affect contact; it only marks the move as airborne for physics and combat.

---

## 6. Time model

The engine uses three clocks. Getting them straight is what makes slow motion, hitstop and timing anchors work.

| Clock | Advances per video frame by | Used by |
|---|---|---|
| **video** | `1/60` always | output frames, audio timestamps, camera smoothing, screen flashes, fades |
| **story** | `scale/60` during slowmo, `0` during hitstop or freeze, else `1/60` | beats, moves, physics, combat, character springs |
| **fx** | `scale/60` during slowmo, `1/60` during hitstop/freeze, else `1/60` | particles, FX animations, camera shake decay |

Rules:
1. Each video frame performs exactly one simulation step with `dt = storyDelta`. When `dt == 0`, moves and physics do not advance; FX and camera still do.
2. Script `at` values, move durations and FX durations are in story seconds, except world beats `fade`, `flash` and `caption`, whose `dur` is video seconds.
3. Slowmo ramps its scale over `easeIn`/`easeOut` (video seconds). Nested slowmo: the newest one wins.
4. **Hitstop is global by default**: the story clock pauses for `hitstop` seconds (video time). Effects keep animating and the camera keeps shaking. This keeps every character's timing consistent with the beat schedule.
5. Springs (overlap, headband, cape, ground snap) are integrated with semi-implicit Euler, which is stable for every `dt ≤ 1/60`.
6. `totalFrames` is known only after simulation. The video ends when the last beat, move, FX and fade are done, plus `meta.tail` (default 0.5 s video).

---

## 7. Poses and interpolation

### 7.1 Named poses (`data/poses.js`)
Each pose is a full channel set (missing channels default to `stand`). Minimum v1 set:

`stand`, `guard`, `crouch`, `walkA`, `walkB`, `runA`, `runB`, `jumpUp`, `jumpPeak`, `jumpFall`, `punchWindup`, `punchExtend`, `kickWindup`, `kickExtend`, `hitLight`, `hitHeavy`, `down` (on back), `downFace` (face down), `getUp1`, `getUp2`, `block`, `taunt1`, `taunt2`, `victory`, `swordGuard`, `swordSlashA`, `swordSlashB`, `tuck` (flips and rolls).

```js
stand: { rot:0, lean:0, head:0, lUA:8, lFA:6, rUA:-8, rFA:6, lTH:6, lSH:0, rTH:-6, rSH:0, dx:0, dy:0 },
guard: { lean:10, head:-4, lUA:60, lFA:100, rUA:40, rFA:110, lTH:-14, lSH:20, rTH:16, rSH:24, dy:6 },
down:  { rot:-90, lean:0, head:0, lUA:20, lFA:10, rUA:-15, rFA:10, lTH:8, lSH:4, rTH:-4, rSH:10 },
```

### 7.2 Interpolation
- Channel-by-channel `lerp(a, b, ease(u))`.
- A key's `ease` shapes the segment that **leaves** that key (toward the next key). The last key's ease is unused. Root keys follow the same rule.
- Angles are not wrapped. Poses and keys are authored so the numeric path is the intended path (a frontflip goes `rot: 0 → 360`).
- Missing channels in a partial pose key inherit from the previous key (or from `stand` at the start of a move).

### 7.3 Easing (`math.js`)
`linear`, `inQuad`, `outQuad`, `inOutQuad`, `inCubic`, `outCubic`, `inOutCubic`, `outBack`, `outElastic`, `outBounce`, `snap` (jumps at 50%), `holdThenSnap` (holds until 85%, then snaps; good for punches).

### 7.4 Secondary motion (deterministic)
- **Overlap** (`style.overlap: true`): a damped spring makes hand and head angles lag their target (`k = 180`, `damping = 18`).
- **Idle breathing**: sine on `dy` (2 px, period 2.4 s) and arms (±2°) while in `idle`. Its phase comes from story time, never from a random source.
- **Squash and stretch** (`style.squash: true`): body scale pulses 1.0 → 1.06 → 1.0 over 0.12 s on land and on hit.

---

## 8. Moves

A **move** is a data object plus the shared runtime in `moves.js`.

### 8.1 Move schema

```js
{
  name: "flying_kick",
  category: "attack",              // attack | movement | reaction | defensive | emote | utility
  duration: 0.9,                   // story seconds at speed 1.0
  params: { travel: 260, damage: 14 },   // defaults; scripts may override listed params only
  needsProp: null,                 // or a prop kind, e.g. "sword"
  keys: [                          // pose keyframes, t normalized 0..1, sorted
    { t:0.00, pose:"crouch", ease:"outQuad" },
    { t:0.30, pose:"jumpUp", ease:"holdThenSnap" },     // holds jumpUp, then snaps into the kick
    { t:0.55, pose:{ lean:50, rTH:80, rSH:0, lTH:-30, lSH:30 }, ease:"outCubic" },
    { t:1.00, pose:"jumpFall", snapHard:true }
  ],
  root: [                          // root motion offsets from the move-start anchor, facing space
    { t:0.0, dx:0,              dy:0 },
    { t:0.5, dx:"travel*0.7",   dy:-140 },
    { t:1.0, dx:"travel",       dy:0 }
  ],
  hits: [
    { t0:0.50, t1:0.70, part:"rFoot", aim:"auto", damage:"damage",
      knock:[520,-200], hitstop:0.09, reaction:"hit_heavy",
      fx:["impact_big"], shake:"med", sfx:"kick_heavy" }
  ],
  events: [ { t:0.00, sfx:"whoosh" }, { t:0.95, fx:["dust_land"], sfx:"land" } ],
  flags: { airborne:true, lockFacing:true, passThrough:false, loop:false },
  // other flags: hold:true (keep the last pose until the next command, e.g. knockdown),
  //   guard:[t0, t1, "block"|"parry"] (defending in that move-time window),
  //   invulnerable:[t0, t1] (hits pass through in that window)
  mouth: "shout",                  // neutral | shout | grin (optional)
  chain: null                      // optional follow-up move name
}
```

- String expressions (`"travel*0.7"`) are evaluated by `expr.js` against `params`: numbers, param names, `+ - * / ( )` and unary minus only. No `eval`.
- `hits[].part` is one of `rHand`, `lHand`, `rFoot`, `lFoot`, `rKnee`, `lKnee`, `rElbow`, `lElbow`, `head`, `propTip`.
- `hits[].shake` is `small | med | big` (a camera shake preset), never an FX name.
- **Reach is derived, not authored.** At catalog load the engine samples each attack's FK contact point at the middle of each hit window and stores `reach` (forward distance from root) and `contactHeight`. `approach` and `snap_range` use these values (see 11.4).

### 8.2 Runtime behavior
- A character has one **current move**, a **move time** (normalized), and a **queue**.
- When a move ends, the character continues with `chain`, then the queue, else returns to `idle`.
- `speed` (script, default 1.0, range 0.25-3) divides the duration.
- **Loop moves** (`flags.loop`, e.g. `idle`, `walk`, `run`) repeat until replaced, or until `params.distance` (px travelled; the last step is clamped to land exactly) or `params.cycles` is reached. Events fire once per cycle.
- A key with `snapHard: true` applies ground contact instantly when the move passes it (landings).
- Switching moves blends from the last displayed pose to the new move's first key over `blend` seconds (default 0.06; 0 for reactions).
- Root motion is authored at scale 1 and multiplied by the character's `scale` (a 2.2x boss's jab travels 2.2x as far). `params.distance` is in world px.
- Root motion is applied each tick as the delta `offset(t) - offset(t_prev)` rotated into facing space. `dx` moves the physics body. `dy` is a visual offset while grounded. For `airborne` moves `dy` drives body y, and at move end the body's `vy` is set from the last root derivative so physics takes over smoothly.

### 8.3 Hit aiming with IK
Fixed angles cannot hit targets of different sizes, so attack limbs aim during hit windows.

1. When a hit window opens, the engine resolves an **aim point** on the target:
   - `aim: "head" | "torso" | "legs"` → head center, torso midpoint, knee midpoint.
   - `aim: "auto"` (default) → among `[head, upper torso, torso mid, hip, knees]`, the points the hitting limb can reach; of those, the one closest to where the authored FK pose would make contact. If none is reachable, the closest one overall.
   - Aim points sit on the near surface of the target's body (offset toward the attacker by the limb or head radius), not on its centre line.
2. The hitting limb chain (shoulder→elbow→hand, or hip→knee→foot) blends from FK toward the IK solution with weight `w`: 0 → 1 over the 30% of move time before `t0`, held at 1 through `t1`, then back to 0 by `t1 + 0.15`. For `propTip`, the chain is upper arm plus (forearm + prop length).
3. The aim point tracks the target every tick while the window is open.
4. Result: a small hero punching a 2.2x boss hits the hip; a `flying_kick` reaches the boss's chest; the boss's haymaker on a small hero comes down to head height.

### 8.4 Required move catalog (v1)

**Movement:** `idle`, `walk`, `run`, `dash`, `slide`, `jump`, `backflip`, `frontflip`, `dodge_back`, `dodge_roll`, `duck`, `side_step`, `land_roll`

**Unarmed attacks:** `jab`, `cross`, `hook`, `uppercut`, `haymaker`, `front_kick`, `roundhouse`, `axe_kick`, `sweep`, `flying_kick`, `spinning_kick`, `elbow`, `knee`, `headbutt`, `flurry` (6-hit combo), `ground_pound` (shockwave), `energy_blast` (projectile), `charge_up` (aura, non-attack)

**Armed attacks:** `sword_slash`, `sword_thrust`, `sword_spin`, `sword_overhead`, `staff_swing`, `staff_spin`, `bat_swing`, `throw_prop`, `shoot`

**Defensive:** `block`, `parry`, `counter`, `catch_weapon`

**Reactions (auto-triggered, also scriptable):** `hit_light`, `hit_heavy`, `hit_launch`, `stagger`, `knockdown`, `get_up`, `ko_fall`, `ko_spin`, `dizzy`

**Emotes:** `taunt`, `wave`, `bow`, `flex`, `laugh`, `shrug`, `facepalm`, `victory`, `cower`, `dance_a`, `dance_b`, `point`

**Utility:** `face`, `wait`, `teleport`, `spawn`, `despawn`, `pick_prop`, `drop_prop`

Deferred to v1.x: `wall_run`.

Every move declares `category` and `duration`. Every `attack` declares at least one `hits` entry. `charge_up` is category `emote`.

---

## 9. Physics (`physics.js`)

Intentionally minimal. Body: `{ x, y, vx, vy, grounded, facing, mass, scale }`.

### 9.1 Rules per tick (story `dt`)
1. While a move controls the body, root motion sets position deltas (8.2), not forces.
2. When airborne and no move controls y: `vy += gravity * dt` (gravity 2600 px/s²).
3. Knockback and launch set `vx`, `vy`. Ground friction while grounded: `vx *= 0.86^(dt*60)`.
4. Landing: if `y >= groundY` while descending → `y = groundY`, `vy = 0`, `grounded = true`, emit `land` with impact speed. Impact over 900 px/s adds `dust_land`; over 1600 px/s also adds `shake small`.
5. Stage bounds: clamp `x` to `[margin, stageWidth - margin]` (margin 60). Launched characters with `wallBounce` reflect `vx` with 0.4 restitution and emit `impact_small` plus `sfx: land_heavy`.
6. Separation: two grounded characters closer than `minGap = 40 * max(scaleA, scaleB)` are pushed apart symmetrically. Disabled while either side's move has `flags.passThrough` or during a choreographed hit window between them.

### 9.2 Launch
`hit_launch` sets velocity from the hit's `knock` (mirrored by attacker facing). While launched, `rot` spins at `spin` deg/s (default 540) until landing, then `knockdown` plays.

### 9.3 Projectiles and thrown props
Projectile: `{ x, y, vx, vy, gravity, radius, damage, owner, life, fx }`. Hit test: swept circle vs target hurtboxes. On hit or `life` expiry: spawn FX and remove. A thrown prop is a projectile that becomes a dropped prop on landing.

---

## 10. Combat (`combat.js`)

### 10.1 Hurtboxes
Built from joints each tick: head (circle), torso (capsule hip-shoulder), upper and lower limbs (capsules, radius = lineWidth/2 + 4). All scaled.

### 10.2 Hitboxes
During a hit window the hitbox is the `part` joint as a circle (`hitRadius`, default 26, scaled; props override), plus the swept segment from the previous tick's position, so fast limbs never tunnel.

### 10.3 Resolution order (per tick)
1. Gather open hit windows (stable order: character array order, then hit index).
2. Test each against every other character's hurtboxes and destructible projectiles.
3. Each window hits a given target at most once (`hitId` guard).
4. Apply the target's state: `invulnerable` skips; `block` → 20% damage, `block_spark` FX, `sfx: block`; `parry` → no damage, attacker plays `stagger`.
5. Apply damage, knock (mirrored by attacker facing) and hitstop.
6. Trigger the reaction: the hit's `reaction`, else by damage (`< 8` hit_light, `< 16` hit_heavy, else hit_launch). The target turns to face the attacker. A launched character spins backward, lands into `knockdown` and stays down (`flags.hold`) until a `get_up` command.
7. Emit FX, shake and SFX events, and record a `hit` anchor event for the beat (11.2).

### 10.4 Modes
- **choreographed** (default): the beat's `outcome` decides what happens (10.5). The engine positions the attacker so the outcome reads clearly.
- **simulated**: hits resolve strictly from geometry; misses are possible; `outcome` is ignored (validator warning). Reserved for a future procedural fight feature.

### 10.5 Choreographed outcomes
Attack beats take `outcome` (default `"hit"`):

| Outcome | Engine behavior |
|---|---|
| `hit` | Contact guaranteed: `snap_range` positions the attacker, IK aims, the hit applies even if geometry is a few px off |
| `whiff` | The attacker is positioned so the contact point stops `whiffGap = 40 * scale` px short. No damage |
| `blocked` | The target is forced into `block` before `t0` (if not already) and the hit resolves as blocked |
| `parried` | The target plays `parry` timed to `t0`; the attacker plays `stagger` |
| `dodged` | The target auto-plays `duck` (hand strikes aimed at the head) or `dodge_back` (everything else; kicks rise through a duck), timed to be clear at `t0`. Smaller defenders dodge further. The attacking limb aims where the target was. No damage |

### 10.6 Health and KO
`hp` defaults to 100. In simulated mode `hp <= 0` triggers `ko_fall` or `ko_spin`. In choreographed mode KO happens only when scripted; HP bars (if `meta.hpBars`) still animate and clamp at a minimum of 1 until the KO beat.

### 10.7 Hitstop
On a landing hit, the story clock pauses for `hitstop` seconds (typical 0.05-0.14). FX and shake continue (section 6). This is the most important "juice" effect for perceived power.

---

## 11. Director and script format

### 11.1 Top level

```json
{
  "version": 1,
  "meta": {
    "title": "Stickman vs The Giant",
    "format": "landscape",
    "seed": 1234,
    "mode": "choreographed",
    "stageWidth": 3200,
    "theme": "dojo_dusk",
    "hpBars": false,
    "autoCamera": true,
    "tail": 0.5
  },
  "characters": [
    { "id": "hero", "x": 600, "facing": 1, "color": "#22aaff", "scale": 1.0, "hp": 100,
      "style": { "overlap": true, "headband": "#ff3355" }, "prop": null },
    { "id": "boss", "x": 1700, "facing": -1, "color": "#ff3b3b", "scale": 2.2, "hp": 300,
      "style": { "cape": "#222222" }, "prop": "club_big" }
  ],
  "camera": [],
  "beats": [],
  "audio": { "music": "epic_01", "musicVolume": 0.35 }
}
```

The frame rate is fixed at 60 and is not a script field. `meta.duration` is not authored; the engine computes it.

### 11.2 Beats

A **beat** is one command.

```json
{
  "id": "kick1",
  "at": 3.5,
  "who": "hero",
  "do": "flying_kick",
  "target": "boss",
  "outcome": "hit",
  "params": { "travel": 300, "damage": 20 },
  "speed": 1.0,
  "approach": "run",
  "interrupt": false,
  "fx": ["speed_lines"],
  "say": "HYAAA!",
  "sayDur": 1.2
}
```

**`at` has exactly four forms** (the same forms are used by camera keys):

| Form | Meaning |
|---|---|
| `3.5` | Absolute story seconds |
| `{ "after": "kick1", "delay": 0.2 }` | When beat `kick1` ends, plus delay |
| `{ "with": "kick1", "delay": 0 }` | When beat `kick1` starts, plus delay |
| `{ "on": "kick1.hit", "delay": 0 }` | When an anchor event of `kick1` happens. Anchors: `start`, `windowOpen`, `hit`, `end`. `hit` falls back to `windowOpen` for whiffs and dodges |

Other fields:
- `approach`: `"run" | "walk" | false` (default false). Before the move, the director inserts movement toward the position `snap_range` needs. The beat's `start` anchor is the start of the attack itself, not the approach. Maximum 3 s; longer is a validator error.
- `interrupt`: when `false` (default), a beat for a character that is still moving is queued after the current move. When `true`, it cuts the current move. Reactions always interrupt.
- `say` is at most 40 characters; `sayDur` is in story seconds (default 1.2).

### 11.3 World beats
`who: "world"` with `do` in:

| `do` | Params |
|---|---|
| `shake` | `preset: small|med|big` |
| `slowmo` | `scale` (0.1-1), `duration` (story s), `easeIn`, `easeOut` (video s) |
| `freeze` | `duration` (video s) |
| `zoom_punch` | `amount` (default 0.15), `dur` (default 0.2) |
| `flash` | `color`, `dur` (video s) |
| `fade` | `to: black|white`, `dur` (video s), `dir: out|in` |
| `desaturate` | `amount` (0-1), `dur` |
| `text_pop` | `text` (≤ 16 chars), `x`, `y` (screen 0-1, default center), `color` |
| `caption` | `text` (≤ 80 chars), `pos: top|bottom|center`, `dur` |
| `explosion` | `x`, `y` (world) |
| `spawn_prop` | `prop`, `x`, `y` |
| `prop_break` | `owner` (character id) |
| `set_theme` | `theme` |
| `music_cue` | `cue: start|stop|duck`, `volume` |
| `cut` | hard camera cut to the next camera key |

### 11.4 Positioning (`approach`, `snap_range`)
For an attack beat with a target, the director computes the **required start x**:

```
aimX      = aim point x on the target at the move's hit-window middle (predicted)
required  = aimX - facing * (reach + travel(tmid))          // outcome hit/blocked/parried
required  = aimX - facing * (reach + travel(tmid) + gap)  // outcome whiff (starts further back)
// gap = whiffGap * attackerScale + (lineWidth/2 + 14) * targetScale, so limbs clearly miss big targets
```

- With `approach`, the director inserts `run`/`walk` to `required` (ending facing the target).
- In choreographed mode `snap_range` (always on) nudges the attacker to `required` at move start if the error is at most `maxNudge = 60 * scale` px. Larger errors are a validator error that suggests `approach`.

### 11.5 Camera track

```json
"camera": [
  { "at": 0,                       "mode": "follow", "targets": ["hero","boss"], "zoom": "auto", "padding": 300 },
  { "at": { "on": "kick1.hit" },   "mode": "focus",  "target": "boss", "zoom": 1.6, "ease": "inOutCubic", "dur": 0.4 },
  { "at": 10,                      "mode": "fixed",  "x": 1500, "zoom": 1.0 }
]
```

- Modes: `follow` (fit all targets plus padding), `focus` (one target), `fixed` (x, optional y), `pan` (to x over `dur`), `push` (slow zoom-in over `dur`).
- Smoothing: critically damped spring (`omega = 8`) in video time. `cut` world beats skip smoothing.
- **Vertical framing**: unless `y` is given, the camera keeps `groundY` at `groundScreenRatio` of the frame height (landscape 0.82, portrait 0.70) and keeps the tallest target's head inside the top safe margin by zooming out.
- `zoom: "auto"` fits targets horizontally; portrait uses a narrower horizontal fit and allows more zoom-out.
- Clamped to stage bounds.
- `meta.autoCamera` (default true) adds `zoom_punch` on hits with `damage > 15` and widens framing during dashes and launches, unless the script already has a camera key within 0.3 s.

### 11.6 Speech, captions, safe areas
- Speech bubbles: rounded rectangle, tail toward the head, bundled comic font, auto-sized, ≤ 40 characters, kept inside the frame.
- Captions: bottom/top/center bands with safe margins. Portrait safe area keeps text out of the bottom 20% and top 12% (Shorts UI).

---

## 12. Props (`data/props.js`, `engine/props.js`)

```js
sword:    { kind:"sword", shape:"line", len:70,  width:7,  grip:"rHand", color:"#dddddd", hitRadius:16 },
club_big: { kind:"club",  shape:"club", len:120, width:14, grip:"rHand", color:"#6b4a2b", hitRadius:30 },
staff:    { kind:"staff", shape:"line", len:150, width:6,  grip:"rHand", twoHand:true },
bat:      { kind:"bat",   shape:"line", len:90,  width:9,  grip:"rHand" },
shield:   { kind:"shield",shape:"disc", radius:36, grip:"lHand" },
```

- A prop is attached to its grip joint, oriented along the forearm plus an optional per-key `propAngle`.
- `propTip` is a hit part and an FX trail source (`slash_arc`).
- Prop state changes: `pick_prop`, `drop_prop` (moves), `throw_prop` (becomes a projectile), `prop_break` (world beat: two spinning halves, then removed).
- A move's `needsProp` names a prop `kind`. The validator tracks each character's prop over time.

---

## 13. Effects (`data/fx.js`, `engine/fx.js`)

### 13.1 FX presets

| FX | Description |
|---|---|
| `impact_small`, `impact_med`, `impact_big` | Radial burst of 6/10/16 short lines, starburst flash, expanding ring |
| `block_spark` | Small bright fan of sparks away from the blocker |
| `spark` | Fast streaks with gravity |
| `dust_land` | 8 grey puffs near the feet |
| `dust_run` | Periodic small puffs behind running feet |
| `shockwave` | Expanding ground ellipse, fading stroke |
| `slash_arc` | Fading arc along the last N `propTip` positions |
| `speed_lines` | Streaks along the character's motion direction |
| `afterimage` | Fading ghost skeletons from previous frames |
| `aura` | Pulsing glow ring and rising particles (`color`) |
| `energy_ball` | Glowing projectile visual with trail |
| `explosion` | Fireball circles, debris, screen flash |
| `smoke` | Slow, large, low-alpha puffs |
| `stars_dizzy` | Orbiting stars above the head |
| `sweat_drop`, `anger_mark`, `heart`, `exclaim`, `question` | Comic glyphs above the head |

Content rule: no blood or gore anywhere. Impacts use flashes, stars and lines only.

### 13.2 Particles (analytic)
Particles do not have per-tick state. Each emission appends a record to an **emit log**:

```
{ fxT0, x0, y0, vx0, vy0, ax, ay, drag, life, size0, size1, rot0, vrot,
  color, alpha0, alpha1, shape }       // shape: dot | line | ring | star | puff | glyph
```

Position at age `a = fxT(n) - fxT0` is closed form:
`x(a) = x0 + (vx0 - ax/k)(1 - e^(-k a))/k + (ax/k) a` (and the same for y), or simple ballistic when `drag k = 0`.

- The renderer evaluates live particles for frame `n` from the log. Nothing is stored per frame except `fxT`.
- Particles slow down in slowmo and keep moving during hitstop because they run on the fx clock.
- Budget: at most 2,000 live particles. Emissions over budget are dropped deterministically (in emission order) and reported as a validator warning.
- Particles that need per-tick physics beyond this (collisions) are out of scope for v1.

### 13.3 Stateful effects
- `afterimage` and `slash_arc` read joint and tip positions from previous frames in the frame store.
- `shake`: seeded value noise, amplitude decaying exponentially on the fx clock. Presets: `small` 6 px / 0.15 s, `med` 14 px / 0.25 s, `big` 28 px / 0.45 s.
- `zoom_punch`, `flash`, `fade`, `desaturate`, `vignette_pulse` are overlay state stored per frame.
- `desaturate` is drawn with `globalCompositeOperation = "saturation"` and a grey fill, which works in both canvas backends.

---

## 14. Rendering (`engine/renderer/`)

### 14.1 Draw order
1. Background layers with parallax factors (sky 0.1, far 0.3, mid 0.6, ground 1.0). Static layers are cached once per theme on offscreen canvases.
2. Camera transform: `translate(w/2, h/2) scale(zoom) translate(-cam.x + shake.x, -cam.y + shake.y)`.
3. Ground shadows (ellipses, scaled and faded by height above ground).
4. Afterimages.
5. Characters, sorted by scale (larger behind) then by array order: far limbs, torso, head, near limbs, props, accessories.
6. Projectiles and props in flight.
7. Particles.
8. Screen space: speech bubbles, HP bars, text pops, captions, flash, vignette, desaturate, fade.

### 14.2 Character drawing
- Limbs and torso: round caps and joins.
- Head: filled circle with outline; two eye dots by facing; mouth `neutral | shout | grin` from the move.
- Styles: `outline` (dark stroke under the color, default on), `glow`, `overlap`, `squash`.
- Accessories from joint positions: `headband` (two-segment spring ribbon), `cape`, `hat`, `scarf`. Accessory springs are simulated in story time and stored in the frame store.
- Far limbs at 85% brightness.

### 14.3 Themes (`data/themes.js`)

| Theme | Background | Palette |
|---|---|---|
| `white_stage` | Plain white with soft shadow (classic look) | Mono |
| `void_grid` | Dark gradient, faint perspective grid | Neon |
| `dojo_dusk` | Silhouette wall, lanterns, warm sky | Warm |
| `rooftop_city` | Skyline parallax, stars, moon | Cool |
| `desert_noon` | Dunes, sun, heat haze | Sandy |
| `arena` | Crowd silhouettes, floor lines | Neutral |
| `snow_mountain` | Layered mountains, falling snow | White/blue |

Backgrounds are procedural. Animated elements (snow, haze, crowd) use the fx clock and the seeded `bg` stream. Each theme defines `characterContrast` so the validator can warn when a character color is too close to the background.

### 14.4 Performance targets (Node Skia backend, Apple Silicon laptop)
- `renderFrame` ≤ 12 ms at 1080p for two characters and 500 particles.
- End to end (render + pipe + encode) ≥ 25 frames per second, so a 30 s video renders in about 75 s.

---

## 15. Public API and determinism

### 15.1 API (`engine/index.js`)

```js
import { createEngine } from "./engine/index.js";

const engine = createEngine({ catalog });     // catalog defaults to /data
const result = engine.load(script);
// → { ok, errors:[{code,path,message,fix}], warnings:[...],
//     totalFrames, fps:60, width, height, timeline:[...] }

engine.renderFrame(ctx, n);                   // draws frame n into ctx; pure w.r.t. (store, n)
engine.getAudioEvents();                      // → [{ t, sfx, volume, pan }]   (t in video seconds)
engine.getAnchors();                          // → [{ beatId, anchor, t }]   (resolved anchor times)
engine.getMeta();                             // → { title, format, seed, durationSec, ... }
engine.dispose();
```

Tools and the browser use the same API. `web/index.html` adds a preview loop on top (requestAnimationFrame calling `renderFrame`); that loop is not part of the engine.

### 15.2 Determinism rules
1. One simulation step per video frame, `dt = storyDelta` (section 6).
2. All randomness comes from `mulberry32` streams derived as `seed ^ hash32(name)` for `physics`, `fx`, `camera`, `bg`, `director`. Adding an FX does not change physics.
3. Iterate arrays in stable order. Never rely on object key order where order matters.
4. The simulation never reads canvas state or font metrics. Text layout happens only in the renderer.
5. Byte-identical output is guaranteed per (engine version, canvas backend version, platform). Pin backend and ffmpeg versions in `package.json` and `docs/REQUIREMENTS.md`.
6. Fonts are bundled files registered explicitly (Node) or loaded with `@font-face` and awaited via `document.fonts.ready` (browser). No system fonts.

### 15.3 Frame store
Per video frame:

```js
{ storyT, fxT,
  cam: { x, y, zoom, shakeX, shakeY },
  chars: [{ id, joints: Float32Array(26), facing, scale, hp, mouth, alpha,
            prop: { kind, angle, state } | null, accessory: Float32Array }],
  projectiles: [...],
  overlay: { flash, fade, desat, vignette, slowmo, texts:[...], bubbles:[...] } }
```

Plus one shared **emit log** for particles (13.2) and one **events** list (audio, anchors). Size is about 1-2 KB per frame, so a 180 s video (10,800 frames) needs about 20 MB.

### 15.4 Audio events
Moves, hits and FX emit named SFX in story time. `audio_events.js` converts them to video time (so slowmo and hitstop are accounted for) and adds `pan` from screen x (-1..1).

Required SFX keys: `whoosh`, `punch_light`, `punch_heavy`, `kick_light`, `kick_heavy`, `block`, `parry`, `slash`, `sword_clash`, `land`, `land_heavy`, `explosion`, `energy_charge`, `energy_fire`, `shockwave`, `ko`, `bell`, `pop`, `boing`, `slip`, `crowd_cheer`, `crowd_gasp`, `step`.

---

## 16. Validator (`engine/validator/`)

The validator is the LLM's feedback channel. Messages must be specific and actionable.

```json
{ "code": "E_MOVE_UNKNOWN", "path": "beats[7].do",
  "message": "Unknown move 'super_kick'.",
  "fix": "Use one of: front_kick, roundhouse, axe_kick, flying_kick (closest match: flying_kick)." }
```

It runs in three stages and stops at the first stage with errors:

### 16.1 Schema (`schema.js`)
- Required fields and types, `version` supported, enum values, numeric ranges (scale 0.4-4, speed 0.25-3, hp 1-1000, x within stage, colors as `#rrggbb`).
- Unique character ids and beat ids.
- Size limits: script ≤ 64 KB, ≤ 200 beats, ≤ 6 characters, text length limits.
- `schema.js` also exports the JSON Schema used for LLM structured output (17.3).

### 16.2 Semantics (`semantic.js`)
- `do` exists; `who` exists; `target` exists and is not self unless the move allows it; world beats use world commands only.
- `params` keys are declared by the move.
- Armed moves require the matching prop kind at that time (the validator tracks pick, drop, throw and break).
- `at` references exist, anchors are valid for that move, and there are no reference cycles.
- `outcome` only on attack beats.
- Characters after `ko_*` cannot act unless `get_up` or `spawn` comes first.
- Camera: first key resolves to `t = 0`; targets exist.
- Text: `say` ≤ 40 chars, `text_pop` ≤ 16, `caption` ≤ 80, characters supported by the bundled fonts, no blocklist matches.

### 16.3 Dry run (`index.js`)
Runs the full simulation without rendering, then checks:
- Attack beats: required start x is reachable (with `approach` within 3 s, or within `maxNudge` without it). Errors suggest `approach: "run"`.
- Queued beats that start more than 0.5 s after their `at` (warning, shows the actual start).
- Total video duration between 3 and 180 s.
- Particle budget overflow (warning).
- Character color contrast against the theme (warning).

Every result, valid or not, includes a **timeline** the LLM can read:

```
t=0.50  boss   taunt          0.50-1.70
t=2.00  hero   dash           2.00-2.40
t=3.00  hero   run (approach) 3.00-3.35
t=3.35  hero   flying_kick    3.35-4.25  hit@3.80 → boss hit_heavy
t=3.80  world  slowmo x0.3    (story 3.80-4.30, video +1.17 s)
```

### 16.4 Pacing heuristics (warnings)
- A gap with no action longer than 2.5 s.
- No hit with shake or hitstop in the whole script.
- More than 8 consecutive attacks without a reaction or dramatic beat.
- No ending beat (victory, KO or fade).
- A heavy hit (`damage > 15`) with no slowmo, zoom or focus within 0.5 s.

---

## 17. Recording and audio (`tools/`)

### 17.1 `record.mjs` flow
1. Read the script, `createEngine().load(script)`. Abort and print validator output on errors.
2. Register bundled fonts with the Node canvas backend. Create one canvas of the format size.
3. Spawn ffmpeg reading raw frames from stdin:
   ```
   ffmpeg -y -f rawvideo -pix_fmt rgba -s 1920x1080 -r 60 -i - \
     -c:v libx264 -preset medium -crf 16 -pix_fmt yuv420p -movflags +faststart video.mp4
   ```
4. For each `n`: `renderFrame(ctx, n)`, read RGBA with `getImageData`, write to ffmpeg stdin respecting backpressure.
5. Build audio with `mix.mjs`, then mux:
   ```
   ffmpeg -y -i video.mp4 -i audio.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest final.mp4
   ```
6. Write the thumbnail, contact sheet and metadata (17.4).

Flags: `--format`, `--from`, `--to` (frame range for quick checks), `--frames-only` (PNG sequence for debugging), `--hash` (print per-frame hashes for determinism tests).

### 17.2 Audio mixing (`mix.mjs`)
- The mixer runs in Node, not in an ffmpeg filtergraph, so any number of events works.
- SFX files are 48 kHz 16-bit WAV. Variants `punch_heavy_1.wav`, `punch_heavy_2.wav` are chosen with the seeded `audio` stream.
- Each event is summed into a Float32 stereo buffer with constant-power pan and volume. Music is decoded by ffmpeg to raw float PCM, then looped or trimmed, ducked by 4 dB under heavy hits and faded out at the end.
- A lookahead peak limiter keeps output at or below -1 dBFS. Output is a 48 kHz stereo WAV.

### 17.3 SFX sources
- `sfxgen.mjs` generates every required SFX key procedurally and deterministically (noise bursts, filtered sweeps, envelopes), so the pipeline works with no downloaded assets.
- Files dropped into `assets/sfx/<key>.wav` (or variants) override generated ones. Only CC0 or properly licensed assets; record each source in `assets/sfx/SOURCES.md`.
- Music must be royalty-free and safe for YouTube Content ID; record sources in `assets/music/SOURCES.md`. Scripts may omit music.

### 17.4 Outputs
- `out/<slug>/final.mp4` (H.264 + AAC, 60 fps, format size)
- `out/<slug>/script.json` (exact script used)
- `out/<slug>/thumb.png` (frame with the highest action score: live particles near center, plus a heavy-hit bonus)
- `out/<slug>/contact_sheet.png` (4x4 grid of evenly spaced frames)
- `out/<slug>/meta.json` (title, duration, seed, engine version, validator warnings, timeline, render time)

---

## 18. LLM integration (`tools/generate.mjs`)

### 18.1 Stages and models

| Stage | Task | Default model |
|---|---|---|
| Ideation | N premises with beat outlines | `claude-sonnet-5-5` |
| Script writing | Premise → JSON script | `claude-sonnet-5-5` (`claude-opus-5-5` for flagship videos) |
| Repair | Fix validator errors | `claude-haiku-5-5`, escalate to Sonnet on the 3rd attempt |
| Critique (optional) | Contact sheet + timeline → pacing notes (JSON) | `claude-opus-5-5` (vision) |
| Metadata | Title, description, tags | `claude-haiku-5-5` |

Model ids live in one config file so they can be changed without code changes.

### 18.2 Prompt pack for script writing
System prompt, in order (static, cached):
1. Role: "You write JSON scripts for a stickman animation engine."
2. Condensed schema (about 60 lines) with the four `at` forms and `outcome`.
3. Auto-generated move catalog: `name | category | duration | params | needsProp | anchors`.
4. FX, SFX, theme and world-command lists.
5. Pacing rules: three acts for 20-40 s videos (setup, escalation, payoff); slowmo or focus on the biggest hit using `{"on":"<id>.hit"}`; vary rhythm; end with a clear beat.
6. Two or three small example scripts (about 1.5 KB each).
7. Hard limits: max 60 beats from the LLM, max duration, allowed themes.

User prompt: premise, length, tone (epic, comedic, parody), format.

### 18.3 Structured output and repair loop
- Use the API's structured-output / strict tool-input feature with the JSON Schema exported by `schema.js`, so structural errors are rare. Check current Anthropic API docs for the exact parameter at implementation time.
- Repair loop:
  ```
  for attempt in 1..3:
      script = llm(prompt)
      result = validate(script)            // Node, same engine, dry run
      if result.ok: break
      prompt += errors + timeline + "Return the corrected full JSON."
  ```
  Discard and log the premise after 3 failed attempts.

### 18.4 Variety and quality controls
- `out/history.json` tracks used premises, moves, themes and palettes; the prompt includes "avoid repeating: …".
- Automatic score before rendering: distinct moves (aim 8+), FX events per 10 s, at least one slowmo/focus, camera changes, ending beat. Scripts under the threshold are regenerated once, then discarded.
- Optional critique: one revision round driven by the vision critique.

### 18.5 Token budget
System prompt about 4-6K tokens (cached). Output about 1-2K tokens per script.

### 18.6 Human review and platform policy
- Nothing is uploaded automatically. `tools/generate.mjs` writes to `out/` and appends to `out/review_queue.json`.
- YouTube restricts monetization of mass-produced, repetitive ("inauthentic") content. Variety controls (18.4) and human curation are part of the product, not optional polish.

---

## 19. Choreography guidelines (baked into data)

1. **Anticipation**: every attack's windup takes at least 15-25% of its duration.
2. **Hold on contact**: hitstop on every landing hit; bigger hits hold longer.
3. **Follow-through**: attack poses overshoot and settle.
4. **Squash and stretch**: optional style flag on land and impact.
5. **Camera supports action**: `autoCamera` zoom punches heavy hits and widens on dashes and launches.
6. **Readable silhouettes**: outline on by default; validator checks color contrast.
7. **Rhythm**: vary gaps; flurry, pause, big move.
8. **Scale contrast**: for power stories make the opponent 2-4x scale. IK aiming (8.3) keeps contact believable.

---

## 20. Testing, acceptance and budgets

### 20.1 Tests (`node --test`)
- **Unit**: easing endpoints, lerp, PRNG repeatability, expression evaluator (valid and rejected inputs); FK table cases incl. `head` sign, `rot` and mirror symmetry; IK reach clamping and bend side; ground contact for lying poses; every move's keys sorted with `t` in [0,1], referenced poses exist, attacks have hits; clock behavior under slowmo and hitstop; analytic particle formula against numeric integration.
- **Validator**: a bad-script corpus (30+ fixtures) with expected error codes; every sample script valid.
- **Integration**:
  - Determinism: load and render the same script twice; SHA-256 of every frame's RGBA must match.
  - Golden frames: 5 scripts x 10 frames vs stored PNGs (tolerance 0.5% pixels, per backend).
  - Hit connectivity: every attack, every outcome, against dummies at scale 0.6, 1.0, 2.2 and 3.5.
  - Fuzz: 200 random valid scripts; no NaN joints, nobody outside the stage, no exceptions, particle budget respected.

### 20.2 Acceptance criteria (v1 done when)
1. Every catalog move plays without visual glitches in `web/catalog.html` (human review sign-off).
2. A 30 s sample renders to MP4 in under 2 minutes on the dev machine.
3. Two consecutive renders of the same script produce identical per-frame hashes.
4. With the prompt pack and structured output, ≥ 70% of generated scripts validate on the first attempt and ≥ 98% within 3 attempts (100-script batch).
5. Ten generated videos are judged visually distinct (moves, themes, camera work).
6. A portrait (9:16) sample keeps all text and characters inside safe areas.

### 20.3 Size budget

| Area | Lines (approx) |
|---|---|
| `/engine` logic | 3,200 (no module over ~350) |
| `/data` (poses, ~85 moves, props, FX, themes) | 2,000 |
| `/tools` | 1,000 |
| `/web` | 800 |
| `/tests` | 1,500 + fixtures |

---

## 21. Security and safety

- No `eval`, `Function` or dynamic import of script content. `expr.js` whitelists tokens.
- Limits: script 64 KB, 200 beats, 6 characters, string lengths per field.
- No network calls in `/engine`. Only `tools/generate.mjs` talks to the Anthropic API, using `ANTHROPIC_API_KEY` from the environment (never stored in the repo).
- Content policy: no blood or gore, no real people or brands, no hateful imagery. Text fields are checked against `data/blocklist.js`.

---

## 22. Build plan (summary)

Full plan with tasks and estimates: `docs/IMPLEMENTATION_PLAN.md`.

| # | Milestone | Done when |
|---|---|---|
| M0 | Foundations | FK/IK/rot tests pass; poses render in Node PNG and browser; canvas backend chosen by benchmark |
| M1 | Moves + editor | 8 moves loop cleanly; `web/editor.html` edits poses and keys and exports data |
| M2 | Physics + combat | Two characters fight with IK aiming and all five outcomes |
| M3 | Clocks + director + validator | Sample script plays from JSON; validator returns errors and timeline; **schema frozen** |
| M4 | FX + camera + themes | Impacts, shake, slowmo, hitstop, follow cam, 2 themes, bubbles, captions |
| M5 | Frame store + determinism | Random-access render; determinism and golden tests pass |
| M6 | Recorder + audio | One command: JSON → MP4 with mixed audio, thumb, contact sheet |
| M7 | Catalog completion | All moves, props, 7 themes, portrait; catalog sign-off |
| M8 | LLM loop | Batch of 10 videos generated unattended into the review queue |
| M9 | Hardening | Fuzz, performance and all acceptance criteria pass |

After M3, the public API and script schema are backward-compatible only: older scripts must keep rendering.

---

## 23. Future extensions (not in v1)

- `wall_run`, multi-segment spine and ragdoll-lite falls.
- Procedural fight generator (simulated mode with AI behaviors).
- Character variants (fat, tall, kid), expressions, hats.
- Voice-over via TTS and word-timed captions.
- Beat-sync: align heavy hits to music beat markers.
- Browser timeline editor for whole scripts.
- Seeded "Fight Club" series: same characters, different seeds.
- Auto-thumbnail text overlay.

---

## Appendix A: Minimal sample script

```json
{
  "version": 1,
  "meta": { "title": "Showdown", "format": "landscape", "seed": 7,
            "mode": "choreographed", "theme": "dojo_dusk" },
  "characters": [
    { "id": "hero", "x": 700,  "facing": 1,  "color": "#22aaff", "scale": 1.0, "hp": 100 },
    { "id": "boss", "x": 1500, "facing": -1, "color": "#ff3b3b", "scale": 2.0, "hp": 200 }
  ],
  "camera": [
    { "at": 0, "mode": "follow", "targets": ["hero", "boss"], "zoom": "auto", "padding": 300 }
  ],
  "beats": [
    { "id": "t1", "at": 0.5, "who": "boss", "do": "taunt", "say": "Is that all?" },
    { "id": "d1", "at": { "after": "t1", "delay": 0.3 }, "who": "hero", "do": "dash", "target": "boss" },
    { "id": "k1", "at": { "after": "d1" }, "who": "hero", "do": "flying_kick", "target": "boss",
      "approach": "run", "outcome": "hit" },
    { "at": { "on": "k1.hit" }, "who": "world", "do": "slowmo",
      "params": { "scale": 0.3, "duration": 0.5 } },
    { "id": "h1", "at": { "after": "k1", "delay": 0.4 }, "who": "boss", "do": "haymaker",
      "target": "hero", "outcome": "dodged" },
    { "id": "f1", "at": { "after": "h1", "delay": 0.2 }, "who": "hero", "do": "flurry",
      "target": "boss", "approach": "run", "outcome": "hit" },
    { "id": "ko", "at": { "after": "f1" }, "who": "boss", "do": "ko_fall" },
    { "id": "v1", "at": { "after": "ko", "delay": 0.3 }, "who": "hero", "do": "victory", "fx": ["aura"] },
    { "at": { "with": "v1" }, "who": "world", "do": "text_pop", "params": { "text": "K.O.!" } },
    { "at": { "after": "v1", "delay": 0.5 }, "who": "world", "do": "fade",
      "params": { "to": "black", "dur": 1, "dir": "out" } }
  ]
}
```

## Appendix B: Glossary
- **Beat**: one scripted command.
- **Anchor**: a named moment of a beat (`start`, `windowOpen`, `hit`, `end`) that other beats and camera keys can reference.
- **Move**: reusable animation unit defined by pose keys, root motion, hits and events.
- **Pose**: a set of joint angles and root offsets.
- **Reach**: forward distance from root to an attack's contact point, derived from the move data.
- **Outcome**: the authored result of a choreographed attack (`hit`, `whiff`, `blocked`, `parried`, `dodged`).
- **Story / fx / video clock**: the three time bases (section 6).
- **Hitstop**: brief global pause of the story clock on impact.
- **Frame store**: per-frame snapshots plus the particle emit log, enabling random-access rendering.

## Appendix C: Changes from v1.0

| Area | Change |
|---|---|
| Kinematics | Fixed `head` sign in `headCenter`. Added `rot` channel and body-center pivot for flips, rolls and lying poses |
| Ground contact | Snap to the lowest point of any joint, rate-limited; disabled for airborne moves and negative root `dy` |
| Aiming | Added 2-bone IK during hit windows and `aim` on hits, so different-size characters connect believably |
| Positioning | Split `range` into derived `reach` and authored `travel`; `approach` and `snap_range` use one formula |
| Outcomes | Added `outcome: hit | whiff | blocked | parried | dodged` for choreographed attacks |
| Time | Defined story, fx and video clocks; slowmo uses fractional `dt`; hitstop is a global story pause |
| Beats | One `at` field with four forms incl. event anchors (`{"on":"k1.hit"}`); `wait` renamed to `interrupt` (inverse); `fps` and `duration` removed from scripts |
| World beats | Complete list incl. `caption`, `zoom_punch`, `desaturate`, `prop_break`, `music_cue` |
| FX | Removed `blood_free_hit` (now a content rule); `shake` is a separate field on hits; added `block_spark` |
| Particles | Analytic particles from an emit log; frame store about 20 MB for 180 s instead of hundreds of MB |
| Camera | Format-aware vertical framing and portrait safe areas; `orbit_zoom` renamed `push` |
| Recording | Node + Skia canvas → raw RGBA → ffmpeg replaces Playwright PNG capture; bundled fonts |
| Audio | Mixing in Node with a limiter; procedural SFX generator; licensing records |
| Validator | Three stages incl. a dry-run simulation and a readable timeline for the LLM |
| LLM | Structured output from the exported JSON Schema; current model ids; human review queue |
| Physics | `minGap` scales with character size; separation disabled during choreographed windows |
| Budgets | Realistic line budget split into logic and data; module cap 350; editor moved into M1 |
| Milestone M1 | Uses `front_kick` (catalog name) instead of `kick` |
