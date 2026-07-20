# Diseño: footer Cuprum APV

Fecha: 2026-07-20

## Objetivo

Recomponer el footer para reproducir con fidelidad la referencia entregada: distribución, separadores, tamaños de recursos, jerarquía tipográfica, espacios y contenido. El footer debe conservar enlaces utilizables, un QR real y una adaptación responsive clara.

## Alcance

- Reestructurar únicamente el elemento `.footer` de `index.html` y sus reglas relacionadas en `assets/css/apv.css`.
- Reutilizar `logo-cuprum-color.png`, los cuatro iconos de contacto, los iconos sociales, `apv-qr.png`, `appstore.png` y `googleplay.png`.
- Mantener teléfonos como enlaces `tel:` y la sucursal como enlace web.
- Sustituir la nota legal actual por la nota de horarios de la referencia.
- No modificar la sección de preguntas frecuentes ni otros bloques de la página.

## Contenido validado

- Desde Chile: **600 228 7786**.
- Desde el extranjero: **+56 2 23470210**.
- Sucursales: **Encuéntralas aquí**.
- Redes en orden: Facebook, LinkedIn, X y YouTube.
- Descarga: “Descarga la App Cuprum en tu dispositivo móvil”.
- Nota: “° Ejecutivos disponibles de lunes a jueves de 8:30 a 18:15 horas y viernes 8:30 a 14:00 horas.”

## Arquitectura visual

El contenido se aloja en un contenedor de ancho global con línea horizontal superior. Dentro se usa una grilla de dos áreas:

1. **Área principal izquierda**: logo en la parte superior y, debajo, una grilla de cuatro contactos. Cada contacto contiene icono gris, etiqueta y valor. Los contactos segundo, tercero y cuarto incluyen un separador vertical.
2. **Área de descarga derecha**: bloque con separador vertical propio, título en la parte superior y una fila inferior con QR a la izquierda y badges de tiendas apilados a la derecha.
3. **Cierre inferior**: línea horizontal a todo el ancho y nota de horarios alineada al borde izquierdo.

El logo y el título de descarga comienzan a la misma altura. Los iconos de contacto y el QR se mantienen como imágenes nítidas, sin filtros que alteren sus proporciones.

## Medidas y acabado de escritorio

- Contenedor: el mismo ancho máximo global de la página, 1540 px en pantallas amplias.
- Separador superior: 1 px, gris muy claro.
- Espacio desde el separador superior al contenido: 60 px.
- Logo: 162 px de ancho.
- Área de descarga: 410 px, con 48 px de padding izquierdo tras el divisor.
- QR: 144 px cuadrados.
- Badges: 197 px de ancho; apilados con 26 px de separación.
- Iconos de contacto: 35–37 px.
- Valores de contacto: 18 px, color oscuro y peso regular.
- Etiquetas: 14 px, gris medio.
- Título de descarga: 24 px, peso regular y dos líneas.
- Nota inferior: 11 px, gris medio.

## Comportamiento adaptable

- **Escritorio amplio**: dos áreas en paralelo y cuatro contactos en una fila.
- **Tablet**: área de descarga pasa bajo el área principal; los contactos se organizan en dos columnas. El divisor de descarga cambia de vertical a horizontal.
- **Móvil**: contactos en una columna, sin divisores verticales; QR y badges mantienen una fila mientras exista espacio y pasan a columna si el ancho no lo permite.
- Los enlaces conservan áreas táctiles claras, foco visible y ausencia de desbordes.

## Accesibilidad

- El logo conserva texto alternativo “Cuprum”.
- Los iconos decorativos de contacto usan `alt=""`.
- Cada red social mantiene su `aria-label`.
- El QR usa una descripción explícita de descarga.
- Los badges de tiendas conservan sus textos alternativos.

## Verificación

- Comparar la composición con la referencia en 1790/1660 px.
- Revisar reflujo en 1280, 980, 680 y 390 px.
- Confirmar que teléfonos, sucursal, redes y QR no quedan ocultos ni solapados.
- Confirmar el orden Facebook–LinkedIn–X–YouTube.
- Confirmar el contenido exacto de la nota de horarios.
- Validar sintaxis CSS y carga de todos los recursos.

## Criterio de aceptación

El footer se acepta cuando reproduce la jerarquía de la referencia, mantiene alineados logo y descarga, separa correctamente los cuatro contactos, presenta QR y tiendas con sus proporciones originales y no genera solapamientos ni desbordes en los anchos verificados.
