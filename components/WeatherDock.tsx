'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  Thermometer,
  Droplets,
  Wind,
  Mountain,
  ChevronDown,
  ChevronUp,
  Play,
  Pause,
  Sun,
  Moon,
  RotateCcw,
  Search,
  X,
  Compass,
} from 'lucide-react';
import { OMAN_LOCATIONS, WeatherLocation, LocationCategory } from '@/lib/governorates';
import { WeatherTelemetry, cToF } from '@/lib/weather';

export type WeatherMetric = 'temperature' | 'humidity' | 'wind' | 'overview';
export type TempUnit = 'celsius' | 'fahrenheit';

interface WeatherDockProps {
  activeMetric: WeatherMetric;
  onSelectMetric: (metric: WeatherMetric) => void;
  tempUnit: TempUnit;
  onToggleTempUnit: () => void;
  selectedGovId: string | null;
  onSelectGovernorate: (id: string) => void;
  weatherData: Record<string, WeatherTelemetry>;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  selectedHour: number;
  onSelectHour: (hour: number) => void;
  isPlayingTimeline: boolean;
  onTogglePlayTimeline: () => void;
  onResetToCurrentHour: () => void;
  currentLocalHour: number;
}

export function WeatherDock({
  activeMetric,
  onSelectMetric,
  tempUnit,
  onToggleTempUnit,
  selectedGovId,
  onSelectGovernorate,
  weatherData,
  isCollapsed,
  onToggleCollapse,
  selectedHour,
  onSelectHour,
  isPlayingTimeline,
  onTogglePlayTimeline,
  onResetToCurrentHour,
  currentLocalHour,
}: WeatherDockProps) {
  const [activeCategory, setActiveCategory] = useState<'all' | LocationCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === 'h' || e.key === 'H') {
        onToggleCollapse();
      } else if (e.code === 'Space') {
        e.preventDefault();
        onTogglePlayTimeline();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onToggleCollapse, onTogglePlayTimeline]);

  // Format hour for display
  const formatHour = (h: number) => {
    const whole = Math.floor(h);
    const period = whole >= 12 ? 'PM' : 'AM';
    const displayH = whole % 12 === 0 ? 12 : whole % 12;
    return `${displayH.toString().padStart(2, '0')}:00 ${period}`;
  };

  const getSolarPhase = (h: number) => {
    if (h >= 5 && h < 7) return { label: 'Dawn', icon: Sun, color: 'text-amber-400' };
    if (h >= 7 && h < 11) return { label: 'Morning', icon: Sun, color: 'text-amber-300' };
    if (h >= 11 && h < 15) return { label: 'Solar Noon', icon: Sun, color: 'text-yellow-400' };
    if (h >= 15 && h < 18) return { label: 'Afternoon', icon: Sun, color: 'text-orange-400' };
    if (h >= 18 && h < 20) return { label: 'Sunset / Maghrib', icon: Sun, color: 'text-rose-400' };
    return { label: 'Night / Moonlight', icon: Moon, color: 'text-sky-300' };
  };

  const phase = getSolarPhase(selectedHour);
  const PhaseIcon = phase.icon;
  const isLiveHour = Math.floor(selectedHour) === currentLocalHour;

  // Filtered locations
  const filteredLocations = useMemo(() => {
    return OMAN_LOCATIONS.filter((loc) => {
      // Category filter
      if (activeCategory !== 'all') {
        if (activeCategory === 'governorate' && !loc.isGovernorateCapital) return false;
        if (activeCategory === 'mountain' && loc.category !== 'mountain') return false;
        if (activeCategory === 'city' && loc.category !== 'city') return false;
        if (activeCategory === 'coastal' && loc.category !== 'coastal' && loc.category !== 'desert') return false;
      }

      // Text query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          loc.nameEn.toLowerCase().includes(q) ||
          loc.nameAr.includes(q) ||
          loc.capitalEn.toLowerCase().includes(q) ||
          loc.description.toLowerCase().includes(q)
        );
      }

      return true;
    });
  }, [activeCategory, searchQuery]);

  return (
    <div className="fixed bottom-2 md:bottom-5 left-1/2 -translate-x-1/2 z-30 w-full max-w-[980px] px-2 md:px-4 pointer-events-none transition-transform duration-300 ease-out">
      {/* Collapse/Expand Toggle Tab & Mobile Drag Handle */}
      <div className="flex justify-center mb-1">
        <button
          onClick={onToggleCollapse}
          className="pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 md:py-1 text-[11px] font-semibold text-slate-300 hover:text-white bg-slate-950/95 border border-slate-800 rounded-t-xl transition-colors cursor-pointer shadow-md select-none touch-manipulation"
          title="Toggle Zen Mode (Shortcut: H)"
        >
          <div className="md:hidden w-8 h-1 bg-slate-600 rounded-full mx-auto mb-1" />
          {isCollapsed ? (
            <>
              <ChevronUp className="w-3.5 h-3.5 text-amber-400" />
              <span>Controls & 27+ Places</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5 text-amber-400" />
              <span>Hide Controls (H)</span>
            </>
          )}
        </button>
      </div>

      {/* Main Dock Container */}
      {!isCollapsed && (
        <div className="pointer-events-auto bg-slate-950/95 border border-slate-800/90 rounded-2xl p-2.5 md:p-3.5 shadow-2xl flex flex-col gap-2.5 max-h-[78vh] overflow-y-auto">
          {/* Row 1: 24-Hour Time Scrubber with Solar Cycle & Play/Pause */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 p-2 bg-slate-900/90 rounded-xl border border-slate-800/80">
            {/* Play/Pause & Hour Indicator */}
            <div className="flex items-center justify-between sm:justify-start gap-2.5">
              <button
                onClick={onTogglePlayTimeline}
                className={`flex items-center justify-center w-8 h-8 rounded-lg border transition-colors cursor-pointer shrink-0 touch-manipulation ${
                  isPlayingTimeline
                    ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                    : 'bg-slate-800 text-slate-200 hover:text-white border-slate-700 hover:bg-slate-700'
                }`}
                title={isPlayingTimeline ? 'Pause Timeline' : 'Play 24h Solar Simulation'}
              >
                {isPlayingTimeline ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 ml-0.5 fill-current" />}
              </button>

              <div className="flex items-center gap-2">
                <PhaseIcon className={`w-4 h-4 shrink-0 ${phase.color}`} />
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-mono font-bold text-white tabular-nums">
                      {formatHour(selectedHour)}
                    </span>
                    {isLiveHour ? (
                      <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/70 border border-emerald-800/60 rounded px-1.5 py-0.2">
                        LIVE
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-amber-400 bg-amber-950/70 border border-amber-800/60 rounded px-1.5 py-0.2">
                        SIMULATED
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400">{phase.label}</span>
                </div>
              </div>

              {!isLiveHour && (
                <button
                  onClick={onResetToCurrentHour}
                  className="flex items-center gap-1 px-2 py-1 text-[10px] font-semibold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-750 border border-slate-700 rounded-md transition-colors cursor-pointer"
                  title="Return to real-time Oman weather"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Now</span>
                </button>
              )}
            </div>

            {/* Slider Track (0 to 23 Hours) */}
            <div className="flex-1 flex items-center gap-2 px-1">
              <span className="text-[10px] font-mono text-slate-400">00:00</span>
              <div className="relative flex-1 flex items-center">
                <input
                  type="range"
                  min="0"
                  max="23"
                  step="0.25"
                  value={selectedHour}
                  onChange={(e) => onSelectHour(parseFloat(e.target.value))}
                  className="w-full h-2 bg-gradient-to-r from-sky-950 via-amber-700 via-sky-400 via-amber-600 to-slate-950 rounded-lg appearance-none cursor-pointer accent-amber-400 touch-pan-x"
                />
              </div>
              <span className="text-[10px] font-mono text-slate-400">23:00</span>
            </div>
          </div>

          {/* Row 2: Metric Layer Selectors + Search Bar + Unit Switcher */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            {/* Metric Segmented Control */}
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 overflow-x-auto w-full sm:w-auto">
              <button
                onClick={() => onSelectMetric('temperature')}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 min-h-[34px] text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap touch-manipulation ${
                  activeMetric === 'temperature'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Thermometer className="w-3.5 h-3.5 text-amber-300" />
                <span>Thermal</span>
              </button>

              <button
                onClick={() => onSelectMetric('humidity')}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 min-h-[34px] text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap touch-manipulation ${
                  activeMetric === 'humidity'
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Droplets className="w-3.5 h-3.5 text-cyan-300" />
                <span>Moisture</span>
              </button>

              <button
                onClick={() => onSelectMetric('wind')}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 min-h-[34px] text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap touch-manipulation ${
                  activeMetric === 'wind'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Wind className="w-3.5 h-3.5 text-emerald-300" />
                <span>Wind</span>
              </button>

              <button
                onClick={() => onSelectMetric('overview')}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 min-h-[34px] text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap touch-manipulation ${
                  activeMetric === 'overview'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Mountain className="w-3.5 h-3.5 text-indigo-300" />
                <span>Topography</span>
              </button>
            </div>

            {/* Quick Search & Units */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-56">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search 27+ places in Oman..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-7 py-1 text-xs bg-slate-900 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/80"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              <button
                onClick={onToggleTempUnit}
                className="px-2.5 py-1 min-h-[32px] text-xs font-bold font-mono text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-700/80 rounded-lg transition-colors cursor-pointer tabular-nums touch-manipulation"
                title="Toggle between Celsius and Fahrenheit"
              >
                {tempUnit === 'celsius' ? '°C' : '°F'}
              </button>
            </div>
          </div>

          {/* Row 3: Category Filter Tabs */}
          <div className="flex items-center gap-1.5 text-xs overflow-x-auto pb-0.5">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1 shrink-0">
              Filter:
            </span>
            <button
              onClick={() => setActiveCategory('all')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors shrink-0 ${
                activeCategory === 'all'
                  ? 'bg-slate-800 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              All ({OMAN_LOCATIONS.length})
            </button>
            <button
              onClick={() => setActiveCategory('governorate')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors shrink-0 ${
                activeCategory === 'governorate'
                  ? 'bg-amber-500/20 text-amber-300 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              Governorates (11)
            </button>
            <button
              onClick={() => setActiveCategory('mountain')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors shrink-0 ${
                activeCategory === 'mountain'
                  ? 'bg-emerald-500/20 text-emerald-300 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              Mountains (3)
            </button>
            <button
              onClick={() => setActiveCategory('city')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors shrink-0 ${
                activeCategory === 'city'
                  ? 'bg-cyan-500/20 text-cyan-300 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              Cities & Wilayats (9)
            </button>
            <button
              onClick={() => setActiveCategory('coastal')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors shrink-0 ${
                activeCategory === 'coastal'
                  ? 'bg-sky-500/20 text-sky-300 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              Coastal & Desert (4)
            </button>
          </div>

          {/* Row 4: Filtered Locations Strip with Instant Fly-To */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
            {filteredLocations.length === 0 ? (
              <span className="text-xs text-slate-500 py-1 px-2">No matching locations found.</span>
            ) : (
              filteredLocations.map((loc) => {
                const tel = weatherData[loc.id];
                const isSelected = selectedGovId === loc.id;
                const hIndex = Math.min(23, Math.max(0, Math.floor(selectedHour)));

                let badgeVal = '';
                if (tel) {
                  if (activeMetric === 'humidity') {
                    const val = tel.hourly?.relativeHumidity?.[hIndex] ?? tel.relativeHumidity;
                    badgeVal = `${val}%`;
                  } else if (activeMetric === 'wind') {
                    badgeVal = `${tel.windSpeedKmh}k`;
                  } else {
                    const val = tel.hourly?.temperatureC?.[hIndex] ?? tel.temperatureC;
                    badgeVal = tempUnit === 'celsius' ? `${Math.round(val)}°` : `${cToF(val)}°`;
                  }
                }

                return (
                  <button
                    key={loc.id}
                    onClick={() => onSelectGovernorate(loc.id)}
                    className={`group flex items-center gap-1.5 px-3 py-1.5 min-h-[34px] text-xs rounded-lg transition-all cursor-pointer whitespace-nowrap border touch-manipulation ${
                      isSelected
                        ? 'bg-amber-500/25 border-amber-500 text-white font-semibold'
                        : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {loc.category === 'mountain' && <Mountain className="w-3 h-3 text-emerald-400 shrink-0" />}
                    <span className="text-slate-200">{loc.nameEn}</span>
                    {badgeVal && (
                      <span
                        className={`text-[11px] font-mono tabular-nums ${
                          isSelected ? 'text-amber-300 font-bold' : 'text-slate-400 group-hover:text-slate-300'
                        }`}
                      >
                        {badgeVal}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
