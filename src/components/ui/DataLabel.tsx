"use client";

import { useEffect, useRef, useState } from "react";
import type { DataLabelProps } from "@/types/ui";

const COLOR_CLASSES = {
  cyan: "glow-text-cyan",
  green: "glow-text-green",
  purple: "glow-text-purple",
  pink: "glow-text-cyan",
  amber: "glow-text-amber",
  white: "glow-text-white",
} as const;

/**
 * Monospace data label with flash animation on value change.
 */
export default function DataLabel({
  label,
  value,
  unit,
  color = "cyan",
  className = "",
  size = "md",
}: DataLabelProps) {
  const [flash, setFlash] = useState(false);
  const prevValueRef = useRef(value);

  useEffect(() => {
    if (prevValueRef.current !== value) {
      setFlash(true);
      const timer = setTimeout(() => setFlash(false), 600);
      prevValueRef.current = value;
      return () => clearTimeout(timer);
    }
  }, [value]);

  const valueSize = size === "sm" ? "text-[11px]" : "text-sm";

  return (
    <div className={`flex flex-col ${className}`}>
      <span className="text-[8px] font-mono text-neutral-500 uppercase tracking-wider mb-0.5">
        {label}
      </span>
      <span
        className={`${valueSize} font-mono ${COLOR_CLASSES[color]} ${flash ? "data-flash" : ""}`}
      >
        {value}
        {unit && (
          <span className="text-[9px] text-neutral-500 ml-0.5">{unit}</span>
        )}
      </span>
    </div>
  );
}
