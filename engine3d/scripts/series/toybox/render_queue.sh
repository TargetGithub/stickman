#!/bin/zsh
# Toy Box Friends: the 4K60 render queue for a list of episodes (default: batch 3, EPISODES.md).
# One episode at a time: episode3d.mjs --final (4K60, multi-core) plus designed thumbnails, contact sheet and
# youtube.txt, into the backup drive's playlist folder when it is mounted and writable (checked before every
# episode), else out/series3d/toybox. Finished episodes (final_4k60.mp4 present) are skipped, so the queue can be
# stopped and started again. Each finished episode is marked rendered in episodes.json / EPISODES.md.
# It waits while another heavy render (a Doopi tools/record.mjs) is running, and for some free swap.
# Usage: zsh engine3d/scripts/series/toybox/render_queue.sh [id ...]
# Run detached:  nohup zsh engine3d/scripts/series/toybox/render_queue.sh > out/logs/toybox_b3_queue.out 2>&1 &; caffeinate -is -w $!

cd /Users/a81133017/SRIDHAR/PROJECT/StickMan || exit 1
export PATH=/Users/a81133017/.nvm/versions/node/v20.19.3/bin:$PATH
DIR=engine3d/scripts/series/toybox
EXT="/Volumes/DISK1MAC/AI Backup files - Youtube/Toybox"
INT="out/series3d/toybox"
L=out/logs
mkdir -p $L $INT
IDS=(pk17 pk18 pk19 pk20 pk21 g111 g112 g113 g114 g115 g211 g212 g213 g214 g215 g301 g302 g303 g304 g305 g401 g402 g403 g404 g405 g501 g502 g503 g504 g505)
(( $# )) && IDS=($@)

stamp() { date +%H:%M; }
free_gb() { df -g "$1" | tail -1 | awk '{print $4}'; }
swap_free_mb() { sysctl vm.swapusage | sed -E 's/.*free = ([0-9.]+)M.*/\1/' | cut -d. -f1; }
playlist() { case $1 in pk*) echo PREK-PLAYLIST;; bb*) echo "PREK-INITIAL VIDEOS";; g1*) echo GRADE1-PLAYLIST;; g2*) echo GRADE2-PLAYLIST;; g3*) echo GRADE3-PLAYLIST;; g4*) echo GRADE4-PLAYLIST;; g5*) echo GRADE5-PLAYLIST;; esac; }

USE_EXT=$([ -d "$EXT" ] && [ -w "$EXT" ] && echo 1)
for id in $IDS; do
  script=$(ls $DIR/${id}_*.json 2>/dev/null | head -1)
  if [ -z "$script" ]; then echo "$(stamp) $id: no script, skipped"; continue; fi
  name=$(basename $script .json)
  pl=$(playlist $id)
  if [ -f "$EXT/$pl/$name/final_4k60.mp4" ] || [ -f "$INT/$name/final_4k60.mp4" ]; then echo "$(stamp) $id: already rendered"; continue; fi
  while pgrep -f "tools/record.mjs" > /dev/null; do echo "$(stamp) $id waits: another heavy render is running"; sleep 120; done
  # A drive that was there when the queue started and drops out (USB) is waited for, not swapped for the full internal disk.
  w=0; while [ -n "$USE_EXT" ] && ! { [ -d "$EXT" ] && [ -w "$EXT" ]; } && [ $w -lt 20 ]; do echo "$(stamp) $id waits: $EXT not writable"; sleep 30; w=$((w + 1)); done
  if [ -d "$EXT" ] && [ -w "$EXT" ]; then base="$EXT/$pl"; loc="disk1:$pl/$name"; elif [ -n "$USE_EXT" ]; then echo "$(stamp) STOPPED: $EXT is gone"; exit 1; else base="$INT"; loc="out:$name"; fi
  mkdir -p "$base"
  f=$(free_gb "$base")
  if [ "$f" -lt 6 ]; then echo "$(stamp) STOPPED: only ${f} GB free on $base"; exit 1; fi
  s=$(swap_free_mb); w=0
  while [ "$s" -lt 512 ] && [ $w -lt 30 ]; do echo "$(stamp) $id waits: swap free ${s} MB"; sleep 60; w=$((w + 1)); s=$(swap_free_mb); done
  echo "$(stamp) $id start -> $base/$name (${f} GB free, swap free ${s} MB)"
  ok=
  for try in 1 2; do
    # A write error on the drive (EIO) fails the render: wait a minute and draw it again once.
    if node engine3d/tools/episode3d.mjs $script --final --out-dir "$base/$name" > $L/toybox_${id}.log 2>&1 && [ -f "$base/$name/final_4k60.mp4" ]; then ok=1; break; fi
    [ $try = 1 ] && { cp $L/toybox_${id}.log $L/toybox_${id}_try1.log; echo "$(stamp) $id failed, trying again (log $L/toybox_${id}_try1.log)"; sleep 60; }
  done
  if [ -n "$ok" ]; then
    node engine3d/tools/episodes.mjs --set $id rendered "$loc" > /dev/null
    echo "$(stamp) $id done ($(du -h "$base/$name/final_4k60.mp4" | cut -f1))"
  else
    echo "$(stamp) $id FAILED (log $L/toybox_${id}.log)"
  fi
done
echo "$(stamp) queue finished"
