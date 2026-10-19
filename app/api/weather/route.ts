import { NextResponse } from 'next/server';
import { OMAN_LOCATIONS } from '@/lib/governorates';
import { getBaselineFallbackTelemetry, WeatherTelemetry, wmoCodeToCondition } from '@/lib/weather';

// In-memory cache for 5 minutes
let cachedData: { timestamp: number; payload: Record<string, WeatherTelemetry> } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000;

export async function GET() {
  const now = Date.now();
  if (cachedData && now - cachedData.timestamp < CACHE_TTL_MS) {
    return NextResponse.json({
      success: true,
      cached: true,
      data: cachedData.payload,
      timestamp: new Date(cachedData.timestamp).toISOString(),
    });
  }

  try {
    // Open-Meteo accepts batch coordinates
    const lats = OMAN_LOCATIONS.map((g) => g.lat).join(',');
    const lons = OMAN_LOCATIONS.map((g) => g.lon).join(',');

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,surface_pressure,wind_speed_10m,wind_direction_10m&hourly=temperature_2m,relative_humidity_2m,weather_code&forecast_days=2&timezone=Asia%2FMuscat`;

    const res = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'OmanWeather3D/1.0',
      },
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      throw new Error(`Open-Meteo returned status ${res.status}`);
    }

    const json = await res.json();
    const dataList = Array.isArray(json) ? json : [json];

    const result: Record<string, WeatherTelemetry> = {};

    OMAN_LOCATIONS.forEach((loc, index) => {
      const item = dataList[index];
      if (!item || !item.current) {
        return;
      }

      const cur = item.current;
      const cond = wmoCodeToCondition(cur.weather_code ?? 0);

      const hourlyTimes: string[] = item.hourly?.time?.slice(0, 24) ?? [];
      const hourlyTemps: number[] = item.hourly?.temperature_2m?.slice(0, 24) ?? [];
      const hourlyHums: number[] = item.hourly?.relative_humidity_2m?.slice(0, 24) ?? [];
      const hourlyCodes: number[] = item.hourly?.weather_code?.slice(0, 24) ?? [];

      result[loc.id] = {
        governorateId: loc.id,
        nameEn: loc.nameEn,
        nameAr: loc.nameAr,
        capitalEn: loc.capitalEn,
        lat: loc.lat,
        lon: loc.lon,
        temperatureC: Math.round((cur.temperature_2m ?? 30) * 10) / 10,
        apparentTemperatureC: Math.round((cur.apparent_temperature ?? cur.temperature_2m ?? 30) * 10) / 10,
        relativeHumidity: Math.round(cur.relative_humidity_2m ?? 50),
        windSpeedKmh: Math.round(cur.wind_speed_10m ?? 12),
        windDirectionDeg: Math.round(cur.wind_direction_10m ?? 90),
        weatherCode: cur.weather_code ?? 0,
        surfacePressureHpa: Math.round(cur.surface_pressure ?? 1012),
        isDay: Boolean(cur.is_day ?? 1),
        conditionLabel: cond.label,
        conditionCategory: cond.category,
        hourly: {
          time: hourlyTimes,
          temperatureC: hourlyTemps,
          relativeHumidity: hourlyHums,
          weatherCode: hourlyCodes,
        },
        lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
    });

    // Fill any missing from baseline
    const baseline = getBaselineFallbackTelemetry();
    for (const loc of OMAN_LOCATIONS) {
      if (!result[loc.id]) {
        result[loc.id] = baseline[loc.id];
      }
    }

    cachedData = {
      timestamp: now,
      payload: result,
    };

    return NextResponse.json({
      success: true,
      cached: false,
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Error fetching Open-Meteo weather data, using baseline fallback:', err);
    const fallback = getBaselineFallbackTelemetry();
    return NextResponse.json({
      success: true,
      cached: false,
      fallback: true,
      data: fallback,
      timestamp: new Date().toISOString(),
    });
  }
}
