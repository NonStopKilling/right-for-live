# Bitacora Tecnica: Motor de Isla Volcanica

## Objetivo del hito

Construir un sandbox tecnico web que demuestre un motor reutilizable para una isla volcanica paradisíaca. El jugador puede recorrer la superficie con una vista isometrica y entrar al mar, donde la camara y la iluminacion cambian para explorar fauna marina.

Este hito valida el mundo procedural, la transicion superficie-submarino y el rendimiento de una escena low-poly pixelada. No incluye historia, misiones, combate, inventario, guardado ni fisicas de cuerpos rigidos.

## Decisiones aprobadas

- Renderer: WebGL mediante Three.js sobre un elemento `canvas` HTML5.
- Herramienta de desarrollo: Vite con JavaScript moderno, sin framework de interfaz.
- Camara: hibrida; ortografica e isometrica en tierra, cercana y de seguimiento suave bajo el agua.
- Mundo: una isla finita, configurable y reproducible con una semilla. La arquitectura separa generacion y render para permitir chunks en una fase posterior.
- Estilo: geometria low-poly, paleta tropical/volcanica, resolucion interna baja y escalado con `image-rendering: pixelated`.
- Colisiones: muestreo de altura del terreno y nivel del mar. Rapier queda fuera de este hito.
- Escalabilidad: `THREE.InstancedMesh` para elementos repetidos del entorno y fauna que comparta geometria y material.

## Dependencias iniciales

| Paquete | Uso en este hito | Motivo |
| --- | --- | --- |
| `three` | Escena, WebGL, camaras, luces, raycasting, instancing y shaders | Base de render 3D madura y ligera |
| `vite` | Servidor local, empaquetado y recarga en desarrollo | Iteracion rapida sin configuracion manual de WebGL |

Dependencias diferidas, no instalar inicialmente:

- `@dimforge/rapier3d-compat`: fisica cuando haya objetos dinamicos o colisiones complejas.
- `howler`: audio ambiental y efectos.
- `yuka`: IA avanzada y navegacion; la fauna inicial usa comportamiento procedural local.

## Estructura propuesta

```text
pixel-game/
  docs/
    superpowers/specs/
      2026-08-15-volcanic-island-engine-design.md
  public/
    assets/
      audio/
      textures/
  src/
    main.js
    game/
      Game.js
      DebugOverlay.js
    config/
      world.js
      render.js
    core/
      SeededRandom.js
      math.js
      dispose.js
    input/
      InputManager.js
    player/
      PlayerController.js
      PlayerMarker.js
    camera/
      CameraController.js
    world/
      World.js
      TerrainGenerator.js
      BiomeResolver.js
      TerrainMeshBuilder.js
      HeightSampler.js
    environment/
      EnvironmentSystem.js
      PalmFactory.js
      RockFactory.js
      CoralFactory.js
    water/
      WaterSystem.js
      waterVertex.glsl
      waterFragment.glsl
    marine-life/
      MarineLifeSystem.js
      SchoolBehavior.js
      FishFactory.js
      RayFactory.js
      TurtleFactory.js
    styles/
      main.css
  index.html
  package.json
  vite.config.js
```

## Responsabilidades y flujo

### Inicio y bucle

`main.js` crea `Game`. `Game` crea el renderer, escena, luces, sistemas y el bucle con `requestAnimationFrame`. Por cada cuadro actualiza en este orden:

1. Lee `InputManager`.
2. Actualiza `PlayerController` contra `HeightSampler` y nivel del mar.
3. Actualiza `CameraController` con el estado del jugador.
4. Actualiza agua, fauna y efectos ambientales.
5. Actualiza `DebugOverlay` cuando este activo.
6. Renderiza la escena.

Los sistemas no acceden al DOM salvo `DebugOverlay`; reciben dependencias explicitas en el constructor y exponen `update(deltaTime)` y `dispose()` cuando administran recursos de Three.js.

### Mundo

`WorldConfig` contiene la semilla, radio, resolucion, altura maxima volcanica, nivel del mar y profundidad maxima. `TerrainGenerator` usa ruido combinado para producir una altura determinista: cono volcanico irregular en el centro, laderas selvaticas, playa y plataforma coralina que desciende a mar profundo.

