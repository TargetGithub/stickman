#!/usr/bin/env python3
"""Contact sheet for script10k stills: a grid of PNGs, each labelled with its time and chapter.
usage: contact.py <out.jpg> <cols> <label1> <png1> [<label2> <png2> ...]"""
import sys
from PIL import Image, ImageDraw, ImageFont

out, cols = sys.argv[1], int(sys.argv[2])
items = list(zip(sys.argv[3::2], sys.argv[4::2]))
W, H = 640, 360
rows = (len(items) + cols - 1) // cols
sheet = Image.new("RGB", (cols * W, rows * (H + 26)), (24, 24, 28))
try:
    font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 18)
except OSError:
    font = ImageFont.load_default()
draw = ImageDraw.Draw(sheet)
for i, (label, png) in enumerate(items):
    x, y = (i % cols) * W, (i // cols) * (H + 26)
    try:
        im = Image.open(png).convert("RGB").resize((W, H), Image.LANCZOS)
        sheet.paste(im, (x, y + 26))
    except OSError:
        draw.rectangle([x, y + 26, x + W, y + 26 + H], fill=(80, 0, 0))
    draw.text((x + 6, y + 3), label[:70], fill=(255, 230, 120), font=font)
sheet.save(out, quality=82)
