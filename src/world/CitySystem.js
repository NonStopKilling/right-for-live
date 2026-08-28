import * as THREE from 'three';
import { DEFAULT_LAB_OPTIONS } from '../config/gameOptions.js';
import { WORLD, hash2D, valueNoise2D } from '../utils/constants.js';

const MATRIX = new THREE.Matrix4();
const QUATERNION = new THREE.Quaternion();
const COLOR = new THREE.Color();
const POSITION = new THREE.Vector3();
const SCALE = new THREE.Vector3();
const Y_AXIS = new THREE.Vector3(0, 1, 0);
const CITY_LIMIT = 52;
const BLOCK_SIZE = 28;
const ROAD_HALF_WIDTH = 3;
const LOT_OFFSET = 7;
const TREE_VARIANTS = {
  spire: { trunkHeight: 0.68, trunkWidth: 0.15, layers: 7, baseWidth: 1.12, tipWidth: 0.13, crownY: 0.56, step: 0.43, slabHeight: 0.16, taperPower: 1.08 },
  needle: { trunkHeight: 0.7, trunkWidth: 0.13, layers: 5, baseWidth: 0.76, tipWidth: 0.1, crownY: 0.57, step: 0.57, slabHeight: 0.18, taperPower: 1 },
  broad: { trunkHeight: 1.15, trunkWidth: 0.23, layers: 6, widths: [1.24, 1.58, 1.4, 1.08, 0.7, 0.34], crownY: 1.02, step: 0.27, slabHeight: 0.18 },
  fan: { trunkHeight: 0.86, trunkWidth: 0.19, layers: 5, widths: [1.52, 1.36, 1.7, 1.12, 0.62], crownY: 0.88, step: 0.23, slabHeight: 0.16 },
  bent: { trunkHeight: 0.74, trunkWidth: 0.16, layers: 6, baseWidth: 1.0, tipWidth: 0.16, crownY: 0.65, step: 0.35, slabHeight: 0.16, taperPower: 0.82, lean: 0.13 },
  sapling: { trunkHeight: 0.4, trunkWidth: 0.1, layers: 3, baseWidth: 0.54, tipWidth: 0.12, crownY: 0.34, step: 0.31, slabHeight: 0.15, taperPower: 1 }
};

