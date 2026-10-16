# Benchmarks

## M0.7 Canvas backend spike (2026-10-15)

Machine: Apple M3 Pro, Node 20.19.3, ffmpeg 9.0.2. Script: `node tools/bench_canvas.mjs --frames 300` (and `--encode`).

Scene per frame (1920x1080): gradient background and ground, two characters (one at scale 2.2), 500 particles (dots, lines, rings) at random alpha, Bangers "POW!" with outline, full-frame `saturation` composite pass.

| Backend | Version | Draw + read RGBA (ms/frame) | Frames/s | Deterministic (2 runs, SHA-256 per frame) |
|---|---|---|---|---|
| skia-canvas | 4.0.0 (CPU, `gpu = false`) | 14.8 | 67.5 | yes |
| @napi-rs/canvas | 1.0.11 | 14.9 | 67.0 | yes |

Drawing is deferred in both libraries, so nearly all cost shows up in `getImageData`. Measure them together.

End to end with `--encode` (render → raw RGBA pipe → libx264 `medium` CRF 16): **600 frames in 14.5 s = 41 fps** with @napi-rs/canvas. A 30 s video renders in about 45 s. Spec target: ≥ 25 fps.

Feature checks, both backends:
- Bundled fonts (Bangers, Inter) load from `assets/fonts` and render.
- `globalCompositeOperation = "saturation"` turns pure red into grey (76,76,76), so desaturate works.
- Output images are visually identical between the two backends.

**Decision: `@napi-rs/canvas`** (ADR-001). The two are equal on speed and determinism. @napi-rs/canvas has prebuilt binaries with no system libraries and a smaller API surface. `skia-canvas` was removed in M6 (unused); the adapter still supports it if reinstalled.

ffmpeg prints one "Truncating packet of size 8294400 to 8192" line on the raw pipe, with or without `-video_size`/`-framerate`/`-probesize`. **Resolved in M6 as cosmetic**: a lossless round trip of five distinct 1080p frames through the same pipe returns byte-identical frames. `tools/lib/encode.mjs` filters the line out.

## M4 renderer (2026-10-16)

`node tools/play_script.mjs scripts/samples/m4_dojo.json` (dojo_dusk theme, 2 characters, impacts, aura, overlays): 878 frames (14.6 s video) simulated, rendered and encoded in 14.5 s, about 60 frames/s end to end on the M3 Pro. Spec 14.4 target: ≥ 25 frames/s.

## M6 recorder (2026-10-16)

`node tools/record.mjs scripts/samples/m4_dojo.json`: 878 frames rendered and encoded at ~59 fps, audio mixed and muxed; 16.4 s total for a 14.6 s video (spec 20.2 target: 30 s video in under 2 minutes). Audio: peaks -1.5 dBFS, -18.7 LUFS integrated (SFX only, no music).

## S1 scenes (2026-10-16)

- `node tools/record.mjs scripts/samples/s1_scenes.json` (5 scenes, 5 story themes, card/dissolve/wipe/iris/fade transitions, rain and fog): 3,089 frames (51.5 s) rendered and encoded at ~55 fps on the M3 Pro, 57.9 s total. Slightly under real time; the weather and grade layers cost a few ms per frame. Profiling is part of S9.3.
- Validating a generated ~346 s story (10 scenes, 130 beats) including the dry run: ~130 ms (target: under 5 s; `tests/unit/long_story.test.js`).

## S2 faces and dialogue (2026-10-16)

`node tools/record.mjs scripts/samples/s2_dialogue.json`: 1,485 frames (24.8 s) at ~66 fps including speech babble synthesis and mixing; 23.3 s total. Faces add no measurable cost.

