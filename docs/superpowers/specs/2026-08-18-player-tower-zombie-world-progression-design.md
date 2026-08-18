# Player, Tower, Zombie, and World Progression Design

Date: 2026-08-18
Status: Approved concept, pending implementation plan

## Purpose

Extend the current local vertical slice after the north objective and healing potion block. This feature must make progression visible in four places:

- The player becomes stronger through combat.
- Towers become useful but vulnerable defenses.
- Zombies gain readable variants, not only higher hidden stats.
- The world looks less familiar the farther the player travels from the initial fire.

The active project is `D:\wamp64\www\right-for-live-work`. Do not use a second project folder for implementation or validation.

## Scope

In scope:

- Player XP, level, and moderate level bonuses.
- Save support for player progression.
- Tower health, tower damage, tower destruction, and checkpoint fallback.
- Three zombie variants with deterministic spawn selection.
- Distance bands measured from the initial fire/origin, independent of the active checkpoint.
- Tree palette and silhouette changes by distance band.
- Simple procedural distant remnants: house foundations, road pieces, posts, fences, and small ruins.
- HUD updates for level, XP, and active tower health.
- Focused tests and local validation.

Out of scope:

- Backend, online sync, accounts, cloud saves, chat, or gravestones.
- Skill trees, inventory grids, armor, equipment slots, or character classes.
- Repair mechanics, tower rebuilding, tower inventories, or tower placement redesign.
- Authored maps, hand-placed landmarks, external assets, GLTF, textures, React, or TypeScript.
- Full pathfinding. Zombies continue using the current direct steering model.

## Design Principles

The change must stay incremental. Existing systems keep their responsibilities:

- `Player` owns transform, visual state, health, and level-derived combat stats.
- A new small progression system owns XP thresholds and level-up events.
- `Tower` owns its own health state and destroyed state.
- `TowerSystem` handles tower combat, snapshots, and checkpoint fallback.
- `ZombieSystem` owns spawn selection, variant stats, and attack routing.
- `World` and existing prop/tree systems own deterministic distance-band visuals.
- `GameHud` only renders snapshots and event notifications.

No system should read directly from the DOM except the HUD.

## Player Progression

Add `PlayerProgressionSystem` under `src/gameplay/`.

It listens to `zombie:killed` events and awards XP based on zombie tier and variant:

- Base zombie kill: 8 XP.
- Runner: base XP.
- Shambler: base XP.
- Brute: base XP plus a small bonus.
- Tier adds a small deterministic XP increase.

Recommended thresholds:

- Level 1: 0 XP.
- Level 2: 40 XP.
- Level 3: 95 XP.
- Level 4: 170 XP.
- Level 5: 270 XP.

Level 5 is the first cap for this block. Additional XP may continue accumulating, but no extra effects are required.

Level bonuses:

- Max health increases by 8 per level after level 1.
- Revolver damage increases by 3 per level after level 1.
- Healing potion amount can continue using the current base amount for this block, unless code changes make it cheaper to read the player's current max health safely.

When max health increases, current health should increase by the same max-health delta so a level-up feels useful without becoming a full heal.

Events:

- `player:xp-gained`
- `player:leveled`

Snapshot:

```js
{
  level: 2,
  xp: 43,
  currentLevelXp: 40,
  nextLevelXp: 95,
  progress: 0.05
}
```

## Tower Health And Destruction

Add health to every tower:

- Level 1: 120 max health.
- Level 2: 165 max health.
- Level 3: 220 max health.

When a tower levels up, its max health increases and current health gains the max-health delta. This mirrors player level-up behavior.

Zombies can attack towers only when they are aggroed by tower fire. The current `aggroTowerId` behavior remains the entry point. If a zombie is targeting a tower and reaches tower attack range, it damages that tower instead of the player.

Tower destruction:

- A destroyed tower cannot fire.
- A destroyed tower no longer creates a safe zone.
- A destroyed tower cannot be the active checkpoint.
- If the active checkpoint is destroyed, fallback to the newest non-destroyed tower.
- If no non-destroyed tower exists, fallback to the initial fire.

Destroyed towers can remain as visible broken props for this block. They should persist in saves as destroyed so the player can see the loss after reload.

Events:

- `tower:damaged`
- `tower:destroyed`
- `tower:checkpoint-changed`

## Zombie Variants

Add three variants:

### Shambler

Baseline zombie. Balanced health, damage, and speed.

### Runner

Readable as narrower and faster:

- Lower max health.
- Lower damage.
- Higher speed.
- Slightly smaller scale.
- Brighter/desaturated color shift.

### Brute

Readable as heavier and slower:

- Higher max health.
- Higher damage.
- Lower speed.
- Larger scale.
- Darker color shift.

Variant selection must be deterministic from spawn serial, tier, and world seed. It should not use `Math.random()`.

Stats should combine tier scaling with variant multipliers. Existing tests for tier scaling should remain meaningful, and new tests should assert the variant ordering:

- Runner speed > Shambler speed > Brute speed.
- Brute health > Shambler health > Runner health.

