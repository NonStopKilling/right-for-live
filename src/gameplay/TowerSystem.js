import * as THREE from 'three';
import { DEFAULT_LAB_OPTIONS } from '../config/gameOptions.js';
import { GAMEPLAY } from '../config/gameplay.js';
import { Tower } from '../entities/Tower.js';
import { WORLD } from '../utils/constants.js';

const PREVIEW_COLOR = new THREE.Color();
const TELEPORT_COST = Object.freeze({ artifact: 20 });

export class TowerSystem {
  constructor(world, player, inventory, eventBus, audio, profile, savedTowers = [], activeId = null) {
    this.world = world;
    this.player = player;
    this.inventory = inventory;
    this.eventBus = eventBus;
    this.audio = audio;
    this.profile = profile;
    this.options = structuredClone(DEFAULT_LAB_OPTIONS);
    this.group = new THREE.Group();
    this.group.name = 'SignalRefuges';
    this.towers = [];
    this.towerSerial = 0;
    this.activeCheckpointId = activeId;
    this.buildMode = false;
    this.previewValid = false;
    this.previewReason = null;
    this.previewPoint = null;
    this.assets = this.createAssets();
    this.preview = this.createPreview();
    this.tracers = [];
    this.unsubscribeKilled = this.eventBus.on('zombie:killed', (event) => this.handleZombieKilled(event));

    savedTowers.forEach((data) => this.restoreTower(data));

    if (!this.getTowerById(this.activeCheckpointId)) {
      this.activeCheckpointId = this.towers.at(-1)?.id ?? null;
    }
  }

  addTo(scene) {
    scene.add(this.group);
  }

  applyOptions(options = {}) {
    this.options = { ...this.options, ...options };
  }

  update(deltaTime, input, aimPoint, zombieSystem, paused = false) {
    this.updateTracers(deltaTime);
    this.towers.forEach((tower) => {
      tower.update(deltaTime);

      if (!paused && this.options.towerAutofire) {
        this.updateTowerCombat(tower, zombieSystem);
      }
    });

    if (paused) {
      this.preview.visible = false;
      return false;
    }

    if (input.consumeCancel() && this.buildMode) {
      this.setBuildMode(false);
    }

    if (input.consumeBuildToggle()) {
      this.setBuildMode(!this.buildMode);
    }

    if (!this.buildMode) {
      this.preview.visible = false;
      return false;
    }

    this.updatePreview(aimPoint);

    if (input.consumePrimaryAction()) {
      this.confirmPlacement();
      return true;
    }

    return false;
  }

  setBuildMode(enabled) {
    if (enabled && this.towers.length >= GAMEPLAY.tower.maxCount) {
      this.audio.play('blocked');
      this.eventBus.emit('tower:placement-blocked', { reason: 'max-towers' });
      return;
    }

    this.buildMode = Boolean(enabled);
    this.preview.visible = this.buildMode;
    this.audio.play(this.buildMode ? 'open' : 'close');
    this.eventBus.emit('tower:build-mode', { enabled: this.buildMode });
  }

  cancelBuildMode() {
    if (this.buildMode) {
      this.setBuildMode(false);
      return true;
    }

    return false;
  }

  updatePreview(aimPoint) {
    this.previewPoint = aimPoint ? this.snapPoint(aimPoint) : null;
    const validation = this.validatePlacement(this.previewPoint);
    this.previewValid = validation.valid;
    this.previewReason = validation.reason;

    if (this.previewPoint) {
      this.preview.position.copy(this.previewPoint);
      PREVIEW_COLOR.setHex(this.previewValid ? 0x7edc8b : 0xe0644f);
      this.preview.traverse((object) => {
        if (object.isMesh && object.material === this.assets.previewMaterial) {
          object.material.color.copy(PREVIEW_COLOR);
        }
      });
    }

    this.preview.visible = Boolean(this.previewPoint);
    this.eventBus.emit('tower:preview', {
      active: this.buildMode,
      valid: this.previewValid,
      reason: this.previewReason,
      cost: GAMEPLAY.tower.cost
    });
  }

  confirmPlacement() {
    const validation = this.validatePlacement(this.previewPoint);

    if (!validation.valid) {
      this.audio.play('blocked', { cooldownMs: 180 });
      this.eventBus.emit('tower:placement-blocked', { reason: validation.reason });
      return false;
    }

    if (!this.inventory.spend(GAMEPLAY.tower.cost, 'tower-build')) {
      this.audio.play('blocked');
      this.eventBus.emit('tower:placement-blocked', { reason: 'resources' });
      return false;
    }

    const tower = this.createTower({
      id: `t${Date.now().toString(36)}-${this.towerSerial++}`,
      x: this.previewPoint.x,
      z: this.previewPoint.z,
      level: 1,
      kills: 0
    }, true);
    this.activeCheckpointId = tower.id;
    this.audio.play('checkpoint');
    this.eventBus.emit('tower:built', {
      tower: tower.snapshot(),
      checkpointId: this.activeCheckpointId
    });
    this.setBuildMode(false);
    return true;
  }

