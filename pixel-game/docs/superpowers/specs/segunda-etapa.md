Ahora quiero mejorar exclusivamente la dirección artística del prototipo.

No agregues nuevas mecánicas.

La prioridad es conseguir una estética mucho más cercana a un diorama voxel low-poly isométrico.

Haz los siguientes cambios:

1. TERRENO

El terreno no debe verse como grandes bloques tipo Minecraft.

Quiero una cuadrícula compuesta por pequeñas piezas cuadradas, ligeramente separadas visualmente entre sí.

Cada tile puede tener ligeras variaciones de:
- altura;
- escala;
- rotación mínima;
- tono mediante vertex colors.

El terreno debe sentirse orgánico aunque continúe siendo una cuadrícula.

Los bordes del mapa deben ser irregulares, no un cuadrado perfecto.

Algunas celdas deben desaparecer progresivamente hacia los bordes para producir el efecto de isla/diorama.

2. ÁRBOLES

Rediseña TreeSystem.

Los árboles deben parecer cipreses/coníferas estilizadas muy altas.

Construye cada copa mediante segmentos piramidales o prismáticos apilados.

Características:
- tronco pequeño;
- copa muy alta;
- aproximadamente 7-12 segmentos;
- segmento inferior ancho;
- segmentos progresivamente más pequeños hacia arriba;
- ligera separación vertical entre segmentos;
- distintas alturas;
- distintas escalas;
- algunos árboles verde oscuro;
- algunos verde oliva;
- algunos marrón/rojizo.

No necesito texturas.

Mantén InstancedMesh cuando sea posible.

Quiero un bosque denso.

3. COMPOSICIÓN

Crea un pequeño claro en el centro del bosque.

Los árboles deben rodearlo.

El personaje comienza dentro del claro.

Coloca algunas piedras alrededor.

4. ILUMINACIÓN

La iluminación debe sentirse cinematográfica pero low-poly.

Quiero:
- DirectionalLight principal;
- HemisphereLight suave;
- sombras blandas;
- ambient occlusion si puede implementarse de manera razonablemente económica;
- fog.

No exageres bloom.

5. PIXELADO

Quiero un pixelado visible pero elegante.

Revisa cómo estamos calculando la resolución interna.

El canvas debe adaptarse a cualquier pantalla pero el render interno debe conservar aproximadamente una resolución equivalente a 640x360 o proporcional.

Utiliza pixel ratio cuidadosamente para que pantallas Retina/HiDPI no eliminen el efecto.

6. CÁMARA

Mantén OrthographicCamera.

La composición inicial debe mostrar aproximadamente:
- 60% terreno;
- 40% bosque/fondo.

La cámara debe estar suficientemente elevada para percibir claramente la vista isométrica.

7. RENDIMIENTO

Muestra FPS en modo desarrollo solamente.

No agregues librerías grandes solo para medir FPS.

Verifica que el proyecto siga compilando.

No agregues todavía:
- zombies;
- UI;
- inventario;
- construcción;
- vehículos.

Concéntrate exclusivamente en estética, cámara, iluminación y rendimiento.