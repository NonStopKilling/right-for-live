import { DEFAULT_LAB_OPTIONS } from '../config/gameOptions.js';

const OPTIONS_KEY = 'voxel-survival-options-v1';
const PROFILE_KEY = 'voxel-survival-profile-draft-v1';

const DEFAULT_KEYBINDS = Object.freeze({
  moveForward: 'KeyW',
  moveBackward: 'KeyS',
  moveLeft: 'KeyA',
  moveRight: 'KeyD',
  interact: 'KeyE',
  reload: 'KeyR',
  build: 'KeyB',
  craftPotion: 'KeyC',
  usePotion: 'Digit1',
  mute: 'KeyM',
  chat: 'Enter'
});

const KEYBIND_LABELS = Object.freeze({
  moveForward: 'Avanzar',
  moveBackward: 'Retroceder',
  moveLeft: 'Izquierda',
  moveRight: 'Derecha',
  interact: 'Interactuar',
  reload: 'Recargar',
  build: 'Construir',
  craftPotion: 'Crear pocion',
  usePotion: 'Usar pocion',
  mute: 'Sonido',
  chat: 'Chat'
});

const ATTRIBUTE_LABELS = Object.freeze({
  vigor: 'Vigor',
  precision: 'Precision',
  engineering: 'Ingenieria',
  endurance: 'Resistencia'
});

const PLAYER_TUNING_LABELS = Object.freeze({
  moveSpeed: ['Velocidad caminar', 45, 350, 1, '%'],
  maxHealthBonus: ['Vida extra', 0, 500, 1, ' HP'],
  damageMultiplier: ['Dano arma', 25, 600, 1, '%'],
  fireRateMultiplier: ['Cadencia arma', 25, 500, 1, '%'],
  rangeBonus: ['Alcance extra', 0, 35, 0.5, ' m']
});

const RESOURCE_EDITOR_LABELS = Object.freeze({
  wood: 'Madera',
  stone: 'Piedra',
  artifact: 'Obj extranos',
  ammoReserve: 'Balas reserva',
  healingPotion: 'Pociones',
  experience: 'XP'
});

const DEFAULT_OPTIONS = Object.freeze({
  uiScale: 'auto',
  graphics: 'balanced',
  cameraView: 'normal',
  cameraZoomRange: 130,
  masterVolume: 45,
  chatOpacity: 88,
  microphoneMode: 'push',
  microphoneEnabled: false,
  showTowerPanel: true,
  showObjective: true,
  showMinimap: true,
  damageWarnings: true,
  cameraAssist: true,
  highContrastHud: false,
  keybinds: DEFAULT_KEYBINDS,
  attributes: { vigor: 1, precision: 1, engineering: 1, endurance: 1 },
  playerTuning: {
    moveSpeed: 100,
    maxHealthBonus: 0,
    damageMultiplier: 100,
    fireRateMultiplier: 100,
    rangeBonus: 0
  },
  lab: DEFAULT_LAB_OPTIONS
});

const DEFAULT_PROFILE = Object.freeze({
  characterName: '',
  fullName: '',
  email: '',
  birthDate: '',
  gender: 'Other',
  callsign: ''
});

export class GameOverlay {
  constructor(root, eventBus, actions) {
    this.root = root;
    this.eventBus = eventBus;
    this.actions = actions;
    this.options = loadJson(OPTIONS_KEY, DEFAULT_OPTIONS);
    this.profile = loadJson(PROFILE_KEY, DEFAULT_PROFILE);
    this.state = null;
    this.activeCommandTab = 'game';
    this.activeChatChannel = 'global';
    this.pendingKeybind = null;
    this.chatMessages = [
      { channel: 'global', author: 'Sistema', text: 'Canal global listo.', time: '00:00' },
      { channel: 'local', author: 'Sistema', text: 'Canal local listo cerca de tu refugio.', time: '00:00' }
    ];

    this.element = document.createElement('div');
    this.element.className = 'game-overlay';
    this.element.innerHTML = this.createMarkup();
    this.root.append(this.element);
    this.refs = Object.fromEntries(
      [...this.element.querySelectorAll('[data-overlay]')].map((element) => [element.dataset.overlay, element])
    );

    this.handleClick = this.handleClick.bind(this);
    this.handleInput = this.handleInput.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.handleGlobalKeyDown = this.handleGlobalKeyDown.bind(this);
    this.element.addEventListener('click', this.handleClick);
    this.element.addEventListener('input', this.handleInput);
    this.element.addEventListener('submit', this.handleSubmit);
    window.addEventListener('keydown', this.handleGlobalKeyDown, true);

    this.applyOptions();
    this.renderAll();
  }