`BiomeResolver` recibe altura, pendiente y distancia al centro para clasificar cada celda: `volcano`, `jungle`, `beach`, `reef` o `deep-ocean`. `TerrainMeshBuilder` construye malla baja en poligonos y asigna colores/materiales por bioma. `HeightSampler` conserva los datos de altura para movimiento y consultas sin depender de la malla renderizada.

### Entorno y fauna

`EnvironmentSystem` consulta biomas y un generador aleatorio sembrado para colocar palmeras, rocas volcanicas, coral y plantas. Cada fabrica devuelve geometria y material compartibles; el sistema agrupa cada variedad en instancias.

`MarineLifeSystem` distribuye peces, rayas y tortugas dentro de volumenes definidos por arrecife y profundidad. `SchoolBehavior` anima los bancos mediante rumbo, separacion basica y limites locales, sin pathfinding global. La cantidad activa se adapta a una configuracion de calidad sin modificar la simulacion del mundo.

### Agua, camara y estados de inmersion

`WaterSystem` mantiene un plano a `seaLevel`, con shader de ondulacion suave y transparencia. El render se configura con una resolucion interna limitada y escalado pixelado por CSS.

`PlayerController` expone `isUnderwater`, `position` y `depth`. En tierra restringe el movimiento a la altura del suelo; en el agua permite movimiento tridimensional. `CameraController` interpola entre una `OrthographicCamera` isometrica para superficie y una camara de inmersion cercana. Al cambiar de estado, `WaterSystem` y las propiedades de niebla, color de fondo e intensidad de luces se actualizan de forma coordinada.

## Configuracion inicial sugerida

| Parametro | Valor inicial | Razon |
| --- | ---: | --- |
| Resolucion de terreno | 192 x 192 celdas | Suficiente detalle sin dificultar el perfilado inicial |
| Radio de isla | 72 unidades | Mantiene el recorrido visible desde la camara isometrica |
| Nivel del mar | 0 | Referencia unica para agua e inmersion |
| Profundidad maxima | -28 unidades | Espacio visible para arrecife, fauna y niebla submarina |
| Resolucion de render | 960 x 540 maximo | Pixelacion moderada y rendimiento estable |
| Instancias visibles | 1.000-2.000 | Objetivo inicial de decoracion y fauna en escritorio medio |

## Interfaces de extension

- El futuro `ChunkManager` podra solicitar regiones a `TerrainGenerator` y crear varios `World` parciales, sin cambiar la interfaz de `HeightSampler`.
- Nuevas especies implementan una fabrica y comportamiento, registrados por `MarineLifeSystem`.
- Nuevos biomas se agregan a `BiomeResolver`; los colocadores de entorno consumen biomas, no colores de malla.
- Rapier se integrara detras de una interfaz de consultas de movimiento, para reemplazar el muestreo de altura sin cambiar controles o camara.

## Criterios tecnicos de aceptacion

- Una misma semilla produce la misma topografia, biomas, decoracion y ubicacion inicial de fauna.
- El jugador puede moverse por terreno, entrar al agua, nadar bajo ella y volver a emerger sin salto abrupto de camara.
- La superficie muestra isla, playa, vegetacion y volcan; el mar permite observar arrecife, fondo y fauna a profundidad.
- El modo submarino cambia niebla, iluminacion y paleta sin ocultar por completo la fauna cercana.
- La escena mantiene 60 FPS como referencia en escritorio medio, con 1.000-2.000 instancias visibles. El overlay expone FPS para medirlo.
- Redimensionar la ventana no distorsiona la camara ni rompe el aspecto pixelado.
- Todas las geometrías, materiales y render targets creados por sistemas se liberan en `dispose()`.

## Checklist de implementacion

### Fase 0: base del proyecto

- [x] Inicializar Vite con JavaScript.
- [x] Instalar `three`.
- [x] Crear el esqueleto de `src/` y configuraciones centrales.
- [x] Configurar canvas a pantalla completa, escalado pixelado y manejo de redimensionamiento.
- [x] Crear `Game`, renderer, escena, reloj y ciclo de render.
- [x] Verificar WebGL y mostrar un error legible si el navegador no lo soporta.

