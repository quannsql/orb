"use client";

import GlassPanel from "@/components/ui/GlassPanel";
import GlowButton from "@/components/ui/GlowButton";

interface MapControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onToggle3D: () => void;
  onResetBearing: () => void;
  is3D: boolean;
  bearing: number;
  className?: string;
}

/**
 * Custom glassmorphism map controls (replacing default Mapbox controls).
 */
export default function MapControls({
  onZoomIn,
  onZoomOut,
  onToggle3D,
  onResetBearing,
  is3D,
  bearing,
  className = "",
}: MapControlsProps) {
  return (
    <div className={`fixed z-30 flex flex-col gap-2 transition-all duration-300 ${className}`} id="map-controls">
      <GlassPanel padding="sm" className="flex flex-col gap-1">
        {/* Zoom */}
        <GlowButton onClick={onZoomIn} size="sm" id="zoom-in" className="!px-2.5">
          +
        </GlowButton>
        <GlowButton onClick={onZoomOut} size="sm" id="zoom-out" className="!px-2.5">
          −
        </GlowButton>
      </GlassPanel>

      <GlassPanel padding="sm" className="flex flex-col gap-1">
        {/* 3D toggle */}
        <GlowButton
          onClick={onToggle3D}
          size="sm"
          active={is3D}
          id="toggle-3d"
          className="!px-2"
        >
          3D
        </GlowButton>

        {/* Compass / reset bearing */}
        <GlowButton
          onClick={onResetBearing}
          size="sm"
          id="reset-bearing"
          className="!px-2"
        >
          <span
            className="inline-block transition-transform duration-300"
            style={{ transform: `rotate(${-bearing}deg)` }}
          >
            ▲
          </span>
        </GlowButton>
      </GlassPanel>
    </div>
  );
}
