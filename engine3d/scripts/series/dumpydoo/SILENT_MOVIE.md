# DumpyDoo in "The Silly Day": a silent-movie-style comedy

A slapstick short, about 9 min 55 s (594 s), for young children. It is made in the spirit of the classic
silent-film comedians:

- Bright, colourful title cards between the gags, each read aloud in a baby voice.
- DumpyDoo says his own little lines and exclamations ("Oopsie!", "Wheee!", "Ta-da!") in the same baby voice,
  his mouth moving with them, with a subtitle.
- A little bowler hat and a springy cane.
- A waddle with the toes turned out.
- A look to the audience after each mishap.
- The iris closing at the end of a scene.
- A different music mood for each chapter, under cartoon sound effects.

Every gag here is original and built from everyday things: a hat, a banana peel, a door, a bee, a seesaw,
balloons, a puppy, sheep and a bath. Nothing recreates a scene, character, costume or likeness from any
particular film. DumpyDoo is himself, in a bowler hat.

**Rules:**
- Every scene should be laughable.
- No one is ever hurt: falls end in a squash and a bounce.
- Every bump is followed by a giggle and a recovery.
- No blood, mess or meanness.

| | |
|---|---|
| Scene | `engine3d/scenes/dumpydoo_silent_movie.js` (chapters in `engine3d/scenes/silent/`) |
| Star | DumpyDoo (`catalog/models/dumpydoo.json`) with `bowler_hat` and `cane` (`catalog/models/silent_movie.json`) |
| Look | `runtime/film_look.js`: warm vignette, fine grain, a rare faint scratch, iris in and out (no flicker) |
| Title cards | caption style `intertitle` (`runtime/overlay.js`): a bright gradient (six colour themes) with confetti and stars, a white frame, big outlined words, a "Chapter One" badge |
| Voice | the `toddler` timbre (baby voice): the storyteller reads every card (pitch 1.1); DumpyDoo speaks his lines with lip sync (pitch 1.25). `kit.js`: `card`, `speak`, `exclaim` |
| Music | a mood per chapter (`director.chapter`, crossfading): happy, playful, bouncy, tense, heroic, calm, mysterious, lullaby, battle, sad, triumphant |
| Review render | `node engine3d/tools/render3d.mjs engine3d/scenes/dumpydoo_silent_movie.js --res 1080p --fps 30 --speech tts --out out/demos/3d/dumpydoo/dumpydoo_silent_movie_1080p30.mp4` |
| Final render | the same with `--res 4k --fps 60` |

**Music by chapter:**

| Chapters | Mood |
|---|---|
| Opening | happy |
| Hat, Mirror | playful |
| Banana, Hungry Pup | bouncy |
| Door, Busy Bee | tense |
| Wet Paint, Skateboard | happy |
| Seesaw | heroic |
| Balloon Ride | calm |
| Magic Hat | mysterious |
| Forty Winks | lullaby |
| Cupcake Factory | battle (fast and driving) |
| His Very Own Cloud | sad while it rains, happy from the rainbow |
| Bubble Trouble | playful |
| Finale | triumphant, then happy under The End |

**His own lines** (said on screen):

| Kind | Lines |
|---|---|
| Replacing the old quoted cards | "Oh! I left my lunch box by the bin!", "It's a door... to nowhere!", "How did that fit in there?", "Hey! Come back here, you!", "Counting sheep is meant to help me sleep!", "All done, boss!" |
| Greetings and goodbyes | "Hello, everybody!", "Bye-bye, DumpyDee!", "Good puppy!", "Bye-bye, friends!" |
| Mishaps | "My hat!", "Whoa-oh!", "Silly peel!", "Oopsie!", "Shoo, bee!", "Too fast!", "Hey! Rain!", "Uh-oh!" |
| Delights | "Yay!", "I'm all yellow!", "Wheee!", "Up, up, up!", "Ta-da!", "Abracadabra!", "A duck!", "A rainbow!" |
| Counting | "One... Two... Three..." |

## Running order

Times are where each title card starts; they shift a little once the real voice clips are measured.

