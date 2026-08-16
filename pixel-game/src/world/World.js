import * as THREE from 'three';
import { LandmarkSystem } from './LandmarkSystem.js';
import { PropSystem } from './PropSystem.js';
import { Terrain } from './Terrain.js';
import { TreeSystem } from './TreeSystem.js';

export class World {
  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'World';

    this.terrain = new Terrain();
    this.trees = new TreeSystem(this.terrain);
    this.landmark = new LandmarkSystem(this.terrain);
    this.props = new PropSystem(this.terrain);

    this.group.add(this.terrain.group, this.props.group, this.landmark.group, this.trees.group);
  }

  addTo(scene) {
    scene.add(this.group);
  }

  getSpawnPoint() {
    return this.terrain.getSpawnPoint();
  }

  getHeightAtWorld(x, z) {
    return this.terrain.getHeightAtWorld(x, z);
  }

  isWalkableWorld(x, z) {
    return this.terrain.isWalkableWorld(x, z);
  }

  update(deltaTime) {
    this.landmark.update(deltaTime);
  }

  dispose() {
    this.landmark.dispose();
    this.props.dispose();
    this.trees.dispose();
    this.terrain.dispose();
    this.group.clear();
  }
}
