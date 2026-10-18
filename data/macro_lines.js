// Short, kid-friendly lines the story compiler uses when it builds scenes on its own (S6):
// fight card intros, breathers and victories. Each list is drawn from with the macro's seeded stream.
// Keep every line under 40 characters (one bubble) and free of soft-listed words.

export const macroLines = {
  // [challenger, answer] pairs for a fight card intro
  rivals: [
    ["You can't beat me!", "We'll see about that!"],
    ["Ready for this?", "I was born ready."],
    ["This time I win.", "Not if I can help it!"],
    ["Let's settle this.", "Bring it on!"],
    ["Nobody gets past me.", "Watch me."],
  ],
  // the round winner, catching their breath
  breather: ["Phew... one down.", "That was close!", "Okay. Next!", "I can do this.", "Who's next?"],
  // the newcomer in a breather
  challenge: ["My turn now!", "You won't be so lucky.", "Think you're tough?", "Let's go!"],
  // the final winner
  victory: ["I did it!", "Yes! Champion!", "That was a great fight!", "Thanks for the match!"],
};
