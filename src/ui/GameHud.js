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
  'max-towers': 'LIMITE DE TORRES ALCANZADO'
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
        <div class="hud-kicker"><span>DIA 01</span><span class="hud-time">18:42</span></div>
        <div class="hud-health-row">
          <span>VIDA</span>
          <div class="hud-meter"><i data-hud="health-fill"></i></div>
          <b data-hud="health-text">100</b>
        </div>
        <div class="hud-weapon-row">
          <span>REVOLVER</span>
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
      })
    ];
  }

  update(deltaTime, state) {
    const healthRatio = state.player.health / state.player.maxHealth;
    this.refs['health-fill'].style.width = `${Math.max(0, healthRatio) * 100}%`;
    this.refs['health-text'].textContent = String(Math.ceil(state.player.health));
    this.refs.magazine.textContent = String(state.weapon.magazine);
    this.refs.reserve.textContent = String(state.weapon.reserve);
    this.refs.reload.textContent = state.weapon.reloading ? 'RECARGANDO' : 'LISTO';
    this.refs.reload.classList.toggle('is-active', state.weapon.reloading);
    this.refs.wood.textContent = String(state.inventory.wood);
    this.refs.stone.textContent = String(state.inventory.stone);
    this.refs.artifact.textContent = String(state.inventory.artifact);
    this.refs.healingPotion.textContent = String(state.inventory.healingPotion);

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
    }
  }

  dispose() {
    this.element.removeEventListener('click', this.handleClick);
    this.unsubscribers.forEach((unsubscribe) => unsubscribe());
    this.unsubscribers.length = 0;
    this.element.remove();
  }
}
