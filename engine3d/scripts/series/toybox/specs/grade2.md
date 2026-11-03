# Grade 2 video specs (G2-01 to G2-10)

These ten specs are the grade 2 part of batch 2 of "Toy Box Friends" (ages 7–8, 6–9 minutes each). Every
episode is a mystery or mission with an "explain why" moment, a practice part and a challenge round. Robo
hosts and sometimes gets things wrong on purpose. Cat is the grade 2 sidekick: clever, a little cool, always
asking "but why?" and checking answers. One or two animal guests per episode have a clear job. Each spec
follows the 18-heading template in [README.md](README.md), stays inside its topic's lane (see "Kept apart"),
uses only the batch 1 cast and catalog, and lists anything missing under **Catalog gaps** with a stand-in.
All arithmetic, word lists and facts below were checked. Specs have no final dialogue and no JSON. The
script writer turns each spec into a `video3d` script following `../SERIES.md`. For grade 2 that means
`audience` set to the grade 2 value the series test accepts once one is added (see the note in the summary).

| Id | Title | Subject | Hook style | Unique twist | Length |
|---|---|---|---|---|---|
| G2-01 | Magic E | English / phonics | A broken machine that changes words overnight | The silent e is a "quiet wizard"; a Rule Breakers jail for have, give, love | 8:00 |
| G2-02 | Describing Words Zoo | English / grammar | A guessing game: a mystery animal behind a curtain | The Zoo Sign Machine: each describing word changes the animal on screen | 7:30 |
| G2-03 | Regroup Rally: two-digit adding | Math | A race with a countdown start | A Trade Booth pit stop swaps 10 ones for 1 ten; Robo "crashes" with 312 | 8:30 |
| G2-04 | Hundreds Tower: place value to 999 | Math | A locked vault with a 3-digit code | The Digit Swap trick: 4, 7, 2 make six different numbers | 7:45 |
| G2-05 | Five-Minute Clock Race | Math / time | A deadline: Dog must catch the 3:25 train | The minute hand runs a "lap of fives"; the sneaky hour hand at 7:50 | 7:30 |
| G2-06 | Measure It! | Math / measurement | An argument: 4 bear-steps or 12 chick-steps? | Big is not always heavy; tall is not always more | 8:15 |
| G2-07 | Plant Lab: What Do Plants Need? | Science experiment | A science-fair question and two mystery plants | A real fair test with a 10-day time-lapse in 40 s | 8:30 |
| G2-08 | Habitat Hop | Science | A rescue: Frog wakes up in the desert | Two bear cousins, one brown and one white, show why fur fits a home | 7:45 |
| G2-09 | Treasure Map Quest | Social studies / geography | A paper plane delivery | The camera rises to a bird's-eye view and the playroom becomes a map | 7:30 |
| G2-10 | Melt, Freeze, Fizz | Science experiment | A detective case: the missing ice pop | Toy "particles" dance as solid, liquid and gas; can we undo it? | 8:45 |

Notes for all ten:

- Sentences up to 14 words, voice speed 1.0, `meta.voice` `soft` for Robo. Cat uses one other timbre from
  `catalog/story/tts_voices.json`, chosen once and kept for every grade 2 episode. Guests may use `deep` or
  `squeaky`.
- Pattern: mystery or mission → explain why → practise → challenge round → quiz → cheer.
- Pause and guess: 2–3 s with `windup_click`, then the answer, then praise.
- Every episode needs at least 3 chapters of 10 s or more (all chapters below are 10 s or more). Chapter
  timings add up to the length in the table.
- The series test currently knows `audience: babies | prek`. Grade 2 scripts need a new audience value
  (for example `grade2`). This is flagged under Catalog gaps in G2-01 and applies to all ten.

---

### G2-01 · Magic E
**Grade 2 · English / phonics · 8:00 · studio** — short-vowel words become long-vowel words when a silent e joins the end.
**Skills:** long_vowels_2, vowel_teams_2 · **Standard:** CCSS RF.2.3a, RF.2.3b (builds on RF.1.3c)

1. **Big idea**
   "When a quiet e sits at the end of a short word, the vowel says its own name: cap becomes cape."

2. **Learning goals**
   - I can hear the difference between a short vowel (cap) and a long vowel (cape).
   - I can add a silent e to a short word and read the new word.
   - I can explain why the e changes the sound, even though the e itself is quiet.
   - I can spot two vowel teams (ai, oa) that also make long sounds.

3. **Hook (first 15 s)**
   Robo's Word Machine (a big box with lights) has been glitching all night. Robo shows yesterday's word
   blocks: c-a-p, k-i-t, c-u-b. This morning they read c-a-p-e, k-i-t-e, c-u-b-e, and a cap has turned into
   a cape on the shelf. Robo: "Who changed my words?" A tiny sparkle zips behind the machine. Cat narrows
   her eyes: "Something small... and quiet."

4. **What makes it unique**
   The silent e is a character: a small glowing letter e (glow material) who never speaks. It only works
   magic by hopping onto the end of a word. Kids learn that the e "makes no sound but changes everything".
   A Rule Breakers jail at the end shows honest exceptions (have, give, love), which no other episode does.
   This is the deliberate callback to G1-01's CVC words.

5. **Cast and roles**
   - **Robo** (host): runs the Word Machine; reads the long-vowel word wrongly once ("kit-eh") so kids can
     fix him.
   - **Cat** (sidekick): asks "but why does a quiet letter change the sound?"; checks each pair by ear.
   - **Frog** (guest, cameo from grade 1): brings the grade 1 short-vowel words from "Short Vowel Island"
     in a gift box; says the short sounds with big hops.
   - **Magic e** (a `letter` "e", glow material, gold): the silent helper; it hops, spins and never says a
     word.

6. **Setting and look**
   Studio stage, `studio` lights, warm cream sweep. Letters in toy colours: vowels red, consonants blue,
   magic e gold with glow. The camera starts wide on the machine, then frames each word straight on at
   letter height for reading. Mood: cosy detective, warm and bright.

7. **Storyline**

   | # | Chapter | Time | What happens | Teaching move | Emotional beat |
   |---|---|---|---|---|---|
   | 1 | The glitchy machine | 0:00–0:25 (25 s) | Changed words, a sparkle, Cat suspects a tiny culprit | Hook | Curious |
   | 2 | Short vowels, a callback | 0:25–1:05 (40 s) | Frog brings cap, kit, cub, hop, pin; short sounds with hops | Show (review) | Familiar, fun |
   | 3 | Caught: the quiet e | 1:05–2:15 (70 s) | The e hops onto cap → cape; Cat asks why; Robo explains | Teach + explain why | Aha |
   | 4 | Five vowels, five pairs | 2:15–3:35 (80 s) | a, i, o, u pairs, plus e in pet → Pete (rare) | Show | Rhythm, confidence |
   | 5 | The Quiet E chant | 3:35–4:05 (30 s) | Chant with the e hopping on and off | Practise | Joy |
   | 6 | Add the e or not? | 4:05–5:05 (60 s) | Picture clues; kids decide if the word needs an e | Try | Proud |
   | 7 | Magic e's cousins | 5:05–5:50 (45 s) | ai (rain), oa (boat): two vowels make a long sound too | Teach (light) | Surprise |
   | 8 | Challenge: the Rule Breakers | 5:50–6:50 (60 s) | have, give, love do not follow the rule; jail them | Challenge | Giggles |
   | 9 | Quiz and recap | 6:50–7:40 (50 s) | Five questions with pauses | Quiz | Proud |
   | 10 | Case closed | 7:40–8:00 (20 s) | The e takes a bow; confetti; goodbye | Praise | Celebration |

   Total: 480 s = 8:00.

   **Worked word pairs (chapter 4 and 6)**

   | Vowel | Short word | + e | Long word | Picture stand-in |
   |---|---|---|---|---|
   | a | cap | cape | cape | Red flat rectangle behind Robo |
   | a | can | cane | cane | – (word only) |
   | a | tap | tape | tape | – |
   | i | kit | kite | kite | Diamond shape on a string (capsule) |
   | i | pin | pine | pine | Tree prop |
   | i | bit | bite | bite | Apple prop |
   | o | hop | hope | hope | Heart shape |
   | o | not | note | note | – |
   | o | rob | robe | robe | – |
   | u | cub | cube | cube | Cube shape |
   | u | tub | tube | tube | Cylinder shape |
   | u | cut | cute | cute | Bunny critter |

   Short e with magic e is rare (pet → Pete, a name). Mention it once as a "rare one" and move on.

   **Chapter 6 picture items** (does it need an e?): kite (yes, kit + e), cube (yes), cap (no), hop (no,
   Frog hops), robe (yes), pin (no). Cat checks each by saying both versions.

   **Chapter 7 vowel teams**: rain (ai), train (ai), boat (oa), soap (oa). Say these teams "often make a long
   sound". Do not teach the rhyme about "the first one does the talking" as a rule; it fails often.

   **Chapter 8 Rule Breakers**: have, give, love, come. Each word tries to sneak into the e club; Cat reads
   it and says "That's not hayv!" The word goes into a jail made of four thin capsules. The message: most
   words follow the rule, and a few famous ones break it; we just learn them by heart.

8. **Animation and staging list**

   | Moment | Objects | Actions | Camera |
   |---|---|---|---|
   | Glitch hook | machine (box), lamp spheres, word letters | `wiggle` machine, `sound` windup_click, `pop` new letters, `sound` sparkle | Wide [0, 2, 9] → push in to [0, 1.4, 5] |
   | Tiny sparkle | magic_e (letter "e", glow) | `show` dur 0.2, `move` behind machine, `hide` | Hold |
   | Cat suspects | cat critter | `turn` cat#head, `nod` | Two-shot |
   | Frog delivery | frog, gift | `move` frog in, `hop` x3, `pop` gift, `hide` gift | Follow Frog |
   | Short word cap | letters c, a, p | `drop` each letter, `hop` "a" on its sound | Straight on, letter height |
   | e joins | magic_e | `move` to the word end, `hop`, `spin`, `sound` magic_sparkle | Close-up |
   | Vowel says its name | letter "a" | `grow` to 1.3, `wiggle`, back to 1 | Close-up |
   | Picture appears | cape (rectangle), kite (diamond), cube | `pop` | Side frame |
   | Robo mistake | robo | `clip` No, then Yes after kids correct | Medium |
   | Chant | magic_e, word letters | `hop` on beats, `move` e on and off | Wide |
   | Add e or not? | picture shapes, magic_e | `sound` windup_click, `move` e (or `wiggle` No) | Medium |
   | Vowel teams | letters r-a-i-n, b-o-a-t | `move` two vowels together, `grow` both | Straight on |
   | Rule Breakers jail | letters "have", "give", capsules | `drop` capsules round the word, `sound` boing | Wide |
   | Quiz | Q letters | `pop`, `sound` windup_click, `sound` ding | Straight on |
   | Case closed | magic_e, confetti | `clip` robo Dance, `burst` confetti, `nod` cat | Wide |

9. **Experiment or hands-on activity**
   Read-along "word builder": kids write cap, kit, hop, cub, tub on paper strips and fold a small "e" card
   over the end to change each word. Prediction: what will the new word sound like? Result: the vowel says
   its name. Try at home: find magic e words on cereal boxes and signs (bike, game, home, cube, cake).

10. **Interaction moments**
    - Call and response: Robo says "cap", kids say "cape" when the e hops on (five times).
    - Pause and guess (2–3 s, `windup_click`): "kit plus e makes...?" kite.
    - Move-along: kids pretend to be the e, tiptoe in quietly and tap the end of the word on screen.
    - Fix Robo: he reads "kite" as "kit-eh"; kids shout "the e is quiet!"

11. **Song or chant**
    Original chant, four beats per line, a finger-tap on each beat. Hook line idea: "Tiptoe e, tiptoe e,
    you don't talk, but the vowel sings to me." Verses swap the word pair (cap... cape, kit... kite). It
    repeats in chapter 5 and as a short reprise in chapter 10.

12. **Fun fact(s)**
    - E is the most used letter in English writing (chapter 3, when the e appears).
    - Long ago, people really did say the e at the end of words like "name"; over hundreds of years it went
      quiet (chapter 8, before the Rule Breakers).

13. **Vocabulary and captions**
    Title: "Magic E". Labels: short vowel, long vowel, silent e, vowel team. Each word pair shown as letters
    plus a subtitle caption with the same words the voice says. Rule Breakers: have, give, love, come.

14. **Quiz and recap**
    1. Add an e to "tub". What word? (tube)
    2. Which word has a long vowel: hop or hope? (hope)
    3. Why does "cape" say a long a? (The silent e at the end makes the a say its name.)
    4. Robo shows a sewing pin. Is the word "pin" or "pine"? (pin: no e, short i)
    5. Which team is in "boat"? (oa)
    Praise: the e takes a bow, Robo gives a ThumbsUp, Cat: "Case closed, detectives!"

15. **Sound and music**
    Music `playful`, gain 0.20, lower to 0.12 under word reading. Voice 1.0. Effects: chapter 1
    windup_click and sparkle; chapter 3 magic_sparkle on every e hop; chapter 6 ding for right answers; chapter
    8 boing on jail; chapter 10 crowd_cheer.

16. **Thumbnail and YouTube**
    Thumbnail: "cap" → "cape" with the glowing e mid-hop and Cat looking surprised. Title idea: "Magic E for
    Kids! Cap Becomes Cape | Long Vowels for Grade 2 | Toy Box Friends". Tags: magic e, silent e, long vowels,
    phonics grade 2, cvc to cvce, reading for kids, learn to read, vowel teams, 2nd grade reading, Toy Box
    Friends, 3D cartoon for kids.

17. **Catalog gaps**
    - Word Machine: no machine prop. Stand-in: a big `box` shape with three small glow `sphere` lamps.
    - Cape, kite, robe: no props. Stand-in: red rectangle (cape), diamond on a thin capsule (kite); robe is
      word only.
    - Jail bars: stand-in: four thin vertical capsules (grey, metal material).
    - Grade 2 audience value for `meta.audience` (applies to all ten specs): needs a series test update.

18. **Do and don't**
    - Do say both words of each pair slowly, short then long. Do keep the e silent in every voice line.
    - Do call it "silent e" as well as "magic e" so kids meet the school term.
    - Don't claim the rule always works; the Rule Breakers chapter is there to be honest.
    - Don't drift into blends or word families (reserve topics), or into long vowel spellings beyond ai and oa.
    - Don't let captions spell a word differently from what the voice says ("kit-eh" is spoken, never captioned).

---

### G2-02 · Describing Words Zoo
**Grade 2 · English / grammar · 7:30 · garden** — describing words (adjectives) tell what something is like; plural endings tell how many.
**Skills:** adjectives_2, plurals_2 · **Standard:** CCSS L.2.1e, L.2.1b

1. **Big idea**
   "Describing words paint a picture in your head, and -s, -es or -ies tells you there is more than one."

2. **Learning goals**
   - I can find the describing word in a sentence (the fluffy sheep).
   - I can use describing words for size, colour, shape, feel, sound and number.
   - I can make plurals with -s, -es and -ies.
   - I can name a word that stays the same for many (sheep).

3. **Hook (first 15 s)**
   A curtain (a big rectangle) hides a zoo pen. Robo: "Our new zoo friend is behind here. I'll give you
   clues, one word at a time." First clue: "pink". Second: "curly". Third: "muddy". Cat guesses first, then
   kids. The curtain drops: Pig, with a curly tail. "You found her with just three describing words!"

4. **What makes it unique**
   The Zoo Sign Machine: Robo puts a word sign in front of an animal and the animal changes to match it.
   "Big" makes Bear grow, "sleepy" makes Bunny sleep, "wiggly" makes Pig wiggle, "two" brings a second
   duck. The describing words drive the engine's actions, so kids see words change a picture.

5. **Cast and roles**
   - **Robo** (zookeeper host): runs the Sign Machine; once puts the wrong sign (a "tiny" sign on Bear, who
     shrinks, so Cat says "Bears aren't tiny!").
   - **Cat** (sidekick): asks "but why do we need describing words?"; she plays "describe it in three words".
   - **Pig** (guest): the mystery animal; later the "muddy, wiggly" example.
   - **Sheep** (guest): the plural surprise: one sheep, two sheep, no -s.
   - Also on show: Bear, Bunny, Duck (two), Chick (several for plurals).

6. **Setting and look**
   Garden stage, `soft_day` lights. Pens marked by bushes; a house prop as the zoo gate. Word signs are
   `letter` words on flat white rectangles. Camera visits pen by pen with gentle side moves. Mood: sunny day
   out, bright greens.

