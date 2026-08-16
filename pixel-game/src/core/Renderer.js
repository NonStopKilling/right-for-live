import * as THREE from 'three';
import { RENDER } from '../utils/constants.js';

export class Renderer {
  constructor(canvas, profile) {
    this.canvas = canvas;
    this.instance = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: false,
      powerPreference: 'high-performance'
    });

    this.instance.outputColorSpace = THREE.SRGBColorSpace;
    this.applyVisualProfile(profile);
    this.instance.setPixelRatio(1);
    this.instance.shadowMap.enabled = true;
    this.instance.shadowMap.type = THREE.PCFShadowMap;

    this.size = {
      cssWidth: 1,
      cssHeight: 1,
      internalWidth: 1,
      internalHeight: 1
    };
  }

  applyVisualProfile(profile) {
    this.instance.toneMapping = profile.renderer.toneMapping === 'aces'
      ? THREE.ACESFilmicToneMapping
      : THREE.NoToneMapping;
    this.instance.toneMappingExposure = profile.renderer.exposure;
    this.instance.setClearColor(profile.background, 1);
  }

  resize(width, height) {
    const cssWidth = Math.max(1, Math.floor(width));
    const cssHeight = Math.max(1, Math.floor(height));
    const scale = Math.min(
      1,
      RENDER.maxInternalWidth / cssWidth,
      RENDER.maxInternalHeight / cssHeight
    );

    this.size = {
      cssWidth,
      cssHeight,
      internalWidth: Math.max(1, Math.floor(cssWidth * scale)),
      internalHeight: Math.max(1, Math.floor(cssHeight * scale))
    };

    this.instance.setSize(this.size.internalWidth, this.size.internalHeight, false);
    return this.size;
  }

  render(scene, camera) {
    this.instance.render(scene, camera);
  }

  dispose() {
    this.instance.renderLists?.dispose();
    this.instance.dispose();
  }
}
