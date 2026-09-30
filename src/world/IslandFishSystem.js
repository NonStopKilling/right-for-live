import * as THREE from 'three';
import { DEFAULT_LAB_OPTIONS } from '../config/gameOptions.js';
import { WORLD, hash2D } from '../utils/constants.js';

const PALETTE = [0x294e59, 0x365f68, 0x565b52, 0x675448];
const MATRIX_OBJECT = new THREE.Object3D();
const COLOR = new THREE.Color();

function fishGeometry() {
  // Two facets for the body, a forked tail and two fins: recognizable at 5-12 pixels.
  const triangles = [
    0.28,0,0, -0.11,0,-0.13, -0.11,0,0.13,
    0.28,0,0, -0.11,0,0.13, -0.27,0,0,
    -0.2,0,0, -0.43,0,-0.16, -0.36,0,0,
    -0.2,0,0, -0.36,0,0, -0.43,0,0.16,
    -0.02,0,-0.08, -0.12,0,-0.22, 0.1,0,-0.08,
    -0.02,0,0.08, 0.1,0,0.08, -0.12,0,0.22
  ];
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(triangles, 3));
  geometry.computeVertexNormals();
  return geometry;
}

export class IslandFishSystem {
  constructor(terrain) {
    this.terrain = terrain;
    this.options = structuredClone(DEFAULT_LAB_OPTIONS);
    this.geometry = fishGeometry();
    this.material = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    this.time = 0;
  }

  applyOptions(options = {}) {
    this.options = { ...this.options, ...options };
  }

  createChunkGroup(cells, key) {
    const group = new THREE.Group();
    group.name = `Fish-${key}`;
    group.userData.schools = [];
    if (this.options.mapMode !== 'island' || !this.options.islandFishEnabled || !this.options.waterEnabled) return group;
    const density = Math.max(0, Math.min(1, Number(this.options.islandFishDensity) / 100));
    if (density === 0) return group;
    let schoolCount = 0, soloCount = 0;
    for (const cell of cells) {
      if (!cell.water || cell.lake || cell.shore < -15 || cell.shore > -1.5 ||
          cell.gx % 7 !== 0 || cell.gz % 7 !== 0) continue;
      const chance = hash2D(cell.gx,cell.gz,this.terrain.seed(3301));
      if (chance < 0.44 || chance > 0.44 + density * 0.5) continue;
      const {x,z} = this.terrain.gridToWorld(cell.gx,cell.gz);
      const large = hash2D(cell.gx,cell.gz,this.terrain.seed(3319)) > 0.8;
      const count = large ? 1 : 3 + Math.floor(hash2D(cell.gx,cell.gz,this.terrain.seed(3309)) * 3);
      const angle = hash2D(cell.gx,cell.gz,this.terrain.seed(3313)) * Math.PI * 2;
      const school = {x,z,homeX:x,homeZ:z,y:cell.waterLevel-0.1,angle,
        vx:Math.cos(angle),vz:Math.sin(angle),phase:angle*2,large,
        count,start:large?soloCount:schoolCount,
        color:PALETTE[Math.floor(chance*PALETTE.length)]};
      group.userData.schools.push(school);
      if (large) soloCount++; else schoolCount += count;
    }
    for (const [large,count] of [[false,schoolCount],[true,soloCount]]) {
      if (!count) continue;
      const mesh = new THREE.InstancedMesh(this.geometry,this.material,count);
      mesh.name = large ? 'LargeCoastalFish' : 'CoastalShoals';
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      mesh.userData.large = large;
      group.add(mesh);
    }
    this.updateGroup(group,0,[]);
    return group;
  }

  update(deltaTime, chunks, threats = []) {
    if (!this.options.islandFishEnabled || this.options.mapMode !== 'island') return;
    this.time += deltaTime;
    for (const chunk of chunks.values()) this.updateGroup(chunk.layers.fish,deltaTime,threats);
  }

  updateGroup(group,deltaTime,threats) {
    const schools = group.userData.schools;
    if (!schools?.length) return;
    for (const school of schools) {
      let fleeX = 0, fleeZ = 0;
      for (const threat of threats) {
        const dx = school.x-threat.x, dz = school.z-threat.z;
        const distance = Math.hypot(dx,dz);
        if (distance < 5.5 && distance > 0.0001) {
          const influence = (5.5-distance)/distance;
          fleeX += dx*influence;
          fleeZ += dz*influence;
        }
      }
      if (fleeX || fleeZ) {
        const length = Math.hypot(fleeX,fleeZ);
        school.vx = fleeX/length; school.vz = fleeZ/length;
      } else {
        const turn = Math.sin(this.time*0.64+school.phase)*0.045;
        const angle = Math.atan2(school.vz,school.vx)+turn*deltaTime;
        school.vx = Math.cos(angle); school.vz = Math.sin(angle);
        const homeDistance = Math.hypot(school.x-school.homeX,school.z-school.homeZ);
        if (homeDistance > 3.6) {
          const homeAngle = Math.atan2(school.homeZ-school.z,school.homeX-school.x);
          school.vx = Math.cos(homeAngle); school.vz = Math.sin(homeAngle);
        }
      }
      const speed = school.large ? 0.38 : 0.58;
      const nextX = school.x+school.vx*speed*deltaTime;
      const nextZ = school.z+school.vz*speed*deltaTime;
      const {gx,gz} = this.terrain.worldToGrid(nextX,nextZ);
      const cell = this.terrain.getCell(gx,gz);
      if (cell.water && !cell.lake && cell.shore > -18) {
        school.x=nextX; school.z=nextZ;
      } else {
        school.vx=-school.vx; school.vz=-school.vz;
      }
      school.angle = Math.atan2(school.vz,school.vx);
      const mesh = group.children.find(object=>object.userData.large===school.large);
      for (let index=0;index<school.count;index++) {
        const spread = school.count === 1 ? 0 : (index-(school.count-1)/2)*0.27;
        const swim = Math.sin(this.time*4+school.phase+index)*0.05;
        const offsetX = -index*0.16;
        const px = school.x+offsetX*school.vx-spread*school.vz;
        const pz = school.z+offsetX*school.vz+spread*school.vx;
        MATRIX_OBJECT.position.set(px,school.y+swim,pz);
        MATRIX_OBJECT.rotation.set(0,-school.angle+Math.sin(this.time*5+index)*0.08,0);
        MATRIX_OBJECT.scale.setScalar(school.large?1.7:0.57);
        MATRIX_OBJECT.updateMatrix();
        const id = school.start+index;
        mesh.setMatrixAt(id,MATRIX_OBJECT.matrix);
        mesh.setColorAt(id,COLOR.setHex(school.color));
      }
    }
    for (const mesh of group.children) {
      mesh.instanceMatrix.needsUpdate = true;
      mesh.instanceColor.needsUpdate = true;
      mesh.computeBoundingSphere();
    }
  }

  dispose() {
    this.geometry.dispose(); this.material.dispose();
  }
}
