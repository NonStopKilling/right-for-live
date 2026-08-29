import * as THREE from 'three';
import { DEFAULT_LAB_OPTIONS } from '../config/gameOptions.js';
import { GAMEPLAY } from '../config/gameplay.js';
import { Zombie } from '../entities/Zombie.js';
import { WORLD, hash2D } from '../utils/constants.js';

const COLOR = new THREE.Color();
const DIRECTION = new THREE.Vector3();

export class ZombieSystem {
  constructor(world, player, inventory, eventBus, audio, profile) {
    this.world = world;
    this.player = player;
    this.inventory = inventory;
    this.eventBus = eventBus;
    this.audio = audio;
    this.profile = profile;
    this.options = structuredClone(DEFAULT_LAB_OPTIONS);
    this.group = new THREE.Group();
    this.group.name = 'Zombies';
    this.zombies = [];
    this.lootEffects = [];
    this.spawnTimer = 2.4;
    this.spawnSerial = 0;
    this.towerSystem = null;
    this.assetsByTier = new Map();
    this.sharedGeometries = this.createSharedGeometries();
    this.sharedMaterials = this.createSharedMaterials();
    this.lootGeometry = new THREE.BoxGeometry(0.13, 0.13, 0.13);
    this.lootMaterials = new Map();
    this.cityHordeTimer = 38;
    this.cityHordeWarningIssued = false;
  }

  addTo(scene) {
    scene.add(this.group);
  }

  setTowerSystem(towerSystem) {
    this.towerSystem = towerSystem;
  }

  applyOptions(options = {}) {
    const previousFear = this.options.zombieFearVisuals;
    this.options = { ...this.options, ...options };

    if (!this.options.localZombies) {
      while (this.zombies.length > 0) {
        this.removeZombieAt(this.zombies.length - 1);
      }
    }

    if (previousFear !== this.options.zombieFearVisuals) {
      this.assetsByTier.forEach((assets) => {
        assets.bodyMaterial.dispose();
        assets.headMaterial.dispose();
        assets.eyeMaterial.dispose();
        assets.boneMaterial.dispose();
      });
      this.assetsByTier.clear();
    }
  }

  update(deltaTime, paused = false) {
    this.updateLootEffects(deltaTime);

    if (paused) {
      return;
    }

    if (!this.options.localZombies) {
      return;
    }

    if (this.world.isCityWorld(this.player.position.x, this.player.position.z)) {
      this.updateCityHorde(deltaTime);
      this.updateExistingZombies(deltaTime);
      return;
    }

    this.spawnTimer -= deltaTime;

    if (this.spawnTimer <= 0) {
      this.spawnTimer = GAMEPLAY.zombie.spawnInterval / Math.max(0.1, Number(this.options.zombieSpawnRate) / 100);
      this.trySpawn();
    }

    this.updateExistingZombies(deltaTime);
  }

  updateExistingZombies(deltaTime) {
    for (let index = this.zombies.length - 1; index >= 0; index -= 1) {
      const zombie = this.zombies[index];
      const distanceFromPlayer = horizontalDistance(zombie.position, this.player.position);

      if (distanceFromPlayer > GAMEPLAY.zombie.simulationRadius) {
        this.removeZombieAt(index);
        continue;
      }

      const tower = zombie.aggroTowerId
        ? this.towerSystem?.getTowerById(zombie.aggroTowerId)
        : null;
      const target = tower?.position ?? this.player.position;
      const distance = zombie.update(deltaTime, target, this.world, tower ? 0.74 : 0.68);

      if (!tower && distance <= 0.72 && zombie.canAttack()) {
        this.attackPlayer(zombie);
      }
    }
  }

  updateCityHorde(deltaTime) {
    this.cityHordeTimer -= deltaTime;

    if (!this.cityHordeWarningIssued && this.cityHordeTimer <= 10) {
      this.cityHordeWarningIssued = true;
      this.eventBus.emit('city:horde-warning', { seconds: 10 });
    }

    if (this.cityHordeTimer > 0) {
      return;
    }

    const count = 8 + Math.floor(Math.min(8, this.inventory.get('experience') / 1000));
    let spawned = 0;

    for (let index = 0; index < count; index += 1) {
      spawned += Number(this.trySpawnCityHorde(index));
    }

    this.cityHordeTimer = 72;
    this.cityHordeWarningIssued = false;
    this.eventBus.emit('city:horde-started', { count: spawned });
  }

