const SAVE_KEY = 'voxel-survival-save-v1';
const SAVE_VERSION = 1;

export class SaveSystem {
  constructor(storage = resolveStorage()) {
    this.storage = storage;
    this.timeoutId = 0;
  }

  load() {
    if (!this.storage) {
      return null;
    }

    try {
      const raw = this.storage.getItem(SAVE_KEY);
      return raw ? this.sanitize(JSON.parse(raw)) : null;
    } catch {
      this.clear();
      return null;
    }
  }

  schedule(snapshotFactory, delay = 180) {
    window.clearTimeout(this.timeoutId);
    this.timeoutId = window.setTimeout(() => {
      this.timeoutId = 0;
      this.save(snapshotFactory());
    }, delay);
  }

  save(snapshot) {
    if (!this.storage) {
      return false;
    }

    try {
      this.storage.setItem(SAVE_KEY, JSON.stringify(this.sanitize(snapshot)));
      return true;
    } catch {
      return false;
    }
  }

  clear() {
    try {
      this.storage?.removeItem(SAVE_KEY);
    } catch {
      // Storage can be disabled by browser privacy settings.
    }
  }

  sanitize(snapshot) {
    if (!snapshot || snapshot.version !== SAVE_VERSION) {
      throw new Error('Unsupported save data');
    }

    return {
      version: SAVE_VERSION,
      inventory: sanitizeInventory(snapshot.inventory),
      magazine: sanitizeCount(snapshot.magazine, 6),
      towers: sanitizeTowers(snapshot.towers),
      activeCheckpointId:
        typeof snapshot.activeCheckpointId === 'string' ? snapshot.activeCheckpointId : null,
      storyStep: sanitizeCount(snapshot.storyStep, 3),
      northProgress: sanitizeNorthProgress(snapshot.northProgress)
    };
  }

  dispose() {
    window.clearTimeout(this.timeoutId);
    this.timeoutId = 0;
  }
}

export function createFreshSave() {
  return {
    version: SAVE_VERSION,
    inventory: { wood: 0, stone: 0, artifact: 0, healingPotion: 0, ammoReserve: 24 },
    magazine: 6,
    towers: [],
    activeCheckpointId: null,
    storyStep: 0,
    northProgress: { targetIndex: 0, bestDistance: 0 }
  };
}

function sanitizeInventory(inventory) {
  return {
    wood: sanitizeCount(inventory?.wood),
    stone: sanitizeCount(inventory?.stone),
    artifact: sanitizeCount(inventory?.artifact),
    healingPotion: sanitizeCount(inventory?.healingPotion),
    ammoReserve: sanitizeCount(inventory?.ammoReserve)
  };
}

function sanitizeNorthProgress(progress) {
  return {
    targetIndex: sanitizeCount(progress?.targetIndex, 1),
    bestDistance: sanitizeCount(progress?.bestDistance)
  };
}

function sanitizeTowers(towers) {
  if (!Array.isArray(towers)) {
    return [];
  }

  return towers.slice(0, 12).flatMap((tower) => {
    const x = Number(tower?.x);
    const z = Number(tower?.z);

    if (!Number.isFinite(x) || !Number.isFinite(z)) {
      return [];
    }

    return [{
      id: typeof tower.id === 'string' ? tower.id : `tower-${x}-${z}`,
      x,
      z,
      level: Math.min(3, Math.max(1, sanitizeCount(tower.level, 3) || 1)),
      kills: sanitizeCount(tower.kills)
    }];
  });
}

function sanitizeCount(value, max = Number.MAX_SAFE_INTEGER) {
  return Number.isFinite(value) ? Math.min(max, Math.max(0, Math.floor(value))) : 0;
}

function resolveStorage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

