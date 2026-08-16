import * as THREE from 'three';
import { COLORS, WORLD, hash2D } from '../utils/constants.js';

const MATRIX = new THREE.Matrix4();
const QUATERNION = new THREE.Quaternion();
const COLOR = new THREE.Color();

export class PropSystem {
  constructor(terrain) {
    this.terrain = terrain;
    this.group = new THREE.Group();
    this.group.name = 'PropSystem';

    this.createPebbles();
    this.createGrassTufts();
    this.createBrokenPillars();
  }

  createPebbles() {
    const pebbles = this.pickCells(0.91, 7, 24, 601).slice(0, 130);
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshLambertMaterial({
      color: COLORS.stone,
      emissive: 0x342817,
      emissiveIntensity: 0.18,
      vertexColors: true
    });
    const mesh = new THREE.InstancedMesh(geometry, material, pebbles.length);
    mesh.name = 'Pebbles';
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    pebbles.forEach((cell, index) => {
      const { x, z } = this.terrain.gridToWorld(cell.gx, cell.gz);
      const noise = hash2D(cell.gx, cell.gz, WORLD.seed + 617);
      const y = cell.level * WORLD.blockHeight + 0.045;
      QUATERNION.setFromAxisAngle(new THREE.Vector3(0, 1, 0), noise * Math.PI);
      MATRIX.compose(
        new THREE.Vector3(x, y, z),
        QUATERNION,
        new THREE.Vector3(0.18 + noise * 0.12, 0.08 + noise * 0.06, 0.14 + noise * 0.1)
      );
      mesh.setMatrixAt(index, MATRIX);
      mesh.setColorAt(index, COLOR.setHex(COLORS.stone).multiplyScalar(0.72 + noise * 0.42));
    });

    mesh.instanceMatrix.needsUpdate = true;
    mesh.instanceColor.needsUpdate = true;
    this.group.add(mesh);
  }

  createGrassTufts() {
    const tufts = this.pickCells(0.93, 8, 25, 701).slice(0, 95);
    const geometry = new THREE.ConeGeometry(0.09, 0.32, 4, 1);
    const material = new THREE.MeshBasicMaterial({
      color: COLORS.grassLight,
      vertexColors: true
    });
    const mesh = new THREE.InstancedMesh(geometry, material, tufts.length);
    mesh.name = 'GrassTufts';
    mesh.castShadow = false;

    tufts.forEach((cell, index) => {
      const { x, z } = this.terrain.gridToWorld(cell.gx, cell.gz);
      const noise = hash2D(cell.gx, cell.gz, WORLD.seed + 733);
      QUATERNION.setFromAxisAngle(new THREE.Vector3(0, 1, 0), noise * Math.PI * 2);
      MATRIX.compose(
        new THREE.Vector3(
          x + (noise - 0.5) * 0.14,
          cell.level * WORLD.blockHeight + 0.16,
          z + (hash2D(cell.gz, cell.gx, WORLD.seed + 734) - 0.5) * 0.14
        ),
        QUATERNION,
        new THREE.Vector3(1, 0.75 + noise * 0.55, 1)
      );
      mesh.setMatrixAt(index, MATRIX);
      mesh.setColorAt(index, COLOR.setHex(noise > 0.54 ? COLORS.grassLight : COLORS.moss).multiplyScalar(0.9 + noise * 0.24));
    });

    mesh.instanceMatrix.needsUpdate = true;
    mesh.instanceColor.needsUpdate = true;
    this.group.add(mesh);
  }

  createBrokenPillars() {
    const pillars = [
      { gx: -6, gz: 4, height: 0.68 },
      { gx: -5, gz: 5, height: 0.42 },
      { gx: 7, gz: -2, height: 0.76 },
      { gx: 8, gz: -1, height: 0.34 }
    ];
    const material = new THREE.MeshLambertMaterial({
      color: 0xb5aa85,
      emissive: 0x352d1a,
      emissiveIntensity: 0.42,
      flatShading: true
    });

    pillars.forEach((pillar) => {
      const { x, z } = this.terrain.gridToWorld(pillar.gx, pillar.gz);
      const y = this.terrain.getHeightAtGrid(pillar.gx, pillar.gz) ?? WORLD.blockHeight;
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.22, pillar.height, 0.22), material);
      mesh.position.set(x, y + pillar.height / 2, z);
      mesh.rotation.y = hash2D(pillar.gx, pillar.gz, WORLD.seed + 811) * Math.PI;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.group.add(mesh);
    });
  }

  pickCells(threshold, minDistance, maxEdge, seedOffset) {
    const cells = [];

    for (const cell of this.terrain.cells.values()) {
      const distance = Math.hypot(cell.gx, cell.gz);
      const edge = Math.max(Math.abs(cell.gx), Math.abs(cell.gz));
      const density = hash2D(cell.gx, cell.gz, WORLD.seed + seedOffset);

      if (cell.kind === 'grass' && distance > minDistance && edge < maxEdge && density > threshold) {
        cells.push(cell);
      }
    }

    return cells;
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
