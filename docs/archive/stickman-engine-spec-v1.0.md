# Stickman Action Engine: Technical Specification

Version 1.0

## 0. How to use this document

This spec defines a small, deterministic, browser-based 2D stickman animation engine. An LLM never writes engine code at runtime. It only writes **scripts** (JSON) that the engine plays back. A headless browser records the playback into video.

The spec is written so each module can be handed to Claude as a self-contained build task. Section 21 gives the build order and a prompt template.

---

## 1. Goals and non-goals

### Goals
1. Play a JSON script and produce a polished action or comedy stickman animation.
2. Be fully deterministic: the same script and seed always produce identical frames.
3. Be frame-exact recordable: output is rendered frame by frame, independent of real time.
4. Keep the LLM's job tiny: a script is 1-4 KB of JSON, built from a fixed vocabulary.
5. Keep the engine small: target 1,500-2,500 lines of plain JavaScript, no runtime dependencies, no module over about 300 lines.
6. Be extensible by data: a new move, effect, prop or background is a data entry, not new logic, wherever possible.
7. Support both 16:9 (1920x1080) and 9:16 (1080x1920) for Shorts.

### Non-goals
- No 3D, no skinning, no real rigid-body or ragdoll physics engine.
- No in-engine editor UI (optional, later).
- No realtime interactivity or game logic. Playback only.
- No text-to-speech or music generation inside the engine.

---

## 2. Technology constraints

| Item | Decision |
|---|---|
| Language | Plain ES2020 JavaScript, ES modules |
| Rendering | Canvas 2D (`CanvasRenderingContext2D`) |
| Dependencies | None at runtime |
| Build step | None required (optionally one bundle step to a single `engine.js`) |
| Dev/recording tooling | Node 20+, Playwright, ffmpeg |
| Time | Fixed timestep, 60 simulation steps per second. `Date.now()`, `performance.now()` and `Math.random()` are forbidden in engine code |
| Randomness | Seeded PRNG (mulberry32) passed explicitly |
| Units | World units are pixels at 1080p. 1 unit = 1 px at camera zoom 1 |

---

## 3. High-level architecture

```
        script.json
             │
     ┌───────▼────────┐
     │   Validator    │  (pure; returns errors the LLM can read)
     └───────┬────────┘
             │ valid
     ┌───────▼────────┐
     │    Director    │  schedules actions, resolves targets, queues
     └───────┬────────┘
             │ per-tick commands
     ┌───────▼────────┐
     │  Simulation    │  moves, physics, hit detection, FX state, camera
     └───────┬────────┘
             │ snapshot per frame
     ┌───────▼────────┐
     │ Frame Store    │  array of compact world states (random access)
     └───────┬────────┘
             │ renderFrame(n)
     ┌───────▼────────┐
     │   Renderer     │  pure draw: state -> canvas pixels
     └───────┬────────┘
             │
     Recorder (Node + Playwright + ffmpeg)  ->  video.mp4
```

**Key design decision: simulate first, render later.**
On `load(script)`, the engine runs the entire simulation headlessly and stores one snapshot per frame. `renderFrame(n)` is then a pure function of snapshot `n`. This gives random access to any frame, trivial determinism, and a recorder that cannot drop frames.

### 3.1 File layout

```
/engine
  index.js          public API (Engine object)            ~100 lines
  config.js         constants, defaults, themes           ~120
  math.js           vec, lerp, clamp, easing, PRNG        ~100
  skeleton.js       joints, forward kinematics            ~150
  poses.js          named poses data                      ~200
  moves.js          move registry (data) + move runtime   ~400
  props.js          weapons/objects data + attach logic   ~120
  physics.js        root motion, gravity, bounds, knockback ~200
  combat.js         hitboxes, hit resolution, reactions   ~200
  fx.js             particles, shake, hitstop, flashes    ~250
  camera.js         follow, zoom, shake, keyframes        ~120
  director.js       script scheduler                      ~250
  validator.js      schema + semantic checks              ~250
  renderer.js       canvas drawing                        ~350
  backgrounds.js    background layer definitions          ~120
  audio_events.js   sfx event collection                  ~60
/tools
  record.mjs        Playwright + ffmpeg recorder
  generate.mjs      LLM script generation loop
  catalog.mjs       auto-generates move catalog for prompts
/tests
/scripts            sample scripts
index.html          host page for the engine
```

---

## 4. Coordinate system and conventions

- Canvas: 1920x1080 (landscape) or 1080x1920 (portrait). Set via `script.meta.format`.
- World space: x to the right, **y down** (canvas convention). World origin is the left edge of the stage at the ground line.
- Stage: world x range `[0, stageWidth]`, default `stageWidth = 3200` (wider than the screen so the camera can pan). Ground line `groundY = 880`.
- Time: seconds in scripts, converted to frames (`frame = round(t * 60)`).
- Facing: each character has `facing` of `+1` (right) or `-1` (left). Poses are authored for facing right and mirrored by the renderer.
- Angles: degrees in data and radians internally.

---

## 5. Skeleton model

### 5.1 Body dimensions (default, scale 1.0)

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

Hip-to-ground height standing: `48 + 46 = 94` px.
A character's `scale` multiplies all lengths and line width. Valid range 0.4-4.0.

### 5.2 Joints (pose channels)

A **pose** is a set of angles in degrees plus a root offset.

