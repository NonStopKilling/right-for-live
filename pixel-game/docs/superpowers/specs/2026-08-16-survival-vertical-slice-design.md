# Survival Vertical Slice Design

Date: 2026-08-16
Status: Approved for implementation
Branch: `v2`

## Purpose

Turn the current procedural diorama into a small but complete survival game loop:

1. Explore the generated world.
2. Harvest wood, stone, and strange artifacts.
3. Defend the player with a revolver.
4. Build an automated refuge tower.
5. Use every completed tower as a safe zone and respawn checkpoint.
6. Move farther from the origin to face stronger enemies and earn better loot.

This slice must be playable from start to first tower without zombies, resources, or interface systems being placeholders.

## Scope

### Included

- Hold-to-harvest interaction for trees, rocks, and strange artifacts.
- Automatic zombie loot.
- Inventory counters for wood, stone, artifacts, and ammunition.
- Mouse-aimed revolver with magazine, reserve ammunition, and reload.
- One zombie visual recipe with distance-based stat scaling.
- One buildable refuge tower with automatic targeting.
- Tower levels earned from kills.
- Safe zones, death, respawn, and local save data.
- Compact tactical HUD selected as visual direction A.
- A short Spanish story sequence about returning to the protagonist's family.
- UI SFX integration and procedural Web Audio combat effects.

### Excluded

- Multiple weapons or equippable items.
- Multiple tower recipes.
- Manual inventory grids, item dragging, or equipment screens.
- Complex pathfinding, navigation meshes, or destructible terrain.
- Zombie animation rigs or external model assets.
- Multiplayer, accounts, cloud saves, or backend services.
- Day and night simulation beyond the current visual profiles.

## Player Experience

The player begins at the central signal fire with a loaded revolver and a short radio message. Nearby resources are intentionally sufficient for the first tower. The first zombies begin outside the origin clearing and pressure the player while resources are gathered. Building a tower creates a visible protected area, sets a new respawn point, and advances the story toward the north.

The central play area must remain unobstructed by permanent HUD panels. Messages appear briefly, while objectives and essential combat values stay at the screen edges.

## Controls

| Input | Action |
| --- | --- |
| `WASD` or arrows | Move |
| Mouse position | Aim on the terrain plane |
| Left mouse button | Fire revolver or confirm tower placement |
| `R` | Reload |
| Hold `E` | Harvest the nearest valid resource |
| `B` | Enter or leave tower build mode |
| `Escape` | Cancel build mode or close a story panel |
| Mouse wheel | Camera zoom |
| `M` | Toggle sound |
| `F2` | Toggle chunk debug borders |

## Resources and Inventory

### Resource types

- Wood: harvested from procedural trees.
- Stone: harvested from procedural rock clusters.
- Strange artifacts: harvested from rare cyan signal fragments. One deterministic fragment is guaranteed near the origin for the first tower; additional fragments become more common beyond the first forest ring.
- Ammunition: supplied initially and awarded by zombie loot.

Each eligible procedural object receives a deterministic resource ID derived from its grid coordinates and type. Resource nodes remain associated with their owning chunk. Harvesting marks the ID as depleted and asks the chunk to rebuild only its vegetation or prop layer. This keeps existing `InstancedMesh` rendering while allowing individual logical resources to disappear.

The closest resource within 1.35 world units is the interaction target. Holding `E` fills a visible progress indicator. Wood takes 0.8 seconds, stone 1.05 seconds, and artifacts 1.25 seconds. Releasing `E`, walking out of range, or losing the target cancels progress.

Harvest yields:

| Node | Yield |
| --- | --- |
| Tree | 2 to 4 wood |
| Rock cluster | 2 to 3 stone |
| Artifact | 1 strange artifact |

Depleted resource IDs persist in the current session. They are not stored in the save because ordinary world resources reset after a page reload. Inventory, towers, and progression do persist.

## Revolver Combat

Mouse coordinates are projected onto a horizontal world plane at the player's terrain height. The player faces that point whenever the pointer is over the canvas.

The revolver uses an immediate hitscan ray with a short voxel tracer. It has:

- 6-round magazine.
- 24 reserve rounds at a new game.
- 34 base damage.
- 0.38 second fire interval.
- 1.2 second reload.
- Maximum effective range of 9 world units.

Firing with an empty magazine gives visible and audible blocked feedback. Reloading transfers only the rounds required by the magazine. The player cannot fire during reload.

## Zombies and Difficulty

Zombies use simple Three.js geometry and move directly toward the player or the nearest tower that has attacked them. The terrain is fully walkable in this slice, so direct steering is sufficient. Enemies are individual meshes because they need independent movement, health, and hit feedback.

