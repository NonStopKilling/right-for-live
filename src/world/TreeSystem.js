import { createPalmFrondGeometry } from './PalmGeometry.js';
import { isIslandLandmark } from './IslandMap.js';
import * as THREE from 'three';
import { DEFAULT_LAB_OPTIONS } from '../config/gameOptions.js';
import { WORLD, hash2D, valueNoise2D } from '../utils/constants.js';

const MATRIX = new THREE.Matrix4();
const EULER = new THREE.Euler();
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
    this.options = structuredClone(DEFAULT_LAB_OPTIONS);
    this.geometry = new THREE.BoxGeometry(1, 1, 1);
    this.palmTrunkGeometry = new THREE.CylinderGeometry(0.43, 0.5, 1, 7);
    this.palmFrondGeometry = createPalmFrondGeometry();
    this.naturalIslandPalettes = profile.treePalettes.map(palette => ({
      base: new THREE.Color(palette.base).lerp(new THREE.Color(0x58784d), 0.66).getHex(),
      shade: new THREE.Color(palette.shade).lerp(new THREE.Color(0x3c573c), 0.66).getHex(),
      tip: new THREE.Color(palette.tip).lerp(new THREE.Color(0x81945a), 0.66).getHex()
    }));
    this.materials = {
      trunk: new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.94,
        metalness: 0,
        flatShading: true
      }),
      foliage: new THREE.MeshStandardMaterial({
        side: THREE.DoubleSide,
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

  applyOptions(options = {}) {
    this.options = { ...this.options, ...options };
  }

  createChunkGroup(cells, chunkKey, depletedResources = new Set()) {
    const group = new THREE.Group();
    group.name = `VegetationChunk-${chunkKey}`;
    const trunks = [];
    const palmTrunks = [];
    const palmLeaves = [];
    const foliage = [];
    const caps = [];

    for (const cell of cells) {
      const isTree = this.shouldPlaceTree(cell);

      if (isTree) {
        if (!depletedResources.has(this.getResourceId(cell))) {
          if (this.isPalm(cell)) this.addPalmRecipe(cell, palmTrunks, palmLeaves);
          else this.addTreeRecipe(cell, trunks, foliage, caps);
        }
      } else if (this.shouldPlaceBush(cell)) {
        this.addBushRecipe(cell, foliage, caps);
      }
    }

    const palms = this.createMesh('PalmTrunks',palmTrunks,this.materials.trunk,true,this.palmTrunkGeometry);
    const fronds = this.createMesh('PalmFronds',palmLeaves,this.materials.foliage,true,this.palmFrondGeometry);
    if (palms) group.add(palms);
    if (fronds) group.add(fronds);
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
        label: this.isPalm(cell) ? 'PALMERA · MADERA' : 'MADERA',
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

  isPalm(cell) {
    return this.terrain.options.mapMode === 'island' &&
      (cell.surface === 'sand' || hash2D(cell.gx, cell.gz, this.seed(2191)) < 0.88);
  }

  shouldPlaceTree(cell) {
    if (this.terrain.options.mapMode === 'island') {
      if (cell.water || isIslandLandmark(cell.gx,cell.gz) ||
          !['meadow','sand','moss','soil'].includes(cell.surface) ||
          Math.hypot(cell.gx - 2, cell.gz + 2) < 8 || this.hasNearbyTrail(cell.gx,cell.gz)) return false;
      const density = Math.max(0, Number(this.options.forestDensity) / 100);
      const score = hash2D(cell.gx,cell.gz,this.seed(701));
      if (density === 0 || score < 1 - Math.min(0.7,density * 0.3)) return false;
      for (let dz = -3; dz <= 3; dz++) for (let dx = -3; dx <= 3; dx++) {
        if ((dx || dz) && hash2D(cell.gx+dx,cell.gz+dz,this.seed(701)) > score) return false;
      }
      return true;
    }
    if (this.options.mapMode === 'island' || this.terrain.options.mapMode === 'island') {
      if (isIslandLandmark(cell.gx, cell.gz)) return false;
    }
    if (cell.water || (cell.surface !== 'meadow' && cell.surface !== 'moss' && cell.surface !== 'soil')) {
      return false;
    }

    if (Math.hypot(cell.gx, cell.gz) < WORLD.originClearRadius + 1.5 || this.hasNearbyTrail(cell.gx, cell.gz)) {
      return false;
    }

    const density = hash2D(cell.gx, cell.gz, this.seed(701));
    const distanceFromOrigin = Math.hypot(cell.gx, cell.gz);
    const clearingRingBias = distanceFromOrigin < 24 ? 0.12 : 0;
    const surfaceThreshold = cell.surface === 'moss' ? 0.42 : cell.surface === 'soil' ? 0.5 : 0.49;
    const densityScale = Math.max(0, Number(this.options.forestDensity) / 100);
    const forestThreshold = surfaceThreshold - clearingRingBias + (1 - densityScale) * 0.22;
    const densityThreshold = 0.58 + (1 - densityScale) * 0.2;

    if (densityScale <= 0 || cell.forest < forestThreshold || density < densityThreshold) {
      return false;
    }

    for (let offsetZ = -1; offsetZ <= 1; offsetZ += 1) {
      for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
        if (offsetX === 0 && offsetZ === 0) {
          continue;
        }

        if (hash2D(cell.gx + offsetX, cell.gz + offsetZ, this.seed(701)) > density) {
          return false;
        }
      }
    }

    return true;
  }

  shouldPlaceBush(cell) {
    if (this.options.mapMode === 'island' || this.terrain.options.mapMode === 'island') {
      if (isIslandLandmark(cell.gx, cell.gz)) return false;
    }
    if (cell.water || (cell.surface !== 'meadow' && cell.surface !== 'moss')) {
      return false;
    }

    if (Math.hypot(cell.gx, cell.gz) < WORLD.originClearRadius || this.terrain.isTrail(cell.gx, cell.gz)) {
      return false;
    }

    return hash2D(cell.gx, cell.gz, this.seed(773)) > 0.965;
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

  addPalmRecipe(cell, trunks, foliage) {
    const random = hash2D(cell.gx,cell.gz,this.seed(2201));
    const { x, z } = this.terrain.gridToWorld(cell.gx,cell.gz);
    const ground = cell.level * WORLD.blockHeight;
    const variant = Math.floor(random * 6);
    const height = [4.8, 3.8, 5.8, 4.2, 6.3, 3.5][variant] + random * 0.5;
    const lean = [0.8, 1.65, 0.45, 1.1, 1.9, 0.25][variant];
    const angle = random * Math.PI * 2;
    const palette = this.resolveTreePalette(cell.gx,cell.gz);
    const trunkColor = this.resolveFamilyColor('trunk',cell.gx,cell.gz,839);
    const crown = new THREE.Vector3();
    const start = new THREE.Vector3();
    const end = new THREE.Vector3();
    const direction = new THREE.Vector3();
    const up = new THREE.Vector3(0,1,0);
    for (let i = 0; i < 9; i++) {
      const a = i / 9, b = (i + 1) / 9;
      start.set(x + Math.cos(angle) * lean * a*a, ground + height*a, z + Math.sin(angle) * lean * a*a);
      end.set(x + Math.cos(angle) * lean * b*b, ground + height*b, z + Math.sin(angle) * lean * b*b);
      direction.subVectors(end,start);
      const thickness = (variant === 1 || variant === 4 ? 0.58 : 0.46) * (1 - a*0.35);
      trunks.push({x:(start.x+end.x)/2,y:(start.y+end.y)/2,z:(start.z+end.z)/2,
        scaleX:thickness,scaleY:direction.length()+0.03,scaleZ:thickness,
        quaternion:new THREE.Quaternion().setFromUnitVectors(up,direction.normalize()),
        color:COLOR.setHex(trunkColor).multiplyScalar(i%2 ? 0.92 : 1.06).getHex()});
      crown.copy(end);
    }
    const leaves = variant === 1 || variant === 4 ? 10 : variant === 5 ? 7 : 8;
    for (let i = 0; i < leaves; i++) {
      const a = angle + i * Math.PI * 2 / leaves;
      const size = [1.15,1.25,1.0,0.95,1.42,0.86][variant];
      foliage.push({x:crown.x,y:crown.y,z:crown.z,scaleX:size,scaleY:1,scaleZ:size,
        rotation:-a,tilt:(i%3-1)*0.16, color:i%3 ? palette.base : palette.shade});
    }
    // Young upright leaves break the flat umbrella silhouette.
    for (let i = 0; i < 3; i++) foliage.push({x:crown.x,y:crown.y,z:crown.z,
      scaleX:0.65,scaleY:0.7,scaleZ:0.7,rotation:-angle-i*2.1,tilt:0.8,color:palette.base});
  }

  addTreeRecipe(cell, trunks, foliage, caps) {
    const variety = hash2D(cell.gx, cell.gz, this.seed(811));
    const variantName = this.resolveVariant(variety, cell.forest);
    const variant = TREE_VARIANTS[variantName];
    const heightScale = 0.88 + hash2D(cell.gx, cell.gz, this.seed(823)) * 0.5;
    const widthScale = 0.86 + hash2D(cell.gz, cell.gx, this.seed(829)) * 0.3;
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
    const noise = hash2D(cell.gx, cell.gz, this.seed(887));
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
    const shapeVariety = Math.max(0, Number(this.options.treeShapeVariety) / 100);

    if (shapeVariety <= 0.2) {
      return forest > 0.64 ? 'spire' : 'needle';
    }

    if (shapeVariety <= 0.55 && variety > 0.35) {
      return variety > 0.72 ? 'broad' : 'spire';
    }

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
    const region = valueNoise2D(gx, gz, 15, this.seed(907));
    const variety = Math.max(0, Math.min(1, Number(this.options.treeColorVariety) / 100));
    const paletteCount = Math.max(1, Math.ceil(this.profile.treePalettes.length * variety));
    const index = Math.min(paletteCount - 1, Math.floor(region * paletteCount));
    return this.terrain.options.mapMode === 'island' && this.options.islandNaturalColors
      ? this.naturalIslandPalettes[index] : this.profile.treePalettes[index];
  }

  resolveFamilyColor(family, gx, gz, seedOffset) {
    const palette = this.profile.palette[family];
    const noise = hash2D(gx, gz, this.seed(seedOffset));
    return palette[Math.min(palette.length - 1, Math.floor(noise * palette.length))];
  }

  seed(offset) {
    return WORLD.seed + Math.floor(Number(this.options.seedOffset) || 0) + offset;
  }

  createMesh(name, blocks, material, castsShadow, geometry = this.geometry) {
    if (blocks.length === 0) {
      return null;
    }

    const mesh = new THREE.InstancedMesh(geometry, material, blocks.length);
    mesh.name = name;
    mesh.castShadow = castsShadow;
    mesh.receiveShadow = true;

    blocks.forEach((block, index) => {
      POSITION.set(block.x, block.y, block.z);
      if (block.quaternion) QUATERNION.copy(block.quaternion);
      else QUATERNION.setFromEuler(EULER.set(0, block.rotation, block.tilt ?? 0));
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
    this.palmTrunkGeometry.dispose();
    this.palmFrondGeometry.dispose();
    Object.values(this.materials).forEach((material) => material.dispose());
  }
}
