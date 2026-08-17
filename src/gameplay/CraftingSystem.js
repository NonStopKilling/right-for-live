import { GAMEPLAY } from '../config/gameplay.js';

export class CraftingSystem {
  constructor(player, inventory, eventBus, audio) {
    this.player = player;
    this.inventory = inventory;
    this.eventBus = eventBus;
    this.audio = audio;
  }

  update(input, paused = false) {
    if (paused) {
      input.consumeCraftPotion();
      input.consumeUsePotion();
      return;
    }

    if (input.consumeCraftPotion()) {
      this.craftHealingPotion();
    }

    if (input.consumeUsePotion()) {
      this.useHealingPotion();
    }
  }

  craftHealingPotion() {
    const cost = { artifact: GAMEPLAY.potion.artifactCost };

    if (!this.inventory.spend(cost, 'potion-craft')) {
      this.audio.play('blocked');
      this.eventBus.emit('potion:blocked', { reason: 'resources' });
      return false;
    }

    this.inventory.add('healingPotion', 1, 'potion-craft');
    this.audio.play('complete');
    this.eventBus.emit('potion:crafted', {
      count: this.inventory.get('healingPotion'),
      cost
    });
    return true;
  }

  useHealingPotion() {
    if (this.inventory.get('healingPotion') <= 0) {
      this.audio.play('blocked');
      this.eventBus.emit('potion:blocked', { reason: 'empty' });
      return false;
    }

    if (this.player.health >= this.player.maxHealth) {
      this.audio.play('blocked');
      this.eventBus.emit('potion:blocked', { reason: 'full-health' });
      return false;
    }

    if (!this.inventory.spend({ healingPotion: 1 }, 'potion-use')) {
      return false;
    }

    const healed = this.player.heal(GAMEPLAY.potion.healAmount);
    this.audio.play('reward');
    this.eventBus.emit('player:healed', {
      amount: healed,
      health: this.player.health,
      maxHealth: this.player.maxHealth,
      source: 'healing-potion'
    });
    this.eventBus.emit('potion:used', {
      healed,
      remaining: this.inventory.get('healingPotion')
    });
    return true;
  }
}
