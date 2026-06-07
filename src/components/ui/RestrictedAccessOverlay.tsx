"use client";

import { useAuth } from "@/hooks/useAuth";
import { Lock, ShieldAlert } from "lucide-react";
import GlowButton from "@/components/ui/GlowButton";

interface RestrictedAccessOverlayProps {
  moduleName?: string;
  className?: string;
  compact?: boolean;
}

export default function RestrictedAccessOverlay({
  moduleName = "RESTRICTED FEATURE",
  className = "",
  compact = false,
}: RestrictedAccessOverlayProps) {
  const { setLoginModalOpen } = useAuth();

  return (
    <div
      className={`absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/85 backdrop-blur-[4px] border border-white/5 p-4 text-center select-none font-mono ${className}`}
    >
      {/* Scanning lines */}
      <div className="absolute inset-0 scanline-overlay pointer-events-none opacity-20" />

      {/* Lock HUD graphics */}
      <div className="relative flex items-center justify-center mb-3">
        <div className="absolute w-12 h-12 rounded-full border border-red-500/20 animate-ping" />
        <div className="w-10 h-10 rounded-full border border-red-500/40 flex items-center justify-center bg-red-950/20 shadow-[0_0_15px_rgba(239,68,68,0.15)]">
          <Lock className="w-4 h-4 text-red-500 animate-pulse" />
        </div>
      </div>

      <div className="max-w-[260px] flex flex-col items-center">
        <span className="text-[10px] font-extrabold tracking-widest text-red-500 uppercase">
          LOGIN REQUIRED
        </span>
        <span className="text-[9px] text-neutral-500 uppercase mt-0.5 tracking-wider border-b border-neutral-800 pb-1 mb-2 font-bold w-full">
          {moduleName}
        </span>
        
        {!compact && (
          <p className="text-[8.5px] leading-relaxed text-neutral-400 mb-3.5">
            Please log in to unlock this feature, search alerts, view live activity, and run simulations.
          </p>
        )}

        <GlowButton
          onClick={() => setLoginModalOpen(true)}
          size="sm"
          variant="danger"
          className="text-[9px] font-bold py-1 px-4 tracking-wider uppercase rounded-none shadow-[0_0_10px_rgba(239,68,68,0.25)] border-red-500/30 text-red-200"
        >
          LOG IN
        </GlowButton>
      </div>
    </div>
  );
}