Spawning occurs in an annulus 8 to 13 world units from the player, outside all tower safe zones and outside the camera center. The active enemy cap is 24. Spawn pacing starts at one attempt every 2.8 seconds.

Threat tier is `floor(distanceFromOrigin / 18)`. Each tier applies:

- 25 percent additional maximum health.
- 15 percent additional contact damage.
- 6 percent additional movement speed, capped at 55 percent.
- Better ammunition chance and artifact chance.

Tier zero zombies have 68 health, 10 contact damage, speed 1.05, and a 0.95 second attack interval. A zombie death immediately grants loot and shows a short pickup animation traveling toward the HUD. No manual ground pickup is required.

Base automatic loot per zombie:

- 35 percent chance of 1 to 3 revolver rounds.
- 18 percent chance of 1 wood.
- 14 percent chance of 1 stone.
- Artifact chance begins at 2 percent and gains 2 percentage points per threat tier, capped at 12 percent.

## Towers, Safe Zones, and Respawn

The vertical slice contains one recipe: the Signal Refuge.

Cost:

- 12 wood.
- 8 stone.
- 1 strange artifact.

Pressing `B` displays a grid-snapped ghost within 2.5 world units of the player. Green indicates valid placement; red indicates insufficient resources, excessive slope, overlap with another tower, or placement outside range. Left click confirms and consumes resources. The tower is assembled with a short stepped voxel animation.

Every completed tower:

- Becomes a permanent respawn checkpoint.
- Creates a safe zone with radius 5.5.
- Prevents zombie spawning inside that radius.
- Automatically targets the nearest zombie in range.
- Remains indestructible during this vertical slice.

The most recently completed tower is the active respawn checkpoint. Older towers keep their safe zones and attacks.

Tower progression:

| Level | Required tower kills | Damage | Range | Fire interval |
| --- | ---: | ---: | ---: | ---: |
| 1 | 0 | 26 | 6.0 | 0.65 s |
| 2 | 8 | 40 | 6.8 | 0.55 s |
| 3 | 20 | 58 | 7.6 | 0.45 s |

When player health reaches zero, input and combat pause for 1.8 seconds. The player then respawns with full health at the active tower, or at the origin when no tower exists. Inventory is retained. Zombies within 4 units of the respawn point are removed to prevent a death loop.

## Story

The story uses concise authored Spanish text, not filler copy.

### Prologue

"Dia cuatro. La radio volvio a encenderse por nueve segundos. Elena dijo mi nombre y alcanzo a mencionar la estacion del norte. Si levanto repetidores por el bosque, podre seguir su senal y abrir un camino seguro para volver con ellos."

### Objective sequence

1. `Reune materiales`: "Necesito madera, piedra y uno de esos fragmentos que hacen reaccionar la radio."
2. `Resiste el primer ataque`: "El ruido los atrae. El revolver solo me dara tiempo."
3. `Construye un refugio`: "Una torre puede vigilar mientras descanso y conservar la frecuencia de Elena."
4. `Sigue hacia el norte`: "La senal es mas clara lejos del campamento. Tambien hay mas de ellos."

Story progress advances from explicit game events and is stored with the save. A brief objective card is always visible. Longer copy appears in dismissible transmissions and can be reopened from the objective card.

## Interface Direction A

The HUD uses square corners, restrained borders, pixel typography, and icon-like resource swatches. It contains:

- Top left: day label, health bar, magazine, reserve ammunition, and reload state.
- Top right: active checkpoint name, tower level, tower kill progress, and sound control.
- Bottom left: wood, stone, artifact, and contextual pickup notifications.
- Bottom center: interaction prompt and hold progress, or build validity and cost.
- Bottom right: current objective and one-line narrative hint.
- Center: only crosshair, damage flashes, and temporary world labels.
- Death overlay: cause, checkpoint destination, and respawn countdown.

The HUD collapses on narrow screens into top and bottom bands. It must not cover the player or permanently occupy the center of the canvas.

## Audio

Install `uisfx` and create one `AudioManager`. UI SFX uses the `mechanical` pack with persisted `enabled` and `volume` preferences. Audio unlock occurs on the first trusted pointer or keyboard interaction. Failure to initialize audio leaves the game fully playable and updates the HUD mute state.

Semantic cue mapping:

| Game event | UI SFX cue |
| --- | --- |
| Open or close build mode | `open` / `close` |
| Harvest progress step | `progress-step` |
| Harvest complete | `complete` |
| Automatic loot | `reward` |
| Invalid build or empty revolver | `blocked` |
| Tower completed and save written | `checkpoint` |
| Tower reaches a new level | `level-up` |
| New story transmission | `notification` |
| Player in critical health | `warning` |

