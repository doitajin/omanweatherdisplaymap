# Interactive & Responsive 3D Oman Weather Map

An enhanced version of the 3D topographic weather experience for the Sultanate of Oman, introducing multi-device touch responsiveness, an interactive 24-hour temporal scrubber with simulated day/night solar lighting cycles, procedural Web Audio atmospheric soundscapes, and a thumb-friendly mobile bottom sheet.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following enhancements were confirmed in Phase 1 to expand interactivity and cross-device ergonomics:

- **Confirmed Interactive Feature**: **24-Hour Time Scrubber & Solar Cycle Simulation**. Users can scrub or play through the 24-hour forecast timeline. As time advances:
  - Directional sun position orbits realistically across the sky, shifting shadow angles and lighting intensity.
  - Skybox background, fog, and water reflections transition dynamically from dawn/morning golden tones into midday radiance, twilight amber-violet, and deep starry night obsidian.
  - Terrain thermal/moisture colors and pillar heights continuously interpolate across the 24-hour hourly dataset from Open-Meteo.
- **Confirmed Responsive Experience**: **Compact Swipeable Mobile Drawer & Responsive Touch Gestures**.
  - On mobile/tablet screens (< 768px): The HUD converts into a compact swipeable bottom sheet with a native drag handle, keeping the 3D viewport wide open.
  - Regional inspection modal converts from a desktop floating card to an ergonomic bottom sheet with thumb-accessible dismiss actions.
  - Touch targets conform to WCAG mobile ergonomics (minimum 44px hit areas, prevention of accidental viewport scrolling while pinching/rotating the 3D canvas).
- **Confirmed Atmospheric Audio**: **Procedural Web Audio Ambient Breeze & Ocean Waves**.
  - 100% procedural sound synthesis using the Web Audio API (bandpass-filtered noise oscillators generating natural coastal wind gusts and gentle sea swells without any external audio files).
  - Prominent, accessible mute/unmute toggle in the top bar and dock, defaulting to muted for respectful user experience.

---

## 1. Overview & Core Concept

### What It Does
The enhanced application allows users on any device (phone, tablet, laptop, ultra-wide desktop) to not only explore current weather conditions across Oman's 11 governorates, but also interactively scrub through time to preview diurnal temperature fluctuations and night-time cooling in the Hajar mountains and desert plateaus. The interface naturally reshapes itself based on touch or pointer inputs.

---

## 2. User Experience & Visual Design

### Multi-Device Layout Strategy
- **Desktop (>= 1024px)**:
  - Full-bleed 3D viewport with OrbitControls (left drag orbit, right drag pan, scroll wheel zoom).
  - Pinned TopBar adhering to the 3-Zone contract with Muscat time, live status, audio toggle, and view reset.
  - Collapsible bottom dock housing metric tabs, time scrubber with Play/Pause button, and 11 governorate fly-to buttons.
  - Right-aligned floating inspector card when a region is selected.
- **Tablet (768px - 1023px)**:
  - 2-row consolidated bottom dock with horizontal scroll for governorates.
  - Semi-floating inspector modal positioned safely away from center canvas focus.
- **Mobile (< 768px)**:
  - Native gesture-ready bottom drawer with snap heights (peek mode at 48px, expanded mode at ~220px).
  - Single-finger canvas rotate, two-finger pinch zoom and pan.
  - Regional inspection drawer sliding up smoothly from the bottom with full thumb reachability.
  - TopBar compactly collapsing secondary indicators while preserving the brand mark, local time, and audio mute toggle.

### 24-Hour Solar Lighting & Diurnal Progression
- **Dawn (05:00 - 07:00)**: Low warm sun from the east (Gulf of Oman), long dramatic shadows, soft rose/amber fog.
- **Midday (11:00 - 15:00)**: Overhead intense sunlight, high contrast, warm desert radiance, peak temperatures.
- **Sunset (17:30 - 19:30)**: Low west sun casting golden-red grazing light across Jebel Shams and the Dhofar mountains.
- **Night (20:00 - 04:00)**: Deep navy sky, moonlight directional key light with silver specular highlights, cooler thermal map shades, and illuminated glowing pillar beacons.

