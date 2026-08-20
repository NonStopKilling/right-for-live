import * as THREE from 'three';
import { WORLD, hash2D, valueNoise2D } from '../utils/constants.js';

const MATRIX = new THREE.Matrix4();
const COLOR = new THREE.Color();
const QUATERNION = new THREE.Quaternion();
const Y_AXIS = new THREE.Vector3(0, 1, 0);
const POSITION = new THREE.Vector3();
const SCALE = new THREE.Vector3();

const TREE_VARIANTS = {
  spire: {
    trunkHeight: 0.68,
    trunkWidth: 0.15,
    layers: 7,
    baseWidth: 1.12,
    tipWidth: 0.13,
    crownY: 0.56,
    step: 0.43,
    slabHeight: 0.16,
    taperPower: 1.08
  },
  needle: {
    trunkHeight: 0.7,
    trunkWidth: 0.13,
    layers: 5,
    baseWidth: 0.76,
    tipWidth: 0.1,
    crownY: 0.57,
    step: 0.57,
    slabHeight: 0.18,
    taperPower: 1
  },
  broad: {
    trunkHeight: 1.15,
    trunkWidth: 0.23,
    layers: 6,
    widths: [1.24, 1.58, 1.4, 1.08, 0.7, 0.34],
    crownY: 1.02,
    step: 0.27,
    slabHeight: 0.18
  },
  fan: {
    trunkHeight: 0.86,
    trunkWidth: 0.19,
    layers: 5,
    widths: [1.52, 1.36, 1.7, 1.12, 0.62],
    crownY: 0.88,
    step: 0.23,
    slabHeight: 0.16
  },
  bent: {
    trunkHeight: 0.74,
    trunkWidth: 0.16,
    layers: 6,
    baseWidth: 1.0,
    tipWidth: 0.16,
    crownY: 0.65,
    step: 0.35,
    slabHeight: 0.16,
    taperPower: 0.82,
    lean: 0.13
  },
  sapling: {
    trunkHeight: 0.4,
    trunkWidth: 0.1,
    layers: 3,
    baseWidth: 0.54,
    tipWidth: 0.12,
    crownY: 0.34,
    step: 0.31,
    slabHeight: 0.15,
    taperPower: 1
  }
};

