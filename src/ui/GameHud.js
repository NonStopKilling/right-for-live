const RESOURCE_LABELS = {
  wood: 'MADERA',
  stone: 'PIEDRA',
  artifact: 'EXTRANO',
  healingPotion: 'POCION',
  ammoReserve: 'BALAS'
};

const POTION_BLOCK_REASONS = {
  resources: 'FALTAN OBJETOS EXTRANOS',
  empty: 'SIN POCIONES',
  'full-health': 'VIDA COMPLETA'
};

const IDLE_CONTROLS = 'WASD mover / E recolectar / B construir / R recargar / C crear pocion / 1 usar pocion / M sonido';

const BUILD_REASONS = {
  aim: 'APUNTA AL TERRENO',
  range: 'FUERA DE ALCANCE',
  resources: 'FALTAN RECURSOS',
  overlap: 'DEMASIADO CERCA DE OTRA TORRE',
  slope: 'TERRENO INESTABLE',
  water: 'NO SE PUEDE CONSTRUIR EN AGUA',
  'max-towers': 'LIMITE DE TORRES ALCANZADO',
  'teleport-cost': 'TELETRANSPORTE CUESTA 20 EXTRANOS'
};

export class GameHud {
  constructor(root, eventBus, actions) {
    this.root = root;
    this.eventBus = eventBus;
    this.actions = actions;
    this.notification = null;
    this.lastStoryId = null;
    this.element = document.createElement('div');
    this.element.className = 'game-hud';
    this.element.innerHTML = `
      <section class="hud-status hud-frame" aria-label="Estado del jugador">
        <div class="hud-kicker"><span>DIA 01</span><span class="hud-time" data-hud="map-mode">BOSQUE</span></div>
        <div class="hud-health-row">
          <span>VIDA</span>
          <div class="hud-meter"><i data-hud="health-fill"></i></div>
          <b data-hud="health-text">100</b>
        </div>
        <div class="hud-weapon-row">
          <span>REVOLVER · NV <i data-hud="player-level">1</i></span>
          <b><i data-hud="magazine">6</i> / <i data-hud="reserve">24</i></b>
          <span class="hud-reload" data-hud="reload">LISTO</span>
        </div>
      </section>

      <section class="hud-checkpoint hud-frame" aria-label="Refugio activo">
        <div>
          <span class="hud-kicker">CHECKPOINT</span>
          <b data-hud="checkpoint-name">FOGATA CENTRAL</b>
        </div>
        <div class="hud-tower-meta" data-hud="tower-meta">SIN TORRE</div>
        <button class="hud-icon-button" type="button" data-action="sound" aria-label="Activar o silenciar sonido" title="Sonido">SFX</button>
      </section>

      <section class="hud-resources hud-frame" aria-label="Recursos">
        <div class="hud-resource hud-resource--wood"><span class="hud-swatch"></span><b data-hud="wood">0</b><small>MADERA</small></div>
        <div class="hud-resource hud-resource--stone"><span class="hud-swatch"></span><b data-hud="stone">0</b><small>PIEDRA</small></div>
        <div class="hud-resource hud-resource--artifact"><span class="hud-swatch"></span><b data-hud="artifact">0</b><small>EXTRANO</small></div>
        <div class="hud-resource hud-resource--potion"><span class="hud-swatch"></span><b data-hud="healingPotion">0</b><small>POCION</small></div>
        <div class="hud-resource hud-resource--xp"><span class="hud-swatch"></span><b data-hud="experience">0</b><small>XP</small></div>
      </section>

      <section class="hud-tower-list hud-frame" aria-label="Torres desplegadas">
        <div class="hud-kicker"><span>TORRES</span><span data-hud="tower-count">0/12</span></div>
        <div class="hud-tower-list__items" data-hud="tower-list"></div>
      </section>

      <section class="hud-minimap hud-frame" aria-label="Minimapa">
        <div class="hud-kicker"><span>MAPA</span><span data-hud="minimap-zone">N</span></div>
        <div class="hud-minimap__radar" data-hud="minimap-radar">
          <span class="hud-minimap__grid"></span>
          <span class="hud-minimap__north">N</span>
          <span class="hud-minimap__player"></span>
          <span class="hud-minimap__objective" data-hud="minimap-objective"></span>
          <span class="hud-minimap__items" data-hud="minimap-items"></span>
        </div>
      </section>

      <button class="hud-objective hud-frame" type="button" data-action="story" aria-label="Abrir transmision actual">
        <span class="hud-kicker">OBJETIVO ACTUAL</span>
        <b data-hud="objective-title">REUNE MATERIALES</b>
        <small data-hud="objective-hint"></small>
      </button>

      <div class="hud-context hud-frame" data-hud="context" aria-live="polite">
        <b data-hud="context-label">EXPLORA EL BOSQUE</b>
        <div class="hud-context-progress"><i data-hud="context-fill"></i></div>
        <small data-hud="context-detail">${IDLE_CONTROLS}</small>
      </div>

      <div class="hud-notification" data-hud="notification" aria-live="polite"></div>

      <section class="hud-transmission" data-hud="transmission" aria-modal="true" role="dialog">
        <div class="hud-transmission__panel hud-frame">
          <span class="hud-kicker">TRANSMISION RECUPERADA</span>
          <h2 data-hud="transmission-title"></h2>
          <p data-hud="transmission-copy"></p>
          <button type="button" data-action="dismiss-story">CONTINUAR</button>
        </div>
      </section>

      <section class="hud-death" data-hud="death" aria-live="assertive">
        <div>
          <span class="hud-kicker">SENAL PERDIDA</span>
          <h2>HAS CAIDO</h2>
          <p>Regresando al ultimo checkpoint en <b data-hud="respawn-time">2</b></p>
        </div>
      </section>
    `;
    this.root.append(this.element);
    this.refs = Object.fromEntries(
      [...this.element.querySelectorAll('[data-hud]')].map((element) => [element.dataset.hud, element])
    );
    this.handleClick = this.handleClick.bind(this);
    this.element.addEventListener('click', this.handleClick);
    this.unsubscribers = [
      eventBus.on('resource:harvested', ({ resource, amount }) => {
        this.showNotification(`+${amount} ${RESOURCE_LABELS[resource.type]}`);
      }),
      eventBus.on('loot:collected', ({ loot }) => {
        const summary = Object.entries(loot)
          .map(([resource, amount]) => `+${amount} ${RESOURCE_LABELS[resource]}`)
          .join('  ');
        this.showNotification(summary);
      }),
      eventBus.on('tower:built', () => this.showNotification('CHECKPOINT GUARDADO')),
      eventBus.on('tower:leveled', ({ tower }) => this.showNotification(`TORRE NIVEL ${tower.level}`)),
      eventBus.on('tower:dismantled', ({ refund }) => {
        this.showNotification(`TORRE DESLIGADA +${refund.wood} MADERA +${refund.stone} PIEDRA`);
      }),
      eventBus.on('player:experience', ({ amount }) => {
        this.showNotification(`+${amount} XP POR TORRE`);
      }),
      eventBus.on('player:leveled', ({ level }) => {
        this.showNotification(`NIVEL ${level}: HP Y ARMA MEJORADOS`);
      }),
      eventBus.on('city:horde-warning', ({ seconds }) => {
        this.showNotification(`HORDA URBANA EN ${seconds}s`);
      }),
      eventBus.on('city:horde-started', ({ count }) => {
        this.showNotification(`HORDA URBANA: ${count} ENEMIGOS`);
      }),
      eventBus.on('tower:teleported', () => {
        this.showNotification('TORRE TELETRANSPORTADA -20 EXTRANO');
      }),
      eventBus.on('tower:placement-blocked', ({ reason }) => {
        this.showNotification(BUILD_REASONS[reason] ?? 'NO SE PUEDE CONSTRUIR');
      }),
      eventBus.on('potion:crafted', ({ count }) => {
        this.showNotification(`POCION CREADA x${count}`);
      }),
      eventBus.on('potion:used', ({ healed }) => {
        this.showNotification(`+${healed} VIDA`);
      }),
      eventBus.on('potion:blocked', ({ reason }) => {
        this.showNotification(POTION_BLOCK_REASONS[reason] ?? 'NO SE PUEDE USAR');
      }),
      eventBus.on('objective:north-milestone', ({ completedTarget }) => {
        this.showNotification(`HITO NORTE ${completedTarget} M`);
      }),
      eventBus.on('objective:north-complete', () => {
        this.showNotification('700 M ALCANZADOS: LA SENAL CAMBIO');
      })
    ];
  }

