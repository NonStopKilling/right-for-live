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

    this.camera.position.copy(this.offset);
    this.camera.lookAt(this.target);
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
    this.zoom = clamp(this.zoom * zoomFactor, CAMERA.minZoom, CAMERA.maxZoom);
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
