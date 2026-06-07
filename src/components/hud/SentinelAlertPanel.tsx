"use client";

import { useState, useEffect, useCallback } from "react";
import GlassPanel from "@/components/ui/GlassPanel";
import GlowButton from "@/components/ui/GlowButton";
import { AlertOctagon, Terminal, ShieldAlert, X, Eye } from "lucide-react";

interface SentinelAlertPanelProps {
  onFlyTo: (lng: number, lat: number, zoom?: number) => void;
  onAddHazardMarker: (alert: any) => void;
}

function formatRelativeTime(timestampStr: string): string {
  try {
    const diffMs = Date.now() - new Date(timestampStr).getTime();
    if (diffMs < 0) return "JUST NOW";
    const diffSecs = Math.floor(diffMs / 1000);
    if (diffSecs < 60) return `${diffSecs}S AGO`;
    const diffMins = Math.floor(diffSecs / 60);
    if (diffMins < 60) return `${diffMins}M AGO`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}H AGO`;
    return new Date(timestampStr).toLocaleDateString([], { month: "short", day: "numeric" }).toUpperCase();
  } catch (e) {
    return "ACTIVE";
  }
}

export default function SentinelAlertPanel({
  onFlyTo,
  onAddHazardMarker
}: SentinelAlertPanelProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [activeAlert, setActiveAlert] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [isExpanded, setIsExpanded] = useState(true);

  // Fetch history on mount
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch("/api/ai/sentinel-sweep");
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setHistory(data);
          }
        }
      } catch (err) {
        console.error("Failed to fetch sentinel history:", err);
      }
    };
    fetchHistory();
  }, []);

  const triggerSweep = useCallback(async (force = false) => {
    if (isScanning) return;
    setIsScanning(true);
    
    // Dispatch system ticker event
    document.dispatchEvent(
      new CustomEvent("add-ticker-event", {
        detail: {
          message: force 
            ? "GLOBAL INCIDENT RADAR :: Forcing global scan..."
            : "GLOBAL INCIDENT RADAR :: Scanning for alerts...",
          type: "system"
        }
      })
    );

    try {
      const response = await fetch("/api/ai/sentinel-sweep", { 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force })
      });
      if (!response.ok) throw new Error("Sweep failed");
      const data = await response.json();
      
      setActiveAlert(data);
      onAddHazardMarker(data);

      // Add to local history list (preventing duplicates and limiting to 15)
      setHistory((prev) => {
        const filtered = prev.filter((item) => item.id !== data.id);
        return [data, ...filtered].slice(0, 15);
      });
      
      // Dispatch alert event to ticker
      document.dispatchEvent(
        new CustomEvent("add-ticker-event", {
          detail: {
            message: `CRITICAL DETECTED :: ${data.title} - Threat: ${data.threatLevel}`,
            type: "alert"
          }
        })
      );
    } catch (err) {
      console.error("Sentinel sweep error:", err);
    } finally {
      setIsScanning(false);
    }
  }, [isScanning, onAddHazardMarker]);

  // Set up periodic sweep (every 90s) - respect cooldown
  useEffect(() => {
    // Initial delay so it doesn't fire immediately upon load
    const initialTimer = setTimeout(() => {
      triggerSweep(false);
    }, 15000);

    const interval = setInterval(() => {
      triggerSweep(false);
    }, 90000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [triggerSweep]);

  // Listen to open briefing event from map markers
  useEffect(() => {
    const handleOpenMapBriefing = (e: any) => {
      const alertData = e.detail;
      setActiveAlert(alertData);
      onFlyTo(alertData.lng, alertData.lat, 8);
      setShowModal(true);
    };

    document.addEventListener("open-sentinel-briefing", handleOpenMapBriefing);
    return () => {
      document.removeEventListener("open-sentinel-briefing", handleOpenMapBriefing);
    };
  }, [onFlyTo]);

  const handleOpenBriefing = () => {
    if (!activeAlert) return;
    onFlyTo(activeAlert.lng, activeAlert.lat, 8);
    setShowModal(true);
  };

  const handleDismiss = () => {
    setActiveAlert(null);
  };

  const handleHistoryItemClick = (alert: any) => {
    setActiveAlert(alert);
    onFlyTo(alert.lng, alert.lat, 8);
    setShowModal(true);
  };

  return (
    <>
      {/* ─── Floating Top Alert Notification ─── */}
      {activeAlert && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-40 w-[500px] max-w-[90vw] animate-bounce-short pointer-events-auto">
          <GlassPanel 
            glowColor="pink" 
            padding="sm"
            className="border-plasma-pink bg-black/90 border-t-2 border-x-0 border-b-0"
          >
            <div className="flex items-center gap-3 font-mono">
              <div className="bg-plasma-pink/20 p-2 border border-plasma-pink/40 animate-pulse">
                <AlertOctagon className="text-plasma-pink w-5 h-5" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[8px] bg-plasma-pink text-black px-1 font-bold tracking-widest uppercase">
                    {activeAlert.threatLevel} ALERT
                  </span>
                  <span className="text-[9px] text-neutral-500">{activeAlert.id}</span>
                </div>
                <h4 className="text-[11px] font-bold text-white truncate mt-0.5 uppercase tracking-wide">
                  {activeAlert.title}
                </h4>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <GlowButton 
                  onClick={handleOpenBriefing}
                  variant="danger" 
                  size="sm"
                  className="!py-1 !px-2.5 text-[9px] h-7"
                >
                  <Eye size={10} className="mr-1" /> BRIEFING
                </GlowButton>
                
                <button 
                  onClick={handleDismiss}
                  className="p-1 hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors border border-transparent hover:border-neutral-700"
                >
                  <X size={12} />
                </button>
              </div>
            </div>
          </GlassPanel>
        </div>
      )}

      {/* ─── Manual Sweep Control (Floating in HUD) ─── */}
      <div className="fixed top-14 left-4 z-20 pointer-events-auto">
        <GlassPanel padding="sm" className="bg-black/70 py-1.5 px-3">
          <div className="flex items-center gap-2.5 font-mono text-[9px]">
            <Terminal size={11} className={`${isScanning ? "text-cyan-400 animate-spin" : "text-neutral-400"}`} />
            <span className="text-neutral-300">INCIDENT SWEEPER:</span>
            <button
              onClick={() => triggerSweep(true)}
              disabled={isScanning}
              className={`font-bold hover:underline transition-colors uppercase ${
                isScanning ? "text-cyan-400 animate-pulse" : "text-plasma-pink hover:text-plasma-pink/80"
              }`}
            >
              {isScanning ? "SCANNING SECTORS..." : "SCAN SECTORS"}
            </button>
          </div>
        </GlassPanel>
      </div>

      {/* ─── Warning Log Timeline ─── */}
      <div className="fixed top-[92px] left-4 z-20 pointer-events-auto w-64 font-mono">
        <GlassPanel padding="sm" className="bg-black/85 border-t-0 border-x-0 border-b-2 border-b-plasma-pink/40">
          <div className="flex items-center justify-between border-b border-white/10 pb-1.5 mb-1.5">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-plasma-pink animate-pulse"></div>
              <span className="text-[10px] font-bold text-white tracking-wider">Incident Alerts Log</span>
            </div>
            <button 
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-[8px] text-neutral-400 hover:text-white uppercase transition-colors"
            >
              {isExpanded ? "[ Hide ]" : `[ Show (${history.length}) ]`}
            </button>
          </div>

          {isExpanded && (
            <div className="max-h-56 overflow-y-auto pr-1 flex flex-col gap-1.5 scrollbar-thin scrollbar-thumb-neutral-800">
              {history.length === 0 ? (
                <div className="text-[8px] text-neutral-500 py-4 text-center italic">
                  NO ACTIVE ALERTS IN LOG
                </div>
              ) : (
                history.map((alert) => {
                  const threatColors: { [key: string]: string } = {
                    CRITICAL: "text-plasma-pink border-plasma-pink/30 hover:border-plasma-pink bg-plasma-pink/5",
                    HIGH: "text-amber-500 border-amber-500/30 hover:border-amber-500 bg-amber-500/5",
                    ELEVATED: "text-cyan-400 border-cyan-400/30 hover:border-cyan-400 bg-cyan-400/5"
                  };
                  
                  const dotColors: { [key: string]: string } = {
                    CRITICAL: "bg-plasma-pink shadow-[0_0_6px_#ec4899]",
                    HIGH: "bg-amber-500 shadow-[0_0_6px_#f59e0b]",
                    ELEVATED: "bg-cyan-400 shadow-[0_0_6px_#06b6d4]"
                  };

                  const timeStr = alert.timestamp 
                    ? formatRelativeTime(alert.timestamp)
                    : "ACTIVE";

                  return (
                    <div 
                      key={alert.id}
                      onClick={() => handleHistoryItemClick(alert)}
                      className={`group flex flex-col gap-1 p-1.5 border rounded-xs cursor-pointer transition-all duration-200 ${threatColors[alert.threatLevel] || "text-white border-neutral-800"}`}
                    >
                      <div className="flex items-center justify-between text-[8px] font-bold">
                        <div className="flex items-center gap-1">
                          <span className={`w-1 h-1 rounded-full ${dotColors[alert.threatLevel] || "bg-white"}`}></span>
                          <span className="uppercase tracking-wider font-extrabold">{alert.threatLevel}</span>
                        </div>
                        <span className="text-neutral-500 group-hover:text-neutral-300 transition-colors">{timeStr}</span>
                      </div>
                      
                      <div className="text-[9px] font-semibold truncate uppercase tracking-wide text-neutral-200">
                        {alert.hotspot}
                      </div>

                      <div className="text-[7.5px] text-neutral-400 line-clamp-1 group-hover:text-neutral-300 transition-colors">
                        {alert.type}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </GlassPanel>
      </div>

      {/* ─── Detailed Intelligence Recon Briefing Modal ─── */}
      {showModal && activeAlert && (
        <>
          <div 
            onClick={() => setShowModal(false)}
            className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 animate-fade-in"
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-55 w-[480px] max-w-[95vw] pointer-events-auto animate-fade-in">
            <GlassPanel glowColor="pink" padding="lg" className="bg-black/95 border-y-0 border-l-0 border-r-plasma-pink/30">
              <div className="flex flex-col gap-4 font-mono text-xs">
                {/* Modal Header */}
                <div className="flex items-center justify-between border-b border-plasma-pink/20 pb-2.5">
                  <div className="flex items-center gap-2">
                    <ShieldAlert size={14} className="text-plasma-pink animate-pulse" />
                    <h3 className="text-[11px] font-bold text-plasma-pink uppercase tracking-widest">
                      INCIDENT DETAILS
                    </h3>
                  </div>
                  <span className="text-[9px] text-neutral-500">{activeAlert.id}</span>
                </div>

                {/* Hotspot & Coordinates */}
                <div className="grid grid-cols-2 gap-2 bg-neutral-900/40 border border-plasma-pink/10 p-2 text-[10px]">
                  <div>
                    <span className="text-neutral-500 text-[8px] uppercase block">HOTSPOT</span>
                    <span className="text-white font-bold">{activeAlert.hotspot}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500 text-[8px] uppercase block">COORDINATES</span>
                    <span className="text-cyan-400">LAT: {activeAlert.lat} | LNG: {activeAlert.lng}</span>
                  </div>
                </div>

                {/* Report Section */}
                <div className="flex flex-col gap-1">
                  <span className="text-neutral-500 text-[8px] uppercase">TACTICAL ANALYSIS</span>
                  <p className="text-neutral-200 leading-relaxed text-[10px]">
                    {activeAlert.analysis}
                  </p>
                </div>

                <div className="flex flex-col gap-1 border-t border-plasma-pink/10 pt-2.5">
                  <span className="text-neutral-500 text-[8px] uppercase">MACRO IMPACT VECTORS</span>
                  <p className="text-neutral-200 leading-relaxed text-[10px]">
                    {activeAlert.impact}
                  </p>
                </div>

                {/* Footer Controls */}
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/10 text-[9px] text-neutral-500">
                  <span>STATUS: {activeAlert.status}</span>
                  <GlowButton 
                    onClick={() => setShowModal(false)}
                    variant="danger" 
                    className="py-1 px-4 text-[9px]"
                  >
                    CLOSE
                  </GlowButton>
                </div>
              </div>
            </GlassPanel>
          </div>
        </>
      )}
    </>
  );
}
