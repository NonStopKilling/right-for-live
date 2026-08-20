import * as THREE from 'three';
import { WORLD, clamp, fractalNoise2D, hash2D, valueNoise2D } from '../utils/constants.js';

const MATRIX = new THREE.Matrix4();
const QUATERNION = new THREE.Quaternion();
const COLOR = new THREE.Color();
const SCALE = new THREE.Vector3();
const POSITION = new THREE.Vector3();

export class Terrain {
  constructor(profile) {
    this.profile = profile;
    this.geometry = new THREE.BoxGeometry(1, 1, 1);
    this.materials = this.createMaterials();
  }

  createMaterials() {
    return {
      surface: new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.88,
        metalness: 0,
        flatShading: true
      }),
      earth: new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.94,
        metalness: 0,
        flatShading: true
      }),
      stone: new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.82,
        metalness: 0.02,
        flatShading: true
      }),
      trail: new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.72,
        metalness: 0,
        emissive: this.profile.palette.trail[0],
        emissiveIntensity: this.profile.id === 'dark' ? 0.22 : 0.08,
        flatShading: true
      }),
      cap: new THREE.MeshBasicMaterial({
        color: 0xffffff,
        toneMapped: false
      })
    };
  }

  getCell(gx, gz) {
    const elevation = fractalNoise2D(gx, gz, WORLD.seed + 101);
    const broadElevation = valueNoise2D(gx, gz, 46, WORLD.seed + 109);
    const moisture = valueNoise2D(gx, gz, 31, WORLD.seed + 211);
    const geology = valueNoise2D(gx, gz, 23, WORLD.seed + 307);
    const basin = valueNoise2D(gx, gz, 19, WORLD.seed + 239);
    const biome = valueNoise2D(gx, gz, 54, WORLD.seed + 257);
    let forest = valueNoise2D(gx, gz, 36, WORLD.seed + 401);
    const distanceFromOrigin = Math.hypot(gx, gz);
    const northDistance = Math.max(0, -gz);

    if (distanceFromOrigin > WORLD.originClearRadius && distanceFromOrigin < 25) {
      forest = clamp(forest + 0.29, 0, 1);
    }

    let level = 1 + Math.floor(clamp((elevation * 0.74 + broadElevation * 0.26 - 0.2) * 4.7, 0, WORLD.maxTerrainLevel - 1));

    if (distanceFromOrigin < WORLD.originClearRadius) {
      level = 1;
    }

    let surface = 'meadow';

    if (geology > 0.71 && level >= 3) {
      surface = 'stone';
    } else if (moisture < 0.29) {
      surface = 'soil';
    } else if (moisture > 0.62) {
      surface = 'moss';
    }

    if (this.isTrail(gx, gz)) {
      surface = 'trail';
    }

    const water = !this.isTrail(gx, gz) &&
      distanceFromOrigin > WORLD.originClearRadius + 4 &&
      northDistance > 28 &&
      moisture > 0.66 &&
      basin > 0.58 &&
      level <= 3;

    if (water) {
      surface = moisture > 0.78 ? 'moss' : 'soil';
      forest = clamp(forest - 0.18, 0, 1);
    }

    return {
      gx,
      gz,
      level,
      surface,
      moisture,
      geology,
      forest,
      biome,
      water,
      walkable: true
    };
  }

  generateChunkCells(chunkX, chunkZ) {
    const cells = [];
    const startX = chunkX * WORLD.chunkSize;
    const startZ = chunkZ * WORLD.chunkSize;

    for (let localZ = 0; localZ < WORLD.chunkSize; localZ += 1) {
      for (let localX = 0; localX < WORLD.chunkSize; localX += 1) {
        cells.push(this.getCell(startX + localX, startZ + localZ));
      }
    }

    return cells;
  }

  createChunkGroup(cells, chunkKey) {
    const group = new THREE.Group();
    group.name = `TerrainChunk-${chunkKey}`;
    const instances = { surface: [], earth: [], stone: [], trail: [], cap: [] };

    for (const cell of cells) {
      for (let layer = 1; layer <= cell.level; layer += 1) {
        const kind = this.resolveLayerKind(cell, layer);
        instances[kind].push({
          cell,
          layer,
          color: this.resolveBlockColor(cell, kind, layer)
        });
      }

      if (cell.surface !== 'trail') {
        const topKind = this.resolveLayerKind(cell, cell.level);
        const topColor = this.resolveBlockColor(cell, topKind, cell.level);
        instances.cap.push({
          cell,
          layer: cell.level,
          color: COLOR.setHex(topColor).multiplyScalar(this.profile.id === 'dark' ? 0.8 : 0.9).getHex()
        });
      }
    }

    for (const [kind, blocks] of Object.entries(instances)) {
      const mesh = this.createInstancedBlocks(kind, blocks);

      if (mesh) {
        group.add(mesh);
      }
    }

    return group;
  }

  createInstancedBlocks(kind, blocks) {
    if (blocks.length === 0) {
      return null;
    }

    const mesh = new THREE.InstancedMesh(this.geometry, this.materials[kind], blocks.length);
    mesh.name = `${kind}Blocks`;
    mesh.castShadow = false;
    mesh.receiveShadow = kind !== 'cap';

    blocks.forEach((block, index) => {
      const { x, z } = this.gridToWorld(block.cell.gx, block.cell.gz);
      const isCap = kind === 'cap';
      POSITION.set(
        x,
        isCap ? block.layer * WORLD.blockHeight + 0.008 : (block.layer - 0.5) * WORLD.blockHeight,
        z
      );
      SCALE.set(
        WORLD.cellSize * (isCap ? 0.84 : 0.91),
        isCap ? 0.014 : WORLD.blockHeight * 0.94,
        WORLD.cellSize * (isCap ? 0.84 : 0.91)
      );
      MATRIX.compose(POSITION, QUATERNION, SCALE);
      mesh.setMatrixAt(index, MATRIX);
      mesh.setColorAt(index, COLOR.setHex(block.color));
    });

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true;
    }
    mesh.computeBoundingSphere();
    return mesh;
  }

  resolveLayerKind(cell, layer) {
    const isTop = layer === cell.level;

    if (isTop && cell.surface === 'trail') {
      return 'trail';
    }

    if (isTop && cell.surface === 'stone') {
      return 'stone';
    }

    if (isTop && cell.surface === 'soil') {
      return 'earth';
    }

    if (isTop) {
      return 'surface';
    }

    return layer <= cell.level - 2 && cell.geology > 0.57 ? 'stone' : 'earth';
  }

  resolveBlockColor(cell, kind, layer) {
    let family = kind;

    if (kind === 'surface') {
      family = cell.surface;
    } else if (kind === 'earth') {
      family = 'soil';
    }

    const palette = this.profile.palette[family];
    const region = valueNoise2D(cell.gx, cell.gz, 9, WORLD.seed + 503);
    const detail = hash2D(cell.gx, cell.gz, WORLD.seed + layer * 43 + 509);
    const index = Math.min(palette.length - 1, Math.floor(region * palette.length));
    const variation = 0.94 + detail * 0.12;

    COLOR.setHex(palette[index]).multiplyScalar(variation);
    return COLOR.getHex();
  }

  isTrail(gx, gz) {
    const centerLine = Math.round(Math.sin(gx * 0.17) * 2.2 + Math.sin(gx * 0.055) * 3.1);
    const ribbon = Math.abs(gz - centerLine) === 0 && Math.abs(gx) < 52;
    const ring = Math.abs(Math.hypot(gx, gz) - 5.2) < 0.52;
    return ribbon || ring;
  }

  getHeightAtGrid(gx, gz) {
    return this.getCell(gx, gz).level * WORLD.blockHeight;
  }

  getHeightAtWorld(x, z) {
    const { gx, gz } = this.worldToGrid(x, z);
    return this.getHeightAtGrid(gx, gz);
  }

  isWalkableWorld(x, z) {
    const { gx, gz } = this.worldToGrid(x, z);
    return this.getCell(gx, gz).walkable;
  }

  isWaterGrid(gx, gz) {
    return this.getCell(gx, gz).water;
  }

  isWaterWorld(x, z) {
    const { gx, gz } = this.worldToGrid(x, z);
    return this.isWaterGrid(gx, gz);
  }

  gridToWorld(gx, gz) {
    return { x: gx * WORLD.cellSize, z: gz * WORLD.cellSize };
  }

  worldToGrid(x, z) {
    return {
      gx: Math.round(x / WORLD.cellSize),
      gz: Math.round(z / WORLD.cellSize)
    };
  }

  worldToChunk(x, z) {
    const { gx, gz } = this.worldToGrid(x, z);
    return {
      chunkX: Math.floor(gx / WORLD.chunkSize),
      chunkZ: Math.floor(gz / WORLD.chunkSize)
    };
  }

  getSpawnPoint() {
    const gx = 2;
    const gz = -2;
    const { x, z } = this.gridToWorld(gx, gz);
    return new THREE.Vector3(x, this.getHeightAtGrid(gx, gz), z);
  }

  dispose() {
    this.geometry.dispose();
    Object.values(this.materials).forEach((material) => material.dispose());
  }
}
