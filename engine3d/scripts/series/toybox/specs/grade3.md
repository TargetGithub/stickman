# Grade 3 video specs (G3-01 to G3-05)

These five specs open grade 3 of "Toy Box Friends" (ages 8–9, 7–9 minutes each) as part of batch 3 (see
[batch3.md](batch3.md) for the allocation, the "Kept apart" table and the new building blocks). Every episode
follows the grade 3 pattern: a question → build a model → find the rule → practise → check. Robo hosts and
sometimes gets things wrong on purpose. Fox (`fox`) is the grade 3 sidekick: a builder and tinkerer who says
"Let's build it and see!" and measures twice. One or two guests per episode have a clear job. Each spec follows
the 18-heading template in [README.md](README.md). All arithmetic, word lists and science facts below were
checked. Specs have no final dialogue and no JSON; the script writer turns each one into a `video3d` script
following `../SERIES.md`, with `meta.audience: "grade3"`.

| Id | Title | Subject | Hook style | Unique twist | Length |
|---|---|---|---|---|---|
| G3-01 | Array Garden: multiplication | Math | A messy flower bed nobody can count | The camera orbits the garden bed: 3 × 4 turns into 4 × 3 | 8:30 |
| G3-02 | Fractions on a Number Line | Math | Frog can't cross the pond in equal hops | A fraction bar lies down and becomes a number line | 8:15 |
| G3-03 | Area and Perimeter Playground | Math / geometry | 18 fence pieces fit, 18 grass mats don't | Same fence, three pens, three different areas | 8:45 |
| G3-04 | Word Builder Workshop | English / vocabulary | Fox's note looks like secret code | Word-part blocks click on; fake prefixes set off an alarm | 8:00 |
| G3-05 | Life Cycles: frog, butterfly, bean | Science | Three mystery babies: what will they become? | Three life-cycle wheels side by side, and a cutaway bean seed | 8:50 |

Notes for all five:

- Sentences up to 16 words, voice speed 1.0. Voices: Robo `soft` (`meta.voice`), Fox `squeaky`, kept for every
  grade 3 episode; speaking guests use `deep`. Frog, who spoke in grade 1, appears in grade 3 as a guest without
  lines (hops, nods, `feel`), so two `squeaky` voices never share a scene. The `bark` voice cannot speak.