  validatePlacement(point) {
    if (!point) {
      return { valid: false, reason: 'aim' };
    }

    const citySurface = this.world.city?.getBuildSurfaceAtWorld?.(point.x, point.z) ?? null;

    if (horizontalDistance(point, this.player.position) > GAMEPLAY.tower.placementRange && citySurface?.kind !== 'roof') {
      return { valid: false, reason: 'range' };
    }

    if (!this.inventory.canAfford(GAMEPLAY.tower.cost)) {
      return { valid: false, reason: 'resources' };
    }

    if (this.towers.some((tower) => horizontalDistance(point, tower.position) < 2.1)) {
      return { valid: false, reason: 'overlap' };
    }

    const { gx, gz } = this.world.terrain.worldToGrid(point.x, point.z);
    if (citySurface?.kind === 'roof') {
      return { valid: true, reason: null };
    }

    const centerLevel = this.world.terrain.getCell(gx, gz).level;
    const neighbors = [
      this.world.terrain.getCell(gx + 1, gz).level,
      this.world.terrain.getCell(gx - 1, gz).level,
      this.world.terrain.getCell(gx, gz + 1).level,
      this.world.terrain.getCell(gx, gz - 1).level
    ];

    if (neighbors.some((level) => Math.abs(level - centerLevel) > 1)) {
      return { valid: false, reason: 'slope' };
    }

    if (this.world.terrain.isWaterGrid?.(gx, gz)) {
      return { valid: false, reason: 'water' };
    }

    return { valid: true, reason: null };
  }

  snapPoint(point) {
    const { gx, gz } = this.world.terrain.worldToGrid(point.x, point.z);
    const { x, z } = this.world.terrain.gridToWorld(gx, gz);
    return new THREE.Vector3(x, this.world.getBuildHeightAtWorld?.(x, z) ?? this.world.getHeightAtWorld(x, z), z);
  }

  updateTowerCombat(tower, zombieSystem) {
    if (!tower.canFire()) {
      return;
    }

    const definition = GAMEPLAY.tower.levels[tower.level - 1];
    const zombie = this.findTowerTarget(tower, zombieSystem, definition.range);

    if (!zombie) {
      return;
    }

    tower.aimAt(zombie.position);
    tower.markShot(definition.fireInterval);
    this.spawnTracer(tower, zombie);
    this.audio.playGameEffect('tower');
    zombieSystem.damageZombie(zombie, definition.damage, `tower:${tower.id}`);
    this.eventBus.emit('tower:fired', { towerId: tower.id, zombieId: zombie.id });
  }

  findTowerTarget(tower, zombieSystem, range) {
    if (!Array.isArray(zombieSystem.zombies)) {
      return zombieSystem.findNearest(tower.position, range);
    }

    const candidates = zombieSystem.zombies;
    let nearest = null;
    let nearestDistance = range;

    candidates.forEach((zombie) => {
      if (!zombie || zombie.isDead) {
        return;
      }

      const distance = horizontalDistance(tower.position, zombie.position);
      if (distance > nearestDistance || this.world.city?.isSightBlockedWorld?.(tower.position, zombie.position)) {
        return;
      }

      nearest = zombie;
      nearestDistance = distance;
    });

    return nearest;
  }

  handleZombieKilled(event) {
    if (!event.source?.startsWith('tower:')) {
      return;
    }

    const tower = this.getTowerById(event.source.slice(6));

    if (!tower) {
      return;
    }

    const leveled = tower.addKill(GAMEPLAY.tower.levels);
    const experience = GAMEPLAY.zombie.towerKillExperience + (event.tier ?? 0);
    this.inventory.add('experience', experience, 'tower-kill');
    this.eventBus.emit('tower:progress', { tower: tower.snapshot(), leveled });
    this.eventBus.emit('player:experience', { amount: experience, source: 'tower-kill' });

    if (leveled) {
      this.audio.play('level-up');
      this.eventBus.emit('tower:leveled', { tower: tower.snapshot() });
    }
  }

  spawnTracer(tower, zombie) {
    const start = tower.position.clone().add(new THREE.Vector3(0, 1.48, 0));
    const end = zombie.position.clone().add(new THREE.Vector3(0, 0.62, 0));
    const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
    const material = new THREE.LineBasicMaterial({
      color: 0x72e7cf,
      transparent: true,
      opacity: 1,
      depthTest: false,
      toneMapped: false
    });
    const line = new THREE.Line(geometry, material);
    line.renderOrder = 8;
    this.group.add(line);
    this.tracers.push({ line, elapsed: 0, duration: 0.11 });
  }

