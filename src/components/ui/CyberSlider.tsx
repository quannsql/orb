"use client";

import type { CyberSliderProps } from "@/types/ui";

/**
 * Custom range slider with glow track and thumb.
 */
export default function CyberSlider({
  min,
  max,
  value,
  onChange,
  step = 1,
  label,
  formatValue,
  glowColor = "cyan",
  className = "",
  id,
}: CyberSliderProps) {
  const displayValue = formatValue ? formatValue(value) : String(value);
  const progress = ((value - min) / (max - min)) * 100;

  const isWhite = glowColor === "white";

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono text-neutral-300 uppercase tracking-wider">
            {label}
          </span>
          <span className={`text-[11px] font-mono ${isWhite ? "glow-text-white" : "glow-text-cyan"}`}>
            {displayValue}
          </span>
        </div>
      )}
      <div className="relative">
        <div
          className={`absolute top-1/2 left-0 h-[4px] rounded-full bg-gradient-to-r -translate-y-1/2 pointer-events-none ${
            isWhite 
              ? "from-white/40 to-white/10" 
              : "from-cyan-glow/40 to-cyan-glow/10"
          }`}
          style={{ width: `${progress}%` }}
        />
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className={`cyber-slider ${isWhite ? "cyber-slider-white" : ""} relative z-10`}
        />
      </div>
    </div>
  );
}
