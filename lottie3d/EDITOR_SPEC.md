# Lottie3D Kids Studio: editor spec (draft 0.3)

A web editor where children build short 3D animated scenes with the Toybox cast, moves and stages,
without ever seeing JSON. Under the hood it writes a Lottie3D file (format v0.2, section 5) that the
existing player (`player.js`) plays anywhere.

Status: draft 0.3 for review. E1 is built (section 11.1); nothing else is built yet. Format v0.1 (`SPEC.md`) and the player are the base.

**Decisions (2026-11-17, updated the same day):**

| Question | Decision |
|---|---|
| Where it lives | `abcbunny.com/3dVideoEditor`, a web page (section 10.1). |
| Which characters | Any 3D model; children pick and choose. No fixed lead (sections 6.1 and 6.2). |
| Video export | Yes. Signup is required for every export, free ones included (section 8). |
| Teacher view | Not planned. |
| What abcbunny.com runs | KidsLearningPlatform: a Vite web app on Firebase (Hosting, Auth, Firestore, Cloud Functions, project `abcbunny-ad84b`) with Stripe payments. The editor reuses it (section 10.1). |
| Accounts and consent | The KidsLearningPlatform parent account and its consent flow, one for all abcbunny.com tools (section 9.1). |
| Free tier | 720p, up to 3 minutes, small watermark, made in the browser (section 8.2). |
| Paid tier | 4K, rendered on a server (section 8.2). |
| Models | A free starter set; every other model is paid, metered per use with credits shared across abcbunny.com tools (sections 6.2 and 8.3). |

## 1. Goals

1. A child aged 4–12 can make a 10–30 second scene and play it back in under 5 minutes, alone.
2. The cast, moves, props and stages are the ones from the Toybox videos (`engine3d/catalog`), so children
   play with characters they already know.
3. One source of truth: a move or prop added to `engine3d/catalog` can reach the editor through a build step,
   with no hand copying.
4. Every scene is a small, valid, deterministic file: same file, same frames, on any device.
5. Safe for children by design (section 9).

6. A finished scene can be exported as a video file (section 8.2): free in the browser, paid 4K on a server.

Non-goals for this spec: multiplayer, a public gallery, a teacher view, professional keyframe tools,
children uploading their own 3D model files.

## 2. Users and modes

The same editor has three modes. The mode only changes what is shown, never the file format.

| Mode | Age | What they do | What is hidden |
|---|---|---|---|
| **Tiny** | 4–6 | Pick a stage, drag 1–3 characters in, tap big move buttons (hop, wave, dance), press Play. Icons and voice prompts, no reading needed. | Timeline, numbers, poses, camera. |
| **Maker** | 7–9 | Everything in Tiny, plus a timeline of move blocks they can reorder and stretch, speech bubbles from a word picker, sounds, props, camera shots. | Joint posing, raw numbers. |
| **Animator** | 10–12 | Everything in Maker, plus pose mode (drag joints and save poses), easing choice, typed numbers, and a read-only "see the code" panel showing the JSON. | Nothing. |

A parent can lock a mode.

## 3. Screen layout