| Time | Card | The gag |
|---|---|---|
| 0:00 | DumpyDoo Pictures presents / DumpyDoo in THE SILLY DAY / A little bun with a big hat and a very bouncy day. | The iris opens on a town street. DumpyDoo waddles in, stops, twirls his cane, tips his hat (it hops off his head and back) and clicks his heels. |
| 0:21 | Chapter One: The Hat That Would Not Stay | See [Chapter One](#chapter-one-the-hat-that-would-not-stay) below. |
| 0:57 | Chapter Two: Beware the Banana! | See [Chapter Two](#chapter-two-beware-the-banana) below. |
| 1:35 | Chapter Three: The Door to Nowhere | A door stands alone in a meadow. See [Chapter Three](#chapter-three-the-door-to-nowhere) below. |
| 2:17 | Chapter Four: Wet Paint! | He paints a fence yellow, then steps back into the paint bucket. See [Chapter Four](#chapter-four-wet-paint) below. |
| 2:51 | Chapter Five: The Busy Bee | A rest on a park bench. See [Chapter Five](#chapter-five-the-busy-bee) below. |
| 3:26 | Chapter Six: Up, Up and Away! | A seesaw. See [Chapter Six](#chapter-six-up-up-and-away) below. |
| 4:04 | Chapter Seven: The Balloon Ride | Four balloons on a lamp post. See [Chapter Seven](#chapter-seven-the-balloon-ride) below. |
| 4:35 | Chapter Eight: The Magic Hat | A little theatre with a spotlight. See [Chapter Eight](#chapter-eight-the-magic-hat) below. |
| 5:09 | Chapter Nine: The Mirror | An empty gold frame and a "reflection". See [Chapter Nine](#chapter-nine-the-mirror) below. |
| 5:50 | Chapter Ten: The Hungry Pup | A picnic on a rug. See [Chapter Ten](#chapter-ten-the-hungry-pup) below. |
| 6:32 | Chapter Eleven: Forty Winks | A nap against a hay bale in the farmyard. See [Chapter Eleven](#chapter-eleven-forty-winks) below. |
| 7:07 | Chapter Twelve: The Cupcake Factory | A conveyor belt and a toy box. See [Chapter Twelve](#chapter-twelve-the-cupcake-factory) below. |
| 7:47 | Chapter Thirteen: The Runaway Skateboard | See [Chapter Thirteen](#chapter-thirteen-the-runaway-skateboard) below. |
| 8:13 | Chapter Fourteen: His Very Own Cloud | A little grey cloud rains only on him. See [Chapter Fourteen](#chapter-fourteen-his-very-own-cloud) below. |
| 8:52 | Chapter Fifteen: Bubble Trouble | Bath time, still wearing his hat. See [Chapter Fifteen](#chapter-fifteen-bubble-trouble) below. |
| 9:22 | And so, at the end of a very silly day... | See [The finale](#the-finale) below. |
| 9:50 | The End | |

### Chapter One: The Hat That Would Not Stay

1. **The gust:** a gust of leaves blows his hat off.
2. **The chase:** each time he bends to pick it up, it hops away. The third time it flies over his head.
3. **The pounce:** he sneaks up on tiptoe and pounces, landing flat with a squash. The hat squirts into the sky.
4. **The return:** he waits sadly, and the hat drops back onto his head. *Ding!*
5. **The second gust:** another gust comes. He leans into the wind, holding his hat with both hands, while his shoes skid.

### Chapter Two: Beware the Banana!

1. **The peel:** he eats a banana in three bites and tosses the peel over his shoulder without looking.
2. **The flower:** he waddles off to sniff a flower. He says: "Oh! I left my lunch box by the bin!"
3. **The slip:** he walks back without looking and steps on the peel. He slides, spins twice in the air and lands sitting, with dizzy stars.
4. **The tidy-up:** he puts the peel in the bin like a good bun and dusts off his gloves. The lid pops, and the peel lands on his hat.

### Chapter Three: The Door to Nowhere

1. **The knock:** he knocks, and no one answers.
2. **The push:** he pushes and strains, but nothing happens.
3. **The pull:** he pulls, and the door swings open into him. *Bonk*, stars.
4. **Round the back:** he walks round the back and finds nothing there at all. He says: "It's a door... to nowhere!"
5. **Good manners:** he goes through it politely anyway, tipping his hat. Going round it afterwards, the door nudges him on his way.

### Chapter Four: Wet Paint!

1. **The bucket:** he clonks about with the bucket on his foot.
2. **On his head:** he shakes it off, and it lands upside down on his head.
3. **The fence:** walking blind, he bumps into the fence.
4. **Yellow face:** he pulls the bucket off and his face is all yellow. He blinks at us.
5. **The shake:** he shakes like a wet puppy and is himself again.

### Chapter Five: The Busy Bee

1. **The loops:** a bee loops round his head while his eyes follow it round and round.
2. **The swats:** he swats with his cane and misses twice.
3. **The hat:** the bee lands on his hat. He bonks his own hat, which slips over his eyes, and he flails blind.
4. **The sneeze:** the bee lands on his nose. *Ah... ah... CHOO!* The bee tumbles away, and he flips backwards over the bench. He pops up behind it with his hat crooked.

### Chapter Six: Up, Up and Away!

1. **Nothing happens:** he sits on the low end of the seesaw and bounces, but nothing happens.
2. **The plank:** he walks up the plank, and it tips the other way. He walks back, and it tips again.
3. **The balance:** he balances, wobbling, in the middle.
4. **The launch:** he hops back to the low end, and a pumpkin falls from the sky onto the high end. *WHEE*, he spins up out of the picture.
5. **The landing:** after a long pause he drops into a bush. His head pops out, and his hat floats down after him like a leaf. *Ding!*

### Chapter Seven: The Balloon Ride

1. **The balloons:** he checks that nobody is watching and takes the balloons.
2. **Lift-off:** they lift him off his feet, little legs kicking.
3. **Coming down:** he pops them one by one with his cane, dropping a bit each time, and lands softly. Ta-da.
4. **Goodbye:** he lets the last one go and waves goodbye to it.

### Chapter Eight: The Magic Hat

1. **The empty hat:** he puts his hat upside down on a stool and shows us it is empty.
2. **Tap, tap:** the wand brings out a bunny, then a chick.
3. **The piglet:** after a lot of squeezing, a whole piglet comes out. He says: "How did that fit in there?"
4. **The bunny's turn:** the bunny taps DumpyDoo with the wand and he shrinks to half his size. Another tap brings him back.
5. **The bow:** everybody bows, with confetti.

### Chapter Nine: The Mirror

1. **The copying:** his "reflection" copies everything: the hat tip, the hop, the wiggle, the funny face and the slow lean.
2. **Tricks:** he gets suspicious and tries quick tricks. The reflection is late, then lifts the wrong leg and swaps.
3. **The reach:** he reaches through the frame, and their gloves touch. Both jump with a yelp.
4. **The reveal:** the "reflection" giggles, waves and waddles off. Card: "That was no mirror... it was his twin cousin, DumpyDee!"
5. **The empty frame:** he checks the empty frame and shrugs at us.

### Chapter Ten: The Hungry Pup

1. **The steal:** a bird sings and he turns to look. A puppy sneaks in and takes the sandwich.
2. **Again:** a second sandwich goes the same way. He says: "Hey! Come back here, you!"
3. **The chase:** he chases the pup round and round a tree. The pup stops and turns, and now it chases him the other way.
4. **Friends:** puffed out, he plops down. The pup licks him, and they share the last sandwich.

### Chapter Eleven: Forty Winks

1. **Hat over his eyes:** he settles down with his hat over his eyes.
2. **The jumps:** a sheep jumps over him and he wakes. A second sheep sends his hat flying.
3. **Counting:** he says: "Counting sheep is meant to help me sleep!" He counts them aloud: One... Two... Three...
4. **Asleep:** he falls asleep, and the last sheep lands in his lap and sleeps too. The flock snuggles in as the light turns to dusk.

### Chapter Twelve: The Cupcake Factory

1. **The job:** card: "First day at work. The job: put every cupcake in the box!"
2. **Slow:** three slow cupcakes go into the box, and he is very good at it.
3. **Faster:** one goes in the box, one in his mouth, one on his hat and one in the box.
4. **Too fast:** he misses one, then another.
5. **On the belt:** he jumps onto the belt to catch them, but it carries him off, running on the spot, and drops him into the box. The lid slams.
6. **Out he pops:** the lid creaks up and he pops out with a cupcake still on his hat. He says: "All done, boss!"

### Chapter Thirteen: The Runaway Skateboard

1. **The slip:** he puts one foot on the skateboard, it shoots out from under him, and he sits down hard.
2. **The ride:** he tries again, carefully, wobbling with his arms windmilling.
3. **The ramp:** he rides up a ramp, spins and lands back on the board. Ta-da!
4. **The late fall:** the board rolls away on its own, leaving him standing on nothing. He looks down, looks at us, then sits down. Bump.

### Chapter Fourteen: His Very Own Cloud

1. **The follower:** he steps left, steps right and makes a dash; the cloud follows each time.
2. **The umbrella:** he pops open an umbrella, and the cloud drifts round to rain on him from the side.
3. **The sad look:** he folds the umbrella and gives the cloud a big sad look. It stops raining and blushes pink.
4. **The rainbow:** the sun comes out and a rainbow appears, and he dances.

### Chapter Fifteen: Bubble Trouble

1. **The soap:** the soap squirts out of his glove, lands on his hat and slides off into the water.
2. **The duck:** he feels about for it, and up pops a rubber duck holding the soap.
3. **The chase:** he chases it round a very small bathtub until he is dizzy.
4. **Friends:** the duck sits on his hat and squeaks, and there are bubbles everywhere.

### The finale

1. **The bee:** in the evening street the bee comes back to say sorry, and he shares a cupcake with it.
2. **One more time:** one more cane twirl, hat tip and heel click.
3. **Into the distance:** he waddles away down the road, away from us. He turns once to wave, then goes on, getting smaller.
4. **The iris:** the iris closes on him.

Every chapter ends with the curtain move (`curtain()` in `kit.js`). He turns to us and gives the audience a
look and a little nod, the iris closes on him (following him on screen), and it opens again under the next
title card.

## Assets

**New props** (`catalog/models/silent_movie.json`):

| Prop | Description |
|---|---|
| `bowler_hat` | A little black bowler with a charcoal band and a curled brim. It sits on his head at `[0, 0.63, 0]` on the head part, size 1.2. |
| `cane` | A dark walking stick with a hook. It hangs from his left glove by the hook and twirls about it. |
| `banana_peel` | Four floppy yellow flaps with brown tips. |
| `mirror_frame` | A tall gold frame with no glass. |
| `street_lamp` | An old-fashioned post with a glowing lantern. |

**New shapes** (`runtime/silent_shapes.js`): `bowler_crown`, `bowler_brim` and `crook`.

**From the catalog:**

| Group | Items |
|---|---|
| Buildings and park | `house`, `tree`, `bush`, `flower`, `fence`, `bench`, `seesaw`, `pumpkin` |
| Street and indoors | `bin`, `door`, `bucket`, `paintbrush`, `bathtub`, `soap`, `sink`, `shelf` |
| Food and picnic | `banana`, `sandwich`, `cupcake`, `rug`, `basket` |
| Weather and sky | `balloon`, `rain_cloud`, `rainbow`, `sun`, `umbrella` |
| Factory and play | `skateboard`, `conveyor_belt`, `toy_box`, `bell`, `magic_wand`, `hay_bale` |
| Critters | `bee`, `dog`, `sheep`, `duck`, `bunny`, `chick`, `pig` |
| Effects | weather (leaves, rain), bubbles, confetti, a spotlight `lamp` |

**Sound effects** come from the catalog:

| Kind | Sounds |
|---|---|
| Movement | `whoosh`, `boing`, `slide_whistle`, `squeak`, `footstep_soft` |
| Impacts | `land`, `clang`, `block`, `crack`, `drum`, `pop` |
| Small sounds | `ding`, `clink`, `buzz`, `sneeze`, `gasp`, `ooh`, `bark_small` |
| Settings | `splash`, `rain`, `door_open`, `bell`, `car_pass`, `rocket` |
| Magic | `sparkle`, `magic_sparkle` |
| Audience | `giggle`, `crowd_cheer` |

## Engine pieces added for it

| Piece | What it does |
|---|---|
| `runtime/film_look.js` | `filmLook(d, { irises })` adds the old-film overlay; `irisAt(irises, t)` gives the iris at any time. An iris can centre on an object id and follow it on screen. |
| `intertitle` caption style | A full-frame, colourful title card. `\n` starts a new line; a blank line puts the first part in a badge. It is allowed in JSON scripts too. |
| `director.chapter(id, { at, music, musicGain })` | A JS scene's chapter: the music bed changes mood there, crossfading like a JSON script's scenes. |
| Timeline `null` | Setting a prop back to `null` clears it; for example, `d.set(id, "gaze", null, t)` hands the eyes back to the idle glances. |
