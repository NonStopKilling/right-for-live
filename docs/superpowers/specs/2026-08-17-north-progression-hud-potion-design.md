# North Progression, HUD Controls, and Healing Potion Design

Date: 2026-08-17
Status: Approved concept, pending implementation plan
Branch: `v2`

## Purpose

Make the current objective "Sigue hacia el norte" become a real playable goal instead of only revealing more procedural map. This first mechanics block must add direction, readable controls, and one survival crafting action without yet taking on the full character-level, tower-level, and zombie-variant expansion.

## Scope

### Included

- A measurable northward objective.
- Distance/progress shown in the HUD.
- First north milestone that triggers when the player reaches a defined distance.
- HUD control hints that list the useful keys for movement, harvesting, building, reloading, crafting, using items, sound, and debug.
- A craftable healing potion made with 10 strange artifacts.
- A hotkey to craft the potion.
- A hotkey to use the potion.
- Save support for crafted potion count and north objective progress.
- Tests for potion crafting/use and save compatibility.

### Excluded

- Online synchronization of the mechanics.
- Full character leveling.
- Tower health/damage.
- Tower level 10.
- New tower recipes.
- Zombie variants.
- New map biomes or hand-authored landmarks.

Those excluded items should be handled in the next mechanics block after this one is playable.

## Player Experience

The player should understand that going north has a measurable purpose. The objective panel should communicate distance and a milestone target, for example:

```text
SIGUE HACIA EL NORTE
Norte: 180 / 350 m
```

When the player reaches the first milestone, the game should show a transmission or notification and advance the objective to the next north distance. The first implementation can use procedural distance only; it does not need a custom landmark mesh yet.

The context HUD should no longer default only to "EXPLORA EL BOSQUE". When no action is available, it should rotate or display compact controls:

```text
WASD mover / E recolectar / B construir / R recargar / C crear pocion / 1 usar pocion / M sonido
```

When a contextual action is available, that action remains more important than the full key list. For example, if the player is near wood, the HUD still shows the harvesting prompt.

## North Objective

Use the player's `z` position as the first measurable objective axis. In the current camera/world convention, "north" must be defined consistently with the existing story and movement. The implementation should validate this in game and use whichever sign of `z` matches the actual northward screen direction.

The first target should be reachable in normal play but far enough that the player must leave the central camp:

- First target: 350 world-distance units from origin toward north.
- Next target placeholder: 700 world-distance units.

The story system should gain objective state rather than a single final "north" step that never changes. The HUD only needs to show the active target and current progress for this block.

## Healing Potion

### Crafting

- Cost: 10 strange artifacts.
- Output: 1 healing potion.
- Craft key: `C`.
- Crafting is instant for the first implementation.
- If the player lacks artifacts, show blocked feedback.

### Use

- Use key: `1`.
- Restores 45 health at level 1.
- Cannot exceed max health.
- Cannot be used at full health.
- Cannot be used with zero potions.
- The potion count must appear in the HUD resource area or the context/action area.

The potion introduces consumables without requiring a full inventory grid yet.

## Data Model

Extend inventory with:

```json
{
  "healingPotion": 0
}
```

Extend save data with:

```json
{
  "northProgress": {
    "targetIndex": 0,
    "bestDistance": 0
  }
}
```

Save sanitization must remain versioned and backward compatible with existing local saves. Existing saves without `healingPotion` or `northProgress` should load with defaults.

## Systems

### `InputManager`

Add edge-triggered actions:

- `consumeCraftPotion()`
- `consumeUsePotion()`

### `Inventory`

Add `healingPotion` as an allowed resource key. Potion crafting can be implemented as a small gameplay system or inside a focused `CraftingSystem`.

### `Player`

Add a `heal(amount)` method that returns the actual healed amount and emits through the owning system, not directly from the entity.

### `StorySystem` or New `ObjectiveSystem`

Preferred: add a small `ObjectiveSystem` for north progress so `StorySystem` stays responsible for transmissions and narrative state. `ObjectiveSystem` should emit events such as:

- `objective:north-progress`
- `objective:north-milestone`

### `GameHud`

Update the context area and resource display to include:

- Key list when idle.
- Potion count.
- Potion craft/use feedback.
- North objective progress.

## Error Handling

- If the player presses `C` without 10 artifacts, show "FALTAN OBJETOS EXTRANOS".
- If the player presses `1` without potion, show "SIN POCIONES".
- If the player presses `1` at full health, show "VIDA COMPLETA".
- If old save data is missing new fields, default cleanly.

## Testing

Automated tests:

- Inventory supports `healingPotion`.
- Crafting spends exactly 10 artifacts and adds 1 potion.
- Crafting fails without enough artifacts and inventory remains unchanged.
- Potion use heals the player and consumes 1 potion.
- Potion use fails at full health or with zero potions.
- Save round trip preserves `healingPotion` and `northProgress`.
- Old save shape loads with new defaults.

Browser checks:

- HUD idle state shows the key list.
- Objective north progress changes when walking north.
- First north milestone triggers a notification/transmission.
- `C` crafts a potion when the player has 10 strange artifacts.
- `1` uses the potion and health does not exceed max health.
