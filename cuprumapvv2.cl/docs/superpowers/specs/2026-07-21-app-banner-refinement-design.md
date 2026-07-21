# Diseño: refinamiento del banner de descarga APV

Fecha: 2026-07-21

## Objetivo

Recomponer el banner de descarga de la App Cuprum para reproducir con exactitud la referencia entregada, conservando los recursos gráficos y enlaces existentes.

## Alcance

- Modificar únicamente `.app-banner`, sus bloques de contenido y `.download-card`.
- Reutilizar `bg_lo_simple.png`, `ico_qr.png`, `apv-qr.png`, `ico_apple.png` e `ico_android.png`.
- Mantener los destinos actuales de los dos enlaces.
- No alterar las secciones de ventajas ni preguntas frecuentes.

## Composición de escritorio

- Banner de 1530 × 530 px con radio de 12 px.
- Fondo `bg_lo_simple.png` de 1530 × 530 px a escala natural, con la capa oscura existente sobre el sector izquierdo.
- Contenido principal a 127 px del borde izquierdo y 99 px del borde superior.
- Título de 52 px, dos líneas y ancho suficiente para cortar después de “hicimos”.
- Descripción de 23 px ubicada bajo el título.
- Fila de acción iniciada a 132 px del borde izquierdo: botón de 240 × 61 px, separación de 20 px, divisor vertical y marca QR de 48 px.
- Nota inferior a 131 px del borde izquierdo y 411 px del borde superior.

## Tarjeta flotante

- Tarjeta blanca de 453 × 234 px ubicada a 472 px del borde izquierdo y 332 px del borde superior.
- La tarjeta se extiende 36 px bajo el banner y no se recorta.
- QR de 222 × 222 px alineado verticalmente con 6 px de margen superior e inferior; su padding interno propio produce el tamaño visible de la referencia.
- Columna derecha iniciada 242 px desde el borde de la tarjeta.
- Dos plataformas dentro de cápsulas de 84 × 50 px, separadas por 22 px.
- Separador horizontal con “o” centrada.
- Botón directo de 190 × 60 px.

## Contenido visible

- CTA principal: “Comenzar ahorrar en APV”.
- Nota: “Disponible únicamente para clientes Cuprum que tiene la App Cuprum.”
- Se conservan el título de descarga y “Descarga directa”.

## Comportamiento adaptable

- Bajo 1360 px se reducen tamaños y posiciones proporcionalmente sin perder la superposición.
- Bajo 980 px la tarjeta pasa al flujo normal bajo el contenido y el banner crece para contenerla.
- En móvil la tarjeta usa dos columnas compactas mientras haya espacio y pasa a una presentación apilada si es necesario.
- No debe producirse desplazamiento horizontal.

## Implementación elegida

Se usarán cambios mínimos de HTML para agrupar la marca QR y representar las cápsulas y el separador de la tarjeta, acompañados por CSS focalizado. Se descartan modificar la imagen de fondo o rasterizar la tarjeta completa porque se perderían accesibilidad, enlaces y adaptación responsive.

## Verificación

- Comparar internamente a 1622–1790 px.
- Confirmar 1530 × 530 px y tarjeta 453 × 234 px en las coordenadas definidas.
- Revisar 1280, 980, 680 y 390 px.
- Confirmar destinos, textos, carga de recursos y ausencia de desbordes.
- Validar sintaxis HTML y CSS.

## Criterio de aceptación

El bloque se acepta cuando coincide con la referencia en encuadre, proporciones, posiciones, radios, superposición, tarjeta, controles y texto, y mantiene una adaptación limpia en pantallas menores.
