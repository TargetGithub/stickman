# StickMan v3: a 2.5D cartoon engine on open catalog bundles

Status: draft 0.1 (2026-10-19). Owner: Sridhar. Builds on `stickman-engine-spec.md` (v1), `docs/STORY_SPEC.md` (v2), `docs/CATALOG_BUNDLE_SPEC.md` and `docs/ARCHITECTURE.md`.

## 1. Goal and quality bar

Today the engine draws a flat, side-on 2D world (parallax background layers, three fixed depth layers, stick and capsule bodies). v3 turns it into a **2.5D cartoon engine**: 2D cartoon drawings living in a world with real depth, light and camera, animated smoothly enough that the output is **comparable to a polished preschool channel such as Sheriff Labrador (Babybus)** at 1080p: characters that move toward and away from the camera, turn to three-quarter and front views, cast shadows, sit in lit scenes with depth of field, with cinematic camera moves, expressive faces and squash-and-stretch motion.

The comparison is on *presentation*: smoothness, depth, lighting, staging, readability. The art stays cartoon vector drawings (no 3D models), so the look is "flat shaded 3D feel", not photoreal 3D.

Three things stay fixed:
- **JSON scripts drive everything** (v2 scripts stay valid; v3 adds optional blocks).
- **The engine is loosely coupled from content**: every character, rig, asset, place, effect, sound and music style comes from **catalog bundles** that anyone (the project, Sridhar, the public) can author against strict schemas. The engine ships with no built-in characters.
- **The engine stays deterministic with no dependencies** (CLAUDE.md): same script + same bundles = identical frames and audio.

## 2. Principles

1. **Content is data.** The engine knows *kinds* (a rig, a sprite, a light, a camera move), never *instances* (Doopi, Tokyo). All instances live in bundles. The base catalog becomes just the first bundle (`base`).
2. **Open bundle format.** Bundles are folders of JSON (and SVG) with a manifest, a license, namespaced ids and strict schemas (CATALOG_BUNDLE_SPEC 3-6). A public bundle is imported the same way as the project's own.
3. **Standard video-tool vocabulary.** Layers, tracks, keyframes, easing, masks, blend modes, transitions, text, particles, post effects and audio tracks: the words people know from After Effects, Toon Boom or CapCut, written in JSON.
4. **Story tools stay on top.** Cast, scenes, beats, macros and activities (v2) compile down to the v3 timeline, so a story author never has to hand-key animation; a motion designer can.
5. **Pure core, thin shell.** `/engine` has no I/O, network, randomness or canvas reads; rendering targets the 2D canvas API only (no WebGL in v3); tools do files, ffmpeg, TTS and bundles.

## 3. Architecture

```
scripts (JSON v2/v3)     bundles (base + any)      options
        |                        |                    |
        v                        v                    v
  +-------------------- engine (pure) --------------------+
  |  loader: bundle merge + id resolution + validation    |
  |  compiler: story (v2) -> timeline (tracks, keyframes)  |
  |  simulation: rigs, physics, activities, world objects  |
  |  scene graph: nodes with x, y, z, scale, rot, layer   |
  |  lighting + camera: per-frame light rig, camera state |
  |  compositor: layers, masks, blend, post effects       |
  |  renderer: canvas 2D draw of the composed frame       |
  +--------------------------------------------------------+
        |
        v
  tools: record (ffmpeg), audio mix, TTS, bundle import/check, sheets, web pages
```

New modules (each under ~350 lines, with table-driven tests): `engine/scene.js` (scene graph and depth sort), `engine/depth.js` (z lane, projection, scaling), `engine/lighting.js`, `engine/camera3.js` (v3 camera), `engine/timeline.js` (tracks and keyframes), `engine/compositor.js` (layers, masks, blend, post), `engine/renderer/turnaround.js` (view-dependent character drawing), `engine/renderer/shading.js`, `engine/bundles.js` (loader and merge).

## 4. Catalog bundles (open content)

Extends CATALOG_BUNDLE_SPEC. Everything below is data with a strict schema and a required `description`, `tags` and `license`.

