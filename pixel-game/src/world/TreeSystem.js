import * as THREE from 'three';
import { COLORS, WORLD, hash2D } from '../utils/constants.js';

const MATRIX = new THREE.Matrix4();
const COLOR = new THREE.Color();
const QUATERNION = new THREE.Quaternion();

export class TreeSystem {
  constructor(terrain) {
    this.terrain = terrain;
    this.group = new THREE.Group();
    this.group.name = 'TreeSystem';
    this.trees = this.generateTrees();
    this.buildMeshes();
  }

  generateTrees() {
    const trees = [];

    for (const cell of this.terrain.cells.values()) {
      const distanceFromCenter = Math.hypot(cell.gx, cell.gz);
      const edge = Math.max(Math.abs(cell.gx), Math.abs(cell.gz));
      const density = hash2D(cell.gx, cell.gz, WORLD.seed + 701);

      if (cell.kind !== 'grass' || distanceFromCenter < 9 || edge > 26 || density < 0.81) {
        continue;
      }

      const variety = hash2D(cell.gx, cell.gz, WORLD.seed + 911);
      const height = 11 + Math.floor(variety * 10);
      const colorPatch = hash2D(Math.floor(cell.gx / 5), Math.floor(cell.gz / 5), WORLD.seed + 1001);
      const tone = hash2D(cell.gx, cell.gz, WORLD.seed + 1001);
      const palette = this.resolvePalette(tone, colorPatch, cell.gx, cell.gz);

      trees.push({
        gx: cell.gx,
        gz: cell.gz,
        baseY: cell.level * WORLD.blockHeight,
        height,
        width: 0.54 + variety * 0.68,
        rotation: Math.round(variety * 3) * (Math.PI / 2),
        palette: palette.type,
        color: palette.color,
        shade: palette.shade,
        highlight: palette.highlight
      });
    }

    return trees.slice(0, 168);
  }

  resolvePalette(tone, colorPatch, gx, gz) {
    const ridgeBias = Math.sin(gx * 0.32 + gz * 0.19) * 0.16;
    const signal = Math.max(0, Math.min(1, tone * 0.56 + colorPatch * 0.52 + ridgeBias));

    if (signal > 0.68 || (gx < -9 && colorPatch > 0.42)) {
      return {
        type: 'dry',
        color: COLORS.dryNeedles,
        shade: 0xb05b49,
        highlight: 0xffb16b
      };
    }

    if (signal > 0.48 || (gz > 10 && colorPatch > 0.44)) {
      return {
        type: 'amber',
        color: COLORS.amberNeedles,
        shade: 0xb77945,
        highlight: COLORS.evergreenLight
      };
    }

    if (signal > 0.25) {
      return {
        type: 'lime',
        color: COLORS.limeNeedles,
        shade: COLORS.grassDark,
        highlight: COLORS.evergreenLight
      };
    }

    if (signal < 0.16) {
      return {
        type: 'blue',
        color: COLORS.evergreenBlue,
        shade: COLORS.evergreenBlue,
        highlight: COLORS.stoneCool
      };
    }

    return {
      type: 'green',
      color: COLORS.evergreen,
      shade: COLORS.grassDark,
      highlight: COLORS.limeNeedles
    };
  }

  buildMeshes() {
    this.buildTrunks();
    this.buildCanopyLayers();
    this.buildCanopyHighlights();
  }

  buildTrunks() {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshLambertMaterial({
      color: COLORS.trunk,
      emissive: 0x3d2a18,
      emissiveIntensity: 0.72,
      flatShading: true
    });
    const mesh = new THREE.InstancedMesh(geometry, material, this.trees.length);
    mesh.name = 'TreeTrunks';
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    this.trees.forEach((tree, index) => {
      const { x, z } = this.terrain.gridToWorld(tree.gx, tree.gz);
      MATRIX.compose(
        new THREE.Vector3(x, tree.baseY + 0.3, z),
        QUATERNION,
        new THREE.Vector3(0.14, 0.62, 0.14)
      );
      mesh.setMatrixAt(index, MATRIX);
    });

    mesh.instanceMatrix.needsUpdate = true;
    this.group.add(mesh);
  }

