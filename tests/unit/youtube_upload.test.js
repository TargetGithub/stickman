// tools/lib/youtube.mjs: youtube.txt parsing, YouTube request bodies, limits and quota day. No network.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SCOPES, audienceGrade, buildAuthUrl, choosePlaylist, buildInsertBody, buildPaidPromotionUpdate, buildStatusUpdate, buildPlaylistItem, buildResumableStart, contentRange, episodeIdFromDir, fitTags,
  humanSize, isPlaylistId, nextOffset, parsePublishAt, parseYoutubeTxt, pickThumbnail, quotaDay, tagsLength, validateMeta,
} from "../../tools/lib/youtube.mjs";

const SAMPLE = `TITLE: Short Vowels for Kids! CVC Words on Vowel Island | Toy Box Friends

DESCRIPTION:
Robo, Frog and Duck find the missing vowels on Vowel Island!
For first graders learning to read.

0:00 Message in a bottle
0:21 Five vowel huts

Skills: short_vowels_1

TAGS: short vowels, CVC words, phonics for kids, short vowels

AUDIENCE: Made for kids (grade1). Length 6:14.
`;

test("parseYoutubeTxt reads title, description with chapters, tags and audience", () => {
  const y = parseYoutubeTxt(SAMPLE);
  assert.equal(y.title, "Short Vowels for Kids! CVC Words on Vowel Island | Toy Box Friends");
  assert.equal(y.description, "Robo, Frog and Duck find the missing vowels on Vowel Island!\nFor first graders learning to read.\n\n0:00 Message in a bottle\n0:21 Five vowel huts");
  assert.deepEqual(y.tags, ["short vowels", "CVC words", "phonics for kids"]); // duplicates dropped
  assert.deepEqual(y.skills, ["short_vowels_1"]);
  assert.equal(y.madeForKids, true);
});

test("parseYoutubeTxt cases", () => {
  const table = [
    { text: "TITLE: A\nDESCRIPTION:\n\nTAGS:\n", want: { title: "A", description: "", tags: [] } },
    { text: "TITLE: A\r\nDESCRIPTION: one line\r\nTAGS: x,y\r\n", want: { title: "A", description: "one line", tags: ["x", "y"] } },
    { text: "TITLE: A\nDESCRIPTION:\na\n\n\n\nb\nTAGS: x\nAUDIENCE: General", want: { title: "A", description: "a\n\nb", tags: ["x"], madeForKids: false } },
  ];
  for (const { text, want } of table) {
    const y = parseYoutubeTxt(text);
    for (const [k, v] of Object.entries(want)) assert.deepEqual(y[k], v, `${k} for ${JSON.stringify(text)}`);
  }
  assert.throws(() => parseYoutubeTxt("DESCRIPTION:\nhi"), /no TITLE/);
});

test("tagsLength counts commas and quotes around tags with spaces", () => {
  for (const [tags, n] of [[[], 0], [["a"], 1], [["a", "b"], 3], [["a b"], 5], [["a b", "c"], 7]]) assert.equal(tagsLength(tags), n, JSON.stringify(tags));
});

test("fitTags keeps order and drops what does not fit", () => {
  const many = Array.from({ length: 60 }, (_, i) => `tag number ${i}`);
  const { tags, dropped } = fitTags(many);
  assert.ok(tagsLength(tags) <= 500);
  assert.equal(tags.length + dropped.length, 60);
  assert.deepEqual(tags, many.slice(0, tags.length));
  assert.deepEqual(fitTags(["ok", "bad<tag>"]).dropped, ["bad<tag>"]);
});

test("validateMeta flags YouTube limits", () => {
  const ok = { title: "T", description: "D", tags: ["a"] };
  assert.deepEqual(validateMeta(ok), []);
  const table = [
    [{ ...ok, title: "" }, /empty/],
    [{ ...ok, title: "x".repeat(101) }, /101 characters/],
    [{ ...ok, title: "a < b" }, /title contains/],
    [{ ...ok, description: "é".repeat(2501) }, /5002 bytes/],
    [{ ...ok, description: "<b>" }, /description contains/],
    [{ ...ok, tags: ["x".repeat(501)] }, /tags are 501/],
  ];
  for (const [meta, re] of table) assert.match(validateMeta(meta).join("; "), re);
});

test("buildInsertBody: made for kids, Education, private by default", () => {
  const b = buildInsertBody({ title: "T", description: "D", tags: ["a"] });
  assert.deepEqual(b, {
    snippet: { title: "T", description: "D", tags: ["a"], categoryId: "27", defaultLanguage: "en", defaultAudioLanguage: "en" },
    status: { privacyStatus: "private", selfDeclaredMadeForKids: true, containsSyntheticMedia: false, embeddable: true, license: "youtube" },
  });
  assert.equal(buildInsertBody({ title: "T", description: "", tags: [] }, { privacy: "unlisted" }).status.privacyStatus, "unlisted");
  const s = buildInsertBody({ title: "T", description: "", tags: [] }, { privacy: "public", publishAt: "2026-12-01T00:00:00.000Z" }).status;
  assert.equal(s.privacyStatus, "private"); // scheduled videos stay private until publishAt
  assert.equal(s.publishAt, "2026-12-01T00:00:00.000Z");
  assert.throws(() => buildInsertBody({ title: "T", description: "", tags: [] }, { privacy: "secret" }), /privacy/);
});

test("parsePublishAt needs a zone and a future time", () => {
  const now = Date.parse("2026-11-05T12:00:00Z");
  assert.equal(parsePublishAt("2026-11-10T16:00:00-08:00", now), "2026-11-11T00:00:00.000Z");
  assert.equal(parsePublishAt("2026-11-10T16:00:00Z", now), "2026-11-10T16:00:00.000Z");
  assert.throws(() => parsePublishAt("2026-11-10T16:00:00", now), /time zone/);
  assert.throws(() => parsePublishAt("2026-11-01T00:00:00Z", now), /not in the future/);
});

