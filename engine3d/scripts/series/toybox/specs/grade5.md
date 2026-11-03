# Grade 5 video specs (G5-01 to G5-05)

These five specs are the grade 5 part of batch 3 of "Toy Box Friends" (ages 10–11, 7–9.5 minutes each). Every
episode follows the grade 5 pattern from [batch3.md](batch3.md): a real problem → model it → generalise (find
the rule) → apply → check. Robo hosts. **Monkey** (`monkey`) is the grade 5 sidekick: quick and playful, he makes
confident mistakes that children get to catch, and he is proud when he fixes them. At most one guest per
episode, with one job. Each spec uses the 18-heading template in [README.md](README.md), stays inside its lane
(see "Kept apart" in batch3.md) and designs with the batch 3 building blocks (`number_line`, `fraction_bar`,
`fraction_circle`, `grid`, `cubes`, `pointer`, `callout`, `build`, `shade`, `leap`, `draw`, `mark`,
`highlight`, `look`, `shot`, `orbit`, `who` lip-sync, the `classroom`, `lab`, `forest` and `pond` stages and the
planned `catalog/models/batch3.json` models: `body_model`, `heart`, `lungs`, `grass`, `mushroom`, `worm`,
`hawk`, `bug`...). Anything still missing is under **Catalog gaps** with a stand-in. All arithmetic and facts
below were checked. Specs have no final dialogue and no JSON.

| Id | Title | Subject | Hook style | Unique twist | Length |
|---|---|---|---|---|---|
| G5-01 | Adding Fractions with Unlike Denominators | Math / fractions | Monkey's smoothie: 1/2 cup + 1/3 cup = "2/5 cup"? | The answer is smaller than one of the parts: impossible, so the pieces must be renamed first | 8:45 |
| G5-02 | Powers of Ten Elevator | Math / place value | Monkey "adds a zero" and ten bananas still cost 35¢ | Digits ride an elevator in a place value tower, which then lies down into the usual chart | 8:50 |
| G5-03 | Volume Box Factory | Math / measurement | A tall box and a flat box: which holds more cubes? | Exploded layers reveal the hidden cubes; 1,000 cm³ fills exactly one litre | 9:00 |
| G5-04 | Body Systems Tour: heart and lungs | Science / life | A heartbeat in a dark lab | A see-through toy body; red and blue dots loop through a figure-8; an exercise test with real pulse counts | 8:50 |
| G5-05 | Ecosystem Energy: food chains and webs | Science | "This banana's energy came from... the Sun?" | Glowing energy dots travel the arrows; Monkey's backwards arrows; a pyramid where nine tenths fade away | 8:55 |

Notes for all five:

- `meta.audience: "grade5"`, `meta.voice: "soft"` for Robo, `voiceSpeed` 1.0–1.02. Monkey speaks in `squeaky` in
  every grade 5 episode; guests use `deep`. Every line is a `say` with `who` so mouths move. No `bark`.
- Sentences up to 18 words. Introduce a rule only after the model has shown it; then say the rule in words and
  in symbols.
- Pause and guess: 2–3 s with `windup_click`, then the answer with a visual check (`mark`), then praise.
  Monkey's mistakes are always caught kindly and he fixes them himself.
- Camera: each chapter opens with a `shot` (`wide`, `medium` or `close`); `orbit` is for 3D models (boxes, the
  body model). Characters stand beside the teaching object and `look` at it; nothing educational is cropped or
  covered. No chapter keeps one static camera for its whole length.
- Every chapter is 10 s or more; chapter timings add up to the length in the table. Thumbnails are designed
  scenes (`meta.thumbnails`), never a video frame.

---

### G5-01 · Adding Fractions with Unlike Denominators
**Grade 5 · Math / fractions · 8:45 · beach** — we can only add or subtract pieces of the same size, so we first rename the fractions with a common denominator; the numerators then add and the denominator stays.
**Skills:** fraction_operations_5 · **Standard:** CCSS 5.NF.A.1, 5.NF.A.2

1. **Big idea**
   "Before you add fractions, make the pieces the same size: 1/2 + 1/3 is 3/6 + 2/6, which is 5/6."

2. **Learning goals**
   - I can explain why 1/2 + 1/3 is not 2/5 (the answer must be more than 1/2).
   - I can rename fractions with a common denominator using equivalent fractions.
   - I can add and subtract fractions with unlike denominators, including answers greater than 1.
   - I can check an answer by estimating with benchmark fractions (0, 1/2, 1).

3. **Hook (first 15 s)**
   Monkey's smoothie shack on the beach. Monkey pours 1/2 cup of banana and 1/3 cup of mango into a blender and
   shouts: "1/2 plus 1/3 is 2/5 cup. Top plus top, bottom plus bottom. Easy!" Robo holds up a 2/5 cup next to the
   1/2 cup of banana alone: the 2/5 cup is smaller. "Monkey, how can the whole smoothie be smaller than the
   banana?"

4. **What makes it unique**
   The mistake disproves itself on screen: fraction bars show 2/5 is shorter than 1/2. Then the bars are
   "re-sliced" until both have pieces of the same size, and the pieces simply stack together. A benchmark check
   ("about how much?") catches every later mistake before the exact answer.

5. **Cast and roles**
   - **Robo** (host, measuring expert): models with bars and the number line.
   - **Monkey** (sidekick, `squeaky`, smoothie chef): adds tops and bottoms (hook), later forgets to rename one
     fraction; catches his own mistake with the benchmark check.
   - **Bear** (guest, `deep`, customer): orders smoothies with fraction recipes (the word problems).

6. **Setting and look**
   Beach stage, bright `soft_day`. A smoothie shack counter (table) with a blender (a glass `cup` on a box), a
   tall glass 1-cup measure, and fraction bars standing upright on a whiteboard (plate) behind the counter so
   they face camera. Fruit props (banana, strawberry, orange). Colours: banana yellow, mango orange, berry pink;
   every fraction keeps its colour through the episode. Mood: sunny, playful.

7. **Storyline**

   | # | Chapter | Time | What happens | Teaching move | Emotional beat |
   |---|---|---|---|---|---|
   | 1 | The 2/5 smoothie | 0:00–0:30 (30 s) | Monkey adds tops and bottoms | Hook | Funny |
   | 2 | Why it can't be 2/5 | 0:30–1:30 (60 s) | Bars: 2/5 < 1/2; denominators name piece sizes | Explain (misconception) | Surprise |
   | 3 | Make the pieces match | 1:30–3:00 (90 s) | Halves → sixths, thirds → sixths; 3/6 + 2/6 = 5/6 | Model (bars, then the number line) | Aha |
   | 4 | Finding a common denominator | 3:00–4:10 (70 s) | Lists of multiples; 1/4 + 1/6 = 3/12 + 2/12 = 5/12 | Generalise | Clever |
   | 5 | The benchmark check | 4:10–4:50 (40 s) | Estimate first with 0, 1/2, 1 | Generalise | Confident |
   | 6 | Taking away | 4:50–5:50 (60 s) | 3/4 − 1/3 = 9/12 − 4/12 = 5/12 | Apply | Focused |
   | 7 | More than one whole | 5:50–6:35 (45 s) | 2/3 + 3/4 = 17/12 = 1 5/12 | Apply | Wow |
   | 8 | The Same-Size chant | 6:35–6:55 (20 s) | Chant | Practise | Joy |
   | 9 | Smoothie rush | 6:55–7:50 (55 s) | Bear's three orders | Apply | Busy fun |
   | 10 | Quiz and recap | 7:50–8:30 (40 s) | Four questions, recap card | Check | Proud |
   | 11 | Your turn: kitchen cups | 8:30–8:45 (15 s) | Home activity, goodbye | Praise | Inspired |

   Total: 525 s = 8:45.

   **Why it can't be 2/5 (chapter 2):** bars of the same 1 m whole: 1/2 (yellow), 1/3 (orange) and Monkey's 2/5.
   2/5 is shorter than 1/2, but adding something must make it longer. `mark` incorrect. The denominator names
   the size of the pieces (halves, thirds), so we can't add halves and thirds as they are, just as 1 metre +
   1 centimetre is not "2 metre-centimetres". The answer must be more than 1/2 and less than 1.

   **Make the pieces match (chapter 3):** slice each half into 3 → 1/2 = 3/6; slice each third into 2 → 1/3 =
   2/6. Now all pieces are sixths: 3/6 + 2/6 = 5/6. The numerators add (3 + 2); the denominator stays 6 because
   the piece size did not change. On a `number_line` 0–1 with `minor` 6, Monkey `leap`s 3 sixths then 2 more and
   lands on 5/6. The 1-cup measure fills to 5/6: more than half, less than full. It matches the estimate.

   **Common denominator (chapter 4):** multiples of 2: 2, 4, 6, 8...; multiples of 3: 3, 6, 9...; the first
   number in both lists is 6. For 1/4 + 1/6: multiples of 4: 4, 8, 12; of 6: 6, 12. Use 12: 3/12 + 2/12 = 5/12.
   Multiplying the denominators (4 × 6 = 24) also works: 6/24 + 4/24 = 10/24 = 5/12, just with smaller pieces.

   **Benchmark check (chapter 5):** 1/2 + 3/8: about a half plus a bit less than a half, so a bit less than 1.
   Monkey's answer 4/10 is less than 1/2: `mark` incorrect. Exact: 4/8 + 3/8 = 7/8. Then 2/3 + 1/2: more than 1.
   Monkey's 3/5 is less than 2/3: impossible. Exact: 4/6 + 3/6 = 7/6.

   **Taking away (chapter 6):** Monkey has 3/4 cup of juice and pours 1/3 cup into Bear's glass. Rename with
   twelfths: 9/12 − 4/12 = 5/12. On the number line: start at 9/12, leap back 4.

   **More than one whole (chapter 7):** 2/3 + 3/4 = 8/12 + 9/12 = 17/12. Twelve twelfths make one whole, so
   17/12 = 1 5/12. Two `fraction_circle`s cut in twelfths fill one whole circle and 5 slices of the next.

   **Smoothie rush (chapter 9):**
   | Order | Working | Answer |
   |---|---|---|
   | 1/2 cup yoghurt + 1/4 cup berries | 2/4 + 1/4 | 3/4 cup |
   | 1/3 cup mango + 1/2 cup banana + 1/6 cup oats | 2/6 + 3/6 + 1/6 | 6/6 = exactly 1 cup |
   | Bear walks 5/6 km of the beach and has walked 1/2 km so far. How far is left? | 5/6 − 3/6 | 2/6 = 1/3 km |