7. **Storyline**

   | # | Chapter | Time | What happens | Teaching move | Emotional beat |
   |---|---|---|---|---|---|
   | 1 | Who's behind the curtain? | 0:00–0:25 (25 s) | Three clues, the curtain drops, Pig appears | Hook | Suspense, delight |
   | 2 | What is a describing word? | 0:25–1:10 (45 s) | "The duck" vs "the yellow, splashy duck"; Cat asks why | Teach + explain why | Aha |
   | 3 | Six kinds of clues | 1:10–2:30 (80 s) | Size, colour, shape, feel, sound, number signs | Show | Busy, fun |
   | 4 | The Zoo Sign Machine | 2:30–3:30 (60 s) | Signs change animals; Robo's wrong "tiny" sign | Show + try | Silly surprise |
   | 5 | More than one: -s and -es | 3:30–4:30 (60 s) | ducks, chicks; boxes, buses, benches, dishes | Teach | Rhythm |
   | 6 | -ies and the sheep surprise | 4:30–5:20 (50 s) | bunny → bunnies, puppy → puppies; sheep → sheep | Teach + explain why | Giggles |
   | 7 | The Describe-It chant | 5:20–5:45 (25 s) | Chant with signs popping | Practise | Joy |
   | 8 | Challenge: Mystery Pen | 5:45–6:40 (55 s) | Kids pick clues to hide an animal; a second hidden guest | Challenge | Excited |
   | 9 | Quiz and recap | 6:40–7:15 (35 s) | Four questions | Quiz | Proud |
   | 10 | Zoo closing time | 7:15–7:30 (15 s) | Animals wave, confetti | Praise | Warm |

   Total: 450 s = 7:30.

   **Worked examples**

   | Kind of describing word | Sign | Animal | Sentence idea |
   |---|---|---|---|
   | Size | big | Bear | The big bear yawns. |
   | Colour | yellow | Duck | The yellow duck swims. |
   | Shape | round | Ball (prop) | The round ball rolls. |
   | Feel | fluffy | Sheep | The fluffy sheep naps. |
   | Sound | noisy | Dog | The noisy dog barks. |
   | Number | three | Chicks | Three chicks peep. |

   Plural rules (chapters 5 and 6):

   | Rule | One | Many |
   |---|---|---|
   | Add -s | duck, chick, frog | ducks, chicks, frogs |
   | Add -es after s, x, sh, ch | bus, box, dish, bench | buses, boxes, dishes, benches |
   | Consonant + y → -ies | bunny, puppy, berry | bunnies, puppies, berries |
   | Vowel + y → just -s (Cat's catch) | toy, key | toys, keys |
   | Stays the same | sheep, fish | sheep, fish |

   Explain why for -es: "box-s" is hard to say, so we add a little "ez" sound. Kids say "boxes" and hear the
   extra beat.

   Challenge (chapter 8): the curtain hides another animal. Kids choose three clues from six signs. Clue
   set answer: "brown, furry, big" = Bear. Then a bonus guess from plural clues: "There are five of them,
   they are small, yellow and fluffy" = chicks (five chicks pop in).

8. **Animation and staging list**

   | Moment | Objects | Actions | Camera |
   |---|---|---|---|
   | Curtain clues | curtain (rectangle), clue signs | `pop` each sign, `sound` windup_click | Wide, centred |
   | Reveal | curtain, pig | `move` curtain down below the floor, `hide`, `hop` pig, `sound` ooh | Push in |
   | Plain vs described | duck, signs | `show` "yellow", `show` "splashy", `wiggle` duck | Medium |
   | Size sign | bear | `grow` to 1.4, `sound` boing | Low angle |
   | Wrong "tiny" sign | bear, robo | `grow` to 0.5, `clip` robo No, `grow` back to 1.4 | Medium |
   | Sleepy sign | bunny | `sleep`, then `wake` on "awake" sign | Close |
   | Wiggly sign | pig | `wiggle` deg 20 | Close |
   | Number sign "two" | duck, duck2 | `drop` duck2, `nod` both | Medium |
   | Plural -s | chicks c1–c3 | `pop` one by one, `count` caption 1, 2, 3 | Wide |
   | Plural -es | box shapes, letter "es" | `drop` boxes, `pop` "es" | Straight on |
   | -ies swap | letters "bunny" → "bunnies" | `hide` y, `pop` "ies", `hop` bunny | Straight on |
   | Sheep surprise | sheep, sheep2 | `drop` sheep2, `sound` giggle, `turn` sheep#head | Two-shot |
   | Chant | signs | `hop` on beats | Wide |
   | Mystery pen | curtain, bear, chicks | `sound` windup_click, `pop` | Wide |
   | Goodbye | everyone, confetti | `clip` robo Wave, `burst` | Wide |

9. **Experiment or hands-on activity**
   "Three-word mystery": the child picks a toy at home, hides it under a towel and gives three describing
   words. A grown-up guesses. Then swap. The video models one round first (Cat hides the ball: "round, red,
   bouncy").

10. **Interaction moments**
    - Call and response: Robo shows a picture, kids shout a describing word, Cat says one too.
    - Pause and guess (2–3 s, `windup_click`): "One box, two...?" boxes. "One sheep, two...?" sheep.
    - Move-along: when the "big" sign appears, kids stretch tall; "tiny", they curl up; "wiggly", they wiggle.

11. **Song or chant**
    Original clapping chant, a call line from Robo and an answer line from kids. Hook line idea: "Tell me
    more, tell me more, what's it like? Tell me more!" Each verse adds one describing word kind. Repeats in
    chapter 7 and at zoo closing.

12. **Fun fact(s)**
    - A group of sheep is called a flock (chapter 6, sheep surprise).
    - Pigs roll in mud to keep cool because they cannot sweat much (chapter 3, "muddy"). True: pigs have few
      working sweat glands.

13. **Vocabulary and captions**
    Labels: describing word, adjective, plural, -s, -es, -ies. Signs show: pink, curly, muddy, big, yellow,
    round, fluffy, noisy, three, tiny, sleepy, wiggly. Use `count` captions for counting chicks.

14. **Quiz and recap**
    1. Find the describing word: "The fluffy sheep naps." (fluffy)
    2. One fox, two...? (foxes)
    3. One puppy, two...? (puppies)
    4. Why do describing words help? (They tell us what something is like, so we can picture it.)
    Praise: all animals nod together; Cat: "Now that's a well-described zoo."

15. **Sound and music**
    Music `happy`, gain 0.22. Voice 1.0. Effects: chapter 1 windup_click and ooh; chapter 4 boing (grow),
    giggle (wrong sign); chapter 5 block for dropping boxes; chapter 6 giggle; chapter 8 ding; chapter 10
    crowd_cheer.

16. **Thumbnail and YouTube**
    Thumbnail: Bear grown huge next to the "BIG" sign, Cat looking up. Title idea: "Describing Words Zoo!
    Adjectives and Plurals for Kids | Grade 2 Grammar | Toy Box Friends". Tags: adjectives for kids,
    describing words, plurals, plural nouns, grade 2 grammar, s es ies, 2nd grade english, zoo animals for
    kids, learn english, Toy Box Friends, 3D cartoon for kids.

17. **Catalog gaps**
    - Curtain: stand-in: a tall red rectangle shape that moves down below the floor.
    - Fox, fish, bench, dish, bus: no models. Stand-in: words only, with box shapes for "boxes".
    - Changing an animal's colour mid-video (no colour action): stand-in: a second, hidden critter in the new
      colour that `show`s while the first `hide`s.

18. **Do and don't**
    - Do keep describing words before the noun in examples ("the big bear"), plus one "the bear is big" line.
    - Don't teach -er and -est (big, bigger, biggest belongs to PK-11).
    - Don't call any animal "ugly" or "bad"; keep describing words kind.
    - Do spell every plural on screen; kids learn the -ies change by seeing the y leave.
    - Don't go into nouns and verbs as a topic (reserve); just say "a describing word tells about a naming word".

---

### G2-03 · Regroup Rally: two-digit adding
**Grade 2 · Math · 8:30 · playroom** — add and subtract two-digit numbers, trading 10 ones for 1 ten when needed.
**Skills:** add_2digit_regroup_2, sub_2digit_borrow_2 · **Standard:** CCSS 2.NBT.5, 2.NBT.9

1. **Big idea**
   "When the ones make 10 or more, trade 10 ones for 1 ten and carry it to the tens."

2. **Learning goals**
   - I can add two-digit numbers when the ones make more than 9 (27 + 15 = 42).
   - I can explain why we trade 10 ones for 1 ten.
   - I can subtract when there are not enough ones, by trading 1 ten for 10 ones (52 − 17 = 35).
   - I can check a subtraction by adding back.

3. **Hook (first 15 s)**
   A race track loops around the playroom rug. Engines rev (windup_click and toot). Countdown: 3, 2, 1...
   Robo's car will not start. The fuel screen says: "Add 27 + 15 to unlock fuel." Cat: "The other cars are
   already moving. Quick!"

4. **What makes it unique**
   The Trade Booth: a pit stop where 10 little ones cubes drive in and one tall ten rod drives out. Kids see
   regrouping as a real swap. Robo "crashes" on purpose by writing 312 for 27 + 15, and Cat explains why it
   cannot be right ("27 + 15 is less than 100!"). It is the only episode with a race and with estimating to
   catch a mistake.

5. **Cast and roles**
   - **Robo** (racer and host): drives car 1; makes the 312 mistake.
   - **Cat** (pit crew chief and sidekick): asks "but why carry the 1?"; checks every answer by estimating.
   - **Dog** (guest racer): races in car 2; brings a subtraction "reverse lap" where cars give away fuel.
   - **Pig** (guest, Trade Booth keeper): swaps ones for tens with a cheerful oink.

6. **Setting and look**
   Playroom stage, `soft_day` lights. A rug oval with cube "track markers". Cars are box shapes on four
   cylinder wheels. Base-ten pieces: small yellow cubes (ones), tall blue blocks (tens). Sums appear as
   `letter` digits in a column, tens in blue, ones in yellow. Camera: wide track shots, then a straight-on
   "scoreboard" shot for each sum. Mood: sporty and bright.

7. **Storyline**

   | # | Chapter | Time | What happens | Teaching move | Emotional beat |
   |---|---|---|---|---|---|
   | 1 | Start your engines | 0:00–0:25 (25 s) | Countdown, Robo's car will not start: 27 + 15 | Hook | Urgent |
   | 2 | Warm-up lap: no trade | 0:25–1:10 (45 s) | 34 + 25 = 59: ones then tens | Show (review) | Easy win |
   | 3 | Checkpoint 1: the Trade Booth | 1:10–2:40 (90 s) | 27 + 15: ones make 12, trade 10 for a ten | Teach + explain why | Aha |
   | 4 | Robo's crash | 2:40–3:20 (40 s) | Robo writes 312; Cat estimates; fix it | Explain why | Funny, careful |
   | 5 | Checkpoints 2 and 3 | 3:20–4:40 (80 s) | 38 + 46 = 84, 59 + 23 = 82 | Try together | Momentum |
   | 6 | The Trade Booth chant | 4:40–5:05 (25 s) | Chant | Practise | Joy |
   | 7 | Reverse lap: subtracting | 5:05–6:35 (90 s) | 52 − 17 = 35, 63 − 28 = 35; check by adding | Teach + try | Thinking hard |
   | 8 | Challenge: the final lap | 6:35–7:45 (70 s) | 68 + 27, 71 − 34, 40 − 16 against the clock | Challenge | Excited |
   | 9 | Podium and quiz | 7:45–8:20 (35 s) | Recap questions | Quiz | Proud |
   | 10 | Victory lap | 8:20–8:30 (10 s) | Confetti, goodbye | Praise | Celebration |

   Total: 510 s = 8:30.

   **Worked sums (all checked)**

   | Sum | Ones step | Tens step | Answer | Check |
   |---|---|---|---|---|
   | 34 + 25 (warm-up) | 4 + 5 = 9, no trade | 3 + 2 = 5 | 59 | – |
   | 27 + 15 | 7 + 5 = 12 → write 2, trade 10 ones for 1 ten | 2 + 1 + 1 (traded) = 4 | 42 | About 30 + 15 = 45, so 42 is sensible |
   | 38 + 46 | 8 + 6 = 14 → write 4, carry 1 ten | 3 + 4 + 1 = 8 | 84 | About 40 + 45 = 85 |
   | 59 + 23 | 9 + 3 = 12 → write 2, carry 1 ten | 5 + 2 + 1 = 8 | 82 | About 60 + 20 = 80 |
   | 68 + 27 (challenge) | 8 + 7 = 15 → write 5, carry 1 ten | 6 + 2 + 1 = 9 | 95 | About 70 + 25 = 95 |

   Robo's crash: he writes 12 under the ones and 3 under the tens and reads "312". Cat: "27 is less than 30,
   15 is less than 20, so the answer must be less than 50. 312 is way too big." Fix: only 2 stays in the
   ones place; the 10 goes to the tens as 1 ten.

   **Subtraction (reverse lap)**

   | Sum | Ones step | Tens step | Answer | Check by adding |
   |---|---|---|---|---|
   | 52 − 17 | 2 − 7 cannot; trade 1 ten for 10 ones → 12 − 7 = 5 | 5 tens − 1 traded = 4; 4 − 1 = 3 | 35 | 35 + 17 = 52 ✓ |
   | 63 − 28 | 3 − 8 cannot; trade → 13 − 8 = 5 | 6 − 1 = 5; 5 − 2 = 3 | 35 | 35 + 28 = 63 ✓ |
   | 71 − 34 (challenge) | 1 − 4 cannot; trade → 11 − 4 = 7 | 7 − 1 = 6; 6 − 3 = 3 | 37 | 37 + 34 = 71 ✓ |
   | 40 − 16 (challenge) | 0 − 6 cannot; trade → 10 − 6 = 4 | 4 − 1 = 3; 3 − 1 = 2 | 24 | 24 + 16 = 40 ✓ |

   Cat's "but why" for subtraction: "You can't take 7 cubes from 2 cubes, so open a ten rod into 10 cubes.
   The number is still 52, it's just in a different shape: 4 tens and 12 ones."

8. **Animation and staging list**

   | Moment | Objects | Actions | Camera |
   |---|---|---|---|
   | Countdown | number blocks 3, 2, 1, cars | `pop` each, `sound` windup_click, `sound` toot | Low track angle |
   | Car won't start | robo_car, robo | `wiggle` car, `clip` robo No | Medium |
   | Problem appears | letters "27", "+15", line rectangle | `pop` | Straight-on scoreboard |
   | Ones cubes | 7 + 5 yellow cubes | `drop` each, `count` caption 1–12 | High three-quarter |
   | Trade Booth | 10 cubes, ten rod, pig | `move` 10 cubes into booth, `hide` them, `show` rod, `move` rod out, `nod` pig, `sound` ding | Side |
   | Write the answer | letters "2", "4" | `pop` ones digit then tens digit | Scoreboard |
   | Robo's crash | letters "312", robo_car | `pop` "312", `spin` car, `sound` slide_whistle, `clip` robo No | Wide |
   | Fix | "3" hides, small "1" above tens | `hide`, `pop`, `move` | Scoreboard |
   | Car zooms | robo_car | `move` along track, `sound` whoosh | Follow |
   | Reverse lap | ten rod, 10 cubes | `hide` rod, `show` 10 cubes (open a ten), `move` 7 away | High |
   | Check by adding | letters | `pop`, `nod` cat | Scoreboard |
   | Final lap timer | number blocks 10 → 1 | `pop` each second | Corner insert via wide shot |
   | Podium | box steps, robo, dog, cat | `drop` steps, `clip` robo Jump | Wide |
   | Victory lap | confetti | `burst`, `clip` robo Dance | Wide |

9. **Experiment or hands-on activity**
   Kids build sums with pasta pieces or Lego: single pieces are ones, a strip of 10 taped together is a ten.
   Prediction: "Will we need a trade?" (look at the ones first). Try 27 + 15 with pieces, bundle 10 ones into
   a ten, count 4 tens and 2 ones. Try at home: 46 + 18 (= 64) and 50 − 23 (= 27). Small pieces: younger
   siblings nearby need a grown-up's eye.

10. **Interaction moments**
    - Pause and guess (2–3 s, `windup_click`): "7 + 5 is...?" 12. "Do we need a trade?" yes.
    - Call and response: Robo: "Ten ones!" Kids: "Trade for a ten!"
    - Move-along: kids "drive" with hands on an invisible wheel during each zoom.
    - Fix Robo: shout "too big!" when 312 appears.

11. **Song or chant**
    Original engine-rhythm chant (vroom on beats 1 and 3). Hook line idea: "Ten in the ones? Pit stop, swap!
    One ten up to the top!" Repeats in chapter 6 and in the challenge between sums.

12. **Fun fact(s)**
    - Our way of writing numbers uses only ten digits, 0 to 9, which is why we trade at ten (chapter 3).
    - You can always check a take-away by adding back (chapter 7). This is a math fact kids can test on every
      problem.

13. **Vocabulary and captions**
    Labels: ones, tens, regroup, trade, carry, check. Subtitles show each step ("7 + 5 = 12"). `count`
    captions while counting cubes.

14. **Quiz and recap**
    1. 46 + 37 = ? (83: 6 + 7 = 13, write 3, carry 1; 4 + 3 + 1 = 8)
    2. 54 − 29 = ? (25: 14 − 9 = 5; 4 − 2 = 2)
    3. Why do we trade 10 ones? (Because 10 ones make 1 ten, and only 0–9 fit in the ones place.)
    4. Is 35 + 17 = 52 a good check for 52 − 17 = 35? (yes)
    Praise: all three racers on the podium, confetti.

15. **Sound and music**
    Music `bouncy`, gain 0.22, dip to 0.12 during worked steps. Voice 1.0. Effects: toot and windup_click
    (start); block (cubes land); ding (Trade Booth); slide_whistle (crash); whoosh (zooms); crowd_cheer
    (podium).

16. **Thumbnail and YouTube**
    Thumbnail: the Trade Booth with 10 cubes going in and a ten rod coming out, "27 + 15" above. Title idea:
    "Regroup Rally! 2-Digit Addition and Subtraction with Regrouping | Grade 2 Math | Toy Box Friends".
    Tags: regrouping, two digit addition, carrying, borrowing, two digit subtraction, grade 2 math, 2nd grade
    math, place value, math for kids, Toy Box Friends, 3D cartoon for kids.

17. **Catalog gaps**
    - Race cars: stand-in: a coloured box with four cylinder wheels (turned 90°) grouped by moving together.
    - Base-ten rods: stand-in: a tall blue block scaled thin, marked with a "10" letter.
    - Grouping (moving five parts as one car): no group object. Stand-in: move each part with the same `to`
      and `dur`, or use a single box car without wheels.
    - Track: stand-in: a ring of small cubes on the rug.

18. **Do and don't**
    - Do always start with the ones. Do say "trade" and "regroup"; "carry" and "borrow" are fine extras.
    - Don't say "you can't take a bigger number from a smaller one" as a law; say "there are not enough ones
      here, so we trade".
    - Don't race the explanation; the clock pressure is only in the challenge round.
    - Keep sums under 100 (three-digit work belongs to G2-04 for reading numbers only).

---

### G2-04 · Hundreds Tower: place value to 999
**Grade 2 · Math / place value · 7:45 · playroom** — three-digit numbers are hundreds, tens and ones; where a digit sits tells its value.
**Skills:** hundreds_2, skip_count_2 · **Standard:** CCSS 2.NBT.1, 2.NBT.2, 2.NBT.3, 2.NBT.4

1. **Big idea**
   "The same digit can be worth 3, 30 or 300; it depends on where it sits."

2. **Learning goals**
   - I can show a three-digit number with hundreds, tens and ones (345 = 3 hundreds, 4 tens, 5 ones).
   - I can write a number in expanded form (345 = 300 + 40 + 5).
   - I can skip count by 5s, 10s and 100s.
   - I can compare three-digit numbers with >, < and =.

3. **Hook (first 15 s)**
   Bear the builder stands by a locked vault (a big gift box with a three-digit lock). A note says "The
   code is a 3-digit number. Build it to open me." Robo tries "1, 2, 3", buzz. Cat: "We need clues, and we
   need to know what each digit means."

4. **What makes it unique**
   The Digit Swap trick: three digit cards, 4, 7 and 2, are shuffled into all six orders (247, 274, 427, 472,
   724, 742) to prove that place, not the digit, sets the value. A Zero Hero moment shows why 305 is not 35.
   It is a building episode: every number is a tower of flats, rods and cubes.

5. **Cast and roles**
   - **Robo** (host): reads numbers; says "three-zero-five is thirty-five" once so kids correct him.
   - **Cat** (sidekick): asks "but why does the 0 matter if it's nothing?"; runs the vault clues.
   - **Bear** (guest builder): stacks hundreds flats and keeps the tower straight.
   - **Chick** (guest): rides the skip-count elevator up the tower floor by floor.

6. **Setting and look**
   Playroom stage, `soft_day`. A three-column mat on the rug labelled H, T, O (hundreds, tens, ones). Flats
   are big flat orange squares, rods are blue thin blocks, ones are small yellow cubes. Digits as `letter`
   text in matching colours. Camera: tall low angle on the tower, top-down on the mat. Mood: building site,
   warm orange.

7. **Storyline**

   | # | Chapter | Time | What happens | Teaching move | Emotional beat |
   |---|---|---|---|---|---|
   | 1 | The locked vault | 0:00–0:20 (20 s) | Vault note, Robo's wrong try | Hook | Curious |
   | 2 | Cubes, rods and flats | 0:20–1:30 (70 s) | 10 ones = 1 ten, 10 tens = 1 hundred | Teach + explain why | Aha |
   | 3 | Build 345 | 1:30–2:40 (70 s) | Place pieces, read it, expanded form | Show + try | Satisfying |
   | 4 | The Zero Hero | 2:40–3:30 (50 s) | 305 vs 35 vs 350 | Explain why | Surprise |
   | 5 | The Digit Swap trick | 3:30–4:30 (60 s) | 4, 7, 2 in six orders; biggest, smallest | Show + try | Wow |
   | 6 | Skip-count elevator | 4:30–5:30 (60 s) | by 5s, 10s and 100s | Practise | Energetic |
   | 7 | The Tower chant | 5:30–5:55 (25 s) | Chant | Practise | Joy |
   | 8 | Challenge: crack the vault | 5:55–7:00 (65 s) | Clues build 528; compare 472 and 427 | Challenge | Excited |
   | 9 | Quiz and recap | 7:00–7:35 (35 s) | Four questions | Quiz | Proud |
   | 10 | The vault opens | 7:35–7:45 (10 s) | Confetti, goodbye | Praise | Celebration |

   Total: 465 s = 7:45.

   **Worked examples (all checked)**

   | Number | Hundreds | Tens | Ones | Expanded form | Said as |
   |---|---|---|---|---|---|
   | 345 | 3 | 4 | 5 | 300 + 40 + 5 | three hundred forty-five |
   | 305 | 3 | 0 | 5 | 300 + 0 + 5 | three hundred five |
   | 350 | 3 | 5 | 0 | 300 + 50 + 0 | three hundred fifty |
   | 35 | 0 | 3 | 5 | 30 + 5 | thirty-five |
   | 528 | 5 | 2 | 8 | 500 + 20 + 8 | five hundred twenty-eight |
   | 999 | 9 | 9 | 9 | 900 + 90 + 9 | nine hundred ninety-nine |

   Digit Swap (4, 7, 2): 247, 274, 427, 472, 724, 742. Smallest 247, biggest 742. "The 7 in 742 is worth
   700; in 472 it's worth 70; in 247 it's worth 7."

   Skip-count elevator: by 5s 5, 10, 15, 20, 25, 30, 35, 40, 45, 50; by 10s from 120: 130, 140, 150, 160,
   170, 180, 190, 200; by 100s: 100, 200, 300, 400, 500, 600, 700, 800, 900. Top floor note: "One more than
   999 is 1,000, a whole new place!" (teaser only).

   Vault clues (challenge): 1. "I have 5 hundreds." 2. "My tens digit is 2." 3. "I have 8 ones." Kids build
   528. Bonus check clue: "I am 10 more than 518." (518 + 10 = 528 ✓). Compare round: 472 vs 427: hundreds
   are the same (4), tens 7 > 2, so 472 > 427. Then 609 vs 690: 690 is bigger (tens 9 > 0). Then 350 = 300 +
   50 (=).

8. **Animation and staging list**

   | Moment | Objects | Actions | Camera |
   |---|---|---|---|
   | Vault and note | vault (gift prop, large), note (rectangle) | `pop` note, `wiggle` vault, `sound` robot_beep (wrong) | Wide |
   | 10 ones → 1 ten | 10 yellow cubes, blue rod | `drop` cubes in a line, `count` 1–10, `hide` cubes, `show` rod, `sound` ding | Top-down |
   | 10 tens → 1 hundred | 10 rods, orange flat | `move` rods side by side, `hide`, `show` flat, `sound` magic_sparkle | Top-down |
   | Build 345 | 3 flats, 4 rods, 5 cubes, bear | `drop` flats (Bear `nod` each), `drop` rods, `drop` cubes | High three-quarter |
   | Read it | letters "3", "4", "5" | `pop` over each column | Straight on |
   | Expanded form | letters "300", "+40", "+5" | `move` apart from "345" | Straight on |
   | Zero Hero | letter "0", rods removed | `hide` rods, `pop` "0" with glow, `grow` 1.3 | Close |
   | Robo misreads | robo | `clip` No after kids correct, then ThumbsUp | Medium |
   | Digit Swap | letters "4", "7", "2" | `move` to swap places, `spin` each, `sound` whoosh | Straight on |
   | Elevator | chick, floor labels | `move` chick up the tower, `hop` per floor, `pop` floor number | Low, tilt up via `camera` lookAt |
   | Vault clues | clue rectangles, pieces | `pop` clue, `sound` windup_click, `drop` pieces | Wide |
   | Compare | letters "472", ">", "427" | `pop`, `grow` the bigger tens digit | Straight on |
   | Vault opens | vault, confetti | `hop` vault, `burst` confetti, `clip` robo Jump | Wide |

9. **Experiment or hands-on activity**
   Make a place value mat on paper with three columns (H, T, O). Use coins, buttons or pasta: one piece per
   one, a bundle of 10 straws for a ten, a sticky note marked "100" for a hundred. Build 345, then 305, then
   swap digits of your own house number or a phone code. Try at home: write your three digits on cards and
   find the biggest and smallest numbers.

10. **Interaction moments**
    - Call and response: Robo: "Ten tens make...?" Kids: "One hundred!"
    - Pause and guess (2–3 s, `windup_click`): "What is the 4 worth in 345?" 40.
    - Move-along: on each skip-count floor, kids jump; on hundreds, they jump with arms up.

11. **Song or chant**
    Original stomp chant (stomp, stomp, clap). Hook line idea: "Ones go here, tens go there, hundreds stand
    tall in the big chair." A second line counts up by hundreds. Repeats in chapter 7 and when the vault opens.

12. **Fun fact(s)**
    - Ancient Egyptians wrote 100 as a picture of a coiled rope (chapter 2). True; their sign for 1,000 was a
      lotus flower.
    - A hundred flat has 100 little squares: 10 rows of 10 (chapter 2; kids count one row of 10,
      then count the rows by tens: 10, 20 ... 100).

13. **Vocabulary and captions**
    Labels: hundreds, tens, ones, digit, place, value, expanded form, greater than, less than. Captions show
    numbers in digits and words ("305, three hundred five"). Use `count` style for skip-count floors.

14. **Quiz and recap**
    1. What is 600 + 40 + 2? (642)
    2. What is the 8 worth in 285? (80)
    3. Which is bigger, 309 or 390? (390)
    4. Count by 100s: 200, 300, ...? (400)
    Praise: Bear salutes, vault opens, Cat: "Code cracked."

15. **Sound and music**
    Music `playful`, gain 0.22. Voice 1.0. Effects: block (pieces land), ding (trade), magic_sparkle (flat
    appears), robot_beep (wrong code), whoosh (digit swap), sprout_spring (elevator floors), crowd_cheer (vault).

16. **Thumbnail and YouTube**
    Thumbnail: the tower of 3 flats, 4 rods, 5 cubes with "345" in big letters and Bear on top. Title idea:
    "Hundreds Tower! Place Value to 999 | Hundreds, Tens and Ones | Grade 2 Math | Toy Box Friends". Tags:
    place value, hundreds tens ones, 3 digit numbers, expanded form, skip counting, grade 2 math, comparing
    numbers, base ten blocks, 2nd grade math, Toy Box Friends.

17. **Catalog gaps**
    - Base-ten flats, rods and cubes: stand-in: flat orange square (scaled), thin blue block, small yellow cube.
    - `number_block` only goes to 99: three-digit numbers use the `letter` kind ("345" fits in 12 characters).
    - Vault lock: stand-in: large gift prop plus three `letter` digits on its front.
    - Greater and less signs: stand-in: `letter` text ">" and "<" (check the font has them).

18. **Do and don't**
    - Do say "three hundred forty-five" without "and" (US school style).
    - Don't teach fractions or decimals; no "parts of a hundred" (see Kept apart, G1-07).
    - Don't let the zero be "nothing"; it holds the place.
    - Don't make the elevator too fast; one floor per beat, at least 0.8 s each.

---

### G2-05 · Five-Minute Clock Race
**Grade 2 · Math / time · 7:30 · playroom** — read and set an analog clock to the nearest five minutes.
**Skills:** time_5_minutes_2 · **Standard:** CCSS 2.MD.7

1. **Big idea**
   "The minute hand counts by fives: every number on the clock is five more minutes."

2. **Learning goals**
   - I can tell the hour hand (short) from the minute hand (long).
   - I can count by 5s around the clock to read the minutes.
   - I can read and write times like 3:25 and 6:05.
   - I can explain why the hour hand at 7:50 is almost at 8, but it is still 7.

3. **Hook (first 15 s)**
   Dog bursts in waving a ticket: "The train to Grandma's leaves at 3:25!" Robo looks at the big clock:
   the long hand points at the 5. "It's 3:05? No, wait... I don't know what that means!" A train whistle
   (toot) sounds far away. Cat: "Then we'd better learn fast."

4. **What makes it unique**
   The minute hand runs a "lap of fives": as it passes each number, a gold star pops with 5, 10, 15... up to
   60, so kids see why the 1 means 5 minutes. A second twist is the Sneaky Hour Hand: at 7:50 the short hand
   is nearly on 8, and Robo reads "8:50"; Cat explains why it is still 7. It is the only deadline episode,
   with a real clock counting down to the train.

5. **Cast and roles**
   - **Robo** (host): sets the big clock; falls for the sneaky hour hand once.
   - **Cat** (sidekick): asks "but why does the 1 mean 5?"; checks the hour hand every time.
   - **Dog** (guest, the traveller): has a list of stops before the train; worries, then cheers.
   - **Chick** (guest, station helper): rings the ding at every correct time.

6. **Setting and look**
   Playroom stage, `soft_day`. One big clock face centre stage (a white flat cylinder facing the camera,
   numbers 1–12 as `letter` digits around it, a short red hour hand and a long blue minute hand). Stops on
   Dog's journey are props at the rug edge: house (home), apple (market), flower (park), a box (station).
   Camera: straight-on for reading the clock, wide for journey moves. Mood: bright, bustling, a little
   ticking tension.

7. **Storyline**

   | # | Chapter | Time | What happens | Teaching move | Emotional beat |
   |---|---|---|---|---|---|
   | 1 | The 3:25 train | 0:00–0:25 (25 s) | Ticket, toot, Robo can't read the minutes | Hook | Worried |
   | 2 | Two hands, two jobs | 0:25–1:05 (40 s) | Short hour hand, long minute hand; o'clock and half past recalled | Show (review G1-05) | Familiar |
   | 3 | The lap of fives | 1:05–2:15 (70 s) | Minute hand goes round; stars pop 5 to 60; why 1 means 5 | Teach + explain why | Aha |
   | 4 | Read the minutes | 2:15–3:15 (60 s) | 10:15, 2:40, 6:05, 3:25 | Show + try | Growing skill |
   | 5 | The Sneaky Hour Hand | 3:15–4:05 (50 s) | 7:50 not 8:50; the hour hand walks slowly | Explain why | Surprise |
   | 6 | The Tick-Tock Fives chant | 4:05–4:30 (25 s) | Chant | Practise | Joy |
   | 7 | Dog's journey | 4:30–5:45 (75 s) | Set the clock for each stop: 2:40, 2:55, 3:10, 3:20 | Try | Rushing, hopeful |
   | 8 | Challenge: beat the train | 5:45–6:40 (55 s) | Four clocks, 3 s each; then the train at 3:25 | Challenge | Excited |
   | 9 | Quiz and recap | 6:40–7:15 (35 s) | Four questions | Quiz | Proud |
   | 10 | All aboard | 7:15–7:30 (15 s) | Dog waves from the "train", confetti | Praise | Happy |

   Total: 450 s = 7:30.

   **Lap of fives (chapter 3)**: 1 → 5, 2 → 10, 3 → 15, 4 → 20, 5 → 25, 6 → 30, 7 → 35, 8 → 40, 9 → 45, 10 → 50,
   11 → 55, 12 → 60 (and back to 00). 12 numbers × 5 minutes = 60 minutes = 1 hour. Cat's why: "There are 60
   minutes in an hour, and only 12 numbers, so each jump is 5 minutes."

   **Worked times with hand angles** (clockwise from 12; the hour hand moves 30° per hour and 0.5° per
   minute, the minute hand 6° per minute):

   | Time | Say it | Minute hand points at | Minute angle | Hour hand | Hour angle |
   |---|---|---|---|---|---|
   | 3:05 (hook) | three oh five | 1 | 30° | just past 3 | 92.5° |
   | 10:15 | ten fifteen | 3 | 90° | a little past 10 | 307.5° |
   | 2:40 | two forty | 8 | 240° | two-thirds of the way from 2 to 3 | 80° |
   | 6:05 | six oh five | 1 | 30° | just past 6 | 182.5° |
   | 3:25 | three twenty-five | 5 | 150° | a bit less than halfway from 3 to 4 | 102.5° |
   | 7:50 | seven fifty | 10 | 300° | almost at 8 | 235° |
   | 2:55 | two fifty-five | 11 | 330° | almost at 3 | 87.5° |
   | 3:10 | three ten | 2 | 60° | just past 3 | 95° |
   | 3:20 | three twenty | 4 | 120° | a third of the way to 4 | 100° |

   Hook note: in the hook it is 3:05, so Dog has 20 minutes until 3:25 (count 5, 10, 15, 20 on the clock).
   Keep it as counting jumps, not as "elapsed time" maths.

   **Dog's journey (chapter 7)**: leave home 2:40 → market 2:55 → park 3:10 → station 3:20 → train 3:25. Kids
   say each time before Robo sets it.

   **Challenge clocks (chapter 8)**: 4:35 (minute hand on 7), 11:10 (on 2), 9:45 (on 9), 12:55 (on 11; the
   hour hand is almost at 1, so it is still 12).

8. **Animation and staging list**

   | Moment | Objects | Actions | Camera |
   |---|---|---|---|
   | Ticket | dog, ticket (rectangle) | `move` dog in, `hop`, `pop` ticket, `sound` toot | Wide |
   | Robo confused | robo | `clip` No, `turn` robo to clock | Medium |
   | Hand jobs | hour_hand, minute_hand | `grow` hour hand 1.2 then back, then minute hand | Straight on, clock fills frame |
   | Lap of fives | minute hand positions, 12 gold stars | Minute hand steps through 12 positions; `pop` star with `letter` 5, 10 ... 60 at each; `sound` ding | Straight on |
   | Why 1 means 5 | stars, letters "12 × 5 = 60" | `pop` | Straight on |
   | Read 10:15 | hands | `turn` to new angles, `sound` windup_click, then answer caption | Straight on |
   | Sneaky hour hand | hour hand at 235°, robo | `wiggle` hour hand, `clip` robo Yes then No | Close on clock centre |
   | Slow hour hand demo | hour hand | slow `turn` from 210° to 240° while the minute hand does a full lap (12 steps) | Straight on |
   | Chant | stars | `hop` on beats | Wide |
   | Journey stops | dog, house, apple, flower, station box | `move` dog stop to stop, `hop` at each, `nod` chick + `sound` ding | Follow, then cut to clock |
   | Challenge clocks | hands | `turn`, `sound` windup_click (3 s) | Straight on |
   | Train | box train with cylinder wheels, dog | `move` train in, `move` dog into it, `sound` toot | Wide |
   | All aboard | confetti | `burst`, `clip` robo Wave | Wide |

9. **Experiment or hands-on activity**
   Make a paper-plate clock: write 1–12, cut two card hands (short and long), fix with a split pin (a
   grown-up does the hole). Around the edge, write 5, 10, 15 ... 60 in small numbers. Kids set times from the
   video. Try at home: read the kitchen clock at breakfast, lunch and bedtime and say the time to a grown-up.

10. **Interaction moments**
    - Count-along: kids count by 5s as the minute hand goes round (twice).
    - Pause and guess (2–3 s, `windup_click`): "The long hand is on 8. How many minutes?" 40.
    - Call and response: Robo: "Short hand?" Kids: "Hours!" Robo: "Long hand?" Kids: "Minutes!"
    - Move-along: kids make the minute hand with one straight arm and sweep it round.

11. **Song or chant**
    Original ticking chant with a tick-tock beat (tongue clicks). Hook line idea: "Tick, tock, five more
    minutes, round we go, the long hand knows!" Counting lines go 5 to 60. Repeats in chapter 6 and during the
    journey.

12. **Fun fact(s)**
    - "Clockwise" is the direction clock hands turn; kids can test it on any clock (chapter 2).
    - The hour hand needs a whole hour to move from one number to the next, while the minute hand goes all
      the way round (chapter 5).

13. **Vocabulary and captions**
    Labels: hour hand, minute hand, o'clock, minutes, clockwise. Times captioned in digital form (3:25) and
    said in words. `count` captions 5 to 60 during the lap.

14. **Quiz and recap**
    1. The long hand points at 9. How many minutes? (45)
    2. The short hand is just past 4 and the long hand is on 2. What time? (4:10)
    3. Why does the 1 on a clock mean 5 minutes? (60 minutes shared by 12 numbers: 5 each.)
    4. Is this 8:50 or 7:50 when the short hand is almost at 8? (7:50)
    Praise: train toot, Dog waves, Cat: "Right on time."

15. **Sound and music**
    Music `bouncy`, gain 0.20, with soft windup_click ticks in chapters 1 and 8 only. Voice 1.0. Effects: toot
    (train), ding (each five), windup_click (pauses), slide_whistle (Robo's 8:50), crowd_cheer (all aboard).

16. **Thumbnail and YouTube**
    Thumbnail: the big clock at 3:25 with gold "5, 10, 15, 20, 25" stars and Dog holding a ticket. Title idea:
    "Telling Time to 5 Minutes! Catch the 3:25 Train | Grade 2 Math | Toy Box Friends". Tags: telling time,
    clock for kids, 5 minute intervals, analog clock, minute hand, hour hand, grade 2 math, skip count by 5,
    2nd grade time, learn the clock, Toy Box Friends.

17. **Catalog gaps**
    - Clock face: no prop. Stand-in: flat white cylinder facing the camera, 12 `letter` digits around it, a
      small grey sphere at the centre.
    - Clock hands that turn about one end: `turn` rotates about the object's centre. Stand-in: either 12
      pre-placed minute hands (thin capsules, one per number) shown and hidden in turn, or move and turn a
      hand together so its tail stays on the centre. A pivot option for objects is the real fix.
    - Train: stand-in: two boxes with cylinder wheels and a cone funnel.
    - Ticket: stand-in: a small yellow rectangle with "3:25" letters.

18. **Do and don't**
    - Do always read the hour first by the short hand, then count by 5s for the minutes.
    - Do say "oh five" for :05 and show the 0 in digital time (6:05, not 6:5).
    - Don't teach elapsed-time sums or a.m./p.m. in depth; one line is fine.
    - Don't flash the ticking; keep the tension light (no "you'll miss it forever" peril).
    - Keep "quarter past" and "half past" as extras only; the lane is five-minute steps.

---

### G2-06 · Measure It! Length, weight, capacity
**Grade 2 · Math / measurement · 8:15 · playroom** — measure with standard units: centimetres and metres, kilograms, litres.
**Skills:** units_2 · **Standard:** CCSS 2.MD.1–2.MD.4 (length); weight and capacity are an approximate stretch (3.MD.2 style, no calculating)

1. **Big idea**
   "Everyone gets the same answer when we all use the same units: centimetres, kilograms and litres."

2. **Learning goals**
   - I can explain why bear-steps and chick-steps give different answers, and why we use standard units.
   - I can measure length in centimetres with a ruler that starts at 0.
   - I can choose the right tool and unit: ruler (cm, m), scale (kg), jug (L).
   - I can tell that big things are not always heavy, and tall containers do not always hold more.

3. **Hook (first 15 s)**
   Bear and Chick both measured the playroom rug. Bear: "4 bear-steps!" Chick: "12 chick-steps!" They glare.
   Robo: "You can't both be right... can you?" Cat: "Maybe you both are. But why are the numbers different?"

4. **What makes it unique**
   It starts with an argument that both sides win: same rug, different steps. Then two "surprise tests"
   break kids' guesses: a big balloon is lighter than a small apple, and a short wide bowl holds more than a
   tall thin glass. Every unit gets a "body benchmark" kids can feel (a fingertip is about 1 cm wide, a big
   step is about 1 m).

5. **Cast and roles**
   - **Robo** (host): has a giant ruler; once measures from the 1, not the 0, and gets it wrong.
   - **Cat** (sidekick and judge): asks "but why can't we use our feet?"; checks the ruler start.
   - **Bear** (guest): big steps; heavy lifter on the balance.
   - **Chick** (guest): tiny steps; brings the balloon to the balance.

6. **Setting and look**
   Playroom stage, `soft_day`. A measuring corner: a long yellow ruler (a flat block with tick marks), a
   balance (a long plank on a triangle), and two clear-ish containers (tall cylinder, short wide cylinder)
   with a 1 L jug. Camera: low side shots along the ruler, straight-on for the balance. Mood: a lively
   workshop.

7. **Storyline**

   | # | Chapter | Time | What happens | Teaching move | Emotional beat |
   |---|---|---|---|---|---|
   | 1 | 4 or 12? | 0:00–0:25 (25 s) | Bear and Chick disagree about the rug | Hook | Funny tension |
   | 2 | Why we need units | 0:25–1:15 (50 s) | Different step sizes; we need one size for everyone | Explain why | Aha |
   | 3 | Centimetres and metres | 1:15–2:25 (70 s) | 100 cm = 1 m; the ruler starts at 0; Robo's mistake | Teach | Careful |
   | 4 | Guess, then measure | 2:25–3:20 (55 s) | Pencil 15 cm, book 25 cm, rug 2 m | Try | Confident |
   | 5 | Heavy or light? | 3:20–4:35 (75 s) | Balance; kg; balloon vs apple surprise | Teach + explain why | Surprise |
   | 6 | How much does it hold? | 4:35–5:45 (70 s) | Litres; tall glass vs wide bowl pour test | Teach + explain why | Wow |
   | 7 | The Measure Mixer chant | 5:45–6:10 (25 s) | Chant | Practise | Joy |
   | 8 | Challenge: pick the tool | 6:10–7:20 (70 s) | Five things, which tool and unit? | Challenge | Excited |
   | 9 | Quiz and recap | 7:20–7:55 (35 s) | Four questions | Quiz | Proud |
   | 10 | Friends again | 7:55–8:15 (20 s) | Bear and Chick high-five (hop together), goodbye | Praise | Warm |

   Total: 495 s = 8:15.

   **Worked examples (all checked)**
   - Rug: 2 m = 200 cm. Bear-step about 50 cm → 200 ÷ 50 = 4 bear-steps. Chick-step about 17 cm → about 12
     chick-steps (12 × 17 = 204, close enough to 200). Both were right in their own units; the ruler says 2 m.
   - Ruler mistake: a crayon lies from the 1 mark to the 6 mark. Robo says 6 cm. Cat: "Count the spaces, not
     the marks: 6 − 1 = 5 cm." Then slide the crayon to start at 0: it ends at 5. ✓
   - Pencil 15 cm, book 25 cm. How much longer is the book? 25 − 15 = 10 cm. ✓
   - 100 centimetres make 1 metre. A door is about 2 m tall.
   - Weight: the balance tips down on the heavier side. A big balloon vs a small apple: the apple side goes
     down. Why: a balloon is mostly air inside thin rubber; an apple is packed full. Bigger is not always
     heavier.
   - A 1 litre bottle of water weighs about 1 kilogram. A paperclip weighs about 1 gram (Cat's tiny unit,
     mention only).
   - Capacity: fill the tall thin glass, pour it into the 1 L jug: the water reaches a low line (show a mark;
     no fraction words). Fill the short wide bowl, pour it in: the jug fills higher. The bowl holds more. Why:
     it is wider, so there is more space inside even though it is shorter.

   **Challenge (chapter 8)**: which tool and unit?
   | Thing | Tool | Unit |
   |---|---|---|
   | How long is a crayon? | ruler | cm |
   | How heavy is a pumpkin? | scale | kg |
   | How much milk in a big bottle? | jug | L |
   | How far is it across the playground? | measuring tape / metre stick | m |
   | How heavy is a feather? | scale | g (tiny!) |

8. **Animation and staging list**

   | Moment | Objects | Actions | Camera |
   |---|---|---|---|
   | Argument | bear, chick, rug length | `hop` bear 4 times along the rug, `hop` chick 12 times (fast), `turn` bear#head and chick#head to each other | Side, wide |
   | Robo puzzled | robo | `clip` No, then Standing | Medium |
   | Same-size units | 10 cm blocks | `drop` blocks in a row along the rug | Low side |
   | Ruler arrives | ruler (yellow block with tick marks) | `drop`, `sound` land | Low side |
   | Ruler mistake | crayon (capsule), letters "1", "6" | `move` crayon onto 1–6, `clip` robo Yes, `wiggle` cat, `move` crayon to 0–5 | Close along ruler |
   | 100 cm = 1 m | letters | `pop` "100 cm", `pop` "= 1 m" | Straight on |
   | Pencil and book | pencil (thin cylinder + cone), book (box) | `move` onto ruler, `pop` length labels | Close side |
   | Balance | plank (rectangle), pivot (pyramid), apple, balloon | `move` apple onto left, balloon onto right, `turn` plank to tilt left down, `sound` land | Straight on |
   | Surprise | chick | `wiggle`, `sound` ooh | Close |
   | Pour test | tall glass, wide bowl, jug, water (blue cylinder) | `grow` water inside jug to a low level, then to a higher level | Straight on |
   | Chant | tools | `hop` on beats | Wide |
   | Tool picker | crayon, pumpkin (orange sphere), bottle, feather (oval) | `pop` each, `sound` windup_click, `move` to the right tool | Wide |
   | Friends again | bear, chick, confetti | `hop` both at once, `burst`, `clip` robo ThumbsUp | Wide |

9. **Experiment or hands-on activity**
   1. Length: measure a table with your hand-spans, then a grown-up's hand-spans. Prediction: same number?
      Result: different, because hands are different sizes. Then measure with a ruler: everyone agrees.
   2. Weight: a coat hanger balance with two cups on strings (a grown-up hangs it). Compare an apple and a
      balloon, then a sock and a spoon. Predict first.
   3. Capacity: fill a tall glass with water, pour it into a measuring jug, note the line. Do the same with a
      wide bowl. Work over a sink or tray; wipe spills so nobody slips.
   Safety: no glass for little hands (use plastic cups); grown-up helps with hanging the balance.

10. **Interaction moments**
    - Pause and guess (2–3 s, `windup_click`): "Which side will go down, apple or balloon?" then reveal.
    - Call and response: Robo: "Where does the ruler start?" Kids: "At zero!"
    - Move-along: kids hold up a fingertip for 1 cm and stretch their arms for about 1 m.
    - Estimate first: "Guess the pencil in centimetres" before every measure.

11. **Song or chant**
    Original marching chant with three verses, one per tool. Hook line idea: "Ruler for long, scale for
    heavy, jug for how much, measure-it ready!" Repeats in chapter 7 and before the challenge.

12. **Fun fact(s)**
    - You are a tiny bit taller in the morning than at bedtime (about 1 cm), because the soft pads in your
      back squash a little during the day (chapter 4). Kids can check it with a grown-up and a wall mark.
    - A 1 litre bottle of water weighs about 1 kilogram (chapter 5).
    - A teaspoon holds about 5 millilitres (chapter 6, a tiny unit, mention only).

13. **Vocabulary and captions**
    Labels: length, weight, capacity, centimetre (cm), metre (m), kilogram (kg), gram (g), litre (L), ruler,
    scale, jug, estimate. Use one spelling across the episode (UK "metre/litre" or US "meter/liter"); match
    the series choice.

14. **Quiz and recap**
    1. Which tool measures how heavy something is? (a scale or balance)
    2. A crayon goes from 0 to 8 on a ruler. How long is it? (8 cm)
    3. Why do we use centimetres instead of bear-steps? (Steps are different sizes; centimetres are the same
       for everyone.)
    4. Does a bigger thing always weigh more? (No: the big balloon was lighter than the apple.)
    Praise: Bear and Chick agree on "2 metres!" together.

15. **Sound and music**
    Music `playful`, gain 0.22. Voice 1.0. Effects: footstep_soft (steps), land (ruler, balance), ooh
    (surprises), bubble_pop (pouring), windup_click (guesses), ding (right tool), crowd_cheer (end).

16. **Thumbnail and YouTube**
    Thumbnail: the balance tipped by the tiny apple, with the big balloon up high and Chick amazed. Title idea:
    "Measure It! Length, Weight and Capacity for Kids | cm, kg, L | Grade 2 Math | Toy Box Friends". Tags:
    measurement for kids, length, weight, capacity, centimeters, kilograms, liters, how to use a ruler,
    grade 2 math, estimate and measure, Toy Box Friends, 3D cartoon for kids.

17. **Catalog gaps**
    - Ruler: stand-in: long flat yellow block with thin black rectangle tick marks and `letter` numbers.
    - Balance or scale: stand-in: a long rectangle plank on a pyramid; tilt it with `turn`.
    - Jug, glass, bowl, water: stand-in: cylinders (glossy material); water is a blue cylinder inside that
      `grow`s. A non-uniform scale (y only) would look better; `grow` scales all axes, so flag a "fill level"
      option.
    - Pencil, crayon, book, pumpkin, feather: capsule, cylinder + cone, box, orange sphere, white oval.

18. **Do and don't**
    - Do keep "bear-steps" and "chick-steps" as names; never "feet" (avoids the foot unit mix-up).
    - Don't compare by eye only (big, bigger, biggest belongs to PK-11); always name a unit or tool here.
    - Don't say "heavy things are big" or "tall cups hold more"; the surprises exist to break those ideas.
    - Do say "about" for every benchmark.
    - US viewers learn inches and feet too; a one-line mention is fine, but keep metric as the lesson.

---

### G2-07 · Plant Lab: What Do Plants Need?
**Grade 2 · Science experiment · 8:30 · garden** — a fair test shows plants need water to sprout and light to grow green and strong.
**Skills:** plants_2 · **Standard:** NGSS 2-LS2-1

1. **Big idea**
   "Seeds need water to start, and plants need light to grow green and strong; a fair test changes only one
   thing."

2. **Learning goals**
   - I can name what plants need: light, water, air, space and nutrients from soil.
   - I can plan a fair test that changes only one thing.
   - I can predict, watch and compare results.
   - I can explain why the plant in the dark grew tall, thin and pale.

3. **Hook (first 15 s)**
   A science-fair table with a sign: "What do plants need?" Two plants sit side by side. One is short, green
   and leafy. One is tall, skinny and yellow-white. Robo: "Same seeds, same pots, same day. So what
   happened?" Cat leans in: "I want to see the evidence."

4. **What makes it unique**
   It is the only episode built around a real fair test with a control (pot A). A 10-day time-lapse plays in
   40 seconds with a day counter. The answer to the hook surprises kids: the pale plant grew taller, not
   shorter, because it was stretching to find light.

5. **Cast and roles**
   - **Robo** (lab host): plants the seeds; first suggests changing two things at once (not fair!).
   - **Cat** (sidekick, lab checker): asks "but why is the dark one taller?"; insists on one change only.
   - **Bunny** (guest, gardener): waters pots A and B, never C; keeps the lab notebook.
   - **Sun** (prop): lights pot A and C; hides behind a box "cupboard" for B.

6. **Setting and look**
   Garden stage, `soft_day`. A lab table (a long box) with three pots (brown cylinders) labelled A, B, C.
   Pot B goes into a cupboard (a big open box). A day counter (number block) on the table. Camera: close
   three-pot line-up at table height; slow push-ins for the time-lapse. Mood: fresh greens, curious calm.

7. **Storyline**

   | # | Chapter | Time | What happens | Teaching move | Emotional beat |
   |---|---|---|---|---|---|
   | 1 | Two mystery plants | 0:00–0:25 (25 s) | Green plant vs tall pale plant | Hook | Puzzled |
   | 2 | What do plants need? | 0:25–1:15 (50 s) | Kids guess; light, water, air, space, soil nutrients | Teach | Curious |
   | 3 | Setting up a fair test | 1:15–2:35 (80 s) | Pots A, B, C; change one thing; Robo's unfair idea | Teach + explain why | Thoughtful |
   | 4 | Predictions | 2:35–3:15 (40 s) | Cat, Bunny and kids predict each pot | Try | Anticipation |
   | 5 | Ten days in 40 seconds | 3:15–3:55 (40 s) | Time-lapse with day counter | Show | Wonder |
   | 6 | Results and why | 3:55–5:15 (80 s) | Compare A vs B (light), A vs C (water) | Explain why | Aha |
   | 7 | Plant parts at work | 5:15–6:05 (50 s) | Roots take up water, stem carries it, leaves use light to make food | Teach | Calm |
   | 8 | The Grow-Grow chant | 6:05–6:30 (25 s) | Chant | Practise | Joy |
   | 9 | Challenge: fair or not fair? | 6:30–7:35 (65 s) | Four test ideas; kids judge | Challenge | Clever |
   | 10 | Quiz and recap | 7:35–8:15 (40 s) | Four questions | Quiz | Proud |
   | 11 | Your turn at home | 8:15–8:30 (15 s) | Try-at-home list, goodbye | Praise | Inspired |

   Total: 510 s = 8:30.

   **The fair test (chapter 3)**

   | Pot | Light | Water | What stays the same |
   |---|---|---|---|
   | A (control) | Sunny window | A little every day | Same seeds (cress or beans), same cup, same soil, same amount of seeds |
   | B | Dark cupboard | A little every day (same as A) | Same as A except light |
   | C | Sunny window | None | Same as A except water |

   Compare A and B to learn about light. Compare A and C to learn about water. Robo's unfair idea: "Put C in
   the cupboard too and give it no water." Cat: "Then we wouldn't know which change made the difference."

   **Time-lapse beats (chapter 5)**, about 4 s per beat, day counter pops each time:
   - Day 1: three pots of soil, seeds just planted.
   - Day 3: A and B show tiny sprouts. C: nothing.
   - Day 5: A has short green stems and two small leaves. B has taller, thinner, pale stems. C: nothing.
   - Day 7: A is bushy and green. B is tall, floppy and yellow-white. C: dry soil, no sprouts.
   - Day 10: A is the healthiest. B leans over. C still nothing.

   **Results and why (chapter 6)**
   - Seeds in B sprouted in the dark. Seeds do not need light to sprout; they use food stored inside the seed.
   - B grew tall and pale because the young plant was stretching up to look for light. Without light, leaves
     cannot make food, so they stay pale and the plant gets weak.
   - Seeds in C never sprouted. Seeds need water to start growing.
   - The hook mystery is solved: the pale tall plant had been kept in the dark.

   **Challenge (chapter 9)**: fair or not fair?
   1. Two pots, one with water and one without, both in the sun. (Fair: one change.)
   2. One pot in the sun with water, one in the dark without water. (Not fair: two changes.)
   3. Same pots, but one has 3 seeds and one has 30. (Not fair: the seed count changed too.)
   4. Two pots in the sun, one gets a little water and one gets a flood. (Fair test of how much water.)

8. **Animation and staging list**

   | Moment | Objects | Actions | Camera |
   |---|---|---|---|
   | Two mystery plants | plant_green (short cylinder stem + 4 leaf ovals), plant_pale (tall thin cream stem, 2 small ovals) | `show` both, `wiggle` pale one | Close table height |
   | Needs list | sun, cloud, letters "light", "water", "air", "space", "soil" | `pop` each word with its prop, `sound` sparkle | Wide |
   | Pots | pot_a, pot_b, pot_c (brown cylinders), letters A, B, C | `drop` each pot, `pop` label | Table height |
   | Seeds in | small brown spheres | `drop` into pots | Top-down |
   | Robo's unfair idea | robo, pot_c | `move` pot C toward the cupboard, Cat `wiggle`, `move` back | Medium |
   | Cupboard | big box, pot_b | `move` pot B inside, `sound` footstep_soft | Side |
   | Predictions | thought bubbles (cloud props) over cat, bunny | `pop` | Medium |
   | Time-lapse | day block (number_block 1, 3, 5, 7, 10), sprout stems (cylinders), leaves (ovals) | `pop` day, `grow` stems (A short and steady, B tall), `pop` leaves (green in A, cream in B), `sound` sprout_spring | Slow `camera` push-in across 40 s |
   | B leans | plant_b stem | `turn` 15° | Close |
   | C stays dry | pot_c | nothing grows; `wiggle` Bunny with a shrug | Close |
   | Plant parts | big model plant: roots (thin cylinders), stem, leaves | `grow` roots, blue water sphere `move` up the stem, `grow` leaf with sun glow | Cutaway, straight on |
   | Chant | plants | `wiggle` on beats | Wide |
   | Fair or not | cards (rectangles with letters "FAIR" / "NOT FAIR") | `sound` windup_click, `pop` answer, `nod` cat | Medium |
   | Goodbye | bubbles | `burst` bubbles, `clip` robo Wave | Wide |

9. **Experiment or hands-on activity**
   - **You need:** cress seeds (fast, about 1–3 days to sprout) or dried beans, three small cups, cotton wool
     or potting soil, a spoon of water each day, a sunny window and a dark cupboard. Label cups A, B, C.
   - **Steps:** 1. Put soil in each cup and sprinkle the same number of seeds. 2. Water A and B the same
     small amount; give C none. 3. Put A and C on a sunny windowsill, B in a dark cupboard. 4. Check every
     day at the same time and draw what you see. 5. After 7–10 days, compare.
   - **Prediction:** ask the child to say what will happen in each cup before starting.
   - **Expected result:** A green and strong; B sprouts but grows tall, thin and pale; C does not sprout.
   - **Safety:** wash hands after touching soil. Do not eat seeds (some garden seeds are treated). A grown-up
     helps with windowsills and cupboards. Use plastic cups.

10. **Interaction moments**
    - Pause and guess (2–3 s, `windup_click`): "Which pot will sprout first?" and "Fair or not fair?"
    - Call and response: Robo: "How many things do we change?" Kids: "Only one!"
    - Move-along: kids crouch as seeds, then slowly stretch up like the time-lapse; in the dark version they
      stretch up very tall and wobbly.

11. **Song or chant**
    Original growing chant, slow then faster. Hook line idea: "Light up high, water low, give me space and
    watch me grow." Repeats in chapter 8 and softly under the goodbye.

12. **Fun fact(s)**
    - Young sunflowers turn their heads to follow the sun across the sky (chapter 2). True; grown sunflowers
      mostly stay facing east.
    - Some kinds of bamboo can grow almost a metre in one day (chapter 5, after the time-lapse).
    - Plants give off oxygen, part of the air we breathe (chapter 7).

13. **Vocabulary and captions**
    Labels: seed, sprout, roots, stem, leaves, light, water, fair test, prediction, result. Day counter with
    `count` style ("Day 1" ... "Day 10"). Results table as three labels: A green and strong, B tall and pale,
    C no sprouts.

14. **Quiz and recap**
    1. Which pot got no water? What happened? (C; the seeds did not sprout.)
    2. Why did pot B grow tall and pale? (It was stretching for light, and leaves need light to make food.)
    3. What makes a test fair? (Change only one thing.)
    4. Name three things plants need. (Any three: light, water, air, space, nutrients from soil.)
    Praise: Bunny holds up the green plant; Cat: "Evidence wins."

15. **Sound and music**
    Music `calm`, gain 0.20, rising to `happy` 0.22 after results. Voice 1.0. Effects: sprout_spring (time-lapse
    growth), footstep_soft (cupboard), bubble_pop (watering), windup_click (guesses), ding (fair test
    answers), crowd_cheer (end).

16. **Thumbnail and YouTube**
    Thumbnail: the green plant next to the tall pale plant with "?" between them and Cat looking closely. Title
    idea: "What Do Plants Need? A Real Plant Experiment for Kids | Light and Water | Toy Box Friends". Tags:
    plant experiment, what do plants need, fair test, plants for kids, seed growing, time lapse plants, grade
    2 science, 2nd grade science, science experiment for kids, Toy Box Friends.

17. **Catalog gaps**
    - Plant pots and plants: stand-in: brown cylinder pots; stems as thin green (or cream) cylinders; leaves as
      green ovals. A "seedling" prop would help.
    - Roots: stand-in: thin brown cylinders under a cut-away pot.
    - Cupboard: no open-front box. Stand-in: a tall box behind pot B plus a rectangle door that `move`s across
      to close it.
    - Watering can: stand-in: Bunny tilts a small cylinder; bubble_pop sound for water.
    - Thought bubbles: stand-in: small cloud props.

18. **Do and don't**
    - Do say seeds can sprout in the dark; don't say "plants die without light in a day".
    - Don't say plants "eat soil"; say they take in water and nutrients through roots, and leaves make food.
    - Do show the dark plant as tall, not small; that is the surprising, true result.
    - Don't skip the safety line about not eating seeds; say "with a grown-up" on screen for the cupboard and
      windowsill.
    - Keep seasons and weather out (they belong to G1-08).

---

### G2-08 · Habitat Hop
**Grade 2 · Science · 7:45 · garden (with zone patches)** — a habitat gives an animal food, water, shelter and space, and animals have body parts that fit their home.
**Skills:** habitats_2 · **Standard:** NGSS 2-LS4-1

1. **Big idea**
   "A habitat is an animal's home: it has the food, water, shelter and space that animal needs."

2. **Learning goals**
   - I can name four things every habitat gives: food, water, shelter, space.
   - I can describe a desert, a polar home, a forest, an ocean and a pond.
   - I can explain why an animal's body fits its habitat (thick fur in the cold, big ears in the heat).
   - I can spot an animal in the wrong home and say what it is missing.

3. **Hook (first 15 s)**
   Frog wakes up on hot yellow sand. He blinks. No pond, no lily pads, no water. "This isn't my home!" Robo
   zooms in on the Habitat Hopper (a spinning ring): "Hold on, Frog, we'll find your way back." Cat: "And
   we'll find out why the desert is wrong for you."

4. **What makes it unique**
   A rescue mission across five homes, with a hop between each (spin, whoosh, camera glide). Two bear
   cousins, one brown (forest) and one white (polar), show the same kind of animal with different bodies for
   different homes. In the challenge, kids rescue three more animals from wrong homes. No other episode
   travels between settings.

5. **Cast and roles**
   - **Robo** (host and Hopper pilot): steers the Habitat Hopper; once lands in the ocean by mistake.
   - **Cat** (sidekick): asks "but why can't Frog live here?"; checks the four needs at every stop.
   - **Frog** (guest, the lost one): feels what is wrong in each place; finally home at the pond.
   - **Bear (brown) and Polar Bear (white bear critter)** (guests): explain fur, food and shelter.
   - **Bunny** (sand-coloured, as a desert hare): shows big ears that help it lose heat.
   - **Duck** (pond neighbour): welcomes Frog home.

6. **Setting and look**
   Garden stage with five zone patches laid out left to right on the floor: desert (sand-coloured flat box,
   cone "cacti"), polar (white flat box, white cube "ice"), forest (grass with trees and bushes), ocean (blue
   flat box, wavy blue spheres), pond (grass with a blue oval pond and green circle lily pads). The camera
   glides between zones. Light `soft_day`; desert warm, polar cool white. Mood: adventure, travelling.

7. **Storyline**

   | # | Chapter | Time | What happens | Teaching move | Emotional beat |
   |---|---|---|---|---|---|
   | 1 | Frog in the desert | 0:00–0:25 (25 s) | Lost Frog, the Hopper arrives | Hook | Worried |
   | 2 | What is a habitat? | 0:25–1:10 (45 s) | Four needs: food, water, shelter, space | Teach | Clear |
   | 3 | Hop 1: the desert | 1:10–2:05 (55 s) | Hot, dry; desert hare's big ears; why Frog dries out | Teach + explain why | Thirsty, curious |
   | 4 | Hop 2: the polar home | 2:05–3:00 (55 s) | Ice and snow; polar bear's thick fur and fat | Teach + explain why | Brr, wow |
   | 5 | Hop 3: the forest | 3:00–3:50 (50 s) | Trees for shelter; brown bear eats berries and fish | Show | Cosy |
   | 6 | Hop 4: oops, the ocean | 3:50–4:30 (40 s) | Salty water; fish breathe with gills; not a frog home | Show | Funny |
   | 7 | Home: the pond | 4:30–5:15 (45 s) | Fresh water, lily pads, bugs to eat | Show + explain why | Relief, joy |
   | 8 | The Home Sweet Habitat chant | 5:15–5:40 (25 s) | Chant | Practise | Joy |
   | 9 | Challenge: Wrong Home Rescue | 5:40–6:45 (65 s) | Three animals in the wrong places; kids send them home | Challenge | Heroic |
   | 10 | Quiz and recap | 6:45–7:25 (40 s) | Four questions | Quiz | Proud |
   | 11 | Goodbye from the pond | 7:25–7:45 (20 s) | Bubbles, everyone waves | Praise | Warm |

   Total: 465 s = 7:45.

   **What each habitat gives (the four-needs checklist Cat ticks)**

   | Habitat | Food | Water | Shelter | Space | Body that fits | Why not for Frog |
   |---|---|---|---|---|---|---|
   | Desert | seeds, plants | very little | burrows, shade | wide and open | desert hare: big ears let heat out | Frog's skin dries out; no pond to lay eggs |
   | Polar (Arctic) | fish, seals | frozen; snow | snow dens | huge and icy | polar bear: thick fur, fat layer, big paws | Too cold; frogs can't stay active |
   | Forest | berries, nuts, fish in streams | streams | trees, caves | lots of trees | brown bear: claws for digging, climbing | Close, but Frog needs his own pond |
   | Ocean | fish, sea plants | salty sea water | reefs, deep water | the biggest home of all | fish: gills, fins | Salt water is wrong for frogs |
   | Pond | bugs, worms | fresh water | lily pads, reeds, mud | water and bank | frog: wet skin, strong legs, webbed feet | It's home! |

   **Wrong Home Rescue (chapter 9)**:
   1. Polar bear in the desert: too hot, thick fur. Send to: polar home.
   2. Duck on the ice: no open water to swim, too cold. Send to: pond.
   3. Desert hare in the ocean: can't swim far, no plants to eat. Send to: desert.
   Kids say where each goes during a 3 s windup pause; the Hopper beams them home.

8. **Animation and staging list**

   | Moment | Objects | Actions | Camera |
   |---|---|---|---|
   | Frog wakes | frog, desert patch, cone cacti, sun | `wake` frog, `turn` frog#head left then right, `wiggle` | Close on Frog, then wide |
   | Hopper arrives | hopper (torus, glow), robo | `drop` hopper, `spin` hopper, `sound` whoosh, `clip` robo Wave | Wide |
   | Four needs | letters "food", "water", "shelter", "space" | `pop` each, `sound` ding | Straight on |
   | Desert hare | bunny (sand colour) | `hop`, `nod` (ears explained by voice, see gaps) | Close |
   | Hop between zones | hopper, frog, robo, cat | `spin` hopper 2 turns, `move` all to next zone, `camera` glide 1.5 s | Camera move |
   | Polar bear | white bear critter, white cubes | `move` in, `nod`, `sleep` briefly in a snow den (a white half-sphere) then `wake` | Medium, cool |
   | Frog shivers | frog | `wiggle` fast and small (deg 6) | Close |
   | Forest | brown bear, trees, bushes, berry spheres | `move` bear, `pop` berries | Wide |
   | Ocean oops | blue patch, capsule fish with faces | `pop` fish, `move` fish side to side, `clip` robo No | Wide |
   | Pond home | pond oval, lily pads (green circles), duck | `hop` frog onto lily pad, `nod` duck, `burst` bubbles | Close then wide |
   | Chant | everyone | `hop` on beats | Wide |
   | Wrong Home Rescue | polar bear on desert patch, etc. | `sound` windup_click, `spin` hopper, `move` animal to the right zone, `sound` ding | Wide pan |
   | Goodbye | bubbles | `burst`, `clip` robo Wave, `wiggle` all | Wide |

9. **Experiment or hands-on activity**
   "Habitat in a box": with a shoebox, the child makes one habitat from things at home (sand or rice for a
   desert, cotton wool for snow, leaves for a forest, blue paper for a pond). Add one toy animal and check the
   four needs with a grown-up: is there food, water, shelter and space? Optional mini test: hold an ice cube
   in a mitten for 30 seconds, then without a mitten; feel how fur and mittens keep warmth in. Safety: no
   real animals in boxes; scissors with a grown-up.

10. **Interaction moments**
    - Call and response: Robo: "Every home needs...?" Kids: "Food, water, shelter, space!"
    - Pause and guess (2–3 s, `windup_click`): "Is this a good home for Frog?" before each check.
    - Move-along: kids shiver at the polar stop, fan themselves in the desert, swim arms in the ocean, and leap
      like frogs at the pond.

11. **Song or chant**
    Original travel chant with a hopping beat. Hook line idea: "Hop, hop, where's your home? Food and water,
    a place to roam!" One short verse per habitat; repeats in chapter 8 and as the Hopper travels.

12. **Fun fact(s)**
    - Polar bears have black skin under their white fur, which helps soak up the sun's warmth (chapter 4).
    - Frogs don't drink with their mouths; they soak up water through their skin (chapter 3, why the desert is
      hard for Frog).
    - Polar bears live in the Arctic, in the far north; penguins live in the south, so they never meet in the
      wild (chapter 4).

13. **Vocabulary and captions**
    Labels: habitat, food, water, shelter, space, desert, Arctic, forest, ocean, pond, fur, gills. Subtitles
    match the voice.

14. **Quiz and recap**
    1. What four things does every habitat give? (food, water, shelter, space)
    2. Why does a polar bear have thick fur? (To stay warm in the icy cold.)
    3. Where does Frog live? (A pond, with fresh water.)
    4. Which home is hot and dry? (the desert)
    Praise: Frog hops onto a lily pad, Duck quacks, Cat: "Mission complete."

15. **Sound and music**
    Music `playful` (travel feel), gain 0.22; calmer `calm` 0.18 at the pond. Voice 1.0. Effects: whoosh (hops),
    magic_sparkle (Hopper), sparkle (four needs), bubble_blow (ocean and pond), squeak (Frog's alarm),
    crowd_cheer (home).

16. **Thumbnail and YouTube**
    Thumbnail: Frog on the sand looking shocked, the white polar bear behind him and the Hopper ring glowing.
    Title idea: "Habitat Hop! Animal Homes for Kids: Desert, Arctic, Forest, Ocean, Pond | Toy Box Friends".
    Tags: habitats for kids, animal habitats, desert animals, arctic animals, forest animals, ocean animals,
    pond life, grade 2 science, animal adaptations, 2nd grade science, Toy Box Friends.

17. **Catalog gaps**
    - Habitat ground patches: one stage per video. Stand-in: flat coloured boxes on the garden floor (sand,
      white, blue) with the camera gliding between them. A per-scene stage change would be a real feature.
    - Cactus, ice, snow den, lily pads: stand-in: green cones and capsules, white cubes, a white half-buried
      sphere, green circles.
    - Fish: stand-in: orange capsule shapes with faces (`face: true`) and a small cone tail.
    - Polar bear: stand-in: the bear critter with `color: white`.
    - Desert hare with long ears: stand-in: the bunny critter in `sand` colour; its ears are not scalable on
      their own, so the voice explains them.
    - Hopper: stand-in: a glowing torus that spins.

18. **Do and don't**
    - Do say farm animals (cow, pig, sheep) live with people on farms; don't present a farm as a wild habitat.
    - Don't put polar bears and penguins together.
    - Don't make the lost Frog scary or in danger; he is puzzled, never hurt.
    - Keep weather and seasons out (G1-08); talk about "hot and dry" as what the place is like, not forecasts.
    - Living versus non-living is a reserve topic; don't turn the episode into it.

---

### G2-09 · Treasure Map Quest
**Grade 2 · Social studies / geography · 7:30 · playroom** — a map is a bird's-eye view with a key, a compass rose and a grid.
**Skills:** maps_2 · **Standard:** C3 D2.Geo.2.K-2 (approximate); NGSS 2-ESS2-2 (model of an area)

1. **Big idea**
   "A map is a drawing from above; the key tells what symbols mean, and the compass tells which way to go."

2. **Learning goals**
   - I can explain that a map shows a place as if seen from above.
   - I can use a map key to read symbols.
   - I can name north, east, south and west on a compass rose.
   - I can find a square on a grid (D4) and follow a route.

3. **Hook (first 15 s)**
   A paper plane (a folded cream triangle) glides in through the window and lands on the rug. Robo unfolds
   it into a scrap of map: a square with a tree symbol, a
   blue oval and a big X, and the words "3 east, 3 north". Dog sniffs: "Treasure?" Cat: "Only if we can read
   the map."

4. **What makes it unique**
   The camera lifts straight up from the playroom to a top-down view, and the real props become flat map
   symbols on the same spot. Kids see how a 3D room becomes a 2D map. The episode also has a blocked route:
   Cat's shortcut runs into a tree, so kids learn routes matter. It is the only episode with a bird's-eye
   camera.

5. **Cast and roles**
   - **Robo** (host and treasure hunter): reads the map; once turns west instead of east.
   - **Cat** (sidekick, navigator): asks "but why is north at the top?"; plans a shortcut that is blocked.
   - **Dog** (guest, the sniffer): walks the route square by square.
   - **Pig** (guest, map-key keeper): holds the key and checks each symbol.

6. **Setting and look**
   Playroom stage. On the rug, a 5 × 5 grid of thin lines (columns A–E from west to east, rows 1–5 from south
   to north), each square about 1.2 m. Props: house at A1 (start), tree at B4, bush at C2, pond (blue oval) at
   E2, flower at D5, a hidden gift (the treasure) at D4. A compass rose (four cones) at the rug edge. Camera:
   eye-level in the room, then a smooth rise to straight down. Mood: adventurous, sunny.

7. **Storyline**

   | # | Chapter | Time | What happens | Teaching move | Emotional beat |
   |---|---|---|---|---|---|
   | 1 | A paper plane lands | 0:00–0:25 (25 s) | Paper plane, map scrap, "3 east, 3 north" | Hook | Excited |
   | 2 | Bird's-eye view | 0:25–1:25 (60 s) | Camera rises; props become symbols | Teach + explain why | Wow |
   | 3 | The map key | 1:25–2:25 (60 s) | Pig's key: symbols for house, tree, bush, pond, flower, X | Teach | Clear |
   | 4 | The compass rose | 2:25–3:25 (60 s) | N, E, S, W; Robo turns the wrong way | Teach + explain why | Funny |
   | 5 | Grid squares | 3:25–4:25 (60 s) | Letters across, numbers up; find B4, E2 | Teach + try | Puzzle fun |
   | 6 | The Compass chant | 4:25–4:50 (25 s) | Chant with turning | Practise | Joy |
   | 7 | Follow the route | 4:50–5:50 (60 s) | Dog walks A1 → D1 → D4; Cat's blocked shortcut | Try | Suspense |
   | 8 | Challenge: the second treasure | 5:50–6:45 (55 s) | Clue: "2 squares west of the pond, under a bush" | Challenge | Triumph |
   | 9 | Quiz and recap | 6:45–7:15 (30 s) | Four questions | Quiz | Proud |
   | 10 | Make your own map | 7:15–7:30 (15 s) | Goodbye and home task | Praise | Inspired |

   Total: 450 s = 7:30.

   **The grid (top-down, north at the top)**

   | Row | A | B | C | D | E |
   |---|---|---|---|---|---|
   | 5 | | | | flower | |
   | 4 | | tree | | X (treasure) | |
   | 3 | | | | | |
   | 2 | | | bush | | pond |
   | 1 | house (start) | | | | |

   **Route (chapter 7)**: start A1, go 3 squares east (B1, C1, D1), then 3 squares north (D2, D3, D4).
   Treasure at D4. ✓ The path never crosses the pond (E2) or the bush (C2).
   **Cat's shortcut**: 3 north first (A2, A3, A4), then east to B4: the tree is in the way. Fix: go around
   (A4 → A5 → B5 → C5 → C4 → D4), or use Robo's route. The lesson: a route is a plan, and maps help you
   choose one.
   **Robo's wrong turn (chapter 4)**: facing north, he turns left and calls it east. Cat: "East is on your
   right when you face north."
   **Challenge (chapter 8)**: "The second treasure is 2 squares west of the pond, hidden under a bush." Pond
   E2 → 2 west → C2, the bush. ✓ Dog digs; a ball pops out.

8. **Animation and staging list**

   | Moment | Objects | Actions | Camera |
   |---|---|---|---|
   | Plane arrives | plane (cream `triangle`, flat), map scrap (rectangle) | `move` plane in a gentle swoop with `turn` banking, `drop` onto the rug, `pop` scrap, `sound` whoosh then land | Low, eye level |
   | Dog sniffs | dog | `move`, `nod`, `wiggle` | Close |
   | Bird's-eye rise | all props | `camera` from [0, 1.6, 9] to [0, 14, 0.1] looking at [0, 0, 0], dur 4, fov narrower | The big move |
   | Props to symbols | house → square, tree → green triangle, bush → green circle, pond → blue oval, flower → pink star | `hide` prop, `show` flat symbol on the same spot (one by one), `sound` sparkle | Top-down |
   | Map key | key board (rectangle), small symbols + letter words, pig | `pop` each row, `nod` pig | Straight on |
   | Compass rose | four cones, letters N, E, S, W | `pop` N first, then clockwise E, S, W; `spin` the rose once | Top-down close |
   | Robo wrong turn | robo | `turn` the wrong way, `clip` No, `turn` right way | Medium |
   | Grid | thin lines (long thin blocks), letters A–E, 1–5 | `drop` lines, `pop` letters | Top-down |
   | Find a square | highlight square (yellow flat square) | `move` to B4, then E2, `sound` ding | Top-down |
   | Route walk | dog | `move` one square per step (0.8 s), `hop` at each, `count` caption 1, 2, 3 | Top-down, then low follow |
   | Blocked shortcut | cat, tree | `move` cat to A4, `move` toward B4, `wiggle` tree, `sound` boing | Top-down |
   | Treasure | gift at D4 | `show` gift, `hop`, `burst` confetti | Low, eye level |
   | Second treasure | bush, ball | `wiggle` bush, `pop` ball, `sound` crowd_cheer | Close |
   | Goodbye | robo, dog, cat, pig | `clip` robo Dance | Wide |

9. **Experiment or hands-on activity**
   "Map your bedroom": the child draws their room from above on squared paper. Bed, door and toy box become
   simple symbols in a key. Add a compass rose (a grown-up helps find north with a phone compass or the
   morning sun side). Then hide a small toy, mark an X, and let a grown-up follow the route ("3 squares east,
   2 squares north"). Safety: only hide things in safe, open places; no climbing.

10. **Interaction moments**
    - Call and response: Robo points: "Up on the map is...?" Kids: "North!"
    - Pause and guess (2–3 s, `windup_click`): "What does the blue oval mean?" (pond). "Which square is the
      tree in?" (B4).
    - Move-along: kids stand, face the screen (north), and point east (right), south (behind), west (left).
    - Count the steps out loud with Dog: 1, 2, 3 east; 1, 2, 3 north.

11. **Song or chant**
    Original turning chant: four lines, one for each direction, with a quarter-turn on each line. Hook line
    idea: "North to the top, east to the right, south to the bottom, west takes flight!" Repeats in chapter 6
    and as Dog walks. The script writer can add an original memory sentence for N, E, S, W (not a well-known
    one).

12. **Fun fact(s)**
    - Some of the oldest maps we know were carved into clay tablets more than 2,500 years ago (chapter 2).
    - Astronauts had maps of the Moon to plan where to land (chapter 2).
    - A compass needle points north because the Earth acts like a giant magnet (chapter 4).

13. **Vocabulary and captions**
    Labels: map, bird's-eye view, symbol, map key, compass rose, north, east, south, west, grid, route. Grid
    squares captioned as "B4", "D4". `count` captions for steps.

14. **Quiz and recap**
    1. What does a map key tell you? (What the symbols mean.)
    2. On most maps, which way is at the top? (North.)
    3. Start at A1, go 2 squares east. Where are you? (C1)
    4. Why did Cat's shortcut not work? (The tree at B4 was in the way.)
    Praise: Dog holds the gift; Cat: "Navigator approved."

15. **Sound and music**
    Music `playful` (adventure), gain 0.22, music swell during the bird's-eye rise. Voice 1.0. Effects: whoosh
    (plane), sparkle (symbols), footstep_soft (Dog's steps), boing (blocked), ding (squares found),
    magic_sparkle (treasure), crowd_cheer (second treasure).

16. **Thumbnail and YouTube**
    Thumbnail: top-down map with the grid, the red X, the compass rose and Dog at the start. Title idea:
    "Treasure Map Quest! Map Skills for Kids: Key, Compass and Grid | Grade 2 | Toy Box Friends". Tags: map
    skills for kids, map key, compass rose, north south east west, cardinal directions, grid map, treasure
    map, grade 2 social studies, geography for kids, Toy Box Friends.

17. **Catalog gaps**
    - Map grid: stand-in: long thin blocks laid flat as lines, `letter` labels A–E and 1–5.
    - Compass rose: stand-in: four cones lying flat pointing out from a small circle, with N, E, S, W letters.
    - Flat map symbols: stand-in: flat shapes (square, triangle, circle, oval, star) lying on the floor.
    - Paper plane and paper scrap: stand-in: a flat cream triangle and a cream rectangle.
    - Red X: stand-in: two thin red blocks crossed, or a `letter` "X" lying flat.
    - Dog digging: no dig action. Stand-in: `wiggle` the bush and `hop` the dog.

18. **Do and don't**
    - Do keep north at the top of the top-down view every time; never rotate the map camera.
    - Don't confuse left and right with east and west unless facing north; say "when you face north".
    - Don't use position-word lessons (on, under, beside) as the teaching; that is PK-14. Here the tools are
      key, compass and grid.
    - Do keep the treasure a toy or a gift, never money.
    - Don't say "never eat soggy waffles" or other well-known mnemonics; use an original one.

---

### G2-10 · Melt, Freeze, Fizz: states of matter
**Grade 2 · Science experiment · 8:45 · playroom** — matter can be a solid, a liquid or a gas; heating and cooling change its state, and some changes can be undone.
**Skills:** – (none in the catalog yet) · **Standard:** NGSS 2-PS1-1, 2-PS1-4

1. **Big idea**
   "Solids keep their shape, liquids take the shape of their cup, gases spread out, and heating or cooling can
   change one into another."

2. **Learning goals**
   - I can sort things into solid, liquid and gas.
   - I can explain that heat melts ice and cold freezes water.
   - I can tell a change we can undo (melt and freeze) from one we cannot (the fizz).
   - I can do a safe kitchen fizz experiment with a grown-up and goggles.

3. **Hook (first 15 s)**
   Robo left his orange ice pop on the windowsill. Now there is only a stick and an orange puddle. "Someone
   took my ice pop!" Cat puts on a detective hat (a cone): "No one took it. But something changed it. Let's
   find out what."

4. **What makes it unique**
   It is a detective case with a "particle dance": groups of small spheres show the three states (packed and
   wiggling in a solid, sliding past each other in a liquid, zooming apart in a gas). The case ends with an
   "undo button" test: we can refreeze the puddle, but we cannot un-fizz the vinegar. It is the only episode
   with three experiments and goggles.

5. **Cast and roles**
   - **Robo** (host, the "victim"): loses his ice pop; first blames Dog.
   - **Cat** (detective sidekick): asks "but why did it melt there and not in the freezer?"; leads the tests.
   - **Duck** (guest, lab helper): wears goggles (two white circles); does the fizz with Robo.
   - **Dog** (guest, wrongly suspected): helps with the melt race and is cleared.

6. **Setting and look**
   Playroom stage, `soft_day`, with a kitchen corner: a table (box), a "freezer" (tall white box), a sunny
   windowsill (sun prop above a flat box), and a tray. Particle dance happens in a "zoom-in bubble" area on
   the right, on a cream backing. Camera: close on experiments, wide for the dance. Mood: playful detective,
   bright orange and icy blue.

7. **Storyline**

   | # | Chapter | Time | What happens | Teaching move | Emotional beat |
   |---|---|---|---|---|---|
   | 1 | The case of the missing ice pop | 0:00–0:25 (25 s) | A stick and a puddle; Cat takes the case | Hook | Mystery |
   | 2 | Solid, liquid, gas | 0:25–1:40 (75 s) | Particle dance and everyday examples | Teach + explain why | Wow |
   | 3 | The melt race | 1:40–3:00 (80 s) | Three ice cubes: sun, shade, freezer; Dog cleared | Experiment | Suspense |
   | 4 | Freeze it back | 3:00–4:00 (60 s) | Juice into a mould, into the freezer; new ice pop | Experiment + explain why | Relief |
   | 5 | Where did the puddle go? | 4:00–4:40 (40 s) | A puddle dries up: water turns into an invisible gas | Teach | Surprise |
   | 6 | The Solid-Liquid-Gas chant | 4:40–5:05 (25 s) | Chant with body moves | Practise | Joy |
   | 7 | The fizz lab | 5:05–6:35 (90 s) | Baking soda + vinegar blows up a balloon | Experiment | Excitement |
   | 8 | The undo button | 6:35–7:25 (50 s) | Melt and freeze undo; the fizz does not | Explain why | Aha |
   | 9 | Challenge: Solid, Liquid or Gas? | 7:25–8:05 (40 s) | Eight quick items | Challenge | Fast fun |
   | 10 | Quiz and recap | 8:05–8:35 (30 s) | Four questions | Quiz | Proud |
   | 11 | Case closed | 8:35–8:45 (10 s) | Robo holds up his new ice pop; confetti | Praise | Celebration |

   Total: 525 s = 8:45.

   **Particle dance (chapter 2)**
   - Solid (an ice cube, a block): 9 blue spheres in a tight 3 × 3 square, each `wiggle`s in place. It keeps
     its shape.
   - Liquid (water, juice): the same spheres slide loosely past each other and settle into the shape of a cup.
   - Gas (water vapour, air, the gas in the balloon): spheres `move` far apart and fill the whole space.
   Everyday examples: solid (apple, block, ice), liquid (water, milk, juice), gas (air in a balloon, bubbles'
   insides).

   **Melt race (chapter 3)**
   | Ice cube | Where | Prediction | Result after 15 minutes (time-lapse) |
   |---|---|---|---|
   | 1 | Sunny windowsill | Kids guess | Mostly melted: a puddle |
   | 2 | Shady table | Kids guess | Half melted |
   | 3 | Freezer | Kids guess | Still a solid cube |
   Explain why: heat from the sun warms the ice above 0 °C (32 °F), so it melts. Case clue: the ice pop was on
   the sunny windowsill. Dog is cleared; the culprit is the heat.

   **Freeze it back (chapter 4)**: orange juice into a plastic ice pop mould, add a stick, into the freezer
   overnight (time-lapse with moon prop). Water and juice freeze when they get cold enough (water at 0 °C).
   Leave a little space at the top, because water grows a little bigger when it freezes.

   **Puddle (chapter 5)**: a puddle on a plate gets smaller over a day; the water turned into water vapour, an
   invisible gas, and went into the air. This is called evaporating.

   **Fizz lab (chapter 7)**, done by Duck with Robo, both in goggles:
   1. A grown-up pours about half a cup of vinegar into a plastic bottle (on a tray).
   2. Using a funnel, put two spoons of baking soda into a balloon.
   3. Stretch the balloon over the bottle's neck without letting the powder fall in.
   4. Lift the balloon so the powder drops in. Fizz! Bubbles foam up and the balloon blows up.
   Explain why: the baking soda and vinegar make a new gas called carbon dioxide; the gas needs space, so it
   fills the balloon.

   **Undo button (chapter 8)**: melted ice pop → freeze → ice pop again (can undo). Fizzed vinegar → cannot
   get the baking soda and vinegar back; something new was made (cannot undo). Cat sums up: heating and
   cooling can be undone for water; the fizz cannot.

   **Challenge (chapter 9)**: rock (solid), milk (liquid), the air in a ball (gas), a spoon (solid), rain
   (liquid), water vapour in the air (gas), honey (liquid, a slow one), an ice cube (solid).

8. **Animation and staging list**

   | Moment | Objects | Actions | Camera |
   |---|---|---|---|
   | Missing ice pop | stick (thin capsule), orange puddle (flat orange circle), windowsill box, sun | `show` puddle, `clip` robo No, `sound` ooh | Close, then wide |
   | Detective hat | cone on cat's head | `drop` cone onto cat, `nod` cat | Close |
   | Particle dance: solid | 9 blue spheres in 3 × 3 | `show`, `wiggle` each (small deg) | Wide on the bubble area |
   | Liquid | the same spheres, cup outline (cylinder) | `move` each to loose spots in the cup, ease slow | Wide |
   | Gas | the same spheres | `move` far apart across the frame, `sound` whoosh | Wide |
   | Melt race set-up | 3 ice cubes (glossy white cubes), plates (flat circles) | `drop` each on its plate, `pop` labels 1, 2, 3 | Table height |
   | Melt time-lapse | ice cubes, puddles | `grow` cube 1 down to 0.2, puddle 1 `grow` up; cube 2 to 0.6; cube 3 stays; `count` caption minutes | Slow push-in |
   | Dog cleared | dog | `wiggle` happily, `clip` robo Yes | Medium |
   | Freeze it back | juice (orange cylinder), mould (box), freezer (tall box), moon | `move` mould into freezer, `show` moon, `hide` moon, `show` new ice pop (orange capsule on stick) | Wide |
   | Puddle dries | puddle | `grow` to 0.1 then `hide`; tiny spheres rise with `move` | Close |
   | Chant | everyone | `hop`, `wiggle`, `spin` on the solid, liquid, gas lines | Wide |
   | Goggles on | duck, robo, goggles (white circles) | `show` goggles, `nod` | Close |
   | Fizz | bottle (cylinder), balloon (balloon prop, small), bubbles | `pop` balloon onto bottle, `turn` balloon up, `burst` bubbles, `grow` balloon to 1.8, `sound` bubble_blow | Close, table height |
   | Undo button | big red button (cylinder), letters "UNDO" | `pop`; ice pop: `spin` back; fizz: `wiggle` No | Medium |
   | Challenge | item shapes, letters SOLID, LIQUID, GAS | `pop` each item, `sound` windup_click, `move` to the right word | Wide |
   | Case closed | confetti | `burst`, `clip` robo Dance | Wide |

9. **Experiment or hands-on activity**
   Three home experiments, each with a grown-up:
   1. **Melt race**: put three ice cubes on three plates: a sunny window, a shady table, the freezer. Predict
      the order. Check after 15 minutes. Wipe up water.
   2. **Freeze juice**: pour juice into a plastic ice pop mould or a paper cup with a stick. Leave space at the
      top. Freeze overnight. Eat it (it is real food).
   3. **Fizz balloon** (outdoors or on a tray): goggles on, a grown-up handles the vinegar. Half a cup of
      vinegar in a plastic bottle, two spoons of baking soda in a balloon, stretch it over the neck, lift.
   Safety, said in the voice and on screen: "Do this with a grown-up. Wear goggles. Don't taste the mixture.
   Never put a cap on the bottle. Vinegar stings eyes; if it splashes, rinse with water." Use plastic, not
   glass, in the freezer.

10. **Interaction moments**
    - Pause and guess (2–3 s, `windup_click`): "Which ice cube melts first?" and "Will the balloon get bigger?"
    - Call and response: Robo: "Keeps its shape?" Kids: "Solid!" Robo: "Takes the cup's shape?" Kids:
      "Liquid!" Robo: "Spreads out everywhere?" Kids: "Gas!"
    - Move-along: solid (stand stiff, arms tight), liquid (sway and flow), gas (spread arms and tiptoe around).

11. **Song or chant**
    Original three-part chant with a body move for each state. Hook line idea: "Solid stands still, liquid
    likes to flow, gas spreads out wherever it can go!" Repeats in chapter 6 and in the challenge round.

12. **Fun fact(s)**
    - Water gets a little bigger when it freezes; that is why ice cubes float in a drink (chapter 4).
    - The bubbles in the fizz are carbon dioxide, the same gas that makes fizzy drinks fizzy (chapter 7).
    - Water is easy to find in all three states: ice, water and water vapour in the air (chapter 5).

13. **Vocabulary and captions**
    Labels: solid, liquid, gas, melt, freeze, evaporate, water vapour, carbon dioxide, goggles. Safety caption
    "With a grown-up · Wear goggles" stays on screen for the whole fizz lab. Temperatures shown as "0 °C (32 °F)".

14. **Quiz and recap**
    1. Is juice a solid, a liquid or a gas? (a liquid)
    2. What made the ice pop melt? (Heat from the sun.)
    3. Can we undo melting? (Yes, by freezing.) Can we undo the fizz? (No, a new gas was made.)
    4. What filled the balloon? (A gas, carbon dioxide.)
    Praise: Robo holds his new ice pop; Cat: "Case closed: the culprit was heat."

15. **Sound and music**
    Music `playful`, gain 0.20; a cool `calm` 0.16 under the freezer night. Voice 1.0. Effects: ooh (puddle),
    crystal_chime (ice), whoosh (gas spreads), bubble_blow and bubble_pop (fizz), windup_click (guesses),
    ding (right answers), crowd_cheer (case closed). No loud bangs.

16. **Thumbnail and YouTube**
    Thumbnail: the balloon puffed up on the bottle, Duck in goggles, foamy bubbles, and the melted ice pop
    puddle beside them. Title idea: "Melt, Freeze, Fizz! Solids, Liquids and Gases for Kids | Easy Science
    Experiment | Toy Box Friends". Tags: states of matter, solid liquid gas, melting and freezing, baking soda
    and vinegar, science experiment for kids, grade 2 science, reversible changes, ice experiment, 2nd grade
    science, Toy Box Friends.

17. **Catalog gaps**
    - Ice cubes and ice pop: stand-in: glossy white cubes; an orange capsule on a thin capsule stick.
    - Water, juice, puddles: stand-in: flat blue or orange circles and cylinders (glossy). A melting or liquid
      material would be a real feature.
    - Bottle, funnel, mould, freezer, red button: stand-in: cylinder, cone, box, tall white box, flat red cylinder.
    - Goggles: stand-in: two small white circles on the head (glossy).
    - Foam: stand-in: the `bubbles` effect rising from the bottle mouth.
    - Detective hat: stand-in: a small brown cone.
    - Skill id: there is no states-of-matter skill in catalog/education yet; add one (for example
      `states_of_matter_2`) in a later catalog task.

18. **Do and don't**
    - Do say "with a grown-up" and show goggles in every fizz shot. Don't seal the bottle.
    - Don't call the fizz "air"; it is a gas called carbon dioxide.
    - Don't show tasting vinegar or the mixture. The juice ice pop is the only thing eaten.
    - Don't use the sink or float idea (PK-08); this episode is about changing state.
    - Don't say steam is the white cloud above a kettle; that cloud is tiny water drops. Avoid kettles and
      boiling altogether.

---

### G2-11 · Pizza Party Thirds
**Grade 2 · Math / fractions · 7:30 · classroom** — share one whole fairly among three: thirds are three equal parts, and parts are only compared when the wholes are the same size.
**Skills:** thirds_2 · **Standard:** CCSS 2.G.A.3

1. **Big idea**
   "Three equal parts of one whole are thirds. Three thirds make the whole again, and more equal parts means
   smaller parts."

2. **Learning goals**
   - I can cut a circle and a rectangle into three equal parts and call each part one third.
   - I can say one third, two thirds and three thirds, and I know three thirds make one whole.
   - I can tell thirds (three equal parts) from three parts that are not equal.
   - I can explain why a half, a third and a fourth of the same pizza get smaller, and why the wholes must be
     the same size before we compare.

3. **Hook (first 15 s)**
   A class pizza party. One round pizza on the table, three hungry friends: Robo, Cat and Bear. Robo cuts it
   once, straight down the middle: two pieces. Bear looks at the two pieces, then at three friends, and his
   face drops (`feel` worried). Robo tries again and makes three pieces, but one is huge and two are tiny.
   Cat: "Three pieces is not the same as three fair shares. So how do we do it?"

4. **What makes it unique**
   The Fair-Share Scanner: Cat lifts the slices and stacks them on top of each other. If they match exactly, a
   green tick appears (`mark` correct); if one sticks out, a soft red cross (`mark` incorrect). Kids see
   "equal" instead of being told it. The Same Size Whole trick is new to the series: Robo is sure his half of a
   tiny snack pizza beats Cat's third of a giant party pizza, and the side-by-side comparison proves him wrong.
   Thirds of one rectangle in two different shapes (tall strips and flat strips) show that equal parts can
   look different and still be fair.

5. **Cast and roles**
   - **Robo** (host, pizza chef): makes the unfair cut and the "half always wins" mistake on purpose so kids
     can fix him. Voice `soft` (`meta.voice`).
   - **Cat** (sidekick, the Fair-Share Scanner): asks "but why?", stacks slices to check, keeps the rule
     "same whole, then compare". Voice `squeaky`.
   - **Bear** (guest, the third friend): the reason we need thirds; eats one third so kids can see two thirds
     left. Voice `deep`.
   - **Pig** (guest cameo, no lines): arrives late in chapter 6 so the class needs fourths; nods and hops.
   - Every spoken line is a `say` with `who` (robo, cat, bear) so mouths move with the voice. Characters
     stand behind or beside the table, never between the camera and the pizza.

6. **Setting and look**
   `classroom` stage (chalkboard wall, wood floor), `soft_day`. The chalkboard reads "Pizza Party!" One
   long table (`table` prop) in the middle with plates (`plate` shape). Pizzas are `fraction_circle` objects in
   warm cheese yellow with a tomato-red crust ring; a rectangle "flatbread tray" is a `fraction_bar`. The
   catalog `pizza` prop appears only in the hook and the goodbye as the "real" pizza. Camera: top-down
   demonstration shots for every cut (`shot` with height about 75°), medium two-shots for reactions, close-ups
   for the scanner. Mood: warm, friendly, golden.

7. **Storyline**

   | # | Chapter | Time | What happens | Teaching move | Emotional beat |
   |---|---|---|---|---|---|
   | 1 | One pizza, three friends | 0:00–0:30 (30 s) | Two pieces for three friends; then three unequal pieces | Hook | Uh-oh |
   | 2 | What is a fair share? | 0:30–1:15 (45 s) | Review: equal parts, the whole, halves (from G1-07) | Teach (review) | Confident |
   | 3 | Cutting thirds | 1:15–2:30 (75 s) | Robo's crooked cut fails the scanner; three equal slices pass; the flatbread in thirds | Teach + explain why | Aha |
   | 4 | One third, two thirds, three thirds | 2:30–3:30 (60 s) | Count the thirds; Bear eats one; two thirds left; three thirds make one whole | Show + try | Yum, proud |
   | 5 | Thirds in different shapes | 3:30–4:15 (45 s) | Same flatbread cut in tall strips and in flat strips: both thirds | Show + explain why | Surprise |
   | 6 | Halves, thirds, fourths | 4:15–5:15 (60 s) | Pig arrives: fourths; one slice of each lined up: more parts, smaller parts | Explain why | Clever |
   | 7 | The Same Size Whole trick | 5:15–5:55 (40 s) | Tiny pizza half vs giant pizza third | Explain why | Funny twist |
   | 8 | The Thirds chant | 5:55–6:20 (25 s) | Chant with slices sliding in and out | Practise | Joy |
   | 9 | Challenge: Fair Share or Not? | 6:20–7:00 (40 s) | Four pictures; kids decide | Challenge | Sharp |
   | 10 | Quiz and recap | 7:00–7:30 (30 s) | Five questions, recap, goodbye | Quiz | Proud |

   Total: 450 s = 7:30.

   **Chapter details**
   - **Ch 2 review:** one pizza cut into 2 equal parts: halves. Cat lifts one half onto the other: they match.
     "Equal parts are the same size. The whole is everything we started with."
   - **Ch 3 cuts:** Robo's crooked cut is a half and two quarters (three parts, not equal). The scanner stacks
     the small piece on the big one: it does not cover it (`mark` incorrect). The fair cut: three cuts from the
     centre, like the letter Y, slices pulled out a little. Stacked, they match (`mark` correct). Then the
     flatbread (a long rectangle) gets two cuts at equal spacing: three equal strips. Rule on the board: "3
     equal parts = thirds. Each part is one third."
   - **Ch 4 counting:** Cat taps each slice: "one third, two thirds, three thirds". Bear takes one slice
     (it moves to his plate). The pizza shows two thirds left; caption "2 thirds left". Robo pushes the slice
     back: "three thirds, one whole pizza again". Repeat with the flatbread.
   - **Ch 5 shapes:** two identical flatbreads. One is cut into three tall strips, the other into three flat
     strips. Robo: "These ones look different, so they can't both be thirds." Cat cuts one tall strip into
     little squares and lays them over a flat strip: they cover it exactly. Same amount, different shape.
   - **Ch 6 more parts:** three identical pizzas on the table, cut into 2, 3 and 4 equal parts. One slice from
     each slides to the front and they are stacked: the half is biggest, then the third, then the fourth.
     "More equal parts, smaller parts." Pig gets his fourth.
   - **Ch 7 same size whole:** a tiny snack pizza (radius 0.25) and a giant party pizza (radius 0.8). Robo takes
     a half of the tiny one; Cat takes a third of the giant one. Robo: "A half is bigger than a third, so I
     win!" Stacked: Cat's third is much bigger. Cat: "A half is bigger than a third only when the wholes are
     the same size."
   - **Ch 9 challenge (all checked):** (a) a circle in 3 equal slices: thirds ✓. (b) a rectangle in 3 parts, one
     wider than the others: not thirds ✗. (c) a square in 4 equal parts, 1 shaded: "Is this one third?" No, it
     is one fourth; there are 4 equal parts ✗ (the "1 shaded, 3 not" trap). (d) a rectangle in 3 equal strips,
     2 shaded: two thirds ✓.

8. **Animation and staging list**

   | Moment | Objects | Actions | Camera |
   |---|---|---|---|
   | Party opens | robo, cat, bear, `table`, `pizza` prop, letters "Pizza Party!" on the chalkboard | `show`, `clip` robo Wave, `look` bear at pizza | `shot` wide on table and cast, slow push-in |
   | Two pieces | `fraction_circle` pz (parts 2) swaps in for the pizza prop | `move` pz#s1 and #s2 apart, `feel` bear worried | `shot` close, top-down |
   | Crooked cut | one `half_circle` + two `quarter_circle` pieces in cheese yellow | `pop`, Cat `move`s a quarter onto the half, `mark` incorrect | Close top-down |
   | Fair thirds | `fraction_circle` pz3 (parts 3) | `build` slices, `move` each slice out 0.12 m, stack two, `mark` correct, `sound` crystal_chime | Close top-down, then `shot` medium on Cat |
   | Flatbread thirds | `fraction_bar` fb3 (parts 3) on the table | `build`, `callout` "one third" on #1 | `shot` close, height 60 |
   | Counting thirds | pz3, bear, plate | `highlight` each slice in turn with `caption` count, `move` slice to Bear's plate, `nod` bear | Top-down, then medium on Bear |
   | Whole again | pz3 | `move` slice back, `sound` ding, `caption` label "3 thirds = 1 whole" | Close |
   | Two shapes of thirds | fb_tall (3 tall strips), fb_flat (3 flat strips), small square pieces | `move` squares over a flat strip, `mark` correct | Top-down, both bars in frame |
   | Halves, thirds, fourths | pz2, pz3, pz4 (`fraction_circle` parts 2, 3, 4), pig | `move` one slice of each forward, stack them, `hop` pig, `callout` "half", "third", "fourth" | `shot` wide on three pizzas, then close on the stack |
   | Same size whole | tiny pizza (radius 0.25), giant pizza (radius 0.8) | `shade` half of tiny, a third of giant, `move` both pieces together, `mark` incorrect on Robo's claim, `feel` robo surprised | `shot` medium on both pizzas, then close |
   | Chant | pz3 | slices `move` out and back on the beat | `orbit` 40° round the table, slow |
   | Fair or not | four cards (`plate` with fraction_bar/circle on each) | `sound` windup_click, `mark` each | `shot` medium on all four cards |
   | Goodbye | `pizza` prop, confetti | `burst` confetti, `clip` robo Dance | Wide |

9. **Experiment or hands-on activity**
   - **Paper pizza:** cut a paper circle (a grown-up helps with scissors). Fold it so it makes three equal
     slices is hard, so draw a Y from the centre with a grown-up's help, cut, then stack the slices to check they
     match. Colour one third, then two thirds.
   - **Paper strip thirds:** fold a paper strip into three like a letter (roll it into an S and line up the
     edges). Open it: three equal parts. Fold a second strip the other way and compare shapes.
   - **Snack time (with a grown-up):** share a quesadilla or a slice of toast into thirds. A grown-up does the
     cutting. Ask: "Are the parts the same size? How do you know?"
   - **Prediction:** "If we cut the same pizza into 4 instead of 3, will each slice be bigger or smaller?"

10. **Interaction moments**
    - Pause and guess (2–3 s, `windup_click`): "Is this fair?" after the crooked cut; "How much is left?" after
      Bear eats; "Bigger or smaller?" before the fourths.
    - Call and response: Robo: "Three the same?" Kids: "Thirds!" Robo: "Put them back?" Kids: "Whole!"
    - Move-along: kids draw a big Y in the air with one finger to cut their own pizza into thirds.

11. **Song or chant**
    Original call-and-response chant at a steady clap. Hook line idea: "Three the same? That's thirds! All three
    back? That's whole!" A second line adds "More parts, smaller parts". It starts in chapter 4 (first line
    only), plays in full in chapter 8 and returns softly under the goodbye.

12. **Fun fact(s)**
    - The word "fraction" comes from a Latin word that means "to break" (chapter 3).
    - Some pizza shops cut round pizzas into little squares instead of triangle slices, called a "tavern cut"
      or "party cut" (chapter 5, to show that pieces can have different shapes).

13. **Vocabulary and captions**
    Labels: whole, equal parts, fair share, half, third, thirds, fourth, one third, two thirds, three thirds.
    `count` captions while tapping slices ("1 third", "2 thirds", "3 thirds"). `subtitle` for the rules "3 equal
    parts = thirds" and "More parts, smaller parts". Words only, no fraction notation (1/3 belongs to G3-02).

14. **Quiz and recap**
    1. How many thirds make one whole pizza? (3)
    2. Bear ate one third of the pizza. How much is left? (two thirds)
    3. Which is bigger: one half or one third of the same pizza? (one half)
    4. A sandwich is cut into 3 pieces, but one piece is bigger. Are they thirds? (No, thirds must be equal.)
    5. Is a third of a giant pizza the same size as a third of a tiny pizza? (No, the wholes are different sizes.)
    Recap: three equal parts are thirds; three thirds make one whole; more parts means smaller parts; compare
    only with same-size wholes. Praise: everyone holds up a fair slice; Cat: "Checked and fair."

15. **Sound and music**
    Music `happy`, gain 0.20, dipping to 0.12 under each cut and each scanner check. Voice 1.0. Effects:
    crystal_chime (equal slices match), boing (Robo's crooked cut), windup_click (guesses), ding (correct),
    pop (slices out), giggle (Bear's empty plate), crowd_cheer (goodbye).

16. **Thumbnail and YouTube**
    Designed thumbnails (`meta.thumbnails`), never a video frame:
    - **a "THIRDS!"** (yellow title, left side): a big top-down pizza in three slices pulled apart with a thin
      gap, one slice tilted up toward the camera; Cat on the right with a proud grin, Bear peeking over the
      table edge, delighted. Warm classroom chalkboard behind, soft focus.
    - **b "Fair Share?"** (white title with a red outline, top): two pizzas side by side, one cut fairly into
      thirds with a green tick, one cut crookedly with a soft red cross; Robo in the middle, surprised face,
      pointing at the crooked one.
    - **c "1 Pizza, 3 Friends"** (orange title): Robo, Cat and Bear round one pizza, each holding an equal
      slice, all smiling; bright playful background.
    Title idea: "Pizza Party Thirds! Equal Parts for Kids | Halves, Thirds and Fourths | Grade 2 Math | Toy Box
    Friends". Tags: thirds for kids, fractions for kids, equal parts, halves thirds fourths, fair share, grade 2
    math, 2nd grade math, fraction pizza, partition shapes, math cartoon, Toy Box Friends.

17. **Catalog gaps**
    - Unequal parts: `fraction_circle` and `fraction_bar` only make equal parts. Stand-in: a `half_circle` and
      two `quarter_circle` shapes for the crooked pizza; three `plate` pieces 0.5, 0.25 and 0.25 wide for the
      unequal rectangle. A `sizes` list on `fraction_bar` would make this cleaner.
    - Pizza look on a `fraction_circle`: no crust or topping dots. Stand-in: cheese-yellow `color`, a thin red
      `torus` ring round it as the crust, a few small red `disc`s parented to each slice as pepperoni.
    - Two-way cut of one bar (flat strips): stand-in: a `fraction_bar` with `rotation` 90° about y, so the
      cuts run the other way.

18. **Do and don't**
    - Do say "equal parts" every time; thirds are three equal parts, not just three parts.
    - Do keep the wholes the same size whenever two fractions are compared, and say so out loud.
    - Don't count shaded and unshaded pieces as "1 out of 3" when there are 4 parts; count all the equal
      parts.
    - Don't write fraction numbers like 1/3; words only in grade 2 (the number line and notation are G3-02).
    - Don't re-teach halves and quarters at length (G1-07); the review is under 45 s.
    - The grown-up does all real cutting; show it on screen in the activity chapter.

---

### G2-12 · Quarters to a Dollar
**Grade 2 · Math / money · 7:45 · town** — add the quarter to penny, nickel and dime, count coins starting with the biggest, and make one dollar.
**Skills:** coins_quarters_2 · **Standard:** CCSS 2.MD.C.8

1. **Big idea**
   "A quarter is worth 25 cents, four quarters make one dollar, and we count coins starting with the one worth
   the most."

2. **Learning goals**
   - I can name a quarter and say it is worth 25¢, and I remember the penny (1¢), nickel (5¢) and dime (10¢).
   - I can count quarters by 25s: 25, 50, 75, 100.
   - I can count a mix of coins by starting with the coin worth the most.
   - I can show one dollar (100¢) in more than one way.

3. **Hook (first 15 s)**
   The town fair. A toy train waits by a sign: "Big Loop Ride: $1". Robo tips out his jar: 13 coins clink onto
   the counter. Robo: "13 coins is 13 cents. Not enough!" He sighs (`feel` sad). Cat squints at the pile: "Coins
   are not all worth one cent. Let's count it properly."

4. **What makes it unique**
   The Dollar Grid: a 10 × 10 grid of 100 squares is one dollar. A quarter "covers" 25 squares, and four
   quarters fill the grid exactly, so kids see why it is called a quarter: it is one fourth of a dollar (a
   callback to G1-07 quarters). The Coin Ladder, a number line from 0 to 100, lets a quarter take a big leap of
   25. It is the only episode with the "biggest coin first" sorting tray and with Robo's size mistake (the
   small dime is worth more than the big nickel).

5. **Cast and roles**
   - **Robo** (host, wants to ride the Big Loop): counts coins by how many there are, then by how big they
     look, both on purpose. Voice `soft`.
   - **Cat** (sidekick, coin checker): "but why is the little dime worth more?"; sorts coins biggest value
     first. Voice `squeaky`.
   - **Dog** (guest, train conductor at the ticket booth): announces prices, checks money at the
     `cash_register`, sets the challenge piles. Voice `deep`.
   - Lines use `say` with `who` (robo, cat, dog). Characters stand to the side of the counter; coins are
     always framed with nothing in front of them.

6. **Setting and look**
   `town` stage, `soft_day`. A ticket booth: `table` with the `cash_register`, a price sign (`plate` with
   letters). The `train_engine` and two `train_car`s on a short loop (`path`). Coins are the catalog `penny`,
   `nickel`, `dime` and `quarter` props laid flat with value labels (`letter` "1¢", "5¢", "10¢", "25¢") parented
   above them. The Coin Ladder is a `number_line` 0–100. The Dollar Grid is a `grid` 10 × 10 standing upright
   behind the counter (four 5 × 5 quadrants). Camera: top-down on the counter for counting, medium on the booth, wide on the train.
   Mood: sunny fair, bright and busy but tidy.

7. **Storyline**

   | # | Chapter | Time | What happens | Teaching move | Emotional beat |
   |---|---|---|---|---|---|
   | 1 | The Big Loop ride | 0:00–0:30 (30 s) | $1 ride; Robo's "13 coins = 13 cents" | Hook | Disappointed |
   | 2 | Meet the coins | 0:30–1:30 (60 s) | Penny, nickel, dime review; meet the quarter; size is not value | Teach | Curious |
   | 3 | Why "quarter"? | 1:30–2:20 (50 s) | The Dollar Grid: 100¢; a quarter covers 25; four quarters fill it | Explain why | Aha |
   | 4 | Counting by 25s | 2:20–3:10 (50 s) | Coin Ladder leaps 25, 50, 75, 100; Small Loop 50¢, Tunnel 75¢ | Show + try | Momentum |
   | 5 | Biggest coin first | 3:10–4:15 (65 s) | Messy count vs sorted count; Cat's 60¢ ticket; a 53¢ mix | Teach + try | Clever |
   | 6 | The Quarter chant | 4:15–4:40 (25 s) | Chant | Practise | Joy |
   | 7 | Robo's jar: make a dollar | 4:40–5:40 (60 s) | Sort and count Robo's 13 coins to 100¢ | Practise | Excited |
   | 8 | Challenge: Dog's ticket booth | 5:40–6:45 (65 s) | Which piles make $1? | Challenge | Sharp |
   | 9 | Quiz and recap | 6:45–7:30 (45 s) | Five questions, recap | Quiz | Proud |
   | 10 | All aboard | 7:30–7:45 (15 s) | The ride, goodbye | Praise | Celebration |

   Total: 465 s = 7:45.

   **Coin facts used (chapter 2)**: penny 1¢ (copper colour, smooth edge), nickel 5¢ (silver, smooth edge),
   dime 10¢ (silver, the smallest and thinnest, ridged edge), quarter 25¢ (silver, the biggest of the four,
   ridged edge). Size test: the nickel is bigger than the dime but worth less.

   **Worked counts (all checked)**

   | Moment | Coins | Count aloud | Total |
   |---|---|---|---|
   | Ch 4 Small Loop | 2 quarters | 25, 50 | 50¢ |
   | Ch 4 Tunnel Ride | 3 quarters | 25, 50, 75 | 75¢ |
   | Ch 4 Big Loop | 4 quarters | 25, 50, 75, 100 | 100¢ = $1 |
   | Ch 5 messy order | penny, quarter, nickel, dime | 1, 26, 31, 41 | 41¢ |
   | Ch 5 sorted | quarter, dime, nickel, penny | 25, 35, 40, 41 | 41¢ (same total, easier steps) |
   | Ch 5 Cat's ticket | 2 quarters, 1 dime | 25, 50, 60 | 60¢ |
   | Ch 5 mix | 1 quarter, 2 dimes, 1 nickel, 3 pennies | 25, 35, 45, 50, 51, 52, 53 | 53¢ |
   | Ch 7 Robo's jar (13 coins) | 2 quarters, 3 dimes, 3 nickels, 5 pennies | 25, 50, 60, 70, 80, 85, 90, 95, 96, 97, 98, 99, 100 | 100¢ = $1 |

   **Challenge piles (chapter 8)**: (a) 4 quarters: $1 ✓. (b) 3 quarters, 2 dimes, 1 nickel: 25, 50, 75, 85,
   95, 100 ✓. (c) 3 quarters and 2 dimes: 25, 50, 75, 85, 95 = 95¢, five cents short ✗ (Dog: "Which coin is
   missing?" a nickel). (d) 10 dimes: 10, 20 ... 100 ✓. Bonus line: 100 pennies also make a dollar, but that
   takes a long time to count.

8. **Animation and staging list**

   | Moment | Objects | Actions | Camera |
   |---|---|---|---|
   | Fair opens | train_engine, train_car ×2, sign "Big Loop Ride: $1" | train `path` round the loop, `sound` train_whistle | `shot` wide on train and booth |
   | Coins tip out | jar (stand-in `cup` in `glass`), 13 coins | `drop` coins, `sound` clink, `feel` robo sad | `shot` close top-down on counter |
   | Meet the coins | penny, nickel, dime, quarter with labels | `pop` each, `spin` to show the edge, `callout` "ridges" on dime and quarter | Close, `shot` height 70 |
   | Size is not value | nickel and dime side by side | `grow` both 1.5× for a close look, `mark` incorrect on Robo's "nickel wins" | Close |
   | Dollar Grid | four `grid` 5 × 5 quadrants butted together as one upright 10 × 10 grid, quarters | as each quarter flies onto a quadrant, `shade` that quadrant (all 25 squares) in its own colour, `caption` count 25, 50, 75, 100 | `shot` medium, grid fills the frame |
   | Coin Ladder | `number_line` 0–100, step 25, minor 5; quarter | `leap` quarter along [0, 25, 50, 75, 100], `sound` boing | Side, whole line in frame |
   | Sorting tray | four `plate` slots, labels 25¢, 10¢, 5¢, 1¢ | coins `move` into slots, `highlight` the quarter slot | Top-down |
   | Messy vs sorted | two rows of four coins | running total `letter` updates, `mark` correct on sorted row | Top-down, both rows |
   | Robo's jar | 13 coins | `move` into sorted rows, `highlight` each coin as counted, `caption` count | Top-down, slow push-in |
   | Ticket bought | cash_register, ticket (`plate` "TICKET") | `turn` cash_register#drawer open, `sound` cha_ching, `pop` ticket | Medium on booth |
   | Challenge piles | four piles on plates, labels a–d | `sound` windup_click, `mark` each pile | `shot` medium on all four piles |
   | All aboard | train, robo, cat, dog | robo and cat `move` into cars, train `path`, `burst` confetti | Wide, then `orbit` 30° as it passes |

9. **Experiment or hands-on activity**
   - **Coin sort and count:** a grown-up gives a handful of real or play coins. Sort them into four piles,
     biggest value first, then count: 25s, then 10s, then 5s, then 1s.
   - **Make a dollar three ways:** with play coins, make 100¢ with quarters only, with dimes only, and with a mix.
   - **Prediction:** "Will 3 quarters and 2 dimes be enough for a dollar?" (No, 95¢.)
   - **Safety:** coins are small: keep them away from babies and toddlers, never put them in your mouth, and
     wash your hands after counting real coins.

10. **Interaction moments**
    - Pause and guess (2–3 s, `windup_click`): "Which is worth more, the big nickel or the little dime?"; "What
      comes after 50 when we count quarters?"; "Is pile c a dollar?"
    - Call and response: Robo: "One quarter!" Kids: "Twenty-five!" Robo: "Four quarters!" Kids: "One dollar!"
    - Move-along: kids take a giant step for each quarter (25), a medium step for a dime and a tiny step for a
      penny.

11. **Song or chant**
    Original marching chant with a clap on each count. Hook line idea: "Twenty-five, fifty, seventy-five,
    one whole dollar, ride time, ride!" It plays in chapter 6, returns while Robo's jar adds up in chapter 7, and
    once more as the train leaves.

12. **Fun fact(s)**
    - The dime and the quarter have tiny ridges round their edge; the penny and nickel are smooth. You can tell
      them apart by touch (chapter 2).
    - The dime is the smallest and thinnest US coin, but it is worth more than a penny or a nickel (chapter 2).

13. **Vocabulary and captions**
    Labels: penny, nickel, dime, quarter, cent, cents, ¢, dollar, $1, value, total. `count` captions for every
    running total ("25¢", "50¢" ...). `subtitle` for "4 quarters = 100¢ = $1" and "Start with the coin worth the
    most". Write "75¢", not "$0.75" (decimals come later).

14. **Quiz and recap**
    1. How much is a quarter worth? (25¢)
    2. How much are 3 quarters? (75¢)
    3. How much are 1 quarter, 1 dime and 2 pennies? (25, 35, 36, 37: 37¢)
    4. How many quarters make one dollar? (4)
    5. Which coin do you count first, a dime or a quarter? (The quarter, because it is worth the most.)
    Recap: a quarter is 25¢; four quarters make $1 (100¢); sort first, start with the biggest value; size does
    not tell value. Praise: Dog punches a ticket for every viewer; Cat: "Counted, checked, all aboard."

15. **Sound and music**
    Music `bouncy`, gain 0.20, dipping to 0.12 during counting. Voice 1.0. Effects: clink (coins), boing
    (ladder leaps), cha_ching (register), train_whistle (ride), windup_click (guesses), ding (correct totals),
    crowd_cheer (ride).

16. **Thumbnail and YouTube**
    Designed thumbnails (`meta.thumbnails`):
    - **a "4 = $1"** (gold title, left): four big shiny quarters fanned out in an arc, each with "25¢", a green
      dollar bill behind them; Robo on the right, amazed (`feel` surprised); fair bunting behind.
    - **b "Quarters!"** (white title, top): the Dollar Grid with four coloured blocks of 25 squares and a quarter
      sitting on each block; Cat pointing, confident smile.
    - **c "Count to $1"** (yellow title): the toy train with Robo and Cat waving from the cars, a coin trail
      along the track; cheerful blue sky.
    Title idea: "Quarters to a Dollar! Counting Coins for Kids | Penny, Nickel, Dime, Quarter | Grade 2 Math |
    Toy Box Friends". Tags: counting coins, quarters for kids, money for kids, US coins, count to a dollar, grade
    2 math, 2nd grade money, penny nickel dime quarter, coin counting, Toy Box Friends.

17. **Catalog gaps**
    - Shading one corner block of a grid: `shade` fills cells in order (rows), so 25 cells would be 2½ rows.
      Stand-in: build the dollar grid from four 5 × 5 `grid` quadrants and shade each one whole. A `region`
      (rows and columns) option on `shade` would be the real fix.
    - Coin jar: stand-in: a `cup` in `glass` material (or the batch 3 `jar`).
    - Ride ticket: stand-in: a small cream `plate` with `letter` "TICKET".
    - Coin faces (heads and tails pictures): the coin props have no faces; the value labels are enough. Do not
      add real portraits.

18. **Do and don't**
    - Do say the value and the name together every time ("a quarter, twenty-five cents").
    - Do count from the biggest value down, and show that the messy order gives the same total but is harder.
    - Don't say bigger coins are worth more; the dime proves it wrong.
    - Don't use decimals ($0.75) or dollar notes other than the single $1 in the thumbnail and the hook sign.
    - Don't re-teach penny, nickel and dime trades at length (G1-06); the review is one minute.
    - Don't show coins near a mouth; keep the safety line in the activity chapter.

---

### G2-13 · First, Next, Then, Last
**Grade 2 · English / reading · 7:15 · forest** — retell a story in order with signal words, and use clues to explain why a character acts.
**Skills:** sequence_inference_2 · **Standard:** CCSS RL.2.1, RL.2.3, RL.2.5

1. **Big idea**
   "Stories happen in order, first, next, then, last, and clues in the story tell us why characters do what
   they do."

2. **Learning goals**
   - I can put four story events in order and retell them with first, next, then and last.
   - I can say what happens at the beginning, the middle and the end of a story.
   - I can explain why a character does something and point to the clue that tells me.
   - I can explain why order matters in real life, like making a sandwich.

3. **Hook (first 15 s)**
   Four picture cards fly off the story shelf and land in a jumbled row. Robo reads them in that order: "Turtle
   says thank you to Squirrel. Then Turtle's kite gets stuck. Then Turtle finds his kite." He stops, puzzled
   (`feel` worried). Cat: "Saying thank you before anyone helped? That can't be the right order."

4. **What makes it unique**
   The Story Stairs: four big steps labelled FIRST, NEXT, THEN, LAST. A picture card can only sit on a step
   once the card below it is in place, and Robo climbs as the story is retold, so "you can't skip to the top"
   becomes a physical idea. The Why Detective: Cat's magnifier zooms into a picture and a `callout` names the
   clue (blowing leaves, short legs, an apple shared). It is the only episode that acts out one original story
   in 3D and then asks "why".

5. **Cast and roles**
   - **Robo** (host and storyteller): reads cards in the wrong order, puts the top slice of a sandwich on first.
     Voice `soft`.
   - **Cat** (sidekick, the Why Detective with a magnifier): "but why did he do that?"; always names the clue.
     Voice `squeaky`.
   - **Turtle** (guest, the story's hero): flies a kite, gets stuck, asks for help, says thank you. Voice
     `deep` (slow and kind).
   - **Squirrel** (guest, no lines): the climber; chatters with the `giggle` sound and acts out the rescue.
   - Lines use `say` with `who` (robo, cat, turtle). Characters stand beside the Story Stairs, never in front
     of a card.

6. **Setting and look**
   `forest` stage, `soft_day`, with a gentle hill (a wide `dome` in grass green) and one tall `tree`. The story
   is acted out in the forest; the Story Stairs (four `box` steps, each with a `letter` label) stand to the
   left. Picture cards are `plate` cards showing a mini 3D moment (each card is a small group in front of a
   cream card). Camera: wide on the forest for the story, medium on the stairs, close-ups through Cat's
   magnifier for clues. Mood: breezy greens, warm and calm (no season talk: the blowing leaves are only a wind clue).

7. **Storyline**

   | # | Chapter | Time | What happens | Teaching move | Emotional beat |
   |---|---|---|---|---|---|
   | 1 | The jumbled story | 0:00–0:30 (30 s) | Cards land out of order; Robo reads nonsense | Hook | Funny, puzzled |
   | 2 | The Story Stairs | 0:30–1:20 (50 s) | First, next, then, last; beginning, middle, end | Teach | Curious |
   | 3 | Turtle's Windy Kite Day | 1:20–2:45 (85 s) | The story acted out in order | Show | Warm, a small worry, relief |
   | 4 | Put it in order | 2:45–3:30 (45 s) | Kids order the cards; Robo swaps two | Try | Confident |
   | 5 | The Why Detective | 3:30–4:40 (70 s) | Three why questions with clues; Turtle's feelings change | Explain why | Aha |
   | 6 | The Order chant | 4:40–5:05 (25 s) | Chant on the stairs | Practise | Joy |
   | 7 | Robo's sandwich mix-up | 5:05–5:50 (45 s) | Order matters in real life | Explain why | Silly |
   | 8 | Challenge: What comes next? | 5:50–6:40 (50 s) | Cupcakes, Dog's bath | Challenge | Sharp |
   | 9 | Quiz and recap | 6:40–7:15 (35 s) | Five questions, recap, goodbye | Quiz | Proud |

   Total: 435 s = 7:15.

   **The story (original): "Turtle's Windy Kite Day"**

   | Step | Event | Clue shown on screen | Turtle's feeling |
   |---|---|---|---|
   | First | Turtle sees leaves blowing past his window and takes out his kite. | Leaves (`weather` leaves) blow sideways | Excited |
   | Next | Turtle walks slowly up the hill and flies his kite high. | The kite string pulls tight | Happy |
   | Then | A big gust pushes the kite into a tall tree. It is stuck. Turtle looks up; his legs are short and his shell is heavy. | Turtle tries to reach and can't | Worried |
   | Last | Turtle asks Squirrel for help. Squirrel climbs up and wiggles the kite free. Turtle shares his apple slices with Squirrel. | Squirrel races up the trunk; the apple is shared | Thankful, happy |

   **Why questions (chapter 5)**
   1. Why did Turtle fly his kite today? (It was windy; the clue is the blowing leaves. Kites need wind.)
   2. Why did Turtle ask Squirrel for help? (Squirrel is a good climber; Turtle can't climb trees.)
   3. Why did Turtle share his apple? (To say thank you; he felt thankful.)
   Feelings line: excited at the beginning, worried in the middle, thankful at the end (RL.2.3: how a character
   responds to what happens).

   **Real life (chapter 7)**: making a sandwich. 1. Wash your hands. 2. Take two slices of bread. 3. Put the
   filling on one slice. 4. Put the other slice on top. Robo puts the top slice down first and then piles the
   filling on top of it: it slides off (`boing`). Cat: "Each step needs the one before it."

   **Challenge (chapter 8)**
   - Cupcakes (show 3 steps, kids pick the last): mix the batter; pour it into cups; a grown-up bakes them;
     what's last? (Add the frosting, once they are cool.)
   - Dog's bath (cards jumbled, kids order): get Dog wet; rub in the soap; rinse off the bubbles; dry with a
     towel. Robo suggests "dry first": Cat asks why that would not work.
   - Why question: "Why did Dog shake?" (He was wet; the clue is the water drops.)

8. **Animation and staging list**

   | Moment | Objects | Actions | Camera |
   |---|---|---|---|
   | Cards fly | four cards (`plate` with mini scenes), story shelf (`box`) | `move` cards off the shelf, `drop` them in a row, `sound` whoosh | `shot` medium on the row |
   | Jumbled read | robo, cards | `look` robo at each card, `highlight` the card being read, `feel` robo worried | Medium |
   | Story Stairs | four `box` steps with `letter` FIRST, NEXT, THEN, LAST; labels BEGINNING, MIDDLE, END below | `build` steps bottom to top, `callout` "beginning" on step 1, "middle" on 2–3, "end" on 4 | `shot` wide, then medium |
   | Story: first | turtle, window (`plate` frame), `weather` leaves, `kite` | leaves blow, `look` turtle at window, `feel` turtle happy, `move` kite into his hands | Wide forest, push-in |
   | Story: next | turtle, hill (`dome`), kite | turtle walks up the hill (`path`), kite rises (`path`), string (thin `cylinder`) | Wide, low angle up the hill |
   | Story: then | kite, `tree` | `move` kite into the tree, `wiggle` it, `feel` turtle worried, turtle `hop` (tries to reach) | `shot` medium on tree and turtle |
   | Story: last | squirrel, kite, `apple` slices (`wedge`s) | squirrel climbs (`path` up the trunk), kite floats down, slices `move` from turtle to squirrel, `feel` both happy | Medium, then close on the shared apple |
   | Put it in order | cards, stairs | cards `move` onto steps one by one, `mark` correct; Robo swaps two, `mark` incorrect, fix | `shot` medium on stairs |
   | Why Detective | `magnifier`, clue spots in a card | `move` magnifier over the clue, `grow` the card 1.4×, `callout` "leaves blowing", `highlight` | Close through the lens |
   | Chant | robo on the stairs | robo `move`s up one step per line, `clip` Jump at the top | `orbit` 30° round the stairs |
   | Sandwich | bread slices (`plate`s), filling (`sandwich` prop parts or `plate`s) | wrong order: filling `move` off with boing; right order: stack | `shot` close, height 50 |
   | Challenge | `cupcake` cards, Dog cards, `bathtub` | `sound` windup_click, cards `move` onto the stairs, `mark` | Medium |
   | Goodbye | everyone at the stairs | `clip` robo Wave, `burst` stars | Wide |

9. **Experiment or hands-on activity**
   - **Story fingers:** retell a favourite story using four fingers: first (thumb), next, then, last. Then say
     one "why" with "because" and the clue.
   - **Four-box comic:** fold a paper in four and draw something you did today in order. Ask a grown-up to read
     it back and guess why you did one thing.
   - **Prediction:** before chapter 3's "then" step, ask "What do you think happens next?"
   - **Safety:** kites only in open spaces away from trees and power lines, with a grown-up (said on screen in
     the story chapter as a quick tip). Cooking steps in the challenge are done with a grown-up; Robo never
     touches the oven.

10. **Interaction moments**
    - Pause and guess (2–3 s, `windup_click`): "What happens next?" before each story step; "Which card goes
      first?"; "Why did Turtle ask Squirrel?"
    - Call and response: Robo: "First!" Kids: "Next!" Robo: "Then!" Kids: "Last!"
    - Move-along: kids climb four invisible stairs with their hands as the story is retold.

11. **Song or chant**
    Original stepping chant with one beat per stair. Hook line idea: "First step, next step, then the top, last
    is where the story stops!" It plays in chapter 6 and quietly under the retell at the end of chapter 4.

12. **Fun fact(s)**
    - Squirrels can climb down a tree head first because they can turn their back feet around (chapter 3).
    - Kites need wind to fly: moving air pushes up on the kite (chapter 5, the first clue).

13. **Vocabulary and captions**
    Labels: first, next, then, last, beginning, middle, end, order, clue, why, because. `subtitle` for each
    story sentence as it is read (simple, up to 14 words). `title` style for the story title card.

14. **Quiz and recap**
    1. What happened first in Turtle's story? (He saw the wind and took out his kite.)
    2. What happened right after the kite got stuck? (Turtle asked Squirrel for help; Squirrel climbed up.)
    3. Why did Turtle ask Squirrel for help? (Squirrel can climb; Turtle can't.)
    4. How did Turtle feel in the middle? (Worried.)
    5. Which word comes after "next": first, then or last? (Then.)
    Recap: stories go first, next, then, last; beginning, middle, end; clues tell us why. Praise: Turtle and
    Squirrel fly the kite together; Cat: "Clue found, case closed."

15. **Sound and music**
    Music `calm`, gain 0.18 for the story; `playful` 0.22 for the stairs and the challenge. Voice 1.0, Turtle a
    little slower (0.95 on his lines if per-line speed exists). Effects: whoosh (cards, gust), giggle (Squirrel),
    boing (sandwich slip), windup_click (guesses), ding (right order), step (stair climb), crowd_cheer (end).

16. **Thumbnail and YouTube**
    Designed thumbnails (`meta.thumbnails`):
    - **a "What's Next?"** (yellow title, top left): the four Story Stairs with picture cards, the top step
      empty with a big "?" card hovering; Robo halfway up, curious face; forest behind.
    - **b "First, Next, Last"** (white title with teal outline): Turtle looking up at his kite stuck in the tree,
      a little worried; Squirrel mid-climb with a grin; soft green forest.
    - **c "Story Order"** (orange title): Cat holding the magnifier up to the camera, one big clue (blowing
      leaves) magnified in the lens, a sly smile.
    Title idea: "First, Next, Then, Last! Story Order for Kids | Sequencing and Why Questions | Grade 2 Reading
    | Toy Box Friends". Tags: sequencing for kids, story order, first next then last, beginning middle end,
    retelling, reading comprehension, grade 2 reading, 2nd grade ELA, inference for kids, Toy Box Friends.

17. **Catalog gaps**
    - Picture cards with mini scenes: no "card" kind. Stand-in: a cream `plate` with a small `group` of shrunken
      objects in front of it; the batch 3 `callout` labels each step.
    - Kite string: stand-in: a thin `cylinder` between Turtle and the kite, re-placed per beat (a `pointer` with
      `bend` 0.2 and no head would be better: a real gap, "a line between two moving objects").
    - Apple slices: stand-in: three small `wedge` shapes in red and cream.
    - Story shelf: stand-in: a `box` on legs.

18. **Do and don't**
    - Do show each event on screen before naming it; the picture does the telling.
    - Do always say the clue when answering "why" ("I know because ...").
    - Don't turn this into a cause-and-effect chain lesson with signal words (that is G4-05); keep "why" to
      one clue at a time.
    - Don't re-teach who and where (G1-15 story details); feelings appear only as clues to why.
    - The stuck kite is a small problem, not danger: no falling, no crying, no high-peril music.
    - Avoid the Lost Mitten passage in the catalog (it is for the worksheet); the episode story is original.

---

### G2-14 · Needs and Wants Market
**Grade 2 · Social studies / economics · 7:30 · town** — sort needs from wants, goods from services, and choose needs first when you can't have everything.
**Skills:** needs_wants_2 · **Standard:** C3 Framework D2.Eco.1.K-2, D2.Eco.2.K-2, D2.Eco.3.K-2 (approximate)

1. **Big idea**
   "Needs are what we must have to live and stay healthy, wants are nice extras, and when we can't have
   everything we choose needs first."

2. **Learning goals**
   - I can name four needs: food, water, shelter and clothing that keeps us safe in the weather.
   - I can sort things into needs and wants, and I know a want is fine to have, just not a must.
   - I can tell goods (things you can hold) from services (work someone does for you).
   - I can explain a choice: with only 5 tokens, I buy needs first and give up some wants.

3. **Hook (first 15 s)**
   Saturday market. Robo and Cat are getting ready for a sleep-out in a tent in the back garden tonight. Robo
   waves his shopping list: "Balloon, kite, cupcake, a toy robot, more balloons!" Cat reads it and tilts her
   head: "Robo, what will we drink? What will keep us warm tonight?" Robo freezes (`feel` surprised): "Oh. I
   only wrote down fun things."

4. **What makes it unique**
   Two hands-on tests kids can use anywhere. The "Can we live without it?" test sorts needs from wants on a
   big Needs Scale (a balance with NEED and WANT pans). The Basket Test sorts goods from services: if you can
   put it in the basket, it's a good; a bus ride or a fixed wheel can't go in a basket, so it's a service. The
   Five-Token Choice is the series' first look at scarcity: there is not enough for everything, so you choose.

5. **Cast and roles**
   - **Robo** (host, shopper): picks only wants at first, puts a "bus ride" in the basket; learns to choose.
     Voice `soft`.
   - **Cat** (sidekick, list checker): "but can we live without it?"; runs the Needs Scale. Voice `squeaky`.
   - **Bear** (guest, market stall keeper): sells goods for tokens and also does a service (oils Robo's squeaky
     wheel). Voice `deep`.
   - Lines use `say` with `who` (robo, cat, bear). The cast stands beside the stall, never in front of the
     scale or the basket.

6. **Setting and look**
   `town` stage, `soft_day`. One `market_stall` (batch 3 model) with a price board (prices in tokens). On the
   counter: `water_jug`, `sandwich`, `apple`, `banana`, `socks`, `mittens`, `balloon`, `kite`, `cupcake`, `ball`.
   A small tent in the back garden corner (stand-in: the `den` prop). The Needs Scale is the `balance_scale`
   prop with NEED and WANT signs. A `basket` for the Basket Test. Tokens are yellow `disc`s with a star.
   Camera: wide establishing shot of the market, medium on the stall, close on the scale pans and the basket.
   Mood: sunny, friendly, tidy (one stall, not a crowded market).

7. **Storyline**

   | # | Chapter | Time | What happens | Teaching move | Emotional beat |
   |---|---|---|---|---|---|
   | 1 | Robo's shopping list | 0:00–0:30 (30 s) | A sleep-out list of only fun things | Hook | Funny |
   | 2 | Needs: what we must have | 0:30–1:30 (60 s) | Food, water, shelter, clothing; the "live without it?" test | Teach | Thoughtful |
   | 3 | Wants: nice extras | 1:30–2:20 (50 s) | Wants are fine; food is a need, a cupcake is a want | Teach + explain why | Reassured |
   | 4 | The Needs Scale | 2:20–3:20 (60 s) | Sort eight things; fix Robo's two mistakes | Try | Busy, clever |
   | 5 | Goods and services | 3:20–4:20 (60 s) | The Basket Test; Bear oils Robo's wheel | Teach | Aha |
   | 6 | The Market chant | 4:20–4:45 (25 s) | Chant | Practise | Joy |
   | 7 | The Five-Token Choice | 4:45–5:50 (65 s) | Not enough for everything; needs first, one want | Practise + explain why | Hard choice, then proud |
   | 8 | Challenge: Need, Want, Good or Service? | 5:50–6:50 (60 s) | Quick-fire sorting | Challenge | Sharp |
   | 9 | Quiz and recap | 6:50–7:20 (30 s) | Five questions, recap | Quiz | Proud |
   | 10 | Sleep-out night | 7:20–7:30 (10 s) | The tent, water, warm socks, one balloon | Praise | Cosy |

   Total: 450 s = 7:30.

   **Sorting set (chapters 2–4)**

   | Thing | Need or want | Why (the "live without it?" test) |
   |---|---|---|
   | Water jug | Need | Our bodies need water every day |
   | Sandwich, apple, banana | Need (food) | Food gives us energy to live and grow |
   | Tent (shelter for tonight) | Need (shelter) | Shelter keeps us safe and dry |
   | Warm socks and mittens for a cool night | Need (clothing) | Clothes keep us warm in the weather |
   | Balloon, kite, ball | Want | Fun, but we can live without them |
   | Cupcake | Want | A treat; food is a need, but this treat is extra |

   Robo's mistakes (chapter 4): he puts the kite on NEED ("I need it, I really, really want it!") and the
   mittens on WANT. Cat uses the test on each: "Could you live and stay healthy without a kite? Yes. So it's a
   want." Mittens on a cold night keep us warm: need.

   **Goods and services (chapter 5)**: goods are things you can hold, buy and take home (socks, an apple, a
   ball). Services are jobs someone does for you (oiling a squeaky wheel, a bus ride, a doctor's check-up, a
   haircut). Basket Test: Robo tries to put "a bus ride" into the basket; the sign goes in, but the basket
   stays empty: you can't hold a ride. Bear oils Robo's squeaky wheel: Robo pays a token for the work, not for
   a thing.

   **Five-Token Choice (chapter 7, all checked)**: prices are water 1, sandwich 2, socks 1, cupcake 1, balloon
   1, kite 3. Robo has 5 tokens. Needs first: water 1 + sandwich 2 + socks 1 = 4 tokens. 5 − 4 = 1 token left:
   one want, the balloon or the cupcake, not both. The kite (3) costs too much today. Cat: "Choosing means
   giving something up. That's okay, we can save for the kite."

   **Challenge (chapter 8)**: (1) a warm coat on a snowy day: need, good; (2) a video game: want, good; (3) a
   check-up at the doctor: a service, and staying healthy is a need; (4) a skateboard: want, good; (5) a bus
   ride to school: service.

8. **Animation and staging list**

   | Moment | Objects | Actions | Camera |
   |---|---|---|---|
   | Market opens | market_stall, bear, robo, cat, list (`plate` with `letter` lines) | `clip` robo Walking in, `pop` list items one by one | `shot` wide market, then medium on Robo |
   | Cat reads list | list, cat | `look` cat at list, `feel` robo surprised | Medium two-shot |
   | Four needs | water_jug, sandwich, den, socks; letters FOOD, WATER, SHELTER, CLOTHING | `pop` each with a `callout`, `highlight` each | `shot` close per item, then medium on all four |
   | Live without it? | balloon vs water_jug | `move` each toward a `?` card, `mark` (need for water), `nod` cat | Close |
   | Wants | balloon, kite, ball, cupcake | `pop`, `wiggle` balloon, `feel` robo happy | Medium |
   | Needs Scale | balance_scale with NEED / WANT signs | items `move` onto pans, pan tilts (`turn` the scale's beam), Robo's kite on NEED gets `mark` incorrect, moves across | `shot` close on the pans, height 25 |
   | Basket Test | basket, apple, socks, sign "BUS RIDE" | goods `drop` into basket with `sound` land; the bus sign hovers, `mark` incorrect, `callout` "service" | `shot` close top-down into the basket |
   | Bear's service | bear, robo, oil can (stand-in `cylinder` + `cone`) | `move` can to Robo's wheel, `sound` squeak then stop, token `move`s to Bear | Medium |
   | Five tokens | five token `disc`s, price tags | tokens `move` to each need one by one, running count `letter` 4 → 1 left, `highlight` the balloon and cupcake | `shot` medium on the counter, then close on the last token |
   | Challenge | five picture cards (`plate`s) | `sound` windup_click, `mark` each, `callout` labels | Medium |
   | Sleep-out | den, `moon`, `stars`, robo, cat | `lights` to `evening`, `stars` show, `feel` both happy | Wide, slow push-in |

9. **Experiment or hands-on activity**
   - **Flyer sort:** with a grown-up, cut pictures from a shop flyer and glue them in two columns: NEED and WANT.
     Ask "Can we live without it?" for each one.
   - **Basket Test at home:** walk round the house and name one good (something you can hold) and one service
     (someone's work, like a mail carrier or a school bus).
   - **Five-token game:** give yourself 5 counters and price five things; buy needs first and see what is left.
   - **Prediction:** "Will 5 tokens be enough for everything on Robo's list?"
   - **Safety:** scissors with a grown-up.

10. **Interaction moments**
    - Pause and guess (2–3 s, `windup_click`): "Need or want?" for each scale item; "Can a bus ride go in the
      basket?"; "How many tokens are left?"
    - Call and response: Robo: "Can we live without it?" Kids: "Yes? It's a want!" / "No? It's a need!"
    - Move-along: kids hug themselves for a need ("keep it close") and wave a hand for a want ("nice extra").

11. **Song or chant**
    Original market-call chant with a clap and a stomp. Hook line idea: "Need it to live? Put it first! Want it
    for fun? Wait your turn!" It plays in chapter 6 and returns as Robo spends his tokens in chapter 7.

12. **Fun fact(s)**
    - People can go weeks without food but only a few days without water, so water is one of our most important
      needs (chapter 2). Say "only a few days", no numbers about harm.
    - The word "economy" comes from a Greek word for running a home (chapter 7, choosing what to buy).

13. **Vocabulary and captions**
    Labels: need, want, food, water, shelter, clothing, goods, services, choice, token. `count` captions for
    the tokens ("5", "4" ... "1 left"). `subtitle` for the two tests: "Can we live without it?" and "Can it go
    in the basket?".

14. **Quiz and recap**
    1. Name two needs. (Any two: food, water, shelter, clothing.)
    2. Is a balloon a need or a want? (A want.)
    3. Is a haircut a good or a service? (A service: it's work someone does for you.)
    4. Robo has 3 tokens: water costs 1, a sandwich 2, a kite 3. What should he buy? (Water and a sandwich.)
    5. Is it bad to have wants? (No; wants are fine, we just choose needs first.)
    Recap: needs keep us alive and healthy, wants are extras, goods are things, services are work, and choosing
    means giving something up. Praise: Bear gives everyone a sticker; Cat: "Smart shopping."

15. **Sound and music**
    Music `playful`, gain 0.20, `calm` 0.16 for the sleep-out. Voice 1.0. Effects: cha_ching (token paid), land
    (basket drops), squeak (Robo's wheel), windup_click (guesses), ding (right sorts), boing (Robo's wrong
    sorts), crowd_cheer (end, soft).

16. **Thumbnail and YouTube**
    Designed thumbnails (`meta.thumbnails`):
    - **a "Need or Want?"** (yellow title, top): the balance scale with a water jug on the NEED pan and a
      balloon on the WANT pan; Robo on one side scratching his head, Cat on the other with a knowing smile.
    - **b "Smart Shopping"** (white title, green outline): the market stall from the front, Robo holding five
      shiny tokens, Bear behind the counter grinning; bright blue sky.
    - **c "Goods or Services?"** (orange title): the basket with an apple and socks inside, a "bus ride" sign
      floating above it with a soft red cross; Cat pointing.
    Title idea: "Needs and Wants for Kids! Goods and Services at the Market | Grade 2 Social Studies | Toy Box
    Friends". Tags: needs and wants, goods and services, economics for kids, grade 2 social studies, 2nd grade
    social studies, making choices, scarcity for kids, shopping for kids, money choices, Toy Box Friends.

17. **Catalog gaps**
    - Tent: stand-in: the `den` prop, or a teal `pyramid` with a dark `triangle` door.
    - Tokens: stand-in: yellow `disc`s with a small `star` on top.
    - Oil can: stand-in: a small `cylinder` with a thin `cone` spout.
    - Scale pans that tilt with what is on them: `balance_scale` needs its beam turned by hand each time; fine
      for this episode.

18. **Do and don't**
    - Do say wants are okay; don't make a want sound naughty or greedy.
    - Do use tokens, not coins: coin counting belongs to G2-12, and this episode is about choosing.
    - Don't turn services into a community helpers lesson (reserved, community_helpers_k); three or four quick
      examples only.
    - Be careful with "clothing": a need is clothing that keeps us safe and warm; a fancy costume is a want.
    - Don't show anyone without food or a home; keep it light and positive.
    - Keep the sleep-out in the back garden with a grown-up nearby (said once).

---

### G2-15 · Number Pattern Machine
**Grade 2 · Math / patterns · 7:30 · lab** — find the rule in a growing or shrinking number pattern, check it every step, continue it and fix it.
**Skills:** number_sequences_2 · **Standard:** CCSS 2.NBT.B.8, 2.OA.C.3, 2.NBT.A.2 (approximate; rule patterns lead into 3.OA.D.9)

1. **Big idea**
   "A number pattern follows a rule, like add 3 or take away 2, and the same rule happens at every single
   step."

2. **Learning goals**
   - I can find the rule of a pattern by checking the jump from each number to the next.
   - I can continue a pattern and find a missing number.
   - I can tell when a list is not a pattern with one rule (the jumps are not all the same).
   - I can make my own pattern from a start number and a rule.

3. **Hook (first 15 s)**
   A shiny Pattern Machine (batch 3 `pattern_machine`) hums in the lab. Ping, ping, ping: number balls roll out:
   2, 5, 8, 11. Then the machine clunks and stops. A light blinks, and the machine says in a robot voice:
   "Next number please." Robo: "Twelve?" Buzz. Cat: "Let's find the machine's rule first."

4. **What makes it unique**
   The machine is a character with its own `robot` voice that only accepts the right next number. Every
   pattern is shown twice: as balls on a shelf with pointer arrows labelled "+3" between them, and as equal
   leaps on a number line, so kids see "same rule" as "same jump". Robo's glitch (he changes the rule halfway)
   and the Broken Machine round (one wrong ball to find) make checking every step the hero skill.

5. **Cast and roles**
   - **Robo** (host, lab technician): guesses before checking, changes the rule halfway. Voice `soft`.
   - **Cat** (sidekick, rule checker): "but why that number?"; checks every jump with a pointer. Voice
     `squeaky`.
   - **Pattern Machine** (a prop character): speaks short lines in the `robot` voice ("Rule accepted",
     "Try again"); its light pulses while it talks.
   - **Mouse** (guest, no lines, tiny lab assistant): loads the start number and rule cards into the machine,
     squeaks (`squeak`) when it works.
   - Lines use `say` with `who` (robo, cat, machine). The machine sits at the back left, the shelf of balls is
     in the centre, characters at the sides.

6. **Setting and look**
   `lab` stage (white and teal, benches), `studio_bright`. The Pattern Machine on a bench with a slot for rule
   cards and a chute. Number balls are `sphere`s with `number_block`-style digits (letters parented) in teal.
   A long `number_line` (0–40, step 5, minor 5) runs along the front bench; a bouncing `ball` does the leaps.
   Rule cards are `plate`s with "+3", "−2". Camera: medium on the machine, straight-on demonstration shot of the
   shelf and line, close on each jump. Mood: clean, bright, a little sci-fi.

7. **Storyline**

   | # | Chapter | Time | What happens | Teaching move | Emotional beat |
   |---|---|---|---|---|---|
   | 1 | The jammed machine | 0:00–0:30 (30 s) | 2, 5, 8, 11 ... jam; Robo's wrong guess | Hook | Curious |
   | 2 | Find the jump | 0:30–1:40 (70 s) | +3 each step on balls and on the number line; 14, 17 | Teach | Aha |
   | 3 | Same rule every step | 1:40–2:30 (50 s) | Robo's glitch: 3, 6, 9, 13 | Explain why | Funny, careful |
   | 4 | Going down | 2:30–3:20 (50 s) | 20, 18, 16, 14; 100, 95, 90, 85 | Show + try | Momentum |
   | 5 | Missing numbers | 3:20–4:10 (50 s) | 4, 8, __, 16, 20; 7, 17, 27, 37 | Try | Confident |
   | 6 | The Pattern chant | 4:10–4:35 (25 s) | Chant | Practise | Joy |
   | 7 | Pattern spotlight: odd and even | 4:35–5:15 (40 s) | Add 2 from 1 or from 2 | Explain why | Wow |
   | 8 | Make your own | 5:15–5:45 (30 s) | Mouse loads a start and a rule | Practise | Playful |
   | 9 | Challenge: Fix the machine | 5:45–6:50 (65 s) | Three puzzles, one broken pattern | Challenge | Sharp |
   | 10 | Quiz and recap | 6:50–7:30 (40 s) | Five questions, recap | Quiz | Proud |

   Total: 450 s = 7:30.

   **Patterns used (all checked)**

   | Chapter | Pattern | Jumps | Rule | Next |
   |---|---|---|---|---|
   | 1–2 | 2, 5, 8, 11 | +3, +3, +3 | add 3 | 14, 17 |
   | 3 (glitch) | 3, 6, 9, 13 | +3, +3, +4 | not one rule | 12 is right |
   | 4 | 20, 18, 16, 14 | −2 each | take away 2 | 12, 10 |
   | 4 | 100, 95, 90, 85 | −5 each | take away 5 | 80 |
   | 5 | 4, 8, __, 16, 20 | +4 | add 4 | missing 12 |
   | 5 | 7, 17, 27, 37 | +10 | add 10: the tens digit grows by 1, the ones digit stays 7 | 47 |
   | 7 | 1, 3, 5, 7, 9 | +2 | add 2 from an odd start: all odd | 11 |
   | 7 | 2, 4, 6, 8, 10 | +2 | add 2 from an even start: all even | 12 |
   | 8 | start 6, rule +5 | +5 | 6, 11, 16, 21 (ones digit takes turns: 6, 1, 6, 1) | 26 |

   **Challenge (chapter 9)**: (a) 30, 27, 24, 21, ? → take away 3 → 18. (b) 12, __, 22, 27 → add 5 → 17.
   (c) Broken Machine: 6, 9, 12, 14, 18: jumps +3, +3, +2, +4; the 14 should be 15 (rule add 3).

   Teaching move in chapter 2: Cat puts a pointer between each pair of balls and writes the jump on it. "We
   check every jump, not just the first one." Then the same pattern on the number line: the ball leaps 2 → 5
   → 8 → 11, every leap the same length. Prediction moment: "Where will the ball land next?" before it leaps to
   14.

8. **Animation and staging list**

   | Moment | Objects | Actions | Camera |
   |---|---|---|---|
   | Machine runs | pattern_machine, number balls 2, 5, 8, 11 | balls `path` down the chute onto the shelf, `sound` pop each, then `wiggle` machine + `sound` clang | `shot` medium on machine and shelf |
   | Robo's guess | robo, ball "12" | `pop` 12, `mark` incorrect, machine says "Try again" (`highlight` its light) | Medium |
   | Find the jump | three `pointer`s with `bend` 0.3 and `callout` "+3" | `draw` each pointer in turn, `highlight` each callout | `shot` close on shelf, straight on |
   | Number line leaps | `number_line` 0–40, `ball` | `leap` ball over [2, 5, 8, 11, 14, 17], `sound` boing per leap | Straight-on, whole line in frame |
   | Robo's glitch | balls 3, 6, 9, 13, pointers +3, +3, +4 | `draw` pointers, `mark` incorrect on "+4", 13 `hide`, 12 `pop`, `mark` correct | Close |
   | Going down | balls 20 → 14, pointers "−2" | leaps go left on the line, `feel` cat happy | Straight-on |
   | Missing ball | gap in the shelf with a "?" card | `sound` windup_click, `pop` 12 into the gap, `sound` ding | Close |
   | Tens digit spotlight | balls 7, 17, 27, 37 | `highlight` the ones digit 7 on each, `callout` "same ones digit" | `shot` close, height 15 |
   | Odd and even | two shelves of balls; small pair dots under each (array of dots) | balls `pop`, `callout` "odd" / "even", even balls get paired dots, odd ones have one left over | `shot` medium on both shelves |
   | Make your own | mouse, rule card "+5", start card "6" | mouse `move`s cards into the slot, `sound` squeak, balls roll out | Medium on machine |
   | Fix the machine | broken row 6, 9, 12, 14, 18 | `draw` pointers, `highlight` 14, `mark` incorrect, swap to 15, machine "Rule accepted" | Close, then `orbit` 25° round the machine |
   | Goodbye | confetti from the chute | `burst`, `clip` robo Dance | Wide |

9. **Experiment or hands-on activity**
   - **Block towers:** build towers 2, 4, 6 blocks tall. Predict the next tower, then build it. Try towers with
     the rule "add 3": 1, 4, 7.
   - **Pattern hunt:** look at house numbers on one side of a street (often 2, 4, 6 or 1, 3, 5) or a calendar
     column (each number is 7 more than the one above).
   - **Make a pattern for a grown-up:** pick a start and a rule, say four numbers, and let them find your rule.
   - **Safety:** small blocks away from babies; look at house numbers with a grown-up, from the pavement.

10. **Interaction moments**
    - Pause and guess (2–3 s, `windup_click`): "What's the jump?"; "Where will the ball land?"; "Which ball is
      broken?"
    - Call and response: Robo: "Check the jump!" Kids: "Every step!"
    - Move-along: kids jump forward three small hops for "add 3" and step back two for "take away 2".

11. **Song or chant**
    Original machine-beat chant with beeps on the off beat. Hook line idea: "Start, jump, the same jump again,
    check every step and you'll know the plan!" It plays in chapter 6 and, shortened, before each challenge.

12. **Fun fact(s)**
    - Calendars hide a pattern: going down one row on a calendar adds 7, because a week has 7 days (chapter 5).
    - On many streets, houses on one side have odd numbers and the other side even numbers (chapter 7).

13. **Vocabulary and captions**
    Labels: pattern, rule, jump, add, take away, next, missing, odd, even, check. `callout`s on every jump
    ("+3", "−2"). `count` captions as balls roll out. `subtitle` "Same rule every step".

14. **Quiz and recap**
    1. 10, 14, 18, 22, ? (26; add 4)
    2. What is the rule: 50, 40, 30, 20? (Take away 10.)
    3. 5, 8, __, 14 (11; add 3)
    4. Is 2, 4, 7, 9 a pattern with one rule? (No: the jumps are +2, +3, +2.)
    5. Start at 1 and add 2: 1, 3, 5, 7. Are they odd or even? (All odd.)
    Recap: find the jump, check every step, then continue or fill the gap; a rule can add or take away.
    Praise: the machine plays a happy tune and says "Rule accepted"; Cat: "Checked every step."

15. **Sound and music**
    Music `playful`, gain 0.20, dipping to 0.12 while jumps are checked. Voice 1.0; the machine's lines in the
    `robot` timbre (short, 3–6 words). Effects: pop (balls), boing (leaps), clang (jam), windup_click
    (guesses), ding (right), robot_beep (machine thinks), squeak (Mouse), crowd_cheer (end).

16. **Thumbnail and YouTube**
    Designed thumbnails (`meta.thumbnails`):
    - **a "What's Next?"** (yellow title, right): the Pattern Machine with balls 2, 5, 8, 11 on the shelf and a
      glowing "?" ball in the chute; Cat leaning in, curious; teal lab glow.
    - **b "+3 +3 +3"** (white title, teal outline): curved pointer arrows over four balls on a number line,
      the bouncing ball mid-leap; Robo amazed.
    - **c "Find the Rule!"** (orange title): Mouse popping a rule card into the machine, Robo giving a thumbs up.
    Title idea: "Number Pattern Machine! Find the Rule in Number Patterns | Add and Take Away | Grade 2 Math |
    Toy Box Friends". Tags: number patterns, find the rule, growing patterns, number sequences, skip counting,
    odd and even, grade 2 math, 2nd grade math, what comes next, Toy Box Friends.

17. **Catalog gaps**
    - A talking prop: lip-sync works on critters and face shapes, not on a prop. Stand-in: `highlight` pulses on
      the machine's light (or a small `shape` with `face: true` on its front panel) while it speaks. A
      "speaking light" option for props would be the real fix.
    - Number balls: stand-in: teal `sphere`s with a `letter` parented on the front.
    - Chute: stand-in: a tilted `tube`; balls travel with `path`.

18. **Do and don't**
    - Do check every jump on screen; never find a rule from the first two numbers only.
    - Don't use doubling or other multiply patterns (1, 2, 4, 8); keep rules to add or take away.
    - Don't re-teach plain skip counting from 0 (G1-14) or hundreds counting (G2-04); start patterns from other
      numbers and use rules like +3, +4, −2.
    - Don't call the repeating colour patterns of PK-06 "number patterns"; this episode is about growing and
      shrinking numbers.
    - Keep numbers within 100.
