import * as THREE from 'three';
import { COLORS, PLAYER, damping } from '../utils/constants.js';
import { GAMEPLAY } from '../config/gameplay.js';

const SCREEN_FORWARD = new THREE.Vector3(-1, 0, -1).normalize();
const SCREEN_RIGHT = new THREE.Vector3(1, 0, -1).normalize();
const MOVE = new THREE.Vector3();

export class Player {
  constructor(spawnPoint, profile) {
    this.profile = profile;
    this.group = new THREE.Group();
    this.group.name = 'Player';
    this.position = this.group.position;
    this.position.copy(spawnPoint);
    this.position.y += 0.025;
    this.walkTime = 0;
    this.maxHealth = GAMEPLAY.player.maxHealth;
    this.health = this.maxHealth;
    this.tuning = { moveSpeed: 1, maxHealthBonus: 0 };
    this.damageFlash = 0;
    this.isDead = false;

    this.createMesh();
  }

  createMesh() {
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: COLORS.playerBody,
      emissive: COLORS.playerBody,
      emissiveIntensity: 0.18,
      roughness: 0.72,
      metalness: 0,
      flatShading: true
    });
    const accentMaterial = new THREE.MeshStandardMaterial({
      color: COLORS.playerAccent,
      emissive: COLORS.playerAccent,
      emissiveIntensity: 0.2,
      roughness: 0.68,
      metalness: 0.02,
      flatShading: true
    });
    const darkMaterial = new THREE.MeshStandardMaterial({
      color: COLORS.playerDark,
      emissive: COLORS.playerDark,
      emissiveIntensity: 0.14,
      roughness: 0.84,
      metalness: 0,
      flatShading: true
    });
    const shadowMaterial = new THREE.MeshBasicMaterial({
      color: COLORS.playerShadow,
      transparent: true,
      opacity: this.profile.id === 'dark' ? 0.5 : 0.3,
      depthWrite: false
    });

    this.leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.27, 0.17), darkMaterial);
    this.leftLeg.position.set(-0.1, 0.15, 0);
    this.rightLeg = this.leftLeg.clone();
    this.rightLeg.position.x = 0.1;

    this.body = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.38, 0.3), bodyMaterial);
    this.body.position.y = 0.47;

    this.head = new THREE.Mesh(new THREE.BoxGeometry(0.27, 0.27, 0.27), bodyMaterial);
    this.head.position.y = 0.78;

    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.33, 0.11, 0.33), accentMaterial);
    cap.position.y = 0.96;

    const facingMark = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.08), accentMaterial);
    facingMark.position.set(0, 0.5, 0.18);

    this.revolver = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.3), darkMaterial);
    this.revolver.position.set(0.25, 0.52, 0.19);

    const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.31, 12), shadowMaterial);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.01;

    [this.leftLeg, this.rightLeg, this.body, this.head, cap, facingMark, this.revolver].forEach((mesh) => {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    });

    this.group.add(
      shadow,
      this.leftLeg,
      this.rightLeg,
      this.body,
      this.head,
      cap,
      facingMark,
      this.revolver
    );
  }

  update(deltaTime, input, world, canMove = true, speedMultiplier = 1) {
    const movement = input.getMovement();
    MOVE.set(0, 0, 0)
      .addScaledVector(SCREEN_RIGHT, movement.x)
      .addScaledVector(SCREEN_FORWARD, movement.y);

    if (canMove && !this.isDead && MOVE.lengthSq() > 0) {
      MOVE.normalize().multiplyScalar(PLAYER.speed * this.tuning.moveSpeed * speedMultiplier * deltaTime);

      const nextX = this.position.x + MOVE.x;
      const nextZ = this.position.z + MOVE.z;

      if (world.isWalkableWorld(nextX, nextZ)) {
        this.position.x = nextX;
        this.position.z = nextZ;
        this.group.rotation.y = Math.atan2(MOVE.x, MOVE.z);
        this.walkTime += deltaTime * 12;
        const swing = Math.sin(this.walkTime) * 0.42;
        this.leftLeg.rotation.x = swing;
        this.rightLeg.rotation.x = -swing;
      }
    } else {
      this.leftLeg.rotation.x *= 0.7;
      this.rightLeg.rotation.x *= 0.7;
    }

    const terrainY = world.getHeightAtWorld(this.position.x, this.position.z);
    const alpha = damping(deltaTime, PLAYER.yDamping);
    this.position.y += (terrainY + 0.025 - this.position.y) * alpha;

    this.damageFlash = Math.max(0, this.damageFlash - deltaTime);
    const pulse = this.damageFlash > 0 ? 1 + Math.sin(this.damageFlash * 70) * 0.08 : 1;
    this.body.scale.setScalar(pulse);
    this.head.scale.setScalar(pulse);
  }

  setAimPoint(point) {
    if (!point || this.isDead) {
      return;
    }

    const dx = point.x - this.position.x;
    const dz = point.z - this.position.z;

    if (dx * dx + dz * dz > 0.001) {
      this.group.rotation.y = Math.atan2(dx, dz);
    }
  }

  takeDamage(amount) {
    if (this.isDead || amount <= 0) {
      return 0;
    }

    const previous = this.health;
    this.health = Math.max(0, this.health - amount);
    this.damageFlash = 0.18;

    if (this.health === 0) {
      this.isDead = true;
    }

    return previous - this.health;
  }

  heal(amount) {
    if (this.isDead || amount <= 0 || this.health >= this.maxHealth) {
      return 0;
    }

    const previous = this.health;
    this.health = Math.min(this.maxHealth, this.health + amount);
    return this.health - previous;
  }

  applyTuning(tuning = {}) {
    const nextMoveSpeed = clampNumber(tuning.moveSpeed, 0.45, 3.5, 1);
    const nextMaxHealthBonus = clampNumber(tuning.maxHealthBonus, 0, 500, 0);
    const previousMaxHealth = this.maxHealth;

    this.tuning = {
      moveSpeed: nextMoveSpeed,
      maxHealthBonus: nextMaxHealthBonus
    };
    this.maxHealth = GAMEPLAY.player.maxHealth + nextMaxHealthBonus;

    if (this.maxHealth > previousMaxHealth) {
      this.health += this.maxHealth - previousMaxHealth;
    }

    this.health = Math.min(this.health, this.maxHealth);
  }

  respawn(position) {
    this.position.copy(position);
    this.position.y += 0.025;
    this.health = this.maxHealth;
    this.isDead = false;
    this.damageFlash = 0;
    this.group.visible = true;
  }

  getHealthSnapshot() {
    return {
      health: this.health,
      maxHealth: this.maxHealth,
      isDead: this.isDead
    };
  }

  addTo(scene) {
    scene.add(this.group);
  }

  dispose() {
    const materials = new Set();
    const geometries = new Set();

    this.group.traverse((object) => {
      if (object.geometry) {
        geometries.add(object.geometry);
      }

      if (Array.isArray(object.material)) {
        object.material.forEach((material) => materials.add(material));
      } else if (object.material) {
        materials.add(object.material);
      }
    });

    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
    this.group.clear();
  }
}

function clampNumber(value, min, max, fallback) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.max(min, Math.min(max, numeric)) : fallback;
}
