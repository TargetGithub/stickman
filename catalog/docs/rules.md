Scripts are checked for structure, meaning and in a dry run (a simulation). Errors (E_) reject the script; warnings (W_) are allowed. Every error comes back with its path and a fix.

## Key rules
- Only the fields in 01_script_format.md; never invent fields ("description", "notes", "type", a beat "duration"). Numbers are not quoted; colors are "#rrggbb"; facing is 1 or -1.
- Ids: lowercase letters, digits and _, starting with a letter (v1 up to 24 characters, v2 32), unique; story beat ids are unique across the story.
- A character beat's "do" is a move; a world beat ("who": "world") does a world command and never has target, outcome, approach or say.
- Attacks take target, outcome and "approach": "run"; paired moves need a partner; "needs" means that prop is held.
- Params are only the listed ones (loops also take distance and cycles); world params include every required (*) one.
- A knocked-out or defeated character cannot act until get_up or return.
- Text is plain Latin letters, digits and punctuation: say 40 characters, text_pop 16, caption 80, narration 160, dialogue lines 120.
- Character colors must stand out on the theme background (05_places_and_objects.md).

## Before you answer, check
1. One JSON object, nothing else; the version, ids and locations are the ones the task gives.
2. Everyone who acts is in characters (clip) or in the scene's cast (story), placed on the stage.
3. Every id is lowercase_with_underscores and unique; every reference points at a beat in the same scene.
4. Every attack with a target has "approach": "run" and an outcome; paired moves have a partner.
5. No target, outcome, approach or say on world beats or non-attack moves.
6. Move, macro and world params use the listed names; required ones are present.
7. Faces, moves, objects, activities, moods, fx and themes come from the pack files.
8. Nobody acts after a KO or defeat without get_up or return.
9. Colors stand out on the background; the first camera key is at 0.
10. The clip or story ends clearly: a victory, a KO, an end card or a fade.
