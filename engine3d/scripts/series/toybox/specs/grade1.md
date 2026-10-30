# Grade 1 video specs (G1-01 to G1-10)

These are the ten grade 1 specs for the "Toy Box Friends" engine3d series (ages 6–7). Each spec says what
the video teaches and how it should feel. It is not a script: there is no final dialogue and no JSON. The
script writer turns each spec into a `video3d` script that follows `../SERIES.md`, the engine3d README and
the template, pacing and rules in [README.md](README.md). Robo hosts every episode and Frog is the grade 1
sidekick. Frog is bouncy and silly and loves big jumps, and each episode gives him a running joke that pays
off at the end. Every episode has a different hook style and one twist that no other episode uses. All
worked examples (words, sums, coin totals, times, fractions) are spelled out and checked, so the writer
does not have to invent the maths. Grade 1 pacing: sentences of up to 10 words, voice speed 0.95–1.0, and
story problem → model → try together → quiz. Every video is **Made for kids** and the upload stays manual.

| Id | Title | Subject | Hook style | Unique twist | Length |
|---|---|---|---|---|---|
| G1-01 | Short Vowel Island | English / phonics | A message in a bottle washes up | The Vowel Swap Machine turns one word into five (bag, beg, big, bog, bug) | 6:00 |
| G1-02 | Digraph Detectives: sh, ch, th, wh | English / phonics | A strange shop sign to solve | Two letters slide together and fuse into one glowing sound tile | 5:55 |
| G1-03 | Number Line Rocket | Math: add and subtract within 20 | A launch countdown | The number line stands up and becomes a rocket path to the Moon | 6:35 |
| G1-04 | Tens and Ones Bakery | Math / place value | A phone order for 47 cookies | The ten-box lid snaps shut on the tenth cookie (never more than 9 loose) | 6:05 |
| G1-05 | Robo's Busy Day | Math / time: hour and half hour | Robo oversleeps; Chick is the alarm | A clock with only the hour hand first, and Chick's "half a peep" | 6:20 |
| G1-06 | Penny, Nickel, Dime Shop | Math / money | Grand opening of a toy shop | The coin race to 10 cents: the small dime wins in one hop | 6:30 |
| G1-07 | Fair Shares | Math / fractions | Two friends, one last sandwich | The Unfair Cut Alarm, and the real "one cuts, one chooses" rule | 6:00 |
| G1-08 | Four Seasons Tree | Science / weather | A fast-forward button | One tree, one camera spot, a whole year; Bear sleeps through winter | 6:15 |
| G1-09 | Shadow Puppets and Humming Strings | Science experiment | Guess the mystery shadow | A two-act show (light, then sound) and rice that dances to a sound | 6:05 |
| G1-10 | Town Rules and Good Citizens | Social studies | "What if there were no rules?" | The animals hold a real vote and Frog loses like a good sport | 6:05 |

Running jokes (one per episode, never reused): G1-01 Frog wants his name in the 3-letter hut; G1-02 Frog
says "shh" far too loudly; G1-03 Frog over-jumps into the space puddle; G1-04 Frog counts by ones and falls
asleep; G1-05 Chick peeps the hours but only half-peeps at half past; G1-06 Pig tries to pay with silly
things; G1-07 Frog asks for "the bigger half"; G1-08 Robo's weather forecast is always wrong for the season;
G1-09 Frog tries to jump away from his own shadow; G1-10 Frog keeps suggesting "everyone must hop
everywhere".

---

### G1-01 · Short Vowel Island
**Grade 1 · English / phonics · 6:00 · garden (floor overridden to `sand`)**
**Skills:** short_vowels_1 · **Standard:** CCSS RF.1.2b, RF.1.2c, RF.1.3b (approximate)

#### 1. Big idea
Every short word has a vowel in the middle, and changing that one vowel makes a brand-new word.

#### 2. Learning goals
- I can say the short sound of a, e, i, o and u.
- I can blend three sounds into a CVC word (c-a-t, cat).
- I can hear which vowel is in the middle of a word.
- I can change the middle vowel to make a new word (hat, hit, hot, hut).

#### 3. Hook (first 15 s)
A bottle bobs onto the sand and Duck paddles in behind it. Inside is a note: "C_T, H_T, P_G. HELP! The
vowels washed away!" The island sign reads "V_W_L _SL_ND" with gaps. Robo asks: "Can you help us find
the missing vowels?" The mission is clear in 15 seconds: put the vowels back.

#### 4. What makes it unique
The **Vowel Swap Machine**: a big box with five vowel buttons. One word goes in, one vowel changes, and a
new word comes out. The big finale sends one word through all five vowels: bag, beg, big, bog, bug. Every
one of them is a real word, and Frog is thrilled that a bog is a muddy, wet place where frogs live.

#### 5. Cast and roles
| Who | Role in this episode |
|---|---|
| Robo | Host and island guide. Sounds out words slowly and sometimes picks the wrong vowel on purpose ("p-e-g... pig?") so kids can fix it. |
| Frog | Sidekick. Running joke: he wants a spot on the 3-letter word hut, but F-R-O-G has four letters. Payoff: Robo finds "fog" (Frog without the r), a real CVC word with short o. |
| Duck | Guest sailor. Brings the bottle, then rings the bell each time a vowel is found. |
| Pig | Guest hut keeper. Pig is a CVC word and is very proud of it. Keeps the short i hut and cheers "p-i-g, that's me!" |

#### 6. Setting and look
Garden stage with the floor set to `sand` so it reads as a beach island; a tree prop stands in for a palm,
with bushes and a cloud. Five small house props in a row are the vowel huts, each one a colour: a red,
e yellow, i green, o blue, u purple. These colours stay fixed for the whole episode, so a vowel always has
its colour. Light `soft_day`. The camera starts wide and low for the bottle, then sits at a friendly medium
shot in front of the huts. Mood: sunny and warm, holiday-like.

#### 7. Storyline
| # | Chapter | Time | What happens | Teaching move | Emotional beat |
|---|---|---|---|---|---|
| 1 | Message in a bottle | 0:00–0:25 (25 s) | The bottle and Duck arrive, the note is read, and the sign has gaps. Mission set. | Hook | Curiosity |
| 2 | Five vowel huts | 0:25–1:20 (55 s) | Each hut opens with a vowel letter and a helper object: a with the apple, e with the egg, i with a ball going "in" a box, o with a ball "on" a box, u with a balloon going "up". Each vowel pops into the sign as it is found. | Teach | Wonder; each find gets a ding |
| 3 | Sound it out | 1:20–2:20 (60 s) | Robo shows the three-tap blend: tap one sound per letter, then slide them together. c-a-t, h-e-n, p-i-g, d-o-g, b-u-g. Letters hop as each sound is said, then slide together. | Show | Confidence |
| 4 | The Vowel Swap Machine | 2:20–3:30 (70 s) | Words go into the box and new words pop out: cat → cot → cut; pin → pan → pen; hat → hit → hot → hut. Finale: bag → beg → big → bog → bug. Robo makes a silly swap ("p-e-g... pig?") and kids correct him. | Show + try | Delight; the bog joke |
| 5 | Frog's word hunt | 3:30–4:25 (55 s) | Frog hops to the huts. At each hut kids hear a word and shout the vowel before the hut lights up: map (a), web (e), lid (i), mop (o), sun (u). Frog asks again to join the 3-letter hut and is told "four letters!" | Try together | Fun; teasing that stays warm |
| 6 | Island quiz | 4:25–5:25 (60 s) | Five quiz questions with windup pauses (see section 14). | Quiz | Pride |
| 7 | Vowels home, Frog's word | 5:25–6:00 (35 s) | The sign is complete: "VOWEL ISLAND". Robo finds "fog" for Frog and it goes onto the hut. Chant one last time, confetti, goodbye. | Recap | Payoff and celebration |
| | **Total** | **6:00 (360 s)** | | | |

#### 8. Animation and staging list
| Moment | Objects | Actions | Camera |
|---|---|---|---|
| Bottle arrives | `bottle` (teal cylinder), `duck` | `move` bottle from x 8 to the shore with `wiggle` (bobbing), `move` duck behind it, `sound` bubble_pop | Wide and low, `camera` to medium as the bottle lands |
| Note read | `note_cat`, `note_hat`, `note_pig` letters with gaps ("C_T"...) | `pop` each word in turn, `caption` style label | Close on the words |
| Sign with gaps | `sign_vowel` "V_W_L", `sign_island` "_SL_ND" | `show`, `wiggle` | Pan up to the sign |
| Hut opens | `hut_a`...`hut_u` (house props), `let_a`...`let_u` (letters) | `pop` letter, `hop` hut, `sound` ding, `caption` style label (e.g. "a, apple") | Medium, `camera` slides hut to hut |
| Helper objects | `apple`, `egg`, `ball`, `box`, `balloon` | `drop` apple, `pop` egg, `move` ball into the box ("in") and onto the box ("on"), `move` balloon up ("up") | Follows each object |
| Vowel fills the sign | the matching sign letter | `hide` the gap word, `show` the fixed word; `sound` sparkle | Hold 2 s on the sign |
| Three-tap blend | `w_c`, `w_a`, `w_t` letters spaced apart | `hop` each in turn (one per sound), then `move` together, `pop` the whole word "cat" | Close |
| Swap machine | `machine` (box shape with face), five button spheres in vowel colours | Word `move`s into the box, `wiggle` + `sound` windup_click, `hide` old word, `pop` new word, `spin` the machine on the finale | Front, slight push-in on the finale |
| Bog joke | `frog`, a flat brown `circle` (the bog) | `hop` frog into the bog, `sound` boing, `wiggle` frog | Medium |
| Frog's hunt | `frog`, huts | `move` + `hop` frog to each hut; hut `grow` to 1.2 then back on the reveal | Tracks Frog |
| Quiz | words with a gap letter | `sound` windup_click (2–3 s), then `pop` the answer, `sound` ding | Close on the word |
| Finale | `party` confetti, `fog` letter, `frog` | `pop` "FOG", `hop` frog, `burst` party, `clip` robo Dance | Wide |

#### 9. Experiment or hands-on activity
Activity: **Tap and slide** and **Vowel swap cards**.
- During chapter 3, kids tap three fingers on the table, one tap per sound, then slide a hand across to say
  the whole word. Robo does it on screen with three hops.
- At home: write c, t, h, p, b and g on paper squares, and the five vowels on squares of their own colour.
  Lay out "b _ g" and try each vowel. Which ones make a real word? (All five: bag, beg, big, bog, bug.) Then
  try "p _ t": pat, pet, pit, pot, put? Note for the grown-up: "put" does not use the short u sound in most
  accents, so it is a nice "listen carefully" moment.
- Prediction: before each swap, kids guess the new word. Result: the machine shows it.
- Safety: paper squares only; scissors with a grown-up.

#### 10. Interaction moments
- Call and response: Robo says the sound, kids echo it: "a, a, apple".
- Pause and guess (2–3 s `windup_click`): "Which vowel is in m-a-p?" before the hut lights up (five times in
  chapter 5).
- Fix Robo: "p-e-g... pig?" Robo waits 2 s and kids shout "No! i!"
- Move-along: one mouth or hand action per vowel (bite the apple for a, crack the egg for e, scratch an
  itch for i, an open round mouth for o, point up for u).

#### 11. Song or chant
**"Middle Sound Bounce"**, original. A steady 4-beat clap. The hook idea: each line names a vowel, says its
sound twice, then a CVC word, ending with "middle sound, bounce!" Example shape (not final lyrics): "a, a,
cat, middle sound, bounce!". One line per vowel, five lines in all. It appears in chapter 2 (one line per
hut), in full after chapter 4, and as the closing chant in chapter 7. Frog does a hop on "bounce".

#### 12. Fun fact(s)
- E is the most used letter in written English. Shown in chapter 2 when the e hut opens.
- A hen is a grown-up girl chicken. Shown in chapter 3 with the word "hen".
- A bog is a soft, wet, muddy kind of land, and many frogs live in wet places like it. Shown in chapter 4
  after "bog".

#### 13. Vocabulary and captions
- Title: "Short Vowel Island".
- Label: vowel, short vowel, a e i o u, sound it out, blend.
- Word captions in the 3D letters and as labels: cat, hat, map, bag, jam / hen, bed, pet, ten, web / pig,
  pin, lid, zip, fin / dog, pot, mop, top, hot / bug, sun, cup, bus, rug.
- Swap chains: cat, cot, cut; pin, pan, pen; hat, hit, hot, hut; bag, beg, big, bog, bug.
- Subtitles for every spoken line. Words in captions are the ones the voice says.

#### 14. Quiz and recap
| # | Question | Answer |
|---|---|---|
| 1 | Which vowel is in "sun"? | u |
| 2 | Change the a in "map" to o. What is the new word? | mop |
| 3 | Which word has a short e: pig, hen or cup? | hen |
| 4 | Bug is b _ g. Which vowel fills the gap? | u |
| 5 | Blend l-i-d. What word? | lid |

Praise moment: the five vowel letters `hop` in a wave, the sign lights up, `burst` confetti. Recap line idea:
"Five vowels, and the middle one changes the word."

#### 15. Sound and music
- Music: `happy`, musicGain 0.24; dip to 0.15 during the swap machine so the sounds are clear.
- Voice: `soft` for Robo at 0.97; Frog lines can use `squeaky`.
- Effects: ch 1 bubble_pop, whoosh; ch 2 ding per vowel, sparkle when the sign fills; ch 3 block per sound
  tap; ch 4 windup_click, pop, boing (bog); ch 5 ding; ch 6 windup_click, ding, crowd_cheer; ch 7
  magic_sparkle with confetti.

#### 16. Thumbnail and YouTube
- Thumbnail: the swap machine with "BIG" popping out, Frog mid-hop, and the title on screen (around 3:15).
- Title idea: "Short Vowels for Kids! CVC Words on Vowel Island | Toy Box Friends" (68 characters).
- Tags: short vowels, CVC words, phonics for kids, grade 1 reading, first grade phonics, blending sounds,
  vowel sounds, learn to read, kids learning video, 3D cartoon for kids, Toy Box Friends.

#### 17. Catalog gaps
| Gap | Stand-in from existing parts |
|---|---|
| Bottle with a note | Teal `cylinder` (size 0.4) with a small cream `sphere` as the cork; the note is letter objects |
| Island beach floor | garden stage with `floor: "sand"` override |
| Palm tree | `tree` prop; fine as is |
| Swap machine | `box` shape with `face: true`, five small spheres in vowel colours as buttons |
| Bog / puddle | Flat brown `circle` on the floor |
| Gap letter "_" in words | Use the letter text "C_T" directly (check the underscore glyph in andika_bold) |

