"use client";

import type { ViewportState } from "@/types/map";
import type { SpectralMode } from "@/types/sentinel";
import DataLabel from "@/components/ui/DataLabel";
import MatrixText from "@/components/ui/MatrixText";
import { formatDecimal } from "@/lib/utils";
import { Zap, ZapOff } from "lucide-react";

interface CommandBarProps {
  viewport: ViewportState;
  cursorLngLat: [number, number] | null;
  activeMode: SpectralMode | null;
  isConnected: boolean;
  activeSubMode: "satcom" | "osint" | "butterfly";
  onChangeSubMode: (mode: "satcom" | "osint" | "butterfly") => void;
  isPerformanceMode: boolean;
  onTogglePerformanceMode: () => void;
}

/**
 * Top-of-screen command bar showing coordinates, zoom, bearing, and status.
 */
export default function CommandBar({
  viewport,
  cursorLngLat,
  activeMode,
  isConnected,
  activeSubMode,
  onChangeSubMode,
  isPerformanceMode,
  onTogglePerformanceMode,
}: CommandBarProps) {
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

        {/* 3-Way Mode Toggle Switch */}
        <div className="flex items-center pl-0 md:pl-4 border-l-0 md:border-l border-neutral-600/30">
          <div className="relative flex items-center w-48 sm:w-56 h-6 rounded border border-neutral-600/50 bg-black/40 font-mono text-[8px] font-bold uppercase overflow-hidden">
            {/* Sliding Background */}
            <div 
              className={`absolute top-0 bottom-0 w-[33.3%] rounded-sm transition-all duration-300 ${
                activeSubMode === "osint"
                  ? "left-[33.3%] bg-plasma-pink"
                  : activeSubMode === "butterfly"
                    ? "left-[66.6%] bg-purple-600"
                    : "left-0 bg-neutral-700"
              }`} 
            />
            
            <button
              onClick={() => onChangeSubMode("satcom")}
              className={`relative z-10 flex-1 text-center transition-colors py-1 ${
                activeSubMode === "satcom" ? "text-white font-bold" : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              SAT-COM
            </button>
            <button
              onClick={() => onChangeSubMode("osint")}
              className={`relative z-10 flex-1 text-center transition-colors py-1 ${
                activeSubMode === "osint" ? "text-white font-bold" : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              OSINT
            </button>
            <button
              onClick={() => onChangeSubMode("butterfly")}
              className={`relative z-10 flex-1 text-center transition-colors py-1 ${
                activeSubMode === "butterfly" ? "text-white font-bold" : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              BUTTERFLY
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 pl-4 border-l border-neutral-600/30 hidden sm:flex">
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

      {/* Right section: Performance & Connection status */}
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

        <div className="flex items-center gap-1.5">
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
      </div>
    </div>
  );
}
