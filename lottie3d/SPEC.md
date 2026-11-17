# Lottie3D format v0.1

A small JSON format for keyframed 3D character animation, played by `player.js`.
Units are meters and degrees. Time is in seconds. The world is right-handed: +Y is up,
the default camera looks down −Z, and a character with `yaw: 0` faces +Z (toward that camera).

Playback is a pure function of time: the frame at time `t` depends only on the document and `t`.
There is no randomness and no simulation state.

## 1. Document

```json
{
  "format": "lottie3d",
  "version": "0.1",
  "name": "Wave hello",
  "duration": 2,
  "fps": 30,
  "loop": true,
  "scene": { ... },
  "characters": [ ... ],
  "props": [ ... ],
  "meta": { "author": "anyone", "anything": "free-form" }
}
```

| Key | Type | Required | Notes |
|---|---|---|---|
| `format` | `"lottie3d"` | yes | |
| `version` | `"0.1"` | yes | |
| `name` | string | no | |
| `duration` | number > 0 | yes | Seconds. |
| `fps` | integer 1–120 | yes | Playback snaps time to whole frames: `t = floor(t·fps)/fps`. |
| `loop` | boolean | no, default `true` | When false, playback stops on the last frame. |
| `scene` | object | yes | Section 2. |
| `characters` | array | no, default `[]` | Section 3. |
| `props` | array | no, default `[]` | Section 4. |
| `meta` | object | no | Ignored by the player. |

Unknown keys are errors (they are usually typos). Put free-form data in `meta`.

## 2. Scene

```json
"scene": {
  "background": "#cfe8ff",
  "camera": { "position": [0, 1.4, 5], "target": [0, 1, 0], "fov": 40, "tracks": {} },
  "lights": [
    { "type": "ambient", "color": "#ffffff", "intensity": 0.6 },
    { "type": "directional", "color": "#ffffff", "intensity": 1.2, "position": [3, 6, 4], "shadow": true }
  ],
  "ground": { "color": "#a5d17a", "size": 20 }
}
```

- `background`: color `#rgb` or `#rrggbb`. Required.
- `camera`: required. `position` and `target` are `[x, y, z]`; `fov` is the vertical field of view in degrees (1–170, default 40).
  `tracks` may animate `position`, `target` (vec3) and `fov` (number).
- `lights`: optional, default one ambient and one directional light. `type` is `ambient`, `directional`, `point` or `hemisphere`.
  `color` default `#ffffff`, `intensity` ≥ 0 default 1. `position` is used by `directional` and `point`.
  `groundColor` is used by `hemisphere`. `shadow: true` makes a directional light cast shadows.
- `ground`: optional square floor at y = 0. `color` default `#dddddd`, `size` default 20. Omit it for no floor.

## 3. Characters

```json
{
  "id": "bob",
  "rig": "stick",
  "color": "#33415c",
  "accent": "#f2b134",
  "scale": 1,
  "position": [0, 0, 0],
  "yaw": 0,
  "tracks": { "shoulderR": [ { "t": 0, "v": [0, 0, -150], "ease": "sineInOut" }, ... ] }
}
```

- `id`: unique across characters and props. Required.
- `rig`: `stick` (thin limbs, round head) or `block` (low-poly boxes). Both have the same skeleton. Required.
- `color` (body) and `accent` (head and hands): colors. Defaults `#333333` and `#f2c48d`.
- `scale`: number > 0, default 1. The rig is 1.88 m tall at scale 1.
- `position`: where the feet stand, default `[0, 0, 0]`. `yaw`: degrees about +Y, default 0.

### 3.1 Skeleton

All joints rest with limbs hanging straight down and the spine straight up. Each joint rotation
is an Euler XYZ rotation in degrees, local to its parent.

| Joint | Parent | Rest offset from parent (m) | Bone |
|---|---|---|---|
| `root` (pelvis) | – | `[0, 0.95, 0]` above `position` | – |
| `spine` | `root` | `[0, 0, 0]` | up 0.50 |
| `neck` | `spine` | `[0, 0.50, 0]` | up 0.10, head center at 0.20 |
| `shoulderL` / `shoulderR` | `spine` | `[±0.18, 0.46, 0]` | down 0.30 |
| `elbowL` / `elbowR` | shoulder | `[0, -0.30, 0]` | down 0.28, hand at the end |
| `hipL` / `hipR` | `root` | `[±0.10, 0, 0]` | down 0.45 |
| `kneeL` / `kneeR` | hip | `[0, -0.45, 0]` | down 0.45, foot at the end |

