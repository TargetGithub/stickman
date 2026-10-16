// utility moves (spec 8.4). Schema: spec 8.1.
// keepPose: the character holds whatever pose it had. durationParam: params.seconds sets the length.
export const moves = [
  {
    name: "wait",
    category: "utility",
    duration: 1,
    params: { seconds: 1 },
    flags: { keepPose: true, durationParam: "seconds" },
    keys: [{ t: 0, pose: "stand" }],
  },
  {
    name: "face",
    category: "utility",
    duration: 0.15,
    flags: { keepPose: true },
    keys: [{ t: 0, pose: "stand" }],
  },
  {
    name: "pick_prop",
    category: "utility",
    duration: 0.8,
    keys: [
      { t: 0, pose: "guard", ease: "outQuad" },
      { t: 0.4, pose: "pickDown", ease: "linear" },
      { t: 0.6, pose: "pickDown", ease: "inOutQuad" },
      { t: 1, pose: "swordGuard", propAngle: 55 },
    ],
    events: [{ t: 0.5, pick: true, sfx: "pop" }],
  },
  {
    name: "drop_prop",
    category: "utility",
    duration: 0.6,
    keys: [
      { t: 0, pose: "guard", ease: "outQuad" },
      { t: 0.35, pose: "dropPose", ease: "linear" },
      { t: 1, pose: "guard" },
    ],
    events: [{ t: 0.35, drop: true, sfx: "land" }],
  },
  {
    name: "teleport",
    category: "utility",
    duration: 0.8,
    params: { dx: 300 },
    keys: [
      { t: 0, pose: "guard", ease: "outQuad" },
      { t: 0.3, pose: "crouch", ease: "linear" },
      { t: 0.65, pose: "crouch", ease: "outBack" },
      { t: 1, pose: "guard" },
    ],
    events: [{ t: 0.32, hide: true, sfx: "pop" }, { t: 0.5, teleport: true }, { t: 0.62, show: true, sfx: "pop" }],
  },
  {
    name: "spawn",
    category: "utility",
    duration: 0.7,
    keys: [
      { t: 0, pose: "crouch", ease: "outBack" },
      { t: 0.6, pose: "guard", ease: "inOutQuad" },
      { t: 1, pose: "guard" },
    ],
    events: [{ t: 0, show: true, sfx: "pop" }],
  },
  {
    name: "despawn",
    category: "utility",
    duration: 0.7,
    keys: [
      { t: 0, pose: "guard", ease: "inOutQuad" },
      { t: 0.45, pose: "crouch", ease: "linear" },
      { t: 1, pose: "crouch" },
    ],
    flags: { hold: true },
    events: [{ t: 0.45, hide: true, sfx: "pop" }],
  },
];
