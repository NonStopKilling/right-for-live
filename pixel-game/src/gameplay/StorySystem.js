import { STORY_STEPS } from '../config/gameplay.js';

export class StorySystem {
  constructor(eventBus, audio, initialStep = 0, showInitialTransmission = true) {
    this.eventBus = eventBus;
    this.audio = audio;
    this.stepIndex = Math.min(STORY_STEPS.length - 1, Math.max(0, initialStep));
    this.transmissionOpen = showInitialTransmission;
    this.unsubscribers = [
      this.eventBus.on('inventory:changed', ({ inventory }) => this.handleInventory(inventory)),
      this.eventBus.on('zombie:killed', () => this.handleZombieKilled()),
      this.eventBus.on('tower:built', () => this.advanceTo('north'))
    ];
  }

  handleInventory(inventory) {
    if (
      this.current.id === 'gather' &&
      inventory.wood >= 4 &&
      inventory.stone >= 3 &&
      inventory.artifact >= 1
    ) {
      this.advanceTo('survive');
    }
  }

  handleZombieKilled() {
    if (this.current.id === 'survive') {
      this.advanceTo('build');
    }
  }

  advanceTo(stepId) {
    const nextIndex = STORY_STEPS.findIndex((step) => step.id === stepId);

    if (nextIndex <= this.stepIndex) {
      return false;
    }

    this.stepIndex = nextIndex;
    this.transmissionOpen = true;
    this.audio.play('notification');
    this.eventBus.emit('story:advanced', this.getSnapshot());
    return true;
  }

  dismiss() {
    if (!this.transmissionOpen) {
      return;
    }

    this.transmissionOpen = false;
    this.audio.play('close');
    this.eventBus.emit('story:changed', this.getSnapshot());
  }

  reopen() {
    this.transmissionOpen = true;
    this.audio.play('open');
    this.eventBus.emit('story:changed', this.getSnapshot());
  }

  get current() {
    return STORY_STEPS[this.stepIndex];
  }

  getSnapshot() {
    return {
      stepIndex: this.stepIndex,
      transmissionOpen: this.transmissionOpen,
      ...this.current
    };
  }

  dispose() {
    this.unsubscribers.forEach((unsubscribe) => unsubscribe());
    this.unsubscribers.length = 0;
  }
}

