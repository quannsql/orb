"use client";

import { useState } from "react";
import GlassPanel from "@/components/ui/GlassPanel";
import GlowButton from "@/components/ui/GlowButton";
import { useOsintMap } from "@/hooks/useOsintMap";
import { useMaritimeMap } from "@/hooks/useMaritimeMap";
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
  const [scanAviation, setScanAviation] = useState(true);
  const [scanMaritime, setScanMaritime] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const { flights, isScanning, lastScanTime, forceScan } = useOsintMap(mapRef, viewport, isOpen && scanAviation);
  const { ships, isConnected: isMaritimeScanning } = useMaritimeMap(mapRef, viewport, isOpen && scanMaritime);

  const handleAnalyze = () => {
    // Trigger global event for MapContainer to pick up and show AI alert
    const event = new CustomEvent("run-anomaly", {
      detail: { flights, ships: Array.from(ships.values()), bounds: mapRef.current?.getBounds() },
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
              <span className={`w-1.5 h-1.5 rounded-full ${(isScanning || isMaritimeScanning) ? "bg-cyan-glow animate-pulse" : "bg-plasma-pink"}`} />
              <span className="text-[9px] font-mono text-neutral-400">
                {(isScanning || isMaritimeScanning) ? "SCANNING..." : "ACTIVE"}
              </span>
            </div>
          </div>

          {/* Scanner Toggles */}
          <div className="flex gap-2 mb-4">
            <label className="flex items-center gap-1.5 cursor-pointer text-[10px] font-mono">
              <input type="checkbox" checked={scanAviation} onChange={(e) => setScanAviation(e.target.checked)} className="accent-plasma-pink" />
              <span className={scanAviation ? "text-plasma-pink" : "text-neutral-500"}>AVIATION</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer text-[10px] font-mono">
              <input type="checkbox" checked={scanMaritime} onChange={(e) => setScanMaritime(e.target.checked)} className="accent-cyan-400" />
              <span className={scanMaritime ? "text-cyan-400" : "text-neutral-500"}>MARITIME</span>
            </label>
          </div>

          {/* Stats Box */}
          <div className="bg-black/40 border border-plasma-pink/10 p-3 mb-4">
            <div className="flex justify-between items-baseline mb-1">
              <span className="text-[9px] font-mono text-neutral-500 uppercase">Active Targets</span>
              <span className="text-xl font-mono font-bold text-plasma-pink">
                {flights.length + (scanMaritime ? ships.size : 0)}
              </span>
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
            disabled={(flights.length === 0 && ships.size === 0) || isAnalyzing}
          >
            {isAnalyzing ? "ANALYZING TARGETS..." : "RUN AI THREAT ANALYSIS"}
          </GlowButton>

          {/* Target List */}
          <div className="flex flex-col gap-1.5">
            <h4 className="text-[9px] font-mono text-neutral-500 uppercase mb-1">Detected Signals</h4>
            
            {/* Aviation Targets */}
            {scanAviation && flights.slice(0, 10).map((f) => {
              const isEmergency = !!f.squawk_alert || !!f.emergency;
              const isMilitary  = f.category === 20;
              const borderColor = isEmergency ? "border-yellow-500/40" : isMilitary ? "border-plasma-pink/30" : "border-plasma-pink/10";
              const callsignColor = isEmergency ? "text-yellow-400" : isMilitary ? "text-plasma-pink" : "text-white";

              // Vertical rate display
              const vr = f.vert_rate;
              const vrIcon = !vr ? "" : vr > 200 ? "↑" : vr < -200 ? "↓" : "→";
              const vrColor = !vr ? "text-neutral-600" : vr > 200 ? "text-green-400" : vr < -200 ? "text-red-400" : "text-neutral-400";

              return (
                <div
                  key={f.icao24}
                  className={`p-2 bg-[rgba(255,0,85,0.04)] border ${borderColor} text-[10px] font-mono ${isEmergency ? "animate-pulse" : ""}`}
                >
                  {/* Top row: callsign + type + alert badges */}
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <div className="flex items-center gap-1 flex-wrap min-w-0">
                      <span className={`font-bold truncate ${callsignColor}`}>
                        {f.callsign}
                      </span>
                      {f.aircraft_type && (
                        <span className="text-[8px] bg-neutral-800 text-neutral-400 px-1 rounded">
                          {f.aircraft_type}
                        </span>
                      )}
                      {f.squawk_alert && (
                        <span className="text-[8px] bg-yellow-500 text-black px-1 rounded font-bold leading-none">
                          {f.squawk_alert}
                        </span>
                      )}
                      {f.is_interesting && !isMilitary && (
                        <span className="text-[8px] bg-orange-600/80 text-white px-1 rounded leading-none">★</span>
                      )}
                      {f.is_pia && (
                        <span className="text-[8px] bg-purple-700/80 text-white px-1 rounded leading-none">PIA</span>
                      )}
                      {!f.altitude && (
                        <span className="text-[8px] bg-plasma-pink text-black px-1 rounded leading-none">
                          STEALTH
                        </span>
                      )}
                    </div>
                    {/* Altitude */}
                    <span className="text-cyan-400 shrink-0">
                      {f.altitude ? `${Math.round(f.altitude / 100) * 100}m` : "---"}
                    </span>
                  </div>

                  {/* Bottom row: registration / country + vert rate + squawk */}
                  <div className="flex items-center justify-between text-[9px]">
                    <span className="text-neutral-500 truncate">
                      {f.registration ? f.registration : f.origin_country}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {vr !== null && (
                        <span className={vrColor}>{vrIcon} {Math.abs(vr) > 50 ? `${Math.round(Math.abs(vr) / 100) * 100}` : ""}</span>
                      )}
                      <span className="text-neutral-600">
                        {f.squawk && f.squawk !== "----" ? f.squawk : ""}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Maritime Targets */}
            {scanMaritime && Array.from(ships.values()).slice(0, 10).map((s) => {
              const isMilitary = s.is_military;
              const isStealth = s.is_stealth;
              const borderColor = isStealth ? "border-neutral-500/40" : isMilitary ? "border-plasma-pink/30" : "border-cyan-400/10";
              const nameColor = isStealth ? "text-neutral-500" : isMilitary ? "text-plasma-pink" : "text-white";

              return (
                <div
                  key={s.mmsi}
                  className={`p-2 bg-[rgba(0,240,255,0.04)] border ${borderColor} text-[10px] font-mono ${isStealth ? "animate-pulse" : ""}`}
                >
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <div className="flex items-center gap-1 flex-wrap min-w-0">
                      <span className={`font-bold truncate ${nameColor}`}>
                        {s.name}
                      </span>
                      <span className="text-[8px] bg-neutral-800 text-neutral-400 px-1 rounded">
                        MMSI:{s.mmsi}
                      </span>
                      {isStealth && (
                        <span className="text-[8px] bg-red-900 text-white px-1 rounded font-bold leading-none animate-pulse">
                          STEALTH
                        </span>
                      )}
                      {isMilitary && !isStealth && (
                        <span className="text-[8px] bg-plasma-pink/80 text-black px-1 rounded leading-none">MIL</span>
                      )}
                    </div>
                    <span className="text-cyan-400 shrink-0">
                      {s.sog} kn
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[9px]">
                    <span className="text-neutral-500 truncate">
                      Type: {s.ship_type}
                    </span>
                    <span className="text-neutral-600">
                      Course: {Math.round(s.cog)}°
                    </span>
                  </div>
                </div>
              );
            })}

            {(flights.length > 10 || ships.size > 10) && (
              <div className="text-[9px] font-mono text-neutral-500 text-center py-2">
                + MORE TARGETS ACTIVE
              </div>
            )}
            {flights.length === 0 && ships.size === 0 && (!isScanning && !isMaritimeScanning) && (
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
