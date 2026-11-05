# Uploading to YouTube

`tools/youtube_upload.mjs` uploads a rendered episode straight to YouTube through the YouTube Data API v3.
It needs no dependencies: it calls the OAuth and YouTube endpoints with Node 20's `fetch`. The pure parts
(reading `youtube.txt`, building the requests, checking limits) are in `tools/lib/youtube.mjs`, and
`tests/unit/youtube_upload.test.js` tests them.

**Uploading publishes content, so every upload needs Sridhar's explicit yes.** Uploads are private unless
`--privacy` or `--publish-at` says otherwise, and nothing is made public or scheduled without approval.
Every upload is marked Made for kids (`selfDeclaredMadeForKids: true`) and is in category Education (27).

## One-time setup (Google Cloud)

1. In the Google Cloud console, choose the project and enable **YouTube Data API v3**
   (APIs & Services → Library).
2. Set up the OAuth consent screen. While its publishing status is **Testing**, add the Google account that
   owns the channel under **Test users**. Without verification, a refresh token for a testing app expires
   after 7 days, and then you run `--auth` again. Publishing the app (and passing Google's verification for
   the `youtube` scopes) removes that limit.
3. Create an OAuth client of type **Desktop app** (Credentials → Create credentials → OAuth client ID) and
   download its JSON. A Desktop client accepts the loopback redirect on any port. A **Web application** client
   also works, but only if `http://localhost:8085` is in its Authorized redirect URIs (use `--port` to change it).
4. Sign in:

   ```bash
   node tools/youtube_upload.mjs --auth --client ~/Downloads/client_secret_XXXX.json
   ```

   The consent page opens in the browser. Choose the channel's account and allow access. The scopes are
   `youtube.upload` (the upload itself) and `youtube` (thumbnails and playlists). The tool copies the client file to
   `~/.config/stickman/youtube_client.json` and stores the refresh token in
   `~/.config/stickman/youtube_token.json`, both with mode 600 and outside the repo. Never print or commit
   either file. To use another config folder, set `STICKMAN_CONFIG_DIR`.
   Each channel keeps its own sign-in: add `--channel <name>` (for example `toybox`, `doopi`) to `--auth`,
   `--check` and uploads, and the token goes to `youtube_token_<name>.json`. On the consent page, pick that
   channel at Google's "Choose an account or brand account" step. Before a real upload the tool prints the
   connected channel's name.
5. Check which channel is connected:

   ```bash
   node tools/youtube_upload.mjs --check --channel toybox
   ```

   Custom thumbnails need a phone-verified channel (youtube.com/verify). Without one, the upload still
   succeeds and the tool prints a warning about the thumbnail.

## Uploading an episode

```bash
node tools/youtube_upload.mjs pk16 --channel toybox --dry-run                        # what would be sent; no network
node tools/youtube_upload.mjs pk16 --channel toybox --playlist "PreK Videos"         # private; asks "Type yes"
node tools/youtube_upload.mjs "<episode folder>" --channel toybox --publish-at 2026-11-10T16:00:00-08:00
```

- The argument is an episode folder or a Toy Box episode id. An id is resolved through the render location
  in `engine3d/scripts/series/toybox/episodes.json`.
- The tool uploads `final_4k60.mp4` (or `--video`) and `thumbnail.jpg`. If there is no `thumbnail.jpg`, it uses
  the only designed `thumbnail_*.jpg`, or the file you give with `--thumb`. Images must be under 2 MB.
- The title, description and tags come from `youtube.txt`. The internal `Skills:` line is left out. Tags that
  push the list past YouTube's 500-character limit are dropped and the tool lists them. A title over 100
  characters, or `<` or `>` anywhere, stops the run.
- `--privacy private|unlisted|public` (default `private`). `--publish-at` needs a time zone; the video stays
  private until that time.
- `--playlist` accepts a playlist id (`PL…`) or the exact title of one of the channel's playlists. The tool
  looks up the playlist before uploading, so a wrong name fails early.
- `--no-notify` turns off subscriber notifications. `--yes` skips the terminal prompt; use it only after
  the upload has been approved in chat.
- The upload is resumable, in 64 MiB chunks. A dropped connection or a 5xx reply asks the server how much
  arrived and continues from there. If the process dies, run the same command again within about 6 days and
  it resumes the same session (saved in `~/.config/stickman/youtube_resume/`).
- After an upload, the tool writes the video id to `youtube_upload.json` in the episode folder and, for Toy Box
  episodes, to `episodes.json` (`youtube` field). It then runs `episodes.mjs --set <id> uploaded`. An episode
  that already has a video id is refused unless you pass `--force`, so nothing is uploaded twice.

## Quota

A project's default quota is **10,000 units a day**, and it resets at midnight Pacific time. Costs:
`videos.insert` about 1,600, `thumbnails.set` 50, `playlistItems.insert` 50, and list calls 1. That is roughly
**6 uploads a day**. The API does not report how much quota is used, so the tool keeps its own count in
`~/.config/stickman/youtube_quota.json` and `--check` shows it. The Cloud console's Quotas page shows the
project's true total. To upload more than this, request a quota increase (a YouTube API audit form).
