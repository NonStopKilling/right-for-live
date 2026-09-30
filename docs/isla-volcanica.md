# Isla volcánica

## Abrir

`npm.cmd run dev -- --host 127.0.0.1 --port 4177`

Abrir `http://127.0.0.1:4177/?style=daylight`. En **Opciones → LAB → mapa**, elegir **Isla volcánica**. La selección se guarda en las opciones locales. Bosque y Ciudad siguen disponibles. Para apreciar el paisaje sin combate, desactivar los zombis locales en LAB.

## Qué incluye

- Costa inspirada en la silueta de Rapa Nui: Hanga Roa al oeste, Anakena/Ovahe al norte, Terevaka, Poike, Rano Kau y Rano Raraku. Es una interpretación jugable, no una réplica geográfica o arqueológica exacta.
- Extensión medida con semilla por defecto: aproximadamente 609 × 470 celdas y más de 122.500 celdas de tierra. Es más del doble de las 59.200 celdas de la versión anterior. Se mantienen 25 chunks cargados alrededor del jugador; ampliar el mapa no multiplica los sectores dibujados simultáneamente.
- Palmeras predominantes (aproximadamente 88% de los árboles, 100% en arena): seis variantes de altura/curvatura, troncos gruesos, frondas con foliolos y colores tomados de las paletas del bosque. Mantener **E** cerca de una palmera entrega madera y elimina su geometría; sigue agotada al salir y volver al sector durante la sesión, igual que los recursos existentes.
- Agua con variación espacial y temporal irregular, sin patrón de puntos. Rocas sumergidas cerca de la costa, arena visible y laguna elevada en el cráter de Rano Kau. El control de transparencia y el interruptor de agua siguen funcionando.
- Dos muelles transitables y dos veleros ambientales: uno frente a Hanga Roa y otro junto al muelle de Anakena. Las velas son triangulares y los barcos se balancean.
- Moáis en Tahai, Anakena, Tongariki, Rano Raraku, Ahu Akivi y Te Pito Kura: cabeza alargada, cejas, ojos hundidos, nariz, labios, orejas, brazos, manos y algunos pukao rojizos. Cada figura y tramo de plataforma pertenece a su sector, evitando desapariciones al cruzar chunks.
- Lugares adicionales: casas de piedra en Orongo, muro de Vinapú, cantera rojiza de Puna Pau, acceso a Ana Te Pahu, moáis caídos en Akahanga, playa de Ovahe y pequeño Motu Nui. Son interpretaciones visuales ligeras, no reconstrucciones arqueológicas exactas. El objetivo del HUD muestra el nombre de un lugar próximo y el minimapa los marca.
- Peces de costa: cardúmenes pequeños y ejemplares grandes solitarios hechos con una silueta de seis triángulos; nadan por sí mismos y se alejan del jugador y de zombis próximos, sin cruzar a tierra ni entrar a la laguna. Cada chunk usa como máximo dos mallas instanciadas para los peces. **LAB → Peces de la isla** los apaga, y **Peces costeros** ajusta su densidad.
- **LAB → Paleta natural isla** ofrece una lectura más sobria de arena, tierra, piedra, pasto, palmeras y agua. Solo cambia colores ya existentes y el shader del agua; no agrega textura, geometría ni llamadas de dibujo. El aspecto colorido sigue siendo el predeterminado.
- Los controles **Isla volcánica · visual y fauna** aparecen al comienzo de LAB. El panel permite desplazarse hasta todas las opciones, también en pantallas pequeñas.
- **LAB → Imagen y rendimiento**: resolución interna de rendimiento (máximo 720 × 405), equilibrada (960 × 540, predeterminada) o nítida (1280 × 720). La relación de aspecto se mantiene. La opción equivalente en JUEGO ahora funciona y se sincroniza. **Sombras dinámicas del sol** se pueden apagar para quitar el pase de sombras; las sombras están activas por defecto. Los cambios de resolución y sombras no reconstruyen el mundo. Cambiar densidad o visibilidad de peces reconstruye solo la capa de peces.
- Pasto interrumpido por manchas de tierra y roca; recursos de madera, piedra y fragmentos del catálogo existente. No se recolectan moáis ni rocas submarinas.
- Minimapa con la silueta de la isla, volcanes, lugares principales y posición del jugador.
- Isla finita; mar y laguna bloqueados para caminar. Cambiar de mapa recoloca al jugador en una entrada segura. Un checkpoint que queda en el mar vuelve a la bahía al reaparecer.

## Referencias consultadas

