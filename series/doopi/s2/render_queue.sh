#!/bin/zsh
# Doopi & Friends season 2: the 4K60 render queue (series/doopi/S2_RENDER_PLAN.md).
# Renders episodes one at a time (multi-core, --resume), builds each 4-episode compilation as soon as its episodes
# exist, then writes and renders two Shorts per episode. Safe to stop and start again: finished work is skipped and
# a stopped render keeps its finished chunks.
# Usage: zsh series/doopi/s2/render_queue.sh [first last]   (default 1 24)
# Run detached:  nohup zsh series/doopi/s2/render_queue.sh > out/logs/s2_queue.out 2>&1 &; caffeinate -is -w $!

cd /Users/a81133017/SRIDHAR/PROJECT/StickMan || exit 1
export PATH=/Users/a81133017/.nvm/versions/node/v20.19.3/bin:$PATH
EXT="/Volumes/DISK1MAC/AI Backup files - Youtube/doopi/COMPILATIONS2"
INT="out/series/doopi"
L=out/logs
FIRST=${1:-1}
LAST=${2:-24}
mkdir -p $L $INT

stamp() { date +%H:%M; }
nn() { printf %02d $1; }
# Where finals go: the external drive when it is mounted and writable (checked before every render), else internal.
target() { if [ -d "$EXT" ] && [ -w "$EXT" ]; then echo "$EXT"; else echo "$INT"; fi; }
free_gb() { df -g "$1" | tail -1 | awk '{print $4}'; }
swap_free_mb() { sysctl vm.swapusage | sed -E 's/.*free = ([0-9.]+)M.*/\1/' | cut -d. -f1; }
# A finished episode or Short can be on either disk.
done_dir() { for d in "$EXT" "$INT"; do [ -f "$d/$1/final.mp4" ] && { echo "$d/$1"; return 0; }; done; return 1; }

# Room on the target disk, and some swap, before each 4K render (season 1 crawled at 0.7 fps when swapping).
preflight() {
  local d="$1" what="$2" f s waited=0
  f=$(free_gb "$d")
  if [ "$f" -lt 4 ]; then echo "$(stamp) STOPPED: only ${f} GB free on $d for $what"; exit 1; fi
  s=$(swap_free_mb)
  while [ "$s" -lt 1024 ] && [ $waited -lt 30 ]; do
    echo "$(stamp) $what waits: swap free ${s} MB (close other apps to speed this up)"; sleep 60; waited=$((waited + 1)); s=$(swap_free_mb)
  done
  echo "$(stamp) $what start: $d (${f} GB free, swap free ${s} MB)"
}

render_ep() {
  local i=$(nn $1) slug="s2_ep$(nn $1)_4k60" d
  if done_dir $slug >/dev/null; then echo "$(stamp) ep$i already done ($(done_dir $slug))"; return 0; fi
  d=$(target)
  preflight "$d" "ep$i"
  node tools/record.mjs scripts/series/doopi/s2/ep${i}_v3.json --speech tts --voices series/doopi/tts_voices.json --res 4k --fps 60 \
    --out-dir "$d" --slug $slug --resume > $L/s2_render_ep${i}_4k60.log 2>&1 || { echo "$(stamp) ep$i FAILED (see $L/s2_render_ep${i}_4k60.log)"; exit 1; }
  tail -1 $L/s2_render_ep${i}_4k60.log
  ffmpeg -y -v error -i "$d/$slug/final.mp4" -vf scale=1280:-2 -r 30 -c:v libx264 -crf 30 -preset veryfast -c:a aac -b:a 96k "$d/$slug/preview_720p.mp4"
  rm -rf "$d/$slug/parts"
  echo "$(stamp) ep$i done: $(du -sh "$d/$slug/final.mp4" | cut -f1), $(free_gb "$d") GB free"
}

# Compilation c (1-6) of episodes 4c-3 .. 4c, once all four exist.
compile() {
  local c=$1 a=$(( $1 * 4 - 3 )) b=$(( $1 * 4 )) dirs=() k slug d p
  slug="s2_compilation_$(nn $c)"
  if done_dir $slug >/dev/null; then echo "$(stamp) compilation $c already done"; return 0; fi
  for k in $(seq $a $b); do
    p=$(done_dir s2_ep$(nn $k)_4k60) || { echo "$(stamp) compilation $c waits for ep$(nn $k)"; return 0; }
    dirs+=("$p")
  done
  d=$(target)
  echo "$(stamp) compilation $c (episodes $a-$b) into $d"
  node tools/compilation.mjs "${dirs[@]}" --out "$d/$slug" --title "Doopi & Friends Season 2: Episodes $a-$b" > $L/s2_compilation_$(nn $c).log 2>&1 \
    || { echo "$(stamp) compilation $c FAILED (see $L/s2_compilation_$(nn $c).log)"; exit 1; }
  echo "$(stamp) compilation $c done: $(du -sh "$d/$slug/final.mp4" | cut -f1)"
}

for e in $(seq $FIRST $LAST); do
  render_ep $e
  [ $(( e % 4 )) -eq 0 ] && compile $(( e / 4 ))
done

# Shorts: the two best scenes of each episode as 9:16 Shorts, rendered 4K60 next to the episodes.
mkdir -p scripts/shorts/doopi_s2
for e in $(seq $FIRST $LAST); do
  i=$(nn $e)
  ls scripts/shorts/doopi_s2/ep${i}_v3_*.json >/dev/null 2>&1 || node tools/shorts.mjs scripts/series/doopi/s2/ep${i}_v3.json --auto 2 --out-dir scripts/shorts/doopi_s2 >> $L/s2_shorts.log 2>&1
  for s in scripts/shorts/doopi_s2/ep${i}_v3_*.json; do
    slug="s2_short_$(basename $s .json)"
    done_dir "shorts/$slug" >/dev/null && continue
    d=$(target); mkdir -p "$d/shorts"
    preflight "$d" "$slug"
    node tools/record.mjs $s --speech tts --voices series/doopi/tts_voices.json --res 4k --fps 60 --out-dir "$d/shorts" --slug $slug --resume > $L/$slug.log 2>&1 \
      || { echo "$(stamp) $slug FAILED (see $L/$slug.log)"; exit 1; }
    rm -rf "$d/shorts/$slug/parts"
    echo "$(stamp) $slug done"
  done
done
echo "$(stamp) queue finished"; df -h "$(target)" | tail -1