  createMarkup() {
    return `
      <button class="overlay-launcher hud-frame" type="button" data-action="toggle-command" aria-label="Abrir opciones" title="Opciones">
        <span></span><span></span><span></span><span></span>
      </button>

      <section class="overlay-command hud-frame" data-overlay="command" aria-label="Opciones del juego">
        <div class="overlay-command__header">
          <div>
            <span class="hud-kicker">CONSOLA</span>
            <b>OPERACION</b>
          </div>
          <button type="button" data-action="toggle-command" aria-label="Cerrar opciones">X</button>
        </div>
        <nav class="overlay-tabs" aria-label="Secciones de opciones">
          ${['game:JUEGO', 'lab:LAB', 'quests:MISIONES', 'market:MERCADO', 'keys:TECLAS', 'audio:AUDIO', 'microphone:MIC', 'register:REGISTRO', 'attributes:ATRIBUTOS']
            .map((item) => {
              const [id, label] = item.split(':');
              return `<button type="button" data-action="command-tab" data-tab="${id}">${label}</button>`;
            }).join('')}
        </nav>

        <div class="overlay-command__body">
          <section class="overlay-panel" data-panel="game">
            <label>Escala HUD
              <select data-option="uiScale">
                <option value="auto">Auto</option>
                <option value="compact">Compacta</option>
                <option value="large">Grande</option>
              </select>
            </label>
            <label>Detalle visual
              <select data-option="graphics">
                <option value="performance">Rendimiento</option>
                <option value="balanced">Balanceado</option>
                <option value="cinematic">Cinematico</option>
              </select>
            </label>
            <label>Vista camara
              <select data-option="cameraView">
                <option value="normal">Normal</option>
                <option value="wide">Lejana</option>
                <option value="close">Cercana</option>
              </select>
            </label>
            <label>Rango zoom
              <input type="range" min="90" max="180" step="1" data-option="cameraZoomRange">
            </label>
            <label class="overlay-toggle"><input type="checkbox" data-option="showTowerPanel"> Panel de torres</label>
            <label class="overlay-toggle"><input type="checkbox" data-option="showObjective"> Objetivo visible</label>
            <label class="overlay-toggle"><input type="checkbox" data-option="showMinimap"> Minimapa y brujula</label>
            <label class="overlay-toggle"><input type="checkbox" data-option="damageWarnings"> Alertas de dano</label>
            <label class="overlay-toggle"><input type="checkbox" data-option="cameraAssist"> Asistencia de camara</label>
            <label class="overlay-toggle"><input type="checkbox" data-option="highContrastHud"> HUD alto contraste</label>
          </section>

          <section class="overlay-panel overlay-panel--lab" data-panel="lab">
            <div class="overlay-lab-toolbar">
              <b>MODO CONSTRUCTOR</b>
              <label>Mapa
                <select data-lab-option="mapMode">
                  <option value="forest">Bosque</option>
                  <option value="city">Ciudad</option>
                </select>
              </label>
              <button class="overlay-secondary" type="button" data-action="reset-lab">Reset LAB</button>
            </div>
            ${this.createLabGroup('Mundo procedural', [
              ['seedOffset', 'Semilla offset', 'range', -800, 800, 1],
              ['terrainRelief', 'Relieve', 'range', 35, 180, 1],
              ['forestDensity', 'Densidad bosque', 'range', 0, 190, 1],
              ['treeShapeVariety', 'Formas arboles', 'range', 0, 160, 1],
              ['treeColorVariety', 'Color arboles', 'range', 0, 160, 1],
              ['waterAmount', 'Agua procedural', 'range', 0, 200, 1],
              ['waterOpacity', 'Transparencia agua', 'range', 8, 86, 1],
              ['cityDensity', 'Densidad ciudad', 'range', 0, 160, 1],
              ['cityVehicleDensity', 'Vehiculos ciudad', 'range', 0, 160, 1],
              ['cityResourceDensity', 'Items ciudad', 'range', 0, 220, 1],
              ['cityTrenchDensity', 'Trincheras ciudad', 'range', 0, 180, 1]
            ])}
            ${this.createLabGroup('Dinamicas y amenaza', [
              ['zombieSpawnRate', 'Ritmo zombies', 'range', 10, 260, 1],
              ['zombieMaxActive', 'Cantidad zombies', 'range', 0, 220, 1],
              ['zombiePower', 'Poder zombies', 'range', 25, 220, 1],
              ['zombieFearVisuals', 'Horror visual', 'range', 0, 160, 1],
              ['lootMultiplier', 'Loot', 'range', 0, 300, 1],
              ['questHintDetail', 'Detalle ayudas', 'range', 0, 160, 1]
            ])}
            <div class="overlay-lab-switches">
              ${[
                ['liveRebuild', 'Reconstruir en vivo'],
                ['waterEnabled', 'Agua activa'],
                ['localZombies', 'Zombies locales'],
                ['serverNpcs', 'NPC servidor'],
                ['towerAutofire', 'Torres automaticas'],
                ['economyOnline', 'Economia online'],
                ['questHints', 'Ayudas misiones'],
                ['landmarkMotion', 'Landmarks animados'],
                ['chunkDebug', 'Ver chunks']
              ].map(([key, label]) => `
                <label class="overlay-toggle"><input type="checkbox" data-lab-option="${key}"> ${label}</label>
              `).join('')}
            </div>
          </section>

          <section class="overlay-panel" data-panel="quests">
            <div class="overlay-quests-status" data-overlay="quests-status"></div>
            <div class="overlay-quests" data-overlay="quests"></div>
          </section>

          <section class="overlay-panel" data-panel="market">
            <div class="overlay-quests-status" data-overlay="market-status"></div>
            <div class="overlay-market" data-overlay="market"></div>
          </section>

          <section class="overlay-panel" data-panel="keys">
            <div class="overlay-keybinds" data-overlay="keybinds"></div>
            <button class="overlay-secondary" type="button" data-action="reset-keybinds">Restaurar teclas</button>
          </section>

          <section class="overlay-panel" data-panel="audio">
            <label>Volumen maestro
              <input type="range" min="0" max="100" step="1" data-option="masterVolume">
              <output data-overlay="volume-output">45%</output>
            </label>
            <button class="overlay-secondary" type="button" data-action="sound">Alternar SFX</button>
            <label>Opacidad chat
              <input type="range" min="55" max="100" step="1" data-option="chatOpacity">
              <output data-overlay="chat-opacity-output">88%</output>
            </label>
          </section>

          <section class="overlay-panel" data-panel="microphone">
            <label class="overlay-toggle"><input type="checkbox" data-option="microphoneEnabled"> Microfono habilitado</label>
            <label>Modo
              <select data-option="microphoneMode">
                <option value="push">Push to talk</option>
                <option value="open">Abierto</option>
                <option value="muted">Silenciado</option>
              </select>
            </label>
            <div class="overlay-meter"><i data-overlay="mic-meter"></i></div>
            <small>Maqueta visual. No solicita permisos reales todavia.</small>
          </section>

          <section class="overlay-panel" data-panel="register">
            <form class="overlay-register" data-overlay="register-form">
              <label>Personaje <input name="characterName" maxlength="24" autocomplete="nickname"></label>
              <label>Nombre completo <input name="fullName" maxlength="80" autocomplete="name"></label>
              <label>Email <input name="email" type="email" maxlength="120" autocomplete="email"></label>
              <label>Fecha nacimiento <input name="birthDate" type="date"></label>
              <label>Genero
                <select name="gender">
                  <option>Male</option>
                  <option>Female</option>
                  <option>Other</option>
                </select>
              </label>
              <label>Indicativo <input name="callsign" maxlength="18" autocomplete="off"></label>
              <button type="submit">Guardar registro</button>
              <small data-overlay="register-status">Registro conectado al backend.</small>
            </form>
          </section>

          <section class="overlay-panel" data-panel="attributes">
            <div class="overlay-attributes" data-overlay="attributes"></div>
            <fieldset class="overlay-lab-group">
              <legend>Editor vivo del personaje</legend>
              <div class="overlay-tuning" data-overlay="player-tuning"></div>
            </fieldset>
            <fieldset class="overlay-lab-group">
              <legend>Materiales y recursos</legend>
              <div class="overlay-resource-editor" data-overlay="resource-editor"></div>
            </fieldset>
          </section>
        </div>
      </section>

      <section class="overlay-chat hud-frame" data-overlay="chat" aria-label="Chat">
        <div class="overlay-chat__header">
          <div class="overlay-tabs">
            <button type="button" data-action="chat-tab" data-channel="global">GLOBAL</button>
            <button type="button" data-action="chat-tab" data-channel="local">LOCAL</button>
          </div>
          <button type="button" data-action="close-chat" aria-label="Cerrar chat">X</button>
        </div>
        <div class="overlay-chat__messages" data-overlay="chat-messages" aria-live="polite"></div>
        <form class="overlay-chat__form" data-overlay="chat-form">
          <input data-overlay="chat-input" maxlength="140" autocomplete="off" placeholder="Enter para chatear">
          <button type="submit">ENVIAR</button>
        </form>
      </section>
    `;
  }

