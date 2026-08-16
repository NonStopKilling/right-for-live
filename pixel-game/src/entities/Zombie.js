import * as THREE from 'three';
import { damping } from '../utils/constants.js';

const DIRECTION = new THREE.Vector3();

export class Zombie {
  constructor(id, spawnPoint, stats, assets) {
    this.id = id;
    this.stats = stats;
    this.health = stats.maxHealth;
    this.group = new THREE.Group();
    this.group.name = `Zombie-${id}`;
    this.group.position.copy(spawnPoint);
    this.position = this.group.position;
    this.attackCooldown = 0;
    this.walkTime = 0;
    this.hitFlash = 0;
    this.aggroTowerId = null;
    this.isDead = false;
    this.createMesh(assets);
  }

  createMesh(assets) {
    this.leftLeg = new THREE.Mesh(assets.limbGeometry, assets.darkMaterial);
    this.leftLeg.position.set(-0.13, 0.18, 0);
    this.rightLeg = this.leftLeg.clone();
    this.rightLeg.position.x = 0.13;

    this.body = new THREE.Mesh(assets.bodyGeometry, assets.bodyMaterial);
    this.body.position.y = 0.56;

    this.head = new THREE.Mesh(assets.headGeometry, assets.headMaterial);
    this.head.position.set(0, 0.93, 0.02);

    this.leftArm = new THREE.Mesh(assets.armGeometry, assets.bodyMaterial);
    this.leftArm.position.set(-0.34, 0.61, 0.17);
    this.leftArm.rotation.x = -0.72;
    this.rightArm = this.leftArm.clone();
    this.rightArm.position.x = 0.34;

    const eyeLeft = new THREE.Mesh(assets.eyeGeometry, assets.eyeMaterial);
    eyeLeft.position.set(-0.08, 0.96, 0.19);
    const eyeRight = eyeLeft.clone();
    eyeRight.position.x = 0.08;

    const healthBack = new THREE.Mesh(assets.healthGeometry, assets.healthBackMaterial);
    healthBack.position.set(0, 1.2, 0);
    this.healthFill = new THREE.Mesh(assets.healthGeometry, assets.healthMaterial);
    this.healthFill.position.set(0, 1.205, 0.012);
    this.healthFill.scale.set(0.96, 0.6, 0.7);

    [
      this.leftLeg,
      this.rightLeg,
      this.body,
      this.head,
      this.leftArm,
      this.rightArm,
      eyeLeft,
      eyeRight
    ].forEach((mesh) => {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    });

    this.group.add(
      this.leftLeg,
      this.rightLeg,
      this.body,
      this.head,
      this.leftArm,
      this.rightArm,
      eyeLeft,
      eyeRight,
      healthBack,
      this.healthFill
    );
  }

  update(deltaTime, targetPosition, world, stopDistance = 0.68) {
    this.attackCooldown = Math.max(0, this.attackCooldown - deltaTime);
    this.hitFlash = Math.max(0, this.hitFlash - deltaTime);
    DIRECTION.set(
      targetPosition.x - this.position.x,
      0,
      targetPosition.z - this.position.z
    );
    const distance = DIRECTION.length();

    if (distance > stopDistance) {
      DIRECTION.multiplyScalar(1 / Math.max(distance, 0.001));
      const step = Math.min(distance - stopDistance, this.stats.speed * deltaTime);
      const nextX = this.position.x + DIRECTION.x * step;
      const nextZ = this.position.z + DIRECTION.z * step;

      if (world.isWalkableWorld(nextX, nextZ)) {
        this.position.x = nextX;
        this.position.z = nextZ;
      }

      this.group.rotation.y = Math.atan2(DIRECTION.x, DIRECTION.z);
      this.walkTime += deltaTime * (7 + this.stats.speed * 2);
    }

    const terrainY = world.getHeightAtWorld(this.position.x, this.position.z);
    this.position.y += (terrainY - this.position.y) * damping(deltaTime, 12);
    const swing = Math.sin(this.walkTime) * 0.46;
    this.leftLeg.rotation.x = swing;
    this.rightLeg.rotation.x = -swing;
    this.leftArm.rotation.x = -0.72 - swing * 0.25;
    this.rightArm.rotation.x = -0.72 + swing * 0.25;
    const pulse = this.hitFlash > 0 ? 1.1 : 1;
    this.body.scale.setScalar(pulse);
    this.head.scale.setScalar(pulse);
    return distance;
  }

  takeDamage(amount, sourceTowerId = null) {
    if (this.isDead || amount <= 0) {
      return { damage: 0, killed: this.isDead };
    }

    const previous = this.health;
    this.health = Math.max(0, this.health - amount);
    this.hitFlash = 0.11;

    if (sourceTowerId) {
      this.aggroTowerId = sourceTowerId;
    }

    const ratio = this.health / this.stats.maxHealth;
    this.healthFill.scale.x = Math.max(0.001, ratio * 0.96);
    this.healthFill.position.x = -(1 - ratio) * 0.25;
    this.isDead = this.health === 0;
    return { damage: previous - this.health, killed: this.isDead };
  }

  canAttack() {
    return this.attackCooldown <= 0;
  }

  markAttack() {
    this.attackCooldown = this.stats.attackInterval;
  }

  dispose() {
    this.group.removeFromParent();
    this.group.clear();
  }
}

