# Stickman Action Engine

A deterministic 2D stickman animation engine. An LLM writes short JSON scripts; the engine simulates them, renders every frame, and produces a YouTube-ready MP4.

**Status:** M0 (foundations) complete and awaiting visual review. Next: M1 (move runtime and editor).

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

Then open http://localhost:5173/web/index.html (pose viewer). Render the pose sheet with `node tools/pose_sheet.mjs`, benchmark backends with `node tools/bench_canvas.mjs`. Recording (`npm run record -- scripts/samples/showdown.json`) arrives in milestone M6 and needs ffmpeg.