  update(_deltaTime, state) {
    this.state = state;
    this.renderAttributes();
    this.renderQuests();
    this.renderMarket();
  }

  handleGlobalKeyDown(event) {
    if (this.pendingKeybind) {
      event.preventDefault();
      this.options.keybinds[this.pendingKeybind] = event.code;
      this.pendingKeybind = null;
      this.saveOptions();
      this.actions.applyInputSettings?.();
      this.renderKeybinds();
      return;
    }

    if (isTextEntryTarget(event.target)) {
      return;
    }

    if (event.code === this.options.keybinds.chat) {
      event.preventDefault();
      this.openChat();
    } else if (event.code === 'Escape') {
      this.closeChat();
      this.setCommandOpen(false);
    }
  }

  handleClick(event) {
    const trigger = event.target.closest('[data-action]');

    if (!trigger) {
      return;
    }

    const action = trigger.dataset.action;
    event.stopPropagation();

    if (action === 'toggle-command') {
      this.setCommandOpen(!this.element.classList.contains('is-command-open'));
    } else if (action === 'command-tab') {
      this.activeCommandTab = trigger.dataset.tab;
      this.renderTabs();
    } else if (action === 'chat-tab') {
      this.activeChatChannel = trigger.dataset.channel;
      this.renderChat();
    } else if (action === 'close-chat') {
      this.closeChat();
    } else if (action === 'sound') {
      this.actions.toggleSound?.();
    } else if (action === 'reset-keybinds') {
      this.options.keybinds = { ...DEFAULT_KEYBINDS };
      this.saveOptions();
      this.actions.applyInputSettings?.();
      this.renderKeybinds();
    } else if (action === 'capture-keybind') {
      this.pendingKeybind = trigger.dataset.keybind;
      this.renderKeybinds();
    } else if (action === 'attribute-step') {
      this.updateAttribute(trigger.dataset.attribute, Number(trigger.dataset.delta));
    } else if (action === 'start-quest') {
      this.actions.startQuest?.(trigger.dataset.questId);
    } else if (action === 'trade') {
      this.actions.trade?.(trigger.dataset.merchantId, trigger.dataset.offerId);
    } else if (action === 'reset-lab') {
      this.options.lab = structuredClone(DEFAULT_LAB_OPTIONS);
      this.saveOptions();
      this.actions.applyGameOptions?.(this.options, { rebuild: true, forceRebuild: true });
      this.renderLabFields();
    }
  }

