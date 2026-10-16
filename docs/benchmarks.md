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

**Decision: `@napi-rs/canvas`** (ADR-001). The two are equal on speed and determinism. @napi-rs/canvas has prebuilt binaries with no system libraries and a smaller API surface. `skia-canvas` stays installed as a fallback until M6, then is removed if unused.

Follow-up for M6: ffmpeg prints one "Truncating packet of size 8294400 to 8192" line on the raw pipe. All 600 frames decode correctly (first and last checked), but `record.mjs` should set explicit `-video_size`/`-framerate` input options and confirm the warning is gone.

## M4 renderer (2026-10-16)

`node tools/play_script.mjs scripts/samples/m4_dojo.json` (dojo_dusk theme, 2 characters, impacts, aura, overlays): 878 frames (14.6 s video) simulated, rendered and encoded in 14.5 s, about 60 frames/s end to end on the M3 Pro. Spec 14.4 target: ≥ 25 frames/s.
