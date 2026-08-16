Ahora mejora Player.

Actualmente el personaje es provisional.

Quiero:

- movimiento WASD;
- velocidad independiente de FPS usando deltaTime;
- colisión con tiles no transitables;
- movimiento relativo a la orientación isométrica;
- interpolación suave;
- orientación visual del personaje según dirección;
- pequeña animación procedural al caminar;
- cámara siguiendo al jugador mediante lerp.

La cámara NO debe estar parentada directamente al jugador.

Añade raycasting desde el mouse contra el terreno.

Cuando el cursor esté sobre un tile:
- resáltalo sutilmente;
- guarda sus coordenadas gridX/gridZ.

Al hacer click:
mueve al personaje hacia ese punto únicamente si es accesible.

Por ahora puedes implementar movimiento directo.
Deja preparada la arquitectura para añadir pathfinding después.

No agregues todavía zombies.