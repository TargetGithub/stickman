#!/bin/zsh
# Upload Doopi & Friends season 2 episodes to YouTube (Doopi channel), private, one at a time: for each finished
# episode without youtube_upload.json, write youtube.txt and the designed thumbnail, then upload with
# tools/youtube_upload.mjs. Episodes already uploaded are skipped. With --wait, an episode that is not rendered yet
# is waited for (checked every 5 minutes), so this can run detached next to the render queue.
# Uploading publishes: run it only after Sridhar has approved these uploads.
# Usage: zsh series/doopi/s2/upload_episodes.sh [--wait] [first last]   (default 1 24)

cd /Users/a81133017/SRIDHAR/PROJECT/StickMan || exit 1
export PATH=/Users/a81133017/.nvm/versions/node/v20.19.3/bin:$PATH
EXT="/Volumes/DISK1MAC/AI Backup files - Youtube/doopi/COMPILATIONS2"
INT="out/series/doopi"
WAIT=0
[ "$1" = "--wait" ] && { WAIT=1; shift; }
FIRST=${1:-1}
LAST=${2:-24}
stamp() { date +%H:%M; }

# The episode's finished folder on either disk, or nothing. record.mjs writes final.mp4 before meta.json and the
# queue makes preview_720p.mp4 last, so an episode counts as finished only once all three are there.
folder() { for d in "$EXT" "$INT"; do [ -f "$d/$1/final.mp4" ] && [ -f "$d/$1/meta.json" ] && [ -f "$d/$1/preview_720p.mp4" ] && { echo "$d/$1"; return 0; }; done; return 1; }

for e in $(seq $FIRST $LAST); do
  i=$(printf %02d $e)
  slug="s2_ep${i}_4k60"
  dir=$(folder $slug)
  while [ -z "$dir" ] && [ $WAIT -eq 1 ]; do sleep 300; dir=$(folder $slug); done
  [ -z "$dir" ] && { echo "$(stamp) ep$i not rendered yet; skipped"; continue; }
  [ -f "$dir/youtube_upload.json" ] && { echo "$(stamp) ep$i already uploaded"; continue; }
  root=$(dirname "$dir")
  node series/doopi/s2/youtube_txt.mjs --dir "$root" > /dev/null
  node series/doopi/s2/thumbnails.mjs --dir "$root" --only ep$i > /dev/null
  echo "$(stamp) ep$i uploading"
  node tools/youtube_upload.mjs "$dir" --channel doopi --video "$dir/final.mp4" --privacy private --yes 2>&1 | grep -E "^(Uploaded|Thumbnail set|error|warning)" \
    || { echo "$(stamp) ep$i upload FAILED"; exit 1; }
  [ -f "$dir/youtube_upload.json" ] || { echo "$(stamp) ep$i upload FAILED (no youtube_upload.json)"; exit 1; }
done
echo "$(stamp) uploads finished ($FIRST-$LAST)"
