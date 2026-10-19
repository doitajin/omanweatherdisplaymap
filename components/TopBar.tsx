'use client';

import React, { useState, useEffect } from 'react';
import { Compass, RotateCcw, CloudSun, Volume2, VolumeX } from 'lucide-react';

interface TopBarProps {
  onResetCamera: () => void;
  lastUpdated?: string;
  isAudioActive: boolean;
  onToggleAudio: () => void;
}

export function TopBar({
  onResetCamera,
  lastUpdated,
  isAudioActive,
  onToggleAudio,
}: TopBarProps) {
  const [muscatTime, setMuscatTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const options: Intl.DateTimeFormatOptions = {
        timeZone: 'Asia/Muscat',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      };
      setMuscatTime(new Intl.DateTimeFormat('en-US', options).format(new Date()));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between gap-4 md:gap-8 px-4 md:px-6 py-3 md:py-4 border-b border-slate-800/80 bg-slate-950/90 pointer-events-auto">
      {/* Zone 1: Single text wordmark in display face */}
      <div className="flex items-center gap-2.5 md:gap-3 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-600 to-emerald-600 flex items-center justify-center text-white shadow-sm shrink-0">
          <Compass className="w-4 h-4" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm md:text-base font-bold tracking-tight text-white whitespace-nowrap">
            Oman 3D Weather
          </span>
          <span className="hidden sm:inline text-[11px] text-slate-400 font-medium whitespace-nowrap">
            Topographic Meteorological Atlas
          </span>
        </div>
      </div>

      {/* Zone 2: status readout (not navigation, so not a <nav>) */}
      <div className="hidden md:flex items-center gap-3.5 text-xs font-medium text-slate-400 whitespace-nowrap">
        <span className="text-slate-300">
          Muscat (UTC+4): <strong className="text-amber-400 font-mono font-semibold tabular-nums ml-1">{muscatTime || '12:00:00 PM'}</strong>
        </span>
        <span aria-hidden="true" className="text-slate-700">·</span>
        <span>27+ Cities & Landmarks</span>
        <span aria-hidden="true" className="text-slate-700">·</span>
        <span className="flex items-center gap-1.5 text-emerald-400">
          <CloudSun className="w-3.5 h-3.5" />
          <span>Live Feed</span>
        </span>
        {lastUpdated && (
          <>
            <span aria-hidden="true" className="text-slate-700">·</span>
            <span className="text-slate-400 font-mono tabular-nums">Sync: {lastUpdated}</span>
          </>
        )}
      </div>

      {/* Zone 3: Primary action + Audio sound toggle */}
      <div className="flex items-center gap-2 md:gap-3 shrink-0">
        {/* Procedural Audio Breeze Toggle Button */}
        <button
          onClick={onToggleAudio}
          className={`flex items-center gap-1.5 px-2.5 md:px-3 py-1.5 min-h-[36px] text-xs font-semibold rounded-lg border transition-colors cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
            isAudioActive
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/60'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border-slate-800'
          }`}
          title={isAudioActive ? 'Mute Atmospheric Audio' : 'Play Procedural Breeze & Ocean Audio'}
          aria-label={isAudioActive ? 'Mute atmospheric audio' : 'Play atmospheric audio'}
          aria-pressed={isAudioActive}
        >
          {isAudioActive ? (
            <>
              <Volume2 className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Audio On</span>
            </>
          ) : (
            <>
              <VolumeX className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">Audio Off</span>
            </>
          )}
        </button>

        {/* Overview Camera Reset */}
        <button
          onClick={onResetCamera}
          className="flex items-center gap-1.5 md:gap-2 px-3 md:px-3.5 py-1.5 min-h-[36px] text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 hover:text-white border border-slate-700/80 rounded-lg transition-colors whitespace-nowrap shadow-sm cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
          title="Reset Camera to Orbit Overview"
          aria-label="Reset camera to overview"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Overview</span>
        </button>
      </div>
    </header>
  );
}
