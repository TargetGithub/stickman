# Toybox Elementary: channel review (Nov 2026)

Pulled 2026-11-17 with the YouTube Data API (read-only, `--channel toybox` sign-in). Nothing on the channel was changed.

## 1. Snapshot

| Metric | Value |
|---|---|
| Channel created | 2026-10-30 (18 days ago) |
| Subscribers | 98 |
| Views (channel counter) | 33,001 |
| Views (sum of per-video counters, fresher) | 36,942 |
| Videos | 163, **all public** (0 private, 0 scheduled) |
| Made for Kids | yes (self-declared), monetization off |
| Playlists | 6 (PreK 70, Grade 1 35, Grade 2 32, Grade 3 11, Grade 4 10, Grade 5 6); 4 videos in no playlist |
| Views per video | mean 227, **median 96**; 55 videos under 50 views |
| Subscribers per 1,000 views | **2.97** (98 / 33,001) |
| Likes per 1,000 views | 2.3 (85 likes; comments are off on Made for Kids) |
| Concentration | top 10 videos = 39% of views, top 20 = 55% |

Note: the hand-over said 35 public / 30 private. The API shows every one of the 163 uploads as public today, so the private 10K batches have since been made public (or the count referred to another list).

**YouTube Analytics was not available.** The Cloud project behind the OAuth client (project 805590726390) has the *YouTube Analytics API* disabled, so watch time, average view duration, retention, traffic sources and subscribers gained per video could not be read. To unlock them: enable "YouTube Analytics API" in that Google Cloud project, and (to be safe) add the `yt-analytics.readonly` scope at the next `--auth --channel toybox`. That would give: watch hours, average view duration and % viewed per video, traffic source split (Browse / Suggested / Search / Shorts), subscribers gained per video, and country/device. I did not re-authorize anything.

## 2. Momentum

Views are coming almost entirely from the newest 10K-programme batches; the launch-week videos have stalled.

| Upload day | Videos | Mean views | Views per day since upload |
|---|---|---|---|
| Oct 30–31 (launch set) | 27 | 30 | 2 |
| Nov 2–6 | 40 | 109 | 8 |
| Nov 7 (toddler rhymes) | 21 | 427 | 43 |
| Nov 10 | 35 | 163 | 23 |
| Nov 12 | 10 | 135 | 27 |
| **Nov 14 (PreK lowercase)** | 10 | **966** | **322** |
| Nov 15 | 10 | 206 | 103 |
| **Nov 17 (today)** | 10 | 402 | ~400 in < 1 day |

The Nov 14 and Nov 17 batches are the best launches so far. YouTube is clearly testing new uploads in Browse/Suggested; each new batch gets a burst. This is a good sign for the 10-a-day plan, but the old catalog gets almost nothing after the first few days.

## 3. Top and bottom videos

**Top 10**

| Views | Title | Band | Length |
|---|---|---|---|
| 2,368 | Baa Baa Black Sheep 🐑 Learn Colours with Wool for Toddlers | Toddler rhyme | 4.0 m |
| 2,315 | Old MacDonald Had a Farm 🐮 Animal Sounds Sing-Along for Toddlers | Toddler rhyme | 5.2 m |
| 1,766 | Duck's Birthday Gifts! Find Lowercase p q r | PreK | 4.1 m |
| 1,660 | Fish Sees the Tails! Lowercase Letters with Tails g j p q y | PreK | 3.5 m |
| 1,617 | Mouse's Round Door! Short Round Lowercase Letters a c e o s | PreK | 4.5 m |
| 1,135 | Tangled Yarn! Find Letters Y and Z on the Alphabet Train | PreK | 4.2 m |
| 874 | Hickory Dickory Dock 🕰️ Count the Bongs 1 to 4 | Toddler rhyme | 4.0 m |
| 861 | Puppet Show Mix-Up! Tell Lowercase p and q Apart | PreK | 3.9 m |
| 858 | Hen and Chicks! Little Letters That Look Like Big Letters | PreK | 5.1 m |
| 837 | The Tall Car! Find the Tall Lowercase Letters b d f h k l t | PreK | 4.0 m |

