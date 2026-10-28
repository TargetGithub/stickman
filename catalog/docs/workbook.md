A **workbook** is a printable activity book for children from pre-K to grade 5: shape lessons, tracing, colouring, counting, mazes, dot-to-dot, word searches, patterns, math problems, number lines, place value, clocks, coins, fractions, multiple-choice questions, reading passages and writing lines, drawn as black line art on white with the Stickman characters. One workbook script makes several PDFs: usually the student book and its answer key. The engine builds every puzzle from the seed, so you choose what goes on each page and it makes the maze, the word grid and the answers.

## How to write a good workbook

- **One idea per page.** Give each page a short title ("Find the Stars") and, when useful, one or two short sentences a grown-up reads aloud ("Colour every star. How many are there?"). Pre-K and K pages hold one or two activities.
- **Build up.** Introduce a shape (shape_lesson), then trace it, find it, count it, colour it and use it in a pattern or a picture. Mix quiet pages (tracing, colouring) with puzzles (mazes, dot-to-dot, word searches).
- **Fit the grade.** Pre-K: big single shapes, counting to 5, small mazes, no word searches, capital letters. K: counting to 10, 7 x 7 mazes, 6 x 6 word searches, capitals and short words. Grades 1-2: more shapes and dots, bigger mazes and grids, lowercase words, facts to 20 and two-digit sums, clocks and coins. Grades 3-5: times tables, division, fractions, decimals, longer passages and ruled writing lines.
- **Plan from the skills map.** "Skills by grade" below lists what each grade practises in ten strands; pick a page per skill and use the named math templates, question sets and passages for that grade or lower (a higher one is `W_WB_LEVEL`).
- **Use the cast.** Put the book's characters on the cover, beside page titles (page `art`), at maze ends and in colouring pages and patterns. Only print-approved names (listed below) work.
- **Every puzzle gets its key.** Add one document `{ "id": "answers", "answersFor": "student" }`; the engine fills it with the pages that have answers.
- **Family friendly.** Gentle words, no fighting or scary themes, nothing about weapons.

## Before you answer, check

1. `"kind": "workbook"`, `"version": 1`, a `grade`, a `seed`, a `title`; ids lowercase_with_underscores and unique.
2. Every activity name, shape, picture, dot picture, colour, preset, pose, prop and object comes from these tables.
3. Numbers stay within the grade rules (count, maze size, dots); word search words are letters only and fit the grid.
4. Each block's `slot` exists in its page's `layout`, one block per slot.
5. A colour_by_shape key names only shapes in its picture; a pattern's repeat matches its number of pictures (ABC takes 3).
6. The answer key document points at the student book.
