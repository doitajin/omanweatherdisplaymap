'use client';

import React, { useEffect, useRef } from 'react';
import { X, Wind, Droplets, Gauge, Compass, MapPin } from 'lucide-react';
import { OMAN_LOCATIONS } from '@/lib/governorates';
import { WeatherTelemetry, cToF } from '@/lib/weather';
import { TempUnit } from './WeatherDock';

interface RegionDetailModalProps {
  governorateId: string | null;
  onClose: () => void;
  onFocusRegion: (id: string) => void;
  weatherData: Record<string, WeatherTelemetry>;
  tempUnit: TempUnit;
  selectedHour?: number;
}

export function RegionDetailModal({
  governorateId,
  onClose,
  onFocusRegion,
  weatherData,
  tempUnit,
  selectedHour = 12,
}: RegionDetailModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  // Move focus into the panel when it opens and return it to the trigger when
  // it closes, so keyboard and screen-reader users are never dropped on <body>.
  useEffect(() => {
    if (!governorateId) return;

    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    closeButtonRef.current?.focus();

    return () => {
      restoreFocusRef.current?.focus?.();
    };
  }, [governorateId]);

  // Trap Tab inside the panel while it is open.
  useEffect(() => {
    if (!governorateId) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const focusables = panelRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusables || focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [governorateId]);

  if (!governorateId) return null;

  const gov = OMAN_LOCATIONS.find((g) => g.id === governorateId);
  const telemetry = weatherData[governorateId];

  if (!gov) return null;

  const hIndex = Math.min(23, Math.max(0, Math.floor(selectedHour)));
  const currentTemp = telemetry?.hourly?.temperatureC?.[hIndex] ?? telemetry?.temperatureC ?? 30;
  const currentHum = telemetry?.hourly?.relativeHumidity?.[hIndex] ?? telemetry?.relativeHumidity ?? 50;

  const tempDisplay = tempUnit === 'celsius' ? `${Math.round(currentTemp)}°C` : `${cToF(currentTemp)}°F`;
  const feelsLike = currentTemp + (currentHum > 60 ? 3 : -1);
  const feelsLikeDisplay = tempUnit === 'celsius' ? `${Math.round(feelsLike)}°C` : `${cToF(feelsLike)}°F`;

  return (
    <>
      {/* Mobile Backdrop Scrim */}
      <div
        onClick={onClose}
        aria-hidden="true"
        className="fixed inset-0 bg-black/40 z-35 md:hidden pointer-events-auto backdrop-blur-xs transition-opacity"
      />

      {/* Responsive Container: Desktop = top-right floating card; Mobile = bottom-sheet drawer */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="false"
        aria-labelledby="region-detail-title"
        className="fixed md:top-20 md:right-6 md:left-auto left-0 right-0 bottom-0 md:bottom-auto z-40 w-full md:max-w-sm pointer-events-auto animate-in fade-in slide-in-from-bottom-6 md:slide-in-from-right-4 duration-200"
      >
        <div className="bg-slate-950/95 border border-slate-800/90 rounded-t-3xl md:rounded-2xl p-4 md:p-5 shadow-2xl flex flex-col gap-3.5 text-slate-100 max-h-[85vh] overflow-y-auto">
          {/* Mobile Handle */}
          <div className="md:hidden w-10 h-1 bg-slate-700 rounded-full mx-auto -mt-1 mb-1" />

          {/* Header: Title, Arabic Name, Close */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 id="region-detail-title" className="text-xl font-bold tracking-tight text-white">
                  {gov.nameEn}
                </h2>
                <span className="text-xs text-slate-400 font-medium">({gov.nameAr})</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                <span>Capital: {gov.capitalEn}</span>
                <span aria-hidden="true">·</span>
                <span>Elev: {gov.baseElevationM}m</span>
              </div>
            </div>
            <button
              ref={closeButtonRef}
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
              title="Close inspection"
              aria-label={`Close details for ${gov.nameEn}`}
            >
              <X className="w-5 h-5 md:w-4 md:h-4" />
            </button>
          </div>

          {/* Primary Metric Spotlight */}
          {telemetry && (
            <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-900/90 rounded-xl border border-slate-800/80">
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Temp ({Math.floor(selectedHour)}:00)
                </span>
                <div className="text-3xl font-extrabold font-mono tracking-tight text-amber-400 tabular-nums">
                  {tempDisplay}
                </div>
                <span className="text-[11px] text-slate-400">
                  Feels like <strong className="text-slate-200 font-mono tabular-nums">{feelsLikeDisplay}</strong>
                </span>
              </div>

              <div className="flex flex-col justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Sky Condition
                  </span>
                  <span className="text-sm font-semibold text-slate-200 block truncate">
                    {telemetry.conditionLabel}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-cyan-400">
                  <Droplets className="w-3.5 h-3.5 shrink-0" />
                  <span className="font-mono font-semibold tabular-nums">{currentHum}% Humidity</span>
                </div>
              </div>
            </div>
          )}

          {/* Secondary Weather Stats Grid */}
          {telemetry && (
            <div className="grid grid-cols-3 gap-2">
              <div className="p-2.5 bg-slate-900/60 rounded-xl border border-slate-800/70 flex flex-col gap-1">
                <div className="flex items-center gap-1 text-[11px] text-slate-400">
                  <Wind className="w-3 h-3 text-emerald-400" />
                  <span>Wind</span>
                </div>
                <span className="text-xs font-bold font-mono text-slate-200 tabular-nums">
                  {telemetry.windSpeedKmh} km/h
                </span>
                <div className="flex items-center gap-1 text-[10px] text-slate-400">
                  <Compass
                    className="w-3 h-3 transition-transform"
                    style={{ transform: `rotate(${telemetry.windDirectionDeg}deg)` }}
                  />
                  <span className="font-mono tabular-nums">{telemetry.windDirectionDeg}°</span>
                </div>
              </div>

              <div className="p-2.5 bg-slate-900/60 rounded-xl border border-slate-800/70 flex flex-col gap-1">
                <div className="flex items-center gap-1 text-[11px] text-slate-400">
                  <Droplets className="w-3 h-3 text-cyan-400" />
                  <span>Moisture</span>
                </div>
                <span className="text-xs font-bold font-mono text-slate-200 tabular-nums">
                  {currentHum}%
                </span>
                <span className="text-[10px] text-slate-400">
                  {currentHum > 70 ? 'High' : currentHum > 40 ? 'Moderate' : 'Arid'}
                </span>
              </div>

              <div className="p-2.5 bg-slate-900/60 rounded-xl border border-slate-800/70 flex flex-col gap-1">
                <div className="flex items-center gap-1 text-[11px] text-slate-400">
                  <Gauge className="w-3 h-3 text-indigo-400" />
                  <span>Pressure</span>
                </div>
                <span className="text-xs font-bold font-mono text-slate-200 tabular-nums">
                  {telemetry.surfacePressureHpa}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">hPa</span>
              </div>
            </div>
          )}

          {/* 24-Hour Forecast Timeline Bar Chart with Active Hour Marker */}
          {telemetry && telemetry.hourly && telemetry.hourly.temperatureC.length > 0 && (
            <div>
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 mb-2">
                <span className="uppercase tracking-wider">24h Diurnal Curve</span>
                <span className="text-slate-400 font-mono">Open-Meteo</span>
              </div>
              <div className="flex items-end gap-1 h-14 bg-slate-900/40 p-2 rounded-xl border border-slate-800/70">
                {telemetry.hourly.temperatureC.slice(0, 16).map((t, idx) => {
                  const minT = 15;
                  const maxT = 45;
                  const heightPct = Math.max(15, Math.min(100, ((t - minT) / (maxT - minT)) * 100));
                  const isCurHourBar = idx === hIndex;
                  const valDisplay = tempUnit === 'celsius' ? `${Math.round(t)}°` : `${cToF(t)}°`;

                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-1 group relative">
                      <div
                        className={`w-full rounded-t-sm transition-all ${
                          isCurHourBar
                            ? 'bg-amber-300 ring-2 ring-white/60'
                            : 'bg-gradient-to-t from-amber-600/70 to-amber-400/90 group-hover:from-amber-500'
                        }`}
                        style={{ height: `${heightPct}%` }}
                      />
                      <div className="absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover:block bg-slate-900 text-white text-[10px] px-1.5 py-0.5 rounded font-mono shadow-md whitespace-nowrap z-40 border border-slate-700">
                        {valDisplay}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between text-[10px] font-mono text-slate-400 mt-1">
                <span>00:00</span>
                <span>06:00 (Dawn)</span>
                <span>12:00 (Noon)</span>
                <span>18:00 (Sunset)</span>
              </div>
            </div>
          )}

          {/* Regional Highlights */}
          <div className="text-xs text-slate-300 leading-relaxed border-t border-slate-800/70 pt-3">
            <p className="mb-2">{gov.description}</p>
            <div className="flex flex-wrap gap-1 mt-1.5">
              {gov.highlights.map((h, i) => (
                <span
                  key={i}
                  className="text-[11px] text-amber-300/90 font-medium bg-amber-950/40 border border-amber-800/40 rounded px-2 py-0.5"
                >
                  {h}
                </span>
              ))}
            </div>
          </div>

          {/* Fly Camera Action */}
          <div className="pt-1">
            <button
              onClick={() => onFocusRegion(gov.id)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] text-xs font-semibold text-slate-900 bg-amber-400 hover:bg-amber-300 rounded-xl transition-colors cursor-pointer shadow-md touch-manipulation"
            >
              <MapPin className="w-4 h-4" />
              <span>Fly Camera to {gov.nameEn}</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