  trySpawnCityHorde(offset = 0) {
    const maxActive = Math.max(0, Math.round(GAMEPLAY.zombie.maxActive * Number(this.options.zombieMaxActive) / 100));

    if (this.zombies.length >= maxActive || this.player.isDead) {
      return false;
    }

    const serial = this.spawnSerial++;
    const gates = [
      { x: 0, z: -38, spreadX: 12, spreadZ: 4 },
      { x: 0, z: 38, spreadX: 12, spreadZ: 4 },
      { x: -38, z: 0, spreadX: 4, spreadZ: 12 },
      { x: 38, z: 0, spreadX: 4, spreadZ: 12 }
    ];
    const gate = gates[Math.floor(hash2D(serial + offset, 59, WORLD.seed + 1451) * gates.length)];
    const x = this.player.position.x + gate.x + (hash2D(serial, 61, WORLD.seed + 1457) - 0.5) * gate.spreadX;
    const z = this.player.position.z + gate.z + (hash2D(serial, 67, WORLD.seed + 1463) - 0.5) * gate.spreadZ;

    if (!this.world.isWalkableWorld(x, z) || this.towerSystem?.isInsideSafeZone(x, z)) {
      return false;
    }

    const tier = Math.max(1, Math.floor(Math.hypot(x, z) / GAMEPLAY.zombie.threatTierDistance));
    const spawnPoint = new THREE.Vector3(x, this.world.getHeightAtWorld(x, z), z);
    const zombie = new Zombie(`z${serial}`, spawnPoint, this.createStats(tier), this.getAssets(tier));
    zombie.group.name = `CityHordeZombie-${zombie.id}`;
    this.zombies.push(zombie);
    this.group.add(zombie.group);
    this.eventBus.emit('zombie:spawned', { id: zombie.id, tier, cityHorde: true });
    return true;
  }

  trySpawn(forceCityHorde = false) {
    const maxActive = Math.max(0, Math.round(GAMEPLAY.zombie.maxActive * Number(this.options.zombieMaxActive) / 100));

    if (this.zombies.length >= maxActive || this.player.isDead) {
      return false;
    }

    const serial = this.spawnSerial++;
    const angle = hash2D(serial, 17, WORLD.seed + 1409) * Math.PI * 2;
    const radius = GAMEPLAY.zombie.spawnMinRadius +
      hash2D(serial, 29, WORLD.seed + 1423) *
        (GAMEPLAY.zombie.spawnMaxRadius - GAMEPLAY.zombie.spawnMinRadius);
    const x = this.player.position.x + Math.cos(angle) * radius;
    const z = this.player.position.z + Math.sin(angle) * radius;

    if (!forceCityHorde && this.world.isCityWorld(x, z)) {
      return false;
    }

    if (!this.world.isWalkableWorld(x, z) || this.towerSystem?.isInsideSafeZone(x, z)) {
      return false;
    }

    const distanceFromOrigin = Math.hypot(x, z);
    const tier = Math.floor(distanceFromOrigin / GAMEPLAY.zombie.threatTierDistance);
    const stats = this.createStats(tier);
    const spawnPoint = new THREE.Vector3(x, this.world.getHeightAtWorld(x, z), z);
    const zombie = new Zombie(`z${serial}`, spawnPoint, stats, this.getAssets(tier));
    this.zombies.push(zombie);
    this.group.add(zombie.group);
    this.eventBus.emit('zombie:spawned', { id: zombie.id, tier });
    return true;
  }

  createStats(tier) {
    const power = Math.max(0.25, Number(this.options.zombiePower) / 100);

    return {
      tier,
      maxHealth: Math.round(GAMEPLAY.zombie.baseHealth * (1 + tier * 0.25) * power),
      damage: Math.round(GAMEPLAY.zombie.baseDamage * (1 + tier * 0.15) * power),
      speed: GAMEPLAY.zombie.baseSpeed * (1 + Math.min(0.55, tier * 0.06)) * Math.max(0.45, power),
      attackInterval: GAMEPLAY.zombie.attackInterval
    };
  }

  attackPlayer(zombie) {
    const healthBefore = this.player.health;
    const damage = this.player.takeDamage(zombie.stats.damage);
    zombie.markAttack();

    if (damage <= 0) {
      return;
    }

    this.audio.playGameEffect('playerHit');
    this.eventBus.emit('player:damaged', {
      amount: damage,
      health: this.player.health,
      maxHealth: this.player.maxHealth,
      source: zombie.id
    });

    if (
      healthBefore > GAMEPLAY.player.criticalHealth &&
      this.player.health <= GAMEPLAY.player.criticalHealth
    ) {
      this.audio.play('warning');
    }

    if (this.player.isDead) {
      this.eventBus.emit('player:died', { source: zombie.id });
    }
  }

