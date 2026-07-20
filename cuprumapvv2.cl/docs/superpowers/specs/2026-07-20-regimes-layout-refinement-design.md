# Diseño: refinamiento de la sección de regímenes APV

Fecha: 2026-07-20

## Objetivo

Ajustar la composición de las tarjetas Régimen A y Régimen B para reproducir la referencia entregada, conservando las imágenes de fondo, las imágenes de las letras A/B y los tamaños tipográficos actuales.

## Alcance

- Modificar únicamente la estructura visual relacionada con `.regime-grid`, `.regime-card`, `.regime-card__image`, `.regime-card__letter` y `.check-list`.
- Mantener intactos el contenido textual, las imágenes y las escalas de texto.
- No alterar el encabezado de la sección ni los bloques anteriores o posteriores.
- Añadir los ornamentos de arco y punto mediante CSS, sin recursos gráficos nuevos.

## Composición de escritorio

- El bloque usa el ancho global existente de 1540 px.
- Las dos columnas tienen el mismo ancho y un espacio central de 88 px.
- Cada cabecera visual mide 421 px de alto cuando la columna alcanza 720 px, con radio exterior de 11 px y recorte estricto del fondo.
- El contenido inferior de la tarjeta se alinea a 39 px de los bordes izquierdo e inferior.
- La caja blanca de la letra se ubica a 40 px del borde izquierdo y 190 px del borde superior en escritorio, con 70 px por lado y radio de 11 px.
- El overlay se concentra en la parte inferior y conserva legibilidad sin cambiar la imagen original.
- Un arco blanco fino cruza el sector izquierdo de cada tarjeta y un punto amarillo marca su recorrido.

## Listas informativas

- La lista comienza 40–42 px bajo la imagen.
- Cada fila reserva 50 px a la izquierda para el icono de verificación.
- Los iconos quedan alineados con la primera línea del texto.
- Las filas terminan en un separador gris claro a todo el ancho de la columna.
- Se usan paddings verticales regulares en vez de una separación libre entre elementos, de modo que ambos regímenes mantengan una retícula consistente aunque el texto tenga distinta cantidad de líneas.

## Comportamiento adaptable

- En escritorio, la sección permanece en dos columnas iguales.
- Bajo 980 px, las tarjetas pasan a una sola columna y el ancho del bloque visual determina su altura con una relación adaptable.
- En móvil, se reducen de forma proporcional los paddings, la caja de la letra y el ornamento; las listas conservan separadores e iconos sin desbordes.
- No se modifican tamaños de fuentes en los nuevos estilos.

## Implementación elegida

Se aplicará una corrección CSS focalizada y un ajuste mínimo de capas. Este enfoque conserva el HTML semántico actual, evita duplicar contenido y permite construir el arco y el punto con pseudo-elementos. Se descartan tanto la reconstrucción completa del bloque como la creación de imágenes decorativas nuevas porque añadirían complejidad sin mejorar la fidelidad.

## Verificación

- Comparar internamente la sección a 1790 px con la referencia.
- Revisar 1280, 980, 680 y 390 px.
- Confirmar radios, recortes, arco, punto, paddings, separadores y alineación de iconos.
- Validar sintaxis CSS y ausencia de desbordes horizontales.

## Criterio de aceptación

La sección se considera terminada cuando reproduce la estructura espacial de la referencia —tarjetas, ornamentos y listas— sin cambiar las imágenes ni las escalas tipográficas existentes y mantiene una adaptación limpia en tablet y móvil.
