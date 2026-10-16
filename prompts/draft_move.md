A move entry (engine spec 8.1):
{ "name": "lowercase_name", "category": "life" (everyday actions) | "emote" | "movement" (walks, with params.stride and root motion) | "utility",
  "duration": seconds at speed 1 (0.3-4),
  "params": optional defaults, e.g. { "cycles": 3 } for a loop, { "stride": 100 } for a walk,
  "flags": optional: { "loop": true } repeats until params.cycles or params.distance; { "hold": true } keeps the last pose (sitting, lying),
  "needsProp": optional prop kind it must hold (racket, wand, phone, ...),
  "face": optional face shown while it runs (happy, sad, cry, laugh, surprised, scared, tired, determined, love, ...),
  "keys": [ { "t": 0..1, "pose": "<named pose>" or { channels }, "ease": "linear" | "inOutQuad" | "outQuad" | "inQuad" | "outBack" | "outCubic", "propAngle": degrees (held props) } ],
  "root": optional root motion [ { "t", "dx", "dy" } ] in px (dx forward, dy down: negative lifts the body),
  "events": optional [ { "t", "sfx": "step" | "pop" | "whoosh" | ..., "fx": ["sweat_drop", "exclaim", ...] } ] }

Pose channels (degrees; a missing channel is 0):
- rot: whole body rotation (positive tips forward); lean: torso tilt from vertical (positive forward); head: head tilt (positive is chin down).
- lUA, rUA: upper arms; 0 hangs along the torso, positive swings forward (90 points forward, 180 straight up along the torso).
- lFA, rFA: forearms relative to the upper arm; positive bends the elbow (forearm forward/up).
- lTH, rTH: thighs relative to the torso; 0 hangs along the torso. IMPORTANT: legs follow the torso lean, so to keep a leg vertical while leaning by L, set the thigh to about L (lean 20 → thighs near 20).
- lSH, rSH: shins relative to the thigh; positive bends the knee (shin backward).
- dx, dy: visual root offset in px (dy positive lowers the hip, e.g. a crouch).
"l" is the far side (drawn darker), "r" the near side. The figure faces right.

Rules:
- The first key is at t 0 and the last at t 1. Start and end near "stand" (or "guard") so the move blends with others, unless it holds a pose.
- Feet stay on the floor unless the move jumps (then root dy goes negative and returns to 0). The engine keeps the lowest point on the floor.
- Anticipation and follow-through: a small wind-up before the main action, a settle after it.
- Keep angles within -180..360. Keep it readable in silhouette: arms clear of the body for the key poses.
- Original, family-friendly motions only.
