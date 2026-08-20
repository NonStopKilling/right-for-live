import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { VISUAL_PROFILES } from '../src/config/visualProfiles.js';
import { GAMEPLAY } from '../src/config/gameplay.js';
import { EventBus } from '../src/core/EventBus.js';
import { CombatSystem } from '../src/gameplay/CombatSystem.js';
import { CraftingSystem } from '../src/gameplay/CraftingSystem.js';
import { Inventory } from '../src/gameplay/Inventory.js';
import { ObjectiveSystem } from '../src/gameplay/ObjectiveSystem.js';
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
  assert.deepEqual(inventory.snapshot(), {
    wood: 1,
    stone: 0,
    artifact: 0,
    ammoReserve: 3,
    healingPotion: 0,
    experience: 0
  });
});

test('SaveSystem round trips towers and rejects corrupted data', () => {
  const storage = new MemoryStorage();
  const saves = new SaveSystem(storage);
  const fresh = createFreshSave();
  fresh.inventory.wood = 14;
  fresh.towers.push({ id: 't1', x: 2.5, z: -1.5, level: 2, kills: 9 });
  fresh.activeCheckpointId = 't1';
  fresh.northProgress.complete = false;
  assert.equal(saves.save(fresh), true);
  assert.deepEqual(saves.load(), fresh);

  storage.setItem('voxel-survival-save-v1', '{broken');
  assert.equal(saves.load(), null);
  assert.equal(storage.getItem('voxel-survival-save-v1'), null);
});

test('SaveSystem adds potion and north-progress defaults to old save shapes', () => {
  const saves = new SaveSystem(new MemoryStorage());
  const loaded = saves.sanitize({
    version: 1,
    inventory: { wood: 1, stone: 2, artifact: 3, ammoReserve: 4 },
    magazine: 5,
    towers: [],
    activeCheckpointId: null,
    storyStep: 1
  });

  assert.equal(loaded.inventory.healingPotion, 0);
  assert.equal(loaded.inventory.experience, 0);
  assert.deepEqual(loaded.northProgress, { targetIndex: 0, bestDistance: 0, complete: false });
});

test('CraftingSystem crafts and uses healing potions', () => {
  const bus = new EventBus();
  const inventory = new Inventory(bus, { artifact: 10 });
  const player = createPlayerMock();
  player.health = 40;
  player.heal = function heal(amount) {
    const previous = this.health;
    this.health = Math.min(this.maxHealth, this.health + amount);
    return this.health - previous;
  };
  const crafting = new CraftingSystem(player, inventory, bus, silentAudio);

  assert.equal(crafting.craftHealingPotion(), true);
  assert.equal(inventory.get('artifact'), 0);
  assert.equal(inventory.get('healingPotion'), 1);
  assert.equal(crafting.useHealingPotion(), true);
  assert.equal(player.health, 85);
  assert.equal(inventory.get('healingPotion'), 0);
});

test('CraftingSystem blocks invalid potion actions without spending inventory', () => {
  const crafting = new CraftingSystem(createPlayerMock(), new Inventory(new EventBus()), new EventBus(), silentAudio);

  assert.equal(crafting.craftHealingPotion(), false);
  assert.equal(crafting.inventory.get('artifact'), 0);
  assert.equal(crafting.useHealingPotion(), false);
  assert.equal(crafting.inventory.get('healingPotion'), 0);
});

test('ObjectiveSystem tracks north progress and milestones once', () => {
  const bus = new EventBus();
  const milestones = [];
  const complete = [];
  bus.on('objective:north-milestone', (event) => milestones.push(event.completedTarget));
  bus.on('objective:north-complete', (event) => complete.push(event.complete));
  const player = { position: new THREE.Vector3(0, 0, 0) };
  const objectives = new ObjectiveSystem(player, bus, silentAudio);

  player.position.z = -351;
  objectives.update();
  objectives.update();

  assert.equal(objectives.snapshot().targetIndex, 1);
  assert.equal(Math.floor(objectives.snapshot().bestDistance), 351);
  assert.deepEqual(milestones, [350]);
  assert.deepEqual(complete, []);

  player.position.z = -701;
  objectives.update();
  objectives.update();

  assert.equal(objectives.snapshot().complete, true);
  assert.deepEqual(milestones, [350, 700]);
  assert.deepEqual(complete, [true]);
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

test('Terrain creates transparent-water candidate cells away from origin', () => {
  const terrain = new Terrain(VISUAL_PROFILES.dark);
  const waterCell = findWaterCell(terrain);
  assert.ok(waterCell, 'expected at least one generated water cell in sampled northern wetland');
  assert.equal(terrain.isWaterGrid(waterCell.gx, waterCell.gz), true);
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

test('Tower construction spends resources, tower kills grant xp, and towers can be dismantled', () => {
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
    bus.emit('zombie:killed', { source: `tower:${tower.id}`, id: `z${index}`, tier: 2, loot: {} });
  }
  assert.equal(tower.level, 2);
  assert.equal(tower.kills, 8);
  assert.equal(inventory.get('experience'), 48);
  assert.equal(towers.dismantleTower(tower.id), true);
  assert.equal(towers.towers.length, 0);
  assert.equal(inventory.get('wood'), Math.floor(GAMEPLAY.tower.cost.wood * 0.5));
  towers.dispose();
});

function findWaterCell(terrain) {
  for (let gz = -120; gz < -28; gz += 1) {
    for (let gx = -48; gx <= 48; gx += 1) {
      const cell = terrain.getCell(gx, gz);

      if (cell.water) {
        return cell;
      }
    }
  }

  return null;
}

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
