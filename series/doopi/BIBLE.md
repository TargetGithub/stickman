# Doopi & Friends: series bible

Status: **draft for Sridhar's review** (2026-10-18). Nothing here is final until reviewed. Episode outlines: [EPISODES.md](EPISODES.md). Assets to create first: [ASSETS.md](ASSETS.md).

Decisions taken with Sridhar:
- The name clash is resolved: **Dony** is Doopi's best friend. Peepa's two mini sidekicks are **Tony & Kony**.
- **Becky is a real four-legged dog.** She needs a new quadruped rig (ASSETS.md, item R1), so it is the first thing to build.

## 1. The show in one line

> When horned Peepa steals the seven Rainbow Crystals and Tokyo starts turning grey, clumsy, kind-hearted Doopi and his friends set out to bring the colours home, and learn that the strongest power is the one friends share.

| | |
|---|---|
| Format | 24 episodes, about 5 minutes each (5:00-6:00; the engine minimum for stories is 300 s). Landscape 16:9. |
| Audience | Kids 4-10 (YouTube "made for kids"); `meta.audience: "kids"` in every script. |
| Genre | Comedy-adventure with kung-fu action: a hero's journey with training, friendship, a villain ladder and a big finale. |
| Inspirations | Kung Fu Panda (the unlikely hero, a funny tough mentor, believing in yourself), Motu Patlu (comic duo, slapstick, a village full of characters), Chhota Bheem (a hero who protects the village, villain lieutenants, festivals). Everything here is original: no names, looks or catchphrases taken from them. |
| Language | On-screen text in simple English (short bubbles, at most 40 characters each). Speech is the engine's babble voices, so the show also works for non-English viewers. |

## 2. The theme

**"Friends make you strong."** Every episode tests it from a new side:

- Doopi's power, the **Heart Glow**, gets brighter when his friends are near and laughing, and fades when he is alone or tries to be a hero by himself.
- Peepa believes the opposite: that being feared and alone is power. He steals colour and laughter because, as a horned little kid, he was laughed at, and he decided no one should laugh again.
- The series answers him: Doopi wins the last fight only when every friend he made on the journey stands with him, and the final colour comes back when Doopi offers Peepa friendship.

Lessons the episodes carry, one per episode (stated by a narration line at the end): trying again, teamwork, honesty, sharing, courage, believing in yourself, forgiving, laughing at your own mistakes, kindness to people who were unkind.

## 3. The world

### Tokyo
A cheerful hill village in the **Valley of Colours**: round huts with bright doors, a market of sweets and kites, a dusty training ground, and in the middle the **Rainbow Banyan**, a giant old tree whose roots hold seven glowing **Rainbow Crystals**. The crystals keep the valley's colours bright and its people laughing.

### The Rainbow Crystals (the MacGuffin)
Seven crystals, one per colour. Peepa steals them in episode 2 and gives one to each of his lieutenants. Each one the heroes win back brings that colour back to Tokyo and slots into Doopi's **Rainbow Bracelet** (a gift from Nani Nimbu in episode 3), so the audience can count progress.

| Crystal | Held by | Won back in | What comes back |
|---|---|---|---|
| Red | Thunda | Ep 4 | Red flowers, the red doors of Tokyo |
| Yellow | Tony & Kony | Ep 5 | Sunshine, and Mooka's giggle |
| Orange | Madam Mirchi | Ep 8 | Sunsets, oranges, marigolds |
| Blue | Captain Kanta | Ep 11 | The sky and the lake |
| Green | Iron Ghoom | Ep 15 | Trees and grass |
| Indigo | Shadow Doopi | Ep 18 | The night sky and stars |
| Violet | Peepa (inside his Gloom Horn) | Ep 24 | Everything, all at once |

### The ticking clock
Nani Nimbu's legend: if the crystals are not home by the night of the **Grey Moon**, the valley stays grey forever. Narration counts down the nights (40 nights at the start, about 12 by episode 8, 5 by episode 15, the Grey Moon rises in episode 20).

