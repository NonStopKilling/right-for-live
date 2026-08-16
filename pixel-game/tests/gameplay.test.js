import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { VISUAL_PROFILES } from '../src/config/visualProfiles.js';
import { GAMEPLAY } from '../src/config/gameplay.js';
import { EventBus } from '../src/core/EventBus.js';
import { CombatSystem } from '../src/gameplay/CombatSystem.js';
import { Inventory } from '../src/gameplay/Inventory.js';
import { createFreshSave, SaveSystem } from '../src/gameplay/SaveSystem.js';
import { TowerSystem } from '../src/gameplay/TowerSystem.js';
import { ZombieSystem } from '../src/gameplay/ZombieSystem.js';
import { Terrain } from '../src/world/Terrain.js';
import { TreeSystem } from '../src/world/TreeSystem.js';

const silentAudio = {
  play() {},
  playGameEffect() {}
};

test('EventBus unsubscribes without affecting other listeners', () => {
  const bus = new EventBus();
  const received = [];
  const unsubscribe = bus.on('sample', (value) => received.push(`a${value}`));
  bus.on('sample', (value) => received.push(`b${value}`));
  bus.emit('sample', 1);
  unsubscribe();
  bus.emit('sample', 2);
  assert.deepEqual(received, ['a1', 'b1', 'b2']);
});

test('Inventory rejects overspending and never becomes negative', () => {
  const inventory = new Inventory(new EventBus(), { wood: 5, stone: 2, ammoReserve: 3 });
  assert.equal(inventory.spend({ wood: 6 }), false);
  assert.equal(inventory.get('wood'), 5);
  assert.equal(inventory.spend({ wood: 4, stone: 2 }), true);
  assert.deepEqual(inventory.snapshot(), { wood: 1, stone: 0, artifact: 0, ammoReserve: 3 });
});

test('SaveSystem round trips towers and rejects corrupted data', () => {
  const storage = new MemoryStorage();
  const saves = new SaveSystem(storage);
  const fresh = createFreshSave();
  fresh.inventory.wood = 14;
  fresh.towers.push({ id: 't1', x: 2.5, z: -1.5, level: 2, kills: 9 });
  fresh.activeCheckpointId = 't1';
  assert.equal(saves.save(fresh), true);
  assert.deepEqual(saves.load(), fresh);

  storage.setItem('voxel-survival-save-v1', '{broken');
  assert.equal(saves.load(), null);
  assert.equal(storage.getItem('voxel-survival-save-v1'), null);
});

test('Procedural tree resource IDs are deterministic', () => {
  const profile = VISUAL_PROFILES.dark;
  const terrain = new Terrain(profile);
  const trees = new TreeSystem(terrain, profile);
  const first = trees.getResourceNodes(terrain.generateChunkCells(0, 0)).map(({ id }) => id);
  const second = trees.getResourceNodes(terrain.generateChunkCells(0, 0)).map(({ id }) => id);
  assert.ok(first.length > 0);
  assert.deepEqual(second, first);
  trees.dispose();
  terrain.dispose();
});

test('Combat reload transfers only available reserve ammunition', () => {
  const bus = new EventBus();
  const inventory = new Inventory(bus, { ammoReserve: 3 });
  const player = {
    position: new THREE.Vector3(),
    isDead: false,
    setAimPoint() {}
  };
  const combat = new CombatSystem(
    new THREE.OrthographicCamera(),
    player,
    { getRayTarget() { return null; } },
    inventory,
    bus,
    silentAudio,
    2
  );
  combat.finishReload();
  assert.equal(combat.magazine, 5);
  assert.equal(inventory.get('ammoReserve'), 0);
  combat.dispose();
});

test('Zombie threat tiers scale health, damage, and speed', () => {
  const system = new ZombieSystem(
    createWorldMock(),
    createPlayerMock(),
    new Inventory(new EventBus()),
    new EventBus(),
    silentAudio,
    VISUAL_PROFILES.dark
  );
  const tierZero = system.createStats(0);
  const tierThree = system.createStats(3);
  assert.equal(tierZero.maxHealth, GAMEPLAY.zombie.baseHealth);
  assert.ok(tierThree.maxHealth > tierZero.maxHealth);
  assert.ok(tierThree.damage > tierZero.damage);
  assert.ok(tierThree.speed > tierZero.speed);
  system.dispose();
});

test('Tower construction spends resources and eight kills reach level two', () => {
  const bus = new EventBus();
  const inventory = new Inventory(bus, {
    wood: GAMEPLAY.tower.cost.wood,
    stone: GAMEPLAY.tower.cost.stone,
    artifact: GAMEPLAY.tower.cost.artifact
  });
  const world = createWorldMock();
  const player = createPlayerMock();
  const towers = new TowerSystem(
    world,
    player,
    inventory,
    bus,
    silentAudio,
    VISUAL_PROFILES.dark
  );
  towers.previewPoint = new THREE.Vector3(0.84, world.getHeightAtWorld(0.84, 0), 0);
  assert.equal(towers.confirmPlacement(), true);
  assert.equal(towers.towers.length, 1);
  assert.equal(inventory.get('wood'), 0);

  const tower = towers.towers[0];
  for (let index = 0; index < 8; index += 1) {
    bus.emit('zombie:killed', { source: `tower:${tower.id}`, id: `z${index}`, loot: {} });
  }
  assert.equal(tower.level, 2);
  assert.equal(tower.kills, 8);
  towers.dispose();
});

function createWorldMock() {
  const terrain = {
    worldToGrid(x, z) {
      return { gx: Math.round(x / 0.84), gz: Math.round(z / 0.84) };
    },
    gridToWorld(gx, gz) {
      return { x: gx * 0.84, z: gz * 0.84 };
    },
    getCell() {
      return { level: 1 };
    }
  };

  return {
    terrain,
    getHeightAtWorld() {
      return 0.24;
    },
    getSpawnPoint() {
      return new THREE.Vector3(0, 0.24, 0);
    },
    isWalkableWorld() {
      return true;
    }
  };
}

function createPlayerMock() {
  return {
    position: new THREE.Vector3(),
    health: 100,
    maxHealth: 100,
    isDead: false,
    takeDamage(amount) {
      this.health = Math.max(0, this.health - amount);
      this.isDead = this.health === 0;
      return amount;
    }
  };
}

class MemoryStorage {
  constructor() {
    this.values = new Map();
  }

  getItem(key) {
    return this.values.get(key) ?? null;
  }

  setItem(key, value) {
    this.values.set(key, String(value));
  }

  removeItem(key) {
    this.values.delete(key);
  }
}
