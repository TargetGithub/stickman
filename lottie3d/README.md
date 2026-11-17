# Lottie3D (prototype v0.2)

A tiny open JSON format for keyframed **3D character animation**, plus a web player. The idea is to do for
animated 3D characters what Lottie did for 2D vector animation: one small JSON file that any site or app can embed.

- `SPEC.md`: format v0.1 (scene, characters with a named-joint rig, props, keyframe tracks, easing, errors).
- `EDITOR_SPEC.md`: the kids' editor and format v0.2 (stage, cast, timeline of move blocks, poses); E1 status in 11.1.
- `player.js`: the browser player for v0.1 and v0.2 (Three.js 0.170.0 from jsDelivr, pinned; no other dependencies).
- `models.js`: Three.js builders (stages, part models, glTF characters, rigs, speech bubbles).
- `sample.js`: keyframe sampling and `evaluate(doc, t)`, pure and shared by Node and the browser.
- `expand.js` / `moves.js`: v0.2 move blocks → keyframes, clips, camera and events; `evaluateCast(resolved, t)`. Pure.
- `validate.js` / `validate02.js` / `validate-cli.mjs`: the validator, with a path and code for every error.
- `rig.js`: the skeleton and catalog names.
- `catalog/`: `kids_allow.json` (hand-written allowlist) and `kids.json` + `assets/` (generated from `engine3d/catalog`
  by `npm run lottie3d:catalog`; never edit by hand).
- `examples/`: v0.2 `garden_friends.json`, `playroom_party.json`, `snow_walk.json`; v0.1 `wave.json`, `walk.json`, `jump.json`.
- `index.html`: the demo page.
- `EDITOR_SPEC.md`: draft spec for the kids' editor (Lottie3D Kids Studio) and format v0.2.

## The format in 30 seconds

```json
{
  "format": "lottie3d", "version": "0.1", "duration": 2.4, "fps": 30, "loop": true,
  "scene": { "background": "#cfe8ff", "camera": { "position": [0.6, 1.3, 4.2], "target": [0, 1.05, 0] },
             "ground": { "color": "#a5d17a" } },
  "characters": [{
    "id": "sam", "rig": "stick", "color": "#33415c",
    "tracks": {
      "shoulderR": [ { "t": 0, "v": [0, 0, -8], "ease": "backOut" }, { "t": 0.4, "v": [0, 0, -155] } ]
    }
  }],
  "props": [{ "id": "ball", "type": "ball", "color": "#e63946", "size": 0.3, "position": [0.8, 0.15, 0.3] }]
}
```

A character is a rig (`stick` or `block`) with 11 named joints (`root`, `spine`, `neck`, `shoulderL/R`, `elbowL/R`,
`hipL/R`, `kneeL/R`). Each track is a list of keyframes `{ t, v, ease }`: joint rotations are Euler degrees,
`position` moves the whole character. Eases are named (`sineInOut`, `backOut`, `bounceOut`, ...) or a
cubic-bezier `[x1, y1, x2, y2]`. A track can be `{ "keys": [...], "repeat": true }` to cycle inside a longer clip.
See `SPEC.md` for the rest, including a sign table for which way each joint bends.

## Embed the player

As a module:

```html
<canvas id="c" style="width: 640px; height: 360px"></canvas>
<script type="module">
  import { createPlayer } from "./lottie3d/player.js";
  const json = await (await fetch("./lottie3d/examples/wave.json")).json();
  const p = createPlayer(document.getElementById("c"), json, { autoplay: true });
  // p.play(); p.pause(); p.seek(1.2); p.load(otherJson); p.time; p.duration; p.dispose();
</script>
```

`createPlayer` throws a `Lottie3DError` (with `.errors`) if the document is invalid. Options: `catalog` (the parsed
`catalog/kids.json`, required for v0.2), `assetBase` (where catalog assets live, default `./catalog/` next to
`player.js`), `autoplay`, `onTime(t)`, `onEnd()` (non-looping clips), `pixelRatio`. `await p.ready` waits for glTF
characters to load.

A v0.2 file in 15 lines:

```json
{
  "format": "lottie3d", "version": "0.2", "duration": 6, "fps": 30, "stage": "garden",
  "cast": [
    { "id": "duck", "kind": "critter", "name": "duck", "at": [0, 0] },
    { "id": "robo", "kind": "character", "name": "robot", "at": [1.5, 0], "facing": -30 }
  ],
  "timeline": [
    { "who": "duck", "at": 0, "do": "show" },
    { "who": "duck", "at": 0.8, "do": "hop", "with": { "times": 2 } },
    { "who": "robo", "at": 1, "do": "wave" },
    { "who": "duck", "at": 2.6, "do": "say", "with": { "words": ["hello", "friend"] } },
    { "who": "camera", "at": 4, "do": "close", "dur": 2, "with": { "target": "duck" } }
  ]
}
```

As a custom element:

```html
<script type="module">
  import { defineElement } from "./lottie3d/player.js";
  defineElement(); // <lottie3d-player>
</script>
<lottie3d-player src="./lottie3d/examples/jump.json" autoplay style="width: 480px"></lottie3d-player>
<lottie3d-player src="./lottie3d/examples/garden_friends.json" catalog="./lottie3d/catalog/kids.json" autoplay></lottie3d-player>
```

Playback is deterministic: the frame shown is `evaluate(doc, t)` with `t` snapped to whole frames, so the same
time always gives the same pose. There is no `Math.random`, and the only clock is the
`requestAnimationFrame` timestamp used to move `t` forward while playing.

## Run the demo

```bash
npm run serve
```

Then open http://localhost:5173/lottie3d/index.html. Pick an example or open your own `.json` file. Invalid files
list every error.

## Validate and test

```bash
node lottie3d/validate-cli.mjs lottie3d/examples/*.json
```

```bash
npm run test:lottie3d
```

## Next

The kids' editor milestones (E2 onward) are in `EDITOR_SPEC.md` section 11. Format-level ideas: quaternion
interpolation, more moves (feel, point at, effects), real audio, glTF characters mapped to the Lottie3D joints.
