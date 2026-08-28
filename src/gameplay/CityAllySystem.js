import * as THREE from 'three';
import { DEFAULT_LAB_OPTIONS } from '../config/gameOptions.js';

const ALLY_POINTS = Object.freeze([
  { x: -5.6, z: -4.2 },
  { x: 5.6, z: -4.2 },
  { x: 0, z: 5.6 }
]);

export class CityAllySystem {
  constructor(world, eventBus, audio) {
    this.world = world;
    this.eventBus = eventBus;
    this.audio = audio;
    this.options = structuredClone(DEFAULT_LAB_OPTIONS);
    this.group = new THREE.Group();
    this.group.name = 'CityAllies';
    this.allies = [];
    this.tracers = [];
    this.assets = this.createAssets();
    this.createAllies();
  }

  addTo(scene) {
    scene.add(this.group);
  }

  applyOptions(options = {}) {
    this.options = { ...this.options, ...options };
    this.group.visible = this.options.mapMode === 'city';
  }

  update(deltaTime, zombieSystem) {
    this.updateTracers(deltaTime);

    if (this.options.mapMode !== 'city') {
      return;
    }

    this.allies.forEach((ally) => {
      ally.cooldown = Math.max(0, ally.cooldown - deltaTime);
      const target = zombieSystem.findNearest(ally.position, 7.5);

      if (!target || ally.cooldown > 0) {
        return;
      }

      ally.group.lookAt(target.position.x, ally.position.y, target.position.z);
      ally.cooldown = 0.82;
      this.spawnTracer(ally.position, target.position);
      zombieSystem.damageZombie(target, 18, `ally:${ally.id}`);
      this.eventBus.emit('city:ally-fired', { allyId: ally.id, zombieId: target.id });
    });
  }

  createAllies() {
    ALLY_POINTS.forEach((point, index) => {
      const group = new THREE.Group();
      group.name = `CityAlly-${index}`;
      const y = this.world.getHeightAtWorld(point.x, point.z);
      group.position.set(point.x, y, point.z);
      const legs = new THREE.Mesh(this.assets.legsGeometry, this.assets.darkMaterial);
      legs.position.y = 0.18;
      const body = new THREE.Mesh(this.assets.bodyGeometry, this.assets.bodyMaterial);
      body.position.y = 0.5;
      const head = new THREE.Mesh(this.assets.headGeometry, this.assets.headMaterial);
      head.position.y = 0.82;
      const weapon = new THREE.Mesh(this.assets.weaponGeometry, this.assets.darkMaterial);
      weapon.position.set(0.24, 0.52, 0.22);
      const trench = new THREE.Mesh(this.assets.trenchGeometry, this.assets.trenchMaterial);
      trench.position.set(0, 0.09, 0.42);
      const coverLeft = new THREE.Mesh(this.assets.coverGeometry, this.assets.coverMaterial);
      coverLeft.position.set(-0.38, 0.2, 0.34);
      const coverRight = new THREE.Mesh(this.assets.coverGeometry, this.assets.coverMaterial);
      coverRight.position.set(0.38, 0.2, 0.34);
      group.add(trench, coverLeft, coverRight, legs, body, head, weapon);
      this.group.add(group);
      this.allies.push({
        id: `city-ally-${index}`,
        group,
        position: group.position,
        cooldown: index * 0.24
      });
    });
  }

  spawnTracer(start, end) {
    const geometry = new THREE.BufferGeometry().setFromPoints([
      start.clone().add(new THREE.Vector3(0, 0.64, 0)),
      end.clone().add(new THREE.Vector3(0, 0.48, 0))
    ]);
    const material = new THREE.LineBasicMaterial({
      color: 0x9ff2cf,
      transparent: true,
      opacity: 1,
      depthTest: false,
      toneMapped: false
    });
    const line = new THREE.Line(geometry, material);
    line.renderOrder = 8;
    this.group.add(line);
    this.tracers.push({ line, elapsed: 0, duration: 0.12 });
  }

  updateTracers(deltaTime) {
    for (let index = this.tracers.length - 1; index >= 0; index -= 1) {
      const tracer = this.tracers[index];
      tracer.elapsed += deltaTime;
      tracer.line.material.opacity = Math.max(0, 1 - tracer.elapsed / tracer.duration);

      if (tracer.elapsed >= tracer.duration) {
        tracer.line.geometry.dispose();
        tracer.line.material.dispose();
        tracer.line.removeFromParent();
        this.tracers.splice(index, 1);
      }
    }
  }

  createAssets() {
    return {
      legsGeometry: new THREE.BoxGeometry(0.28, 0.34, 0.22),
      bodyGeometry: new THREE.BoxGeometry(0.34, 0.36, 0.26),
      headGeometry: new THREE.BoxGeometry(0.24, 0.24, 0.24),
      weaponGeometry: new THREE.BoxGeometry(0.1, 0.1, 0.34),
      trenchGeometry: new THREE.BoxGeometry(1.35, 0.18, 0.42),
      coverGeometry: new THREE.BoxGeometry(0.34, 0.32, 0.3),
      bodyMaterial: new THREE.MeshStandardMaterial({ color: 0x6d8d76, roughness: 0.82, flatShading: true }),
      headMaterial: new THREE.MeshStandardMaterial({ color: 0xd1c2a0, roughness: 0.76, flatShading: true }),
      darkMaterial: new THREE.MeshStandardMaterial({ color: 0x28302b, roughness: 0.86, flatShading: true }),
      trenchMaterial: new THREE.MeshStandardMaterial({ color: 0x332719, roughness: 0.96, flatShading: true }),
      coverMaterial: new THREE.MeshStandardMaterial({ color: 0x5a5548, roughness: 0.9, flatShading: true })
    };
  }

  dispose() {
    this.tracers.forEach(({ line }) => {
      line.geometry.dispose();
      line.material.dispose();
      line.removeFromParent();
    });
    Object.values(this.assets).forEach((asset) => asset.dispose?.());
    this.group.clear();
  }
}
