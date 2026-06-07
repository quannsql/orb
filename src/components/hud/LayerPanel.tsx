"use client";

import { useState } from "react";
import type { SpectralMode } from "@/types/sentinel";
import { SPECTRAL_LAYERS } from "@/lib/constants";
import GlassPanel from "@/components/ui/GlassPanel";
import GlowButton from "@/components/ui/GlowButton";
import CyberSlider from "@/components/ui/CyberSlider";

interface LayerPanelProps {
  activeMode: SpectralMode | null;
  onModeChange: (mode: SpectralMode | null) => void;
  opacity: number;
  onOpacityChange: (opacity: number) => void;
  isOpen?: boolean;
  onToggleOpen?: () => void;
  showToggle?: boolean;
}

/**
 * Left-side collapsible panel for spectral layer selection.
 */
export default function LayerPanel({
  activeMode,
  onModeChange,
  opacity,
  onOpacityChange,
  isOpen: propsIsOpen,
  onToggleOpen,
  showToggle = true,
}: LayerPanelProps) {
  const [localIsOpen, setLocalIsOpen] = useState(true);
  const isOpen = propsIsOpen !== undefined ? propsIsOpen : localIsOpen;
  const toggleIsOpen = () => {
    if (onToggleOpen) {
      onToggleOpen();
    } else {
      setLocalIsOpen(!localIsOpen);
    }
  };

  return (
    <div 
      className={`fixed left-4 bottom-[180px] z-30 flex flex-col transition-all duration-300 h-fit max-h-[calc(100vh-380px)]`} 
      id="layer-panel"
    >
      {/* Toggle button */}
      {showToggle && (
        <GlowButton
          onClick={toggleIsOpen}
          size="sm"
          variant="white"
          active={isOpen}
          className="rounded-none border-l-0 self-start !py-2.5 !px-3"
          id="layer-panel-toggle"
        >
          {isOpen ? "◁ LAYERS" : "▷ LAYERS"}
        </GlowButton>
      )}

      {isOpen && (
        <GlassPanel
          className="w-56 h-fit slide-in-left cyber-scrollbar overflow-y-auto"
          padding="sm"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-neutral-600/20">
            <h3 className="text-[10px] font-mono text-neutral-300 uppercase tracking-widest">
              Spectral Layers
            </h3>
            <span className="text-[9px] font-mono text-neutral-500">
              SENTINEL-2
            </span>
          </div>

          {/* Layer options */}
          <div className="flex flex-col gap-1">
            {SPECTRAL_LAYERS.map((layer) => {
              const isActive = activeMode === layer.mode;
              return (
                <button
                  key={layer.id}
                  id={`layer-${layer.id}`}
                  onClick={() =>
                    onModeChange(isActive ? null : layer.mode)
                  }
                  className={`
                    flex items-start gap-2.5 p-2 rounded-none text-left transition-all duration-200
                    ${
                      isActive
                        ? "bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.15)]"
                        : "bg-transparent border border-transparent hover:bg-[rgba(255,255,255,0.03)] hover:border-[rgba(255,255,255,0.05)]"
                    }
                  `}
                >
                  <span className="text-lg mt-0.5">{layer.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-mono font-medium ${
                          isActive ? "glow-text-white font-bold" : "text-neutral-300"
                        }`}
                      >
                        {layer.label}
                      </span>
                      <div
                        className={`cyber-toggle toggle-white ${isActive ? "active" : ""}`}
                        style={{ transform: "scale(0.7)" }}
                      />
                    </div>
                    <p className="text-[9px] text-neutral-400 mt-1 leading-relaxed">
                      {layer.description}
                    </p>

                    {/* Color legend */}
                    {isActive && layer.legendColors.length > 0 && (
                      <div className="mt-2">
                        <div
                          className="legend-gradient"
                          style={{
                            background: `linear-gradient(90deg, ${layer.legendColors.join(", ")})`,
                          }}
                        />
                        <div className="flex justify-between mt-1">
                          {layer.legendLabels.map((lbl, i) => (
                            <span
                              key={i}
                              className="text-[8px] font-mono text-neutral-500"
                            >
                              {lbl}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Opacity slider */}
          {activeMode && (
            <div className="mt-2 pt-2 border-t border-neutral-600/20">
              <CyberSlider
                id="layer-opacity-slider"
                min={0}
                max={100}
                value={Math.round(opacity * 100)}
                onChange={(v) => onOpacityChange(v / 100)}
                label="Layer Opacity"
                formatValue={(v) => `${v}%`}
                glowColor="white"
              />
            </div>
          )}
        </GlassPanel>
      )}
    </div>
  );
}
