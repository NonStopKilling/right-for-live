import * as THREE from 'three';
import { WORLD, hash2D } from '../utils/constants.js';
import { ISLAND, ISLAND_BOATS, ISLAND_PLACES, MOAI_PLACEMENTS, isIslandAhu, isIslandDock } from './IslandMap.js';
import { addMoai } from './MoaiRecipe.js';

export class IslandSystem {
  constructor(terrain) {
    this.terrain = terrain;
    this.geometries = {
      box: new THREE.BoxGeometry(1,1,1),
      round: new THREE.CylinderGeometry(0.48,0.5,1,9),
      rock: new THREE.DodecahedronGeometry(0.5,0),
      body: new THREE.CylinderGeometry(0.68,0.48,1,4,1,false,Math.PI/4),
      head: new THREE.CylinderGeometry(0.62,0.49,1,4,1,false,Math.PI/4),
      nose: new THREE.CylinderGeometry(0.13,0.5,1,3,1,false,Math.PI)
    };
    this.material = new THREE.MeshStandardMaterial({color:0xffffff,roughness:0.86,flatShading:true});
    this.boatMaterials = new Map();
    this.time = 0;
    this.sailGeometry = new THREE.BufferGeometry();
    this.sailGeometry.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0, 1.5,0,0, 0,2.8,0],3));
    this.sailGeometry.computeVertexNormals();
  }

  createChunkGroup(cells, key) {
    const group = new THREE.Group();
    group.name = `Island-${key}`;
    if (this.terrain.options.mapMode !== 'island') return group;
    const batches = new Map();
    const push = (shape,x,y,z,sx,sy,sz,color,ry=0) => {
      if (!batches.has(shape)) batches.set(shape,[]);
      batches.get(shape).push({x,y,z,sx,sy,sz,color,ry});
    };
    const box = (...args) => push('box',...args);
    for (const cell of cells) {
      const {gx,gz} = cell;
      const {x,z} = this.terrain.gridToWorld(gx,gz);
      const y = cell.level * WORLD.blockHeight;
      const random = hash2D(gx,gz,this.terrain.seed(2201));
      if (isIslandDock(gx,gz)) {
        box(x,ISLAND.dockHeight-0.08,z,0.81,0.16,0.81,0x9d7147);
        // Posts on the sides, leaving the walking lane clear.
        const edge = !isIslandDock(gx,gz+1) || !isIslandDock(gx+1,gz);
        if (edge && (gx+gz)%3 === 0) {
          box(x,0.6,z,0.16,1.25,0.16,0x634b36);
          box(x,1.2,z,0.23,0.08,0.23,0xe8d5a4);
        }
      }
      if (cell.water && cell.shore > -18 && random > 0.95 && !isIslandDock(gx,gz)) {
        const h = Math.min(0.48,cell.depth*0.8);
        if (h > 0.06) push('rock',x,y+h/2,z,0.6+random*0.7,h,0.5+random*0.6,
          random > 0.975 ? 0x73796b : 0x63746f,random*6);
      }
      if (isIslandAhu(gx,gz)) {
        box(x,y+0.18,z,WORLD.cellSize,0.36,WORLD.cellSize,0x575b50);
        box(x,y+0.4,z,WORLD.cellSize,0.08,WORLD.cellSize,0x83836e);
      }
      for (const place of ISLAND_PLACES) {
        const dx = gx-place.gx, dz = gz-place.gz;
        if (Math.abs(dx) > 10 || Math.abs(dz) > 10) continue;
        if (place.kind === 'houses' && Math.abs(dx) <= 4 && Math.abs(dz) <= 4 &&
            dx % 4 === 0 && dz % 4 === 0 && !cell.water) {
          push('round',x,y+0.22,z,2.2,0.45,1.75,0x5d6257);
          box(x,y+0.42,z,1.42,0.18,1.12,0x757c6c);
          box(x,y+0.38,z+0.92,0.43,0.42,0.09,0x242c2c);
        }
        if (place.kind === 'stoneWall' && dz === 0 && Math.abs(dx) <= 9 && !cell.water) {
          box(x,y+0.3,z,0.84,0.6,0.73,dx % 2 ? 0x888a7b : 0x697266);
          box(x,y+0.67,z,0.84,0.14,0.74,0xa3a28a);
        }
        if (place.kind === 'redQuarry' && Math.abs(dx) <= 6 && Math.abs(dz) <= 6 &&
            (dx + dz) % 3 === 0 && random > 0.3 && !cell.water) {
          const h = 0.55 + random * 0.8;
          push('round',x,y+h/2,z,0.75,h,0.72,random > 0.7 ? 0x985a43 : 0x784839);
        }
        if (place.kind === 'cave' && Math.abs(dx) <= 1 && Math.abs(dz) <= 1 && !cell.water) {
          if (dz === 1 && dx === 0) box(x,y+0.58,z,1.3,1.15,0.16,0x1f2928);
          else if (dx !== 0 && dz === 1) push('rock',x,y+0.65,z,1.4,1.4,1.2,0x606c61);
          else if (dz === 0) push('rock',x,y+1.28,z,1.3,0.9,1.2,0x747e6b);
        }
        if (place.kind === 'fallenMoai' && Math.abs(dx) <= 6 && Math.abs(dz) <= 2 &&
            (dx + 6) % 3 === 0 && dz === 0 && !cell.water) {
          box(x,y+0.16,z,1.3,0.32,1.12,0x555c52);
          push('head',x,y+0.43,z,1.2,0.62,0.86,0x777a68,random * 0.7);
          box(x+0.29,y+0.72,z+0.34,0.18,0.18,0.18,0x999786);
        }
        if (place.kind === 'beach' && Math.abs(dx) <= 5 && Math.abs(dz) <= 2 &&
            random > 0.96 && !cell.water) push('rock',x,y+0.17,z,0.66,0.34,0.57,0xc18c66);
        if (place.kind === 'islet' && Math.abs(dx) <= 3 && Math.abs(dz) <= 3 &&
            random > 0.7 && !cell.water) push('rock',x,y+0.4,z,1.0,0.8,0.9,0x54625e);
      }
      for (const placement of MOAI_PLACEMENTS) {
        if (gx !== Math.round(placement.gx) || gz !== Math.round(placement.gz)) continue;
        const {site,index} = placement;
        const px = placement.gx*WORLD.cellSize, pz = placement.gz*WORLD.cellSize;
        const base = site.quarry ? this.terrain.getHeightAtWorld(px,pz) : 2.04;
        addMoai(push,px,base,pz,site.angle,(site.scale ?? 1) * (0.88+(index%4)*0.09),site.pukao && index<4,site.quarry);
      }
      if (ISLAND_BOATS.some(boat => boat.gx===gx && boat.gz===gz)) group.add(this.createBoat(x,z,random));
    }
    for (const [shape,pieces] of batches) {
      const mesh = new THREE.InstancedMesh(this.geometries[shape],this.material,pieces.length);
      mesh.name = `Island-${shape}`;
      const object = new THREE.Object3D();
      const color = new THREE.Color();
      pieces.forEach((p,i) => {
        object.position.set(p.x,p.y,p.z); object.rotation.set(0,p.ry,0);
        object.scale.set(p.sx,p.sy,p.sz); object.updateMatrix();
        mesh.setMatrixAt(i,object.matrix); mesh.setColorAt(i,color.setHex(p.color));
      });
      mesh.castShadow = true; mesh.receiveShadow = true;
      mesh.computeBoundingSphere(); group.add(mesh);
    }
    return group;
  }

  createBoat(x,z,phase) {
    const boat = new THREE.Group(); boat.name = 'IslandBoat';
    boat.position.set(x,ISLAND.seaLevel+0.14,z);
    boat.rotation.y = -0.4;
    boat.userData.phase = phase*6;
    const part = (px,py,pz,sx,sy,sz,color) => {
      const mesh = new THREE.Mesh(this.geometries.box,this.boatMaterial(color));
      mesh.position.set(px,py,pz); mesh.scale.set(sx,sy,sz); boat.add(mesh);
    };
    part(0,0,0,1.45,0.34,3.5,0x73462e);
    part(0,0.2,0,1.2,0.12,3.2,0xc89e62);
    part(-0.7,0.29,0,0.12,0.4,3.5,0x365c65);
    part(0.7,0.29,0,0.12,0.4,3.5,0x365c65);
    part(0,0.12,-1.88,0.9,0.37,0.4,0x365c65);
    part(0,1.8,0,0.12,3.5,0.12,0x765c3c);
    part(0,0.7,0.5,1.1,0.18,0.35,0x9c6c43);
    const sail = new THREE.Mesh(this.sailGeometry,this.boatMaterial(0xf2e5bf));
    sail.position.set(0.06,0.65,0); boat.add(sail);
    const jib = new THREE.Mesh(this.sailGeometry,this.boatMaterial(0xcd9970));
    jib.scale.set(-0.68,0.72,1); jib.position.set(-0.06,0.75,0); boat.add(jib);
    return boat;
  }

  boatMaterial(color) {
    if (!this.boatMaterials.has(color)) this.boatMaterials.set(color,
      new THREE.MeshStandardMaterial({color,roughness:0.7,side:THREE.DoubleSide}));
    return this.boatMaterials.get(color);
  }

  update(deltaTime,chunks) {
    this.time += deltaTime;
    for (const chunk of chunks.values()) for (const boat of chunk.layers.island.children) {
      if (boat.name !== 'IslandBoat') continue;
      boat.position.y = ISLAND.seaLevel+0.14+Math.sin(this.time*1.2+boat.userData.phase)*0.055;
      boat.rotation.z = Math.sin(this.time+boat.userData.phase)*0.045;
    }
  }

  dispose() {
    Object.values(this.geometries).forEach(geometry => geometry.dispose());
    this.sailGeometry.dispose(); this.material.dispose();
    this.boatMaterials.forEach(material => material.dispose());
  }
}
