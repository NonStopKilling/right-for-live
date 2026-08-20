const DARK_DIORAMA = {
  id: 'dark',
  label: 'Diorama oscuro',
  background: 0x0f0c0b,
  fog: { color: 0x0f0c0b, near: 18, far: 38 },
  renderer: { toneMapping: 'aces', exposure: 1.16 },
  lighting: {
    ambient: { color: 0xfff0cf, intensity: 1.08 },
    hemisphere: { sky: 0xdff0b7, ground: 0x493a2f, intensity: 1.92 },
    sun: { color: 0xffdda0, intensity: 3.45, position: [-17, 25, 16] }
  },
  palette: {
    meadow: [0x9cad4e, 0xb5c25a, 0xcbd264, 0x849b48],
    moss: [0x648a55, 0x79a461, 0x91b569, 0xa8bd5d],
    soil: [0x9a6945, 0xb47a4c, 0xc89258, 0x7c593e],
    stone: [0x87978e, 0xa8ad98, 0xc1b995, 0x6f807a],
    trail: [0xeaf2b4, 0xf5e6a2, 0xd4eee0],
    trunk: [0x79513a, 0x936344, 0xab754d],
    rock: [0x84928b, 0xa8a98f, 0xc0b797]
  },
  treePalettes: [
    { base: 0x748a42, shade: 0x405832, tip: 0xd1d85e },
    { base: 0x9fb64c, shade: 0x60743a, tip: 0xe4e56a },
    { base: 0x568678, shade: 0x315b51, tip: 0xa7c96c },
    { base: 0xc1874f, shade: 0x795139, tip: 0xe6b466 },
    { base: 0xb36356, shade: 0x703f3b, tip: 0xda8967 },
    { base: 0x4e6b3b, shade: 0x304a2e, tip: 0x8da04b },
    { base: 0x365f6b, shade: 0x203f4f, tip: 0x77aab4 },
    { base: 0x7a4d77, shade: 0x472d54, tip: 0xb7769a }
  ],
  spriteColors: [0xd3d967, 0x9bb65a, 0xe8a968, 0x81b68b],
  landmark: { core: 0xffefac, glow: 0xffd76e, light: 0xffc85b, intensity: 2.1 }
};

const DAYLIGHT_VOXEL = {
  id: 'daylight',
  label: 'Bosque diurno',
  background: 0x82c8dc,
  fog: { color: 0x82c8dc, near: 24, far: 49 },
  renderer: { toneMapping: 'aces', exposure: 1.02 },
  lighting: {
    ambient: { color: 0xe9f6ff, intensity: 0.72 },
    hemisphere: { sky: 0xd9f3dc, ground: 0x526152, intensity: 1.48 },
    sun: { color: 0xfff0c2, intensity: 2.95, position: [-17, 25, 16] }
  },
  palette: {
    meadow: [0x91b83f, 0xa9c64d, 0xc0d458, 0x78a23e],
    moss: [0x4f9a64, 0x67ae70, 0x83c07c, 0xa3c95e],
    soil: [0xaa7040, 0xc08046, 0xd49a55, 0x8d603c],
    stone: [0x7d9092, 0xa2a99d, 0xb9b79f, 0x697d80],
    trail: [0xf1dd75, 0xf3bd60, 0xd9ecba],
    trunk: [0x845037, 0x9f623e, 0xb97847],
    rock: [0x75898d, 0x9ca59d, 0xb8b69e]
  },
  treePalettes: [
    { base: 0x4e9f69, shade: 0x2d7453, tip: 0x8dce72 },
    { base: 0x8dbc45, shade: 0x588b3f, tip: 0xd5dc58 },
    { base: 0x45a990, shade: 0x287665, tip: 0x8bd5a0 },
    { base: 0xd69a42, shade: 0x9c682e, tip: 0xf1c35a },
    { base: 0xd16f4e, shade: 0x984737, tip: 0xefa067 },
    { base: 0x347c51, shade: 0x24583e, tip: 0x72aa57 },
    { base: 0x4389a1, shade: 0x2d5c72, tip: 0x8bc8c7 },
    { base: 0xa56aa1, shade: 0x704872, tip: 0xd194ad }
  ],
  spriteColors: [0xc9d957, 0x76bd66, 0xf0a552, 0x62b9a1],
  landmark: { core: 0xffe37d, glow: 0xffc84d, light: 0xffb941, intensity: 1.65 }
};

export const VISUAL_PROFILES = {
  dark: DARK_DIORAMA,
  daylight: DAYLIGHT_VOXEL
};

export function resolveVisualProfile(search = window.location.search) {
  const requested = new URLSearchParams(search).get('style');
  return VISUAL_PROFILES[requested] ?? VISUAL_PROFILES.dark;
}
