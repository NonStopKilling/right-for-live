# Diseño: comparación de ahorro temprano APV

Fecha: 2026-07-20

## Objetivo

Recomponer la sección “¿Quieres mejorar tu pensión?” para que reproduzca con fidelidad la anatomía visual de la referencia: jerarquía, ubicación y recorte de fotografías, fondos, colores, radios, paddings y separaciones. No se busca un calco píxel a píxel, sino una equivalencia visual sólida y adaptable.

## Alcance

- Modificar únicamente el bloque `.pension-board` de `index.html` y sus estilos relacionados en `assets/css/apv.css`.
- Mantener el contenido como HTML real y las personas como imágenes reales; no sustituir la sección por una captura.
- Mantener el botón “Comenzar ahorrar en APV” enlazado a `#simula`.
- Corregir los datos visibles para que coincidan con la referencia.
- Conservar la tipografía FS Elliot Pro y los colores Cuprum ya definidos en las variables globales.

No se rediseñarán el encabezado de la sección, las secciones vecinas ni el resto del sitio.

## Contenido validado

- Juan comienza a ahorrar a los **25 años** y aporta **$100.000 mensuales**.
- Pedro comienza a ahorrar a los **45 años** y aporta **$100.000 mensuales**.
- Ahorro acumulado de Juan a los 65 años: **$128.460.598**.
- Ahorro acumulado de Pedro a los 65 años: **$40.587.308**.
- Desglose de Juan: **$49.200.000** en aportes y **$79.260.598** en rentabilidad.
- Desglose de Pedro: **$25.200.000** en aportes y **$15.385.308** en rentabilidad.

## Arquitectura visual

El tablero conserva un fondo azul marino, esquinas redondeadas y tres zonas en escritorio:

1. **Perfiles**: dos tarjetas blancas independientes, cada una con la fotografía anclada al borde inferior, el nombre en azul y la descripción a la derecha. Debajo se ubica un CTA azul con forma de píldora.
2. **Gráfico**: lienzo blanco con dos columnas verticales. Cada columna combina un bloque superior azul, que contiene el total acumulado, y un bloque inferior gris con textura diagonal ligera. Las reglas horizontales marcan 65, 45 y 25 años. Juan y Pedro se apoyan visualmente en la base de sus columnas.
3. **Desglose**: dos tarjetas blancas independientes. Cada tarjeta incluye una miniatura de la persona junto al título, seguida por un bloque celeste para aportes y un bloque azul oscuro para rentabilidad. Cada bloque tiene su propio radio y padding.

Los tres grupos usan radios y ritmos de espaciado coherentes, pero no comparten un único fondo interno: las tarjetas y subtarjetas deben distinguirse tal como en la referencia.

## Colores y acabado

- Fondo exterior: `--navy-dark` (`#002d5f`).
- Azul principal de Juan y CTA: `--blue` (`#0076cf`); el bloque de Juan puede usar `#197fc7` para reproducir la diferencia tonal de la referencia.
- Azul oscuro de Pedro y rentabilidad: `--blue-strong`/`--navy` (`#005da8`/`#003e74`).
- Aportes: celeste cercano a `--sky-strong` (`#d9f2ff`).
- Superficies de tarjetas y gráfico: blanco.
- Parte inferior del gráfico: gris muy claro con patrón diagonal discreto.
- Bordes: sin contornos pesados; la separación depende de color, espacio y radios.
- Sombras: solo la sombra global suave del tablero, sin sombras nuevas en cada subtarjeta.

## Comportamiento adaptable

- **Escritorio**: tres columnas en proporción 28/48/24 dentro del espacio disponible, con una altura visual común entre gráfico y contenido lateral.
- **Tablet**: perfiles y gráfico ocupan la primera composición disponible; el desglose pasa debajo en dos columnas.
- **Móvil**: orden vertical perfiles → gráfico → desglose. El gráfico conserva dos columnas, reduce tipografías e imágenes de forma controlada y evita solapamientos. Las tarjetas de desglose pasan a una sola columna cuando el ancho lo exige.
- Las fotografías conservan `object-fit: contain` y anclaje inferior para evitar recortes de rostro o torso.

## Accesibilidad y semántica

- El gráfico seguirá presentándose como apoyo visual (`aria-hidden="true"`) porque sus cifras también existen como contenido legible en la sección.
- Los textos y cifras de perfiles y desglose permanecen en HTML.
- El CTA conserva foco de teclado, semántica de enlace y contraste suficiente.
- No se agregan animaciones ni dependencias JavaScript.

## Verificación

- Comparar visualmente la sección con la referencia en 1660 px: estructura, fondos, posición de fotos, radios, paddings y ritmo vertical.
- Revisar 1280, 980 y 680 px para confirmar reflujo, legibilidad y ausencia de desbordes.
- Confirmar que todas las cifras y edades coinciden con el contenido validado.
- Confirmar que las imágenes `juan.png` y `pedro.png` cargan, mantienen proporción y se apoyan en la base prevista.
- Confirmar que el enlace del CTA sigue llevando a `#simula`.

## Criterio de aceptación

La sección se acepta cuando su composición reconoce claramente la referencia en escritorio, los fondos y subtarjetas están separados correctamente, las fotografías ocupan los lugares definidos, los datos son correctos y no existen desbordes ni solapamientos en los anchos de verificación.
