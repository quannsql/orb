"use client";

import type { ViewportState } from "@/types/map";
import type { SpectralMode } from "@/types/sentinel";
import DataLabel from "@/components/ui/DataLabel";
import MatrixText from "@/components/ui/MatrixText";
import { formatDecimal } from "@/lib/utils";
import { Zap, ZapOff } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface CommandBarProps {
  viewport: ViewportState;
  cursorLngLat: [number, number] | null;
  activeMode: SpectralMode | null;
  isConnected: boolean;
  activeSubMode: "satcom" | "osint" | "butterfly";
  isPerformanceMode: boolean;
  onTogglePerformanceMode: () => void;
}

const getFriendlyModeName = (mode: SpectralMode | null) => {
  if (!mode) return "Base Map";
  switch (mode) {
    case "TRUE_COLOR": return "Natural Colors";
    case "NDVI": return "Crop Health";
    case "MOISTURE": return "Soil Moisture";
    default: return (mode as string).replace("_", " ");
  }
};

/**
 * Top-of-screen command bar showing coordinates, zoom, bearing, and status.
 */
export default function CommandBar({
  viewport,
  cursorLngLat,
  activeMode,
  isConnected,
  activeSubMode,
  isPerformanceMode,
  onTogglePerformanceMode,
}: CommandBarProps) {
  const { user, loading, setLoginModalOpen, logout } = useAuth();

  return (
    <div
      id="command-bar"
      className="glass-panel slide-in-down fixed top-0 left-0 right-0 w-full h-12 rounded-none border-t-0 border-x-0 z-40 flex items-center justify-between px-6 py-2"
    >
      {/* Left section: Brand and coordinates */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 pr-4 border-r border-neutral-600/30">
          <div className={`w-2 h-2 rounded-full animate-pulse ${
            activeSubMode === "osint"
              ? "bg-plasma-pink shadow-[0_0_8px_rgba(255,0,85,0.6)]"
              : activeSubMode === "butterfly"
                ? "bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.6)]"
                : "bg-cyan-glow shadow-[0_0_8px_rgba(0,240,255,0.6)]"
          }`} />
          <span className={`text-sm font-mono font-bold tracking-widest ${
            activeSubMode === "osint"
              ? "text-plasma-pink drop-shadow-[0_0_8px_rgba(255,0,85,0.8)]"
              : activeSubMode === "butterfly"
                ? "text-purple-400 drop-shadow-[0_0_8px_rgba(168,85,247,0.8)]"
                : "glow-text-cyan"
          }`}>
            ORB
          </span>
        </div>

        <div className="flex items-center gap-3 hidden sm:flex">
          <DataLabel
            label="LAT"
            value={
              cursorLngLat
                ? formatDecimal(cursorLngLat[1], 5)
                : "—"
            }
            color="white"
            size="sm"
            className="w-[85px]"
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
            className="w-[85px]"
          />
        </div>
      </div>

      {/* Middle section: Viewport & Layer badge */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3 hidden md:flex">
          <DataLabel
            label="ZOOM"
            value={viewport.zoom.toFixed(1)}
            color="white"
            size="sm"
            className="w-12"
          />
          <DataLabel
            label="BRG"
            value={`${viewport.bearing.toFixed(0)}°`}
            color="white"
            size="sm"
            className="w-12"
          />
          <DataLabel
            label="PITCH"
            value={`${viewport.pitch.toFixed(0)}°`}
            color="white"
            size="sm"
            className="w-12"
          />
        </div>


        <div className="flex items-center gap-2 pl-4 border-l border-neutral-600/30 hidden sm:flex">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[rgba(0,240,255,0.08)] border border-[rgba(0,240,255,0.2)] text-[10px] font-mono text-cyan-glow uppercase">
            {activeMode && <span className="w-1.5 h-1.5 rounded-full bg-cyan-glow" />}
            {getFriendlyModeName(activeMode)}
          </span>
        </div>
      </div>

      {/* Right section: Performance, Auth & Connection status */}
      <div className="flex items-center gap-4">
        {/* Performance Mode Toggle Button */}
        <button
          onClick={onTogglePerformanceMode}
          title={isPerformanceMode ? "Switch to High Quality Mode (Enable 3D & Globe)" : "Switch to Performance Mode (Disable 3D & Globe)"}
          className={`flex items-center gap-1.5 px-2 py-0.5 border font-mono text-[9px] uppercase tracking-wider transition-all duration-200 cursor-pointer ${
            isPerformanceMode
              ? "bg-plasma-pink/10 border-plasma-pink text-plasma-pink shadow-[0_0_8px_rgba(255,0,85,0.2)]"
              : "bg-black/40 border-neutral-600/50 text-neutral-400 hover:text-neutral-200 hover:border-neutral-400/50"
          }`}
        >
          {isPerformanceMode ? (
            <>
              <ZapOff size={10} className="animate-pulse" />
              <span>Low-GPU</span>
            </>
          ) : (
            <>
              <Zap size={10} />
              <span>HQ Mode</span>
            </>
          )}
        </button>

        {/* Connection status */}
        <div className="flex items-center gap-1.5 border-r border-neutral-600/30 pr-4">
          <div
            className={`w-1.5 h-1.5 rounded-full ${isConnected
              ? "bg-matrix-green shadow-[0_0_6px_rgba(0,255,65,0.6)]"
              : "bg-warning-amber shadow-[0_0_6px_rgba(255,190,11,0.6)]"
              }`}
          />
          <span className="text-[9px] font-mono text-neutral-400 uppercase">
            {isConnected ? (
              <MatrixText text="LINK" speed={15} color="green" disabledAnimation={isPerformanceMode} />
            ) : (
              "OFFLINE"
            )}
          </span>
        </div>

        {/* Operator Session Auth Section (Far Right) */}
        {loading ? (
          <div className="flex items-center gap-1.5 px-2 py-0.5 border border-neutral-700 bg-neutral-900 text-neutral-500 font-mono text-[9px] uppercase tracking-wider animate-pulse">
            <span>SYNC USER...</span>
          </div>
        ) : user ? (
          <div className="flex items-center gap-2 px-2.5 py-0.5 border border-matrix-green/30 bg-matrix-green/5 text-matrix-green font-mono text-[9px] tracking-wider transition-all duration-200">
            {user.avatarUrl && (
              <img
                src={user.avatarUrl}
                alt="Avatar"
                className="w-3.5 h-3.5 rounded-full bg-white/10 border border-matrix-green/30"
              />
            )}
            <span className="max-w-[70px] sm:max-w-[100px] truncate font-bold">{user.name.toUpperCase()}</span>
            <button
              onClick={logout}
              className="ml-1.5 px-1 py-[1px] bg-red-950/20 border border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-white text-[7.5px] transition-colors uppercase font-extrabold cursor-pointer"
              title="Exit Session"
            >
              EXIT
            </button>
          </div>
        ) : (
          <button
            onClick={() => setLoginModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-0.5 border border-cyan-500/30 bg-cyan-950/10 hover:bg-cyan-500/20 text-cyan-glow hover:border-cyan-500/60 font-mono text-[9px] uppercase tracking-wider transition-all duration-200 cursor-pointer shadow-[0_0_8px_rgba(0,240,255,0.05)]"
          >
            <span className="w-1 h-1 rounded-full bg-cyan-glow animate-ping shrink-0" />
            <span>LOG IN</span>
          </button>
        )}
      </div>
    </div>
  );
}
