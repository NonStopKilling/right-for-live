import test from 'node:test';
import assert from 'node:assert/strict';
import { Terrain } from '../src/world/Terrain.js';
import { VISUAL_PROFILES } from '../src/config/visualProfiles.js';
import { WaterSystem } from '../src/world/WaterSystem.js';
import { IslandSystem } from '../src/world/IslandSystem.js';
import { TreeSystem } from '../src/world/TreeSystem.js';
import { TowerSystem } from '../src/gameplay/TowerSystem.js';
import { ISLAND, ISLAND_BOATS, ISLAND_PLACES, ISLAND_VOLCANOES, MOAI_SITES, isIslandDock } from '../src/world/IslandMap.js';
import * as THREE from 'three';

test('island has safe arrival, ocean boundary and elevated volcanic terrain', () => {
  const terrain = new Terrain(VISUAL_PROFILES.daylight);
  terrain.applyOptions({ mapMode: 'island' });
  assert.equal(terrain.getCell(2, -2).walkable, true);
  assert.equal(terrain.getCell(-55, 0).water, true);
  assert.equal(terrain.getCell(180, 180).walkable, false);
  assert.ok(terrain.getCell(ISLAND_VOLCANOES[0].gx, ISLAND_VOLCANOES[0].gz - 12).level > terrain.getCell(2, -2).level);
  terrain.dispose();
});

test('island regeneration preserves coastline and resources and keeps trees out of ocean', () => {
  const terrain = new Terrain(VISUAL_PROFILES.daylight);
  terrain.applyOptions({ mapMode: 'island', seedOffset: 42 });
  const trees = new TreeSystem(terrain, VISUAL_PROFILES.daylight);
  const cells = terrain.generateChunkCells(2,-3);
  const resources = trees.getResourceNodes(cells);
  assert.ok(resources.length > 0);
  assert.deepEqual(terrain.generateChunkCells(2,-3), cells);
  assert.deepEqual(trees.getResourceNodes(cells),resources);
  assert.equal(trees.getResourceNodes(terrain.generateChunkCells(8,8)).length,0);
  terrain.dispose(); trees.dispose();
});

test('island water respects visibility and boats animate without accumulating vertical drift', () => {
  const terrain = new Terrain(VISUAL_PROFILES.daylight);
  terrain.applyOptions({ mapMode: 'island' });
  const water = new WaterSystem(terrain,VISUAL_PROFILES.daylight);
  water.applyOptions({ mapMode: 'island' });
  const cells = terrain.generateChunkCells(-2,0);
  const ocean = water.createChunkGroup(cells,'0,0');
  assert.ok(ocean.children[0].count > 0);
  water.applyOptions({ waterEnabled: false });
  assert.equal(water.createChunkGroup(cells,'0,0').children.length,0);
  const island = new IslandSystem(terrain);
  const group = island.createChunkGroup(cells,'0,0');
  const boat = group.children.find(child => child.name === 'IslandBoat');
  assert.ok(boat);
  const chunks = new Map([['0,0',{layers:{island:group}}]]);
  island.update(1,chunks);
  const before = boat.position.y;
  island.update(1,chunks);
  assert.notEqual(boat.position.y,before);
  island.update(10000,chunks);
  assert.ok(boat.position.y > 0.7 && boat.position.y < 0.9);
  group.traverse(object => { if (object.isInstancedMesh) object.dispose(); });
  ocean.children[0].dispose();
  water.dispose(); island.dispose(); terrain.dispose();
});

test('respawn falls back to island arrival when a checkpoint from another map is at sea', () => {
  const world = { options: { mapMode: 'island' },
    isWalkableWorld: () => false,
    getSpawnPoint: () => new THREE.Vector3(1.68,1,-1.68) };
  const point = TowerSystem.prototype.getRespawnPoint.call({
    world, getActiveTower: () => ({position: new THREE.Vector3(300,0,300)})
  });
  assert.deepEqual(point, new THREE.Vector3(1.68,1,-1.68));
});

test('island dry land is reachable from arrival without crossing deep water', () => {
  const terrain = new Terrain(VISUAL_PROFILES.daylight);
  terrain.applyOptions({ mapMode: 'island' });
  const visited = new Set(['2,-2']);
  const pending = [[2, -2]];
  for (let i = 0; i < pending.length; i++) {
    const [x, z] = pending[i];
    for (const [dx, dz] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const nx = x + dx, nz = z + dz, key = `${nx},${nz}`;
      if (nx < -110 || nx > 590 || nz < -320 || nz > 205 || visited.has(key)) continue;
      if (!terrain.getCell(nx, nz).walkable) continue;
      visited.add(key); pending.push([nx, nz]);
    }
  }
  for (const site of MOAI_SITES) assert.ok(visited.has(`${site.gx},${site.gz}`), site.name);
  for (const place of ISLAND_PLACES.filter(place => place.kind !== 'islet')) {
    assert.ok(visited.has(`${place.gx},${place.gz}`), `${place.name} must be reachable`);
  }
  assert.ok(visited.has(`${ISLAND_VOLCANOES[0].gx},${ISLAND_VOLCANOES[0].gz - 20}`), 'Rano Kau crater rim');
  assert.ok(visited.has(`${ISLAND_VOLCANOES[1].gx},${ISLAND_VOLCANOES[1].gz}`));
  assert.ok(visited.size < 270000, 'ocean must bound the explorable island');
  terrain.dispose();
});

test('island trees leave stone guardians and dock entrances clear', () => {
  const terrain = new Terrain(VISUAL_PROFILES.daylight);
  terrain.applyOptions({ mapMode: 'island' });
  const trees = new TreeSystem(terrain, VISUAL_PROFILES.daylight);
  for (const site of MOAI_SITES) {
    for (let x = site.gx-2; x <= site.gx+2; x++) {
      for (let z = site.gz-2; z <= site.gz+2; z++) {
        assert.equal(trees.shouldPlaceTree(terrain.getCell(x,z)), false, `tree overlaps moai at ${x},${z}`);
      }
    }
  }
  trees.dispose(); terrain.dispose();
});

test('dock decks remain above terrain along both piers', () => {
  const terrain = new Terrain(VISUAL_PROFILES.daylight);
  terrain.applyOptions({ mapMode: 'island' });
  for (let x = -30; x <= 220; x++) {
    for (let z = -175; z <= 16; z++) {
      if (isIslandDock(x,z)) assert.ok(terrain.getHeightAtGrid(x,z) < ISLAND.dockHeight, `buried dock at ${x},${z}`);
    }
  }
  terrain.dispose();
});


test('boats float on ocean at both authored harbors and moai stand on dry ground', () => {
  const terrain = new Terrain(VISUAL_PROFILES.daylight);
  for (const seedOffset of [0,42,1000]) {
    terrain.applyOptions({ mapMode: 'island', seedOffset });
    for (const boat of ISLAND_BOATS) assert.equal(terrain.getCell(boat.gx,boat.gz).water,true);
    for (const site of MOAI_SITES) {
      for (let i = 0; i < site.count; i++) {
        const offset = (i-(site.count-1)/2)*site.spacing;
        const x = Math.round(site.gx+Math.cos(site.angle)*offset);
        const z = Math.round(site.gz-Math.sin(site.angle)*offset);
        assert.equal(terrain.getCell(x,z).water,false, `${site.name} moai ${i}`);
      }
    }
  }
  terrain.dispose();
});
