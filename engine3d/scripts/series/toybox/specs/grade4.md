# Grade 4 video specs (G4-01 to G4-05)

These five specs are the grade 4 part of batch 3 of "Toy Box Friends" (ages 9–10, 7–9 minutes each). Every
episode follows the grade 4 pattern from [batch3.md](batch3.md): a puzzle → model it two ways → explain → apply
→ check. Robo hosts and sometimes gets things wrong on purpose. **Owl** (`owl`) is the grade 4 sidekick: the
careful explainer with a notebook who loves the word "evidence". At most one or two guests per episode, each
with one job. Each spec uses the 18-heading template in [README.md](README.md), stays inside its lane (see
"Kept apart" in batch3.md) and designs with the batch 3 building blocks (`number_line`, `fraction_bar`,
`fraction_circle`, `grid`, `angle`, `pointer`, `callout`, `build`, `shade`, `leap`, `draw`, `open`, `mark`,
`highlight`, `look`, `shot`, `orbit`, `who` lip-sync, the `classroom`, `lab`, `forest` and `pond` stages and the
planned `catalog/models/batch3.json` models). Anything still missing is under **Catalog gaps** with a stand-in.
All arithmetic, angles and facts below were checked. Specs have no final dialogue and no JSON.

| Id | Title | Subject | Hook style | Unique twist | Length |
|---|---|---|---|---|---|
| G4-01 | Equivalent Fractions Bakery | Math / fractions | Two customers think they were served different amounts | The Slicer cuts every piece again: the cake never changes, only its name | 8:40 |
| G4-02 | Tenths Track: decimals | Math / decimals | Robo builds a 15-metre track for a 1.5-metre race | Turtle races on a number line where ten tenths "click" into one whole | 8:35 |
| G4-03 | Angle Explorers | Math / geometry | Long arms or short arms: which angle is bigger? | Angles are turns: a door, a clock and a skating Bunny turn to measure | 8:45 |
| G4-04 | Spinning Earth: day, night, year and seasons | Science / space | "Is the Sun moving, or are we?" | A tilted globe and a sun lamp; Penguin's summer in December busts the distance myth | 8:40 |
| G4-05 | Chain Reaction: cause and effect | English / reading | A domino run rings a bell: what caused it? | Every sentence becomes a domino chain; the "lucky socks trap" (before is not always because) | 8:35 |

Notes for all five:

