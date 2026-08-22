const DEFAULT_SESSION_ID = 'north-forest-01';
const TICK_RATE = 10;
const STATE = Object.freeze({
  patrol: 'patrol',
  chase: 'chase',
  attack: 'attack',
  flee: 'flee',
  leash: 'leash'
});

export class NpcSystem {
  constructor({ broadcast, now = () => Date.now() } = {}) {
    this.broadcast = broadcast ?? (() => {});
    this.now = now;
    this.sessions = new Map();
    this.interval = null;
    this.lastTick = this.now();
  }

  start() {
    if (this.interval) {
      return;
    }

    this.lastTick = this.now();
    this.interval = setInterval(() => this.tick(), 1000 / TICK_RATE);
  }

  stop() {
    clearInterval(this.interval);
    this.interval = null;
  }

  updatePlayer(sessionId = DEFAULT_SESSION_ID, profileId, state) {
    if (!profileId) {
      return;
    }

    const session = this.getSession(sessionId);
    session.players.set(profileId, {
      profileId,
      x: finite(state?.x),
      z: finite(state?.z),
      health: finite(state?.health, 100),
      threatTags: state?.threatTags ?? [],
      updatedAt: this.now()
    });
  }

  removePlayer(sessionId = DEFAULT_SESSION_ID, profileId) {
    this.sessions.get(sessionId)?.players.delete(profileId);
  }

  registerDamage(sessionId = DEFAULT_SESSION_ID, profileId, npcId, amount, kind = 'damage') {
    const session = this.getSession(sessionId);
    const npc = session.npcs.get(npcId);

    if (!npc || npc.invulnerable || npc.health <= 0) {
      return null;
    }

    const threat = kind === 'taunt' ? 180 : Math.max(1, finite(amount));
    npc.hate.set(profileId, (npc.hate.get(profileId) ?? 0) + threat);
    npc.health = Math.max(0, npc.health - Math.max(0, finite(amount)));

    if (npc.health === 0) {
      npc.state = STATE.patrol;
      npc.respawnAt = this.now() + 8000;
      npc.hate.clear();
      npc.telegraph = null;
    }

    return this.snapshotNpc(npc);
  }

  registerHealing(sessionId = DEFAULT_SESSION_ID, profileId, amount) {
    const session = this.getSession(sessionId);
    const player = session.players.get(profileId);

    if (!player) {
      return;
    }

    for (const npc of session.npcs.values()) {
      if (distance(npc, player) <= npc.visionRadius) {
        npc.hate.set(profileId, (npc.hate.get(profileId) ?? 0) + Math.max(1, finite(amount)) * 0.55);
      }
    }
  }

  tick() {
    const now = this.now();
    const deltaTime = Math.min(0.25, Math.max(0.001, (now - this.lastTick) / 1000));
    this.lastTick = now;

    for (const [sessionId, session] of this.sessions) {
      this.prunePlayers(session, now);
      session.npcs.forEach((npc) => this.updateNpc(session, npc, deltaTime, now));
      this.broadcast('npc:snapshot', {
        npcs: [...session.npcs.values()].map((npc) => this.snapshotNpc(npc))
      }, sessionId);
    }
  }

  updateNpc(session, npc, deltaTime, now) {
    if (npc.respawnAt) {
      if (now >= npc.respawnAt) {
        Object.assign(npc, this.createNpc(npc.serial, npc.spawnX, npc.spawnZ));
      }
      return;
    }

    if (npc.health <= 0) {
      return;
    }

    if (distance(npc, { x: npc.spawnX, z: npc.spawnZ }) > npc.leashRadius) {
      npc.state = STATE.leash;
      npc.invulnerable = true;
      npc.hate.clear();
    }

    this.decayHate(npc, deltaTime);
    const target = this.resolveTarget(session, npc);

    if (npc.state !== STATE.leash && !target && npc.state !== STATE.flee) {
      npc.state = STATE.patrol;
    }

    if (npc.state === STATE.leash) {
      this.moveToward(npc, { x: npc.spawnX, z: npc.spawnZ }, npc.speed * 1.7, deltaTime);
      npc.health = Math.min(npc.maxHealth, npc.health + npc.maxHealth * 0.42 * deltaTime);

      if (distance(npc, { x: npc.spawnX, z: npc.spawnZ }) < 0.35) {
        npc.x = npc.spawnX;
        npc.z = npc.spawnZ;
        npc.health = npc.maxHealth;
        npc.invulnerable = false;
        npc.state = STATE.patrol;
      }
      return;
    }

    if (npc.health / npc.maxHealth < 0.18 && npc.supportType === 'skirmisher') {
      npc.state = STATE.flee;
      this.moveAwayFrom(npc, target ?? { x: npc.spawnX, z: npc.spawnZ }, npc.speed * 1.15, deltaTime);
      return;
    }

    if (!target) {
      npc.patrolPhase += deltaTime;
      const patrolTarget = {
        x: npc.spawnX + Math.cos(npc.patrolPhase * 0.7 + npc.serial) * npc.patrolRadius,
        z: npc.spawnZ + Math.sin(npc.patrolPhase * 0.55 + npc.serial) * npc.patrolRadius
      };
      this.moveToward(npc, patrolTarget, npc.speed * 0.42, deltaTime);
      return;
    }

    const targetDistance = distance(npc, target);

    if (targetDistance <= npc.attackRange) {
      npc.state = STATE.attack;
      this.maybeAttack(npc, target, now);
      return;
    }

    npc.state = STATE.chase;
    this.moveToward(npc, target, npc.speed, deltaTime);
  }

