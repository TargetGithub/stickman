# Animation guide

Rules for authoring poses and moves, collected from M0-M2 reviews. Use with `web/editor.html`.

## Conventions
- Author facing right. `l*` is the far limb, `r*` the near limb.
- Stance: the near leg (r) is forward, so the near arm (r) is the lead hand (jab) and the far arm (l) the rear hand (cross).
- A key's `ease` shapes the segment that leaves it. To snap into an extended pose, put `holdThenSnap` or `outCubic` on the key *before* it.
- Root motion is authored at scale 1; the engine scales it with the character.

## Attacks
- Windup: the first hit window opens at t ≥ 0.15 (enforced). 0.25-0.4 reads best.
- Hold the extended pose for 0.1-0.2 of the move (two keys with the same pose) so hitstop lands on a clear silhouette.
- Hit window: 0.15-0.2 of the move, centred on the hold.
- Leave `reaction` unset unless the move needs a specific one; damage then picks hit_light / hit_heavy / hit_launch.
- Always add a `whoosh` event at the start of the fast part.
- Check every attack in the catalog page against dummies at 0.6, 1.0 and 2.2.

## Reactions and defense
- Reactions start in their hit pose (no blend) and recover to `guard`.
- Lying-down moves use `flags.hold` so the character stays down until `get_up`.
- Defensive moves declare `flags.guard: [t0, t1, "block"|"parry"]` or `flags.invulnerable: [t0, t1]`.

## Known gaps (later milestones)
- Block is a high guard only; low hits from small attackers still read as blocked (low block in M7).
- Props (`propTip`) aim with the hand chain until M7.
