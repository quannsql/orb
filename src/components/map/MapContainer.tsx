"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import type { Feature, Polygon, GeoJsonProperties } from "geojson";
import type { SpectralMode } from "@/types/sentinel";
import "mapbox-gl/dist/mapbox-gl.css";

import { useMapbox } from "@/hooks/useMapbox";
import { useSentinelAuth } from "@/hooks/useSentinelAuth";
import { useSentinelLayers } from "@/hooks/useSentinelLayers";
import { useTimeTravel } from "@/hooks/useTimeTravel";
import { usePolygonAnalysis } from "@/hooks/usePolygonAnalysis";
import { useOsintMap } from "@/hooks/useOsintMap";
import { useMaritimeMap } from "@/hooks/useMaritimeMap";

import CommandBar from "@/components/hud/CommandBar";
import TimeSlider from "@/components/hud/TimeSlider";
import StatsPanel from "@/components/hud/StatsPanel";
import EventTicker from "@/components/hud/EventTicker";
import MapControls from "@/components/map/MapControls";
import DrawTools from "@/components/map/DrawTools";
import GeoChatPanel from "@/components/hud/GeoChatPanel";
import UnifiedWorkspace from "@/components/hud/UnifiedWorkspace";
import AnomalyTickerBar from "@/components/hud/AnomalyTickerBar";
import * as turf from "@turf/turf";
import mapboxgl from "mapbox-gl";
import GlowButton from "@/components/ui/GlowButton";
import { Layers, X, Target } from "lucide-react";

