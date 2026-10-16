# Stickman Action Engine

A deterministic 2D stickman animation engine. An LLM writes short JSON scripts; the engine simulates them, renders every frame, and produces a YouTube-ready MP4.

**Status:** M8 built: LLM script generation with any provider or by copy-paste (`tools/generate.mjs`, `tools/manual.mjs`); tested offline and with a local model. Next: M9 (hardening), then the story engine (docs/STORY_PLAN.md). New here? Read the [User Guide](docs/USER_GUIDE.md).

## Documents

| Document | What it covers |
|---|---|
| [docs/USER_GUIDE.md](docs/USER_GUIDE.md) | **Start here:** setup, writing scripts, tools, generating with Claude, troubleshooting |
| [docs/STORY_SPEC.md](docs/STORY_SPEC.md) | Next: story engine v2 (scenes, cast, faces, objects, interactions, macros, narration, generated music; kids-first; stories ≥ 5 min, fights ≥ 3 min) — decisions signed off |
| [docs/STORY_PLAN.md](docs/STORY_PLAN.md) | Execution plan S0-S9 for the story engine, with a kickoff prompt for a new session |
| [stickman-engine-spec.md](stickman-engine-spec.md) | Behavior and script schema (source of truth), v1.1 |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Modules, interfaces, data shapes, decision records |
| [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md) | Milestones, tasks, schedule, risks |
| [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md) | Tools, assets, access and decisions the project needs |
| [docs/archive/](docs/archive/) | Earlier spec versions |

## Layout

```
engine/    runtime logic, zero dependencies (runs in Node and the browser)
data/      poses, moves, props, FX presets, themes, SFX keys
tools/     Node CLIs: validate, record, mix, sfxgen, catalog, generate, manual, serve
prompts/   LLM prompt pack and example scripts
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

### Generating scripts with an LLM (M8)

Any LLM can write scripts; the validator checks them all. Three ways, all described in [docs/USER_GUIDE.md](docs/USER_GUIDE.md#7-generating-scripts-with-an-llm):

- **Copy-paste, no API key** (ChatGPT, Claude.ai, Gemini, any chat app): `node tools/manual.mjs prompt --premise "..." --copy`, paste into a chat, then `node tools/manual.mjs check --paste`.
- **Automatic, any provider** (Anthropic, OpenAI, Gemini, OpenRouter, Ollama, LM Studio, or any OpenAI-compatible endpoint): `node tools/generate.mjs --provider openai --model <id> --count 3`. Providers live in `tools/llm.config.json`; keys come from environment variables only.
- **Offline mock**: `node tools/generate.mjs --mock --count 2`.

Nothing is uploaded. Accepted videos go to `out/review_queue.json` for human review.
