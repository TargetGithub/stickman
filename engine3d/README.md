# engine3d (prototype)

A deterministic 3D video engine for kids' learning videos (counting, letters, vowels, rhymes), next to the 2D
StickMan engine in `/engine`. Three.js draws in headless Chromium (Playwright) on the Mac's GPU; every frame
is drawn from an explicit clock `t = frame / fps`, so any frame can be drawn on its own and render chunks
run in parallel. Findings and the plan for a full engine: `docs/ENGINE3D_PROTOTYPE.md`.

This folder has its own `package.json` (three, playwright) so `/engine` keeps its no-dependency rule.

```bash
cd engine3d && npm install && npx playwright install chromium
```

## Layout

| Path | What |
|---|---|
| `runtime/` | Plain ES modules. Pure (Node + page): `timeline.js`, `ease.js`, `rng.js`, `particles.js`, `director.js`, `compile.js`, `validate.js`, `plan.js`. Page only (three.js): `stage.js`, `objects.js`, `models.js`, `geometry.js`, `overlay.js`, `player.js`, `page.html`. |
| `catalog/` | JSON catalog: colours, materials, shapes (solids and flat 2D shapes), fonts, characters (glTF), models (toy animals and props built from parts), stages and lights, sounds, object kinds, actions. `index.mjs` loads it in Node. |
| `assets/characters/` | glTF characters (CC0), with `LICENSES.md`. |
| `scripts/` | JSON scripts (`count_to_five.json`); series in `scripts/series/<name>/` (Toy Box Friends: `scripts/series/toybox/SERIES.md`). |
| `scenes/` | JS scene modules (`vowels.js`, `model_sheet.js` for checking the catalog by eye). |
| `tools/` | `render3d.mjs` (render, stills, hashes, benchmarks), `episode3d.mjs` (an episode's YouTube kit), `compile3d.mjs` (join episodes), `determinism.sh`, `lib/` (server, WebSocket, browser, encoder, audio, memory). |
| `tests/` | `node --test`: timeline, validator fixtures, plan determinism, no-clock rule. |

## One timeline, two ways in

Everything goes through the **director** (`runtime/director.js`): it records objects, timeline segments,
captions, sounds and spoken lines into a plan. `stage.js` draws a plan at any `t`; the tools read the same
plan for TTS, the audio mix and the length.

**JSON script** (for AI-written videos; validated against the catalog by `validate.js`):

```json
{
  "kind": "video3d", "version": 1,
  "meta": { "title": "Count to Five", "seed": 5, "voice": "soft" },
  "stage": { "preset": "playroom" },
  "camera": { "position": [0.4, 1.9, 8.2], "lookAt": [0.4, 1.3, 0], "fov": 40 },
  "objects": [
    { "id": "robo", "kind": "character", "character": "robot", "at": [-2.3, 0, 0.9] },
    { "id": "b1", "kind": "number_block", "value": 1, "color": "red", "size": 0.9, "hidden": true }
  ],
  "scenes": [{ "id": "count", "beats": [
    { "dur": 2.6, "do": [
      { "do": "drop", "target": "b1", "to": [0.6, 0, 0] },
      { "do": "say", "text": "One! A red block.", "at": 0.5, "caption": true },
      { "do": "clip", "target": "robo", "clip": "Yes", "at": 0.6 }
    ] }
  ] }]
}
```

Object kinds: `shape` (add `face: true` for eyes and a smile), `number_block`, `letter`, `critter` (toy
animals that bob, blink and wag; `<id>#head` takes rotation tweens), `prop`, `character` (glTF), `confetti`,
`bubbles`, `stars`. Script `meta` also takes `music` (a mood), `musicGain`, `voiceSpeed`, `series`,
`episode`, `audience`, `skills`, `thumbnail.t` and `youtube`.

Beats run one after another; `at` is seconds from the beat start. A beat lasts `dur` or until its last voice
line ends, whichever is longer, so measured TTS clips stretch beats like 2D speech does. Kinds and their
fields: `catalog/kinds.json`. Actions and their parameters: `catalog/actions.json`.

**JS scene** (for custom animation): a module whose default export receives the director, plus optional
`meta` `{ seed, voice, stage }`. It can loop, compute layouts and add `d.onFrame((t, { scene, camera, objects, THREE }) => …)`
hooks for motion with no JSON action. Hooks must be pure functions of `t`. See `scenes/vowels.js`.

## Rules (as for /engine)

- No `Math.random`, `Date.now`, `performance.now`, `requestAnimationFrame` in `runtime/` or `scenes/` (a test
  checks). Randomness comes from `rng.js` streams named off the script seed.
- Motion is closed-form (eases, bounce curves, confetti paths), never a stepped simulation.
- The timeline never reads text metrics or GPU state; text layout is in `overlay.js` only.
- Catalog entries need a description and tags. No blood or gore.

## Commands

```bash
node engine3d/tools/render3d.mjs engine3d/scripts/count_to_five.json --res 1080p --fps 30
node engine3d/tools/render3d.mjs engine3d/scripts/count_to_five.json --res 4k --fps 60
node engine3d/tools/render3d.mjs engine3d/scenes/vowels.js --stills 2,6,12        # PNGs
node engine3d/tools/render3d.mjs <input> --bench 150 --frames 300:450              # draw / readback / upload fps
node engine3d/tools/render3d.mjs <input> --hash out/x.json                         # sha256 per raw frame
engine3d/tools/determinism.sh                                                      # GPU x2, 3 pages, SwiftShader x2
node engine3d/tools/episode3d.mjs engine3d/scripts/series/toybox/pk01_count_to_ten.json --review --final
node engine3d/tools/compile3d.mjs --name prek_mix_1 --title "..." pk01_count_to_ten pk02_shapes   # from finals
```

Options: `--jobs N` (pages rendering contiguous chunks in parallel), `--gl gpu|swiftshader`,
`--encoder webcodecs|x264|vt`, `--speech tts|off`, `--music <mood>|off`, `--out file.mp4`, `--frames a:b`.

`--encoder webcodecs` (default) encodes H.264 inside the page on the GPU and sends only compressed chunks to
Node; `x264` and `vt` read every frame back and pipe raw RGBA to ffmpeg (slower: ~17 fps at 1080p, limited by
Chromium's socket throughput). Hash and still modes always read back raw pixels.
