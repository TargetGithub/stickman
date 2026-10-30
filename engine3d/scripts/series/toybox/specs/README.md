# Toy Box Friends: video specs (batch 2)

Specs for 30 new engine3d learning videos: 10 for pre-K, 10 for grade 1 and 10 for grade 2. A spec tells
the script writer (a person or an AI) **what** a video teaches and **how** it should feel: story, cast,
animation, experiment, fun fact, interaction and quiz. A spec is not a script. It has no final dialogue
and no JSON. The script follows `../SERIES.md` and the engine3d README.

| File | Grade | Videos |
|---|---|---|
| [prek.md](prek.md) | Pre-K (ages 3–5) | PK-07 to PK-16 |
| [grade1.md](grade1.md) | Grade 1 (ages 6–7) | G1-01 to G1-10 |
| [grade2.md](grade2.md) | Grade 2 (ages 7–8) | G2-01 to G2-10 |

## Topic allocation (no duplicates)

Batch 1 already covers count to 10, shapes, colours, farm animal sounds, letters A–F and AB patterns
(pk01–pk06). Those topics are not repeated. Every row below is a different topic, and topics close to each
other in different grades are split so they do not overlap (see "Kept apart" below).

| Id | Title idea | Subject | Skills (catalog/education) |
|---|---|---|---|
| PK-07 | Five Senses Detectives | Science | five_senses_prek |
| PK-08 | Sink or Float? Bathtub Lab | Science experiment | – (NGSS K-PS2 style) |
| PK-09 | Magnet Magic: What Sticks? | Science experiment | – |
| PK-10 | Picnic Adding (sums to 5) | Math | add_pictures_prek |
| PK-11 | Big, Bigger, Biggest | Math / measurement | – |
| PK-12 | Letters G to L | English | capital_letters_prek, letter_look_alikes_prek |
| PK-13 | Opposites Playground | English / concepts | opposites_k |
| PK-14 | Where Is Duck? (on, under, beside, behind, in) | Math / spatial words | – |
| PK-15 | How Do You Feel? | Social-emotional | listening_prek |
| PK-16 | Healthy Habits: Wash, Brush, Sleep | Health / social studies | – |
| G1-01 | Short Vowel Island (CVC words) | English / phonics | short_vowels_1 |
| G1-02 | Digraph Detectives: sh, ch, th, wh | English / phonics | digraphs_1 |
| G1-03 | Number Line Rocket: add and subtract within 20 | Math | add_within_20_1, sub_within_20_1, word_problems_1 |
| G1-04 | Tens and Ones Bakery | Math / place value | tens_ones_1, add_tens_1 |
| G1-05 | Robo's Busy Day: hour and half hour | Math / time | time_half_hour_1 |
| G1-06 | Penny, Nickel, Dime Shop | Math / money | coins_1 |
| G1-07 | Fair Shares: halves and quarters | Math / fractions | halves_quarters_1 |
| G1-08 | Four Seasons Tree | Science | weather_seasons_1 |
| G1-09 | Shadow Puppets and Humming Strings (light and sound) | Science experiment | nonfiction_facts_1 (NGSS 1-PS4) |
| G1-10 | Town Rules and Good Citizens | Social studies | rules_citizenship_1 |
| G2-01 | Magic E | English / phonics | long_vowels_2, vowel_teams_2 |
| G2-02 | Describing Words Zoo | English / grammar | adjectives_2, plurals_2 |
| G2-03 | Regroup Rally: two-digit adding | Math | add_2digit_regroup_2, sub_2digit_borrow_2 |
| G2-04 | Hundreds Tower: place value to 999 | Math | hundreds_2, skip_count_2 |
| G2-05 | Five-Minute Clock Race | Math / time | time_5_minutes_2 |
| G2-06 | Measure It! Length, weight, capacity | Math / measurement | units_2 |
| G2-07 | Plant Lab: What Do Plants Need? | Science experiment | plants_2 |
| G2-08 | Habitat Hop | Science | habitats_2 |
| G2-09 | Treasure Map Quest | Social studies / geography | maps_2 |
| G2-10 | Melt, Freeze, Fizz: states of matter | Science experiment | – (NGSS 2-PS1) |

