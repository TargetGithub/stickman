# script10k: Toybox 10K lessons → engine3d scripts

Wave 3 of the Toybox 10K programme turns each spec (`10K/specs/<band>/<id>.json`) into a video. A writer authors
a **lesson** (`10K/lessons/<band>/<id>.json`): the cast, the set, the objects, every line and demonstration, and the
thumbnails. `script10k` expands it into an engine3d `video3d` script (`10K/scripts/<band>/<id>.json`) and adds
what every video shares, then checks it. The spec is what makes each video unique; the lesson is where it is staged.

```bash
export PATH=/Users/a81133017/.nvm/versions/node/v20.19.3/bin:$PATH
node engine3d/tools/script10k.mjs ready                 # specs whose assets all exist and have no lesson yet
node engine3d/tools/script10k.mjs needs <id>            # the spec's new: assets: built names, mapped ones with their "how"
node engine3d/tools/script10k.mjs qa <id>               # build + QA (0 errors needed; read every warning)
node engine3d/tools/script10k.mjs stills <id>           # 1080p stills on real TTS timing -> qa/<band>/<id>/contact_N.jpg
node engine3d/tools/script10k.mjs thumbs <id>           # designed thumbnails -> qa/<band>/<id>/thumbs/thumbnails_sheet.jpg
node engine3d/tools/script10k.mjs review <id> --ok "what you checked"    (or --fix "what is wrong")
node engine3d/tools/script10k.mjs status                # 10K/SCRIPT_STATUS.md
```

The quality model is `10K/lessons/kg/kg0117.json` (Letter Train A to F). Read it before writing a lesson.

## What the tool adds (do not write these yourself)

- `meta`: series `toybox`, episode = the 10K id, audience, seed, the Toybox voice (soft, pitch 1.1, speed 0.97;
  babies 0.88), music mood and gain from the spec's `music` note (babies: lullaby or calm only), skills (real ids
  only), `retention` lints on, YouTube title (the spec's `youtube_title`), description and tags.
- Robo (`character: robot`) is the host: lines without `who` are his voice. Without Robo (babies) lines without
  `who` are the soft narrator.
- `meta.cast` voices: a cast member's `voice` (squeaky, deep, soft...) gets a pitch distinct from the others on the
  same timbre. Give `pitch` only to override.
- The HUD **tracker** `trk` from `spec.progress_tracker` (style from its words: train / checklist / stars / path;
  babies always stars), with a surprise slot at the end. Override with `"tracker": { style, labels, color, accent }`
  or `false`.
- Confetti `party` (never for babies). Use it with `"confetti": true` on a beat (the magic moment).
- **Keyword badges**: each spec keyword not already placed gets a pop-in on the first line that says it.
- **Camera keep-alive**: a camera still for more than 12 s gets a slow dolly (out, then back in later).

## Assets the spec calls `new:`

Run `needs <id>` first. A **built** name is in the catalog now: use it as written (critter `species`, prop
`model`, stage preset). A **mapped** name is made from what exists: follow its `how` exactly (a variant model, a
kind such as `text_card` for cards and pages, a shape composition). See `engine3d/catalog/asset_map.json` and the
"10K asset wave" section of `engine3d/README.md`. Never invent a model name; QA fails on unknown names.

A **missing** need that is a small one-spec prop (a napkin, a toast slice, porridge in a bowl) may be composed in
the lesson from shapes (`plate`, `disc`, `sphere`, `box`...; a `group` with children moves as one). Record it:
`script10k compose props napkin "cream plate 0.45 x 0.45 laid over the bowl; lifts off with move"`. Characters,
stages and anything used by several specs wait for the assets session.

## Lesson format

```json
{
 "lesson": "toybox-10k-lesson/1",
 "id": "kg0117",
 "stage": "garden",                                   // a preset, or { "preset": "classroom", "set": [] }
 "camera": { "position": [0, 1.9, 9.4], "lookAt": [0, 1.1, 0], "fov": 40 },   // optional opening camera
 "cast": {
   "robo":  { "character": "robot", "at": [-4.7, 0, 1.3], "rotation": [0, 35, 0] },
   "bunny": { "species": "bunny", "at": [4.5, 0, 1.3], "size": 0.85, "rotation": [0, -35, 0], "voice": "squeaky" }
 },
 "objects": [ engine3d objects (README "Object kinds", catalog/kinds.json),
              { "spread": { "ids": ["q1", "q2", "q3"], "center": [0, 0, 0.8], "gap": 1.9 } } ],  // sets their at
 "tracker": { "style": "train", "labels": ["A", "B", "C", "D", "E", "F"] },     // optional override
 "allow": ["kancil"],                                 // optional: words the spell check should accept
 "scenes": [ { "id": "hook", "title": "Letters in hiding", "music": "calm", "beats": [ ... ] } ],
 "thumbnails": [ ... ]
}
```

### Beats

One beat = one spoken line or one kit macro, plus what happens during it. Sugar fields (all optional):

| Field | Becomes |
|---|---|
| `say`, `who`, `keywords`, `caption` (default true), `voice`, `pitch`, `at`, `spoken` | a `say` action (subtitled); `spoken` is what the voice reads (respelling or IPA in `[[ ]]`), `say` stays the caption |
| `hook: { question, behind, target, style, answer }` | the kit hook (must be the first beat; target starts `hidden`, placed where the cover stands). The tracker pops in with it. Prefer `style: "lift"` so the cover leaves the teaching area. |
| `call: { prompt, cue, wait, answer, answerWho, reveal }` | call-and-response with a cue badge and a pause |
| `challenge: { prompt, options, answer, dur, praise }` | prompt, pulsing options, 3-2-1 timer ring, celebrated answer (not for babies) |
| `shot: "id"` / `["a", "b"]` / `{ target, framing, yaw, height, dur, pad }` | a framing camera move (default medium, 1.5 s, pad 0.15). Shots run after the beat's other actions, so leave it off a beat whose `do` moves the camera itself. |
| `orbit: 20` / `{ degrees, around, dur }` | a slow arc |
| `pop`, `show` / `hide` (id or list), `popAt`, `popGap`, `showAt`, `hideAt` | pop (staggered 0.45 s), show (staggered 0.25 s), hide |
| `progress: true` / `"tease"` / `7`, `progressAt` (default 0.8 s) | fill the next tracker step / tease the surprise / fill to a step (surprise = slots + 1) |
| `clip: { robo: "Wave" }`, `feel: { bunny: "happy" }`, `look: { bunny: "a" }` | clips, feelings, head turns |
| `pause: 2.2` (`pauseSound`) | a silent beat after the line, with a soft click: the child's thinking time |
| `confetti: true` (`confettiAt`) | burst the confetti |
| `magic: true` | marks the spec's magical moment (required once) |
| `do: [ ... ]` | any engine actions (`at` = seconds from the beat start) |
| `dur` | minimum beat length (speech stretches it) |

## Rules (QA checks most of them; eyes check the rest)

1. **Hook first** (within 5-8 s): the spec's hook line and visual, no setup talk. Tease the surprise by 60 s.
2. **An interaction every 10-15 s**: call, challenge, a question with `pause`, a keyword badge, a pop. Follow the
   spec's `interactions` list in order; adapt wording, keep the answer.
3. **Teach with visuals**: show what is said while it is said (pop the letter, draw the stroke, shade the part,
   highlight the thing named). Labels (`text_card`) name what is on screen. Correct vs wrong is visible
   (`mark`, `answer` wrong with `hint`).
4. **Spec accuracy**: read `accuracy_notes` and obey them (counts, shapes, facts). Each `recap.points` item is said
   near the end. The spec's `check.questions` become challenges/calls in the quiz scene.
5. **Language**: US English, the band's sentence length (babies 2-4 words a line, pre-K ≤ 10, K ≤ 12, g1 ≤ 12,
   g2 ≤ 15, g3 ≤ 17, g4-5 ≤ 19). Captions are the spoken words. Letter sounds are `ph_*` sound cues, never spoken.
   "blood" only in science/health; never "bloody", gore or weapons.