  updateTracers(deltaTime) {
    for (let index = this.tracers.length - 1; index >= 0; index -= 1) {
      const tracer = this.tracers[index];
      tracer.elapsed += deltaTime;
      tracer.line.material.opacity = Math.max(0, 1 - tracer.elapsed / tracer.duration);

      if (tracer.elapsed >= tracer.duration) {
        tracer.line.geometry.dispose();
        tracer.line.material.dispose();
        tracer.line.removeFromParent();
        this.tracers.splice(index, 1);
      }
    }
  }

  createTower(data, animateConstruction) {
    const tower = new Tower(data, this.world, this.assets, animateConstruction);
    this.towers.push(tower);
    this.group.add(tower.group);
    return tower;
  }

  restoreTower(data) {
    const tower = this.createTower(data, false);
    const serial = Number.parseInt(data.id?.replace(/\D/g, ''), 10);
    this.towerSerial = Math.max(this.towerSerial, Number.isFinite(serial) ? serial + 1 : 0);
    return tower;
  }

  getTowerById(id) {
    return this.towers.find((tower) => tower.id === id) ?? null;
  }

  getActiveTower() {
    return this.getTowerById(this.activeCheckpointId);
  }

  dismantleTower(id) {
    const index = this.towers.findIndex((tower) => tower.id === id);

    if (index === -1) {
      return false;
    }

    const [tower] = this.towers.splice(index, 1);
    const wasActive = tower.id === this.activeCheckpointId;
    const snapshot = tower.snapshot();
    tower.dispose();

    if (wasActive) {
      this.activeCheckpointId = this.towers.at(-1)?.id ?? null;
    }

    const refund = {
      wood: Math.floor(GAMEPLAY.tower.cost.wood * 0.5),
      stone: Math.floor(GAMEPLAY.tower.cost.stone * 0.5)
    };
    Object.entries(refund).forEach(([resource, amount]) => this.inventory.add(resource, amount, 'tower-dismantle'));
    this.audio.play('close');
    this.eventBus.emit('tower:dismantled', {
      tower: snapshot,
      refund,
      activeCheckpointId: this.activeCheckpointId
    });
    return true;
  }

  teleportTower(id, targetPoint = null) {
    const tower = this.getTowerById(id);
    const point = this.snapPoint(targetPoint ?? this.player.position);
    const validation = this.validateTeleport(point, tower);

    if (!validation.valid) {
      this.audio.play('blocked');
      this.eventBus.emit('tower:placement-blocked', { reason: validation.reason });
      return false;
    }

    if (!this.inventory.spend(TELEPORT_COST, 'tower-teleport')) {
      this.audio.play('blocked');
      this.eventBus.emit('tower:placement-blocked', { reason: 'teleport-cost' });
      return false;
    }

    tower.position.set(point.x, point.y, point.z);
    this.activeCheckpointId = tower.id;
    this.audio.play('checkpoint');
    this.eventBus.emit('tower:teleported', {
      tower: tower.snapshot(),
      cost: TELEPORT_COST,
      activeCheckpointId: this.activeCheckpointId
    });
    return true;
  }

  validateTeleport(point, tower) {
    if (!tower || !point) {
      return { valid: false, reason: 'aim' };
    }

    const citySurface = this.world.city?.getBuildSurfaceAtWorld?.(point.x, point.z) ?? null;

    if (!this.world.isWalkableWorld(point.x, point.z) && citySurface?.kind !== 'roof') {
      return { valid: false, reason: 'slope' };
    }

    const { gx, gz } = this.world.terrain.worldToGrid(point.x, point.z);

    if (this.world.terrain.isWaterGrid?.(gx, gz)) {
      return { valid: false, reason: 'water' };
    }

    if (this.towers.some((candidate) => candidate.id !== tower.id && horizontalDistance(point, candidate.position) < 2.1)) {
      return { valid: false, reason: 'overlap' };
    }

    return { valid: true, reason: null };
  }

  getRespawnPoint() {
    const tower = this.getActiveTower();
    const point = tower ? tower.position.clone().add(new THREE.Vector3(0.8, 0, 0.8)) : this.world.getSpawnPoint();
    if (this.world.options?.mapMode === 'island') {
      if (!this.world.isWalkableWorld(point.x, point.z)) return this.world.getSpawnPoint();
      point.y = this.world.getHeightAtWorld(point.x, point.z);
    }
    return point;
  }