export class TreeSystem {
  constructor(terrain, profile) {
    this.terrain = terrain;
    this.profile = profile;
    this.geometry = new THREE.BoxGeometry(1, 1, 1);
    this.materials = {
      trunk: new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.94,
        metalness: 0,
        flatShading: true
      }),
      foliage: new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.78,
        metalness: 0,
        flatShading: true
      }),
      cap: new THREE.MeshBasicMaterial({
        color: 0xffffff,
        toneMapped: false
      })
    };
  }

  createChunkGroup(cells, chunkKey, depletedResources = new Set()) {
    const group = new THREE.Group();
    group.name = `VegetationChunk-${chunkKey}`;
    const trunks = [];
    const foliage = [];
    const caps = [];

    for (const cell of cells) {
      const isTree = this.shouldPlaceTree(cell);

      if (isTree) {
        if (!depletedResources.has(this.getResourceId(cell))) {
          this.addTreeRecipe(cell, trunks, foliage, caps);
        }
      } else if (this.shouldPlaceBush(cell)) {
        this.addBushRecipe(cell, foliage, caps);
      }
    }

    const trunkMesh = this.createMesh('TreeTrunks', trunks, this.materials.trunk, true);
    const foliageMesh = this.createMesh('TreeCanopiesAndBushes', foliage, this.materials.foliage, true);
    const capMesh = this.createMesh('VegetationColorCaps', caps, this.materials.cap, false);

    if (trunkMesh) {
      group.add(trunkMesh);
    }

    if (foliageMesh) {
      group.add(foliageMesh);
    }

    if (capMesh) {
      capMesh.receiveShadow = false;
      group.add(capMesh);
    }

    return group;
  }

  getResourceNodes(cells) {
    return cells.filter((cell) => this.shouldPlaceTree(cell)).map((cell) => {
      const { x, z } = this.terrain.gridToWorld(cell.gx, cell.gz);
      return {
        id: this.getResourceId(cell),
        type: 'wood',
        layer: 'vegetation',
        label: 'MADERA',
        gx: cell.gx,
        gz: cell.gz,
        x,
        y: cell.level * WORLD.blockHeight,
        z
      };
    });
  }

  getResourceId(cell) {
    return `wood:${cell.gx}:${cell.gz}`;
  }

  shouldPlaceTree(cell) {
    if (cell.water || (cell.surface !== 'meadow' && cell.surface !== 'moss' && cell.surface !== 'soil')) {
      return false;
    }

    if (Math.hypot(cell.gx, cell.gz) < WORLD.originClearRadius + 1.5 || this.hasNearbyTrail(cell.gx, cell.gz)) {
      return false;
    }

    const density = hash2D(cell.gx, cell.gz, WORLD.seed + 701);
    const distanceFromOrigin = Math.hypot(cell.gx, cell.gz);
    const clearingRingBias = distanceFromOrigin < 24 ? 0.12 : 0;
    const surfaceThreshold = cell.surface === 'moss' ? 0.42 : cell.surface === 'soil' ? 0.5 : 0.49;
    const forestThreshold = surfaceThreshold - clearingRingBias;

    if (cell.forest < forestThreshold || density < 0.58) {
      return false;
    }

    for (let offsetZ = -1; offsetZ <= 1; offsetZ += 1) {
      for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
        if (offsetX === 0 && offsetZ === 0) {
          continue;
        }

        if (hash2D(cell.gx + offsetX, cell.gz + offsetZ, WORLD.seed + 701) > density) {
          return false;
        }
      }
    }

    return true;
  }

  shouldPlaceBush(cell) {
    if (cell.water || (cell.surface !== 'meadow' && cell.surface !== 'moss')) {
      return false;
    }

    if (Math.hypot(cell.gx, cell.gz) < WORLD.originClearRadius || this.terrain.isTrail(cell.gx, cell.gz)) {
      return false;
    }

    return hash2D(cell.gx, cell.gz, WORLD.seed + 773) > 0.965;
  }

  hasNearbyTrail(gx, gz) {
    return (
      this.terrain.isTrail(gx, gz) ||
      this.terrain.isTrail(gx + 1, gz) ||
      this.terrain.isTrail(gx - 1, gz) ||
      this.terrain.isTrail(gx, gz + 1) ||
      this.terrain.isTrail(gx, gz - 1)
    );
  }

  addTreeRecipe(cell, trunks, foliage, caps) {
    const variety = hash2D(cell.gx, cell.gz, WORLD.seed + 811);
    const variantName = this.resolveVariant(variety, cell.forest);
    const variant = TREE_VARIANTS[variantName];
    const heightScale = 0.88 + hash2D(cell.gx, cell.gz, WORLD.seed + 823) * 0.5;
    const widthScale = 0.86 + hash2D(cell.gz, cell.gx, WORLD.seed + 829) * 0.3;
    const rotation = Math.floor(variety * 8) * (Math.PI / 4);
    const baseY = cell.level * WORLD.blockHeight;
    const { x, z } = this.terrain.gridToWorld(cell.gx, cell.gz);
    const palette = this.resolveTreePalette(cell.gx, cell.gz);
    const trunkColor = this.resolveFamilyColor('trunk', cell.gx, cell.gz, 839);

    trunks.push({
      x,
      y: baseY + (variant.trunkHeight * heightScale) / 2,
      z,
      rotation,
      scaleX: variant.trunkWidth * widthScale,
      scaleY: variant.trunkHeight * heightScale,
      scaleZ: variant.trunkWidth * widthScale,
      color: trunkColor
    });

    for (let layer = 0; layer < variant.layers; layer += 1) {
      const normalized = layer / Math.max(1, variant.layers - 1);
      const width = variant.widths
        ? variant.widths[layer] * widthScale
        : this.resolveTaperedWidth(variant, normalized) * widthScale;
      const color = layer === variant.layers - 1
        ? palette.tip
        : layer === 0
          ? palette.shade
          : palette.base;
      const band = layer % 2 === 0 ? 1.04 : 0.96;

      const block = {
        x: x + (variant.lean ?? 0) * normalized * Math.cos(rotation),
        y: baseY + (variant.crownY + layer * variant.step) * heightScale,
        z: z + (variant.lean ?? 0) * normalized * Math.sin(rotation),
        rotation,
        scaleX: width,
        scaleY: variant.slabHeight * heightScale,
        scaleZ: width,
        color: COLOR.setHex(color).multiplyScalar(band).getHex()
      };
      foliage.push(block);
      caps.push({
        ...block,
        y: block.y + block.scaleY / 2 + 0.009,
        scaleX: block.scaleX * 0.88,
        scaleY: 0.014,
        scaleZ: block.scaleZ * 0.88,
        color: COLOR.setHex(color).multiplyScalar(0.96 + normalized * 0.08).getHex()
      });
    }
  }

  addBushRecipe(cell, foliage, caps) {
    const noise = hash2D(cell.gx, cell.gz, WORLD.seed + 887);
    const blocks = noise > 0.68 ? 3 : noise > 0.34 ? 2 : 1;
    const palette = this.resolveTreePalette(cell.gx, cell.gz);
    const baseY = cell.level * WORLD.blockHeight;
    const { x, z } = this.terrain.gridToWorld(cell.gx, cell.gz);

    for (let index = 0; index < blocks; index += 1) {
      const angle = noise * Math.PI * 2 + index * 2.2;
      const offset = index === 0 ? 0 : 0.18;
      const width = (0.42 - index * 0.055) * (0.88 + noise * 0.28);

      const block = {
        x: x + Math.cos(angle) * offset,
        y: baseY + 0.16 + index * 0.075,
        z: z + Math.sin(angle) * offset,
        rotation: angle,
        scaleX: width,
        scaleY: 0.24,
        scaleZ: width * 0.82,
        color: index === blocks - 1 ? palette.tip : palette.base
      };
      foliage.push(block);
      caps.push({
        ...block,
        y: block.y + block.scaleY / 2 + 0.009,
        scaleX: block.scaleX * 0.86,
        scaleY: 0.014,
        scaleZ: block.scaleZ * 0.86
      });
    }
  }

  resolveVariant(variety, forest) {
    if (variety > 0.88) {
      return 'fan';
    }

    if (variety > 0.76) {
      return 'broad';
    }

    if (variety > 0.56) {
      return forest > 0.67 ? 'spire' : 'needle';
    }

    if (variety > 0.39) {
      return 'bent';
    }

    if (variety < 0.17) {
      return 'sapling';
    }

    return 'spire';
  }

  resolveTaperedWidth(variant, normalized) {
    const tapered = Math.pow(normalized, variant.taperPower);
    return variant.baseWidth + (variant.tipWidth - variant.baseWidth) * tapered;
  }

  resolveTreePalette(gx, gz) {
    const region = valueNoise2D(gx, gz, 15, WORLD.seed + 907);
    const index = Math.min(this.profile.treePalettes.length - 1, Math.floor(region * this.profile.treePalettes.length));
    return this.profile.treePalettes[index];
  }

  resolveFamilyColor(family, gx, gz, seedOffset) {
    const palette = this.profile.palette[family];
    const noise = hash2D(gx, gz, WORLD.seed + seedOffset);
    return palette[Math.min(palette.length - 1, Math.floor(noise * palette.length))];
  }

  createMesh(name, blocks, material, castsShadow) {
    if (blocks.length === 0) {
      return null;
    }

    const mesh = new THREE.InstancedMesh(this.geometry, material, blocks.length);
    mesh.name = name;
    mesh.castShadow = castsShadow;
    mesh.receiveShadow = true;

    blocks.forEach((block, index) => {
      POSITION.set(block.x, block.y, block.z);
      QUATERNION.setFromAxisAngle(Y_AXIS, block.rotation);
      SCALE.set(block.scaleX, block.scaleY, block.scaleZ);
      MATRIX.compose(POSITION, QUATERNION, SCALE);
      mesh.setMatrixAt(index, MATRIX);
      mesh.setColorAt(index, COLOR.setHex(block.color));
    });

    mesh.instanceMatrix.needsUpdate = true;
    mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
    return mesh;
  }

  dispose() {
    this.geometry.dispose();
    Object.values(this.materials).forEach((material) => material.dispose());
  }
}