| Channel | Meaning | 0° means | Positive direction |
|---|---|---|---|
| `lean` | Torso tilt from vertical | upright | leaning forward |
| `head` | Head tilt relative to torso | aligned with torso | tilting forward |
| `lUA`, `rUA` | Upper arms (L = far, R = near) | hanging along torso toward hip | swinging forward |
| `lFA`, `rFA` | Forearms | straight continuation of upper arm | elbow flexing, forearm swinging forward |
| `lTH`, `rTH` | Thighs | straight down along torso axis | swinging forward |
| `lSH`, `rSH` | Shins | straight continuation of thigh | knee flexing, shin swinging backward |
| `dx`, `dy` | Root offset from the character's anchor, in px | none | forward / down |

Left side is the **far** limb (drawn first, slightly darker). Right side is the **near** limb (drawn last).

### 5.3 Forward kinematics

Define `dir(a) = (facing * sin(a), cos(a))` in screen coordinates (y down), so `a = 0` points straight down and `a = 90°` points forward.

```
hip         = root position (pelvis)
torsoAngle  = 180 - lean                     // points up, tilted forward
shoulder    = hip + dir(torsoAngle) * torsoLen
neckTop     = shoulder + dir(torsoAngle) * neckLen
headCenter  = neckTop + dir(180 - lean + head) * headRadius

baseLimb    = -lean                          // "hanging along torso"
UA_world    = baseLimb + UA
FA_world    = UA_world + FA
elbow       = shoulder + dir(UA_world) * upperArmLen
hand        = elbow + dir(FA_world) * forearmLen

TH_world    = baseLimb + TH
SH_world    = TH_world - SH
knee        = hip + dir(TH_world) * thighLen
foot        = knee + dir(SH_world) * shinLen
```

`skeleton.js` exposes `computeJoints(pose, rootPos, facing, scale) -> { hip, shoulder, head, lElbow, lHand, rElbow, rHand, lKnee, lFoot, rKnee, rFoot, neckTop }`.

### 5.4 Ground snapping
When a character is `grounded`, after computing joints the engine shifts the root vertically so the lowest foot touches `groundY`. This keeps crouches, kicks and lean poses from floating or sinking. When `airborne`, snapping is disabled and physics controls `y`.

---

## 6. Poses and interpolation

### 6.1 Named poses (`poses.js`)
Each pose is a full channel set. Minimum set:

`stand`, `guard` (fists up), `crouch`, `walkA`, `walkB`, `runA`, `runB`, `jumpUp`, `jumpPeak`, `jumpFall`, `punchWindup`, `punchExtend`, `kickWindup`, `kickExtend`, `hitLight`, `hitHeavy`, `down` (lying on back), `downFace` (lying face down), `getUp1`, `getUp2`, `block`, `taunt1`, `taunt2`, `victory`, `swordGuard`, `swordSlashA`, `swordSlashB`.

Example:
```js
stand: { lean:0, head:0, lUA:8, lFA:6, rUA:-8, rFA:6, lTH:6, lSH:0, rTH:-6, rSH:0, dx:0, dy:0 },
guard: { lean:10, head:-4, lUA:60, lFA:100, rUA:40, rFA:110, lTH:-14, lSH:20, rTH:16, rSH:24, dx:0, dy:6 },
```

### 6.2 Interpolation
- Interpolate channel-by-channel with `lerp(a, b, ease(u))`.
- Angles are not wrapped. Poses are authored so shortest paths are numerically direct.
- Missing channels in a partial pose keyframe inherit from the previous keyframe (or from `stand` at the start).

### 6.3 Easing functions (`math.js`)
`linear`, `inQuad`, `outQuad`, `inOutQuad`, `inCubic`, `outCubic`, `inOutCubic`, `outBack`, `outElastic`, `outBounce`, `snap` (instant at 50%), `holdThenSnap` (stays at start until 85%, then snaps; good for punches).

### 6.4 Secondary motion (cheap, deterministic)
- Optional **overlap** on hands and head: a damped spring lags the target angle (`k = 180`, `damping = 18`) giving slight whip. Toggle per character: `style.overlap: true`.
- Optional **idle breathing**: a sine on `dy` (amplitude 2 px, period 2.4 s) and on arm angles (+-2°) while in `idle`.

---

## 7. Moves

A **move** is a data object plus a small runtime that plays it.

### 7.1 Move schema

```js
{
  name: "flying_kick",
  category: "attack",            // attack | movement | reaction | emote | utility
  duration: 0.9,                 // seconds at speed 1.0
  params: { range: 260, damage: 14 },   // defaults; script may override
  keys: [                        // pose keyframes, t normalized 0..1
    { t:0.00, pose:"crouch", ease:"outQuad" },
    { t:0.30, pose:"jumpUp", ease:"outCubic" },
    { t:0.55, pose:{ lean:50, rTH:80, rSH:0, lTH:-30, lSH:30 }, ease:"holdThenSnap" },
    { t:1.00, pose:"jumpFall" }
  ],
  root: [                        // root motion keyframes (offsets in facing space)
    { t:0.0, dx:0,   dy:0 },
    { t:0.5, dx:"range*0.7", dy:-140 },
    { t:1.0, dx:"range",     dy:0 }
  ],
  hits: [
    { t0:0.50, t1:0.70, part:"rFoot", damage:"damage", knock:[520,-200],
      hitstop:0.09, reaction:"hit_heavy", fx:["impact_big","shake_med"], sfx:"kick_heavy" }
  ],
  events: [ { t:0.00, sfx:"whoosh" }, { t:0.95, fx:["dust_land"], sfx:"land" } ],
  flags: { airborne:true, lockFacing:true, invulnerable:false },
  chain: null                    // optional name of auto-followup move
}
```