  update(deltaTime, state) {
    const healthRatio = state.player.health / state.player.maxHealth;
    this.refs['health-fill'].style.width = `${Math.max(0, healthRatio) * 100}%`;
    this.refs['health-text'].textContent = String(Math.ceil(state.player.health));
    this.refs.magazine.textContent = String(state.weapon.magazine);
    this.refs['player-level'].textContent = String(state.progression?.level ?? 1);
    this.refs['map-mode'].textContent = state.mapMode === 'city' ? 'CIUDAD' : 'BOSQUE';
    this.refs.reserve.textContent = String(state.weapon.reserve);
    this.refs.reload.textContent = state.weapon.reloading ? 'RECARGANDO' : 'LISTO';
    this.refs.reload.classList.toggle('is-active', state.weapon.reloading);
    this.refs.wood.textContent = String(state.inventory.wood);
    this.refs.stone.textContent = String(state.inventory.stone);
    this.refs.artifact.textContent = String(state.inventory.artifact);
    this.refs.healingPotion.textContent = String(state.inventory.healingPotion);
    this.refs.experience.textContent = String(state.inventory.experience);

    if (state.tower) {
      this.refs['checkpoint-name'].textContent = `REFUGIO ${String(state.tower.number).padStart(2, '0')}`;
      this.refs['tower-meta'].textContent = state.tower.level >= 3
        ? `NIVEL ${state.tower.level} / MAXIMO`
        : `NIVEL ${state.tower.level} / ${state.tower.kills}-${state.tower.nextLevelKills} BAJAS`;
    } else {
      this.refs['checkpoint-name'].textContent = 'FOGATA CENTRAL';
      this.refs['tower-meta'].textContent = 'SIN TORRE';
    }

    this.refs['objective-title'].textContent = state.objective?.title ?? state.story.title;
    this.refs['objective-hint'].textContent = state.objective?.hint ?? state.story.hint;
    this.updateTowerList(state.towers ?? []);
    this.updateMinimap(state);
    this.updateContext(state);
    this.updateTransmission(state.story);
    this.updateDeath(state.respawn);

    const soundButton = this.element.querySelector('[data-action="sound"]');
    soundButton.classList.toggle('is-muted', !state.audioEnabled);
    soundButton.textContent = state.audioEnabled ? 'SFX' : 'OFF';

    if (this.notification) {
      this.notification.remaining -= deltaTime;

      if (this.notification.remaining <= 0) {
        this.notification = null;
        this.refs.notification.classList.remove('is-visible');
      }
    }
  }

