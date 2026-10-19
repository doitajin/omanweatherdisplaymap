'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Oman3DMap } from '@/components/Oman3DMap';
import { TopBar } from '@/components/TopBar';
import { WeatherDock, WeatherMetric, TempUnit } from '@/components/WeatherDock';
import { RegionDetailModal } from '@/components/RegionDetailModal';
import { WeatherLegendOverlay } from '@/components/WeatherLegendOverlay';
import { getBaselineFallbackTelemetry, WeatherTelemetry } from '@/lib/weather';
import { ambientSound } from '@/lib/ambientAudio';
import { MousePointer } from 'lucide-react';

export default function HomePage() {
  const [weatherData, setWeatherData] = useState<Record<string, WeatherTelemetry>>(() =>
    getBaselineFallbackTelemetry()
  );
  const [activeMetric, setActiveMetric] = useState<WeatherMetric>('temperature');
  const [tempUnit, setTempUnit] = useState<TempUnit>('celsius');
  const [selectedGovId, setSelectedGovId] = useState<string | null>(null);
  const [isDockCollapsed, setIsDockCollapsed] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [showHelper, setShowHelper] = useState<boolean>(true);
  const [isAudioActive, setIsAudioActive] = useState<boolean>(false);

  // 24-Hour Solar Timeline Scrubber State
  const getCurrentOmanHour = () => {
    // Current hour in UTC+4 (Asia/Muscat)
    const now = new Date();
    const utcHour = now.getUTCHours();
    return (utcHour + 4) % 24;
  };

  const [currentLocalHour, setCurrentLocalHour] = useState<number>(() => getCurrentOmanHour());
  const [selectedHour, setSelectedHour] = useState<number>(() => getCurrentOmanHour());
  const [isPlayingTimeline, setIsPlayingTimeline] = useState<boolean>(false);

  const resetCameraRef = useRef<() => void>(() => {});

  // Fetch live Open-Meteo data via Next.js internal API route
  useEffect(() => {
    let active = true;
    const loadWeather = async () => {
      try {
        const res = await fetch('/api/weather');
        if (res.ok && active) {
          const json = await res.json();
          if (json.data) {
            setWeatherData(json.data);
            const time = new Date(json.timestamp || Date.now());
            setLastUpdated(time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
          }
        }
      } catch (err) {
        console.error('Failed to sync live weather data:', err);
      }
    };

    loadWeather();
    const interval = setInterval(loadWeather, 5 * 60 * 1000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  // Update current local hour periodically
  useEffect(() => {
    const updateHour = () => {
      setCurrentLocalHour(getCurrentOmanHour());
    };
    const interval = setInterval(updateHour, 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Timeline auto-play engine
  useEffect(() => {
    if (!isPlayingTimeline) return;

    const interval = setInterval(() => {
      setSelectedHour((prev) => {
        const next = prev + 0.25;
        return next >= 24 ? 0 : next;
      });
    }, 200);

    return () => clearInterval(interval);
  }, [isPlayingTimeline]);

  // Audio toggle handler
  const handleToggleAudio = async () => {
    const active = await ambientSound.toggle();
    setIsAudioActive(active);
  };

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === 'Escape') {
        setSelectedGovId(null);
      } else if (e.key === '1') {
        setActiveMetric('temperature');
      } else if (e.key === '2') {
        setActiveMetric('humidity');
      } else if (e.key === '3') {
        setActiveMetric('wind');
      } else if (e.key === '4') {
        setActiveMetric('overview');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#090D15] touch-none">
      {/* 3D Three.js Full-Bleed Viewport */}
      <div className="absolute inset-0 w-full h-full">
        <Oman3DMap
          weatherData={weatherData}
          activeMetric={activeMetric}
          tempUnit={tempUnit}
          selectedGovId={selectedGovId}
          selectedHour={selectedHour}
          onSelectRegion={(id) => setSelectedGovId(id)}
          onResetViewRef={(fn) => {
            resetCameraRef.current = fn;
          }}
        />
      </div>

      {/* Top Bar Navigation (3-Zone Contract + Audio Toggle) */}
      <TopBar
        onResetCamera={() => {
          setSelectedGovId(null);
          resetCameraRef.current();
        }}
        lastUpdated={lastUpdated}
        isAudioActive={isAudioActive}
        onToggleAudio={handleToggleAudio}
      />

      {/* Visual Weather Scale Legend Component */}
      <WeatherLegendOverlay
        activeMetric={activeMetric}
        tempUnit={tempUnit}
      />

      {/* Discreet 3D Navigation Helper (Desktop Only, Bottom Left) */}
      {showHelper && !isDockCollapsed && (
        <div className="fixed bottom-6 left-6 z-20 hidden lg:flex items-center gap-3 px-3.5 py-2 bg-slate-950/85 border border-slate-800/80 rounded-xl text-xs text-slate-300 pointer-events-auto shadow-lg select-none">
          <MousePointer className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <div className="flex items-center gap-2">
            <span>Left-click: Orbit</span>
            <span aria-hidden="true" className="text-slate-700">·</span>
            <span>Right-click: Pan</span>
            <span aria-hidden="true" className="text-slate-700">·</span>
            <span>Scroll: Zoom</span>
          </div>
          <button
            onClick={() => setShowHelper(false)}
            className="text-[10px] text-slate-400 hover:text-slate-200 ml-1 cursor-pointer"
            title="Dismiss navigation tips"
          >
            ✕
          </button>
        </div>
      )}

      {/* Selected Governorate Inspector Card / Mobile Drawer */}
      <RegionDetailModal
        governorateId={selectedGovId}
        onClose={() => setSelectedGovId(null)}
        onFocusRegion={(id) => {
          setSelectedGovId(id);
        }}
        weatherData={weatherData}
        tempUnit={tempUnit}
        selectedHour={selectedHour}
      />

      {/* Collapsible Bottom Control Dock with 24h Solar Scrubber */}
      <WeatherDock
        activeMetric={activeMetric}
        onSelectMetric={(metric) => setActiveMetric(metric)}
        tempUnit={tempUnit}
        onToggleTempUnit={() => setTempUnit((u) => (u === 'celsius' ? 'fahrenheit' : 'celsius'))}
        selectedGovId={selectedGovId}
        onSelectGovernorate={(id) => setSelectedGovId(id)}
        weatherData={weatherData}
        isCollapsed={isDockCollapsed}
        onToggleCollapse={() => setIsDockCollapsed((c) => !c)}
        selectedHour={selectedHour}
        onSelectHour={(h) => {
          setIsPlayingTimeline(false);
          setSelectedHour(h);
        }}
        isPlayingTimeline={isPlayingTimeline}
        onTogglePlayTimeline={() => setIsPlayingTimeline((p) => !p)}
        onResetToCurrentHour={() => {
          setIsPlayingTimeline(false);
          setSelectedHour(currentLocalHour);
        }}
        currentLocalHour={currentLocalHour}
      />
    </main>
  );
}