- [Mapa topográfico de Rapa Nui](https://www.easterisland.travel/images/things-to-do/hiking/rano-kau-orongo-te-ara-o-te-ao-hike/hiking-trekking-trail-rano-kau-island-map.jpg): proporciones y ubicación relativa de costas y volcanes.
- [Chile Travel: Anakena](https://chile.travel/atractivos/anakena/): playa, palmeras y Ahu Nau Nau.
- [Parque Nacional Rapa Nui](https://www.rapanuinationalpark.com/): listado de lugares y ahu; [Chile Travel: Orongo](https://chile.travel/atractivos/orongo/): aldea junto al cráter; [Chile Travel: itinerario](https://chile.travel/itinerarios/itinerario-por-los-imperdibles-de-rapa-nui/): Ahu Akivi y otros sitios.
- [Fotografía de Ahu Nau Nau](https://www.rainforestcruises.com/guides/what-to-see-on-easter-island): referencia visual para proporciones y rasgos de moáis. Las figuras del juego son geometría procedural propia; las fotografías no se incluyen como assets.

## Archivos y extensión

- `src/world/IslandMap.js`: diseño del terreno en coordenadas de celdas, semilla, nivel del mar y huellas de los muelles. `islandCell(gx, gz, seed)` devuelve el contrato que consume Terrain: altura, superficie, agua, transitabilidad y distribución vegetal.
- `src/world/IslandSystem.js` y `MoaiRecipe.js`: barcos, rocas submarinas, plataformas y moáis; geometría/materiales compartidos, animación y liberación. Las piezas estáticas usan instancias.
- `src/world/TreeSystem.js` y `PalmGeometry.js`: distribución, variantes de palmeras, frondas, paleta y agotamiento por recolección.
- `src/world/WaterSystem.js`: conserva el agua del bosque; la isla usa planos contiguos con shader animado.
- `src/world/IslandFishSystem.js`: generación determinista de peces, nado, huida, mallas compartidas y parámetros LAB.
- `World.js`: conecta las capas con la carga/descarga de chunks y la recolección.
- Para otro mapa: añadir su generador y decoración, conectar sus capas en World, registrar su opción en GameOverlay y sus etiquetas en GameHud. Mantener el contrato de Terrain y probar aparición, límites, recolección y cambio de mapa. No existe todavía un editor visual de mapas.

## Verificación y límites

`npm.cmd test`: 37/37 pruebas aprobadas. Verificación ampliada en `tests/island.test.js`, `tests/rapa-nui.test.js`, `tests/island-fish.test.js` y `tests/render-quality.test.js`. Cubre tamaño, conectividad a los lugares nuevos, repetibilidad, recursos, agua, barcos, peces, huida, paleta alternativa, límites de resolución y fallback de reaparición, además de las regresiones existentes. `npm.cmd run build` completado; Vite mantiene el aviso de bundle mayor a 500 kB.

Revisión local con Playwright: selector Bosque → Ciudad → Isla, persistencia tras recargar, altura/transitabilidad del muelle y bloqueo del mar, capturas de llegada/Anakena/moáis/volcanes/barcos, viewport de 390×844 y recolección real con tecla E (madera 0 → 3, palmera agotada tras descargar y volver a cargar el sector). En la ampliación se visitaron nueve zonas; llegaron a verse 6–11 grupos de peces en sectores costeros, entre ellos peces grandes solitarios. La prueba de navegador confirmó huida, activación de la paleta natural, apagado de peces, 25 chunks activos, vista móvil y cero errores de página. Artefactos locales en `.playwright-artifacts/` (ignorados por Git).

El panel LAB se reprodujo en 1440 × 900 y 390 × 844: antes su contenido medía 952 px y quedaba recortado sin desplazamiento; ahora el contenido desplaza y los controles de la isla se ven al abrirlo. En la escena de llegada de escritorio, al apagar sombras las llamadas de dibujo reportadas por Three.js bajaron de 200 a 114; en móvil, de 159 a 72. Los tres presets de imagen conservaron el número de llamadas y triángulos, cambiando solo el tamaño del buffer. Es una medida local de esa escena, no un FPS garantizado para otros equipos.

Los barcos son decorativos; no hay navegación, natación ni nuevas misiones. Los volcanes representan relieve/cráteres sin erupciones. Las partidas/inventario/torres siguen siendo compartidos entre mapas, como en el selector anterior; no se crean partidas independientes. El agua usa destellos estilizados, no reflejos reales de la escena. La semilla varía detalles y costa, manteniendo fijos los puntos principales. El tamaño aumenta el trayecto para recorrerla; las distancias de interacción y el número de sectores simultáneos no cambian.

La API local de perfiles en el puerto 8787 no estaba levantada durante la revisión; esta comprobación no valida servicios online. La vista móvil se inspeccionó en navegador, no en dispositivo físico; el juego conserva sus controles de teclado y ratón.
