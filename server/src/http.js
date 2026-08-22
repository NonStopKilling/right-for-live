import { validateProfile, validateGravestone, validateGravestoneMessage } from './validators.js';
import { QuestSystem } from './questSystem.js';
import { EconomySystem } from './economySystem.js';

export function createHttpHandler(store, broadcasts = {}, profileDb = null) {
  const quests = new QuestSystem(store);
  const economy = new EconomySystem(store);

  return async function handleRequest(req, res) {
    try {
      const url = new URL(req.url, `http://${req.headers.host}`);

      if (req.method === 'OPTIONS') {
        return sendJson(res, 204, {});
      }

      if (req.method === 'GET' && url.pathname === '/health') {
        return sendJson(res, 200, { ok: true });
      }

      if (req.method === 'POST' && url.pathname === '/api/profiles') {
        const validated = validateProfile(await readJson(req));
        const profile = store.createOrLoadProfile(validated);

        if (profileDb) {
          await profileDb.upsertProfile(profile, validated);
        }

        return sendJson(res, 200, { profile, persisted: { json: true, mysql: Boolean(profileDb) } });
      }

      const saveMatch = url.pathname.match(/^\/api\/saves\/([^/]+)$/);
      const questsMatch = url.pathname.match(/^\/api\/profiles\/([^/]+)\/quests$/);
      const questStartMatch = url.pathname.match(/^\/api\/profiles\/([^/]+)\/quests\/([^/]+)\/start$/);
      const tradeMatch = url.pathname.match(/^\/api\/profiles\/([^/]+)\/trade$/);

      if (saveMatch && req.method === 'GET') {
        return sendJson(res, 200, { save: store.getSave(saveMatch[1]) });
      }

      if (saveMatch && req.method === 'PUT') {
        const save = store.putSave(saveMatch[1], await readJson(req));
        return sendJson(res, 200, { save });
      }

      if (questsMatch && req.method === 'GET') {
        return sendJson(res, 200, { quests: quests.getSnapshot(questsMatch[1]) });
      }

      if (questStartMatch && req.method === 'POST') {
        const quest = quests.startQuest(questStartMatch[1], questStartMatch[2]);
        return sendJson(res, 200, { quest, quests: quests.getSnapshot(questStartMatch[1]) });
      }

      if (req.method === 'GET' && url.pathname === '/api/economy') {
        return sendJson(res, 200, { economy: economy.getSnapshot() });
      }

      if (tradeMatch && req.method === 'POST') {
        const body = await readJson(req);
        const result = economy.trade(
          tradeMatch[1],
          String(body.merchantId ?? ''),
          String(body.offerId ?? ''),
          body.inventory
        );
        return sendJson(res, 200, result);
      }

      const gravestonesMatch = url.pathname.match(/^\/api\/sessions\/([^/]+)\/gravestones$/);

      if (gravestonesMatch && req.method === 'GET') {
        return sendJson(res, 200, { gravestones: store.listGravestones(gravestonesMatch[1]) });
      }

      if (gravestonesMatch && req.method === 'POST') {
        const body = await readJson(req);
        const gravestone = store.createGravestone(validateGravestone({
          ...body,
          sessionId: gravestonesMatch[1]
        }));
        broadcasts.gravestone?.('gravestone:created', gravestone);
        return sendJson(res, 201, { gravestone });
      }

      const gravestoneMatch = url.pathname.match(/^\/api\/gravestones\/([^/]+)$/);

      if (gravestoneMatch && req.method === 'PATCH') {
        const body = await readJson(req);
        const gravestone = store.updateGravestone(
          gravestoneMatch[1],
          String(body.profileId ?? ''),
          validateGravestoneMessage(body)
        );
        broadcasts.gravestone?.('gravestone:updated', gravestone);
        return sendJson(res, 200, { gravestone });
      }

      if (gravestoneMatch && req.method === 'DELETE') {
        const body = await readJson(req);
        const gravestone = store.destroyGravestone(gravestoneMatch[1], String(body.profileId ?? ''));
        broadcasts.gravestone?.('gravestone:destroyed', gravestone);
        return sendJson(res, 200, { gravestone });
      }

      return sendJson(res, 404, { error: 'Not found' });
    } catch (error) {
      return sendJson(res, error.status ?? 500, { error: error.message ?? 'Server error' });
    }
  };
}

export function sendJson(res, status, body) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'access-control-allow-headers': 'content-type'
  });
  res.end(JSON.stringify(body));
}

async function readJson(req) {
  if (req.method === 'OPTIONS') {
    return {};
  }

  let body = '';

  for await (const chunk of req) {
    body += chunk;
  }

  return body ? JSON.parse(body) : {};
}
