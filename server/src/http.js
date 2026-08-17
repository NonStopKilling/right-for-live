import { validateProfile, validateGravestone, validateGravestoneMessage } from './validators.js';

export function createHttpHandler(store, broadcasts = {}) {
  return async function handleRequest(req, res) {
    try {
      const url = new URL(req.url, `http://${req.headers.host}`);

      if (req.method === 'GET' && url.pathname === '/health') {
        return sendJson(res, 200, { ok: true });
      }

      if (req.method === 'POST' && url.pathname === '/api/profiles') {
        const profile = store.createOrLoadProfile(validateProfile(await readJson(req)));
        return sendJson(res, 200, { profile });
      }

      const saveMatch = url.pathname.match(/^\/api\/saves\/([^/]+)$/);

      if (saveMatch && req.method === 'GET') {
        return sendJson(res, 200, { save: store.getSave(saveMatch[1]) });
      }

      if (saveMatch && req.method === 'PUT') {
        const save = store.putSave(saveMatch[1], await readJson(req));
        return sendJson(res, 200, { save });
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
