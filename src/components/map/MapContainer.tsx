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

import CommandBar from "@/components/hud/CommandBar";
import LayerPanel from "@/components/hud/LayerPanel";
import TimeSlider from "@/components/hud/TimeSlider";
import StatsPanel from "@/components/hud/StatsPanel";
import EventTicker from "@/components/hud/EventTicker";
import MapControls from "@/components/map/MapControls";
import DrawTools from "@/components/map/DrawTools";
import GeoChatPanel from "@/components/hud/GeoChatPanel";
import OsintReport from "@/components/hud/OsintReport";
import OsintPanel from "@/components/hud/OsintPanel";
import GlassPanel from "@/components/ui/GlassPanel";
import GlowButton from "@/components/ui/GlowButton";
import { Layers, X, Target } from "lucide-react";

/**
 * Core map container — orchestrates the map, HUD panels, and data layers.
 */
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

  const [activeMode, setActiveMode] = useState<SpectralMode | null>(null);
  const [layerOpacity, setLayerOpacity] = useState(0.85);
  const [osintReport, setOsintReport] = useState<string | null>(null);
  const [anomalyAlert, setAnomalyAlert] = useState<any>(null);
  const [isLayerPanelOpen, setIsLayerPanelOpen] = useState(true);
  const [isOsintMode, setIsOsintMode] = useState(false);

  // Handle spectral mode changes
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

  // Update layer when date changes
  useEffect(() => {
    if (activeMode && isLoaded) {
      setLayer(activeMode, timeTravel.selectedDate);
    }
  }, [timeTravel.selectedDate, activeMode, isLoaded, setLayer]);

  // Handle opacity changes
  useEffect(() => {
    setOpacity(layerOpacity);
  }, [layerOpacity, setOpacity]);

  // Toggle Satellite Layer in OSINT mode for better visibility
  useEffect(() => {
    if (!mapRef.current || !isLoaded) return;
    const map = mapRef.current;
    
    try {
      if (map.getLayer("mapbox-satellite-layer")) {
        // Hide satellite if OSINT mode or 3D mode is active
        const is3D = viewport.pitch > 0;
        map.setLayoutProperty(
          "mapbox-satellite-layer",
          "visibility",
          (isOsintMode || is3D) ? "none" : "visible"
        );
      }
    } catch (err) {
      console.warn("Could not toggle satellite layer visibility:", err);
    }
  }, [isOsintMode, isLoaded, mapRef, viewport.pitch]);

  // Handle polygon creation
  const handlePolygonCreated = useCallback(
    (feature: Feature<Polygon, GeoJsonProperties>) => {
      const dateTo = timeTravel.selectedDate;
      const dateFrom = new Date(dateTo);
      dateFrom.setDate(dateFrom.getDate() - 30);
      analyzePolygon(feature, dateFrom.toISOString().split("T")[0], dateTo);
    },
    [analyzePolygon, timeTravel.selectedDate]
  );

  // AI Event Listeners
  useEffect(() => {
    const handleOsint = async (e: any) => {
      const statsData = e.detail;
      setOsintReport("Initializing secure connection...\nUplink established.\nGenerating intelligence report...");
      try {
        const res = await fetch("/api/ai/osint", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stats: statsData }),
        });
        const data = await res.json();
        if (data.report) {
          setOsintReport(data.report);
        } else {
          setOsintReport("Failed to decrypt OSINT data.");
        }
      } catch (err) {
        setOsintReport("Connection to ORB Core lost.");
      }
    };

    const handleAnomaly = async (e: any) => {
      const payload = e.detail;
      setAnomalyAlert({ loading: true });
      try {
        const isOsint = !!payload.flights;
        const endpoint = isOsint ? "/api/ai/analyze-osint" : "/api/ai/sentinel";
        const body = isOsint ? payload : { stats: payload };
        
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        setAnomalyAlert(data);
      } catch (err) {
        setAnomalyAlert({ error: "Failed to run scan." });
      }
    };

    document.addEventListener("generate-osint", handleOsint);
    document.addEventListener("run-anomaly", handleAnomaly);

    return () => {
      document.removeEventListener("generate-osint", handleOsint);
      document.removeEventListener("run-anomaly", handleAnomaly);
    };
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden" id="map-root">
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
        isOsintMode={isOsintMode}
        onToggleOsintMode={setIsOsintMode}
      />

      {/* Top-right: Event Ticker */}
      <EventTicker />

      {/* Right: Stats Panel (appears after polygon draw) */}
      <StatsPanel stats={stats} onClose={clearAnalysis} />

      {/* Bottom: Time Slider (Hidden in OSINT mode) */}
      {!isOsintMode && (
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

      {/* OSINT Panel (Replaces LayerPanel) */}
      {isOsintMode ? (
        <OsintPanel 
          isOpen={isLayerPanelOpen}
          onToggleOpen={() => setIsLayerPanelOpen(!isLayerPanelOpen)}
          mapRef={mapRef}
          viewport={viewport}
        />
      ) : (
        <LayerPanel
          activeMode={activeMode}
          onModeChange={handleModeChange}
          opacity={layerOpacity}
          onOpacityChange={setLayerOpacity}
          isOpen={isLayerPanelOpen}
          onToggleOpen={() => setIsLayerPanelOpen(!isLayerPanelOpen)}
          showToggle={false}
        />
      )}

      {/* Floating Panel Toggle */}
      <div 
        className={`fixed z-30 transition-all duration-300 ${isLayerPanelOpen ? "left-[272px] bottom-[136px]" : "left-4 bottom-[136px]"}`}
      >
        <GlowButton
          onClick={() => setIsLayerPanelOpen(!isLayerPanelOpen)}
          size="sm"
          variant={isOsintMode ? "danger" : "white"}
          active={isLayerPanelOpen}
          className="rounded-none w-24 flex items-center gap-1.5 justify-center"
        >
          {isLayerPanelOpen ? (
            <>
              <X size={12} />
              <span>Close</span>
            </>
          ) : (
            <>
              {isOsintMode ? <Target size={12} /> : <Layers size={12} />}
              <span>{isOsintMode ? "Intel" : "Layers"}</span>
            </>
          )}
        </GlowButton>
      </div>

      {/* Bottom-left: Draw Tools (Hidden in OSINT mode) */}
      {!isOsintMode && (
        <DrawTools
          mapRef={mapRef}
          isMapLoaded={isLoaded}
          onPolygonCreated={handlePolygonCreated}
          onPolygonDeleted={clearAnalysis}
          className={isLayerPanelOpen ? "left-[272px] bottom-14" : "left-4 bottom-14"}
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

      {/* OSINT Report Panel */}
      {osintReport && (
        <OsintReport report={osintReport} onClose={() => setOsintReport(null)} />
      )}

      {/* Anomaly Alert Modal */}
      {anomalyAlert && (
        <>
          {/* Backdrop */}
          <div 
            onClick={() => setAnomalyAlert(null)}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 cursor-pointer animate-fade-in"
          />
          
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[420px] max-w-[95vw] pointer-events-auto animate-fade-in">
            <GlassPanel className="p-6 bg-black/85 backdrop-blur-md rounded-none border-y-0" padding="lg">
              {anomalyAlert.loading ? (
                <div className="flex items-center justify-center gap-3">
                  <span className="cyber-spinner" />
                  <div className="text-cyan-400 font-mono text-xs animate-pulse">Scanning sector for anomalies...</div>
                </div>
              ) : anomalyAlert.error ? (
                <div className="text-plasma-pink font-mono text-xs text-center">{anomalyAlert.error}</div>
              ) : (
                <div className="flex flex-col gap-3 font-mono">
                  <h2 className={`text-sm font-bold tracking-widest ${anomalyAlert.threatLevel === 'HIGH' || anomalyAlert.threatLevel === 'CRITICAL' ? 'text-plasma-pink' : 'text-cyan-400'}`}>
                    THREAT LEVEL: {anomalyAlert.threatLevel}
                  </h2>
                  <div className="text-xs text-neutral-300 leading-relaxed w-full max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                    {anomalyAlert.analysis.split(/(?=- )/).map((paragraph: string, idx: number) => (
                      <div key={idx} className={paragraph.trim().startsWith("-") ? "ml-2 mb-2" : "mb-2 font-bold text-white"}>
                        {paragraph.trim()}
                      </div>
                    ))}
                  </div>
                  <div className="text-[10px] text-neutral-500 mt-2 flex justify-between">
                    <span>CONFIDENCE: {anomalyAlert.confidenceScore}%</span>
                    <span>ANOMALY: {anomalyAlert.anomalyDetected ? "YES" : "NO"}</span>
                  </div>
                  <GlowButton 
                    onClick={() => setAnomalyAlert(null)}
                    variant="white"
                    className="mt-4 w-full py-1.5 text-xs"
                  >
                    ACKNOWLEDGE
                  </GlowButton>
                </div>
              )}
            </GlassPanel>
          </div>
        </>
      )}
    </div>
  );
}
