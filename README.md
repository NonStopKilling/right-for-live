# Senal del Norte

Survival isometrico low-poly/voxel para navegador. La rama `v2` combina un mundo procedural por chunks con recoleccion, combate, zombies, torres automaticas, checkpoints, respawn, historia y audio sintetizado.

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
- Mouse: apuntar sobre el terreno.
- Clic izquierdo: disparar el revolver o confirmar una torre.
- Mantener `E`: recolectar madera, piedra o fragmentos extranos.
- `R`: recargar el revolver.
- `B`: activar o cancelar el modo de construccion.
- `Escape`: cerrar una transmision o cancelar la construccion.
- `M`: activar o silenciar el audio.
- Rueda del mouse: acercar o alejar la camara ortografica.
- `F2`: mostrar u ocultar los limites de chunks.

## Bucle jugable

1. Recolecta madera, piedra y fragmentos generados proceduralmente.
2. Elimina zombies con el revolver; el loot se acredita automaticamente.
3. Construye un Signal Refuge con 12 de madera, 8 de piedra y 1 fragmento.
4. La torre ataca enemigos, crea una zona sin spawns y se convierte en checkpoint.
5. Las torres alcanzan nivel 2 con 8 bajas y nivel 3 con 20 bajas.
6. Al morir, reapareces en la torre mas reciente sin perder el inventario.

La salud, municion, inventario, torres, niveles y progreso narrativo se guardan en `localStorage` con una estructura versionada.

## Mundo

La rama `v2` genera un mundo determinista por chunks de 16 x 16 celdas, con terreno de bloques grandes, biomas regionales, varias recetas de arboles y arbustos, rocas instanciadas y sprites pixelados procedurales.

Perfiles visuales disponibles:

- `/?style=dark`: diorama oscuro con terreno y vegetacion iluminados.
- `/?style=daylight`: bosque voxel diurno para comparacion A/B.

## Audio

La interfaz usa [`uisfx`](https://github.com/romainsimon/uisfx) con el pack `mechanical`. Los disparos, impactos y torres usan recetas Web Audio locales, por lo que el prototipo no requiere archivos de sonido externos. El audio se desbloquea despues de la primera interaccion del usuario y recuerda la preferencia de silencio.

## Arquitectura de gameplay

```text
src/
  audio/       AudioManager
  gameplay/    combate, inventario, recursos, guardado, historia, torres y zombies
  entities/    Player, Zombie y Tower
  world/       chunks, terreno, vegetacion, props y punto de origen
  ui/          HUD tactico y transmisiones
```

Los objetos recolectables conservan IDs deterministas. Al agotarlos se reconstruye solamente la capa de vegetacion o props de su chunk; el terreno no se regenera.

## Verificacion

```bash
npm test
npm run build
```

Las pruebas cubren bus de eventos, inventario, guardado, recursos deterministas, recarga, dificultad zombie y construccion/niveles de torres.