**Bottom 10** (all 1–5 m, nearly all from the Oct 30–31 launch set, titled "… for Kids | Toy Box Friends" with no grade label)

| Views | Title |
|---|---|
| 3 | Five Senses for Kids! 👀👂 Detective Mystery Box with Robo |
| 4 | Patterns for Preschool! 🔴🔵 What Comes Next? |
| 5 | Adding for Kids! 🍎 Picnic Math, Sums to 5 |
| 5 | Where Is Duck? 🦆 In, On, Under, Behind |
| 5 | How Do You Feel? 😊😢 Feelings and Emotions for Kids |
| 6 | Learn Colours for Toddlers! 🌈 Red, Blue, Yellow & More |
| 6 | Big, Bigger, Biggest! 🎈 Size Words for Kids |
| 6 | Halves and Quarters for Kids! Fair Shares Picnic |
| 6 | Pizza Party Thirds! Equal Parts for Kids |
| 10 | Four Seasons for Kids! Spring, Summer, Autumn, Winter |

## 4. Grade / band performance

| Band | Videos | Total views | Mean | Median | Views/day |
|---|---|---|---|---|---|
| **PreK (ABC)** | 23 | 13,426 | **584** | **444** | **251** |
| Toddler rhymes | 22 | 7,653 | 348 | 96 | 35 |
| Kindergarten | 13 | 3,809 | 293 | 208 | 99 |
| Grade 1 | 19 | 2,824 | 149 | 140 | 43 |
| Grade 2 | 27 | 3,917 | 145 | 108 | 42 |
| Grade 3 | 9 | 893 | 99 | 81 | 19 |
| Grade 5 | 7 | 673 | 96 | 74 | 41 |
| Grade 4 | 9 | 497 | 55 | 33 | 15 |
| No grade in title | 34 | 3,250 | 96 | 31 | 8 |

Views fall steadily with age band. PreK + toddler + K (58 videos) earn 68% of all views. Toddler rhymes are hit-or-miss: two hits above 2,300 and a long tail under 100 (median 96).

By subject: literacy 87 videos / mean 281; math 34 / 131; science 10 / 100.

## 5. Shorts vs long-form

There are no Shorts. Five launch-day clips are about 1–1.6 minutes long (Count to 10, Shapes, Colours, Animal Sounds, Patterns), but they are landscape 4K and count as regular videos. They are the weakest group (mean 11 views). Without Analytics I can't confirm the Shorts shelf; the `creatorContentType` report would show it once the API is enabled.

## 6. Length

| Length | Videos | Mean views | Views/day |
|---|---|---|---|
| under 1.5 m | 5 | 11 | 1 |
| **1.5–5 m** | 68 | **343** | **110** |
| 5–7 m | 59 | 185 | 48 |
| 7 m + | 31 | 87 | 10 |

The 3.5–5 minute lessons win. The 7–9 minute Grade 2–5 explainers from the first week do worst (this is partly age band and age of upload, but the gap is large).

## 7. What the winners have in common

