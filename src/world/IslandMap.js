import { WORLD, clamp, valueNoise2D } from '../utils/constants.js';

export const ISLAND = Object.freeze({ seaLevel: 0.65, dockHeight: 0.92 });
export const ISLAND_ENLARGEMENT = 1.44;
const enlarge = value => Math.round(value * ISLAND_ENLARGEMENT);
const point = (gx, gz) => ({ gx: enlarge(gx), gz: enlarge(gz) });

// Hand-traced proportions from the Rapa Nui reference map; game units, not GIS.
// North is -Z. Hanga Roa is near the origin, keeping existing saves accessible.
const fromReference = ([x, z]) => [Math.round((x - 160) * 0.43 * ISLAND_ENLARGEMENT), Math.round((z - 510) * 0.43 * ISLAND_ENLARGEMENT)];
export const ISLAND_OUTLINE = Object.freeze([
  [80,650],[105,604],[116,554],[122,518],[164,495],[177,439],
  [193,394],[192,359],[217,314],[243,275],[254,239],[276,199],
  [279,151],[302,112],[343,80],[356,53],[402,45],[438,52],
  [463,67],[508,63],[551,81],[589,94],[602,119],[638,133],
  [668,120],[696,167],[724,185],[750,209],[790,206],[827,225],
  [876,228],[919,222],[958,231],[1008,228],[1040,254],[1064,293],
  [1047,316],[1038,362],[1004,370],[964,366],[927,373],[889,374],
  [854,391],[859,419],[836,435],[819,458],[784,469],[751,453],
  [722,466],[700,450],[662,457],[624,474],[587,494],[558,511],
  [526,544],[516,576],[479,589],[442,601],[399,598],[354,604],
  [308,609],[282,626],[268,667],[250,709],[220,735],[177,749],
  [139,737],[112,718],[89,697]
].map(fromReference));

export const ISLAND_VOLCANOES = Object.freeze([
  { name: 'Rano Kau', gx: 1, gz: 75, radius: 34, height: 12, craterRadius: 13, lakeLevel: 4.9 },
  { name: 'Terevaka', gx: 117, gz: -130, radius: 75, height: 15, craterRadius: 0 },
  { name: 'Poike', gx: 345, gz: -88, radius: 39, height: 11, craterRadius: 5 },
  { name: 'Rano Raraku', gx: 268, gz: -55, radius: 22, height: 7, craterRadius: 5 }
].map(peak => ({ ...peak, ...point(peak.gx, peak.gz), radius: enlarge(peak.radius), craterRadius: enlarge(peak.craterRadius) })));

export const MOAI_SITES = Object.freeze([
  { name: 'Tahai', gx: 14, gz: -26, count: 5, spacing: 5, angle: Math.PI / 2, pukao: true },
  { name: 'Anakena · Ahu Nau Nau', gx: 204, gz: -145, count: 7, spacing: 5, angle: 0, pukao: true },
  { name: 'Ahu Tongariki', gx: 288, gz: -50, count: 15, spacing: 4, angle: Math.PI + 0.5, pukao: false },
  { name: 'Rano Raraku', gx: 252, gz: -51, count: 4, spacing: 5, angle: -0.5, quarry: true },
  { name: 'Ahu Akivi', gx: 112, gz: -56, count: 7, spacing: 5, angle: -Math.PI / 2, pukao: false },
  { name: 'Te Pito Kura', gx: 274, gz: -119, count: 1, spacing: 5, angle: -Math.PI / 2, pukao: true, scale: 1.55 }
].map(site => ({ ...site, ...point(site.gx, site.gz), spacing: enlarge(site.spacing) })));

export const ISLAND_PLACES = Object.freeze([
  { name: 'Orongo', kind: 'houses', gx: -20, gz: 67 },
  { name: 'Vinapú', kind: 'stoneWall', gx: 59, gz: 32 },
  { name: 'Puna Pau', kind: 'redQuarry', gx: 76, gz: -36 },
  { name: 'Ana Te Pahu', kind: 'cave', gx: 78, gz: -76 },
  { name: 'Akahanga', kind: 'fallenMoai', gx: 171, gz: -8 },
  { name: 'Ovahe', kind: 'beach', gx: 226, gz: -143 },
  { name: 'Motu Nui', kind: 'islet', gx: -17, gz: 120 }
].map(place => ({ ...place, ...point(place.gx, place.gz) })));

export const ISLAND_BOATS = Object.freeze([{ gx: -19, gz: 9 }, { gx: 207, gz: -169 }].map(boat => point(boat.gx, boat.gz)));

export const ISLAND_MAP = Object.freeze({ minX: -90, maxX: 560, minZ: -300, maxZ: 195 });

export function isIslandDock(gx, gz) {
  const x = gx / ISLAND_ENLARGEMENT, z = gz / ISLAND_ENLARGEMENT;
  return (x >= -25 && x <= -7 && Math.abs(z - 3) <= 1) ||
    (x >= -25 && x <= -23 && z >= -2 && z <= 8) ||
    (Math.abs(x - 213) <= 1 && z >= -168 && z <= -155);
}

export function moaiSiteAt(gx, gz, padding = 4) {
  for (const site of MOAI_SITES) {
    const dx = gx - site.gx, dz = gz - site.gz;
    const along = dx * Math.cos(site.angle) - dz * Math.sin(site.angle);
    const across = dx * Math.sin(site.angle) + dz * Math.cos(site.angle);
    if (Math.abs(along) <= (site.count - 1) * site.spacing / 2 + padding && Math.abs(across) <= padding) return site;
  }
  return null;
}

