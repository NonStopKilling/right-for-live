# Voxel Survival

Prototipo tecnico de survival isometrico low-poly/voxel para navegador. Esta primera etapa solo valida escena, terreno, arboles, jugador provisional, camara y pixelado intencional.

## Requisitos

- Node.js 20 o superior.
- Navegador con WebGL habilitado.

## Comandos

```bash
npm install
npm run dev
npm run build
npm run preview
```

## Controles actuales

- `WASD` o flechas: mover al personaje sobre la cuadricula.
- Rueda del mouse: acercar o alejar la camara ortografica.

## Estado

La escena actual renderiza un diorama voxel isometrico navegable con terreno tipo mosaico, caminos luminosos, bosque alto escalonado, hito central brillante, props voxel ligeros, HUD basico, sombras, fog suave, fondo oscuro, camara ortografica con seguimiento y render interno de baja resolucion escalado con CSS pixelated.
