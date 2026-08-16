import { GAMEPLAY } from '../config/gameplay.js';
import { hash2D } from '../utils/constants.js';

export class ResourceSystem {
  constructor(world, inventory, eventBus, audio) {
    this.world = world;
    this.inventory = inventory;
    this.eventBus = eventBus;
    this.audio = audio;
    this.target = null;
    this.progress = 0;
    this.progressStep = -1;
  }

  update(deltaTime, playerPosition, input, isBlocked = false) {
    if (isBlocked) {
      this.resetProgress();
      return;
    }

    const nextTarget = this.world.findNearestResource(playerPosition, GAMEPLAY.interactRange);

    if (nextTarget?.id !== this.target?.id) {
      this.target = nextTarget;
      this.progress = 0;
      this.progressStep = -1;
      this.emitState();
    }

    if (!this.target || !input.isInteractHeld()) {
      if (this.progress > 0) {
        this.progress = 0;
        this.progressStep = -1;
        this.emitState();
      }
      return;
    }

    const recipe = GAMEPLAY.harvest[this.target.type];
    this.progress = Math.min(1, this.progress + deltaTime / recipe.duration);
    const nextStep = Math.floor(this.progress * 4);

    if (nextStep > this.progressStep && nextStep < 4) {
      this.progressStep = nextStep;
      this.audio.play('progress-step', { cooldownMs: 120 });
    }

    this.emitState();

    if (this.progress >= 1) {
      this.completeHarvest(recipe);
    }
  }

  completeHarvest(recipe) {
    const target = this.target;
    const span = recipe.maxYield - recipe.minYield + 1;
    const noise = hash2D(target.gx, target.gz, 1301 + target.type.length * 37);
    const amount = recipe.minYield + Math.floor(noise * span);

    this.world.depleteResource(target.id);
    this.inventory.add(target.type, amount, 'harvest');
    this.eventBus.emit('resource:harvested', { resource: target, amount });
    this.audio.play('complete');
    this.target = null;
    this.progress = 0;
    this.progressStep = -1;
    this.emitState();
  }

  getSnapshot() {
    return {
      target: this.target ? { ...this.target } : null,
      progress: this.progress
    };
  }

  resetProgress() {
    const changed = this.target !== null || this.progress > 0;
    this.target = null;
    this.progress = 0;
    this.progressStep = -1;

    if (changed) {
      this.emitState();
    }
  }

  emitState() {
    this.eventBus.emit('resource:target', this.getSnapshot());
  }
}