6. **Babies**: no timers, challenges or confetti; gentle hops (≤ 0.5 m), slow spins, light changes over ≥ 1.5 s;
   long holds and `pause`s; calm narration.
7. **Length**: QA estimates ~0.85-1.35 × the spec's `target_length_s` (the estimate runs long).

## Staging lessons from the pilot (look for these in the stills)

- **Keep the teaching area clear**: put set dressing (trees, bushes, gates) behind z ≈ -1.5 or out at |x| > 3;
  teaching objects stand in front (z 0.6-1.4). A cover that slides stays in the middle: lift it away.
- **Characters to the sides** (|x| ≈ 4.5, facing in), never between the camera and the teaching object.
- **Frame letters and objects, not their labels**: put a `text_card` label just above its object (1.4-1.6 m up for
  a size-0.9 letter) and frame the object with `pad` 0.3-0.45 or `framing: "wide"`; framing labels zooms out too far.
  Anything near the top of the frame collides with the HUD tracker (top-left) and timer (top-right).
- **Label text**: `size` 0.24-0.32 with `width` ≥ 0.5 × size × characters, so it does not wrap or read tiny.
- **Colours**: not green letters or objects on grass or in a garden; one colour per item, kept the same all video.
- **Riders in containers** (letters in train cars, toys in boxes) sit clearly above the rim: a rim under an F made
  it read as E. Check confusable shapes by eye.
- **Separate quiz objects**: do not reuse one object in two places; give each challenge its own options.
- A `challenge` shrinks the wrong options away when it celebrates: re-show them if you need them again.
- Close-ups of moving things: frame the thing and what it carries (`["car2", "rf"]`), medium.

## Thumbnails (2-3 concepts, designed, never a frame)

```json
{ "name": "e_or_f", "title": "E OR F?", "subtitle": "Count the arms!", "stage": "garden", "titleColor": "white",
  "objects": [ { "id": "e", "kind": "letter", "text": "E", "color": "pink", "size": 0.9, "at": [0.55, 0, 0] },
               { "id": "robo", "kind": "character", "character": "robot", "clip": "ThumbsUp", "feeling": "happy" } ] }
```

Title ≤ 18 characters, subtitle ≤ 32, from the spec's thumbnail ideas. The title sits on the left: keep objects at
x > 0 (objects without `at` are laid out on the right; characters at the right edge facing in). The badge (grade)
is added. One clear teaching object, 1-2 expressive characters, 3-5 objects in all. Check `thumbs` at phone size.

## Done means

`qa` shows 0 errors and no warning you have not judged; the contact sheets were looked at and every overlap, crop,
hidden teaching object, wrong visual, unreadable label or still stretch fixed; the thumbnail sheet reads at phone
size; then `review <id> --ok "..."`. Only reviewed scripts go to the render queue.