  isInsideSafeZone(x, z) {
    return this.towers.some((tower) =>
      Math.hypot(x - tower.position.x, z - tower.position.z) <= GAMEPLAY.tower.safeRadius
    );
  }

  snapshot() {
    return {
      towers: this.towers.map((tower) => tower.snapshot()),
      activeCheckpointId: this.activeCheckpointId
    };
  }

  getBuildSnapshot() {
    return {
      active: this.buildMode,
      valid: this.previewValid,
      reason: this.previewReason,
      cost: GAMEPLAY.tower.cost
    };
  }

  getActiveSnapshot() {
    const tower = this.getActiveTower();

    if (!tower) {
      return null;
    }

    const definition = GAMEPLAY.tower.levels[tower.level - 1];
    const nextDefinition = GAMEPLAY.tower.levels[tower.level] ?? null;
    return {
      ...tower.snapshot(),
      number: this.towers.indexOf(tower) + 1,
      damage: definition.damage,
      nextLevelKills: nextDefinition?.kills ?? definition.kills
    };
  }

  getListSnapshot() {
    return this.towers.map((tower, index) => {
      const definition = GAMEPLAY.tower.levels[tower.level - 1];
      const nextDefinition = GAMEPLAY.tower.levels[tower.level] ?? null;
      return {
        ...tower.snapshot(),
        number: index + 1,
        active: tower.id === this.activeCheckpointId,
        damage: definition.damage,
        nextLevelKills: nextDefinition?.kills ?? definition.kills,
        teleportCost: TELEPORT_COST
      };
    });
  }

  createAssets() {
    return {
      baseGeometry: new THREE.BoxGeometry(0.92, 0.26, 0.92),
      capGeometry: new THREE.BoxGeometry(0.72, 0.12, 0.72),
      postGeometry: new THREE.BoxGeometry(0.3, 0.92, 0.3),
      platformGeometry: new THREE.BoxGeometry(0.92, 0.16, 0.92),
      headGeometry: new THREE.BoxGeometry(0.56, 0.34, 0.5),
      barrelGeometry: new THREE.BoxGeometry(0.12, 0.12, 0.55),
      emitterGeometry: new THREE.BoxGeometry(0.18, 0.18, 0.12),
      ringGeometry: new THREE.RingGeometry(5.35, 5.5, 64),
      stoneMaterial: new THREE.MeshStandardMaterial({ color: 0x77766d, roughness: 0.86 }),
      metalMaterial: new THREE.MeshStandardMaterial({ color: 0x4f716d, roughness: 0.63, metalness: 0.2 }),
      woodMaterial: new THREE.MeshStandardMaterial({ color: 0x765235, roughness: 0.92 }),
      darkMaterial: new THREE.MeshStandardMaterial({ color: 0x1e2a29, roughness: 0.74, metalness: 0.25 }),
      emitterMaterial: new THREE.MeshBasicMaterial({ color: 0x8df3d2, toneMapped: false }),
      ringMaterial: new THREE.MeshBasicMaterial({
        color: 0x64c9a8,
        transparent: true,
        opacity: 0.28,
        depthWrite: false,
        toneMapped: false,
        side: THREE.DoubleSide
      }),
      levelMaterials: [0x6d9071, 0xd1b959, 0xe88d5d].map((color) =>
        new THREE.MeshStandardMaterial({ color, roughness: 0.68, metalness: 0.08 })
      ),
      previewMaterial: new THREE.MeshBasicMaterial({
        color: 0x7edc8b,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
        toneMapped: false
      })
    };
  }

  createPreview() {
    const group = new THREE.Group();
    group.name = 'TowerPlacementPreview';
    const base = new THREE.Mesh(this.assets.baseGeometry, this.assets.previewMaterial);
    base.position.y = 0.13;
    const post = new THREE.Mesh(this.assets.postGeometry, this.assets.previewMaterial);
    post.position.y = 0.72;
    const top = new THREE.Mesh(this.assets.platformGeometry, this.assets.previewMaterial);
    top.position.y = 1.24;
    group.add(base, post, top);
    group.visible = false;
    this.group.add(group);
    return group;
  }

  dispose() {
    this.unsubscribeKilled();
    this.towers.forEach((tower) => tower.dispose());
    this.towers.length = 0;
    this.tracers.forEach(({ line }) => {
      line.geometry.dispose();
      line.material.dispose();
      line.removeFromParent();
    });
    this.tracers.length = 0;

    Object.entries(this.assets).forEach(([key, value]) => {
      if (key === 'levelMaterials') {
        value.forEach((material) => material.dispose());
      } else if (value?.dispose) {
        value.dispose();
      }
    });
    this.group.clear();
  }
}

function horizontalDistance(a, b) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}