  getRayTarget(origin, direction, maxRange, radius = 0.38) {
    let target = null;
    let nearestDistance = maxRange;

    this.zombies.forEach((zombie) => {
      DIRECTION.set(zombie.position.x - origin.x, 0, zombie.position.z - origin.z);
      const along = DIRECTION.dot(direction);

      if (along < 0 || along > nearestDistance) {
        return;
      }

      const perpendicularSquared = Math.max(0, DIRECTION.lengthSq() - along * along);

      if (perpendicularSquared <= radius * radius) {
        target = zombie;
        nearestDistance = along;
      }
    });

    return target ? { zombie: target, distance: nearestDistance } : null;
  }

  findNearest(position, range) {
    let nearest = null;
    let nearestDistance = range;

    this.zombies.forEach((zombie) => {
      const distance = horizontalDistance(position, zombie.position);

      if (distance <= nearestDistance) {
        nearest = zombie;
        nearestDistance = distance;
      }
    });

    return nearest;
  }

  damageZombie(zombie, amount, source = 'player') {
    if (!zombie || zombie.isDead) {
      return { damage: 0, killed: false };
    }

    const towerId = source.startsWith('tower:') ? source.slice(6) : null;
    const result = zombie.takeDamage(amount, towerId);
    this.audio.playGameEffect('zombieHit');
    this.eventBus.emit('zombie:damaged', {
      id: zombie.id,
      amount: result.damage,
      health: zombie.health,
      maxHealth: zombie.stats.maxHealth,
      source
    });

    if (result.killed) {
      this.killZombie(zombie, source);
    }

    return result;
  }

  killZombie(zombie, source) {
    const index = this.zombies.indexOf(zombie);

    if (index === -1) {
      return;
    }

    const deathPosition = zombie.position.clone();
    const loot = this.rollLoot(zombie);
    Object.entries(loot).forEach(([resource, amount]) => {
      if (amount > 0) {
        this.inventory.add(resource, amount, 'zombie-loot');
        this.spawnLootEffect(resource, deathPosition);
      }
    });

    if (Object.keys(loot).length > 0) {
      this.audio.play('reward', { cooldownMs: 120 });
      this.eventBus.emit('loot:collected', { loot, position: deathPosition });
    }

    this.eventBus.emit('zombie:killed', {
      id: zombie.id,
      tier: zombie.stats.tier,
      source,
      loot
    });
    this.removeZombieAt(index);
  }

  rollLoot(zombie) {
    const serial = Number(zombie.id.slice(1)) || 0;
    const tier = zombie.stats.tier;
    const loot = {};
    const ammoRoll = hash2D(serial, tier + 1, WORLD.seed + 1501);
    const woodRoll = hash2D(serial, tier + 2, WORLD.seed + 1511);
    const stoneRoll = hash2D(serial, tier + 3, WORLD.seed + 1523);
    const artifactRoll = hash2D(serial, tier + 4, WORLD.seed + 1531);

    if (ammoRoll > 0.65) {
      loot.ammoReserve = 1 + Math.floor(ammoRoll * 3);
    }
    if (woodRoll > 0.82) {
      loot.wood = 1;
    }
    if (stoneRoll > 0.86) {
      loot.stone = 1;
    }
    if (artifactRoll > Math.max(0.88, 0.98 - tier * 0.02)) {
      loot.artifact = 1;
    }

    const multiplier = Math.max(0, Number(this.options.lootMultiplier) / 100);
    Object.keys(loot).forEach((resource) => {
      loot[resource] = Math.max(0, Math.round(loot[resource] * multiplier));
      if (loot[resource] <= 0) {
        delete loot[resource];
      }
    });

    return loot;
  }

  spawnLootEffect(resource, position) {
    const colors = {
      ammoReserve: 0xe4cd72,
      wood: 0xc18b55,
      stone: 0xbac3ba,
      artifact: 0x52e0c7
    };

    if (!this.lootMaterials.has(resource)) {
      this.lootMaterials.set(resource, new THREE.MeshBasicMaterial({
        color: colors[resource],
        toneMapped: false
      }));
    }

    const mesh = new THREE.Mesh(this.lootGeometry, this.lootMaterials.get(resource));
    mesh.position.copy(position).add(new THREE.Vector3(0, 0.55, 0));
    this.group.add(mesh);
    this.lootEffects.push({ mesh, elapsed: 0, duration: 0.58 });
  }

