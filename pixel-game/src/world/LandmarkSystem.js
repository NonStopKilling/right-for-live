import * as THREE from 'three';
import { WORLD } from '../utils/constants.js';

export class LandmarkSystem {
  constructor(terrain, profile) {
    this.terrain = terrain;
    this.profile = profile;
    this.group = new THREE.Group();
    this.group.name = 'CentralLandmark';
    this.elapsed = 0;

    this.createStoneRing();
    this.createBeacon();
  }

  createStoneRing() {
    const stoneMaterial = new THREE.MeshStandardMaterial({
      color: this.profile.palette.stone[1],
      roughness: 0.84,
      metalness: 0.02,
      flatShading: true
    });

    for (let index = 0; index < 14; index += 1) {
      const angle = (index / 14) * Math.PI * 2;
      const radius = 1.05 + (index % 2) * 0.12;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = this.terrain.getHeightAtWorld(x, z) ?? WORLD.blockHeight;
      const height = 0.18 + (index % 3) * 0.055;
      const stone = new THREE.Mesh(new THREE.BoxGeometry(0.28, height, 0.24), stoneMaterial);
      stone.position.set(x, y + height / 2, z);
      stone.rotation.y = angle;
      stone.castShadow = true;
      stone.receiveShadow = true;
      this.group.add(stone);
    }
  }

  createBeacon() {
    const glowMaterial = new THREE.MeshBasicMaterial({ color: this.profile.landmark.glow });
    const coreMaterial = new THREE.MeshBasicMaterial({ color: this.profile.landmark.core });
    const groundY = this.terrain.getHeightAtWorld(0, 0) ?? WORLD.blockHeight;

    this.beacon = new THREE.Group();
    const sizes = [0.44, 0.34, 0.24];

    sizes.forEach((size, index) => {
      const cube = new THREE.Mesh(new THREE.BoxGeometry(size, size, size), index === 1 ? coreMaterial : glowMaterial);
      cube.position.y = groundY + 0.42 + index * 0.28;
      cube.rotation.y = index * Math.PI * 0.25;
      this.beacon.add(cube);
    });

    this.light = new THREE.PointLight(
      this.profile.landmark.light,
      this.profile.landmark.intensity,
      7,
      1.7
    );
    this.light.position.set(0, groundY + 1.05, 0);
    this.group.add(this.light, this.beacon);
  }

  update(deltaTime) {
    this.elapsed += deltaTime;
    const pulse = 1 + Math.sin(this.elapsed * 3.2) * 0.045;
    this.beacon.scale.setScalar(pulse);
    this.light.intensity = this.profile.landmark.intensity * (0.92 + Math.sin(this.elapsed * 4.4) * 0.08);
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
