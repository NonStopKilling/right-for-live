import * as THREE from 'three';
import { CameraController } from './Camera.js';
import { Renderer } from './Renderer.js';
import { Player } from '../entities/Player.js';
import { InputManager } from '../input/InputManager.js';
import { GameHud } from '../ui/GameHud.js';
import { World } from '../world/World.js';
import { RENDER } from '../utils/constants.js';

export class Game {
  constructor(root) {
    this.root = root;
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'game-canvas';
    this.canvas.setAttribute('aria-label', 'Bosque voxel isometrico navegable');
    this.root.replaceChildren(this.canvas);

    this.renderer = new Renderer(this.canvas);
    this.cameraController = new CameraController();
    this.scene = this.createScene();
    this.lastFrameTime = 0;
    this.input = new InputManager(this.canvas);
    this.hud = new GameHud(this.root);
    this.world = new World();
    this.player = new Player(this.world.getSpawnPoint());
    this.animationFrameId = 0;
    this.isRunning = false;

    this.world.addTo(this.scene);
    this.player.addTo(this.scene);
    this.addLighting();

    this.handleResize = this.handleResize.bind(this);
    this.handlePageHide = this.handlePageHide.bind(this);
    this.tick = this.tick.bind(this);

    window.addEventListener('resize', this.handleResize);
    window.addEventListener('pagehide', this.handlePageHide);
    this.resize();
    this.cameraController.update(1, this.player.position);
  }

  createScene() {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(RENDER.clearColor);
    scene.fog = new THREE.Fog(RENDER.fogColor, 72, 132);
    return scene;
  }

  addLighting() {
    const ambient = new THREE.AmbientLight(0xfff4cf, 3.65);
    const sky = new THREE.HemisphereLight(0xfff0ba, 0x9ebd71, 4.3);
    const greenFill = new THREE.DirectionalLight(0xdcf79e, 4.1);
    const warmFill = new THREE.DirectionalLight(0xffc781, 3.15);
    const coolRim = new THREE.DirectionalLight(0xb2f0de, 3.15);
    greenFill.position.set(-10, 8, -6);
    warmFill.position.set(8, 7, 6);
    coolRim.position.set(13, 9, -13);
    this.scene.add(ambient, sky, greenFill, warmFill, coolRim);

    const sun = new THREE.DirectionalLight(0xffdf93, 5.8);
    sun.position.set(-12, 20, 14);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -18;
    sun.shadow.camera.right = 18;
    sun.shadow.camera.top = 18;
    sun.shadow.camera.bottom = -18;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 45;
    sun.shadow.bias = 0.0008;
    sun.shadow.normalBias = 0.03;
    const sunTarget = new THREE.Object3D();
    sunTarget.position.set(0, 0, 0);
    sun.target = sunTarget;
    const clearingWarmth = new THREE.PointLight(0xffd982, 3.6, 16, 1.35);
    clearingWarmth.position.set(-4, 4, 2);
    const canopyColor = new THREE.PointLight(0xcaff83, 2.75, 19, 1.5);
    canopyColor.position.set(4, 5, -5);
    const emberBounce = new THREE.PointLight(0xff8f5c, 2.1, 13, 1.55);
    emberBounce.position.set(-7, 3.6, -4);
    this.scene.add(sunTarget, sun, clearingWarmth, canopyColor, emberBounce);
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
    this.world.update(deltaTime);
    this.player.update(deltaTime, this.input, this.world);
    this.cameraController.update(deltaTime, this.player.position);
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

    this.input.dispose();
    this.hud.dispose();
    this.player.dispose();
    this.world.dispose();
    this.renderer.dispose();
    this.renderer = null;
  }
}
