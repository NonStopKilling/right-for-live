import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { validateSavePayload, httpError } from './validators.js';

export class JsonStore {
  constructor(filePath) {
    this.filePath = filePath;
    this.data = {
      profiles: [],
      saves: {},
      gravestones: [],
      quests: {},
      economy: {}
    };
    this.load();
  }

  load() {
    if (!fs.existsSync(this.filePath)) {
      return;
    }

    this.data = {
      profiles: [],
      saves: {},
      gravestones: [],
      quests: {},
      economy: {},
      ...JSON.parse(fs.readFileSync(this.filePath, 'utf8'))
    };
  }

  persist() {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2));
  }

  createOrLoadProfile(profile) {
    const existing = this.data.profiles.find((item) => item.email === profile.email);
    const now = new Date().toISOString();

    if (existing) {
      Object.assign(existing, {
        birthDate: profile.birthDate,
        gender: profile.gender,
        fullName: profile.fullName,
        characterName: profile.characterName,
        updatedAt: now
      });
      this.persist();
      return publicProfile(existing);
    }

    const created = {
      id: crypto.randomUUID(),
      ...profile,
      createdAt: now,
      updatedAt: now
    };
    this.data.profiles.push(created);
    this.persist();
    return publicProfile(created);
  }

  getProfile(profileId) {
    return this.data.profiles.find((profile) => profile.id === profileId) ?? null;
  }

  getSave(profileId) {
    return this.data.saves[profileId] ?? null;
  }

  putSave(profileId, payload) {
    if (!this.getProfile(profileId)) {
      throw httpError(404, 'Profile not found');
    }

    const save = {
      profileId,
      payload: validateSavePayload(payload),
      updatedAt: new Date().toISOString()
    };
    this.data.saves[profileId] = save;
    this.persist();
    return save;
  }

  getQuestStates(profileId) {
    if (!this.getProfile(profileId)) {
      throw httpError(404, 'Profile not found');
    }

    this.data.quests[profileId] ??= {};
    return structuredClone(this.data.quests[profileId]);
  }

  putQuestStates(profileId, states) {
    if (!this.getProfile(profileId)) {
      throw httpError(404, 'Profile not found');
    }

    this.data.quests[profileId] = structuredClone(states);
    this.persist();
    return this.getQuestStates(profileId);
  }

  getEconomyState() {
    this.data.economy ??= {};
    return structuredClone(this.data.economy);
  }

  putEconomyState(state) {
    this.data.economy = structuredClone(state);
    this.persist();
    return this.getEconomyState();
  }

  listGravestones(sessionId) {
    return this.data.gravestones.filter(
      (gravestone) => gravestone.sessionId === sessionId && !gravestone.destroyedAt
    );
  }

  createGravestone(input) {
    const gravestone = {
      id: crypto.randomUUID(),
      ...input,
      message: null,
      discoveredByProfileId: null,
      destroyedByProfileId: null,
      destroyedAt: null,
      createdAt: new Date().toISOString()
    };
    this.data.gravestones.push(gravestone);
    this.persist();
    return gravestone;
  }

  updateGravestone(id, profileId, message) {
    const gravestone = this.findActiveGravestone(id);
    gravestone.discoveredByProfileId = profileId || gravestone.discoveredByProfileId;

    if (message && !gravestone.message) {
      gravestone.message = message;
    }

    this.persist();
    return gravestone;
  }

  destroyGravestone(id, profileId) {
    const gravestone = this.findActiveGravestone(id);
    const save = this.getSave(profileId);
    const inventory = save?.payload?.inventory;

    if (!inventory || inventory.stone < 1 || inventory.artifact < 1) {
      throw httpError(409, 'Destroying a gravestone costs 1 stone and 1 strange artifact');
    }

    inventory.stone -= 1;
    inventory.artifact -= 1;
    save.updatedAt = new Date().toISOString();
    gravestone.destroyedByProfileId = profileId;
    gravestone.destroyedAt = new Date().toISOString();
    this.persist();
    return gravestone;
  }

  findActiveGravestone(id) {
    const gravestone = this.data.gravestones.find((item) => item.id === id && !item.destroyedAt);

    if (!gravestone) {
      throw httpError(404, 'Gravestone not found');
    }

    return gravestone;
  }
}

function publicProfile(profile) {
  return {
    id: profile.id,
    characterName: profile.characterName,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt
  };
}