  updateLootEffects(deltaTime) {
    for (let index = this.lootEffects.length - 1; index >= 0; index -= 1) {
      const effect = this.lootEffects[index];
      effect.elapsed += deltaTime;
      const alpha = Math.min(1, effect.elapsed / effect.duration);
      effect.mesh.position.lerp(this.player.position, 0.12 + alpha * 0.18);
      effect.mesh.rotation.y += deltaTime * 8;
      effect.mesh.scale.setScalar(1 - alpha * 0.7);

      if (alpha >= 1) {
        effect.mesh.removeFromParent();
        this.lootEffects.splice(index, 1);
      }
    }
  }

  removeNear(position, radius) {
    for (let index = this.zombies.length - 1; index >= 0; index -= 1) {
      if (horizontalDistance(this.zombies[index].position, position) <= radius) {
        this.removeZombieAt(index);
      }
    }
  }

  removeZombieAt(index) {
    const [zombie] = this.zombies.splice(index, 1);
    zombie?.dispose();
  }

  getAssets(tier) {
    const visualTier = Math.min(5, tier);

    if (this.assetsByTier.has(visualTier)) {
      return this.assetsByTier.get(visualTier);
    }

    const fear = Math.max(0, Math.min(1.6, Number(this.options.zombieFearVisuals) / 100));
    const base = COLOR.setHSL(0.29 - visualTier * 0.026 - fear * 0.035, 0.34 + visualTier * 0.06 + fear * 0.18, 0.34 - visualTier * 0.018 - fear * 0.08).getHex();
    const head = COLOR.setHex(base).offsetHSL(0.02, 0.04, 0.08).getHex();
    const eye = COLOR.setHSL(0.04 - visualTier * 0.008, 1, 0.58 + visualTier * 0.035).getHex();
    const assets = {
      ...this.sharedGeometries,
      ...this.sharedMaterials,
      bodyMaterial: new THREE.MeshStandardMaterial({
        color: base,
        roughness: 0.9,
        flatShading: true
      }),
      headMaterial: new THREE.MeshStandardMaterial({
        color: head,
        roughness: 0.88,
        flatShading: true
      }),
      eyeMaterial: new THREE.MeshBasicMaterial({ color: fear > 1.05 ? 0xff2e1d : eye, toneMapped: false }),
      boneMaterial: new THREE.MeshStandardMaterial({
        color: visualTier >= 4 ? 0x4d1f22 : 0xd8d2a4,
        roughness: 0.82,
        flatShading: true
      })
    };
    this.assetsByTier.set(visualTier, assets);
    return assets;
  }

  createSharedGeometries() {
    return {
      limbGeometry: new THREE.BoxGeometry(0.18, 0.36, 0.2),
      bodyGeometry: new THREE.BoxGeometry(0.5, 0.48, 0.34),
      headGeometry: new THREE.BoxGeometry(0.36, 0.34, 0.34),
      armGeometry: new THREE.BoxGeometry(0.16, 0.42, 0.16),
      eyeGeometry: new THREE.BoxGeometry(0.065, 0.065, 0.04),
      healthGeometry: new THREE.BoxGeometry(0.52, 0.055, 0.035),
      spikeGeometry: new THREE.BoxGeometry(0.12, 0.2, 0.12),
      jawGeometry: new THREE.BoxGeometry(0.3, 0.08, 0.08),
      spineGeometry: new THREE.BoxGeometry(0.09, 0.2, 0.09)
    };
  }

  createSharedMaterials() {
    return {
      darkMaterial: new THREE.MeshStandardMaterial({ color: 0x27302b, roughness: 0.94 }),
      eyeMaterial: new THREE.MeshBasicMaterial({ color: 0xf36a45, toneMapped: false }),
      healthMaterial: new THREE.MeshBasicMaterial({ color: 0xdc5f49, toneMapped: false }),
      healthBackMaterial: new THREE.MeshBasicMaterial({ color: 0x171512, toneMapped: false })
    };
  }

  dispose() {
    while (this.zombies.length > 0) {
      this.removeZombieAt(this.zombies.length - 1);
    }
    this.lootEffects.forEach(({ mesh }) => mesh.removeFromParent());
    this.lootEffects.length = 0;
    Object.values(this.sharedGeometries).forEach((geometry) => geometry.dispose());
    Object.values(this.sharedMaterials).forEach((material) => material.dispose());
    this.assetsByTier.forEach((assets) => {
      assets.bodyMaterial.dispose();
      assets.headMaterial.dispose();
      assets.eyeMaterial.dispose();
      assets.boneMaterial.dispose();
    });
    this.assetsByTier.clear();
    this.lootGeometry.dispose();
    this.lootMaterials.forEach((material) => material.dispose());
    this.lootMaterials.clear();
    this.group.clear();
  }
}

function horizontalDistance(a, b) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}