---

## 3. Key Product Decisions & Trade-Offs

### 1. Procedural Web Audio vs Audio Files
- **Approach**: Pure Web Audio API synthesis creating white/pink noise modulated through resonant biquad filters and low-frequency oscillators (LFO) for wind gusts.
- **Rationale**: 0kB download footprint, zero risk of 404s or broken media links, infinitely seamless looping with zero repetitive loop seams.

### 2. Time Scrubbing Data Interpolation
- **Approach**: 24-hour hourly arrays from Open-Meteo indexed by hour offset (`0..23`), with linear interpolation between adjacent hours for ultra-smooth scrubbing.
- **Rationale**: Users see continuous transitions rather than abrupt step jumps as they drag the slider.

### 3. Responsive Touch Controls
- **Approach**: `touch-action: none` on the Three.js canvas container to allow smooth multi-touch OrbitControls without browser gesture conflicts, while UI overlays retain full native touch handling.

---

## 4. Technical Architecture & Component Hierarchy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Next.js Root Page Layout                        │
│                                                                        │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │                      Full-Bleed 3D Viewport                    │   │
│   │  ┌──────────────────────────────────────────────────────────┐  │   │
│   │  │             Three.js WebGL Scene (Oman3DMap)             │  │   │
│   │  │  • Solar Key Light (Dynamic Orbit: Sun Position & Color) │  │   │
│   │  │  • Diurnal Sky & Fog Transition (Dawn -> Noon -> Night)  │  │   │
│   │  │  • Real-time Interpolated Thermal & Moisture Shader      │  │   │
│   │  │  • Touch-Optimized Damped OrbitControls (Pinch & Orbit)  │  │   │
│   │  │  • 11 × 3-Part Weather Pillars (Night Beacon Glow)       │  │   │
│   │  └──────────────────────────────────────────────────────────┘  │   │
│   │                                                                │   │
│   │   [TopBar] Responsive 3-Zone Header + Audio Mute Toggle        │   │
│   │                                                                │   │
│   │   [RegionDetailModal] Desktop Floating Card / Mobile Drawer    │   │
│   │                                                                │   │
│   │   [WeatherDock] Responsive Dock + 24h Time Scrubber Slider     │   │
│   │   ┌────────────────────────────────────────────────────────┐   │   │
│   │   │ Play/Pause · Hour Slider (0-24h) · Metrics · Regions   │   │   │
│   │   └────────────────────────────────────────────────────────┘   │   │
│   └────────────────────────────────────────────────────────────────┘   │
│                                   │                                    │
│   ┌───────────────────────────────┴────────────────────────────────┐   │
│   │            Web Audio Ambient Synthesizer (Breeze/Ocean)        │   │
│   │  • Low-Frequency Wind Gust Generator (BiquadFilterNode)        │   │
│   │  • Ocean Surf Noise Generator with Soft Envelope Shaping       │   │
│   │  • Master Gain Node with User Mute/Unmute State                │   │
│   └────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Implementation Sequence (Post-Approval)

1. **Procedural Web Audio Engine**: Create `lib/ambientAudio.ts` with procedural breeze/ocean synthesizer and volume/mute controls.
2. **Interactive 24-Hour Timeline & Solar Engine**:
   - Update `components/Oman3DMap.tsx` with dynamic sun vector calculations, daylight sky/fog color transitions, and hourly data interpolation.
   - Add touch-friendly handling (`touch-action: none` and multi-touch gesture dampening).
3. **Responsive Bottom Dock & Time Scrubber**:
   - Update `components/WeatherDock.tsx` to include an interactive timeline scrubber (Play/Pause, hour slider, day/night indicator) and mobile-responsive drawer adaptations.
4. **Mobile-Adaptive Regional Modal**:
   - Update `components/RegionDetailModal.tsx` with bottom sheet presentation on mobile screens (`< 768px`) and touch-friendly drag/close buttons.
5. **TopBar Audio Integration**:
   - Add ambient audio mute/unmute button with volume icon to `components/TopBar.tsx`.
6. **Verification & Audit**: Run ESLint and compilation tests, verifying 60fps performance and responsive layout across mobile and desktop viewport emulations.
