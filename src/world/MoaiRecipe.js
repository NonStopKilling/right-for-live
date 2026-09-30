// Procedural interpretation of elongated heads, brows, ears and hands seen in moai.
// push(shape, x,y,z, width,height,depth, color, rotationY) batches shared geometry.
export function addMoai(push, x, y, z, angle, scale, pukao, buried = false) {
  const stone = 0x766e5c, light = 0x8b826b, shadow = 0x514c42;
  const originY = y - (buried ? 1.5 * scale : 0);
  const part = (shape, px, py, pz, sx, sy, sz, color) => {
    push(shape, x + (px*Math.cos(angle)+pz*Math.sin(angle))*scale,
      originY+py*scale,z+(-px*Math.sin(angle)+pz*Math.cos(angle))*scale,
      sx*scale,sy*scale,sz*scale,color,angle);
  };
  part('box',0,0.17,0,1.6,0.34,1.1,shadow);
  part('body',0,1.19,0,1.3,1.8,0.84,stone);
  part('box',0,2.07,0,0.62,0.35,0.62,shadow);
  part('head',0,3.23,0.03,1.1,2.15,0.97,stone);
  part('box',0,2.29,0.26,0.78,0.23,0.83,light); // projecting chin
  part('box',0,2.57,0.54,0.55,0.14,0.21,shadow);
  part('box',0,2.65,0.56,0.62,0.1,0.22,light);
  part('nose',0,3.19,0.67,0.28,1.07,0.65,light);
  part('box',0,2.78,0.75,0.39,0.17,0.3,stone);
  for (const side of [-1,1]) {
    part('box',side*0.31,3.65,0.54,0.48,0.17,0.25,light);
    part('box',side*0.28,3.48,0.51,0.32,0.14,0.06,shadow);
    part('box',side*0.57,3.28,0.01,0.18,1.15,0.36,light);
    part('box',side*0.66,3.31,0.09,0.035,0.74,0.13,shadow);
    part('box',side*0.6,1.29,0.12,0.2,1.37,0.49,shadow);
    part('box',side*0.4,0.69,0.47,0.43,0.15,0.14,light);
    for (let f = 0; f < 4; f++) part('box',side*(0.21+f*0.085),0.76,0.56,0.035,0.23,0.035,shadow);
    part('box',side*0.12,2.76,0.92,0.07,0.07,0.04,shadow);
  }
  // Small worn patches on the stone, kept subtler than the carved features.
  part('box',-0.26,3.95,0.53,0.18,0.12,0.035,0x959077);
  part('box',0.38,2.95,0.54,0.11,0.21,0.035,0x68694f);
  part('box',-0.3,1.5,0.46,0.19,0.11,0.035,0x919079);
  if (pukao) {
    part('round',0,4.55,-0.02,1.43,0.76,1.27,0x884f3d);
    part('round',0,4.99,-0.02,0.62,0.18,0.59,0x754536);
  }
}
