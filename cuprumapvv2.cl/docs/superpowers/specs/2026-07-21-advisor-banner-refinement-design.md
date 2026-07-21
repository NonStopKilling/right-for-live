# Diseño: refinamiento del banner de asesoría

Fecha: 2026-07-21

## Objetivo

Ajustar `#asesoria` para reproducir con exactitud la referencia entregada, utilizando a escala natural los recursos existentes y manteniendo funcional el enlace de contacto.

## Alcance

- Modificar únicamente `.advisor`, `.advisor__copy`, `.advisor__action` y sus reglas adaptables.
- Mantener el contenido y el destino `#contacto`.
- Reutilizar `assets/img/bg.png` y `assets/img/formas.png`; no generar fondos alternativos.
- No alterar `#simula` ni `#regimenes`.

## Composición de escritorio

- Banner de 1530 × 250 px con radio exterior de 11 px.
- Fondo `bg.png` de 1530 × 250 px sin escalado en el ancho de referencia.
- Arco `formas.png` de 110 × 250 px colocado a 756 px del borde izquierdo.
- Padding horizontal de 38 px.
- Grilla interior con primera columna de 834 px, espacio de 78 px y segunda columna flexible.
- El bloque derecho comienza a 950 px del borde izquierdo del banner.
- Ambos bloques se centran verticalmente.

## Texto izquierdo

- La pregunta y su fragmento destacado permanecen en el encabezado.
- La frase “Agenda tu asesoría y te ayudamos a comenzar” ocupa la línea siguiente.
- Ambos textos usan 36 px, peso liviano salvo el fragmento en negrita y altura de línea de 1.15.
- No se agregan saltos manuales que perjudiquen el reflujo adaptable.

## Acción derecha

- Texto descriptivo de hasta 500 px, 17 px y altura de línea de 1.35.
- Separación de 24 px entre texto y botón.
- Botón de 240 × 60 px, forma de cápsula, fondo amarillo y texto azul centrado.

## Comportamiento adaptable

- Bajo 1360 px se conservan dos columnas, pero pasan a proporciones fluidas; el arco se posiciona proporcionalmente.
- Bajo 980 px el banner pasa a una columna, aumenta su altura según el contenido y el arco queda como ornamento de fondo sin cruzar el texto.
- En móvil se reducen paddings y escalas tipográficas, el botón no excede el ancho disponible y no se produce desplazamiento horizontal.

## Implementación elegida

Se aplicará una corrección CSS focalizada. Es el enfoque más fiel porque los recursos originales ya contienen el gradiente, los radios y el arco exactos. Se descartan recrear el fondo con gradientes CSS y modificar las imágenes, ya que ambas alternativas introducirían diferencias innecesarias.

## Verificación

- Comparar internamente el banner a 1642–1790 px.
- Confirmar 1530 × 250 px, arco en x=756 px y bloque derecho en x=950 px.
- Revisar 1280, 980, 680 y 390 px.
- Confirmar que el enlace conserva `href="#contacto"` y que no hay desbordes.
- Validar sintaxis CSS.

## Criterio de aceptación

El banner se acepta cuando coincide con la referencia en dimensiones, fondo, arco, retícula, alineación vertical, botón y espaciado, y conserva un reflujo limpio en pantallas menores.
