import * as THREE from 'three';
import { loadGameOptions } from '../config/gameOptions.js';
import { GAMEPLAY } from '../config/gameplay.js';
import { damping } from '../utils/constants.js';

const PROFILE_KEY = 'voxel-survival-profile-draft-v1';
const SESSION_ID = 'north-forest-01';
const DIRECTION = new THREE.Vector3();

export class NetworkNpcSystem {
  constructor(world, player, eventBus, audio, profile, inventory) {
    this.world = world;
    this.player = player;
    this.eventBus = eventBus;
    this.audio = audio;
    this.profile = profile;
    this.inventory = inventory;
    this.options = loadGameOptions().lab;
    this.group = new THREE.Group();
    this.group.name = 'ServerAuthoritativeNpcs';
    this.npcs = new Map();
    this.telegraphs = new Map();
    this.ws = null;
    this.profileId = null;
    this.connected = false;
    this.stateTimer = 0;
    this.inventoryTimer = 0;
    this.quests = [];
    this.economy = { merchants: [] };
    this.server = resolveServerConfig();
    this.assets = this.createAssets();
    if (this.options.serverNpcs || this.options.economyOnline) {
      this.connect();
    }
  }

  applyOptions(options = {}) {
    const wasEnabled = this.options.serverNpcs || this.options.economyOnline;
    this.options = { ...this.options, ...options };
    const isEnabled = this.options.serverNpcs || this.options.economyOnline;

    if (!isEnabled) {
      this.ws?.close();
      this.connected = false;
      this.applySnapshot([]);
      return;
    }

    if (!wasEnabled && !this.connected) {
      this.connect();
    }
  }

  addTo(scene) {
    scene.add(this.group);
  }

  async connect() {
    try {
      const profile = await this.createProfile();
      this.profileId = profile.id;
      this.ws = new WebSocket(this.server.wsUrl);
      this.ws.addEventListener('open', () => {
        this.connected = true;
        this.send('session:join', {
          profileId: this.profileId,
          sessionId: SESSION_ID
        });
      });
      this.ws.addEventListener('message', (event) => this.handleMessage(event));
      this.ws.addEventListener('close', () => {
        this.connected = false;
      });
      this.ws.addEventListener('error', () => {
        this.connected = false;
      });
    } catch {
      this.connected = false;
    }
  }