8. **Animation and staging list**

   | Moment | Objects | Actions | Camera |
   |---|---|---|---|
   | The 2/5 smoothie | monkey, blender, banana, orange (mango stand-in), measuring cups (glass `cup`s with `water` filled by `grow`) | `pour` sound, monkey `hop`, `feel` happy; robo `look` at the cups | `shot` wide on the shack, then `shot` close on the two cups |
   | 2/5 vs 1/2 | fraction_bars: half (2 parts, 1 shaded yellow), fifths (5 parts, 2 shaded) | `build`, `shade`, `highlight` the shorter shaded part, `mark` incorrect | `shot` medium on the whiteboard |
   | Piece-size names | callouts "halves", "thirds" | `draw` callouts | `shot` close |
   | Estimate band | a soft band on the number line from 1/2 to 1 | `highlight` | `shot` medium |
   | Re-slice | bar_half → bar 6 parts 3 shaded; bar_third → bar 6 parts 2 shaded | `hide`/`show` in place with `sound` whoosh; `callout` "1/2 = 3/6", "1/3 = 2/6" | `shot` close on each bar |
   | Stack together | the two sixth-bars | `move` the 2/6 part to sit after the 3/6 part on one bar; `shade` to 5 | `shot` close |
   | Number line | number_line 0–1, minor 6, labels fractions; monkey | `draw`, `leap` 0 → 3/6 → 5/6 | `shot` medium, `yaw` 15 |
   | Fill the cup | 1-cup measure | `grow` water to 5/6 height | `shot` close |
   | Multiples lists | letters "2, 4, 6, 8", "3, 6, 9" | `pop` in order, `highlight` both 6s | `shot` medium |
   | Fourths and sixths | bars of 12 parts | `shade`, `callout` "3/12 + 2/12" | `shot` close |
   | Benchmark check | number line 0, 1/2, 1 with big ticks | `leap` an estimate marker, `mark` incorrect on Monkey's card, `mark` correct on 7/8 | `shot` medium |
   | Taking away | bar of 12, juice cup | `shade` to 9 then back to 5 (`shade` `to` 5), `pour` sound | `shot` close |
   | More than one whole | two fraction_circles of 12 | `shade` first to 12, second to 5; `callout` "1 5/12" | `shot` medium; `orbit` 20° slow |
   | Chant | everyone | `hop` on the beat, bars `wiggle` | `shot` wide |
   | Smoothie rush | bear, order cards | `sound` windup_click, `pop` answer, `mark` correct, bear `feel` happy | `shot` medium; `close` on each card |
   | Goodbye | confetti, bubbles | `burst`, robo `clip` Wave | `shot` wide |

9. **Experiment or hands-on activity**
   - **You need:** a set of measuring cups (1/2, 1/3, 1/4 cup and 1 cup) and water or dry rice, a tray.
   - **Steps:** 1. Estimate: will 1/2 cup + 1/3 cup fill the 1 cup measure? 2. Pour both into the 1 cup measure
     and look: a little less than full (5/6). 3. Try 1/2 + 1/4 (3/4 full) and 1/3 + 1/3 + 1/3 (exactly full).
   - **Prediction:** say "more than half, less than full" or "exactly full" before each pour.
   - **Result:** the results match the fraction sums.
   - **Safety:** do it on a tray with a grown-up in the kitchen; wipe up spills so nobody slips. No knives or
     blenders needed.

10. **Interaction moments**
    - Pause and guess (2–3 s, `windup_click`): "Can the answer be 2/5?"; each common denominator; each benchmark
      estimate; each smoothie order.
    - Call and response: Robo: "Same size pieces?" Kids: "Then add the tops!" Robo: "The bottom?" Kids: "Stays
      the same!"
    - Move-along: hands far apart for halves, closer for sixths, "slice" with a chop to make pieces match.

11. **Song or chant**
    Original beach-beat chant. Hook line idea: "Rename, then add, the bottom stays, same-size pieces every day!"
    Repeats in chapter 8 and before the smoothie rush.

12. **Fun fact(s)**
    - Mathematicians in North Africa, such as al-Hassar in the 1100s, were among the first to write fractions
      with a line between the top and bottom numbers (chapter 2).
    - Ancient Egyptians had a special symbol just for 2/3 (chapter 4).
    - 1/2 + 1/4 + 1/8 + 1/16 + ... keeps getting closer to 1 but never goes past it (chapter 7, a bonus on the
      number line).

13. **Vocabulary and captions**
    Labels: numerator, denominator, unlike denominators, common denominator, equivalent fraction, multiple,
    benchmark, estimate, mixed number. Rule as a `title` caption: "Rename → add the numerators → keep the
    denominator". Every renamed fraction is shown as "1/2 = 3/6".

14. **Quiz and recap**
    1. Why is 1/2 + 1/3 not 2/5? (2/5 is less than 1/2; the pieces are different sizes.)
    2. What is 1/2 + 1/4? (3/4.)
    3. What is 5/6 − 1/3? (5/6 − 2/6 = 3/6 = 1/2.)
    4. Is 3/4 + 2/3 more or less than 1? (More: 17/12 = 1 5/12.)
    Recap card: estimate first; find a common denominator; rename; add or subtract the numerators; keep the
    denominator; simplify. Praise: Monkey serves a perfect 5/6 cup smoothie; Bear: "Delicious maths."

