import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { JsonStore } from '../src/storage.js';
import { validateChatMessage, validateProfile, validateSavePayload } from '../src/validators.js';
import { NpcSystem } from '../src/npcSystem.js';
import { QuestSystem } from '../src/questSystem.js';
import { EconomySystem } from '../src/economySystem.js';

test('profile validation normalizes public account data', () => {
  const profile = validateProfile({
    email: 'PLAYER@Example.com ',
    birthDate: '1990-04-13',
    gender: 'Male',
    fullName: 'Player Example',
    characterName: 'Norte 01'
  });

  assert.deepEqual(profile, {
    email: 'player@example.com',
    birthDate: '1990-04-13',
    gender: 'male',
    fullName: 'Player Example',
    characterName: 'Norte 01',
    callsign: ''
  });
});

test('save validation keeps inventory bounded and versioned', () => {
  const save = validateSavePayload({
    version: 1,
    inventory: { wood: 2.5, stone: -4, artifact: 1, ammoReserve: 30, healingPotion: 2, experience: 17 },
    magazine: 99,
    storyStep: 3
  });

  assert.deepEqual(save.inventory, {
    wood: 2,
    stone: 0,
    artifact: 1,
    ammoReserve: 30,
    healingPotion: 2,
    experience: 17
  });
  assert.equal(save.magazine, 6);
  assert.equal(save.version, 1);
});

test('chat validation trims and limits player-authored text', () => {
  assert.equal(validateChatMessage({ message: '  sigo   la senal  ' }), 'sigo la senal');
  assert.throws(() => validateChatMessage({ message: '' }), /Invalid chat message/);
});

test('gravestone destruction consumes stone and artifact from cloud save', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'senal-server-'));
  const store = new JsonStore(path.join(dir, 'db.json'));
  const profile = store.createOrLoadProfile(validateProfile({
    email: 'grave@example.com',
    birthDate: '1988-01-02',
    gender: 'Other',
    fullName: 'Grave Tester',
    characterName: 'Tester'
  }));
  store.putSave(profile.id, {
    version: 1,
    inventory: { wood: 0, stone: 1, artifact: 1, ammoReserve: 0 }
  });
  const gravestone = store.createGravestone({
    sessionId: 'north-forest-01',
    deadProfileId: profile.id,
    deadCharacterName: profile.characterName,
    x: 2,
    z: 3
  });

  store.destroyGravestone(gravestone.id, profile.id);
  const save = store.getSave(profile.id);
  assert.equal(save.payload.inventory.stone, 0);
  assert.equal(save.payload.inventory.artifact, 0);
  assert.equal(store.listGravestones('north-forest-01').length, 0);
});

test('NpcSystem uses hate table threat to select the target', () => {
  let currentTime = 0;
  const npcSystem = new NpcSystem({ now: () => currentTime });
  const sessionId = 'test-session';
  const session = npcSystem.getSession(sessionId);
  const npc = session.npcs.get('npc-0');

  npc.x = 0;
  npc.z = 0;
  npc.spawnX = 0;
  npc.spawnZ = 0;
  npc.visionRadius = 30;
  npc.lastAttackAt = currentTime;
  npc.attackInterval = 999999;
  npcSystem.updatePlayer(sessionId, 'low-threat', { x: 1, z: 0, health: 100 });
  npcSystem.updatePlayer(sessionId, 'high-threat', { x: 4, z: 0, health: 100 });
  npcSystem.registerDamage(sessionId, 'low-threat', npc.id, 4);
  npcSystem.registerDamage(sessionId, 'high-threat', npc.id, 24);

  currentTime += 100;
  npcSystem.updateNpc(session, npc, 0.1, currentTime);

  assert.equal(npc.state, 'chase');
  assert.equal(npcSystem.snapshotNpc(npc).targetProfileId, 'high-threat');
});

test('NpcSystem leashes, becomes invulnerable, and regenerates at spawn', () => {
  let currentTime = 0;
  const npcSystem = new NpcSystem({ now: () => currentTime });
  const session = npcSystem.getSession('leash-session');
  const npc = session.npcs.get('npc-0');

  npc.spawnX = 0;
  npc.spawnZ = 0;
  npc.x = 30;
  npc.z = 0;
  npc.health = 12;
  npc.maxHealth = 100;
  npc.leashRadius = 8;

  for (let index = 0; index < 180; index += 1) {
    currentTime += 100;
    npcSystem.updateNpc(session, npc, 0.1, currentTime);
  }

  assert.equal(npc.state, 'patrol');
  assert.equal(npc.invulnerable, false);
  assert.equal(npc.health, npc.maxHealth);
  assert.ok(Math.hypot(npc.x - npc.spawnX, npc.z - npc.spawnZ) <= npc.patrolRadius);
});

