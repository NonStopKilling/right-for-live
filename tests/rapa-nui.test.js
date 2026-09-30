import test from 'node:test';
import assert from 'node:assert/strict';
import { Terrain } from '../src/world/Terrain.js';
import { TreeSystem } from '../src/world/TreeSystem.js';
import { VISUAL_PROFILES } from '../src/config/visualProfiles.js';
import { World } from '../src/world/World.js';
import { IslandSystem } from '../src/world/IslandSystem.js';
import { MOAI_SITES } from '../src/world/IslandMap.js';
import { WaterSystem } from '../src/world/WaterSystem.js';

test('island grows to at least twice the previous land area while keeping arrival safe', () => {
  const terrain = new Terrain(VISUAL_PROFILES.daylight);
  terrain.applyOptions({ mapMode: 'island' });
  let land = 0, minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (let z = -320; z <= 205; z++) {
    for (let x = -110; x <= 590; x++) {
      if (terrain.getCell(x,z).water) continue;
      land++;
      minX = Math.min(minX,x); maxX = Math.max(maxX,x);
      minZ = Math.min(minZ,z); maxZ = Math.max(maxZ,z);
    }
  }
  assert.ok(land >= 59210 * 2, `land cells: ${land}`);
  assert.ok(maxX - minX >= 590, `width: ${maxX-minX}`);
  assert.ok(maxZ - minZ >= 420, `length: ${maxZ-minZ}`);
  assert.equal(terrain.getCell(2,-2).walkable,true);
  terrain.dispose();
});

test('ahu platform walking height matches its raised surface', () => {
  const terrain = new Terrain(VISUAL_PROFILES.daylight);
  terrain.applyOptions({mapMode:'island'});
  const world = {terrain,options:{mapMode:'island'},city:{getWalkSurfaceAtWorld:()=>null}};
  const height = World.prototype.getHeightAtWorld.call(world,MOAI_SITES[0].gx*.84,MOAI_SITES[0].gz*.84);
  assert.ok(Math.abs(height - 2.04) < 0.001);
  terrain.dispose();
});

test('Tongariki statues belong to their local chunks instead of the distant site center', () => {
  const terrain = new Terrain(VISUAL_PROFILES.daylight);
  terrain.applyOptions({mapMode:'island'});
  const island = new IslandSystem(terrain);
  const group = island.createChunkGroup(terrain.generateChunkCells(28,-6),'28,-6');
  assert.ok(group.getObjectByName('Island-head')?.count > 0, 'nearby moai must survive center-chunk eviction');
  group.traverse(object=>{if(object.isInstancedMesh)object.dispose();});
  terrain.dispose(); island.dispose();
});

test('palms dominate island wood resources and harvesting removes their geometry', () => {
  const terrain = new Terrain(VISUAL_PROFILES.daylight);
  terrain.applyOptions({ mapMode: 'island' });
  const trees = new TreeSystem(terrain,VISUAL_PROFILES.daylight);
  trees.applyOptions({ mapMode: 'island' });
  const cells = [];
  for (let z = -80; z < 0; z++) for (let x = 0; x < 90; x++) cells.push(terrain.getCell(x,z));
  const resources = trees.getResourceNodes(cells);
  const palms = resources.filter(resource => resource.label === 'PALMERA · MADERA');
  assert.ok(palms.length / resources.length >= 0.75, `${palms.length}/${resources.length} palms`);
  const target = palms[0];
  const cell = terrain.getCell(target.gx,target.gz);
  const before = trees.createChunkGroup([cell],'harvest');
  const after = trees.createChunkGroup([cell],'harvest',new Set([target.id]));
  assert.ok(before.children.length > 0);
  assert.equal(after.children.length,0);
  before.traverse(object => { if (object.isInstancedMesh) object.dispose(); });
  terrain.dispose(); trees.dispose();
});

test('natural-color LAB preset changes existing colors without adding geometry', () => {
  const terrain = new Terrain(VISUAL_PROFILES.daylight);
  terrain.applyOptions({ mapMode: 'island' });
  const trees = new TreeSystem(terrain,VISUAL_PROFILES.daylight);
  trees.applyOptions({ mapMode: 'island' });
  const water = new WaterSystem(terrain,VISUAL_PROFILES.daylight);
  water.applyOptions({ mapMode: 'island' });
  const cell = terrain.getCell(20,-30);
  const originalGround = terrain.resolveBlockColor(cell,'surface',1);
  const originalPalm = trees.resolveTreePalette(34,-42).base;
  terrain.applyOptions({ islandNaturalColors: true });
  trees.applyOptions({ islandNaturalColors: true });
  water.applyOptions({ islandNaturalColors: true });
  assert.notEqual(terrain.resolveBlockColor(cell,'surface',1),originalGround);
  assert.notEqual(trees.resolveTreePalette(34,-42).base,originalPalm);
  assert.equal(water.oceanMaterial.uniforms.naturalColors.value,1);
  water.dispose(); trees.dispose(); terrain.dispose();
});