| Kind | What it is | New in v3 |
|---|---|---|
| Rigs | A skeleton (bones, lengths, constraints) plus **turnaround views** (`side`, `three_quarter`, `front`, `back`): per view, how each bone and the face are drawn (vector shapes) | yes |
| Bodies | A rig instance with proportions and draw style (today's body plans) | extended |
| Characters | Presets: body, colours, appearance, voice, default expressions | extended with `views` overrides |
| Poses and moves | Keyed poses per rig; moves carry per-view hints (a move can say which view to show) | extended |
| Faces and expressions | Eyes, brows, mouth shapes per view; phoneme mouth shapes (for TTS later) | extended |
| Sprites and vector art | SVG paths (already supported for objects) for props, scenery pieces, decals | extended |
| Places | A set: background layers at depths, ground plane, light rig preset, fog, sky, weather, ambience | extended (depth, lights) |
| Lights | Named light rig presets (key, fill, rim colours and directions by time of day) | yes |
| Camera moves | Named moves (dolly in, slow push, orbit sweep, handheld) as keyframe curves | yes |
| FX | Particles (today) plus sprite sheets and procedural shaders expressed as data (glow, bloom, wobble) | extended |
| Transitions | Wipes, dissolves, masks as data | extended |
| Text styles | Fonts (bundled files), sizes, outlines, animations for titles and captions | yes |
| Audio | SFX recipes or WAV files, music moods, voice settings (TTS models by timbre) | extended |
| Templates | Reusable script fragments (an intro, a song sequence) with parameters | yes |

Bundle rules: namespaced ids (`bundle:name`), add-only merge, a `license` field per bundle and per file-based asset (SVG, font, WAV), a `compat` field (`engine >= 3.0`), and `npm run bundle:check <folder>` validates a bundle without importing it. A bundle registry file (`catalog/bundles.json`) lists the bundles a script may use; a script declares the ones it needs (STORY_SPEC 7.1 `bundles`).

## 5. The 2.5D model

### 5.1 Depth lane
Every scene node has `z` (0 = the stage line; positive = toward the camera; negative = away) within a scene depth range (default -2000..600 px). Projection: `scale = f / (f - z)` with the camera focal length `f` (default 2400), applied to size and to horizontal position about the camera's x. Characters walk in depth with `to: { x, z }`; moves keep their 2D authoring and are scaled. Draw order is by `z` (far to near), replacing the three fixed layers (which map to z presets: back -800, mid 0, front 313). Ground contact, collision and hit reach use the projected scale (fixes the G1 giant issues too).

**As built (V3.2, ADR-023):** the depth lane is on for `version: 3` scripts only, so v1 and v2 frames are unchanged; the layer presets are -800 and 313 (not -600 and 250) because those give exactly the legacy layer scales 0.75 and 1.15 at f 2400. A scene's `depth: { near, far, focal, horizon }` sets the range and projection; `horizon` (default 260 px) is how far the feet line rises for a node at infinite distance, so far things stand higher on the ground. `to: { z, x? }` walks in depth over the walk's own duration; a depth walk covers at least half of |dz| in x (a figure walking straight at the camera would not move its feet), drifting the way it faces. Characters at different depths (more than 60 px apart in z) never collide or hit each other. Set pieces take `z` too; extras keep their layer presets. Overlays (bubbles, HP bars) and particle anchors use the projected joints. Not done here: the G1 giant reach work (giant fights still use the v2 rules) and fog by depth (V3.3).

### 5.2 Lighting and shading
A per-scene **light rig**: key light (direction, colour, strength), fill, rim, ambient, taken from the place's preset and the time of day, changeable with `set_light`. Characters and objects get: gradient shading across limbs and body shapes (lit side lighter, shadow side darker, cartoon-stepped by default: 2-3 tones), a rim highlight, **contact shadows** on the ground (soft ellipse, direction and length from the key light) and optional cast shadows on walls (flattened silhouette). Backgrounds get the key light as a tint and a sky gradient; fog/haze by depth.

**As built (V3.3, ADR-024):** light rigs are catalog data (`catalog/world/lights.json`: `flat`, `noon`, `dawn`, `golden`, `moonlit`, `indoor`, `stage`, `gloom`, and a `byTime` map). A v3 scene is lit by the preset for its time of day unless the scene or its location says `light` (a preset name, or `{ preset, key, fill, rim, ambient, shadow, fog }` overrides); `light: "flat"` turns lighting off. `set_light` (`preset`, `angle`, `strength`, `fog`, `dur`) blends to another rig. Shading is three flat tones (a dark band on the side away from the key light, a lit band toward it, a rim line) on limbs, heads and filled torsos, drawn inside the shapes so outlines never change; the far limbs take the same tones a little darker. The contact ellipse stretches away from the light by `shadow.length`; `shadow.cast` adds a flattened silhouette lying on the ground (outdoor rigs) or standing on the wall behind (`indoor`), drawn as a multiply pass. The background gets the rig's ambient tint (multiply), and fog by depth is drawn as veils between the depth-sorted nodes so everything behind a node is covered by `fog.density × z / far` of the fog colour. v2 scripts are untouched (no `light` field); the lighting runs in the v3 depth path only. Not done here: shading on set pieces and props (they get no tones yet), the key light as a sky gradient, and bundle-shipped light rigs (needs a bundle format bump).

### 5.3 Camera
A v3 camera state: `x, y, z, zoom, tilt, roll` with keyframed moves and named presets (push in, pull out, crane, follow with lag, handheld noise from `deriveRng`), **depth of field** (blur far and near layers around a focus distance; implemented with per-layer canvas blur steps, cached), vignette and letterbox. Story shots (v2 `shot`) map onto it.

**As built (V3.4, ADR-025):** the stored camera (framing, shake, story shots) is unchanged; a v3 scene adds a **lens** evaluated at render time from the event log, so frames stay random access and the frame store is unchanged. Lens channels: `dolly` (toward the stage; the stage line grows and the depth focal length shortens, so near things grow faster than far ones), `truck` (sideways, with depth parallax), `crane` (up and down; far feet rise as the camera rises), `tilt` (degrees, a screen shift), `roll` (degrees, the frame turns about its centre and scales to cover), `push` (a zoom multiplier), `handheld` (seeded value-noise sway from `deriveRng(seed, "handheld@<scene>")`), `dof` with `focus` (a character, followed in depth) or `focusZ`, `vignette` (default 0.18) and `letterbox` (1 = 2.39:1). Dolly and push keep the ground line where the framing put it. A scene `lens` block sets the starting lens; camera keys gain those fields plus `lag` (follow with lag: a slower spring) and `move`; the `set_camera` world command does the same mid-scene with `dur` and `ease`. Named moves are catalog data (`catalog/world/camera_moves.json`: push_in, pull_out, slow_push, crane_up, crane_down, orbit_sweep, dutch_tilt, level, handheld); a move's curve is added to the lens (absolute moves blend to targets) and holds its end. Story shots map onto the lens: close-ups, over-the-shoulder shots and two-shots pull focus to their characters (dof 0.65, 0.45, 0.3) unless `lens.autoFocus` is false. Depth of field draws nodes that share a blur level into a scratch canvas composited with a canvas blur, and blurs the background over its own sharp copy so frame edges never fringe; without a host canvas factory there is no blur. Not done here: caching blurred layers while the camera is still (each frame re-blurs; V3.9 made each blur cheaper), a camera `z` channel separate from dolly, and blur on particles drawn outside the stage group.

### 5.4 Turnaround views
Rigs carry up to four views. The engine picks the view from the character's facing and a `view` channel (`side`, `three_quarter`, `front`, `back`), set by beats (`"view": "front"`), by camera relation (a character talking to the camera turns front) and by moves (a `look_around` can glance to three-quarter). Switching between views crossfades over 2-3 frames with a scale squash so the turn reads. v3.0 ships the `base` bundle with side + three-quarter + front views for the stick, kid, buddy and bulky bodies; the dog gets side and front.

**As built (V3.6, ADR-027):** the simulation stays side-on; a view is a yaw the renderer applies to the profile joints (side 90°, three_quarter 50°, front 0°, back 180°). Each limb gets a left or right offset from the body plan's `turn` widths (`shoulder`, `hip`), so front views spread arms and legs from their own shoulder and hip points; the forward part of a pose becomes depth, foreshortened on the ground plane (`foreshorten`), so steps still read from the front. The face slides to the middle of the head as it turns and is hidden from behind (the near and far sides swap). A change of view turns over 0.2 s. Body plans list their `views` in the catalog (humanoids all four, the dog side and front); the dog has its own front drawing (round body, four legs side by side, ears both sides) that cross-fades with its side drawing with a small squash. Views come from the cast `view`, the scene placement `view`, beat `view` (from that beat on) and move hints (`view` on a move: wave, look_around and nod turn three-quarter; cheer, clap, jump_joy, bow and victory turn front) while the move runs. A view a plan lacks is `E_VIEW_BODY` when asked explicitly and falls back to the nearest one for hints. Views apply in version 3 scenes only. Not done here: per-view vector drawings in bundles (views are parameters of the procedural turn, not new shapes), hair and hats drawn per view (they kept their profile shape; V3.9 wraps them), and turning toward the camera automatically when talking.

### 5.5 Motion quality
Pose interpolation gets overshoot and settle curves, squash-and-stretch on landings and hits (today's squash extended to any axis), secondary motion for hair, scarves, capes and tails (spring chains), follow-through on arms, breathing idles with noise, and motion blur as an optional post effect. Target 60 fps render, 30 fps default output.

**As built (V3.7, ADR-029):** motion quality is drawn over the stored motion in version 3 scenes, from the last 14 stored frames of the same scene, so hits, reach and timing never change and any frame renders the same in any order. Follow-through and overshoot: the arm bones and the head trail their stored angles through an under-damped spring (about 20% overshoot, settling in about 0.1 s, never more than 18° off) with bone lengths kept; the legs are exactly as stored, so feet never slide. Squash and stretch on any axis: a vertical stretch with the vertical speed while airborne (up to 12%), a squash about the feet on landing and a squash along the blow (the attacker-to-target axis) when hit, both over 0.18 s with the area kept. Secondary motion: the hair sways against the head's motion through a softer spring (capes and scarves already trail from frame history, tails already wag). Breathing: while standing still the upper body rises and falls about 1.6 px on a per-character period (2.4-3.3 s) and phase. Motion blur: faint ghosts of the last two frames behind limbs moving faster than 1400 px/s, off by default. A script tunes each with `"motion": { "followThrough", "squash", "secondary", "breathing", "blur" }` (0-1; defaults 1, 1, 1, 1, 0). Not done here: overshoot in the pose interpolation itself (the moves keep their keyframe easing), spring chains on accessories other than hair, and full-frame motion blur. Render rate: 60 fps as before; output stays the recorder's choice.

### 5.6 The automatic look strength (Sridhar, 2026-10-19)

The effects a version 3 scene gets without asking (the time-of-day light rig with its shading, rim, tint, shadows and haze; the default vignette; the focus blur that story shots pull by themselves; the turns that moves like wave and cheer make) run at a **look strength**, default **0.2** (20%), so v3 stays close to the flat v2 look. A script sets it with `"look": { "strength": 0-1 }`. Anything a script asks for explicitly runs at full strength: a scene's or location's `light`, `set_light`, lens values in a `lens` block, camera keys or `set_camera`, and `view` on cast, placements and beats.

## 6. Standard video-creation features (JSON)

New optional top-level blocks in a v3 script, usable with or without a story:

- **`layers`**: named layers with `z`, `opacity`, `blend` (normal, multiply, screen, add), `mask` (a shape, a layer or a character silhouette), `parent` (follow another layer or a character joint), `visible` ranges.
- **`tracks`** and **keyframes**: any property of any node (characters, layers, camera, lights, objects, text) can be keyed: `{ "target": "camera.zoom", "keys": [{ "t": 0, "v": 1 }, { "t": 2, "v": 1.6, "ease": "inOutCubic" }] }`. Easing: the existing table plus cubic-bezier.
- **`text`**: titles, captions, lower thirds, speech-bubble styles, with fonts from bundles and entrance/exit animations.
- **`shapes`**: rectangles, circles, paths with fills, strokes, gradients (for motion-graphics scenes).
- **`transitions`**: between scenes (existing) and between layers (new), including masked wipes.
- **`post`**: colour grade (lift/gamma/gain per scene), bloom, vignette, film grain (seeded), chromatic aberration (tiny), letterbox.
- **`audio.tracks`**: music, ambience, sfx, voice tracks with keyframed volume and pan, ducking rules, and markers that beats can anchor to (`at: { marker: "beat_drop" }`).
- **Templates**: `"use": { "template": "base:intro_card", "params": { ... } }` expands to script fragments.

The v2 story compiler emits these same primitives, so a story scene and a hand-keyed motion-graphics scene can sit in one script.

**As built (V3.5, ADR-026):** `layers`, `text`, `shapes`, `tracks` and `post` are top-level blocks of a `version: 3` script (a scene may also set its own `post`). Element times are seconds from the video start, or from the start of `scene` (and then shown only in that scene), with `from`, `to`, and `in`/`out` animations (fade, pop, slide_up/down/left/right, wipe_left/right/up/down, iris, typewriter): the wipes and iris are the masked transitions between layers. Layers: `place` back (after the background) or over (default), `space` screen (1920 x 1080 units scaled to the format) or world (stage px, moving with the lens camera), `z`, `opacity`, `blend` (normal, multiply, screen, add, overlay), `mask` (a shape, optionally inverted), `parent` (a character joint, projected in depth, or another layer listed earlier), `reveal`. Shapes: rect (with a corner radius), circle, ellipse, line, path (the imported-art command format) with a colour or a linear/radial gradient fill and a stroke. Text: catalog styles (`catalog/world/text_styles.json`: title, subtitle, caption, lower_third, comic, label), the two bundled fonts, outline, shadow, box, alignment, `\n` lines; layout is measured in the renderer only. Tracks key `layer|text|shape.<id>.<prop>`, `lens.<channel>` (overriding the V3.4 lens) and `post.<prop>`; keys `{ t, v, ease }` where the ease shapes the segment arriving at the key and may be a table name, `step` or a cubic-bezier; colours interpolate per channel. Post (applied in `renderFrame`, so holds and transitions get it too): exposure, contrast, saturation (a canvas filter pass), gamma (a soft-light grey), bloom (a bright blurred copy, screened), seeded film grain, a small chromatic aberration (red and blue copies shifted), vignette and letterbox. The engine reads no pixels back: every pass composites copies of the frame. Not done here: masks by a layer or a character silhouette, layer-group blending (blend modes apply per item), keying character or camera framing properties, and bundle-shipped fonts or text styles; the story compiler does not emit these primitives yet.

**As built (V3.8, ADR-031):** `audio.tracks` holds music (a catalog mood, generated, or the `assets/music` override), ambience (a bed), sfx (an SFX key at times or `{ "marker" }`s) and bus tracks (a keyed gain on the `music`, `ambience`, `sfx` or `voice` part of the mix); each has `scene`, `from`, `to`, `fadeIn`, `fadeOut`, and `volume` and `pan` as numbers or keys `{ t, v, ease }`. `audio.duck` rules lower `music` or `ambience` by `db` (with `attack`, `release`) under `voice` (speech and narration), `sfx`, or a track. `audio.markers` (`{ id, scene, t }`) name moments that beats start at with `"at": { "marker", "delay" }`, so beats can land on a drum hit. Templates are catalog data (`catalog/story/templates.json`: `intro_card`, `doopi_intro`) with typed params and a fragment (scenes, text, layers, shapes, tracks, audio tracks, markers) using `${name}` placeholders (`${id}` is the use's id); a scene `{ "id", "use": { "template", "params" } }` expands before validation, so everything after sees a plain script. The engine only returns the plan (`engine.getAudioTracks()`); `tools/lib/track_mix.mjs` renders tracks into the story's stems and applies buses and ducking in `record.mjs`. Not done here: markers from the music's own beats (the composer runs in tools, so a marker cannot follow a bar line yet), beat-level templates (templates replace scenes only), bundle-shipped templates, and per-track mixing in the browser player.

**As built (V3.9, ADR-032):** the polish pass compared a Doopi scene (ep01 scene 6 and `scripts/samples/v3_9_polish.json`, both rendered as version 3) with the Sheriff Labrador look and fixed what did not need a look decision. Spoken voices: `record.mjs --speech tts` (SPEECH_SPEC) now takes version 3 scripts, and `compileScript`/`ejectMacro` return a version 3 script as version 3 (they used to leak the internal `v3` flag, which the second validation refused). Hair and hats in turned views: masses (bob, spiky, cap and brim, turban, crown, horns, moustache) get a mirrored copy scaled by |cos yaw|, so they wrap round the head and are symmetric from the front; single pieces (ponytail, bun, antenna, sprout, flower) keep their shape and slide toward the middle of the head by sin(yaw); from behind the hair covers the back of the head, the ponytail hangs over it and the moustache is hidden. Depth of field is about 2.6x faster (rack focus frames 300 to 115 ms at 1080p): blurs of 1.2 px or more are made on a 2x (6 px: 4x) smaller copy and scaled back up, and a blurred character or set piece draws clipped to a generous box, so only the union of those boxes is cleared, blurred and composited (crowds and the stage group still take the whole frame). Cast shadows inside a blurred layer were drawn as a multiply pass onto the transparent layer and came out as pale smears; they now draw as black at the shadow's alpha there (the same darkening once composited). Heads lost their black outline under a light rig (the head shading left its own last arc as the current path, so the outline stroked that arc) and shaded filled torsos had half-width outlines; both are outlined as in v1/v2 again. `look.maxTurn` (degrees from profile, default 60, Sridhar's choice) limits how far bodies turn toward the camera, so `front` is a near-front three-quarter (30°) and the flat full-front body is gone; turns away (back) are not limited, and `maxTurn: 90` restores the full front. A walk in depth turns the walker along its path (yaw 90° − atan2(dz, |dx|)): toward the camera (capped), or away. Character drawing moved from `renderer/index.js` to `renderer/draw_chars.js` (index.js 351 to 243 lines). Look gaps (Sridhar's review, 2026-10-20): **framing**: in version 3 scripts the story auto camera, after the opening wide and outside two-shots and close-ups, follows only the characters who spoke or moved in the last 3.5 s (a lone one with its nearest neighbour, 200 px padding), falling back to the whole cast when nobody is active; **contact shadows** keep the rig's full alpha at any look strength (at least 0.28; v2 is 0.18), are soft-edged and stay compact under the feet (the cast shadow carries the light's direction). Outline weight, limb thickness and bubble size are `look.outline` (0.5-2.5), `look.limbs` (0.6-2) and `look.bubble` (0.7-2), scales on the v2 drawing in version 3 scenes, default 1 until Sridhar picks the defaults from the variant sheet. Not done here: the G1 giant reach, markers on music bars, mouth shapes from the voice's loudness (the lip-sync work is another session's), and re-rendering the published Doopi episodes.

## 7. Script format v3

`version: 3`. A v2 script is a valid v3 script. v3 adds: `bundles` (required when any non-base id is used), `layers`, `tracks`, `text`, `shapes`, `post`, `audio.tracks`, `templates`; cast gets `view` defaults and per-view overrides; scenes get `depth` range, `light`, `camera` keyframes (v3 fields) and `fog`; beats get `to.z`, `view`, `set_light`, `set_camera` (keyframes), `layer` by name. The validator grows the matching codes (E_BUNDLE_*, E_TRACK_*, E_VIEW_* ...) with fixtures.

## 8. Rendering

Canvas 2D only, offscreen-cached layers for backgrounds and static scenery per camera state, anti-aliased strokes, resolution-independent (1080p default, 4K capable), deterministic. Depth of field and bloom are the costly effects; they render per layer group, not per node, and are cached while the camera is still.

## 9. Compatibility and migration

- v1 and v2 scripts render as before (golden frames unchanged) because the v2 layers map onto z presets, the default light rig is "flat" (no shading) unless a script or place asks for `light`, and the default view is `side`.
- The current catalog becomes the `base` bundle in place (no path moves until the loader is in), then gains lights, camera moves, views and text styles.
- Doopi & Friends: the 24 scripts keep validating; a later pass can add depth, lights and views per episode without rewriting beats.

## 10. Milestones (each ends with green tests, a demo in `out/demos/` and a visual review by Sridhar)

| # | Milestone | Deliverable |
|---|---|---|
| V3.1 | Bundle loader and registry | `engine/bundles.js`, `catalog/bundles.json`, base as a bundle, `bundle:check`, scripts declare bundles; ADR |
| V3.2 | Depth lane | z on nodes, projection, draw order, scaling, contact shadows, `to.z`; v2 layers mapped; giant reach fixed |
| V3.3 | Lighting and shading | light rigs, stepped shading, rim, ground and wall shadows, fog by depth, `set_light` |
| V3.4 | v3 camera | keyframed camera, presets, follow lag, handheld, depth of field, vignette |
| V3.5 | Timeline and compositor | tracks, keyframes, easing, layers, masks, blend modes, post effects, text, shapes |
| V3.6 | Turnaround views | rig views in bundles, view channel, switching, base bundle views for 4 bodies + dog |
| V3.7 | Motion quality | overshoot/settle, squash on any axis, spring chains, follow-through, motion blur |
| V3.8 | Audio tracks and templates | keyframed audio tracks, markers, templates, the Doopi intro as a template |
| V3.9 | Polish pass against the reference | side-by-side review of a Doopi scene against a Sheriff Labrador clip; fixes |

Order V3.1-V3.4 first (they change how everything is drawn); V3.5-V3.8 can run in parallel sessions afterwards.

## 11. Tests

Table-driven unit tests per new module; golden frames unchanged for v1/v2 scripts; new golden frames for one v3 sample per milestone (depth, light, camera, layers, views); determinism hashes over a v3 sample; bundle fixtures (good and bad) under `tests/fixtures/bundles/`; validator fixtures per new code.

## 12. Out of scope (v3)

WebGL or 3D meshes, physics cloth simulation, importing Spine/Lottie rigs (a later bundle importer could), video input layers, live preview editing (the web pages stay read-only viewers).