export function isIslandLandmark(gx, gz) {
  return isIslandDock(gx, gz) || Boolean(moaiSiteAt(gx, gz, enlarge(7))) ||
    ISLAND_PLACES.some(place => Math.hypot(gx - place.gx, gz - place.gz) < enlarge(6));
}

export const MOAI_PLACEMENTS = Object.freeze(MOAI_SITES.flatMap(site =>
  Array.from({length:site.count},(_,index) => {
    const offset = (index-(site.count-1)/2)*site.spacing;
    return {site,index,gx:site.gx+Math.cos(site.angle)*offset,gz:site.gz-Math.sin(site.angle)*offset};
  })));

export function isIslandAhu(gx, gz) {
  return MOAI_SITES.some(site => {
    if (site.quarry) return false;
    const dx = gx-site.gx, dz = gz-site.gz;
    const along = dx*Math.cos(site.angle)-dz*Math.sin(site.angle);
    const across = dx*Math.sin(site.angle)+dz*Math.cos(site.angle);
    return Math.abs(along) <= (site.count-1)*site.spacing/2+1.8 && Math.abs(across) <= 1.8;
  });
}

function coastDistance(x, z) {
  let inside = false, squared = Infinity;
  for (let i = 0, j = ISLAND_OUTLINE.length - 1; i < ISLAND_OUTLINE.length; j = i++) {
    const [ax, az] = ISLAND_OUTLINE[j], [bx, bz] = ISLAND_OUTLINE[i];
    const dx = bx - ax, dz = bz - az;
    const t = clamp(((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz), 0, 1);
    squared = Math.min(squared, (x - ax - t * dx) ** 2 + (z - az - t * dz) ** 2);
    if ((az > z) !== (bz > z) && x < (bx - ax) * (z - az) / (bz - az) + ax) inside = !inside;
  }
  return Math.sqrt(squared) * (inside ? 1 : -1);
}

export function islandCell(gx, gz, seed) {
  const noise = valueNoise2D(gx, gz, enlarge(12), seed);
  let shore = coastDistance(gx, gz) + (noise - 0.5) * 1.2;
  // Shallow coves: north-coast Anakena and Ovahe; a small game arrival beach at Hanga Roa.
  shore = Math.min(shore, Math.hypot(gx - enlarge(204), (gz + enlarge(173)) * 1.15) - enlarge(17));
  const beach = Math.hypot(gx - enlarge(204), gz + enlarge(163)) < enlarge(28) ||
    Math.hypot(gx - enlarge(225), gz + enlarge(150)) < enlarge(13) || Math.hypot(gx + enlarge(8), gz - enlarge(2)) < enlarge(19);
  if (Math.hypot(gx - 2, gz + 2) < 5) shore = Math.max(shore, 3);
  const ocean = shore < 0;
  let height = ocean ? Math.max(0.06, ISLAND.seaLevel + shore * 0.12)
    : 0.8 + Math.min(shore, enlarge(14)) * (beach ? 0.035 / ISLAND_ENLARGEMENT : 0.09 / ISLAND_ENLARGEMENT);
  let volcano = 0, crater = false, lake = false, waterLevel = ISLAND.seaLevel;
  for (const peak of ISLAND_VOLCANOES) {
    const distance = Math.hypot(gx - peak.gx, gz - peak.gz);
    const slope = Math.max(0, 1 - distance / peak.radius);
    if (!ocean && slope > 0) {
      volcano = Math.max(volcano, slope);
      const bowl = peak.craterRadius ? Math.max(0, 1 - (distance / peak.craterRadius) ** 3) : 0;
      height += slope * peak.height - bowl * peak.height * 0.85;
      if (bowl > 0) {
        crater = true;
        if (peak.lakeLevel && height < peak.lakeLevel) { lake = true; waterLevel = peak.lakeLevel; }
      }
    }
  }
  // Ahu grounds are level and clear, so moai rows share one continuous platform.
  const site = moaiSiteAt(gx, gz);
  if (site && !ocean && !site.quarry) height = 1.6;
  if (isIslandDock(gx, gz)) height = Math.min(height, ISLAND.dockHeight - 0.18);
  if (Math.hypot(gx - ISLAND_PLACES.at(-1).gx, gz - ISLAND_PLACES.at(-1).gz) < enlarge(7)) {
    height = Math.max(height, 1.1);
    shore = Math.max(shore, 2);
  }
  const finalOcean = shore < 0;
  const water = finalOcean || lake;
  const surface = lake ? 'moss' : finalOcean || (beach && shore < enlarge(12)) ? 'sand'
    : crater || volcano > 0.58 || shore < enlarge(2) ? 'stone' : valueNoise2D(gx, gz, enlarge(9), seed + 123) * 0.65 + valueNoise2D(gx, gz, enlarge(24), seed + 91) * 0.35 < 0.39 ? 'soil' : 'meadow';
  return { gx, gz, level: height / WORLD.blockHeight, surface, water, waterLevel, shore,
    crater, volcano, lake, moisture: 0.6, geology: volcano > 0.2 ? 0.9 : 0.4,
    forest: ['meadow', 'sand', 'soil'].includes(surface) ? 0.65 : 0, biome: noise,
    walkable: !water || isIslandDock(gx, gz), depth: clamp(waterLevel - height, 0, 2) };
}
