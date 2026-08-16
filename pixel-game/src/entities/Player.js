import * as THREE from 'three';
import { COLORS, PLAYER, damping } from '../utils/constants.js';

const SCREEN_FORWARD = new THREE.Vector3(-1, 0, -1).normalize();
const SCREEN_RIGHT = new THREE.Vector3(1, 0, -1).normalize();
const MOVE = new THREE.Vector3();

export class Player {
  constructor(spawnPoint) {
    this.group = new THREE.Group();
    this.group.name = 'Player';
    this.position = this.group.position;
    this.position.copy(spawnPoint);
    this.position.y += 0.04;

    this.createMesh();
  }

  createMesh() {
    const bodyMaterial = new THREE.MeshLambertMaterial({
      color: COLORS.playerBody,
      emissive: 0xf8ffe8,
      emissiveIntensity: 0.92,
      flatShading: true
    });
    const accentMaterial = new THREE.MeshLambertMaterial({
      color: COLORS.playerAccent,
      emissive: 0xe4ffb2,
      emissiveIntensity: 0.7,
      flatShading: true
    });
    const shadowMaterial = new THREE.MeshBasicMaterial({
      color: COLORS.playerShadow,
      transparent: true,
      opacity: 0.42
    });

    const feet = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.12, 0.3), accentMaterial);
    feet.position.y = 0.1;
    feet.castShadow = true;

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.45, 0.34), bodyMaterial);
    body.position.y = 0.4;
    body.castShadow = true;

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.28, 0.28), bodyMaterial);
    head.position.y = 0.78;
    head.castShadow = true;

    const upperGlow = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.22), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    upperGlow.position.y = 1.02;

    const light = new THREE.PointLight(0xf8ffcf, 1.8, 3.2, 1.7);
    light.position.y = 0.7;

    const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.3, 12), shadowMaterial);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.012;
    shadow.receiveShadow = true;

    this.group.add(shadow, feet, body, head, upperGlow, light);
  }

  update(deltaTime, input, world) {
    const movement = input.getMovement();
    MOVE.set(0, 0, 0)
      .addScaledVector(SCREEN_RIGHT, movement.x)
      .addScaledVector(SCREEN_FORWARD, movement.y);

    if (MOVE.lengthSq() > 0) {
      MOVE.normalize().multiplyScalar(PLAYER.speed * deltaTime);

      const nextX = this.position.x + MOVE.x;
      const nextZ = this.position.z + MOVE.z;

      if (world.isWalkableWorld(nextX, nextZ)) {
        this.position.x = nextX;
        this.position.z = nextZ;
        this.group.rotation.y = Math.atan2(MOVE.x, MOVE.z);
      }
    }

    const terrainY = world.getHeightAtWorld(this.position.x, this.position.z);
    if (terrainY !== null) {
      const alpha = damping(deltaTime, PLAYER.yDamping);
      this.position.y += (terrainY + 0.04 - this.position.y) * alpha;
    }
  }

  addTo(scene) {
    scene.add(this.group);
  }

  dispose() {
    this.group.traverse((object) => {
      object.geometry?.dispose();

      if (Array.isArray(object.material)) {
        object.material.forEach((material) => material.dispose());
      } else {
        object.material?.dispose();
      }
    });
    this.group.clear();
  }
}