## World Distance Bands

World visual variation is measured from the initial fire/origin, not from the active checkpoint. Building a new tower must not reset the visual progression.

Recommended bands:

- Band 0, `camp`: 0 to 120 world units.
- Band 1, `altered-forest`: 120 to 260 world units.
- Band 2, `rural-remnants`: 260 to 460 world units.
- Band 3, `deep-remnants`: 460+ world units.

Use the tile or prop world position distance from origin:

```js
const distance = Math.hypot(worldX, worldZ);
```

Banding can be softened with deterministic per-cell noise so the border does not look like a hard circle. The core rule remains distance from the initial fire.

## Trees By Distance

Tree changes should reuse existing procedural geometry patterns and materials where possible.

Band 0:

- Current forest look.
- Familiar green, brown, and current silhouettes.

Band 1:

- More yellow, gray-green, and muted cyan foliage.
- Taller trunks and slightly leaner crowns.
- Occasional forked or stacked crown silhouette.

Band 2:

- Mixed sparse trees.
- Drier colors and more exposed trunks.
- Some dead or broken tree silhouettes.

Band 3:

- Fewer normal trees.
- More pale, dark, or dead-looking forms.
- Stronger shape contrast so distance is readable even without looking at the HUD.

The implementation should avoid creating unique geometry for every tree. Prefer a small set of reusable recipes/materials selected deterministically per tree.

## Remnants And Rural Props

Add simple procedural props in far bands:

- House foundation: flat low rectangular stone footprint.
- Wall remnant: one or two low block segments.
- Road piece: flat dark or gray strip aligned to grid axes.
- Post: thin vertical column.
- Fence: short repeated posts and rails.
- Debris: small stone/wood blocks.

Placement rules:

- Mostly appears from Band 2 onward.
- Rarer in Band 1 as foreshadowing.
- Deterministic from chunk coordinates and local cell coordinates.
- Avoid the immediate spawn area.
- Do not block critical movement for this first block unless the existing walkability system already supports it safely.
- Keep density low enough that combat readability remains clear.

These props are atmosphere and navigation cues, not interactable loot sources yet.

## HUD

Player status should include level and XP without crowding the existing combat HUD.

Recommended HUD additions:

- Add a compact `NIVEL` row near health.
- Show XP progress as text or a small meter.
- Active tower meta should include tower health when a tower exists.
- Destroyed tower state should be explicit: `TORRE CAIDA`.

Notifications:

- `NIVEL 2`
- `+8 XP`
- `TORRE DANADA`
- `TORRE CAIDA`

Avoid adding a large new panel. The center of the screen must remain playable.

## Save Compatibility

Keep save version compatible if possible by adding defaults during sanitization:

```js
progression: {
  level: 1,
  xp: 0
}
```

Tower snapshots add:

```js
health: 120,
maxHealth: 120,
destroyed: false
```

Old saves without these fields must load cleanly.

If the implementation requires a save version bump, the migration must be explicit and tested. The preferred route is backward-compatible defaults under the current save version.

## Testing

Add or update `tests/gameplay.test.js` to cover:

- Player XP gain and level-up thresholds.
- Level-up increases player max health and current health by the delta.
- Save sanitization defaults missing progression fields.
- Save sanitization defaults missing tower health fields.
- Tower damage reduces health and destruction disables checkpoint eligibility.
- Zombie variant stats preserve intended speed and health ordering.
- Distance-band resolver returns stable bands from world positions.
- Remnant/tree selection is deterministic for the same coordinates and seed.

Existing tests must continue passing.

## Browser Validation

After implementation:

- Run `npm test`.
- Run `npm run build`.
- Start Vite from `D:\wamp64\www\right-for-live-work`.
- Verify the HUD shows player level/XP.
- Verify killing zombies advances XP.
- Verify a tower can be damaged/destroyed by aggroed zombies.
- Verify moving far north or away from origin changes tree colors/forms and eventually shows rural remnants.
- Verify no console errors.

## Risks

Risk: tower destruction makes the game too punishing.

Response: use conservative tower health and let destroyed towers remain visible. Repair stays out of scope until the first balance pass is playable.

Risk: distant props clutter combat.

Response: keep prop density low, mostly decorative, and non-blocking for this block.

Risk: visual bands look like obvious circular rings.

Response: use deterministic noise at band boundaries while preserving origin distance as the main rule.

Risk: save changes break existing local progress.

Response: sanitize missing fields with defaults and add tests before browser validation.

## Acceptance Criteria

- The project still runs from `D:\wamp64\www\right-for-live-work`.
- No second project folder is used for implementation or validation.
- Player level and XP are visible and increase from zombie kills.
- Level bonuses affect player max health and weapon damage.
- Towers have visible health, can be damaged, and can be destroyed.
- Destroyed towers stop firing and cannot remain active checkpoints.
- Zombies spawn as deterministic variants with readable stat and visual differences.
- Tree colors/forms vary by distance from the initial fire.
- Simple rural remnants appear in farther bands.
- Old saves continue loading.
- `npm test` and `npm run build` pass.
