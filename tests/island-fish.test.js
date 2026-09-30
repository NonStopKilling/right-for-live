import test from 'node:test';
import assert from 'node:assert/strict';
import { Terrain } from '../src/world/Terrain.js';
import { IslandFishSystem } from '../src/world/IslandFishSystem.js';
import { VISUAL_PROFILES } from '../src/config/visualProfiles.js';

test('coastal fish use shared meshes and flee a nearby threat without entering land', () => {
  const terrain = new Terrain(VISUAL_PROFILES.daylight);
  terrain.applyOptions({mapMode:'island'});
  const fish = new IslandFishSystem(terrain);
  fish.applyOptions({mapMode:'island',islandFishEnabled:true,islandFishDensity:100});
  const chunks = new Map();
  for (let cz = -17; cz <= -14; cz++) for (let cx = 17; cx <= 20; cx++) {
    const key = `${cx},${cz}`;
    chunks.set(key,{layers:{fish:fish.createChunkGroup(terrain.generateChunkCells(cx,cz),key)}});
  }
  const group = [...chunks.values()].map(chunk => chunk.layers.fish).find(layer => layer.userData.schools?.length);
  assert.ok(group, 'a coastal area must contain at least one school');
  assert.ok([...chunks.values()].some(chunk => chunk.layers.fish.userData.schools.some(school => school.large)),
    'large solitary fish must exist among coastal shoals');
  assert.ok(group.children.length <= 2, 'schools share at most two draw calls per chunk');
  const school = group.userData.schools[0];
  const before = {x:school.x,z:school.z};
  fish.update(0.5,chunks,[{x:school.x+0.5,z:school.z}]);
  assert.ok(school.x < before.x, 'school swims away from the approaching threat');
  for (let i=0;i<30;i++) fish.update(0.1,chunks,[{x:school.x+0.5,z:school.z}]);
  assert.equal(terrain.isWaterWorld(school.x,school.z),true);
  fish.applyOptions({islandFishEnabled:false});
  assert.equal(fish.createChunkGroup(terrain.generateChunkCells(18,-15),'off').children.length,0);
  for (const chunk of chunks.values()) chunk.layers.fish.traverse(object=>{if(object.isInstancedMesh)object.dispose();});
  fish.dispose(); terrain.dispose();
});
