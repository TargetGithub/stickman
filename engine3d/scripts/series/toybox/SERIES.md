# Toy Box Friends (working title)

A 3D learning series made with engine3d, for two audiences:

| Track | Ages | Pace and look | Voice | Music |
|---|---|---|---|---|
| **Babies** (`bb`) | 6–24 months | One thing at a time, slow moves, long holds, few words, no loud or sudden sounds, no flashing (stars twinkle below 0.5 Hz) | `soft`, voiceSpeed 0.78–0.82 | `lullaby` or `calm`, musicGain 0.28–0.38 |
| **Pre-K** (`pk`) | 2–5 years | Clear teach → repeat → quiz pattern, short sentences, captions for key words, a cheer at the end | `soft` at 0.92–0.95; animal sounds in `deep` / `squeaky` | `bouncy`, `playful`, `happy`, musicGain about 0.25 |

Hosts: **Robo** (the CC0 robot) presents the pre-K episodes. The baby episodes have no host: the toy animals,
shapes and balls are the whole show. All animals and props are original part-built models
(`engine3d/catalog/models.json`), so there is no licensing to track.

## Episodes (batch 1)

| Id | Title | Track | Teaches | Skills (catalog/education) | Stage |
|---|---|---|---|---|---|
| pk01 | Count to 10 with Robo | Pre-K | Count 1–10 as two rows of five (a ten-frame), count again, count down | count_to_5_prek, number_order_prek, count_to_10_k | playroom |
| pk02 | Shapes with Faces | Pre-K | Circle, square, triangle, rectangle, star, heart, oval, diamond (sides and corners), find the shape | basic_shapes_prek, more_shapes_k | studio |
| pk03 | Colours with Robo | Pre-K | Eight colours, each with a matching friend (red apple, yellow duck…) | (no colour skill in the catalog yet) | garden |
| pk04 | Farm Animal Sounds | Pre-K | Eight animals and their sounds, then who says that? | listening_prek | garden |
| pk05 | Letters A to F | Pre-K | A apple, B ball, C cat, D duck, E egg, F frog | capital_letters_prek | studio |
| pk06 | What Comes Next? Patterns | Pre-K | AB patterns: colours, shapes, animals, big/small | ab_patterns_prek | playroom |
| bb01 | Bubbles and Colours | Babies | Six colours with bouncing balls and floating bubbles | – | garden |
| bb02 | Peekaboo Animals | Babies | Peekaboo with six animals and their sounds | listening_prek | garden |
| bb03 | Goodnight, Little Star | Babies | Bedtime: Twinkle, Twinkle (traditional, public domain), goodnight to the animals | – | night |
| bb04 | Black and White Shapes | Babies | High-contrast shapes with faces for newborns | basic_shapes_prek | contrast |

## Making an episode

```bash
cd engine3d && npm test                                                # every script validates (tests/unit/series.test.js)
node engine3d/tools/episode3d.mjs engine3d/scripts/series/toybox/pk01_count_to_ten.json --review   # 1080p30
node engine3d/tools/episode3d.mjs engine3d/scripts/series/toybox/pk01_count_to_ten.json --final    # 4K60
```

Each episode folder `out/series3d/toybox/<id>/` gets `review_1080p30.mp4` and/or `final_4k60.mp4` (with
`*_stats.json`), `thumbnail.jpg` (1280×720: the first designed concept, see below; older scripts without
`meta.thumbnails` use the frame at `meta.thumbnail`), `contact.jpg` (12 frames) and `youtube.txt` (title,
description, chapters from scene titles, tags, audience). `--out-dir <dir>` writes the kit somewhere else.
Upload stays manual; mark every video **Made for kids**.

## Thumbnails

Thumbnails are designed, never a frame of the video: `meta.thumbnails` holds 2–3 concepts (at most 4), each its
own small scene plus title text (fields: `engine3d/README.md`, "Designed thumbnails"). `episode3d.mjs` makes
them; to work on them alone:

