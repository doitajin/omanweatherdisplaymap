'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { OMAN_LOCATIONS, geoTo3D, WeatherLocation } from '@/lib/governorates';
import { calculateOmanElevation, isPointInOman } from '@/lib/omanMapData';
import { WeatherTelemetry, getTemperatureRGB, getHumidityRGB, cToF } from '@/lib/weather';
import { WeatherMetric, TempUnit } from './WeatherDock';

// Pre-allocated scratch objects outside render loop for zero GC churn
const _tempVec3 = new THREE.Vector3();
const _raycaster = new THREE.Raycaster();
const _mouse = new THREE.Vector2();

interface Oman3DMapProps {
  weatherData: Record<string, WeatherTelemetry>;
  activeMetric: WeatherMetric;
  tempUnit: TempUnit;
  selectedGovId: string | null;
  selectedHour?: number;
  onSelectRegion: (id: string) => void;
  onResetViewRef?: (fn: () => void) => void;
}

interface ScreenLabel {
  id: string;
  name: string;
  value: string;
  category: string;
  screenX: number;
  screenY: number;
  visible: boolean;
  isImportant: boolean;
}

export function Oman3DMap({
  weatherData,
  activeMetric,
  tempUnit,
  selectedGovId,
  selectedHour = 12,
  onSelectRegion,
  onResetViewRef,
}: Oman3DMapProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [screenLabels, setScreenLabels] = useState<ScreenLabel[]>([]);
  const [hoveredGovId, setHoveredGovId] = useState<string | null>(null);

  const onSelectRegionRef = useRef(onSelectRegion);
  useEffect(() => {
    onSelectRegionRef.current = onSelectRegion;
  }, [onSelectRegion]);

  // References to keep mutable state across render frames without re-instantiating WebGL
  const stateRef = useRef({
    activeMetric,
    tempUnit,
    selectedGovId,
    selectedHour,
    weatherData,
    isTransitioningCamera: false,
    targetCamPos: new THREE.Vector3(3.5, 19.5, 21.5),
    targetLookAt: new THREE.Vector3(0.0, 0.4, 0.0),
  });

  // Sync state refs on prop change
  useEffect(() => {
    stateRef.current.activeMetric = activeMetric;
    stateRef.current.tempUnit = tempUnit;
    stateRef.current.selectedGovId = selectedGovId;
    stateRef.current.selectedHour = selectedHour;
    stateRef.current.weatherData = weatherData;
  }, [activeMetric, tempUnit, selectedGovId, selectedHour, weatherData]);

  // Camera reset trigger
  const resetCamera = useCallback(() => {
    stateRef.current.targetCamPos.set(3.5, 19.5, 21.5);
    stateRef.current.targetLookAt.set(0.0, 0.4, 0.0);
    stateRef.current.isTransitioningCamera = true;
  }, []);

  // When selectedGovId changes, glide camera towards that region
  useEffect(() => {
    if (selectedGovId) {
      const loc = OMAN_LOCATIONS.find((g) => g.id === selectedGovId);
      if (loc) {
        const [x, z] = geoTo3D(loc.lat, loc.lon);
        const elev = calculateOmanElevation(loc.lon, loc.lat);
        stateRef.current.targetLookAt.set(x, elev + 0.5, z);
        stateRef.current.targetCamPos.set(x + 2.5, elev + 5.2, z + 6.2);
        stateRef.current.isTransitioningCamera = true;
      }
    }
  }, [selectedGovId]);

  useEffect(() => {
    if (onResetViewRef) {
      onResetViewRef(resetCamera);
    }
  }, [onResetViewRef, resetCamera]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // --- Scene, Camera & Renderer ---
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x090D15);
    scene.fog = new THREE.FogExp2(0x090D15, 0.018);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(3.5, 19.5, 21.5);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);

    // OrbitControls with multi-touch gestures support
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.maxPolarAngle = Math.PI / 2.05;
    controls.minDistance = 4.5;
    controls.maxDistance = 45;
    controls.target.set(0.0, 0.4, 0.0);
    controls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.DOLLY_PAN,
    };

    // Procedural Studio Environment for realistic metallic and roughness reflections
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // --- Dynamic Solar Lighting Rig ---
    const sunLight = new THREE.DirectionalLight(0xFFF3D6, 2.2);
    sunLight.position.set(16, 26, 16);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 1;
    sunLight.shadow.camera.far = 70;
    sunLight.shadow.camera.left = -16;
    sunLight.shadow.camera.right = 16;
    sunLight.shadow.camera.top = 16;
    sunLight.shadow.camera.bottom = -16;
    sunLight.shadow.bias = -0.0004;
    sunLight.shadow.normalBias = 0.02;
    scene.add(sunLight);

    const moonLight = new THREE.DirectionalLight(0x7DD3FC, 0.0);
    moonLight.position.set(-14, 20, -14);
    scene.add(moonLight);

    const hemiLight = new THREE.HemisphereLight(0x38BDF8, 0x090D15, 1.15);
    scene.add(hemiLight);

    const rimLight = new THREE.DirectionalLight(0x0284C7, 0.7);
    rimLight.position.set(-14, 12, -18);
    scene.add(rimLight);

    // --- Topographic Terrain Construction ---
    const terrainWidth = 26;
    const terrainHeight = 32;
    const segsX = 140;
    const segsY = 160;

    const terrainGeo = new THREE.PlaneGeometry(terrainWidth, terrainHeight, segsX, segsY);
    terrainGeo.rotateX(-Math.PI / 2);

    const posAttr = terrainGeo.attributes.position;
    const colorAttr = new THREE.BufferAttribute(new Float32Array(posAttr.count * 3), 3);
    terrainGeo.setAttribute('color', colorAttr);

    const vertexGeoData: { lon: number; lat: number; elev: number; inOman: boolean }[] = [];
    const CENTER_LAT = 21.8;
    const CENTER_LON = 56.4;

    for (let i = 0; i < posAttr.count; i++) {
      const vx = posAttr.getX(i);
      const vz = posAttr.getZ(i);

      const lon = vx / 2.35 + CENTER_LON;
      const lat = -vz / 2.55 + CENTER_LAT;

      const inOman = isPointInOman(lon, lat);
      const elev = calculateOmanElevation(lon, lat);

      posAttr.setY(i, elev);
      vertexGeoData.push({ lon, lat, elev, inOman });
    }

    posAttr.needsUpdate = true;
    terrainGeo.computeVertexNormals();

    const terrainMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.85,
      metalness: 0.08,
      flatShading: false,
    });

    const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
    terrainMesh.receiveShadow = true;
    terrainMesh.castShadow = true;
    scene.add(terrainMesh);

    // --- Reflective Ocean Bathymetry Plane ---
    const oceanGeo = new THREE.PlaneGeometry(36, 42);
    oceanGeo.rotateX(-Math.PI / 2);
    const oceanMat = new THREE.MeshPhysicalMaterial({
      color: 0x0A1B2D,
      roughness: 0.12,
      metalness: 0.55,
      transmission: 0.35,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
    });
    const oceanMesh = new THREE.Mesh(oceanGeo, oceanMat);
    oceanMesh.position.y = 0.02;
    oceanMesh.receiveShadow = true;
    scene.add(oceanMesh);

    // --- Coastline Contour Glow ---
    const coastlineMat = new THREE.LineBasicMaterial({
      color: 0x38BDF8,
      transparent: true,
      opacity: 0.55,
      linewidth: 2,
    });
    const coastlinePoints: THREE.Vector3[] = [];
    const polygon = [
      [56.35, 26.40], [56.20, 26.15], [56.10, 25.80], [55.90, 25.00], [55.70, 24.30],
      [55.60, 23.80], [55.30, 23.00], [54.80, 22.00], [53.50, 21.00], [52.00, 19.00],
      [52.00, 16.65], [53.10, 16.60], [54.00, 17.00], [54.70, 17.15], [55.20, 17.70],
      [55.80, 18.20], [56.30, 19.30], [57.70, 19.70], [57.85, 20.60], [58.20, 20.70],
      [59.40, 22.30], [59.85, 22.54], [59.50, 22.60], [59.00, 23.10], [58.60, 23.50],
      [58.30, 23.65], [57.80, 23.80], [57.40, 24.00], [56.75, 24.36], [56.55, 24.70],
      [56.40, 25.00], [56.35, 25.80], [56.45, 26.25], [56.35, 26.40]
    ];
    for (const pt of polygon) {
      const [px, pz] = geoTo3D(pt[1], pt[0]);
      const pelev = Math.max(0.04, calculateOmanElevation(pt[0], pt[1]) + 0.03);
      coastlinePoints.push(new THREE.Vector3(px, pelev, pz));
    }
    const coastlineGeo = new THREE.BufferGeometry().setFromPoints(coastlinePoints);
    const coastlineLine = new THREE.Line(coastlineGeo, coastlineMat);
    scene.add(coastlineLine);

    // --- Weather Pillars for all 27+ Locations ---
    const pillarGroups: {
      group: THREE.Group;
      loc: WeatherLocation;
      coreMesh: THREE.Mesh;
      ringMesh?: THREE.Mesh;
      crownMesh: THREE.Mesh;
      coreMat: THREE.MeshStandardMaterial;
      ringMat?: THREE.MeshStandardMaterial;
      elev: number;
      x: number;
      z: number;
    }[] = [];

    const baseCylGeoGov = new THREE.CylinderGeometry(0.32, 0.38, 0.12, 18);
    const baseCylGeoTown = new THREE.CylinderGeometry(0.20, 0.26, 0.09, 14);
    const ringGeo = new THREE.TorusGeometry(0.24, 0.036, 12, 24);
    const crownGeo = new THREE.OctahedronGeometry(0.12, 0);

    for (const loc of OMAN_LOCATIONS) {
      const [gx, gz] = geoTo3D(loc.lat, loc.lon);
      const gelev = calculateOmanElevation(loc.lon, loc.lat);
      const isGov = loc.isGovernorateCapital;
      const isMountain = loc.category === 'mountain';

      const pillarGroup = new THREE.Group();
      pillarGroup.position.set(gx, gelev, gz);
      pillarGroup.userData = { governorateId: loc.id };

      // 1. Pedestal Base
      const baseMat = new THREE.MeshStandardMaterial({
        color: isGov ? 0x1E293B : isMountain ? 0x064E3B : 0x0F172A,
        metalness: 0.88,
        roughness: 0.22,
      });
      const baseMesh = new THREE.Mesh(isGov ? baseCylGeoGov : baseCylGeoTown, baseMat);
      baseMesh.position.y = isGov ? 0.06 : 0.045;
      baseMesh.castShadow = true;
      baseMesh.receiveShadow = true;
      pillarGroup.add(baseMesh);

      // 2. Luminescent Core Column
      const initialHeight = isGov ? 1.4 : isMountain ? 1.6 : 1.0;
      const coreRadius = isGov ? 0.12 : isMountain ? 0.14 : 0.08;
      const coreGeo = new THREE.CylinderGeometry(coreRadius, coreRadius, initialHeight, 16);
      coreGeo.translate(0, initialHeight / 2, 0);

      const coreMat = new THREE.MeshStandardMaterial({
        color: 0xF59E0B,
        emissive: 0xF59E0B,
        emissiveIntensity: 0.8,
        metalness: 0.3,
        roughness: 0.2,
        transparent: true,
        opacity: 0.92,
      });
      const coreMesh = new THREE.Mesh(coreGeo, coreMat);
      coreMesh.position.y = isGov ? 0.12 : 0.09;
      coreMesh.castShadow = true;
      pillarGroup.add(coreMesh);

      // 3. Summit Beacon Ring (For Governorates and Mountains)
      let ringMesh: THREE.Mesh | undefined;
      let ringMat: THREE.MeshStandardMaterial | undefined;

      if (isGov || isMountain) {
        ringMat = new THREE.MeshStandardMaterial({
          color: isMountain ? 0x34D399 : 0xFBBF24,
          metalness: 0.95,
          roughness: 0.15,
          emissive: isMountain ? 0x059669 : 0xD97706,
          emissiveIntensity: 0.5,
        });
        ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.rotation.x = Math.PI / 2;
        ringMesh.position.y = (isGov ? 0.12 : 0.09) + initialHeight;
        pillarGroup.add(ringMesh);
      }

      // 4. Crown Diamond
      const crownMat = new THREE.MeshStandardMaterial({
        color: isMountain ? 0x6EE7B7 : 0xFFFFFF,
        emissive: isMountain ? 0x10B981 : 0xFBBF24,
        emissiveIntensity: 0.6,
        metalness: 0.9,
        roughness: 0.1,
      });
      const crownMesh = new THREE.Mesh(crownGeo, crownMat);
      crownMesh.position.y = (isGov ? 0.12 : 0.09) + initialHeight + (isGov || isMountain ? 0.22 : 0.12);
      if (!isGov && !isMountain) crownMesh.scale.set(0.7, 0.7, 0.7);
      pillarGroup.add(crownMesh);

      // 5. Ground Contact Shadow / Decal Ring
      const groundRingRadius = isGov ? 0.55 : 0.38;
      const groundRingGeo = new THREE.RingGeometry(groundRingRadius * 0.6, groundRingRadius, 20);
      groundRingGeo.rotateX(-Math.PI / 2);
      const groundRingMat = new THREE.MeshBasicMaterial({
        color: isMountain ? 0x10B981 : 0xF59E0B,
        transparent: true,
        opacity: 0.45,
        depthWrite: false,
      });
      const groundRingMesh = new THREE.Mesh(groundRingGeo, groundRingMat);
      groundRingMesh.position.y = 0.015;
      pillarGroup.add(groundRingMesh);

      scene.add(pillarGroup);

      pillarGroups.push({
        group: pillarGroup,
        loc,
        coreMesh,
        ringMesh,
        crownMesh,
        coreMat,
        ringMat,
        elev: gelev,
        x: gx,
        z: gz,
      });
    }

    // --- Animated Wind Vector Particles ---
    const windCount = 450;
    const windPositions = new Float32Array(windCount * 3);
    const windVelocities: { x: number; z: number }[] = [];

    for (let i = 0; i < windCount; i++) {
      const randLoc = OMAN_LOCATIONS[Math.floor(Math.random() * OMAN_LOCATIONS.length)];
      const [gx, gz] = geoTo3D(randLoc.lat, randLoc.lon);
      const px = gx + (Math.random() - 0.5) * 6;
      const pz = gz + (Math.random() - 0.5) * 6;
      const pelev = Math.max(0.2, calculateOmanElevation(randLoc.lon, randLoc.lat) + 0.5 + Math.random() * 0.8);

      windPositions[i * 3] = px;
      windPositions[i * 3 + 1] = pelev;
      windPositions[i * 3 + 2] = pz;

      windVelocities.push({
        x: 0.02 + Math.random() * 0.02,
        z: -0.01 + (Math.random() - 0.5) * 0.01,
      });
    }

    const windGeo = new THREE.BufferGeometry();
    windGeo.setAttribute('position', new THREE.BufferAttribute(windPositions, 3));
    const windMat = new THREE.PointsMaterial({
      color: 0x38BDF8,
      size: 0.12,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const windPoints = new THREE.Points(windGeo, windMat);
    scene.add(windPoints);

    // --- Wind Vector Streamlets Visualization ---
    const streamletCount = 100;
    const streamlets: {
      x: number;
      y: number;
      z: number;
      age: number;
      maxAge: number;
      speed: number;
      tailX: number;
      tailY: number;
      tailZ: number;
    }[] = [];
    const streamletPositions = new Float32Array(streamletCount * 6);
    const streamletColors = new Float32Array(streamletCount * 6);

    // --- Streamlet Respawning ---
    const respawnStreamlet = (p: (typeof streamlets)[number]) => {
      const randLoc = OMAN_LOCATIONS[Math.floor(Math.random() * OMAN_LOCATIONS.length)];
      const [gx, gz] = geoTo3D(randLoc.lat, randLoc.lon);
      p.x = gx + (Math.random() - 0.5) * 8;
      p.z = gz + (Math.random() - 0.5) * 8;
      p.age = 0;
      p.maxAge = 100 + Math.random() * 50;
      p.speed = 0;

      const lon = p.x / 2.35 + CENTER_LON;
      const lat = -p.z / 2.55 + CENTER_LAT;
      p.y = Math.max(0.12, calculateOmanElevation(lon, lat) + 0.22);
      p.tailX = p.x;
      p.tailY = p.y;
      p.tailZ = p.z;
    };

    for (let i = 0; i < streamletCount; i++) {
      const p = {
        x: 0,
        y: 0.5,
        z: 0,
        age: 0,
        maxAge: 100,
        speed: 0,
        tailX: 0,
        tailY: 0,
        tailZ: 0,
      };
      respawnStreamlet(p);
      streamlets.push(p);
    }

    const streamletGeo = new THREE.BufferGeometry();
    streamletGeo.setAttribute('position', new THREE.BufferAttribute(streamletPositions, 3));
    streamletGeo.setAttribute('color', new THREE.BufferAttribute(streamletColors, 3));
    const streamletMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const streamletLines = new THREE.LineSegments(streamletGeo, streamletMat);
    scene.add(streamletLines);

    // --- Solar Lighting & Diurnal Sky Engine ---
    const updateSolarLighting = (hour: number) => {
      const solarAngle = ((hour - 6) / 24) * Math.PI * 2;
      const sunY = Math.sin(solarAngle) * 26;
      const sunX = Math.cos(solarAngle) * 24;
      const sunZ = Math.sin(solarAngle * 0.5) * 12 + 10;

      if (sunY > 0) {
        sunLight.position.set(sunX, sunY, sunZ);
        const elevFactor = Math.min(1, sunY / 20);
        sunLight.intensity = 0.5 + elevFactor * 1.8;

        if (sunY < 8) {
          sunLight.color.setHex(0xFBA04B);
          hemiLight.color.setHex(0xFDE68A);
          hemiLight.groundColor.setHex(0x1F2937);
          scene.fog?.color.setHex(0x111624);
          scene.background = new THREE.Color(0x111624);
        } else {
          sunLight.color.setHex(0xFFF3D6);
          hemiLight.color.setHex(0x38BDF8);
          hemiLight.groundColor.setHex(0x090D15);
          scene.fog?.color.setHex(0x0A0F1D);
          scene.background = new THREE.Color(0x0A0F1D);
        }
        moonLight.intensity = 0.0;
      } else {
        sunLight.intensity = 0.0;
        moonLight.intensity = 0.65;
        hemiLight.color.setHex(0x1E3A8A);
        hemiLight.groundColor.setHex(0x030712);
        scene.fog?.color.setHex(0x05080F);
        scene.background = new THREE.Color(0x05080F);
      }
    };

    // --- Hourly Telemetry Interpolation Helper ---
    const getLocValueAtHour = (locId: string, metric: WeatherMetric, hour: number) => {
      const tel = stateRef.current.weatherData[locId];
      if (!tel) return 30;

      const hIndex = Math.min(23, Math.max(0, Math.floor(hour)));
      const nextIndex = (hIndex + 1) % 24;
      const fraction = hour - Math.floor(hour);

      if (metric === 'temperature') {
        const arr = tel.hourly?.temperatureC;
        if (arr && arr.length >= 24) {
          return arr[hIndex] * (1 - fraction) + arr[nextIndex] * fraction;
        }
        return tel.temperatureC;
      } else if (metric === 'humidity') {
        const arr = tel.hourly?.relativeHumidity;
        if (arr && arr.length >= 24) {
          return arr[hIndex] * (1 - fraction) + arr[nextIndex] * fraction;
        }
        return tel.relativeHumidity;
      } else if (metric === 'wind') {
        return tel.windSpeedKmh;
      }
      return 30;
    };

    // --- Vector Field Sampling for Wind Streamlets ---
    // Interpolates wind speed and direction from nearby telemetry stations.
    // World space: +x = east, -z = north (see geoTo3D projection above).
    const sampleVectorField = (
      x: number,
      z: number,
      hour: number,
      out: { vx: number; vz: number; speedKmh: number }
    ) => {
      const lon = x / 2.35 + CENTER_LON;
      const lat = -z / 2.55 + CENTER_LAT;

      let sumWeight = 0;
      let sumSpeed = 0;
      let sumDirX = 0;
      let sumDirZ = 0;

      for (const loc of OMAN_LOCATIONS) {
        const dist = Math.hypot(lon - loc.lon, (lat - loc.lat) * 1.1) + 0.15;
        const w = 1 / (dist * dist);
        sumWeight += w;

        sumSpeed += getLocValueAtHour(loc.id, 'wind', hour) * w;

        // Meteorological direction is where wind comes FROM; flow is the opposite.
        const tel = stateRef.current.weatherData[loc.id];
        const dirDeg = tel ? tel.windDirectionDeg : 90;
        const flowRad = ((dirDeg + 180) * Math.PI) / 180;
        sumDirX += Math.sin(flowRad) * w;
        sumDirZ += -Math.cos(flowRad) * w;
      }

      const speedKmh = sumSpeed / sumWeight;
      let dirX = sumDirX / sumWeight;
      let dirZ = sumDirZ / sumWeight;
      const dirLen = Math.hypot(dirX, dirZ);

      if (dirLen > 1e-6) {
        dirX /= dirLen;
        dirZ /= dirLen;
      } else {
        dirX = 1;
        dirZ = 0;
      }

      // Units per frame at 60fps, scaled by wind speed.
      const velScale = 0.012 + speedKmh * 0.0016;
      out.vx = dirX * velScale;
      out.vz = dirZ * velScale;
      out.speedKmh = speedKmh;
    };

    // --- Terrain Color Updating Function ---
    const updateTerrainColors = () => {
      const colors = colorAttr.array as Float32Array;
      const curMetric = stateRef.current.activeMetric;
      const curHour = stateRef.current.selectedHour;

      for (let i = 0; i < vertexGeoData.length; i++) {
        const v = vertexGeoData[i];
        const idx = i * 3;

        if (!v.inOman) {
          const depth = Math.min(1, Math.abs(v.elev) / 0.35);
          colors[idx] = 0.03 + 0.03 * (1 - depth);
          colors[idx + 1] = 0.09 + 0.08 * (1 - depth);
          colors[idx + 2] = 0.16 + 0.18 * (1 - depth);
          continue;
        }

        if (curMetric === 'temperature') {
          let sumWeight = 0;
          let weightedTemp = 0;

          for (const loc of OMAN_LOCATIONS) {
            const dist = Math.hypot(v.lon - loc.lon, (v.lat - loc.lat) * 1.1) + 0.15;
            const w = 1 / (dist * dist);
            sumWeight += w;
            const t = getLocValueAtHour(loc.id, 'temperature', curHour);
            weightedTemp += t * w;
          }

          const interpTemp = weightedTemp / sumWeight;
          const [r, g, b] = getTemperatureRGB(interpTemp);
          colors[idx] = r;
          colors[idx + 1] = g;
          colors[idx + 2] = b;
        } else if (curMetric === 'humidity') {
          let sumWeight = 0;
          let weightedHum = 0;

          for (const loc of OMAN_LOCATIONS) {
            const dist = Math.hypot(v.lon - loc.lon, (v.lat - loc.lat) * 1.1) + 0.15;
            const w = 1 / (dist * dist);
            sumWeight += w;
            const h = getLocValueAtHour(loc.id, 'humidity', curHour);
            weightedHum += h * w;
          }

          const interpHum = weightedHum / sumWeight;
          const [r, g, b] = getHumidityRGB(interpHum);
          colors[idx] = r;
          colors[idx + 1] = g;
          colors[idx + 2] = b;
        } else if (curMetric === 'wind') {
          let sumWeight = 0;
          let weightedWind = 0;

          for (const loc of OMAN_LOCATIONS) {
            const dist = Math.hypot(v.lon - loc.lon, (v.lat - loc.lat) * 1.1) + 0.15;
            const w = 1 / (dist * dist);
            sumWeight += w;
            const ws = getLocValueAtHour(loc.id, 'wind', curHour);
            weightedWind += ws * w;
          }

          const interpWind = weightedWind / sumWeight;
          const normWind = Math.min(1, Math.max(0, (interpWind - 5) / 35));
          colors[idx] = 0.05 + 0.2 * normWind;
          colors[idx + 1] = 0.6 + 0.35 * (1 - normWind);
          colors[idx + 2] = 0.8 + 0.15 * normWind;
        } else {
          // Topography mode
          if (v.lat < 17.5 && v.lon < 55.5) {
            colors[idx] = 0.22;
            colors[idx + 1] = 0.42;
            colors[idx + 2] = 0.24;
          } else if (v.elev > 1.2) {
            const peakFactor = (v.elev - 1.2) / 1.6;
            colors[idx] = 0.42 + 0.15 * peakFactor;
            colors[idx + 1] = 0.32 + 0.12 * peakFactor;
            colors[idx + 2] = 0.26 + 0.1 * peakFactor;
          } else {
            colors[idx] = 0.72;
            colors[idx + 1] = 0.58;
            colors[idx + 2] = 0.38;
          }
        }
      }

      colorAttr.needsUpdate = true;
    };

    // Update pillar displays
    const updatePillarDisplays = () => {
      const curMetric = stateRef.current.activeMetric;
      const curHour = stateRef.current.selectedHour;
      const selId = stateRef.current.selectedGovId;

      for (const p of pillarGroups) {
        let valNorm = 0.5;
        let col = new THREE.Color(0xF59E0B);

        if (curMetric === 'temperature') {
          const t = getLocValueAtHour(p.loc.id, 'temperature', curHour);
          valNorm = Math.max(0.15, Math.min(1.0, (t - 15) / 28));
          const [r, g, b] = getTemperatureRGB(t);
          col.setRGB(r, g, b);
        } else if (curMetric === 'humidity') {
          const h = getLocValueAtHour(p.loc.id, 'humidity', curHour);
          valNorm = Math.max(0.15, Math.min(1.0, h / 100));
          const [r, g, b] = getHumidityRGB(h);
          col.setRGB(r, g, b);
        } else if (curMetric === 'wind') {
          const w = getLocValueAtHour(p.loc.id, 'wind', curHour);
          valNorm = Math.max(0.15, Math.min(1.0, w / 40));
          col.setHex(0x38BDF8);
        } else {
          valNorm = 0.6;
          col.setHex(p.loc.category === 'mountain' ? 0x10B981 : 0x6366F1);
        }

        const baseH = p.loc.isGovernorateCapital ? 0.8 : 0.6;
        const pillarHeight = baseH + valNorm * (p.loc.isGovernorateCapital ? 2.2 : 1.6);
        p.coreMesh.scale.set(1, pillarHeight / (p.loc.isGovernorateCapital ? 1.4 : 1.0), 1);

        if (p.ringMesh) {
          p.ringMesh.position.y = (p.loc.isGovernorateCapital ? 0.12 : 0.09) + pillarHeight;
        }
        p.crownMesh.position.y =
          (p.loc.isGovernorateCapital ? 0.12 : 0.09) + pillarHeight + (p.loc.isGovernorateCapital ? 0.22 : 0.12);

        p.coreMat.color.copy(col);
        p.coreMat.emissive.copy(col);
        if (p.ringMat) {
          p.ringMat.emissive.copy(col);
        }

        const isSelected = selId === p.loc.id;
        const scaleVal = isSelected ? 1.35 : 1.0;
        p.group.scale.set(scaleVal, scaleVal, scaleVal);
      }
    };

    updateSolarLighting(stateRef.current.selectedHour);
    updateTerrainColors();
    updatePillarDisplays();

    // --- Raycasting for Clicking / Hovering Pillars ---
    const getPointerCoords = (e: MouseEvent | TouchEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      let clientX = 0;
      let clientY = 0;
      if ('touches' in e && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else if ('changedTouches' in e && e.changedTouches.length > 0) {
        clientX = e.changedTouches[0].clientX;
        clientY = e.changedTouches[0].clientY;
      } else if ('clientX' in e) {
        clientX = (e as MouseEvent).clientX;
        clientY = (e as MouseEvent).clientY;
      }
      return {
        x: ((clientX - rect.left) / rect.width) * 2 - 1,
        y: -((clientY - rect.top) / rect.height) * 2 + 1,
      };
    };

    const handlePointerMove = (e: MouseEvent) => {
      const coords = getPointerCoords(e);
      _mouse.x = coords.x;
      _mouse.y = coords.y;

      _raycaster.setFromCamera(_mouse, camera);
      const intersects = _raycaster.intersectObjects(
        pillarGroups.map((p) => p.group),
        true
      );

      if (intersects.length > 0) {
        let parentGroup: THREE.Object3D | null = intersects[0].object;
        while (parentGroup && !parentGroup.userData?.governorateId) {
          parentGroup = parentGroup.parent;
        }
        if (parentGroup && parentGroup.userData?.governorateId) {
          setHoveredGovId(parentGroup.userData.governorateId);
          renderer.domElement.style.cursor = 'pointer';
          return;
        }
      }
      setHoveredGovId(null);
      renderer.domElement.style.cursor = 'grab';
    };

    const handleClickOrTouch = (e: MouseEvent | TouchEvent) => {
      const coords = getPointerCoords(e);
      _mouse.x = coords.x;
      _mouse.y = coords.y;

      _raycaster.setFromCamera(_mouse, camera);
      const intersects = _raycaster.intersectObjects(
        pillarGroups.map((p) => p.group),
        true
      );

      if (intersects.length > 0) {
        let parentGroup: THREE.Object3D | null = intersects[0].object;
        while (parentGroup && !parentGroup.userData?.governorateId) {
          parentGroup = parentGroup.parent;
        }
        if (parentGroup && parentGroup.userData?.governorateId) {
          onSelectRegionRef.current(parentGroup.userData.governorateId);
        }
      }
    };

    renderer.domElement.addEventListener('mousemove', handlePointerMove);
    renderer.domElement.addEventListener('click', handleClickOrTouch);
    renderer.domElement.addEventListener('touchend', handleClickOrTouch, { passive: true });

    // --- Animation Loop ---
    let animId: number;
    let clock = new THREE.Clock();

    const tick = () => {
      animId = requestAnimationFrame(tick);
      const delta = clock.getDelta();

      if (stateRef.current.isTransitioningCamera) {
        const factor = 1 - Math.exp(-4.5 * delta);
        camera.position.lerp(stateRef.current.targetCamPos, factor);
        controls.target.lerp(stateRef.current.targetLookAt, factor);

        if (
          camera.position.distanceTo(stateRef.current.targetCamPos) < 0.05 &&
          controls.target.distanceTo(stateRef.current.targetLookAt) < 0.05
        ) {
          stateRef.current.isTransitioningCamera = false;
        }
      }

      controls.update();

      for (const p of pillarGroups) {
        if (p.ringMesh) p.ringMesh.rotation.z += 1.8 * delta;
        p.crownMesh.rotation.y += 2.2 * delta;
      }

      // Update real-time vector field wind streamlets
      const vFieldOut = { vx: 0, vz: 0, speedKmh: 15 };
      const isWindMode = stateRef.current.activeMetric === 'wind';
      const trailLength = isWindMode ? 0.55 : 0.32;
      const speedScale = isWindMode ? 1.0 : 0.75;
      const frameScale = Math.min(delta * 60, 3);

      for (let i = 0; i < streamletCount; i++) {
        const p = streamlets[i];
        p.age++;

        if (p.age > p.maxAge || p.x < -14 || p.x > 14 || p.z < -16 || p.z > 16) {
          respawnStreamlet(p);
        }

        sampleVectorField(p.x, p.z, stateRef.current.selectedHour, vFieldOut);
        p.speed = vFieldOut.speedKmh;

        // Tail trails behind the head along the flow direction
        const vLen = Math.hypot(vFieldOut.vx, vFieldOut.vz) || 1;
        const dirX = vFieldOut.vx / vLen;
        const dirZ = vFieldOut.vz / vLen;
        p.tailX = p.x - dirX * trailLength;
        p.tailZ = p.z - dirZ * trailLength;
        const tailLon = p.tailX / 2.35 + CENTER_LON;
        const tailLat = -p.tailZ / 2.55 + CENTER_LAT;
        p.tailY = Math.max(0.12, calculateOmanElevation(tailLon, tailLat) + 0.22);

        // Advance head
        p.x += vFieldOut.vx * speedScale * frameScale;
        p.z += vFieldOut.vz * speedScale * frameScale;
        const headLon = p.x / 2.35 + CENTER_LON;
        const headLat = -p.z / 2.55 + CENTER_LAT;
        p.y = Math.max(0.12, calculateOmanElevation(headLon, headLat) + 0.22);

        const idx = i * 6;
        // Tail vertex
        streamletPositions[idx] = p.tailX;
        streamletPositions[idx + 1] = p.tailY;
        streamletPositions[idx + 2] = p.tailZ;

        // Head vertex
        streamletPositions[idx + 3] = p.x;
        streamletPositions[idx + 4] = p.y;
        streamletPositions[idx + 5] = p.z;

        // Color mapping based on wind speed:
        // Calm (5-15 km/h): Soft Sky Cyan
        // Breeze (15-28 km/h): Emerald Teal
        // Gale (28-40+ km/h): Electric Amber
        const speedNorm = Math.min(1.0, Math.max(0, (p.speed - 8) / 32));
        const lifeRatio = p.age / p.maxAge;
        const alpha = Math.sin(lifeRatio * Math.PI);

        const headBrightness = (isWindMode ? 1.0 : 0.6) * alpha;
        const tailBrightness = headBrightness * 0.25;

        let r = 0.15, g = 0.75, b = 0.95;
        if (speedNorm < 0.5) {
          const f = speedNorm / 0.5;
          r = 0.15 - 0.08 * f;
          g = 0.75 + 0.12 * f;
          b = 0.95 - 0.25 * f;
        } else {
          const f = (speedNorm - 0.5) / 0.5;
          r = 0.07 + 0.88 * f;
          g = 0.87 - 0.12 * f;
          b = 0.70 - 0.55 * f;
        }

        streamletColors[idx] = r * tailBrightness;
        streamletColors[idx + 1] = g * tailBrightness;
        streamletColors[idx + 2] = b * tailBrightness;

        streamletColors[idx + 3] = r * headBrightness;
        streamletColors[idx + 4] = g * headBrightness;
        streamletColors[idx + 5] = b * headBrightness;
      }

      streamletGeo.attributes.position.needsUpdate = true;
      streamletGeo.attributes.color.needsUpdate = true;

      // Project 3D Pillar positions to 2D Screen space
      const newLabels: ScreenLabel[] = [];
      const curWidth = renderer.domElement.clientWidth;
      const curHeight = renderer.domElement.clientHeight;
      const halfWidth = curWidth / 2;
      const halfHeight = curHeight / 2;
      const curMetric = stateRef.current.activeMetric;
      const tUnit = stateRef.current.tempUnit;
      const curHour = stateRef.current.selectedHour;
      const selId = stateRef.current.selectedGovId;

      for (const p of pillarGroups) {
        _tempVec3.set(p.x, p.elev + 2.2, p.z);
        _tempVec3.project(camera);

        const isVisible = _tempVec3.z < 1.0;
        const screenX = _tempVec3.x * halfWidth + halfWidth;
        const screenY = -_tempVec3.y * halfHeight + halfHeight;

        let valText = '';
        if (curMetric === 'humidity') {
          const h = Math.round(getLocValueAtHour(p.loc.id, 'humidity', curHour));
          valText = `${h}%`;
        } else if (curMetric === 'wind') {
          const w = Math.round(getLocValueAtHour(p.loc.id, 'wind', curHour));
          valText = `${w} km/h`;
        } else {
          const t = getLocValueAtHour(p.loc.id, 'temperature', curHour);
          valText = tUnit === 'celsius' ? `${Math.round(t)}°C` : `${cToF(t)}°F`;
        }

        const isImportant =
          p.loc.isGovernorateCapital ||
          p.loc.category === 'mountain' ||
          selId === p.loc.id ||
          p.loc.id === 'duqm' ||
          p.loc.id === 'masirah-island';

        newLabels.push({
          id: p.loc.id,
          name: p.loc.nameEn,
          value: valText,
          category: p.loc.category,
          screenX,
          screenY,
          visible: isVisible,
          isImportant: Boolean(isImportant),
        });
      }
      setScreenLabels(newLabels);

      renderer.render(scene, camera);
    };

    tick();

    const onStateChanged = () => {
      updateSolarLighting(stateRef.current.selectedHour);
      updateTerrainColors();
      updatePillarDisplays();
    };

    (renderer.domElement as any).__updateSceneState = onStateChanged;

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('mousemove', handlePointerMove);
      renderer.domElement.removeEventListener('click', handleClickOrTouch);
      renderer.domElement.removeEventListener('touchend', handleClickOrTouch);
      cancelAnimationFrame(animId);

      controls.dispose();
      terrainGeo.dispose();
      terrainMat.dispose();
      oceanGeo.dispose();
      oceanMat.dispose();
      coastlineGeo.dispose();
      coastlineMat.dispose();
      baseCylGeoGov.dispose();
      baseCylGeoTown.dispose();
      ringGeo.dispose();
      crownGeo.dispose();
      windGeo.dispose();
      windMat.dispose();
      streamletGeo.dispose();
      streamletMat.dispose();
      renderer.dispose();

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  useEffect(() => {
    if (mountRef.current) {
      const canvas = mountRef.current.querySelector('canvas') as any;
      if (canvas && canvas.__updateSceneState) {
        canvas.__updateSceneState();
      }
    }
  }, [activeMetric, weatherData, selectedGovId, selectedHour]);

  return (
    <div className="relative w-full h-full overflow-hidden select-none touch-none">
      <div ref={mountRef} className="absolute inset-0 w-full h-full touch-none" />

      {/* 2D Projected Screen Badges */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
        {screenLabels.map((lbl) => {
          if (!lbl.visible) return null;
          const isHovered = hoveredGovId === lbl.id;
          const isSelected = selectedGovId === lbl.id;

          // For visual clarity on desktop and mobile, show important places or hovered/selected places
          if (!lbl.isImportant && !isHovered && !isSelected) {
            return (
              <div
                key={lbl.id}
                onClick={() => onSelectRegionRef.current(lbl.id)}
                className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto cursor-pointer p-1 touch-manipulation group"
                style={{
                  left: `${lbl.screenX}px`,
                  top: `${lbl.screenY}px`,
                }}
                title={lbl.name}
              >
                <div className="w-2.5 h-2.5 rounded-full bg-slate-300/80 border border-slate-900 group-hover:scale-150 group-hover:bg-amber-400 transition-all shadow-sm" />
              </div>
            );
          }

          return (
            <div
              key={lbl.id}
              onClick={() => onSelectRegionRef.current(lbl.id)}
              className="absolute -translate-x-1/2 -translate-y-full pointer-events-auto transition-transform duration-150 cursor-pointer touch-manipulation"
              style={{
                left: `${lbl.screenX}px`,
                top: `${lbl.screenY - 14}px`,
                transform: `translate(-50%, -100%) scale(${isSelected ? 1.15 : isHovered ? 1.08 : 1.0})`,
              }}
            >
              <div
                className={`flex items-center gap-1.5 px-2 md:px-2.5 py-1 min-h-[30px] rounded-lg border shadow-lg backdrop-blur-none transition-colors ${
                  isSelected
                    ? 'bg-amber-500 text-slate-950 font-bold border-white'
                    : isHovered
                    ? 'bg-slate-900 text-white border-amber-400'
                    : lbl.category === 'mountain'
                    ? 'bg-emerald-950/90 text-emerald-200 border-emerald-700/80'
                    : 'bg-slate-950/90 text-slate-200 border-slate-700/80 hover:border-slate-500'
                }`}
              >
                <span className="text-[11px] md:text-xs font-semibold whitespace-nowrap">{lbl.name}</span>
                {lbl.value && (
                  <span
                    className={`text-[10px] md:text-[11px] font-mono tabular-nums font-bold ${
                      isSelected
                        ? 'text-slate-950'
                        : lbl.category === 'mountain'
                        ? 'text-emerald-300'
                        : 'text-amber-400'
                    }`}
                  >
                    {lbl.value}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
