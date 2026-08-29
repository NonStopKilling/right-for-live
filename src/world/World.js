import * as THREE from 'three';
import { loadGameOptions } from '../config/gameOptions.js';
import { WORLD } from '../utils/constants.js';
import { CitySystem } from './CitySystem.js';
import { LandmarkSystem } from './LandmarkSystem.js';
import { PropSystem } from './PropSystem.js';
import { Terrain } from './Terrain.js';
import { TreeSystem } from './TreeSystem.js';
import { WaterSystem } from './WaterSystem.js';

export class World {
  constructor(profile) {
    this.profile = profile;
    this.group = new THREE.Group();
    this.group.name = 'World';
    this.chunks = new Map();
    this.depletedResources = new Set();
    this.activeChunkX = Number.NaN;
    this.activeChunkZ = Number.NaN;
    this.chunkDebugVisible = false;
    this.chunkBorderGeometry = this.createChunkBorderGeometry();
    this.chunkBorderMaterial = new THREE.LineBasicMaterial({
      color: 0x72e6ff,
      transparent: true,
      opacity: 0.92,
      depthTest: false
    });

    this.terrain = new Terrain(profile);
    this.trees = new TreeSystem(this.terrain, profile);
    this.props = new PropSystem(this.terrain, profile);
    this.water = new WaterSystem(this.terrain, profile);
    this.city = new CitySystem(this.terrain, profile);
    this.landmark = new LandmarkSystem(this.terrain, profile);
    this.options = loadGameOptions().lab;
    this.applyOptions(this.options, { rebuild: false });

    this.group.add(this.landmark.group);
    this.refreshChunks(0, 0);
  }

  addTo(scene) {
    scene.add(this.group);
  }

  getSpawnPoint() {
    return this.terrain.getSpawnPoint();
  }

  getHeightAtWorld(x, z) {
    return this.city.getWalkSurfaceAtWorld(x, z)?.y ?? this.terrain.getHeightAtWorld(x, z);
  }

  isWalkableWorld(x, z) {
    return this.terrain.isWalkableWorld(x, z) && !this.city.isBlockedWorld(x, z);
  }

  getBuildHeightAtWorld(x, z) {
    return this.city.getBuildSurfaceAtWorld(x, z)?.y ?? this.getHeightAtWorld(x, z);
  }

  isCityWorld(x, z) {
    return this.city.isCityCoreWorld(x, z);
  }

  findNearestVehicle(position, range) {
    return this.city.findNearestVehicleWorld(position, range);
  }

  findNearestResource(position, range) {
    const rangeSquared = range * range;
    let nearest = null;
    let nearestDistanceSquared = rangeSquared;

    for (const chunk of this.chunks.values()) {
      for (const resource of chunk.resources) {
        if (this.depletedResources.has(resource.id)) {
          continue;
        }

        const dx = resource.x - position.x;
        const dz = resource.z - position.z;
        const distanceSquared = dx * dx + dz * dz;

        if (distanceSquared <= nearestDistanceSquared) {
          nearest = resource;
          nearestDistanceSquared = distanceSquared;
        }
      }
    }

    return nearest ? { ...nearest, distance: Math.sqrt(nearestDistanceSquared) } : null;
  }

  depleteResource(resourceId) {
    if (this.depletedResources.has(resourceId)) {
      return false;
    }

    this.depletedResources.add(resourceId);

    for (const chunk of this.chunks.values()) {
      const resource = chunk.resources.find((candidate) => candidate.id === resourceId);

      if (resource) {
        this.rebuildChunkLayer(chunk, resource.layer);
        return true;
      }
    }

    return true;
  }

  update(deltaTime, playerPosition) {
    if (this.options.landmarkMotion) {
      this.landmark.update(deltaTime);
    }

    if (!playerPosition) {
      return;
    }

    const { chunkX, chunkZ } = this.terrain.worldToChunk(playerPosition.x, playerPosition.z);

    if (chunkX !== this.activeChunkX || chunkZ !== this.activeChunkZ) {
      this.refreshChunks(chunkX, chunkZ);
    }
  }

