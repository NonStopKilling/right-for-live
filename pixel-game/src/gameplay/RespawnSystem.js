import { GAMEPLAY } from '../config/gameplay.js';

export class RespawnSystem {
  constructor(player, world, towerSystem, zombieSystem, eventBus, audio) {
    this.player = player;
    this.world = world;
    this.towerSystem = towerSystem;
    this.zombieSystem = zombieSystem;
    this.eventBus = eventBus;
    this.audio = audio;
    this.remaining = 0;
    this.active = false;
    this.unsubscribe = this.eventBus.on('player:died', (event) => this.begin(event));
  }

  begin(event) {
    if (this.active) {
      return;
    }

    this.active = true;
    this.remaining = GAMEPLAY.player.respawnDelay;
    this.eventBus.emit('respawn:started', {
      duration: GAMEPLAY.player.respawnDelay,
      source: event.source,
      checkpointId: this.towerSystem.activeCheckpointId
    });
  }

  update(deltaTime) {
    if (!this.active) {
      return;
    }

    this.remaining = Math.max(0, this.remaining - deltaTime);
    this.eventBus.emit('respawn:tick', this.getSnapshot());

    if (this.remaining === 0) {
      const point = this.towerSystem.getRespawnPoint();
      this.zombieSystem.removeNear(point, 4);
      this.player.respawn(point);
      this.active = false;
      this.audio.play('checkpoint');
      this.eventBus.emit('player:respawned', {
        position: point.clone(),
        checkpointId: this.towerSystem.activeCheckpointId
      });
    }
  }

  getSnapshot() {
    return {
      active: this.active,
      remaining: this.remaining,
      duration: GAMEPLAY.player.respawnDelay
    };
  }

  dispose() {
    this.unsubscribe();
  }
}

