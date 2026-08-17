import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const SERVER_CONFIG = Object.freeze({
  port: Number(process.env.PORT) || 8787,
  dataFile: process.env.DATA_FILE || path.join(rootDir, 'data', 'local-db.json'),
  defaultSessionId: 'north-forest-01'
});
