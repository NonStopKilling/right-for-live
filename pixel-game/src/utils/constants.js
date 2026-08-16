export const WORLD = {
  gridSize: 57,
  cellSize: 0.48,
  blockHeight: 0.14,
  maxTerrainLevel: 7,
  seed: 1977,
  edgePadding: 2
};

export const RENDER = {
  maxInternalWidth: 860,
  maxInternalHeight: 484,
  clearColor: 0x0b0907,
  fogColor: 0x0b0907,
  maxDeltaTime: 1 / 20
};

export const CAMERA = {
  viewSize: 22,
  near: -80,
  far: 120,
  minZoom: 0.78,
  maxZoom: 2.25,
  followDamping: 9,
  offset: { x: 11.8, y: 9.2, z: 11.8 }
};

export const PLAYER = {
  speed: 2.8,
  radius: 0.28,
  height: 0.9,
  yDamping: 14
};

export const COLORS = {
  grass: 0xb8c75f,
  grassDark: 0x6f833d,
  grassLight: 0xf2ee78,
  moss: 0xd1d864,
  fern: 0x86bd68,
  dirt: 0xc99054,
  dirtDark: 0x8e6239,
  stone: 0xd1c49b,
  stoneCool: 0xa9c2b6,
  pathGlow: 0xf6fff1,
  pathGlowWarm: 0xfff0b4,
  pathGlowCool: 0xd9fff3,
  trunk: 0xaa7445,
  evergreen: 0x9cba59,
  evergreenBlue: 0x68ae86,
  evergreenDark: 0x516b34,
  evergreenLight: 0xf0ea70,
  dryNeedles: 0xef8267,
  amberNeedles: 0xf0bd62,
  limeNeedles: 0xddec68,
  playerBody: 0xf8ffe8,
  playerAccent: 0xe4ffb2,
  playerShadow: 0x2b3728
};

export function hash2D(x, z, seed = WORLD.seed) {
  let value = Math.imul(x, 374761393) ^ Math.imul(z, 668265263) ^ Math.imul(seed, 1442695041);
  value ^= value >>> 13;
  value = Math.imul(value, 1274126177);
  value ^= value >>> 16;
  return (value >>> 0) / 4294967295;
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