Expressions in strings (`"range*0.7"`) are evaluated against `params` using a tiny safe evaluator (numbers, params, `+ - * /` only). No `eval`.

### 7.2 Runtime behavior
- A character has one **current move**, a **move time**, and a **queue**.
- When the move ends, the character returns to `idle` unless the queue has another action.
- Move `speed` (script-controlled, default 1.0) scales duration.
- Blending: when switching moves, blend from the last pose to the new first keyframe over `blend` seconds (default 0.06; 0 for hit reactions).
- Root motion is **additive** on the character's anchor position and applied in facing space.

### 7.3 Required move catalog (v1)

**Movement:** `idle`, `walk`, `run`, `dash`, `slide`, `jump`, `backflip`, `frontflip`, `dodge_back`, `dodge_roll`, `duck`, `side_step`, `land_roll`, `wall_run` (optional)

**Unarmed attacks:** `jab`, `cross`, `hook`, `uppercut`, `haymaker`, `front_kick`, `roundhouse`, `axe_kick`, `sweep`, `flying_kick`, `spinning_kick`, `elbow`, `knee`, `headbutt`, `flurry` (rapid 6-hit combo), `ground_pound` (shockwave), `energy_blast` (projectile), `charge_up` (aura)

**Armed attacks (require prop):** `sword_slash`, `sword_thrust`, `sword_spin`, `sword_overhead`, `staff_swing`, `staff_spin`, `bat_swing`, `throw_prop`, `shoot`

**Defensive:** `block`, `parry`, `counter`, `catch_weapon`

**Reactions (auto-triggered):** `hit_light`, `hit_heavy`, `hit_launch` (sent flying), `stagger`, `knockdown`, `get_up`, `ko_fall`, `ko_spin`, `dizzy`

**Emotes:** `taunt`, `wave`, `bow`, `flex`, `laugh`, `shrug`, `facepalm`, `victory`, `cower`, `dance_a`, `dance_b`, `point`

**Utility:** `face` (turn to target), `wait` (hold current pose), `teleport` (instant reposition), `spawn`, `despawn`

Every move must declare `category`, `duration`, and (for attacks) at least one `hits` entry. The catalog tool (`catalog.mjs`) auto-generates a compact table of `name | category | duration | params | needs_prop` for LLM prompts.

---

## 8. Physics (`physics.js`)

Intentionally minimal. Each character body has:

```js
{ x, y, vx, vy, grounded, facing, mass }
```

### 8.1 Rules per tick (dt = 1/60)
1. Apply move root motion as **position targets**, not forces, while a move controls the body.
2. If `airborne` and no move root-control: `vy += gravity * dt` (default gravity 2600 px/s²).
3. Knockback and launch set `vx`, `vy`. Ground friction: `vx *= 0.86` per tick while grounded (tunable).
4. Ground collision: if `y >= groundY` while descending, set `y = groundY`, `vy = 0`, `grounded = true`, emit `land` event with impact speed. Large impact speed triggers `dust_land` and optionally `shake_small`.
5. Stage bounds: clamp `x` to `[margin, stageWidth - margin]`. Optional `wallBounce` for launched characters (reflect `vx` with 0.4 restitution, emit `wall_hit` FX).
6. Character-to-character separation: if two bodies overlap in x by less than `minGap` (default 40 px) and both grounded, push apart symmetrically. Disable per-move via `flags.passThrough`.

### 8.2 Launch resolution
`hit_launch` uses an initial velocity vector from the hit's `knock`. While launched, the character spins (`lean` rotates at `spin` deg/s) until landing, then plays `knockdown`.

### 8.3 Projectiles and props in flight
Projectiles are simple bodies: `{ x, y, vx, vy, gravity, radius, damage, owner, life }`. Hit test: circle vs target's body capsule list. On hit or lifetime expiry, spawn FX and remove.

---

## 9. Combat resolution (`combat.js`)

### 9.1 Hurtboxes
Each character has hurt capsules built from the skeleton each tick: head (circle), torso (capsule hip-shoulder), upper and lower limbs (capsules, radius = half line width + 4).

### 9.2 Hitboxes
During a hit window, the hitbox is the named `part` joint (e.g. `rFoot`, `rHand`, `propTip`) as a circle with radius `hitRadius` (default 26 px, scaled), plus a swept segment from its previous-tick position to its current one so fast limbs never tunnel.

