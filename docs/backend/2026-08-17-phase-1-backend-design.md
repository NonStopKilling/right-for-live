# Phase 1 Backend Design

Date: 2026-08-17
Status: Draft, ready for review

## Goal

Add the smallest backend that can support online identity, cloud saves, realtime player presence, chat bubbles, and persistent gravestones without rewriting the current Three.js client.

## Recommended Approach

Use a local Node.js backend for the first backend milestone:

- HTTP API for profile and save operations.
- WebSocket server for realtime presence and chat.
- SQLite database for local persistence during development.
- Explicit DTOs between client and server.

This is the fastest path for the current Vite/vanilla JS project because it avoids forcing an account provider or cloud platform decision before the gameplay contract is stable.

## Why Not Start With Full Cloud Infrastructure

Supabase, Cloudflare, or a custom VPS can all be valid later. They should be chosen after the first online contract is proven because each option changes authentication, realtime limits, deployment, pricing, and moderation workflows.

## Modules To Add

```text
server/
  package.json
  src/
    index.js
    config.js
    db.js
    schema.sql
    http/
      profiles.js
      saves.js
      gravestones.js
    realtime/
      socketServer.js
      sessions.js
      validators.js
```

Client-side modules to add later:

```text
src/online/
  OnlineClient.js
  RemotePlayerSystem.js
  ChatBubbleSystem.js
  GravestoneSystem.js
```

## Data Model Draft

### profiles

- `id`
- `email`
- `birth_date`
- `gender`
- `full_name`
- `character_name`
- `created_at`
- `updated_at`

### saves

- `profile_id`
- `version`
- `payload_json`
- `updated_at`

### sessions

- `id`
- `name`
- `created_at`

### gravestones

- `id`
- `session_id`
- `dead_profile_id`
- `dead_character_name`
- `x`
- `z`
- `message`
- `discovered_by_profile_id`
- `destroyed_by_profile_id`
- `destroyed_at`
- `created_at`

## API Draft

### HTTP

- `POST /api/profiles`: create or load profile from required player data.
- `GET /api/saves/:profileId`: load the latest save.
- `PUT /api/saves/:profileId`: validate and store save payload.
- `GET /api/sessions/:sessionId/gravestones`: list active gravestones.
- `POST /api/sessions/:sessionId/gravestones`: create gravestone after death.
- `PATCH /api/gravestones/:id`: add discovery/message.
- `DELETE /api/gravestones/:id`: destroy after server validates inventory cost.

### WebSocket

Client to server:

- `session:join`
- `player:state`
- `chat:send`
- `session:leave`

Server to client:

- `player:joined`
- `player:left`
- `player:state`
- `chat:message`
- `gravestone:created`
- `gravestone:updated`
- `gravestone:destroyed`

## Security And Validation

The first local backend is not production auth. Still, it must validate:

- Required profile fields.
- Email shape.
- Birth date shape.
- Gender value: Male, Female, or Other.
- Character name length and allowed characters.
- Chat and gravestone message length.
- Save version and allowed inventory fields.
- Gravestone destroy cost on the server.

Production authentication, email verification, passwordless login, abuse tooling, and privacy policy requirements must be planned before public release.

## Implementation Order

1. Create server package and SQLite schema.
2. Add profile create/load endpoint.
3. Add save load/write endpoints.
4. Add WebSocket session presence.
5. Add chat messages and client-side bubbles.
6. Add gravestone persistence and actions.
7. Connect the client with an explicit online/offline mode selector.
8. Add tests for validators, save sanitization, and gravestone cost rules.

## Open Decisions

- Whether online identity is email-only during prototype or uses real auth before any public test.
- Whether a session is one shared world or multiple rooms.
- Whether death creates a gravestone in offline mode too.
- Whether gravestone destruction consumes current inventory immediately from the cloud save or only during active online play.
