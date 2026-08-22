import * as THREE from 'three';
import { DEFAULT_LAB_OPTIONS } from '../config/gameOptions.js';
import { WORLD, hash2D } from '../utils/constants.js';

const MATRIX = new THREE.Matrix4();
const POSITION = new THREE.Vector3();
const QUATERNION = new THREE.Quaternion();
const SCALE = new THREE.Vector3();
const COLOR = new THREE.Color();

export class WaterSystem {
  constructor(terrain, profile) {
    this.terrain = terrain;
    this.profile = profile;
    this.options = structuredClone(DEFAULT_LAB_OPTIONS);
    this.geometry = new THREE.BoxGeometry(1, 1, 1);
    this.material = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: profile.id === 'dark' ? 0.48 : 0.42,
      roughness: 0.18,
      metalness: 0.02,
      depthWrite: false,
      flatShading: true
    });
  }

  applyOptions(options = {}) {
    this.options = { ...this.options, ...options };
    this.material.opacity = Math.max(0.08, Math.min(0.86, Number(this.options.waterOpacity) / 100));
  }

  createChunkGroup(cells, chunkKey) {
    const blocks = this.options.waterEnabled ? cells.filter((cell) => cell.water) : [];
    const group = new THREE.Group();
    group.name = `WaterChunk-${chunkKey}`;

    if (blocks.length === 0) {
      return group;
    }

    const mesh = new THREE.InstancedMesh(this.geometry, this.material, blocks.length);
    mesh.name = 'TransparentWater';
    mesh.receiveShadow = false;
    mesh.castShadow = false;
    mesh.renderOrder = 3;

    blocks.forEach((cell, index) => {
      const { x, z } = this.terrain.gridToWorld(cell.gx, cell.gz);
      const ripple = 0.92 + hash2D(cell.gx, cell.gz, this.seed(1889)) * 0.12;
      POSITION.set(x, cell.level * WORLD.blockHeight + 0.038, z);
      SCALE.set(WORLD.cellSize * 0.94, 0.036, WORLD.cellSize * 0.94);
      MATRIX.compose(POSITION, QUATERNION, SCALE);
      mesh.setMatrixAt(index, MATRIX);
      mesh.setColorAt(index, COLOR.setHex(this.resolveColor(cell)).multiplyScalar(ripple));
    });

    mesh.instanceMatrix.needsUpdate = true;
    mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
    group.add(mesh);
    return group;
  }

  resolveColor(cell) {
    if (this.profile.id === 'daylight') {
      return cell.moisture > 0.78 ? 0x71c9bd : 0x5eaca7;
    }

    return cell.moisture > 0.78 ? 0x3d9f9a : 0x317f83;
  }

  seed(offset) {
    return WORLD.seed + Math.floor(Number(this.options.seedOffset) || 0) + offset;
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
  }
}
