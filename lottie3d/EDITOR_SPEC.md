# Lottie3D Kids Studio: editor spec (draft 0.1)

A web editor where children build short 3D animated scenes with the Toybox cast, moves and stages,
without ever seeing JSON. Under the hood it writes a Lottie3D file (format v0.2, section 5) that the
existing player (`player.js`) plays anywhere.

Status: draft for review. Nothing here is built yet. Format v0.1 (`SPEC.md`) and the player are the base.

## 1. Goals

1. A child aged 4–12 can make a 10–30 second scene and play it back in under 5 minutes, alone.
2. The cast, moves, props and stages are the ones from the Toybox videos (`engine3d/catalog`), so children
   play with characters they already know.
3. One source of truth: a move or prop added to `engine3d/catalog` can reach the editor through a build step,
   with no hand copying.
4. Every scene is a small, valid, deterministic file: same file, same frames, on any device.
5. Safe for children by design (section 9).

Non-goals for this spec: rendering videos from the editor, multiplayer, a public gallery, accounts,
professional keyframe tools, custom 3D model import.

## 2. Users and modes

The same editor has three modes. The mode only changes what is shown, never the file format.

| Mode | Age | What they do | What is hidden |
|---|---|---|---|
| **Tiny** | 4–6 | Pick a stage, drag 1–3 characters in, tap big move buttons (hop, wave, dance), press Play. Icons and voice prompts, no reading needed. | Timeline, numbers, poses, camera. |
| **Maker** | 7–9 | Everything in Tiny, plus a timeline of move blocks they can reorder and stretch, speech bubbles from a word picker, sounds, props, camera shots. | Joint posing, raw numbers. |
| **Animator** | 10–12 | Everything in Maker, plus pose mode (drag joints and save poses), easing choice, typed numbers, and a read-only "see the code" panel showing the JSON. | Nothing. |

Parents or teachers can lock a mode.

## 3. Screen layout

```
┌───────────────────────────────────────────────────────────┐
│ [Stage ▾]  [Mode ▾]                  [↶ Undo] [▶ Play] [💾] │
├──────────┬────────────────────────────────────────────────┤
│  Cast    │                                                │
│  tray    │              3D stage (player view)            │
│ 🐤 🐶 🤖  │     drag to place · tap to select · ◯ turn      │
│  Props   │                                                │
│ 🍎 🎈 🌳  │                                                │
├──────────┴────────────────────────────────────────────────┤
│ Moves for the selected one:  [Hop] [Wave] [Spin] [Dance] … │
├───────────────────────────────────────────────────────────┤
│ Timeline (Maker+):  🐤 |Hop|  |Spin   |       |Say "Hi!"|  │
│                     🐶       |Walk to ▸   |Wiggle|          │
│                     🎥 |Wide         |Close on 🐤|          │
└───────────────────────────────────────────────────────────┘
```

- **Stage picker:** the stages from `engine3d/catalog/stages.json` (garden, playroom, beach, snow, space, farm, ...).
- **Cast tray:** characters and props, drag onto the stage. Dropped items stand on the floor; a ring handle turns them.
- **Move buttons:** tapping one adds that move for the selected character at the end of its row, then previews it.
- **Timeline:** one row per cast member plus a camera row. Blocks can be dragged (when), stretched (how long),
  tapped (options) and deleted. Blocks in one row never overlap; dropping onto a block pushes the rest right.
- **Play:** plays the whole scene with the real player. Scrubbing the timeline shows any moment.
- **Undo/redo:** unlimited within the session.

Touch first: every target at least 48 px, everything works with one finger, no right-click, no hover-only UI.
Works on a 10-inch tablet and on a laptop.

## 4. Pose mode (Animator)

- Tap a character, then "Pose". Joints show as dots. Dragging a dot rotates that joint (inverse kinematics is not
  needed in the first version; each drag rotates one joint).
- "Save pose" stores it in the scene's pose library with a name and an emoji. A saved pose becomes a move block
  ("Strike pose ⭐").
- Joint limits stop impossible bends (a knee only bends one way). Limits live in the rig data, not the editor.
- Mirror button: copy left to right.

## 5. Format v0.2 (what the editor writes)

v0.2 is a superset of v0.1: every v0.1 file stays valid. It adds a high-level layer that children's actions map to
one to one. The player expands that layer into ordinary v0.1 tracks with one shared, pure function
(`expand(doc)`), so the low-level player stays the same and the result stays deterministic.

