import { test } from "node:test";
import assert from "node:assert/strict";
import { timestamp, chapterName, chapters, ffmetadata, description, mismatch, plan } from "../../tools/lib/compilation.mjs";

test("timestamp: m:ss under an hour, h:mm:ss from an hour on", () => {
  const cases = [[0, "0:00"], [59.9, "0:59"], [299.6, "4:59"], [3600, "1:00:00"], [3725, "1:02:05"]];
  for (const [s, want] of cases) assert.equal(timestamp(s), want, `${s}`);
});

test("chapterName keeps the episode number and title", () => {
  assert.equal(chapterName("Doopi & Friends 2: Peepa Steals the Rainbow"), "2. Peepa Steals the Rainbow");
  assert.equal(chapterName("Doopi & Friends 12: The Mirror Maze"), "12. The Mirror Maze");
  assert.equal(chapterName("A Plain Title"), "A Plain Title");
});

test("chapters run back to back; the metadata and description list them", () => {
  const list = chapters([{ title: "S 1: One", dur: 299.6 }, { title: "S 2: Two", dur: 251.4 }, { title: "S 3: Three", dur: 270 }]);
  assert.deepEqual(list.map((c) => [c.title, c.start, c.end]), [["1. One", 0, 299.6], ["2. Two", 299.6, 551], ["3. Three", 551, 821]]);
  const meta = ffmetadata("S; best=of", list);
  assert.ok(meta.startsWith(";FFMETADATA1\ntitle=S\\; best\\=of\n"), "special characters are escaped");
  assert.equal(meta.match(/\[CHAPTER\]/g).length, 3);
  assert.match(meta, /START=299600\nEND=551000\ntitle=2\. Two/);
  assert.equal(description("S", list), "S\n\n0:00 1. One\n4:59 2. Two\n9:11 3. Three\n");
});

test("mismatch: episodes must share size and frame rate to join without re-encoding", () => {
  const ep = (slug, w, h, fps) => ({ slug, resolution: { width: w, height: h }, fps });
  assert.equal(mismatch([ep("a", 1920, 1080, 30), ep("b", 1920, 1080, 30)]), null);
  assert.match(mismatch([ep("a", 1920, 1080, 30), ep("b", 3840, 2160, 30)]), /a 1920x1080@30, b 3840x2160@30/);
  assert.match(mismatch([ep("a", 1920, 1080, 30), ep("b", 1920, 1080, 60)]), /render them alike/);
});

test("plan: 20-30 minute groups in order; a short remainder joins the last group when it fits", () => {
  const cases = [
    [[330, 330, 330, 330, 330, 330, 330, 330], [[0, 1, 2, 3], [4, 5, 6, 7]]],
    [[330, 330, 330, 330, 330], [[0, 1, 2, 3, 4]]], // 27:30 in one
    [[360, 360, 360, 360, 360, 360], [[0, 1, 2, 3], [4, 5]]], // 24:00, then what is left
    [[600, 600, 600, 600], [[0, 1], [2, 3]]], // 20:00 each
    [[900, 900, 900], [[0, 1], [2]]],
  ];
  for (const [durs, want] of cases) assert.deepEqual(plan(durs), want, durs.join(","));
});
