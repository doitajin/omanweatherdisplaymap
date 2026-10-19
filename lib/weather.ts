import { WeatherLocation, OMAN_LOCATIONS } from './governorates';

export interface WeatherTelemetry {
  governorateId: string;
  nameEn: string;
  nameAr: string;
  capitalEn: string;
  lat: number;
  lon: number;
  temperatureC: number;
  apparentTemperatureC: number;
  relativeHumidity: number;
  windSpeedKmh: number;
  windDirectionDeg: number;
  weatherCode: number;
  surfacePressureHpa: number;
  isDay: boolean;
  conditionLabel: string;
  conditionCategory: 'clear' | 'partly-cloudy' | 'cloudy' | 'fog' | 'rain' | 'thunderstorm' | 'dust';
  hourly: {
    time: string[];
    temperatureC: number[];
    relativeHumidity: number[];
    weatherCode: number[];
  };
  lastUpdated: string;
}

export function wmoCodeToCondition(code: number): {
  label: string;
  category: 'clear' | 'partly-cloudy' | 'cloudy' | 'fog' | 'rain' | 'thunderstorm' | 'dust';
} {
  switch (code) {
    case 0:
      return { label: 'Clear Sky', category: 'clear' };
    case 1:
      return { label: 'Mainly Clear', category: 'clear' };
    case 2:
      return { label: 'Partly Cloudy', category: 'partly-cloudy' };
    case 3:
      return { label: 'Overcast', category: 'cloudy' };
    case 45:
    case 48:
      return { label: 'Fog / Sea Mist', category: 'fog' };
    case 51:
    case 53:
    case 55:
      return { label: 'Light Drizzle', category: 'rain' };
    case 61:
    case 63:
    case 65:
      return { label: 'Rain Showers', category: 'rain' };
    case 71:
    case 73:
    case 75:
      return { label: 'Mountain Hail/Flurries', category: 'rain' };
    case 80:
    case 81:
    case 82:
      return { label: 'Torrential Wadis Rain', category: 'rain' };
    case 95:
    case 96:
    case 99:
      return { label: 'Severe Thunderstorm', category: 'thunderstorm' };
    default:
      return { label: 'Fair Skies', category: 'clear' };
  }
}

// Convert temperature into an interpolated RGB color [r, g, b] (0..1)
// Scale: 14°C (Cool Alpine) -> 22°C (Mild Highland) -> 30°C (Warm Coastal) -> 38°C (Desert Heat) -> 44°C+ (Extreme Scorching)
export function getTemperatureRGB(tempC: number): [number, number, number] {
  // Normalize between 14°C and 42°C
  const t = Math.max(0, Math.min(1, (tempC - 14) / 28));

  if (t < 0.25) {
    // 14°C - 21°C: Vivid Alpine Cyan to Emerald Teal
    // [0.01, 0.52, 0.78] -> [0.06, 0.72, 0.51]
    const f = t / 0.25;
    return [
      0.01 + 0.05 * f,
      0.52 + 0.20 * f,
      0.78 - 0.27 * f,
    ];
  } else if (t < 0.55) {
    // 21°C - 29.4°C: Emerald Teal to Golden Amber
    // [0.06, 0.72, 0.51] -> [0.96, 0.62, 0.04]
    const f = (t - 0.25) / 0.30;
    return [
      0.06 + 0.90 * f,
      0.72 - 0.10 * f,
      0.51 - 0.47 * f,
    ];
  } else if (t < 0.82) {
    // 29.4°C - 37°C: Golden Amber to Deep Tangerine
    // [0.96, 0.62, 0.04] -> [0.92, 0.35, 0.05]
    const f = (t - 0.55) / 0.27;
    return [
      0.96 - 0.04 * f,
      0.62 - 0.27 * f,
      0.04 + 0.01 * f,
    ];
  } else {
    // 37°C - 42°C+: Deep Tangerine to Scorching Crimson Red
    // [0.92, 0.35, 0.05] -> [0.86, 0.15, 0.15]
    const f = (t - 0.82) / 0.18;
    return [
      0.92 - 0.06 * f,
      0.35 - 0.20 * f,
      0.05 + 0.10 * f,
    ];
  }
}

// Convert humidity into an interpolated RGB color [r, g, b] (0..1)
// Scale: 10% (Arid Desert) -> 40% (Moderate) -> 65% (Coastal Marine) -> 95% (Khareef Monsoon Mist)
export function getHumidityRGB(humidity: number): [number, number, number] {
  const h = Math.max(0, Math.min(1, humidity / 100));

  if (h < 0.30) {
    // 0 - 30%: Arid Desert Ochre [0.71, 0.33, 0.04] to [0.08, 0.72, 0.65]
    const f = h / 0.30;
    return [
      0.71 - 0.63 * f,
      0.33 + 0.39 * f,
      0.04 + 0.61 * f,
    ];
  } else if (h < 0.65) {
    // 30% - 65%: Soft Turquoise to Coastal Azure [0.08, 0.72, 0.65] to [0.01, 0.52, 0.78]
    const f = (h - 0.30) / 0.35;
    return [
      0.08 - 0.07 * f,
      0.72 - 0.20 * f,
      0.65 + 0.13 * f,
    ];
  } else {
    // 65% - 100%: Coastal Azure to Royal Indigo Khareef [0.01, 0.52, 0.78] to [0.26, 0.22, 0.79]
    const f = (h - 0.65) / 0.35;
    return [
      0.01 + 0.25 * f,
      0.52 - 0.30 * f,
      0.78 + 0.01 * f,
    ];
  }
}

