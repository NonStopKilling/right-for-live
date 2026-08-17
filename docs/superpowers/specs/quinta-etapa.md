Ahora quiero preparar el mundo para mapas grandes.

Implementa chunks.

Cada chunk tendrá:

16x16 tiles.

Conceptualmente:

Chunk
    x
    z
    terrain
    objects
    instances

World debe mantener un Map de chunks cargados.

Usa claves como:

"x,z"

Por ejemplo:

"0,0"
"1,0"
"-1,2"

Carga chunks alrededor del jugador.

Por ahora utiliza:

renderDistance = 3

Eso significa cargar solamente los chunks alrededor del jugador.

Cuando el jugador se aleje:

- crea los nuevos chunks necesarios;
- elimina los que queden suficientemente lejos;
- libera geometrías/materiales únicamente cuando corresponda;
- evita memory leaks.

IMPORTANTE:

La generación debe seguir siendo determinística.

Un chunk generado con:

seed + chunk coordinates

debe reconstruirse exactamente igual.

Añade una opción debug que permita visualizar los bordes de chunks pulsando F2.

No implementes todavía streaming desde servidor.

Verifica rendimiento y npm run build.