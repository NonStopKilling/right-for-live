import { WebSocketServer } from 'ws';
import { validateChatMessage } from './validators.js';
import { NpcSystem } from './npcSystem.js';
import { QuestSystem } from './questSystem.js';
import { EconomySystem } from './economySystem.js';

export function attachRealtime(server, store) {
  const wss = new WebSocketServer({ server, path: '/ws' });
  const clients = new Map();
  const npcSystem = new NpcSystem({ broadcast });
  const questSystem = new QuestSystem(store);
  const economySystem = new EconomySystem(store);
  npcSystem.start();

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
          send(ws, 'quest:snapshot', { quests: questSystem.getSnapshot(client.profileId) });
          send(ws, 'economy:snapshot', { economy: economySystem.getSnapshot() });
          broadcast('player:joined', client, client.sessionId, ws);
          return;
        }

        if (!client.sessionId || !client.profileId) {
          return send(ws, 'error', { message: 'Join a session first' });
        }

        if (message.type === 'player:state') {
          const state = sanitizePlayerState(message.payload);
          npcSystem.updatePlayer(client.sessionId, client.profileId, state);
          sendQuestUpdate(ws, client, questSystem.applyEvent(client.profileId, {
            type: 'player:moved',
            x: state.x,
            z: state.z
          }));
          return broadcast('player:state', {
            profileId: client.profileId,
            characterName: client.characterName,
            ...state
          }, client.sessionId, ws);
        }

        if (message.type === 'npc:damage') {
          const npc = npcSystem.registerDamage(
            client.sessionId,
            client.profileId,
            String(message.payload?.npcId ?? ''),
            Number(message.payload?.amount),
            String(message.payload?.kind ?? 'damage')
          );

          if (npc) {
            if (npc.health <= 0) {
              sendQuestUpdate(ws, client, questSystem.applyEvent(client.profileId, {
                type: 'npc:killed',
                target: 'server_npc',
                npcId: npc.id
              }));
            }
            return broadcast('npc:damaged', npc, client.sessionId);
          }

          return;
        }

        if (message.type === 'quest:start') {
          questSystem.startQuest(client.profileId, String(message.payload?.questId ?? ''));
          return send(ws, 'quest:snapshot', { quests: questSystem.getSnapshot(client.profileId) });
        }

        if (message.type === 'quest:sync-inventory') {
          return sendQuestUpdate(ws, client, questSystem.applyEvent(client.profileId, {
            type: 'inventory:synced',
            inventory: message.payload?.inventory
          }));
        }

        if (message.type === 'economy:trade') {
          const result = economySystem.trade(
            client.profileId,
            String(message.payload?.merchantId ?? ''),
            String(message.payload?.offerId ?? ''),
            message.payload?.inventory
          );
          send(ws, 'economy:trade-result', result);
          broadcast('economy:snapshot', { economy: result.economy }, client.sessionId);
          return;
        }

        if (message.type === 'player:healed') {
          npcSystem.registerHealing(client.sessionId, client.profileId, Number(message.payload?.amount));
          return;
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
        npcSystem.removePlayer(client.sessionId, client.profileId);
        broadcast('player:left', client, client.sessionId);
      }
    });
  });

  return {
    broadcastGravestone(type, gravestone) {
      broadcast(type, gravestone, gravestone.sessionId);
    },
    close() {
      npcSystem.stop();
      wss.close();
    }
  };

  function sendQuestUpdate(ws, client, quests) {
    if (!quests) {
      return;
    }

    send(ws, 'quest:snapshot', { quests });
    broadcast('quest:party-updated', {
      profileId: client.profileId,
      characterName: client.characterName
    }, client.sessionId, ws);
  }
}

function sanitizePlayerState(input) {
  const x = Number(input?.x);
  const z = Number(input?.z);
  const facing = Number(input?.facing);

  return {
    x: Number.isFinite(x) ? x : 0,
    z: Number.isFinite(z) ? z : 0,
    facing: Number.isFinite(facing) ? facing : 0,
    health: Number.isFinite(Number(input?.health)) ? Number(input.health) : 100
  };
}
