# Stickman Action Engine

A deterministic 2D stickman animation engine. An LLM writes short JSON scripts; the engine simulates them, renders every frame, and produces a YouTube-ready MP4.

**Status:** M8 built: LLM script generation (`tools/generate.mjs`), tested offline with a mock client; first live API run pending. Next: M9 (hardening). New here? Read the [User Guide](docs/USER_GUIDE.md).

## Documents

| Document | What it covers |
|---|---|
| [docs/USER_GUIDE.md](docs/USER_GUIDE.md) | **Start here:** setup, writing scripts, tools, generating with Claude, troubleshooting |
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

### Generating scripts with Claude (M8)

`tools/generate.mjs` pitches premises, writes scripts, repairs them with validator feedback, scores them, renders the accepted ones and appends them to `out/review_queue.json` for human review. Nothing is uploaded. Models, effort and prices live in `tools/llm.config.json`. It needs `ANTHROPIC_API_KEY` in your shell environment (never put it in a file in this repo).

```bash
node tools/generate.mjs --mock --count 3
```

```bash
node tools/generate.mjs --count 1 --tone comedic --length 25
```

Other options: `--premise "text"`, `--format portrait`, `--flagship` (Opus writes), `--critique` (vision review of the contact sheet plus one revision), `--no-render` (scripts only, for batch metrics), `--print-prompt` (show the system prompt). Each run writes a summary with validity rates and estimated cost to `out/runs/`. `node tools/catalog.mjs` prints the catalog tables the prompt uses.
