export const WORLD = {
  chunkSize: 16,
  renderDistance: 2,
  cellSize: 0.84,
  blockHeight: 0.24,
  maxTerrainLevel: 5,
  seed: 1977,
  originClearRadius: 7
};

export const RENDER = {
  maxInternalWidth: 960,
  maxInternalHeight: 540,
  maxDeltaTime: 1 / 20
};

export const CAMERA = {
  viewSize: 19.5,
  near: -100,
  far: 160,
  minZoom: 0.78,
  maxZoom: 2.35,
  followDamping: 9,
  offset: { x: 12.6, y: 10.2, z: 12.6 }
};

export const PLAYER = {
  speed: 3.2,
  radius: 0.28,
  height: 0.9,
  yDamping: 14
};

export const COLORS = {
  playerBody: 0xe2e7d4,
  playerAccent: 0xe0bd57,
  playerDark: 0x334744,
  playerShadow: 0x1c211d
};

export function hash2D(x, z, seed = WORLD.seed) {
  let value = Math.imul(x, 374761393) ^ Math.imul(z, 668265263) ^ Math.imul(seed, 1442695041);
  value ^= value >>> 13;
  value = Math.imul(value, 1274126177);
  value ^= value >>> 16;
  return (value >>> 0) / 4294967295;
}

export function valueNoise2D(x, z, scale, seed = WORLD.seed) {
  const scaledX = x / scale;
  const scaledZ = z / scale;
  const x0 = Math.floor(scaledX);
  const z0 = Math.floor(scaledZ);
  const tx = smoothStep(scaledX - x0);
  const tz = smoothStep(scaledZ - z0);

  const top = lerp(hash2D(x0, z0, seed), hash2D(x0 + 1, z0, seed), tx);
  const bottom = lerp(hash2D(x0, z0 + 1, seed), hash2D(x0 + 1, z0 + 1, seed), tx);
  return lerp(top, bottom, tz);
}

export function fractalNoise2D(x, z, seed = WORLD.seed) {
  return (
    valueNoise2D(x, z, 28, seed + 11) * 0.52 +
    valueNoise2D(x, z, 11, seed + 37) * 0.31 +
    valueNoise2D(x, z, 4, seed + 71) * 0.17
  );
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function lerp(a, b, alpha) {
  return a + (b - a) * alpha;
}

export function damping(deltaTime, strength) {
  return 1 - Math.exp(-strength * deltaTime);
}

function smoothStep(value) {
  return value * value * (3 - 2 * value);
}