test("buildResumableStart: the session request", () => {
  const s = buildResumableStart({ snippet: { title: "T" } }, 1234, false);
  assert.equal(s.method, "POST");
  assert.equal(s.url, "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet%2Cstatus&notifySubscribers=false");
  assert.deepEqual(s.headers, { "Content-Type": "application/json; charset=UTF-8", "X-Upload-Content-Length": "1234", "X-Upload-Content-Type": "video/mp4" });
  assert.deepEqual(JSON.parse(s.body), { snippet: { title: "T" } });
  assert.ok(!JSON.stringify(s).includes("Authorization"));
});

test("resumable offsets and ranges", () => {
  for (const [h, n] of [[null, 0], ["", 0], ["bytes=0-0", 1], ["bytes=0-67108863", 67108864]]) assert.equal(nextOffset(h), n, String(h));
  assert.equal(contentRange(0, 100, 250), "bytes 0-99/250");
  assert.equal(contentRange(200, 250, 250), "bytes 200-249/250");
});

test("playlist item, playlist ids, episode ids, thumbnails, sizes", () => {
  assert.deepEqual(buildPlaylistItem("PLx", "vid"), { snippet: { playlistId: "PLx", resourceId: { kind: "youtube#video", videoId: "vid" } } });
  assert.equal(isPlaylistId("PLabcdefghijklmnop123"), true);
  assert.equal(isPlaylistId("Grade 1 Reading"), false);
  assert.equal(episodeIdFromDir("g101_short_vowel_island"), "g101");
  assert.equal(episodeIdFromDir("bb01_bubbles_and_colours"), "bb01");
  assert.equal(episodeIdFromDir("random folder"), null);
  assert.equal(pickThumbnail(["thumbnail_cvc.jpg", "thumbnail.jpg"]), "thumbnail.jpg");
  assert.equal(pickThumbnail(["thumbnail_cvc.jpg", "thumbnail_old.jpg"]), "thumbnail_cvc.jpg");
  assert.equal(pickThumbnail(["thumbnail_a.jpg", "thumbnail_b.jpg"]), null);
  assert.equal(humanSize(1077873639), "1.00 GiB");
  assert.equal(humanSize(512), "512 B");
});

test("quotaDay uses Pacific time", () => {
  assert.equal(quotaDay(Date.parse("2026-11-05T07:59:00Z")), "2026-11-04"); // 23:59 PST
  assert.equal(quotaDay(Date.parse("2026-11-05T08:00:00Z")), "2026-11-05");
});

test("buildAuthUrl asks for offline access with PKCE and both scopes", () => {
  const u = new URL(buildAuthUrl({ clientId: "cid", redirectUri: "http://127.0.0.1:5555", state: "st", challenge: "ch" }));
  assert.equal(u.origin + u.pathname, "https://accounts.google.com/o/oauth2/v2/auth");
  const q = Object.fromEntries(u.searchParams);
  assert.equal(q.scope, SCOPES.join(" "));
  assert.equal(q.access_type, "offline");
  assert.equal(q.code_challenge_method, "S256");
  assert.equal(q.redirect_uri, "http://127.0.0.1:5555");
  assert.equal(q.state, "st");
});

test("choosePlaylist: Toy Box grade playlists, explicit wins, babies have none", () => {
  const A = (g) => `Made for kids (${g}). Length 4:00.`;
  const table = [
    [{ channel: "toybox", audience: A("prek") }, { id: "PLc6zxJ3eah1I", title: "PreK Videos", auto: true }],
    [{ channel: "toybox", audience: A("grade1") }, { id: "PLOorLwUSShGE", title: "Grade1 Videos", auto: true }],
    [{ channel: "toybox", audience: A("grade5") }, { id: "PLe7C64XuQHUQ", title: "Grade5 Videos", auto: true }],
    [{ channel: "toybox", audience: A("babies") }, null],
    [{ channel: "doopi", audience: A("grade1") }, null],
    [{ channel: undefined, audience: A("grade1") }, null],
    [{ channel: "toybox", audience: A("grade1"), explicit: "Other" }, { id: "Other", title: null, auto: false }],
    [{ channel: "toybox", audience: A("grade1"), noPlaylist: true }, null],
  ];
  for (const [o, want] of table) assert.deepEqual(choosePlaylist(o), want, JSON.stringify(o));
  assert.equal(audienceGrade("Made for kids (Grade2). Length 1:00."), "grade2");
  assert.equal(audienceGrade(null), null);
});

test("buildStatusUpdate keeps privacy and schedule, sets made for kids and no altered content", () => {
  assert.deepEqual(buildStatusUpdate("v1", { privacyStatus: "private", embeddable: true, license: "youtube", publicStatsViewable: true, selfDeclaredMadeForKids: false }),
    { id: "v1", status: { privacyStatus: "private", selfDeclaredMadeForKids: true, containsSyntheticMedia: false, embeddable: true, license: "youtube", publicStatsViewable: true } });
  assert.equal(buildStatusUpdate("v1", { privacyStatus: "private", publishAt: "2026-12-01T00:00:00Z" }).status.publishAt, "2026-12-01T00:00:00Z");
  assert.equal(buildInsertBody({ title: "T", description: "", tags: [] }).status.containsSyntheticMedia, false);
});

test("buildPaidPromotionUpdate answers paid promotion No", () => {
  assert.deepEqual(buildPaidPromotionUpdate("v1"), { id: "v1", paidProductPlacementDetails: { hasPaidProductPlacement: false } });
});
