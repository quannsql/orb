"use client";

import { AlertOctagon, Flame } from "lucide-react";

interface AnomalyTickerBarProps {
  alerts: any[];
  onAlertClick: (alert: any) => void;
}

export default function AnomalyTickerBar({ alerts, onAlertClick }: AnomalyTickerBarProps) {
  if (!alerts || alerts.length === 0) return null;

  // Duplicate the list of alerts to ensure seamless continuous scrolling
  const scrollItems = [...alerts, ...alerts, ...alerts];

  const getThreatColor = (level: string) => {
    switch (level) {
      case "CRITICAL":
        return "text-plasma-pink drop-shadow-[0_0_4px_rgba(248,113,113,0.5)]";
      case "HIGH":
        return "text-amber-400 drop-shadow-[0_0_4px_rgba(251,191,36,0.5)]";
      default:
        return "text-white drop-shadow-[0_0_4px_rgba(255,255,255,0.4)]";
    }
  };

  const getThreatBg = (level: string) => {
    switch (level) {
      case "CRITICAL":
        return "bg-plasma-pink/10 border-plasma-pink/20";
      case "HIGH":
        return "bg-amber-500/10 border-amber-500/20";
      default:
        return "bg-white/5 border-white/10";
    }
  };

  return (
    <div 
      className="fixed bottom-0 left-0 right-0 h-9 z-40 bg-black/95 backdrop-blur-md border-t border-white/5 flex items-center overflow-hidden font-mono"
      id="anomaly-ticker-bar"
    >
      {/* Left Badge: Fixed status monitor indicator */}
      <div className="h-full px-4 bg-black border-r border-white/10 flex items-center gap-2 shrink-0 z-50 shadow-[5px_0_15px_rgba(0,0,0,0.8)]">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
        </span>
        <span className="text-[9px] font-extrabold tracking-widest text-white flex items-center gap-1">
          <Flame size={12} className="text-white animate-pulse" />
          WAR CABLE LINK: ACTIVE
        </span>
      </div>

      {/* Scrolling Content */}
      <div className="relative w-full h-full flex items-center overflow-hidden select-none">
        <div 
          className="flex items-center gap-12 whitespace-nowrap hover:[animation-play-state:paused] cursor-pointer"
          style={{
            animation: `ticker-scroll ${Math.max(60, alerts.length * 15)}s linear infinite`
          }}
        >
          {scrollItems.map((alert, idx) => (
            <div
              key={`${alert.id}-${idx}`}
              onClick={() => onAlertClick(alert)}
              className="flex items-center gap-2 px-2.5 py-0.5 rounded-none border hover:bg-neutral-900/40 transition-all duration-200"
              style={{
                borderColor: alert.threatLevel === "CRITICAL" ? "rgba(248, 113, 113, 0.2)" : "rgba(255, 255, 255, 0.08)",
              }}
            >
              {/* Threat Level Badge */}
              <span className={`text-[7.5px] font-extrabold px-1 py-0.2 uppercase rounded-none border ${getThreatBg(alert.threatLevel)} ${getThreatColor(alert.threatLevel)}`}>
                {alert.threatLevel}
              </span>

              {/* Alert Hotspot and Title */}
              <span className="text-[8.5px] font-bold text-neutral-200 tracking-wide uppercase">
                {alert.hotspot}
              </span>
              <span className="text-[8.5px] text-neutral-400">
                — {alert.title}
              </span>

              {/* Coordinate tag */}
              <span className="text-[7.5px] text-neutral-300 bg-white/5 px-1 border border-white/10">
                LAT: {alert.lat} | LNG: {alert.lng}
              </span>
            </div>
          ))}
        </div>
      </div>
      
      {/* Right Telemetry Badge */}
      <div className="h-full px-4 bg-black border-l border-white/10 flex items-center gap-1.5 shrink-0 z-50 shadow-[-5px_0_15px_rgba(0,0,0,0.8)] text-[8.5px] text-neutral-400">
        <AlertOctagon size={11} className="text-neutral-500" />
        <span>SECURE COMMS v4.2</span>
      </div>
    </div>
  );
}