```
┌───────────────────────────────────────────────────────────┐
│ [Stage ▾] [Mode ▾]          [↶ Undo] [▶ Play] [💾] [🎬 Video] │
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
- **Cast tray:** every model in the catalog, grouped into picture tabs (People & robots, Animals, Things, Shapes)
  with a search-by-picture filter. Drag onto the stage. Dropped items stand on the floor; a ring handle turns them.
  See section 6.1.
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
  `prop` (procedural props), `shape` (primitive shapes). `at` is `[x, z]` on the floor, or `[x, y, z]` to start
  above it (a sun, a cloud); `facing` is degrees; `size` scales the model (default 1); `color` recolours its main colour.
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

### 6.1 Any model, picked by the child

There is no lead character. Every model in the catalog is a cast member a child can pick, and a scene can mix them
(a robot, a frog and a balloon together). The v1 table above is the first set to port, not a limit: the target is
all models in `engine3d/catalog` (rigged characters, critters, props and shapes) plus any added later.

To make "any model" work, every model declares what it can do, and the editor only offers moves that fit:

| Capability | Who has it | Moves it unlocks |
|---|---|---|
| `body` (everything) | all models | hop, spin, wiggle, grow/shrink, walk to, roll, pop in, hide/show, say, sound |
| `face` | critters and characters with eyes/mouth | feel, sleep/wake, look at |
| `limbs` | v0.1 rigs and rigged glTF characters | wave, point at, poses (Animator) |
| `clips` | rigged glTF characters | their own clips (Dance, Jump, ThumbsUp, ...) as extra move buttons |

The build script reads capabilities from the catalog entry (a critter with `eyes` gets `face`; a glTF with clips gets
`clips`) and writes them into `kids.json`. A new model added to `engine3d/catalog` appears in the editor once it is on
the allowlist, with the right move buttons and no editor code change.

Loading: the tray shows thumbnails generated at build time; a model's geometry or `.glb` loads only when it is placed.

### 6.2 Free starter set and the paid model library

- **Free:** the starter set in `kids.json` (the v1 table above). It ships with the page and needs no account.
- **Paid:** every other model, from a **model library** that can hold any 3D model (glTF/GLB from any licensed
  source, plus our own catalog models). Using a library model costs credits (section 8.3). The tray shows library
  models with a small ticket badge; placing one asks for a grown-up when no parent is signed in.
- **Model library service** (a Cloud Function plus Cloud Storage in the KidsLearningPlatform Firebase project):
  - Stores each model with its manifest: licence, author, thumbnail, size, height, capabilities and credit price.
  - On import, a script inspects the file: animation clips → `clips`; a humanoid skeleton whose bone names map to the
    Lottie3D joints (`shoulderL`, `hipR`, ...) → `limbs` and `joints`; otherwise `body` only. A person reviews and
    approves every model (licence and content) before it is listed.
  - The editor asks `getModel(modelId)`; the function checks the parent's credits, records a usage event, and returns
    a short-lived signed URL to the file. The model then works like any catalog model.
- Children still cannot upload model files. Adding to the library is an admin task.
- Billing per use, not per load: a library model is charged once per scene that uses it (when the scene is first
  saved or exported with it), so reopening or replaying never charges again (rules in section 8.3).

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
  pictures), not free typing. Animator mode may allow typing only when a parent turns it on, and it is
  never shared (section 9).
- Voice (text-to-speech) and lip sync are out of v1.

## 8. Saving, sharing and video export

### 8.1 Saving

- Building and playing scenes needs no account. Anyone can open the page and start.
- Autosave to the device (browser storage) after every change; a "My scenes" shelf shows thumbnails.
- Download and open the `.json` scene file, also without an account.
- No upload, link sharing or gallery in v1.

### 8.2 Video export

- The 🎬 Video button exports the scene as an MP4 the family downloads.
- **Signup is required for every export, free ones included.** The account belongs to a parent (section 9.1). If no
  parent is signed in, the button opens a "Ask a grown-up" screen, not a signup form aimed at the child.
- **Rendering happens in the browser:** the exporter steps the player frame by frame (`seek(frame / fps)`, the same
  deterministic frames as playback), encodes them with the browser's WebCodecs video encoder, mixes in the scheduled
  sounds, and writes an MP4. The scene and the video never leave the device; the server is only asked "may this
  account export, and at what settings?". Browsers without WebCodecs get a clear "use Chrome, Edge or Safari 17+"
  message.
- **Entitlements from the server:** every export first calls one entitlement check (a Cloud Function), which returns
  the allowed options. The editor never hard-codes what is free.

  | Option | Free | Paid |
  |---|---|---|
  | Where it renders | in the browser | on a server |
  | Resolution | 720p | up to 4K (2160p) |
  | Length | up to 3 minutes | up to 3 minutes at first (raise later) |
  | Watermark | small abcbunny.com mark | none |
  | Cost | free (signup needed) | credits per export (section 8.3) |

- **Paid 4K render on a server:** the editor uploads the scene JSON (not a video) to a render job. A render worker
  (headless Chromium running the same `player.js`, stepping frames with `seek`, encoding with ffmpeg) produces the
  MP4, stores it in Cloud Storage for 7 days, and the parent gets a download link in the Parent Zone. Because the
  player is deterministic, the server video matches the preview frame for frame. Credits are reserved when the job
  starts and charged when it succeeds; a failed job releases them. Cloud Functions are too small for 4K renders, so
  the worker runs on Cloud Run (or a similar container service) in the same project.
- The `engine3d` render pipeline stays separate; reusing its encoding settings (4K60) is a good default.

### 8.3 Credits: one usage system for all abcbunny.com tools

Paid use is metered in **credits** (working name "Bunny tickets"), one balance per parent account, shared by every
tool on abcbunny.com: this editor, KidsLearningPlatform activities, printable worksheets and future tools. It lives in
the KidsLearningPlatform Firebase project and gets its own detailed spec there; this section is what the editor needs.

- **Balance and ledger (Firestore, server-written only):** `parents/{uid}/credits/balance` and an append-only
  `parents/{uid}/creditLedger/{entryId}` with `{ delta, reason, product, item, idempotencyKey, createdAt }`.
  Clients can read their own, never write.
- **Earning:** credit packs bought through Stripe (a webhook function adds them), a monthly grant for subscribers,
  and admin grants.
- **Spending:** only through one callable function, `spendCredits({ product, action, item, units, idempotencyKey })`.
  It checks the price list, the balance and the idempotency key in one transaction, writes the ledger entry, and
  returns the new balance. A repeated key never charges twice. Long jobs use `reserve` then `commit` or `release`.
- **Price list (server config):** for example `3dVideoEditor.render4k` per minute of video, `3dVideoEditor.model`
  per library model per scene, `printables.premium` per worksheet. Prices change without a client release.
- **Usage reports:** the ledger is the usage record per parent; an admin view sums usage per product.
- **Children never see prices or buy anything.** The editor shows "Ask a grown-up"; spending and buying happen
  behind the parent gate in the Parent Zone.

## 9. Child safety and privacy

### 9.1 Accounts and consent (shared with KidsLearningPlatform)

The editor uses the KidsLearningPlatform account system rather than its own. Because the users are under 13, it
follows COPPA (US) and GDPR-K (EU/UK) rules:

- The account holder is a **parent or guardian**: a Firebase Auth user (email/password, or Google), the same login as
  KidsLearningPlatform. Children are profiles under the parent (`parents/{uid}/students/{studentId}`), never auth
  users, as in KidsLearningPlatform's data model.
- **One consent for all tools:** KidsLearningPlatform has a parent gate (the Parent Zone PIN) but no recorded
  verifiable parental consent yet. Add it there once, as a `consent` record on the parent document
  (`{ method, version, grantedAt }`, server-written), collected at signup or before the first paid or exporting
  action in any tool. The editor checks that record; it never runs its own consent flow.
- Each tool's data use is listed in one privacy notice for parents, so the consent covers the editor's exports,
  renders and credits as well.
- The child never types an email, real name, age, photo or location in the editor.
- The editor stores on the server only: export and render jobs (scene JSON and the video for 7 days, paid renders
  only) and credit ledger entries. Free exports keep everything on the device.
- Parents can delete the account and its data from the Parent Zone; that also deletes render jobs and videos.
- Signup, buying credits and parent screens sit behind the existing parent gate.

### 9.2 Everything else

- No location, camera or microphone. No analytics that identify a child; only aggregate, anonymous counts.
- The editor makes no network calls except loading catalog assets from the same site, Firebase sign-in, and the
  entitlement, model-library, credit and render calls listed above.
- No free text that leaves the device. Word-picker speech only by default.
- No ads, no external links and no purchases inside the child-facing editor. Any future payment happens behind the
  parent gate.
- A privacy policy for the editor, written for parents, is needed before launch.

## 10. Architecture

```
lottie3d/
  player.js          the player: v0.1 keyframes and v0.2 stage/cast/timeline (built in E1)
  models.js          Three.js builders: stages, part models, glTF characters, rigs, speech bubbles (E1)
  expand.js          pure: v0.2 doc → keyframe channels, clips, camera tracks, events; evaluateCast(t) (E1)
  moves.js           pure move rules, one function per move (E1)
  validate.js        v0.1 checks; validate02.js adds the v0.2 checks (E1)
  catalog/
    kids_allow.json  hand-written allowlist with labels, emoji, modes
    kids.json        generated from engine3d/catalog by tools/lottie3d_catalog.mjs
  editor/
    index.html       the studio
    state.js         scene document + undo stack (pure, testable in Node)
    ui/*.js          stage view, cast tray, move bar, timeline, pose mode
    export/          frame stepper, WebCodecs encoder, audio mix, MP4 muxer
    account/         parent gate, signup/sign-in, entitlement client
```

### 10.1 Hosting

- abcbunny.com is the KidsLearningPlatform app on Firebase Hosting (`dist/`, built by Vite). The editor is static
  files (HTML, JS, catalog JSON, models, sounds) developed here in `lottie3d/`, and a sync script copies a release into
  `KidsLearningPlatform/public/3dVideoEditor/`, so Vite ships it unchanged and it is served at
  `abcbunny.com/3dVideoEditor/`. All paths are relative, so the same files also work locally with `npm run serve`.
- Sign-in uses the Firebase JS SDK with the KidsLearningPlatform web config; a parent signed in on abcbunny.com is
  signed in on the editor too (same origin).
- Server parts live in the KidsLearningPlatform Firebase project: entitlements, `spendCredits`, the model library and
  render jobs as Cloud Functions; the 4K render worker on Cloud Run; videos and library models in Cloud Storage.
- Three.js stays on its pinned CDN URL while prototyping; for production, self-host that file under the same path so
  the page has no third-party request. (KidsLearningPlatform bundles three 0.160; the editor keeps its own pinned
  copy, since it is a separate page.)

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
| E5 | Free video export | In-browser 720p MP4 export (frames + sound, up to 3 minutes, watermark) that matches playback frame for frame; entitlement check decides the options. |
| E6 | Shared accounts and consent | Editor signs in with the KidsLearningPlatform parent account; consent record added in KidsLearningPlatform and checked by the editor; export blocked without a signed-in, consented parent. Privacy notice updated. |
| E7 | Launch the free editor | Playtests with children in each age band (section 12); fixes; sync into KidsLearningPlatform and publish at `abcbunny.com/3dVideoEditor`. |
| C1 | Credits service (KidsLearningPlatform) | Balance, ledger, `spendCredits` with reserve/commit, Stripe credit packs, price list, admin usage view; its own spec in KidsLearningPlatform. Needed by E8 and E9. |
| E8 | Paid 4K server render | Render jobs, Cloud Run worker, Parent Zone downloads, credits reserved and charged per job; server frames match the preview. |
| E9 | Paid model library | Import script with capability detection and review, library storage, `getModel` with credit charging, ticket badges in the tray. |

Each milestone stops for Sridhar's visual review before the next one starts.

### 11.1 E1 as built (2026-11-17)

- Format v0.2 in the player: `stage`, `cast` (`at` may be `[x, y, z]` for things in the sky), `timeline`, `poses`;
  v0.1 `characters`/`props` still work alongside. `createPlayer(canvas, json, { catalog })`; `await player.ready`
  waits for glTF characters.
- `kids.json` from `npm run lottie3d:catalog` (check with `npm run lottie3d:catalog:check`): 5 stages, 16 models
  (robot, stick and block rigs, 5 critters, 8 props), 25 moves, the word list and sounds. The robot `.glb` is copied
  to `catalog/assets/`.
- Moves built: hop, spin, wiggle, nod, show (pop in), hide, grow, shrink, walk_to, leap, roll, turn, look_at, say,
  sound, dance, wave, sleep, wake, clip, pose; camera: wide, close, follow, orbit. Gaits and moves adapt to the model:
  the robot plays its clips (Walking, Wave, Dance, Jump), rigs get joint animation, critters and props waddle and hop.
- Left for later milestones: `feel` and `point_at` (E3), effects burst/twinkle/swirl (E3), real audio for `sound`
  (E3; E1 shows a 🔊 bubble), toon eyes, talking mouths and fur from engine3d, rounded box edges.
- Examples: `garden_friends.json`, `playroom_party.json`, `snow_walk.json` in the demo page.

## 12. Testing

- Unit (Node, no canvas): `expand` per move (table-driven), v0.2 validator fixtures with expected codes,
  editor state actions and undo, catalog build (allowlist items exist in `engine3d/catalog`, capabilities derived
  correctly), entitlement handling (export options never exceed what the server allows).
- Export: an exported video's frames match the player's frames at the same times; length and audio sync checked.
- Accounts: export is impossible without a signed-in parent; account deletion removes all stored data.
- Browser: each example and each move previewed in the in-app browser; golden screenshots for a few fixed times.
- Children: short playtests in each age band. Measure time to first played scene, which buttons they never find,
  and where they ask for help. Goal 1 in section 1 is the pass mark.

## 13. Open questions

All earlier questions are answered (see the decisions table at the top).

Still open:

1. Which verifiable parental consent method for the shared consent record (for example a small card check, a
   signed form, or a third-party consent service)? Needs a quick legal check for the countries abcbunny.com serves.
2. Credit prices and packs: what a credit costs, and the price of a 4K render minute and a library model.
3. Does a subscriber (KidsLearningPlatform premium) get a monthly credit grant, and how many?
4. Where library models come from first (our `engine3d` catalog, CC0 packs, bought packs) and the licence rules for
   paid use.
