// Activities (STORY_SPEC 10, S5.6): short loops of moves kept in sync with objects. Run with the
// world command {"who": "world", "do": "activity", "params": { "name", "with": [ids], ... }}
// (the @activity macro compiles to it in S6). Runners live in engine/story/activities.js:
//   loop   each player repeats its role's moves until `dur` or `reps` is reached
//   rally  two players pass a ball back and forth `reps` times; the last one is missed
// Fields:
//   players [min, max]; spacing (px between neighbours at scale 1); facing "center" | "right"
//   roles: one per player (the last role repeats for extra players):
//     { start?: move once first, moves: [cycled], wait?: s between moves, face?, fx?: per cycle,
//       holds?: holdable it is handed if it isn't holding one, partner?: index of the partner (paired move) }
//   objects: set piece kinds the `object` param may name (seat: they sit on it; tennis_net: the middle)
//   dur | reps: defaults; ending: default ending
//   rally: { ball (object kind), hit: [moves], catch?: move, at: "propTip" | "hands" | "foot",
//            flight (s at medium intensity), height: px above the floor where the ball is met }

export const activities = {
  blow_bubbles: {
    runner: "loop", players: [1, 4], spacing: 150, facing: "center", dur: 6, ending: "laugh",
    roles: [
      { moves: ["blow_wand"], wait: 0.3, face: "happy", holds: "bubble_wand" },
      { moves: ["poke"], wait: 0.7, face: "laugh" },
    ],
  },
  tennis_rally: {
    runner: "rally", players: [2, 2], spacing: 620, facing: "center", reps: 6, ending: "miss", objects: ["tennis_net"],
    roles: [{ holds: "racket", face: "happy" }],
    rally: { ball: "tennis_ball", hit: ["swing_forehand", "swing_backhand"], at: "propTip", flight: 0.9, height: 130 },
  },
  play_catch: {
    runner: "rally", players: [2, 2], spacing: 440, facing: "center", reps: 6, ending: "laugh",
    roles: [{ face: "happy" }],
    rally: { ball: "football", hit: ["toss"], catch: "catch_ball", at: "hands", flight: 0.8, height: 140 },
  },
  kick_ball: {
    runner: "rally", players: [2, 2], spacing: 480, facing: "center", reps: 6, ending: "win",
    roles: [{ face: "happy" }],
    rally: { ball: "football", hit: ["kick_pass"], at: "foot", flight: 1.0, height: 0 },
  },
  eat_together: {
    runner: "loop", players: [1, 4], spacing: 120, facing: "center", dur: 6, ending: "laugh", objects: ["bench", "chair"],
    roles: [{ start: "sit", moves: ["eat"], wait: 0.4, face: "happy" }],
  },
  dance_together: {
    runner: "loop", players: [1, 4], spacing: 170, facing: "center", reps: 2, ending: "laugh",
    roles: [{ moves: ["dance_a", "dance_b"], face: "laugh" }],
  },
  selfie: {
    runner: "loop", players: [1, 4], spacing: 115, facing: "right", reps: 3, ending: "laugh",
    roles: [
      { moves: ["use"], wait: 0.6, face: "laugh", holds: "phone" },
      { moves: ["cheer"], wait: 0.2, face: "happy" },
    ],
  },
  sleep: {
    runner: "loop", players: [1, 4], spacing: 190, facing: "center", dur: 8, ending: "none", objects: ["bench"],
    roles: [{ start: "lie_down", moves: ["sleep"] }],
  },
  comfort: {
    runner: "loop", players: [2, 2], facing: "center", reps: 2, ending: "hug",
    roles: [
      { moves: ["comfort"], partner: 1, wait: 0.3, face: "sad" },
      { moves: [], face: "cry", fx: "tears" },
    ],
  },
};

export const ACTIVITY_NAMES = Object.keys(activities);
