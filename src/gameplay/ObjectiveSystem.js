import { GAMEPLAY } from '../config/gameplay.js';

export class ObjectiveSystem {
  constructor(player, eventBus, audio, initialProgress = {}) {
    this.player = player;
    this.eventBus = eventBus;
    this.audio = audio;
    this.targets = GAMEPLAY.northObjective.targets;
    this.targetIndex = Math.min(
      this.targets.length - 1,
      Math.max(0, Math.floor(initialProgress?.targetIndex ?? 0))
    );
    this.bestDistance = sanitizeDistance(initialProgress?.bestDistance);
    this.lastSavedDistance = this.bestDistance;
    this.completedTargetIndex = this.targetIndex - 1;
  }

  update() {
    const distance = this.getCurrentDistance();

    if (distance > this.bestDistance) {
      this.bestDistance = distance;

      if (this.bestDistance - this.lastSavedDistance >= GAMEPLAY.northObjective.saveStep) {
        this.lastSavedDistance = this.bestDistance;
        this.eventBus.emit('objective:north-progress', this.getSnapshot());
      }
    }

    const target = this.targets[this.targetIndex];

    if (this.bestDistance >= target && this.completedTargetIndex < this.targetIndex) {
      const completedTarget = target;
      this.completedTargetIndex = this.targetIndex;
      this.targetIndex = Math.min(this.targets.length - 1, this.targetIndex + 1);
      this.lastSavedDistance = this.bestDistance;
      this.audio.play('notification');
      this.eventBus.emit('objective:north-milestone', {
        ...this.getSnapshot(),
        completedTarget
      });
    }
  }

  getCurrentDistance() {
    return Math.max(0, this.player.position.z * GAMEPLAY.northObjective.direction);
  }

  getSnapshot() {
    const target = this.targets[this.targetIndex];
    const currentDistance = this.getCurrentDistance();
    return {
      id: 'north-progress',
      title: 'SIGUE HACIA EL NORTE',
      hint: `Norte: ${Math.floor(Math.max(currentDistance, this.bestDistance))} / ${target} m`,
      currentDistance,
      bestDistance: this.bestDistance,
      target,
      targetIndex: this.targetIndex,
      complete: this.targetIndex === this.targets.length - 1 && this.bestDistance >= target
    };
  }

  snapshot() {
    return {
      targetIndex: this.targetIndex,
      bestDistance: this.bestDistance
    };
  }
}

function sanitizeDistance(value) {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}
