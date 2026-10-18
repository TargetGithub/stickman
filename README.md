# Stickman Action Engine

A deterministic 2D stickman animation engine. An LLM writes short JSON scripts; the engine simulates them, renders every frame, and produces a YouTube-ready MP4.

**Status:** fight engine finished (M0-M8). Story engine: S0 (spec freeze) signed off; S1 (scenes, locations, transitions, cards, narration, time and weather) done; S2 (faces, emotions, dialogue bubbles, speech sounds) done; S3 (six body plans, appearance) done; S4 (objects, set pieces, SVG import, LLM drafting) done; S5 (slice-of-life moves, seats, paired moves, defeat styles, activities, kids impact words) done; S6 (story compiler and macros, story camera, extras and depth layers) done; S7 (generated music, ambience, story sounds, -16 LUFS mixes) done; S8 (two-stage LLM story and fight-video generation, automatic or copy-paste) built; its exit review (generated stories and fight videos) is pending: `node tools/generate.mjs --story`, or `node tools/manual.mjs story-outline --premise "..."` without an API key. Next: S9 (hardening and acceptance); see docs/STORY_PLAN.md. Catalog work (docs/CATALOG_SPEC.md): C1-C4 built (the `catalog/` folder, descriptions and presets, the build, the AI context pack, lean prompts); C5 (showcase page) follows. New here? Read the [User Guide](docs/USER_GUIDE.md).

## Documents

| Document | What it covers |
|---|---|
| [docs/USER_GUIDE.md](docs/USER_GUIDE.md) | **Start here:** setup, writing scripts, tools, generating with Claude, troubleshooting |
| [docs/STORY_SPEC.md](docs/STORY_SPEC.md) | Story engine v2.0-rc (scenes, cast, faces, objects, interactions, macros, narration, generated music; kids-first; stories ≥ 5 min, fights ≥ 3 min) — decisions signed off |
| [docs/STORY_PLAN.md](docs/STORY_PLAN.md) | Execution plan S0-S9 for the story engine, with a kickoff prompt for a new session |
| [docs/CATALOG_SPEC.md](docs/CATALOG_SPEC.md) | One `catalog/` folder for the engine, a showcase page and AI tools; the context pack (C1-C5) |
| [catalog/README.md](catalog/README.md) | Catalog files, the authored/generated rule, how to add a move, character, theme or object |
| [stickman-engine-spec.md](stickman-engine-spec.md) | Behavior and script schema (source of truth), v1.1 |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Modules, interfaces, data shapes, decision records |
| [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md) | Milestones, tasks, schedule, risks |
| [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md) | Tools, assets, access and decisions the project needs |
| [docs/archive/](docs/archive/) | Earlier spec versions |

## Layout

```
engine/    runtime logic, zero dependencies (runs in Node and the browser)
catalog/   the catalog (JSON): poses, moves, props, FX, themes, objects, faces, bodies, presets,
           examples, docs; generated/ holds the AI context pack (see catalog/README.md)
data/      legacy JS copy of the catalog, frozen for the migration test (removed in C5)
tools/     Node CLIs: validate, record, mix, sfxgen, catalog, generate, manual, serve
prompts/   LLM prompt pack (the example scripts are in catalog/examples/)
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
- **Project files** (Claude Desktop Projects or any chat with project knowledge): `npm run catalog:pack` writes `out/context_pack.zip`; add its files to the project once, paste `project_instructions.md` as the project instructions, then use the copy-paste commands with `--lean` (prompts of 1,000-5,000 characters instead of 9,000-32,000).

Nothing is uploaded. Accepted videos go to `out/review_queue.json` for human review.
