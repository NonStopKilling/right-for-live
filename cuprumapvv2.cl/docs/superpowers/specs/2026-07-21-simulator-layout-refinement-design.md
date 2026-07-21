# Diseño: refinamiento del simulador APV

Fecha: 2026-07-21

## Objetivo

Recomponer el panel de `#simula` para reproducir con fidelidad la referencia entregada, manteniendo operativos el formulario, el control deslizante y la generación de resultados.

## Alcance

- Ajustar únicamente el panel `.simulator__panel`, el formulario `.calculator`, el estado vacío y lleno de `.calculator-result`, y la nota `.section-note`.
- Mantener el encabezado introductorio de `#simula` y las secciones adyacentes sin cambios.
- Conservar los identificadores y nombres de campos usados por `assets/js/apv.js`.
- Cambiar los valores iniciales visibles cuando la referencia los define.

## Composición de escritorio

- El panel ocupa el ancho global de 1540 px.
- La grilla usa una columna izquierda de 490 px, una separación de 30 px y una columna derecha flexible de 1020 px.
- Ambos paneles miden 730 px de alto, comparten fondo azul muy claro `#e1f4fb` y radio exterior de 20 px.
- El formulario usa 40 px de padding lateral, 49 px superior y 40 px inferior.
- Los campos tienen 60 px de alto, fondo blanco, radio de 20 px y 20 px de padding horizontal.
- Los grupos se distribuyen verticalmente para reproducir la separación de la referencia sin recurrir a posiciones absolutas.
- El botón mide 240 × 60 px, usa borde azul de 2 px y forma de cápsula.

## Controles y valores iniciales

- Edad y sueldo líquido comienzan vacíos.
- El ahorro mensual comienza en `$1.000`.
- El rango usa mínimo 1000, máximo 500000, paso 1000 y valor inicial 1000.
- Sus etiquetas extremas muestran `$1.000` y `$500.000`.
- Las opciones de género no tienen selección inicial; el comportamiento de cálculo conserva el valor de respaldo existente si se envía el formulario sin selección.
- Los radios se representan como controles cuadrados blancos de 24 px con esquinas redondeadas y un estado seleccionado claramente visible.

## Panel de resultado

- El estado vacío centra vertical y horizontalmente el icono y el mensaje.
- El icono conserva 54 px y se separa 30 px del mensaje.
- El estado lleno mantiene la grilla de resultados actual, habilita desplazamiento interno solo si su contenido supera la altura disponible y no altera los cálculos.

## Nota inferior

- La nota queda centrada 36 px bajo los paneles.
- El texto será: “Infórmese sobre los supuestos de cálculo para llegar a las estimaciones.”
- “supuestos de cálculo” aparece subrayado, sin convertirlo en un enlace sin destino.

## Comportamiento adaptable

- Sobre 1180 px se conserva la grilla de dos columnas y se reducen progresivamente la columna izquierda y la altura.
- Bajo 980 px los paneles pasan a una columna; el formulario recupera altura automática y el resultado conserva un mínimo visual claro.
- En móvil se reducen paddings y radios de forma proporcional, los tres géneros permanecen en una fila mientras exista espacio y el botón nunca excede el ancho disponible.
- Ningún estado debe producir desplazamiento horizontal.

## Implementación elegida

Se aplicará un ajuste CSS focalizado y cambios mínimos en los valores y el texto del HTML. Esta opción mantiene la semántica y el JavaScript actuales. Se descartan una reconstrucción completa del formulario y un lienzo de dimensiones rígidas porque añadirían riesgo funcional o impedirían una adaptación limpia.

## Verificación

- Comparar internamente el panel vacío a 1570–1790 px con la referencia.
- Revisar 1280, 980, 680 y 390 px.
- Probar sincronización entre ahorro mensual y rango.
- Enviar el formulario y confirmar que aparecen los cuatro resultados.
- Validar sintaxis CSS y JavaScript, y comprobar ausencia de desbordes horizontales.

## Criterio de aceptación

El simulador se acepta cuando reproduce las proporciones, radios, separaciones, controles y nota de la referencia, conserva el cálculo y mantiene un reflujo limpio en tablet y móvil.