### Look of the world (how it uses the engine)
- **Colour drains as stakes rise.** Each episode sets how grey Tokyo is (the `desaturate` world command today; ASSETS.md item E3 asks for a per-scene grade). Episode 1 is full colour; after episode 2 the valley is mostly grey and gets colour back crystal by crystal; episodes 20-23 are almost black and white; episode 24 bursts back into full colour.
- Times of day and weather do mood work: the cliffhangers are mostly dusk or night, the comedy mostly day.
- No blood, no gore, no weapons aimed at anyone who cannot fight back. Hits are cartoon (POW!, BONK!), losers are KO'd with stars, captured with rope or a cage, or flee. Friends who are "lost" are frozen grey or carried off, never gone for good, and always come back.

## 4. Characters

Engine notes use today's names (body plans, appearance options, voices) where they exist; anything marked **NEW** is in ASSETS.md.

### Heroes

#### Doopi (hero)
- **Look:** a classic stickman in sky blue (`#5ec8ff`; first drafted as `#3fb8ff`, which is too dark on the park), spiky hair, a red headband with long tails, big eyes, a cartoon mouth. From episode 3 he wears the Rainbow Bracelet (**NEW**) on his left wrist; its slots light up as crystals come home. `body: stickman`, `appearance: { eyes: big, hair: spiky, mouthStyle: cartoon, accessories: { headband: "#ff3b5c" } }`.
- **Personality:** big-hearted, brave, hungry (jalebis are his favourite), very clumsy. Trips over his own feet, talks before thinking, never gives up on a friend. Funny because he tries too hard; heroic because he never stops trying.
- **Powers:** grows across the series. Ep 1-2 none (just heart). Ep 3 the Heart Glow wakes (a golden aura when his friends cheer). Learns from Nani: the **Jalebi Spin** (spinning kick, ep 3), the **Banyan Root Stance** (unbreakable block, ep 8), the **Rainbow Punch** (ep 15), and in the finale the **Friendship Blast**, a full rainbow energy blast that only works with everyone cheering (ep 23-24).
- **Weakness:** trying to do it alone. Each time he does, he loses (ep 4 round 1, ep 13, ep 20).
- **Voice:** `pitch 1.0, speed 1.05, timbre soft`. Catchphrase: "Doopi never gives up!"

#### Dony (best friend)
- **Look:** a slightly shorter stickman in leaf green (`#4cd964`), a yellow cap, a scarf. `body: kid` with `scale 1.1`, `hair: cap`, `accessories: { scarf: "#ffcc00" }`.
- **Personality:** loyal, caring, a bit of a worrier, the first to share his food. He plays games with Doopi, laughs at his jokes, and picks him up when he falls. About half as strong as Doopi, and never lets that stop him.
- **Role in the arc:** proves that courage isn't strength: he saves Doopi in ep 8, is kidnapped in ep 6 and pulled into the mirror in ep 17, and takes a hit for Doopi in the finale (ep 22: knocked out, back on his feet in ep 23).
- **Voice:** `pitch 1.15, speed 1.0, timbre soft`. Catchphrase: "I've got you, buddy!"

#### Doomi (Doopi's sweetheart)
- **Look:** a stickman in pink (`#ff7eb6`), a ponytail with a flower clip (**NEW** accessory `hair_flower`), blush cheeks, big eyes, a little shirt. `body: stickman`, `appearance: { eyes: big, hair: ponytail, hairColor: "#5a3a2c", cheeks: "#ff9db8", outfit: shirt, outfitColor: "#ffd1e3" }`.
- **Personality:** lovable and charming, clever and quick; the planner of the team and the best at puzzles and traps. Kind to everyone, even the villains' sidekicks. Not a damsel: when she is captured (ep 12-19) she escapes her cell twice and leaves a trail of ribbons for the heroes.
- **Romance (kids level):** shy smiles, blushing, hearts over heads, holding hands, one dance at the festival. Doopi gets tongue-tied around her: a running gag.
- **Skill:** ribbon twirls and rope tricks (the `rope` holdable), gymnastic flips (`backflip`, `frontflip`).
- **Voice:** `pitch 1.35, speed 1.0, timbre soft`. Catchphrase: "I have a plan!"

