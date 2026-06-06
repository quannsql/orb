"use client";

import type { GlassPanelProps } from "@/types/ui";

const PADDING = {
  sm: "p-2",
  md: "p-4",
  lg: "p-6",
} as const;

const GLOW_VARIANTS = {
  cyan: "glass-panel",
  green: "glass-panel glass-panel-green",
  purple: "glass-panel glass-panel-purple",
  pink: "glass-panel",
  amber: "glass-panel",
  white: "glass-panel glass-panel-white",
} as const;

/**
 * Reusable glassmorphism panel with configurable glow color.
 */
export default function GlassPanel({
  children,
  className = "",
  glowColor = "cyan",
  padding = "md",
  id,
}: GlassPanelProps) {
  return (
    <div
      id={id}
      className={`${GLOW_VARIANTS[glowColor]} ${PADDING[padding]} ${className}`}
    >
      {children}
    </div>
  );
}
