import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { JsonStore } from '../src/storage.js';
import { validateChatMessage, validateProfile, validateSavePayload } from '../src/validators.js';

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
    characterName: 'Norte 01'
  });
});

test('save validation keeps inventory bounded and versioned', () => {
  const save = validateSavePayload({
    version: 1,
    inventory: { wood: 2.5, stone: -4, artifact: 1, ammoReserve: 30 },
    magazine: 99,
    storyStep: 3
  });

  assert.deepEqual(save.inventory, { wood: 2, stone: 0, artifact: 1, ammoReserve: 30 });
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
