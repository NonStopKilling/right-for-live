# Replanteamiento visual y estrategia de ramas

## Estado de la decisión

Este documento registra un cambio amplio de dirección. El prototipo actual sigue siendo útil como prueba técnica, pero no se considera una base visual definitiva.

La siguiente etapa no será un ajuste menor. Se reemplazarán o rediseñarán partes importantes del terreno, la vegetación, la iluminación, la paleta y la generación del mundo. Se conservarán únicamente los contratos y módulos que sigan sirviendo al objetivo final.

No se implementarán todavía enemigos, inventario, crafting, armas ni construcción.

## Objetivo

Construir una base procedural compartida que permita comparar dos direcciones visuales sin duplicar la lógica del juego:

1. Un diorama oscuro con el escenario intensamente iluminado, inspirado en la referencia original.
2. Un bosque diurno luminoso, inspirado en la claridad visual del prototipo alternativo.

Ambas variantes usarán la misma semilla, terreno, distribución de objetos, jugador, cámara ortográfica y resolución interna. La comparación debe medir solamente el tratamiento visual.

## Qué se conserva

- Vite, JavaScript ES Modules y Three.js.
- Renderer WebGL y resolución interna reducida con escalado pixelado.
- Cámara ortográfica isométrica y seguimiento suave.
- Controles de movimiento y consultas de altura del jugador.
- Separación general entre núcleo, mundo, entidades e input.
- Uso de `InstancedMesh` para elementos repetidos.
- Generación determinista a partir de una semilla.

## Qué se reconstruirá

- `Game.addLighting()`: pasará de varias luces coloreadas y muy intensas a perfiles de iluminación controlados.
- `Terrain`: usará bloques de terreno mayores, menos ruido por celda y regiones procedurales reconocibles.
- `TreeSystem`: dejará de repetir una sola silueta de muchas capas y usará recetas de vegetación de pocas piezas.
- `PropSystem`: incorporará arbustos, rocas, hierbas y detalles distribuidos por bioma.
- Paleta: se ampliará y se organizará por familias y regiones, no por variación aleatoria de cada tile.
- `World`: se preparará para chunks deterministas y un mapa recorrible mayor.
- Materiales y tone mapping: se revisarán para recuperar separación de color, volumen y sombras legibles.

## Estrategia recomendada de ramas

Las ramas serán experimentos de corta duración. No mantendremos dos motores separados.

### `main`

Conserva una versión estable y reproducible. Antes del replanteamiento se debe guardar una captura y una compilación funcional como línea base.

### `refactor/environment-foundation`

Contendrá todo lo compartido por las dos direcciones visuales:

- generación procedural determinista;
- chunks de 16 x 16 celdas;
- bloques de terreno de mayor escala;
- catálogo de biomas y superficies;
- recetas de árboles, arbustos y rocas;
- instancing y liberación de recursos;
- perfiles configurables de iluminación y color;
- soporte opcional para sprites de detalle.

Esta rama se integrará antes de elegir un estilo definitivo. No debe convertirse en una tercera versión permanente del juego.

### `experiment/dark-diorama`

- Fondo oscuro o casi negro.
- Mundo claramente iluminado y separado del fondo.
- Sol cálido, relleno ambiental suave y sombras marcadas.
- Verdes oliva, lima, musgo, azul verdoso, amarillos, salmón y tierra.
- Niebla discreta que no apague los colores.
- Resultado cercano a una maqueta iluminada sobre un escenario oscuro.

### `experiment/daylight-voxel`

- Fondo y niebla de cielo diurno.
- Paleta más luminosa y saturada.
- Materiales con respuesta física simple y tone mapping cinematográfico.
- Misma cámara, semilla, geometría y densidad que la variante oscura.
- Resultado cercano a un videojuego voxel de aventura luminoso.

## Perfiles visuales en lugar de divergencia permanente

Las diferencias entre ramas deben concentrarse en una configuración `VisualProfile` y en materiales específicos. Un perfil contendrá, como mínimo:

- color de fondo y niebla;
- tipo, color, posición e intensidad de luces;
- exposición y tone mapping;
- familias de color por bioma;
- materiales de terreno y vegetación;
- activación y densidad de sprites de detalle.

Cuando ambas pruebas sean estables, los perfiles podrán convivir temporalmente en el mismo código y seleccionarse con un parámetro de desarrollo. Esto permitirá capturas A/B con idéntica cámara y semilla.

## Vegetación objetivo

Cada objeto se construirá mediante una receta procedural y pocas piezas compartidas:

| Tipo | Piezas objetivo | Silueta |
| --- | ---: | --- |
| Pino alto escalonado | 6-8 | Delgado, vertical y puntiagudo |
| Pino joven | 4-5 | Bajo y estrecho |
| Árbol de copa cuadrada | 5-7 | Tronco visible y copa ancha por niveles |
| Árbol seco o cálido | 5-7 | Perfil fino y color salmón, ámbar o rojizo |
| Arbusto | 1-3 | Masa baja e irregular |
| Roca | 1-3 | Volumen bajo con variaciones de escala |

Las recetas podrán variar altura, anchura, rotación, color y número de niveles sin generar una geometría única por objeto. Las instancias se agruparán por geometría y material.

## Terreno y mapa procedural

- Los bloques visibles serán mayores que los actuales.
- La variación se generará por regiones de baja frecuencia para producir claros, bosques, suelo húmedo, tierra y piedra.
- El detalle aleatorio por celda será secundario y no dominará la imagen.
- La misma combinación de semilla y coordenadas de chunk reconstruirá exactamente el mismo contenido.
- `World` mantendrá un mapa de chunks activos y cargará alrededor del jugador.
- La generación de datos se separará de la construcción de `InstancedMesh`.
- Los bordes entre chunks no deben producir cortes de altura, color, caminos o vegetación.

## Uso de sprites

Los sprites serán complementarios y no reemplazarán los volúmenes principales.

Usos previstos:

- hierba baja y flores;
- hojas sueltas y partículas;
- niebla localizada;
- marcas, musgo o variación superficial del terreno;
- pequeños efectos de interacción.

Árboles, arbustos grandes, rocas, jugador y terreno seguirán siendo geometría 3D para conservar sombras y profundidad isométrica.

## Iluminación

Cada perfil usará una jerarquía simple:

1. Una luz direccional principal que define el volumen y proyecta sombras.
2. Una luz hemisférica o ambiental de baja intensidad que evita negros cerrados.
3. Luces puntuales únicamente para hitos concretos del escenario.

Se eliminará la dependencia de materiales muy emisivos para hacer visible el mundo. El color debe provenir principalmente de la paleta, los materiales, la exposición y una iluminación coherente.

## Comparación objetiva

Las dos ramas experimentales se validarán con:

- misma semilla y posición inicial;
- misma cámara, zoom y resolución interna;
- capturas de escritorio y móvil;
- histogramas visuales sin zonas extensas aplastadas a negro o blanco;
- sombras visibles en terreno, troncos y copas;
- árboles distinguibles por silueta, no solo por color;
- compilación de Vite sin errores;
- revisión de FPS, draw calls e instancias visibles.

## Riesgos

| Riesgo | Contención |
| --- | --- |
| Las ramas divergen en lógica | Limitar cambios visuales a `VisualProfile`, materiales y composición de luces |
| El mapa grande reduce rendimiento | Chunks, instancing, distancia de render y liberación explícita de recursos |
| Los bloques grandes vuelven monótono el suelo | Regiones, desniveles, bordes irregulares y sprites de detalle opcionales |
| Los sprites rompen la profundidad | Usarlos solo en detalles, con orientación isométrica y pruebas de oclusión |
| La paleta luminosa pierde la atmósfera oscura | Separar fondo, exposición y contraste local en el perfil de diorama |
| El replanteamiento borra trabajo útil | Conservar `main`, capturas y build de referencia antes de reemplazar sistemas |

## Secuencia propuesta

1. Aislar `pixel-game` como repositorio Git propio y guardar la línea base actual.
2. Construir `refactor/environment-foundation` con generación determinista y chunks.
3. Reescribir terreno y catálogo de vegetación usando pocas piezas e instancing.
4. Implementar el sistema `VisualProfile`.
5. Crear las ramas `experiment/dark-diorama` y `experiment/daylight-voxel` desde la misma base.
6. Comparar ambas con capturas reproducibles y métricas de rendimiento.
7. Elegir una dirección principal y conservar la otra solo si aporta una variante real de juego.

## Condición previa de Git

Actualmente `pixel-game` no es un repositorio independiente. Git detecta como raíz `D:\wamp64\www`, y el directorio completo `pixel-game/` aparece sin seguimiento dentro de ese repositorio superior.

Por seguridad, no se crearán ramas ni commits hasta decidir una de estas opciones:

1. Inicializar `D:\wamp64\www\pixel-game` como repositorio Git independiente.
2. Mover el proyecto a un repositorio dedicado.
3. Incorporarlo deliberadamente al repositorio superior, opción no recomendada por contener muchos proyectos ajenos.

La recomendación es la primera opción. También se debe ignorar `node_modules/`, `dist/`, `.playwright-artifacts/` y `.superpowers/` antes del primer commit.

## Decisión pendiente

Este documento no elige todavía entre el diorama oscuro y el bosque diurno. Autoriza construir una base compartida y comparar ambas direcciones sin comprometer prematuramente el proyecto con una sola estética.