  handleInput(event) {
    const labOption = event.target.dataset.labOption;

    if (labOption) {
      const element = event.target;
      this.options.lab[labOption] = parseLabValue(element);
      this.saveOptions();
      this.actions.applyGameOptions?.(this.options, { rebuild: true, forceRebuild: true });
      this.renderLabFields();
      return;
    }

    const option = event.target.dataset.option;

    const playerTuning = event.target.dataset.playerTuning;

    if (playerTuning) {
      this.options.playerTuning[playerTuning] = Number(event.target.value);
      this.saveOptions();
      this.actions.updatePlayerTuning?.(this.options.playerTuning);
      this.updateEditorOutputs();
      return;
    }

    const inventoryEditor = event.target.dataset.inventoryEditor;

    if (inventoryEditor) {
      this.actions.updateInventoryValue?.(inventoryEditor, Number(event.target.value));
      this.updateEditorOutputs();
      return;
    }

    if (!option) {
      return;
    }

    const element = event.target;
    this.options[option] = element.type === 'checkbox' ? element.checked : element.value;
    this.saveOptions();
    this.applyOptions();

    if (option === 'masterVolume') {
      this.actions.setAudioVolume?.(Number(element.value) / 100);
    } else if (option === 'cameraView' || option === 'cameraZoomRange') {
      this.actions.applyGameOptions?.(this.options, { rebuild: false });
    }
  }

  async handleSubmit(event) {
    event.preventDefault();

    if (event.target === this.refs['chat-form']) {
      this.submitChat();
      return;
    }

    if (event.target === this.refs['register-form']) {
      this.profile = Object.fromEntries(new FormData(event.target).entries());
      saveJson(PROFILE_KEY, this.profile);
      this.refs['register-status'].textContent = 'Guardando en servidor...';

      try {
        const result = await this.actions.registerProfile?.(this.profile);
        this.refs['register-status'].textContent = result?.persisted?.mysql
          ? 'Registro guardado en MySQL y cache local.'
          : 'Registro guardado en servidor.';
        this.addSystemMessage('global', 'Registro completado.');
      } catch (error) {
        this.refs['register-status'].textContent = error.message || 'No se pudo guardar.';
        this.addSystemMessage('global', 'Registro no guardado en servidor.');
      }
    }
  }

