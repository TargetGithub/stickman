# Doopi & Friends season 2: render plan

How the 24 episodes of "The Whispering Horn" become 4K60 finals, six 20-30 minute compilations and Shorts.
Everything runs from one detached queue, `series/doopi/s2/render_queue.sh`.

## Settings

- **Finals:** `node tools/record.mjs scripts/series/doopi/s2/epNN_v3.json --speech tts --voices series/doopi/tts_voices.json --res 4k --fps 60 --resume`, multi-core by default (`--jobs` is never forced).
- **Reviews:** the same command with `--res 720p --fps 30 --out-dir out/demos/s2` (episodes 1 and 2 reviewed so far).
- **One 4K render at a time.** The queue renders episodes in order and never starts a second one.
- **Where finals go:** `/Volumes/DISK1MAC/AI Backup files - Youtube/doopi/COMPILATIONS2` when that drive is mounted and writable. The queue checks this again before every render. Otherwise finals go to `out/series/doopi`. Chunk files (`<slug>/parts`) sit next to the final, so they also land on the external drive, and the queue deletes them once the episode is joined.
- **Names:** episodes `s2_epNN_4k60/`, compilations `s2_compilation_0N/`, Shorts `shorts/s2_short_epNN_v3_<scenes>/`. Each folder holds `final.mp4`, `meta.json`, `thumb.png` and `contact_sheet.png`; episodes also get `preview_720p.mp4`.
- **Before each render** the queue checks:
  - **Disk:** it stops if fewer than 4 GB are free on the target disk.
  - **Swap:** it waits, up to 30 minutes, while less than 1 GB of swap is free. Season 1 dropped to 0.7 fps when the Mac swapped, so closing other apps helps most.

## Compilations (`tools/compilation.mjs`)

These are four episodes each, joined without re-encoding, with chapters in the file and a YouTube `description.txt`. The queue builds each one as soon as its fourth episode is done.

| Compilation | Episodes | Story part | Length (about) |
|---|---|---|---|
| 1 | 1-4 | A second chance (Tokyo) | 21-22 min |
| 2 | 5-8 | On the road, and into Jhilmil City | 21-22 min |
| 3 | 9-12 | The clock tower, Tinku, the Hot Sands | 21-22 min |
| 4 | 13-16 | Where is Peepa?, Khel Arena, Echo Mountain | 21-22 min |
| 5 | 17-20 | Thunder night, the jar, the Echo Cave | 21-22 min |
| 6 | 21-24 | The Hush Storm and the Banyan Song | 21-22 min |

Title: "Doopi & Friends Season 2: Episodes a-b". To check the grouping from the finished files: `node tools/compilation.mjs <episode dirs> --plan`.

## Shorts (`tools/shorts.mjs`)

- **What:** two Shorts per episode (48 in all). Each is a 9:16 cut of the episode's two best scenes (15-60 s each, at least two lines), with single framing and an end card.
- **When:** after all the episodes and compilations, so they never hold up a compilation.
- **Scripts:** written by `node tools/shorts.mjs scripts/series/doopi/s2/epNN_v3.json --auto 2 --out-dir scripts/shorts/doopi_s2`. This folder is separate from season 1's `scripts/shorts`, so names never clash.
- **Renders:** 4K60, into `<target>/shorts/`.
- **Choosing by hand:** `--list` shows every scene's length and lines, and `--scenes a,b` makes a Short of a chosen pair.

## Order and time

Episodes 1 → 24 in story order, with compilation N right after episode 4N, then the Shorts in episode order.

| Item | Frames | At 6 fps (season 1, no swap) | At 3 fps |
|---|---|---|---|
| One episode (5:10-5:40) | 18,600-20,400 | 55 min | 1 h 50 |
| 24 episodes | about 470,000 | 22 h | 44 h |
| One compilation (stream copy) | - | 1-2 min | 1-2 min |
| One Short (about 45 s, portrait) | about 2,700 | 8 min | 15 min |
| 48 Shorts | about 130,000 | 6 h | 12 h |
| **Whole queue** | | **about 28 h** | **about 56 h** |

At 0.7 fps (heavy swap), one episode takes about 7 hours. If the log shows that, close other apps and the speed comes back for the next chunks.

## Disk

| What | Each | All |
|---|---|---|
| Episode final + audio + previews | about 0.4 GB | about 10 GB |
| Working chunks while one episode renders | about 0.5 GB | (deleted) |
| Compilation | about 1.1 GB | about 7 GB |
| Short | about 60 MB | about 3 GB |
| **Total on the external drive** | | **about 20 GB** (416 GB free on 2026-11-01) |

The internal disk only gets the speech clip cache (`assets/speech/cache`, a few hundred MB more for season 2). If the external drive is missing, the queue writes to `out/series/doopi` and stops when that disk drops under 4 GB free.

## Running it

```bash
nohup zsh series/doopi/s2/render_queue.sh > out/logs/s2_queue.out 2>&1 &
caffeinate -is -w $!
```

- **Progress:**
  - The queue's own log is `out/logs/s2_queue.out`.
  - Each episode has its own log, `out/logs/s2_render_epNN_4k60.log` (frame count and fps).
- **Restarting:** run the same command again. Finished episodes, compilations and Shorts are skipped, and a stopped episode picks up its finished chunks (`--resume`). If the drive was unplugged in between, that episode starts over on whichever disk is present.
- **One range only:** `zsh series/doopi/s2/render_queue.sh 9 12`.