- `meta.audience: "grade4"`, `meta.voice: "soft"` for Robo, `voiceSpeed` 1.0. Owl speaks in `deep` in every grade 4
  episode; guests use `squeaky`. Every line is a `say` with `who` (the speaker's id) so mouths move. No `bark`.
- Sentences up to 18 words. One idea per beat; let a demonstration finish before the next line.
- Pause and guess: 2–3 s with `windup_click`, then the answer with a visual check (`mark` correct or incorrect),
  then praise.
- Camera: open each chapter with a `shot` (`wide` to place everything, `medium` to explain, `close` for the
  detail), and use `orbit` only on 3D models. Characters stand to the side of the teaching object, never in
  front of it (`look` turns their heads toward it). No chapter keeps one static camera for its whole length.
- Every chapter is 10 s or more; chapter timings add up to the length in the table. Thumbnails are designed
  scenes (`meta.thumbnails`), never a video frame.

---

### G4-01 · Equivalent Fractions Bakery
**Grade 4 · Math / fractions · 8:40 · classroom** — fractions with different names can be the same amount: cut every piece into the same number of smaller pieces and the top and bottom numbers both multiply.
**Skills:** equivalent_fractions_4 · **Standard:** CCSS 4.NF.A.1, 4.NF.A.2

1. **Big idea**
   "1/2, 2/4 and 4/8 are the same amount with different names: more pieces, smaller pieces, same cake."

2. **Learning goals**
   - I can show that 1/2 = 2/4 = 4/8 with fraction bars of the same whole.
   - I can make an equivalent fraction by multiplying the top and bottom by the same number, and explain why.
   - I can show equivalent fractions land on the same point of a number line.
   - I can use equivalent fractions to compare two fractions (3/4 and 5/8).

3. **Hook (first 15 s)**
   Robo's Bakery counter. Mouse orders "half a cake bar" and gets one big piece. Squirrel orders "four eighths"
   and gets four small pieces. Squirrel looks at Mouse's plate, then at his own: "Four pieces! I got more!"
   Mouse: "No, mine is bigger!" Owl opens her notebook: "Let's look at the evidence."

4. **What makes it unique**
   The Slicer: a friendly machine (no blades shown) that cuts every piece of a bar into 2 or 3 equal pieces at
   once. The shaded amount never changes while the numbers double or triple, so children see "the amount stays,
   only the name changes" happen. Robo's "add one to both" mistake is tested with real bars and fails on screen.

5. **Cast and roles**
   - **Robo** (host and baker): runs the Slicer; makes the "add 1 to top and bottom" mistake (1/2 → 2/3).
   - **Owl** (sidekick, `deep`): checks every claim against the bars; writes the rule in her notebook.
   - **Mouse** (guest, `squeaky`): ordered 1/2; later places practice orders.
   - **Squirrel** (guest, `squeaky`, few lines): ordered 4/8; sees the two plates match.

6. **Setting and look**
   Classroom stage set up as a bakery: a counter (table) in front of the chalkboard wall, plates, a long
   cake-bar tray, the Slicer (a box with a window and a lever) on the right. Light `soft_day`. Teaching objects
   are bars laid on the counter edge facing camera, and later standing upright on the chalkboard as a fraction
   wall. Warm creams, strawberry pink for shaded parts, chocolate brown trim. Calm, cosy, curious.

7. **Storyline**

   | # | Chapter | Time | What happens | Teaching move | Emotional beat |
   |---|---|---|---|---|---|
   | 1 | Two orders, one argument | 0:00–0:30 (30 s) | Mouse's 1/2 vs Squirrel's 4/8 | Hook | Puzzled |
   | 2 | Same whole, equal parts | 0:30–1:15 (45 s) | A whole bar; 1/2 means 1 of 2 equal parts of this whole | Teach (review) | Settling |
   | 3 | The Slicer | 1:15–2:45 (90 s) | 1/2 → 2/4 → 4/8; then 1/3 → 2/6 → 3/9 by slicing into 3 | Show (model one) | Wonder |
   | 4 | Why it works: the times rule | 2:45–4:00 (75 s) | Twice as many pieces, each half as big; multiply top and bottom by the same number | Explain | Aha |
   | 5 | Robo's shortcut | 4:00–4:45 (45 s) | "Add 1 to both": 1/2 → 2/3; bars disagree | Explain (misconception) | Funny, then clear |
   | 6 | The fraction wall and the number line | 4:45–5:50 (65 s) | A wall of halves, quarters, eighths, thirds, sixths; equivalents share one point | Show (model two) | Satisfying |
   | 7 | The Same-Cake chant | 5:50–6:15 (25 s) | Chant | Practise | Joy |
   | 8 | Bakery rush | 6:15–7:15 (60 s) | Four orders with a missing number | Apply | Busy fun |
   | 9 | Challenge: which is more? | 7:15–7:50 (35 s) | 3/4 or 5/8? Rename to eighths | Challenge | Clever |
   | 10 | Quiz and recap | 7:50–8:25 (35 s) | Four questions, recap card | Check | Proud |
   | 11 | Your turn: paper strips | 8:25–8:40 (15 s) | Home activity, goodbye | Praise | Inspired |

   Total: 520 s = 8:40.

   **Chapter 2 (same whole):** two bars, one 1 m long and one 0.5 m long, each with half shaded. Owl: "Are these
   the same amount?" No: halves of different wholes are not equal. Every bar from now on is the same 1 m whole.

   **The Slicer (chapter 3)**, one bar of 1 m with 1 of 2 parts shaded:
   | Pass | Bar | Name | Shaded length |
   |---|---|---|---|
   | Start | 2 parts, 1 shaded | 1/2 | 0.5 m |
   | Slice each part in 2 | 4 parts, 2 shaded | 2/4 | 0.5 m |
   | Slice each part in 2 again | 8 parts, 4 shaded | 4/8 | 0.5 m |
   Then a new bar: 1/3, slice each part in 2 → 2/6, start again and slice 1/3 into 3 → 3/9. Mouse's and
   Squirrel's plates slide side by side: same length. Both are happy.

   **The times rule (chapter 4):** slicing every piece into 2 makes 2 times as many pieces in the whole (the
   bottom number doubles) and 2 times as many shaded pieces (the top doubles). Each piece is half as big, so the
   amount stays the same. Written: 1/2 = (1 × 2)/(2 × 2) = 2/4. Examples: 3/4 = 6/8; 2/3 = 8/12 (slice into 4);
   2/5 = 4/10. Going back (simplest name): 8/12 → 2/3 by dividing top and bottom by 4, shown as the Slicer
   "un-slicing" (pieces join back in groups of 4).

   **Robo's shortcut (chapter 5):** 1/2 → add 1 to both → 2/3. Bars of 1/2 and 2/3 side by side: 2/3 is longer,
   `mark` incorrect. Owl: "Adding the same number changes the amount. Multiplying keeps it." A second test:
   3/4 → 4/5 (also longer, also incorrect).

   **Fraction wall (chapter 6):** rows: 1 whole, halves, thirds, quarters, sixths, eighths, all 1 m. A
   `highlight` line drops straight down from the end of 1/2 and touches 2/4 and 4/8 (and 3/6), but not any
   third. Then a `number_line` from 0 to 1 with `minor` 8: Mouse `leap`s to 1/2, Squirrel to 4/8, and they land
   on the same spot. 2/3 and 4/6 are also shown landing together.

   **Bakery rush (chapter 8):** 3/4 = ?/8 (6); 2/5 = ?/10 (4); 1/3 = ?/6 (2); 6/12 = 1/? (2). Each order: pause,
   then the Slicer proves it.

   **Challenge (chapter 9):** 3/4 or 5/8? Rename 3/4 as 6/8. 6/8 is more than 5/8, so 3/4 is more. Bars confirm.
   Second, quicker: 2/3 or 5/6? 2/3 = 4/6, so 5/6 is more.

8. **Animation and staging list**

   | Moment | Objects | Actions | Camera |
   |---|---|---|---|
   | Two orders | robo, mouse, squirrel, two plates, cake pieces (fraction_bar parts) | `show`, `say` with `who`, `feel` squirrel surprised, mouse worried | `shot` wide on the counter, then `shot` close on the two plates |
   | Owl's notebook | owl, book prop | `feel` owl happy, `look` owl at plates | `shot` medium on owl and plates |
   | Same whole? | bar_long (fraction_bar 2 parts, length 1), bar_short (length 0.5) | `shade` each to 1, `mark` incorrect between them (not equal) | `shot` medium, straight on |
   | The Slicer | slicer (box + lever part), bar_a (fraction_bar parts 2 → 4 → 8) | bar `move` into the slicer window, lever `turn`, `sound` whoosh + ding, swap to the next bar (`hide`/`show` at the same place), `callout` "2/4" | `shot` close on the bar; `camera` slow push-in on the second pass |
   | Shaded length stays | a `highlight` bracket (thin plate) over the shaded part | `highlight` the shaded part on each pass | `shot` close |
   | Thirds | bar_t (3 → 6, then 3 → 9) | as above | `shot` medium |
   | Plates match | two plates | `move` side by side, mouse and squirrel `hop`, `feel` happy | `shot` medium |
   | Times rule | letters "1 × 2", "2 × 2", "= 2/4" on the chalkboard | `pop` letters in order, `highlight` the two "× 2" | `shot` medium on the chalkboard |
   | Un-slicing | bar 8/12 → 2/3 | `hide` the 12-part bar, `show` the 3-part bar in place, `sound` clink | `shot` close |
   | Robo's shortcut | bar 1/2, bar 2/3 | `shade`, `mark` incorrect on the 2/3 bar, robo `clip` No, `feel` surprised | `shot` close on both bars |
   | Fraction wall | 6 fraction_bars stacked upright on the board | `build` each row (`order: items`), `highlight` the 1/2 drop line | `shot` wide on the wall, then `shot` close on the drop line |
   | Number line | number_line 0–1, minor 8, labels fractions; mouse, squirrel | `draw` line, `leap` mouse to 0.5, `leap` squirrel to 0.5 | `shot` medium; side `yaw` 20 |
   | Chant | everyone | `wiggle`, `hop` on beats | `shot` wide |
   | Bakery rush | order cards (letters), bars | `sound` windup_click, `pop` answer, `mark` correct | `shot` medium; cut to `close` for each proof |
   | Challenge | bars 3/4, 6/8, 5/8 | `shade`, `highlight` the longer, `mark` correct | `shot` close |
   | Goodbye | confetti, paper strips | `burst` confetti, robo `clip` Wave | `shot` wide |

9. **Experiment or hands-on activity**
   - **You need:** four strips of paper the same length, crayons.
   - **Steps:** 1. Fold strip 1 in half and colour one half. 2. Fold strip 2 in half, then in half again
     (4 parts); colour 2 parts. 3. Fold strip 3 in half three times (8 parts); colour 4 parts. 4. Line them up:
     the coloured lengths match. 5. Try thirds with strip 4 (fold into three like a letter).
   - **Prediction:** before unfolding, guess how many parts and how many coloured parts match one half.
   - **Result:** 1/2, 2/4 and 4/8 cover the same length.
   - **Safety:** no scissors needed; if you cut strips, a grown-up helps with the scissors.

10. **Interaction moments**
    - Pause and guess (2–3 s, `windup_click`): "How many pieces after this slice?"; each bakery order; "3/4 or 5/8?"
    - Call and response: Robo: "More pieces?" Kids: "Smaller pieces!" Robo: "Same cake?" Kids: "Same amount!"
    - Move-along: hands together for one whole, chop the air once (halves), twice (quarters).

11. **Song or chant**
    Original clapping chant, steady 4-beat. Hook line idea: "Slice it again, the cake's the same; times the top
    and bottom, a brand-new name." Repeats in chapter 7 and quietly under the goodbye.

12. **Fun fact(s)**
    - The word "fraction" comes from a Latin word meaning "to break" (chapter 2).
    - In music, one half note lasts as long as two quarter notes: an equivalent fraction you can hear
      (chapter 4; Robo taps two quick drum beats against one long one).
    - Ancient Egyptians wrote most fractions as unit fractions, with 1 on top (chapter 6).

13. **Vocabulary and captions**
    Labels: fraction, numerator, denominator, equivalent, whole, equal parts, simplest form. `callout`s name the
    numerator ("shaded parts") and denominator ("equal parts in the whole") on the first bar. `title` caption
    "1/2 = 2/4 = 4/8". Order cards use `count` style.

14. **Quiz and recap**
    1. Is 2/4 more than, less than or equal to 1/2? (Equal.)
    2. Fill in: 3/5 = ?/10. (6.)
    3. Robo says 1/3 = 2/4 because he added 1 to both. True? (No; 1/3 = 2/6. Multiply, don't add.)
    4. Which is more, 3/4 or 5/8? (3/4, because 3/4 = 6/8.)
    Recap card: same whole, equal parts; multiply (or divide) top and bottom by the same number; same point on
    the number line. Praise: Mouse and Squirrel share a slice; Owl: "The evidence agrees."

15. **Sound and music**
    Music `happy`, gain 0.18; `calm` 0.16 for chapter 4. Voice 1.0. Effects: whoosh + ding (each slice), clink
    (un-slicing), windup_click (guesses), ding (right answers), boing (Robo's shortcut fails, soft), drum (music
    fact), crowd_cheer (end).

16. **Thumbnail and YouTube**
    Thumbnail concepts (designed scenes, not frames):
    - **a.** Two plates on a pink counter: one big half piece and four small eighth pieces, same length under a
      glowing "=" sign; Owl peers through her notebook with a raised brow, Mouse grins. Title "SAME CAKE?" in
      yellow, left side.
    - **b.** Three stacked fraction bars (1/2, 2/4, 4/8) with a glowing line down the middle, Robo pointing with
      a big surprised face. Title "1/2 = 4/8!" in white with a pink outline, right side.
    - **c.** Robo's wrong bar 2/3 with a soft red cross beside a correct 2/4 with a green tick; Owl nodding.
      Title "MULTIPLY!" in green.
    Title idea: "Equivalent Fractions for Kids | Same Amount, New Name | Grade 4 Math | Toy Box Friends".
    Tags: equivalent fractions, grade 4 math, 4th grade fractions, fraction bars, fraction wall, compare
    fractions, fractions for kids, number line fractions, math for kids, Toy Box Friends.

17. **Catalog gaps**
    - Stacked fraction text (numerator over a bar over the denominator): `letter` writes "2/4" with a slash.
      Stand-in: the slash form in letters and `fraction_bar` labels; a stacked `fraction` text kind would read
      better for grades 4–5 (shared with G4-02, G5-01).
    - The Slicer machine: stand-in: a box with a glass window, a `plate` lever as a named part; bars swap
      inside. No blades are shown.
    - Robo cannot point (no Point clip): stand-in: `look` at the bar plus a `highlight` or short `pointer`.

18. **Do and don't**
    - Do keep every bar the same 1 m whole; say "of the same whole" whenever two fractions are compared.
    - Don't say a bigger denominator means a bigger fraction; show 1/8 is smaller than 1/2.
    - Don't teach "add the same number to the top and bottom"; show it fails, then teach multiplying.
    - Do say why the rule works (more pieces, each smaller) before practising the rule.
    - Keep it to equivalence and comparing; adding fractions with unlike denominators is G5-01.

---

### G4-02 · Tenths Track: decimals
**Grade 4 · Math / decimals · 8:35 · classroom** — a tenth is one of ten equal parts of a whole; 0.3 and 3/10 are the same number, the decimal point separates wholes from tenths, and tenths add like any other unit.
**Skills:** decimals_tenths_4 · **Standard:** CCSS 4.NF.C.6, 4.NF.C.7 (tenths), 4.NF.B.3 (adding like units)

1. **Big idea**
   "The decimal point sits between the wholes and the tenths: 1.5 means one whole and five tenths, and ten tenths
   make one whole."

2. **Learning goals**
   - I can write tenths as a fraction and a decimal (3/10 = 0.3) and read 1.5 as "one and five tenths".
   - I can place tenths on a number line and on a metre stick.
   - I can compare decimals to tenths (1.2 is more than 0.9) and explain why.
   - I can add and subtract tenths, regrouping ten tenths into one whole.

3. **Hook (first 15 s)**
   Turtle's race poster on the chalkboard: "Race length: 1.5 m". Robo proudly shows his track: it runs out of
   the classroom door and down the hall. "Fifteen metres! Done!" Owl taps the dot on the poster: "Robo, what
   does this little dot mean?"

4. **What makes it unique**
   The Tenths Track is a number line Turtle actually races on. Every tenth is a stone; when Turtle steps from
   0.9 to the next stone, the ten tenths behind him "click" together into one whole block, so regrouping is
   something children watch. The same track lies beside a metre stick, so each tenth is also 10 cm.

5. **Cast and roles**
   - **Robo** (host, track builder): builds the 15 m track; later says 0.9 is bigger than 1.2 "because 9 is
     bigger than 2" and adds 0.7 + 0.5 as "0.12".
   - **Owl** (sidekick, `deep`, race judge): reads decimals out loud the long way; checks with the track.
   - **Turtle** (guest, `squeaky`, racer): slow and steady; leaps tenth by tenth.

6. **Setting and look**
   Classroom stage, `soft_day`. The track is a long `number_line` on the floor from 0 to 2 (2.4 m long, labelled
   wholes, `minor` 10) with a metre stick beside it. A place value chart stands on the chalkboard: columns
   "ones" and "tenths" with a big decimal point between them. Greens and track-red, chalk white numbers. Mood:
   sporty and bright.

7. **Storyline**

   | # | Chapter | Time | What happens | Teaching move | Emotional beat |
   |---|---|---|---|---|---|
   | 1 | The 15-metre mistake | 0:00–0:30 (30 s) | 1.5 m vs Robo's 15 m track | Hook | Funny |
   | 2 | One whole into ten | 0:30–1:30 (60 s) | A bar of 10 parts; 1/10 = 0.1; shade 3 → 3/10 = 0.3 | Teach (model one) | Curious |
   | 3 | The decimal point | 1:30–2:40 (70 s) | Place value chart: ones . tenths; 1.5 is 1 whole and 5 tenths, which is also 15 tenths | Explain | Aha |
   | 4 | The Tenths Track | 2:40–4:00 (80 s) | Turtle leaps 0.1 at a time; 0.9 → 1.0 click; find 0.4, 1.3, 1.7; metre stick: 0.1 m = 10 cm | Show (model two) | Excited |
   | 5 | Robo's bigger-digit mix-up | 4:00–4:50 (50 s) | 0.9 vs 1.2: compare wholes first | Explain (misconception) | Funny, then clear |
   | 6 | Adding and taking away tenths | 4:50–6:00 (70 s) | 0.6 + 0.3; 0.7 + 0.5 = 1.2 (not 0.12); 1.5 − 0.4 = 1.1; line up the points | Apply | Clever |
   | 7 | The Tenths Track chant | 6:00–6:20 (20 s) | Chant | Practise | Joy |
   | 8 | Decimal hunt | 6:20–7:05 (45 s) | Decimals in real life | Apply | Recognition |
   | 9 | Challenge round | 7:05–7:45 (40 s) | Order four decimals; one sum; one length | Challenge | Focused |
   | 10 | Quiz and recap | 7:45–8:20 (35 s) | Four questions, recap card | Check | Proud |
   | 11 | Your turn: tenths walk | 8:20–8:35 (15 s) | Home activity, goodbye | Praise | Inspired |

   Total: 515 s = 8:35.

   **Chapter 2:** a 1 m `fraction_bar` with 10 parts. `shade` one part: "one tenth", 1/10, 0.1. `shade` to 3:
   three tenths, 3/10, 0.3. `shade` to 10: ten tenths, 10/10 = 1 whole = 1.0.

   **Chapter 3 (place value chart):** the chart shows 1 | . | 5. Under "ones": one whole bar fully shaded. Under
   "tenths": a bar with 5 of 10 shaded. Read it two ways: "one point five" and "one and five tenths". Owl shows
   that 1.5 is also 15 tenths (count 15 shaded parts across the two bars). 15 m would be 1 and 5 in the tens and
   ones places: ten times as far. Robo rolls up most of his track, `feel` sheepish.

   **The Tenths Track (chapter 4):** Turtle `leap`s 0.1, 0.2 ... 0.9, then 1.0: the ten tenth-stones behind
   him `move` together into one whole block (`sound` clink). He keeps going to 1.5, the finish line. Then Owl
   calls out points and Turtle leaps there: 0.4, 1.3, 1.7. The metre stick beside the line shows 0.4 m = 40 cm
   and 1.3 m = 130 cm (1 m and 30 cm).

   **Robo's mix-up (chapter 5):** "0.9 beats 1.2 because 9 is bigger than 2." Turtle stands at 0.9 and at 1.2
   on the track: 1.2 is further. `mark` incorrect on Robo's claim. Rule: compare the wholes first (0 < 1); if
   the wholes match, compare the tenths (1.4 > 1.2).

   **Adding and taking away (chapter 6):**
   | Problem | On the track | Answer |
   |---|---|---|
   | 0.6 + 0.3 | start at 0.6, three leaps of 0.1 | 0.9 |
   | 0.7 + 0.5 | start at 0.7, five leaps; the click at 1.0 | 1.2 (Robo's "0.12" gets `mark` incorrect: 0.12 is less than either number) |
   | 1.5 − 0.4 | start at 1.5, four leaps back | 1.1 |
   Then the same sums written in columns with the decimal points lined up, so tenths add to tenths. 7 tenths +
   5 tenths = 12 tenths = 1 whole and 2 tenths.

   **Decimal hunt (chapter 8):** a juice bottle "1.5 L"; a long jump "1.2 m"; a pencil "14.5 cm"; a thermometer
   at "37.0 °C" (normal body temperature is about 37 °C). Each is read the long way.

   **Challenge (chapter 9):** order 1.4, 0.8, 1.0, 0.3 from least to greatest (0.3, 0.8, 1.0, 1.4); 0.4 + 0.8 =
   1.2; Turtle walked 0.6 m then 0.7 m: how far? (1.3 m).

8. **Animation and staging list**

   | Moment | Objects | Actions | Camera |
   |---|---|---|---|
   | Race poster | letters "1.5 m" on the chalkboard, robo, long track (plates) to the door | `pop` poster, robo `clip` Jump, `look` owl at the dot | `shot` wide, then `shot` close on the dot |
   | Dot highlight | the "." | `highlight` the dot | `shot` close |
   | Ten parts | fraction_bar 10 parts, length 1 | `build` parts, `shade` to 1, 3, 10; `callout` "0.1", "0.3", "1.0" | `shot` medium, straight on |
   | Place value chart | grid upright 1 × 2 with letters "ones", "tenths", a big sphere decimal point, digits 1 and 5 | `pop` headers, `drop` digits, `highlight` the point | `shot` medium on the board |
   | 15 tenths | two bars | `shade`, `sound` tick per part | `shot` close |
   | Robo rolls the track | track plates | `move` plates back in, `feel` robo worried | `shot` wide |
   | Tenths Track | number_line 0–2, minor 10, labels numbers; turtle; ten tenth stones (flat discs); metre stick | `draw` line, `leap` turtle along 0.1 … 1.5, stones `move` together at 1.0, `sound` clink | `shot` medium, low `height`, tracking with Turtle (`shot` on turtle each 0.5) |
   | Points to find | turtle, callouts | `leap` to 0.4, 1.3, 1.7; `callout` "40 cm", "130 cm" on the metre stick | `shot` close on the metre stick |
   | Bigger-digit mix-up | letters "0.9" and "1.2", turtle | turtle `leap` 0.9 then 1.2, `mark` incorrect on Robo's card, `mark` correct on "1.2 > 0.9" | `shot` medium |
   | Adding | track, turtle, column sums on the board | `leap` per problem, `mark` incorrect on "0.12", column digits `pop`, `highlight` the lined-up points | `shot` medium; `close` for the column sum |
   | Chant | everyone | `hop` on "tenth", `spin` on "whole" | `shot` wide |
   | Decimal hunt | water_jug (1.5 L), pencil, metre stick, thermometer stand-in | `pop` each with a `callout` | `shot` close each |
   | Challenge | number cards | `sound` windup_click, `move` cards into order, `mark` correct | `shot` medium |
   | Goodbye | confetti | `burst`, robo `clip` Wave, turtle `nod` | `shot` wide |

9. **Experiment or hands-on activity**
   - **You need:** a metre stick or tape measure, ten sticky notes, a toy car.
   - **Steps:** 1. Lay the tape on the floor. 2. Put a sticky note every 10 cm and label them 0.1 m, 0.2 m ...
     1.0 m. 3. Roll the car and read where it stops as a decimal. 4. Add two rolls: 0.4 m + 0.3 m.
   - **Prediction:** guess the stopping point before each roll.
   - **Result:** each note is one tenth of a metre; ten notes make 1 metre.
   - **Safety:** roll the car on a clear floor away from stairs.

10. **Interaction moments**
    - Pause and guess (2–3 s, `windup_click`): "What comes after 0.9?" (1.0); "Which is further, 0.9 or 1.2?";
      each challenge.
    - Call and response: Robo: "Ten tenths make?" Kids: "One whole!"
    - Move-along: tiny steps for tenths, a big jump for a whole.

11. **Song or chant**
    Original marching chant counting tenths. Hook line idea: "Point one, point two, steady as I go; ten little
    tenths make a whole, you know!" Repeats in chapter 7 and when Turtle crosses the finish.

12. **Fun fact(s)**
    - In many countries, such as France, Germany and Brazil, people write a comma instead of a decimal point:
      1,5 (chapter 3).
    - A Flemish scientist, Simon Stevin, wrote a small book in 1585 to teach everyone how to use decimals
      (chapter 8).
    - Normal body temperature is about 37 °C, often measured to a tenth of a degree (chapter 8).

13. **Vocabulary and captions**
    Labels: tenth, decimal, decimal point, whole, place value, ones, tenths, metre (m), centimetre (cm). Every
    decimal is captioned with its long reading once ("1.5: one and five tenths"). `count` style for Turtle's
    leaps.

14. **Quiz and recap**
    1. Write 7/10 as a decimal. (0.7.)
    2. Which is greater, 1.2 or 0.9? Why? (1.2, because it has 1 whole and 0.9 has none.)
    3. What is 0.8 + 0.4? (1.2.)
    4. How many centimetres is 0.3 m? (30 cm.)
    Recap card: tenths are 10 equal parts; the point separates wholes and tenths; compare wholes first; ten tenths
    make one whole. Praise: Turtle on the finish line; Owl stamps her notebook "Evidence: 1.5".

15. **Sound and music**
    Music `bouncy`, gain 0.18; `calm` 0.16 in chapter 3. Voice 1.0. Effects: step (each leap), clink (ten tenths
    join), windup_click, ding, slide_whistle (Robo rolls up the track, soft), crowd_cheer (finish).

16. **Thumbnail and YouTube**
    Thumbnail concepts:
    - **a.** Turtle mid-leap on a glowing number line between 0.9 and 1.0, ten tenth-stones snapping into one
      gold block; Owl cheering with a flag. Title "TENTHS!" in yellow.
    - **b.** A giant decimal point between "1" and "5" with Robo looking shocked at a track that goes out the
      door. Title "1.5 OR 15?" in white with a red outline.
    - **c.** Two signs "0.9" and "1.2" with Turtle standing further along at 1.2 and a green tick. Title "WHICH
      IS MORE?" in orange.
    Title idea: "Decimals for Kids: Tenths on a Number Line | Grade 4 Math | Toy Box Friends". Tags: decimals
    for kids, tenths, decimal point, grade 4 math, 4th grade decimals, compare decimals, add decimals, number
    line, place value, Toy Box Friends.

17. **Catalog gaps**
    - Place value chart: stand-in: an upright `grid` (1 row, 2 or 3 columns) with `letter` headers and a sphere
      for the decimal point. A `place_value_chart` kind with column headers and digit slots would serve G4-02
      and G5-02.
    - Thermometer: stand-in: a thin glass `tube` with a red `grow` column and a `callout` "37.0 °C".
    - "Ten tenths join into a whole" needs ten objects moving into one; works with `move` on ten disc stones and
      a `show` of one whole block.

18. **Do and don't**
    - Do read decimals the long way ("one and five tenths") at least once each; "point" reading is fine after.
    - Don't say "the more digits, the bigger the number"; compare wholes first.
    - Don't add across the point (0.7 + 0.5 is not 0.12); line up the points.
    - Keep to tenths (money and hundredths are grade 5, `decimals_hundredths_5`). Use metres, not prices.
    - Don't make Turtle's slowness a joke at his expense; he is "steady and accurate".

---

### G4-03 · Angle Explorers
**Grade 4 · Math / geometry · 8:45 · classroom** — an angle is an amount of turn between two rays, measured in degrees; we sort angles as acute, right, obtuse or straight, measure them with a protractor and name lines as parallel or perpendicular.
**Skills:** angles_4 · **Standard:** CCSS 4.MD.C.5, 4.MD.C.6, 4.MD.C.7, 4.G.A.1

1. **Big idea**
   "An angle measures how far something turns, not how long its arms are: a quarter turn is a right angle,
   90 degrees."

2. **Learning goals**
   - I can name the parts of an angle (two rays and a vertex) and tell lines, rays and segments apart.
   - I can sort angles as acute (less than 90°), right (90°), obtuse (between 90° and 180°) and straight (180°).
   - I can measure an angle with a protractor, reading the scale that starts at 0 on my ray.
   - I can add angles that sit side by side and find a missing angle (90° − 35° = 55°).

3. **Hook (first 15 s)**
   Two big angles stand on the chalkboard ledge: one with long arms, one with short stubby arms. Robo: "Easy!
   The long one is the bigger angle." Owl: "Are you sure? Let's test it." She slides the small one on top of the
   big one: the arms line up exactly. Same angle. "So what does an angle measure?"

4. **What makes it unique**
   Angles are shown as turns of real things: the classroom door swings, the clock's hands sweep, Bunny skates
   quarter, half and full turns, and an `angle` object `open`s live while its degrees count up. The protractor
   chapter shows a common wrong reading (the wrong scale) and a "sense check" that catches it.

5. **Cast and roles**
   - **Robo** (host, explorer): thinks long arms make a bigger angle; reads the protractor's wrong scale (120°
     for a 60° angle).
   - **Owl** (sidekick, `deep`, chief measurer): tests each claim; teaches the sense check ("Is it less than a
     corner? Then it is less than 90").
   - **Bunny** (guest, `squeaky`, skater): turns 90°, 180° and 360° on a skateboard (a plate on discs); goes
     on the angle hunt.

6. **Setting and look**
   Classroom stage with the chalkboard wall, a door (right) and a wall clock (left). Light `soft_day`. Big
   `angle` objects stand upright on the chalkboard so their arcs face camera; the protractor is shown large
   (1 m across) so the scale is readable. Colours: chalk white rays, a gold arc, teal for acute, orange for
   obtuse, red square mark for right angles. Mood: adventurous, tidy, clear.

7. **Storyline**

   | # | Chapter | Time | What happens | Teaching move | Emotional beat |
   |---|---|---|---|---|---|
   | 1 | Long arms, short arms | 0:00–0:30 (30 s) | Two angles, same turn | Hook | Surprise |
   | 2 | What is an angle? | 0:30–1:35 (65 s) | Rays and a vertex; arm length does not change the angle | Teach | Curious |
   | 3 | Turns and degrees | 1:35–2:45 (70 s) | Full turn 360°, half 180°, quarter 90°; 1° is 1/360 of a turn | Teach (model one: turning) | Wow |
   | 4 | Acute, right, obtuse, straight | 2:45–3:55 (70 s) | Sort angles with a corner tester | Teach + sort | Satisfying |
   | 5 | The protractor | 3:55–5:15 (80 s) | Three steps; Robo's wrong scale; the sense check | Show (model two: measuring) | Careful, then aha |
   | 6 | Angles add up | 5:15–6:00 (45 s) | 30° + 60° = 90°; missing angle 90° − 35° | Explain + apply | Clever |
   | 7 | Lines: parallel and perpendicular | 6:00–6:50 (50 s) | Line, ray, segment; parallel, perpendicular, intersecting | Teach | Recognition |
   | 8 | The Turn-and-Name chant | 6:50–7:10 (20 s) | Chant with arm angles | Practise | Joy |
   | 9 | Angle hunt challenge | 7:10–7:55 (45 s) | Clock times and classroom angles | Challenge | Focused fun |
   | 10 | Quiz and recap | 7:55–8:30 (35 s) | Four questions, recap card | Check | Proud |
   | 11 | Your turn: paper corner tester | 8:30–8:45 (15 s) | Home activity, goodbye | Praise | Inspired |

   Total: 525 s = 8:45.

   **What is an angle (chapter 2):** a line goes on forever both ways (arrows at both ends); a ray has one
   endpoint and goes on forever one way; a segment has two endpoints. Two rays that share an endpoint make an
   angle; the shared point is the vertex. Owl stretches the arms of one angle longer and shorter: the arc and
   the degrees do not change.

   **Turns and degrees (chapter 3):** the door opens a quarter turn (90°), the clock's minute hand sweeps from 12
   to 3 (90°), to 6 (180°), all the way round (360°). Bunny skates: a quarter turn, a half turn ("a 180"), a full
   turn ("a 360"). A circle is cut into 360 tiny equal turns; each one is 1 degree.

   **Sort (chapter 4):** the corner tester is the corner of a book (a right angle). Angles of 40°, 90°, 135°,
   180°, 75° and 110° are tested: smaller than the corner → acute; matches → right (shown with a small square
   mark); bigger but not flat → obtuse; flat as a line → straight. "Right" angle does not mean it points right:
   Owl turns a right angle upside down and it stays right.

   **Protractor (chapter 5):** 1. Put the centre mark on the vertex. 2. Line up the 0 line with one ray.
   3. Start at the 0 on that ray's side and count up to where the other ray crosses. Measure a 60° angle: Robo
   reads 120 on the other scale. Sense check: "Is it smaller than a corner? Yes, so it must be less than 90."
   `mark` incorrect on 120, correct on 60. Then measure 40° and 135°.

   **Angles add up (chapter 6):** two pizza-slice wedges of 30° and 60° slide together into one 90° corner. A
   right angle split by a ray: one part 35°, so the other is 90° − 35° = 55°. A straight angle split: 130° and
   50° (180° − 130° = 50°).

   **Lines (chapter 7):** train tracks (parallel: always the same distance apart, never meet); the corner of the
   letter T and a window frame (perpendicular: meet at a right angle); an X (intersecting, not at right angles).

   **Angle hunt (chapter 9):** clock at 3:00 (right, 90°); 1:00 (acute, 30°); 5:00 (obtuse, 150°); 6:00
   (straight, 180°); an open book at a wide angle (obtuse); the letter V (acute); the letter L (right).

8. **Animation and staging list**

   | Moment | Objects | Actions | Camera |
   |---|---|---|---|
   | Long vs short arms | angle_big (`angle` 50°, long rays), angle_small (50°, short rays) | `show`, `move` small onto big, `highlight` the matching arcs, `mark` incorrect on Robo's guess | `shot` wide, then `shot` close on the overlap |
   | Lines, rays, segments | three thin rods with arrow and dot ends (letters "line", "ray", "segment") | `draw` each, `callout` endpoint | `shot` medium on the board |
   | Vertex | angle object | `callout` "vertex" on the point, `callout` "ray" on each arm | `shot` close |
   | Arms stretch | angle rays | `grow` [1.6, 1, 1] then [0.6, 1, 1]; `label` degrees stays 50 | `shot` close |
   | Door turn | door (plate with `pivot` at its hinge), floor `angle` | `turn` door 90°, `open` angle to 90 in step | `shot` medium from above (`height` 40) |
   | Clock sweep | clock | `clock` the minute hand to :15, :30, :00; `angle` over the face `open`s 90, 180, 360 | `shot` close on the clock |
   | Bunny skates | bunny on a skateboard (plate + 4 discs, group) | `turn` 90, 180, 360 (`spin` 1 turn); `callout` "90°", "180°", "360°" | `shot` medium, `orbit` 30° slow during the 360 |
   | Corner tester | book prop, six angles | `move` book corner onto each angle, `mark` correct/incorrect for "less than 90?", angles `paint` teal/red/orange/white as they are sorted | `shot` close on each test, `shot` wide for the sorted row |
   | Right-angle square | small square plate at the vertex | `pop` | `shot` close |
   | Protractor | protractor model (large), angle_60 | protractor `move` onto the vertex, `turn` to the ray, `highlight` the inner then outer scale, `mark` incorrect on "120", correct on "60" | `shot` close, straight on (no tilt so the scale reads) |
   | Measure 40° and 135° | two angles | `open` to 40 and 135 under the protractor | `shot` close |
   | Angles add | two wedges (quarter_circle cut), letters "30°", "60°", "= 90°" | `move` wedges together, `pop` sum, `sound` clink | `shot` medium |
   | Missing angle | right angle with a middle ray | `open` the ray to 35, `callout` "?" then "55°" | `shot` close |
   | Lines | track (two long thin boxes), letter T, letter X | `draw`, `highlight`, a small square at the T's corner | `shot` medium |
   | Chant | robo, owl, bunny | `clip` robo Dance; owl wing `turn` to show acute, right, obtuse | `shot` wide |
   | Angle hunt | clock, book, letters V and L | `clock` to each time, `sound` windup_click, `callout` the name | `shot` close per item |
   | Goodbye | confetti | `burst`, bunny `spin` | `shot` wide |

9. **Experiment or hands-on activity**
   - **You need:** any scrap of paper.
   - **Steps:** 1. Fold the paper in half. 2. Fold it in half again so the first fold lies on itself. 3. The
     folded corner is a right angle tester. 4. Hunt for angles at home: book corners, a clock, an open laptop or
     a door. Test each: smaller (acute), the same (right) or bigger (obtuse)?
   - **Prediction:** before testing, guess each angle's name.
   - **Result:** most corners of books, tables and windows are right angles.
   - **Safety:** when testing a door, keep fingers away from the hinge side and let a grown-up swing it.

10. **Interaction moments**
    - Pause and guess (2–3 s, `windup_click`): "Which angle is bigger?" (hook); each sort; each clock time.
    - Call and response: Robo: "Quarter turn?" Kids: "Ninety degrees!" Robo: "Half turn?" Kids: "One-eighty!"
    - Move-along: arms as angle rays: close together (acute), an L (right), wide (obtuse), flat out (straight).

11. **Song or chant**
    Original arm-move chant. Hook line idea: "Tiny turn is acute, a corner's right, wide is obtuse, flat is
    straight, hold it tight!" Repeats in chapter 8 and during the angle hunt.

12. **Fun fact(s)**
    - Dividing a full turn into 360 degrees comes from ancient Babylon, where people counted in sixties
      (chapter 3).
    - When skateboarders do "a 180" or "a 360", they are naming the angle they turn (chapter 3, Bunny).
    - The corners inside a honeycomb's six-sided cells are 120° angles (chapter 9 bonus, obtuse).

13. **Vocabulary and captions**
    Labels: angle, vertex, ray, line, line segment, degree (°), acute, right, obtuse, straight, protractor,
    parallel, perpendicular, intersecting. Degrees as `label` captions on every `angle` (`label: true`).

14. **Quiz and recap**
    1. Does making an angle's arms longer make the angle bigger? (No; the turn is the same.)
    2. A clock shows 3:00. What kind of angle do the hands make? (A right angle, 90°.)
    3. An angle is 130°. Acute, right or obtuse? (Obtuse.)
    4. A right angle is split into 50° and ?° (40°.)
    Recap card: angle = amount of turn; 90° quarter, 180° half, 360° full; protractor: centre, 0 line, count from
    0; sense check. Praise: Bunny does a 360 victory spin; Owl: "Measured and proven."

15. **Sound and music**
    Music `playful`, gain 0.18; `calm` 0.15 for the protractor chapter. Voice 1.0. Effects: door_open (door turn),
    tick (clock sweep), whoosh (skate turns), clink (wedges join), windup_click, ding, crowd_cheer.

16. **Thumbnail and YouTube**
    Thumbnail concepts:
    - **a.** A giant glowing protractor on the chalkboard with a gold 90° arc and a red corner square; Owl
      pointing her wing at "90°", Robo amazed. Title "ANGLES!" in yellow.
    - **b.** Two angles, long arms and short arms, with a "=" between them and Robo scratching his head. Title
      "SAME ANGLE?" in white with a teal outline.
    - **c.** Bunny mid-spin on a skateboard with arcs for 90°, 180° and 360° behind her. Title "90 · 180 · 360"
      in orange.
    Title idea: "Angles for Kids: Acute, Right, Obtuse and How to Use a Protractor | Grade 4 Math | Toy Box
    Friends". Tags: angles for kids, acute right obtuse, protractor, measuring angles, degrees, parallel and
    perpendicular lines, grade 4 math, 4th grade geometry, geometry for kids, Toy Box Friends.

17. **Catalog gaps**
    - Door: no door prop in the catalog (the `classroom` stage may not have one). Stand-in: a tall `plate` with
      `pivot` at one edge and a small sphere knob.
    - Lines with arrowheads and dotted endpoints: stand-in: thin boxes with `arrow` shapes or spheres at the
      ends. A `line` kind (`ends`: arrow, dot or none) would also help G4-02's number line arrows.
    - Skateboard: stand-in: a `plate` on four small `disc` wheels in a `group`.
    - Robo cannot point (no Point clip): Owl points with her `wing` part; Robo uses `look`.

18. **Do and don't**
    - Do say "angle size is the amount of turn"; never let arm length look like it changes the measure.
    - Don't say "right angle" means pointing right; turn one around to show it.
    - Do teach the sense check before practising the protractor, and keep the protractor straight on to camera.
    - Don't introduce reflex angles or triangle angle sums (not grade 4 here); keep within 0°–360° turns and
      0°–180° measures.
    - Keep clock reading itself out (G1-05, G2-05); the clock is only a turning tool here.

---

### G4-04 · Spinning Earth: day, night, year and seasons
**Grade 4 · Science / space · 8:40 · lab** — Earth spins once a day (day and night), travels round the Sun once a year, and its tilted axis, not its distance from the Sun, causes the seasons.
**Skills:** earth_space_4 · **Standard:** NGSS 5-ESS1-2 (patterns of day, night and shadows); 4-ESS strand (Earth's place in space); seasons by tilt previews MS-ESS1-1

1. **Big idea**
   "Earth's spin makes day and night, its trip round the Sun makes a year, and its tilt makes the seasons."

2. **Learning goals**
   - I can explain that day and night happen because Earth spins on its axis about once every 24 hours.
   - I can explain why shadows are long in the morning and evening and short around noon.
   - I can explain that one trip round the Sun takes about 365¼ days, one year.
   - I can use evidence to show seasons come from Earth's tilt (direct vs slanted sunlight, longer days), not
     from being closer to the Sun.

3. **Hook (first 15 s)**
   A time-lapse window: the Sun rises on the left, arcs across the sky and sets on the right. Robo: "Look, the
   Sun runs around the sky every day." Owl: "Does it? Or are we the ones moving?" The lights dim; a glowing lamp
   and a globe appear on the lab bench.

4. **What makes it unique**
   One clear model does all the teaching: a globe on a tilted axis and a sun lamp in a dimmed lab. A tiny Robo
   flag on the globe shows what one town sees as Earth turns. A flashlight on a grid makes "direct vs slanted
   light" countable (fewer squares, brighter; more squares, dimmer). Penguin's December summer is the evidence
   that busts the "closer = hotter" myth.

5. **Cast and roles**
   - **Robo** (host, model builder): believes the Sun moves round Earth (hook), then that summer means Earth is
     closer to the Sun (chapter 6).
   - **Owl** (sidekick, `deep`, evidence keeper): asks for evidence; runs the flashlight test.
   - **Penguin** (guest, `squeaky`, from the far south): "At my home, December is summer!"

6. **Setting and look**
   Lab stage (white and teal benches). For the globe chapters, `lights` blends to `dim` so the sun lamp's light
   and the day/night line on the globe are clear; back to `studio` for the chant and the quiz. The sun lamp sits
   at the centre of a round bench; the globe is 0.6 m across, axis tilted 23.5°, with a "North Star" (small star
   shape) high on the far wall that the axis always points to. A caption reminds once: "Model not to scale."
   Colours: warm gold sunlight, deep blue night side, ocean blue and green land. Calm, wonder-filled.

7. **Storyline**

   | # | Chapter | Time | What happens | Teaching move | Emotional beat |
   |---|---|---|---|---|---|
   | 1 | Is the Sun moving? | 0:00–0:30 (30 s) | Sky time-lapse; Owl's question | Hook | Curious |
   | 2 | Meet the model | 0:30–1:15 (45 s) | Globe, axis, sun lamp; real sizes and distances | Teach | Wonder |
   | 3 | One spin, one day | 1:15–2:35 (80 s) | The flag turns into light: sunrise, noon, sunset, night | Show (model one) | Aha |
   | 4 | Shadows through the day | 2:35–3:30 (55 s) | A shadow stick: long, short, long | Show + explain | Satisfying |
   | 5 | One trip, one year | 3:30–4:25 (55 s) | The orbit; 365¼ days; leap day | Teach | Calm |
   | 6 | Robo's idea: closer means summer? | 4:25–5:15 (50 s) | Two pieces of evidence say no | Explain (misconception) | Surprise |
   | 7 | The tilt makes the seasons | 5:15–6:40 (85 s) | Flashlight on a grid; the four stops round the Sun | Show (model two) + explain | Big aha |
   | 8 | The Spin-and-Tilt chant | 6:40–7:00 (20 s) | Chant | Practise | Joy |
   | 9 | Challenge: true or false? | 7:00–7:45 (45 s) | Five statements | Challenge | Focused |
   | 10 | Quiz and recap | 7:45–8:25 (40 s) | Four questions, recap card | Check | Proud |
   | 11 | Your turn: shadow stick | 8:25–8:40 (15 s) | Home activity, goodbye | Praise | Inspired |

   Total: 520 s = 8:40.

   **Meet the model (chapter 2):** the axis is an imaginary line through the North and South Poles; Earth spins
   around it. The real Sun is about 109 times wider than Earth and about 150 million km away, so the model is
   not to scale.

   **One spin (chapter 3):** seen from above the North Pole, Earth spins anticlockwise (west to east). The Robo
   flag turns from the dark side into the light: sunrise (the Sun appears in the east), noon (facing the lamp),
   sunset (the Sun appears to go down in the west), night (facing away). Half the globe is always lit. One full
   spin is about 24 hours. Robo: "So the Sun only looks like it moves because we spin." Owl: "Evidence: the lamp
   never moved."

   **Shadows (chapter 4):** a tiny stick by the flag casts a shadow from the lamp. Morning: long, pointing west.
   Noon: short. Evening: long, pointing east. Shadows always point away from the light. (Northern mid-latitude
   town.)

   **The year (chapter 5):** Robo carries the globe once round the lamp along a circle on the bench (the path is
   nearly a circle). One trip is about 365¼ days, so every 4 years we add a leap day, 29 February. While it
   travels, the globe also keeps spinning: about 365 spins per trip (shown as a quick spin counter, not every
   spin).

   **Robo's idea (chapter 6):** "Summer is when Earth is closest to the Sun." Evidence 1: Penguin says that in
   December it is summer at her home in the south, while it is winter in the north. Both halves of Earth are the
   same distance from the Sun, so distance cannot explain it. Evidence 2: Earth is actually closest to the Sun in
   early January, which is winter in the north. `mark` incorrect on Robo's idea.

   **The tilt (chapter 7):**
   - Flashlight test on a flat `grid`: pointing straight down, the spot covers about 4 squares and looks bright.
     Tilted a lot, the same light spreads over about 8 squares and looks dimmer: each square gets about half as
     much. Direct light warms more.
   - Four stops round the lamp, the axis always pointing at the North Star: June: the north half leans toward the
     Sun → direct light and long days → northern summer, southern winter. December: the north half leans away →
     slanted light, short days → northern winter, southern summer (Penguin cheers). March and September: neither
     half leans toward the Sun → spring and autumn.
   - Places near the equator get fairly direct light all year, so their seasons change less.

   **True or false (chapter 9):** "The Sun goes round Earth every day." (False.) "Earth spins once about every 24
   hours." (True.) "It is summer in the north when Earth is closest to the Sun." (False.) "When it is summer in
   the north, it is winter in the south." (True.) "Your shadow is shortest around noon." (True.)

8. **Animation and staging list**

   | Moment | Objects | Actions | Camera |
   |---|---|---|---|
   | Sky time-lapse | window frame (plates), sun prop on a `path` arc behind it | sun `path` left to right, `lights` soft_day → evening | `shot` medium on the window |
   | Dim the lab | sun_lamp, globe (in a group tilted 23.5°), star on the wall | `lights` → dim, `show` lamp (a `lamp` light inside the model), `show` globe | `shot` wide |
   | Axis | thin glowing tube through the poles, callouts "axis", "North Pole", "South Pole" | `draw` callouts, `highlight` axis | `orbit` 40° around the globe |
   | Not to scale | caption | `caption` label "Model not to scale" | — |
   | One spin | globe child, robo_flag (small cone + plate) on the globe | `turn` the globe child about its own axis in four steps; `callout` "sunrise", "noon", "sunset", "night" by the flag; `feel` robo surprised | `shot` close on the flag; then `shot` from above (`height` 70) to show the anticlockwise spin |
   | Lit half | the terminator line | `highlight` the day/night edge | `shot` medium |
   | Shadow stick | tiny cylinder by the flag | turns with the globe; shadow from the lamp grows and shrinks | `shot` close, low `height` |
   | Orbit | globe group on a circular `path` round the lamp (`face: false`, so the tilt keeps its direction) | `path`, spin counter (number_block counting up), `caption` count "365¼ days" | `shot` wide from above, then `orbit` 90° round the bench |
   | Robo's idea | letters "closer = summer?" | `mark` incorrect after the evidence | `shot` medium |
   | Penguin's evidence | penguin, a small southern flag on the globe | penguin `hop`, `feel` happy, `say` with `who` | `shot` medium on penguin and globe |
   | Closest in January | an oval orbit diagram (ring) on the board with "January: closest" | `draw`, `callout` | `shot` close on the board |
   | Flashlight test | flashlight prop (`lamp` with `beam`), grid 6 × 6 flat | `aim` straight down, then tilted; `highlight` the lit squares; `callout` "4 squares", "8 squares" | `shot` close from above (`height` 60) |
   | Four stops | globe group at June, September, December, March points | `path` stop by stop; `callout` the season for north and south | `shot` wide; `orbit` 30° at June and December |
   | Equator | a band ring round the globe | `highlight` | `shot` close |
   | Chant | everyone | `spin` (spin), robo lean `turn` (tilt), `path` small circle (orbit) | `shot` wide in `studio` light |
   | True or false | cards | `sound` windup_click, `mark` correct or incorrect | `shot` medium |
   | Goodbye | stars | `burst` stars, robo `clip` Wave | `shot` wide |

9. **Experiment or hands-on activity**
   - **Shadow stick (outdoors, sunny day):** push a stick upright into soil or stand a pencil in modelling clay
     on paper. Mark the tip of the shadow at morning, noon and afternoon. Predict which will be shortest.
     Result: shortest around noon; the shadow moves from west to east side.
   - **Flashlight grid (indoors):** draw squares on paper. Shine a flashlight straight down from 30 cm and count
     the lit squares, then tilt it and count again. Result: tilted light spreads over more squares.
   - **Safety (on screen and in the voice):** "Never look straight at the Sun, even with sunglasses." Don't
     shine a flashlight into anyone's eyes. If you use a desk lamp as the Sun, a grown-up sets it up: bulbs get
     hot.

10. **Interaction moments**
    - Pause and guess (2–3 s, `windup_click`): "Where will the flag be at noon?"; "Which shadow is shortest?";
      "Which spot covers more squares?"; each true or false.
    - Call and response: Robo: "Spin makes?" Kids: "Day and night!" Robo: "Trip makes?" Kids: "A year!" Robo:
      "Tilt makes?" Kids: "Seasons!"
    - Move-along: stand up, lean a little, and turn slowly on the spot: "You are Earth."

11. **Song or chant**
    Original three-part chant with moves. Hook line idea: "Spin for the day, go round for the year, lean to the
    Sun and summer is here!" Repeats in chapter 8 and in the goodbye.

12. **Fun fact(s)**
    - At the equator, the ground spins round at about 1,670 km per hour, and we don't feel it (chapter 3).
    - Earth is closest to the Sun in early January (chapter 6).
    - In December, the Sun does not set at the South Pole at all: it is daylight all day and night (chapter 7,
      Penguin).

13. **Vocabulary and captions**
    Labels: axis, rotate (spin), revolve (orbit), orbit, hemisphere, equator, North Pole, South Pole, tilt,
    direct light, slanted light, season. Caption "Spin = 1 day · Orbit = 1 year · Tilt = seasons" as the recap
    `title`. Times by the flag in `label` style.

14. **Quiz and recap**
    1. What causes day and night? (Earth spinning on its axis.)
    2. How long does Earth take to go once round the Sun? (About 365¼ days, one year.)
    3. Why is it summer in the north in June? (The north half leans toward the Sun: more direct light and longer
       days.)
    4. Is summer caused by Earth being closer to the Sun? What is your evidence? (No: the south has winter at the
       same time, and Earth is closest in January.)
    Recap card with the three-part caption. Praise: Penguin and Owl wave from opposite sides of the globe.

15. **Sound and music**
    Music `calm`, gain 0.16 under the dim lab; `happy` 0.2 for the chant and the end. Voice 1.0. Effects:
    magic_sparkle (lamp on), whoosh (orbit start), tick (spin counter, soft), crystal_chime (North Star),
    windup_click, ding, crowd_cheer.

16. **Thumbnail and YouTube**
    Thumbnail concepts:
    - **a.** The tilted globe glowing half gold, half blue next to the sun lamp; Robo on one side looking amazed,
      Penguin on the other in sunglasses. Title "WHY SEASONS?" in yellow.
    - **b.** The globe at four points round a glowing lamp, axis lines all parallel toward a star; Owl with her
      notebook. Title "TILT!" in white with a blue outline.
    - **c.** The tiny Robo flag half in daylight and half at night on the globe, close-up. Title "DAY OR NIGHT?"
      in orange.
    Title idea: "Why Do We Have Seasons? Day, Night and Earth's Tilt for Kids | Grade 4 Science | Toy Box
    Friends". Tags: why do we have seasons, earth rotation, day and night, earth's tilt, earth orbit, seasons for
    kids, shadows, grade 4 science, space for kids, Toy Box Friends.

17. **Catalog gaps**
    - Spinning about a tilted axis: `spin` turns about the vertical. Stand-in: put the globe in a `group` turned
      23.5° and `turn` (or `spin`) the globe child, if child turns use the parent's frame; check this once in a
      still. An `axis` field on `spin` and `turn` would make it simple.
    - The globe keeping its tilt along the orbit: `path` with `face: false` should keep the group's rotation;
      check by eye.
    - A day/night terminator needs real lighting on the globe from the sun lamp: put a `lamp` (no beam) inside
      the sun_lamp model and aim it at the globe.
    - Sky time-lapse window: stand-in: a frame of plates with the `sun` prop on a `path` behind it.

18. **Do and don't**
    - Don't say seasons are caused by distance from the Sun; show the evidence that it is the tilt.
    - Don't say "the Sun rises and sets" without adding once that it only looks that way because Earth spins.
    - Do say "about" for 24 hours and 365¼ days; don't claim the orbit is a perfect circle, say "nearly".
    - Keep weather and the seasons tree (G1-08) out; this episode is about Earth's motion only.
    - Do show "never look at the Sun" whenever the real Sun is mentioned outdoors.

---

### G4-05 · Chain Reaction: cause and effect
**Grade 4 · English / reading · 8:35 · forest** — a cause is why something happens and an effect is what happens; signal words help us find them, one effect can cause the next, and we prove each link with words from the text.
**Skills:** cause_effect_4 · **Standard:** CCSS RI.4.3, RI.4.5 (cause/effect text structure), RL.4.3

1. **Big idea**
   "A cause is why something happens, an effect is what happens, and I prove each link with words from the
   text."

2. **Learning goals**
   - I can tell a cause (why) from an effect (what happened).
   - I can use signal words (because, so, since, as a result, therefore, due to) to find causes and effects,
     even when the cause comes second in the sentence.
   - I can follow a chain where one effect becomes the next cause.
   - I can tell "happened before" from "caused it", and back up my answer with text evidence.

3. **Hook (first 15 s)**
   A domino run snakes across a log table in the forest. Robo taps the first domino; they topple one by one, a
   marble rolls down a ramp and rings a small bell. Ding! Owl: "Why did the bell ring?" Robo: "The marble hit
   it." Owl: "And why did the marble roll?" The camera follows the chain backwards to Robo's finger.

4. **What makes it unique**
   Every sentence the friends read becomes a domino chain: each domino gets a `callout` with one event, and the
   `pointer` arrows between them light up as the dominoes fall. The "lucky socks trap" shows that something
   happening first is not always the cause, and Owl's evidence rule turns reading into detective work.

5. **Cast and roles**
   - **Robo** (host, story reader): his rainy Saturday is the first chain; he thinks his lucky socks won the
     match (the trap).
   - **Owl** (sidekick, `deep`, evidence keeper): asks "What happened? Why?" and highlights the words that prove
     it.
   - **Squirrel** (guest, `squeaky`): the star of the nonfiction passage; buries acorns and shows what happens to
     the forgotten ones.

6. **Setting and look**
   Forest stage, `soft_day`. A reading nook: a log table for the dominoes, a chalkboard on an easel for the
   passage lines and signal words, an oak tree, and a patch of soil for Squirrel's acorns. Domino chains run left
   to right (the way we read). Colours: warm wood, leaf green, gold arrows for cause → effect, teal highlight for
   signal words. Mood: clever, warm, a little detective.

7. **Storyline**

   | # | Chapter | Time | What happens | Teaching move | Emotional beat |
   |---|---|---|---|---|---|
   | 1 | Why did the bell ring? | 0:00–0:30 (30 s) | Domino run; follow it backwards | Hook | Wow |
   | 2 | Cause and effect | 0:30–1:30 (60 s) | Why = cause, what = effect; three everyday pairs | Teach | Clear |
   | 3 | Signal words | 1:30–2:40 (70 s) | because, so, since, as a result, therefore, due to; the cause can come second | Teach (model one: words) | Aha |
   | 4 | Robo's rainy Saturday | 2:40–4:00 (80 s) | A story chain of six links | Show (model two: chain) | Cosy fun |
   | 5 | The lucky socks trap | 4:00–4:45 (45 s) | Before is not always because | Explain (misconception) | Funny, then clear |
   | 6 | Squirrels plant forests | 4:45–6:05 (80 s) | Nonfiction passage; text evidence; one cause, two effects | Apply | Wonder |
   | 7 | The Chain Reaction chant | 6:05–6:25 (20 s) | Chant | Practise | Joy |
   | 8 | Match it | 6:25–7:15 (50 s) | Four causes, four effects | Practise | Busy fun |
   | 9 | Challenge: keep the chain going | 7:15–7:45 (30 s) | Kids invent the next links | Challenge | Creative |
   | 10 | Quiz and recap | 7:45–8:20 (35 s) | Four questions, recap card | Check | Proud |
   | 11 | Your turn: chain journal | 8:20–8:35 (15 s) | Home activity, goodbye | Praise | Inspired |

   Total: 515 s = 8:35.

   **Chapter 2:** the question test: "What happened?" finds the effect; "Why did it happen?" finds the cause.
   Pairs: the ice pop was left in the sun (cause) → it melted (effect); Owl practised her spelling words → she
   got them all right; the wind blew hard → the kite flew high.

   **Signal words (chapter 3):** "because", "since" and "due to" point to the cause; "so", "as a result" and
   "therefore" point to the effect. Two sentences with the same events: "It rained, so the match was cancelled."
   and "The match was cancelled because it rained." In the second one the cause comes second. Order in the
   sentence is not always order in time. Some links have no signal word; then ask "why?".

   **Robo's rainy Saturday (chapter 4)**, an original passage read in short lines:
   "It rained all night, so the playing field turned into a muddy pond. Because of the mud, the football match was
   cancelled. Robo had a free morning, so he baked banana bread. The warm smell drifted out of the window. As a
   result, Squirrel knocked on the door with a big smile. They shared the bread and played games all afternoon."
   Chain: rain → muddy field → match cancelled → free morning → banana bread → smell drifts → Squirrel visits →
   sharing. The "free morning → banana bread" and "smell → visit" links are shown; Owl notes the one link with no
   signal word ("Robo had a free morning" is an effect of the cancelled match: why did he have a free morning?).

   **Lucky socks trap (chapter 5):** "Robo wore his striped socks, and his team won. The socks made us win!" Owl:
   "Did the socks cause the win, or did it just happen after?" Evidence: last week he wore the same socks and the
   team lost; the team won because they practised passing all week. `mark` incorrect on "socks → win".

   **Squirrels plant forests (chapter 6)**, original nonfiction passage:
   "In autumn, grey squirrels bury acorns one at a time in many different places. They do this because food is
   hard to find in winter. Squirrels dig up many of their acorns later, but they do not come back for all of
   them. As a result, some forgotten acorns sprout in spring. Over many years, these little seedlings can grow
   into tall oak trees. So a squirrel's winter food store helps new forests grow."
   Questions with evidence: Why do squirrels bury acorns? ("because food is hard to find in winter"). What happens
   to forgotten acorns? ("some forgotten acorns sprout in spring"). One cause, two effects: burying acorns → the
   squirrel has winter food, and → new oak trees can grow.

   **Match it (chapter 8):** the snow kept falling → school closed early; Robo forgot to charge his battery → he
   moved very slowly; the puppy chewed the shoe → it had holes; the plant got no water → it drooped. Matching
   cards slide together.

   **Challenge (chapter 9):** "The alarm clock did not ring, so ..." Kids suggest the next two links during a
   pause; two sample answers are shown (Owl woke up late → she ran to the bus).

8. **Animation and staging list**

   | Moment | Objects | Actions | Camera |
   |---|---|---|---|
   | Domino run | 12 dominoes on the log table, ramp (wedge), marble (sphere), bell (cone) | each domino `turn` 80° in sequence (0.15 s apart), marble `path` down the ramp, `sound` block per domino, bell `wiggle` + `sound` bell | `shot` wide, then tracking `shot` along the run, `close` on the bell |
   | Follow it back | `pointer`s between pieces | `draw` pointers backwards, `highlight` Robo's finger | `camera` slow move right to left |
   | Cause and effect | two big dominoes with `callout`s "CAUSE: why?" and "EFFECT: what happened?" | `pop`, `pointer` `draw` from cause to effect | `shot` medium |
   | Pairs | ice_pop + puddle, owl + book, kite | `show` each pair, `pointer` `draw` | `shot` close per pair |
   | Signal words | letters "because", "since", "due to" (blue side), "so", "as a result", "therefore" (gold side) | `pop` each, `highlight` | `shot` medium on the chalkboard |
   | Swap order | two sentence lines (captions), domino pair | dominoes `move` to swap places while the `pointer` keeps pointing cause → effect | `shot` close |
   | Rainy Saturday | rain (`weather` rain, brief), 8 dominoes, each with a `callout` event | `say` each line with `who`, then that domino falls; `highlight` the signal word in the caption | `shot` medium on the chain; `shot` close on each callout |
   | No signal word | one gap between dominoes | `highlight` the gap, owl `feel` thinking (`feel` surprised then happy) | `shot` close |
   | Lucky socks | socks model, a scoreboard (letters "WIN", then "LOST") | `pop` socks, `mark` incorrect on the socks → win `pointer`, `pointer` from "practised passing" to "WIN" with `mark` correct | `shot` medium |
   | Squirrel's acorns | squirrel, acorns (small spheres with dome caps), soil patch, oak tree, seedling props | squirrel `hop` and `move` to bury (acorn `move` into the soil), `show` sprout then seedling then `grow` a small tree | `shot` medium; `shot` close on the sprout |
   | Evidence | passage lines as captions; key phrases as letters on the board (≤ 24 characters) | `highlight` the phrase that answers each question | `shot` close on the board |
   | One cause, two effects | one domino, two `pointer`s branching | `draw` both | `shot` medium |
   | Chant | everyone | clap with `nod`, dominoes topple on the beat | `shot` wide |
   | Match it | 4 cause cards left, 4 effect cards right | `sound` windup_click, `move` the right effect beside its cause, `mark` correct | `shot` medium |
   | Goodbye | confetti | `burst`, a last domino falls and rings the bell | `shot` wide |

9. **Experiment or hands-on activity**
   - **Chain journal:** draw three dominoes in a row on paper. Write something that happened today in the first
     one, then ask "so what happened next?" for the other two. Underline your signal words.
   - **Domino run (optional):** stand dominoes or small books in a line on the floor, tap the first one, and say
     each cause and effect as they fall.
   - **Prediction:** before tapping, say what the last domino will do.
   - **Safety:** build on the floor, away from stairs; keep small pieces away from babies and toddlers.

10. **Interaction moments**
    - Pause and guess (2–3 s, `windup_click`): "Cause or effect?"; "Which signal word?"; each match; "Did the
      socks cause the win?"
    - Call and response: Owl: "Why did it happen?" Kids: "The cause!" Owl: "What happened?" Kids: "The effect!"
    - Move-along: stand like a domino, lean, and "fall" into a sit on each "so".

11. **Song or chant**
    Original tumbling chant with a clap on each link. Hook line idea: "Push the first and watch it go: because,
    because, and so, and so!" Repeats in chapter 7 and with the last domino in the goodbye.

12. **Fun fact(s)**
    - A domino can knock over another domino about one and a half times its own size (chapter 1, after the run).
    - One grey squirrel can bury thousands of nuts in a single autumn (chapter 6).
    - Many oak forests were planted partly by animals carrying and burying acorns, such as squirrels and jays
      (chapter 6).

13. **Vocabulary and captions**
    Labels: cause, effect, signal word, because, so, since, as a result, therefore, due to, evidence, chain.
    Passage lines as `subtitle` captions in short lines; signal words drawn in their side's colour (blue for
    cause words, gold for effect words).

14. **Quiz and recap**
    1. "The road was icy, so the bus drove slowly." What is the cause? (The road was icy.)
    2. "The plant drooped because it got no water." What is the effect? (The plant drooped.)
    3. Why do squirrels bury acorns? Use words from the text. ("Because food is hard to find in winter.")
    4. Robo wore his socks and the team won. Did the socks cause the win? (No: winning after is not the same as
       winning because; the evidence says practice did.)
    Recap card: cause = why, effect = what happened; signal words; chains; prove it with the text. Praise: the
    last domino rings the bell; Owl: "Evidence found."

15. **Sound and music**
    Music `playful`, gain 0.18; `calm` 0.15 for the nonfiction passage. Voice 1.0. Effects: block (each domino,
    soft), bell (end of the run), rain (rainy Saturday, low), sprout_spring (acorn sprouts), windup_click, ding,
    boing (lucky socks, soft), crowd_cheer.

16. **Thumbnail and YouTube**
    Thumbnail concepts:
    - **a.** A curving domino run mid-fall with gold arrows between them, ending at a ringing bell; Robo and Owl
      leaning in, wide-eyed. Title "WHY?" in yellow.
    - **b.** Squirrel holding an acorn with a glowing arrow to a tall oak tree; Owl with a magnifier. Title
      "CAUSE → EFFECT" in white with a green outline.
    - **c.** Robo's striped socks under a big question mark next to a scoreboard; Owl raising an eyebrow. Title
      "LUCKY SOCKS?" in orange.
    Title idea: "Cause and Effect for Kids: Signal Words and Chain Reactions | Grade 4 Reading | Toy Box
    Friends". Tags: cause and effect, cause and effect for kids, signal words, reading comprehension, text
    evidence, grade 4 reading, 4th grade ELA, nonfiction text structure, dominoes, Toy Box Friends.

17. **Catalog gaps**
    - A reading passage panel: `letter` holds 24 characters, so full sentences cannot be 3D text. Stand-in:
      passage lines as `subtitle` captions, key phrases as letters on the chalkboard and `highlight` on them. A
      `text_card` kind (several lines on a card, with one word or phrase highlighted) would help every reading
      episode.
    - Acorn: stand-in: a small brown sphere with a `dome` cap (the squirrel model already holds one).
    - Marble ramp and bell: stand-in: a `wedge` ramp, a glossy sphere and a gold `cone` bell.
    - Domino toppling in sequence: `turn` with `pivot` at each domino's bottom edge, staggered `at` times.

18. **Do and don't**
    - Do keep the passages original (they are), and keep reading lines short (one event per line).
    - Don't say the cause always comes first in the sentence; show the "because" swap.
    - Don't present "it happened before" as proof of a cause; teach the lucky socks trap.
    - Do ask for the words that prove an answer every time ("Show me the evidence").
    - Keep story order (G2-13) and story details (G1-15) out; this episode is about why, not just when.
