// Move pools for macros (STORY_SPEC 11.3): taken from the injected catalog by category, held prop and body plan.
// Milestone: S6.

/** Attacks that need a special set-up and never come from a pool. */
const SPECIAL = ["counter", "throw_prop", "energy_blast", "shoot"];
/** Kicks a fighter with a weapon mixes in. */
const KICKS = ["front_kick", "roundhouse", "sweep", "knee", "spinning_kick"];

const damageOf = (def) => (typeof def.params?.damage === "number" ? def.params.damage : 8);

/** Moves the body plan avoids in generated fights (data/bodies.js `avoid`). */
function avoided(ctx, id) {
  const body = ctx.castById.get(id)?.body;
  return new Set(ctx.catalog.bodies?.[body]?.avoid || []);
}

/** Prop kind a character holds when the macro starts (scene placement, else the cast entry). */
export function heldKind(ctx, id) {
  const placed = ctx.placement?.(id);
  const name = placed && placed.prop !== undefined ? placed.prop : ctx.castById.get(id)?.prop;
  if (!name) return null;
  return ctx.catalog.props?.[name]?.kind ?? ctx.catalog.objects?.[name]?.hold?.kind ?? null;
}

/**
 * Attack pools for one fighter: { light, heavy, launchers } (move names).
 * Launchers (explicit launch reactions, or damage at the heavy threshold) only come up as finishers,
 * so ordinary hits never leave someone lying down in the middle of an exchange.
 */
export function attackPool(ctx, id) {
  const kind = heldKind(ctx, id);
  const avoid = avoided(ctx, id);
  const out = { light: [], heavy: [], launchers: [] };
  for (const def of ctx.moves.values()) {
    if (def.category !== "attack" || SPECIAL.includes(def.name) || avoid.has(def.name)) continue;
    // Head strikes cannot aim, so they miss a defender who has ducked into a reaction pose: authors only.
    if ((def.hits || []).some((h) => h.part === "head")) continue;
    if (def.needsProp && def.needsProp !== kind) continue;
    // With a weapon, the weapon's moves plus kicks; unarmed, every unarmed attack.
    if (kind && !def.needsProp && !KICKS.includes(def.name)) continue;
    const launches = (def.hits || []).some((h) => h.reaction === "hit_launch") || damageOf(def) >= 16;
    if (launches) out.launchers.push(def.name);
    else (damageOf(def) <= 8 ? out.light : out.heavy).push(def.name);
    if (def.needsProp) (damageOf(def) <= 8 ? out.light : out.heavy).push(def.name); // weapon moves count twice
  }
  if (!out.light.length) out.light = out.heavy.slice();
  if (!out.heavy.length) out.heavy = out.light.slice();
  return out;
}

/** A finisher for a fighter: the requested move when it can do it, else a heavy launcher from its pool. */
export function finisherFor(ctx, id, requested, pickFn) {
  const kind = heldKind(ctx, id);
  const def = requested ? ctx.moves.get(requested) : null;
  if (def && def.category === "attack" && (!def.needsProp || def.needsProp === kind)) return requested;
  const pool = attackPool(ctx, id);
  // Long run-up attacks (a flying kick) need room behind the attacker, which a crowd or the stage edge may
  // not leave: only when the author asks for one.
  const grounded = pool.launchers.filter((m) => !(ctx.moves.get(m).params?.travel > 100));
  return pickFn(grounded.length ? grounded : pool.launchers.length ? pool.launchers : pool.heavy);
}

/** Emotes for taunts, breathers and reactions (only the ones in this catalog). */
export function emotes(ctx, names) {
  return names.filter((n) => ctx.moves.has(n));
}