  updateContext(state) {
    let label = 'CONTROLES';
    let detail = IDLE_CONTROLS;
    let progress = 0;

    if (state.respawn.active) {
      label = 'RECUPERANDO SENAL';
      detail = 'RESPAWN EN CURSO';
    } else if (state.build.active) {
      label = state.build.valid
        ? 'CLIC PARA CONSTRUIR'
        : BUILD_REASONS[state.build.reason] ?? 'UBICACION INVALIDA';
      detail = `COSTO ${state.build.cost.wood} MADERA / ${state.build.cost.stone} PIEDRA / ${state.build.cost.artifact} EXTRANO`;
      progress = state.build.valid ? 1 : 0;
    } else if (state.resource.target) {
      label = `[E] ${state.resource.target.label}`;
      detail = state.resource.progress > 0 ? 'MANTEN E PARA RECOLECTAR' : 'ACERCATE Y MANTEN E';
      progress = state.resource.progress;
    } else if (state.weapon.reloading) {
      label = 'RECARGANDO REVOLVER';
      detail = `${state.weapon.magazine} / ${state.weapon.reserve}`;
      progress = state.weapon.reloadProgress;
    }

    this.refs['context-label'].textContent = label;
    this.refs['context-detail'].textContent = detail;
    this.refs['context-fill'].style.width = `${progress * 100}%`;
    this.refs.context.classList.toggle(
      'is-active',
      progress > 0 || state.build.active || Boolean(state.resource.target)
    );
  }

