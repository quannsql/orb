"use client";

import type { ViewportState } from "@/types/map";
import type { SpectralMode } from "@/types/sentinel";
import DataLabel from "@/components/ui/DataLabel";
import MatrixText from "@/components/ui/MatrixText";
import { formatDecimal } from "@/lib/utils";

interface CommandBarProps {
  viewport: ViewportState;
  cursorLngLat: [number, number] | null;
  activeMode: SpectralMode | null;
  isConnected: boolean;
  isOsintMode: boolean;
  onToggleOsintMode: (enabled: boolean) => void;
}

/**
 * Top-of-screen command bar showing coordinates, zoom, bearing, and status.
 */
export default function CommandBar({
  viewport,
  cursorLngLat,
  activeMode,
  isConnected,
  isOsintMode,
  onToggleOsintMode,
}: CommandBarProps) {
  return (
    <div
      id="command-bar"
      className="glass-panel slide-in-down fixed top-0 left-0 right-0 w-full h-12 rounded-none border-t-0 border-x-0 z-40 flex items-center justify-between px-6 py-2"
    >
      {/* Left section: Brand and coordinates */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 pr-4 border-r border-neutral-600/30">
          <div className={`w-2 h-2 rounded-full animate-pulse ${isOsintMode ? "bg-plasma-pink shadow-[0_0_8px_rgba(255,0,85,0.6)]" : "bg-cyan-glow shadow-[0_0_8px_rgba(0,240,255,0.6)]"}`} />
          <span className={`text-sm font-mono font-bold tracking-widest ${isOsintMode ? "text-plasma-pink drop-shadow-[0_0_8px_rgba(255,0,85,0.8)]" : "glow-text-cyan"}`}>
            ORB
          </span>
        </div>

        <div className="flex items-center gap-3">
          <DataLabel
            label="LAT"
            value={
              cursorLngLat
                ? formatDecimal(cursorLngLat[1], 5)
                : "—"
            }
            color="white"
            size="sm"
          />
          <DataLabel
            label="LNG"
            value={
              cursorLngLat
                ? formatDecimal(cursorLngLat[0], 5)
                : "—"
            }
            color="white"
            size="sm"
          />
        </div>
      </div>

      {/* Middle section: Viewport & Layer badge */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          <DataLabel
            label="ZOOM"
            value={viewport.zoom.toFixed(1)}
            color="white"
            size="sm"
          />
          <DataLabel
            label="BRG"
            value={`${viewport.bearing.toFixed(0)}°`}
            color="white"
            size="sm"
          />
          <DataLabel
            label="PITCH"
            value={`${viewport.pitch.toFixed(0)}°`}
            color="white"
            size="sm"
          />
        </div>

        {/* OSINT Toggle Switch */}
        <div className="flex items-center pl-4 border-l border-neutral-600/30">
          <button
            onClick={() => onToggleOsintMode(!isOsintMode)}
            className={`relative flex items-center w-32 h-6 rounded border font-mono text-[9px] font-bold uppercase transition-all duration-300 ${
              isOsintMode
                ? "border-plasma-pink bg-[rgba(255,0,85,0.1)] text-plasma-pink"
                : "border-neutral-600/50 bg-black/40 text-neutral-400 hover:border-cyan-glow/50 hover:text-cyan-400"
            }`}
          >
            <div className={`absolute left-0 top-0 h-full w-1/2 rounded-sm transition-all duration-300 ${
              isOsintMode ? "translate-x-full bg-plasma-pink" : "bg-neutral-700"
            }`} />
            
            <div className={`relative z-10 flex-1 text-center transition-colors ${
              !isOsintMode ? "text-white" : ""
            }`}>
              SAT-COM
            </div>
            <div className={`relative z-10 flex-1 text-center transition-colors ${
              isOsintMode ? "text-white" : ""
            }`}>
              OSINT
            </div>
          </button>
        </div>

        <div className="flex items-center gap-2 pl-4 border-l border-neutral-600/30">
          {activeMode ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[rgba(0,240,255,0.08)] border border-[rgba(0,240,255,0.2)] text-[10px] font-mono text-cyan-glow uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-glow" />
              {activeMode.replace("_", " ")}
            </span>
          ) : (
            <span className="text-[10px] font-mono text-neutral-300 uppercase">
              Base Map
            </span>
          )}
        </div>
      </div>

      {/* Right section: Connection status */}
      <div className="flex items-center gap-1.5">
        <div
          className={`w-1.5 h-1.5 rounded-full ${isConnected
            ? "bg-matrix-green shadow-[0_0_6px_rgba(0,255,65,0.6)]"
            : "bg-warning-amber shadow-[0_0_6px_rgba(255,190,11,0.6)]"
            }`}
        />
        <span className="text-[9px] font-mono text-neutral-400 uppercase">
          {isConnected ? (
            <MatrixText text="LINK" speed={15} color="green" />
          ) : (
            "OFFLINE"
          )}
        </span>
      </div>
    </div>
  );
}
