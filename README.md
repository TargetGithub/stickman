# Stickman Action Engine

A deterministic 2D stickman animation engine. An LLM writes short JSON scripts; the engine simulates them, renders every frame, and produces a YouTube-ready MP4.

**Status:** M7 in progress: batches A-C (all unarmed moves, 46 in the catalog) done and awaiting review. Next: batch D (weapons and props).

## Documents

| Document | What it covers |
|---|---|
| [stickman-engine-spec.md](stickman-engine-spec.md) | Behavior and script schema (source of truth), v1.1 |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Modules, interfaces, data shapes, decision records |
| [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md) | Milestones, tasks, schedule, risks |
| [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md) | Tools, assets, access and decisions the project needs |
| [docs/archive/](docs/archive/) | Earlier spec versions |

## Layout

```
engine/    runtime logic, zero dependencies (runs in Node and the browser)
data/      poses, moves, props, FX presets, themes, SFX keys
tools/     Node CLIs: validate, record, mix, sfxgen, catalog, generate, serve
web/       browser pages: player, pose/move editor, move catalog
assets/    fonts, sfx, music (with license records)
scripts/   sample scripts
tests/     unit, integration, golden frames, fixtures
docs/      design documents
out/       render output (ignored)
```

## Commands

```bash
npm test
```

```bash
npm run serve
```

Then open http://localhost:5173/web/player.html (script player with scrubber), /web/editor.html (move editor), /web/catalog.html (every move looping) or /web/index.html (pose viewer). Render move review clips with `node tools/move_clip.mjs` (or `--strip <move>`) and the choreographed fight demo with `node tools/fight_demo.mjs`. Render the pose sheet with `node tools/pose_sheet.mjs`, benchmark backends with `node tools/bench_canvas.mjs`. Validate a script with `node tools/validate.mjs <script.json>` (add `--schema` to print the JSON Schema). Make a finished video with sound:

```bash
npm run record -- scripts/samples/m4_dojo.json
```

Output lands in `out/<title-slug>/` (final.mp4, thumb.png, contact_sheet.png, meta.json). Drop your own sounds into `assets/sfx/` (e.g. `punch_heavy.wav`, `punch_heavy_2.mp3`) or music into `assets/music/` to replace the generated ones.
