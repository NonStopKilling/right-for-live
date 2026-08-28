import * as THREE from 'three';
import { AudioManager } from '../audio/AudioManager.js';
import { loadGameOptions } from '../config/gameOptions.js';
import { resolveVisualProfile } from '../config/visualProfiles.js';
import { Player } from '../entities/Player.js';
import { CombatSystem } from '../gameplay/CombatSystem.js';
import { CraftingSystem } from '../gameplay/CraftingSystem.js';
import { CityAllySystem } from '../gameplay/CityAllySystem.js';
import { Inventory } from '../gameplay/Inventory.js';
import { ObjectiveSystem } from '../gameplay/ObjectiveSystem.js';
import { PlayerProgressionSystem } from '../gameplay/PlayerProgressionSystem.js';
import { ResourceSystem } from '../gameplay/ResourceSystem.js';
import { RespawnSystem } from '../gameplay/RespawnSystem.js';
import { createFreshSave, SaveSystem } from '../gameplay/SaveSystem.js';
import { StorySystem } from '../gameplay/StorySystem.js';
import { TowerSystem } from '../gameplay/TowerSystem.js';
import { ZombieSystem } from '../gameplay/ZombieSystem.js';
import { InputManager } from '../input/InputManager.js';
import { NetworkNpcSystem } from '../online/NetworkNpcSystem.js';
import { GameHud } from '../ui/GameHud.js';
import { GameOverlay } from '../ui/GameOverlay.js';
import { RENDER } from '../utils/constants.js';
import { World } from '../world/World.js';
import { CameraController } from './Camera.js';
import { EventBus } from './EventBus.js';
import { Renderer } from './Renderer.js';

const SAVE_EVENTS = [
  'inventory:changed',
  'weapon:fired',
  'weapon:reloaded',
  'tower:built',
  'tower:progress',
  'tower:leveled',
  'tower:dismantled',
  'tower:teleported',
  'story:advanced',
  'potion:crafted',
  'potion:used',
  'objective:north-progress',
  'objective:north-milestone'
];

export class Game {
  constructor(root) {
    this.root = root;
    this.profile = resolveVisualProfile();
    this.gameOptions = loadGameOptions();
    this.eventBus = new EventBus();
    this.saveSystem = new SaveSystem();
    const loadedSave = this.saveSystem.load();
    this.saveState = loadedSave ?? createFreshSave();
    this.isFreshGame = !loadedSave;
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'game-canvas';
    this.canvas.setAttribute('aria-label', 'Survival voxel isometrico navegable');
    this.root.replaceChildren(this.canvas);

    this.renderer = new Renderer(this.canvas, this.profile);
    this.cameraController = new CameraController();
    this.scene = this.createScene();
    this.lastFrameTime = 0;
    this.input = new InputManager(this.canvas);
    this.audio = new AudioManager(this.eventBus);
    this.world = new World(this.profile);
    this.inventory = new Inventory(this.eventBus, this.saveState.inventory);
    this.player = new Player(this.world.getSpawnPoint(), this.profile);
    this.zombies = new ZombieSystem(
      this.world,
      this.player,
      this.inventory,
      this.eventBus,
      this.audio,
      this.profile
    );
    this.towers = new TowerSystem(
      this.world,
      this.player,
      this.inventory,
      this.eventBus,
      this.audio,
      this.profile,
      this.saveState.towers,
      this.saveState.activeCheckpointId
    );
    this.zombies.setTowerSystem(this.towers);
    this.serverNpcs = new NetworkNpcSystem(
      this.world,
      this.player,
      this.eventBus,
      this.audio,
      this.profile,
      this.inventory
    );
    this.combat = new CombatSystem(
      this.cameraController.camera,
      this.player,
      this.zombies,
      this.inventory,
      this.eventBus,
      this.audio,
      this.saveState.magazine,
      this.serverNpcs
    );
    this.progression = new PlayerProgressionSystem(this.player, this.inventory, this.eventBus);
    this.combat.setProgressionSystem(this.progression);
    this.resources = new ResourceSystem(
      this.world,
      this.inventory,
      this.eventBus,
      this.audio
    );
    this.crafting = new CraftingSystem(
      this.player,
      this.inventory,
      this.eventBus,
      this.audio
    );
    this.cityAllies = new CityAllySystem(this.world, this.eventBus, this.audio);
    this.objectives = new ObjectiveSystem(
      this.player,
      this.eventBus,
      this.audio,
      this.saveState.northProgress
    );
    this.respawn = new RespawnSystem(
      this.player,
      this.world,
      this.towers,
      this.zombies,
      this.eventBus,
      this.audio
    );
    this.story = new StorySystem(
      this.eventBus,
      this.audio,
      this.saveState.storyStep,
      this.isFreshGame
    );
    this.hud = new GameHud(this.root, this.eventBus, {
      toggleSound: () => this.audio.toggle(),
      reopenStory: () => this.story.reopen(),
      dismissStory: () => this.story.dismiss(),
      dismantleTower: (id) => this.towers.dismantleTower(id),
      teleportTower: (id) => this.towers.teleportTower(id, this.combat.aimPoint ?? this.player.position),
      applyInputSettings: () => this.input.reloadSettings(),
      setAudioVolume: (value) => this.audio.setVolume(value)
    });
    this.overlay = new GameOverlay(this.root, this.eventBus, {
      toggleSound: () => this.audio.toggle(),
      applyInputSettings: () => this.input.reloadSettings(),
      setAudioVolume: (value) => this.audio.setVolume(value),
      startQuest: (questId) => this.serverNpcs.startQuest(questId),
      trade: (merchantId, offerId) => this.serverNpcs.trade(merchantId, offerId),
      registerProfile: (profile) => this.serverNpcs.registerProfile(profile),
      applyGameOptions: (options, applyOptions) => this.applyGameOptions(options, applyOptions)
    });
    this.applyGameOptions(this.gameOptions, { rebuild: false });
    this.animationFrameId = 0;
    this.isRunning = false;
    this.saveUnsubscribers = SAVE_EVENTS.map((eventName) =>
      this.eventBus.on(eventName, () => this.scheduleSave())
    );

    if (loadedSave && this.towers.getActiveTower()) {
      this.player.respawn(this.towers.getRespawnPoint());
    }

    this.world.addTo(this.scene);
    this.towers.addTo(this.scene);
    this.zombies.addTo(this.scene);
    this.cityAllies.addTo(this.scene);
    this.serverNpcs.addTo(this.scene);
    this.combat.addTo(this.scene);
    this.player.addTo(this.scene);
    this.addLighting();

    this.handleResize = this.handleResize.bind(this);
    this.handlePageHide = this.handlePageHide.bind(this);
    this.tick = this.tick.bind(this);

    window.addEventListener('resize', this.handleResize);
    window.addEventListener('pagehide', this.handlePageHide);
    this.resize();
    this.cameraController.update(1, this.player.position);
    this.updateHud(0);
  }

