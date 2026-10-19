import { geoTo3D } from './governorates';

// High-fidelity geographic polygon tracing the authentic borders and coastlines of Oman
export const OMAN_BOUNDARY_POLYGON: [number, number][] = [
  // Musandam northern tip (Strait of Hormuz)
  [56.46, 26.38], // Kumzar
  [56.32, 26.24], // Khasab bay
  [56.12, 26.05], // Bukha
  [56.05, 25.80], // Musandam west coast
  // Northern UAE border corridor down to Buraimi
  [55.90, 25.00],
  [55.80, 24.60], // Mahdah
  [55.76, 24.25], // Al Buraimi oasis
  [55.65, 23.90],
  // Saudi / Rub al Khali desert western border
  [55.40, 23.20],
  [55.00, 22.40],
  [54.20, 21.60],
  [53.20, 20.40],
  [52.00, 19.00], // Southwest desert boundary
  // Yemen border down to Arabian Sea coast
  [52.00, 17.30],
  [52.00, 16.65], // Sarfait border
  [52.90, 16.62], // Dalkhut coast
  // Dhofar coastline (Arabian Sea) heading northeast
  [53.70, 16.85], // Rakhyut
  [54.09, 17.01], // Salalah coastal crescent
  [54.39, 17.03], // Taqah
  [54.69, 16.99], // Mirbat
  [55.25, 17.65], // Hasik
  [55.85, 18.20], // Ash Shuwaymiyyah
  [56.30, 18.70], // Sharbithat
  [56.60, 19.30], // Ras Madrakah cape
  [57.70, 19.66], // Duqm port
  [57.85, 20.40], // Khaluf white sand coast
  [58.20, 20.75], // Shannah / Masirah channel
  // Eastern province coast heading to Ras Al Hadd
  [58.70, 21.20],
  [59.56, 21.85], // Al Ashkharah
  [59.75, 22.30], // As Seelah
  [59.85, 22.54], // Ras Al Hadd (easternmost horn of Arabia)
  // Gulf of Oman coastline returning northwest
  [59.52, 22.56], // Sur
  [59.18, 22.85], // Qalhat & Tiwi
  [58.90, 23.15], // Fins & Bimmah
  [58.60, 23.50], // Bandar Khayran
  [58.56, 23.62], // Mutrah & Muscat Corniche
  [58.19, 23.67], // Seeb
  [57.88, 23.71], // Barka
  [57.44, 23.85], // Al Suwaiq
  [57.10, 23.99], // Al Khaburah
  [56.89, 24.17], // Saham
  [56.75, 24.36], // Sohar
  [56.57, 24.53], // Liwa
  [56.47, 24.74], // Shinas
  [56.40, 25.00], // UAE border boundary
  [56.27, 25.62], // Dibba Al-Baya (Musandam east coast)
  [56.38, 26.15], // Musandam fjords east
  [56.46, 26.38], // Return to Kumzar
];

// Point-in-polygon algorithm (Ray casting)
export function isPointInOman(lon: number, lat: number): boolean {
  if (lon < 51.8 || lon > 60.1 || lat < 16.4 || lat > 26.6) return false;

  const poly = OMAN_BOUNDARY_POLYGON;
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0];
    const yi = poly[i][1];
    const xj = poly[j][0];
    const yj = poly[j][1];

    const intersect = yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }

  // Include Masirah Island
  if (!inside && lat >= 20.15 && lat <= 20.85 && lon >= 58.60 && lon <= 58.95) {
    inside = true;
  }

  // Ensure northern Musandam tip is covered
  if (!inside && lat >= 25.5 && lat <= 26.5 && lon >= 56.1 && lon <= 56.5) {
    inside = true;
  }

  return inside;
}

// Distance to coastline factor for clean island/landmass boundary drop
export function getOmanCoastDistance(lon: number, lat: number): number {
  let minDist = 999;
  for (let i = 0; i < OMAN_BOUNDARY_POLYGON.length; i++) {
    const p = OMAN_BOUNDARY_POLYGON[i];
    const d = Math.hypot(lon - p[0], lat - p[1]);
    if (d < minDist) minDist = d;
  }
  return minDist;
}

// Sculpted topographic elevation model for Oman with crisp coastal drop-off
export function calculateOmanElevation(lon: number, lat: number): number {
  const inOman = isPointInOman(lon, lat);
  if (!inOman) {
    // Ocean bathymetry floor
    const distToCoast = getOmanCoastDistance(lon, lat);
    const shelfDepth = Math.min(0.35, distToCoast * 0.45);
    return -shelfDepth;
  }

  // Clean shelf height above ocean: raised island plateau look
  const distToCoast = getOmanCoastDistance(lon, lat);
  const coastalLift = Math.min(1.0, distToCoast / 0.12);
  let elev = 0.22 + coastalLift * 0.18;

  // Western Hajar Mountains & Jebel Shams (lat ~23.2, lon ~57.25)
  const distJebelShams = Math.hypot(lon - 57.26, (lat - 23.24) * 1.05);
  if (distJebelShams < 1.35) {
    const hajarPeak = Math.max(0, 1 - distJebelShams / 1.35);
    elev += Math.pow(hajarPeak, 1.8) * 2.85; // Highest mountain summit in Arabia (3,009m)
  }

  // Jebel Akhdar plateau (lat ~23.07, lon ~57.65)
  const distJebelAkhdar = Math.hypot(lon - 57.65, (lat - 23.07) * 1.05);
  if (distJebelAkhdar < 0.9) {
    const akhdarPeak = Math.max(0, 1 - distJebelAkhdar / 0.9);
    elev += Math.pow(akhdarPeak, 1.6) * 1.95;
  }

  // Eastern Hajar Mountains (lat ~22.8 to 23.3, lon ~58.2 to 59.2)
  const distEastHajar = Math.hypot(lon - 58.7, lat - 23.0);
  if (distEastHajar < 1.1) {
    const peak = Math.max(0, 1 - distEastHajar / 1.1);
    elev += Math.pow(peak, 2) * 1.65;
  }

  // Dhofar Jabal Samhan & Jabal Qara Mountains (lat ~17.1 to 17.4, lon ~54.2 to 55.3)
  const distDhofar = Math.hypot((lon - 54.6) * 0.8, lat - 17.15);
  if (distDhofar < 1.0) {
    const peak = Math.max(0, 1 - distDhofar / 1.0);
    elev += Math.pow(peak, 1.9) * 1.5;
  }

  // Musandam Fjord Mountains (lat ~26.0 to 26.4, lon ~56.2 to 56.4)
  const distMusandam = Math.hypot(lon - 56.3, lat - 26.2);
  if (distMusandam < 0.45) {
    const peak = Math.max(0, 1 - distMusandam / 0.45);
    elev += Math.pow(peak, 1.7) * 1.6;
  }

  // Subtle interior desert dunes texture
  const microNoise =
    Math.sin(lon * 28.0 + lat * 20.0) * 0.04 +
    Math.sin(lon * 52.0 - lat * 40.0) * 0.02;

  return Math.max(0.12, elev + microNoise);
}
