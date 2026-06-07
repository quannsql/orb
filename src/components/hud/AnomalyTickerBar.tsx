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
        return "text-plasma-pink drop-shadow-[0_0_4px_#ff006e]";
      case "HIGH":
        return "text-amber-500 drop-shadow-[0_0_4px_#ffbe0b]";
      default:
        return "text-cyan-400 drop-shadow-[0_0_4px_#00f0ff]";
    }
  };

  const getThreatBg = (level: string) => {
    switch (level) {
      case "CRITICAL":
        return "bg-plasma-pink/15 border-plasma-pink/35";
      case "HIGH":
        return "bg-amber-500/15 border-amber-500/35";
      default:
        return "bg-cyan-400/15 border-cyan-400/35";
    }
  };

  return (
    <div 
      className="fixed bottom-0 left-0 right-0 h-9 z-40 bg-black/90 backdrop-blur-md border-t border-white/10 flex items-center overflow-hidden font-mono"
      id="anomaly-ticker-bar"
    >
      {/* Left Badge: Fixed status monitor indicator */}
      <div className="h-full px-4 bg-void border-r border-white/15 flex items-center gap-2 shrink-0 z-50 shadow-[5px_0_15px_rgba(0,0,0,0.6)]">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
        </span>
        <span className="text-[10px] font-extrabold tracking-widest text-white flex items-center gap-1">
          <Flame size={12} className="text-plasma-pink animate-pulse" />
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
              className="flex items-center gap-2 px-2.5 py-0.5 rounded-sm border hover:bg-neutral-900/60 transition-all duration-200"
              style={{
                borderColor: alert.threatLevel === "CRITICAL" ? "rgba(255, 0, 110, 0.25)" : "rgba(255, 255, 255, 0.1)",
              }}
            >
              {/* Threat Level Badge */}
              <span className={`text-[8px] font-extrabold px-1 py-0.2 uppercase rounded-xs border ${getThreatBg(alert.threatLevel)} ${getThreatColor(alert.threatLevel)}`}>
                {alert.threatLevel}
              </span>

              {/* Alert Hotspot and Title */}
              <span className="text-[9px] font-bold text-neutral-200 tracking-wide uppercase">
                {alert.hotspot}
              </span>
              <span className="text-[9px] text-neutral-400">
                — {alert.title}
              </span>

              {/* Coordinate tag */}
              <span className="text-[8px] text-cyan-400 bg-cyan-950/20 px-1 border border-cyan-800/20">
                LAT: {alert.lat} | LNG: {alert.lng}
              </span>
            </div>
          ))}
        </div>
      </div>
      
      {/* Right Telemetry Badge */}
      <div className="h-full px-4 bg-void border-l border-white/15 flex items-center gap-1.5 shrink-0 z-50 shadow-[-5px_0_15px_rgba(0,0,0,0.6)] text-[9px] text-neutral-400">
        <AlertOctagon size={11} className="text-neutral-500" />
        <span>SECURE COMMS v4.2</span>
      </div>
    </div>
  );
}
