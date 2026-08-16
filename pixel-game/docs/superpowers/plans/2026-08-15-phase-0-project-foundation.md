# Plan de Ejecucion: Fase 0 - Base del Proyecto

## Objetivo

Inicializar el proyecto Vite + Three.js y dejar un bucle de juego WebGL estable, redimensionable y observable. Al finalizar, el navegador debe mostrar una escena 3D de prueba en pantalla completa, con diagnostico tecnico accesible y una ruta clara para los sistemas de las fases siguientes.

## Resultado verificable

- `npm run dev` inicia Vite sin errores.
- La pagina crea un canvas WebGL a pantalla completa.
- La escena renderiza una camara, iluminacion y geometria de diagnostico.
- El canvas conserva su proporcion y resolucion interna al redimensionar la ventana.
- `F3` muestra y oculta un overlay con FPS y tamaño de render.
- Si WebGL no esta disponible, la pagina presenta un mensaje legible sin lanzar excepciones no controladas.
- `npm run build` completa correctamente.

## Dependencias

Instalar al inicializar:

```text
three
vite
```

No instalar fisicas, audio, IA, texturas ni modelos externos en esta fase.

## Archivos a crear

| Archivo | Responsabilidad |
| --- | --- |
| `package.json` | Scripts `dev`, `build` y `preview`; dependencias de desarrollo y produccion |
| `vite.config.js` | Configuracion Vite minima; no incorporar plugins hasta que haya una necesidad real |
| `index.html` | Punto de montaje con contenedor de aplicacion y carga del modulo principal |
| `src/main.js` | Arranque, deteccion de WebGL y creacion de `Game` |
| `src/game/Game.js` | Renderer, escena, reloj, bucle `requestAnimationFrame`, resize y liberacion de recursos |
| `src/game/DebugOverlay.js` | Overlay de diagnostico activable con `F3` |
| `src/config/render.js` | Limites de pixel ratio, resolucion interna y colores de la escena de prueba |
| `src/core/dispose.js` | Utilidad central para liberar geometria, materiales, texturas y renderer |
| `src/styles/main.css` | Canvas de pantalla completa, escalado pixelado y estilos del overlay/error |
| `README.md` | Requisitos, comandos y controles tecnicos actuales |

## Orden de ejecucion

### 1. Inicializar el paquete

1. Crear el proyecto Vite con plantilla JavaScript vanilla.
2. Instalar `three`.
3. Definir scripts de desarrollo, build y preview en `package.json`.
4. Crear el arbol de directorios definido por la especificacion, aunque los modulos futuros aun no tengan implementacion.

**Comprobacion:** `npm run build` debe generar el directorio de distribucion sin advertencias bloqueantes.

### 2. Preparar la superficie de render

1. Mantener un unico punto de montaje en `index.html`.
2. Aplicar CSS de pantalla completa a documento, raiz y canvas.
3. Aplicar `image-rendering: pixelated` al canvas.
4. Definir la resolucion interna maxima y el pixel ratio maximo en `src/config/render.js`.

**Comprobacion:** la pagina no tiene margenes, barras de desplazamiento ni cambios de tamaño de layout al cargar el canvas.

### 3. Crear el nucleo `Game`

1. Construir `WebGLRenderer` con antialias desactivado para preservar el lenguaje pixelado.
2. Crear `Scene`, `Clock` y una camara temporal de prueba.
3. Crear una escena minima: fondo tropical oscuro, luz ambiental, luz direccional y una geometria de referencia.
4. Implementar el bucle con `requestAnimationFrame`, calculando `deltaTime` en segundos y limitandolo para evitar saltos tras volver a la pestaña.
5. Implementar `resize` para recalcular el renderer y la proyeccion de camara.
6. Implementar `dispose()` y registrar la limpieza al cerrar la pagina.

**Comprobacion:** la geometria se mantiene visible y con proporcion correcta en ventana horizontal, vertical y al cambiar el zoom del navegador.

### 4. Añadir observabilidad

1. `DebugOverlay` calcula FPS a partir de cuadros y tiempo acumulado, sin actualizar el DOM cada cuadro.
2. El overlay muestra FPS, tamaño CSS, tamaño interno y pixel ratio efectivo.
3. Registrar un listener de teclado que alterna visibilidad al presionar `F3`; ignorar repeticiones de tecla.
4. Mantener el overlay fuera del canvas para no añadir trabajo a WebGL.

**Comprobacion:** `F3` alterna el panel de forma estable y sus valores cambian al redimensionar la ventana.

### 5. Manejar el fallo de WebGL

1. Verificar soporte antes de construir `Game`.
2. Sustituir el contenido principal por un mensaje de error semantico si falta WebGL.
3. Evitar que `main.js` deje una promesa rechazada o error sin controlar en consola.

**Comprobacion:** una prueba de soporte simulada ejecuta la ruta de error y deja la pagina utilizable.

### 6. Documentar y cerrar

1. Documentar version de Node recomendada, instalacion y comandos en `README.md`.
2. Documentar controles activos: `F3` para diagnostico.
3. Ejecutar build de produccion.
4. Probar manualmente el servidor Vite en una ventana de escritorio y una emulacion movil.
5. Marcar los puntos de Fase 0 como terminados en la bitacora solo tras pasar validaciones.

## Decisiones de implementacion

- Se usa JavaScript antes que TypeScript para minimizar configuracion inicial. Las fronteras de los modulos se documentan con JSDoc cuando un dato compartido no es evidente.
- El renderer tendra `antialias: false`; la estetica se reforzara limitando la resolucion interna sin bajar el canvas a una resolucion fija que perjudique pantallas pequenas.
- La Fase 0 utiliza una camara de prueba temporal. La camara hibrida real no se anticipa aqui.
- La geometria de prueba solo demuestra el pipeline de render y se elimina al comenzar la Fase 1.
- El manejo de resize reside exclusivamente en `Game`; los sistemas futuros reciben dimensiones o camara mediante una interfaz, nunca listeners globales propios.

## Riesgos de la fase y respuesta

| Riesgo | Respuesta |
| --- | --- |
| Imagen borrosa en pantallas de alta densidad | Limitar pixel ratio y comparar resolucion interna antes de introducir postprocesado |
| FPS inestable por el overlay | Actualizar texto de diagnostico varias veces por segundo, no por cuadro |
| Recursos WebGL retenidos al recargar mundo | Centralizar `dispose()` desde el primer sistema |
| WebGL ausente o bloqueado | Detectar antes de instanciar el renderer y mostrar la ruta de error |

## Fuera de esta fase

- Terreno, agua, jugador, camara final, fauna, controles de movimiento y shaders custom.
- Pruebas unitarias: se decide el runner cuando se introduzcan los primeros modulos puros de generacion en Fase 1.
- Optimizaciones de instancing: empiezan al crear vegetacion y fauna.

## Criterio para comenzar la Fase 1

La Fase 1 puede comenzar cuando todos los resultados verificables de este plan se cumplan y la estructura base permita añadir `world/` sin tocar el bucle de `Game` salvo para registrar el sistema nuevo.