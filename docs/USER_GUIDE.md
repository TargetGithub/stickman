# User Guide

This guide shows you how to make stickman action videos with the engine. You write a short JSON script, or have an LLM write one: copy-paste with ChatGPT, Claude.ai or any chat app, or automatically through any provider's API. The engine simulates it, renders every frame, mixes sound, and writes an MP4 you can review and upload yourself.

Contents:
1. [Setup](#1-setup)
2. [Your first video in three commands](#2-your-first-video-in-three-commands)
3. [Writing a script](#3-writing-a-script)
4. [Moves, effects and other catalog items](#4-moves-effects-and-other-catalog-items)
5. [Fixing validator errors](#5-fixing-validator-errors)
6. [Tools reference](#6-tools-reference)
7. [Generating scripts with an LLM](#7-generating-scripts-with-an-llm) (copy-paste, any API, offline)
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

The best starting point is a sample: copy `scripts/samples/rooftop_rumble.json` or one of `catalog/examples/clips/*.json` and change it.

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

Everything in this section is catalog data in `catalog/` (JSON, one description per entry; see `catalog/README.md` for the files and how to add things). `catalog/generated/context/` lists all of it compactly: `03_moves.md` has every move with what it does, `02_characters.md` the bodies, looks, faces, voices and ready-made characters, `05_places_and_objects.md` the themes and objects.

There are 169 moves (189 counting the partner side of each paired move); 110 of them work in version 1 clips too. 38 of them are for four-legged characters (section 4.1). See them all animated at http://localhost:5173/web/showcase.html#moves (after `npm run serve`; every other catalog item is on the same page), or print the full table with durations, default params and notes:

```bash
node tools/catalog.mjs
```

| Group | Moves |
|---|---|
| movement | idle, walk, run, dodge_back, jump, dash, slide, backflip, frontflip, dodge_roll, land_roll, side_step, get_up, sneak, tiptoe |
| unarmed attacks | jab, cross, hook, uppercut, haymaker, front_kick, roundhouse, axe_kick, sweep, elbow, knee, headbutt, flying_kick, spinning_kick, flurry, ground_pound, counter, energy_blast (ranged) |
| weapon attacks | sword_slash, sword_thrust, sword_spin, sword_overhead (sword); staff_swing, staff_spin (staff); bat_swing (bat); shoot (blaster, ranged); throw_prop (any prop, ranged) |
| defense | block, parry, duck, catch_weapon |
| reactions | hit_light, hit_heavy, hit_launch, knockdown, stagger, ko_fall, dizzy, ko_spin |
| emotes | taunt, victory, charge_up, wave, bow, flex, laugh, shrug, facepalm, cower, dance_a, dance_b, point, cry, clench_fist, sigh, gasp, jump_joy, hold_head, nod, shake_head, look_around, talk |
| utility | wait, face, pick_prop, drop_prop, teleport, spawn, despawn, use, ride, dismount |

Two more groups are slice-of-life moves (in both versions, except the racket and wand moves, which need story holdables) and the story-only paired moves; the defeat styles are story-only too:

- **life** (26 solo moves): sit (on a seat with `"object"`, or on the floor), stand_up, lie_down, sleep, eat, drink, read, phone_talk, cheer, clap, kneel, wave_goodbye, sneak, tiptoe, peek, hide, push, pull, climb_up, jump_down, swing_forehand, swing_backhand, blow_wand, poke, stretch.
- **interaction** (paired moves, need `"partner"`): hug, high_five, fist_bump, handshake, pat_head, give, carry, put_down, piggyback, lift_up, drag, lean_on, comfort, walk_together (give it `"params": { "distance": 300 }`). The lead walks to the partner first (`"approach": "run"` to run, `false` to place it there); the partner plays its half on its own. `carry` and `piggyback` keep holding the partner through walks until `put_down`.

- **four-legged** (dog moves, `catalog/moves/quadruped.json`; section 4.1).

```json
{ "id": "hf", "at": 2, "who": "kai", "do": "high_five", "partner": "pip", "say": "Up high!" }
```

- **defeat** (story losers, kids-friendly): faint, vanish (sparkles), ghost (`"audience": "general"` only), captured (rope and a cage), flee (runs off the stage), and `return` to bring a vanished character back. In kids stories every hit also gets a cartoon word (POW!, BONK!).

**Activities** are little games that keep moves and objects in sync. Start one with the `activity` world command; the next beat can wait for it with `"after"`:

```json
{ "id": "ten", "at": 2, "who": "world", "do": "activity", "params": { "name": "tennis_rally", "with": ["kai", "pip"], "reps": 4, "ending": "miss", "object": "net" } }
```

Activities: blow_bubbles, tennis_rally, play_catch, kick_ball, eat_together, dance_together, selfie, sleep, comfort. Params: `with` (the players), `reps` or `dur`, `intensity` (low, medium, high), `ending` (win, miss, laugh), `winner`, `object` (a net, bench or chair from the set). Players walk to their places, get the racket, wand or phone they need, play, and finish with the ending. Add `"interrupt": true` to a beat for one of the players to stop the activity early. The full table is in STORY_SPEC section 10.

**Story macros** write many beats for you. A macro beat is `{ "id", "at", "macro", "params" }`; the compiler turns it into ordinary beats when the script loads, and other beats can wait for it like any beat (`{"after": "boss"}`) or for one of its moments (`{"on": "boss.finisher"}`):

```json
{ "id": "path", "at": 0.3, "macro": "gauntlet", "params": { "hero": "kai", "opponents": ["g1", "g2", "g3", "g4"], "per": 3, "travel": "run", "finisher": "spinning_kick" } }
```

| Macro | Required params | What you get |
|---|---|---|
| `dialogue` | `lines`: `[["kai", "Hello!", "happy"], ["pip", "Hi!", "laugh", "shout"]]` | Talk gestures, reading-time pacing, faces, a two-shot. Moments: `line1`, `line2`, ... |
| `activity` | `name`, `with` | The activity (same params as the world command). Moment: `ending` |
| `enter` / `exit` | `who`, `side` | Walk (or `"mode": "run"`) in from a side to the scene `x` (place the character with `"hidden": true`), or off a side |
| `walk_together`, `travel` | `who` (list), `to` | Hand in hand, or side by side with the camera tracking |
| `fight` | `sides`, `winner` | A whole 1v1: taunts, exchanges, a finisher in slow motion, the KO (`"ko": false` leaves the loser standing). Options: `exchanges`, `intensity`, `style` (even, dominant, comeback, close), `finisher`, `phases`. Moments: `finisher`, `ko` |
| `gauntlet` | `hero`, `opponents` | One opponent after another (`travel`: run, walk or none for a waiting ring). Moments: `opponent1`, ..., `finisher` |
| `brawl` | `teams` `{a, b}`, `winner` | Two teams; at most two clashes at once |
| `chase` | `runner`, `chasers` | `obstacles` to jump, `caught` true or false. Moment: `caught` |
| `defeat` | `who`, `style` | A stagger and close-up, then the defeat style; `by` reacts. Moment: `gone` |
| `grief` | `who` | Kneel by `over`, cry, `rain`, sad music |

Two macros make whole scenes (an entry in `scenes` with `id`, `macro`, `params`): `fight_card` (a fight-only video of at least 3 minutes from a list of `matchups`; see `scripts/samples/s6_fight_card.json`) and `montage` (short `clips` with quick cuts). Walking beats can also take a destination: `{"who": "kai", "do": "run", "to": {"near": "pip"}}`, `{"x": 2400}` or `{"exit": "left"}`. Camera `shot` beats frame a moment: `{"who": "world", "do": "shot", "params": {"mode": "close_up", "target": "kai", "dur": 2}}` (modes two_shot, close_up, wide, over_shoulder, track); `"autoCamera": "story"` in meta picks shots for you. To see or hand-edit what a macro writes, use `tools/compile.mjs` (below). The full rules are in STORY_SPEC section 11.

Beat `fx` you can add to a character: `aura`, `afterimage`, `slash_arc`, `speed_lines`, `dust_land`, `dust_run`, `shockwave`, `anger_mark`, `sweat_drop`, `exclaim`, `question`, `heart`, `stars_dizzy`. Impact sparks and hit sounds are added automatically.

### 4.1 A dog in your story

Body plan `dog_small` is a small four-legged puppy (its back at a stickman's knee). It uses its own skeleton and moves (STORY_SPEC 6.2), so a few things work differently:

- **Write generic moves.** `walk`, `run`, `sit`, `lie_down`, `sleep`, `jump`, `get_up`, `wave`, `talk`, `cry` and more are renamed for the dog by its body plan (`walk` plays `walk_dog`, `wave` plays `wag`, `talk` plays `bark`). Destinations (`"to"`), `@chase`, `@travel`, `@enter`, `@exit` and `@walk_together` work as for anyone.
- **Dog moves:** idle_dog, walk_dog, trot, run_dog, jump_dog, sit_dog, lie_dog, sleep_dog, get_up_dog, roll_over, bark (`cycles`), whimper, growl, wag, sniff (a slow nose-down walk), dig, play_bow, beg, shake_off, tilt_head, pounce, tug, dodge_dog, yelp, dizzy_dog, faint_dog, pick_dog / drop_dog (things go in the mouth), catch_mouth, drop_ball.
- **With people:** `pet_dog` and `hug_dog` (the person squats), `lick` (the dog jumps up), `carry` / `put_down`, `bite_hold` (grabs a runaway's trouser leg; no hit). `pat_head` and `hug` are for two people.
- **Fetch:** `{"macro": "activity", "params": {"name": "fetch", "with": ["doopi", "becky"], "reps": 3}}`: the person throws, the dog brings the ball back.
- **Voice:** `"voice": { "timbre": "bark" }` turns its lines into little woofs.
- **Never in fights:** attacks on a dog (`E_TARGET_RIG`), a dog in `@fight`, `@gauntlet` or `@brawl` (`E_MACRO_RIG`) and moves a dog can't do (`E_MOVE_RIG`) are errors; the fix line names the move to use instead.

```json
{ "id": "becky", "name": "Becky", "body": "dog_small", "color": "#f3e3c3", "voice": { "pitch": 1.4, "timbre": "bark" } }
```

Sample: `scripts/samples/r1_becky.json`. Review sheets: `node tools/becky_sheet.mjs` (the look) and `node tools/move_sheet.mjs --rig quadruped --plans dog_small` (the moves).

### 4.2 Glow, grey worlds and friends turned to stone

- **Heart Glow:** `{"who": "world", "do": "set_glow", "params": {"who": "doopi", "color": "#ffd23f", "level": 0.6, "dur": 1.5}}` puts a soft pulsing halo behind a character. `"color": "rainbow"` cycles the colours; `"level": 0` turns it off. It stays on into later scenes.
- **A grey world:** a scene's `"grade": {"saturation": 0.3}` makes the whole scene greyer (1 is full colour, 0 grey); add `"keepCast": true` to keep the characters in colour. `set_grade` changes it during a scene: `{"who": "world", "do": "set_grade", "params": {"saturation": 1, "dur": 2, "from": "doopi"}}` sends the colour out from Doopi in a wave with rainbow sparkles.
- **Turned to stone:** `{"who": "mooka", "do": "petrify"}` freezes a character where it stands and drains its colour; it stays frozen into later scenes. `{"who": "mooka", "do": "return"}` brings the colour back from the feet up. In a kids story, a friend who is never thawed gets `W_KIDS_NO_HOPE`.

Sample: `scripts/samples/a3_colour.json`.

### 4.3 Catalog bundles (characters, moves and places made by others)

A catalog bundle is a folder or `.zip` of catalog data someone else made (docs/CATALOG_BUNDLE_SPEC.md). Its names have a colon: `robo_pals:boxbot`. To use one:

1. Check it: `node tools/bundle.mjs check robo_pals-1.0.0.zip`. It prints every problem with a fix, and the bundle's hash.
2. Declare it at the top of the script, exactly as the bundle gives it: `"bundles": [{ "id": "robo_pals", "version": "1.0.0", "hash": "sha256-…" }]`.
3. Pass it to the tools: `node tools/validate.mjs story.json --bundle robo_pals-1.0.0.zip`, `npm run record -- story.json --bundle robo_pals-1.0.0.zip` (the credits go into `meta.json`). In the player, pick the zip under "Bundles".

Imported bundles need no `--bundle`: `node tools/bundle.mjs import robo_pals-1.0.0.zip` checks it (with the render checks) and keeps it in the store, `bundles/<id>/<hash>/` (git-ignored; set `STICKMAN_BUNDLES` to keep it elsewhere). The tools find the bundles a script declares there, and `npm run serve` serves the store at `/bundles/`. `node tools/bundle.mjs list` shows the store; `node tools/bundle.mjs sheet <zip>` writes a contact sheet (every pose, move, body plan, preset, face, effect, place, object and activity) to look at before using a bundle. In the browser, `/web/bundles.html` does the same check, shows the sheet and keeps the bundle in the browser. The player loads a script's declared bundles from the browser or the project store by itself and lists their credits (with an NC badge for non-commercial ones); the showcase's "bundles" switch adds their entries to every section (deep links such as `showcase.html#moves/robo_pals:robot_dance`). Music moods from bundles have no browser preview: `npm run catalog:media -- --bundle <zip>` renders their clips.

**Making a bundle.** `node tools/bundle.mjs new my_pack` makes a folder with the manifest, a README and an example story. Add entries the way you draft catalog entries, with `--bundle my_pack` on the final `--write`: `node tools/draft.mjs move "<description>" --manual`, paste the prompt into any chat, then `node tools/draft.mjs move "<description>" --reply reply.txt --write --bundle my_pack` (the same for `object` and `theme`, and `node tools/svg_import.mjs art.svg --name lamp --write "<description>" --bundle my_pack`). Each entry is named `my_pack:<name>` and joins the example story. Or have a chat app make several entries at once: `node tools/bundle.mjs prompt my_pack "<what to make>" --kinds poses,moves,objects`, paste it into a chat in the project with the catalog pack, then `node tools/bundle.mjs reply my_pack reply.txt` (`--mock` tries the flow offline). Review, then `node tools/bundle.mjs pack my_pack --i-made-this` writes the hashes and the zip and checks it.

To write stories with a bundle in a chat app (section 7.6), attach `node tools/bundle.mjs pack-context <zip>`'s file next to the catalog pack; the AI copies the `bundles` line from it.

A missing bundle, a different hash or an undeclared name stops the script (`E_BUNDLE_MISSING`, `E_BUNDLE_HASH`, `E_BUNDLE_UNDECLARED`); there is no fallback. The same script with the same bundle hash gives the same frames. To make a bundle: `node tools/bundle.mjs pack <folder> --i-made-this` writes the hashes and the zip; the worked example is `tests/fixtures/bundles/robo_pals/`.

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
| `... --bundle <dir\|zip>` | On validate, record, generate and manual: load a catalog bundle the script declares (repeatable; section 4.3) |
| `node tools/bundle.mjs check <dir\|zip>` | Check a catalog bundle (`--fixture <file>` for a test fixture) |
| `node tools/bundle.mjs pack <dir> --i-made-this` | Write a bundle's hashes and zip it |
| `node tools/bundle.mjs new <id>` | Start a bundle folder (manifest, README, example story) |
| `node tools/bundle.mjs prompt <dir> "<what>"`, `reply <dir> <reply.txt>` | Have a chat app make bundle entries (copy-paste), and write its reply into the folder |
| `node tools/bundle.mjs import <dir\|zip>` | Check a bundle and keep it in the store (`bundles/`); `list` shows the store |
| `node tools/bundle.mjs sheet <dir\|zip>` | A contact sheet of everything a bundle adds, for review |
| `node tools/bundle.mjs pack-context <dir\|zip>` | The bundle's AI context file (`bundle_<id>.md`) to attach next to the catalog pack in a chat project; `manual.mjs ... --lean --bundle <zip>` then names it in the prompt |
| `node tools/validate.mjs --schema` | Print the JSON Schema (with every move name) |
| `node tools/compile.mjs <story> [--summary]` | Print a story with every macro expanded into beats (or one line per macro) |
| `node tools/compile.mjs <story> --eject <id> --out <file>` | Write the story with one macro replaced by its beats, to hand-tune them |
| `node tools/upgrade_v3.mjs <profile.json> <story>... [--check]` | Upgrade version 2 stories to version 3 with a series profile (pace, look, motion, voices, limbs, depth, light, intro); writes `<story>_v3.json` and validates. Doopi: `series/doopi/v3_profile.json` |
| `node tools/compilation.mjs <episode dir>... --out <dir> [--title "..."]` | Join rendered episodes (`record.mjs` output folders) into one long video for YouTube, in the order given, without re-encoding (they must share size and frame rate). Writes `final.mp4` with chapters inside, `description.txt` (the chapter list to paste into the YouTube description), `meta.json` and the first episode's `thumb.png`. `--plan` instead groups the episodes into 20-30 minute compilations |
| `node tools/shorts.mjs <episode.json> --list \| --auto [N] \| --scenes a,b [--render]` | YouTube Shorts (9:16) from an episode's scenes. `--list` shows each scene's length and spoken lines (with the TTS voices) and the best candidates (15-60 s, two or more lines); `--auto 3` writes the three best, `--scenes` the scenes you name. Each Short is a portrait script in `scripts/shorts/` (`--out-dir`): the scenes without the episode's intro, the pace's `framing: "single"` (each line frames its speaker alone, since a group side by side is tiny in a tall frame) and a "Watch the full episode!" end card (`--end "text"`, `--no-end`). `--render` renders them into `out/shorts/` at 30 fps (`--res`, default 1080p) |
| `npm run record -- <script> [options]` | Render the final video (see below) |
| `npm run serve` | Start the local web server for the browser pages (port 5173) |
| `node tools/catalog.mjs [--format json]` | Print the move, effect and world-command tables |
| `node tools/manual.mjs <prompt\|check\|ideas\|critique\|meta>` | Copy-paste workflow with any chat app, no API key (section 7.1) |
| `node tools/generate.mjs [options]` | Automatic generation with any LLM provider (section 7.2) |
| `node tools/move_clip.mjs [--strip <move>]` | Render every move as a grid video, or one move as a filmstrip PNG |
| `node tools/sfxgen.mjs [--force]` | Regenerate the built-in sound effects |
| `node tools/pose_sheet.mjs` | Render all poses into one image |
| `node tools/face_sheet.mjs` | Render every story face at three sizes into one image |
| `node tools/body_sheet.mjs` | Render every body plan doing 8 moves into one image |
| `node tools/svg_import.mjs <file.svg> --name <kind>` | Turn an SVG drawing into an object entry (review image in out/drafts/) |
| `node tools/draft.mjs object\|theme\|move "<description>"` | Draft a new object, theme or move with an LLM (`--mock`, `--manual` for copy-paste), checked and rendered for review |
| `node tools/move_sheet.mjs out.png --category life --plans stickman,buddy` | Filmstrips of a batch of moves on chosen body plans |
| `npm run catalog:build` | Check `catalog/` (schemas, descriptions, every move on every body plan, every example) and rewrite `catalog/generated/` and `catalog/manifest.json`; run it after every catalog change |
| `npm run catalog:check` | The same checks, without writing; fails when a generated file is stale |
| `npm run catalog:pack` | Build, then zip the AI context pack into `out/context_pack.zip` (section 7.6) |
| `npm run catalog:media` | Render a short clip of every music mood into `out/catalog_media/` for the showcase page |
| `node tools/draft.mjs ... --reply <file> --write` | Add a reviewed draft to `catalog/` (tag `draft`; moves: `--file <moves file>`) |

`record` options:

| Option | Effect |
|---|---|
| `--out-dir DIR` | Parent output folder (default `out`) |
| `--slug NAME` | Output folder name (default: from the title) |
| `--from N --to M` | Render only frames N to M (quick checks of one moment) |
| `--scene N` | Render only scene N of a story (index from 0, or the scene id) |
| `--fps 24\|25\|30\|60` | Output frame rate (default 60). Use 24 or 30 for review renders: about 2-2.5x fewer frames to draw. The story still runs at 60 fps; each output frame shows the nearest simulated one, so `--from`/`--to` and scene numbers stay in 60 fps frames |
| `--res 4k` or `--scale N` | Output resolution (render scale, ADR-039). `--res 4k` (= `--scale 2`) writes 3840x2160, or 2160x3840 for portrait; presets `720p`, `1080p`, `1440p`, `4k`, or any scale from 0.25 to 4. The story, camera, text and subtitles are the same as at 1080p, only sharper. `thumb.png` and the contact sheet stay 1080p; `meta.json` records the size under `resolution`. Expect roughly 3-4x the render time of 1080p (see `docs/benchmarks.md`); use it for finals, not reviews |
| `--no-audio` | Skip the sound mix |
| `--frames-only` | Write PNG frames instead of a video |
| `--hash` | Write a SHA-256 per frame (determinism checks) |
| `--crf 16 --preset medium` | Video quality settings (lower crf = better quality, bigger file) |

Browser pages (after `npm run serve`):

| Page | Use |
|---|---|
| `/web/player.html` | Play any script with a timeline scrubber; load your own JSON file. Stories show scene markers above the scrubber (click one to jump). "Bundles" loads catalog bundle zips the script declares (checked in the page) |
| `/web/showcase.html` | The whole catalog with live previews: characters and presets, looks, faces, moves, effects, sounds, places, objects, activities, macros, camera and transitions, music moods, examples and rules. Search, tag filter, body plan and color pickers, light/dark, "copy JSON" on every card, deep links such as `showcase.html#moves/hug`. Run `npm run catalog:media` once to hear the moods, `npm run sfx` for the sounds |
| `/web/catalog.html` | Redirects to the Moves section of the showcase |
| `/web/player.html?src=<url>` | Opens a script or example directly (the showcase's "open in player") |
| `/web/editor.html` | Pose and move editor, for adding or changing moves |
| `/web/bundles.html` | Check a catalog bundle zip (every step, with the render checks), see its contact sheet and README, keep it in this browser |
| `/web/showcase.html` "bundles" switch | Adds the kept and imported bundles' entries to every section, marked with the bundle's name |
| `/` (`/web/index.html`) | Home page: links to every page, showcase sections and samples, the catalog's counts, common commands |
| `/web/poses.html` | Pose viewer |

## 7. Generating scripts with an LLM

Any capable LLM can write scripts. The engine doesn't depend on any AI company: the validator checks every script no matter who wrote it. There are four ways to work:

| Option | Needs | Best for |
|---|---|---|
| **A. Copy-paste** with ChatGPT, Claude.ai, Gemini, Copilot or any chat app | Just a browser, no API key | Trying ideas, one-off videos, no setup |
| **B. Automatic** through an API: Anthropic, OpenAI, Google Gemini, OpenRouter, Groq, Mistral, ... | An API key | Batches of videos, unattended runs |
| **C. Offline mock** | Nothing | Checking the pipeline works, no cost |
| **D. A project with the catalog pack** (Claude Desktop Projects, any chat with project files) | A chat app with project knowledge | Many videos without pasting the catalog every time (section 7.6) |

All of them use the same catalog tables (rendered from `catalog/`), the same validator and the same output folders.

### 7.1 Option A: copy-paste with any chat (no API key)

`tools/manual.mjs` writes the prompts for you and checks the replies you paste back. Nothing is sent anywhere by the tool.

**Step 1. Make the prompt.**

```bash
node tools/manual.mjs prompt --premise "A tiny ninja outsmarts a giant robot guard on a snowy mountain" --length 25 --copy
```

This writes `out/manual/prompt.md` (about 26,000 characters: the script format, every validation rule with its error code, a pre-answer checklist, the full move catalog, three example scripts and your request) and, with `--copy`, puts it on the clipboard. Options: `--format portrait`, `--tone comedic`, `--length 30`.

**Step 2. Paste it into a new chat** in ChatGPT, Claude.ai, Gemini or any other chat app. The reply is a JSON script in a code block.

**Step 3. Check the reply.** Copy the whole reply; it's fine if it includes extra text or the code fence. Then run:

```bash
node tools/manual.mjs check --paste
```

(Or save the reply to a file and run `node tools/manual.mjs check reply.txt`.)

- **Valid**: the script is saved to `out/scripts/<title>.json` with its score. Add `--render` to make the video right away, or run `npm run record -- out/scripts/<title>.json`.
- **Not valid yet**: the tool lists the problems and writes `out/manual/fix_prompt.md`. Add `--copy` to put it on the clipboard. Paste it into the **same chat**, copy the new reply, and run `check --paste` again. One or two rounds is normal.

**Optional extras:**

| Command | What it gives you |
|---|---|
| `node tools/manual.mjs ideas --count 5 --copy` | A brainstorm prompt: the chat pitches 5 premises; pick one and use its logline in step 1 |
| `node tools/manual.mjs critique out/scripts/<title>.json --copy` | `out/manual/contact_sheet.png` plus a review prompt. Attach the image in a chat that reads images, paste the prompt, then paste its notes into the writing chat and ask it to apply them. |
| `node tools/manual.mjs meta out/scripts/<title>.json --copy` | A prompt for a YouTube title, description and tags |

Tips:
- Make a fresh prompt for each video: it always includes the current rules and catalog. An old `prompt.md` may be missing rules added since.
- If the model keeps repeating one mistake, add a line to the fix prompt like "Every attack with a target needs \"approach\": \"run\"".
- Use the strongest model your chat app offers; small models make more mistakes with a prompt this long.
- Start a new chat for each video, and send fix prompts in the same chat as the script they fix.
- If the chat app limits message length, attach `out/manual/prompt.md` as a file and write "Follow the instructions in the attached file".

### 7.2 Option B: automatic generation through an API

`tools/generate.mjs` runs the whole loop by itself:

1. **Ideation**: the model pitches premises, avoiding recent ones from `out/history.json`.
2. **Writing**: it writes each script.
3. **Repair**: when the validator finds errors, the model gets the errors and the timeline and fixes them (up to 3 attempts in total).
4. **Scoring**: an automatic score (variety, effects, emphasis, camera, ending). Low scorers get one improvement round, then are dropped.
5. **Critique** (optional, `--critique`): a vision model looks at the contact sheet and suggests changes; one revision round.
6. **Render and queue**: the video is rendered and added to `out/review_queue.json` with a suggested YouTube title, description and tags.

Nothing is ever uploaded. You review the queue and upload what you like by hand.

#### Choosing a provider

Providers are listed in `tools/llm.config.json`. Pick one with `--provider` and a model with `--model` (or set the models in the config):

| Provider name | Service | API key variable |
|---|---|---|
| `anthropic` (default) | Claude API | `ANTHROPIC_API_KEY` |
| `openai` | OpenAI | `OPENAI_API_KEY` |
| `gemini` | Google Gemini (OpenAI-compatible endpoint) | `GEMINI_API_KEY` |
| `openrouter` | OpenRouter (hundreds of models from many companies) | `OPENROUTER_API_KEY` |
| `ollama` | Local models with Ollama (free, private) | none |
| `lmstudio` | Local models with LM Studio | none |
| `mock` | Offline canned replies | none |

Examples:

```bash
node tools/generate.mjs --provider anthropic --count 1
```

```bash
node tools/generate.mjs --provider openai --model <model-id> --count 1
```

```bash
node tools/generate.mjs --provider ollama --model <local-model-name> --no-render
```

Two kinds of provider are built in:

- `"type": "anthropic"` uses the Claude API with its extras: prompt caching, structured output, effort levels, and automatic fallback to another model if one declines a request.
- `"type": "openai-compatible"` works with any service that offers an OpenAI-style `/chat/completions` endpoint. That covers most providers, including Azure OpenAI, Groq, Together, Mistral, DeepSeek, vLLM and llama.cpp.

To add a provider, copy an entry and change it:

```json
"groq": {
  "type": "openai-compatible",
  "baseURL": "https://api.groq.com/openai/v1",
  "apiKeyEnv": "GROQ_API_KEY",
  "models": { "default": "<model-id>", "critique": "<vision-model-id>" },
  "prices": { "<model-id>": { "input": 0.5, "output": 1.5 } }
}
```

| Field | Meaning |
|---|---|
| `models` | Model per stage: `ideation`, `write`, `flagship`, `repair`, `repairEscalate`, `critique`, `metadata`. Missing stages use `default`. `--model` overrides all of them. |
| `apiKeyEnv` | Name of the environment variable holding the key (omit for local servers) |
| `structured` | `json_schema` (default), `json_object` (for servers without schema support) or `off`. If the server rejects a mode, the tool steps down automatically. |
| `maxTokensField` | `max_tokens` (default) or `max_completion_tokens` (newer OpenAI models) |
| `reasoningEffort` | `true` to pass the stage effort as `reasoning_effort` (reasoning models only) |
| `vision` | `false` if the model can't read images; `--critique` is then skipped |
| `headers` | Extra HTTP headers, if a service needs them |
| `stream` | `false` turns off streaming (on by default, so slow models don't time out) |
| `timeoutSec` | Give up on one request after this many seconds (default 1800) |
| `prices` | USD per million tokens, for the cost estimate in the run summary |

The default provider is the `"provider"` field at the top of the config.

#### API keys

Keys are read from environment variables and are never written to any file. Exporting a key in one terminal window only works in that window. To make it available everywhere, add it to `~/.zshrc` and open a new terminal:

```bash
echo 'export OPENAI_API_KEY="your-key-here"' >> ~/.zshrc
```

(Use the variable name for your provider.) Never put keys in a file inside this project.

#### Local models (Ollama, LM Studio)

Local models are free and private, but small ones make more mistakes, so expect more repair rounds (`--attempts 6`). In a test, an 8B model (deepseek-r1:8b) never produced a valid script, even with 6 attempts: it fixed some errors each round but introduced new ones. Use a larger local model (30B or more) or a cloud model for automatic generation; for copy-paste, use the strongest model your chat app offers. The prompt is about 7,000 tokens, and Ollama's default context window is only 4,096 tokens. Raise it to 16K or more, either for the whole server:

```bash
OLLAMA_CONTEXT_LENGTH=16384 ollama serve
```

or for one model, by creating a copy with a bigger window (it reuses the same model files):

```bash
printf 'FROM <local-model-name>\nPARAMETER num_ctx 16384\n' > Modelfile && ollama create <local-model-name>-16k -f Modelfile
```

#### Options

| Option | Effect |
|---|---|
| `--provider NAME` | Provider from `tools/llm.config.json` |
| `--model ID` | Model for every stage |
| `--attempts N` | Write + repair attempts per script (default 3; small local models may need 5-6) |
| `--count N` | Number of premises (videos) |
| `--premise "text"` | Skip ideation and use your own idea |
| `--tone T` | `epic`, `comedic`, `parody`, ... |
| `--format F` | `landscape` or `portrait` |
| `--length S` | Target length in seconds (default 30) |
| `--flagship` | Use the provider's `flagship` model for writing |
| `--critique` | Vision review of the contact sheet plus one revision |
| `--no-render` | Scripts only (fast; for measuring validity rates) |
| `--out DIR` | Output root (default `out`) |
| `--config FILE` | Another config file |
| `--print-prompt` | Show the full system prompt |

#### Outputs

| Path | Contents |
|---|---|
| `out/scripts/<slug>.json` | The accepted script |
| `out/<slug>/` | The rendered video folder, plus `youtube.json` (title, description, tags) |
| `out/review_queue.json` | Every accepted video with status `pending_review`, score, critique and metadata |
| `out/history.json` | Premises, themes, moves and palettes used so far (keeps videos varied) |
| `out/runs/<time>.json` | Run summary: provider, validity rates, failure codes, tokens and estimated cost |

Default Claude models: Sonnet 5.5 pitches and writes, Haiku 5.5 repairs and writes metadata (Sonnet 5.5 takes the last repair attempt), Opus 5.5 critiques and writes `--flagship` scripts. Each run prints its estimated cost.

### 7.3 Option C: offline mock

```bash
node tools/generate.mjs --mock --count 2
```

Runs the full pipeline with canned replies: ideation, a deliberate mistake and its repair, scoring, critique, metadata and rendering. No network, no cost. Useful after changing the pipeline or the config.

### 7.4 Stories and fight videos (two stages)

`generate.mjs` makes three kinds of video. `--fight` (the default) makes a fight video of at least 3 minutes; `--story` makes a story of at least 5 minutes; `--clip` makes the short version 1 fight clip described above (30 s by default). Use `--length S` to ask for more, and `--audience general` to lift the kids rules.

```bash
node tools/generate.mjs --story --premise "Lumi loses her glowing flower on festival night and her friends help her find it."
```

Stories and fight videos are written in two stages, so each prompt stays small and each part is fixed on its own:

1. **Outline:** the cast (body plans, colors, looks, voices), the places, and 10-16 scenes (6-10 for a fight video), each with a purpose, a mood, a target length and what happens. It is checked before any scene is written: the lengths must add up to the minimum, every name must exist, and every color must stand out against its backgrounds.
2. **Scenes, one at a time:** each scene is checked inside the story so far, and only a failing scene is sent back for a fix. Each request says where everyone stands after the previous scenes (who is knocked out, who holds what).
3. **Extend:** a story that comes out short gets one round in which its shortest scenes are lengthened.
4. **Score:** arc, variety of scenes, feelings shown, narration, fights that land, length, and warnings (the kids rules count double).
5. **Critique** (`--critique`): a sheet with a row of frames per scene, a story-level review, and one revision of the scenes it names.

Results land in `out/scripts/<slug>.json` with the outline next to it (`<slug>.outline.json`). Stories that came out a little short or under the score are still queued for review; their `generation` field in `out/review_queue.json` says why.

**Copy-paste, no API key:** the same two stages by hand. State is kept in `out/manual/story/`.

```bash
node tools/manual.mjs story-outline --premise "your idea"
```

Then, step by step:
- Paste `out/manual/story/outline_prompt.md` into a new chat and save the reply. Run `node tools/manual.mjs check-outline reply.txt`. A failed check writes `out/manual/fix_prompt.md`: paste it into the same chat and check again.
- For each scene N: `node tools/manual.mjs story-scene N`, paste the prompt into a chat, then `node tools/manual.mjs check-scene N reply.txt`.
- Finally `node tools/manual.mjs assemble [--render]`. If the story is short, it names the scenes to lengthen: `node tools/manual.mjs extend N` writes a prompt for that scene's chat.

Add `--fight` to `story-outline` for a fight video. `scripts/samples/s8_lumi_story.json` (a 5.6-minute story) and `s8_fight_video.json` (a 3.3-minute fight video) were made this way.

### 7.5 Changing what the model writes

The prompts are plain text in `prompts/`:

| File | Used for |
|---|---|
| `system.md` | Script format, how fights resolve, every validation rule with its code, a self-check list, pacing (a test keeps its code list in sync with the validator) |
| `ideation.md` | Premise brainstorming |
| `repair.md` | Fix requests |
| `critique.md` | Video review |
| `metadata.md` | YouTube title and description |

The example scripts in `catalog/examples/` teach the format by example; keep them valid (the catalog build and the tests check this). Catalog tables are generated from `catalog/`, so new moves appear in every prompt automatically, in all three options. To see exactly what a model receives, run `node tools/generate.mjs --print-prompt`.

### 7.6 Option D: a project with the catalog pack (Claude Desktop and other chat apps with project files)

Instead of pasting the catalog tables into every prompt, upload them once. The pack is about 70 KB (about 17,000 tokens) of Markdown tables, built from the catalog.

1. Run `npm run catalog:pack`. It writes `out/context_pack.zip` (the files are also in `catalog/generated/context/`).
2. In Claude Desktop, create a Project. Add the nine `0*_*.md` files as project knowledge. `00`-`02` and `05`-`07` are the core; `03_moves.md`, `04_effects_and_sound.md` and `08_examples.md` are the reference tier. Add both tiers when you can.
3. Paste `project_instructions.md` into the project's instructions.
4. Make the prompts with `--lean`: they leave the catalog out (the project has it) and are about a tenth of the size.

```bash
node tools/manual.mjs prompt --premise "A tiny ninja vs a giant robot" --lean --copy
```

Paste it into a new chat in the project, then check the reply with `node tools/manual.mjs check --paste --lean`. A fix prompt, if any, goes into the same chat. For a story:

```bash
node tools/manual.mjs story-outline --premise "Kai crosses the city to save Pip" --lean --copy
```

Then `check-outline --paste`, `story-scene 1 --copy`, `check-scene 1 --paste` and so on, as in 7.4. The story remembers `--lean` for all its commands (`--full` switches a command back). Use a new chat in the project for each scene; the scene prompt carries the outline and the end state of the scenes before.

| Prompt | Full (no project) | Lean (project with the pack) |
|---|---|---|
| clip | about 32,000 characters | about 1,000 |
| story outline | about 9,000 | about 1,400 |
| one story scene | about 27,000 | 2,500-5,000 |

`00_start_here.md`, the instructions and every lean prompt carry the catalog version (`npm run catalog:build` prints it). When the catalog changes the version changes: upload the pack again. If a reply mentions an older version, the check commands warn you.

## 8. Sound and music

Sound effects are generated automatically for every hit, whoosh, block and landing. To use your own sounds, drop files into `assets/sfx/` named after the sound key (`punch_heavy.wav`, `whoosh.mp3`). Add `_2`, `_3` for variants that play in rotation (`punch_heavy_2.wav`). The keys are listed at the end of `node tools/catalog.mjs`.

For music, put a file in `assets/music/` (e.g. `epic_01.mp3`) and reference it by name:

```json
"audio": { "music": "epic_01", "musicVolume": 0.35 }
```

Music ducks under heavy hits automatically. Record where each file came from and its license in the `SOURCES.md` next to it. (That is for version 1 fight scripts; stories get generated music, below.)

**Stories (version 2) get generated music and ambience.** Give each scene a mood; a scene without `music` keeps the previous scene's, and `"music": null` is silence:

```json
{ "id": "park", "location": "city_park", "music": { "mood": "happy", "intensity": 0.6 }, ... }
```

Moods: happy, playful, calm, sad, tense, mysterious, heroic, battle, boss, triumphant, lullaby. The music is made fresh from the story's seed (the same script always sounds the same), fitted so it ends on the scene's last beat, crossfaded when the mood changes, and quieter while someone talks or the narrator speaks. Fight macros raise its intensity; you can too, with a world beat: `{"who": "world", "do": "set_music", "params": {"mood": "tense", "intensity": 0.8, "fade": 2}}`. To use your own track for a mood, put `assets/music/happy.mp3` (any of wav, mp3, ogg, flac, m4a) there: it loops instead of the generated one.

Each location (or scene) can have an `ambience` bed: `park_birds`, `city_traffic`, `rain`, `wind`, `crowd_murmur`, `cave_drip`; rainy and windy weather add their own. `audio.musicVolume` (default 0.35) and `audio.ambienceVolume` (default 0.8) set the levels. Story mixes are levelled to about -16 LUFS, a comfortable level for YouTube and young ears.

| Command | What it does |
|---|---|
| `node tools/music.mjs --mood battle --seconds 30` | Render one mood to `out/music/battle.wav` (`--all` for every mood, `--ramp` to sweep the intensity from 0 to 1) |
| `node tools/loudness.mjs out/demos/<slug>/` | Measure a video's (or WAV's) loudness against the -16 LUFS target |

## 9. Using the engine from code

The engine is plain JavaScript with no dependencies and runs in Node and in the browser.

```js
import { createEngine } from "./engine/index.js";
import { catalog } from "./catalog/index.js";   // the browser: the same import (it fetches the JSON files)

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
| `Cannot set up the LLM provider` or 401 errors | The provider's API key variable isn't set in the shell running the command (section 7.2), or use copy-paste mode (7.1) |
| `has no model for: ...` | Set the provider's `models` in `tools/llm.config.json` or pass `--model` |
| `exceeds the available context size` | The local model's context window is too small; see 7.2, Local models |
| The chat reply has no JSON | Run `check` anyway: it writes a fix prompt asking for JSON only |
| A move looks wrong for a giant/tiny pairing | Check the frame with `--from`/`--to`; try a different move or outcome |
| A fighter walks for ages before attacking | Use `"approach": "run"`, or start the fighters closer |
| A beat starts later than expected | It waited for a busy character; chain it with `after`, or set `"interrupt": true` |
| Text is cut off | Speech max 40 characters, text pops 16, captions 80 |
| The render is slow | Use `--from`/`--to` for quick checks, or the browser player |
| Fonts look wrong | Check `assets/fonts/` has `Bangers-Regular.ttf` and `Inter.ttf` |

## 11. Known limits

- Story scripts (version 2) are being built in stages (docs/STORY_PLAN.md). Today they support scenes, locations with set pieces, time of day and weather, transitions and cards, narration, faces and emotions, bubbles with speaker names, speech sounds, six humanoid body plans and a four-legged dog (`dog_small`), appearance options, objects, paired moves, activities, defeat styles, story macros (dialogue, fights, gauntlets, brawls, chases, defeat and grief, fight cards, montages), story camera shots, extras and depth layers; see `scripts/samples/s1_scenes.json` to `s6_fight_card.json`. generated music, ambience beds and story sounds (S7). LLM story generation (S8): stories and fight videos in two stages, automatic or copy-paste (section 7.4).
- Old themes (the seven fight themes) draw background geometry up to x = 8000; story stages can be up to 12,000 px wide, so use the story themes for very wide stages.

- Blocks are high guards only.
- No secondary "overlap" motion on limbs yet; accessories carry the follow-through.
- In portrait, fighters who are far apart render small.
- The big club has no special moves; it works as a held or thrown prop.
- Fights are choreographed: you choose every outcome. `meta.mode: "simulated"` (outcomes from geometry) is reserved for a future procedural fight feature.