- **Titles:** a short story hook with "!" (*Duck's Birthday Gifts!*, *Fish Sees the Tails!*), then the exact skill with the actual letters (*Find Lowercase p q r*), then a band label (*Pre-K ABC*), then the brand. Concrete letters or numbers in the title beat generic topics ("Adding for Kids!").
- **Brand suffix:** videos ending "| Toybox Elementary" average 304 views (median 175) vs 161 (median 44) for "| Toy Box Friends". Part of that is newer uploads, but the channel name and the title suffix should match.
- **Series feel:** the Alphabet Train and the lowercase-letter set (look-alikes, tails, tall letters, round letters) form a run kids can binge; YouTube suggests them to each other.
- **Famous rhymes:** "Baa Baa Black Sheep" and "Old MacDonald" are searched words. Lesser-known rhymes (Hot Cross Buns 16, Pat-a-Cake 73) don't carry.
- **Emoji in titles:** no lift (median 73 with emoji vs 104 without).
- **Thumbnails:** all 163 have custom high-resolution thumbnails. I did not compare designs by eye; comparing click-through rate per thumbnail needs YouTube Studio or Analytics.

## 8. Other findings

- **Spelling:** 10+ titles use British "Colours" and "Autumn" while the channel country is US. Use "Colors" and "Fall".
- **Metadata:** one video ("Describing Words Zoo!") has audio language set to `zxx` (no speech), two have none, one is `en-US`; the rest are `en`. Set all to English.
- **Channel keywords:** none are set.
- **Playlist descriptions** are bare ("Grade4 Videos", Grade 2 empty), and there is no Toddler / Nursery Rhymes or Kindergarten playlist even though those bands earn well.
- **Description** links back to the channel itself, which does nothing for a viewer.

## 9. Recommendations (in priority order)

1. **Make more PreK and Kindergarten letter lessons in series.** They earn 3–6× more per video than Grade 3–5. Weight the next 10K batches toward PreK/K literacy and continue the Alphabet Train / lowercase look-alike runs (missing letters, numbers 1–20 in the same style).
2. **Keep the 3.5–5 minute length** as the default. For Grade 3–5, try 5–6 minutes and see if it closes the gap with the 7–9 minute versions.
3. **Use one title formula everywhere:** `Story hook! Exact skill with real letters/numbers | Band | Toybox Elementary`. Retitle the 88 "Toy Box Friends" videos and add a grade label to the 34 that have none (needs your OK; title edits are a YouTube write).
4. **Make more famous nursery rhymes** (Twinkle Twinkle, Wheels on the Bus, Five Little Monkeys, ABC song) and put them in a new "Nursery Rhymes for Toddlers" playlist. Only the well-known ones get found.
5. **Fix playlists:** add Kindergarten and Toddler Rhymes playlists, set the 4 orphan videos, and write a one-line keyword description on each ("Grade 4 reading and math lessons: syllables, prefixes, fractions, angles…"). Order PreK ABC playlists alphabetically so autoplay runs as a series.
6. **Enable the YouTube Analytics API** in the Cloud project (and add `yt-analytics.readonly` on the next sign-in) so the next review can use average view duration and traffic sources, not just views. That is the only way to check the retention work from the 10K guidelines.
7. **Clean metadata:** US spelling in titles, audio language `en` on all videos, channel keywords set (list below).
8. **Try a few vertical Shorts** cut from the top PreK lessons (one letter in 30–45 s, with a link to the full video). The channel has none, and the 1-minute landscape clips don't work as Shorts.

Not checked: the 10K `GUIDELINES.md` retention guide. `/Volumes/DISK1MAC` was not mounted.

## 10. Channel description

Current:

> Elementary Education Videos for Kids at levels PreK, 1st Grade, 2nd Grade, 3rd Grade, 4th Grade, 5th Grade.
> https://youtube.com/@toyboxelementary?si=…

Both variants are American English, make no certification or standards claims, and keep the abcbunny.com link. "New lessons every week" is true at the current pace (10-video batches on Nov 10, 12, 14, 15 and 17); drop that line if uploads pause.

### Variant A: full, with a section list (943 characters)

```
Welcome to Toybox Elementary! 🧸 Short, friendly lessons where cheerful toy friends help kids learn one small skill at a time.

📚 What you'll find here
🔤 PreK ABCs: capital and lowercase letters, look-alike letters, rhymes
📖 Kindergarten reading: letter names, first sounds, reading left to right
🗣️ Phonics for 1st and 2nd grade: blends, short and long vowels, silent e, vowel teams
✏️ Reading and grammar for 3rd to 5th grade: prefixes, suffixes, syllables
➕ Math: counting, place value, coins, time, fractions, multiplication
🔬 Science: plants, seasons, life cycles, animal habitats
🎵 Sing-along nursery rhymes for toddlers

👧 For ages 2 to 11: toddlers, PreK, kindergarten and 1st to 5th grade.
👩‍🏫 Parents and teachers: each video teaches one clear goal, with pauses for kids to answer.

New lessons every week. Subscribe so you don't miss one! 🔔

🎮 Free learning games for kids: abcbunny.com
```

### Variant B: short and warm (571 characters)

```
Learn, play and grow with Toybox Elementary! 🧸✨

Fun learning videos for PreK, kindergarten and 1st to 5th grade. Each lesson is a short story with toy friends, one clear goal and time for kids to say the answer out loud.

🔤 ABCs and phonics
📖 Reading, spelling and grammar
➕ Math from counting to fractions
🔬 Science for curious kids
🎵 Nursery rhyme sing-alongs for toddlers

Great for home learning, classroom warm-ups and quiet time.

📅 New lessons every week. Subscribe and ring the bell 🔔
🎮 Play free kids' learning games at abcbunny.com
```

### Channel keywords / tags

Toybox Elementary, kids learning videos, educational videos for kids, preschool learning, pre-k, kindergarten, 1st grade, 2nd grade, 3rd grade, 4th grade, 5th grade, ABC, alphabet, lowercase letters, phonics, reading for kids, math for kids, counting, fractions, science for kids, nursery rhymes, toddler learning, homeschool

## 11. Not done (needs Sridhar's OK)

- Changing the live channel description or keywords.
- Retitling videos, editing playlists or language settings.
- Enabling the Analytics API or re-signing in.

## 12. Sridhar's decisions (2026-11-17)

Approved to do (the other recommendations are on hold for now):

1. **Famous nursery rhymes in their own playlist.** Make more well-known rhymes (Twinkle Twinkle, Wheels on the Bus, Five Little Monkeys, ABC song, ...) and put them in a new "Nursery Rhymes for Toddlers" playlist on the Toybox channel.
2. **Vertical Shorts from the top PreK lessons.** Try a few 30–45 s vertical cuts (one letter each) with a link to the full video.
3. **Brand name: "Toybox Elementary", never "Toy Box Friends".** Every video title and description says the channel name. The 10K renders already do; the older uploads titled "| Toy Box Friends" need retitling. Retitling, playlist changes and uploads are YouTube writes, so each batch still needs his yes before it runs.

Channel description: Sridhar is choosing between Variant A and Variant B (section 10).

## 12. Playlists added (2026-11-17, at Sridhar's request)

Ten public topic playlists were created and filled with existing videos, ordered as a learning sequence (rhymes by popularity). The six grade playlists were kept as they were. Two videos that were in no playlist were added to them: *Multiply and Divide by 10, 100 and 1,000* → Grade5 Videos, and *Alive or Not?* → PreK Videos. Cost: about 8,900 quota units (10 `playlists.insert` and 168 `playlistItems.insert`).

| Playlist | Id | Videos |
|---|---|---|
| Nursery Rhymes & Sing-Alongs for Toddlers | PLHnaFw2iVBDk | 20 |
| Pre-K ABC: Alphabet Train & Lowercase Letters | PLeauEIrGSRtY | 17 |
| Preschool Basics: Colors, Shapes, Numbers & More | PLel3aEVDGETk | 21 |
| Kindergarten Reading: Letters, Sounds & Reading Left to Right | PLd7ii0nSqcmg | 13 |
| 1st Grade Phonics: Blending Sounds into Words | PLPdpTKek_sEY | 15 |
| Long and Short Vowels: Silent e and Vowel Teams (Grade 2) | PLYONW4RHRUJI | 17 |
| Sentences, Grammar & Story Skills | PLKj5x_ZvVT4o | 13 |
| Prefixes, Suffixes & Syllables (Grades 3-5) | PLNjLN1fZ7n7Q | 13 |
| Math for Kids: 1st to 5th Grade | PLVD4hk9v3I7M | 22 |
| Science & Social Studies for Kids | PLBFcRbcBYNa4 | 15 |

Every video is now in at least one playlist except *Rhyme Time!* `K4D47BR8dOs`, which duplicates `ElUrFee8Lx0` (same title, uploaded a few hours apart). Consider making that copy private.

New uploads now go into their topic playlist as well as their grade playlist (`chooseTopicPlaylist`, see `docs/YOUTUBE_UPLOAD.md`). The rules place 160 of the 163 existing videos where they were put by hand.