### 9.3 Resolution order (per tick)
1. Gather active hit windows.
2. For each, test against all enemy hurtboxes (and projectiles for destructible ones).
3. A hit lands once per window per target (`hitId` guard).
4. Check target state: `invulnerable` skips; `block` reduces damage to 20% and plays `block` FX; `parry` triggers attacker `stagger`.
5. Apply damage, `knock` (mirrored by attacker facing), and `hitstop`.
6. Trigger target reaction (from the hit's `reaction`, else chosen by damage: `<8 hit_light`, `<16 hit_heavy`, otherwise `hit_launch`).
7. Emit FX and SFX events.

### 9.4 Two script modes
- **choreographed** (default, `meta.mode: "choreographed"`): attacks flagged as scripted hits always connect. The engine auto-aligns attacker and target (see 11.4 `approach` and `snap_range`) so contact is guaranteed. Use this for "storytelling" videos where outcomes are authored.
- **simulated** (`meta.mode: "simulated"`): hits resolve strictly from geometry; misses are possible. Used for seeded randomized brawls (a future "AI fight" feature).

### 9.5 Health and KO
Characters have `hp` (default 100). When `hp <= 0` in simulated mode, the engine triggers `ko_fall` or `ko_spin` automatically. In choreographed mode, KO happens only when scripted (`do: "ko_fall"`), but HP bars still animate for visual consistency if enabled.

### 9.6 Hitstop
On a landing hit, both attacker and target freeze their move timers for `hitstop` seconds (typical 0.05-0.14 s), while FX and camera shake continue. This is the single most important "juice" effect for perceived power.

---

## 10. Effects system (`fx.js`)

### 10.1 FX registry
FX are named presets that spawn particles, flashes, camera modifiers or global effects. Each has `name`, `params`, `emit(ctx, at, params)`.

| FX name | Description |
|---|---|
| `impact_small/med/big` | Radial burst of 6/10/16 short lines plus a starburst flash and expanding ring |
| `spark` | Fast streak particles, gravity-affected |
| `dust_land` | 8 grey puffs expanding and fading near feet |
| `dust_run` | Small puffs behind running feet, spawned periodically |
| `shockwave` | Expanding ellipse on the ground, stroke fading |
| `slash_arc` | Curved fading arc tracing the weapon tip path (last N tip positions) |
| `speed_lines` | Screen-space or world-space streaks along motion direction |
| `afterimage` | Ghost copies of the skeleton at previous N poses, fading (motion trail) |
| `aura` | Pulsing glow ring and rising particles around a character (`color` param) |
| `energy_ball` | Glowing projectile visual with trail |
| `explosion` | Fireball circles plus debris plus screen flash |
| `smoke` | Slow, large, low-alpha puffs |
| `stars_dizzy` | Orbiting stars above head |
| `sweat_drop`, `anger_mark`, `heart`, `exclaim`, `question` | Comic emote glyphs above head |
| `text_pop` | Large comic text ("POW!", "K.O.!") with scale-bounce, rotation and outline |
| `screen_flash` | White/colored full-screen flash, 2-6 frames |
| `vignette_pulse` | Edge darkening for dramatic beats |
| `blood_free_hit` | Non-gory alternatives only (no blood). Impact uses stars and flashes |

(Keep content YouTube-friendly: no blood or gore, stylized impact only.)

### 10.2 Global effects
- `shake` presets: `small` (6 px, 0.15 s), `med` (14 px, 0.25 s), `big` (28 px, 0.45 s). Offset is seeded noise decaying exponentially.
- `slowmo`: `{ scale: 0.25, duration: 0.6, easeIn: 0.05, easeOut: 0.2 }` affects simulation time scale. The recorder still outputs at 60 fps, so slow motion is just more frames per simulated second (the engine runs fewer sim ticks per output frame).
- `freeze`: hard pause of all sim for `duration`, FX keep animating.
- `zoom_punch`: quick camera zoom in and back (e.g. 1.0 to 1.15 to 1.0 in 0.2 s).
- `desaturate`: grayscale filter ramp for KO moments.
- `color_grade`: per-theme tint overlay.

### 10.3 Particle system
- One pool, max 2,000 particles. Struct-of-arrays for speed.
- Fields: `x, y, vx, vy, ax, ay, life, maxLife, size0, size1, rot, vrot, color, alpha0, alpha1, shape (dot|line|ring|star|puff|text)`.
- Updated in the simulation tick, so particle positions are part of the per-frame snapshot (or re-derived deterministically; see 14.3).

---

## 11. Director and script format

### 11.1 Script top level

```json
{
  "version": 1,
  "meta": {
    "title": "Stickman vs The Giant",
    "format": "landscape",          // landscape | portrait
    "fps": 60,
    "seed": 1234,
    "mode": "choreographed",
    "duration": 24,                 // optional; auto-computed if absent
    "stageWidth": 3200,
    "theme": "dojo_dusk"
  },
  "characters": [
    { "id":"hero", "x":600, "facing":1, "color":"#22aaff", "scale":1.0, "hp":100,
      "style":{ "overlap":true, "headband":"#ff3355" }, "prop":null },
    { "id":"boss", "x":1700, "facing":-1, "color":"#ff3b3b", "scale":2.2, "hp":300,
      "style":{ "cape":"#222" }, "prop":"club_big" }
  ],
  "camera": [ ... ],
  "beats": [ ... ],
  "audio": { "music":"epic_01", "musicVolume":0.35 }
}
```

### 11.2 Beats

A **beat** is one command. Beats are sorted by time and executed in order.

```json
{
  "at": 3.5,                 // seconds; OR "after": "beatId", with "delay": 0.2
  "id": "kick1",             // optional, referencable
  "who": "hero",
  "do": "flying_kick",
  "target": "boss",          // optional
  "params": { "range": 300, "damage": 20 },
  "speed": 1.0,
  "approach": true,          // auto-run to get in range first
  "wait": true,              // if true, queue after the current move instead of interrupting
  "fx": ["shake_med"],       // extra FX at start
  "say": "HYAAA!",           // optional speech bubble text
  "sayDur": 1.2
}
```

Supported `at` forms: absolute seconds; `{ "after":"beatId", "delay":0.5 }` (starts that long after beat ends); `{ "with":"beatId" }` (simultaneous).

### 11.3 Non-character beats
`who: "world"` with `do` in: `shake`, `slowmo`, `freeze`, `flash`, `text_pop`, `spawn_prop`, `explosion`, `set_theme`, `music_cue`, `cut` (hard camera cut), `fade` (to black/white).

### 11.4 Auto-positioning (`approach`, `snap_range`)
- `approach: true`: before the move starts, the director inserts `run` or `walk` toward the target until within `move.params.range * 0.85` (max 3 s; fails validation if unreachable).
- In choreographed mode, `snap_range: true` (default) nudges attacker x at move start so that the hit window's contact joint ends within the target's hurtbox. This guarantees visually clean hits regardless of tiny distance errors.

### 11.5 Camera track

```json
"camera": [
  { "at":0,   "mode":"follow", "targets":["hero","boss"], "zoom":"auto", "padding":300 },
  { "at":8,   "mode":"focus",  "target":"hero", "zoom":1.6, "ease":"inOutCubic", "dur":0.8 },
  { "at":10,  "mode":"fixed",  "x":1500, "y":600, "zoom":1.0 }
]
```

Camera modes: `follow` (fits all targets with padding, smoothed), `focus` (single target), `fixed`, `pan` (to x,y over duration), `orbit_zoom` (slow push-in). Camera smoothing: critically damped spring (`omega = 8`). Camera clamps to stage bounds.

### 11.6 Speech and captions
- Speech bubbles: rounded rect, tail pointing at head, comic font, auto-sized, max 40 characters. Appear for `sayDur` seconds.
- Title cards and captions via `world` beat `caption` with text, position (`top|bottom|center`), duration. Safe margins for 9:16.

---

## 12. Props (`props.js`)

```js
sword:     { kind:"line", len:70, width:7, grip:"rHand", color:"#ddd", tip:"propTip", hitRadius:16 },
club_big:  { kind:"club", len:120, width:14, ... },
staff:     { kind:"line", len:150, width:6, grip:"rHand", twoHand:true },
bat:       { kind:"line", len:90, width:9 },
shield:    { kind:"disc", radius:36, grip:"lHand" },
```

- A prop is attached to a grip joint and oriented along the forearm direction plus an optional per-move `propAngle` offset animated in keyframes.
- `propTip` is exposed as a hit joint and as an FX trail source.
- Props can be dropped (`drop_prop` beat), thrown (becomes a projectile), picked up, or broken (`prop_break` splits into two spinning halves).

---

## 13. Rendering (`renderer.js`)

### 13.1 Draw order (per frame)
1. Clear and draw background layers (parallax by camera x factor: sky 0.1, far 0.3, mid 0.6, ground 1.0).
2. Camera transform: `translate(w/2, h/2) scale(zoom) translate(-cam.x + shake.x, -cam.y + shake.y)`.
3. Ground shadows (ellipses, scale and alpha by height above ground).
4. Afterimages.
5. Characters sorted by `y` then by id (far limbs, torso, head, near limbs, props).
6. Projectiles and props in flight.
7. FX particles (world space).
8. Screen-space overlays: speech bubbles, HP bars, text pops, flashes, vignette, captions, letterbox bars.

### 13.2 Character drawing
- Limbs and torso: polylines with `lineCap = "round"`, `lineJoin = "round"`.
- Head: filled circle with outline; two eye dots oriented by facing; optional mouth states (`neutral`, `shout`, `grin`) set by move.
- Style options: `outline` (dark stroke behind colored stroke for readability), `gradient` (subtle), `glow`.
- Optional accessories drawn from joint positions: `headband` (trailing ribbon with spring physics), `cape`, `hat`, `scarf`.
- Far limbs drawn at 85% brightness.

### 13.3 Visual themes (`config.js`)

| Theme | Background | Palette |
|---|---|---|
| `void_grid` | Dark gradient, faint perspective grid | Neon |
| `dojo_dusk` | Silhouette wall, lanterns, warm sky | Warm |
| `rooftop_city` | Skyline parallax, stars, moon | Cool |
| `desert_noon` | Dunes, sun, heat haze | Sandy |
| `arena` | Crowd silhouettes, floor lines | Neutral |
| `snow_mountain` | Layered mountains, falling snow | White/blue |
| `white_stage` | Plain white with soft shadow (classic stick-figure look) | Mono |

Backgrounds are drawn procedurally from simple shapes. No image assets are required.

### 13.4 Performance targets
- `renderFrame` under 8 ms at 1080p on a mid laptop for two characters and 500 particles.
- Pre-render static background layers once to offscreen canvases.

---

## 14. Public API and determinism

### 14.1 API (`index.js`)

```js
const engine = new StickEngine(canvasElement);

engine.load(scriptObject)
  // -> { ok:boolean, errors:[{code,path,message,fix}], warnings:[...],
  //      totalFrames:number, fps:number, width:number, height:number }

engine.renderFrame(n)         // draws frame n (0..totalFrames-1); pure w.r.t. n
engine.getAudioEvents()       // -> [{ t, sfx, volume, pan }]
engine.getMeta()
engine.preview(opts)          // realtime playback for humans (rAF loop; not used by recorder)
engine.dispose()

// Convenience flags for the recorder:
window.__engineReady = true   // set after load completes
```

### 14.2 Determinism rules
1. Fixed `dt = 1/60`. If `slowmo` is active, sim advances by `dt * scale`; the output frame count remains fixed per real second of video.
2. All random calls use `rng()` from `mulberry32(meta.seed)`. Each subsystem derives its own stream: `seed ^ hash("fx")`, etc., so adding FX does not change physics.
3. Iteration order is stable (arrays, not object-key order, wherever order matters).
4. No dependency on real time, canvas size read-backs or font metrics in the simulation. Text layout happens only in the renderer.
5. Floating point: avoid `Math.sin` differences across browsers by using the same Chromium build in Playwright. Document the pinned version in `package.json`.

### 14.3 Frame store
After simulation, store per frame a compact object:

```js
{ cam:{x,y,zoom,shake:{x,y}}, chars:[{ id, joints, facing, hp, mouth, prop:{...} }],
  projectiles:[...], particles:Float32Array, overlays:[...], flash:{...} }
```

For memory, 60 fps x 60 s = 3,600 frames; with about 2 characters and 300 particles this is roughly 40-100 MB worst case. If memory is a concern, store every frame's characters/camera and re-simulate particles in chunks (keyframe every 60 frames, deterministic re-run between).

### 14.4 Audio events
Moves and FX emit named SFX. The engine only emits `{t, sfx, volume, pan}` records. Mixing is done by the recorder with ffmpeg using a library of WAV files named after SFX keys.

Required SFX keys: `whoosh`, `punch_light`, `punch_heavy`, `kick_light`, `kick_heavy`, `block`, `parry`, `slash`, `sword_clash`, `land`, `land_heavy`, `explosion`, `energy_charge`, `energy_fire`, `shockwave`, `ko`, `bell`, `pop`, `boing`, `slip`, `crowd_cheer`, `crowd_gasp`, `step`.

---

## 15. Validator (`validator.js`)

The validator is the LLM's feedback channel, so its messages must be specific and actionable. Output format:

```json
{ "code":"E_MOVE_UNKNOWN", "path":"beats[7].do",
  "message":"Unknown move 'super_kick'.",
  "fix":"Use one of: front_kick, roundhouse, axe_kick, flying_kick (closest match: flying_kick)." }
```

### 15.1 Structural checks
- Required fields present, types correct, `version` supported.
- Unique character ids and beat ids.
- Numeric ranges (scale 0.4-4, speed 0.25-3, hp 1-1000, positions within stage).

### 15.2 Semantic checks
- `do` exists in the move catalog; `who` exists; `target` exists and is not self (unless the move permits).
- Armed moves require the character to have a matching `prop` at that time.
- `after` and `with` refer to existing beats; no cycles.
- No two non-queued, overlapping beats for the same character unless the second explicitly interrupts (warn).
- Attack beats in choreographed mode: the target must be reachable (distance after approach within range), else error with suggested `approach: true`.
- Dead characters (after `ko_*`) cannot act unless `spawn` or `get_up` appears.
- Total duration between 3 and 180 seconds (configurable).
- At most N simultaneous particles (budget warning).
- Camera targets exist; first camera key at `t=0`.
- Speech text under 40 characters, ASCII-safe (or font supports).

### 15.3 Pacing heuristics (warnings, not errors)
- Gaps with no action longer than 2.5 s.
- No hit with `shake` or `hitstop` in the entire script.
- More than 8 consecutive attacks without a reaction or dramatic beat.
- No ending beat (victory, KO, fade).
- Heavy-hit (`damage` over 15) without any slowmo or zoom in the script.

---

## 16. Recording pipeline (`tools/record.mjs`)

### 16.1 Flow
1. Launch Chromium via Playwright, headless, viewport = script format size, `deviceScaleFactor = 1`.
2. Load `index.html` (served from a local static server or `file://`).
3. `page.evaluate` to call `engine.load(script)`. Abort on errors.
4. For `n` in `0..totalFrames-1`: `engine.renderFrame(n)` then capture the canvas as PNG or raw buffer.
5. Pipe frames directly into ffmpeg stdin (no temp files), or write numbered PNGs (simpler, bigger).
6. Fetch `getAudioEvents()`, build the audio track, mux.

### 16.2 Frame capture methods (fastest first)
- `canvas.toBlob` to base64 via `page.evaluate`, in batches of 30 frames per round trip.
- `page.screenshot({ clip })` (simple, slower).
- Avoid CDP screencast, which is real-time and not frame-exact.

### 16.3 ffmpeg commands

Video only, high quality:
```
ffmpeg -y -framerate 60 -i frames/%05d.png \
  -c:v libx264 -preset slow -crf 16 -pix_fmt yuv420p -movflags +faststart video.mp4
```

Audio mix (sfx events converted to a filtergraph; `adelay` in ms per event, `amix` all):
```
ffmpeg -y -i video.mp4 -i music.mp3 -i sfx/punch_heavy.wav [-i ...] \
  -filter_complex "[2]adelay=3500|3500,volume=0.9[a1];[1]volume=0.35[m];[m][a1]amix=inputs=2:normalize=0[aout]" \
  -map 0:v -map "[aout]" -c:v copy -c:a aac -b:a 192k final.mp4
```
`record.mjs` generates this filtergraph programmatically.

### 16.4 Outputs
- `out/<slug>/final.mp4` (YouTube-ready: 1920x1080, 60 fps, H.264, AAC)
- `out/<slug>/script.json` (the exact script used)
- `out/<slug>/thumb.png` (the frame with the highest "action score": most active FX particles near the center)
- `out/<slug>/meta.json` (title, duration, seed, validator warnings)

### 16.5 Expected render time
A 30-second video at 60 fps is 1,800 frames. At about 15 ms per frame including capture, that is roughly 30-60 seconds plus encode time.

---

## 17. LLM integration (`tools/generate.mjs`)

### 17.1 Roles and model use
| Stage | Task | Suggested model tier |
|---|---|---|
| Ideation | Produce N premises with beat outlines | Sonnet/Haiku |
| Script writing | Premise to JSON script | Sonnet (Opus for flagship videos) |
| Repair | Fix validator errors | Haiku/Sonnet |
| Critique (optional) | Review sampled frames/contact sheet and return pacing notes | Opus (vision) |
| Titles/descriptions/tags | Metadata for YouTube | Haiku |

### 17.2 Prompt pack for script writing
System prompt contains, in order:
1. The role: "You write JSON scripts for a stickman animation engine. Output only valid JSON."
2. The script schema (condensed, about 60 lines).
3. The auto-generated move catalog table (name, duration, range, needs_prop).
4. The FX and SFX name lists.
5. Pacing rules: three-act structure for 20-40 s videos (setup, escalation, payoff), include at least one slowmo or zoom on the biggest hit, end with a clear beat.
6. Two or three few-shot example scripts (small, 1.5 KB each).
7. Hard limits: max beats (60), max duration, allowed themes.

User prompt: the premise, desired length, tone (epic, comedic, parody), format.

### 17.3 Repair loop
```
for attempt in 1..3:
    script = llm(prompt)
    result = engine.validate(script)     // headless, Node via jsdom-free validator import
    if result.ok: break
    prompt = prompt + "\nValidator errors:\n" + format(result.errors) + "\nReturn the corrected full JSON."
```
If still failing after 3 attempts, discard the premise and log.

### 17.4 Variety and quality controls
- Maintain a `history.json` of used premises, moves and themes; include "avoid repeating: ..." in the prompt.
- Seed pool for randomized themes, color palettes, opponent scales.
- Optional automatic scoring: ratio of FX events to duration, variety of distinct moves (aim for 8+), presence of slowmo, and camera changes. Reject scripts scoring under a threshold before rendering.

### 17.5 Token budget
Prompt about 4-6K tokens (cacheable), output about 1-2K tokens. Use prompt caching for the static portion to cut cost on bulk runs.

---

## 18. Choreography guidelines (quality rules baked into the catalog)

These make the output look good with no human touch.

1. **Anticipation**: every attack has a windup of at least 15-25% of its duration.
2. **Hold on contact**: hitstop on every landing hit; bigger hits get longer holds.
3. **Follow-through**: attack poses overshoot and settle.
4. **Squash and stretch**: character `scale` can be briefly modulated (1.0 to 1.06 to 1.0) on land and impact, as an optional style flag.
5. **Camera supports action**: auto zoom_punch on heavy hits, wider framing on dashes and jumps.
6. **Silhouette readability**: outline stroke on, contrast between character color and background.
7. **Rhythm**: vary gaps; typical combat rhythm is a flurry, a pause, a big move.
8. **Scale contrast**: for "power" stories, make the opponent 2-4x scale and let the hero's small movements read as skill.

---

## 19. Testing and acceptance

### 19.1 Unit tests
- `math`: easing endpoints, lerp, PRNG repeatability.
- `skeleton`: known angles produce expected joint coordinates (table-driven); mirror symmetry for facing -1.
- `moves`: every move's `keys` are sorted, `t` in [0, 1], referenced poses exist.
- `validator`: a bad-script corpus (20+ cases) yields the expected error codes.

### 19.2 Integration tests
- **Determinism**: load the same script twice, hash all frames (e.g. SHA-1 of every 10th frame's canvas bytes). Hashes must match.
- **Golden frames**: 5 scripts, 10 frames each, compared to stored PNGs with a small pixel tolerance.
- **Hit connectivity**: for every attack move, run it in choreographed mode against a dummy at range and assert a hit event occurs.
- **Bounds**: fuzz 200 random valid scripts; assert no NaN joints, no characters outside stage, no exceptions, particle count under limit.

### 19.3 Acceptance criteria (v1 done when)
1. All moves in the v1 catalog play without visual glitches (manual review via a `catalog_preview.html` page that plays each move in a loop against a dummy).
2. A 30-second sample script renders to MP4 in under 3 minutes.
3. Two consecutive renders of the same script are byte-identical frame-by-frame.
4. An LLM given only the generated prompt pack produces a valid script on the first attempt at least 70% of the time and within 3 attempts at least 98% of the time.
5. Ten different generated videos are judged visually distinct (different moves, themes, camera work).

---

## 20. Security and safety

- The engine never `eval`s script content. The expression evaluator whitelists tokens.
- Script size limit (64 KB), beat limit (200), string length limits.
- No network calls inside the engine.
- Content policy baked in: no blood or gore, no real people or brands, no hateful imagery. The validator rejects text matching a blocklist in `say` and `caption` fields.

---

## 21. Build plan

### Milestones
| # | Deliverable | Modules | Approx lines | Done when |
|---|---|---|---|---|
| M0 | Skeleton and renderer | math, skeleton, poses, renderer (basic), index.html | 500 | A stickman holds poses; a slider scrubs between two poses |
| M1 | Move runtime | moves (runtime + 8 moves), blending | 350 | `walk`, `jab`, `kick`, `jump` loop smoothly in the preview page |
| M2 | Physics and combat | physics, combat, hitstop | 400 | Two characters fight in choreographed mode with reactions |
| M3 | Director and script | director, validator (structural) | 450 | A JSON script plays back correctly |
| M4 | FX and camera | fx, camera, backgrounds (2 themes) | 500 | Impacts, shake, slowmo, follow cam all working |
| M5 | Frame store and API | frame store, `load/renderFrame`, determinism test | 200 | Deterministic hash test passes |
| M6 | Recorder | record.mjs, ffmpeg audio mix | 200 | One-command JSON to MP4 |
| M7 | Catalog completion | all moves, props, themes, SFX list | 600 | Catalog preview page shows every move clean |
| M8 | LLM loop | catalog.mjs, generate.mjs, repair loop | 250 | Batch of 10 videos fully unattended |

### Rules for building with Claude
1. One module per request. Provide this spec's relevant sections plus the module's interface (function signatures) from the previous modules.
2. Ask for pure functions and data-driven design. No global state beyond the engine instance.
3. Require tests with each module (table-driven where possible).
4. Generate moves in batches of 5-6 with the same prompt template: "Using the skeleton conventions in section 5 and the move schema in 7.1, author these moves as data. Include anticipation, contact, follow-through." Then review them in the preview page.
5. Freeze the public API and the script schema after M3. Everything later must be backward-compatible so earlier scripts continue to render.
6. Use a stronger model for skeleton math (M0) and combat resolution (M2), and cheaper models for catalog data (M7) and tooling.

### Prompt template for a module
```
You are implementing module <name> of a stickman animation engine.
Constraints: plain ES2020, no dependencies, deterministic, <300 lines.
Spec excerpt: <paste relevant sections>
Interfaces you may call: <signatures of existing modules>
Deliver: the module file, a test file, and a short usage example.
Do not modify other modules. If an interface change is needed, say so instead.
```

---

## 22. Future extensions (not in v1)

- Multi-segment spine and ragdoll-lite for dramatic falls.
- Procedural fight generator (simulated mode with AI behaviors: aggressive, defensive, trickster).
- Character variants (fat, tall, kid), expressions, hats, and swaps.
- Voice-over via TTS and caption burn-in with word timing.
- Beat-sync: align heavy hits to music beat markers.
- Shorts mode with auto reframing (portrait layout and bigger text).
- Browser-based script editor and timeline scrubber.
- Replay-from-seed "Fight Club" series: same characters, different seeds.
- Auto-thumbnail generation with a text overlay.

---

## Appendix A: Minimal sample script

```json
{
  "version": 1,
  "meta": { "title": "Showdown", "format": "landscape", "fps": 60, "seed": 7,
            "mode": "choreographed", "theme": "dojo_dusk" },
  "characters": [
    { "id":"hero", "x":700,  "facing":1,  "color":"#22aaff", "scale":1.0, "hp":100 },
    { "id":"boss", "x":1500, "facing":-1, "color":"#ff3b3b", "scale":2.0, "hp":200 }
  ],
  "camera": [ { "at":0, "mode":"follow", "targets":["hero","boss"], "zoom":"auto", "padding":300 } ],
  "beats": [
    { "at":0.5, "who":"boss", "do":"taunt" },
    { "at":2.0, "who":"hero", "do":"dash", "target":"boss" },
    { "at":3.0, "who":"hero", "id":"k1", "do":"flying_kick", "target":"boss", "approach":true },
    { "after":"k1", "delay":0.0, "who":"world", "do":"slowmo", "params":{ "scale":0.3, "duration":0.5 } },
    { "at":4.5, "who":"boss", "do":"haymaker", "target":"hero" },
    { "at":5.2, "who":"hero", "do":"dodge_back" },
    { "at":6.0, "who":"hero", "do":"flurry", "target":"boss", "approach":true },
    { "at":8.0, "who":"boss", "do":"ko_fall" },
    { "at":9.0, "who":"hero", "do":"victory", "fx":["aura"] },
    { "at":9.5, "who":"world", "do":"text_pop", "params":{ "text":"K.O.!" } },
    { "at":11, "who":"world", "do":"fade", "params":{ "to":"black", "dur":1 } }
  ]
}
```

## Appendix B: Glossary
- **Beat**: one scripted command at a time.
- **Move**: reusable animation unit defined by pose keyframes, root motion, hits and events.
- **Pose**: set of joint angles and a root offset.
- **Hitstop**: brief freeze on impact for weight.
- **Choreographed mode**: authored outcomes; engine guarantees hits connect.
- **Frame store**: precomputed per-frame snapshots enabling random-access rendering.