export class CitySystem {
  constructor(terrain, profile) {
    this.terrain = terrain;
    this.profile = profile;
    this.options = structuredClone(DEFAULT_LAB_OPTIONS);
    this.group = new THREE.Group();
    this.group.name = 'ProceduralCity';
    this.geometry = new THREE.BoxGeometry(1, 1, 1);
    this.materials = {
      house: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.86, flatShading: true }),
      roof: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.76, flatShading: true }),
      shop: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.74, flatShading: true }),
      fence: new THREE.MeshStandardMaterial({ color: 0xb9ad8b, roughness: 0.9, flatShading: true }),
      wall: new THREE.MeshStandardMaterial({ color: 0x5f5b51, roughness: 0.92, flatShading: true }),
      door: new THREE.MeshStandardMaterial({ color: 0x4b3425, roughness: 0.86, flatShading: true }),
      window: new THREE.MeshBasicMaterial({ color: 0x9fc8b7, toneMapped: false }),
      prop: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.82, flatShading: true }),
      vehicle: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.52, metalness: 0.08, flatShading: true }),
      sign: new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }),
      lampOff: new THREE.MeshStandardMaterial({ color: 0x2d332f, roughness: 0.64, metalness: 0.18, flatShading: true }),
      lampOn: new THREE.MeshBasicMaterial({ color: 0xffe6a0, toneMapped: false }),
      trench: new THREE.MeshStandardMaterial({ color: 0x332719, roughness: 0.96, flatShading: true }),
      crate: new THREE.MeshStandardMaterial({ color: 0x8f6845, roughness: 0.9, flatShading: true }),
      roadLine: new THREE.MeshBasicMaterial({ color: 0xffd86a, toneMapped: false })
    };
  }

  applyOptions(options = {}) {
    this.options = { ...this.options, ...options };
  }

  createChunkGroup(cells, chunkKey, depletedResources = new Set()) {
    const group = new THREE.Group();
    group.name = `CityChunk-${chunkKey}`;

    if (!this.isCityMap()) {
      return group;
    }

    const parts = {
      house: [],
      roof: [],
      shop: [],
      fence: [],
      wall: [],
      door: [],
      window: [],
      prop: [],
      vehicle: [],
      sign: [],
      lampOff: [],
      lampOn: [],
      trench: [],
      crate: [],
      roadLine: []
    };

    for (const cell of cells) {
      if (!this.isInsideCity(cell.gx, cell.gz)) {
        if (this.shouldPlaceHighwayLine(cell)) {
          this.addHighwayLine(cell, parts.roadLine);
        }
        continue;
      }

      if (this.isParkAnchor(cell.gx, cell.gz)) {
        this.addPark(cell, parts);
      } else if (this.isLotAnchor(cell.gx, cell.gz)) {
        this.addResidentialLot(cell, parts);
      }

      if (this.isShopAnchor(cell.gx, cell.gz)) {
        this.addShop(cell, parts);
      }

      if (this.shouldPlaceVehicle(cell)) {
        this.addVehicle(cell, parts);
      }

      if (this.shouldPlaceLamp(cell)) {
        this.addLamp(cell, parts);
      }

      if (this.shouldPlaceTrench(cell)) {
        this.addTrench(cell, parts.trench);
      }

      if (this.shouldPlaceResourceCrate(cell) && !depletedResources.has(this.getResourceId(cell))) {
        this.addCrate(cell, parts.crate);
      }

      if (this.shouldPlaceParkResource(cell) && !depletedResources.has(this.getResourceId(cell))) {
        this.addParkResource(cell, parts);
      }

      if (this.shouldPlaceCityWall(cell)) {
        this.addCityWall(cell, parts.wall);
      }
    }

    Object.entries(parts).forEach(([name, blocks]) => {
      const mesh = this.createMesh(`City${capitalize(name)}`, blocks, this.materials[name], name !== 'sign' && name !== 'lampOn' && name !== 'roadLine');

      if (mesh) {
        group.add(mesh);
      }
    });

    return group;
  }

  getResourceNodes(cells) {
    if (!this.isCityMap()) {
      return [];
    }

    return cells.filter((cell) => this.shouldPlaceResourceCrate(cell) || this.shouldPlaceParkResource(cell)).map((cell) => {
      const { x, z } = this.terrain.gridToWorld(cell.gx, cell.gz);
      return {
        id: this.getResourceId(cell),
        type: this.shouldPlaceParkResource(cell)
          ? (hash2D(cell.gx, cell.gz, this.seed(4211)) > 0.48 ? 'wood' : 'stone')
          : (hash2D(cell.gx, cell.gz, this.seed(4211)) > 0.58 ? 'stone' : 'artifact'),
        layer: 'city',
        label: 'SUMINISTRO',
        gx: cell.gx,
        gz: cell.gz,
        x,
        y: cell.level * WORLD.blockHeight,
        z
      };
    });
  }

  isCityMap() {
    return this.options.mapMode === 'city';
  }

  isRoad(gx, gz) {
    return this.isInsideCity(gx, gz) && (
      Math.abs(modCentered(gx, BLOCK_SIZE)) <= ROAD_HALF_WIDTH ||
      Math.abs(modCentered(gz, BLOCK_SIZE)) <= ROAD_HALF_WIDTH ||
      Math.abs(gx) <= ROAD_HALF_WIDTH ||
      Math.abs(gz) <= ROAD_HALF_WIDTH
    );
  }

  isInsideCity(gx, gz) {
    return Math.abs(gx) <= CITY_LIMIT && Math.abs(gz) <= CITY_LIMIT;
  }

  isCityCoreWorld(x, z) {
    if (!this.isCityMap()) {
      return false;
    }

    const { gx, gz } = this.terrain.worldToGrid(x, z);
    return this.isInsideCity(gx, gz);
  }

  resolveDistrict(gx, gz) {
    const districtX = Math.floor((gx + BLOCK_SIZE / 2) / BLOCK_SIZE);
    const districtZ = Math.floor((gz + BLOCK_SIZE / 2) / BLOCK_SIZE);
    const localX = Math.round(modCentered(gx, BLOCK_SIZE));
    const localZ = Math.round(modCentered(gz, BLOCK_SIZE));
    const pickX = hash2D(districtX, districtZ, this.seed(4001)) > 0.5 ? LOT_OFFSET : -LOT_OFFSET;
    const pickZ = hash2D(districtZ, districtX, this.seed(4003)) > 0.5 ? LOT_OFFSET : -LOT_OFFSET;
    return { x: districtX, z: districtZ, localX, localZ, anchorX: pickX, anchorZ: pickZ };
  }

  isLotAnchor(gx, gz) {
    if (Math.abs(gx) < LOT_OFFSET || Math.abs(gz) < LOT_OFFSET || this.isRoad(gx, gz)) {
      return false;
    }

    const district = this.resolveDistrict(gx, gz);
    const density = hash2D(district.x, district.z, this.seed(4007));
    const cityDensity = Math.max(0, Number(this.options.cityDensity) / 100);
    if (cityDensity <= 0 || density <= 1 - 0.46 * cityDensity) {
      return false;
    }

    return district.localX === district.anchorX && district.localZ === district.anchorZ;
  }

  isParkAnchor(gx, gz) {
    const district = this.resolveDistrict(gx, gz);
    const density = hash2D(district.x, district.z, this.seed(4007));
    const cityDensity = Math.max(0, Number(this.options.cityDensity) / 100);
    return density <= 0.52 + (1 - cityDensity) * 0.22 && district.localX === -district.anchorX && district.localZ === -district.anchorZ;
  }

  isShopAnchor(gx, gz) {
    const nearRoad = Math.abs(modCentered(gx, BLOCK_SIZE)) === ROAD_HALF_WIDTH + 2 ||
      Math.abs(modCentered(gz, BLOCK_SIZE)) === ROAD_HALF_WIDTH + 2;
    return nearRoad &&
      Math.abs(gx) > 12 &&
      Math.abs(gz) > 12 &&
      hash2D(gx, gz, this.seed(4011)) > 0.988 &&
      !this.isRoad(gx, gz);
  }

  shouldPlaceVehicle(cell) {
    if (!this.isInsideCity(cell.gx, cell.gz)) {
      return false;
    }

    const roadX = Math.abs(modCentered(cell.gx, BLOCK_SIZE)) <= ROAD_HALF_WIDTH || Math.abs(cell.gx) <= ROAD_HALF_WIDTH;
    const roadZ = Math.abs(modCentered(cell.gz, BLOCK_SIZE)) <= ROAD_HALF_WIDTH || Math.abs(cell.gz) <= ROAD_HALF_WIDTH;
    const density = Math.max(0, Number(this.options.cityVehicleDensity) / 100);
    return roadX !== roadZ &&
      density > 0 &&
      Math.hypot(cell.gx, cell.gz) > 8 &&
      hash2D(cell.gx, cell.gz, this.seed(4101)) > 1 - 0.004 * density;
  }

  shouldPlaceLamp(cell) {
    return this.isInsideCity(cell.gx, cell.gz) &&
      this.isRoad(cell.gx, cell.gz) &&
      Math.abs(cell.gx % 7) === 0 &&
      Math.abs(cell.gz % 7) === 0 &&
      hash2D(cell.gx, cell.gz, this.seed(4113)) > 0.42;
  }

  shouldPlaceTrench(cell) {
    const density = Math.max(0, Number(this.options.cityTrenchDensity) / 100);
    const ring = Math.abs(Math.hypot(cell.gx, cell.gz) - 18) < 1.15;
    return density > 0 && ring && !this.isRoad(cell.gx, cell.gz) && hash2D(cell.gx, cell.gz, this.seed(4121)) > 1 - 0.64 * density;
  }

  shouldPlaceResourceCrate(cell) {
    const density = Math.max(0, Number(this.options.cityResourceDensity) / 100);
    return density > 0 && this.isRoad(cell.gx, cell.gz) && hash2D(cell.gx, cell.gz, this.seed(4301)) > 1 - 0.008 * density;
  }

  shouldPlaceParkResource(cell) {
    if (!this.isInsideCity(cell.gx, cell.gz)) {
      return false;
    }

    const density = Math.max(0, Number(this.options.cityResourceDensity) / 100);
    const blockX = Math.floor((cell.gx + BLOCK_SIZE / 2) / BLOCK_SIZE);
    const blockZ = Math.floor((cell.gz + BLOCK_SIZE / 2) / BLOCK_SIZE);
    const centerX = blockX * BLOCK_SIZE + LOT_OFFSET * Math.sign(blockX || 1);
    const centerZ = blockZ * BLOCK_SIZE + LOT_OFFSET * Math.sign(blockZ || 1);
    const nearPark = Math.hypot(cell.gx - centerX, cell.gz - centerZ) <= 4;
    return density > 0 && nearPark && !this.isRoad(cell.gx, cell.gz) && hash2D(cell.gx, cell.gz, this.seed(4321)) > 1 - 0.1 * density;
  }

  shouldPlaceHighwayLine(cell) {
    return Math.abs(cell.gx) === 0 && Math.abs(cell.gz) > CITY_LIMIT + 2 && Math.abs(cell.gz % 8) <= 2;
  }

  shouldPlaceCityWall(cell) {
    const atWall = Math.abs(Math.abs(cell.gx) - CITY_LIMIT) <= 1 || Math.abs(Math.abs(cell.gz) - CITY_LIMIT) <= 1;
    const roadGate = this.isRoad(cell.gx, cell.gz) && (Math.abs(cell.gx) > CITY_LIMIT - 3 || Math.abs(cell.gz) > CITY_LIMIT - 3);
    return atWall && !roadGate;
  }

  getResourceId(cell) {
    return `city:${cell.gx}:${cell.gz}`;
  }

  addResidentialLot(cell, parts) {
    const { x, z } = this.terrain.gridToWorld(cell.gx, cell.gz);
    const baseY = cell.level * WORLD.blockHeight;
    const rot = this.resolveLotRotation(cell.gx, cell.gz);
    const houseColor = this.resolveHouseColor(cell);
    const roofColor = this.resolveRoofColor(cell);
    const width = 3.8 + hash2D(cell.gx, cell.gz, this.seed(4027)) * 0.75;
    const depth = 3.1 + hash2D(cell.gz, cell.gx, this.seed(4033)) * 0.7;
    const height = 1.55 + hash2D(cell.gx, -cell.gz, this.seed(4039)) * 0.42;
    const front = directionFromRotation(rot);
    const side = { x: front.z, z: -front.x };

    parts.house.push(block(x, baseY + height / 2, z, width, height, depth, houseColor, rot));
    parts.roof.push(block(x, baseY + height + 0.22, z, width + 0.42, 0.42, depth + 0.42, roofColor, rot));
    parts.roof.push(block(x, baseY + height + 0.55, z, width * 0.58, 0.24, depth + 0.7, shade(roofColor, cell.gz, cell.gx), rot));
    parts.door.push(block(x + front.x * (depth / 2 + 0.035), baseY + 0.42, z + front.z * (depth / 2 + 0.035), 0.42, 0.72, 0.07, 0x4b3425, rot));
    parts.window.push(block(x + side.x * 1.05 + front.x * (depth / 2 + 0.04), baseY + 0.88, z + side.z * 1.05 + front.z * (depth / 2 + 0.04), 0.44, 0.34, 0.06, 0x8fc4b8, rot));
    parts.window.push(block(x - side.x * 1.05 + front.x * (depth / 2 + 0.04), baseY + 0.88, z - side.z * 1.05 + front.z * (depth / 2 + 0.04), 0.44, 0.34, 0.06, 0x8fc4b8, rot));
    parts.prop.push(block(x + front.x * 2.2, baseY + 0.06, z + front.z * 2.2, 1.1, 0.12, 0.9, 0x6f6a5d, rot));

    this.addFenceRing(x, z, baseY, 7.8, 6.9, parts.fence);
    this.addYardTree(x - side.x * 2.6 - front.x * 1.35, z - side.z * 2.6 - front.z * 1.35, baseY, parts.prop, parts.fence, cell);

    if (hash2D(cell.gx, cell.gz, this.seed(4047)) > 0.62) {
      parts.prop.push(block(x - side.x * 1.35 - front.x * 0.8, baseY + height + 0.62, z - side.z * 1.35 - front.z * 0.8, 0.38, 0.78, 0.38, 0x40382f));
    }
  }

  addShop(cell, parts) {
    const { x, z } = this.terrain.gridToWorld(cell.gx, cell.gz);
    const baseY = cell.level * WORLD.blockHeight;
    const rot = Math.abs(modCentered(cell.gx, BLOCK_SIZE)) <= ROAD_HALF_WIDTH + 2 ? Math.PI / 2 : 0;
    const width = 4.2;
    const depth = 2.9;
    const height = 1.55;

    parts.shop.push(block(x, baseY + height / 2, z, width, height, depth, this.resolveShopColor(cell), rot));
    parts.roof.push(block(x, baseY + height + 0.13, z, width + 0.18, 0.24, depth + 0.16, 0x363a34, rot));
    parts.door.push(block(x, baseY + 0.46, z - 1.48, 0.58, 0.82, 0.07, 0x3d2d23, rot));
    parts.window.push(block(x - 1.25, baseY + 0.9, z - 1.5, 0.58, 0.38, 0.06, 0x9fc8b7, rot));
    parts.window.push(block(x + 1.25, baseY + 0.9, z - 1.5, 0.58, 0.38, 0.06, 0x9fc8b7, rot));
    parts.sign.push(block(x, baseY + height + 0.38, z - 1.52, 1.9, 0.34, 0.055, this.resolveSignColor(cell), rot));
    parts.prop.push(block(x - 1.45, baseY + 0.18, z - 2.0, 0.38, 0.36, 0.38, 0x4b4a42));
    parts.prop.push(block(x + 1.45, baseY + 0.18, z - 2.0, 0.38, 0.36, 0.38, 0x4b4a42));
  }

  addPark(cell, parts) {
    const { x, z } = this.terrain.gridToWorld(cell.gx, cell.gz);
    const baseY = cell.level * WORLD.blockHeight;

    parts.fence.push(block(x, baseY + 0.04, z, 5.8, 0.08, 5.8, 0x50673c));
    this.addYardTree(x - 1.9, z - 1.35, baseY, parts.prop, parts.fence, cell);
    this.addYardTree(x + 1.6, z + 1.2, baseY, parts.prop, parts.fence, cell);
    parts.prop.push(block(x + 0.25, baseY + 0.12, z - 2.15, 1.2, 0.24, 0.36, 0x6f5136));
    parts.prop.push(block(x - 1.1, baseY + 0.16, z + 1.7, 0.52, 0.32, 0.5, 0x8b8c7d));
  }

  addFenceRing(x, z, y, width, depth, fences) {
    for (let index = -2; index <= 2; index += 1) {
      const offsetX = (index / 2) * (width / 2);
      fences.push(block(x + offsetX, y + 0.22, z - depth / 2, 0.48, 0.44, 0.08, 0xb9ad8b));

      if (Math.abs(index) !== 0) {
        fences.push(block(x + offsetX, y + 0.22, z + depth / 2, 0.48, 0.44, 0.08, 0x94896d));
      }
    }

    for (let index = -1; index <= 1; index += 1) {
      const offsetZ = (index / 1) * (depth / 2);
      fences.push(block(x - width / 2, y + 0.22, z + offsetZ, 0.08, 0.44, 0.48, 0x94896d));
      fences.push(block(x + width / 2, y + 0.22, z + offsetZ, 0.08, 0.44, 0.48, 0x94896d));
    }
  }

  addYardTree(x, z, y, props, fences, cell) {
    this.addCityTreeRecipe(x, z, y, props, fences, cell);
  }

  addCityTreeRecipe(x, z, baseY, trunks, foliage, cell) {
    const variety = hash2D(cell.gx, cell.gz, this.seed(811));
    const variant = TREE_VARIANTS[this.resolveTreeVariant(variety, cell.forest)];
    const heightScale = 0.88 + hash2D(cell.gx, cell.gz, this.seed(823)) * 0.5;
    const widthScale = 0.86 + hash2D(cell.gz, cell.gx, this.seed(829)) * 0.3;
    const rotation = Math.floor(variety * 8) * (Math.PI / 4);
    const palette = this.resolveTreePalette(cell.gx, cell.gz);
    const trunkColor = this.resolveFamilyColor('trunk', cell.gx, cell.gz, 839);

    trunks.push(block(
      x,
      baseY + (variant.trunkHeight * heightScale) / 2,
      z,
      variant.trunkWidth * widthScale,
      variant.trunkHeight * heightScale,
      variant.trunkWidth * widthScale,
      trunkColor,
      rotation
    ));

    for (let layer = 0; layer < variant.layers; layer += 1) {
      const normalized = layer / Math.max(1, variant.layers - 1);
      const width = variant.widths
        ? variant.widths[layer] * widthScale
        : this.resolveTaperedTreeWidth(variant, normalized) * widthScale;
      const color = layer === variant.layers - 1
        ? palette.tip
        : layer === 0
          ? palette.shade
          : palette.base;
      foliage.push(block(
        x + (variant.lean ?? 0) * normalized * Math.cos(rotation),
        baseY + (variant.crownY + layer * variant.step) * heightScale,
        z + (variant.lean ?? 0) * normalized * Math.sin(rotation),
        width,
        variant.slabHeight * heightScale,
        width,
        COLOR.setHex(color).multiplyScalar(layer % 2 === 0 ? 1.04 : 0.96).getHex(),
        rotation
      ));
    }
  }

  addVehicle(cell, parts) {
    const { x, z } = this.terrain.gridToWorld(cell.gx, cell.gz);
    const variant = Math.floor(hash2D(cell.gx, cell.gz, this.seed(4111)) * 3);
    const palette = [0x9f3f37, 0x3f6f9a, 0xc7ad4e, 0x5b8a61, 0xd0c7aa];
    const color = palette[Math.floor(hash2D(cell.gz, cell.gx, this.seed(4117)) * palette.length)];
    const rotation = Math.abs(cell.gx % BLOCK_SIZE) <= 1 ? Math.PI / 2 : 0;
    const baseY = cell.level * WORLD.blockHeight;
    const length = [1.9, 1.62, 2.3][variant];
    const width = [0.88, 0.98, 0.98][variant];
    const bodyHeight = [0.42, 0.48, 0.5][variant];
    const cabinOffset = variant === 2 ? -0.28 : 0.08;
    const addPart = (offsetX, offsetZ, y, scaleX, scaleY, scaleZ, partColor) => {
      const [partX, partZ] = offsetBlock(x, z, offsetX, offsetZ, rotation);
      parts.vehicle.push(block(partX, y, partZ, scaleX, scaleY, scaleZ, partColor, rotation));
    };

    addPart(0, 0, baseY + bodyHeight / 2 + 0.08, length, bodyHeight, width, color);
    addPart(0, cabinOffset, baseY + bodyHeight + 0.32, length * 0.44, 0.42, width * 0.78, shade(color, cell.gz, cell.gx));
    addPart(length * 0.1, cabinOffset + width * 0.41, baseY + bodyHeight + 0.36, length * 0.28, 0.23, 0.055, 0x8fc4b8);
    addPart(length * -0.42, -width * 0.52, baseY + 0.18, 0.28, 0.28, 0.18, 0x171713);
    addPart(length * 0.42, -width * 0.52, baseY + 0.18, 0.28, 0.28, 0.18, 0x171713);
    addPart(length * -0.42, width * 0.52, baseY + 0.18, 0.28, 0.28, 0.18, 0x171713);
    addPart(length * 0.42, width * 0.52, baseY + 0.18, 0.28, 0.28, 0.18, 0x171713);
  }

  addLamp(cell, parts) {
    const { x, z } = this.terrain.gridToWorld(cell.gx, cell.gz);
    const baseY = cell.level * WORLD.blockHeight;
    const isOn = hash2D(cell.gx, cell.gz, this.seed(4191)) > 0.72;

    parts.lampOff.push(block(x + 0.32, baseY + 0.58, z + 0.32, 0.08, 1.16, 0.08, 0x2d332f));
    parts[isOn ? 'lampOn' : 'lampOff'].push(block(x + 0.32, baseY + 1.2, z + 0.32, 0.22, 0.16, 0.22, isOn ? 0xffe6a0 : 0x34352f));
  }

  addTrench(cell, trenches) {
    const { x, z } = this.terrain.gridToWorld(cell.gx, cell.gz);

    trenches.push(block(
      x,
      cell.level * WORLD.blockHeight + 0.05,
      z,
      1.05,
      0.1,
      0.34,
      0x332719,
      hash2D(cell.gx, cell.gz, this.seed(4141)) > 0.5 ? Math.PI / 2 : 0
    ));
  }

  addHighwayLine(cell, lines) {
    const { x, z } = this.terrain.gridToWorld(cell.gx, cell.gz);
    lines.push(block(x, cell.level * WORLD.blockHeight + 0.018, z, 0.16, 0.018, 0.64, 0xffd86a));
  }

  addCrate(cell, crates) {
    const { x, z } = this.terrain.gridToWorld(cell.gx, cell.gz);
    crates.push(block(
      x,
      cell.level * WORLD.blockHeight + 0.16,
      z,
      0.34,
      0.28,
      0.34,
      hash2D(cell.gx, cell.gz, this.seed(4317)) > 0.58 ? 0x8b765a : 0x4a8f82,
      hash2D(cell.gx, cell.gz, this.seed(4311)) * Math.PI
    ));
  }

  addParkResource(cell, parts) {
    const { x, z } = this.terrain.gridToWorld(cell.gx, cell.gz);
    const baseY = cell.level * WORLD.blockHeight;
    const isTree = hash2D(cell.gx, cell.gz, this.seed(4211)) > 0.48;

    if (isTree) {
      this.addCityTreeRecipe(x, z, baseY, parts.prop, parts.fence, cell);
      return;
    }

    parts.prop.push(block(
      x,
      baseY + 0.18,
      z,
      0.62,
      0.36,
      0.56,
      shade(0x8b8c7d, cell.gx, cell.gz),
      hash2D(cell.gx, cell.gz, this.seed(4217)) * Math.PI
    ));
  }

  addCityWall(cell, walls) {
    const { x, z } = this.terrain.gridToWorld(cell.gx, cell.gz);
    walls.push(block(x, cell.level * WORLD.blockHeight + 0.38, z, 0.78, 0.76, 0.78, 0x555149));
  }

  isBlockedWorld(x, z) {
    if (!this.isCityMap()) {
      return false;
    }

    const { gx, gz } = this.terrain.worldToGrid(x, z);

    if (this.shouldPlaceCityWall({ gx, gz })) {
      return true;
    }

    for (let dz = -1; dz <= 1; dz += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        if (this.shouldPlaceVehicle({ gx: gx + dx, gz: gz + dz })) {
          return true;
        }
      }
    }

    for (let blockZ = Math.floor((gz - BLOCK_SIZE) / BLOCK_SIZE); blockZ <= Math.floor((gz + BLOCK_SIZE) / BLOCK_SIZE); blockZ += 1) {
      for (let blockX = Math.floor((gx - BLOCK_SIZE) / BLOCK_SIZE); blockX <= Math.floor((gx + BLOCK_SIZE) / BLOCK_SIZE); blockX += 1) {
        const anchors = [
          { gx: blockX * BLOCK_SIZE + LOT_OFFSET, gz: blockZ * BLOCK_SIZE + LOT_OFFSET },
          { gx: blockX * BLOCK_SIZE - LOT_OFFSET, gz: blockZ * BLOCK_SIZE + LOT_OFFSET },
          { gx: blockX * BLOCK_SIZE + LOT_OFFSET, gz: blockZ * BLOCK_SIZE - LOT_OFFSET },
          { gx: blockX * BLOCK_SIZE - LOT_OFFSET, gz: blockZ * BLOCK_SIZE - LOT_OFFSET }
        ];

        if (anchors.some((anchor) => this.isLotAnchor(anchor.gx, anchor.gz) && this.isInsideHouse(gx, gz, anchor))) {
          return true;
        }
      }
    }

    return false;
  }

  getBuildSurfaceAtWorld(x, z) {
    if (!this.isCityMap()) {
      return null;
    }

    const { gx, gz } = this.terrain.worldToGrid(x, z);

    for (let blockZ = Math.floor((gz - BLOCK_SIZE) / BLOCK_SIZE); blockZ <= Math.floor((gz + BLOCK_SIZE) / BLOCK_SIZE); blockZ += 1) {
      for (let blockX = Math.floor((gx - BLOCK_SIZE) / BLOCK_SIZE); blockX <= Math.floor((gx + BLOCK_SIZE) / BLOCK_SIZE); blockX += 1) {
        const anchors = [
          { gx: blockX * BLOCK_SIZE + LOT_OFFSET, gz: blockZ * BLOCK_SIZE + LOT_OFFSET },
          { gx: blockX * BLOCK_SIZE - LOT_OFFSET, gz: blockZ * BLOCK_SIZE + LOT_OFFSET },
          { gx: blockX * BLOCK_SIZE + LOT_OFFSET, gz: blockZ * BLOCK_SIZE - LOT_OFFSET },
          { gx: blockX * BLOCK_SIZE - LOT_OFFSET, gz: blockZ * BLOCK_SIZE - LOT_OFFSET }
        ];

        const anchor = anchors.find((candidate) =>
          this.isLotAnchor(candidate.gx, candidate.gz) && this.isInsideHouse(gx, gz, candidate)
        );

        if (anchor) {
          const base = this.terrain.getHeightAtGrid(anchor.gx, anchor.gz);
          return { y: base + 1.9, kind: 'roof' };
        }
      }
    }

    return null;
  }

  isSightBlockedWorld(start, end) {
    if (!this.isCityMap()) {
      return false;
    }

    const dx = end.x - start.x;
    const dz = end.z - start.z;
    const distance = Math.hypot(dx, dz);
    const steps = Math.max(2, Math.ceil(distance / 0.58));

    for (let index = 2; index < steps - 1; index += 1) {
      const ratio = index / steps;
      const x = start.x + dx * ratio;
      const z = start.z + dz * ratio;

      if (this.isBlockedWorld(x, z)) {
        return true;
      }
    }

    return false;
  }

  isInsideHouse(gx, gz, anchor) {
    const dx = Math.abs(gx - anchor.gx);
    const dz = Math.abs(gz - anchor.gz);
    return dx <= 2 && dz <= 2;
  }

  resolveLotRotation(gx, gz) {
    if (Math.abs(modCentered(gx, BLOCK_SIZE)) > Math.abs(modCentered(gz, BLOCK_SIZE))) {
      return gx > 0 ? -Math.PI / 2 : Math.PI / 2;
    }

    return gz > 0 ? Math.PI : 0;
  }

  resolveHouseColor(cell) {
    const palette = [
      this.profile.palette.stone[0],
      this.profile.palette.stone[1],
      this.profile.palette.soil[0],
      this.profile.palette.moss[0]
    ];
    return shade(palette[Math.floor(hash2D(cell.gx, cell.gz, this.seed(4051)) * palette.length)], cell.gx, cell.gz);
  }

  resolveRoofColor(cell) {
    const palette = [this.profile.palette.soil[3], 0x4f5556, 0x463d32, 0x35423a];
    return shade(palette[Math.floor(hash2D(cell.gx, cell.gz, this.seed(4053)) * palette.length)], cell.gx, cell.gz);
  }

  resolveShopColor(cell) {
    const palette = [this.profile.palette.stone[1], this.profile.palette.soil[1], this.profile.palette.moss[1], 0x5f8799];
    return shade(palette[Math.floor(hash2D(cell.gx, cell.gz, this.seed(4057)) * palette.length)], cell.gx, cell.gz);
  }

  resolveSignColor(cell) {
    const palette = [0xf0d35d, 0x73d6c6, 0xe66b54, 0xf5f0c4];
    return palette[Math.floor(hash2D(cell.gx, cell.gz, this.seed(4061)) * palette.length)];
  }

  resolveTreeColor(cell) {
    const palette = [0x516f3e, 0x738747, 0x9a8250, 0x3f6551];
    return shade(palette[Math.floor(hash2D(cell.gx, cell.gz, this.seed(4067)) * palette.length)], cell.gx, cell.gz);
  }

  resolveTreeVariant(variety, forest) {
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

  resolveTaperedTreeWidth(variant, normalized) {
    return variant.baseWidth + (variant.tipWidth - variant.baseWidth) * Math.pow(normalized, variant.taperPower);
  }

  resolveTreePalette(gx, gz) {
    const region = valueNoise2D(gx, gz, 15, this.seed(907));
    const variety = Math.max(0, Math.min(1, Number(this.options.treeColorVariety) / 100));
    const paletteCount = Math.max(1, Math.ceil(this.profile.treePalettes.length * variety));
    const index = Math.min(paletteCount - 1, Math.floor(region * paletteCount));
    return this.profile.treePalettes[index];
  }

  resolveFamilyColor(family, gx, gz, seedOffset) {
    const palette = this.profile.palette[family];
    const noise = hash2D(gx, gz, this.seed(seedOffset));
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

    blocks.forEach((item, index) => {
      POSITION.set(item.x, item.y, item.z);
      QUATERNION.setFromAxisAngle(Y_AXIS, item.rotation);
      SCALE.set(item.scaleX, item.scaleY, item.scaleZ);
      MATRIX.compose(POSITION, QUATERNION, SCALE);
      mesh.setMatrixAt(index, MATRIX);
      mesh.setColorAt(index, COLOR.setHex(item.color));
    });

    mesh.instanceMatrix.needsUpdate = true;
    mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
    return mesh;
  }

  seed(offset) {
    return WORLD.seed + Math.floor(Number(this.options.seedOffset) || 0) + offset;
  }

  dispose() {
    this.geometry.dispose();
    Object.values(this.materials).forEach((material) => material.dispose());
    this.group.clear();
  }
}

function block(x, y, z, scaleX, scaleY, scaleZ, color, rotation = 0) {
  return { x, y, z, scaleX, scaleY, scaleZ, color, rotation };
}

function shade(hex, gx, gz) {
  const factor = 0.84 + hash2D(gx, gz, WORLD.seed + 4099) * 0.2;
  return COLOR.setHex(hex).multiplyScalar(factor).getHex();
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function modCentered(value, size) {
  return ((value % size) + size + size / 2) % size - size / 2;
}

function offsetBlock(x, z, offsetX, offsetZ, rotation) {
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  return [
    x + offsetX * cos + offsetZ * sin,
    z - offsetX * sin + offsetZ * cos
  ];
}

function directionFromRotation(rotation) {
  return {
    x: Math.sin(rotation),
    z: Math.cos(rotation)
  };
}
