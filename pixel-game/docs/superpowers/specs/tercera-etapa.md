Ahora quiero convertir World/Terrain en un generador procedural reproducible.

REQUISITOS

Implementa un sistema de seed.

Por ejemplo:

const world = new World({
    seed: 12345
});

La misma seed debe generar siempre el mismo mundo.

Genera:

- altura del terreno;
- densidad del bosque;
- pequeñas rocas;
- claros;
- variaciones de color;
- caminos naturales.

No agregues todavía un mapa infinito.

Por ahora usa aproximadamente 64x64 tiles.

Necesito funciones conceptualmente equivalentes a:

getHeight(x, z)
getTileType(x, z)
isWalkable(x, z)

Tipos iniciales:

GRASS
DIRT
STONE
WATER

Agrega agua en depresiones.

El personaje no debe poder caminar sobre agua.

No uses Math.random directamente para generación procedural.
Usa un PRNG determinado por la seed.

Mantén todo desacoplado de Three.js cuando sea razonable:
los datos del mundo y su representación visual no deberían ser exactamente la misma cosa.

Ejecuta npm run build al terminar y corrige cualquier error.