Reserve topics, for a later batch: needs and wants (needs_wants_2), nouns and verbs (nouns_verbs_1),
blends (blends_1), coins with quarters (coins_quarters_2), number rules (number_sequences_2), story order
(sequence_inference_2), main idea (main_idea_2), community helpers (community_helpers_k), living and
non-living things (living_things_k), rhyming (rhyming_k), teen numbers (teen_numbers_k), and day and night.

### Kept apart (similar topics, different jobs)

| Pair | Earlier grade does | Later grade does |
|---|---|---|
| PK-11 sizes / G2-06 measuring | Compare by eye: big, bigger, biggest; tall and short | Units and tools: cm, m, kg, L, ruler, scale, jug |
| PK-14 position words / G2-09 maps | Words for where one toy is next to another | Map key, symbols, N S E W, a route on a grid |
| PK-08 sink or float / G2-10 matter | Predict and test one property (floats) | Solid, liquid, gas, and heating or cooling to change state |
| G1-08 seasons / PK-16 habits | – | Weather and seasons are only in G1-08; PK-16 is about the body only |
| G1-07 halves / G2-04 place value | Equal parts of one whole | No fractions in G2 (thirds stay in reserve) |
| G1-05 time / G2-05 time | Hour and half hour only; the hour hand alone first | Five-minute steps and the minute hand counting by 5s |
| G1-01 short vowels / G2-01 magic e | CVC words with one short vowel | The same CVC words become long-vowel words (cap → cape); a deliberate callback |

## The cast (no new characters)

The cast is the batch 1 cast. No new characters, stages or catalog themes are needed to write these specs.

- **Robo** (the CC0 robot, `character: robot`) is the host. Clips: Idle, Wave, Yes, No, ThumbsUp, Jump,
  Dance, Walking, Running, Sitting, Standing.
- **Toy animals** (`critter`): duck, chick, cat, dog, bunny, bear, pig, cow, frog, sheep. Each one blinks,
  bobs, wags, hops, wiggles, nods, sleeps and wakes. `<id>#head` turns.
- **Props**: apple, ball, egg, tree, bush, cloud, sun, moon, flower, house, balloon, gift.
- **Shapes**: cube, block, sphere, cylinder, cone, pyramid, torus, star, heart, circle, square, triangle,
  rectangle, oval, diamond, crescent, capsule, box. Faces are optional. Objects can also be number blocks
  and letters.
- **Stages**: playroom, studio, garden, night, contrast. Lights: soft_day, studio, moonlight,
  studio_bright.
- **Effects**: confetti, bubbles, stars. Sounds: block, land, pop, ding, bell, sparkle, magic_sparkle,
  boing, whoosh, robot_beep, crowd_cheer, giggle, bubble_pop, bubble_blow, squeak, toot, slide_whistle,
  crystal_chime, ooh, laugh_small, footstep_soft, sprout_spring, windup_click.
- **Actions**: show, hide, pop, drop, move, turn, spin, hop, grow, clip, camera, say, caption, sound, burst,
  wiggle, nod, sleep, wake.

Recurring roles keep the series feeling like one show:

| Role | Who | Personality |
|---|---|---|
| Host and guide | Robo | Curious, kind, sometimes gets things wrong on purpose so kids can correct him |
| Sidekick, pre-K | Duck | Eager, quacks when excited, the first to try things |
| Sidekick, grade 1 | Frog | Bouncy and silly, loves big jumps (number lines, hopping games) |
| Sidekick, grade 2 | Cat | Clever and a little cool; asks "but why?" and checks answers |
| Helpers | The other animals | One or two guests per episode with a clear job |

If a spec needs something the catalog does not have yet (a clock face, a coin, a magnet, a water tub, a
map grid), it is listed under **Catalog gaps** in that spec. Gaps are notes for a later catalog task. No
catalog work is needed to write these specs. Prefer staging that uses existing shapes and props (a "coin"
is a flat gold cylinder with a number on it) and list the gap only where that would look wrong.

## Spec template (every video uses all of these headings)