test('QuestSystem starts quests and persists profile quest states', () => {
  const store = createTestStore();
  const profile = createTestProfile(store, 'quests-start@example.com');
  const quests = new QuestSystem(store);

  const started = quests.startQuest(profile.id, 'server_hunter');
  const loaded = new QuestSystem(store).getSnapshot(profile.id)
    .find((quest) => quest.id === 'server_hunter');

  assert.equal(started.state, 'active');
  assert.equal(loaded.state, 'active');
  assert.equal(loaded.step.current, 0);
});

test('QuestSystem completes a kill quest from authoritative npc events', () => {
  const store = createTestStore();
  const profile = createTestProfile(store, 'quests-kill@example.com');
  const quests = new QuestSystem(store);

  quests.startQuest(profile.id, 'server_hunter');
  quests.applyEvent(profile.id, { type: 'npc:killed', target: 'server_npc', npcId: 'npc-0' });
  const snapshot = quests.applyEvent(profile.id, { type: 'npc:killed', target: 'server_npc', npcId: 'npc-1' });
  const quest = snapshot.find((item) => item.id === 'server_hunter');

  assert.equal(quest.state, 'completed');
  assert.equal(quest.step.current, 2);
});

test('QuestSystem advances exploration when the player enters a discovery area', () => {
  const store = createTestStore();
  const profile = createTestProfile(store, 'quests-discovery@example.com');
  const quests = new QuestSystem(store);

  quests.startQuest(profile.id, 'north_signal');
  quests.applyEvent(profile.id, { type: 'player:moved', x: 1, z: -36 });
  const snapshot = quests.applyEvent(profile.id, { type: 'player:moved', x: 0, z: -43 });
  const quest = snapshot.find((item) => item.id === 'north_signal');

  assert.equal(quest.state, 'completed');
  assert.equal(quest.step.discovered, true);
});

test('QuestSystem completes fetch quests from inventory sync', () => {
  const store = createTestStore();
  const profile = createTestProfile(store, 'quests-fetch@example.com');
  const quests = new QuestSystem(store);

  quests.startQuest(profile.id, 'field_supplies');
  const snapshot = quests.applyEvent(profile.id, {
    type: 'inventory:synced',
    inventory: { wood: 8, stone: 4 }
  });
  const quest = snapshot.find((item) => item.id === 'field_supplies');

  assert.equal(quest.state, 'completed');
  assert.deepEqual(quest.step.current, { wood: 8, stone: 4 });
});

test('EconomySystem trades against dynamic stock and updates inventory', () => {
  const store = createTestStore();
  const profile = createTestProfile(store, 'economy-trade@example.com');
  const economy = new EconomySystem(store, { now: () => 1000 });

  const result = economy.trade(profile.id, 'field_trader', 'buy_ammo', {
    wood: 12,
    stone: 4,
    artifact: 0,
    ammoReserve: 0
  });
  const offer = result.economy.merchants
    .find((merchant) => merchant.id === 'field_trader')
    .offers.find((item) => item.id === 'buy_ammo');

  assert.equal(result.inventory.ammoReserve, 18);
  assert.equal(result.inventory.wood, 9);
  assert.equal(result.inventory.stone, 3);
  assert.equal(offer.stock, 5);
  assert.ok(offer.priceFactor > 1);
});

test('EconomySystem rejects trades when the player cannot pay', () => {
  const store = createTestStore();
  const profile = createTestProfile(store, 'economy-block@example.com');
  const economy = new EconomySystem(store);

  assert.throws(
    () => economy.trade(profile.id, 'field_trader', 'buy_potion', { wood: 0, artifact: 0 }),
    /Not enough resources/
  );
});

function createTestStore() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'senal-server-'));
  return new JsonStore(path.join(dir, 'db.json'));
}

function createTestProfile(store, email) {
  return store.createOrLoadProfile(validateProfile({
    email,
    birthDate: '1990-01-01',
    gender: 'Other',
    fullName: 'Quest Tester',
    characterName: 'Questor'
  }));
}