### Fase 1: terreno volcanico reproducible

- [ ] Implementar generador aleatorio determinista y utilidades de ruido.
- [ ] Definir `WorldConfig` con semilla y parametros de isla.
- [ ] Generar campo de alturas: volcan, laderas, playa, arrecife y fondo marino.
- [ ] Implementar clasificacion de biomas.
- [ ] Construir la malla low-poly por bioma.
- [ ] Implementar `HeightSampler` y prueba manual de consultas de elevacion.
- [ ] Validar que dos recargas con la misma semilla coincidan visualmente.

### Fase 2: agua y estado submarino

- [ ] Crear plano de agua y shader de ondas ligeras.
- [ ] Establecer niebla, fondo e iluminacion de superficie.
- [ ] Implementar variante visual submarina con color y niebla por profundidad.
- [ ] Definir y validar el cambio de estado al cruzar el nivel del mar.

### Fase 3: jugador y camara hibrida

- [ ] Implementar entrada de teclado y puntero.
- [ ] Añadir marcador provisional visible sobre el terreno.
- [ ] Restringir movimiento terrestre a la altura de la malla.
- [ ] Añadir natacion tridimensional y limite de profundidad.
- [ ] Crear camara ortografica isometrica de superficie.
- [ ] Crear transicion suave a camara submarina y retorno al emerger.
- [ ] Validar el flujo completo tierra -> agua -> inmersion -> superficie.

### Fase 4: entorno tropical y ecosistema marino

- [ ] Crear geometrias low-poly compartidas para palmeras, rocas y coral.
- [ ] Poblar por bioma usando aleatoriedad sembrada.
- [ ] Convertir decoracion repetida a `InstancedMesh`.
- [ ] Crear peces, rayas y tortugas low-poly.
- [ ] Implementar cardumen y desplazamiento local de fauna.
- [ ] Añadir ajuste de densidad para calidad/rendimiento.

### Fase 5: observabilidad, perfilado y cierre

- [ ] Crear overlay `F3` con FPS, semilla, posicion, bioma, profundidad y camara.
- [ ] Comprobar rendimiento con el maximo de instancias objetivo.
- [ ] Comprobar redimensionamiento y distintas relaciones de aspecto.
- [ ] Comprobar liberacion de recursos al reconstruir o destruir el mundo.
- [ ] Documentar controles y parametros de desarrollo en README.
- [ ] Registrar pendientes de la fase de chunks, fisicas, audio y guardado.

## Validacion por fase

La validacion combina comprobaciones de lint/build de Vite con pruebas manuales acotadas. Para los modulos puros, como `SeededRandom`, generacion de alturas y clasificacion de biomas, se agregaran pruebas unitarias cuando se incorpore el runner elegido. Para el primer hito visual, la prueba principal sera una sesion reproducible con la misma semilla y capturas de superficie e inmersion.

## Riesgos y contenciones

| Riesgo | Contencion |
| --- | --- |
| Agua transparente con artefactos de profundidad | Empezar con material simple y ordenar transparencia; introducir render targets solo si la lectura visual lo requiere |
| Sobrecarga por decoracion y fauna | Compartir geometria/material, instancing y limites de densidad configurables |
| Transicion de camara mareante | Interpolacion amortiguada, angulos limitados y pruebas repetidas de cruce de agua |
| Terreno demasiado regular | Combinar ruido, crater desplazado y reglas de bioma antes de aumentar detalle geometrico |
| Migracion posterior a chunks | Mantener generacion, datos de altura y construccion de malla desacopladas desde el inicio |

## Fuera de alcance del hito

- Historia, personajes no jugables, misiones y dialogos.
- Combate, enemigos, salud, inventario y construccion.
- Persistencia, multijugador y generacion de mundo infinito.
- Fisicas de cuerpos rigidos, embarcaciones y destruccion de terreno.
- Assets comerciales o modelos externos obligatorios.