  refreshChunks(centerX, centerZ) {
    const required = new Set();
    const pending = [];

    for (let offsetZ = -WORLD.renderDistance; offsetZ <= WORLD.renderDistance; offsetZ += 1) {
      for (let offsetX = -WORLD.renderDistance; offsetX <= WORLD.renderDistance; offsetX += 1) {
        const chunkX = centerX + offsetX;
        const chunkZ = centerZ + offsetZ;
        const key = this.chunkKey(chunkX, chunkZ);
        required.add(key);

        if (!this.chunks.has(key)) {
          pending.push({ chunkX, chunkZ, key, distance: Math.hypot(offsetX, offsetZ) });
        }
      }
    }

    for (const [key, chunk] of this.chunks) {
      if (!required.has(key)) {
        this.releaseChunk(chunk);
        this.chunks.delete(key);
      }
    }

    pending.sort((a, b) => a.distance - b.distance);
    pending.forEach((chunk) => this.createChunk(chunk.chunkX, chunk.chunkZ, chunk.key));
    this.activeChunkX = centerX;
    this.activeChunkZ = centerZ;
  }

  createChunk(chunkX, chunkZ, key = this.chunkKey(chunkX, chunkZ)) {
    const cells = this.terrain.generateChunkCells(chunkX, chunkZ);
    const outsideCityCells = this.options.mapMode === 'city'
      ? cells.filter((cell) => !this.city.isInsideCity(cell.gx, cell.gz))
      : cells;
    const group = new THREE.Group();
    group.name = `WorldChunk-${key}`;
    const layers = {
      terrain: this.terrain.createChunkGroup(cells, key),
      water: this.water.createChunkGroup(cells, key),
      city: this.city.createChunkGroup(cells, key, this.depletedResources),
      vegetation: this.options.mapMode === 'city'
        ? this.trees.createChunkGroup(outsideCityCells, key, this.depletedResources)
        : this.trees.createChunkGroup(cells, key, this.depletedResources),
      props: this.options.mapMode === 'city'
        ? this.props.createChunkGroup(outsideCityCells, key, this.depletedResources)
        : this.props.createChunkGroup(cells, key, this.depletedResources),
      debug: this.createChunkBorder(chunkX, chunkZ)
    };
    layers.vegetation.name = layers.vegetation.name || `VegetationChunk-${key}`;
    layers.props.name = layers.props.name || `PropsChunk-${key}`;
    const resources = [
      ...(this.options.mapMode === 'city' ? [] : this.trees.getResourceNodes(cells)),
      ...(this.options.mapMode === 'city' ? this.trees.getResourceNodes(outsideCityCells) : []),
      ...(this.options.mapMode === 'city' ? this.props.getResourceNodes(outsideCityCells) : []),
      ...this.city.getResourceNodes(cells)
    ].map((resource) => ({ ...resource, chunkKey: key }));
    group.add(layers.terrain, layers.water, layers.city, layers.vegetation, layers.props, layers.debug);

    this.chunks.set(key, { chunkX, chunkZ, cells, resources, layers, group });
    this.group.add(group);
  }