New top-level keys:

```json
{
  "format": "lottie3d", "version": "0.2", "duration": 12, "fps": 30, "loop": false,
  "stage": "garden",
  "cast": [
    { "id": "duck", "kind": "critter", "name": "duck", "at": [-1, 0], "facing": 30 },
    { "id": "robo", "kind": "character", "name": "robot", "at": [1, 0], "facing": -30 },
    { "id": "ball", "kind": "prop", "name": "ball", "at": [0, 1] }
  ],
  "timeline": [
    { "who": "duck", "at": 0.5, "do": "hop", "dur": 1, "with": { "height": 0.5 } },
    { "who": "robo", "at": 1, "do": "wave", "dur": 2 },
    { "who": "duck", "at": 2, "do": "say", "dur": 2, "with": { "words": ["hello", "friend"] } },
    { "who": "camera", "at": 0, "do": "shot", "dur": 4, "with": { "frame": "wide" } }
  ],
  "poses": { "star": { "emoji": "⭐", "joints": { "shoulderL": [0, 0, 150], "shoulderR": [0, 0, -150] } } }
}
```

- `stage` replaces `scene` (one of the two is required). A stage brings its background, floor, lights and fog.
- `cast[].kind`: `rig` (v0.1 stick/block), `critter` (procedural animals), `character` (rigged glTF such as the robot),
  `prop` (procedural props), `shape` (primitive shapes). `at` is `[x, z]` on the floor; `facing` is degrees.
- `timeline[]`: `who` is a cast id or `camera`; `at` and `dur` are seconds; `do` is a move id from the move
  catalog (section 6); `with` holds that move's options, each with a default.
- `poses`: named joint sets that `do: "pose"` can use.
- Low-level `characters`, `props` and `tracks` from v0.1 still work, so an Animator can mix blocks and keyframes.

Determinism rules carry over: no randomness, no clocks. glTF clips (robot Wave, Dance, ...) are sampled with
`AnimationMixer.setTime(t)`, never advanced by wall time. Moves that look random (wiggle, twinkle) use a fixed
formula of time and the cast id.

The validator grows to check v0.2: unknown move, unknown cast name, a `who` not in the cast, overlapping blocks
in one row, options of the wrong type, blocks past `duration`. Errors keep the same `{ path, code, message }` shape,
and the editor turns them into child-friendly hints ("The duck can't do two things at once here").

## 6. Catalog: shared with engine3d

`engine3d/catalog` today has 80 actions, 1 rigged character (robot, CC0, 11 clips), 10 critters, 12 props,
85 shapes and 17 stages. Most of it is already data (critters, props and shapes are built from primitive parts),
which is what makes sharing practical.

**How it is shared:** a build script, `tools/lottie3d_catalog.mjs`, reads `engine3d/catalog` and writes
`lottie3d/catalog/kids.json` (checked in, generated, never hand edited), the same pattern as
`catalog/generated/`. The player and editor load only `kids.json`. Neither imports `engine3d/` at runtime.

**What goes in:** an allowlist file, `lottie3d/catalog/kids_allow.json`, names each item to export, with its
kid-facing label, emoji and the lowest mode that shows it. Anything not on the list stays out. This keeps the
editor small and curated (section 2) while the source stays in one place.

**First set (v1):**

| Group | Items |
|---|---|
| Stages (5) | garden, playroom, beach, snow, space |
| Cast (6) | robot, duck, dog, cat, bunny, frog |
| Props (8) | ball, apple, balloon, gift, tree, flower, sun, cloud |
| Moves, Tiny (8) | hop, wave, spin, dance, wiggle, nod, sleep/wake, pop in |
| Moves, Maker (+10) | walk to, leap, roll, grow/shrink, look at, point at, feel (happy, sad, surprised), say, sound, hide/show |
| Camera, Maker (4) | wide, close up, follow, orbit |
| Effects, Maker (3) | burst, twinkle, swirl |

Moves in `engine3d` that are about lessons (vowel_mark, place value, fill_box, answer, ...) stay out of v1.

**Porting work per item type:**

| Type | Work |
|---|---|
| Stages, props, critters, shapes | Data conversion in the build script; a small part builder in the player (sphere, box, cylinder, cone, torus, ...). |
| Robot (glTF) | Ship the `.glb` (about 460 KB for all characters today) and load it lazily; clips map to moves. |
| Moves | Each needs an `expand` rule (move + options → tracks). Simple moves (hop, spin, grow) are a few lines each. Moves that live in `engine3d/runtime` code (feel, say, burst) need a small re-implementation. |
| Faces, lip sync, particles, director effects | Re-implement only what v1 needs (eyes and a mouth for feel/say, one particle system for burst/twinkle). Defer the rest. |