  maybeAttack(npc, target, now) {
    if (npc.telegraph && now >= npc.telegraph.resolveAt) {
      npc.lastAttackAt = now;
      npc.telegraph = null;
      return;
    }

    if (npc.telegraph || now - npc.lastAttackAt < npc.attackInterval) {
      return;
    }

    npc.telegraph = {
      id: `${npc.id}:aoe:${now}`,
      npcId: npc.id,
      shape: npc.elite ? 'diamond' : 'circle',
      x: target.x,
      z: target.z,
      radius: npc.elite ? 1.65 : 0.9,
      startsAt: now,
      resolveAt: now + (npc.elite ? 1600 : 850)
    };
  }

  getSession(sessionId) {
    const id = sessionId || DEFAULT_SESSION_ID;

    if (!this.sessions.has(id)) {
      this.sessions.set(id, {
        players: new Map(),
        npcs: new Map(this.createSessionNpcs().map((npc) => [npc.id, npc]))
      });
    }

    return this.sessions.get(id);
  }

  createSessionNpcs() {
    return [
      this.createNpc(0, -7.5, -12, { tier: 0 }),
      this.createNpc(1, 7.8, -18, { tier: 1, supportType: 'skirmisher' }),
      this.createNpc(2, 0, -31, { tier: 2, elite: true })
    ];
  }

  createNpc(serial, x, z, overrides = {}) {
    const tier = overrides.tier ?? Math.floor(serial / 2);
    const elite = Boolean(overrides.elite);
    return {
      id: `npc-${serial}`,
      serial,
      state: STATE.patrol,
      x,
      z,
      spawnX: x,
      spawnZ: z,
      tier,
      elite,
      supportType: overrides.supportType ?? 'stalker',
      maxHealth: elite ? 260 : 95 + tier * 45,
      health: elite ? 260 : 95 + tier * 45,
      speed: elite ? 1.15 : 1.25 + tier * 0.12,
      visionRadius: elite ? 14 : 10,
      attackRange: elite ? 1.85 : 0.82,
      attackInterval: elite ? 2800 : 1350,
      leashRadius: elite ? 20 : 15,
      patrolRadius: 2.2 + tier * 0.35,
      patrolPhase: serial * 1.7,
      hate: new Map(),
      invulnerable: false,
      telegraph: null,
      lastAttackAt: 0,
      respawnAt: null
    };
  }

  snapshotNpc(npc) {
    return {
      id: npc.id,
      state: npc.state,
      x: round(npc.x),
      z: round(npc.z),
      spawnX: npc.spawnX,
      spawnZ: npc.spawnZ,
      tier: npc.tier,
      elite: npc.elite,
      health: Math.ceil(npc.health),
      maxHealth: npc.maxHealth,
      invulnerable: npc.invulnerable,
      targetProfileId: this.getTopHateTarget(npc)?.profileId ?? null,
      telegraph: npc.telegraph
    };
  }

  resolveTarget(session, npc) {
    const hated = this.getTopHateTarget(npc, session);

    if (hated) {
      return hated;
    }

    let nearest = null;
    let nearestDistance = npc.visionRadius;

    for (const player of session.players.values()) {
      const playerDistance = distance(npc, player);

      if (playerDistance <= nearestDistance) {
        nearest = player;
        nearestDistance = playerDistance;
      }
    }

    if (nearest) {
      npc.hate.set(nearest.profileId, Math.max(20, npc.hate.get(nearest.profileId) ?? 0));
    }

    return nearest;
  }

  getTopHateTarget(npc, session = null) {
    let top = null;
    let topThreat = 0;

    for (const [profileId, threat] of npc.hate) {
      const player = session?.players.get(profileId) ?? { profileId };

      if (threat > topThreat) {
        top = player;
        topThreat = threat;
      }
    }

    return topThreat > 1 ? top : null;
  }

  decayHate(npc, deltaTime) {
    for (const [profileId, threat] of npc.hate) {
      const next = threat - 4 * deltaTime;

      if (next <= 0) {
        npc.hate.delete(profileId);
      } else {
        npc.hate.set(profileId, next);
      }
    }
  }

  moveToward(npc, target, speed, deltaTime) {
    const dx = target.x - npc.x;
    const dz = target.z - npc.z;
    const length = Math.hypot(dx, dz);

    if (length < 0.001) {
      return;
    }

    const step = Math.min(length, speed * deltaTime);
    npc.x += (dx / length) * step;
    npc.z += (dz / length) * step;
  }

  moveAwayFrom(npc, target, speed, deltaTime) {
    const dx = npc.x - target.x;
    const dz = npc.z - target.z;
    const length = Math.max(0.001, Math.hypot(dx, dz));
    npc.x += (dx / length) * speed * deltaTime;
    npc.z += (dz / length) * speed * deltaTime;
  }

  prunePlayers(session, now) {
    for (const [profileId, player] of session.players) {
      if (now - player.updatedAt > 7500) {
        session.players.delete(profileId);
      }
    }
  }
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

function finite(value, fallback = 0) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

function round(value) {
  return Math.round(value * 100) / 100;
}
