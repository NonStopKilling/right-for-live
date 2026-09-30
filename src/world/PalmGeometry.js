import * as THREE from 'three';

// A curved central stem with separate tapered leaflets. Local +X points outwards.
export function createPalmFrondGeometry() {
  const vertices = [];
  const bend = t => Math.sin(t * Math.PI) * 0.3 - t * t * 0.7;
  const triangle = (a, b, c) => vertices.push(...a, ...b, ...c);
  const quad = (a, b, c, d) => { triangle(a,b,c); triangle(a,c,d); };
  for (let i = 0; i < 14; i++) {
    const t = i / 14, next = (i + 1) / 14;
    const x = t * 2.6, nx = next * 2.6;
    quad([x,bend(t),-0.024],[x,bend(t),0.024],
      [nx,bend(next),0.015],[nx,bend(next),-0.015]);
    if (i < 2) continue;
    const width = Math.sin(t * Math.PI) * 0.56;
    for (const side of [-1,1]) {
      const tip = [x + 0.32, bend(t) - 0.12 - t * 0.1, width * side];
      triangle([x-0.035,bend(t),0],[x+0.19,bend(t)+0.014,0],tip);
      triangle([x+0.19,bend(t)+0.014,0],[x+0.28,bend(t)-0.012,0],tip);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  geometry.computeVertexNormals();
  return geometry;
}
