import * as THREE from 'three';
import { GAMEPLAY } from '../config/gameplay.js';

const AIM_PLANE = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const AIM_POINT = new THREE.Vector3();
const FIRE_DIRECTION = new THREE.Vector3();
const FIRE_ORIGIN = new THREE.Vector3();

export class CombatSystem {
  constructor(camera, player, zombieSystem, inventory, eventBus, audio, initialMagazine) {
    this.camera = camera;
    this.player = player;
    this.zombieSystem = zombieSystem;
    this.inventory = inventory;
    this.eventBus = eventBus;
    this.audio = audio;
    this.magazine = Number.isFinite(initialMagazine)
      ? Math.min(GAMEPLAY.weapon.magazineSize, Math.max(0, Math.floor(initialMagazine)))
      : GAMEPLAY.weapon.magazineSize;
    this.fireCooldown = 0;
    this.reloadRemaining = 0;
    this.aimPoint = null;
    this.raycaster = new THREE.Raycaster();
    this.effects = new THREE.Group();
    this.effects.name = 'CombatEffects';
    this.tracers = [];
  }

  addTo(scene) {
    scene.add(this.effects);
  }

  update(deltaTime, input, canFire = true, acceptInput = true) {
    this.fireCooldown = Math.max(0, this.fireCooldown - deltaTime);
    this.updateTracers(deltaTime);
    this.updateAim(input.getPointer());

    if (this.aimPoint) {
      this.player.setAimPoint(this.aimPoint);
    }

    if (!acceptInput) {
      return;
    }

    if (this.reloadRemaining > 0) {
      this.reloadRemaining = Math.max(0, this.reloadRemaining - deltaTime);

      if (this.reloadRemaining === 0) {
        this.finishReload();
      }
    }

    if (input.consumeReload()) {
      this.startReload();
    }

    if (canFire && input.consumePrimaryAction()) {
      this.fire();
    }
  }

  updateAim(pointer) {
    if (!pointer.inside) {
      this.aimPoint = null;
      return;
    }

    this.raycaster.setFromCamera(pointer, this.camera);
    AIM_PLANE.constant = -this.player.position.y;
    this.aimPoint = this.raycaster.ray.intersectPlane(AIM_PLANE, AIM_POINT)
      ? AIM_POINT.clone()
      : null;
  }

  fire() {
    if (this.player.isDead || !this.aimPoint || this.reloadRemaining > 0 || this.fireCooldown > 0) {
      return false;
    }

    if (this.magazine <= 0) {
      this.audio.play('blocked', { cooldownMs: 180 });
      this.eventBus.emit('weapon:blocked', { reason: 'empty' });
      return false;
    }

    this.magazine -= 1;
    this.fireCooldown = GAMEPLAY.weapon.fireInterval;
    FIRE_ORIGIN.copy(this.player.position).add(new THREE.Vector3(0, 0.55, 0));
    FIRE_DIRECTION.set(
      this.aimPoint.x - this.player.position.x,
      0,
      this.aimPoint.z - this.player.position.z
    ).normalize();
    const target = this.zombieSystem.getRayTarget(
      FIRE_ORIGIN,
      FIRE_DIRECTION,
      GAMEPLAY.weapon.range
    );
    const distance = target?.distance ?? GAMEPLAY.weapon.range;
    const end = FIRE_ORIGIN.clone().addScaledVector(FIRE_DIRECTION, distance);
    end.y = this.player.position.y + 0.55;
    this.spawnTracer(FIRE_ORIGIN, end, Boolean(target));

    if (target) {
      this.zombieSystem.damageZombie(target.zombie, GAMEPLAY.weapon.damage, 'player');
    }

    this.audio.playGameEffect('revolver');
    this.eventBus.emit('weapon:fired', {
      magazine: this.magazine,
      reserve: this.inventory.get('ammoReserve'),
      hit: Boolean(target)
    });
    return true;
  }

  startReload() {
    if (
      this.player.isDead ||
      this.reloadRemaining > 0 ||
      this.magazine >= GAMEPLAY.weapon.magazineSize ||
      this.inventory.get('ammoReserve') <= 0
    ) {
      return false;
    }

    this.reloadRemaining = GAMEPLAY.weapon.reloadDuration;
    this.audio.play('start');
    this.eventBus.emit('weapon:reload-started', this.getSnapshot());
    return true;
  }

  finishReload() {
    const needed = GAMEPLAY.weapon.magazineSize - this.magazine;
    const transferred = Math.min(needed, this.inventory.get('ammoReserve'));

    if (transferred > 0) {
      this.inventory.spend({ ammoReserve: transferred }, 'reload');
      this.magazine += transferred;
    }

    this.audio.play('complete');
    this.eventBus.emit('weapon:reloaded', this.getSnapshot());
  }

  spawnTracer(start, end, hit) {
    const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
    const material = new THREE.LineBasicMaterial({
      color: hit ? 0xfff2a6 : 0xe4c86c,
      transparent: true,
      opacity: 1,
      depthTest: false,
      toneMapped: false
    });
    const line = new THREE.Line(geometry, material);
    line.renderOrder = 8;
    this.effects.add(line);
    this.tracers.push({ line, elapsed: 0, duration: 0.09 });
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

  getSnapshot() {
    return {
      magazine: this.magazine,
      magazineSize: GAMEPLAY.weapon.magazineSize,
      reserve: this.inventory.get('ammoReserve'),
      reloading: this.reloadRemaining > 0,
      reloadProgress: this.reloadRemaining > 0
        ? 1 - this.reloadRemaining / GAMEPLAY.weapon.reloadDuration
        : 0
    };
  }

  dispose() {
    this.tracers.forEach(({ line }) => {
      line.geometry.dispose();
      line.material.dispose();
      line.removeFromParent();
    });
    this.tracers.length = 0;
    this.effects.clear();
  }
}