  createScene() {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(this.profile.background);
    scene.fog = new THREE.Fog(
      this.profile.fog.color,
      this.profile.fog.near,
      this.profile.fog.far
    );
    return scene;
  }

  addLighting() {
    const { ambient, hemisphere, sun } = this.profile.lighting;
    this.ambientLight = new THREE.AmbientLight(ambient.color, ambient.intensity);
    this.hemisphereLight = new THREE.HemisphereLight(
      hemisphere.sky,
      hemisphere.ground,
      hemisphere.intensity
    );
    this.sun = new THREE.DirectionalLight(sun.color, sun.intensity);
    this.sunOffset = new THREE.Vector3(...sun.position);
    this.sunTarget = new THREE.Object3D();
    this.sun.target = this.sunTarget;
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.camera.left = -25;
    this.sun.shadow.camera.right = 25;
    this.sun.shadow.camera.top = 25;
    this.sun.shadow.camera.bottom = -25;
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = 70;
    this.sun.shadow.bias = 0.00055;
    this.sun.shadow.normalBias = 0.035;
    this.scene.add(this.ambientLight, this.hemisphereLight, this.sunTarget, this.sun);
    this.updateLightingPosition();
  }

  start() {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.lastFrameTime = performance.now();
    this.animationFrameId = window.requestAnimationFrame(this.tick);
  }

  tick(now) {
    if (!this.isRunning) {
      return;
    }

    this.animationFrameId = window.requestAnimationFrame(this.tick);
    const deltaTime = Math.min((now - this.lastFrameTime) / 1000, RENDER.maxDeltaTime);
    this.lastFrameTime = now;

    this.update(deltaTime);
    this.renderer.render(this.scene, this.cameraController.camera);
  }

