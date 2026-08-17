import * as THREE from 'three';
import { WORLD, hash2D } from '../utils/constants.js';

const MATRIX = new THREE.Matrix4();
const COLOR = new THREE.Color();
const QUATERNION = new THREE.Quaternion();
const Y_AXIS = new THREE.Vector3(0, 1, 0);
const POSITION = new THREE.Vector3();
const SCALE = new THREE.Vector3();

export class PropSystem {
  constructor(terrain, profile) {
    this.terrain = terrain;
    this.profile = profile;
    this.rockGeometry = new THREE.BoxGeometry(1, 1, 1);
    this.artifactGeometry = new THREE.BoxGeometry(1, 1, 1);
    this.spriteGeometry = new THREE.PlaneGeometry(1, 1);
    this.spriteTexture = this.createPixelSpriteTexture();
    this.materials = {
      rock: new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.86,
        metalness: 0.02,
        flatShading: true
      }),
      artifact: new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0x40d9c3,
        emissiveIntensity: profile.id === 'dark' ? 0.7 : 0.35,
        roughness: 0.42,
        metalness: 0.16,
        flatShading: true
      }),
      sprite: new THREE.MeshBasicMaterial({
        color: 0xffffff,
        map: this.spriteTexture,
        alphaTest: 0.38,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        toneMapped: false
      })
    };
  }

  createChunkGroup(cells, chunkKey, depletedResources = new Set()) {
    const group = new THREE.Group();
    group.name = `PropsChunk-${chunkKey}`;
    const rocks = [];
    const artifacts = [];
    const sprites = [];

    for (const cell of cells) {
      const isArtifact = this.shouldPlaceArtifact(cell);

      if (isArtifact && !depletedResources.has(this.getArtifactId(cell))) {
        this.addArtifactRecipe(cell, artifacts);
      }

      if (!isArtifact && this.shouldPlaceRock(cell) && !depletedResources.has(this.getRockId(cell))) {
        this.addRockRecipe(cell, rocks);
      }

      if (this.shouldPlaceSprite(cell)) {
        this.addSprite(cell, sprites);
      }
    }

    const rockMesh = this.createRockMesh(rocks);
    const artifactMesh = this.createArtifactMesh(artifacts);
    const spriteMesh = this.createSpriteMesh(sprites);

    if (rockMesh) {
      group.add(rockMesh);
    }

    if (artifactMesh) {
      group.add(artifactMesh);
    }

    if (spriteMesh) {
      group.add(spriteMesh);
    }

    return group;
  }

  getResourceNodes(cells) {
    const resources = [];

    cells.forEach((cell) => {
      const { x, z } = this.terrain.gridToWorld(cell.gx, cell.gz);
      const base = {
        gx: cell.gx,
        gz: cell.gz,
        x,
        y: cell.level * WORLD.blockHeight,
        z,
        layer: 'props'
      };

      if (this.shouldPlaceArtifact(cell)) {
        resources.push({
          ...base,
          id: this.getArtifactId(cell),
          type: 'artifact',
          label: 'FRAGMENTO EXTRANO'
        });
      } else if (this.shouldPlaceRock(cell)) {
        resources.push({
          ...base,
          id: this.getRockId(cell),
          type: 'stone',
          label: 'PIEDRA'
        });
      }
    });

    return resources;
  }

  getRockId(cell) {
    return `stone:${cell.gx}:${cell.gz}`;
  }

  getArtifactId(cell) {
    return `artifact:${cell.gx}:${cell.gz}`;
  }

  shouldPlaceRock(cell) {
    if (cell.surface === 'trail' || Math.hypot(cell.gx, cell.gz) < WORLD.originClearRadius - 1) {
      return false;
    }

    const threshold = cell.surface === 'stone' ? 0.91 : 0.982;
    return hash2D(cell.gx, cell.gz, WORLD.seed + 1009) > threshold;
  }

  shouldPlaceArtifact(cell) {
    if (cell.gx === 5 && cell.gz === -4) {
      return true;
    }

    if (cell.surface === 'trail' || Math.hypot(cell.gx, cell.gz) < WORLD.originClearRadius + 3) {
      return false;
    }

    return hash2D(cell.gx, cell.gz, WORLD.seed + 1193) > 0.997;
  }

  shouldPlaceSprite(cell) {
    if (cell.surface !== 'meadow' && cell.surface !== 'moss') {
      return false;
    }

    return hash2D(cell.gx, cell.gz, WORLD.seed + 1103) > 0.965;
  }

  addRockRecipe(cell, rocks) {
    const noise = hash2D(cell.gx, cell.gz, WORLD.seed + 1013);
    const count = noise > 0.72 ? 3 : noise > 0.36 ? 2 : 1;
    const baseY = cell.level * WORLD.blockHeight;
    const { x, z } = this.terrain.gridToWorld(cell.gx, cell.gz);
    const color = this.resolveColor(this.profile.palette.rock, noise);

    for (let index = 0; index < count; index += 1) {
      const angle = noise * Math.PI * 2 + index * 2.35;
      const width = 0.34 - index * 0.055;

      rocks.push({
        x: x + Math.cos(angle) * index * 0.12,
        y: baseY + 0.11 + index * 0.08,
        z: z + Math.sin(angle) * index * 0.12,
        rotation: angle,
        scaleX: width * (1.05 + noise * 0.28),
        scaleY: 0.2 + noise * 0.11,
        scaleZ: width * 0.82,
        color
      });
    }
  }

  addArtifactRecipe(cell, artifacts) {
    const noise = hash2D(cell.gx, cell.gz, WORLD.seed + 1201);
    const baseY = cell.level * WORLD.blockHeight;
    const { x, z } = this.terrain.gridToWorld(cell.gx, cell.gz);
    const colors = [0x146e68, 0x31b9aa, 0x8cebd2];

    for (let index = 0; index < 3; index += 1) {
      const size = 0.28 - index * 0.055;
      artifacts.push({
        x,
        y: baseY + 0.12 + index * 0.19,
        z,
        rotation: Math.PI / 4 + noise * 0.35 + index * 0.16,
        scaleX: size,
        scaleY: 0.2,
        scaleZ: size,
        color: colors[index]
      });
    }
  }

  addSprite(cell, sprites) {
    const noise = hash2D(cell.gx, cell.gz, WORLD.seed + 1117);
    const offsetNoise = hash2D(cell.gz, cell.gx, WORLD.seed + 1123);
    const { x, z } = this.terrain.gridToWorld(cell.gx, cell.gz);
    const palette = this.profile.spriteColors;

    sprites.push({
      x: x + (noise - 0.5) * WORLD.cellSize * 0.45,
      y: cell.level * WORLD.blockHeight + 0.19,
      z: z + (offsetNoise - 0.5) * WORLD.cellSize * 0.45,
      rotation: Math.PI / 4 + (noise - 0.5) * 0.24,
      scale: 0.3 + noise * 0.16,
      color: palette[Math.min(palette.length - 1, Math.floor(noise * palette.length))]
    });
  }

  createRockMesh(rocks) {
    if (rocks.length === 0) {
      return null;
    }

    const mesh = new THREE.InstancedMesh(this.rockGeometry, this.materials.rock, rocks.length);
    mesh.name = 'ChunkRocks';
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    rocks.forEach((rock, index) => {
      POSITION.set(rock.x, rock.y, rock.z);
      QUATERNION.setFromAxisAngle(Y_AXIS, rock.rotation);
      SCALE.set(rock.scaleX, rock.scaleY, rock.scaleZ);
      MATRIX.compose(POSITION, QUATERNION, SCALE);
      mesh.setMatrixAt(index, MATRIX);
      mesh.setColorAt(index, COLOR.setHex(rock.color));
    });

    mesh.instanceMatrix.needsUpdate = true;
    mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
    return mesh;
  }

  createArtifactMesh(artifacts) {
    if (artifacts.length === 0) {
      return null;
    }

    const mesh = new THREE.InstancedMesh(
      this.artifactGeometry,
      this.materials.artifact,
      artifacts.length
    );
    mesh.name = 'ChunkArtifacts';
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    artifacts.forEach((artifact, index) => {
      POSITION.set(artifact.x, artifact.y, artifact.z);
      QUATERNION.setFromAxisAngle(Y_AXIS, artifact.rotation);
      SCALE.set(artifact.scaleX, artifact.scaleY, artifact.scaleZ);
      MATRIX.compose(POSITION, QUATERNION, SCALE);
      mesh.setMatrixAt(index, MATRIX);
      mesh.setColorAt(index, COLOR.setHex(artifact.color));
    });

    mesh.instanceMatrix.needsUpdate = true;
    mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
    return mesh;
  }

  createSpriteMesh(sprites) {
    if (sprites.length === 0) {
      return null;
    }

    const mesh = new THREE.InstancedMesh(this.spriteGeometry, this.materials.sprite, sprites.length);
    mesh.name = 'PixelGrassSprites';
    mesh.renderOrder = 2;

    sprites.forEach((sprite, index) => {
      POSITION.set(sprite.x, sprite.y, sprite.z);
      QUATERNION.setFromAxisAngle(Y_AXIS, sprite.rotation);
      SCALE.set(sprite.scale, sprite.scale, sprite.scale);
      MATRIX.compose(POSITION, QUATERNION, SCALE);
      mesh.setMatrixAt(index, MATRIX);
      mesh.setColorAt(index, COLOR.setHex(sprite.color));
    });

    mesh.instanceMatrix.needsUpdate = true;
    mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
    return mesh;
  }

  createPixelSpriteTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 8;
    canvas.height = 8;
    const context = canvas.getContext('2d');

    context.clearRect(0, 0, 8, 8);
    context.fillStyle = '#ffffff';
    context.fillRect(3, 1, 2, 7);
    context.fillRect(1, 3, 2, 5);
    context.fillRect(5, 2, 2, 6);
    context.fillRect(0, 6, 8, 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
    texture.needsUpdate = true;
    return texture;
  }

  resolveColor(palette, noise) {
    return palette[Math.min(palette.length - 1, Math.floor(noise * palette.length))];
  }

  dispose() {
    this.rockGeometry.dispose();
    this.artifactGeometry.dispose();
    this.spriteGeometry.dispose();
    this.spriteTexture.dispose();
    Object.values(this.materials).forEach((material) => material.dispose());
  }
}
