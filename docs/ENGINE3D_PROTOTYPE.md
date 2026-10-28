# engine3d prototype: findings and plan

Date: 2026-10-28. Machine: Apple M3 Pro (12 cores, 18 GB), macOS 26, Node 20.19.3, three.js r170,
Playwright 1.49.1 (Chromium 131 headless shell), ffmpeg 7 (Homebrew).

**Question.** Can a separate 3D engine in this repo (Three.js in headless Chromium) make kids' learning
videos (counting blocks, letters, vowels, rhymes) at 4K 60 fps on this Mac fast enough, and stay
deterministic, while reusing the 2D pipeline's catalog conventions, AI script workflow, TTS, mixer and
recording tools?

**Answer: yes.** The 32 s "Count to five" demo renders at 4K60 in 39 s end to end (54 fps, 0.9× real
time) and at 1080p30 in 7.5 s (191 fps), in about 600 MB of memory. Frames are bit-identical between runs
of a single page. The prototype is in `engine3d/` (usage: `engine3d/README.md`); demos are in
`out/demos/3d/`.

## 1. What was built

| Piece | Where | Notes |
|---|---|---|
| Timeline, eases, seeded RNG | `engine3d/runtime/timeline.js`, `ease.js`, `rng.js` | Pure, Node + page. Every value is a closed-form function of t. |
| Director: the one authoring API | `runtime/director.js` | `add`, `drop`, `pop`, `hop`, `spin`, `clip`, `camera`, `caption`, `say`, `sound`, `burst`, `onFrame`… records a plan. |
| JSON scripts | `runtime/compile.js`, `validate.js`, `scripts/count_to_five.json` | `kind: "video3d"`: beats like 2D story scripts; TTS clips stretch beats. Validator: 28 error and 3 warning codes, 12 bad fixtures. |
| JS scenes | `runtime/plan.js`, `scenes/vowels.js` | A module receives the same director; `onFrame` hooks allow custom motion. |
| three.js stage | `runtime/stage.js`, `objects.js`, `overlay.js` | PBR toy materials, room environment light, soft shadows, extruded Andika letters/digits, rounded number blocks, seeded confetti, glTF characters with clip cross-fades, caption overlay in the same WebGL frame. |
| Catalog | `engine3d/catalog/*.json` | Colours, materials, shapes, fonts, characters (clip lengths read from the .glb), stages and lights, sounds, object kinds, actions; every entry has a description and tags. |
| Recorder | `engine3d/tools/render3d.mjs` + `lib/` | Local HTTP + WebSocket server, Playwright launcher (Metal or SwiftShader), in-page WebCodecs encode or ffmpeg pipe, chunked parallel pages, stills, frame hashes, benchmarks, memory sampling. |
| Audio | `tools/lib/audio3d.mjs` | Reuses `tools/lib/tts` (Piper and its cache), `mixer.mjs` `mixdownStory`, `loudness.mjs`, `music_gen.mjs` and the shared SFX. Mix levelled to -16.0 LUFS. |
| Tests | `engine3d/tests/` | 11 tests (`cd engine3d && npm test`): timeline folding and clip fades, eases, RNG streams, validator fixtures, beat stretching, JS-scene plan stability, no clocks in runtime/ or scenes/. |

`/engine` is untouched: engine3d has its own `package.json` (three, playwright) and never imports
`/engine`. It imports the 2D tools' audio modules and the 2D catalog only for music moods.

## 2. Render speed

### 2.1 Final demo renders (GPU, WebCodecs, 1 page)

| Render | Frames | Draw + encode | fps | × real time | Whole run (TTS cached, mix, mux) | Peak memory (all processes) | File |
|---|---|---|---|---|---|---|---|
| 1080p30 | 962 | 5.0 s | **191** | 6.4× | 7.5 s | 570 MB | `count_to_five_1080p30.mp4` (23 MB) |
| 4K60 | 1924 | 35.6 s | **54** | 0.90× | 38.6 s | 614 MB | `count_to_five_4k60.mp4` (80 MB) |
| 1080p30 JS scene | 533 | 2.9 s | 186 | 6.2× | – | – | `vowels_1080p30.mp4` |

For scale, the 2D engine renders ep01 at 4K30 at 2.8 fps (render_4k notes). These 3D scenes are simpler
than a Doopi street scene, but 3D at 4K60 is not the bottleneck it was feared to be.

### 2.2 Where the time goes (`--bench`, frames/s)

| Stage | 1080p | 4K |
|---|---|---|
| Draw only (GPU finishes each frame) | 282 | 195 |
| Draw + `readPixels` (raw RGBA into the page) | 236 | 87 |
| Draw + readback + send raw frames to Node (WebSocket) | 19 | 4.9 |
| Same over `fetch` POST (first attempt) | 5.8, and Chromium memory grew ~10 MB per frame until the page crashed | – |
| **Draw + WebCodecs H.264 in the page (shipped)** | **191** | **54** |
| Raw frames piped to ffmpeg libx264 / h264_videotoolbox | – | 4.5 / 4.7 |
| 3 pages in parallel, WebCodecs | – | 54 (no gain) |