```
### <Id> · <Title>
**Grade · Subject · Length · Stage** — one line
**Skills:** catalog ids · **Standard:** CCSS / NGSS-style code (approximate)

1. Big idea — one sentence a child could repeat at dinner.
2. Learning goals — 2–4 "I can …" statements.
3. Hook (first 15 s) — the surprise or question that makes a child keep watching.
4. What makes it unique — the twist that sets this episode apart from every other one.
5. Cast and roles — who is in it and what each one does.
6. Setting and look — stage, light, camera style, colour mood.
7. Storyline — chapters (at least 3, each 10 s or more) with timings; each chapter: what happens,
   the teaching move (teach / show / try / quiz), and the emotional beat.
8. Animation and staging list — table: moment · objects · actions (engine action names) · camera.
9. Experiment or hands-on activity — steps, prediction, result, what a child can try at home
   (safety note; adult help where needed). For non-science topics: the activity the child does along.
10. Interaction moments — call and response, pause and guess (2–3 s windup_click), move-along.
11. Song or chant — an ORIGINAL short chant idea (rhythm, hook line idea, where it repeats); no lyrics
    of existing songs.
12. Fun fact(s) — 1–3 true, checkable, age-right facts and where they appear.
13. Vocabulary and captions — key words shown on screen (caption styles: label, subtitle, count, title).
14. Quiz and recap — 3–5 check questions with answers and the praise moment.
15. Sound and music — music mood and gain, voice speed, key sound effects per chapter.
16. Thumbnail and YouTube — thumbnail moment, title idea (≤ 100 chars), 8–12 tag ideas.
17. Catalog gaps — anything the catalog lacks, with a stand-in from existing parts.
18. Do and don't — pitfalls for the script writer (misconceptions, pacing, safety, tone).
```

## Pacing by grade

| Grade | Length | Sentence length | Voice speed | Pattern |
|---|---|---|---|---|
| Pre-K | 3–5 min | 3–7 words | 0.90–0.95 | Teach → repeat → quiz with 2–3 s pauses → cheer; one idea per beat |
| Grade 1 | 5–7 min | up to 10 words | 0.95–1.0 | Story problem → model → try together → quiz; a running joke |
| Grade 2 | 6–9 min | up to 14 words | 1.0 | Mystery or mission → explain why → practise → challenge round |

## Rules that apply to every spec

- Educational first, then fun: every chapter teaches or practises something.
- Facts must be correct and simple. Do not teach misconceptions (for example, heavy things do not always
  sink).
- Experiments are safe for the age. Anything with heat, sharp tools or small swallowable parts says "with a
  grown-up" on screen and in the voice. No eating non-food items, no fire, no gore, no scary peril.
- Use only original songs and chants. Traditional public-domain tunes are fine if the spec names them.
- Show a range of names, foods and places; avoid stereotypes. Animals are the characters.
- No flashing faster than 3 Hz. Pre-K has no loud sudden sounds.
- Mark every video **Made for kids**. Upload stays manual.

## Gaps that come up in many specs (for a later engine or catalog task)

Each spec lists its own gaps with a stand-in, so none of these blocks writing a script. These ones come up
in more than one spec and are worth building first:

| Gap | Needed by | Stand-in used in the specs |
|---|---|---|
| A new `audience` value for grade 1 and grade 2 (the series test accepts only `babies` and `prek`) | All G1 and G2 | Add `grade1` and `grade2` to the test and validator |
| A pivot point for turning objects (clock hands turning about one end) | G1-05, G2-05 | A hand made of two parts, or a capsule offset inside a rotating parent |
| Group objects (move many parts as one: a rocket, a car, a tray of cookies) | G1-03, G1-04, G2-03 | Move every part with the same timing |
| Face expressions for Robo and the animals (the robot model has face morphs, but no action uses them) | PK-15 and every feelings moment | Body language: hop, wiggle, a lowered head, sleep and wake |
| Changing the light or stage in the middle of an episode | PK-16, G1-08, G2-08 | Swap the sun and moon props, or use patches on the floor |
| A colour-change action, and growing along one axis only (a rising water level) | G2-06, G2-10, G1-08 | A hide and show crossfade between two objects |
| Props: clock face, coins, magnet, water tub, ruler, scale, map grid, compass, ice, toothbrush and bed | Per spec | Shapes with number or letter labels |
| Text: check that the caption font has ¢, :, − and _ | G1-05, G1-06, G1-01 | Write out the words ("cents") |
| Skill ids that do not exist yet: `states_of_matter_2`, a magnets and floating skill for pre-K, a feelings skill and a health skill | G2-10, PK-08, PK-09, PK-15, PK-16 | Leave `skills` to the nearest real id until the skill is added |