#### Becky (small dog)
- **Look:** a small four-legged puppy, cream with a brown patch over one eye, floppy ears, a wagging tail, a red collar with a bell. **NEW quadruped rig** (ASSETS.md R1). About knee-high to Doopi.
- **Personality:** brave beyond her size, curious, a super sniffer. Barks at danger before anyone else sees it. Loves Mooka (they play chase), suspicious of Tony & Kony.
- **Skills:** sniffs out crystals and trails, digs, carries things in her mouth (a rope, a key), tugs, swims (ep 11 she rescues Doopi from the lake), bites onto villains' capes and pants (comic, no harm).
- **Voice:** barks and whimpers (**NEW** SFX), no speech bubbles; thought bubbles with pictures or "?!" for comedy.

#### Mooka (the little one)
- **Look:** an original round jelly-bean creature, **mint green** (`#7fe8c4`) with a lavender belly patch, two big round eyes (no goggles), a little leaf sprout on top instead of hair (**NEW** accessory `sprout`), orange mitten hands, stubby legs, tiny dungaree-free belly button. `body: buddy`, `scale 0.85`, `appearance: { eyes: big, mouthStyle: cartoon, cheeks: "#ffb3c7" }`.
  - **Must stay original:** never yellow, no goggles, no overalls (the trademark note in STORY_SPEC section 6.1). Mooka is green, round and leafy.
- **Personality:** innocent like a small child, funny, playful and charming. Copies whatever the others do (badly), giggles at everything, eats anything shiny, falls asleep at the worst moments, and sometimes says exactly the wise thing by accident.
- **Speech:** only "Mooka!", "Ooh!", "Bana-na-na!" style babble; one-word bubbles. His laugh is a plot point: Peepa steals it in ep 2 (Mooka goes grey and silent) and it comes back with the Yellow crystal in ep 5.
- **Role:** the heart of the comedy; befriends Kony (ep 5 and 10), which later turns Tony & Kony to the good side (ep 21).
- **Voice:** `pitch 1.9, speed 1.3, timbre squeaky`.

#### Nani Nimbu (mentor)
- **Look:** a tiny old granny, stooped, white bun (**NEW** hair style `bun`), round glasses, a purple shawl, a walking cane she spins like a staff. `body: elder`, `scale 0.9`, `prop: cane`.
- **Personality:** sharp, funny, strict, sweet underneath. Gives impossible chores that turn out to be kung-fu lessons ("Carry the water without spilling... now carry it upside down"). Sneaks jalebis.
- **Role:** trains Doopi (ep 3), is frozen grey shielding the children in ep 5, appears in a glowing dream in ep 14, wakes in ep 24.
- **Voice:** `pitch 1.1, speed 0.85, timbre soft`. Catchphrase: "The strongest root holds the whole tree."

#### Mayor Motumal (comic village head)
- **Look:** round and bulky, a big moustache (**NEW** accessory `moustache`), a turban-style hat, an orange coat. `body: bulky`, `outfit: coat`.
- **Personality:** pompous, kind, scared of everything, always has a speech ready, always gets interrupted. Leads the villagers in the ep 15 and 22 battles (bravely, by accident).
- **Voice:** `pitch 0.75, speed 0.9, timbre deep`.

### Allies met on the journey