  async createProfile() {
    const draft = loadProfileDraft();
    const response = await fetch(`${this.server.httpUrl}/api/profiles`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: draft.email || 'offline-player@example.com',
        birthDate: draft.birthDate || '1990-01-01',
        gender: draft.gender || 'Other',
        fullName: draft.fullName || 'Offline Player',
        characterName: draft.characterName || draft.callsign || 'Norte'
      })
    });

    if (!response.ok) {
      throw new Error('Profile unavailable');
    }

    const body = await response.json();
    return body.profile;
  }

  async registerProfile(profileInput) {
    const response = await fetch(`${this.server.httpUrl}/api/profiles`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(profileInput)
    });

    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(body.error || 'No se pudo guardar el registro');
    }

    this.profileId = body.profile?.id ?? this.profileId;
    return body;
  }

  update(deltaTime) {
    this.stateTimer -= deltaTime;
    this.inventoryTimer -= deltaTime;

    if (this.connected && this.stateTimer <= 0) {
      this.stateTimer = 0.18;
      if (this.options.serverNpcs) {
        this.send('player:state', {
          x: this.player.position.x,
          z: this.player.position.z,
          facing: this.player.group.rotation.y,
          health: this.player.health
        });
      }
    }

    if (this.connected && this.options.economyOnline && this.inventoryTimer <= 0) {
      this.inventoryTimer = 1.15;
      this.send('quest:sync-inventory', {
        inventory: this.inventory?.snapshot?.() ?? {}
      });
    }

    this.npcs.forEach((npc) => {
      npc.position.x += (npc.targetX - npc.position.x) * damping(deltaTime, 14);
      npc.position.z += (npc.targetZ - npc.position.z) * damping(deltaTime, 14);
      npc.position.y += (this.world.getHeightAtWorld(npc.position.x, npc.position.z) - npc.position.y) *
        damping(deltaTime, 12);
      DIRECTION.set(npc.targetX - npc.position.x, 0, npc.targetZ - npc.position.z);

      if (DIRECTION.lengthSq() > 0.001) {
        npc.group.rotation.y = Math.atan2(DIRECTION.x, DIRECTION.z);
      }

      const pulse = npc.invulnerable ? 0.72 + Math.sin(performance.now() * 0.012) * 0.08 : 1;
      npc.body.material.opacity = pulse;
      npc.healthFill.scale.x = Math.max(0.001, (npc.health / npc.maxHealth) * 0.96);
    });

    this.updateTelegraphs();
  }

  handleMessage(event) {
    try {
      const message = JSON.parse(event.data);

      if (message.type === 'npc:snapshot') {
        this.applySnapshot(this.options.serverNpcs ? message.payload?.npcs ?? [] : []);
      } else if (message.type === 'npc:damaged') {
        this.upsertNpc(message.payload);
      } else if (message.type === 'quest:snapshot') {
        this.quests = Array.isArray(message.payload?.quests) ? message.payload.quests : [];
        this.eventBus.emit('quest:updated', { quests: this.quests });
      } else if (message.type === 'economy:snapshot') {
        this.economy = message.payload?.economy ?? { merchants: [] };
        this.eventBus.emit('economy:updated', { economy: this.economy });
      } else if (message.type === 'economy:trade-result') {
        this.economy = message.payload?.economy ?? this.economy;
        if (message.payload?.inventory) {
          this.inventory?.replace?.(message.payload.inventory, 'server-trade');
        }
        this.audio.play('reward');
        this.eventBus.emit('economy:trade-result', message.payload);
      }
    } catch {
      // Ignore malformed server packets; the local game remains playable.
    }
  }

  applySnapshot(npcs) {
    const liveIds = new Set(npcs.map((npc) => npc.id));
    npcs.forEach((npc) => this.upsertNpc(npc));

    for (const [id, npc] of this.npcs) {
      if (!liveIds.has(id)) {
        npc.group.removeFromParent();
        this.npcs.delete(id);
      }
    }
  }

  upsertNpc(snapshot) {
    if (!snapshot?.id) {
      return null;
    }

    let npc = this.npcs.get(snapshot.id);

    if (!npc) {
      npc = this.createNpc(snapshot);
      this.npcs.set(snapshot.id, npc);
      this.group.add(npc.group);
    }

    npc.targetX = snapshot.x;
    npc.targetZ = snapshot.z;
    npc.health = snapshot.health;
    npc.maxHealth = snapshot.maxHealth;
    npc.state = snapshot.state;
    npc.invulnerable = snapshot.invulnerable;
    npc.group.visible = snapshot.health > 0;
    npc.stateBadge.material.color.setHex(resolveStateColor(snapshot.state));

    if (snapshot.telegraph) {
      this.upsertTelegraph(snapshot.telegraph);
    }

    return npc;
  }

  createNpc(snapshot) {
    const group = new THREE.Group();
    group.name = `ServerNpc-${snapshot.id}`;
    group.position.set(snapshot.x, this.world.getHeightAtWorld(snapshot.x, snapshot.z), snapshot.z);

    const tier = Math.max(0, snapshot.tier ?? 0);
    const body = new THREE.Mesh(this.assets.bodyGeometry, this.createNpcMaterial(tier, snapshot.elite));
    body.position.y = 0.58;
    const head = new THREE.Mesh(this.assets.headGeometry, this.createNpcMaterial(tier + 1, snapshot.elite));
    head.position.y = 0.98;
    const eyeLeft = new THREE.Mesh(this.assets.eyeGeometry, this.assets.eyeMaterial);
    eyeLeft.position.set(-0.08, 1.02, 0.18);
    const eyeRight = eyeLeft.clone();
    eyeRight.position.x = 0.08;
    const stateBadge = new THREE.Mesh(this.assets.badgeGeometry, this.assets.badgeMaterial.clone());
    stateBadge.position.set(0, 1.32, 0);
    const healthBack = new THREE.Mesh(this.assets.healthGeometry, this.assets.healthBackMaterial);
    healthBack.position.set(0, 1.22, 0);
    const healthFill = new THREE.Mesh(this.assets.healthGeometry, this.assets.healthMaterial);
    healthFill.position.set(0, 1.225, 0.012);

    [body, head, eyeLeft, eyeRight].forEach((mesh) => {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    });

    group.add(body, head, eyeLeft, eyeRight, stateBadge, healthBack, healthFill);
    group.scale.setScalar(snapshot.elite ? 1.32 : 1 + tier * 0.08);

    return {
      id: snapshot.id,
      group,
      position: group.position,
      body,
      stateBadge,
      healthFill,
      targetX: snapshot.x,
      targetZ: snapshot.z,
      health: snapshot.health,
      maxHealth: snapshot.maxHealth,
      state: snapshot.state,
      invulnerable: snapshot.invulnerable
    };
  }

  upsertTelegraph(telegraph) {
    if (this.telegraphs.has(telegraph.id)) {
      return;
    }

    const geometry = telegraph.shape === 'diamond'
      ? new THREE.CircleGeometry(telegraph.radius, 4)
      : new THREE.RingGeometry(telegraph.radius * 0.76, telegraph.radius, 36);
    const material = new THREE.MeshBasicMaterial({
      color: telegraph.shape === 'diamond' ? 0xe35f49 : 0xe5c863,
      transparent: true,
      opacity: 0.58,
      depthWrite: false,
      toneMapped: false,
      side: THREE.DoubleSide
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = `ServerNpcTelegraph-${telegraph.id}`;
    mesh.rotation.x = -Math.PI / 2;
    mesh.rotation.z = telegraph.shape === 'diamond' ? Math.PI / 4 : 0;
    mesh.position.set(telegraph.x, this.world.getHeightAtWorld(telegraph.x, telegraph.z) + 0.05, telegraph.z);
    mesh.renderOrder = 7;
    this.group.add(mesh);
    this.telegraphs.set(telegraph.id, { mesh, resolveAt: telegraph.resolveAt, startsAt: telegraph.startsAt });
  }

  updateTelegraphs() {
    const now = Date.now();

    for (const [id, telegraph] of this.telegraphs) {
      const progress = Math.min(1, (now - telegraph.startsAt) / Math.max(1, telegraph.resolveAt - telegraph.startsAt));
      telegraph.mesh.material.opacity = 0.62 * (1 - progress * 0.4);
      telegraph.mesh.scale.setScalar(0.72 + progress * 0.28);

      if (now > telegraph.resolveAt + 180) {
        telegraph.mesh.geometry.dispose();
        telegraph.mesh.material.dispose();
        telegraph.mesh.removeFromParent();
        this.telegraphs.delete(id);
      }
    }
  }

  getRayTarget(origin, direction, maxRange, radius = 0.42) {
    let target = null;
    let nearestDistance = maxRange;

    this.npcs.forEach((npc) => {
      if (!npc.group.visible || npc.invulnerable) {
        return;
      }

      DIRECTION.set(npc.position.x - origin.x, 0, npc.position.z - origin.z);
      const along = DIRECTION.dot(direction);

      if (along < 0 || along > nearestDistance) {
        return;
      }

      const perpendicularSquared = Math.max(0, DIRECTION.lengthSq() - along * along);

      if (perpendicularSquared <= radius * radius) {
        target = npc;
        nearestDistance = along;
      }
    });

    return target ? { zombie: target, distance: nearestDistance, online: true } : null;
  }

  damageZombie(npc, amount, source = 'player') {
    if (!npc || npc.invulnerable) {
      return { damage: 0, killed: false };
    }

    this.send('npc:damage', {
      npcId: npc.id,
      amount,
      kind: source === 'taunt' ? 'taunt' : 'damage'
    });
    this.audio.playGameEffect('zombieHit');
    return { damage: amount, killed: false };
  }

  startQuest(questId) {
    this.send('quest:start', { questId });
  }

  getQuestSnapshot() {
    return {
      connected: this.connected,
      profileId: this.profileId,
      quests: this.quests
    };
  }

  trade(merchantId, offerId) {
    if (!this.options.economyOnline) {
      return;
    }

    this.send('economy:trade', {
      merchantId,
      offerId,
      inventory: this.inventory?.snapshot?.() ?? {}
    });
  }

  getEconomySnapshot() {
    return {
      connected: this.connected,
      merchants: this.economy?.merchants ?? []
    };
  }

  send(type, payload) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, payload }));
    }
  }

  createAssets() {
    return {
      bodyGeometry: new THREE.BoxGeometry(0.54, 0.54, 0.38),
      headGeometry: new THREE.BoxGeometry(0.38, 0.34, 0.34),
      eyeGeometry: new THREE.BoxGeometry(0.07, 0.07, 0.045),
      badgeGeometry: new THREE.BoxGeometry(0.4, 0.05, 0.05),
      healthGeometry: new THREE.BoxGeometry(0.56, 0.055, 0.035),
      eyeMaterial: new THREE.MeshBasicMaterial({ color: 0xff5d38, toneMapped: false }),
      badgeMaterial: new THREE.MeshBasicMaterial({ color: 0x79c6a7, toneMapped: false }),
      healthMaterial: new THREE.MeshBasicMaterial({ color: 0xdc5f49, toneMapped: false }),
      healthBackMaterial: new THREE.MeshBasicMaterial({ color: 0x171512, toneMapped: false })
    };
  }

  createNpcMaterial(tier, elite) {
    const color = new THREE.Color().setHSL(0.31 - tier * 0.025, elite ? 0.68 : 0.42, elite ? 0.28 : 0.35);
    return new THREE.MeshStandardMaterial({
      color,
      roughness: 0.9,
      transparent: true,
      opacity: 1,
      flatShading: true
    });
  }

  dispose() {
    this.ws?.close();
    this.npcs.forEach((npc) => {
      npc.body.material.dispose();
      npc.group.removeFromParent();
    });
    this.npcs.clear();
    this.telegraphs.forEach(({ mesh }) => {
      mesh.geometry.dispose();
      mesh.material.dispose();
      mesh.removeFromParent();
    });
    this.telegraphs.clear();
    Object.values(this.assets).forEach((asset) => asset?.dispose?.());
    this.group.clear();
  }
}

function loadProfileDraft() {
  try {
    return JSON.parse(window.localStorage.getItem(PROFILE_KEY) ?? '{}');
  } catch {
    return {};
  }
}

function resolveServerConfig() {
  const fallback = 'http://127.0.0.1:8787';
  let httpUrl = fallback;

  try {
    httpUrl = window.localStorage.getItem('voxel-survival-server-url') || fallback;
  } catch {
    httpUrl = fallback;
  }

  const normalizedHttpUrl = httpUrl.replace(/\/+$/, '');
  const wsUrl = normalizedHttpUrl.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:');

  return {
    httpUrl: normalizedHttpUrl,
    wsUrl: `${wsUrl}/ws`
  };
}

function resolveStateColor(state) {
  const colors = {
    patrol: 0x79c6a7,
    chase: 0xe5c863,
    attack: 0xe35f49,
    flee: 0x7aa8d8,
    leash: 0xb6b9a2
  };
  return colors[state] ?? 0x79c6a7;
}
