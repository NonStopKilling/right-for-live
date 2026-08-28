const XP_PER_LEVEL = 1000;

export class PlayerProgressionSystem {
  constructor(player, inventory, eventBus) {
    this.player = player;
    this.inventory = inventory;
    this.eventBus = eventBus;
    this.lastLevel = 1;
    this.snapshot = this.calculate();
    this.apply();
  }

  update() {
    const next = this.calculate();

    if (next.level !== this.lastLevel) {
      this.eventBus.emit('player:leveled', {
        previousLevel: this.lastLevel,
        level: next.level,
        bonuses: next.bonuses
      });
      this.lastLevel = next.level;
    }

    this.snapshot = next;
    this.apply();
  }

  calculate() {
    const experience = this.inventory.get('experience');
    const level = Math.max(1, Math.floor(experience / XP_PER_LEVEL) + 1);
    const bonusSteps = level - 1;

    return {
      level,
      experience,
      nextLevelAt: level * XP_PER_LEVEL,
      progress: (experience % XP_PER_LEVEL) / XP_PER_LEVEL,
      bonuses: {
        maxHealth: bonusSteps * 12,
        fireRate: Math.min(0.32, bonusSteps * 0.035),
        range: bonusSteps * 0.45
      }
    };
  }

  apply() {
    const nextMaxHealth = 100 + this.snapshot.bonuses.maxHealth;
    const previousMaxHealth = this.player.maxHealth;
    this.player.maxHealth = nextMaxHealth;

    if (nextMaxHealth > previousMaxHealth) {
      this.player.health += nextMaxHealth - previousMaxHealth;
    }

    this.player.health = Math.min(this.player.health, this.player.maxHealth);
  }

  getSnapshot() {
    return this.snapshot;
  }
}