| Ally | First seen | Look (engine) | Who they are | Returns |
|---|---|---|---|---|
| **Tara Treetop** | Ep 6 | `kid`, orange, ponytail, green scarf; swings on vines | A forest girl who knows every path in the Whispering Forest; brave and bossy | Ep 7-8, 15, 22-24 |
| **Mallu Uncle** | Ep 9 | `elder`, brown, cap, white beard (**NEW** `beard`) | The lake boatman with a rowboat (**NEW** object); tells awful jokes | Ep 10-12, 22-24 |
| **Ghoomu** (Iron Ghoom reformed) | Ep 15 | Iron Ghoom without the control key: friendly robot | Carries the team up Grey Peak; gentle, says "BEEP" sadly when he can't help | Ep 16-24 |
| **Tony & Kony** (turned good) | Ep 21 | as below | Switch sides in the finale thanks to Mooka's kindness | Ep 21-24 |
| Villagers of Tokyo | Ep 1 | extras and a few named kids (`kid`) | Cheer, gasp, flee, and finally fight for their village | Throughout |

### Villains

#### Peepa (main villain)
- **Look:** tall and thin, dark violet (`#7b4bd8`), two curly golden **horns** (**NEW** accessory `horns`), oval glowing eyes, thick angry brows, a long dark cape, a smirk. Carries the **Gloom Horn** (**NEW** holdable), a curled horn trumpet that blows grey mist and drains colour. `body: slim`, `scale 1.15`, `appearance: { eyes: oval, brows: thick, accessories: { horns: "#e6b84a", cape: "#2a1b3d" } }`.
- **Personality:** dramatic, vain, sarcastic, secretly lonely. Talks to himself, gives himself titles ("Peepa the Grey, Lord of Gloom"), hates laughter, loves his own echo. Funny to kids, scary enough to make the stakes real.
- **Powers:** the Gloom Horn (grey mist: freezes friends grey, which can be undone), Gloom Blasts (purple energy), shadow-teleport (`teleport`), and in the finale **Giant Peepa** (scale 3, aura, after absorbing six crystals, ep 20-24).
- **Backstory (revealed ep 20):** a horned little boy laughed at by other kids, who decided the world would be better grey and silent. He is not forgiven for what he did, but he is offered a way back.
- **Ending (kids rules):** defeated and **captured** (rope, then a cage) in ep 24; his Violet tear restores the last colour when Doopi offers friendship. He stays in the cage at the end, sweeping it, almost smiling: hopeful, not cured.
- **Voice:** `pitch 0.7, speed 0.95, timbre deep`. Catchphrase: "Grey is the new everything!"

#### Tony & Kony (Peepa's mini boys)
- **Look:** two tiny boys, almost twins. Tony in grey with a red cap; Kony in grey with a blue cap turned backwards; both with tiny stub horns stuck on with glue (**NEW** accessory `stub_horns`, they fall off as a gag). `body: kid`, `scale 0.8`.
- **Personality:** funny, boastful, cowardly, always side with Peepa ("Yes boss! Whatever boss said!"), always mess up the plan. Tony is bossy, Kony is softer and a bit kind.
- **Arc:** comic henchmen (ep 1-20), carry the Yellow crystal (ep 5), crew on the pirate ship (ep 9-10), gatekeepers of Gloom Castle (ep 19). Kony's friendship with Mooka grows; in ep 21 they free Doomi and switch sides. They help in the final battle.
- **Voices:** Tony `pitch 1.6, timbre squeaky, speed 1.2`; Kony `pitch 1.7, timbre squeaky, speed 1.1`.

#### The villain ladder (bosses before Peepa)
Each boss is harder than the last, guards one crystal, and has a weakness the team must work out together.