  updateTowerList(towers) {
    const signature = JSON.stringify(towers.map((tower) => ({
      id: tower.id,
      level: tower.level,
      kills: tower.kills,
      active: tower.active
    })));

    if (signature === this.towerListSignature) {
      return;
    }

    this.towerListSignature = signature;
    this.refs['tower-count'].textContent = `${towers.length}/12`;

    if (towers.length === 0) {
      this.refs['tower-list'].innerHTML = '<div class="hud-tower-empty">SIN TORRES</div>';
      return;
    }

    this.refs['tower-list'].replaceChildren(...towers.map((tower) => {
      const row = document.createElement('div');
      row.className = `hud-tower-row${tower.active ? ' is-active' : ''}`;
      const progress = tower.level >= 3
        ? 'MAX'
        : `${tower.kills}/${tower.nextLevelKills}`;
      row.innerHTML = `
        <div>
          <b>T${String(tower.number).padStart(2, '0')}</b>
          <small>N${tower.level} ${progress}</small>
        </div>
        <button type="button" data-action="teleport-tower" data-tower-id="${tower.id}" aria-label="Teletransportar torre ${tower.number}" title="Teletransportar torre por 20 extranos">TP</button>
        <button type="button" data-action="dismantle-tower" data-tower-id="${tower.id}" aria-label="Desligar torre ${tower.number}" title="Desligar torre">DES</button>
      `;
      return row;
    }));
  }

  updateMinimap(state) {
    const scale = 2.15;
    const player = state.position ?? { x: 0, z: 0 };
    this.refs['minimap-zone'].textContent = state.mapMode === 'city' ? 'CIUDAD' : 'BOSQUE';
    this.refs['minimap-objective'].style.transform = `translate(${clampMap(-player.x * scale)}px, ${clampMap((-state.objective.target - player.z) * scale)}px)`;
    this.refs['minimap-objective'].title = state.objective?.title ?? 'Objetivo';

    const towerDots = (state.towers ?? []).map((tower) => {
      const dot = document.createElement('span');
      dot.className = `hud-minimap__dot${tower.active ? ' is-active' : ''}`;
      dot.style.transform = `translate(${clampMap((tower.x - player.x) * scale)}px, ${clampMap((tower.z - player.z) * scale)}px)`;
      dot.title = `Torre ${tower.number} nivel ${tower.level}`;
      return dot;
    });
    this.refs['minimap-items'].replaceChildren(...towerDots);
  }

  updateTransmission(story) {
    this.refs.transmission.classList.toggle('is-visible', story.transmissionOpen);

    if (this.lastStoryId !== story.id) {
      this.lastStoryId = story.id;
      this.refs['transmission-title'].textContent = story.title;
      this.refs['transmission-copy'].textContent = story.transmission;
    }
  }

  updateDeath(respawn) {
    this.refs.death.classList.toggle('is-visible', respawn.active);
    this.refs['respawn-time'].textContent = String(Math.max(1, Math.ceil(respawn.remaining)));
  }

  showNotification(message) {
    if (!message) {
      return;
    }

    this.notification = { message, remaining: 2.1 };
    this.refs.notification.textContent = message;
    this.refs.notification.classList.add('is-visible');
  }

  handleClick(event) {
    const action = event.target.closest('[data-action]')?.dataset.action;

    if (!action) {
      return;
    }

    event.stopPropagation();

    if (action === 'sound') {
      this.actions.toggleSound();
    } else if (action === 'story') {
      this.actions.reopenStory();
    } else if (action === 'dismiss-story') {
      this.actions.dismissStory();
    } else if (action === 'dismantle-tower') {
      const towerId = event.target.closest('[data-tower-id]')?.dataset.towerId;
      this.actions.dismantleTower?.(towerId);
    } else if (action === 'teleport-tower') {
      const towerId = event.target.closest('[data-tower-id]')?.dataset.towerId;
      this.actions.teleportTower?.(towerId);
    }
  }

  dispose() {
    this.element.removeEventListener('click', this.handleClick);
    this.unsubscribers.forEach((unsubscribe) => unsubscribe());
    this.unsubscribers.length = 0;
    this.element.remove();
  }
}

function clampMap(value) {
  return Math.max(-47, Math.min(47, value));
}