Getting raw frames out of Chromium is the real cost: its sockets carry about 140–160 MB/s, which is
19 fps at 1080p and 5 fps at 4K. Encoding inside the page with WebCodecs (Apple's VideoToolbox H.264
encoder behind it) sends only compressed chunks (2–270 KB per frame at 4K, median 26 KB) and is 12× faster at 4K. At 4K60 the
hardware encoder is now the limit: the GPU draws at 195 fps, and three pages share one encoder, so
`--jobs` doesn't help. HEVC encoding is not offered by this Chromium build.

### 2.3 GPU vs software (SwiftShader)

| | 1080p30 | 4K60 |
|---|---|---|
| GPU (ANGLE → Metal, "ANGLE Metal Renderer: Apple M3 Pro") | 191 fps | 54 fps |
| SwiftShader (CPU, Vulkan-on-LLVM) | 5.6 fps | 1.8 fps (1.7 GB peak) |

SwiftShader is about 30× slower: the 4K60 demo would take about 18 minutes. It works without a GPU (CI,
containers), with a texture limit of 8192 (4K fits).

## 3. Determinism

Frames are drawn from `t = frame / fps` only. No `requestAnimationFrame`, clocks or `Math.random`
(`page.html` also seeds `Math.random` for three.js's UUIDs, and a test bans clocks in `runtime/` and
`scenes/`). Drops, bounces and confetti are closed-form, and character clips are sampled at explicit times.
Checked by hashing every raw frame (`engine3d/tools/determinism.sh`, results in `out/demos/3d/determinism/`):

| Comparison | Identical frames |
|---|---|
| GPU run A vs GPU run B (1 page, all 962 frames at 1080p) | **962 / 962** |
| One page starting mid-clip (frame 321) vs a full run | 100 / 100 |
| SwiftShader run A vs run B | **300 / 300** |
| GPU vs SwiftShader | 0 / 300 (different rasterisers, as expected) |
| GPU 1 page vs 3 pages in parallel | 887 / 962 |

With several pages sharing the GPU, a few frames differ: on the worst frames 0.09–0.13% of channel values
differ (speckles in the shadowed floor and tower), and on their neighbours a handful of values differ by
1–2 levels. The change can't be seen, but it isn't bit-exact. Chunk history isn't the cause (a single
page starting mid-clip matches exactly), and a discarded warm-up draw didn't fix it. **Rule:** golden
frames and hashes use one page (`--jobs 1`, the default). That costs nothing, because parallel pages
don't render any faster.

What is not guaranteed: identical pixels on a different GPU, macOS version or Chromium build. Goldens are
per machine, as for any GPU renderer. The WebCodecs MP4 bytes are not compared (hardware encoders are
not specified to be bit-exact); the pixels going into the encoder are.

## 4. Quality notes

- Colour: frames are converted with BT.709 and tagged BT.709 on both paths. A WebCodecs frame matches the
  lossless PNG of the same frame by eye.
- WebCodecs uses a bitrate target, not CRF. It was asked for 12 Mbit/s (1080p30) and 60 Mbit/s (4K60) VBR
  and produced about 5.7 and 20 Mbit/s on these flat pastel scenes. No banding is visible in the contact
  sheets, but busier scenes should be checked. YouTube recommends 53–68 Mbit/s for 4K60 uploads. Follow-up:
  try `bitrateMode: "constant"` or per-frame quantizer for finals.
- The real Piper voice stretches beats (the 35 s estimate became 32 s). The audio mix is -16.0 LUFS with
  the procedural "bouncy" bed ducked under speech.
- Fixed during the prototype: a block hopping inside a stack passed through the block above it. The
  script now lifts the blocks above with it. A full engine needs real stacking (see M3D-2).

## 5. Licences

| Component | Licence | Notes |
|---|---|---|
| three.js | MIT | npm, pinned 0.170.0 |
| Playwright | Apache-2.0 | Chromium is BSD-style. Proprietary codecs aren't needed: WebCodecs H.264 uses the OS encoder |
| RobotExpressive.glb | **CC0 1.0** | Tomás Laulhé (Quaternius), morphs by Don McCurdy; from the three.js repo r170. `engine3d/assets/characters/LICENSES.md` |
| Andika, Bangers fonts | SIL OFL 1.1 | already in `assets/fonts/` |
| Piper voices, SFX, music | as for the 2D pipeline | `assets/speech/VOICES.md`, `assets/sfx/SOURCES.md` |

More characters: Quaternius and Kenney packs are CC0 (best fit). Mixamo animations are fine in rendered
video but can't be redistributed in the repo or a catalog pack. Sketchfab is licensed per model (often
CC-BY with credit, sometimes NC, which rules it out for a monetised channel).

## 6. Alternatives

### Remotion with `@remotion/three`

