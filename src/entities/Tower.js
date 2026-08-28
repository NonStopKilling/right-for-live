import * as THREE from 'three';

export class Tower {
  constructor(data, world, assets, animateConstruction = false) {
    this.id = data.id;
    this.world = world;
    this.assets = assets;
    this.level = data.level ?? 1;
    this.kills = data.kills ?? 0;
    this.cooldown = 0;
    this.constructionProgress = animateConstruction ? 0 : 1;
    this.group = new THREE.Group();
    this.group.name = `SignalRefuge-${this.id}`;
    this.group.position.set(data.x, world.getBuildHeightAtWorld?.(data.x, data.z) ?? world.getHeightAtWorld(data.x, data.z), data.z);
    this.position = this.group.position;
    this.createMesh();
    this.applyLevel(this.level);
    this.updateConstructionScale();
  }

  createMesh() {
    const base = new THREE.Mesh(this.assets.baseGeometry, this.assets.stoneMaterial);
    base.position.y = 0.13;

    const baseCap = new THREE.Mesh(this.assets.capGeometry, this.assets.metalMaterial);
    baseCap.position.y = 0.3;

    const post = new THREE.Mesh(this.assets.postGeometry, this.assets.woodMaterial);
    post.position.y = 0.77;

    const platform = new THREE.Mesh(this.assets.platformGeometry, this.assets.metalMaterial);
    platform.position.y = 1.28;

    this.turret = new THREE.Group();
    this.turret.position.y = 1.48;
    this.turretHead = new THREE.Mesh(this.assets.headGeometry, this.assets.levelMaterials[0]);
    const barrel = new THREE.Mesh(this.assets.barrelGeometry, this.assets.darkMaterial);
    barrel.position.set(0, 0, 0.3);
    this.emitter = new THREE.Mesh(this.assets.emitterGeometry, this.assets.emitterMaterial);
    this.emitter.position.set(0, 0, 0.51);
    this.turret.add(this.turretHead, barrel, this.emitter);

    this.safeRing = new THREE.Mesh(this.assets.ringGeometry, this.assets.ringMaterial);
    this.safeRing.rotation.x = -Math.PI / 2;
    this.safeRing.position.y = 0.035;
    this.safeRing.renderOrder = 1;

    [base, baseCap, post, platform, this.turretHead, barrel].forEach((mesh) => {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    });

    this.group.add(this.safeRing, base, baseCap, post, platform, this.turret);
  }

  update(deltaTime) {
    this.cooldown = Math.max(0, this.cooldown - deltaTime);

    if (this.constructionProgress < 1) {
      this.constructionProgress = Math.min(1, this.constructionProgress + deltaTime / 1.05);
      this.updateConstructionScale();
    }

    this.emitter.rotation.z += deltaTime * (2 + this.level);
  }

  updateConstructionScale() {
    const eased = 1 - Math.pow(1 - this.constructionProgress, 3);
    this.group.scale.set(1, Math.max(0.05, eased), 1);
  }

  aimAt(position) {
    const dx = position.x - this.position.x;
    const dz = position.z - this.position.z;
    this.turret.rotation.y = Math.atan2(dx, dz);
  }

  markShot(interval) {
    this.cooldown = interval;
    this.emitter.scale.setScalar(1.5);
  }

  canFire() {
    this.emitter.scale.x += (1 - this.emitter.scale.x) * 0.22;
    this.emitter.scale.y += (1 - this.emitter.scale.y) * 0.22;
    this.emitter.scale.z += (1 - this.emitter.scale.z) * 0.22;
    return this.constructionProgress >= 1 && this.cooldown <= 0;
  }

  addKill(levels) {
    this.kills += 1;
    let nextLevel = 1;

    levels.forEach((definition) => {
      if (this.kills >= definition.kills) {
        nextLevel = definition.level;
      }
    });

    const leveled = nextLevel !== this.level;

    if (leveled) {
      this.applyLevel(nextLevel);
    }

    return leveled;
  }

  applyLevel(level) {
    this.level = level;
    this.turretHead.material = this.assets.levelMaterials[level - 1];
    this.turretHead.scale.setScalar(1 + (level - 1) * 0.13);
  }

  snapshot() {
    return {
      id: this.id,
      x: this.position.x,
      z: this.position.z,
      level: this.level,
      kills: this.kills
    };
  }

  dispose() {
    this.group.removeFromParent();
    this.group.clear();
  }
}