- Every spoken line is a `say` with `who` (the speaker's id) for lip-sync; use `look` so listeners turn to the
  speaker or to the object being taught.
- Camera: open each chapter with a framed `shot` (wide or medium), teach on a demonstration shot (top-down or
  straight-on), and use `orbit` only where turning round a 3D model teaches something. Characters stand beside
  the teaching objects, never in front of them; text and diagrams are never cropped.
- Pause and guess: 2–3 s with `windup_click`, then the answer, then praise.
- Every chapter is 10 s or more; chapter timings add up to the length in the table. Every video stays under
  10 minutes.
- Thumbnails are designed scenes in `meta.thumbnails` (2–3 concepts each), never a video frame.

---

### G3-01 · Array Garden: multiplication
**Grade 3 · Math · 8:30 · garden** — equal groups and arrays turn counting into multiplication; turning an array shows the order of factors doesn't change the product; a missing factor is found by building.
**Skills:** times_tables_3, missing_factor_3 · **Standard:** CCSS 3.OA.A.1, 3.OA.A.3, 3.OA.A.4, 3.OA.B.5, 3.OA.C.7

1. **Big idea**
   "Multiplication counts equal groups fast: rows times how many in each row, and if you turn the array the
   total stays the same."

2. **Learning goals**
   - I can show equal groups and arrays and write the fact: 3 rows of 4 is 3 × 4 = 12.
   - I can explain why 3 × 4 and 4 × 3 have the same product (turn the array).
   - I can find a missing factor, like 4 × ? = 24, by building rows or skip counting.
   - I can break a harder fact into two easier ones: 7 × 4 = 5 × 4 + 2 × 4.

3. **Hook (first 15 s)**
   Fox's garden bed is ready. Robo has a tray of flower seedlings and plants them everywhere, all over the bed,
   in a jumble. Bear, who runs the plant nursery, asks: "How many did you plant?" Robo starts counting one by
   one, loses his place, starts again (`feel` worried). Fox grins: "Let's build it in rows and see!"

4. **What makes it unique**
   The camera does the maths: after Fox builds 3 rows of 4, the camera `orbit`s 90° round the bed and the same
   garden is now 4 rows of 3. Kids see the commutative property from the other side of the flower bed, not
   from a rule. The array builds row by row (`build` order rows) with a skip-count caption per row, and Fox's
   split trick puts a little fence (a `pointer`) through a 7 × 4 bed to show 5 × 4 + 2 × 4.

5. **Cast and roles**
   - **Robo** (host, gardener): plants in a jumble, counts by ones, writes 3 × 4 = 7 (he added) on purpose.
     Voice `soft`.
   - **Fox** (sidekick, garden builder): lays out rows with string and a ruler, "measures twice", explains each
     rule after the model shows it. Voice `squeaky`.
   - **Bear** (guest, plant nursery keeper): brings the missing-factor puzzles (24 carrots in 4 rows) and checks
     orders. Voice `deep`.
   - Lines use `say` with `who` (robo, fox, bear). Characters stand at the short ends of the bed so the array
     is always clear.

6. **Setting and look**
   `garden` stage, `soft_day`. A raised garden bed (a flat brown `box` with a `plate` soil top, about 3 m × 2 m)
   in the middle. Plants are `array` objects with `item` `flower` (and `item` `seedling` for the nursery
   trays). Fox's string lines are thin `cylinder`s. Bear's nursery is a `bench` with seed trays (`array` with
   `trays: true`). A small chalkboard-style sign (`plate` with letters) shows each fact. Camera: high
   three-quarter demonstration shot on the bed (`shot` height 55) for building, top-down for counting, `orbit`
   for the turn. Mood: fresh spring greens, bright flower colours, tidy.

7. **Storyline**

   | # | Chapter | Time | What happens | Teaching move | Emotional beat |
   |---|---|---|---|---|---|
   | 1 | The messy garden | 0:00–0:35 (35 s) | Jumbled planting; counting by ones fails | Question | Funny, stuck |
   | 2 | Equal groups | 0:35–1:35 (60 s) | 5 pots of 2; equal vs unequal groups; "groups of" becomes × | Build a model | Curious |
   | 3 | Build an array | 1:35–2:50 (75 s) | 3 rows of 4 row by row; rows and columns; Robo's 3 × 4 = 7 | Build a model + explain why | Aha |
   | 4 | Turn the garden | 2:50–3:45 (55 s) | Orbit 90°: 4 × 3 = 12 too; any array works both ways | Find the rule | Wow |
   | 5 | Fox's Times chant | 3:45–4:10 (25 s) | Chant | Practise | Joy |
   | 6 | Bigger beds | 4:10–5:00 (50 s) | 6 × 5 = 30; 2 rows of 9 and 9 rows of 2 | Practise | Momentum |
   | 7 | The missing factor | 5:00–6:05 (65 s) | 4 × ? = 24; ? × 3 = 15 | Practise + find the rule | Thinking hard |
   | 8 | Fox's split trick | 6:05–6:55 (50 s) | 7 × 4 = 5 × 4 + 2 × 4 = 20 + 8 = 28 | Find the rule | Clever |
   | 9 | Challenge: Garden Planner | 6:55–7:50 (55 s) | Five orders from Bear | Check | Sharp |
   | 10 | Quiz and recap | 7:50–8:30 (40 s) | Five questions, recap, goodbye | Check | Proud |

   Total: 510 s = 8:30.

   **Worked facts (all checked)**

   | Chapter | Model | Count | Fact |
   |---|---|---|---|
   | 2 | 5 pots, 2 flowers in each | 2, 4, 6, 8, 10 | 5 × 2 = 10 |
   | 2 (non-example) | 3 pots with 2, 3 and 2 flowers | 7, but not equal groups | no × fact |
   | 3 | 3 rows of 4 | 4, 8, 12 | 3 × 4 = 12 (Robo's "7" is 3 + 4) |
   | 4 | the same bed seen from the side | 3, 6, 9, 12 | 4 × 3 = 12 |
   | 6 | 6 rows of 5 | 5, 10, 15, 20, 25, 30 | 6 × 5 = 30 |
   | 6 | 2 rows of 9 / 9 rows of 2 | 9, 18 / 2, 4 ... 18 | 2 × 9 = 9 × 2 = 18 |
   | 7 | 24 carrots in 4 rows | skip count by 4: 4, 8, 12, 16, 20, 24 (6 in each row) | 4 × 6 = 24, so ? = 6 |
   | 7 | 15 seedlings, 3 in each tray | 3, 6, 9, 12, 15 (5 trays) | 5 × 3 = 15, so ? = 5 |
   | 8 | 7 rows of 4, a fence after row 5 | 5 × 4 = 20 and 2 × 4 = 8 | 20 + 8 = 28, so 7 × 4 = 28 |

   Words taught: an **array** is equal rows and equal columns; the numbers we multiply are **factors**; the
   answer is the **product**. Rows go across, columns go up and down (Fox's string lines show both). In
   chapter 7 Fox adds one line: "Finding a missing factor is how sharing, or division, begins." No division
   lesson.

   **Challenge (chapter 9)**: (a) 6 rows of 3 tomato plants: 18. (b) 8 × 5 = ? (40). (c) ? × 6 = 36 (6).
   (d) Is 2 rows of 9 the same total as 9 rows of 2? (Yes, 18.) (e) Split 6 × 4 into 5 × 4 + 1 × 4 (20 + 4 = 24).

8. **Animation and staging list**

   | Moment | Objects | Actions | Camera |
   |---|---|---|---|
   | Jumbled planting | robo, ~12 `flower` props scattered | `drop` flowers at random spots, robo `clip` Walking, `feel` worried | `shot` wide on the bed |
   | Counting by ones | flowers | `highlight` one at a time, then two at once (a lost count), `sound` boing | Top-down |
   | Equal groups | 5 `seedling` pots as an `array` with `trays: true`, 1 row | `build` pots, `caption` count 2, 4, 6, 8, 10 | `shot` medium, height 40 |
   | Not equal | 3 pots with 2, 3, 2 flowers | `pop`, `mark` incorrect, `callout` "not equal groups" | Close |
   | Build 3 × 4 | `array` fl34 (rows 3, cols 4, item flower), string lines | `build` order rows with `sound` sprout_spring, row captions "4", "8", "12", `callout` "row" and "column" | `shot` high three-quarter on fl34 |
   | Robo's 3 × 4 = 7 | sign with "3 × 4 = 7" | `pop`, `mark` incorrect, Fox points along a row, sign changes to 12, `mark` correct | Medium on the sign and bed |
   | Turn the garden | fl34 | camera `orbit` around the bed centre, 90°, 6 s; sign updates to "4 × 3 = 12" | `orbit`, then `shot` close |
   | Bigger beds | `array` 6 × 5, then 2 × 9 | `build` rows, `turn` the 2 × 9 array 90° on the spot (it becomes 9 rows of 2) | High three-quarter |
   | Missing factor | 24 carrots (orange `cone`s, tips down) appear by rows into 4 rows | `build` order cols (one carrot per row at a time) so the rows fill evenly; count columns | `shot` top-down |
   | Split trick | `array` 7 × 4, a `pointer` with `bend` 0 as a little fence after row 5 | `draw` the fence, `shade` rows 1–5 yellow and rows 6–7 pink, `callout` "5 × 4 = 20", "2 × 4 = 8" | Top-down, then medium |
   | Challenge orders | order cards (`plate`s) from Bear | `sound` windup_click, answer `pop`s, `mark` | Medium on cards and bed |
   | Goodbye | the full flowerbed, butterflies (`butterfly` critter) | `burst` petals (`weather` petals briefly), `clip` robo Wave | Wide, slow pull back |

9. **Experiment or hands-on activity**
   - **Egg-carton arrays:** an egg carton is 2 rows of 6. Put a button or dry pasta in each cup and say 2 × 6 =
     12; turn the carton and say 6 × 2 = 12.
   - **Array hunt at home:** window panes, a muffin tin, a chocolate bar's squares, tiles on a floor. Write the
     multiplication fact for each.
   - **Missing factor with counters:** put out 20 counters; how many rows of 4? (5) How many rows of 5? (4)
   - **Prediction:** "If we turn the egg carton, will there be more eggs?"
   - **Safety:** keep buttons and pasta away from babies; ask a grown-up before using food.

10. **Interaction moments**
    - Pause and guess (2–3 s, `windup_click`): "How many in 3 rows of 4?"; "If we walk round the bed, will the
      total change?"; "4 rows of how many make 24?"
    - Call and response: Fox: "Rows!" Kids: "Times!" Fox: "Turn it round!" Kids: "Same amount!"
    - Move-along: kids tap one finger per row in the air while skip counting.

11. **Song or chant**
    Original garden-rhythm chant, like digging on the beat. Hook line idea: "Row by row and plant by plant, equal
    rows make multiply chant!" ... then "Turn it round, the same is found." It plays in chapter 5 and returns
    under the challenge.

12. **Fun fact(s)**
    - An egg carton is an array: 2 rows of 6 makes 12, a dozen (chapter 2 or 9).
    - The × sign for multiplying was first printed by the English mathematician William Oughtred in 1631
      (chapter 3).
    - Farmers often plant in straight rows so they can count, water and pick the crops easily (chapter 6).

13. **Vocabulary and captions**
    Labels: equal groups, array, row, column, factor, product, times, multiply, missing factor. `count` captions
    for every skip count. `subtitle` for each fact ("3 × 4 = 12"). The sign shows facts large, in Andika, the
    "×" glyph checked in the font.

14. **Quiz and recap**
    1. 4 rows of 5 sunflowers. How many? (20; 4 × 5)
    2. 3 × 7 = 21. What is 7 × 3? (21; turn the array.)
    3. 5 × ? = 35 (7)
    4. Which shows multiplication: 3 pots with 4, 4 and 4 flowers, or 3 pots with 4, 2 and 5? (4, 4 and 4: equal
       groups.)
    5. Use the split trick for 6 × 7: 5 × 7 + 1 × 7 = ? (35 + 7 = 42)
    Recap: equal groups and arrays; rows × columns; turn it, same product; build or skip count to find a missing
    factor; split hard facts. Praise: Bear hangs a "Best Garden" ribbon; Fox: "Built it, checked it, twice."

15. **Sound and music**
    Music `happy`, gain 0.20, dipping to 0.12 while rows are counted. Voice 1.0. Effects: sprout_spring (each
    plant appears), block (carrots), whoosh (orbit), windup_click (guesses), ding (correct facts), boing
    (Robo's mistakes), crowd_cheer (end).

16. **Thumbnail and YouTube**
    Designed thumbnails (`meta.thumbnails`):
    - **a "ARRAYS!"** (yellow title, left): a high view of a bright flower bed in 3 neat rows of 4, with "3 × 4"
      floating above in big chalk-white digits; Fox on the right holding a ruler, confident grin.
    - **b "Turn It!"** (white title, orange outline): two copies of the same flower bed, one turned, with a
      curved arrow between them and "3 × 4 = 4 × 3"; Robo amazed in the corner.
    - **c "Times Garden"** (green title on a sunny sky): Robo, Fox and Bear behind a big array of seedling trays,
      all smiling.
    Title idea: "Array Garden! Multiplication with Arrays and Equal Groups | Times Tables | Grade 3 Math | Toy
    Box Friends". Tags: multiplication for kids, arrays, equal groups, times tables, commutative property,
    missing factor, grade 3 math, 3rd grade math, multiplication strategies, learn to multiply, Toy Box
    Friends.

17. **Catalog gaps**
    - Carrots in the ground: no carrot prop. Stand-in: an orange `cone` tip down with a small green `leaf` shape
      on top (an `array` with `item: "cone"` and `color: "orange"`).
    - Garden string lines: stand-in: thin `cylinder`s (a `pointer` with no head would be the real fix).
    - Prize ribbon: stand-in: a `circle` with two small `rectangle` tails.

18. **Do and don't**
    - Do build every array row by row before naming the fact; the model comes first.
    - Do say "factor" and "product" and keep "3 rows of 4" as 3 × 4 (rows first) every time.
    - Don't teach multiplication as "just repeated adding" only; show equal groups, arrays and the turn.
    - Don't make it a facts-speed drill; one practice round, then the challenge.
    - Don't re-teach plain skip counting (G1-14); skip counting appears only as a way to count rows.
    - Keep products within 10 × 10.

---

### G3-02 · Fractions on a Number Line
**Grade 3 · Math · 8:15 · pond** — a fraction is a number: split 0 to 1 into equal parts, count hops to place fractions, see 4/4 = 1, and compare unit fractions on same-length lines.
**Skills:** fractions_3 · **Standard:** CCSS 3.NF.A.1, 3.NF.A.2a, 3.NF.A.2b, 3.NF.A.3c, 3.NF.A.3d

1. **Big idea**
   "A fraction is a number with its own spot on the number line: split 0 to 1 into equal parts, and each hop is
   one part."

2. **Learning goals**
   - I can split the space from 0 to 1 into equal parts and label the marks (1/4, 2/4, 3/4, 4/4).
   - I can explain that the bottom number tells how many equal parts make 1 whole, and the top number tells how
     many parts we've hopped.
   - I can show that 4/4 and 1 are at the same point.
   - I can compare fractions like 1/3 and 1/6, or 2/4 and 3/4, on number lines of the same length.

3. **Hook (first 15 s)**
   A pond. On one bank, Frog; on the other, a picnic on the island. Robo drops stepping stones in at random:
   one hop is tiny, the next is huge. Frog stops at the edge and won't hop (`feel` worried). Fox measures the gap
   with a metre stick: "Frog only likes hops that are all the same size. Let's build it and see!"

4. **What makes it unique**
   The bar becomes the line: Fox lays a `fraction_bar` cut into fourths along the bank, and its cut lines drop
   down as tick marks on a `number_line`. Kids see that the "parts of a shape" from grade 2 become "a number on
   a line" in grade 3 (the key "kept apart" step). Frog's equal hops (`leap`) make each fraction a count of hops,
   and Robo's tick-counting mistake ("five ticks, so fifths!") is a classic misconception caught on screen.

5. **Cast and roles**
   - **Robo** (host): places unequal stones, counts ticks instead of spaces, thinks 1/6 is bigger than 1/3
     "because 6 is bigger". Voice `soft`.
   - **Fox** (sidekick, bridge builder): measures twice, lays the bar, places lily pads exactly. Voice `squeaky`.
   - **Frog** (guest, the hopper, no lines): hops only equal hops; his `leap`s count the fractions; shows feelings
     with `feel` and a happy `hop` at the end.
   - Lines use `say` with `who` (robo, fox). Frog and the lily pads stay on the line; Robo and Fox stand on the
     near bank at the ends, below the line, so labels are never covered.

6. **Setting and look**
   `pond` stage (water, reeds), `soft_day`. The "bridge" across the pond is a `number_line` from 0 (the near bank)
   to 1 (the island), 4 m long, running left to right across the frame. Lily pads (`lily_pad`) sit on the line
   with `on: { line, value }`. Extra lines (thirds, sixths, eighths) appear as parallel bridges above it, all
   exactly the same length. The batch 3 `metre_stick` measures. Camera: straight-on demonstration shot of the
   whole line (`shot` on the line, `wide`, height 20), close-ups on single hops, a medium on Frog for feelings.
   Mood: calm water, green reeds, cool blue and fresh green.

7. **Storyline**

   | # | Chapter | Time | What happens | Teaching move | Emotional beat |
   |---|---|---|---|---|---|
   | 1 | Frog's pond crossing | 0:00–0:35 (35 s) | Unequal stones; Frog won't hop | Question | Concerned, curious |
   | 2 | From bar to line | 0:35–1:45 (70 s) | The fourths bar lies down; ticks drop; 0 and 1; the whole is 0 to 1 | Build a model | Aha |
   | 3 | Fourths by hops | 1:45–2:55 (70 s) | 1/4, 2/4, 3/4, 4/4 = 1; what top and bottom mean | Find the rule | Confident |
   | 4 | Count the hops, not the ticks | 2:55–3:40 (45 s) | Robo's "fifths" mistake; spaces, not marks | Explain why | Funny, careful |
   | 5 | Thirds and sixths bridges | 3:40–4:40 (60 s) | New lines; place 2/3 and 5/6 | Practise | Momentum |
   | 6 | The Hop chant | 4:40–5:05 (25 s) | Chant | Practise | Joy |
   | 7 | Which is bigger? | 5:05–6:15 (70 s) | 1/3 vs 1/6; 2/4 vs 3/4; only on same-length lines | Find the rule | Clever |
   | 8 | Challenge: Place the Lily Pads | 6:15–7:30 (75 s) | Five tasks | Check | Sharp |
   | 9 | Quiz and recap | 7:30–8:15 (45 s) | Five questions, recap, picnic | Check | Proud |

   Total: 495 s = 8:15.

   **Chapter details**
   - **Ch 2:** a `fraction_bar` (parts 4) the length of the line. Fox lays it on the bank above the line; the
     three cuts drop down as ticks, plus the ends at 0 and 1. "The whole is the distance from 0 to 1. Fourths
     cut it into 4 equal spaces."
   - **Ch 3:** Frog hops from 0: one hop lands on 1/4 ("one hop of one fourth"), two hops on 2/4, three on 3/4,
     four on 4/4, which is the island, 1. Callouts: "bottom number: 4 equal parts make 1"; "top number: how
     many hops". A lily pad pops at 3/4: "three fourths: three hops of one fourth".
   - **Ch 4:** Robo counts the marks on the fourths line: 0, 1/4, 2/4, 3/4, 1 is five marks. "Five marks, so
     fifths!" Fox highlights the spaces between marks: 4 spaces, 4 hops. "Count the hops, not the ticks." The
     first mark is 0, where Frog starts, not a hop.
   - **Ch 5:** a thirds bridge (3 equal spaces) and a sixths bridge (6 equal spaces) above the fourths bridge,
     all from 0 to 1 and the same length. Frog places 2/3 (two hops of a third) and 5/6 (five hops of a sixth).
     3/3 lands on 1 too.
   - **Ch 7:** the thirds and sixths bridges stacked: 1/3 is farther from 0 than 1/6, so 1/3 is bigger. "More
     equal parts make smaller parts" (callback G2-11). Robo: "6 is bigger than 3, so 1/6 is bigger!" `mark`
     incorrect. Then 2/4 vs 3/4 on one line: same size parts, 3 hops go farther, so 3/4 is bigger. Fox's rule:
     "We only compare fractions of the same whole, so the lines are the same length."
   - **Ch 8 challenge (all checked):** (a) put a lily pad at 2/3; (b) which is closer to 1: 5/6 or 1/6? (5/6);
     (c) a line from 0 to 1 split into 8 equal parts: where is 3/8? (the third hop); (d) is 3/3 the same point as
     1? (yes); (e) which is bigger: 1/8 or 1/4? (1/4).

8. **Animation and staging list**

   | Moment | Objects | Actions | Camera |
   |---|---|---|---|
   | Unequal stones | frog, three `rock`s, island with a picnic `basket` | `drop` rocks at uneven spots, `feel` frog worried | `shot` wide across the pond |
   | Fox measures | fox, `metre_stick` | `move` stick across the gap, `callout` "1 whole" | Medium |
   | Bar lies down | `fraction_bar` fb4 (parts 4, length 4), `number_line` nl4 (0–1, step 1, minor 4, labels fractions) | `move` fb4 down onto the line, `hide` fb4 while `draw` nl4 ticks, `sound` crystal_chime | Straight-on, whole line in frame |
   | Fourths hops | frog on nl4 | `leap` frog values [0, 0.25, 0.5, 0.75, 1], `caption` count "1/4", "2/4", "3/4", "4/4" | Straight-on; `shot` close on each landing |
   | 4/4 = 1 | label "1" and label "4/4" at the island | `highlight` both, `callout` "4/4 = 1" | Close |
   | Ticks vs hops | nl4, small numbers 1–5 over the marks, then 1–4 over the spaces | `pop` mark numbers, `mark` incorrect on "fifths", `highlight` each space with `count` 1–4, `mark` correct | Close, then straight-on |
   | Thirds and sixths | nl3 and nl6 above nl4, same length | `draw` each line, `leap` frog to 2/3, then to 5/6, `lily_pad` `pop` at each | `shot` medium on the three lines |
   | Compare 1/3 and 1/6 | nl3, nl6 | `highlight` 1/3 and 1/6, a dashed `pointer` drops from each to show which is farther right, `mark` incorrect on Robo's claim | Straight-on, both lines |
   | Compare 2/4 and 3/4 | nl4 | `leap` frog 2 hops (one colour) then 3 hops (another colour) | Straight-on |
   | Chant | frog on nl4 | `leap` on the beat | `orbit` 30° round the pond centre, slow |
   | Challenge | nl3, nl6, nl8 (`minor` 8), lily pads | `sound` windup_click, Fox places a pad, `mark` correct | Straight-on |
   | Picnic | frog, robo, fox on the island, `basket` | frog `hop`, `feel` happy, `burst` bubbles over the water | Wide, slow pull back |

9. **Experiment or hands-on activity**
   - **Paper strip number line:** fold a paper strip in half, then in half again, and open it: 4 equal parts.
     Write 0 at the left end, 1 at the right, and 1/4, 2/4, 3/4 on the folds. Hop a toy along it.
   - **Thirds strip:** fold a second strip of the same length into three (roll it like a letter). Lay it under
     the fourths strip: is 1/3 or 1/4 farther from 0?
   - **Prediction:** "Before we fold the eighths strip, where do you think 1/8 will be: closer to 0 or to 1?"
   - **Safety:** scissors with a grown-up. At a real pond, look from the path with a grown-up; never stand at
     the edge of deep water.

10. **Interaction moments**
    - Pause and guess (2–3 s, `windup_click`): "Where will Frog land after three hops?"; "Fifths or fourths?";
      "Which is bigger, 1/3 or 1/6?"
    - Call and response: Fox: "Bottom number?" Kids: "How many parts make one!" Fox: "Top number?" Kids: "How many
      hops!"
    - Move-along: kids hop their fingers along their arm from shoulder (0) to wrist (1) in four equal hops.

11. **Song or chant**
    Original hopping chant with one beat per hop and a ding at 1. Hook line idea: "Zero to one, cut it
    fair, count the hops to get you there!" It plays in chapter 6 and is hummed (music only) during the
    challenge.

12. **Fun fact(s)**
    - Some frogs can jump more than 20 times their own body length (chapter 1).
    - Thousands of years ago, people in ancient Egypt wrote most fractions as one part of a whole, like 1/3 or
      1/5 (chapter 3).

13. **Vocabulary and captions**
    Labels: fraction, number line, whole, equal parts, numerator (top), denominator (bottom), unit fraction, hop.
    The words numerator and denominator are shown once in chapter 3 with "top number" and "bottom number"; after
    that, use whichever the narration uses. `count` captions for hops; `callout` labels on marks.

14. **Quiz and recap**
    1. A line from 0 to 1 is split into 6 equal parts. What is the first mark after 0? (1/6)
    2. How many hops of 1/4 get to 1? (4; 4/4 = 1)
    3. Which is bigger, 1/2 or 1/3? (1/2)
    4. Which is bigger, 2/6 or 5/6? (5/6)
    5. Robo says a line with 5 marks shows fifths. Fix it. (5 marks make 4 spaces, so it shows fourths.)
    Recap: a fraction is a number on the line; the denominator is how many equal parts make 1; the numerator is
    how many hops; n/n is 1; compare on same-length lines. Praise: picnic on the island; Fox: "Measured twice,
    hopped right."

15. **Sound and music**
    Music `calm`, gain 0.18, `playful` 0.20 for the chant and challenge. Voice 1.0. Effects: boing (each hop),
    land (Frog lands on the island at 1), crystal_chime (bar becomes line), windup_click (guesses), ding (correct),
    slide_whistle (Robo's fifths), crowd_cheer (picnic, soft).

16. **Thumbnail and YouTube**
    Designed thumbnails (`meta.thumbnails`):
    - **a "Hop to 3/4!"** (yellow title, top): Frog mid-leap over a number line bridge on the pond, landing on a
      lily pad at 3/4, curved hop arcs behind him; Fox on the bank cheering; cool blue water.
    - **b "Fractions Are Numbers"** (white title, blue outline): a fraction bar floating above the number line
      with dotted lines dropping from the cuts to the ticks; Robo amazed.
    - **c "1/3 or 1/6?"** (orange title): two stacked bridges with 1/3 and 1/6 glowing; Fox thinking with a paw
      on his chin.
    Title idea: "Fractions on a Number Line! Unit Fractions for Kids | Compare Fractions | Grade 3 Math | Toy Box
    Friends". Tags: fractions on a number line, unit fractions, compare fractions, grade 3 fractions, 3rd grade
    math, numerator and denominator, fractions for kids, number line, math cartoon, Toy Box Friends.

17. **Catalog gaps**
    - Stacked fraction text (numerator over a bar over the denominator) in `letter` and `callout`: the font
      layout writes "3/4" with a slash. Stand-in: slash form everywhere, the same as the `number_line` labels;
      a stacked style would match US textbooks better.
    - A dashed drop line from a mark to another line: stand-in: a thin `pointer` with `bend` 0.
    - Landing ring when Frog lands on a lily pad: stand-in: a quick flat `ring` shape on the water that `grow`s and hides.

18. **Do and don't**
    - Do keep every line in one comparison the same length, and say why.
    - Do count hops (spaces) from 0; never count tick marks.
    - Don't teach equivalent fractions (2/4 and 1/2 at the same point); that is G4-01. If 2/4 lands under 1/2 on
      another line, don't point it out.
    - Don't go past 1 in this episode; fractions bigger than 1 can come later.
    - Don't call the denominator "the number of pieces" without "equal".
    - Frog never falls in or gets wet; the unequal stones are just "too far", and he waits.

---

### G3-03 · Area and Perimeter Playground
**Grade 3 · Math / geometry · 8:45 · garden** — design a playground: name quadrilaterals by their sides and corners, cover with unit squares for area, walk the edge for perimeter, and see that the same perimeter can hold different areas.
**Skills:** area_perimeter_3 · **Standard:** CCSS 3.G.A.1, 3.MD.C.5, 3.MD.C.6, 3.MD.C.7a, 3.MD.C.7b, 3.MD.C.7d, 3.MD.D.8

1. **Big idea**
   "Area is how many unit squares cover a shape; perimeter is the distance all the way around its edge."

2. **Learning goals**
   - I can name quadrilaterals by their sides and corners: a rectangle has 4 square corners, a rhombus has 4
     equal sides, and a square has both.
   - I can find area by counting unit squares and by multiplying rows × columns.
   - I can find perimeter by adding all the side lengths, and find a missing side.
   - I can tell whether a job needs area (covering) or perimeter (going around), and I know two shapes with the
     same perimeter can have different areas.

3. **Hook (first 15 s)**
   Fox unrolls a plan for a new toy playground: a play area 4 m by 5 m. Robo has ordered 18 fence pieces (each
   1 m) and 18 grass mats (each 1 m by 1 m): "Same number, done!" The fence fits perfectly. The mats leave two
   bare squares in the corner. Robo blinks (`feel` surprised). Fox: "Why did one fit and the other not? Let's
   build it and see."

4. **What makes it unique**
   Two jobs, two looks: area is green squares that `build` and `shade` across a flat `grid`; perimeter is a
   glowing dot that runs round the edge (`trace`) and counts each side unit. Sheep's pen puzzle is the twist:
   the same 12 fence pieces make three different pens with areas 5, 8 and 9. It is the only episode that `orbit`s
   round a finished 3D playground model.

5. **Cast and roles**
   - **Robo** (host, playground helper): orders the same number of mats and fence pieces; counts the border
     squares instead of the edge. Voice `soft`.
   - **Fox** (sidekick, playground designer): lays grids, checks corners with a corner tester, measures twice.
     Voice `squeaky`.
   - **Sheep** (guest, wants the grassiest pen): has exactly 12 fence pieces and wants the most grass to graze.
     Voice `deep`.
   - Lines use `say` with `who` (robo, fox, sheep). Characters stand outside the grid edges, never on it.

6. **Setting and look**
   `garden` stage, `soft_day`. A flat building site with a large `grid` lying on the ground (cell 0.5 m in the
   scene, called "1 metre" in the story). Playground pieces from the catalog: `sandbox`, `slide`, `swing`,
   `seesaw`, `bench`. Fence pieces are thin `plate` slabs with small `cylinder` posts. Grass mats are green
   `shade` on grid cells. A corner tester is a small square card (`plate`) with a 90° `angle` drawn on it.
   Camera: high top-down demonstration shots for grids (`shot` height 80), three-quarter for building, `orbit`
   at the end. Mood: sunny, building-site yellow and grass green.

7. **Storyline**

   | # | Chapter | Time | What happens | Teaching move | Emotional beat |
   |---|---|---|---|---|---|
   | 1 | Fox's playground plan | 0:00–0:35 (35 s) | 18 fence pieces fit; 18 mats don't | Question | Puzzled |
   | 2 | Playground shapes | 0:35–1:35 (60 s) | Quadrilaterals; corner tester; square, rectangle, rhombus | Build a model | Curious |
   | 3 | Area: cover it with squares | 1:35–2:50 (75 s) | Unit square; build the 4 × 5 area; count 20; rows × columns | Build a model + find the rule | Aha |
   | 4 | Perimeter: walk the edge | 2:50–3:55 (65 s) | Trace the edge; 4 + 5 + 4 + 5 = 18; metres vs square metres | Find the rule | Clear |
   | 5 | Robo's edge mix-up | 3:55–4:35 (40 s) | Border squares (8) vs edge units (12) on a 3 × 3 | Explain why | Funny, careful |
   | 6 | The Around-and-Inside chant | 4:35–5:00 (25 s) | Chant | Practise | Joy |
   | 7 | Sheep's pen puzzle | 5:00–6:15 (75 s) | 12 fence pieces: 1 × 5, 2 × 4, 3 × 3 | Find the rule | Wow |
   | 8 | Area or perimeter? | 6:15–6:55 (40 s) | Real jobs: carpet, ribbon, tiles, fence, painting a wall | Practise | Quick |
   | 9 | Challenge: Finish the Playground | 6:55–8:00 (65 s) | Sandbox, L-shaped splash pad, missing side | Check | Sharp |
   | 10 | Quiz and recap | 8:00–8:45 (45 s) | Five questions, recap, orbit of the playground | Check | Proud |

   Total: 525 s = 8:45.

   **Shapes (chapter 2)**: a quadrilateral has 4 sides. The corner tester fits every corner of a rectangle
   (4 square corners, also called right angles). A rhombus has 4 equal sides (the `diamond` shape) but its corners
   don't fit the tester. A square fits the tester and has 4 equal sides, so it is a rectangle and a rhombus.
   One more shape, a four-sided shape with no equal sides and no square corners, is still a quadrilateral but none
   of the three.

   **Numbers used (all checked)**

   | Moment | Shape | Area | Perimeter |
   |---|---|---|---|
   | Hook and ch 3–4 | play area 4 × 5 | 4 rows of 5 = 20 sq m (18 mats leave 2 bare) | 4 + 5 + 4 + 5 = 18 m (18 fence pieces fit) |
   | Ch 5 | 3 × 3 square | 9 sq m | 12 m (Robo's border-square count is 8) |
   | Ch 7 pen A | 1 × 5 | 5 sq m | 1 + 5 + 1 + 5 = 12 m |
   | Ch 7 pen B | 2 × 4 | 8 sq m | 2 + 4 + 2 + 4 = 12 m |
   | Ch 7 pen C | 3 × 3 | 9 sq m | 3 + 3 + 3 + 3 = 12 m |
   | Ch 9 sandbox | 3 × 4 | 12 sq m | 14 m |
   | Ch 9 splash pad (L-shape) | a 4 × 2 rectangle + a 2 × 2 square | 8 + 4 = 12 sq m | not asked |
   | Ch 9 missing side | rectangle, perimeter 10 m, one side 3 m | – | 3 + ? + 3 + ? = 10, so ? = 2 m |

   Robo's mix-up (chapter 5): he counts the squares touching the edge of a 3 × 3 square: 8. Fox traces the edge
   with the glowing dot and counts each side unit: 3 on each side, 12 in all. The corner squares touch two edges,
   so each corner square has 2 edge units.

   **Area or perimeter? (chapter 8)**: carpet for a floor (area), a ribbon round a picture frame (perimeter),
   tiles on a bathroom floor (area), a fence round a garden (perimeter), paint for a wall (area).

8. **Animation and staging list**

   | Moment | Objects | Actions | Camera |
   |---|---|---|---|
   | The plan | fox, plan card (`plate` upright with a small `grid`), robo | `pop` plan, `look` robo at fence pile | `shot` medium on Fox and the plan |
   | Fence and mats | fence pieces round a 4 × 5 outline, 18 mats | fence pieces `move` into place with `sound` block; mats `build` and two corner squares stay empty, `highlight` them | `shot` top-down, height 80 |
   | Shapes | `square`, `rectangle`, `diamond`, an irregular 4-sided shape (`plate` scaled and turned), corner tester with a 90° `angle` | tester `move`s to each corner, `mark` correct or incorrect per corner, `callout` "4 equal sides", "4 square corners" | Close top-down on each shape |
   | Unit square | one green square 1 × 1 | `pop`, `callout` "1 square metre" | Close |
   | Area by rows | `grid` g45 (rows 4, cols 5) | `build` order rows, `shade` green, `caption` count 5, 10, 15, 20, `subtitle` "4 × 5 = 20" | Top-down |
   | Perimeter | g45 | `trace` the edge, side numbers `pop` as the dot passes (4, 5, 4, 5), running total 18 | Top-down, then three-quarter |
   | Units | two labels | `callout` "m" on an edge, "sq m" on a square | Close |
   | Robo's mix-up | `grid` g33, border squares | `highlight` 8 border squares, `mark` incorrect, `trace` with count 1–12, `mark` correct | Top-down |
   | Sheep's pens | sheep, 12 fence pieces, three grids 1 × 5, 2 × 4, 3 × 3 | fence `move`s round each in turn, `shade` grass, `caption` area each, `feel` sheep happy at 3 × 3 | `shot` wide on all three pens, then close on each |
   | Area or perimeter cards | five cards with tiny scenes | `sound` windup_click, `callout` AREA or PERIMETER, `mark` | Medium |
   | Challenge | sandbox on g34, L-shape from two grids, rectangle with "?" side | `trace`, `shade`, missing side `pop`s | Top-down |
   | Finished playground | sandbox, slide, swing, seesaw, bench, fence, grass | `lights` warm, `burst` confetti, `clip` robo Jump | `orbit` 120° round the playground, 10 s |

9. **Experiment or hands-on activity**
   - **Sticky-note area:** cover a book's cover with sticky notes (or same-size paper squares) in rows. Count
     them, then check with rows × columns.
   - **String perimeter:** wrap a string round the same book, mark it, then lay it on a ruler. Add the four side
     lengths to check.
   - **Graph-paper pens:** draw all the rectangles with perimeter 12 squares. Which has the most area? (3 × 3.)
   - **Prediction:** "If two pens use the same fence, will they hold the same grass?"
   - **Safety:** scissors with a grown-up.

10. **Interaction moments**
    - Pause and guess (2–3 s, `windup_click`): "Will 18 mats cover it?"; "How many edge units on the 3 × 3?";
      "Which pen has the most grass?"
    - Call and response: Fox: "Covering inside?" Kids: "Area!" Fox: "Going around?" Kids: "Perimeter!"
    - Move-along: kids "paint" the area with a flat hand, then "walk" the perimeter with two fingers round a book.

11. **Song or chant**
    Original two-part chant: a stomping "around" part and a patting "inside" part. Hook line idea: "Walk around
    the edge, perimeter! Cover up the middle, area!" It plays in chapter 6 and once more before the challenge.

12. **Fun fact(s)**
    - "Perimeter" comes from two Greek words: "peri" (around) and "metron" (measure) (chapter 4).
    - Bees build honeycomb from six-sided cells that fit together with no gaps, just like square tiles cover a
      floor (chapter 3).

13. **Vocabulary and captions**
    Labels: quadrilateral, rectangle, square, rhombus, right angle (square corner), area, square unit, square
    metre (sq m), perimeter, side length. `count` captions for squares and edge units. `subtitle` for every
    calculation ("4 + 5 + 4 + 5 = 18 m", "4 × 5 = 20 sq m").

14. **Quiz and recap**
    1. A rectangle is 2 squares by 6 squares. What is its area? (12 square units)
    2. What is its perimeter? (2 + 6 + 2 + 6 = 16 units)
    3. You want a ribbon round a card. Area or perimeter? (Perimeter.)
    4. Is a square a rectangle? Why? (Yes: it has 4 sides and 4 square corners.)
    5. Two pens both have a perimeter of 12 m. Do they have the same area? (Not always: 2 × 4 has 8 sq m, 3 × 3
       has 9 sq m.)
    Recap: area covers (square units, rows × columns); perimeter goes around (add the sides); same perimeter,
    different areas; squares are rectangles and rhombuses. Praise: Sheep grazes happily in the 3 × 3 pen; Fox:
    "Measured twice, built once."

15. **Sound and music**
    Music `happy`, gain 0.20, dipping to 0.12 during counting. Voice 1.0. Effects: block (fence pieces),
    sprout_spring (grass squares), tick (each edge unit as the dot passes), windup_click (guesses), ding
    (correct), boing (Robo's mix-ups), crowd_cheer (playground opens).

16. **Thumbnail and YouTube**
    Designed thumbnails (`meta.thumbnails`):
    - **a "Area or Perimeter?"** (yellow title, top): a playground from above: a green grid area inside a bright
      orange glowing edge, the sandbox and slide on it; Fox on one side pointing at the green, Robo on the other
      pointing at the edge, puzzled.
    - **b "Same Fence?"** (white title, orange outline): three sheep pens side by side (long thin, medium, square),
      each labelled with its area; Sheep grinning in the square one.
    - **c "Build a Playground!"** (green title): the finished 3D playground at a low angle with the cast waving.
    Title idea: "Area and Perimeter Playground! Area and Perimeter for Kids | Grade 3 Math | Toy Box Friends".
    Tags: area and perimeter, area for kids, perimeter for kids, square units, rectangles, quadrilaterals, grade 3
    math, 3rd grade geometry, measurement for kids, Toy Box Friends.

17. **Catalog gaps**
    - Fence pieces: no fence model. Stand-in: thin white `plate` slabs 1 unit long with small `cylinder` posts; a
      `fence` prop that snaps along a grid edge would help G3-03 and later farm episodes.
    - Side-unit counter on `trace`: the dot runs the edge but numbers per unit must be popped by hand. Stand-in:
      `letter` numbers along each side with `pop` timed to the dot. A `count: true` option on `trace` would be the
      real fix.
    - Irregular quadrilateral: stand-in: two `triangle` shapes butted together.
    - L-shaped area: stand-in: two `grid`s placed edge to edge.

18. **Do and don't**
    - Do say the unit every time: metres for perimeter, square metres for area.
    - Do show the unit square before any counting.
    - Don't say area and perimeter are "the same thing measured two ways"; they measure different things.
    - Don't count border squares for perimeter; trace the edge.
    - Don't teach trapezoids or parallelograms by name (definitions differ between curricula); quadrilateral,
      rectangle, square and rhombus are enough.
    - Keep children on the playground safe in the story: no climbing on fences.

---

### G3-04 · Word Builder Workshop
**Grade 3 · English / vocabulary · 8:00 · classroom** — find the base word, add a prefix (un-, re-, pre-) or a suffix (-ful, -less, -er), and work out the new meaning.
**Skills:** prefixes_suffixes_3 · **Standard:** CCSS RF.3.3a, L.3.4b, L.3.4c

1. **Big idea**
   "A prefix goes at the front and a suffix goes at the end of a base word, and each one changes the meaning in a
   way you can learn."

2. **Learning goals**
   - I can find the base word, the prefix and the suffix in a longer word (un + help + ful).
   - I know what un- (not, the opposite of), re- (again) and pre- (before) mean.
   - I know what -ful (full of), -less (without) and -er (a person or thing that does something) mean.
   - I can use word parts to work out a new word, and spot words that only look like they have a prefix (uncle,
     real).

3. **Hook (first 15 s)**
   Robo finds a note pinned to Fox's workshop door: "The old glue is useless. The wet paint is unsafe to touch.
   Please help me repaint the door." Robo reads it slowly, then gasps: "Useless? Unsafe? Repaint? Fox is writing
   in secret code!" Fox pops out: "It's not code. They're word parts. Let's build them and see!"

4. **What makes it unique**
   The Word Builder bench: base words are blue blocks, prefixes green blocks that click on at the front and
   suffixes orange blocks that click on at the end (`move` + `clink`). Each new word triggers a little 3D
   demonstration of its meaning: the jug refills, the door is repainted a second coat, Robo walks carefully and
   then carelessly. The Fake Prefix Alarm rings when a word only looks like it has a prefix: pull "un" off
   "uncle" and the leftover "cle" isn't a word.

5. **Cast and roles**
   - **Robo** (host): reads the note as code, sticks a suffix on the front ("fulcare"), and tries to take "un"
     off "uncle". Voice `soft`.
   - **Fox** (sidekick, workshop builder): runs the Word Builder bench; "Let's build it and see!" Voice `squeaky`.
   - **Dog** (guest, the painter): shows painter (one who paints) and repaint (paint again), and is careful with
     wet paint. Voice `deep`.
   - Lines use `say` with `who` (robo, fox, dog). The bench and its word blocks are centre frame; characters
     stand at either end.

6. **Setting and look**
   `classroom` stage (chalkboard wall, wood floor) set up as Fox's workshop: a long `table` as the Word Builder
   bench, a pegboard on the chalkboard with three labelled bins: PREFIX (green), BASE WORD (blue), SUFFIX
   (orange). Word blocks are `letter` words on thin coloured `block`s (`group`s so the word and its block move
   together). A real door (`plate` upright with a knob) for the paint job. Camera: straight-on close for each
   word build (the whole word always in frame), medium for demonstrations, wide for the workshop. Mood: warm wood,
   clear green, blue and orange colour coding.

7. **Storyline**

   | # | Chapter | Time | What happens | Teaching move | Emotional beat |
   |---|---|---|---|---|---|
   | 1 | The secret code note | 0:00–0:35 (35 s) | Useless, unsafe, repaint | Question | Funny, curious |
   | 2 | Base words and word parts | 0:35–1:30 (55 s) | Base word, prefix, suffix; un + safe | Build a model | Aha |
   | 3 | The prefix bench: un-, re-, pre- | 1:30–3:00 (90 s) | Three prefixes with demonstrations | Build a model + find the rule | Confident |
   | 4 | The suffix bench: -ful, -less, -er | 3:00–4:20 (80 s) | careful / careless, useful / useless, painter | Find the rule | Clever |
   | 5 | The Word Builder chant | 4:20–4:45 (25 s) | Chant | Practise | Joy |
   | 6 | Double builds | 4:45–5:25 (40 s) | un + help + ful; peel the parts to find the meaning | Practise | Wow |
   | 7 | The Fake Prefix Alarm | 5:25–6:05 (40 s) | uncle, real, pretty | Explain why | Funny |
   | 8 | Challenge: Decode the Note | 6:05–7:20 (75 s) | Robo writes his own note; kids decode | Check | Sharp |
   | 9 | Quiz and recap | 7:20–8:00 (40 s) | Five questions, recap | Check | Proud |

   Total: 480 s = 8:00.

   **Word list (all real words, meanings checked)**

   | Part | Meaning | Words built | Demonstration on screen |
   |---|---|---|---|
   | un- | not, the opposite of | unsafe, unhappy, unkind, unfair, unlock | A sign "UNSAFE: wet paint" by the door; a padlock (stand-in) opens for unlock |
   | re- | again | repaint, refill, reread, rebuild | Dog paints a second coat; the `water_jug` water `grow`s back up; Fox rebuilds a block tower |
   | pre- | before | preheat, preview, pretest | A grown-up (Dog) turns on the toy `oven` before the cupcakes go in; "with a grown-up" caption |
   | -ful | full of | careful, helpful, useful, joyful | Robo carries a tower of cups slowly, every cup stays up |
   | -less | without | careless, useless, fearless, spotless | Robo rushes, cups wobble and tumble softly onto the rug (no breaking); the old glue doesn't stick |
   | -er | a person or thing that does | painter, builder, teacher, mixer | Dog with a brush: "painter"; Fox with a hammer: "builder" |

   **Double build (chapter 6)**: un + help + ful = unhelpful. Peel from the outside: helpful means full of help;
   unhelpful means not helpful. Then one base with two opposite suffixes: care + ful = careful (full of care) and
   care + less = careless (without care), side by side.

   **Fake Prefix Alarm (chapter 7)**: uncle (un + "cle": not a word), real (re + "al": not a word), pretty (pre
   + "tty": not a word). Fox's test: "Take the part off. Is what's left a real base word? If not, it's not a
   prefix here."

   **Challenge (chapter 8)**: Robo's note: "I will reread the book, be fearless on the slide, preview the
   movie, and be a helpful builder." Kids find each part and say each meaning: reread (read again), fearless
   (without fear), preview (see before), helpful (full of help), builder (a person who builds). One trick:
   "Is 'under' un + der?" (No.)

8. **Animation and staging list**

   | Moment | Objects | Actions | Camera |
   |---|---|---|---|
   | The note | door (`plate` upright), note (`plate` with three short `letter` lines) | `pop` note, `highlight` useless, unsafe, repaint in turn, `feel` robo surprised | `shot` medium on the door, then close on the note |
   | Word parts | bins PREFIX, BASE WORD, SUFFIX | `pop` labels, `callout` "front", "middle", "end" | Wide on the bench |
   | un + safe | blocks "un" (green), "safe" (blue) | `move` "un" to the front of "safe", `sound` clink, the word glows, `callout` "not safe" | Straight-on close |
   | Robo's fulcare | blocks "ful", "care" | `move` "ful" to the front, `mark` incorrect, `sound` boing, Fox moves it to the end, `mark` correct | Close |
   | re- demos | dog, door, `water_jug` | `paint` door from blue to yellow, then again (second coat), jug water `grow`s to full | `shot` medium on Dog and the door |
   | pre- demo | toy `oven`, `cupcake`s, dog | `highlight` oven light first, `caption` "with a grown-up", then cupcakes `move` in | Medium |
   | -ful / -less | robo, a tower of five `cup`s | slow `move` (careful, cups steady) then fast `move` with `wiggle` and the top cups `drop` softly onto the rug (careless) | `shot` medium, low angle |
   | -er | dog with brush (stand-in), fox with hammer (stand-in) | `callout` "painter: one who paints", "builder: one who builds" | Medium two-shot |
   | Double build | blocks "un", "help", "ful" | `move` in, then peel off one at a time with `callout` meanings | Straight-on close |
   | Fake Prefix Alarm | blocks "un" + "cle", "re" + "al", "pre" + "tty", alarm light (red `sphere`) | pull off the prefix, leftover block gets `mark` incorrect, alarm light `highlight` pulses (gentle, under 2 Hz), `sound` bell | Close |
   | Decode the note | Robo's note, blocks | `sound` windup_click, parts `move` apart, `callout` meanings | Straight-on, whole sentence in frame |
   | Goodbye | finished door, the cast | `burst` confetti, `clip` robo Wave | Wide, `orbit` 30° |

9. **Experiment or hands-on activity**
   - **Word part cards:** write un, re, pre on green paper and ful, less, er on orange paper. Write base words
     on blue: help, care, paint, fill, kind, play, use. Make as many real words as you can and act one out.
   - **Word part hunt:** look for prefixes and suffixes on a cereal box, a book cover or signs on a walk with a
     grown-up ("reusable bag", "careful").
   - **Fake test:** try the leftover test on uncle, real, under and reach.
   - **Prediction:** "What do you think 'replay' means before we build it?"
   - **Safety:** "preheat" is a job for a grown-up; children don't use the oven alone (said with the demo).

10. **Interaction moments**
    - Pause and guess (2–3 s, `windup_click`): "What does unsafe mean?"; "Front or end?"; "Is uncle un + cle?"
    - Call and response: Fox: "re-?" Kids: "Again!" Fox: "-less?" Kids: "Without!"
    - Move-along: kids hold up their left hand for a prefix (front), right hand for a suffix (end) as each word is
      built.

11. **Song or chant**
    Original workbench chant with a hammer tap on each beat. Hook line idea: "Prefix at the front, suffix at the
    end, base word in the middle is your best friend!" It plays in chapter 5 and, shortened, after the double
    build.

12. **Fun fact(s)**
    - The word "prefix" has a prefix itself: pre- (before) + fix (to attach), something fixed on before the word
      (chapter 3).
    - Many English prefixes, like re- and pre-, come from Latin, while un- comes from Old English (chapter 3).

13. **Vocabulary and captions**
    Labels: base word, prefix, suffix, un-, re-, pre-, -ful, -less, -er, meaning. Every built word appears as a
    `callout` with its meaning ("refill: fill again"). Colour code kept everywhere: green prefixes, blue base words,
    orange suffixes.

14. **Quiz and recap**
    1. What does "reread" mean? (Read again.)
    2. What does "fearless" mean? (Without fear.)
    3. Which word means "not fair"? (Unfair.)
    4. What is the base word in "preheat"? In "helpful"? (heat; help)
    5. Does "uncle" have the prefix un-? (No; "cle" is not a word.)
    Recap: base word in the middle; prefixes at the front (un- not, re- again, pre- before); suffixes at the end
    (-ful full of, -less without, -er one who); check the leftover is a real word. Praise: the door is finished
    and Dog hangs a sign "Wonderful work"; Fox: "Built, checked, beautiful."

15. **Sound and music**
    Music `playful`, gain 0.20, dipping to 0.12 while words are built. Voice 1.0. Effects: clink (blocks click),
    pop (meanings), bell (Fake Prefix Alarm, soft), windup_click (guesses), ding (right), boing (Robo's errors),
    crowd_cheer (end).

16. **Thumbnail and YouTube**
    Designed thumbnails (`meta.thumbnails`):
    - **a "UN + HAPPY"** (white title, green and blue blocks): giant green "un" block clicking onto a blue "happy"
      block, with a cartoon spark where they join; Robo on the right making a sad face to match; warm workshop.
    - **b "Word Builder!"** (yellow title): Fox in front of the bench holding up an orange "-ful" block, proud
      grin; colour-coded bins behind.
    - **c "re-? -less?"** (orange title): two big question-mark blocks with "re" and "less", Robo puzzled in the
      middle.
    Title idea: "Word Builder Workshop! Prefixes and Suffixes for Kids | un, re, pre, ful, less, er | Grade 3
    Reading | Toy Box Friends". Tags: prefixes and suffixes, prefixes for kids, suffixes for kids, base words,
    word parts, vocabulary for kids, grade 3 reading, 3rd grade ELA, root words, Toy Box Friends.

17. **Catalog gaps**
    - Word blocks that snap together: no "word tile" kind. Stand-in: a `group` of a coloured `block` and a
      `letter` word; `move` groups so their ends touch. A `tile` kind (word on a block with automatic width)
      would make word-building episodes much easier.
    - Paintbrush and hammer: stand-in: a `cylinder` handle with a small `box` head (brush tip in the paint colour).
    - Padlock for "unlock": stand-in: a `box` body with a `torus` shackle that `turn`s open.

18. **Do and don't**
    - Do show every word as parts first, then the whole word, then the meaning picture.
    - Do write spoken prefixes so the voice says them right: write "ree" for re- and "pree" for pre- in the `say`
      text if Piper reads "re" as a letter name; check each one in a review render.
    - Don't use -er meaning "more" (taller) in this episode; keep -er as "a person or thing that does".
    - Don't use words whose spelling changes when a suffix is added (happy → happiness, beauty → beautiful).
    - Don't use the oven without a grown-up on screen; cups fall softly on the rug and never break.
    - Keep this separate from phonics: no `ph_*` sound cues are needed here.

---

### G3-05 · Life Cycles: frog, butterfly, bean
**Grade 3 · Science · 8:50 · pond** — model and compare the life cycles of a frog, a butterfly and a bean plant: all start, grow, make young and the cycle repeats, but each changes in its own way.
**Skills:** life_cycles_3 · **Standard:** NGSS 3-LS1-1

1. **Big idea**
   "Every living thing has a life cycle: it starts life, grows, makes young, and the cycle goes round again,
   but each kind changes in its own way."

2. **Learning goals**
   - I can put a frog's life cycle in order: egg, tadpole, froglet, adult frog.
   - I can put a butterfly's life cycle in order: egg, caterpillar (larva), chrysalis (pupa), adult butterfly,
     and I know four very different stages is called complete metamorphosis.
   - I can describe a bean plant's life cycle: seed, sprout, young plant, flowering plant, pods with new seeds.
   - I can compare life cycles: all start, grow, make young and die, but some change shape a lot and some just
     grow bigger.

3. **Hook (first 15 s)**
   Fox's nature table by the pond holds three little jars: one with a wriggly tadpole in pond water, one with a
   stripy caterpillar on a leaf, one with a bean seed on damp paper. Robo guesses: "That's a baby fish. That's
   a baby snake. And that's a little rock." Fox laughs: "Not even close. Let's watch them grow and see!"

4. **What makes it unique**
   It is the series' first time-lapse of three life cycles side by side, built as three life-cycle wheels (stages
   in a circle joined by curved `pointer`s) that end up next to each other for comparing. A cutaway bean seed
   opens to show the tiny baby plant and its stored food. The butterfly chapter teaches the real word "chrysalis"
   and why it is not a cocoon. Robo's wrong guesses become the "before" side of a before-and-after board.

5. **Cast and roles**
   - **Robo** (host and time-lapse clock): makes the wrong guesses, mixes up the butterfly order once, and notices
     "Robots don't have a life cycle; we're not alive!" Voice `soft`.
   - **Fox** (sidekick, nature notebook keeper): measures the bean plant, draws each stage, builds the wheels.
     Voice `squeaky`.
   - **Frog** (guest, no lines): the adult stage of the frog wheel. He sits by the water when the frogspawn is
     shown, nods when "his" tadpole stage appears, and reacts with `feel`.
   - **Butterfly** (critter, no lines): the adult butterfly stage; it flutters to the milkweed to lay an egg,
     closing the loop.
   - Lines use `say` with `who` (robo, fox). The wheels are centre frame; characters stand outside them.

6. **Setting and look**
   `pond` stage (water, reeds), `soft_day`, with a garden patch on the bank: a milkweed plant (stand-in: the
   `plant` prop recoloured) and a bean row. All three cycles happen in one place, so no stage change is needed.
   Life-cycle models from `catalog/models/batch3.json` (frog eggs, tadpole, froglet, caterpillar, chrysalis, bean
   sprout stages) plus `frog`, `butterfly`, `seed`, `sprout`, `seedling`, `plant`, `flowering_plant`. A week counter
   (`number_block`) on the nature table. Camera: close-ups for each stage (`shot` close), an underwater-level shot
   for tadpoles, a slow `orbit` round each finished wheel, wide for the comparison. Mood: fresh, calm, natural
   greens and pond blues.

7. **Storyline**

   | # | Chapter | Time | What happens | Teaching move | Emotional beat |
   |---|---|---|---|---|---|
   | 1 | Three mystery babies | 0:00–0:35 (35 s) | Tadpole, caterpillar, seed; Robo's guesses | Question | Funny, curious |
   | 2 | What is a life cycle? | 0:35–1:20 (45 s) | Start, grow, make young, repeat: a circle | Build a model | Thoughtful |
   | 3 | The frog's cycle | 1:20–2:50 (90 s) | Eggs in water → tadpole → legs → froglet → adult | Build a model | Wonder |
   | 4 | The butterfly's cycle | 2:50–4:30 (100 s) | Egg on a leaf → caterpillar → chrysalis → adult | Build a model + find the rule | Amazement |
   | 5 | The Life Cycle chant | 4:30–4:55 (25 s) | Chant | Practise | Joy |
   | 6 | The bean's cycle | 4:55–6:15 (80 s) | Seed cutaway → root → sprout → plant → flower → pods → seeds | Build a model | Calm, aha |
   | 7 | Compare the cycles | 6:15–7:20 (65 s) | Three wheels side by side; same and different | Find the rule | Clever |
   | 8 | Challenge: What comes next? | 7:20–8:10 (50 s) | Five stage puzzles | Check | Sharp |
   | 9 | Quiz and recap | 8:10–8:50 (40 s) | Five questions, recap, goodbye | Check | Proud |

   Total: 530 s = 8:50.

   **The frog (chapter 3, facts checked)**

   | Stage | What it looks like and does | About how long |
   |---|---|---|
   | Eggs (frogspawn) | Adult frogs lay eggs in water: a clump of tiny dark eggs in clear jelly | about 1–3 weeks before hatching (depends on warmth) |
   | Tadpole | Lives in water, swims with a tail, breathes with gills, eats tiny water plants | several weeks |
   | Tadpole with legs | Back legs grow first, then front legs | a few weeks |
   | Froglet | Four legs and a shrinking tail; lungs now breathe air; can leave the water | a few weeks |
   | Adult frog | No tail; lives on land and in water; lays eggs in water and the cycle starts again | – |
   Egg to froglet takes about 3–4 months for many frogs (it varies by kind and by how warm the water is).

   **The butterfly (chapter 4, a monarch, facts checked)**

   | Stage | What it looks like and does | About how long |
   |---|---|---|
   | Egg | A female lays tiny eggs one at a time on milkweed leaves | about 4 days |
   | Caterpillar (larva) | Hatches, eats its eggshell, then milkweed leaves; grows fast and sheds its skin several times | about 2 weeks |
   | Chrysalis (pupa) | Hangs from a leaf or twig; green with gold dots; inside, the caterpillar's body changes into a butterfly's body | about 10 days |
   | Adult butterfly | Comes out with crumpled wings, pumps them open and lets them dry; drinks nectar; lays eggs | a few weeks in summer |
   Four stages that look completely different from each other: complete metamorphosis. A butterfly makes a
   chrysalis; a moth caterpillar spins a silk cocoon. The adult does not grow any bigger.

   **The bean (chapter 6, facts checked)**
   - Cutaway seed: a seed coat outside; inside, a tiny baby plant and stored food that feeds it until it has
     leaves.
   - With water, air and warmth the seed sprouts (germinates). The root grows out first and goes down; then the
     shoot pushes up. A seed does not need light to sprout (callback to G2-07), but the young plant needs light
     to grow.
   - The young plant grows leaves, then flowers. The flowers become green bean pods, and each pod holds new
     seeds. From seed to new pods takes about two months for a bush bean.
   - At the end of the season the old plant dries up and dies, and its seeds can start new plants.

   **Compare (chapter 7)**

   | | Frog | Butterfly | Bean plant |
   |---|---|---|---|
   | Starts as | an egg in water | an egg on a leaf | a seed in soil |
   | Does the young look like the adult? | No (tadpole) | No (caterpillar) | Partly (a small plant without flowers) |
   | Big change of body shape? | Yes: metamorphosis | Yes: complete metamorphosis, 4 stages | No: it grows and adds parts |
   | Makes young by | laying eggs | laying eggs | making seeds in pods |
   All three: start life, grow, make young, and die at the end of their life, while their young carry the cycle
   on. Robo adds: "Robots don't grow or have young, so we don't have a life cycle." Fox: "And you grow too, but
   you don't change shape like a tadpole."

   **Challenge (chapter 8)**: (a) a tadpole with back legs: what's next? (front legs, then a froglet).
   (b) a caterpillar: what's next? (chrysalis). (c) a flower on a bean plant: what's next? (a pod with seeds).
   (d) fix Robo's order: egg, chrysalis, caterpillar, adult (egg, caterpillar, chrysalis, adult). (e) Which of
   the three does not go through metamorphosis? (the bean plant).

8. **Animation and staging list**

   | Moment | Objects | Actions | Camera |
   |---|---|---|---|
   | Three jars | three `jar`s (batch 3), tadpole, caterpillar on a `leaf`, bean `seed` | `pop` each, robo's guesses as `callout`s on a "Before" board, `feel` fox happy | `shot` medium on the nature table, then close on each jar |
   | What is a life cycle? | four `sphere` markers in a circle, curved `pointer`s with `bend` | `draw` pointers round the circle, `callout` "start", "grow", "make young", "repeat" | `shot` straight-on |
   | Frogspawn | frog eggs model in the water, frog (adult) at the edge | `show` eggs, `highlight`, `caption` "eggs in water", week counter `pop` | Low shot at the water line |
   | Tadpoles hatch | tadpole models | `hide` eggs, `show` tadpoles, tails `wiggle`, `callout` "gills", "tail" | `shot` close, under the water surface |
   | Legs grow | tadpole + two small `capsule` back legs, then front legs | `grow` legs from 0, week counter `pop` | Close |
   | Froglet | froglet model | `show`, tail `grow` to 0.4 (shrinks), it climbs onto a `lily_pad` | Close, then medium |
   | Adult frog | `frog` critter | `hop` onto the bank, `feel` happy; wheel completes back to eggs | `orbit` 60° round the frog wheel |
   | Butterfly egg | milkweed (`plant` recoloured), a tiny cream `sphere` under a leaf | `move` the butterfly in, egg `pop`s, `grow` close-up with `callout` "egg on a milkweed leaf" | `shot` close on the leaf |
   | Caterpillar | caterpillar model | `show`, eats (`wiggle`, a leaf `grow`s smaller), `grow` 1.3× in three steps with a `pop` each (sheds its skin), `callout` "larva" | Close, slow push-in |
   | Chrysalis | chrysalis model hanging from a twig | `show` as the caterpillar `hide`s, soft `highlight` glow, `callout` "chrysalis (pupa)", then a "not a cocoon" card with a moth cocoon sketch (`capsule` in white) | `shot` close, height 10 |
   | Adult emerges | `butterfly` critter | `grow` wings from 0.4 to 1 (crumpled to open) slowly, then flutters to a `flower`, `callout` "adult" | Close, then medium |
   | Complete metamorphosis | four stage models in a row | `highlight` each in turn, `subtitle` "4 different-looking stages" | `shot` wide on the row |
   | Bean cutaway | a big bean (two `dome` halves in cream) with a small green `leaf` shape and a pale food part inside | halves `move` apart, `callout` "seed coat", "baby plant", "stored food" | `shot` close, straight-on |
   | Bean grows | `seed` → `sprout` → `seedling` → `plant` → `flowering_plant`, pods (green `capsule`s) | swap each stage with `pop`, root (`cylinder`) `grow`s down first in a cutaway pot, week counter, Fox's ruler `move`s up beside it | Slow push-in over the time-lapse |
   | Pods and seeds | pod opens (two `capsule` halves) to show 4–5 bean seeds | `move` halves apart, `highlight` seeds | Close |
   | Compare wheels | the three wheels | `move` the three wheels side by side, `highlight` matching stages ("start" in each), `callout` table rows | `shot` wide on all three, then medium on each |
   | Challenge | stage cards | `sound` windup_click, `pop` answer, `mark` | Medium |
   | Goodbye | butterfly, frog, bean plant | butterfly flutters over the pond, `clip` robo Wave, `burst` bubbles | Wide, slow pull back |

9. **Experiment or hands-on activity**
   - **Bean in a jar:** fold a paper towel inside a clear jar, wet it, and slide a dried bean between the towel
     and the glass. Keep it damp and warm. Watch the root come out first, then the shoot. Measure the shoot each
     day and draw it.
   - **Prediction:** "Which comes out first, the root or the shoot?" (The root.)
   - **Watch, don't take:** look at tadpoles or caterpillars outdoors or in a school kit with a grown-up. Leave
     frogspawn and tadpoles in their pond.
   - **Safety:** wash your hands after touching soil, seeds or pond water. Don't eat dried beans from the jar
     (raw dried beans can make you ill). A grown-up goes with you near any pond; stay back from deep water.

10. **Interaction moments**
    - Pause and guess (2–3 s, `windup_click`): "What will the tadpole grow next, back legs or front legs?";
      "What comes out of the chrysalis?"; "Root or shoot first?"
    - Call and response: Fox: "Egg!" Kids: "Caterpillar!" Fox: "Chrysalis!" Kids: "Butterfly!"
    - Move-along: kids curl up small (egg), wiggle (caterpillar), hold still (chrysalis), open their arms wide
      (butterfly).

11. **Song or chant**
    Original circle chant, slow and steady like turning a wheel. Hook line idea: "Start and grow, make young
    and go, round and round the life cycle flows!" It plays in chapter 5 and closes chapter 7 over the three
    wheels.

12. **Fun fact(s)**
    - A monarch caterpillar's first meal is usually its own eggshell (chapter 4).
    - Tadpoles breathe with gills like fish; adult frogs breathe with lungs and can also take in air through
      their skin (chapter 3).
    - Monarch butterflies that hatch in late summer can live for months and fly thousands of kilometres to
      spend the winter in Mexico (chapter 7).

13. **Vocabulary and captions**
    Labels: life cycle, egg, frogspawn, tadpole, gills, froglet, adult, caterpillar, larva, chrysalis, pupa,
    metamorphosis, complete metamorphosis, seed, seed coat, germinate, sprout, root, shoot, flower, pod. Week
    counter with `count` style ("Week 1" ...). `subtitle` for each stage name as it appears.

14. **Quiz and recap**
    1. Where does a frog lay its eggs? (In water.)
    2. What is the stage between caterpillar and adult butterfly? (The chrysalis, or pupa.)
    3. What grows out of a bean seed first? (The root.)
    4. Name one thing all three life cycles share. (They start life, grow, make young, and the cycle repeats.)
    5. Does a caterpillar become a butterfly inside a cocoon? (No: butterflies make a chrysalis; moths spin
       cocoons.)
    Recap: frog: egg, tadpole, froglet, adult; butterfly: egg, caterpillar, chrysalis, adult (complete
    metamorphosis); bean: seed, sprout, plant, flower, pod with seeds; all start, grow, make young and the cycle
    goes on. Praise: the "Before" board flips to "After" with every guess fixed; Fox: "Watched it, measured it,
    learned it."

15. **Sound and music**
    Music `calm`, gain 0.18 throughout, `playful` 0.20 for the chant and challenge. Voice 1.0. Effects:
    bubble_pop (tadpoles), sprout_spring (bean stages), magic_sparkle (wings open, soft), splash (frog hop, gentle),
    windup_click (guesses), ding (correct), crowd_cheer (end, soft). No scary sounds in the chrysalis close-up.

16. **Thumbnail and YouTube**
    Designed thumbnails (`meta.thumbnails`):
    - **a "LIFE CYCLES!"** (yellow title, top): three small wheels in a row: frog, butterfly and bean, each with
      its stages joined by curved arrows; Fox in the middle holding his notebook, delighted.
    - **b "Egg to Butterfly"** (white title, purple outline): a big close-up of a green chrysalis with gold dots
      and a butterfly just opening its wings beside it; Robo amazed in the corner.
    - **c "Tadpole to Frog"** (green title on a pond-blue background): a tadpole, a froglet and an adult frog
      lined up on lily pads, getting bigger left to right, Frog smiling.
    Title idea: "Life Cycles for Kids! Frog, Butterfly and Bean Plant | Metamorphosis | Grade 3 Science | Toy
    Box Friends". Tags: life cycles for kids, frog life cycle, butterfly life cycle, plant life cycle,
    metamorphosis, complete metamorphosis, tadpole to frog, caterpillar to butterfly, grade 3 science, 3rd grade
    science, Toy Box Friends.

17. **Catalog gaps** (beyond the batch 3 life-cycle models)
    - Tadpole with back legs (between tadpole and froglet): stand-in: the tadpole model with two small `capsule`
      legs parented on and `grow`n from 0.
    - Butterfly egg: stand-in: a tiny cream `sphere` under a leaf.
    - Milkweed: stand-in: the `plant` prop with `recolor` to a pale sage green and a cluster of small pink
      `sphere`s as flowers.
    - Bean seed cutaway (seed coat, baby plant, stored food): stand-in: two cream `dome` halves with a small green
      `leaf` and a pale yellow `half_circle` inside. A real cutaway model would serve later seed episodes.
    - Bean pods: stand-in: green `capsule`s that open as two halves with small `sphere` seeds inside.
    - Crumpled wings opening: the `butterfly` critter's wings can `grow` from small, but there is no crumple; the
      slow grow is fine.

18. **Do and don't**
    - Do say frogs lay eggs in water and butterflies lay eggs on leaves; don't show a butterfly egg in water.
    - Do say "chrysalis" for butterflies; don't say "cocoon" for a butterfly.
    - Don't say the caterpillar "grows wings in its sleep" or is "dead" inside; say its body is changing.
    - Don't call the frog's change "complete metamorphosis" (that term is for insects like butterflies); say
      "metamorphosis".
    - Don't say bean flowers need bees (garden beans mostly pollinate themselves); just say the flowers become
      pods.
    - Mention death gently and once, as the end of a cycle that goes on through young; no sad scenes.
    - Keep habitats (G2-08) and food chains (G5-05) out; this episode is about how living things change.