15. **Sound and music**
    Music `happy`, gain 0.18; `calm` 0.15 for chapter 4. Voice 1.0. Effects: pour (cups), whoosh (re-slice), clink
    (pieces stack), windup_click, ding, boing (Monkey's mistakes, soft), crowd_cheer.

16. **Thumbnail and YouTube**
    Thumbnail concepts:
    - **a.** Monkey proudly holding a smoothie labelled "2/5?" with a soft red cross, Robo beside him pointing at
      a longer 5/6 cup with a green tick; beach background. Title "2/5? NO!" in yellow.
    - **b.** Two bars (halves and thirds) being re-sliced into matching sixths with sparkle lines; Monkey
      amazed. Title "MATCH THE PIECES" in white with an orange outline.
    - **c.** A 1-cup measure filled to 5/6 with "1/2 + 1/3" above it; Bear licking his lips. Title "ADD
      FRACTIONS" in pink.
    Title idea: "Adding Fractions with Unlike Denominators | Common Denominators Made Easy | Grade 5 Math | Toy
    Box Friends". Tags: adding fractions, unlike denominators, common denominator, subtracting fractions, grade 5
    math, 5th grade fractions, equivalent fractions, fraction bars, math for kids, Toy Box Friends.

17. **Catalog gaps**
    - Stacked fraction text and mixed numbers ("1 5/12"): stand-in: slash form in `letter` and `fraction_bar`
      labels. A stacked `fraction` text kind would read better (shared with G4-01).
    - Measuring cups with fraction marks: stand-in: glass `cup`s with `water` filled by `grow` and a `callout`
      for the amount.
    - Mango: stand-in: the `orange` prop (called "mango" only if `recolor`ed to a mango yellow-orange; otherwise
      call it orange juice).
    - Blender: stand-in: a glass `cup` on a small `box`.

18. **Do and don't**
    - Don't ever add the denominators; show why the result is impossible before teaching the rule.
    - Do estimate before computing every time, and check the exact answer against the estimate.
    - Do say the denominator stays the same "because the piece size did not change".
    - Keep multiplying fractions out of this episode (it is a later topic); equivalence itself is G4-01, so
      renaming is reviewed quickly, not re-taught.
    - Show answers in simplest form where it is easy (10/24 → 5/12), but don't turn the episode into simplifying.

---

### G5-02 · Powers of Ten Elevator
**Grade 5 · Math / place value · 8:50 · classroom** — each place is ten times the place to its right, so multiplying by 10, 100 or 1,000 moves every digit one, two or three places to the left (and dividing moves them right); the decimal point stays where it is.
**Skills:** powers_of_ten_5 · **Standard:** CCSS 5.NBT.A.1, 5.NBT.A.2, 5.MD.A.1

1. **Big idea**
   "Times 10 moves every digit one place bigger: 3.5 × 10 = 35, because the digits move, not because we add a
   zero."

2. **Learning goals**
   - I can explain that each place is 10 times the place to its right and 1/10 of the place to its left.
   - I can multiply and divide whole numbers and decimals by 10, 100 and 1,000 by moving digits.
   - I can read and use powers of ten: 10² = 100, 10³ = 1,000.
   - I can convert metric lengths (m, cm, km) using powers of ten.

3. **Hook (first 15 s)**
   Monkey's banana stand: "1 banana: $0.35". Robo orders 10. Monkey: "Times 10? Just add a zero!" He writes
   "$0.350". Robo pays 35 cents and walks off with ten bananas. Monkey's jaw drops: "Wait... I just sold ten
   bananas for the price of one!"

4. **What makes it unique**
   The place value chart is a tall building: each floor up is worth 10 times more. Digits ride an elevator up
   one floor for each × 10 and down one floor for each ÷ 10, while the decimal point is a fixed landing that
   never moves. Then the building gently lies down on its side (top to the left) and becomes the usual
   left-to-right place value chart: "up the building" is "left in the chart".

5. **Cast and roles**
   - **Robo** (host, building manager): explains floors and models.
   - **Monkey** (sidekick, `squeaky`, banana seller): "adds a zero" to 0.35 (hook) and says 10³ = 30.
   - **Bear** (guest, `deep`, elevator operator): presses the buttons (× 10, × 100, ÷ 10...) and rings the bell
     at each floor.

6. **Setting and look**
   Classroom stage, `soft_day`. Left: the Place Value Building, an upright `grid` of 1 column × 8 floors with
   floor names (ten thousands, thousands, hundreds, tens, ones, a gold decimal point landing, tenths,
   hundredths). Right: base-ten models on a table (ten_unit, ten_rod, ten_flat, and a 10 × 10 × 10 `cubes`
   block). Digits are `number_block`s (single digits) that ride a glass elevator car. Colours: each digit keeps
   its colour as it moves (3 blue, 5 orange, 7 green). Mood: bright and snappy.

7. **Storyline**

   | # | Chapter | Time | What happens | Teaching move | Emotional beat |
   |---|---|---|---|---|---|
   | 1 | Ten bananas for 35¢ | 0:00–0:30 (30 s) | Monkey's "add a zero" | Hook | Funny |
   | 2 | The Place Value Building | 0:30–1:40 (70 s) | 1, 10, 100, 1,000: each floor ten times the one below | Model | Wow |
   | 3 | Going up: × 10, × 100, × 1,000 | 1:40–2:50 (70 s) | 37 → 370 → 3,700 → 37,000; zeros hold empty places | Model + generalise | Aha |
   | 4 | Powers of ten | 2:50–3:40 (50 s) | 10² and 10³; Monkey's 30 | Generalise | Clever |
   | 5 | Decimals ride too | 3:40–5:00 (80 s) | 3.5 × 10 = 35; 0.35 × 10 = 3.5; × 100 = 35; the building lies down | Explain (misconception) | Big aha |
   | 6 | Going down: ÷ 10, ÷ 100, ÷ 1,000 | 5:00–6:00 (60 s) | 45 ÷ 10 = 4.5; 6 ÷ 100 = 0.06; 320 ÷ 1,000 = 0.32 | Apply | Focused |
   | 7 | The Elevator chant | 6:00–6:20 (20 s) | Chant | Practise | Joy |
   | 8 | Metres and money | 6:20–7:15 (55 s) | 2.5 m = 250 cm; 1,500 m = 1.5 km; 10 pencils at $0.45 | Apply (real world) | Recognition |
   | 9 | Challenge: Bear's buttons | 7:15–7:55 (40 s) | Three quick rides | Challenge | Fast fun |
   | 10 | Quiz and recap | 7:55–8:35 (40 s) | Four questions, recap card | Check | Proud |
   | 11 | Your turn: place value slider | 8:35–8:50 (15 s) | Home activity, goodbye | Praise | Inspired |

   Total: 530 s = 8:50.

   **Chapter 2:** a ten_unit (1), a ten_rod (10 units), a ten_flat (10 rods = 100), and a `cubes` block of
   10 × 10 × 10 (10 flats = 1,000) appear one by one, each beside its floor. Each one is ten of the one before.
   Going down: one tenth of a unit is a thin slice (0.1), shown as a unit cut into 10 slices.

   **Going up (chapter 3):** 37 sits on the tens and ones floors. Bear presses "× 10": the 3 and the 7 both ride
   up one floor (3 hundreds, 7 tens); the ones floor is empty, so a 0 fills it as a placeholder: 370. "× 100"
   from 37: two floors up: 3,700. "× 1,000": three floors: 37,000. Pattern: the number of zeros in 10, 100, 1,000
   is the number of floors the digits ride.

   **Powers of ten (chapter 4):** 10² means 10 × 10 = 100; 10³ = 10 × 10 × 10 = 1,000. Monkey: "10³ is 30!"
   (He multiplied 10 × 3.) `mark` incorrect; the exponent counts how many tens are multiplied together, which is
   also how many floors to ride: 4 × 10³ = 4,000.

   **Decimals ride too (chapter 5):** the hook replayed in the building: 0.35 is 3 tenths and 5 hundredths. "× 10":
   both digits ride up one floor: 3 ones and 5 tenths = 3.5. Monkey's "$0.350" puts a 0 in the thousandths:
   0.350 is still 0.35 (a zero at the end of a decimal changes nothing), `mark` incorrect. 10 bananas cost
   $3.50. More: 3.5 × 10 = 35; 0.35 × 100 = 35; 2.7 × 100 = 270. Then the building lies down (top swings to the
   left): the floors become the usual chart, the digits now move left for × and right for ÷, and the decimal
   point still has not moved.

   **Going down (chapter 6):** 45 ÷ 10 = 4.5 (each digit one floor down); 6 ÷ 100 = 0.06 (two floors; a 0 holds
   the tenths); 320 ÷ 1,000 = 0.32.

   **Metres and money (chapter 8):** 1 m = 100 cm, so 2.5 m × 100 = 250 cm (a metre stick and a half). 1 km =
   1,000 m, so 1,500 m ÷ 1,000 = 1.5 km. 10 pencils at $0.45 each = $4.50.

   **Challenge (chapter 9):** 0.07 × 1,000 = 70; 5.2 × 10² = 520; 8,000 ÷ 10³ = 8.

8. **Animation and staging list**

   | Moment | Objects | Actions | Camera |
   |---|---|---|---|
   | Banana stand | monkey, banana props, price sign letters "$0.35", "$0.350" | `pop` sign, monkey `feel` happy, then `feel` surprised; robo `clip` Walking off with bananas | `shot` wide, then `shot` close on the sign |
   | Building | upright grid 1 × 8, floor name letters, gold decimal point landing (plate + sphere) | `build` floors (`order: rows`) bottom to top, `callout` each floor name | `shot` wide on the building; `camera` slow tilt up |
   | Base-ten models | ten_unit, ten_rod, ten_flat, cubes 10 × 10 × 10 | `pop` each beside its floor, `build` the cubes block by layers (fast) | `shot` medium; `orbit` 40° around the 1,000 block |
   | Tenth slice | ten_unit split into 10 thin plates | `move` the slices apart (exploded) | `shot` close |
   | Elevator ride | number_blocks 3 and 7 in a glass elevator car (group), placeholder 0 | car `path` up one floor, `sound` bell at each floor, `pop` 0 on the empty floor | `shot` medium tracking the car |
   | Floors pattern | letters "× 10 → 1 floor", "× 100 → 2", "× 1,000 → 3" | `pop`, `highlight` zeros | `shot` close |
   | Powers | letters "10²", "10 × 10", "= 100", Monkey's "30" | `pop`, `mark` incorrect on 30 | `shot` medium |
   | Decimals ride | blocks 3 and 5 on tenths and hundredths floors | car `path` up one floor; `mark` incorrect on "0.350" card; `mark` correct on "$3.50" | `shot` close on the point landing |
   | Building lies down | the whole building group with `pivot` at its base | `turn` [0, 0, 90] slowly (top swings left); `callout` "left = bigger" | `shot` wide; `camera` pulls back so nothing crops |
   | Going down | blocks 4, 5; 6; 3, 2 | `move` right one, two, three places; `pop` placeholder zeros | `shot` medium |
   | Chant | everyone | `hop` up on "times", crouch (`grow` [1, 0.9, 1] on critters) on "divide" | `shot` wide |
   | Metres | metre stick, callouts "2.5 m = 250 cm" | `show`, `draw` callout | `shot` close |
   | Money | pencil props × 10, letters "$4.50" | `build` (pencils in a row), `pop` | `shot` medium |
   | Challenge | Bear, button panel (discs with letters) | bear presses (`nod`), `sound` windup_click, digits ride, `mark` correct | `shot` medium |
   | Goodbye | confetti | `burst`, monkey `hop` | `shot` wide |

9. **Experiment or hands-on activity**
   - **You need:** paper, a pencil, a ruler.
   - **Steps:** 1. Draw a chart with columns: thousands, hundreds, tens, ones, a big dot, tenths, hundredths.
     2. On a separate strip, write a number like 4 5 in boxes the same width as the columns. 3. Slide the strip
     one column left for × 10, right for ÷ 10. 4. Read the new number; fill empty places with 0.
   - **Prediction:** say the answer before you slide.
   - **Result:** the digits move; the dot stays.
   - **Safety:** if you cut the strip out, a grown-up helps with the scissors.

10. **Interaction moments**
    - Pause and guess (2–3 s, `windup_click`): "Where will the 3 be after × 100?"; "Is 0.350 more than 0.35?";
      each challenge ride.
    - Call and response: Robo: "Times ten?" Kids: "One place bigger!" Robo: "Divide by ten?" Kids: "One place
      smaller!" Robo: "The point?" Kids: "Stays put!"
    - Move-along: point up and step left for "times", point down and step right for "divide".

11. **Song or chant**
    Original elevator chant with a bell sound on each floor. Hook line idea: "Going up, one floor for every ten;
    going down, divide and back again!" Repeats in chapter 7 and during the challenge.

12. **Fun fact(s)**
    - A googol is 1 followed by 100 zeros (10¹⁰⁰); the name was invented by a 9-year-old boy (chapter 4).
    - "Kilo" means 1,000: a kilometre is 1,000 metres and a kilogram is 1,000 grams (chapter 8).
    - A blue whale can weigh more than 100,000 kg, which is 10⁵ kg (chapter 3).

13. **Vocabulary and captions**
    Labels: place value, digit, decimal point, placeholder zero, power of ten, exponent, base, tenths,
    hundredths, metre, centimetre, kilometre. Rule as a `title` caption: "× 10ⁿ: digits move n places left".
    Large numbers with commas (37,000).

14. **Quiz and recap**
    1. What is 4.6 × 10? (46.)
    2. What is 52 ÷ 100? (0.52.)
    3. What is 10³? (1,000.)
    4. Monkey says 0.8 × 10 = 0.80. Is he right? (No; 0.80 is still 0.8. The answer is 8.)
    Recap card: each place is 10 times the next; × moves digits left, ÷ moves them right; the decimal point
    stays; the exponent counts the places. Praise: Monkey resets his sign to "10 bananas: $3.50"; Bear rings the
    bell.

15. **Sound and music**
    Music `bouncy`, gain 0.18; `calm` 0.15 while the building lies down. Voice 1.0–1.02. Effects: bell (each
    floor), whoosh (elevator), cha_ching (banana stand), windup_click, ding, slide_whistle (Monkey's mistake,
    soft), crowd_cheer.

16. **Thumbnail and YouTube**
    Thumbnail concepts:
    - **a.** The glass elevator full of glowing digits rising up the place value building, Bear pressing a big
      "× 10" button, Monkey hanging on and grinning. Title "× 10!" in yellow.
    - **b.** Monkey's sign "$0.350" with a soft red cross and the fixed "$3.50" with a green tick; ten bananas
      piled up. Title "ADD A ZERO?" in white with a red outline.
    - **c.** The building lying on its side becoming a place value chart, arrows left "× 10" and right "÷ 10";
      Robo amazed. Title "POWERS OF 10" in green.
    Title idea: "Multiply and Divide by 10, 100 and 1,000 | Powers of Ten for Kids | Grade 5 Math | Toy Box
    Friends". Tags: powers of ten, multiply by 10, divide by 10, decimals, place value, exponents, grade 5 math,
    5th grade place value, metric conversion, Toy Box Friends.

17. **Catalog gaps**
    - Place value chart with floor or column names and digit slots: stand-in: upright `grid` + `letter`
      headers + `number_block` digits placed by hand. A `place_value_chart` kind (columns, labels, a fixed point
      and slots that digits `move` to by place name) would serve G4-02 and G5-02.
    - Elevator car: stand-in: a `glass` box `group` that carries the digits as children, moved with `path`.
    - Superscripts (10², 10³, 10⁵, 10¹⁰⁰, 10ⁿ): the Andika font file has these glyphs, but no script has used
      them yet in `letter` or captions; check them in a still before rendering, else write "10^3" style in the
      caption and say "ten to the power of three".
    - The 10 × 10 × 10 `cubes` block is 1,000 cubes: check render cost; stand-in: one 1 m cube with a 10 × 10
      grid texture on each face.

18. **Do and don't**
    - Never teach "add a zero"; it fails for decimals. Say "the digits move one place".
    - Do say once that the decimal point stays still and the digits move (that is what the building shows),
      even though people often say "move the point".
    - Don't say multiplying always makes a number "end in zeros"; show 0.07 × 1,000 = 70 and 3.5 × 10 = 35.
    - Keep money to whole cents (hundredths); hundredths arithmetic itself is `decimals_hundredths_5`.
    - Write numbers with commas for thousands and say them in words once (thirty-seven thousand).

---

### G5-03 · Volume Box Factory
**Grade 5 · Math / measurement · 9:00 · lab** — volume is the space inside a solid, counted in unit cubes; it is length × width × height (base area × height), volumes of joined boxes add, and 1,000 cubic centimetres make one litre.
**Skills:** volume_conversion_5 · **Standard:** CCSS 5.MD.C.3, 5.MD.C.4, 5.MD.C.5 (a, b, c), 5.MD.A.1

1. **Big idea**
   "Volume counts the cubes that fill a box: one layer times the number of layers, or length × width × height."

2. **Learning goals**
   - I can explain volume as the number of unit cubes that fill a solid, measured in cubic units (cm³).
   - I can find the volume of a box by counting layers and with V = l × w × h = B × h.
   - I can find the volume of a shape made of two boxes by adding their volumes.
   - I can convert between cm³, millilitres and litres (1 cm³ = 1 mL; 1,000 cm³ = 1 L).

3. **Hook (first 15 s)**
   The Box Factory's conveyor belt brings out two boxes: a tall thin one and a short wide one. A sign: "Fill me
   with cubes!" Monkey: "The tall one holds way more. It's huge!" Robo: "Let's fill them and count." Both hold
   exactly 24 cubes. Monkey: "No way!"

4. **What makes it unique**
   Every box can be filled, exploded and orbited. Layers lift apart like a cake so hidden cubes in the middle
   can be counted, which fixes the "count only what you see" mistake. The episode ends by pouring 1 litre of
   juice into a 10 cm × 10 cm × 10 cm box: it fills it exactly.

5. **Cast and roles**
   - **Robo** (host, factory manager): models with `cubes`; writes the formula.
   - **Monkey** (sidekick, `squeaky`, packer): picks the tall box (hook); counts only the cubes he can see (18
     instead of 24).
   - **Penguin** (guest, `deep`, shipping clerk): brings orders with sizes ("I need a box of 48 cm³").

6. **Setting and look**
   Lab stage, `studio` light. A conveyor (long table with roller cylinders), a packing bench, clear boxes
   (`cubes` with `box: true`), a glass 1-litre measure and a juice carton. Unit cubes are 1 cm in the story but
   drawn 10 cm big so they read clearly (one caption says "drawn bigger"). Colours: each layer a different soft
   colour (layer 1 blue, layer 2 green, layer 3 yellow) so layers can be counted. Mood: busy, clever, tidy.

7. **Storyline**

   | # | Chapter | Time | What happens | Teaching move | Emotional beat |
   |---|---|---|---|---|---|
   | 1 | Which box holds more? | 0:00–0:30 (30 s) | Tall vs wide; both 24 | Hook | Surprise |
   | 2 | What is volume? | 0:30–1:25 (55 s) | Space inside; the unit cube; cm³; area vs volume | Teach | Curious |
   | 3 | Fill and count in layers | 1:25–2:55 (90 s) | 4 × 3 base = 12 per layer, 2 layers = 24; Monkey's 18 | Model + misconception | Aha |
   | 4 | The formula | 2:55–4:05 (70 s) | V = l × w × h = B × h; check both hook boxes | Generalise | Confident |
   | 5 | Same volume, different boxes | 4:05–4:50 (45 s) | Four boxes of 24 cm³ | Explore | Wow |
   | 6 | Factory build: two boxes joined | 4:50–5:55 (65 s) | An L-shape split two ways; 24 + 12 = 36 | Apply | Clever |
   | 7 | Litres and cubic centimetres | 5:55–6:55 (60 s) | 1,000 cm³ = 1 L; a fish tank of 12 L | Apply (real world) | Big wow |
   | 8 | The Layer chant | 6:55–7:15 (20 s) | Chant | Practise | Joy |
   | 9 | Penguin's orders | 7:15–8:05 (50 s) | Three orders | Challenge | Busy fun |
   | 10 | Quiz and recap | 8:05–8:45 (40 s) | Four questions, recap card | Check | Proud |
   | 11 | Your turn: block boxes | 8:45–9:00 (15 s) | Home activity, goodbye | Praise | Inspired |

   Total: 540 s = 9:00.

   **What is volume (chapter 2):** a flat square (1 cm²) covers area; a cube (1 cm³) takes up space. Area counts
   squares on a flat surface; volume counts cubes that fill a solid. A cube 1 cm on every edge is one cubic
   centimetre, written cm³.

   **Fill and count (chapter 3):** the wide box is 4 cm long, 3 cm wide, 2 cm high. The bottom layer: 4 × 3 = 12
   cubes. The second layer: 12 more. 12 + 12 = 24 cm³. Monkey's count: he counts only the cubes he can see from
   the front, top and side: 18. The top layer lifts up (exploded view) and the camera goes over the bottom
   layer: 6 hidden cubes at the back and in the middle. `mark` incorrect on 18, correct on 24.

   **Formula (chapter 4):** the base area B = l × w = 4 × 3 = 12; the height says how many layers: V = B × h = 12 ×
   2 = 24 cm³. Same as l × w × h = 4 × 3 × 2. The tall box is 2 × 2 × 6: B = 4, 6 layers, V = 24 cm³. Same volume,
   different shape. Monkey: "So tall doesn't mean more."

   **Same volume, different boxes (chapter 5):** 2 × 3 × 4, 1 × 4 × 6, 2 × 2 × 6 and 1 × 1 × 24 (a tower) are
   all 24 cm³.

   **Two boxes joined (chapter 6):** a shape like an L seen from the front: a bottom box 4 × 3 × 2 with a tower
   2 × 3 × 2 on top of its left end. Way 1: bottom 4 × 3 × 2 = 24 plus top 2 × 3 × 2 = 12 → 36 cm³. Way 2: left
   column 2 × 3 × 4 = 24 plus right part 2 × 3 × 2 = 12 → 36 cm³. Both splits give 36: volumes add.

   **Litres (chapter 7):** build a 10 × 10 × 10 box: 1,000 cubes = 1,000 cm³. Penguin pours a 1-litre juice
   carton into a hollow box of the same size: it fills exactly. So 1 L = 1,000 cm³, and 1 cm³ = 1 mL. A fish tank
   30 cm × 20 cm × 20 cm: 30 × 20 = 600 cm² base, × 20 = 12,000 cm³ = 12 L of water.

   **Penguin's orders (chapter 9):** 1. A box 5 × 4 × 3: volume? (60 cm³.) 2. A box with a 4 × 3 base must hold
   48 cm³: how tall? (48 ÷ 12 = 4 cm.) 3. Double the height of the 2 × 3 × 4 box: what happens to the volume?
   (2 × 3 × 8 = 48: it doubles.)

8. **Animation and staging list**

   | Moment | Objects | Actions | Camera |
   |---|---|---|---|
   | Two boxes arrive | conveyor (table + roller cylinders), box_tall (`cubes` 2 × 2 × 6, `box: true`, empty), box_wide (4 × 3 × 2) | boxes `path` along the conveyor, monkey `look` at the tall one, `feel` happy | `shot` wide |
   | Fill both | the two cubes objects | `build` (`order: layers`) with `sound` block per layer; `caption` count "24", "24" | `shot` medium on both |
   | Flat vs solid | square plate 1 × 1, unit cube | `pop`, `callout` "1 cm²", "1 cm³" | `shot` close |
   | Layer 1 | box_wide layer 1 (blue, its own cubes 4 × 3 × 1) | `build` (`order: rows`), `caption` count to 12 | `shot` from above (`height` 60) |
   | Layer 2 | layer 2 (green) | `build`, `caption` count 24 | `shot` medium |
   | Monkey's count | the full box | `highlight` the visible cubes, `caption` "18?" | `shot` medium at the 3/4 view |
   | Exploded view | layer 2 | `move` up 0.4 m, `highlight` the 6 hidden cubes in layer 1, `mark` incorrect on "18", `mark` correct on "24" | `orbit` 60° round the box, then `shot` from above |
   | Formula | letters "B = 4 × 3 = 12", "V = B × h = 12 × 2 = 24" | `pop` in order; `callout` "base", "height" on the box | `shot` medium on the board |
   | Tall box check | box_tall | `build` by layers, `callout` "B = 4, 6 layers" | `shot` medium; `orbit` 30° |
   | Four boxes | four cubes objects | `pop` each with a `callout` "2 × 3 × 4" etc. | `shot` wide |
   | L-shape | bottom box + tower (two cubes objects, different colours) | `build`; split way 1: `move` the tower up and apart; rejoin; split way 2: recolour (`paint`) and `move` left column apart | `shot` medium; `orbit` 45° |
   | Litre cube | cubes 10 × 10 × 10 (built by layers, fast), hollow glass box (same size), juice carton (box) | `build` quick, then hollow box: carton `turn` to pour, water `grow` [1, 1→10, 1] steps, `sound` pour | `shot` medium; `close` on the full line |
   | Fish tank | glass box 30 × 20 × 20 (scaled), fish critter inside | `grow` water to the top, fish `show`, `callout` "12,000 cm³ = 12 L" | `shot` medium |
   | Chant | everyone | `hop` per layer word | `shot` wide |
   | Orders | penguin, order cards | `sound` windup_click, `build` the box, `mark` correct | `shot` medium |
   | Goodbye | confetti | `burst`, boxes `path` off on the conveyor | `shot` wide |

9. **Experiment or hands-on activity**
   - **You need:** same-size toy building blocks, sugar cubes or dice (about 30), a small box.
   - **Steps:** 1. Build a box 3 long, 2 wide and 2 high and count the cubes (12). 2. Predict the count for
     3 × 2 × 4, then build it (24). 3. Build three different boxes that each use 12 cubes. 4. Estimate how many
     of your cubes would fill a small box, then test.
   - **Prediction:** say the count before you build, using layers.
   - **Result:** volume = cubes in one layer × number of layers.
   - **Safety:** small cubes and dice are a choking risk for babies and toddlers: keep them away from younger
     children and tidy up after.

10. **Interaction moments**
    - Pause and guess (2–3 s, `windup_click`): "Which box holds more?"; "How many hidden cubes?"; "Will a litre
      fill this box?"; each order.
    - Call and response: Robo: "One layer?" Kids: "Length times width!" Robo: "How many layers?" Kids: "The
      height!"
    - Move-along: hands flat for a layer, stack one hand on the other for each new layer.

11. **Song or chant**
    Original stacking chant, one beat per layer. Hook line idea: "Length times width makes a layer, stack them
    high, the height's the player!" Repeats in chapter 8 and over the goodbye.

12. **Fun fact(s)**
    - A 1-litre milk or juice carton holds 1,000 cm³ (chapter 7).
    - An Olympic swimming pool (50 m × 25 m × at least 2 m) holds about 2,500,000 litres of water (chapter 7).
    - The litre was first defined as the space inside a cube 10 cm on each side (chapter 7).

13. **Vocabulary and captions**
    Labels: volume, unit cube, cubic centimetre (cm³), layer, base, base area, height, length, width, litre (L),
    millilitre (mL). Formula captions: "V = l × w × h" and "V = B × h". Units always written: "24 cm³".

14. **Quiz and recap**
    1. A box is 3 cm × 4 cm × 5 cm. What is its volume? (60 cm³.)
    2. Why did Monkey count 18 instead of 24? (He missed the hidden cubes inside and behind.)
    3. How many cm³ are in 2 litres? (2,000 cm³.)
    4. A shape is made of a 24 cm³ box and a 12 cm³ box. Its volume? (36 cm³.)
    Recap card: count cubes; layer × layers; l × w × h = B × h; add joined boxes; 1,000 cm³ = 1 L. Praise: Penguin
    stamps every order "shipped"; Monkey: "I'll never forget the hidden ones."

15. **Sound and music**
    Music `playful`, gain 0.18; `calm` 0.15 for the exploded view. Voice 1.0–1.02. Effects: block (each layer),
    whoosh (explode), pour (litre), splash (fish tank, soft), windup_click, ding, boing (Monkey's 18, soft),
    crowd_cheer.

16. **Thumbnail and YouTube**
    Thumbnail concepts:
    - **a.** A clear box with layers floating apart in blue, green and yellow, the hidden middle cubes glowing;
      Monkey peeking between the layers in surprise. Title "HIDDEN CUBES!" in yellow.
    - **b.** The tall box and the wide box side by side with "24 = 24" between them; Robo and Monkey with big
      shocked faces. Title "SAME VOLUME?" in white with a blue outline.
    - **c.** A juice carton pouring into a glowing 10 cm cube box with "1 L = 1,000 cm³". Title "VOLUME!" in green.
    Title idea: "Volume for Kids: Length × Width × Height and Unit Cubes | Grade 5 Math | Toy Box Friends". Tags:
    volume for kids, volume of a rectangular prism, unit cubes, cubic centimetres, length width height, base
    times height, litres and millilitres, grade 5 math, 5th grade geometry, Toy Box Friends.

17. **Catalog gaps**
    - Exploded layers: `cubes` is one object, so a layer cannot be lifted alone. Stand-in: build each layer as
      its own `cubes` object (h = 1) stacked. Named layer parts on `cubes` (`#layer1`...) would make exploded
      views simple.
    - Highlighting the visible vs hidden cubes: stand-in: separate small `cubes` groups for the hidden 6.
    - Conveyor belt: stand-in: a long `table` with a row of roller `cylinder`s; boxes travel with `path`.
    - A hollow clear box that fills with water: stand-in: a `glass` box with a `water` box inside that `grow`s
      upward.
    - Juice carton: stand-in: a small `box` in white and orange with a `letter` "1 L".

18. **Do and don't**
    - Do always write and say the units (cm³ for volume, cm² for area); never drop the "cubed".
    - Don't confuse volume with surface (the cubes you can see); show the hidden cubes.
    - Don't say "tall means more"; show the same volume in different shapes.
    - Keep unit cubes clearly "drawn bigger" so scale stays honest.
    - Keep area and perimeter (G3-03) as a quick contrast only.

---

### G5-04 · Body Systems Tour: heart and lungs
**Grade 5 · Science / life · 8:50 · lab** — body systems are teams of organs; the lungs (respiratory system) swap oxygen and carbon dioxide, the heart (circulatory system) pumps blood round the body, and the two work together, faster when we exercise.
**Skills:** body_systems_5 · **Standard:** NGSS 4-LS1-1 (internal structures and their functions); grade 5 health and life science units on the circulatory and respiratory systems; previews MS-LS1-3 (interacting body systems)

1. **Big idea**
   "Your lungs bring oxygen in and send carbon dioxide out; your heart pumps blood to carry them, and they work
   as a team."

2. **Learning goals**
   - I can explain that a body system is a group of organs working together.
   - I can trace the path of air: nose or mouth → windpipe → bronchi → lungs → tiny air sacs, and explain how the
     diaphragm helps us breathe.
   - I can explain that oxygen passes into the blood and carbon dioxide passes out in the air sacs.
   - I can explain that the heart is a muscle that pumps blood (right side to the lungs, left side to the body),
     and why heart rate and breathing go up during exercise.

3. **Hook (first 15 s)**
   A dark lab. A soft "thump-thump, thump-thump". A see-through toy body lights up in the middle of the bench,
   with a small red heart glowing in time with the sound. Monkey, out of breath from running in: "That's me
   after the race! My lungs are pumping my blood so fast!" Robo: "Your lungs? Let's take a tour and find out."

4. **What makes it unique**
   It is the series' first anatomy tour, done with a friendly see-through toy body (no blood or gore): a cutaway
   chest, an exploded view of the air sacs, and blood shown only as moving red and blue dots in clear tubes,
   looping in a figure-8 (body loop and lung loop). An exercise test with real pulse counts ends in a simple
   result table.

5. **Cast and roles**
   - **Robo** (host, tour guide): drives the cutaways and close-ups; Robo himself has a "battery, not a heart",
     a small joke that sets up "living bodies need oxygen".
   - **Monkey** (sidekick, `squeaky`): thinks the lungs pump blood (hook) and that we breathe out "only carbon
     dioxide"; does the pulse count.
   - **Dog** (guest, `deep`, runner): the exercise test volunteer (at rest, then after one minute of jumping).

6. **Setting and look**
   Lab stage, `studio` light, dimming (`lights` `dim`) for the hook and the air sac close-up so the glowing parts
   read. The body_model stands on a turntable at the centre of the bench, about 1.4 m tall, see-through, with
   the lungs (soft pink), heart (red), windpipe and bronchi (pale tubes) and diaphragm (a curved sheet). A side
   screen (plate) shows close-ups. Colour code: red dots = blood carrying lots of oxygen; blue dots = blood
   carrying less oxygen; yellow dots = oxygen; grey dots = carbon dioxide. Calm, wonder, clean.

7. **Storyline**

   | # | Chapter | Time | What happens | Teaching move | Emotional beat |
   |---|---|---|---|---|---|
   | 1 | Thump-thump in the dark | 0:00–0:30 (30 s) | The glowing heart; Monkey's claim | Hook | Curious |
   | 2 | The body systems team | 0:30–1:15 (45 s) | Systems are teams of organs; today's two systems | Teach | Interested |
   | 3 | The air path | 1:15–2:45 (90 s) | Nose → windpipe → bronchi → lungs; the diaphragm | Model (cutaway) | Wow |
   | 4 | The great swap | 2:45–3:55 (70 s) | Air sacs: oxygen in, carbon dioxide out; Monkey's claims checked | Model (close-up) + misconception | Aha |
   | 5 | The heart pump | 3:55–5:15 (80 s) | Fist-sized muscle; two sides; one-way valves; arteries, veins, capillaries | Model (cutaway) | Amazed |
   | 6 | The figure-8 team loop | 5:15–6:00 (45 s) | Lungs → heart → body → heart → lungs | Generalise | Satisfying |
   | 7 | The exercise test | 6:00–7:00 (60 s) | Dog's pulse and breaths, at rest and after jumping | Experiment | Excited |
   | 8 | The Pump-and-Swap chant | 7:00–7:20 (20 s) | Chant | Practise | Joy |
   | 9 | Keep your team healthy | 7:20–7:50 (30 s) | Moving, sleep, clean air, water and good food | Apply | Warm |
   | 10 | Quiz and recap | 7:50–8:35 (45 s) | Five questions, recap card | Check | Proud |
   | 11 | Your turn: find your pulse | 8:35–8:50 (15 s) | Home activity, goodbye | Praise | Inspired |

   Total: 530 s = 8:50.

   **Systems team (chapter 2):** callouts appear and fade on the body model: skeletal (bones hold you up),
   muscular (muscles move you), digestive (gets food's energy), nervous (brain and nerves send messages). Today:
   the respiratory system (breathing) and the circulatory system (heart, blood vessels and blood).

   **Air path (chapter 3):** a yellow air dot travels: nose or mouth → windpipe (trachea) → it splits into two
   bronchi → smaller and smaller tubes in each lung, like an upside-down tree → millions of tiny air sacs. The
   diaphragm, a sheet of muscle under the lungs, tightens and moves down: the chest gets more space and air flows
   in (lungs `grow` slightly). It relaxes and moves up: air flows out. Monkey copies with a hand on his belly.
   Fun detail: the left lung is a bit smaller, to make room for the heart.

   **The great swap (chapter 4):** the camera flies into one bunch of air sacs (exploded close-up, like a bunch of
   grapes), wrapped in tiny blood tubes (capillaries). Yellow oxygen dots pass from the air sac into the blood
   (blue dots turn red). Grey carbon dioxide dots pass from the blood into the air sac and are breathed out.
   Monkey's claim 1: "The lungs pump the blood." `mark` incorrect: the lungs swap gases; the heart pumps. Claim
   2: "We breathe out only carbon dioxide." `mark` incorrect: breathed-out air is still mostly the same air, with
   less oxygen and more carbon dioxide.

   **The heart pump (chapter 5):** the heart is a muscle about the size of your fist, in the middle of the
   chest, tipped a little to the left. A cutaway shows two sides with a wall between them. The right side pumps
   blood to the lungs to pick up oxygen; the left side pumps oxygen-rich blood out to the whole body. One-way
   valves (little doors) open and close so blood flows only one way; the "lub-dub" sound is the valves closing.
   Arteries carry blood away from the heart; veins bring it back; capillaries are tiny tubes where oxygen and
   food pass to the body's cells.

   **The figure-8 (chapter 6):** dots loop: left side of the heart → arteries → body muscles (red dots give
   oxygen and turn blue; cells make carbon dioxide) → veins → right side of the heart → lungs (swap: blue turns
   red) → left side again. Two loops joined at the heart. A caption once: "Real blood is always red. Our blue
   dots mean 'low on oxygen'."

   **Exercise test (chapter 7):** prediction first: what will happen to Dog's heartbeats and breaths after one
   minute of jumping? At rest: pulse counted for 15 seconds = 20, × 4 = 80 beats per minute; breaths about 20 per
   minute. After jumping: 30 beats in 15 seconds = 120 beats per minute; breaths about 35 per minute. Why:
   working muscles need more oxygen and make more carbon dioxide, so the heart pumps faster and we breathe
   faster and deeper. After two minutes of rest, both slow down again. (Example numbers, typical for children
   this age.)

   **Healthy team (chapter 9):** moving every day makes the heart muscle stronger; sleep and water help the
   whole body; clean air (no smoke) keeps the lungs healthy.

8. **Animation and staging list**

   | Moment | Objects | Actions | Camera |
   |---|---|---|---|
   | Dark lab heartbeat | body_model (see-through), heart (glow) | `lights` → dim, heart `grow` 1.08 and back on each beat, `sound` heartbeat | `shot` medium on the chest, slow `camera` push-in |
   | Monkey runs in | monkey | `move` in, `feel` surprised, `say` with `who` | `shot` medium (Monkey beside the model, not in front) |
   | Systems team | body_model, callouts for 4 systems | `draw` each `callout`, then `hide` | `orbit` 90° slowly round the turntable |
   | Air path | a yellow sphere on a `path` nose → windpipe → bronchi → lungs; tubes | `path`, `highlight` each part as it passes, `callout` "windpipe", "bronchi" | `shot` close on the chest; `shot` side `yaw` 60 |
   | Diaphragm | body_model#diaphragm, lungs | diaphragm `move` down 0.04, lungs `grow` [1.05, 1.05, 1.05]; then back | `shot` close, side view |
   | Upside-down tree | the bronchi tubes | `highlight`, `callout` "like an upside-down tree" | `shot` close |
   | Air sacs close-up | a cluster of pink spheres (air sacs) with thin tubes (capillaries) on the side screen | `show`, yellow dots `move` in, blue dots `paint` red, grey dots `move` out | `shot` close on the cluster; `orbit` 40° |
   | Monkey's claims | letters "lungs pump blood?", "only CO₂ out?" | `mark` incorrect each, monkey `feel` surprised then happy | `shot` medium |
   | Heart cutaway | heart model (two sides, a wall, valve flaps as parts) | `turn` the valve parts open and shut, `sound` heartbeat, `callout` "right side → lungs", "left side → body" | `shot` close, straight on |
   | Fist size | monkey's fist beside the heart | `highlight` both | `shot` close |
   | Vessels | tubes from the heart (red arteries, blue veins), fine capillary mesh | `draw` `pointer`s "away" and "back", `callout` names | `shot` medium |
   | Figure-8 | 12 red and blue dots on a looping `path` through clear tubes | `path` with staggered starts, `paint` red↔blue at the body and the lungs | `shot` wide on the model; then `orbit` 30° |
   | Colour note | caption | `caption` label "Real blood is always red. Blue dots = low on oxygen." | — |
   | Exercise test | dog, stopwatch (clock stand-in), letters "80", "120" | dog `hop` for one minute (sped up, `count` caption seconds), `sound` heartbeat faster, results table as callouts | `shot` medium; `close` on the numbers |
   | Chant | everyone | heart `grow` pulses on the beat, `wiggle` | `shot` wide |
   | Healthy team | ball, bed, water_jug, apple | `pop` each with a `callout` | `shot` medium |
   | Quiz | cards | `sound` windup_click, `mark` correct | `shot` medium |
   | Goodbye | stars | `burst` stars, robo `clip` Wave, dog `nod` | `shot` wide |

9. **Experiment or hands-on activity**
   - **Find your pulse:** put two fingers (not your thumb) gently on the inside of your wrist, below the thumb.
     Count the beats for 15 seconds, then multiply by 4. Write it down.
   - **Exercise test:** do one minute of jumping jacks or marching on the spot, then count again. Then rest for
     two minutes and count once more.
   - **Prediction:** before jumping, guess: higher, lower or the same?
   - **Result:** the pulse goes up after exercise and comes back down with rest.
   - **Safety (voice and screen):** "Press gently. Exercise only if you feel well, with space around you. Stop
     and rest if you feel dizzy or unwell, and tell a grown-up." Children with a heart or breathing condition
     only do the resting count, unless a doctor says otherwise.

10. **Interaction moments**
    - Pause and guess (2–3 s, `windup_click`): "Which part pumps the blood?"; "What will happen to Dog's
      heartbeat after jumping?"; each quiz question.
    - Call and response: Robo: "Lungs?" Kids: "Swap the air!" Robo: "Heart?" Kids: "Pumps the blood!"
    - Move-along: hand on belly, breathe in slowly (belly moves out as the diaphragm moves down), breathe out.

11. **Song or chant**
    Original two-part chant in a heartbeat rhythm (two quick beats, one rest). Hook line idea: "Breathe it in,
    swap it out, lub-dub, pump it all about!" Repeats in chapter 8 and softly in the goodbye.

12. **Fun fact(s)**
    - Your heart beats about 100,000 times a day (chapter 5).
    - Your left lung is a little smaller than your right, to make room for your heart (chapter 3).
    - Your lungs have hundreds of millions of tiny air sacs (chapter 4).

13. **Vocabulary and captions**
    Labels: body system, organ, respiratory system, circulatory system, lungs, windpipe (trachea), bronchi, air
    sacs, diaphragm, oxygen, carbon dioxide, heart, valve, artery, vein, capillary, pulse. Gas names written
    "oxygen" and "carbon dioxide (CO₂)" with the colour code key always visible when dots are on screen.

14. **Quiz and recap**
    1. Which organ pumps blood round the body? (The heart.)
    2. What happens in the tiny air sacs? (Oxygen goes into the blood; carbon dioxide comes out.)
    3. Where does the right side of the heart send blood? (To the lungs.)
    4. Which muscle moves down when you breathe in? (The diaphragm.)
    5. Why does your heart beat faster when you run? (Your muscles need more oxygen, so blood must move faster.)
    Recap card: lungs swap; heart pumps; arteries away, veins back; they work as a team; exercise speeds them up.
    Praise: Dog and Monkey high-five; Robo: "Great teamwork, inside and out."

15. **Sound and music**
    Music `calm`, gain 0.15 (the heartbeat must be clear); `happy` 0.2 for the chant and end. Voice 1.0. Effects:
    heartbeat (hook, heart chapter, exercise test, faster), whoosh (air in, soft), bubble_pop (gas swap, soft),
    windup_click, ding, crowd_cheer. No scary sounds.

16. **Thumbnail and YouTube**
    Thumbnail concepts:
    - **a.** The see-through toy body glowing with a red heart and pink lungs, red and blue dots looping;
      Monkey with a hand on his chest, wide-eyed; Robo beside him. Title "HEART & LUNGS" in yellow.
    - **b.** Close-up of the air-sac "grape bunch" with yellow and grey dots swapping; Robo amazed. Title "THE
      GREAT SWAP" in white with a pink outline.
    - **c.** Dog mid-jump with a heartbeat line rising from 80 to 120. Title "WHY FASTER?" in orange.
    Title idea: "How Your Heart and Lungs Work Together | Body Systems for Kids | Grade 5 Science | Toy Box
    Friends". Tags: heart and lungs, circulatory system, respiratory system, body systems for kids, human body,
    how the heart works, how we breathe, grade 5 science, 5th grade science, Toy Box Friends.

17. **Catalog gaps**
    - Heart cutaway with two sides and valve flaps as named parts: the planned `heart` model may be outside
      only. Stand-in: the heart model with a `half_circle`-cut front and two `plate` flaps; a cutaway variant
      (`heart_cutaway` with `#valve_l`, `#valve_r`) would be better.
    - Air sac close-up: no model. Stand-in: a `group` of 12 small pink spheres with thin `tube` capillaries; an
      `air_sacs` model would help.
    - Diaphragm and lungs as moving parts of `body_model`: check the planned model names parts (`#diaphragm`,
      `#lungs`, `#heart`); if not, place separate heart and lungs models inside the see-through body.
    - A stream of dots along a path (blood, air, energy): stand-in: 12 spheres, each with its own `path` and a
      staggered start. A `flow` kind (dots, count, path, speed, colour change at points) would serve G5-04 and
      G5-05.
    - Stopwatch: stand-in: the `clock` kind with only the minute hand used as a seconds hand.

18. **Do and don't**
    - No blood or gore: never show real blood, cuts or organs outside a body; the body is a clean toy model and
      blood is only moving dots in tubes.
    - Don't say veins carry "blue blood"; say the dots are a colour code and real blood is always red.
    - Don't say the lungs pump blood or the heart makes oxygen. Lungs swap gases; the heart pumps.
    - Don't say we breathe out only carbon dioxide; say "less oxygen, more carbon dioxide".
    - Do keep the safety line for the exercise test; don't push children to exercise to exhaustion.
    - Don't over-teach the four chambers by name; "two sides" is enough here (chambers are a bonus callout only).

---

### G5-05 · Ecosystem Energy: food chains and webs
**Grade 5 · Science · 8:55 · forest** — almost all the energy in an ecosystem starts as sunlight captured by producers; consumers get it by eating, decomposers return matter to the soil, arrows point the way energy flows, and only about a tenth passes on at each step.
**Skills:** ecosystems_5 · **Standard:** NGSS 5-LS2-1, 5-PS3-1

1. **Big idea**
   "Energy flows from the Sun to plants to animals, the arrows follow the energy, and decomposers recycle what is
   left."

2. **Learning goals**
   - I can explain that producers (plants) use sunlight, water and carbon dioxide to make their own food.
   - I can sort consumers as herbivores, carnivores and omnivores, and name decomposers.
   - I can draw a food chain with arrows that point the way energy flows (from the eaten to the eater).
   - I can explain a food web, predict what may happen if one part disappears, and explain why there is less
     energy at each step up.

3. **Hook (first 15 s)**
   Monkey peels a banana in the forest: "Where does a banana's energy come from?" He answers himself: "The
   banana tree... and the tree got it from... the soil?" Robo holds up a sunbeam: a glowing gold dot drifts down
   from the Sun into a banana plant leaf, then into the banana, then into Monkey, who suddenly has the energy to
   do a big jump. "Your jump started in the Sun."

4. **What makes it unique**
   Energy is something children can watch: glowing gold dots travel along the arrows from the Sun to plants to
   animals, and at each step most dots fade away as heat and movement, so the energy pyramid is built in front of
   them. Monkey draws arrows the wrong way round ("the fox points at what it eats"), and the dots refuse to travel
   backwards.

5. **Cast and roles**
   - **Robo** (host, forest guide): models chains, the web and the pyramid.
   - **Monkey** (sidekick, `squeaky`): thinks plants get their food from soil; draws arrows backwards; predicts
     the "what if" in the web.
   - **Bear** (guest, `deep`, the omnivore): eats berries, acorns and insects, so he joins several chains;
     points out that one animal can be in many chains.

6. **Setting and look**
   Forest stage, `soft_day`, with a sunny clearing. Living things stand on round grass mats (discs) arranged as a
   web on the forest floor so the camera can look down on it; `pointer` arrows lie between them. Gold energy dots
   are the only glowing things on screen. Animals stand calmly on their mats; no animal is ever shown catching or
   eating another (energy travels along the arrow instead). Colours: greens, warm browns, gold energy, soft grey
   for decomposers. Mood: wonder and teamwork.

7. **Storyline**

   | # | Chapter | Time | What happens | Teaching move | Emotional beat |
   |---|---|---|---|---|---|
   | 1 | A banana full of sunshine | 0:00–0:30 (30 s) | The energy dot from Sun to Monkey | Hook | Wonder |
   | 2 | Producers make food | 0:30–1:35 (65 s) | Sunlight + water + carbon dioxide → sugar (and oxygen); not from soil | Teach + misconception | Aha |
   | 3 | Consumers: who eats what? | 1:35–2:40 (65 s) | Herbivores, carnivores, omnivores | Teach + sort | Fun |
   | 4 | A food chain and the arrow rule | 2:40–4:00 (80 s) | Sun → grass → bunny → fox; Monkey's backwards arrows | Model + misconception | Clever |
   | 5 | Decomposers, the recyclers | 4:00–4:50 (50 s) | Mushrooms, worms, bacteria return matter to the soil | Teach | Surprise |
   | 6 | The food web | 4:50–6:05 (75 s) | Many chains linked; Bear in several; "what if the grasshoppers vanish?" | Model + predict | Big picture |
   | 7 | The energy pyramid | 6:05–6:55 (50 s) | About one tenth passes on at each step | Generalise | Wow |
   | 8 | The Sun-to-Me chant | 6:55–7:15 (20 s) | Chant | Practise | Joy |
   | 9 | Challenge: fix the web | 7:15–8:00 (45 s) | Three mistakes to find | Challenge | Detective fun |
   | 10 | Quiz and recap | 8:00–8:40 (40 s) | Four questions, recap card | Check | Proud |
   | 11 | Your turn: lunch chain | 8:40–8:55 (15 s) | Home activity, goodbye | Praise | Inspired |

   Total: 535 s = 8:55.

   **Producers (chapter 2):** green plants use sunlight to turn water (from the roots) and carbon dioxide (from
   the air) into sugar, their food, and they give off oxygen. This is photosynthesis. Monkey: "Plants eat soil!"
   `mark` incorrect: soil gives water and nutrients, but plants make their own food. Producers here: grass, an
   oak tree (acorns), a berry bush.

   **Consumers (chapter 3):** herbivores eat only plants: bunny (grass), grasshopper (grass), squirrel (mostly
   acorns and seeds). Carnivores eat other animals: frog (insects), hawk (mice, squirrels, frogs, bunnies).
   Omnivores eat plants and animals: mouse (seeds and insects), fox (bunnies, mice and berries), bear (berries,
   acorns and insects).

   **Food chain and the arrow rule (chapter 4):** Sun → grass → bunny → fox. Monkey draws fox → bunny → grass
   ("the fox points at what it eats"). The gold dots try to travel and stop: `mark` incorrect. Rule: the arrow
   means "gives energy to", so it points from the one that is eaten to the one that eats. A second chain:
   Sun → grass → grasshopper → frog → hawk. Words: producer, first consumer, second consumer, third consumer.

   **Decomposers (chapter 5):** when leaves fall and living things die, mushrooms and other fungi, bacteria too
   small to see, and helpers like worms break them down into nutrients in the soil. Plants take the nutrients up
   again. Matter goes round and round; energy does not, so producers need new sunlight every day.

   **The food web (chapter 6):** the chains join: grass feeds the bunny, the grasshopper and the mouse (seeds);
   acorns feed the squirrel, the mouse and the bear; berries feed the bear and the fox; the frog eats grasshoppers;
   the fox eats bunnies and mice; the hawk eats mice, squirrels, frogs and bunnies; the bear also eats insects.
   What if the grasshoppers disappeared? Prediction pause. The frog loses its food in this web, so there may be
   fewer frogs; the hawk may hunt more mice instead; the grass may grow taller. Changing one part can change many
   others.

   **The energy pyramid (chapter 7):** 1,000 energy dots enter the grass. About 100 reach the bunnies; the rest
   are used by the grass to live and grow or leave as heat. About 10 reach the fox. So there is less energy at
   each step, which is why there is more grass than bunnies and more bunnies than foxes. (About one tenth is a
   rough rule.)

   **Fix the web (chapter 9):** 1. An arrow from the hawk to the mouse (backwards; fix: mouse → hawk). 2. A web
   with no Sun (add it: producers need sunlight). 3. The mushroom labelled "producer" (it is a decomposer; it
   cannot make its own food from sunlight).

8. **Animation and staging list**

   | Moment | Objects | Actions | Camera |
   |---|---|---|---|
   | Banana sunshine | sun, banana, palm_tree (banana plant stand-in), monkey, one gold glowing sphere | sphere `path` Sun → leaf → banana → Monkey, monkey `hop` (big), `sound` magic_sparkle | `shot` wide, then `shot` close following the dot |
   | Photosynthesis | grass, oak tree, berry bush; small blue (water) and grey (carbon dioxide) dots; white (oxygen) dots | water dots `path` up the roots, grey dots `move` into a leaf, white dots `move` out, gold sugar `pop` in the leaf | `shot` close on a leaf (cutaway-style side screen) |
   | Plants eat soil? | letters "plants eat soil?" | `mark` incorrect, monkey `feel` surprised | `shot` medium |
   | Who eats what | bunny, grasshopper (bug), squirrel, frog, hawk, mouse, fox, bear on mats; three sorting rings labelled herbivore, carnivore, omnivore | animals `move` (walk/hop) into their ring; `callout` their food | `shot` from above (`height` 55), then `shot` close per animal |
   | Food chain | sun, grass, bunny, fox in a row; `pointer`s | `draw` pointers left to right, gold dots `path` along them | `shot` medium, low `height` |
   | Backwards arrows | the same row with pointers reversed | `draw` reversed, dots stop at the first arrow and fade, `mark` incorrect; pointers `turn` round and `draw` correctly, dots flow | `shot` close on the first arrow |
   | Second chain | grass, grasshopper, frog, hawk | `draw`, dots flow, `callout` "producer", "first consumer"... | `shot` medium |
   | Decomposers | fallen leaf pile, log, mushroom, worm, soil patch | `grow` mushrooms, worm `wiggle`, leaves `grow` down to 0.2, brown nutrient dots `move` into the soil and up a plant's roots | `shot` close, low |
   | Food web | all living things on mats in a web, 16 `pointer`s (plus 3 from the Sun to the producers) | `build` pointers one by one (`draw`), bear `look` at each of his chains, `highlight` Bear's three arrows | `shot` wide from above; `orbit` 60° slowly |
   | What if? | grasshoppers | `hide` grasshoppers, their arrows fade (`hide`), frog `feel` worried, `highlight` the hawk → mouse arrow, grass `grow` [1, 1.4, 1] | `shot` medium on the frog area |
   | Energy pyramid | a stepped pyramid of three plates (grass, bunny, fox layers); gold dots | 1,000 → dots flow up; most fade (`hide` in batches) with a soft warm shimmer; `caption` count "1,000", "100", "10" | `shot` medium, straight on; `camera` slow tilt up the pyramid |
   | Chant | everyone | `hop`, dots twinkle | `shot` wide |
   | Fix the web | a small web with three planted mistakes | `sound` windup_click, `mark` incorrect, then fix (`turn` arrow, `show` sun, `paint` label) and `mark` correct | `shot` close per mistake |
   | Goodbye | stars, gold dots | `burst`, robo `clip` Wave, bear `nod` | `shot` wide |

9. **Experiment or hands-on activity**
   - **Lunch chain:** pick one food from your lunch and trace it back to the Sun with arrows. Example: Sun →
     wheat → bread → you; Sun → grass → cow → milk → you.
   - **Decomposer watch (outdoors):** look under a log or a pile of leaves for mushrooms, worms and soft rotting
     leaves. Draw what you find.
   - **Prediction:** before looking, guess where you will find the most decomposers (damp, shady places).
   - **Safety (voice and screen):** "Look, but don't touch or eat wild mushrooms. Some are poisonous." Go with a
     grown-up, wash your hands afterwards, gently put logs back and let creatures go where you found them.

10. **Interaction moments**
    - Pause and guess (2–3 s, `windup_click`): "Which way does the arrow point?"; "Herbivore, carnivore or
      omnivore?"; "What if the grasshoppers vanish?"; each fix-the-web mistake.
    - Call and response: Robo: "Where does the energy start?" Kids: "The Sun!" Robo: "Which way do arrows go?"
      Kids: "To the eater!"
    - Move-along: arms up as the Sun, arms out as leaves, hop as a bunny, prowl as a fox (gently).

11. **Song or chant**
    Original passing chant; children "pass" the energy with a clap to the right. Hook line idea: "Sun to the
    leaf and leaf to me, follow the arrow, follow the energy!" Repeats in chapter 8 and in the goodbye.

12. **Fun fact(s)**
    - Earthworms have no lungs; they breathe through their skin (chapter 5).
    - One honey fungus in Oregon, USA, spreads underground over about 9 square kilometres, making it one of the
      largest living things on Earth (chapter 5).
    - Plants capture only a small part of the sunlight that reaches their leaves, yet it feeds almost every food
      chain on land (chapter 7).

13. **Vocabulary and captions**
    Labels: ecosystem, producer, consumer, herbivore, carnivore, omnivore, decomposer, photosynthesis, food
    chain, food web, energy, energy pyramid, nutrients. Arrow rule as a `title` caption: "→ means 'gives energy
    to'". Each living thing has a `callout` name card.

14. **Quiz and recap**
    1. Where does almost all the energy in a food chain come from? (The Sun.)
    2. In Sun → grass → bunny → fox, which way do the arrows point and why? (From the eaten to the eater: the
       way energy flows.)
    3. Is a bear a herbivore, carnivore or omnivore? (Omnivore.)
    4. Why are there fewer foxes than bunnies? (Only about a tenth of the energy passes up each step.)
    Recap card: producers make food from sunlight; consumers eat; decomposers recycle matter; arrows follow
    energy; less energy at each step. Praise: the web glows gold; Bear: "Everyone in the forest is connected."

15. **Sound and music**
    Music `calm`, gain 0.16, `happy` 0.2 for the chant and end. Voice 1.0–1.02. Effects: magic_sparkle (energy
    dots), sprout_spring (photosynthesis), whoosh (dots flow, soft), crystal_chime (pyramid), windup_click, ding,
    boing (backwards arrows, soft), crowd_cheer. Gentle forest ambience; no predator sounds or growls.

16. **Thumbnail and YouTube**
    Thumbnail concepts:
    - **a.** A glowing gold path of arrows from a bright Sun through grass, a bunny and a fox on mats; Monkey
      with a banana, wide-eyed. Title "FOLLOW THE ENERGY" in yellow.
    - **b.** A wide food web from above with the hawk, fox, bear, frog and bunny linked by glowing arrows; Bear
      in the middle smiling. Title "FOOD WEB!" in white with a green outline.
    - **c.** Monkey's backwards arrow with a soft red cross beside the right one with a green tick. Title "WHICH
      WAY?" in orange.
    Title idea: "Food Chains and Food Webs for Kids | Producers, Consumers, Decomposers | Grade 5 Science | Toy
    Box Friends". Tags: food chain, food web, producers and consumers, decomposers, energy flow, energy pyramid,
    ecosystems for kids, photosynthesis for kids, grade 5 science, Toy Box Friends.

17. **Catalog gaps**
    - Grasshopper: the planned `bug` may be a beetle or ladybird. Stand-in: `bug` called "insect" if it is not a
      grasshopper (the chain still works: Sun → grass → insect → frog → hawk). A `grasshopper` model would be
      exact.
    - Berry bush: stand-in: the `bush` prop with small red spheres.
    - Banana plant: stand-in: `palm_tree` (say "banana plant" only if it looks like one; otherwise use the
      banana alone).
    - A stream of energy dots along arrows: same `flow` gap as G5-04; stand-in: spheres on staggered `path`s.
    - Fading many dots at once for the pyramid: stand-in: three dot groups, `hide` in batches.
    - Acorns: stand-in: small brown spheres with `dome` caps.

18. **Do and don't**
    - Do say arrows mean "gives energy to" and point toward the eater; never "eats".
    - Don't say plants get food from soil; they make it from sunlight, water and carbon dioxide.
    - Don't say energy is recycled; matter is recycled by decomposers, energy flows in from the Sun and leaves as
      heat. Say "almost all" energy comes from the Sun (a few deep-sea ecosystems use chemicals instead).
    - No gore and no peril: animals never chase, catch or eat each other on screen; energy dots do the moving.
    - Keep habitats (G2-08) and life cycles (G3-05) as quick reminders only; this episode is about energy and
      feeding relationships.