The revolver shot, impact, tower shot, and zombie hit use short deterministic Web Audio oscillator and noise recipes inside `AudioManager`; they are not mislabeled as UI semantic cues. High-frequency effects are rate-limited.

## Architecture

New modules:

```text
src/
  audio/
    AudioManager.js
  core/
    EventBus.js
  gameplay/
    CombatSystem.js
    Inventory.js
    ResourceSystem.js
    SaveSystem.js
    StorySystem.js
    TowerSystem.js
    ZombieSystem.js
  entities/
    Zombie.js
    Tower.js
```

Existing module responsibilities:

- `Game`: owns systems, controls update order, and disposes dependencies.
- `World`: exposes chunk lifecycle hooks, resource queries, and selective chunk visual rebuilds.
- `Terrain`: supplies deterministic height and placement validation.
- `TreeSystem` and `PropSystem`: render procedural resources while accepting depleted resource IDs.
- `Player`: owns transform, visual animation, health, and facing, but not inventory or weapon rules.
- `InputManager`: exposes edge-triggered actions, held interaction state, pointer coordinates, and build controls.
- `GameHud`: renders immutable snapshots from gameplay events and sends only UI commands such as mute or reopening a transmission.

`EventBus` is synchronous and local to one `Game` instance. It has `on`, `off`, and `emit`; it is not a global singleton. Systems expose direct query methods for frame-critical data and use events for discrete outcomes such as `resource:harvested`, `zombie:killed`, `tower:built`, `player:died`, and `story:advanced`.

## Update Order and Data Flow

Per frame:

1. Consume input and pointer state.
2. Update player movement and aim.
3. Update resource targeting and harvesting.
4. Update build placement or revolver combat.
5. Update zombies and resolve contact damage.
6. Update towers and resolve tower hits.
7. Resolve deaths, loot, level changes, and respawn.
8. Refresh chunks around the player.
9. Update story and HUD snapshots only when state changed.
10. Update camera and render.

Damage is resolved through explicit methods rather than event listeners to keep ordering deterministic. Events announce completed outcomes after state changes.

## Save Data

Use one versioned key: `voxel-survival-save-v1`.

```json
{
  "version": 1,
  "inventory": { "wood": 0, "stone": 0, "artifact": 0, "ammoReserve": 24 },
  "towers": [],
  "activeCheckpointId": null,
  "storyStep": 0
}
```

Each tower stores ID, world position, level, and kill count. Save writes occur after harvesting, loot, tower construction, tower level changes, and story advancement, with a short debounce. Invalid JSON, unknown versions, non-finite coordinates, or negative inventory values cause the save to be ignored and replaced with a clean state. Audio preferences remain owned by UI SFX rather than this save.

## Error Handling and Edge Cases

- Audio initialization errors are caught and produce a silent fallback.
- Resource interaction cancels when its chunk unloads.
- Tower placement revalidates on confirmation, not only while previewing.
- Projected pointer coordinates outside the terrain cancel firing and placement.
- Save parsing validates every persisted field before creating Three.js objects.
- A zombie that leaves the active simulation radius is disposed without loot.
- Respawn clears immediate threats before restoring control.
- Every event subscription returns or records an unsubscribe callback for disposal.

## Performance Constraints

- Keep terrain, trees, rocks, and bushes instanced.
- Rebuild only the affected chunk layer after resource depletion.
- Cap active zombies at 24 and towers at 12 for this slice.
- Reuse shared zombie and tower geometries and materials.
- Use lightweight tracer and pickup effect pools with fixed lifetimes.
- Avoid a navigation library until terrain obstacles require it.

## Verification

Static and automated checks:

- `node --check` for all source modules.
- `npm run build` with no build errors.
- Deterministic resource IDs for repeated chunk generation.
- Inventory never becomes negative.
- Reload transfer and fire cooldown tests.
- Zombie threat scaling at tier boundaries.
- Tower cost, placement, level thresholds, and active checkpoint tests.
- Save round trip and corrupted save fallback tests.
- Event subscription cleanup on disposal.

Browser checks:

- Complete the loop from new game to first tower.
- Kill a zombie with the revolver and verify automatic loot.
- Die before and after building a tower and verify both respawn locations.
- Move across chunk boundaries while harvesting and fighting.
- Verify mute persistence and browser autoplay compliance.
- Capture desktop and mobile screenshots for HUD overlap and canvas visibility.
- Check nonblank canvas pixels and runtime console errors in both visual profiles.