Remotion renders React components frame by frame in headless Chromium; `@remotion/three` wraps
react-three-fiber with `useCurrentFrame()`. Architecturally it is the same idea as this prototype.

- **Licence:** source-available, not OSI open source. It is free for individuals, non-profits and
  companies of up to 3 people; larger teams need a company licence (per-seat plans from about $25 per seat
  per month, enterprise from about $500 per month). Sridhar alone qualifies for the free tier today; a
  fourth collaborator (including collaborators from another company, counted together) would need a paid
  licence. Check remotion.dev/docs/license before relying on it.
- **For:** a mature Studio with a scrubbing preview, a robust multi-process renderer, Lambda/Cloud Run
  rendering, a large ecosystem.
- **Against:** the authoring layer is React + R3F, which doesn't fit this repo's plain-ES-module,
  JSON-catalog, AI-validated-script model (we would wrap our scripts in React anyway). Its standard
  renderer takes a screenshot per frame. By the numbers in 2.2, that path is bound by raw-frame transfer at
  4K (not measured here with Remotion itself; it may be tuned better than our first raw path). It also
  ties the channel's toolchain to a licence that changes with team size.
- **Verdict:** not needed. What it would add (preview, cloud render) is cheaper to add ourselves (see M3D-5).

### Blender with Python (`blender -b -P script.py`)

- **Licence:** GPL-3; the rendered output and our scripts' output belong to us.
- **For:** much higher ceiling on looks (EEVEE/Cycles, GI, real cloth and physics, rigging tools, the
  whole asset ecosystem), and deterministic with fixed seeds.
- **Against:** far slower per frame. Not measured here: EEVEE typically takes seconds per 4K frame and
  Cycles minutes, against ~0.02 s here. A 10-minute 4K60 episode is hours in EEVEE versus about 11 minutes
  here. AI-written `bpy` code is hard to validate before a run (no catalog-checked schema), iteration is
  slow, and it shares nothing with the Node toolchain except ffmpeg and audio.
- **Verdict:** keep it for one-off hero assets (modelling a character, baking a glTF), not as the episode
  renderer.

## 7. Recommendation

Go ahead with **engine3d as a sibling engine**: same repo, its own dependencies, shared catalog
conventions, AI script workflow, TTS, mixer and output folders. Keep `/engine` dependency-free and 2D.
Render through WebCodecs on the GPU; keep the raw-readback path for stills, hashes and goldens.

### Architecture for the full engine

```
engine3d/
  runtime/   pure: timeline, eases, rng, director, compile, validate   (Node + page; unit-tested)
             page: stage, objects/*, overlay, player                   (three.js; integration-tested)
  catalog/   JSON + build → generated context pack for the AI (like catalog/generated/)
  tools/     render3d (WebCodecs, stills, hashes), preview server, shorts/compilation adapters
tools/lib/   shared audio (tts, mixer, loudness, music), encode helpers, series ids
```

The plan is the contract: Node builds it for audio and timing, the page builds the same plan for
drawing, and a test checks both agree on duration.

### Milestones

| Milestone | Scope | Done when |
|---|---|---|
| **M3D-0** (this prototype) | timeline, director, JSON + JS input, catalog v0, WebCodecs recorder, demo, findings | `out/demos/3d/` reviewed by Sridhar |
| **M3D-1** Script and catalog | `video3d` schema doc (spec section like `stickman-engine-spec.md`), catalog build with descriptions/tags check and an AI context pack, `npm run catalog3d:build`, script generator prompt (copy-paste flow, no local LLMs) | an AI-written counting script validates first try from the context pack |
| **M3D-2** Learning kit | stacking and attach (objects resting on objects move together), number line, ten-frame, shapes sorting, letter tracing path, vowel and phonics cards, rhyme lyric captions with word highlights, counters and "+"/"=" signs | three new episode types (count to 10, letter of the day, add within 5) |
| **M3D-3** Characters | 2–3 CC0 hosts (Quaternius/Kenney), walk-to targets, look-at, face morphs and visemes from the TTS lip-sync data (`tools/lib/tts/lipsync.mjs`) | a host walks, points and lip-syncs a line |
| **M3D-4** Look and camera | stage presets (playroom, garden, space, classroom), camera move library (like `catalog/world/camera_moves.json`), the Doopi pace block (glide 1.2, calm cuts), depth of field, outline style | 1080p review frames approved |
| **M3D-5** Tooling | browser preview with a scrubber (the page already draws any t), goldens (1 page, per-machine hashes), Shorts (9:16) and compilations through `tools/shorts.mjs` / `compilation.mjs` ideas | an episode, its Short and a compilation from one script |
| **M3D-6** Production | quality pass on WebCodecs bitrate/quantizer for 4K60 finals, long-episode memory soak (10–20 min), thumbnails | a 10-minute 4K60 episode renders in under 15 minutes |

Review checkpoints for Sridhar: after M3D-0 (this demo), M3D-2 (first episode types) and M3D-4 (look).