  rebuildChunkLayer(chunk, layerName) {
    if (layerName !== 'vegetation' && layerName !== 'props' && layerName !== 'city') {
      return;
    }

    const previous = chunk.layers[layerName];
    this.disposeChunkObjects(previous);
    chunk.group.remove(previous);
    previous.clear();

    const outsideCityCells = this.options.mapMode === 'city'
      ? chunk.cells.filter((cell) => !this.city.isInsideCity(cell.gx, cell.gz))
      : chunk.cells;
    const next = layerName === 'vegetation'
      ? this.options.mapMode === 'city'
        ? this.trees.createChunkGroup(outsideCityCells, this.chunkKey(chunk.chunkX, chunk.chunkZ), this.depletedResources)
        : this.trees.createChunkGroup(chunk.cells, this.chunkKey(chunk.chunkX, chunk.chunkZ), this.depletedResources)
      : layerName === 'city'
        ? this.city.createChunkGroup(chunk.cells, this.chunkKey(chunk.chunkX, chunk.chunkZ), this.depletedResources)
        : this.options.mapMode === 'city'
          ? this.props.createChunkGroup(outsideCityCells, this.chunkKey(chunk.chunkX, chunk.chunkZ), this.depletedResources)
          : this.props.createChunkGroup(chunk.cells, this.chunkKey(chunk.chunkX, chunk.chunkZ), this.depletedResources);
    chunk.layers[layerName] = next;
    chunk.group.add(next);
  }

  chunkKey(chunkX, chunkZ) {
    return `${chunkX},${chunkZ}`;
  }

  createChunkBorderGeometry() {
    const size = WORLD.chunkSize * WORLD.cellSize;
    return new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(size, 0, 0),
      new THREE.Vector3(size, 0, size),
      new THREE.Vector3(0, 0, size),
      new THREE.Vector3(0, 0, 0)
    ]);
  }

  createChunkBorder(chunkX, chunkZ) {
    const border = new THREE.Line(this.chunkBorderGeometry, this.chunkBorderMaterial);
    border.name = 'ChunkDebugBorder';
    border.position.set(
      (chunkX * WORLD.chunkSize - 0.5) * WORLD.cellSize,
      WORLD.maxTerrainLevel * WORLD.blockHeight + 0.08,
      (chunkZ * WORLD.chunkSize - 0.5) * WORLD.cellSize
    );
    border.visible = this.chunkDebugVisible;
    border.renderOrder = 10;
    return border;
  }

  toggleChunkDebug() {
    this.setChunkDebugVisible(!this.chunkDebugVisible);
  }

  setChunkDebugVisible(visible) {
    this.chunkDebugVisible = Boolean(visible);

    this.group.traverse((object) => {
      if (object.name === 'ChunkDebugBorder') {
        object.visible = this.chunkDebugVisible;
      }
    });
  }

  applyOptions(options = {}, { rebuild = true, forceRebuild = false } = {}) {
    this.options = { ...this.options, ...options };
    this.terrain.applyOptions(this.options);
    this.trees.applyOptions(this.options);
    this.water.applyOptions(this.options);
    this.city.applyOptions(this.options);
    this.setChunkDebugVisible(this.options.chunkDebug);

    if (rebuild && (this.options.liveRebuild || forceRebuild)) {
      this.rebuildChunks();
    }
  }

  rebuildChunks() {
    const centerX = Number.isFinite(this.activeChunkX) ? this.activeChunkX : 0;
    const centerZ = Number.isFinite(this.activeChunkZ) ? this.activeChunkZ : 0;

    for (const chunk of this.chunks.values()) {
      this.releaseChunk(chunk);
    }

    this.chunks.clear();
    this.activeChunkX = Number.NaN;
    this.activeChunkZ = Number.NaN;
    this.refreshChunks(centerX, centerZ);
  }

  releaseChunk(chunk) {
    this.disposeChunkObjects(chunk.group);
    this.group.remove(chunk.group);
    chunk.group.clear();
  }

  disposeChunkObjects(root) {
    root.traverse((object) => {
      if (object.isInstancedMesh) {
        object.dispose();
      }
    });
  }

  dispose() {
    for (const chunk of this.chunks.values()) {
      this.releaseChunk(chunk);
    }

    this.chunks.clear();
    this.depletedResources.clear();
    this.landmark.dispose();
    this.props.dispose();
    this.trees.dispose();
    this.water.dispose();
    this.city.dispose();
    this.terrain.dispose();
    this.chunkBorderGeometry.dispose();
    this.chunkBorderMaterial.dispose();
    this.group.clear();
  }
}