  update(deltaTime) {
    this.cameraController.applyZoomDelta(this.input.consumeZoomDelta());

    if (this.input.consumeChunkDebugToggle()) {
      this.world.toggleChunkDebug();
    }

    if (this.input.consumeMuteToggle()) {
      this.audio.toggle();
    }

    if (this.story.transmissionOpen && this.input.consumeCancel()) {
      this.story.dismiss();
    }

    const paused = this.story.transmissionOpen || this.respawn.active;
    this.player.update(deltaTime, this.input, this.world, !paused);
    this.world.update(deltaTime, this.player.position);
    this.combat.updateAim(this.input.getPointer());

    if (this.combat.aimPoint) {
      this.player.setAimPoint(this.combat.aimPoint);
    }

    this.resources.update(
      deltaTime,
      this.player.position,
      this.input,
      paused || this.towers.buildMode
    );
    const primaryConsumed = this.towers.update(
      deltaTime,
      this.input,
      this.combat.aimPoint,
      this.zombies,
      paused
    );
    const acceptsCombatInput = !paused && !this.towers.buildMode && !primaryConsumed;
    this.combat.update(deltaTime, this.input, acceptsCombatInput, acceptsCombatInput);
    this.crafting.update(this.input, paused);
    this.zombies.update(deltaTime, paused);
    this.cityAllies.update(deltaTime, this.zombies);
    this.serverNpcs.update(deltaTime);
    this.respawn.update(deltaTime);
    this.objectives.update();
    this.progression.update();
    this.cameraController.update(deltaTime, this.player.position);
    this.updateLightingPosition();
    this.updateHud(deltaTime);
  }

  updateHud(deltaTime) {
    const hudState = {
      player: this.player.getHealthSnapshot(),
      weapon: this.combat.getSnapshot(),
      inventory: this.inventory.snapshot(),
      resource: this.resources.getSnapshot(),
      build: this.towers.getBuildSnapshot(),
      tower: this.towers.getActiveSnapshot(),
      towers: this.towers.getListSnapshot(),
      story: this.story.getSnapshot(),
      objective: this.objectives.getSnapshot(),
      progression: this.progression.getSnapshot(),
      mapMode: this.gameOptions.lab?.mapMode ?? 'forest',
      onlineQuests: this.serverNpcs.getQuestSnapshot(),
      economy: this.serverNpcs.getEconomySnapshot(),
      respawn: this.respawn.getSnapshot(),
      audioEnabled: this.audio.isEnabled(),
      audioVolume: this.audio.getVolume(),
      position: {
        x: this.player.position.x,
        z: this.player.position.z
      }
    };
    this.hud.update(deltaTime, hudState);
    this.overlay.update(deltaTime, hudState);
  }

  applyGameOptions(options, applyOptions = {}) {
    this.gameOptions = options;
    const lab = options?.lab ?? {};
    this.world.applyOptions(lab, applyOptions);
    this.zombies.applyOptions(lab);
    this.towers.applyOptions(lab);
    this.serverNpcs.applyOptions(lab);
    this.cityAllies.applyOptions(lab);
  }

  createSaveSnapshot() {
    const towerState = this.towers.snapshot();
    return {
      version: 1,
      inventory: this.inventory.snapshot(),
      magazine: this.combat.magazine,
      towers: towerState.towers,
      activeCheckpointId: towerState.activeCheckpointId,
      storyStep: this.story.stepIndex,
      northProgress: this.objectives.snapshot()
    };
  }

  scheduleSave() {
    this.saveSystem.schedule(() => this.createSaveSnapshot());
  }

  updateLightingPosition() {
    if (!this.sun) {
      return;
    }

    this.sunTarget.position.set(this.player.position.x, 0, this.player.position.z);
    this.sun.position.copy(this.sunTarget.position).add(this.sunOffset);
    this.sunTarget.updateMatrixWorld();
  }

  handleResize() {
    this.resize();
  }

  resize() {
    const bounds = this.root.getBoundingClientRect();
    const width = bounds.width || window.innerWidth;
    const height = bounds.height || window.innerHeight;
    const renderSize = this.renderer.resize(width, height);
    this.cameraController.resize(renderSize.internalWidth, renderSize.internalHeight);
  }

  handlePageHide() {
    this.dispose();
  }

  dispose() {
    if (!this.renderer) {
      return;
    }

    this.isRunning = false;
    window.cancelAnimationFrame(this.animationFrameId);
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('pagehide', this.handlePageHide);
    this.saveSystem.save(this.createSaveSnapshot());
    this.saveUnsubscribers.forEach((unsubscribe) => unsubscribe());
    this.saveUnsubscribers.length = 0;

    this.input.dispose();
    this.overlay.dispose();
    this.hud.dispose();
    this.story.dispose();
    this.respawn.dispose();
    this.combat.dispose();
    this.towers.dispose();
    this.serverNpcs.dispose();
    this.cityAllies.dispose();
    this.zombies.dispose();
    this.player.dispose();
    this.world.dispose();
    this.saveSystem.dispose();
    this.audio.dispose();
    this.eventBus.clear();
    this.renderer.dispose();
    this.renderer = null;
  }
}
