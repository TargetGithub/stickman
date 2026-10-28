#!/bin/zsh
# Determinism check: hash every frame of the demo on two GPU runs, a 3-page run and two SwiftShader runs.
set -e
cd "$(dirname $0)/.."
H=../out/demos/3d/determinism
mkdir -p $H
R="node tools/render3d.mjs scripts/count_to_five.json --res 1080p"
${=R} --hash $H/gpu_a.json
${=R} --hash $H/gpu_b.json
${=R} --jobs 3 --hash $H/gpu_jobs3.json
${=R} --gl swiftshader --frames 0:300 --hash $H/swiftshader_a.json
${=R} --gl swiftshader --frames 0:300 --hash $H/swiftshader_b.json
node tools/compare_hashes.mjs $H
