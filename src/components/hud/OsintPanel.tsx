"use client";

import { useState } from "react";
import GlassPanel from "@/components/ui/GlassPanel";
import GlowButton from "@/components/ui/GlowButton";
import { useOsintMap } from "@/hooks/useOsintMap";
import { formatDecimal } from "@/lib/utils";
import type { ViewportState } from "@/types/map";

interface OsintPanelProps {
  isOpen: boolean;
  onToggleOpen: () => void;
  mapRef: React.RefObject<mapboxgl.Map | null>;
  viewport: ViewportState;
}

export default function OsintPanel({
  isOpen,
  onToggleOpen,
  mapRef,
  viewport,
}: OsintPanelProps) {
  const { flights, isScanning, lastScanTime, forceScan } = useOsintMap(mapRef, viewport, isOpen);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAnalyze = () => {
    // Trigger global event for MapContainer to pick up and show AI alert
    const event = new CustomEvent("run-anomaly", {
      detail: { flights, bounds: mapRef.current?.getBounds() },
    });
    document.dispatchEvent(event);
  };

  return (
    <div 
      className={`fixed left-0 top-12 bottom-12 z-30 flex flex-col transition-all duration-300`} 
      id="osint-panel"
    >
      {isOpen && (
        <GlassPanel
          className="w-64 flex-1 slide-in-left cyber-scrollbar overflow-y-auto rounded-none border-y-0 border-l-0 bg-[rgba(15,0,5,0.75)] border-r-plasma-pink/30"
          padding="sm"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-plasma-pink/20">
            <h3 className="text-[10px] font-mono text-plasma-pink uppercase tracking-widest font-bold">
              OSINT Uplink
            </h3>
            <div className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${isScanning ? "bg-cyan-glow animate-pulse" : "bg-plasma-pink"}`} />
              <span className="text-[9px] font-mono text-neutral-400">
                {isScanning ? "SCANNING..." : "ACTIVE"}
              </span>
            </div>
          </div>

          {/* Stats Box */}
          <div className="bg-black/40 border border-plasma-pink/10 p-3 mb-4">
            <div className="flex justify-between items-baseline mb-1">
              <span className="text-[9px] font-mono text-neutral-500 uppercase">Active Targets</span>
              <span className="text-xl font-mono font-bold text-plasma-pink">{flights.length}</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-[9px] font-mono text-neutral-500 uppercase">Last Sweep</span>
              <span className="text-[9px] font-mono text-cyan-400">
                {lastScanTime ? lastScanTime.toLocaleTimeString() : "PENDING"}
              </span>
            </div>
          </div>

          {/* AI Scan Action */}
          <GlowButton 
            onClick={handleAnalyze}
            variant="danger"
            className="w-full text-[10px] py-2 mb-4"
            disabled={flights.length === 0 || isAnalyzing}
          >
            {isAnalyzing ? "ANALYZING TARGETS..." : "RUN AI THREAT ANALYSIS"}
          </GlowButton>

          {/* Target List (Mocked / Shortened) */}
          <div className="flex flex-col gap-2">
            <h4 className="text-[9px] font-mono text-neutral-500 uppercase mb-1">Detected Signals</h4>
            {flights.slice(0, 10).map((f) => (
              <div key={f.icao24} className="flex justify-between items-center p-2 bg-[rgba(255,0,85,0.05)] border border-plasma-pink/10 text-[10px] font-mono">
                <div className="flex flex-col">
                  <span className="text-white font-bold flex items-center gap-1.5">
                    {f.callsign || "UNKNOWN"}
                    {!f.altitude && (
                      <span className="bg-plasma-pink text-black px-1 py-0.5 rounded-sm text-[8px] animate-pulse leading-none">
                        STEALTH
                      </span>
                    )}
                  </span>
                  <span className="text-neutral-500">{f.origin_country}</span>
                </div>
                <div className="flex flex-col text-right">
                  <span className="text-cyan-400">{f.altitude ? formatDecimal(f.altitude, 0) : "---"}m</span>
                  <span className="text-neutral-500">SQK: {f.squawk || "---"}</span>
                </div>
              </div>
            ))}
            {flights.length > 10 && (
              <div className="text-[9px] font-mono text-neutral-500 text-center py-2">
                + {flights.length - 10} MORE TARGETS
              </div>
            )}
            {flights.length === 0 && !isScanning && (
              <div className="text-[9px] font-mono text-neutral-500 text-center py-4 border border-dashed border-neutral-700">
                NO TARGETS IN SECTOR
              </div>
            )}
          </div>
        </GlassPanel>
      )}
    </div>
  );
}