| # | Boss | Episodes | Look (engine) | Fighting style | Weakness / how they're beaten | Ending |
|---|---|---|---|---|---|---|
| 1 | **Thunda** the wrestler-bandit | 3 (tease), 4 | `bulky`, `scale 1.5`, brown-red, big moustache, armor outfit, the Red crystal on his belt | Slams, ground pounds, grabs; very strong, very slow | Gets dizzy when he spins; Doopi's Jalebi Spin makes him spin himself out, Doomi's rope trips him | KO'd, then captured (rope); the village keeps him sweeping the market |
| 2 | **Madam Mirchi** the spice sorceress | 6 (tease), 7, 8 | `slim`, red-orange, a chilli-shaped hat (**NEW** `chilli_hat`), robe | Chilli smoke clouds (everyone sneezes and cries funny tears), spinning ladle (staff moves), quick dodges | She can't stand sweet things: Mooka's jalebi stash makes her sneeze herself out | Flees on her broom-ladle, swearing revenge (returns in ep 22 on Peepa's side, flees again) |
| 3 | **Captain Kanta** the lake pirate | 8 (tease), 9, 10, 11 | `stickman`, navy, pirate hat (**NEW** `pirate_hat`), eyepatch, coat, a plastic toy cutlass (sword moves) | Sword moves, swinging attacks, sneaky tricks; fights on a rocking deck | Scared of puppies (Becky!); can't swim | Captured in a fishing net (`captured`), handed to the lake guards |
| 4 | **Iron Ghoom** Peepa's iron giant | 11 (tease), 12, 13, 14, 15 | **NEW** `robot` body plan, `scale 2.4`, grey metal, visor eyes, a big wind-up key on his back | Stomps, iron fist (ground_pound), energy blast from the visor; nearly unbeatable head-on | The wind-up key on his back: whoever pulls it frees him from Peepa's control | Freed, not defeated: becomes the friendly ally **Ghoomu** |
| 5 | **Shadow Doopi** | 16 (tease), 17, 18 | Doopi's shape in dark indigo with glowing purple eyes, translucent edges (**NEW** "shadow" look) | Copies every move Doopi makes, at the same moment | Can't copy laughter: when Doopi laughs at his own clumsiness, the shadow can't follow and fades in sparkles | Vanishes in sparkles (`vanish`); it was only Doopi's doubt |
| 6 | **Peepa** | 1-24 (seen), 20, 22-24 (fights) | above; Giant Peepa from ep 20 | Gloom Horn, Gloom Blasts, teleports, giant stomps; three phases in the finale | Can only be beaten when Doopi and all his friends stand together (the Friendship Blast) | Captured (rope + cage), offered friendship |

#### Grey Goons (Peepa's army)
Faceless, grey, slightly see-through stickmen with tiny horns, made from Gloom mist. Funny and harmless-looking; they pop into grey puffs when beaten (`vanish` style). They let the series have big brawls (ep 15, 19, 22) without hurting any real person. `body: stickman`, grey (`#8a8a99`), `appearance: { eyes: dot, accessories: { stub_horns: "#5a5a66" } }`; in crowds they are `extras` (**NEW** extras behavior `fight_back` would help; optional).

## 5. Series arc

Four acts of six episodes. Each act ends on a bigger cliffhanger than the last.

| Act | Episodes | Title | What happens | Peak |
|---|---|---|---|---|
| 1 | 1-6 | **The Grey Begins** | Meet Tokyo and the gang; Peepa steals the crystals; Doopi trains with Nani; the first boss (Thunda) and the comic Tony & Kony episode; Nani is frozen grey; the friends leave home | Nani frozen (ep 5), Dony kidnapped (ep 6) |
| 2 | 7-12 | **The Road of Colours** | Madam Mirchi's spice fort; Lotus Lake and Captain Kanta's pirates; a half-colour festival back home | Iron Ghoom carries Doomi away (ep 12, midpoint) |
| 3 | 13-18 | **Iron and Shadow** | Doopi tries to win alone and loses his glow; learns friendship is the power; the battle for Tokyo and Ghoomu's rescue; the climb up Grey Peak; Shadow Doopi and the Mirror Maze | Gloom Castle and the Grey Moon rising (ep 18) |
| 4 | 19-24 | **The Last Colour** | Storming Gloom Castle; Peepa's story; Giant Peepa takes the crystals and the world goes grey; Tony & Kony switch sides; the three-part final battle; colours come home | The do-or-die fight inside the Grey Moon (ep 23-24) |

### Rising intensity (planned)
Intensity 1-10 drives the fight macros' `intensity`, music moods and how grey the world is.

| Ep | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Intensity | 2 | 4 | 3 | 5 | 4 | 5 | 5 | 6 | 5 | 6 | 7 | 7 | 7 | 6 | 8 | 7 | 8 | 8 | 8 | 9 | 7 | 9 | 10 | 10 |
| Colour left | 100% | 10% | 10% | 25% | 35% | 35% | 35% | 45% | 45% | 45% | 55% | 55% | 55% | 55% | 70% | 70% | 70% | 85% | 85% | 0% | 0% | 0% | 0% | 100% |

The dips (ep 3, 5, 9, 14, 21) are deliberate breathers: training, comedy and heart episodes, so the climbs feel bigger.

### Cliffhanger styles (rotated so they don't get repetitive)
1. A villain reveal (a shadow, a laugh, eyes in the dark).
2. A friend in danger (taken, frozen, falling).
3. A ticking clock (the Grey Moon, a closing door, a charging blast).
4. A twist (the crystal shows a vision, a friend's secret, a look-alike).
5. A hero at his lowest (power gone, alone).

Every episode starts with a 10-15 s "Last time..." narration recap and ends with an end card "To be continued..." (except ep 24: "The End").

## 6. Episode format (template for every script)

A 5:00-6:00 episode is 11-15 scenes. The engine counts the story clock; cards add a little video time.

| Part | Length | Engine |
|---|---|---|
| Cold open: "Last time..." recap (from ep 2) | 10-15 s | `narrate` over a wide shot of the last cliffhanger place |
| Title card | 3 s | `transitionIn: { type: "card", kind: "title", title: "Doopi & Friends", subtitle: "Ep N: <title>" }` |
| Setup (comedy, slice of life, the problem) | 60-90 s | `@dialogue`, `@activity`, slice-of-life moves |
| Rising action (journey, plan, first try) | 90-120 s | `@travel`, `@chase`, `@montage`, small fights |
| Big moment (boss fight, rescue, reveal) | 60-120 s | `@fight` with phases, `@gauntlet`, `@brawl`, `@defeat` |
| Small win and the lesson | 20-30 s | `narrate`, `hug`, `high_five`, `cheer` |
| Cliffhanger | 15-30 s | `set_time` to dusk or night, `set_music` tense or boss, a close-up, `shake`, `desaturate` |
| End card | 3 s | `end_card` "To be continued..." |

Script rules for this series (on top of CLAUDE.md and STORY_SPEC section 13):
- `meta`: `kind: "story"`, `audience: "kids"`, `speakerNames: true`, `autoCamera: "story"`, `style: "soft"`; seed `1000 + episode number`.
- The cast list is the same for every episode (ids `doopi`, `dony`, `doomi`, `becky`, `mooka`, `nani`, `motumal`, `peepa`, `tony`, `kony`, ...) so looks never drift; a shared cast file lives in `series/doopi/cast.json` once the assets exist.
- Never "kill", "die", "dead": use "frozen", "taken", "defeated", "gone grey".
- Every fight ends in KO, faint, captured, flee or vanish (shadows and goons only). Friends who fall always get up or come back by the next episode.
- Files: scripts in `scripts/series/doopi/ep01.json` ... `ep24.json`; renders go to `out/series/doopi/`.

## 7. Open questions for Sridhar

1. **Becky's rig** is a big engine feature (a new skeleton, pose channels and about 18 moves). Should I plan it as its own milestone in docs/STORY_PLAN.md, and hold episode scripts until it exists, or write episode 1 now with Becky's beats marked to be filled in later?
2. **Doomi as "girlfriend":** I've kept it at a sweetheart level (blushes, hearts, holding hands, one dance), which suits YouTube Kids. OK?
3. **Names:** Thunda, Madam Mirchi, Captain Kanta, Iron Ghoom/Ghoomu, Tara Treetop, Mallu Uncle, Nani Nimbu, Mayor Motumal and Tokyo are my suggestions. Change any you like.
4. **Peepa's ending:** captured and offered friendship (he stays caged but hopeful). Alternatively he could flee and set up a season 2.
5. **Episode length:** about 5:00-5:30 each. Longer (6-8 min) is possible and helps YouTube watch time; it makes each script bigger.
