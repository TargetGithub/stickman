# Baby & toddler rhymes: generators

One generator per rhyme (`brNN.mjs`) writes `../brNN_<slug>.json`. The plan, lyrics rules and format are in
`../specs/baby_rhymes.md`; the shared helpers are in `kit.mjs`; `br01.mjs` (Old MacDonald) is the full example
(it predates the kit and carries its own copies of the helpers).

## Making a rhyme

```bash
export PATH=/Users/a81133017/.nvm/versions/node/v20.19.3/bin:$PATH   # Node 20
cd engine3d
node scripts/series/toybox/rhymes/br02.mjs                           # writes ../br02_<slug>.json
node -e 'const fs=require("fs");Promise.all([import("./runtime/validate.js"),import("./catalog/index.mjs")]).then(([v,c])=>console.log(JSON.stringify(v.validateScript(JSON.parse(fs.readFileSync(process.argv[1],"utf8")),c.loadCatalog3d()),null,1)))' scripts/series/toybox/br02_<slug>.json
node tools/sung_durs.mjs scripts/series/toybox/br02_<slug>.json      # measures the sung lines -> durs/br02.json
node scripts/series/toybox/rhymes/br02.mjs                           # again: sung beats now fit their lines
node tools/render3d.mjs scripts/series/toybox/br02_<slug>.json --stills 0.3,3,8,15 --res 720p   # stills to check
node tools/thumbnail3d.mjs scripts/series/toybox/br02_<slug>.json --out <dir>                    # thumbnails
```

Final videos: `node tools/episode3d.mjs <json> --review --final --out-dir "/Volumes/DISK1MAC/AI Backup files - Youtube/Toybox/BABY-RHYMES/<id>_<slug>"`
(4K60 plus a 1080p30 review, thumbnails and youtube.txt).

## Rules every rhyme follows

- Length 3–4 minutes. Audience `babies` (`rhymeMeta`). Robo hosts in his catalog voice (soft, pitch 1.1, speed 0.97, as in g103); animals and friends get
  `meta.cast` voices (soft, squeaky, deep) with pitch and speed.
- **Hook in 0–5 s**: the first beat sings or asks with an instant payoff, no backstory.
- **An interaction every 10–15 s**: your turn (say it, clap, count on fingers), 3-2-1 countdowns, point to it,
  peekaboo, guess the sound.
- **Icon pops on key words**: the word bubble (`bubbleObjects`, `word`) or a pop with a sound on every taught
  word; keep characters moving and change the camera angle each verse.
- **Progress tracker** (`trackerObjects`, `fillSlot`) fills one item per verse; the last slot is teased early.
- **Sung lines** (`sung(text, tune)`): spoken normally by Robo, a quiet glockenspiel plays one note per syllable.
  Scenes with sung lines set `music: false`. One note per syllable (the validator warns otherwise). Beat chanting
  (`rhythm: true`) sounded choppy and is not used.
- Recap quiz near the end (`quizRound`), praise, a last chorus, bye-bye.
- Lyrics are public domain (traditional, pre-1929) or original. Gentle: no falls that hurt, no scary bits, no
  blood or gore.
- Hidden objects stay fully out of sight (sink them below the floor behind a cover); check stills.
