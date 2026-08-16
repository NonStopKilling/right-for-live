import * as THREE from 'three';
import { COLORS, WORLD, clamp, hash2D } from '../utils/constants.js';

const MATRIX = new THREE.Matrix4();
const COLOR = new THREE.Color();

export class Terrain {
  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'VoxelTerrain';
    this.cells = new Map();

    this.generateCells();
    this.buildMeshes();
  }

  generateCells() {
    const half = Math.floor(WORLD.gridSize / 2);

    for (let gz = -half; gz <= half; gz += 1) {
      for (let gx = -half; gx <= half; gx += 1) {
        const edgeDistance = Math.max(Math.abs(gx), Math.abs(gz)) / half;
        const cornerDistance = Math.hypot(gx, gz) / Math.hypot(half, half);
        const edgeNoise = hash2D(gx, gz);
        const jaggedLimit = 0.96 - edgeNoise * 0.14;

        if (edgeDistance > jaggedLimit || cornerDistance > 0.96 + edgeNoise * 0.06) {
          continue;
        }

        const ridge =
          hash2D(Math.floor(gx / 4), Math.floor(gz / 4), WORLD.seed + 41) * 0.8 +
          hash2D(gx, gz, WORLD.seed + 91) * 0.38;
        const centerFalloff = 1 - clamp(Math.hypot(gx, gz) / half, 0, 1);
        let level = 1 + Math.floor(ridge * 2.1 + centerFalloff * 1.35);

        if (Math.hypot(gx, gz) < 6.2) {
          level = 1;
        }

        level = clamp(level, 1, WORLD.maxTerrainLevel);

        const patch = hash2D(gx, gz, WORLD.seed + 211);
        const baseKind =
          level >= 5 && patch > 0.48
            ? 'stone'
            : patch > 0.84
              ? 'dirt'
              : 'grass';
        const isGlow = this.isGlowTrail(gx, gz);

        this.cells.set(this.key(gx, gz), {
          gx,
          gz,
          level,
          kind: isGlow ? 'glow' : baseKind,
          baseKind,
          walkable: true
        });
      }
    }
  }

  isGlowTrail(gx, gz) {
    const ring = Math.abs(Math.hypot(gx, gz) - 5.4) < 0.5 && hash2D(gx, gz, WORLD.seed + 311) > 0.28;
    const diagonal = Math.abs(gz - Math.round(0.52 * gx + 2.2 * Math.sin(gx * 0.32))) <= 0 && gx > -24 && gx < 21;
    const lowerRibbon = Math.abs(gz - Math.round(-0.34 * gx - 11 + Math.sin(gx * 0.45))) <= 0 && gx > -22 && gx < 19;
    const leftHook = Math.abs(gx + 12) <= 0 && gz > -17 && gz < -7;
    const rightHook = Math.abs(gx - 14) <= 0 && gz > -14 && gz < -5;

    return ring || diagonal || lowerRibbon || leftHook || rightHook;
  }

  buildMeshes() {
    const instances = {
      grass: [],
      dirt: [],
      stone: [],
      topCaps: [],
      glowCaps: []
    };

    for (const cell of this.cells.values()) {
      for (let level = 1; level <= cell.level; level += 1) {
        const kind = this.resolveBlockKind(cell, level);
        instances[kind].push({
          gx: cell.gx,
          gz: cell.gz,
          level,
          color: this.resolveBlockColor(cell, kind, level)
        });
      }

      if (cell.kind !== 'glow') {
        const topKind = this.resolveBlockKind(cell, cell.level);
        instances.topCaps.push({
          gx: cell.gx,
          gz: cell.gz,
          level: cell.level,
          kind: topKind,
          color: this.resolveTopCapColor(cell, topKind)
        });
      }

      if (cell.kind === 'glow') {
        instances.glowCaps.push({
          gx: cell.gx,
          gz: cell.gz,
          level: cell.level,
          color: this.resolveGlowColor(cell)
        });
      }
    }

    this.createBlockMesh('grass', instances.grass);
    this.createBlockMesh('dirt', instances.dirt);
    this.createBlockMesh('stone', instances.stone);
    this.createTopCapMesh(instances.topCaps);
    this.createGlowCapMesh(instances.glowCaps);
  }

  createBlockMesh(kind, blocks) {
    if (blocks.length === 0) {
      return;
    }

    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshLambertMaterial({
      color: 0xffffff,
      emissive: this.resolveMaterialGlow(kind),
      emissiveIntensity: kind === 'grass' ? 0.72 : 0.48,
      vertexColors: true
    });
    const mesh = new THREE.InstancedMesh(geometry, material, blocks.length);
    mesh.name = `${kind}Blocks`;
    mesh.castShadow = kind === 'stone';
    mesh.receiveShadow = true;

    blocks.forEach((block, index) => {
      const position = this.gridToWorld(block.gx, block.gz);
      MATRIX.compose(
        new THREE.Vector3(
          position.x,
          (block.level - 0.5) * WORLD.blockHeight,
          position.z
        ),
        new THREE.Quaternion(),
        new THREE.Vector3(WORLD.cellSize * 0.76, WORLD.blockHeight * 0.94, WORLD.cellSize * 0.76)
      );
      mesh.setMatrixAt(index, MATRIX);
      mesh.setColorAt(index, COLOR.setHex(block.color));
    });

    mesh.instanceMatrix.needsUpdate = true;
    mesh.instanceColor.needsUpdate = true;
    this.group.add(mesh);
  }

  createTopCapMesh(caps) {
    if (caps.length === 0) {
      return;
    }

    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.54,
      vertexColors: true,
      depthWrite: false
    });
    const mesh = new THREE.InstancedMesh(geometry, material, caps.length);
    mesh.name = 'TerrainColorCaps';

    caps.forEach((cap, index) => {
      const position = this.gridToWorld(cap.gx, cap.gz);
      MATRIX.compose(
        new THREE.Vector3(position.x, cap.level * WORLD.blockHeight + 0.006, position.z),
        new THREE.Quaternion(),
        new THREE.Vector3(WORLD.cellSize * 0.74, 0.01, WORLD.cellSize * 0.74)
      );
      mesh.setMatrixAt(index, MATRIX);
      mesh.setColorAt(index, COLOR.setHex(cap.color));
    });

    mesh.instanceMatrix.needsUpdate = true;
    mesh.instanceColor.needsUpdate = true;
    this.group.add(mesh);
  }

  createGlowCapMesh(caps) {
    if (caps.length === 0) {
      return;
    }

    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.9,
      vertexColors: true,
      depthWrite: false
    });
    const mesh = new THREE.InstancedMesh(geometry, material, caps.length);
    mesh.name = 'GlowPathCaps';

    caps.forEach((cap, index) => {
      const position = this.gridToWorld(cap.gx, cap.gz);
      MATRIX.compose(
        new THREE.Vector3(position.x, cap.level * WORLD.blockHeight + 0.014, position.z),
        new THREE.Quaternion(),
        new THREE.Vector3(WORLD.cellSize * 0.64, 0.018, WORLD.cellSize * 0.64)
      );
      mesh.setMatrixAt(index, MATRIX);
      mesh.setColorAt(index, COLOR.setHex(cap.color));
    });

    mesh.instanceMatrix.needsUpdate = true;
    mesh.instanceColor.needsUpdate = true;
    this.group.add(mesh);
  }

  resolveMaterialGlow(kind) {
    if (kind === 'grass') {
      return 0x536624;
    }

    if (kind === 'stone') {
      return 0x3e4036;
    }

    return 0x4a3019;
  }

  resolveBlockKind(cell, level) {
    if (level === cell.level && cell.kind === 'glow') {
      return cell.baseKind;
    }

    if (level === cell.level) {
      return cell.kind;
    }

    return level <= cell.level - 3 ? 'stone' : 'dirt';
  }

  resolveBlockColor(cell, kind, level) {
    const noise = hash2D(cell.gx, cell.gz, WORLD.seed + level * 37);
    const variance = 1.08 + noise * 0.26;
    const base = {
      grass: this.resolveGrassColor(noise),
      dirt: noise > 0.5 ? COLORS.dirt : COLORS.dirtDark,
      stone: noise > 0.58 ? COLORS.stoneCool : COLORS.stone
    }[kind];

    COLOR.setHex(base).multiplyScalar(variance);
    return COLOR.getHex();
  }

  resolveGlowColor(cell) {
    const noise = hash2D(cell.gx, cell.gz, WORLD.seed + 1201);

    if (noise > 0.72) {
      return COLORS.pathGlowWarm;
    }

    if (noise < 0.28) {
      return COLORS.pathGlowCool;
    }

    return COLORS.pathGlow;
  }

  resolveTopCapColor(cell, kind) {
    const noise = hash2D(cell.gx, cell.gz, WORLD.seed + 1301);
    const base =
      kind === 'grass'
        ? this.resolveGrassColor(hash2D(cell.gx, cell.gz, WORLD.seed + 1302))
        : kind === 'stone'
          ? COLORS.stoneCool
          : COLORS.dirt;
    const lift = kind === 'grass' ? 1.38 + noise * 0.28 : 1.24 + noise * 0.2;

    COLOR.setHex(base).multiplyScalar(lift);
    return COLOR.getHex();
  }

  resolveGrassColor(noise) {
    if (noise > 0.82) {
      return COLORS.grassLight;
    }

    if (noise < 0.18) {
      return COLORS.grassDark;
    }

    if (noise > 0.62) {
      return COLORS.moss;
    }

    if (noise > 0.42) {
      return COLORS.fern;
    }

    return COLORS.grass;
  }

  getHeightAtGrid(gx, gz) {
    const cell = this.cells.get(this.key(gx, gz));
    return cell ? cell.level * WORLD.blockHeight : null;
  }

  getHeightAtWorld(x, z) {
    const { gx, gz } = this.worldToGrid(x, z);
    return this.getHeightAtGrid(gx, gz);
  }

  isWalkableWorld(x, z) {
    const { gx, gz } = this.worldToGrid(x, z);
    return Boolean(this.cells.get(this.key(gx, gz))?.walkable);
  }

  gridToWorld(gx, gz) {
    return {
      x: gx * WORLD.cellSize,
      z: gz * WORLD.cellSize
    };
  }

  worldToGrid(x, z) {
    return {
      gx: Math.round(x / WORLD.cellSize),
      gz: Math.round(z / WORLD.cellSize)
    };
  }

  getSpawnPoint() {
    const gx = 4;
    const gz = -3;
    const { x, z } = this.gridToWorld(gx, gz);
    return new THREE.Vector3(x, this.getHeightAtGrid(gx, gz) ?? WORLD.blockHeight, z);
  }

  key(gx, gz) {
    return `${gx},${gz}`;
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