export function cToF(c: number): number {
  return Math.round((c * 9) / 5 + 32);
}

// Baseline climatological data for all 27+ locations for instant hydration
export function getBaselineFallbackTelemetry(): Record<string, WeatherTelemetry> {
  const now = new Date();
  const timeStrings = Array.from({ length: 24 }, (_, i) => {
    const d = new Date(now);
    d.setHours(d.getHours() - (23 - i));
    return d.toISOString();
  });

  const baselines: Record<string, { temp: number; hum: number; wind: number; dir: number; code: number }> = {
    // 11 Governorates
    'muscat': { temp: 31, hum: 62, wind: 14, dir: 85, code: 0 },
    'dhofar': { temp: 26, hum: 82, wind: 19, dir: 195, code: 2 },
    'musandam': { temp: 32, hum: 58, wind: 16, dir: 40, code: 0 },
    'ad-dakhiliyah': { temp: 28, hum: 25, wind: 12, dir: 110, code: 0 },
    'al-batinah-north': { temp: 33, hum: 65, wind: 15, dir: 75, code: 1 },
    'al-batinah-south': { temp: 32, hum: 50, wind: 11, dir: 90, code: 0 },
    'ash-sharqiyah-north': { temp: 33, hum: 28, wind: 14, dir: 130, code: 0 },
    'ash-sharqiyah-south': { temp: 29, hum: 70, wind: 22, dir: 160, code: 1 },
    'al-dhahirah': { temp: 35, hum: 22, wind: 10, dir: 270, code: 0 },
    'al-wusta': { temp: 33, hum: 38, wind: 18, dir: 200, code: 0 },
    'al-buraimi': { temp: 34, hum: 30, wind: 13, dir: 310, code: 0 },

    // Mountain Summits & Microclimates (Cool Alpine!)
    'jebel-shams': { temp: 16, hum: 32, wind: 24, dir: 315, code: 0 },
    'jebel-akhdar': { temp: 20, hum: 40, wind: 18, dir: 290, code: 0 },
    'jabal-samhan': { temp: 22, hum: 78, wind: 20, dir: 210, code: 2 },

    // Cities & Wilayats
    'mutrah': { temp: 31, hum: 64, wind: 13, dir: 80, code: 0 },
    'seeb': { temp: 32, hum: 63, wind: 15, dir: 70, code: 0 },
    'bahla': { temp: 30, hum: 26, wind: 11, dir: 120, code: 0 },
    'al-hamra': { temp: 27, hum: 30, wind: 12, dir: 140, code: 0 },
    'samail': { temp: 31, hum: 38, wind: 13, dir: 100, code: 0 },
    'barka': { temp: 32, hum: 66, wind: 14, dir: 65, code: 1 },
    'nakhal': { temp: 31, hum: 42, wind: 10, dir: 110, code: 0 },
    'bidiyah': { temp: 35, hum: 24, wind: 16, dir: 170, code: 0 },
    'wadi-bani-khalid': { temp: 28, hum: 35, wind: 9, dir: 150, code: 0 },

    // Coastal Ports, Islands & Desert
    'duqm': { temp: 28, hum: 74, wind: 22, dir: 190, code: 1 },
    'masirah-island': { temp: 27, hum: 78, wind: 28, dir: 205, code: 1 },
    'ras-al-hadd': { temp: 28, hum: 72, wind: 20, dir: 145, code: 0 },
    'al-ashkharah': { temp: 24, hum: 80, wind: 26, dir: 185, code: 1 },
    'kumzar': { temp: 31, hum: 62, wind: 18, dir: 35, code: 0 },
    'mirbat': { temp: 27, hum: 81, wind: 17, dir: 190, code: 2 },
    'thumrait': { temp: 35, hum: 20, wind: 15, dir: 240, code: 0 },
  };

  const result: Record<string, WeatherTelemetry> = {};

  for (const loc of OMAN_LOCATIONS) {
    const base = baselines[loc.id] || { temp: 30, hum: 50, wind: 15, dir: 90, code: 0 };
    const cond = wmoCodeToCondition(base.code);

    const hourlyTemps = timeStrings.map((_, idx) => {
      const hourOffset = (idx - 12) / 6;
      const diurnal = Math.sin(hourOffset) * 4.2;
      return Math.round((base.temp + diurnal) * 10) / 10;
    });

    const hourlyHums = timeStrings.map((_, idx) => {
      const hourOffset = (idx - 12) / 6;
      const inverseDiurnal = -Math.sin(hourOffset) * 12;
      return Math.max(10, Math.min(98, Math.round(base.hum + inverseDiurnal)));
    });

    result[loc.id] = {
      governorateId: loc.id,
      nameEn: loc.nameEn,
      nameAr: loc.nameAr,
      capitalEn: loc.capitalEn,
      lat: loc.lat,
      lon: loc.lon,
      temperatureC: base.temp,
      apparentTemperatureC: base.temp + (base.hum > 60 ? 3 : -1),
      relativeHumidity: base.hum,
      windSpeedKmh: base.wind,
      windDirectionDeg: base.dir,
      weatherCode: base.code,
      surfacePressureHpa: Math.round(1013 - (loc.baseElevationM / 100) * 11),
      isDay: true,
      conditionLabel: cond.label,
      conditionCategory: cond.category,
      hourly: {
        time: timeStrings,
        temperatureC: hourlyTemps,
        relativeHumidity: hourlyHums,
        weatherCode: Array(24).fill(base.code),
      },
      lastUpdated: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
  }

  return result;
}
