export const GAMEPLAY = Object.freeze({
  interactRange: 1.35,
  resourceRespawnSeconds: 0,
  player: Object.freeze({
    maxHealth: 100,
    criticalHealth: 28,
    respawnDelay: 1.8
  }),
  weapon: Object.freeze({
    magazineSize: 6,
    startingReserve: 24,
    damage: 34,
    fireInterval: 0.38,
    reloadDuration: 1.2,
    range: 9
  }),
  zombie: Object.freeze({
    baseHealth: 68,
    baseDamage: 10,
    baseSpeed: 1.05,
    attackInterval: 0.95,
    spawnInterval: 2.8,
    spawnMinRadius: 8,
    spawnMaxRadius: 13,
    maxActive: 24,
    simulationRadius: 24,
    threatTierDistance: 18
  }),
  tower: Object.freeze({
    maxCount: 12,
    placementRange: 2.5,
    safeRadius: 5.5,
    cost: Object.freeze({ wood: 12, stone: 8, artifact: 1 }),
    levels: Object.freeze([
      Object.freeze({ level: 1, kills: 0, damage: 26, range: 6, fireInterval: 0.65 }),
      Object.freeze({ level: 2, kills: 8, damage: 40, range: 6.8, fireInterval: 0.55 }),
      Object.freeze({ level: 3, kills: 20, damage: 58, range: 7.6, fireInterval: 0.45 })
    ])
  }),
  harvest: Object.freeze({
    wood: Object.freeze({ duration: 0.8, minYield: 2, maxYield: 4 }),
    stone: Object.freeze({ duration: 1.05, minYield: 2, maxYield: 3 }),
    artifact: Object.freeze({ duration: 1.25, minYield: 1, maxYield: 1 })
  })
});

export const STORY_STEPS = Object.freeze([
  Object.freeze({
    id: 'gather',
    title: 'REUNE MATERIALES',
    hint: 'Madera, piedra y un fragmento para amplificar la radio.',
    transmission:
      'Dia cuatro. La radio volvio a encenderse por nueve segundos. Elena dijo mi nombre y alcanzo a mencionar la estacion del norte. Si levanto repetidores por el bosque, podre seguir su senal y abrir un camino seguro para volver con ellos.'
  }),
  Object.freeze({
    id: 'survive',
    title: 'RESISTE EL ATAQUE',
    hint: 'El ruido los atrae. El revolver solo me dara tiempo.',
    transmission:
      'Algo se mueve entre los arboles. No puedo quedarme expuesto mientras busco la frecuencia.'
  }),
  Object.freeze({
    id: 'build',
    title: 'CONSTRUYE UN REFUGIO',
    hint: 'Pulsa B y coloca una torre sobre terreno estable.',
    transmission:
      'Una torre puede vigilar mientras descanso y conservar la frecuencia de Elena.'
  }),
  Object.freeze({
    id: 'north',
    title: 'SIGUE HACIA EL NORTE',
    hint: 'La senal mejora lejos del campamento. Tambien aumenta la amenaza.',
    transmission:
      'La senal es mas clara al norte. Cada repetidor reduce la distancia que queda entre nosotros.'
  })
]);