```bash
node engine3d/tools/thumbnail3d.mjs engine3d/scripts/series/toybox/<id>.json            # all concepts
node engine3d/tools/thumbnail3d.mjs <script> --only lab                                  # one concept again
node engine3d/tools/thumbnail3d.mjs <script> --no-render                                 # re-lay text on the last stills
```

Look at `thumbnails_sheet.jpg` (each concept big and at phone size) before uploading. Designing a concept:

- **One clear teaching object** that names the topic at a glance (the pots in a row for growing, the clock for
  time, the fraction pie), big and in focus. No clutter: three to five objects in all, a plain stage.
- **1–2 expressive characters** (Robo and the grade's sidekick) with a `feeling` (`happy`, `surprised`) and,
  for Robo, a `clip` (`Wave`, `ThumbsUp`, `Jump`), facing the camera or the object, never cut by the edge.
- **A 1–3 word title** (≤ 18 characters) that says the topic or asks the question ("ARRAYS!", "LIGHT OR
  DARK?"); the subtitle (≤ 32) adds the hook. Use the same words as the YouTube title.
- **High contrast**: a title colour that differs from the background (yellow or white over sky and grass,
  green or yellow over dark stages); the scrim and outline do the rest.
- **Leave the title's side empty**: with `side: "left"` put everything at x > 0 (the right half of the frame);
  keep the bottom-right corner free (YouTube's length stamp). `badge` names the grade (`PRE-K`, `GRADE 3`).
- Make the concepts different (a question, the result, the character's reaction) so the best one can be picked.

## Script rules for this series

- `meta`: `series: "toybox"`, `episode` = the file's prefix, `audience: babies | prek`, `skills` (real ids
  only; a test checks), `thumbnails` (designed concepts, below), and `youtube`
  `{ title (≤ 100 chars), description, tags }`.
- One scene per chapter, with a `title`. YouTube needs at least three chapters of 10 s or more.
- Babies: at least 8 s per idea, nothing faster than a gentle hop, chimes at volume ≤ 0.6, no confetti.
- Pre-K: teach, repeat, quiz with a 2–3 s thinking pause (`windup_click`), then praise.
- Words in captions are the ones the voice says. Colour-word captions use their own colour (`caption.color`).
- Calmer chapters: put `"music": "calm"` (or `"lullaby"`, or `false` for none) and/or `"musicGain": 0.2` on the
  scene; it crossfades over 2 s at the scene start, and later scenes go back to `meta.music`.
- Phonics: say a letter's sound with a sound cue, not with `say` (the voice reads letter names):
  `{ "do": "sound", "sound": "ph_a_short" }`, then say the example word ("a... apple"). Names: `ph_<letter>`,
  `ph_<vowel>_short` / `_long`, `ph_oo`, `ph_sh`, `ph_ch`, `ph_th`, `ph_th_voiced`, `ph_wh`, `ph_ng`, `ph_qu`, `ph_x`
  (`engine3d/catalog/sounds.json`). Clips last 0.3–0.9 s; leave about 1 s before the next line.
- An object resting on another moves with it (hop the blocks above too); `hop` adds to position, so moving
  objects can hop.

## Batch 2 specs

Specs for 30 more videos (pre-K, grade 1, grade 2) are in [specs/README.md](specs/README.md): the topic
allocation, the spec template and one detailed spec per video. Write the scripts from those.

## Next batches (ideas)

- Pre-K: count to 20, add within 5 (`add_pictures_prek`), big and small, opposites (up/down, in/out), letters
  G–L, M–R, S–Z, the five senses (`five_senses_prek`), weather, numbers 0–5 order game.
- Babies: animals sleeping, splashing bath ducks, music-box shapes, a colour rainbow lullaby.
- Compilations: a 10–20 minute pre-K mix and a 30-minute baby calm mix from the episodes (`--compilation`
  idea in `tools/compilation.mjs`).
