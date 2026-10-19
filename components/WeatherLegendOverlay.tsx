'use client';

import React, { useState } from 'react';
import { Thermometer, Droplets, Wind, Mountain, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { WeatherMetric, TempUnit } from './WeatherDock';
import { cToF } from '@/lib/weather';

interface WeatherLegendOverlayProps {
  activeMetric: WeatherMetric;
  tempUnit: TempUnit;
}

export function WeatherLegendOverlay({ activeMetric, tempUnit }: WeatherLegendOverlayProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const formatTemp = (c: number) => {
    return tempUnit === 'celsius' ? `${c}°C` : `${cToF(c)}°F`;
  };

  return (
    <aside aria-label="Weather scale legend" className="fixed top-20 left-4 md:left-6 z-25 pointer-events-auto select-none max-w-[280px] md:max-w-xs transition-all duration-200">
      <div className="bg-slate-950/90 border border-slate-800/90 rounded-2xl p-3 md:p-3.5 shadow-2xl backdrop-blur-none text-slate-200">
        {/* Header with expand/collapse */}
        <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            {activeMetric === 'temperature' && <Thermometer className="w-4 h-4 text-amber-400" />}
            {activeMetric === 'humidity' && <Droplets className="w-4 h-4 text-cyan-400" />}
            {activeMetric === 'wind' && <Wind className="w-4 h-4 text-emerald-400" />}
            {activeMetric === 'overview' && <Mountain className="w-4 h-4 text-indigo-400" />}
            <span className="text-xs font-bold uppercase tracking-wider text-white">
              {activeMetric === 'temperature' && 'Thermal Scale'}
              {activeMetric === 'humidity' && 'Humidity Scale'}
              {activeMetric === 'wind' && 'Wind Speed'}
              {activeMetric === 'overview' && 'Topography'}
            </span>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
            title={isExpanded ? 'Collapse Legend' : 'Expand Legend'}
          >
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Content Body */}
        {isExpanded && (
          <div className="pt-2.5 flex flex-col gap-2.5 animate-in fade-in duration-150">
            {/* TEMPERATURE SCALE */}
            {activeMetric === 'temperature' && (
              <div className="flex flex-col gap-2">
                <span className="text-[11px] text-slate-400 leading-snug">
                  Terrain surface heat mapped dynamically from Alpine peaks to desert dunes:
                </span>

                {/* Continuous Multi-stop Gradient Bar */}
                <div className="relative">
                  <div className="h-3 w-full rounded-full bg-gradient-to-r from-[#0284C7] via-[#10B981] via-[#F59E0B] via-[#EA580C] to-[#DC2626] shadow-inner" />
                  <div className="flex justify-between items-center text-[10px] font-mono tabular-nums text-slate-300 mt-1 font-semibold">
                    <span>{formatTemp(14)}</span>
                    <span>{formatTemp(22)}</span>
                    <span>{formatTemp(30)}</span>
                    <span>{formatTemp(38)}</span>
                    <span>{formatTemp(44)}+</span>
                  </div>
                </div>

                {/* Micro Category Explanations */}
                <div className="grid grid-cols-2 gap-1.5 pt-1 text-[10px]">
                  <div className="flex items-center gap-1.5 bg-slate-900/70 p-1.5 rounded-lg border border-slate-800/70">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#0284C7] shrink-0" />
                    <div>
                      <span className="font-semibold text-white block">Alpine Cool</span>
                      <span className="text-slate-400 text-[9px]">Jebel Shams</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 bg-slate-900/70 p-1.5 rounded-lg border border-slate-800/70">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#10B981] shrink-0" />
                    <div>
                      <span className="font-semibold text-white block">Mild Highland</span>
                      <span className="text-slate-400 text-[9px]">Jebel Akhdar</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 bg-slate-900/70 p-1.5 rounded-lg border border-slate-800/70">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#F59E0B] shrink-0" />
                    <div>
                      <span className="font-semibold text-white block">Warm Coastal</span>
                      <span className="text-slate-400 text-[9px]">Muscat & Salalah</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 bg-slate-900/70 p-1.5 rounded-lg border border-slate-800/70">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#DC2626] shrink-0" />
                    <div>
                      <span className="font-semibold text-white block">Desert Heat</span>
                      <span className="text-slate-400 text-[9px]">Ibri & Interior</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* HUMIDITY SCALE */}
            {activeMetric === 'humidity' && (
              <div className="flex flex-col gap-2">
                <span className="text-[11px] text-slate-400 leading-snug">
                  Relative moisture level across arid interior vs coastal & monsoon belts:
                </span>

                <div className="relative">
                  <div className="h-3 w-full rounded-full bg-gradient-to-r from-[#B45309] via-[#14B8A6] via-[#0284C7] to-[#4338CA] shadow-inner" />
                  <div className="flex justify-between items-center text-[10px] font-mono tabular-nums text-slate-300 mt-1 font-semibold">
                    <span>10% Dry</span>
                    <span>35%</span>
                    <span>65%</span>
                    <span>95% Mist</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-1.5 pt-1 text-[10px]">
                  <div className="flex items-center gap-1.5 bg-slate-900/70 p-1.5 rounded-lg border border-slate-800/70">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#B45309] shrink-0" />
                    <div>
                      <span className="font-semibold text-white block">Arid (&lt;25%)</span>
                      <span className="text-slate-400 text-[9px]">Rub&apos; al Khali</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 bg-slate-900/70 p-1.5 rounded-lg border border-slate-800/70">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#14B8A6] shrink-0" />
                    <div>
                      <span className="font-semibold text-white block">Moderate (40%)</span>
                      <span className="text-slate-400 text-[9px]">Nizwa & Rustaq</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 bg-slate-900/70 p-1.5 rounded-lg border border-slate-800/70">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#0284C7] shrink-0" />
                    <div>
                      <span className="font-semibold text-white block">Marine (65%)</span>
                      <span className="text-slate-400 text-[9px]">Muscat Coast</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 bg-slate-900/70 p-1.5 rounded-lg border border-slate-800/70">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#4338CA] shrink-0" />
                    <div>
                      <span className="font-semibold text-white block">Khareef (&gt;80%)</span>
                      <span className="text-slate-400 text-[9px]">Dhofar Monsoon</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* WIND SPEED SCALE */}
            {activeMetric === 'wind' && (
              <div className="flex flex-col gap-2">
                <span className="text-[11px] text-slate-400 leading-snug">
                  Atmospheric surface wind velocity with animated particle flow lines:
                </span>

                <div className="relative">
                  <div className="h-3 w-full rounded-full bg-gradient-to-r from-[#10B981] via-[#14B8A6] to-[#0284C7] shadow-inner" />
                  <div className="flex justify-between items-center text-[10px] font-mono tabular-nums text-slate-300 mt-1 font-semibold">
                    <span>5 km/h (Calm)</span>
                    <span>20 km/h (Breeze)</span>
                    <span>40+ km/h (Gale)</span>
                  </div>
                </div>

                <div className="p-2 bg-slate-900/70 rounded-lg border border-slate-800/70 text-[10px] text-slate-300">
                  <span className="font-semibold text-sky-400 block mb-0.5">Maritime Trade Winds:</span>
                  Strongest along Masirah Island and Ras Al Hadd coastal waters.
                </div>
              </div>
            )}

            {/* TOPOGRAPHY SCALE */}
            {activeMetric === 'overview' && (
              <div className="flex flex-col gap-1.5 text-[10px]">
                <span className="text-[11px] text-slate-400 leading-snug">
                  Geological physical relief of the Sultanate:
                </span>
                <div className="flex items-center gap-2 p-1.5 bg-slate-900/70 rounded-lg">
                  <div className="w-3 h-3 rounded bg-[#5E4B3E] shrink-0" />
                  <span>Hajar Mountains (Jebel Shams 3,009m)</span>
                </div>
                <div className="flex items-center gap-2 p-1.5 bg-slate-900/70 rounded-lg">
                  <div className="w-3 h-3 rounded bg-[#C88D4E] shrink-0" />
                  <span>Wahiba Sands & Central Desert Dunes</span>
                </div>
                <div className="flex items-center gap-2 p-1.5 bg-slate-900/70 rounded-lg">
                  <div className="w-3 h-3 rounded bg-[#486B4D] shrink-0" />
                  <span>Dhofar Monsoon Foothills & Green Terraces</span>
                </div>
                <div className="flex items-center gap-2 p-1.5 bg-slate-900/70 rounded-lg">
                  <div className="w-3 h-3 rounded bg-[#0A1B2D] border border-cyan-800 shrink-0" />
                  <span>Arabian Sea & Gulf of Oman Bathymetry</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
