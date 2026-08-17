import { WebSocketServer } from 'ws';
import { validateChatMessage } from './validators.js';

export function attachRealtime(server, store) {
  const wss = new WebSocketServer({ server, path: '/ws' });
  const clients = new Map();

  function send(ws, type, payload) {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify({ type, payload }));
    }
  }

  function broadcast(type, payload, sessionId, exceptWs = null) {
    for (const [ws, client] of clients) {
      if (ws !== exceptWs && (!sessionId || client.sessionId === sessionId)) {
        send(ws, type, payload);
      }
    }
  }

  wss.on('connection', (ws) => {
    clients.set(ws, { sessionId: null, profileId: null, characterName: null });

    ws.on('message', (raw) => {
      try {
        const message = JSON.parse(String(raw));
        const client = clients.get(ws);

        if (message.type === 'session:join') {
          const profile = store.getProfile(String(message.payload?.profileId ?? ''));

          if (!profile) {
            return send(ws, 'error', { message: 'Profile not found' });
          }

          client.profileId = profile.id;
          client.characterName = profile.characterName;
          client.sessionId = String(message.payload?.sessionId ?? 'north-forest-01');
          send(ws, 'session:joined', {
            profileId: client.profileId,
            characterName: client.characterName,
            sessionId: client.sessionId
          });
          broadcast('player:joined', client, client.sessionId, ws);
          return;
        }

        if (!client.sessionId || !client.profileId) {
          return send(ws, 'error', { message: 'Join a session first' });
        }

        if (message.type === 'player:state') {
          const state = sanitizePlayerState(message.payload);
          return broadcast('player:state', {
            profileId: client.profileId,
            characterName: client.characterName,
            ...state
          }, client.sessionId, ws);
        }

        if (message.type === 'chat:send') {
          const chat = {
            profileId: client.profileId,
            characterName: client.characterName,
            message: validateChatMessage(message.payload),
            createdAt: new Date().toISOString()
          };
          send(ws, 'chat:message', chat);
          return broadcast('chat:message', chat, client.sessionId, ws);
        }
      } catch (error) {
        send(ws, 'error', { message: error.message ?? 'Invalid message' });
      }
    });

    ws.on('close', () => {
      const client = clients.get(ws);
      clients.delete(ws);

      if (client?.sessionId && client.profileId) {
        broadcast('player:left', client, client.sessionId);
      }
    });
  });

  return {
    broadcastGravestone(type, gravestone) {
      broadcast(type, gravestone, gravestone.sessionId);
    },
    close() {
      wss.close();
    }
  };
}

function sanitizePlayerState(input) {
  const x = Number(input?.x);
  const z = Number(input?.z);
  const facing = Number(input?.facing);

  return {
    x: Number.isFinite(x) ? x : 0,
    z: Number.isFinite(z) ? z : 0,
    facing: Number.isFinite(facing) ? facing : 0
  };
}
