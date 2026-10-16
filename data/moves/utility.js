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
];