  setCommandOpen(open) {
    this.element.classList.toggle('is-command-open', open);
  }

  openChat(channel = this.activeChatChannel) {
    this.activeChatChannel = channel;
    this.element.classList.add('is-chat-open');
    this.renderChat();
    window.setTimeout(() => this.refs['chat-input']?.focus(), 0);
  }

  closeChat() {
    this.element.classList.remove('is-chat-open');
    this.refs['chat-input']?.blur();
  }

  submitChat() {
    const input = this.refs['chat-input'];
    const text = input.value.trim();

    if (!text) {
      return;
    }

    this.chatMessages.push({
      channel: this.activeChatChannel,
      author: this.profile.characterName || 'Jugador',
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
    input.value = '';
    this.renderChat();
  }

  addSystemMessage(channel, text) {
    this.chatMessages.push({
      channel,
      author: 'Sistema',
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
    this.renderChat();
  }

  renderAll() {
    this.renderTabs();
    this.renderOptionFields();
    this.renderKeybinds();
    this.renderLabFields();
    this.renderProfile();
    this.renderAttributes();
    this.renderPlayerTuningFields();
    this.renderInventoryEditorFields();
    this.renderQuests();
    this.renderMarket();
    this.renderChat();
  }

  renderTabs() {
    this.element.querySelectorAll('[data-tab]').forEach((button) => {
      button.classList.toggle('is-active', button.dataset.tab === this.activeCommandTab);
    });
    this.element.querySelectorAll('[data-panel]').forEach((panel) => {
      panel.classList.toggle('is-active', panel.dataset.panel === this.activeCommandTab);
    });
  }

  renderOptionFields() {
    this.element.querySelectorAll('[data-option]').forEach((element) => {
      const value = this.options[element.dataset.option];

      if (element.type === 'checkbox') {
        element.checked = Boolean(value);
      } else {
        element.value = value;
      }
    });
    this.refs['volume-output'].textContent = `${this.options.masterVolume}%`;
    this.refs['chat-opacity-output'].textContent = `${this.options.chatOpacity}%`;
  }

  renderLabFields() {
    this.element.querySelectorAll('[data-lab-option]').forEach((element) => {
      const value = this.options.lab[element.dataset.labOption];

      if (element.type === 'checkbox') {
        element.checked = Boolean(value);
      } else {
        element.value = value;
      }
    });
    this.element.querySelectorAll('[data-lab-output]').forEach((output) => {
      const key = output.dataset.labOutput;
      output.textContent = formatLabValue(key, this.options.lab[key]);
    });
  }

  renderKeybinds() {
    this.refs.keybinds.replaceChildren(...Object.entries(KEYBIND_LABELS).map(([key, label]) => {
      const row = document.createElement('div');
      row.className = 'overlay-keybind';
      row.innerHTML = `
        <span>${label}</span>
        <button type="button" data-action="capture-keybind" data-keybind="${key}">
          ${this.pendingKeybind === key ? 'Presiona tecla' : formatCode(this.options.keybinds[key])}
        </button>
      `;
      return row;
    }));
  }

  renderProfile() {
    Object.entries(this.profile).forEach(([key, value]) => {
      const field = this.refs['register-form'].elements.namedItem(key);

      if (field) {
        field.value = value;
      }
    });
  }

  renderAttributes() {
    const xp = this.state?.inventory?.experience ?? 0;
    const playerLevel = this.state?.progression?.level ?? Math.max(1, Math.floor(xp / 1000) + 1);
    const used = Object.values(this.options.attributes).reduce((sum, value) => sum + Number(value), 0);
    const points = Math.max(0, playerLevel + 3 - used);
    const health = this.state?.player?.maxHealth ?? 100;
    const weapon = this.state?.weapon ?? {};
    const signature = JSON.stringify({ xp, playerLevel, points, health, weapon, attributes: this.options.attributes });

    if (signature === this.attributeSignature) {
      return;
    }

    this.attributeSignature = signature;

    this.refs.attributes.replaceChildren(
      createMetric('Nivel', String(playerLevel)),
      createMetric('XP', String(xp)),
      createMetric('Puntos', String(points)),
      createMetric('Vida max', String(health)),
      createMetric('Dano', String(weapon.damage ?? '-')),
      createMetric('Cadencia', weapon.fireInterval ? `${weapon.fireInterval.toFixed(2)}s` : '-'),
      createMetric('Alcance', weapon.range ? `${weapon.range.toFixed(1)}m` : '-'),
      ...Object.entries(ATTRIBUTE_LABELS).map(([key, label]) => {
        const row = document.createElement('div');
        row.className = 'overlay-attribute';
        row.innerHTML = `
          <span>${label}</span>
          <button type="button" data-action="attribute-step" data-attribute="${key}" data-delta="-1">-</button>
          <b>${this.options.attributes[key]}</b>
          <button type="button" data-action="attribute-step" data-attribute="${key}" data-delta="1">+</button>
        `;
        row.querySelector('[data-delta="1"]').disabled = points <= 0;
        row.querySelector('[data-delta="-1"]').disabled = this.options.attributes[key] <= 1;
        return row;
      })
    );
    this.renderPlayerTuningFields();
    this.renderInventoryEditorFields();
  }

  renderQuests() {
    if (!this.refs.quests || !this.refs['quests-status']) {
      return;
    }

    const snapshot = this.state?.onlineQuests;
    const quests = snapshot?.quests ?? [];
    const signature = JSON.stringify({
      connected: snapshot?.connected,
      quests
    });

    if (signature === this.questSignature) {
      return;
    }

    this.questSignature = signature;
    this.refs['quests-status'].textContent = snapshot?.connected
      ? `ONLINE · PERFIL ${snapshot.profileId ? snapshot.profileId.slice(0, 8).toUpperCase() : 'SIN ID'}`
      : 'OFFLINE · INICIA EL BACKEND PARA SINCRONIZAR';

    if (!quests.length) {
      this.refs.quests.replaceChildren(createEmptyQuest());
      return;
    }

    this.refs.quests.replaceChildren(...quests.map((quest) => {
      const item = document.createElement('article');
      item.className = `overlay-quest is-${quest.state}`;
      item.innerHTML = `
        <div>
          <span>${formatQuestState(quest.state)} · ${escapeHtml(quest.category)}</span>
          <b>${escapeHtml(quest.title)}</b>
          <p>${escapeHtml(quest.summary)}</p>
        </div>
        <div class="overlay-quest__step">
          <small>${escapeHtml(quest.step?.label ?? 'Sin paso activo')}</small>
          ${renderQuestProgress(quest.step)}
          ${this.options.lab.questHints ? renderQuestHint(quest, this.options.lab.questHintDetail) : ''}
        </div>
        ${quest.state === 'available'
          ? `<button type="button" data-action="start-quest" data-quest-id="${escapeHtml(quest.id)}">INICIAR</button>`
          : ''}
      `;
      return item;
    }));
  }

  renderMarket() {
    if (!this.refs.market || !this.refs['market-status']) {
      return;
    }

    const snapshot = this.state?.economy;
    const inventory = this.state?.inventory ?? {};
    const merchants = snapshot?.merchants ?? [];
    const signature = JSON.stringify({
      connected: snapshot?.connected,
      merchants,
      inventory
    });

    if (signature === this.marketSignature) {
      return;
    }

    this.marketSignature = signature;
    this.refs['market-status'].textContent = snapshot?.connected
      ? 'MERCADO ONLINE · PRECIOS DINAMICOS'
      : 'MERCADO OFFLINE · INICIA EL BACKEND';

    if (!merchants.length) {
      this.refs.market.replaceChildren(createEmptyMarket());
      return;
    }

    this.refs.market.replaceChildren(...merchants.flatMap((merchant) => {
      const header = document.createElement('div');
      header.className = 'overlay-market__merchant';
      header.innerHTML = `<b>${escapeHtml(merchant.name)}</b><span>${escapeHtml(merchant.role)} · restock ${formatTime(merchant.restocksInMs)}</span>`;

      return [
        header,
        ...merchant.offers.map((offer) => {
          const canBuy = offer.stock > 0 && canAfford(inventory, offer.takes);
          const item = document.createElement('article');
          item.className = 'overlay-market-offer';
          item.innerHTML = `
            <div>
              <span>${escapeHtml(offer.kind)} · x${offer.priceFactor}</span>
              <b>${escapeHtml(offer.label)}</b>
              <small>Recibes ${formatResources(offer.gives)}</small>
              <small>Pagas ${formatResources(offer.takes)}</small>
            </div>
            <div>
              <em>Stock ${offer.stock}</em>
              <button type="button" data-action="trade" data-merchant-id="${escapeHtml(merchant.id)}" data-offer-id="${escapeHtml(offer.id)}" ${canBuy ? '' : 'disabled'}>COMERCIAR</button>
            </div>
          `;
          return item;
        })
      ];
    }));
  }

  renderChat() {
    this.element.querySelectorAll('[data-channel]').forEach((button) => {
      button.classList.toggle('is-active', button.dataset.channel === this.activeChatChannel);
    });
    const messages = this.chatMessages.filter((message) => message.channel === this.activeChatChannel).slice(-18);
    this.refs['chat-messages'].replaceChildren(...messages.map((message) => {
      const row = document.createElement('div');
      row.className = 'overlay-chat-message';
      row.innerHTML = `<span>${message.time}</span><b>${escapeHtml(message.author)}</b><p>${escapeHtml(message.text)}</p>`;
      return row;
    }));
    this.refs.chat.style.setProperty('--chat-opacity', String(Number(this.options.chatOpacity) / 100));
    this.refs['chat-messages'].scrollTop = this.refs['chat-messages'].scrollHeight;
  }

  updateAttribute(attribute, delta) {
    const xp = this.state?.inventory?.experience ?? 0;
    const playerLevel = this.state?.progression?.level ?? Math.max(1, Math.floor(xp / 1000) + 1);
    const used = Object.values(this.options.attributes).reduce((sum, value) => sum + Number(value), 0);
    const points = Math.max(0, playerLevel + 3 - used);
    const current = Number(this.options.attributes[attribute]);

    if (delta > 0 && points <= 0) {
      return;
    }

    this.options.attributes[attribute] = Math.max(1, current + delta);
    this.saveOptions();
    this.actions.updatePlayerTuning?.(this.options.playerTuning);
    this.renderAttributes();
  }

  renderPlayerTuningFields() {
    if (!this.refs['player-tuning']) {
      return;
    }

    this.refs['player-tuning'].replaceChildren(...Object.entries(PLAYER_TUNING_LABELS).map(([key, [label, min, max, step, suffix]]) => {
      const value = Number(this.options.playerTuning[key]);
      const row = document.createElement('label');
      row.className = 'overlay-live-control';
      row.innerHTML = `
        <span>${label}</span>
        <input type="range" min="${min}" max="${max}" step="${step}" data-player-tuning="${key}" value="${value}">
        <output data-player-tuning-output="${key}">${formatTuningValue(value, suffix)}</output>
      `;
      return row;
    }));
  }

  renderInventoryEditorFields() {
    if (!this.refs['resource-editor']) {
      return;
    }

    const inventory = this.state?.inventory ?? {};
    this.refs['resource-editor'].replaceChildren(...Object.entries(RESOURCE_EDITOR_LABELS).map(([key, label]) => {
      const row = document.createElement('label');
      row.className = 'overlay-resource-control';
      row.innerHTML = `
        <span>${label}</span>
        <input type="number" min="0" max="999999" step="1" data-inventory-editor="${key}" value="${inventory[key] ?? 0}">
      `;
      return row;
    }));
  }

  updateEditorOutputs() {
    this.element.querySelectorAll('[data-player-tuning-output]').forEach((output) => {
      const key = output.dataset.playerTuningOutput;
      const suffix = PLAYER_TUNING_LABELS[key]?.[4] ?? '';
      output.textContent = formatTuningValue(this.options.playerTuning[key], suffix);
    });
  }

  applyOptions() {
    document.documentElement.dataset.hudScale = this.options.uiScale;
    document.documentElement.dataset.hudContrast = this.options.highContrastHud ? 'high' : 'normal';
    this.root.classList.toggle('hide-tower-panel', !this.options.showTowerPanel);
    this.root.classList.toggle('hide-objective-panel', !this.options.showObjective);
    this.root.classList.toggle('hide-minimap', !this.options.showMinimap);
    this.refs['volume-output'].textContent = `${this.options.masterVolume}%`;
    this.refs['chat-opacity-output'].textContent = `${this.options.chatOpacity}%`;
    this.refs['mic-meter'].style.width = this.options.microphoneEnabled ? '64%' : '8%';
  }

  saveOptions() {
    saveJson(OPTIONS_KEY, this.options);
  }

  createLabGroup(title, controls) {
    return `
      <fieldset class="overlay-lab-group">
        <legend>${title}</legend>
        ${controls.map(([key, label, type, min, max, step]) => `
          <label class="overlay-lab-control">${label}
            <input type="${type}" min="${min}" max="${max}" step="${step}" data-lab-option="${key}">
            <output data-lab-output="${key}">${formatLabValue(key, DEFAULT_LAB_OPTIONS[key])}</output>
          </label>
        `).join('')}
      </fieldset>
    `;
  }

  dispose() {
    window.removeEventListener('keydown', this.handleGlobalKeyDown, true);
    this.element.removeEventListener('click', this.handleClick);
    this.element.removeEventListener('input', this.handleInput);
    this.element.removeEventListener('submit', this.handleSubmit);
    this.element.remove();
  }
}

function createMetric(label, value) {
  const metric = document.createElement('div');
  metric.className = 'overlay-metric';
  metric.innerHTML = `<span>${label}</span><b>${value}</b>`;
  return metric;
}

function createEmptyQuest() {
  const empty = document.createElement('div');
  empty.className = 'overlay-quest overlay-quest--empty';
  empty.textContent = 'Esperando misiones del servidor.';
  return empty;
}

function createEmptyMarket() {
  const empty = document.createElement('div');
  empty.className = 'overlay-quest overlay-quest--empty';
  empty.textContent = 'Esperando stock del servidor.';
  return empty;
}

function renderQuestProgress(step) {
  if (!step) {
    return '';
  }

  if (step.type === 'kill') {
    return `<meter min="0" max="${step.required}" value="${step.current}"></meter><em>${step.current}/${step.required}</em>`;
  }

  if (step.type === 'fetch') {
    return Object.entries(step.required)
      .map(([resource, required]) => {
        const current = step.current?.[resource] ?? 0;
        return `<em>${escapeHtml(resource)} ${current}/${required}</em>`;
      })
      .join('');
  }

  return `<em>${step.discovered ? 'Descubierto' : 'Pendiente'}</em>`;
}

function renderQuestHint(quest, detail = 100) {
  const step = quest.step;

  if (!step || quest.state === 'completed') {
    return '<p class="overlay-quest__hint">Mision completada. Puedes seguir construyendo alrededor del avance logrado.</p>';
  }

  if (step.type === 'discovery') {
    const area = step.area;
    const precise = Number(detail) >= 85;
    return `
      <p class="overlay-quest__hint">
        Ayuda: avanza hacia el norte${precise && area ? ` hasta X ${area.x}, Z ${area.z}` : ''}. Busca cambios de terreno, agua o ruinas.
      </p>
    `;
  }

  if (step.type === 'kill') {
    return `
      <p class="overlay-quest__hint">
        Ayuda: activa NPC servidor, sal del anillo seguro y usa torres para bajar riesgo. Progreso ${step.current}/${step.required}.
      </p>
    `;
  }

  if (step.type === 'fetch') {
    return `
      <p class="overlay-quest__hint">
        Ayuda: tala arboles para madera, rompe props de piedra y revisa el mercado si te falta material.
      </p>
    `;
  }

  return '<p class="overlay-quest__hint">Ayuda: sigue el objetivo activo y revisa el mapa alrededor de la ruta norte.</p>';
}

function formatQuestState(state) {
  return {
    available: 'DISPONIBLE',
    active: 'ACTIVA',
    completed: 'COMPLETA'
  }[state] ?? String(state).toUpperCase();
}

function formatLabValue(key, value) {
  if (key === 'mapMode') {
    return value === 'city' ? 'Ciudad' : 'Bosque';
  }

  if (key === 'seedOffset') {
    return String(value);
  }

  return `${value}%`;
}

function formatTuningValue(value, suffix) {
  return `${Number(value)}${suffix}`;
}

function parseLabValue(element) {
  if (element.type === 'checkbox') {
    return element.checked;
  }

  if (element.tagName === 'SELECT') {
    return element.value;
  }

  return Number(element.value);
}

function formatResources(resources) {
  return Object.entries(resources ?? {})
    .filter(([, amount]) => amount > 0)
    .map(([resource, amount]) => `${escapeHtml(resource)} ${amount}`)
    .join(', ') || 'nada';
}

function canAfford(inventory, costs) {
  return Object.entries(costs ?? {}).every(([resource, amount]) => (inventory?.[resource] ?? 0) >= amount);
}

function formatTime(ms) {
  const minutes = Math.max(0, Math.ceil(Number(ms) / 60000));
  return `${minutes}m`;
}

function loadJson(key, defaults) {
  try {
    return mergeDeep(defaults, JSON.parse(window.localStorage.getItem(key) ?? '{}'));
  } catch {
    return structuredClone(defaults);
  }
}

function saveJson(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Browser storage can be disabled.
  }
}

function mergeDeep(defaults, value) {
  const output = structuredClone(defaults);

  for (const [key, next] of Object.entries(value ?? {})) {
    if (next && typeof next === 'object' && !Array.isArray(next) && typeof output[key] === 'object') {
      output[key] = { ...output[key], ...next };
    } else if (next !== undefined) {
      output[key] = next;
    }
  }

  return output;
}

function formatCode(code) {
  return String(code)
    .replace('Key', '')
    .replace('Digit', '')
    .replace('Arrow', '');
}

function isTextEntryTarget(target) {
  const tagName = target?.tagName;

  if (target?.isContentEditable || tagName === 'TEXTAREA' || tagName === 'SELECT') {
    return true;
  }

  if (tagName !== 'INPUT') {
    return false;
  }

  return !['button', 'checkbox', 'radio', 'range'].includes(target.type);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}
