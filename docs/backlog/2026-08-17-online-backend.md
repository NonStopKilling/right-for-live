# Online and Backend Backlog

Date: 2026-08-17
Status: Draft backlog

## Purpose

Track the next backend and online systems for Senal del Norte without mixing them into the current local vertical slice before the server contract is ready.

Narrative and authored content should be handled in the separate branch that contains the fuller mechanics, maps, and story work.

## Phase 1: Player Identity and Cloud Save

### Registration data

The game must ask for these fields before creating or loading an online profile:

- Email.
- Birth date.
- Gender: Male, Female, or Other.
- Full name.
- Character name.

The character name is public in online mode. Email, birth date, gender, and full name are private account/profile data and must never appear in public chat, gravestones, logs shown to other players, or client-side world labels.

### Save data

Cloud save must include at least:

- Player profile ID.
- Character name.
- Inventory: wood, stone, strange artifacts, ammo reserve, and later item slots.
- Weapon state: magazine and reserve.
- Towers/refuges: ID, position, level, kills, and active checkpoint.
- Story progress.
- Player position for online resume.
- Discovered gravestones.
- Save version and updated timestamp.

The current `localStorage` save remains useful as offline fallback, but online mode needs server validation and an explicit migration path from local save version 1.

## Phase 2: Online Mode

### Multiplayer presence

Players in the same world/session must be able to see each other with:

- Character name label.
- Approximate position and facing.
- Movement interpolation to avoid jitter.
- Join/leave notifications styled like the current HUD.
- A clear distinction between the local player and remote players.

The first online version should sync presence, chat, and gravestones. Combat authority, enemy ownership, PvP, trades, shared towers, and co-op progression should stay out of the first cut unless explicitly approved later.

### Chat bubbles

Players must be able to send short text messages that appear:

- In a world-space bubble above the speaking character.
- In the current UI language/style: compact, tactical, squared, readable over the scene.
- For a short duration above the player.
- Also in a small recent-chat log if the bubble disappears too quickly.

Chat must have length limits, cooldown/rate limits, and basic moderation hooks before public launch.

## Phase 3: Gravestones

When a player dies in online mode, the server creates a gravestone at the death position.

### Gravestone behavior

- The gravestone remains in the map until discovered and acted on.
- A discovering player can leave one message on it.
- A discovering player can destroy it by paying:
  - 1 stone.
  - 1 strange object/artifact.
- Destroying a gravestone removes it from the world and records the action.

### Data to persist

- Gravestone ID.
- World/session ID.
- Dead player character name.
- Death position.
- Death timestamp.
- Discoverer profile ID, if discovered.
- Optional message.
- Destroyed flag and destroyer profile ID.

Messages on gravestones are player-authored public content and need the same safety constraints as chat.

## Future Idea: Player-Assisted Network Resources

Long-term idea only. Do not implement until the game has meaningful usage, active players, and backend metrics.

Players with strong internet and strong hardware could optionally contribute resources to improve the gameplay quality for users far from the main server. Possible directions include peer-assisted relays, regional edge helpers, or compute/network contribution models.

This idea can change the architecture, security model, deployment model, costs, abuse surface, and legal/privacy requirements. It must remain a research note until the app has enough users and telemetry to justify investigation.

## Backend First Cut

The backend should start with a small, testable contract:

- Profile create/load.
- Cloud save read/write.
- Realtime session join/leave.
- Position heartbeat.
- Chat message send/broadcast.
- Gravestone create/list/update/destroy.

Recommended first implementation target: a Node.js backend with HTTP endpoints plus WebSocket realtime, backed by SQLite locally. That keeps the prototype inspectable on this machine and leaves room to migrate later to Postgres/Supabase/Cloudflare once deployment needs are clearer.
