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
];
