export const OPTIONS_KEY = 'voxel-survival-options-v1';

export const DEFAULT_KEYBINDS = Object.freeze({
  moveForward: 'KeyW',
  moveBackward: 'KeyS',
  moveLeft: 'KeyA',
  moveRight: 'KeyD',
  interact: 'KeyE',
  reload: 'KeyR',
  build: 'KeyB',
  craftPotion: 'KeyC',
  usePotion: 'Digit1',
  mute: 'KeyM',
  chat: 'Enter'
});

export const DEFAULT_LAB_OPTIONS = Object.freeze({
  mapMode: 'forest',
  liveRebuild: true,
  seedOffset: 0,
  terrainRelief: 100,
  forestDensity: 100,
  treeShapeVariety: 100,
  treeColorVariety: 100,
  waterEnabled: true,
  waterAmount: 100,
  waterOpacity: 42,
  islandFishEnabled: true,
  islandFishDensity: 65,
  islandNaturalColors: false,
  dynamicShadows: true,
  cityDensity: 70,
  cityVehicleDensity: 45,
  cityResourceDensity: 100,
  cityTrenchDensity: 100,
  localZombies: true,
  serverNpcs: true,
  zombieSpawnRate: 100,
  zombieMaxActive: 100,
  zombiePower: 100,
  zombieFearVisuals: 100,
  towerAutofire: true,
  lootMultiplier: 100,
  economyOnline: true,
  questHints: true,
  questHintDetail: 100,
  landmarkMotion: true,
  chunkDebug: false
});

export const DEFAULT_GAME_OPTIONS = Object.freeze({
  uiScale: 'auto',
  graphics: 'balanced',
  cameraView: 'normal',
  cameraZoomRange: 130,
  masterVolume: 45,
  chatOpacity: 88,
  microphoneMode: 'push',
  microphoneEnabled: false,
  showTowerPanel: true,
  showObjective: true,
  showMinimap: true,
  damageWarnings: true,
  cameraAssist: true,
  highContrastHud: false,
  keybinds: DEFAULT_KEYBINDS,
  attributes: { vigor: 1, precision: 1, engineering: 1, endurance: 1 },
  playerTuning: {
    moveSpeed: 100,
    maxHealthBonus: 0,
    damageMultiplier: 100,
    fireRateMultiplier: 100,
    rangeBonus: 0
  },
  lab: DEFAULT_LAB_OPTIONS
});

export function loadGameOptions() {
  try {
    return mergeDeep(DEFAULT_GAME_OPTIONS, JSON.parse(window.localStorage.getItem(OPTIONS_KEY) ?? '{}'));
  } catch {
    return structuredClone(DEFAULT_GAME_OPTIONS);
  }
}

export function normalizeGameOptions(options) {
  return mergeDeep(DEFAULT_GAME_OPTIONS, options ?? {});
}

export function saveGameOptions(options) {
  try {
    window.localStorage.setItem(OPTIONS_KEY, JSON.stringify(normalizeGameOptions(options)));
  } catch {
    // Browser storage can be disabled.
  }
}

export function mergeDeep(defaults, value) {
  const output = structuredClone(defaults);

  for (const [key, next] of Object.entries(value ?? {})) {
    if (next && typeof next === 'object' && !Array.isArray(next) && typeof output[key] === 'object') {
      output[key] = mergeDeep(output[key], next);
    } else if (next !== undefined) {
      output[key] = next;
    }
  }

  return output;
}