`L` joints are on the character's left, which is +X when `yaw` is 0.

Handy signs (character facing +Z):

| Motion | Rotation |
|---|---|
| swing an arm or leg forward | negative `x` on the shoulder or hip |
| bend a knee | positive `x` on the knee |
| bend an elbow (forearm forward) | negative `x` on the elbow |
| lean the torso forward | positive `x` on `spine` |
| raise the left arm sideways | positive `z` on `shoulderL` |
| raise the right arm sideways | negative `z` on `shoulderR` |
| turn the head left | positive `y` on `neck` |

### 3.2 Character tracks

| Track | Value | Meaning |
|---|---|---|
| `position` | vec3 | Added to `position` (for walking, jumping, bobbing). |
| any joint name | vec3 | Joint rotation `[x, y, z]` in degrees. A joint without a track stays at rest. |

## 4. Props

```json
{ "id": "ball", "type": "ball", "color": "#e63946", "size": 0.3,
  "position": [1, 0.15, 0], "rotation": [0, 0, 0], "tracks": { "position": [ ... ] } }
```

- `type`: `box`, `sphere`, `ball` (a sphere with a stripe), `cylinder` or `cone`. Required.
- `size`: number (uniform) or `[x, y, z]`, default 0.5. For round types it is the diameter.
- `color` default `#888888`, `position` default `[0, 0, 0]` (the prop's center), `rotation` default `[0, 0, 0]` (degrees).
- Tracks: `position`, `rotation` (vec3, replace the static value) and `scale` (vec3 multiplier, default `[1, 1, 1]`).

## 5. Tracks and keyframes

A track is either an array of keyframes, or an object `{ "keys": [...], "repeat": true }`.

```json
[ { "t": 0, "v": [0, 0, 0], "ease": "sineInOut" }, { "t": 0.5, "v": [-30, 0, 0] } ]
```

- `t`: seconds, `0 ≤ t ≤ duration`, strictly increasing within a track.
- `v`: the value (vec3 or number, as the track requires).
- `ease`: how to move from this key to the next one. Default `linear`. Either a name or a
  cubic-bezier `[x1, y1, x2, y2]` with `0 ≤ x1, x2 ≤ 1` (the CSS / Lottie curve).

Names: `linear`, `step` (hold until the next key), `quadIn`, `quadOut`, `quadInOut`, `cubicIn`, `cubicOut`,
`cubicInOut`, `sineIn`, `sineOut`, `sineInOut`, `backIn`, `backOut`, `elasticOut`, `bounceOut`.

Sampling: before the first key the value is the first key's `v`; after the last key it is the last key's `v`;
in between, each component is `a + (b − a)·ease(u)` with `u` the fraction of the segment.
Rotations interpolate per Euler component (good enough for v0.1; a later version may add quaternions).

`repeat: true` cycles the keys with a period equal to the last key's `t` (which must be > 0): sample at
`t mod period`. Use it for a walk cycle inside a longer clip. The first and last keys usually hold the same value.

## 6. Errors

The validator returns `{ ok, errors }`. Each error is `{ path, code, message }`, for example
`{ "path": "characters[0].tracks.hipL[2].t", "code": "E_KEY_ORDER", "message": "key times must increase: 0.5 after 0.5" }`.

| Code | Meaning |
|---|---|
| `E_JSON` | Not parseable JSON. |
| `E_FORMAT` / `E_VERSION` | Wrong `format` or unsupported `version`. |
| `E_REQUIRED` | A required key is missing. |
| `E_TYPE` | Wrong type (string, number, array, object, vec3, color). |
| `E_RANGE` | A number is out of range. |
| `E_ENUM` | A name is not one of the allowed values (rig, prop type, light type, ease, joint, track). |
| `E_UNKNOWN_KEY` | A key the format does not define. |
| `E_DUP_ID` | Two characters or props share an `id`. |
| `E_KEY_ORDER` | Keyframe times do not strictly increase. |
| `E_EMPTY` | A track has no keyframes. |
