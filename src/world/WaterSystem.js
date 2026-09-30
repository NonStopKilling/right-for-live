import { ISLAND } from './IslandMap.js';
import * as THREE from 'three';
import { DEFAULT_LAB_OPTIONS } from '../config/gameOptions.js';
import { WORLD, hash2D } from '../utils/constants.js';

const MATRIX = new THREE.Matrix4();
const POSITION = new THREE.Vector3();
const QUATERNION = new THREE.Quaternion();
const SCALE = new THREE.Vector3();
const COLOR = new THREE.Color();

export class WaterSystem {
  constructor(terrain, profile) {
    this.terrain = terrain;
    this.profile = profile;
    this.options = structuredClone(DEFAULT_LAB_OPTIONS);
    this.oceanGeometry = new THREE.PlaneGeometry(WORLD.cellSize, WORLD.cellSize, 2, 2);
    this.oceanGeometry.rotateX(-Math.PI / 2);
    this.oceanMaterial = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
      uniforms: { time: { value: 0 }, opacity: { value: 0.72 }, naturalColors: { value: 0 } },
      vertexShader: `
        uniform float time;
        varying vec3 oceanPosition;
        varying float waterDepth;
        void main() {
          vec4 p = instanceMatrix * vec4(position, 1.0);
          waterDepth = instanceColor.r;
          p.y += (sin(p.x*1.4 + time*1.1) + sin(p.z*1.9-time*0.8))*0.014;
          oceanPosition = p.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * p;
        }`,
      fragmentShader: `
        uniform float time;
        uniform float opacity;
        uniform float naturalColors;
        varying vec3 oceanPosition;
        varying float waterDepth;
        float hash(vec2 p) {
          vec3 q = fract(vec3(p.xyx) * 0.1031);
          q += dot(q, q.yzx + 33.33);
          return fract((q.x + q.y) * q.z);
        }
        float noise(vec2 p) {
          vec2 i = floor(p), f = fract(p);
          f = f*f*(3.0-2.0*f);
          return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),
            mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
        }
        float fbm(vec2 p) {
          return noise(p)*0.57 + noise(p*2.03+7.1)*0.28 + noise(p*4.17-11.3)*0.15;
        }
        void main() {
          vec2 p = oceanPosition.xz;
          vec3 shallow = vec3(0.24,0.79,0.72);
          vec3 deep = vec3(0.025,0.32,0.49);
          shallow = mix(shallow, vec3(0.28,0.59,0.59), naturalColors);
          deep = mix(deep, vec3(0.055,0.24,0.35), naturalColors);
          vec3 color = mix(shallow, deep, smoothstep(0.0,0.58,waterDepth));
          vec2 drift = vec2(time * 0.075, -time * 0.045);
          vec2 warp = vec2(fbm(p * 0.11 + drift), fbm(p * 0.14 - drift + 18.7));
          float swell = fbm(p * vec2(0.32, 0.55) + warp * 2.8 + drift);
          float ripple = fbm(p * vec2(0.85, 1.6) + warp * 3.0 - drift * 1.7);
          color *= 0.86 + swell * 0.26;
          // Broad, irregular moving ribbons rather than a repeated dot lattice.
          float highlight = smoothstep(0.49, 0.7, ripple) * 0.12;
          float wash = fbm(p * 0.7 + warp + vec2(time * 0.12, 0.0));
          float foam = (1.0 - smoothstep(0.025, 0.15, waterDepth)) * smoothstep(0.4, 0.64, wash);
          color += vec3(0.6,0.76,0.72) * highlight + vec3(0.44,0.5,0.46) * foam;
          gl_FragColor = vec4(color,clamp(opacity+waterDepth*0.18+foam*0.18,0.1,0.94));
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`
    });
    this.geometry = new THREE.BoxGeometry(1, 1, 1);
    this.material = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: profile.id === 'dark' ? 0.48 : 0.42,
      roughness: 0.18,
      metalness: 0.02,
      depthWrite: false,
      flatShading: true
    });
  }

  applyOptions(options = {}) {
    this.options = { ...this.options, ...options };
    this.oceanMaterial.uniforms.opacity.value = Math.max(0.08, Math.min(0.86, Number(this.options.waterOpacity) / 100));
    this.oceanMaterial.uniforms.naturalColors.value = this.options.islandNaturalColors ? 1 : 0;
    this.material.opacity = Math.max(0.08, Math.min(0.86, Number(this.options.waterOpacity) / 100));
  }

  createChunkGroup(cells, chunkKey) {
    if (this.options.mapMode === 'island') return this.createOceanChunk(cells, chunkKey);
    const blocks = this.options.waterEnabled ? cells.filter((cell) => cell.water) : [];
    const group = new THREE.Group();
    group.name = `WaterChunk-${chunkKey}`;

    if (blocks.length === 0) {
      return group;
    }

    const mesh = new THREE.InstancedMesh(this.geometry, this.material, blocks.length);
    mesh.name = 'TransparentWater';
    mesh.receiveShadow = false;
    mesh.castShadow = false;
    mesh.renderOrder = 3;

    blocks.forEach((cell, index) => {
      const { x, z } = this.terrain.gridToWorld(cell.gx, cell.gz);
      const ripple = 0.92 + hash2D(cell.gx, cell.gz, this.seed(1889)) * 0.12;
      POSITION.set(x, cell.level * WORLD.blockHeight + 0.038, z);
      SCALE.set(WORLD.cellSize * 0.94, 0.036, WORLD.cellSize * 0.94);
      MATRIX.compose(POSITION, QUATERNION, SCALE);
      mesh.setMatrixAt(index, MATRIX);
      mesh.setColorAt(index, COLOR.setHex(this.resolveColor(cell)).multiplyScalar(ripple));
    });

    mesh.instanceMatrix.needsUpdate = true;
    mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
    group.add(mesh);
    return group;
  }

  createOceanChunk(cells, key) {
    const group = new THREE.Group(); group.name = `Ocean-${key}`;
    const wet = this.options.waterEnabled ? cells.filter(cell => cell.water) : [];
    if (!wet.length) return group;
    const mesh = new THREE.InstancedMesh(this.oceanGeometry, this.oceanMaterial, wet.length);
    wet.forEach((cell,i) => {
      const {x,z} = this.terrain.gridToWorld(cell.gx,cell.gz);
      MATRIX.makeTranslation(x,cell.waterLevel ?? ISLAND.seaLevel,z);
      mesh.setMatrixAt(i,MATRIX);
      mesh.setColorAt(i,new THREE.Color().setRGB(cell.depth,0,0));
    });
    mesh.instanceMatrix.needsUpdate = true; mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere(); mesh.renderOrder = 3; group.add(mesh);
    return group;
  }

  update(deltaTime) { this.oceanMaterial.uniforms.time.value += deltaTime; }

  resolveColor(cell) {
    if (this.profile.id === 'daylight') {
      return cell.moisture > 0.78 ? 0x71c9bd : 0x5eaca7;
    }

    return cell.moisture > 0.78 ? 0x3d9f9a : 0x317f83;
  }

  seed(offset) {
    return WORLD.seed + Math.floor(Number(this.options.seedOffset) || 0) + offset;
  }

  dispose() {
    this.oceanGeometry.dispose();
    this.oceanMaterial.dispose();
    this.geometry.dispose();
    this.material.dispose();
  }
}