#### 18. Do and don't
- Do keep to short vowels in CVC words only. No magic e, no long vowels (cap → cape is G2-01's job).
- Don't use words that end in x (box, six), r-controlled vowels (car) or blends (frog, stop) as examples.
  Frog's name is a joke about letter count only; don't teach blends.
- Do say the short sounds clearly and keep them clipped; don't add "uh" after consonants ("c-uh-a-t").
- Don't call y a vowel here; the five vowels are a, e, i, o, u.
- Do keep the vowel colours the same in every chapter.
- Pacing: give each swap 3–4 s so kids can read the new word before the next one.

---
### G1-02 · Digraph Detectives: sh, ch, th, wh
**Grade 1 · English / phonics · 5:55 · studio, then playroom for the clue hunt**
**Skills:** digraphs_1 · **Standard:** CCSS RF.1.3a (approximate)

#### 1. Big idea
Sometimes two letters hold hands and make one new sound: sh, ch, th and wh.

#### 2. Learning goals
- I can say the sound of sh, ch, th and wh.
- I can hear if a digraph is at the start or the end of a word (ship, fish).
- I can pick the right digraph to finish a word (lun_ _ → lunch).
- I know that wh starts many question words (what, when, where, why).

#### 3. Hook (first 15 s)
Robo opens a new shop with a big sign: "SHOP". Frog reads it letter by letter: "S... HOP? A hop shop!" and
starts hopping. Robo is puzzled: the sign is right, but it does not say "s-hop". A magnifying glass drops in.
"Detectives, we have a case: why do s and h make a new sound?"

#### 4. What makes it unique
The **fusion tile**. In every case, the two letters slide together, spin once and turn into one glowing
tile ("sh") with a single new sound. Kids see that two letters can make one sound. Each digraph is a
"case file" with a clue to find, so the episode feels like a gentle detective story with four small cases.

#### 5. Cast and roles
| Who | Role in this episode |
|---|---|
| Robo | Chief detective. Reads each clue, and sometimes splits the digraph on purpose ("c-h-in?") for kids to fix. |
| Frog | Junior detective. Running joke: he loves to say "shh!" but always says it far too loudly, which startles Sheep. Payoff: in the last chapter he finally whispers it perfectly. |
| Sheep | Guest for sh. A quiet librarian-type who says "shh" softly; the right way to make the sound. |
| Chick | Guest for ch. Gives a tiny "ch-ch-choo!" sneeze-like sound and holds the ch clue. |

#### 6. Setting and look
Studio stage for the case board (a big cream rectangle with four "case cards"), playroom for the clue hunt.
Detective mood: light `studio`, a slow camera push-in on every clue, and music that is curious, not scary.
Each digraph has its own colour: sh blue, ch orange, th green, wh purple. A magnifying glass (torus with a
cylinder handle) sweeps across objects to "find" each clue.

#### 7. Storyline
| # | Chapter | Time | What happens | Teaching move | Emotional beat |
|---|---|---|---|---|---|
| 1 | The case of the strange sign | 0:00–0:25 (25 s) | SHOP is read as "s-hop"; the magnifying glass arrives; four case cards appear: sh, ch, th, wh. | Hook | Puzzled, then curious |
| 2 | Two letters, one sound | 0:25–1:10 (45 s) | s and h slide together and fuse into one sh tile. Robo explains: some letter pairs make one sound, called a digraph. SHOP is read correctly. | Teach | "Aha!" |
| 3 | Case 1: sh | 1:10–2:00 (50 s) | Sheep shows the sound. Clues: ship, shell, sheep at the start; fish, wish at the end. Frog's loud "SHH!" makes Sheep hop. | Show + try | Giggles |
| 4 | Case 2: ch | 2:00–2:50 (50 s) | Chick's "ch-ch". Clues: chick, chin, chair at the start; lunch, bench at the end. Robo splits "c-h-in" and kids fix it. | Show + try | Fun |
| 5 | Case 3: th | 2:50–3:40 (50 s) | Tongue peek: put your tongue between your teeth. Clues: thumb, three, thin at the start; bath, moth at the end. Note that th can sound a little different in "this" and "that", and both are th. | Show + try | Silly faces |
| 6 | Case 4: wh | 3:40–4:25 (45 s) | Blow gently like a breeze. Clues: whale, wheel, white. Big reveal: wh starts question words: what, when, where, why. | Show + try | Wonder (the whale) |
| 7 | Case closed quiz | 4:25–5:25 (60 s) | Five mystery words; kids pick the right digraph with a 2–3 s pause (see section 14). | Quiz | Pride |
| 8 | Detective chant | 5:25–5:55 (30 s) | The case board lights up, all four tiles spin. Frog finally whispers a perfect "shh". Chant and goodbye. | Recap | Warm payoff |
| | **Total** | **5:55 (355 s)** | | | |

#### 8. Animation and staging list
| Moment | Objects | Actions | Camera |
|---|---|---|---|
| Sign misread | `sign_shop` letter "SHOP", `frog` | `pop` sign, `hop` frog three times, `sound` boing | Medium on the sign |
| Magnifier arrives | `glass` (torus) + `handle` (cylinder) | `drop` both, `sound` whoosh | Follows the drop |
| Case board | `board` (cream rectangle), `case_sh`...`case_wh` letters | `show` board, `pop` each card | Wide |
| Fusion tile | `let_s`, `let_h`, `tile_sh` (letter "sh", blue) | `move` s and h together, `spin` both, `hide` both, `pop` tile_sh, `sound` magic_sparkle | Close, slight push-in |
| Clue found | words as letters, e.g. `w_ship`; props where they exist (`ball`, `egg` not used) | glass `move` over the word, word `grow` to 1.3 then back, `sound` ding, `caption` style label | Push-in on each clue |
| Start or end | the digraph tile | `move` the tile to the front of the word (ship) or the back (fish) | Close |
| Loud "SHH" | `frog`, `sheep` | `hop` frog, `sound` toot (comic, not too loud, volume 0.6), `hop` sheep, `wiggle` sheep, `turn` `sheep#head` toward Frog | Two-shot |
| Chick ch | `chick` | `wiggle` chick, `sound` squeak, `nod` chick | Close |
| Tongue peek | `robo` | `clip` robo Yes; caption label "tongue peek" | Close on Robo |
| Whale | `whale` (blue capsule, face true) with a small triangle tail | `move` across the back, `wiggle` tail, `burst` bubbles | Wide |
| Question words | letters "what", "when", "where", "why" | `pop` one by one, each `hop` | Medium |
| Quiz | gap words "fi_ _", `tile_*` options | `sound` windup_click 2–3 s, right tile `move` into the gap, `sound` ding | Close |
| Finale | all four tiles, `party` confetti | `spin` tiles, `burst` party, `clip` robo ThumbsUp, `nod` sheep | Wide |

#### 9. Experiment or hands-on activity
Activity: **Sound detective hunt**.
- Along with the video: one hand action per digraph. sh: finger on lips. ch: a tiny "choo" with hands
  like a train. th: tongue peek. wh: blow gently on your palm and feel the breeze.
- At home: hunt for one thing for each digraph and draw it in four boxes. Ideas: shoe, sheet (sh);
  chair, cheese (ch); thumb, bath (th); wheel, white socks (wh).
- Prediction: before each clue is read, guess which case it belongs to. Result: the glass shows it.
- Safety: no safety risk. Don't blow out real candles for wh; a hand or a paper strip is enough.

#### 10. Interaction moments
- Call and response: "What sound do s and h make together?" Kids: "sh!"
- Pause and guess (2–3 s `windup_click`) on every quiz word and on two clues per case.
- Fix Robo: "c-h-in?" pause 2 s, kids shout "ch-in!" "chin!"
- Move-along: the four hand actions, repeated in the chant.

#### 11. Song or chant
**"Two Letters Hold Hands"**, original. A detective march on a 4-beat count with two claps between lines.
The hook idea: "two letters hold hands, one new sound" said as a repeated line, then each digraph with its
action and one word. It appears after chapter 2 (hook line only), at the end of each case (one new line),
and in full in chapter 8. Frog's line is always the whispered "shh" at the very end.

#### 12. Fun fact(s)
- Humpback whales sing long songs under the sea, and one song can last many minutes. Shown in chapter 6.
- A moth is like a butterfly that mostly flies at night. Shown in chapter 5 with "moth".
- Most question words start with wh: what, when, where, which, why. Shown in chapter 6.

#### 13. Vocabulary and captions
- Title: "Digraph Detectives".
- Labels: digraph, two letters one sound, sh, ch, th, wh, start, end.
- Words: sh: ship, shell, sheep, shop, fish, wish. ch: chick, chin, chair, lunch, bench. th: thumb, three,
  thin, bath, moth (and this, that). wh: whale, wheel, white, what, when, where, why.
- Count style is not used in this episode.

#### 14. Quiz and recap
| # | Question | Answer |
|---|---|---|
| 1 | fi_ _ : sh or ch? | sh (fish) |
| 2 | Which two letters start "wheel"? | wh |
| 3 | lun_ _ : ch or th? | ch (lunch) |
| 4 | _ _umb : th or sh? | th (thumb) |
| 5 | Which word has sh: chin, ship or thumb? | ship |

Praise moment: the case board shows "CASE CLOSED" as a title caption, the four tiles spin, confetti, and
Robo gives Frog a ThumbsUp. Recap idea: "sh, ch, th, wh: two letters, one sound."

#### 15. Sound and music
- Music: `mysterious` at musicGain 0.20 in chapters 1–2 (curious, never scary), then `playful` at 0.24.
- Voice: Robo `soft` 0.97; Frog `squeaky`; Sheep and Chick `squeaky` with short lines.
- Effects: ch 1 boing, whoosh; ch 2 magic_sparkle (fusion); ch 3 toot (Frog's loud shh, volume 0.6), ding;
  ch 4 squeak; ch 5 laugh_small; ch 6 bubble_blow, ooh; ch 7 windup_click, ding; ch 8 crowd_cheer.

#### 16. Thumbnail and YouTube
- Thumbnail: the s and h mid-fusion with sparkles, Frog with the magnifying glass, title on screen (about 0:50).
- Title idea: "Digraphs sh, ch, th, wh for Kids! Phonics Detectives | Toy Box Friends" (69 characters).
- Tags: digraphs, sh ch th wh, phonics for kids, first grade phonics, grade 1 reading, digraph song, learn
  to read, letter sounds, kids learning video, 3D cartoon for kids, Toy Box Friends.

#### 17. Catalog gaps
| Gap | Stand-in from existing parts |
|---|---|
| Magnifying glass | `torus` (ink colour) with a brown `cylinder` handle, moved as two objects |
| Whale | Blue `capsule` with `face: true` and a small blue `triangle` tail |
| Ship, shell, wheel, chair, thumb pictures | Show the word as 3D letters only; wheel can be a `torus` |
| Case board | Large cream `rectangle` |
| Fusion glow | `sound` magic_sparkle plus a `grow` pulse; no glow material needed |

#### 18. Do and don't
- Do teach each digraph as one sound, never as two blended sounds.
- Don't use "who", "whole" or "whose" (they start with an h sound). Don't use "chef", "school" or
  "Christmas" (ch sounds different there).
- Don't teach blends (bl, st): those are reserved. Don't add magic e words.
- Do keep the detective tone playful: no villains, no crime, no "bad guy".
- Keep Frog's loud "shh" at volume 0.6 or lower; it is funny, not a jump scare.
- Do mention lightly that th has a soft and a buzzy version (thin, this); don't make it a lesson.

---

### G1-03 · Number Line Rocket: add and subtract within 20
**Grade 1 · Math · 6:35 · night (stars and moon), playroom for the launch pad**
**Skills:** add_within_20_1, sub_within_20_1, word_problems_1 · **Standard:** CCSS 1.OA.A.1, 1.OA.C.5, 1.OA.C.6, 1.OA.D.8 (approximate)

#### 1. Big idea
Adding is jumping up the number line, and taking away is jumping back down.

#### 2. Learning goals
- I can add within 20 by counting on with jumps.
- I can make a ten to add faster (8 + 5 = 8 + 2 + 3).
- I can subtract within 20 by jumping back, stopping at 10 on the way.
- I can solve a story problem and find a missing number (9 + ? = 15).

#### 3. Hook (first 15 s)
A countdown. Bunny is Mission Control and counts down 10 to 0 with a number block popping for each, while
the camera shakes gently. At "0" ... nothing happens. The rocket has no path! Robo: "A rocket needs a
number line to fly. Let's build one, all the way to the Moon."

#### 4. What makes it unique
The **standing number line**. The number blocks 0 to 20 stack into a tall path that climbs from the launch
pad into the night sky, with the Moon sitting at 20. The rocket rides up for adding and floats down for
taking away. A "make-ten booster" fires every time the rocket passes 10, so kids see 10 as a resting stop.

#### 5. Cast and roles
| Who | Role in this episode |
|---|---|
| Robo | Pilot and teacher. Models each jump, counts out loud, and once lands on the wrong number on purpose. |
| Frog | Co-pilot who hops each jump. Running joke: he gets excited and jumps one too far, landing in the "space puddle" with a splash. Payoff: at the end the rocket splashes down in the puddle on purpose, just like real space capsules. |
| Bunny | Guest: Mission Control. Does the countdown, reads the story problems, and calls "Go for launch!" |

#### 6. Setting and look
Start on the playroom launch pad (chapter 1), then the night stage with `stars` and the `moon` prop for the
rest. The number line is 21 number blocks in a gentle tall arc (0 at the bottom, 20 at the top, next to
the Moon). Blocks 0–9 blue, 10 gold (the resting stop), 11–20 purple. Light `moonlight` plus a bright rocket.
The camera rides with the rocket (a slow vertical tilt), and pulls wide to show the whole line at least
once per chapter. Mood: adventurous and heroic, never scary.

#### 7. Storyline
| # | Chapter | Time | What happens | Teaching move | Emotional beat |
|---|---|---|---|---|---|
| 1 | Countdown | 0:00–0:20 (20 s) | Bunny counts 10 to 0; the rocket does not move. | Hook | Suspense, then a laugh |
| 2 | Build the rocket line | 0:20–1:00 (40 s) | Blocks drop one by one, 0 to 20, into the arc. The Moon appears at 20. Rule: up means add, down means take away. | Teach | Wonder |
| 3 | Adding = jumping up | 1:00–2:10 (70 s) | 12 + 4: start at 12, four jumps: 13, 14, 15, 16. Frog over-jumps to 17 and splashes into the space puddle; kids help count again. Then the double jump: 7 + 7 = 14. | Show + try | Fun, the first splash |
| 4 | Make-ten booster | 2:10–3:10 (60 s) | 8 + 5: jump 2 to reach 10 (booster fires), then 3 more: 13. Then 9 + 6: jump 1 to 10, then 5 more: 15. Missing number: 9 + ? = 15; count the jumps: 6. | Show + try | "That was fast!" |
| 5 | Coming back down | 3:10–4:15 (65 s) | 17 − 3: three jumps back: 16, 15, 14. 15 − 6: back 5 to 10 (booster rests), back 1 more: 9. Fact family: 8 + 5 = 13, 5 + 8 = 13, 13 − 5 = 8, 13 − 8 = 5. | Show + try | Calm, gliding |
| 6 | Space story problems | 4:15–5:15 (60 s) | Bunny reads two stories. 11 stars twinkle; 4 hide behind a cloud: 11 − 4 = 7. Six rockets wait on the pad; 7 more arrive: 6 + 7 = 13. Kids think, then the line shows it. | Try together | Thinking, then pride |
| 7 | Mission quiz | 5:15–6:10 (55 s) | Five quick quiz problems (see section 14). | Quiz | Excitement |
| 8 | Splashdown | 6:10–6:35 (25 s) | The rocket flies back down 20 to 0 and lands in the space puddle on purpose. Frog: "My kind of landing!" Chant, confetti. | Recap | Payoff |
| | **Total** | **6:35 (395 s)** | | | |

#### 8. Animation and staging list
| Moment | Objects | Actions | Camera |
|---|---|---|---|
| Countdown | `cd_10`...`cd_0` number blocks, `bunny`, `rocket` | `pop` each block on each count, `hide` the previous one, `nod` bunny, `wiggle` rocket at 0 | Low angle on the pad, small `camera` shakes (moves of 0.05 m) |
| Line builds | `n0`...`n20` number blocks | `drop` each to its arc spot (sound block), `sound` ding on 10 and 20 | `camera` tilts up as it builds, then wide |
| Moon | `moon` prop, `stars` | `show` moon at the top, stars already on | Wide |
| A jump | `rocket` (cylinder + cone + triangles), `frog` | `move` rocket to the next block (dur 0.5), `hop` frog, block `grow` to 1.2 and back, `caption` style count with the number | Follow the rocket up |
| Over-jump | `frog`, `puddle` (flat blue circle at the side) | `hop` frog extra high, `move` to the puddle, `sound` bubble_pop, `burst` bubbles | Quick `camera` to the puddle |
| Make-ten booster | `booster` (orange cone under the rocket), `n10` | `show` booster, `sound` whoosh, `spin` rocket once, n10 `grow` 1.3 | Hold on 10 |
| Fact family | number blocks 8, 5, 13 and letters "+", "−", "=" | `move` blocks into the four facts, one at a time | Close |
| Story stars | `star1`...`star11` (gold star shapes), `cloud` | `pop` stars, `move` 4 stars behind the cloud, `wiggle` cloud | Wide sky |
| Rockets on pad | six small rockets, then seven more | `drop` each, `caption` count | Medium |
| Quiz | number line, gap equation letters | `sound` windup_click 2–3 s, rocket `move`s to the answer, `sound` ding | Medium |
| Splashdown | `rocket`, `puddle`, `party` confetti | `move` rocket down the arc, `drop` into puddle with `sound` land, `burst` bubbles then party, `clip` robo Jump | Wide |

#### 9. Experiment or hands-on activity
Activity: **Floor number line hop**.
- With a grown-up, write 0 to 20 on paper sheets and lay them in a line on the floor (tape them so they
  don't slip). Kids stand on the first number and hop forward to add, backward to take away.
- Try along with the video: 12 + 4, 8 + 5, 15 − 6.
- Prediction: "Where will you land?" Say it before hopping. Result: count your hops to check.
- Safety: hop on a non-slip floor barefoot or in shoes, clear space around, no hopping near stairs.

#### 10. Interaction moments
- Call and response: Robo: "Up means?" Kids: "Add!" Robo: "Down means?" Kids: "Take away!"
- Count the jumps out loud with Frog every time (the voice leaves a beat for each number).
- Pause and guess (2–3 s `windup_click`): before each landing in chapters 4, 6 and 7.
- Move-along: stand up, crouch, and "blast off" with arms up at each booster.

#### 11. Song or chant
**"Count On, Blast Off"**, original. A rising call-and-response rhythm, getting a little faster like a
countdown. The hook idea: start on the big number, count on, then "blast off!" For subtraction, the same
tune is sung going down and ends with "touch down". It appears after chapter 3 (up version), after chapter 5
(down version), and both together in chapter 8.

#### 12. Fun fact(s)
- Twelve people have walked on the Moon. Shown in chapter 2 when the Moon appears.
- On the Moon you would weigh about one sixth as much as on Earth, so you could jump much higher. Shown in
  chapter 3 after Frog's big jump.
- The Apollo astronauts came home by splashing down in the ocean. Shown in chapter 8.

#### 13. Vocabulary and captions
- Title: "Number Line Rocket".
- Labels: number line, add, take away, count on, jump back, make ten, missing number, fact family.
- Count style: the number the rocket lands on, every jump.
- Subtitle equations: 12 + 4 = 16; 7 + 7 = 14; 8 + 5 = 13; 9 + 6 = 15; 9 + ? = 15 (answer 6);
  17 − 3 = 14; 15 − 6 = 9; 11 − 4 = 7; 6 + 7 = 13.

#### 14. Quiz and recap
| # | Question | Answer |
|---|---|---|
| 1 | 10 + 7 = ? | 17 |
| 2 | 14 − 4 = ? | 10 |
| 3 | 6 + 6 = ? | 12 |
| 4 | 16 − 7 = ? (back 6 to 10, back 1 more) | 9 |
| 5 | 5 + ? = 12 | 7 |

Praise moment: each right answer makes the rocket do a little `spin` and the booster fire; after question 5,
Bunny shouts "Mission complete!" and confetti falls. Recap: "Up to add, down to take away, stop at ten."

#### 15. Sound and music
- Music: `heroic` at musicGain 0.22 for launches, `playful` at 0.24 for practice chapters.
- Voice: Robo `soft` 0.97; Bunny `squeaky` for Mission Control; Frog `squeaky`.
- Effects: ch 1 robot_beep per count, ch 2 block per landing and ding at 10 and 20, ch 3 boing per hop and
  bubble_pop for the puddle, ch 4 whoosh for the booster, ch 5 slide_whistle (down), ch 6 sparkle for the
  stars, ch 7 windup_click and ding, ch 8 land, crowd_cheer.

#### 16. Thumbnail and YouTube
- Thumbnail: the rocket at 10 with the booster firing, the tall number line and the Moon, Frog on top (about 2:30).
- Title idea: "Add and Subtract within 20! Number Line Rocket for Kids | Toy Box Friends" (72 characters).
- Tags: addition within 20, subtraction within 20, number line, make ten, first grade math, grade 1 math,
  math for kids, word problems, counting on, kids learning video, Toy Box Friends.

#### 17. Catalog gaps
| Gap | Stand-in from existing parts |
|---|---|
| Rocket | White `cylinder` body, red `cone` nose, three red `triangle` fins, a small sky `circle` window; move as one group by moving each part with the same `move` (or one rocket model later) |
| Booster flame | Orange `cone` pointing down, `show`/`hide` |
| Tall number line | 21 `number_block`s placed in an arc; no new kind needed |
| Plus, minus, equals signs | `letter` objects "+", "−" (check the minus glyph; use "-" if missing), "=" |
| Space puddle | Flat blue `circle` on the floor at the side |
| Grouping parts into one object | Gap note: a group/parent object would make the rocket one target; until then every part gets the same move |

#### 18. Do and don't
- Do count the jumps, not the blocks. The start number is not a jump (12 + 4 lands on 16, not 15).
- Do always stop at 10 when crossing it in chapter 4 and 5; this is the strategy being taught.
- Don't go past 20 or below 0. Don't introduce negative numbers.
- Don't use the words "minus" and "take away" interchangeably without saying both mean the same thing once.
- Keep the countdown gentle: no loud explosions, no shaking faster than 3 times a second.
- Pacing: one jump per half second at most, so kids can count along.

---
### G1-04 · Tens and Ones Bakery
**Grade 1 · Math / place value · 6:05 · playroom (bakery counter)**
**Skills:** tens_ones_1, add_tens_1 · **Standard:** CCSS 1.NBT.B.2, 1.NBT.B.3, 1.NBT.C.4, 1.NBT.C.5 (approximate)

#### 1. Big idea
A two-digit number tells how many full boxes of ten and how many loose ones.

#### 2. Learning goals
- I can show a number up to 99 as tens and ones (47 is 4 tens and 7 ones).
- I can count by tens, then count on the ones (10, 20, 30, 40, 41 ... 47).
- I can compare two numbers by looking at the tens first (53 > 35).
- I can add ten, or add whole tens (47 + 10 = 57, 30 + 20 = 50).

#### 3. Hook (first 15 s)
The bakery phone rings (robot_beep, robot_beep). Bear answers. It is Cow: "I need 47 cookies for my party.
Can you bring them by lunch?" Bear looks at the huge pile of cookies and gasps. "Forty-seven? How will we
ever count them?" Robo smiles: "Bakery boxes!"

#### 4. What makes it unique
The **ten-box rule**. Every bakery box holds exactly ten cookies, and on the tenth cookie the lid snaps shut
by itself with a bell. The bakery rule on the wall says "Never more than 9 loose cookies!" When there are
10 or more loose cookies, they must go into a box. Kids see a ten as one closed box they can count by.

#### 5. Cast and roles
| Who | Role in this episode |
|---|---|
| Robo | The bakery helper and teacher. Fills boxes, models counting by tens, and once tries to count a closed box as "1 cookie" on purpose. |
| Frog | Sidekick. Running joke: he insists on counting every cookie by ones ("1, 2, 3 ...") and falls asleep before he finishes. Payoff: in chapter 8 he counts the order by tens and stays awake. |
| Bear | Guest baker. Bakes, puts cookies out on the tray, and closes the boxes. |
| Cow | Guest customer. Calls with the order, calls back for "ten more", and receives the delivery. |

#### 6. Setting and look
Playroom stage dressed as a bakery: a long block counter, a cube "oven", and a place-value mat on the
counter with two labelled spots, "TENS" on the left (blue) and "ONES" on the right (orange). Cookies are
small brown flat cylinders. Boxes are `box` shapes with a flat lid block. Light `soft_day`, warm and cosy.
Camera: medium on the counter, a top-down-ish angle (higher camera, looking down) when counting the mat.
Mood: busy, cheerful, the smell-of-baking feeling.

#### 7. Storyline
| # | Chapter | Time | What happens | Teaching move | Emotional beat |
|---|---|---|---|---|---|
| 1 | The big order | 0:00–0:25 (25 s) | The phone rings, Cow orders 47 cookies; a huge pile on the tray. | Hook | Gasp, then a plan |
| 2 | The ten-box rule | 0:25–1:15 (50 s) | Bear drops cookies into a box: 1 to 10, lid snaps, bell. Rule on the wall: "Never more than 9 loose." 14 loose cookies become 1 box and 4 loose: 14 is 1 ten and 4 ones. | Teach | "Snap!" satisfaction |
| 3 | Frog counts by ones | 1:15–1:55 (40 s) | Frog counts the pile by ones, slows down and falls asleep around 20. Robo counts 4 boxes and 7 loose by tens: 10, 20, 30, 40, 41 ... 47. Frog wakes up: "Done already?" | Show | Laughter |
| 4 | Reading tens and ones | 1:55–3:05 (70 s) | On the mat: 23 is 2 boxes and 3 loose. 47 is 4 boxes and 7 loose. 60 is 6 boxes and 0 loose: the zero says "no loose cookies". Robo counts a box as "1 cookie" and kids fix him: one box is ten. | Show + try | Confidence |
| 5 | The swap trick | 3:05–3:50 (45 s) | Two orders: 35 and 53. Same digits, but 3 boxes and 5 loose vs 5 boxes and 3 loose. More boxes wins: 53 is more. Compare 29 and 41: 4 tens beats 2 tens. | Show + try | "Whoa, sneaky!" |
| 6 | Ten more, please! | 3:50–4:45 (55 s) | Cow calls back: "Ten more please!" 47 + 10 = 57: add one box, only the tens digit changes. Then 23 + 10 = 33, 30 + 20 = 50 (3 boxes and 2 boxes), 40 + 30 = 70. | Show + try | Busy fun |
| 7 | Order up quiz | 4:45–5:40 (55 s) | Five quiz orders (see section 14). | Quiz | Pride |
| 8 | Delivery | 5:40–6:05 (25 s) | The 57 cookies go to Cow's party; Frog counts them by tens and stays awake. Cow says thank you; chant, confetti. | Recap | Payoff |
| | **Total** | **6:05 (365 s)** | | | |

#### 8. Animation and staging list
| Moment | Objects | Actions | Camera |
|---|---|---|---|
| Phone rings | `phone` (small block with a cylinder handle), `bear`, `cow` (off to the side) | `sound` robot_beep twice, `wiggle` phone, `turn` `bear#head` to the phone | Medium on Bear |
| The pile | 47 `ck_` cookies (brown flat cylinders) | `drop` in a quick heap (staggered at 0.05 s), `sound` block (low volume) | Wide on the counter |
| Filling a box | `box1`, `lid1` (flat block), 10 cookies | `move` each cookie into the box (dur 0.3), `caption` style count 1 to 10, then `move` lid on, `sound` bell | Close on the box |
| The rule | `rule_sign` letters "9 LOOSE MAX" on a cream rectangle | `pop` sign, `wiggle` | Pan to the wall |
| 14 to 1 ten 4 ones | 14 loose cookies, `box2` | 10 `move` into the box, lid on, 4 stay; `caption` label "1 ten, 4 ones" and count "14" | Top-down |
| Frog falls asleep | `frog` | `nod` frog per count, slowing; `sleep` frog, `sound` laugh_small; later `wake` frog, `hop` | Two-shot |
| Count by tens | `box1`...`box4`, 7 loose | each box `hop` with `caption` count 10, 20, 30, 40; each loose cookie `hop`: 41 ... 47 | Top-down |
| Place-value mat | `mat_tens`, `mat_ones` (blue and orange rectangles), letters "TENS", "ONES", number blocks for the digits | boxes `move` onto TENS, loose onto ONES; digit blocks `pop` above each side | Top-down |
| Zero in the ones | number block 0 | `pop` 0, `wiggle` it | Close |
| Swap trick | number blocks 3, 5 then swapped 5, 3 | `move` the two blocks to swap places, then boxes rebuild on the mat | Medium |
| Ten more | `box5` | `drop` a full box on TENS, tens digit block `hide`, new digit `pop`; ones digit `nod` ("I stay the same") | Close on the digits |
| Quiz | mat, boxes and digit blocks | `sound` windup_click 2–3 s, reveal with `pop` and `sound` ding | Top-down |
| Delivery | `cow`, boxes, `party` confetti | boxes `move` to Cow, `hop` cow, `burst` party, `clip` robo ThumbsUp | Wide |

#### 9. Experiment or hands-on activity
Activity: **Bundle and count**.
- At home, gather 30 to 50 crayons, pencils or craft sticks. Make bundles of ten with a hair tie or put each
  ten in a cup. Leave the rest loose (never more than 9!).
- Write the number: bundles go in the tens place, loose ones in the ones place.
- Try: grab a big handful, guess how many, then bundle and count. Was the guess close?
- Prediction: "Will there be more bundles or more loose ones?" Result: count and write it.
- Safety: use big items, not small beads or dry pasta, with younger siblings around.

#### 10. Interaction moments
- Call and response: Robo: "How many in a box?" Kids: "Ten!"
- Count along by tens with the boxes: "10, 20, 30, 40", then by ones for the loose cookies.
- Pause and guess (2–3 s `windup_click`): "Which order is bigger, 35 or 53?" and every quiz question.
- Move-along: snap your hands shut like a lid on every tenth cookie.

#### 11. Song or chant
**"Box It Up"**, original. A bouncy bakery rhythm with a hand clap for each ten. The hook idea: counting
"ten, twenty, thirty ..." with a lid-snap clap on each, then a quick "and the ones!" with finger taps. It
appears in chapter 2 (first box), in chapter 3 when Robo counts 47, and in full during the delivery.

#### 12. Fun fact(s)
- We write every number with just ten digits: 0, 1, 2, 3, 4, 5, 6, 7, 8 and 9. Shown in chapter 4.
- The word "digit" also means a finger or a toe. Shown in chapter 4 as kids hold up ten fingers.
- A baker's dozen is 13, not 12. (Optional; shown in chapter 8 only if there is time, as a joke from Bear.)

#### 13. Vocabulary and captions
- Title: "Tens and Ones Bakery".
- Labels: tens, ones, digit, place value, ten more, more, less, bundle.
- Count style: running counts while filling boxes and counting by tens.
- Numbers shown: 47, 14, 23, 60, 35, 53, 29, 41, 57, 33, 50, 70, plus quiz numbers.

#### 14. Quiz and recap
| # | Question | Answer |
|---|---|---|
| 1 | 5 boxes and 2 loose. How many cookies? | 52 |
| 2 | 68 is how many tens and how many ones? | 6 tens and 8 ones |
| 3 | Which is more, 29 or 92? | 92 |
| 4 | 40 + 20 = ? | 60 |
| 5 | 36 + 10 = ? | 46 |

Praise moment: Bear's oven `wiggle`s and a "CORRECT!" bell rings for each answer; after question 5, Bear and
Cow `hop` together and confetti falls. Recap: "Boxes are tens, loose ones are ones; count the boxes first."

#### 15. Sound and music
- Music: `bouncy` at musicGain 0.24; `calm` at 0.18 under Frog's sleepy counting.
- Voice: Robo `soft` 0.97; Bear `deep`; Cow `deep`; Frog `squeaky` (slowing as he gets sleepy).
- Effects: ch 1 robot_beep (the phone); ch 2 block per cookie, bell per lid; ch 3 laugh_small and a soft
  windup_click-free pause for the snore; ch 4 ding; ch 5 ooh; ch 6 whoosh for a box dropping; ch 7
  windup_click, ding; ch 8 crowd_cheer, magic_sparkle.

#### 16. Thumbnail and YouTube
- Thumbnail: four closed boxes and seven loose cookies on the mat, "47" big, Bear and Frog (about 2:40).
- Title idea: "Tens and Ones for Kids! Place Value at the Bakery | Toy Box Friends" (68 characters).
- Tags: tens and ones, place value, first grade math, grade 1 math, counting by tens, two digit numbers,
  ten more, comparing numbers, math for kids, kids learning video, Toy Box Friends.

#### 17. Catalog gaps
| Gap | Stand-in from existing parts |
|---|---|
| Cookie | Brown `cylinder`, scaled flat (scale [1, 0.2, 1], size 0.25) |
| Bakery box with lid | `box` shape (cream) plus a flat cream `block` as the lid |
| Oven | `cube` with `face: true` (it wiggles when happy) |
| Phone | Small red `block` with a `capsule` handle |
| Place-value mat | Blue and orange flat `rectangle`s with letters "TENS" and "ONES" |
| Many cookies | 50+ objects is a lot for one scene; gap note: an "instances" or "group" helper would help. Until then reuse cookies between chapters (hide and show). |

#### 18. Do and don't
- Do count a closed box as ten every time; never as one.
- Do say "tens digit" and "ones digit" consistently.
- Don't go above 99 (hundreds are G2-04's job). Don't regroup in addition (that is G2-03).
- Don't add a two-digit number plus a two-digit number with ones (23 + 14); in grade 1 only add tens, or
  add ten.
- Food is pretend: keep it cookies the animals share at a party; no "eat as much as you want" message.
- Pacing: let the box-filling be quick (0.3 s a cookie) but hold 2–3 s on each finished mat.

---

### G1-05 · Robo's Busy Day: hour and half hour
**Grade 1 · Math / time · 6:20 · playroom (Robo's house), garden for the playground**
**Skills:** time_half_hour_1 · **Standard:** CCSS 1.MD.B.3 (approximate)

#### 1. Big idea
The short hand tells the hour, and when the long hand points to 6 it is half past.

#### 2. Learning goals
- I can read the hour hand to say about what hour it is.
- I can tell time to the hour (3 o'clock, 3:00).
- I can tell time to the half hour (half past 3, 3:30).
- I know that at half past, the hour hand is halfway between two numbers.

#### 3. Hook (first 15 s)
Morning. Robo is sitting slumped in a chair, powered down. Chick hops onto the clock and gives seven loud,
happy peeps: "Peep! Peep! Peep! Peep! Peep! Peep! Peep!" Robo jumps up: "What time is it? I have a very
busy day!" He looks at the clock, but it only has one hand.

#### 4. What makes it unique
The **one-hand clock**. The clock starts with only the short hour hand, so kids learn to read the hour hand
on its own first: "right on 3" and "halfway between 3 and 4". Only then does the long minute hand arrive.
Plus Chick the "peep clock": she peeps once for each hour at o'clock, and at half past she gives only half a
peep ("pee-").

#### 5. Cast and roles
| Who | Role in this episode |
|---|---|
| Robo | Host with a busy day. Reads the clock and once reads half past 6 as "half past 7" on purpose so kids fix it. |
| Frog | Sidekick and time-keeper's helper. Moves the minute hand by hopping it round. He loves the "half past" jump from 12 to 6. |
| Chick | Guest: the peep clock. Running joke: a peep for every hour, but only "half a peep" at half past. Payoff: at bedtime (8:00) she peeps 8 times and then falls asleep on the 8th. |
| Dog | Guest friend at the playground and painting time; asks "Is it time yet?" |

#### 6. Setting and look
Robo's house: playroom stage with a big clock on the wall at the back. The clock is a large white circle,
12 small number blocks around it, a short thick blue hour hand and a long thin red minute hand, and a gold
sphere at the centre. A digital clock (letters like "3:30") sits under it on a block. Garden stage for the
playground (chapter 5). Light `soft_day`; the colour of the backdrop shifts warmer for evening if the stage
allows (otherwise use the night stage for bedtime). Camera: close on the clock for every reading, medium for
the day's events.

#### 7. Storyline
| # | Chapter | Time | What happens | Teaching move | Emotional beat |
|---|---|---|---|---|---|
| 1 | Wake up, Robo! | 0:00–0:25 (25 s) | Chick peeps 7 times; Robo wakes; the clock has only one hand. | Hook | Surprise, a giggle |
| 2 | The one-hand clock | 0:25–1:20 (55 s) | The hour hand points right at 7: "7 o'clock." It moves slowly to halfway between 7 and 8: "half past 7." It moves on to 8. Then to halfway between 8 and 9: "half past 8." | Teach | Curiosity |
| 3 | O'clock | 1:20–2:10 (50 s) | The long minute hand arrives. At o'clock it points straight up at 12. Read 7:00, 12:00, 3:00. The digital clock shows the same with ":00". Chick peeps the hour each time. | Show + try | Confidence |
| 4 | Half past | 2:10–3:10 (60 s) | Frog hops the minute hand halfway round, from 12 to 6. The hour hand moves too, to halfway. Read 7:30 "half past 7", 3:30 "half past 3". Chick gives half a peep. | Show + try | Laughter at the half peep |
| 5 | Robo's busy day | 3:10–4:20 (70 s) | The day timeline: 7:00 wake up, 7:30 breakfast, 8:30 Toy School, 12:00 lunch, 3:30 painting with Dog, 6:00 dinner, 6:30 bath. Kids read each clock with Robo; Dog asks "Is it time yet?" | Try together | A busy, happy day |
| 6 | The half-past mix-up | 4:20–5:00 (40 s) | Robo reads 6:30 as "half past 7" because the hour hand is near 7. Kids check: it has not reached 7 yet, so it is still the 6 hour: half past 6. | Fix the mistake | "Oops!" then pride |
| 7 | Clock quiz | 5:00–5:55 (55 s) | Five quiz clocks (see section 14). | Quiz | Pride |
| 8 | Bedtime | 5:55–6:20 (25 s) | 8:00: Chick peeps 8 times and dozes off on the last one. Robo sits down, waves good night. Soft chant. | Recap | Calm, cosy |
| | **Total** | **6:20 (380 s)** | | | |

#### 8. Animation and staging list
| Moment | Objects | Actions | Camera |
|---|---|---|---|
| Robo powered down | `robo` | `clip` robo Sitting (loop), then `clip` Standing, then Wave | Medium |
| Peep alarm | `chick` on top of the clock | `hop` chick on each peep, `sound` squeak per peep, `caption` style count 1 to 7 | Close on Chick |
| One-hand clock | `clock_face` (white circle), `c1`...`c12` small number blocks, `hand_hour` (blue block), `pin` (gold sphere) | `turn` hand_hour to 210° (7) etc.; slow `turn` (dur 3) to show it moving | Close on the clock |
| Halfway | `hand_hour` | `turn` to 225° (halfway 7 and 8); `wiggle` c7 and c8 to show "between these two" | Close |
| Minute hand arrives | `hand_min` (long red block) | `drop` it onto the clock with `sound` windup_click, `turn` to 0° (12) | Close |
| O'clock reading | both hands, `digital` letters | `turn` both, `pop` the digital "3:00", `sound` ding | Close, then digital |
| Half past | `hand_min`, `frog` | Frog `hop`s along the rim while `hand_min` `turn`s from 0° to 180° (dur 1.5), `hand_hour` `turn`s 15° | Close |
| Half a peep | `chick` | `hop` with height 0.2 (half), `sound` squeak at volume 0.5 | Close on Chick |
| Day timeline | event props: `egg` (breakfast), `house` (Toy School), `apple` (lunch), `flower` (painting), `ball`, `bubbles` (bath) | `pop` each prop next to its clock time, `clip` robo Walking between them | Medium, `camera` glides left to right |
| Playground | garden stage scene, `dog`, `ball` | `hop` dog, `move` ball | Wide |
| Mix-up | clock at 6:30 | `wiggle` hand_hour, `sound` boing on the wrong answer, then `nod` robo | Close on the hour hand |
| Quiz | clock | `sound` windup_click 2–3 s, then `caption` style label with the time, `sound` ding | Close |
| Bedtime | `chick`, `robo`, `moon`, `stars` | `sleep` chick on peep 8, `clip` robo Sitting, `show` moon | Slow push-in |

Clock angles for the script (measured clockwise from 12, 30° per hour): 12 = 0°, 1 = 30°, 3 = 90°, 6 = 180°,
7 = 210°, 8 = 240°, 9 = 270°. At half past, the hour hand is at its hour plus 15° (7:30 = 225°). The minute
hand is 0° at o'clock and 180° at half past. Check the sign of the `turn` axis in the engine before
scripting.

#### 9. Experiment or hands-on activity
Activity: **Paper plate clock** and **clock detective**.
- With a grown-up: write 12, 3, 6 and 9 first on a paper plate, then the other numbers. Cut a short hand and
  a long hand from card and pin them in the centre with a paper fastener.
- Make each time from Robo's day and say it out loud: 7:00, 7:30, 12:00, 3:30, 6:00, 8:00.
- At home: look at a real clock at dinner time and say whether it is o'clock or half past (or "not yet").
- Prediction: "When the long hand reaches 6, where will the short hand be?" Result: halfway.
- Safety: a grown-up makes the hole and fits the fastener; fasteners are small, keep them away from little
  brothers and sisters.

#### 10. Interaction moments
- Call and response: Robo: "Long hand on 12?" Kids: "O'clock!" Robo: "Long hand on 6?" Kids: "Half past!"
- Pause and guess (2–3 s `windup_click`) for each timeline clock in chapter 5 and each quiz clock.
- Fix Robo: the 6:30 mix-up, with a 3 s pause before the answer.
- Move-along: one arm straight up for o'clock, one arm straight down for half past.

#### 11. Song or chant
**"Tick, Tock, Half the Clock"**, original. A tick-tock rhythm (wood-block feel, steady, about 2 ticks a
second). The hook idea: "Long hand up, it's o'clock" answered by "Long hand down, it's half past". It
appears in chapter 3 (first half), chapter 4 (second half added), in full after chapter 6, and softly at
bedtime.

#### 12. Fun fact(s)
- The hour hand goes all the way around the clock two times every day. Shown in chapter 2.
- "Clockwise" is named after the way clock hands turn. Shown in chapter 4 as Frog hops round.
- Half an hour is 30 minutes, so 3:30 means 30 minutes after 3 o'clock. Shown in chapter 4 with the digital
  clock.

#### 13. Vocabulary and captions
- Title: "Robo's Busy Day".
- Labels: hour hand, minute hand, o'clock, half past, clockwise, digital clock.
- Times shown (label and digital): 7:00, 7:30, 8:30, 12:00, 3:00, 3:30, 6:00, 6:30, 8:00, plus quiz times.
- Count style: Chick's peeps.

#### 14. Quiz and recap
| # | Question | Answer |
|---|---|---|
| 1 | Short hand on 4, long hand on 12. What time? | 4 o'clock (4:00) |
| 2 | Short hand halfway between 9 and 10, long hand on 6. What time? | Half past 9 (9:30) |
| 3 | Which clock shows half past 2: hour hand on 2 and minute hand on 12, or hour hand between 2 and 3 and minute hand on 6? | The second one |
| 4 | At 12:00, where are both hands? | Both point to 12 |
| 5 | The digital clock says 5:30. Say it another way. | Half past 5 |

Praise moment: Chick peeps a happy fanfare (three quick peeps, not a time), Robo does a Dance clip, and
stars burst. Recap: "Short hand for the hour, long hand on 12 or 6."

#### 15. Sound and music
- Music: `playful` at musicGain 0.23 by day, `lullaby` at 0.20 at bedtime.
- Voice: Robo `soft` 0.96; Chick `squeaky`; Dog `bark` timbre for short lines; Frog `squeaky`.
- Effects: ch 1 squeak (peeps), robot_beep (Robo powering on); ch 2 windup_click under the slow hand move;
  ch 3 ding; ch 4 boing per Frog hop, squeak at volume 0.5; ch 5 footstep_soft, bubble_blow at bath time;
  ch 6 boing then ding; ch 7 windup_click, ding; ch 8 crystal_chime, no loud sounds.

#### 16. Thumbnail and YouTube
- Thumbnail: the big clock at half past 3 with Frog hanging on the minute hand and Chick on top (about 2:40).
- Title idea: "Telling Time for Kids! Hour and Half Hour with Robo | Toy Box Friends" (68 characters).
- Tags: telling time, hour and half hour, o'clock, half past, clock for kids, first grade math, grade 1
  math, analog clock, learn to tell time, kids learning video, Toy Box Friends.

#### 17. Catalog gaps
| Gap | Stand-in from existing parts |
|---|---|
| Clock face with numbers | Large white `circle` (size 3), 12 small `number_block`s (size 0.35) at 30° steps, gold `sphere` centre pin |
| Clock hands that pivot at the centre | Thin `block`s; a pivot at one end is a gap (a block turns about its own centre). Stand-in: make each hand a block twice as long with its far half hidden behind the face, or a `capsule`. Gap note: a `pivot` field or a clock model would fix this properly. |
| Digital clock | `letter` objects "3:30" (check the colon glyph) on a dark `block` |
| Chair and bed | `block`s; Robo's Sitting clip on a cream block |
| Evening light change | Use the night stage for bedtime only |

#### 18. Do and don't
- Do keep to the hour and half hour only. No quarter past, no five-minute counting, no minutes other than
  :00 and :30 (G2-05 does the five-minute steps).
- Do always move the hour hand to halfway at half past. Never show 3:30 with the hour hand on 3: it is the
  most common mistake.
- Don't say "thirty" without also saying "half past" in this episode.
- Don't use a 24-hour clock or a.m. and p.m.
- Keep bedtime calm: no loud sounds after 5:55.
- Pacing: hold every clock reading for at least 3 s before the answer.

---

### G1-06 · Penny, Nickel, Dime Shop
**Grade 1 · Math / money · 6:30 · playroom (Frog's toy shop)**
**Skills:** coins_1 · **Standard:** Coin counting sits in CCSS 2.MD.C.8; many state standards put pennies, nickels and dimes in grade 1 (for example TEKS 1.4A–C) (approximate)

#### 1. Big idea
Coins are worth different amounts, and the smallest coin, the dime, is worth the most of the three.

#### 2. Learning goals
- I can name a penny (1 cent), a nickel (5 cents) and a dime (10 cents).
- I can count a group of coins by starting with the coin worth the most.
- I can skip count dimes by 10s and nickels by 5s.
- I can show the same amount with different coins (1 dime = 2 nickels = 10 pennies).

#### 3. Hook (first 15 s)
Grand opening! A red ribbon stretches across Frog's Toy Shop. Frog snips it (a pretend snip: the ribbon
just pops away), the shop bell rings, and Pig is the very first customer, holding out ... a flower. "One ball,
please! Here's my flower." Frog: "Pig, that's not money!" Robo: "Let's learn our coins."

#### 4. What makes it unique
The **coin race to 10 cents**. Ten pennies, two nickels and one dime race on a track to the 10-cent flag.
The pennies take ten little hops, the nickels take two big hops, and the tiny dime gets there in one giant
hop. "Small but mighty!" It shows that a coin's size does not tell its value.

#### 5. Cast and roles
| Who | Role in this episode |
|---|---|
| Robo | Teacher and coin expert. Starts once by counting the pennies first and gets mixed up on purpose, so kids learn to start with the dimes. |
| Frog | Shopkeeper. At first thinks bigger coins are worth more ("the nickel is biggest, so it's the best!") and learns the dime trick. |
| Pig | Guest shopper with a piggy bank. Running joke: tries to pay with silly things: a flower, an egg, a giggle. Payoff: pays for the gift with exactly the right coins. |
| Duck | Guest cashier. Rings up each sale with a ding and checks the coins in the till. |

#### 6. Setting and look
Playroom stage as a shop: a counter (long block), shelves (blocks) with toys for sale (ball, apple, balloon,
gift), each with a price tag (letters like "8¢" on a small cream rectangle). A coin tray on the counter.
Coins are flat cylinders: penny brown (size 0.65), nickel grey (0.75), dime grey (0.6), each with its value
written on top. Light `soft_day`, bright and cheerful. Camera: a top-down view of the coin tray for every
count, medium on the counter for shopping.

#### 7. Storyline
| # | Chapter | Time | What happens | Teaching move | Emotional beat |
|---|---|---|---|---|---|
| 1 | Grand opening | 0:00–0:25 (25 s) | The ribbon pops, the bell rings, Pig pays with a flower. | Hook | Excitement and a laugh |
| 2 | Meet the coins | 0:25–1:25 (60 s) | One coin at a time: penny, brown, 1 cent, smooth edge. Nickel, silver, 5 cents, smooth edge, the biggest of the three. Dime, silver, 10 cents, the smallest, with tiny ridges on its edge. | Teach | Curiosity |
| 3 | Small but mighty dime | 1:25–2:10 (45 s) | The coin race to 10 cents: 10 pennies, 2 nickels, 1 dime. Frog bets on the nickels because they are bigger; the dime wins in one hop. | Show | Surprise |
| 4 | Count from the biggest value | 2:10–3:10 (60 s) | Pig's piggy bank pours out: 2 dimes, 1 nickel, 2 pennies. Robo counts pennies first and gets muddled; then counts the right way: 10, 20, 25, 26, 27. 27 cents. | Show + try | "Ohh, that's easier!" |
| 5 | Shopping trips | 3:10–4:25 (75 s) | Pig buys a ball for 8¢ (1 nickel, 3 pennies: 5, 6, 7, 8). Then an apple for 15¢ (1 dime, 1 nickel: 10, 15). Then a balloon for 21¢ (2 dimes, 1 penny: 10, 20, 21). Pig offers an egg once more and everyone laughs. | Try together | Busy fun |
| 6 | The trade table | 4:25–5:10 (45 s) | Duck shows fair trades: 5 pennies = 1 nickel; 2 nickels = 1 dime; 10 pennies = 1 dime. A big mix: 3 dimes, 2 nickels, 4 pennies = 44¢ (10, 20, 30, 35, 40, 41, 42, 43, 44). | Show + try | Clever feeling |
| 7 | Shop quiz | 5:10–6:05 (55 s) | Five quiz questions (see section 14). | Quiz | Pride |
| 8 | Closing time | 6:05–6:30 (25 s) | Pig buys the gift for 32¢ with 3 dimes and 2 pennies (10, 20, 30, 31, 32), exactly right. The shop sign flips to "CLOSED"; chant, confetti. | Recap | Payoff |
| | **Total** | **6:30 (390 s)** | | | |

#### 8. Animation and staging list
| Moment | Objects | Actions | Camera |
|---|---|---|---|
| Ribbon | `ribbon` (thin red rectangle), `frog` | `hop` frog, `hide` ribbon (dur 0.2), `sound` pop then bell, `burst` a small confetti | Wide on the shop |
| Pig's flower | `pig`, `flower` | `move` pig to the counter, `pop` flower beside Pig, `wiggle` pig, `sound` laugh_small | Two-shot |
| Meet a coin | `penny`, `nickel`, `dime` (flat cylinders) with `letter` values "1¢", "5¢", "10¢" | `pop` each coin big in the centre, `spin` it to show the edge, `caption` style label "penny, 1 cent" | Close, then top-down |
| Size line-up | the three coins | `move` into size order (dime, penny, nickel), `grow` the dime 1.2 then back ("small but mighty") | Close |
| Coin race | 10 pennies, 2 nickels, 1 dime, `flag` (triangle on a cylinder) at "10¢" | pennies `hop` + `move` in ten small hops; nickels two big hops; dime one giant hop (height 1.2), `sound` boing | Side view, wide |
| Piggy bank pour | `bank` (pink sphere with face, the `pig` colour), coins | coins `drop` onto the tray with `sound` block; Robo counts, each coin `hop`s on its count, `caption` style count 10, 20, 25, 26, 27 | Top-down |
| Robo's muddle | coins, `robo` | `clip` robo No, `wiggle` coins, `sound` boing | Medium |
| Buying | toy props, price tags, coins | Pig `move`s coins to the counter one at a time, each `hop` with its count; `sound` ding when it matches; toy `move`s to Pig | Top-down then medium |
| Trade table | coins on a cream rectangle with "=" letters | groups `move` side by side; matching groups `grow` together; `sound` crystal_chime | Top-down |
| Quiz | tray with coin sets | `sound` windup_click 2–3 s, then count with hops, `pop` the total letter | Top-down |
| Closing | `sign` letters "OPEN" then "CLOSED", `party` confetti | `hide` OPEN, `pop` CLOSED, `burst` party, `clip` robo Wave | Wide |

#### 9. Experiment or hands-on activity
Activity: **Coin rubbings** and **home shop**.
- With a grown-up: put a penny, a nickel and a dime under thin paper and rub over them with the side of a
  crayon. Compare the pictures and the sizes. Feel the edges: which one has ridges? (The dime.)
- Home shop: put price tags from 1¢ to 30¢ on toys, then "buy" them with real or paper coins. Count the
  dimes first.
- Prediction: "Which coin will win the race?" Result: the dime.
- Safety: coins are small and must never go in the mouth, nose or ears. Wash hands after handling money. A
  grown-up stays with the child.

#### 10. Interaction moments
- Call and response: Robo: "Penny?" Kids: "One cent!" "Nickel?" "Five cents!" "Dime?" "Ten cents!"
- Count along on every shopping trip (the voice leaves a beat for each count).
- Pause and guess (2–3 s `windup_click`): "Which coin will win the race?" and every quiz question.
- Move-along: one finger up for a penny, one open hand (five fingers) for a nickel, both hands for a dime.

#### 11. Song or chant
**"Dimes First"**, original. A shop-bell jingle rhythm with a "ching!" on every dime. The hook idea:
"Dimes count by ten, nickels count by five, pennies count by one, then we're done!" with a clap after each
part. It appears after chapter 2 (coin names), after chapter 4 (the counting rule), and in full in chapter 8.

#### 12. Fun fact(s)
- The dime is the smallest US coin, but it is worth more than a penny or a nickel. Shown in chapter 3.
- A dime has lots of tiny ridges around its edge; a penny and a nickel have smooth edges. Shown in
  chapter 2.
- The penny has Abraham Lincoln on it, the nickel has Thomas Jefferson and the dime has Franklin D.
  Roosevelt. Shown in chapter 2 as small labels.

#### 13. Vocabulary and captions
- Title: "Penny, Nickel, Dime Shop".
- Labels: penny, nickel, dime, cent, cents, worth, value, price, total, same amount.
- Count style: running coin totals in every count.
- Price tags: ball 8¢, apple 15¢, balloon 21¢, gift 32¢.
- Say "US coins" once in the voice and as a subtitle in chapter 2.

#### 14. Quiz and recap
| # | Question | Answer |
|---|---|---|
| 1 | 2 dimes and 3 pennies. How much? | 23¢ (10, 20, 21, 22, 23) |
| 2 | How many pennies make one nickel? | 5 |
| 3 | Which is worth more, a nickel or a dime? | A dime |
| 4 | 1 dime, 1 nickel and 1 penny. How much? | 16¢ (10, 15, 16) |
| 5 | Show 12¢ with coins. | 1 dime and 2 pennies (2 nickels and 2 pennies, or 12 pennies, also work) |

Praise moment: Duck rings the till bell, coins `spin` in a row and confetti falls. Recap: "Penny 1, nickel 5,
dime 10, and always count the dimes first."

#### 15. Sound and music
- Music: `happy` at musicGain 0.24.
- Voice: Robo `soft` 0.97; Frog and Duck `squeaky`; Pig `squeaky`, giggly.
- Effects: ch 1 pop, bell, laugh_small; ch 2 crystal_chime per coin; ch 3 boing per hop, crowd_cheer for
  the dime; ch 4 block per coin, boing for the muddle; ch 5 ding per sale; ch 6 crystal_chime; ch 7
  windup_click, ding; ch 8 bell, magic_sparkle.

#### 16. Thumbnail and YouTube
- Thumbnail: the tiny dime mid-giant-hop over the nickels and pennies, Frog cheering, title on screen
  (about 1:50).
- Title idea: "Counting Coins for Kids! Penny, Nickel, Dime Shop | Toy Box Friends" (67 characters).
- Tags: counting coins, penny nickel dime, money for kids, coin values, first grade math, grade 1 math,
  counting money, learn coins, kids learning video, 3D cartoon for kids, Toy Box Friends.

#### 17. Catalog gaps
| Gap | Stand-in from existing parts |
|---|---|
| Coins | Flat `cylinder`s (scale [1, 0.12, 1]): penny brown size 0.65, nickel grey 0.75, dime grey 0.6, with a `letter` value on top; true size order is dime < penny < nickel |
| Coin faces (portraits) | Not shown; the value label is enough. Gap note for a later coin model. |
| Cent sign "¢" | `letter` "8¢"; check that andika_bold has the ¢ glyph, otherwise write "8 cents" |
| Piggy bank | Pink `sphere` with `face: true` (colour `pig`) |
| Shop shelves, counter, till | `block`s and a `cube` with a `letter` "TILL" |
| Ribbon | Thin red `rectangle` |
| Price tags | Small cream `rectangle` with a `letter` price |

#### 18. Do and don't
- Do say these are US coins; viewers in other countries have other coins.
- Do start every count with the dimes, then nickels, then pennies.
- Don't use quarters or dollars (quarters are reserved for grade 2, coins_quarters_2).
- Don't say the US still makes new pennies every day: the US Mint stopped making pennies for everyday use
  in 2025. Pennies can still be used and counted, so simply avoid the topic.
- Don't link value to size or colour ("silver coins are worth more" is wrong: the nickel is silver too).
- No real buying lesson, prices or adverts; the shop is pretend play.
- Pacing: one coin hop per count, about 0.6 s apart.

---
### G1-07 · Fair Shares: halves and quarters
**Grade 1 · Math / fractions · 6:00 · garden (picnic)**
**Skills:** halves_quarters_1 · **Standard:** CCSS 1.G.A.3 (approximate)

#### 1. Big idea
Fair shares are equal parts: two equal parts are halves, and four equal parts are quarters.

#### 2. Learning goals
- I can tell if a shape is cut into equal parts or not.
- I can name halves (2 equal parts) and quarters, also called fourths (4 equal parts).
- I can cut the same shape into halves or quarters in different ways.
- I know that a half is bigger than a quarter of the same whole.

#### 3. Hook (first 15 s)
A picnic blanket. One big square sandwich left. Bunny and Bear both reach for it at the same time: "Mine!"
"No, mine!" (cross but kind, no grabbing). Robo steps in: "Wait! There is one sandwich and two friends.
How can we make it fair?" Frog: "Give it all to me!" Everyone laughs. Mission: share fairly.

#### 4. What makes it unique
The **Unfair Cut Alarm**. Robo's magic cutting line (a glowing line, never a knife) slices a food. If the
parts are equal, a crystal chime rings and the parts glide apart neatly. If they are not equal, a silly
boing sounds and the two parts wobble and argue ("I'm bigger!" "I'm smaller!"). Plus a real-world fair
sharing trick: one friend cuts and the other friend chooses first.

#### 5. Cast and roles
| Who | Role in this episode |
|---|---|
| Robo | Host. Owns the magic cutting line. Makes one unfair cut on purpose, then asks kids how to fix it. Robo pretends to eat a "battery sandwich", so he never needs a share himself until the end. |
| Frog | Sidekick. Running joke: he always asks for "the bigger half". Payoff: in chapter 6 he realises there is no bigger half when it's fair: "Wait ... they're the same!" |
| Bunny | Guest sharer. Likes things neat. Does the "cut" in the cut-and-choose trick. |
| Bear | Guest sharer. Hungry and honest. Does the "choose" in the trick, and says "That's fair!" each time. |

#### 6. Setting and look
Garden stage, a big cream square rug as the picnic blanket (a flat `square`), a tree and bushes behind, sun
prop up high. Foods: a square sandwich (flat sand-coloured block), a long rectangle "cake bar" (pink block),
and a round "pizza" (a flat circle whose cuts show as thin lines, see gaps). The cutting line is a
thin gold block that sweeps across. Light `soft_day`. Camera: top-down for every cut (so the parts are easy
to compare), medium for the friends. Mood: sunny, friendly, a little silly.

#### 7. Storyline
| # | Chapter | Time | What happens | Teaching move | Emotional beat |
|---|---|---|---|---|---|
| 1 | The last sandwich | 0:00–0:25 (25 s) | Bunny and Bear both want the last sandwich; Frog wants it all. Mission: be fair. | Hook | A small conflict |
| 2 | What makes it fair? | 0:25–1:15 (50 s) | Equal parts are the same size. Robo makes an unfair cut (one big, one small): the alarm boings and the parts argue. Robo cuts again through the middle: equal, chime. Two equal parts are called halves. | Teach | Laugh, then "aha" |
| 3 | Halves two ways | 1:15–2:10 (55 s) | The square sandwich in half straight down: two rectangles. Another sandwich in half corner to corner: two triangles. Both are halves. Cake bar in half: two squares. Cut-and-choose: Bunny cuts, Bear picks. | Show + try | "Both are fair!" |
| 4 | Quarters for four friends | 2:10–3:10 (60 s) | Robo, Frog, Bunny and Bear: 4 friends share 1 sandwich. Cut in half, then in half again: four small squares. Another way: corner to corner twice: four triangles. Four equal parts are quarters, also called fourths. The round pizza in quarters. | Show + try | Happy picnic |
| 5 | Unfair Cut Alarm | 3:10–3:55 (45 s) | Three cuts; kids decide fair or not before the alarm. (a) Square cut off-centre: not fair. (b) Circle pizza in 4 equal pieces: fair, quarters. (c) A rectangle cut into 3 parts: not halves or quarters (they are not equal and there are 3). | Try together | Shouting "Fair!" / "Not fair!" |
| 6 | Half or quarter: which is bigger? | 3:55–4:40 (45 s) | Two equal sandwiches side by side: one in halves, one in quarters. A half covers two quarters. More parts means smaller parts. Frog finally gets it: there is no bigger half. | Show | Payoff of the joke |
| 7 | Fair shares quiz | 4:40–5:35 (55 s) | Five quiz questions (see section 14). | Quiz | Pride |
| 8 | Picnic time | 5:35–6:00 (25 s) | Everyone has a fair quarter; Robo eats his battery sandwich quarter with a beep. Chant and confetti. | Recap | Warm and happy |
| | **Total** | **6:00 (360 s)** | | | |

#### 8. Animation and staging list
| Moment | Objects | Actions | Camera |
|---|---|---|---|
| Reaching | `bunny`, `bear`, `sandwich` | `move` both 0.3 m toward the sandwich, `turn` `bunny#head` and `bear#head` to face each other, `wiggle` both | Medium two-shot |
| Frog wants it all | `frog` | `hop` frog, `sound` boing, `wiggle` | Close |
| The cutting line | `cutter` (thin gold block) | `show`, `move` across the food (dur 0.8), `sound` whoosh, `hide` | Top-down |
| Parts glide apart | two half pieces (`sw_l`, `sw_r`), placed together at start | `move` each 0.15 m apart, `sound` crystal_chime, `caption` style label "halves" | Top-down |
| Unfair alarm | a big piece and a small piece | `sound` boing, `wiggle` both pieces (deg 20) in turn, `hop` the small one, `caption` label "not equal" | Top-down |
| Halves as triangles | two `triangle` pieces | `move` apart along the diagonal | Top-down |
| Quarters | four small `square` pieces or four `triangle` pieces | `move` each outward 0.15 m, each `pop` a label "1 quarter" in turn, `caption` count 1 to 4 | Top-down |
| Round pizza | `pizza` (flat orange `circle`), two thin `block` cut lines | `show` the first line (halves), then the second (quarters), `sound` crystal_chime, `spin` the pizza once on the finale | Top-down |
| Cut and choose | `bunny`, `bear` | `nod` bunny (cuts), `hop` bear (chooses), `sound` ding | Medium |
| Which is bigger | two sandwiches in halves and in quarters | one half `move`s on top of two quarters; they line up exactly, `sound` crystal_chime | Top-down |
| Frog's payoff | `frog` | `turn` `frog#head` from one half to the other, `hop`, `clip` robo ThumbsUp | Close |
| Quiz | shapes on the blanket | `sound` windup_click 2–3 s, then the alarm (chime or boing) as the answer | Top-down |
| Picnic | all four, pieces, `party` confetti | each piece `move`s to a friend, `burst` party, `sound` robot_beep for Robo's battery bite | Wide |

#### 9. Experiment or hands-on activity
Activity: **Fold and share**.
- Fold a square of paper in half so the edges match. Open it: two equal parts. Fold another square corner to
  corner: two triangles, also halves.
- Fold a square in half and in half again: open it to see four quarters. Colour one quarter.
- Trace round a cup to make a paper circle, cut it out (with a grown-up) and fold it into halves, then
  quarters.
- At snack time, with a grown-up: share a slice of toast or a sandwich into halves or quarters. Use the
  cut-and-choose trick.
- Prediction: "Will the two folded halves match exactly?" Result: lay one on the other to check.
- Safety: scissors and knives are for grown-ups; children fold, colour and choose.

#### 10. Interaction moments
- Call and response: Robo: "Two equal parts?" Kids: "Halves!" Robo: "Four equal parts?" Kids: "Quarters!"
- Pause and guess (2–3 s `windup_click`) before every alarm in chapters 5 and 7: "Fair or not fair?"
- Move-along: show thumbs up for fair, wobble your hands for not fair.
- Fix Robo: his off-centre cut in chapter 2.

#### 11. Song or chant
**"Same, Same, Fair Game"**, original. A picnic clapping rhythm (clap, pat knees, clap, pat knees). The hook
idea: "Same and same is fair, fair, fair!" Then a half line ("two the same, that's halves") and a quarter
line ("four the same, that's quarters"). It appears at the end of chapter 2 (hook only), chapter 4 (adds the
quarter line), and in full in chapter 8.

#### 12. Fun fact(s)
- "Quarter" and "fourth" mean the same thing: one of four equal parts. Shown in chapter 4.
- "One cuts, the other chooses" is a real, very old way to share fairly between two people. Shown in
  chapter 3.
- Two quarters together make one half. Shown in chapter 6.

#### 13. Vocabulary and captions
- Title: "Fair Shares".
- Labels: equal, fair, whole, half, halves, quarter, quarters, fourth, fourths, not equal.
- Count style: counting the parts (1, 2; or 1, 2, 3, 4).
- Optional subtitle words: "1 half", "1 quarter" (no fraction notation like 1/2 needed in grade 1; it may
  be shown small as a bonus).

#### 14. Quiz and recap
| # | Question | Answer |
|---|---|---|
| 1 | A square cut into one big part and one small part. Halves? | No, the parts are not equal |
| 2 | How many quarters make one whole? | 4 |
| 3 | Which is bigger, a half or a quarter of the same sandwich? | A half |
| 4 | Bunny and Bear share one cake bar. How many equal parts? What are they called? | 2, halves |
| 5 | A circle cut into 4 equal parts. What is each part called? | A quarter (a fourth) |

Praise moment: all four friends `hop` in a row, the crystal chime rings, confetti. Recap: "Equal parts are
fair. Two equal parts are halves, four equal parts are quarters."

#### 15. Sound and music
- Music: `happy` at musicGain 0.24; drop to 0.16 under each cut so the alarm sounds are clear.
- Voice: Robo `soft` 0.97; Bear `deep`; Bunny `squeaky`; Frog `squeaky`.
- Effects: ch 1 boing; ch 2 whoosh, boing (unfair), crystal_chime (fair); ch 3 whoosh, crystal_chime, ding;
  ch 4 pop per quarter; ch 5 windup_click, boing or crystal_chime; ch 6 ooh; ch 7 windup_click, ding; ch 8
  robot_beep, crowd_cheer.

#### 16. Thumbnail and YouTube
- Thumbnail: the square sandwich in four quarters gliding apart, Bunny, Bear and Frog peeking in, title on
  screen (about 2:40).
- Title idea: "Halves and Quarters for Kids! Fair Shares Picnic | Toy Box Friends" (66 characters).
- Tags: halves and quarters, fractions for kids, equal parts, fourths, first grade math, grade 1 math,
  sharing fairly, fair shares, math for kids, kids learning video, Toy Box Friends.

#### 17. Catalog gaps
| Gap | Stand-in from existing parts |
|---|---|
| Food cut into pieces | Build each food from its pieces from the start (two rectangles or four squares placed edge to edge); the "cut" is the line sweeping, then the pieces gliding apart |
| Half-circle and quarter-circle wedges | No wedge shape exists. Stand-in: square and rectangle foods do all the moving cuts; the round pizza is a flat `circle` whose cuts appear as two thin crossing `block` lines (the four equal parts are shown, but no pieces move). Gap note: a wedge or sector shape with an angle parameter is the real fix. |
| Diagonal half of a square | `triangle` shape (check it is a right isosceles triangle; otherwise rotate a square 45° and use two flat triangles) |
| Cutting line | Thin gold `block`; never a knife |
| Picnic blanket | Large cream `square`, flat |

#### 18. Do and don't
- Do insist that halves must be equal. Two parts that are not equal are not halves.
- Do show more than one way to make halves and quarters of the same shape.
- Don't do thirds or eighths (thirds are in reserve). Don't do fractions of a set (half of 6 apples).
- Don't use fraction numbers as the main teaching (1/2, 1/4 can be a small bonus only).
- No knives on screen. The cutting line is magic. Don't show anyone grabbing or fighting; the conflict is
  mild and solved kindly.
- Pacing: hold every cut top-down for 2–3 s so kids can compare the parts.

---

### G1-08 · Four Seasons Tree
**Grade 1 · Science / weather · 6:15 · garden**
**Skills:** weather_seasons_1 · **Standard:** NGSS 1-ESS1-2 (daylight through the year), K-ESS2-1 (weather patterns) (approximate)

#### 1. Big idea
The year goes round in four seasons, and each one has its own weather, light and changes in nature.

#### 2. Learning goals
- I can name the four seasons in order: spring, summer, autumn (fall), winter.
- I can describe the weather in each season (warm and rainy, hot and sunny, cool and windy, cold and snowy).
- I can say how a tree and animals change through the seasons.
- I know that summer days are long and winter days are short.

#### 3. Hook (first 15 s)
One tree on a hill. Robo holds a big red button: "This is my fast-forward button. It can zoom through a
whole year!" Frog: "Press it, press it!" Click: the clouds rush by, the tree's leaves flash from green to
orange in one second, and Robo quickly presses it again to stop. "Whoa! What just happened to our tree?
Let's go slowly, one season at a time."

#### 4. What makes it unique
**One tree, one camera spot, a whole year.** The tree never moves and the camera always returns to the same
place, so kids see the same tree change. Plus Bear sleeps in his den through winter and wakes up in spring,
using the engine's `sleep` and `wake`. The episode ends where it began: spring again, because seasons go
round.

#### 5. Cast and roles
| Who | Role in this episode |
|---|---|
| Robo | Host and weather reporter. Running joke: his weather forecast is always wrong for the season ("Today: snow!" in summer). Kids correct him each time. Payoff: in the last chapter he gets it right and does a happy Dance. |
| Frog | Sidekick. Presses the fast-forward button, and in winter tells kids that many frogs rest in mud or under leaves until spring. |
| Bear | Guest. Lives in a den under the hill; eats lots in autumn, sleeps through much of winter, wakes up hungry in spring. |
| Chick | Guest. Hatches from an egg in spring (Frog shows that spring is a time when many baby animals are born). |

#### 6. Setting and look
Garden stage. The tree at the centre, a den to the right (a brown half-buried sphere), a sun and clouds
in the sky, bushes and flowers around. Each season changes the look: spring: green tree, flowers pop up,
light rain; summer: big full green tree, sun high and bright; autumn: orange tree, leaves fall, wind;
winter: white (snowy) tree or bare trunk, snow falling, grey sky. The `fast-forward` button is a red sphere
on a grey block. Light `soft_day` throughout (a winter look comes from a grey cloud cover and white
confetti snow). Camera: the "tree spot", fixed, medium-wide, used at the start and end of every season.

#### 7. Storyline
| # | Chapter | Time | What happens | Teaching move | Emotional beat |
|---|---|---|---|---|---|
| 1 | The fast-forward button | 0:00–0:25 (25 s) | The button zooms the tree from green to orange; Robo stops it. Four seasons, one at a time. | Hook | Wow, then curiosity |
| 2 | Spring | 0:25–1:25 (60 s) | Weather: warmer, some rain showers. Buds and flowers pop up; the egg cracks and Chick hatches; Bear wakes. Robo's forecast: "Hot and sunny all day!" Kids: not quite, spring is mild and rainy. | Teach + show | Fresh, hopeful |
| 3 | Summer | 1:25–2:20 (55 s) | Weather: hot and sunny. The tree is full and green. The sun sits high and days are long; it is still light at bedtime in many places. Forecast: "Snow!" Kids: no! | Teach + show | Bright, playful |
| 4 | Autumn (fall) | 2:20–3:15 (55 s) | Weather: cooler and windy. Leaves turn yellow, orange and red and fall. Bear eats lots to get ready for winter. Forecast: "Beach day!" Kids: no, it's cool. | Teach + show | Cosy |
| 5 | Winter | 3:15–4:15 (60 s) | Weather: cold, maybe snowy. The tree is bare or snowy. Bear sleeps in his den. Frog explains frogs rest too. Days are short; it gets dark early. Forecast: "Flowers everywhere!" Kids: no. | Teach + show | Quiet and calm |
| 6 | Round and round | 4:15–5:00 (45 s) | The four seasons spin round as a circle of four pictures: after winter comes spring again. Days get longer, then shorter, then longer. A season sort: sunny beach day, snowman, falling leaves, flowers. | Show + try | "It goes round!" |
| 7 | Seasons quiz | 5:00–5:50 (50 s) | Five quiz questions (see section 14). | Quiz | Pride |
| 8 | Spring again | 5:50–6:15 (25 s) | Back to spring. Bear wakes and stretches. Robo finally gives a correct forecast ("Spring: mild and rainy!") and dances. Chant, confetti. | Recap | Payoff and joy |
| | **Total** | **6:15 (375 s)** | | | |

#### 8. Animation and staging list
| Moment | Objects | Actions | Camera |
|---|---|---|---|
| Fast-forward | `button` (red sphere on grey block), `tree_green`, `tree_orange`, clouds | `wiggle` button, `sound` windup_click then whoosh, clouds `move` fast across, `hide` tree_green / `show` tree_orange (dur 0.3), then swap back | Tree spot |
| Season tree swap | `tree_green` (leaf), `tree_full` (grass, size 1.5), `tree_orange` (orange), `tree_snow` (white) or `trunk` (brown cylinder) | `hide` one, `show` the next, all at the same spot, dur 0.8 | Tree spot |
| Spring rain | `rain` (confetti with blue and sky colours, slow) | `burst` rain (dur 4), `sound` bubble_pop softly | Wide |
| Flowers | `flower1`...`flower5` | `pop` each, `sound` sprout_spring | Low, close |
| Chick hatches | `egg`, `chick` | `wiggle` egg twice, `hide` egg, `pop` chick, `sound` squeak | Close |
| Bear wakes | `bear`, `den` | `wake` bear, `move` bear out of the den, `hop` | Medium |
| Forecast joke | `robo`, `forecast` letters ("SNOW!") | `clip` robo Wave, `pop` forecast word, kids' answer: `sound` boing, `hide` the word | Medium on Robo |
| Summer sun | `sun` | `move` sun high (y + 2), `grow` to 1.2 | Wide, tilt up |
| Long and short days | `sun`, `moon` | summer: sun stays up long, slow `move` across; winter: sun `move`s quickly down, `show` moon | Wide |
| Falling leaves | `leaf1`...`leaf8` (small orange, red and yellow `oval`s) | `drop` each from the tree to the ground (height 2, dur 1.4, sound footstep_soft at low volume), `turn` as they fall | Tree spot |
| Bear eats | `bear`, `apple` props | `move` apples to Bear, `hide` them, `nod` bear | Medium |
| Snow | `snow` (confetti, white and cream, slow dur 6) | `burst` snow (sound off or sparkle at volume 0.3) | Tree spot |
| Bear sleeps | `bear`, `den` | `move` bear into the den, `sleep` bear | Close |
| Season circle | four small trees or labels in a circle | `move` them into a ring, `spin` the ring once (dur 3) | Top-down-ish wide |
| Quiz | season pictures | `sound` windup_click 2–3 s, answer `grow` 1.3, `sound` ding | Medium |
| Finale | all, `party` confetti | `wake` bear, `clip` robo Dance, `burst` party | Tree spot |

#### 9. Experiment or hands-on activity
Activity: **Weather watch week**.
- Draw a chart with 7 boxes, one for each day. Each day, look outside and draw the weather: sun, cloud, rain,
  wind or snow. Add "hot", "warm", "cool" or "cold" by how it feels outside.
- Ask a grown-up to note what time it gets dark, once a week for a month. Is it getting earlier or later?
  (This shows the days getting longer or shorter.)
- Bonus: collect three leaves on a walk with a grown-up and compare their colours. Wash hands after.
- Prediction: "What will the weather be tomorrow?" Write a guess, then check.
- Safety: watch the weather from a window or with a grown-up outside. Never look straight at the sun. Stay
  indoors in storms and lightning.

#### 10. Interaction moments
- Call and response: Robo: "Spring, summer ..." Kids: "Autumn, winter!" (said at each season change).
- Fix Robo's forecast: four times, a 2–3 s `windup_click` pause before kids answer "No!".
- Pause and guess (2–3 s): "What will happen to the leaves?" before the autumn change.
- Move-along: act each season: spring sprout up from a crouch, summer fan yourself, autumn twirl like a leaf,
  winter shiver and hug yourself.

#### 11. Song or chant
**"Round the Year"**, original. A slow-then-bouncy circle chant, one line per season, with a whole-body
action. The hook idea: "Round and round, the seasons go" between each season line. It appears at the end of
each season chapter (that season's line), in full in chapter 6 while the season circle spins, and once more
in chapter 8.

#### 12. Fun fact(s)
- Leaves turn yellow and orange in autumn because the green colour fades away and the yellow and orange that
  were there all along can be seen. Shown in chapter 4.
- Snowflakes usually have six sides or six arms. Shown in chapter 5 with a six-pointed shape (a `star` is
  five-pointed, so show the fact as a caption only, or skip the picture).
- In summer there are more hours of daylight than in winter. Shown in chapter 3 and chapter 5.

#### 13. Vocabulary and captions
- Title: "Four Seasons Tree".
- Labels: season, spring, summer, autumn, fall, winter, weather, sunny, rainy, windy, snowy, cloudy, hot,
  warm, cool, cold, daylight.
- Subtitles for all voice lines. Show "autumn (fall)" together the first time.

#### 14. Quiz and recap
| # | Question | Answer |
|---|---|---|
| 1 | Which season comes after winter? | Spring |
| 2 | In which season do many trees lose their leaves? | Autumn (fall) |
| 3 | Snowy and cold: which season? | Winter |
| 4 | Which season has the longest days? | Summer |
| 5 | What does Bear do in winter? | Sleeps in his den |

Praise moment: the tree goes through all four looks in a gentle 4-second fast-forward, ending green; Bear
waves, confetti. Recap: "Spring, summer, autumn, winter, and round again."

#### 15. Sound and music
- Music: `calm` at musicGain 0.20 for spring and winter, `happy` at 0.24 for summer and autumn, `bouncy` at
  0.24 for the quiz.
- Voice: Robo `soft` 0.96; Bear `deep`; Frog and Chick `squeaky`.
- Effects: ch 1 windup_click, whoosh; ch 2 sprout_spring, bubble_pop (rain), squeak (chick); ch 3 sparkle;
  ch 4 whoosh (wind), footstep_soft (leaves); ch 5 crystal_chime (snow), soft snore-like laugh_small at
  volume 0.4; ch 6 magic_sparkle; ch 7 windup_click, ding; ch 8 crowd_cheer.

#### 16. Thumbnail and YouTube
- Thumbnail: the tree split down the middle, half green and half orange (two trees side by side, close
  together), Robo with the button and Frog (about 0:12).
- Title idea: "Four Seasons for Kids! Spring, Summer, Autumn, Winter | Toy Box Friends" (71 characters).
- Tags: four seasons, seasons for kids, spring summer fall winter, weather for kids, first grade science,
  grade 1 science, leaves changing, hibernation, kids learning video, 3D cartoon for kids, Toy Box Friends.

#### 17. Catalog gaps
| Gap | Stand-in from existing parts |
|---|---|
| Seasonal trees | Several `tree` props at the same spot with `color` overrides: leaf (spring), grass (summer), orange (autumn), white (snowy winter); a bare `cylinder` trunk for a leafless winter |
| Falling leaves | Small `oval`s in orange, red and yellow, dropped from the tree |
| Rain and snow | `confetti` objects with blue/sky or white/cream colours and a slow fall; gap note: true rain and snow particles would look better |
| Den | A brown `sphere` sunk half into the floor, with a dark `circle` as the door |
| Fast-forward button | Red `sphere` on a grey `block` |
| Grey winter sky | Extra `cloud` props in grey; a stage `background` override to `grey` if allowed |
| Snowflake picture | No six-pointed shape; use a caption only |

#### 18. Do and don't
- Do say "autumn, also called fall" once, then use either consistently.
- Don't explain why seasons happen (Earth's tilt is beyond grade 1). Never say summer happens because Earth
  is closer to the sun; that is a common misconception and wrong.
- Do say "in many places": seasons look different around the world, some places have no snow, and in the
  other half of the world the seasons come at the opposite time of year. Avoid naming months.
- Don't say every bear sleeps all winter without waking; say "many bears sleep through much of winter".
- Don't cover body habits (that is PK-16) or clothing lessons at length; one quick "wear a warm coat" line is
  fine.
- No thunder, no scary storms. Rain is gentle.
- Pacing: give each tree change 0.8 s and hold the new look for at least 3 s.

---
### G1-09 · Shadow Puppets and Humming Strings (light and sound)
**Grade 1 · Science experiment · 6:05 · studio with a dimmed look (theatre), playroom for the sound lab**
**Skills:** nonfiction_facts_1 · **Standard:** NGSS 1-PS4-1 (sound and vibration), 1-PS4-2 (seeing needs light), 1-PS4-3 (materials and light) (approximate)

#### 1. Big idea
A shadow is where something blocks the light, and every sound is made by something shaking very fast.

#### 2. Learning goals
- I can make a shadow by blocking light, and make it bigger by moving closer to the light.
- I can sort things into "light goes through", "some light goes through" and "blocks the light".
- I can show that sound comes from vibrations (a rubber band hums when it shakes).
- I can show that sound can make things move (rice dances on a drum).

#### 3. Hook (first 15 s)
The theatre lights dim. A white screen glows. A shadow appears: two long ears. "Who is it?" (pause with
windup_click). The shadow hops, and Bunny peeks round the screen. Next, a shadow with a wagging tail: Dog!
Robo: "How do shadows happen? And later ... how do sounds happen? Two shows today!"

#### 4. What makes it unique
A **two-act show**: Act 1 is light, Act 2 is sound, with a curtain-style "intermission" chime between them.
Two real experiments a child can redo at home: hand and toy shadows with a flashlight, and a rubber band
"guitar" plus **dancing rice** on a cling-film drum that jumps when a pan is tapped nearby, so kids see that
sound moves things.

#### 5. Cast and roles
| Who | Role in this episode |
|---|---|
| Robo | Host and stagehand. Holds the "flashlight" and runs both experiments; once moves the light the wrong way on purpose and asks kids what will happen. |
| Frog | Sidekick. Running joke: he tries to jump away from his own shadow, but it always stays stuck to his feet. Payoff: at the end he steps out of the light beam and the shadow disappears: "I did it!" (No light, no shadow.) |
| Bunny | Guest: the shadow puppet star with the long ears. Helps test near and far. |
| Dog | Guest: the sound star. Barks a short "woof" to show sound; holds the drum still for the rice test. |

#### 6. Setting and look
Act 1: studio stage with a large white rectangle screen at the back, a flashlight on a stand (a yellow
cylinder with a cone), the light shown as a soft pale cone. The theatre feel comes from a dark front
curtain (two tall red rectangles) that slide open. Act 2: playroom stage with a "sound lab" table: a box
guitar (an open box with three thin bands) and a drum (a cylinder with a white top and tiny white "rice"
spheres on it). Light `studio` for Act 1 (dim if possible), `soft_day` for Act 2. Camera: front-on to the
screen for shadows, close-up and slightly above the table for the rice. Mood: a magical show, gentle and
cosy, never spooky.

#### 7. Storyline
| # | Chapter | Time | What happens | Teaching move | Emotional beat |
|---|---|---|---|---|---|
| 1 | Guess the shadow | 0:00–0:25 (25 s) | Mystery shadows on the screen; Bunny, then Dog peek out. Two shows announced. | Hook | Guessing fun |
| 2 | How shadows happen | 0:25–1:15 (50 s) | Light travels in straight lines from the flashlight. When Bunny stands in the way, the light is blocked and a dark shape forms behind her: a shadow. Robo turns the light off: no light, no shadow. Frog jumps; his shadow sticks to his feet. | Teach | "Ohh!" |
| 3 | Shadow lab: bigger and smaller | 1:15–2:10 (55 s) | Predict, then test: Bunny walks closer to the light: shadow grows big. Walks closer to the screen: shadow gets small. Robo moves the light to the side: the shadow moves the other way. | Experiment | Wonder |
| 4 | See-through test | 2:10–2:55 (45 s) | Three things in front of the light: a clear cup (light goes through, almost no shadow), wax paper (some light gets through, a faint shadow), a cardboard square (blocks the light, a dark shadow). Intermission chime. | Experiment + sort | Clever feeling |
| 5 | Humming strings | 2:55–3:55 (60 s) | Act 2. Robo plucks a rubber band on the box guitar: it blurs as it shakes and hums. Put a finger on it: it stops shaking and the sound stops. A tight band sounds higher, a loose band lower. Kids hum with a hand on their throat and feel it buzz. | Experiment | Delight |
| 6 | Dancing rice | 3:55–4:45 (50 s) | Rice grains sit on a cling-film drum. Robo taps a pan nearby: the rice jumps! The sound travels through the air and makes the drum skin shake. Louder tap, bigger jump. Dog's bark makes the rice wiggle too. | Experiment | Surprise and giggles |
| 7 | Science quiz | 4:45–5:40 (55 s) | Five quiz questions (see section 14). | Quiz | Pride |
| 8 | Shadow bow | 5:40–6:05 (25 s) | Everyone bows on stage in the light; their shadows bow too. Frog steps out of the beam and his shadow vanishes: payoff. Chant, a soft star burst. | Recap | Payoff and warmth |
| | **Total** | **6:05 (365 s)** | | | |

#### 8. Animation and staging list
| Moment | Objects | Actions | Camera |
|---|---|---|---|
| Curtain opens | `curtain_l`, `curtain_r` (tall red rectangles) | `move` apart (dur 1.2), `sound` whoosh | Front, wide |
| Mystery shadow | `sh_bunny` (flat black silhouette made of an `oval` body and two `capsule` ears on the screen), `bunny` behind the screen | `show` silhouette, `hop` silhouette, `sound` windup_click (2–3 s), then `move` bunny out to the side, `nod` bunny | Front on the screen |
| Dog shadow | `sh_dog` (black `oval` + small `capsule` tail), `dog` | `show`, `wiggle` the tail part, then dog peeks out, `sound` squeak | Front |
| Light beam | `torch` (yellow `cylinder` + `cone`), `beam` (pale cream `cone`, low opacity material if available) | `show` beam; `hide` beam for "light off", and `hide` the silhouette at the same moment | Side view |
| Bigger and smaller | `bunny`, `sh_bunny` | bunny `move`s toward the torch while sh_bunny `grow`s to 1.8; bunny `move`s toward the screen while sh_bunny `grow`s to 0.8 | Side view, then front |
| Light moves | `torch`, `beam`, `sh_bunny` | `move` torch left, `move` sh_bunny right | Wide |
| See-through test | `cup` (clear/white `cylinder`), `wax` (cream `square`), `card` (brown `square`), silhouettes `sh_cup` (pale grey, faint), `sh_wax` (grey), `sh_card` (black) | each object `move`s into the beam, its silhouette `show`s, `caption` label ("light goes through", "some light", "blocks light") | Front |
| Intermission | stage | `sound` bell, `caption` style title "Act 2: Sound" | Wide |
| Box guitar | `guitar` (open `box`), `band1`...`band3` (thin grey `cylinder`s across the top) | pluck: `wiggle` band (deg 6, dur 0.8; motion only, no flashing), `sound` boing (low volume, as the hum), add small `torus` "sound rings" that `grow` outward and `hide` | Close, above |
| Stop the hum | `band1`, Robo's hand (just `clip` robo Standing near it) | `wiggle` stops early (short dur), sound stops | Close |
| Tight and loose | `band2` thicker (loose), `band3` thinner (tight) | `wiggle` each; caption label "high" / "low" | Close |
| Dancing rice | `drum` (`cylinder`, white `circle` top), `rice1`...`rice12` (tiny white `sphere`s or `capsule`s), `pan` (grey `cylinder`) | tap: `wiggle` pan, `sound` bell, then each rice `hop` (height 0.15, staggered by 0.03 s); a louder tap: hop height 0.35 | Close, slightly above |
| Dog's bark | `dog`, rice | `nod` dog, `sound` squeak or the bark voice, rice `hop` small | Two-shot |
| Quiz | screen and lab objects | `sound` windup_click 2–3 s, answer object `grow` 1.2, `sound` ding | Medium |
| Shadow bow | cast and silhouettes | `clip` robo Yes (as a bow), critters `nod`; Frog `move`s out of the beam and `hide` his silhouette, `sound` magic_sparkle | Front, wide |

#### 9. Experiment or hands-on activity
**Experiment 1: Shadow puppets (light).**
- You need: a flashlight, a plain wall or a white sheet, a small toy, your hands, a clear plastic cup, a sheet
  of baking or wax paper, a piece of cardboard.
- Steps: dim the room. Shine the flashlight at the wall. Put the toy between the light and the wall. Move
  the toy closer to the light, then closer to the wall. Make a bunny or a bird with your hands.
- Predict first: "Will the shadow get bigger or smaller when the toy moves closer to the light?"
- Result: closer to the light, bigger shadow; closer to the wall, smaller and sharper shadow.
- Then hold up the clear cup, the wax paper and the cardboard one at a time. Which one makes the darkest
  shadow? (The cardboard.)

**Experiment 2: Humming strings and dancing rice (sound).**
- Box guitar: stretch two or three rubber bands around an empty tissue box or an open shoebox. Pluck each
  one. Watch it shake and listen. Press a finger on it: the sound stops. Try a tight band and a loose band.
- Dancing rice: with a grown-up, stretch cling film tightly over a bowl and hold it with a rubber band. Put
  a pinch of dry rice on top. Hold a metal pan close by and tap it with a wooden spoon. Watch the rice jump.
- Predict: "Will the rice jump more for a soft tap or a loud tap?" Result: a louder tap makes bigger jumps.
- Bonus: hum with your hand on your throat. Feel the buzz (your vocal folds vibrating).

**Safety (shown on screen and said by Robo):** do it with a grown-up. Never shine a flashlight into
anyone's eyes and never look at the sun. Rubber bands can snap: keep them away from faces and don't stretch
them at people. Rice stays on the drum, never in ears, noses or mouths. Keep taps gentle and not too close to
anyone's ears.

#### 10. Interaction moments
- Pause and guess (2–3 s `windup_click`): "Who is the shadow?" twice in chapter 1.
- Predict before each test (chapters 3, 4, 6): "Bigger or smaller?", "Which shadow is darkest?", "Will the
  rice jump?", each with a 2–3 s pause.
- Move-along: make a bunny shadow with your hands; hum and touch your throat; clap softly then loudly.
- Call and response: Robo: "No light?" Kids: "No shadow!"

#### 11. Song or chant
**"Block the Light, Shake the Sound"**, original. Two halves with a different rhythm: a slow, smooth line
for light ("block the light, a shadow grows") and a quick buzzy line for sound ("shake, shake, hear it
hum"). The hook idea is the contrast. The light half appears at the end of Act 1 (after chapter 4), the
sound half after chapter 6, and both together in chapter 8.

#### 12. Fun fact(s)
- Light is so fast it could go around the Earth more than 7 times in one second. Shown in chapter 2.
- In space there is no air to carry sound, so space is silent. Shown in chapter 6 after the rice jumps.
- When you talk or hum, parts in your throat called vocal folds shake to make the sound. Shown in
  chapter 5.

#### 13. Vocabulary and captions
- Title: "Shadow Puppets and Humming Strings".
- Act titles: "Act 1: Light", "Act 2: Sound".
- Labels: light, shadow, block, light goes through, some light, blocks light, sound, vibrate, vibration,
  hum, high, low, loud, soft.
- Bonus words (small subtitle): transparent, translucent, opaque.

#### 14. Quiz and recap
| # | Question | Answer |
|---|---|---|
| 1 | What makes a shadow? | Something blocking the light |
| 2 | Bunny moves closer to the flashlight. Does her shadow get bigger or smaller? | Bigger |
| 3 | Which makes the darkest shadow: a clear cup, wax paper or cardboard? | Cardboard |
| 4 | What is the rubber band doing when it hums? | Shaking (vibrating) |
| 5 | Why did the rice jump? | The sound made the drum skin shake |

Praise moment: the curtain closes and opens again for a "curtain call", the cast bows, soft star burst.
Recap: "Block the light and you make a shadow. Shake something and you make a sound."

#### 15. Sound and music
- Music: `mysterious` at musicGain 0.18 for the shadow guessing (gentle, not spooky), `playful` at 0.22 for
  the experiments, music almost off (0.10) while listening to the band hum and the rice test.
- Voice: Robo `soft` 0.96; Bunny and Frog `squeaky`; Dog `bark` timbre, one short bark at normal volume.
- Effects: ch 1 whoosh (curtain), windup_click; ch 2 ooh; ch 3 slide_whistle (growing shadow); ch 4 bell
  (intermission); ch 5 boing (soft) as the band's hum; ch 6 bell (the pan tap, volume 0.7), giggle; ch 7
  windup_click, ding; ch 8 crowd_cheer, magic_sparkle.

#### 16. Thumbnail and YouTube
- Thumbnail: a big bunny shadow on the glowing screen with Bunny peeking round it, and rice mid-jump in a
  small inset area of the frame (about 1:50, the big-shadow moment).
- Title idea: "Light and Sound for Kids! Shadow Puppets and Dancing Rice | Toy Box Friends" (75 characters).
- Tags: light and sound, shadows for kids, sound vibrations, science experiments for kids, first grade
  science, grade 1 science, shadow puppets, dancing rice experiment, rubber band guitar, kids learning video,
  Toy Box Friends.

#### 17. Catalog gaps
| Gap | Stand-in from existing parts |
|---|---|
| A movable light (flashlight) that casts real shadows on a screen | The stage sun light casts shadows but cannot be moved in a script. Stand-in: flat black silhouettes on the screen that `grow`, `move` and `hide` with the story. Gap note: a `spotlight` object kind with position and on/off. |
| Light beam | Pale cream `cone`; a transparent or glowing material would be better (check materials.json) |
| Shadow silhouettes | Flat black `oval`, `capsule` and `circle` shapes against the white `rectangle` screen |
| Box guitar | Open `box` with thin grey `cylinder` bands |
| Drum with rice | `cylinder` with a white `circle` top and tiny white `sphere`s |
| Sound rings | `torus` shapes that `grow` and `hide` |
| Curtains | Tall red `rectangle`s |
| Dimmed theatre light | Studio stage with a darker background override (`charcoal`) if allowed |

#### 18. Do and don't
- Do say light travels in straight lines and a shadow forms where light is blocked. Don't say a shadow is
  "made of darkness" or is a reflection.
- Do say sound comes from vibration. Don't say sound is "air coming out".
- Don't let anything look scary: no monster shadows, no thunder, no sudden loud bangs. The pan tap is gentle.
- Do keep the rubber band shake as motion only; no flashing light faster than 3 Hz.
- Stay in lane: no colours of light, no rainbows, no mirrors, no echoes as a lesson.
- Do repeat the safety line before each home experiment, and show "with a grown-up" on screen.
- Pacing: give each prediction a full 2–3 s pause before the result.

---

### G1-10 · Town Rules and Good Citizens
**Grade 1 · Social studies · 6:05 · garden as Toy Town (houses, a road, a playground)**
**Skills:** rules_citizenship_1 · **Standard:** C3 Framework D2.Civ.3.K-2, D2.Civ.7.K-2, D2.Civ.8.K-2 (approximate)

#### 1. Big idea
Rules keep us safe and fair, and good citizens help, take turns and care for their town.

#### 2. Learning goals
- I can say why we have rules (to be safe, to be fair, to be kind).
- I can name a rule at home, a rule at school and a rule in town.
- I can describe how to cross a street safely with a grown-up.
- I can say what a good citizen does, and how a group can vote to choose.

#### 3. Hook (first 15 s)
"What if there were no rules?" Robo, Mayor for a Day of Toy Town, reads a funny sign: "NO-RULES DAY!" At
once: everyone talks at the same time (a jumble of squeaks), balls bounce everywhere, the slide has a pile-up
of animals all trying to go first, and a bin tips over. Nobody is hurt, just a big silly muddle. Robo:
"Hmm. Maybe rules are a good idea!"

#### 4. What makes it unique
A **real vote**. In chapter 6 the animals vote on a new playground rule: Frog's "Everyone must hop
everywhere" against Dog's "Take turns on the slide". Each animal hops once to cast a vote and the votes are
counted out loud. Take turns wins 5 to 1, and Frog is a good sport about losing, which is part of being a
good citizen. The "what if" opening with a harmless muddle is also unique to this episode.

#### 5. Cast and roles
| Who | Role in this episode |
|---|---|
| Robo | Mayor for a Day and host. Starts the No-Rules Day as a silly experiment and learns from it. |
| Frog | Sidekick. Running joke: he keeps suggesting "Everyone must hop everywhere!" as a town rule (for the library, the road, bedtime). Payoff: his rule loses the vote 5 to 1; he says "That's fair. I can still hop at playtime!" |
| Dog | Guest: the crossing guard. Teaches stop, look, listen at the crosswalk and proposes the slide rule. |
| Sheep | Guest: the librarian. Shows the quiet rule in the library ("We use quiet voices so everyone can read"). |
| Bunny, Cow, Duck | Townsfolk and voters (no lines needed, or one each). |

#### 6. Setting and look
Garden stage as Toy Town: three or four house props (a home, a school, a library with a letter sign), a
road (a long charcoal rectangle) with white crosswalk stripes, a traffic light (a black block with red,
yellow and green spheres), a playground with a slide (a sloped block and a ladder of thin blocks), a bin
(a green cylinder), trees and flowers. A rules board (a cream rectangle) in the town square. Light
`soft_day`. Camera: wide town shots between chapters, medium on each place. Mood: friendly, busy, a
community where everyone matters.

#### 7. Storyline
| # | Chapter | Time | What happens | Teaching move | Emotional beat |
|---|---|---|---|---|---|
| 1 | No-Rules Day | 0:00–0:30 (30 s) | The sign goes up; the silly muddle happens; Robo takes the sign down. | Hook | Laughter, then "uh-oh" |
| 2 | Why we have rules | 0:30–1:20 (50 s) | The rules board: rules keep us safe, keep things fair, and help us be kind. Replay one muddle moment with a rule: one at a time on the slide. It works. | Teach | Relief |
| 3 | Rules here, there, everywhere | 1:20–2:15 (55 s) | Home: put toys away (Bunny tidies up). School: raise your hand to talk. Library: use quiet voices (Sheep). Town: put litter in the bin. Frog suggests "hop everywhere" at the library; Sheep: "Shh, not here!" | Show | Recognition |
| 4 | Crossing the street | 2:15–3:00 (45 s) | Dog the crossing guard: hold a grown-up's hand, stop at the edge, look both ways and listen, wait for the green walking signal, keep looking as you cross. The traffic light: red stop, yellow slow down, green go. | Teach + try | Careful, proud |
| 5 | Good citizens | 3:00–3:55 (55 s) | What good citizens do: help (Cow carries a bag for Duck), share (two friends share a ball), take turns, clean up (everyone picks up the tipped bin's litter), care for the park (water the flowers). Kids give a thumbs up for each good choice and a thumbs down for a not-so-good one. | Show + try | Warm |
| 6 | The big vote | 3:55–4:50 (55 s) | Two ideas for a new playground rule. Each of the six animals hops to vote. Count: take turns 5, hop everywhere 1. Take turns wins. Frog is a good sport. | Try together | Suspense, then cheering |
| 7 | Citizen quiz | 4:50–5:40 (50 s) | Five quiz questions (see section 14). | Quiz | Pride |
| 8 | Town party | 5:40–6:05 (25 s) | The new rule goes on the board. Everyone takes turns on the slide; Frog hops happily at playtime. Chant and confetti. | Recap | Joy |
| | **Total** | **6:05 (365 s)** | | | |

#### 8. Animation and staging list
| Moment | Objects | Actions | Camera |
|---|---|---|---|
| No-Rules sign | `sign` letters "NO RULES DAY" on a cream rectangle | `pop` sign, `sound` pop | Medium on the square |
| Talking all at once | `bunny`, `cow`, `duck`, `sheep`, `dog` | each `nod` and `wiggle` at overlapping times, `sound` squeak and giggle stacked, `sound` laugh_small | Wide |
| Bouncing balls | `ball1`...`ball5` | `hop` and `move` in different directions, `sound` boing | Wide |
| Slide pile-up | `slide` (sloped block), critters | three critters `move` to the slide top together, `wiggle`, then gently `move` down in a soft pile, `sound` slide_whistle | Medium |
| Bin tips | `bin` (green cylinder), `litter` (small paper-like cream `square`s) | `turn` bin 80° onto its side, litter `drop` around it | Close |
| Sign down | `sign` | `hide`, `clip` robo No then Yes | Medium |
| Rules board | `board`, letters "SAFE", "FAIR", "KIND" | `pop` each word, `sound` ding | Close |
| Places | `home`, `school`, `library` houses with letter signs | `camera` glides from place to place; each house `hop`s as it is named | Medium |
| Library shh | `sheep`, `frog` | `hop` frog, `turn` `sheep#head` to Frog, `nod` sheep | Two-shot |
| Crosswalk | `road` (charcoal rectangle), `stripe1`...`stripe5` (white rectangles), `tlight` (black block), `red`, `yellow`, `green` (spheres), `dog`, `bunny` | `grow` each light 1.2 in turn (red, yellow, green; one change every 2 s, no flashing), `turn` `bunny#head` left, right, left; `move` bunny and dog across together | Medium, from the side of the road |
| Good choices | props: `gift` (bag), `ball`, `flower`, litter | `move` gift from Duck to Cow, `move` ball between two friends, litter `move`s into the bin and `hide`s, flowers `pop`; `sound` ding for each | Medium |
| Thumbs | `robo` | `clip` robo ThumbsUp or No | Close |
| The vote | `vote_a` letters "TAKE TURNS", `vote_b` letters "HOP EVERYWHERE", six voters | each voter `move`s in front of their choice and `hop`s; `caption` style count 1 to 5 for take turns, 1 for hop | Wide, then close on the counts |
| Good sport | `frog` | `nod` frog, `hop`, `clip` robo ThumbsUp | Close |
| Town party | `party` confetti, slide | critters `move` down the slide one at a time, `burst` party, `clip` robo Dance | Wide |

#### 9. Experiment or hands-on activity
Activity: **Family rules poster** and **a family vote**.
- With a grown-up, talk about three rules at home and draw them on a poster: one for safety, one for
  fairness, one for kindness. Put it where everyone can see it.
- Hold a family vote on something small (which story to read tonight, or which game to play). Each person
  gets one vote. Count the votes with tally marks. The choice with more votes wins, and everyone is a good
  sport.
- Good citizen challenge: do one helpful thing this week (pick up litter with gloves and a grown-up, help
  set the table, share a toy). Draw it.
- Prediction: "Which idea will win the vote?" Result: count and see.
- Safety: practise crossing the street only with a grown-up holding your hand. Wear gloves or use a picker
  for litter and wash hands after.

#### 10. Interaction moments
- Call and response: Robo: "Rules keep us ..." Kids: "Safe, fair and kind!"
- Thumbs up or thumbs down for each choice in chapter 5, with a 2 s `windup_click` pause each.
- Pause and guess (2–3 s): "Which rule will win?" before the vote count.
- Move-along: practise "stop, look, listen" with the body: hands up to stop, turn the head left and right,
  hand to the ear.

#### 11. Song or chant
**"Safe, Fair, Kind"**, original. A marching chant with three stomps. The hook idea: three strong words,
each with a stomp, then a short "that's how our town works" line. A second verse is the crosswalk chant:
"stop, look, listen" with the body actions. It appears after chapter 2 (hook), after chapter 4 (crosswalk
verse) and in full at the town party.

#### 12. Fun fact(s)
- The first traffic light was put up in London in 1868, and it was lit with gas. Shown in chapter 4.
- In many places, grown-ups vote in secret, so nobody else sees their choice. Shown in chapter 6.
- A librarian helps people find books and information, and many libraries let you borrow books for free.
  Shown in chapter 3.

#### 13. Vocabulary and captions
- Title: "Town Rules and Good Citizens".
- Labels: rule, safe, fair, kind, citizen, good citizen, community, take turns, share, help, vote, crosswalk,
  stop, look, listen.
- Count style: the vote counts.
- Board words: SAFE, FAIR, KIND, TAKE TURNS.

#### 14. Quiz and recap
| # | Question | Answer |
|---|---|---|
| 1 | Why do we have rules? | To keep us safe, to be fair and to be kind |
| 2 | Name a library rule. | Use a quiet voice (or look after the books) |
| 3 | What do you do before crossing the street? | Hold a grown-up's hand, stop, look both ways and listen |
| 4 | Duck sees litter in the park. What does a good citizen do? | Put it in the bin (with a grown-up, or tell a grown-up) |
| 5 | Take turns got 5 votes and hop everywhere got 1. Which rule won? | Take turns |

Praise moment: the rules board lights up with "GOOD CITIZENS!" as a title, all the animals hop in a row,
confetti. Recap: "Rules keep us safe, fair and kind, and good citizens help their town."

#### 15. Sound and music
- Music: `bouncy` at musicGain 0.24; `playful` for the muddle; music low (0.15) during the vote count so each
  count is clear; `triumphant` at 0.24 for the town party.
- Voice: Robo `soft` 0.97; Dog `bark` timbre for short lines; Sheep `soft` and quiet; Frog `squeaky`.
- Effects: ch 1 pop, boing, slide_whistle, squeak, giggle; ch 2 ding; ch 3 footstep_soft, bubble_pop; ch 4
  robot_beep for each light change (soft); ch 5 ding per good choice; ch 6 block per vote hop, windup_click
  before the result, crowd_cheer; ch 7 windup_click, ding; ch 8 magic_sparkle, crowd_cheer.

#### 16. Thumbnail and YouTube
- Thumbnail: the vote moment, five animals lined up behind "TAKE TURNS" and Frog alone behind "HOP
  EVERYWHERE", Robo in the middle (about 4:30).
- Title idea: "Rules and Good Citizens for Kids! Toy Town Votes | Toy Box Friends" (66 characters).
- Tags: rules for kids, good citizens, citizenship for kids, community, first grade social studies, grade 1
  social studies, crossing the street safely, voting for kids, being kind, kids learning video, Toy Box
  Friends.

#### 17. Catalog gaps
| Gap | Stand-in from existing parts |
|---|---|
| Traffic light | Black `block` with red, yellow and green `sphere`s; a "lit" light is shown by `grow` (no emissive change needed) |
| Walking signal | A small black `block` with a green `letter` "WALK" |
| Road and crosswalk | Long charcoal `rectangle` with white `rectangle` stripes |
| Slide | A sloped `block` (turned about 30°) with thin `block` steps |
| Bin and litter | Green `cylinder`; small cream `square`s as paper litter |
| Signs and rules board | Cream `rectangle`s with `letter` words (each up to 12 characters, so "HOP EVERYWHERE" needs two lines: "HOP" and "EVERYWHERE") |
| Shopping bag | `gift` prop |

#### 18. Do and don't
- Do keep the No-Rules Day muddle harmless and funny: no one gets hurt, cries or is in danger. No cars on the
  road during the muddle.
- Do say "look both ways and keep looking" rather than "look left first": traffic drives on different sides
  in different countries.
- Do always show a grown-up (Robo or Dog) with a young animal at the crosswalk.
- Don't make it about real politicians, parties, police or laws of a real country. Keep "voting" to a
  friendly group choice.
- Don't cover community helpers' jobs at length (community_helpers_k is reserve); Dog and Sheep each have one
  short job line.
- Show that losing a vote is okay and that the group's choice is respected.
- Pacing: count each vote with a full beat (about 0.8 s) so kids can count along.
