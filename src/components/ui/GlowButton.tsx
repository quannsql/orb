"use client";

import type { GlowButtonProps } from "@/types/ui";

const VARIANT_CLASSES = {
  primary: "btn-glow",
  success: "btn-glow btn-glow-green",
  danger: "btn-glow btn-glow-pink",
  ghost: "btn-glow bg-transparent",
  white: "btn-glow btn-glow-white",
} as const;

const SIZE_CLASSES = {
  sm: "px-2 py-1 text-[10px]",
  md: "px-3 py-1.5 text-xs",
  lg: "px-4 py-2 text-sm",
} as const;

/**
 * Neon-glow interactive button.
 */
export default function GlowButton({
  children,
  variant = "primary",
  onClick,
  disabled = false,
  loading = false,
  className = "",
  active = false,
  size = "md",
  id,
  type = "button",
  ...props
}: GlowButtonProps) {
  return (
    <button
      id={id}
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        ${VARIANT_CLASSES[variant]}
        ${SIZE_CLASSES[size]}
        ${active ? (variant === "white" ? "!bg-[rgba(255,255,255,0.18)] shadow-[0_0_16px_rgba(255,255,255,0.25)]" : "!bg-[rgba(0,240,255,0.12)] shadow-[0_0_16px_rgba(0,240,255,0.4)]") : ""}
        ${disabled ? "opacity-40 cursor-not-allowed" : ""}
        ${className}
        inline-flex items-center justify-center gap-2
      `}
      {...props}
    >
      {loading && <span className="cyber-spinner" />}
      {children}
    </button>
  );
}
