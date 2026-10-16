# User Guide

This guide shows you how to make stickman action videos with the engine. You write a short JSON script (or ask Claude to write one). The engine simulates it, renders every frame, mixes sound, and writes an MP4 you can review and upload yourself.

Contents:
1. [Setup](#1-setup)
2. [Your first video in three commands](#2-your-first-video-in-three-commands)
3. [Writing a script](#3-writing-a-script)
4. [Moves, effects and other catalog items](#4-moves-effects-and-other-catalog-items)
5. [Fixing validator errors](#5-fixing-validator-errors)
6. [Tools reference](#6-tools-reference)
7. [Generating scripts with Claude](#7-generating-scripts-with-claude)
8. [Sound and music](#8-sound-and-music)
9. [Using the engine from code](#9-using-the-engine-from-code)
10. [Troubleshooting](#10-troubleshooting)
11. [Known limits](#11-known-limits)

The full rules live in [stickman-engine-spec.md](../stickman-engine-spec.md). This guide is the practical version.

---

## 1. Setup

You need:

| Requirement | Check | Install |
|---|---|---|
| Node.js 20 or newer | `node --version` | nodejs.org or `brew install node` |
| ffmpeg (video encoding) | `ffmpeg -version` | `brew install ffmpeg` |
| Project packages | `ls node_modules` | `npm install` (run in the project folder) |

Fonts (Bangers, Inter) are in `assets/fonts/`. Sounds are generated on first use, so you don't need any audio files.

Check that everything works:

```bash
npm test
```

All tests should pass.

## 2. Your first video in three commands

**1. Check a script.** This prints errors, warnings and a timeline of what happens when.

```bash
node tools/validate.mjs scripts/samples/rooftop_rumble.json
```

**2. Watch it live in the browser** (optional, no rendering wait).

```bash
npm run serve
```

Open http://localhost:5173/web/player.html, pick a sample or load your own JSON file, and scrub through it.

**3. Render the video.**

```bash
npm run record -- scripts/samples/rooftop_rumble.json
```

You get `out/rooftop-rumble/`:

| File | What it is |
|---|---|
| `final.mp4` | The video with sound (1920x1080 or 1080x1920, 60 fps) |
| `thumb.png` | An automatically chosen thumbnail frame |
| `contact_sheet.png` | 16 frames in a 4x4 grid, for a quick review |
| `meta.json` | Duration, render speed, warnings, the timeline |
| `script.json` | A copy of the script that made the video |
| `audio.wav` | The mixed soundtrack |

A 30 s video renders in about 30 s on an M-series Mac.

## 3. Writing a script

A script is one JSON object with five parts:

```json
{
  "version": 1,
  "meta": { "title": "Rooftop Rumble", "format": "landscape", "seed": 31337, "theme": "rooftop_city", "hpBars": true },
  "characters": [ ... ],
  "camera": [ ... ],
  "beats": [ ... ]
}
```

The best starting point is a sample: copy `scripts/samples/rooftop_rumble.json` or one of `prompts/examples/*.json` and change it.

### 3.1 meta

| Field | Meaning |
|---|---|
| `title` | Video title (max 80 characters). Also names the output folder. |
| `format` | `"landscape"` (16:9) or `"portrait"` (9:16, for Shorts) |
| `seed` | Any whole number. Same script and seed give the exact same video every time. Change it for different particle and background variation. |
| `theme` | Background: `white_stage`, `dojo_dusk`, `void_grid`, `rooftop_city`, `desert_noon`, `arena`, `snow_mountain` |
| `hpBars` | Show health bars (default false) |
| `autoCamera` | Automatic zoom punches on heavy hits and wider framing on dashes (default true) |
| `stageWidth` | Stage width in pixels, 1600-8000 (default 3200) |

### 3.2 characters

```json
{ "id": "kai", "x": 1250, "facing": 1, "color": "#3fd8ff", "scale": 1, "hp": 100,
  "prop": null, "style": { "headband": "#ff3b5c" } }
```

| Field | Meaning |
|---|---|
| `id` | Lowercase name used in beats (`kai`, `boss_1`) |
| `x` | Start position in pixels. The stage is 0-3200 by default; start fighters 300-700 px apart near the middle. |
| `facing` | `1` faces right, `-1` faces left |
| `color` | Body color, `#rrggbb`. Pick colors that stand out from the theme. |
| `scale` | Size, 0.4-4. Use 2-2.5 for a giant boss. |
| `hp` | Health (only affects the HP bar) |
| `prop` | Held item: `sword`, `club_big`, `staff`, `bat`, `shield`, `blaster`, or `null` |
| `style` | Accessories: `headband`, `scarf`, `cape`, `hat`, `glow` (each a color), `squash` (true/false) |

Up to 6 characters. A character with a `spawn` beat starts hidden and appears when that beat runs.

### 3.3 beats

A beat is one action. Character beats make a character do a move; world beats add effects.

```json
{ "id": "fk", "at": { "after": "cu" }, "who": "kai", "do": "flying_kick",
  "target": "zed", "outcome": "hit", "approach": "run",
  "params": { "damage": 22 }, "fx": ["afterimage"], "say": "HYAA!" }
```

| Field | Meaning |
|---|---|
| `id` | Name for this beat, needed if anything refers to it |
| `at` | When it runs (see 3.4) |
| `who` | A character id, or `"world"` |
| `do` | A move name (characters) or a world command (`world`) |
| `target` | Who an attack is aimed at |
| `outcome` | What happens: `hit`, `blocked`, `parried`, `dodged`, `whiff` |
| `approach` | `"run"` or `"walk"`: move into range before attacking |
| `params` | Override move settings, e.g. `{"damage": 30}`, `{"distance": 600}` for a run, `{"seconds": 2}` for `wait` |
| `fx` | Effects on the character when the beat starts, e.g. `["aura"]` |
| `say` | Speech bubble, max 40 characters; `sayDur` sets how long it shows (default 1.2 s) |
| `speed` | Play the move faster or slower (0.25-3) |
| `interrupt` | `true` cuts whatever the character is doing; otherwise the beat waits until they are free |

### 3.4 Timing: the four `at` forms

| Form | Runs |
|---|---|
| `2.5` | At 2.5 s |
| `{"after": "j1", "delay": 0.2}` | 0.2 s after beat `j1` ends |
| `{"with": "j1", "delay": 0.3}` | 0.3 s after beat `j1` starts |
| `{"on": "fk.hit"}` | The moment beat `fk` connects. Other anchors: `start`, `windowOpen`, `end` |

Chain beats with `after` rather than absolute times. Move lengths change with approach runs and reactions, and chaining keeps everything in sync. Use `{"on": "<id>.hit"}` for effects that must land exactly on impact (slow motion, shake, flash, text pop).

### 3.5 How fights work

Fights are choreographed: you decide the result of every attack with `outcome`, and the engine makes it look right.

- **hit**: the target takes damage and reacts by itself. Under 8 damage it flinches, 8-15 it staggers back, 16 or more it is launched and lands lying down.
- **blocked** / **parried**: the target guards by itself. A parry knocks the attacker off balance.
- **dodged**: the target ducks, jumps or steps back by itself.
- **whiff**: the attack misses.

Don't write the defender's block or flinch as a separate beat; the engine adds it.

**Distance matters.** An attack has to start close to its target. Add `"approach": "run"` to any attack after the fighters have moved apart (knockback, dodges, the opening stand-off). Walking is slow (120 px/s), so use `"walk"` only for short gaps. The validator tells you when an attack can't reach.

**Ending a fight.** Damage alone never knocks anyone out. Land a finisher, then give the loser `ko_fall` or `ko_spin` about 0.6 s or more later, then a `victory` for the winner and a `fade`:

```json
{ "id": "sk", "at": { "after": "up" }, "who": "kai", "do": "spinning_kick", "target": "brute", "outcome": "hit", "params": { "damage": 40 } },
{ "id": "ko", "at": { "after": "sk", "delay": 0.7 }, "who": "brute", "do": "ko_spin" },
{ "id": "win", "at": { "after": "ko", "delay": 0.2 }, "who": "kai", "do": "victory" },
{ "at": { "after": "win", "delay": 0.5 }, "who": "world", "do": "fade", "params": { "to": "black", "dur": 1 } }
```

A character knocked to the ground (after a launch) uses `get_up` before fighting again.

### 3.6 World beats

`"who": "world"`, with the command in `do` and its settings in `params`:

| do | params | Use for |
|---|---|---|
| `slowmo` | `scale` 0.1-1, `duration` s | The big hit |
| `freeze` | `duration` s | A frozen impact frame |
| `shake` | `preset`: small, med, big | Impacts, landings, entrances |
| `zoom_punch` | `amount`, `dur` | A quick camera punch |
| `flash` | `color`, `dur` | A white flash on impact |
| `text_pop` | `text` (max 16), `x`, `y`, `color` | "K.O.!", "BOOM!" |
| `caption` | `text` (max 80), `pos` top/bottom/center, `dur` | Story text |
| `desaturate` | `amount` 0-1, `dur` | Drama after a KO |
| `fade` | `to` black/white, `dur`, `dir` out/in | The ending |
| `explosion` | `x`, `y` | A blast at a stage position |
| `spawn_prop` | `prop`, `x`, `y` | Drop a weapon on the floor (pick it up with `pick_prop`) |
| `prop_break` | `owner` | Break the prop a character holds |
| `set_theme` | `theme` | Change the background mid-video |
| `music_cue` | `cue` start/stop/duck, `volume` | Music control |
| `cut` | none | Hard cut to the next camera key |

### 3.7 Camera

The `camera` list holds keys that use the same `at` forms as beats.

```json
"camera": [
  { "at": 0, "mode": "follow", "targets": ["kai", "zed"], "zoom": "auto", "padding": 300 },
  { "at": { "on": "fk.hit" }, "mode": "focus", "target": "zed", "zoom": 1.4 },
  { "at": { "after": "fk", "delay": 0.6 }, "mode": "follow", "targets": ["kai", "zed"], "zoom": "auto", "padding": 300 }
]
```

| mode | What it does |
|---|---|
| `follow` | Keeps all `targets` in frame (the usual mode) |
| `focus` | Closes in on one `target` |
| `fixed` | Holds on world position `x` |
| `pan` | Moves to `x` over `dur` seconds |
| `push` | Slow zoom-in to `zoom` over `dur` seconds (good for openings) |

### 3.8 Pacing tips

- Three acts: setup (taunts, a caption), escalation (blocks, parries, dodges, a few hits), payoff (the biggest hit, KO, victory, fade).
- Emphasize the biggest hit: slowmo or freeze, a flash or text pop, and a focus camera key.
- Vary the rhythm: a quick flurry, then a pause or taunt, then a big move.
- Use 8 or more different moves. Keep gaps under 2.5 s. Aim for 20-40 s.

## 4. Moves, effects and other catalog items

There are 72 moves in seven groups. See them all animated at http://localhost:5173/web/catalog.html (after `npm run serve`), or print the full table with durations, default params and notes:

```bash
node tools/catalog.mjs
```

| Group | Moves |
|---|---|
| movement | idle, walk, run, dodge_back, jump, dash, slide, backflip, frontflip, dodge_roll, land_roll, side_step, get_up |
| unarmed attacks | jab, cross, hook, uppercut, haymaker, front_kick, roundhouse, axe_kick, sweep, elbow, knee, headbutt, flying_kick, spinning_kick, flurry, ground_pound, counter, energy_blast (ranged) |
| weapon attacks | sword_slash, sword_thrust, sword_spin, sword_overhead (sword); staff_swing, staff_spin (staff); bat_swing (bat); shoot (blaster, ranged); throw_prop (any prop, ranged) |
| defense | block, parry, duck, catch_weapon |
| reactions | hit_light, hit_heavy, hit_launch, knockdown, stagger, ko_fall, dizzy, ko_spin |
| emotes | taunt, victory, charge_up, wave, bow, flex, laugh, shrug, facepalm, cower, dance_a, dance_b, point |
| utility | wait, face, pick_prop, drop_prop, teleport, spawn, despawn |

Beat `fx` you can add to a character: `aura`, `afterimage`, `slash_arc`, `speed_lines`, `dust_land`, `dust_run`, `shockwave`, `anger_mark`, `sweat_drop`, `exclaim`, `question`, `heart`, `stars_dizzy`. Impact sparks and hit sounds are added automatically.

## 5. Fixing validator errors

The validator runs before every render. Each message names the problem, where it is, and how to fix it. The most common ones:

| Code | Meaning | Usual fix |
|---|---|---|
| `E_SIM_UNREACHABLE` | The attacker is too far from the target | Add `"approach": "run"` to that beat |
| `E_SIM_APPROACH` | The approach would take more than 3 s | Use `"run"` instead of `"walk"`, or start closer |
| `E_MOVE_UNKNOWN` | No such move | Use the suggested closest name |
| `E_REF_BEAT` / `E_REF_CHARACTER` | A beat or character id doesn't exist | Check spelling; give the referenced beat an `id` |
| `E_MOVE_TARGET` | A beat targets the character itself | Target another character |
| `E_MOVE_NEEDS_PROP` | The move needs a weapon the character isn't holding | Set `prop` on the character |
| `E_SCHEMA_*` | Wrong field, type or value | Follow the `fix:` line |
| `W_QUEUE_DRIFT` | A beat started late because the character was busy | Chain it with `after` |
| `W_PACING_GAP` | Nothing happens for more than 2.5 s | Add a beat or tighten delays |
| `W_NO_ENDING` | No clear ending | End with `ko_fall`/`victory` and a `fade` |
| `W_REACH` | A giant/tiny pairing barely connects | Usually fine; check the frame |

Errors (`E_`) stop a render. Warnings (`W_`) don't, but they usually point at something a viewer would notice. For machine-readable output, add `--json`.

## 6. Tools reference

| Command | What it does |
|---|---|
| `node tools/validate.mjs <script> [--json]` | Check a script; print errors, warnings and the timeline |
| `node tools/validate.mjs --schema` | Print the JSON Schema (with every move name) |
| `npm run record -- <script> [options]` | Render the final video (see below) |
| `npm run serve` | Start the local web server for the browser pages (port 5173) |
| `node tools/catalog.mjs [--format json]` | Print the move, effect and world-command tables |
| `node tools/generate.mjs [options]` | Generate scripts and videos with Claude (section 7) |
| `node tools/move_clip.mjs [--strip <move>]` | Render every move as a grid video, or one move as a filmstrip PNG |
| `node tools/sfxgen.mjs [--force]` | Regenerate the built-in sound effects |
| `node tools/pose_sheet.mjs` | Render all poses into one image |

`record` options:

| Option | Effect |
|---|---|
| `--out-dir DIR` | Parent output folder (default `out`) |
| `--slug NAME` | Output folder name (default: from the title) |
| `--from N --to M` | Render only frames N to M (quick checks of one moment) |
| `--no-audio` | Skip the sound mix |
| `--frames-only` | Write PNG frames instead of a video |
| `--hash` | Write a SHA-256 per frame (determinism checks) |
| `--crf 16 --preset medium` | Video quality settings (lower crf = better quality, bigger file) |

Browser pages (after `npm run serve`):

| Page | Use |
|---|---|
| `/web/player.html` | Play any script with a timeline scrubber; load your own JSON file |
| `/web/catalog.html` | Every move looping, with hit windows shown |
| `/web/editor.html` | Pose and move editor, for adding or changing moves |
| `/web/index.html` | Pose viewer |

## 7. Generating scripts with Claude

`tools/generate.mjs` turns ideas into reviewed videos:

1. **Ideation**: Claude pitches premises, avoiding recent ones from `out/history.json`.
2. **Writing**: Claude writes each script using the catalog and example scripts.
3. **Repair**: if the validator finds errors, Claude gets the errors and timeline and fixes them (up to 3 attempts in total).
4. **Scoring**: an automatic score (variety, effects, emphasis, camera, ending). Low scorers get one improvement round, then are dropped.
5. **Critique** (optional, `--critique`): Claude looks at the contact sheet and suggests changes; one revision round.
6. **Render and queue**: the video is rendered and added to `out/review_queue.json` with a suggested YouTube title, description and tags.

Nothing is ever uploaded. You review the queue and upload what you like by hand.

### API key

The tool reads `ANTHROPIC_API_KEY` from your environment; the key is never written to any file. Exporting it in one terminal window only works in that window. To make it available everywhere (including to Claude Code's tools), add it to `~/.zshrc`:

```bash
echo 'export ANTHROPIC_API_KEY="your-key-here"' >> ~/.zshrc
```

Then open a new terminal window. Never put the key in a file inside this project.

### Commands

Try the whole pipeline offline first (no key, no cost, canned answers):

```bash
node tools/generate.mjs --mock --count 2
```

One real video:

```bash
node tools/generate.mjs --count 1 --tone comedic --length 25
```

| Option | Effect |
|---|---|
| `--count N` | Number of premises (videos) |
| `--premise "text"` | Skip ideation and use your own idea |
| `--tone T` | `epic`, `comedic`, `parody`, ... |
| `--format F` | `landscape` or `portrait` |
| `--length S` | Target length in seconds (default 30) |
| `--flagship` | Write with Claude Opus instead of Sonnet |
| `--critique` | Vision review of the contact sheet plus one revision |
| `--no-render` | Scripts only (fast, for measuring validity) |
| `--out DIR` | Output root (default `out`) |
| `--print-prompt` | Show the full system prompt the writer model gets |

### Outputs

| Path | Contents |
|---|---|
| `out/scripts/<slug>.json` | The accepted script |
| `out/<slug>/` | The rendered video folder, plus `youtube.json` (title, description, tags) |
| `out/review_queue.json` | Every accepted video with status `pending_review`, score, critique and metadata |
| `out/history.json` | Premises, themes, moves and palettes used so far (keeps videos varied) |
| `out/runs/<time>.json` | Run summary: validity rates, failure codes, tokens and estimated cost |

### Models and cost

Models, effort levels and prices are in `tools/llm.config.json`. Defaults: Sonnet 5.5 pitches and writes, Haiku 5.5 repairs and writes metadata (Sonnet 5.5 takes the last repair attempt), Opus 5.5 critiques and writes `--flagship` scripts. The large system prompt is cached between requests. Each run prints its estimated cost; expect roughly $0.05-0.30 per video depending on repairs and critique.

### Changing what Claude writes

The prompts are plain text in `prompts/`: `system.md` (script-writing rules), `ideation.md`, `repair.md`, `critique.md`, `metadata.md`. The example scripts in `prompts/examples/` teach the format by example; keep them valid (the tests check this). Catalog tables are generated from `data/`, so new moves appear in the prompt automatically.

## 8. Sound and music

Sound effects are generated automatically for every hit, whoosh, block and landing. To use your own sounds, drop files into `assets/sfx/` named after the sound key (`punch_heavy.wav`, `whoosh.mp3`). Add `_2`, `_3` for variants that play in rotation (`punch_heavy_2.wav`). The keys are listed at the end of `node tools/catalog.mjs`.

For music, put a file in `assets/music/` (e.g. `epic_01.mp3`) and reference it by name:

```json
"audio": { "music": "epic_01", "musicVolume": 0.35 }
```

Music ducks under heavy hits automatically. Record where each file came from and its license in the `SOURCES.md` next to it.

## 9. Using the engine from code

The engine is plain JavaScript with no dependencies and runs in Node and in the browser.

```js
import { createEngine } from "./engine/index.js";
import { catalog } from "./data/index.js";

const engine = createEngine({ catalog });
const result = engine.load(script);          // validates and simulates
if (!result.ok) console.log(result.errors);  // same issues as tools/validate.mjs

const { width, height, totalFrames } = engine.getMeta();
// ctx: a 2D canvas context of width x height
for (let n = 0; n < totalFrames; n++) engine.renderFrame(ctx, n);  // any order, any frame

engine.getAudioEvents();  // [{ t, sfx, volume, pan }] for your own mixer
engine.getEvents();       // hits, moves, world beats with times
engine.dispose();
```

Other exports: `validate(script, catalog)`, `formatIssues(issues)`, `scriptSchema(catalog)` (JSON Schema with every move name), `ENGINE_VERSION`. `renderFrame` is random access: frame 900 looks the same whether you render it first or last.

## 10. Troubleshooting

| Problem | Fix |
|---|---|
| `ffmpeg: command not found` | `brew install ffmpeg` |
| `Cannot create the Anthropic client` or 401 errors | `ANTHROPIC_API_KEY` isn't set in the shell running the command; see section 7 |
| A move looks wrong for a giant/tiny pairing | Check the frame with `--from`/`--to`; try a different move or outcome |
| A fighter walks for ages before attacking | Use `"approach": "run"`, or start the fighters closer |
| A beat starts later than expected | It waited for a busy character; chain it with `after`, or set `"interrupt": true` |
| Text is cut off | Speech max 40 characters, text pops 16, captions 80 |
| The render is slow | Use `--from`/`--to` for quick checks, or the browser player |
| Fonts look wrong | Check `assets/fonts/` has `Bangers-Regular.ttf` and `Inter.ttf` |

## 11. Known limits

- Blocks are high guards only.
- No secondary "overlap" motion on limbs yet; accessories carry the follow-through.
- In portrait, fighters who are far apart render small.
- The big club has no special moves; it works as a held or thrown prop.
- Fights are choreographed: you choose every outcome. `meta.mode: "simulated"` (outcomes from geometry) is reserved for a future procedural fight feature.