export default function MapContainer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const {
    mapRef,
    isLoaded,
    viewport,
    cursorLngLat,
    zoomIn,
    zoomOut,
    toggle3D,
    resetBearing,
    flyTo,
  } = useMapbox(containerRef);

  const { isAuthenticated } = useSentinelAuth();
  const { setLayer, removeLayer, setOpacity } = useSentinelLayers(mapRef);
  const timeTravel = useTimeTravel();
  const { stats, analyzePolygon, clearAnalysis } = usePolygonAnalysis();

  // Core Sidebar Navigation & Autopilot
  const [subMode, setSubMode] = useState<"satcom" | "osint" | "butterfly">("satcom");
  const [isLayerPanelOpen, setIsLayerPanelOpen] = useState(true);
  const [isAutopilot, setIsAutopilot] = useState(true);

  // Sentinel Imagery
  const [activeMode, setActiveMode] = useState<SpectralMode | null>(null);
  const [layerOpacity, setLayerOpacity] = useState(0.85);

  // OSINT Targets Hook Integration
  const [scanAviation, setScanAviation] = useState(true);
  const [scanMaritime, setScanMaritime] = useState(true);
  const { flights, isScanning: isScanningAviation, lastScanTime } = useOsintMap(mapRef, viewport, isLoaded && scanAviation);
  const { ships, isConnected: isMaritimeScanning } = useMaritimeMap(mapRef, viewport, isLoaded && scanMaritime);

  // AI Analysis & Briefing states
  const [threatAnalysisResult, setThreatAnalysisResult] = useState<any>(null);
  const [isAnalyzingThreats, setIsAnalyzingThreats] = useState(false);
  const [activeBriefing, setActiveBriefing] = useState<any>(null);
  
  // Radar sweep & history log states
  const [history, setHistory] = useState<any[]>([]);
  const [isScanningRadar, setIsScanningRadar] = useState(false);
  const [hazardMarkers, setHazardMarkers] = useState<any[]>([]);

  // Simulation states
  const [butterflyClickedLatLng, setButterflyClickedLatLng] = useState<{ lng: number; lat: number } | null>(null);
  const [butterflyResult, setButterflyResult] = useState<any | null>(null);
  const [simulationLoading, setSimulationLoading] = useState(false);
  const [simulationStep, setSimulationStep] = useState(0);

  const butterflyMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const activeHazardMarkersRef = useRef<{ [key: string]: mapboxgl.Marker }>({});

  // Spectral mode update handler
  const handleModeChange = useCallback(
    (mode: SpectralMode | null) => {
      setActiveMode(mode);
      if (mode) {
        setLayer(mode, timeTravel.selectedDate);
      } else {
        removeLayer();
      }
    },
    [setLayer, removeLayer, timeTravel.selectedDate]
  );

  // Date sync
  useEffect(() => {
    if (activeMode && isLoaded) {
      setLayer(activeMode, timeTravel.selectedDate);
    }
  }, [timeTravel.selectedDate, activeMode, isLoaded, setLayer]);

  // Opacity sync
  useEffect(() => {
    setOpacity(layerOpacity);
  }, [layerOpacity, setOpacity]);

  // Handle Map satellite layers
  useEffect(() => {
    if (!mapRef.current || !isLoaded) return;
    const map = mapRef.current;
    try {
      if (map.getLayer("mapbox-satellite-layer")) {
        const is3D = viewport.pitch > 0;
        const isDarkMap = subMode === "osint" || subMode === "butterfly";
        map.setLayoutProperty(
          "mapbox-satellite-layer",
          "visibility",
          (isDarkMap || is3D) ? "none" : "visible"
        );
      }
    } catch (err) {
      console.warn("Could not toggle satellite layer visibility:", err);
    }
  }, [subMode, isLoaded, mapRef, viewport.pitch]);

  // Handle draw polygon
  const handlePolygonCreated = useCallback(
    (feature: Feature<Polygon, GeoJsonProperties>) => {
      const dateTo = timeTravel.selectedDate;
      const dateFrom = new Date(dateTo);
      dateFrom.setDate(dateFrom.getDate() - 30);
      analyzePolygon(feature, dateFrom.toISOString().split("T")[0], dateTo);
    },
    [analyzePolygon, timeTravel.selectedDate]
  );

  const handleAddHazardMarker = useCallback((alert: any) => {
    setHazardMarkers((prev) => {
      const filtered = prev.filter((item) => item.id !== alert.id);
      return [alert, ...filtered];
    });
  }, []);

  // Run sector-wide OSINT threat analysis manually or via autopilot
  const handleRunThreatAnalysis = useCallback(async () => {
    if ((flights.length === 0 && ships.size === 0) || isAnalyzingThreats) return;
    setIsAnalyzingThreats(true);
    try {
      const bounds = mapRef.current?.getBounds();
      const body = { flights, ships: Array.from(ships.values()), bounds };
      const res = await fetch("/api/ai/analyze-osint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const data = await res.json();
        setThreatAnalysisResult(data);
      }
    } catch (err) {
      console.error("OSINT sector analysis failed:", err);
    } finally {
      setIsAnalyzingThreats(false);
    }
  }, [flights, ships, isAnalyzingThreats, mapRef]);

  // Butterfly geopolitical simulation runner
  const handleStartSimulation = async (scenario: string) => {
    if (!butterflyClickedLatLng) return;
    setSimulationLoading(true);
    setSimulationStep(1);

    const timers = [
      setTimeout(() => setSimulationStep(2), 2000),
      setTimeout(() => setSimulationStep(3), 4500),
      setTimeout(() => setSimulationStep(4), 7000),
      setTimeout(() => setSimulationStep(5), 9000),
    ];

    try {
      const res = await fetch("/api/ai/simulate-butterfly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lng: butterflyClickedLatLng.lng, lat: butterflyClickedLatLng.lat, scenario }),
      });
      if (!res.ok) throw new Error("Simulation endpoint failed");
      const data = await res.json();
      setButterflyResult(data);
      return data;
    } catch (err) {
      console.error("Simulation run failed:", err);
      timers.forEach(clearTimeout);
      setSimulationStep(0);
    } finally {
      setSimulationLoading(false);
      setSimulationStep(0);
    }
  };

  const handleClearSimulation = () => {
    setButterflyResult(null);
    setButterflyClickedLatLng(null);
  };

  // Helper mapping: map alert to appropriate spectral layer for automated sensor focus
  const autoSelectSpectralMode = (type: string, title: string): SpectralMode => {
    const combined = (type + " " + title).toLowerCase();
    if (combined.includes("water") || combined.includes("vessel") || combined.includes("maritime") || combined.includes("sea") || combined.includes("strait") || combined.includes("naval") || combined.includes("houthi") || combined.includes("blockade")) {
      return "TRUE_COLOR"; // True Color RGB is ideal for optical ship detection
    }
    if (combined.includes("electronic") || combined.includes("radar") || combined.includes("jamming") || combined.includes("military") || combined.includes("drone") || combined.includes("carrier")) {
      return "MOISTURE"; // Structural/soil moisture variations
    }
    if (combined.includes("drought") || combined.includes("moisture") || combined.includes("dry")) {
      return "MOISTURE"; // Soil moisture Index
    }
    if (combined.includes("agriculture") || combined.includes("vegetation") || combined.includes("deforestation")) {
      return "NDVI"; // Veggie Health Index
    }
    return "TRUE_COLOR";
  };

  // Autopilot execution sequence
  const handleAutopilotAlert = useCallback(async (alert: any) => {
    if (!alert || !mapRef.current) return;
    console.log(`[Autopilot Engine] Centering sensors on hotspot: ${alert.hotspot} [${alert.lat}, ${alert.lng}]`);

    // 1. Move map smoothly
    flyTo(alert.lng, alert.lat, 6);
    setButterflyClickedLatLng({ lng: alert.lng, lat: alert.lat });

    // 2. Select matching spectral layer
    const recommendedSpectral = autoSelectSpectralMode(alert.type, alert.title);
    handleModeChange(recommendedSpectral);

    // 3. Switch submode to OSINT to display live signal sweep & trigger OSINT report
    setSubMode("osint");
    setIsAnalyzingThreats(true);
    try {
      const bounds = mapRef.current.getBounds();
      // Wait for a tiny tick to ensure hook catches targets inside bounds
      const body = { flights: flights.slice(0, 10), ships: Array.from(ships.values()).slice(0, 10), bounds };
      const res = await fetch("/api/ai/analyze-osint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const analysisData = await res.json();
        setThreatAnalysisResult(analysisData);
      }
    } catch (err) {
      console.warn("Autopilot threat scan skipped:", err);
    } finally {
      setIsAnalyzingThreats(false);
    }

    // 4. Run Butterfly Geopolitical Simulation cascade in the background
    setSubMode("butterfly");
    setSimulationLoading(true);
    setSimulationStep(1);

    const stepTimers = [
      setTimeout(() => setSimulationStep(2), 1500),
      setTimeout(() => setSimulationStep(3), 3000),
      setTimeout(() => setSimulationStep(4), 4500),
      setTimeout(() => setSimulationStep(5), 5500),
    ];

    try {
      const scenarioText = `${alert.title}: ${alert.analysis}`;
      const simRes = await fetch("/api/ai/simulate-butterfly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lng: alert.lng, lat: alert.lat, scenario: scenarioText }),
      });
      if (simRes.ok) {
        const simData = await simRes.json();
        setButterflyResult(simData);
      }
    } catch (err) {
      console.warn("Autopilot simulation skip:", err);
      stepTimers.forEach(clearTimeout);
    } finally {
      setSimulationLoading(false);
      setSimulationStep(0);
    }
  }, [flyTo, flights, ships, handleModeChange]);

  // Main Radar Sweep executor
  const triggerSweep = useCallback(async (force = false) => {
    if (isScanningRadar) return;
    setIsScanningRadar(true);

    document.dispatchEvent(
      new CustomEvent("add-ticker-event", {
        detail: {
          message: force
            ? "SENTINEL-X :: FORCING PROACTIVE GLOBAL SCAN BYPASSING COOLDOWN..."
            : "SENTINEL-X :: Initializing automated proactive global reconnaissance sweep...",
          type: "system"
        }
      })
    );

    try {
      const response = await fetch("/api/ai/sentinel-sweep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force })
      });
      if (!response.ok) throw new Error("Sweep failed");
      const data = await response.json();

      setActiveBriefing(data);
      handleAddHazardMarker(data);

      setHistory((prev) => {
        const filtered = prev.filter((item) => item.id !== data.id);
        return [data, ...filtered].slice(0, 15);
      });

      document.dispatchEvent(
        new CustomEvent("add-ticker-event", {
          detail: {
            message: `CRITICAL DETECTED :: ${data.title} - Threat: ${data.threatLevel}`,
            type: "alert"
          }
        })
      );

      // Autopilot trigger
      if (isAutopilot && data && !data.cached) {
        setTimeout(() => {
          handleAutopilotAlert(data);
        }, 1500);
      }
    } catch (err) {
      console.error("Sentinel sweep error:", err);
    } finally {
      setIsScanningRadar(false);
    }
  }, [isScanningRadar, isAutopilot, handleAddHazardMarker, handleAutopilotAlert]);

  // History & Marquee Item selection
  const handleHistoryItemClick = useCallback((alert: any) => {
    setActiveBriefing(alert);
    if (isAutopilot) {
      handleAutopilotAlert(alert);
    } else {
      flyTo(alert.lng, alert.lat, 6);
      setButterflyClickedLatLng({ lng: alert.lng, lat: alert.lat });
      const recommendedSpectral = autoSelectSpectralMode(alert.type, alert.title);
      handleModeChange(recommendedSpectral);
    }
  }, [isAutopilot, handleAutopilotAlert, flyTo, handleModeChange]);

  // Mount listeners & preloader initialization
  useEffect(() => {
    const loadSentinelHistory = async () => {
      try {
        const res = await fetch("/api/ai/sentinel-sweep");
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setHistory(data);
            setHazardMarkers(data);

            // Run initial Autopilot focus on first alert if cache is populated
            if (isAutopilot && data.length > 0) {
              setTimeout(() => {
                handleHistoryItemClick(data[0]);
              }, 2000);
            }
          }
        }
      } catch (err) {
        console.error("Failed to load sentinel history on mount:", err);
      }
    };
    loadSentinelHistory();
  }, []);

  // Periodic Sweeps
  useEffect(() => {
    const initialTimer = setTimeout(() => {
      triggerSweep(false);
    }, 15000);

    const interval = setInterval(() => {
      triggerSweep(false);
    }, 90000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [triggerSweep]);

  // Listen to open briefing event from map markers
  useEffect(() => {
    const handleOpenMapBriefing = (e: any) => {
      const alertData = e.detail;
      handleHistoryItemClick(alertData);
    };
    document.addEventListener("open-sentinel-briefing", handleOpenMapBriefing);
    return () => {
      document.removeEventListener("open-sentinel-briefing", handleOpenMapBriefing);
    };
  }, [handleHistoryItemClick]);

  // Listen to preset selection flights
  useEffect(() => {
    const handleFlyToPreset = (e: any) => {
      const { lng, lat, zoom } = e.detail;
      flyTo(lng, lat, zoom || 6);
      setButterflyClickedLatLng({ lng, lat });
    };
    document.addEventListener("fly-to-preset", handleFlyToPreset);
    return () => {
      document.removeEventListener("fly-to-preset", handleFlyToPreset);
    };
  }, [flyTo]);

  // ─── Butterfly Mode Click Listener ───
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isLoaded || subMode !== "butterfly") return;

    const handleMapClick = (e: mapboxgl.MapMouseEvent) => {
      const target = e.originalEvent.target as HTMLElement;
      if (target.closest("#unified-workspace") || target.closest(".butterfly-pin") || target.closest("button")) return;
      setButterflyClickedLatLng({ lng: e.lngLat.lng, lat: e.lngLat.lat });
    };

    map.on("click", handleMapClick);
    return () => {
      map.off("click", handleMapClick);
    };
  }, [subMode, isLoaded, mapRef]);

  // ─── Butterfly Pin Marker Effect ───
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isLoaded) return;

    if (butterflyMarkerRef.current) {
      butterflyMarkerRef.current.remove();
      butterflyMarkerRef.current = null;
    }

    if (butterflyClickedLatLng && subMode === "butterfly") {
      const el = document.createElement("div");
      el.className = "butterfly-pin";
      el.innerHTML = `
        <div class="relative flex items-center justify-center w-8 h-8 cursor-pointer">
          <div class="absolute w-full h-full rounded-full bg-purple-500/30 border border-purple-500 animate-ping"></div>
          <div class="w-3 h-3 rounded-full bg-purple-400 border border-white shadow-[0_0_10px_rgba(168,85,247,0.9)]"></div>
        </div>
      `;

      butterflyMarkerRef.current = new mapboxgl.Marker({ element: el })
        .setLngLat([butterflyClickedLatLng.lng, butterflyClickedLatLng.lat])
        .addTo(map);
    }
  }, [butterflyClickedLatLng, subMode, isLoaded, mapRef]);

  // ─── Butterfly Results Overlay (GeoJSON) ───
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isLoaded) return;

    const cleanupLayers = () => {
      const layers = [
        "butterfly-circle-layer",
        "butterfly-routes-layer",
        "butterfly-migration-layer",
      ];
      const sources = [
        "butterfly-circle-source",
        "butterfly-routes-source",
        "butterfly-migration-source",
      ];

      layers.forEach((l) => {
        if (map.getLayer(l)) map.removeLayer(l);
      });
      sources.forEach((s) => {
        if (map.getSource(s)) map.removeSource(s);
      });
    };

    if (!butterflyResult || !butterflyClickedLatLng || subMode !== "butterfly") {
      cleanupLayers();
      return;
    }

    cleanupLayers();

    try {
      const radius = butterflyResult.military.exclusionRadiusKm || 150;
      const circleGeoJson = turf.circle(
        [butterflyClickedLatLng.lng, butterflyClickedLatLng.lat],
        radius,
        { units: "kilometers" }
      );

      map.addSource("butterfly-circle-source", {
        type: "geojson",
        data: circleGeoJson,
      });

      map.addLayer({
        id: "butterfly-circle-layer",
        type: "fill",
        source: "butterfly-circle-source",
        paint: {
          "fill-color": "#8b5cf6",
          "fill-opacity": 0.25,
          "fill-outline-color": "#c084fc",
        },
      });

      const routesFeatures = butterflyResult.mapVisuals.redirectedRoutes.map((route: any) => ({
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: route.path,
        },
        properties: {
          name: route.name,
        },
      }));

      map.addSource("butterfly-routes-source", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: routesFeatures,
        },
      });

      map.addLayer({
        id: "butterfly-routes-layer",
        type: "line",
        source: "butterfly-routes-source",
        paint: {
          "line-color": "#fbbf24",
          "line-width": 2.5,
          "line-dasharray": [3, 3],
        },
      });

      const migrationFeatures = butterflyResult.mapVisuals.migrationVectors.map((vector: any) => ({
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: [vector.from, vector.to],
        },
        properties: {
          intensity: vector.intensity,
        },
      }));

      map.addSource("butterfly-migration-source", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: migrationFeatures,
        },
      });

      map.addLayer({
        id: "butterfly-migration-layer",
        type: "line",
        source: "butterfly-migration-source",
        paint: {
          "line-color": "#ec4899",
          "line-width": 3,
        },
      });

    } catch (err) {
      console.error("Error applying Mapbox layers for butterfly simulation:", err);
    }

    return () => {
      cleanupLayers();
    };
  }, [butterflyResult, butterflyClickedLatLng, subMode, isLoaded, mapRef]);

  // ─── Proactive Sentinel Hazard Pins ───
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isLoaded) return;

    const currentIds = new Set(hazardMarkers.map((m) => m.id));
    Object.keys(activeHazardMarkersRef.current).forEach((id) => {
      if (!currentIds.has(id)) {
        activeHazardMarkersRef.current[id].remove();
        delete activeHazardMarkersRef.current[id];
      }
    });

    hazardMarkers.forEach((m) => {
      if (!activeHazardMarkersRef.current[m.id]) {
        const el = document.createElement("div");
        el.className = "sentinel-hazard-pin";
        el.innerHTML = `
          <div class="relative flex items-center justify-center w-8 h-8 cursor-pointer">
            <div class="absolute w-full h-full rounded-full bg-red-600/30 border border-red-500 animate-ping"></div>
            <div class="w-3.5 h-3.5 rounded-full bg-red-600 border border-white shadow-[0_0_10px_rgba(239,68,68,0.9)] flex items-center justify-center text-[7px] font-bold text-white">!</div>
          </div>
        `;

        el.addEventListener("click", () => {
          document.dispatchEvent(new CustomEvent("open-sentinel-briefing", { detail: m }));
        });

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([m.lng, m.lat])
          .addTo(map);

        activeHazardMarkersRef.current[m.id] = marker;
      }
    });

    return () => {
      Object.keys(activeHazardMarkersRef.current).forEach((id) => {
        activeHazardMarkersRef.current[id].remove();
      });
      activeHazardMarkersRef.current = {};
    };
  }, [hazardMarkers, isLoaded, mapRef]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-void" id="map-root">
      {/* Map canvas */}
      <div
        ref={containerRef}
        className="absolute inset-0 w-full h-full"
        id="map-canvas"
      />

      {/* Scanline CRT overlay */}
      <div className="scanline-overlay" />

      {/* ─── HUD Overlay ─── */}

      {/* Top: Command Bar */}
      <CommandBar
        viewport={viewport}
        cursorLngLat={cursorLngLat}
        activeMode={activeMode}
        isConnected={isAuthenticated}
        activeSubMode={subMode}
        onChangeSubMode={setSubMode}
      />

      {/* Top-right: Event Ticker */}
      <div className="hidden md:block">
        <EventTicker />
      </div>

      {/* Right: Stats Panel (appears after polygon draw) */}
      <StatsPanel stats={stats} onClose={clearAnalysis} />

      {/* Bottom: Time Slider (Hidden in OSINT & Butterfly mode) */}
      {subMode === "satcom" && (
        <TimeSlider
          selectedDate={timeTravel.selectedDate}
          onDateChange={timeTravel.setSelectedDate}
          isPlaying={timeTravel.isPlaying}
          onTogglePlay={timeTravel.togglePlay}
          onStepForward={timeTravel.stepForward}
          onStepBackward={timeTravel.stepBackward}
          stepDays={timeTravel.stepDays}
          onStepChange={timeTravel.setStepDays}
          minDate={timeTravel.minDate}
          maxDate={timeTravel.maxDate}
          dateToValue={timeTravel.dateToValue}
          valueToDate={timeTravel.valueToDate}
          isActive={activeMode !== null}
        />
      )}

      {/* Unified Left Sidebar Workspace */}
      {isLayerPanelOpen && (
        <UnifiedWorkspace
          activeSubMode={subMode}
          onChangeSubMode={setSubMode}
          isAutopilot={isAutopilot}
          onToggleAutopilot={() => setIsAutopilot(!isAutopilot)}
          activeMode={activeMode}
          onModeChange={handleModeChange}
          layerOpacity={layerOpacity}
          onOpacityChange={setLayerOpacity}
          scanAviation={scanAviation}
          setScanAviation={setScanAviation}
          scanMaritime={scanMaritime}
          setScanMaritime={setScanMaritime}
          flights={flights}
          ships={ships}
          isScanningTargets={isScanningAviation || isMaritimeScanning}
          onRunThreatAnalysis={handleRunThreatAnalysis}
          isAnalyzingThreats={isAnalyzingThreats}
          threatAnalysisResult={threatAnalysisResult}
          onClearThreatAnalysis={() => setThreatAnalysisResult(null)}
          activeBriefing={activeBriefing}
          onCloseBriefing={() => setActiveBriefing(null)}
          history={history}
          onHistoryItemClick={handleHistoryItemClick}
          isScanningRadar={isScanningRadar}
          onForceSweep={() => triggerSweep(true)}
          clickedLatLng={butterflyClickedLatLng}
          onStartSimulation={handleStartSimulation}
          onClearSimulation={handleClearSimulation}
          simulationResult={butterflyResult}
          simulationLoading={simulationLoading}
          simulationStep={simulationStep}
          onClose={() => setIsLayerPanelOpen(false)}
        />
      )}

      {/* Floating Panel Toggle (Unified Sidebar Trigger) */}
      <div 
        className={`fixed z-30 transition-all duration-300 ${
          isLayerPanelOpen
            ? "left-[364px] bottom-14 hidden md:block" 
            : "left-4 bottom-14"
        }`}
      >
        <GlowButton
          onClick={() => setIsLayerPanelOpen(!isLayerPanelOpen)}
          size="sm"
          variant={subMode === "osint" ? "danger" : subMode === "butterfly" ? "ghost" : "white"}
          active={isLayerPanelOpen}
          className={`rounded-none w-24 flex items-center gap-1.5 justify-center ${
            subMode === "butterfly" ? "border-purple-500/30 text-purple-300 hover:bg-purple-500/10" : ""
          }`}
        >
          {isLayerPanelOpen ? (
            <>
              <X size={12} />
              <span>Close</span>
            </>
          ) : (
            <>
              <Layers size={12} />
              <span>Workspace</span>
            </>
          )}
        </GlowButton>
      </div>

      {/* Bottom-left: Draw Tools (Hidden in OSINT & Butterfly mode) */}
      {subMode === "satcom" && (
        <DrawTools
          mapRef={mapRef}
          isMapLoaded={isLoaded}
          onPolygonCreated={handlePolygonCreated}
          onPolygonDeleted={clearAnalysis}
          className="left-4 bottom-14"
        />
      )}

      {/* Right side: Map Controls */}
      <MapControls
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onToggle3D={toggle3D}
        onResetBearing={resetBearing}
        is3D={viewport.pitch > 0}
        bearing={viewport.bearing}
        className={stats ? "right-[304px] bottom-14" : "right-4 bottom-14"}
      />

      {/* AI Chat Panel */}
      <GeoChatPanel
        onFlyTo={flyTo}
        onSetMode={handleModeChange}
        onSetDate={timeTravel.setSelectedDate}
        className={stats ? "right-[304px] bottom-14" : "right-4 bottom-14"}
      />

      {/* Bottom scrolling warning marquee ticker */}
      <AnomalyTickerBar 
        alerts={history}
        onAlertClick={handleHistoryItemClick}
      />
    </div>
  );
}
