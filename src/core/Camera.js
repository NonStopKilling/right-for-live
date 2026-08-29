import * as THREE from 'three';
import { CAMERA, clamp, damping } from '../utils/constants.js';

export class CameraController {
  constructor() {
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, CAMERA.near, CAMERA.far);
    this.target = new THREE.Vector3();
    this.followTarget = new THREE.Vector3();
    this.offset = new THREE.Vector3(CAMERA.offset.x, CAMERA.offset.y, CAMERA.offset.z);
    this.zoom = 1;
    this.aspect = 1;
    this.zoomRange = 1.3;

    this.camera.position.copy(this.offset);
    this.camera.lookAt(this.target);
  }

  applyOptions(options = {}) {
    const view = options.cameraView ?? 'normal';
    const range = Math.max(0.9, Math.min(1.8, Number(options.cameraZoomRange ?? 130) / 100));
    this.zoomRange = range;

    if (view === 'wide') {
      this.offset.set(16.4, 13.4, 16.4);
    } else if (view === 'close') {
      this.offset.set(9.8, 8.2, 9.8);
    } else {
      this.offset.set(CAMERA.offset.x, CAMERA.offset.y, CAMERA.offset.z);
    }

    this.zoom = clamp(this.zoom, CAMERA.minZoom / range, CAMERA.maxZoom * range);
    this.applyProjection();
  }

  resize(width, height) {
    this.aspect = width / height;
    this.applyProjection();
  }

  applyZoomDelta(delta) {
    if (delta === 0) {
      return;
    }

    const zoomFactor = delta > 0 ? 0.9 : 1.1;
    this.zoom = clamp(this.zoom * zoomFactor, CAMERA.minZoom / this.zoomRange, CAMERA.maxZoom * this.zoomRange);
    this.applyProjection();
  }

  update(deltaTime, targetPosition) {
    this.followTarget.copy(targetPosition);
    this.followTarget.y += 0.35;

    const alpha = damping(deltaTime, CAMERA.followDamping);
    this.target.lerp(this.followTarget, alpha);
    this.camera.position.copy(this.target).add(this.offset);
    this.camera.lookAt(this.target);
  }

  applyProjection() {
    const halfHeight = CAMERA.viewSize / (2 * this.zoom);
    const halfWidth = halfHeight * this.aspect;

    this.camera.left = -halfWidth;
    this.camera.right = halfWidth;
    this.camera.top = halfHeight;
    this.camera.bottom = -halfHeight;
    this.camera.updateProjectionMatrix();
  }
}