  buildCanopyLayers() {
    const maxLayers = Math.max(...this.trees.map((tree) => tree.height));
    const treesByPalette = this.groupTreesByPalette();

    for (let layer = 0; layer < maxLayers; layer += 1) {
      for (const [palette, trees] of treesByPalette) {
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshLambertMaterial({
          color: 0xffffff,
          emissive: this.resolvePaletteEmission(palette),
          emissiveIntensity: 0.72,
          flatShading: true,
          vertexColors: true
        });
        const mesh = new THREE.InstancedMesh(geometry, material, trees.length);
        mesh.name = `CanopyLayer${layer + 1}-${palette}`;
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        trees.forEach((tree, index) => {
          const { x, z } = this.terrain.gridToWorld(tree.gx, tree.gz);

          if (layer >= tree.height) {
            MATRIX.makeScale(0, 0, 0);
            mesh.setMatrixAt(index, MATRIX);
            mesh.setColorAt(index, COLOR.setHex(tree.color));
            return;
          }

          const normalized = layer / Math.max(1, tree.height - 1);
          const width = tree.width * (1 - normalized * 0.9);
          const layerHeight = 0.13;
          const y = tree.baseY + 0.5 + layer * 0.27;

          QUATERNION.setFromAxisAngle(new THREE.Vector3(0, 1, 0), tree.rotation);
          MATRIX.compose(
            new THREE.Vector3(x, y, z),
            QUATERNION,
            new THREE.Vector3(Math.max(0.08, width), layerHeight, Math.max(0.08, width))
          );
          mesh.setMatrixAt(index, MATRIX);

          const color = layer > tree.height * 0.72 ? tree.highlight : layer < 3 ? tree.shade : tree.color;
          const band = layer % 2 === 0 ? 1.18 : 0.9;
          const crownLight = layer > tree.height * 0.58 ? 1.18 : 1.06;
          mesh.setColorAt(index, COLOR.setHex(color).multiplyScalar((1.1 + normalized * 0.32) * band * crownLight));
        });

        mesh.instanceMatrix.needsUpdate = true;
        mesh.instanceColor.needsUpdate = true;
        this.group.add(mesh);
      }
    }
  }

  groupTreesByPalette() {
    const groups = new Map();

    this.trees.forEach((tree) => {
      if (!groups.has(tree.palette)) {
        groups.set(tree.palette, []);
      }

      groups.get(tree.palette).push(tree);
    });

    return groups;
  }

  resolvePaletteEmission(palette) {
    return {
      dry: 0x673329,
      amber: 0x6b4d26,
      lime: 0x53662b,
      blue: 0x2e5547,
      green: 0x3f5427
    }[palette] ?? 0x3f5427;
  }

  buildCanopyHighlights() {
    const maxLayers = Math.max(...this.trees.map((tree) => tree.height));

    for (let layer = 0; layer < maxLayers; layer += 1) {
      if (layer % 2 !== 0) {
        continue;
      }

      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const material = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        vertexColors: true,
        transparent: true,
        opacity: 0.72,
        depthWrite: false,
        fog: false
      });
      const mesh = new THREE.InstancedMesh(geometry, material, this.trees.length);
      mesh.name = `CanopyHighlight${layer + 1}`;

      this.trees.forEach((tree, index) => {
        const { x, z } = this.terrain.gridToWorld(tree.gx, tree.gz);

        if (layer >= tree.height) {
          MATRIX.makeScale(0, 0, 0);
          mesh.setMatrixAt(index, MATRIX);
          return;
        }

        const normalized = layer / Math.max(1, tree.height - 1);
        const width = Math.max(0.08, tree.width * (1 - normalized * 0.9));
        const y = tree.baseY + 0.5 + layer * 0.27 + 0.076;

        QUATERNION.setFromAxisAngle(new THREE.Vector3(0, 1, 0), tree.rotation);
        MATRIX.compose(
          new THREE.Vector3(x, y, z),
          QUATERNION,
          new THREE.Vector3(width * 0.88, 0.018, width * 0.88)
        );
        mesh.setMatrixAt(index, MATRIX);

        const topColor = layer > tree.height * 0.72 ? tree.highlight : tree.color;
        mesh.setColorAt(index, COLOR.setHex(topColor).multiplyScalar(1.32 + normalized * 0.34));
      });

      mesh.instanceMatrix.needsUpdate = true;
      mesh.instanceColor.needsUpdate = true;
      this.group.add(mesh);
    }
  }

  dispose() {
    this.group.traverse((object) => {
      object.geometry?.dispose();

      if (Array.isArray(object.material)) {
        object.material.forEach((material) => material.dispose());
      } else {
        object.material?.dispose();
      }
    });
    this.group.clear();
  }
}
