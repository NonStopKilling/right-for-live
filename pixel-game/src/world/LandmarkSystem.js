import * as THREE from 'three';
import { COLORS, WORLD } from '../utils/constants.js';

export class LandmarkSystem {
  constructor(terrain) {
    this.terrain = terrain;
    this.group = new THREE.Group();
    this.group.name = 'CentralLandmark';
    this.elapsed = 0;

    this.createStoneRing();
    this.createBeacon();
  }

  createStoneRing() {
    const stoneMaterial = new THREE.MeshLambertMaterial({
      color: COLORS.stone,
      emissive: 0x2e291d,
      emissiveIntensity: 0.38
    });
    const emberMaterial = new THREE.MeshBasicMaterial({
      color: 0xfff3c0
    });

    for (let index = 0; index < 18; index += 1) {
      const angle = (index / 18) * Math.PI * 2;
      const radius = 1.05 + (index % 2) * 0.16;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = this.terrain.getHeightAtWorld(x, z) ?? WORLD.blockHeight;

      const stone = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.28 + (index % 3) * 0.08, 0.22), stoneMaterial);
      stone.position.set(x, y + 0.12, z);
      stone.rotation.y = angle;
      stone.castShadow = true;
      stone.receiveShadow = true;
      this.group.add(stone);
    }

    for (let index = 0; index < 9; index += 1) {
      const angle = (index / 9) * Math.PI * 2;
      const x = Math.cos(angle) * 0.45;
      const z = Math.sin(angle) * 0.45;
      const y = this.terrain.getHeightAtWorld(x, z) ?? WORLD.blockHeight;
      const ember = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.08, 0.18), emberMaterial);
      ember.position.set(x, y + 0.09, z);
      this.group.add(ember);
    }
  }

  createBeacon() {
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0xfafff4
    });
    const coreMaterial = new THREE.MeshBasicMaterial({
      color: 0xcaff9f
    });

    this.beacon = new THREE.Group();
    const groundY = this.terrain.getHeightAtWorld(0, 0) ?? WORLD.blockHeight;

    const sizes = [0.34, 0.48, 0.42, 0.32, 0.22];
    sizes.forEach((size, index) => {
      const cube = new THREE.Mesh(new THREE.BoxGeometry(size, size, size), glowMaterial);
      cube.position.y = groundY + 0.42 + index * 0.28;
      cube.rotation.y = (index % 2) * Math.PI * 0.25;
      this.beacon.add(cube);
    });

    const core = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.86, 0.26), coreMaterial);
    core.position.y = groundY + 0.76;
    this.beacon.add(core);

    this.light = new THREE.PointLight(0xeaffbf, 5.2, 9, 1.25);
    this.light.position.set(0, groundY + 1.4, 0);
    this.group.add(this.light, this.beacon);
  }

  update(deltaTime) {
    this.elapsed += deltaTime;
    const pulse = 1 + Math.sin(this.elapsed * 4) * 0.08;
    this.beacon.scale.setScalar(pulse);
    this.light.intensity = 4.8 + Math.sin(this.elapsed * 5.2) * 0.7;
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
