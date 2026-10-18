You write ONE scene of a story for a deterministic 2D stickman animation engine, from the story's outline. Your scene is checked by a validator that dry-runs the whole story so far; invalid scenes are sent back with errors. Return exactly one JSON object (the scene) and nothing else.

## Scene format (script schema v2)

```
{
  "id": <the scene id from the outline>, "location": <location id from the outline>,
  "time": "dawn"|"day"|"dusk"|"night", "weather": "clear"|"cloudy"|"rain"|"snow"|"wind"|"fog",
  "music": { "mood": <mood>, "intensity": 0-1 (optional) },
  "transitionIn": { "type": "cut"|"fade"|"dissolve"|"wipe"|"iris"|"card", "dur": s, "kind": "title"|"chapter"|"time"|"end" (card), "title"/"text": str (card), "target": id (iris) },
  "transitionOut": { ... } (optional; the last scene usually fades out),
  "cast": [ { "id": <cast id>, "x": px, "facing": 1|-1, "face": <face> (optional), "hidden": true (optional: appears later with @enter or return), "hp": n (optional: starts fresh) } ],
  "camera": [ ... ] (optional; leave it out to let the story camera choose shots),
  "beats": [ <action beats and macro beats> ]
}
```

Action beat: `{ "id", "at", "who": <character id>|"world", "do": <move or world command>, "target", "outcome", "params", "approach": "run", "partner", "object", "to", "face", "say": str<=40, "bubble": "speech"|"think"|"shout"|"whisper", "fx": [...] }`
Macro beat: `{ "id", "at", "macro": <macro name>, "params": { ... } }` (no who, no do).

`at` has four forms: a number of seconds from the scene start; `{"after": "<beat id>", "delay": s}`; `{"with": "<beat id>", "delay": s}`; `{"on": "<beat id>.<anchor>", "delay": s}`. References stay inside this scene. A macro can be referenced like a beat (`{"after": "fight1"}`) or by its anchors (`{"on": "fight1.finisher"}`).

## How to write a good scene
- **Prefer macros.** `@dialogue` for conversations, `@activity` for games, `@fight` / `@gauntlet` / `@brawl` / `@chase` for action, `@enter` / `@exit` to come and go, `@travel` for journeys, `@defeat` and `@grief` for losses. One macro beat replaces dozens of hand-written beats and is always well paced.
- Chain beats with `{"after": ...}`; give every beat that others refer to an "id". **Beat ids must be unique across the whole story: start them with the scene id** ("s3_talk", "s3_fight").
- Place everyone in "cast" with an x inside the stage (60 to stageWidth - 60; 3200 px unless the location says otherwise). Characters who talk or fight start 250-600 px apart facing each other. Characters who arrive later are placed with "hidden": true and come in with @enter.
- Use faces for feelings ("face" on beats, or the dialogue line's third item), and short lines in bubbles. Speech is shown as text; there is no voice-over.
- Hand-written attacks need "target", "outcome" and "approach": "run". Paired moves (hug, high_five, carry ...) need a "partner".
- A character knocked out (ko_fall, a @fight loser) or defeated (faint, vanish, captured) cannot act until "get_up" or "return". A vanished friend in a kids story must come back with "return" in a later scene.
- Use "narrate" world beats or a card "transitionIn" for the outline's narration. Give the first scene a title card and the last scene an end card or a fade.
- Keep the scene close to its target length. Long dialogue, activities ("reps", "dur"), travel and fights are good ways to fill time; avoid long waits where nothing moves.

{{AUDIENCE_RULES}}

## Catalog

{{CATALOG}}

## Validator codes
Errors (E_) reject the scene; warnings (W_) are allowed but fix them when it is easy. {{CODES}}

## Before you answer, check
1. The scene id and location are the ones the outline gives; everyone who acts is in "cast"; x is on the stage.
2. Beat ids are unique across the story (prefix them with the scene id) and every reference points at a beat in this scene.
3. Macro params use the names in the macro table; required ones are present; ids in them are in this scene's cast.
4. Attacks have target, outcome and approach run; paired moves have a partner; nobody acts while knocked out.
5. Faces, moves, objects, activities, moods and fx come from the catalog.

## Example scenes

{{EXAMPLES}}
