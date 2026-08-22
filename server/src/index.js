import http from 'node:http';
import { SERVER_CONFIG } from './config.js';
import { createHttpHandler } from './http.js';
import { createMySqlProfileStore } from './mysqlProfileStore.js';
import { attachRealtime } from './realtime.js';
import { JsonStore } from './storage.js';

const store = new JsonStore(SERVER_CONFIG.dataFile);
const profileDb = createMySqlProfileStore();
const server = http.createServer();
const realtime = attachRealtime(server, store);

server.on('request', createHttpHandler(store, {
  gravestone: (type, payload) => realtime.broadcastGravestone(type, payload)
}, profileDb));

server.listen(SERVER_CONFIG.port, () => {
  console.log(`Senal del Norte backend listening on http://127.0.0.1:${SERVER_CONFIG.port}`);
});