## 7. Sound and speech

- `sound` plays a clip from a small bundled set (animal sounds from the critter entries, pops, boings, a few music
  loops). Sounds are scheduled from timeline time so scrubbing and replay stay in sync.
- `say` shows a speech bubble. In Tiny and Maker mode the words come from a picker (a fixed kid-safe word list with
  pictures), not free typing. Animator mode may allow typing only when a parent or teacher turns it on, and it is
  never shared (section 9).
- Voice (text-to-speech) and lip sync are out of v1.

## 8. Saving and sharing

- Autosave to the device (browser storage) after every change; a "My scenes" shelf shows thumbnails.
- Export: download the `.json` file (and later a GIF). Import: open a `.json` file.
- Share v1 is local only: a parent or teacher can download and send the file themselves.
  No upload, no link sharing, no gallery in v1.

## 9. Child safety and privacy

- No accounts, sign-in, names, email, location, camera or microphone. No analytics that identify a child.
- No network calls after the page loads, except loading catalog assets from the same site.
- No free text that leaves the device. Word-picker speech only by default.
- No ads, no external links, no in-app purchases inside the editor.
- The goal is to stay clear of COPPA and GDPR-K data rules by collecting nothing. Any later sharing feature needs
  its own review before it is designed.

## 10. Architecture

```
lottie3d/
  player.js          existing player, gains expand() support for v0.2
  expand.js          pure: v0.2 doc → v0.1 tracks + events (sounds, bubbles); shared by player and editor
  moves/             one small module per move family, each a pure expand rule
  validate.js        grows v0.2 checks
  catalog/
    kids_allow.json  hand-written allowlist with labels, emoji, modes
    kids.json        generated from engine3d/catalog by tools/lottie3d_catalog.mjs
  editor/
    index.html       the studio
    state.js         scene document + undo stack (pure, testable in Node)
    ui/*.js          stage view, cast tray, move bar, timeline, pose mode
```

- Same principles as the rest of the repo: plain ES modules, no build step, Three.js from a pinned CDN URL,
  no `Math.random` or wall-clock time inside the simulation path, modules under about 350 lines.
- Editor state is the document itself plus an undo stack. Every UI action is a pure function
  `(doc, action) → doc`, which makes undo, autosave and tests simple.
- The editor shows the scene through the real player, so what a child sees while editing is exactly what plays.

## 11. Milestones

| # | Milestone | Done when |
|---|---|---|
| E1 | Format v0.2 + `expand.js` + catalog build for the v1 set, playing in the existing demo page | Hand-written v0.2 examples play correctly; unit tests for expand and the v0.2 validator pass; `kids.json` is generated, not hand edited. |
| E2 | Tiny mode editor | A child can pick a stage, place cast, tap moves, play, undo, and the scene autosaves. Works on a tablet. |
| E3 | Maker mode | Timeline drag/stretch/reorder, word-picker speech, sounds, props, camera shots. |
| E4 | Animator mode | Pose mode with joint limits and mirroring, saved poses as blocks, easing choice, read-only JSON panel. |
| E5 | Playtest and polish | Sessions with children in each age band (section 12); fixes from what they struggle with. |

Each milestone stops for Sridhar's visual review before the next one starts.

## 12. Testing

- Unit (Node, no canvas): `expand` per move (table-driven), v0.2 validator fixtures with expected codes,
  editor state actions and undo, catalog build (allowlist items exist in `engine3d/catalog`).
- Browser: each example and each move previewed in the in-app browser; golden screenshots for a few fixed times.
- Children: short playtests in each age band. Measure time to first played scene, which buttons they never find,
  and where they ask for help. Goal 1 in section 1 is the pass mark.

## 13. Open questions

1. Where does it live for children: a page on the Toybox site, a page in KidsLearningPlatform, or an app?
2. Is the robot the right lead, or should the Toybox series characters be modeled first?
3. Should scenes be exportable as video (reuse the `engine3d` render pipeline) so children can "make an episode"?
4. Free or paid (for example, free Tiny mode, paid packs of stages and characters for schools)?
5. Do we want a teacher view (assign a "make a scene where the frog hops 3 times" task) as a later milestone?
