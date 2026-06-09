"use client";

import { useState, useEffect } from "react";
import GlassPanel from "@/components/ui/GlassPanel";
import GlowButton from "@/components/ui/GlowButton";
import CyberSlider from "@/components/ui/CyberSlider";
import MatrixText from "@/components/ui/MatrixText";
import { 
  ChevronDown, 
  ChevronUp, 
  Terminal, 
  Radio, 
  ShieldAlert, 
  AlertTriangle, 
  Layers, 
  Target, 
  Play, 
  RotateCcw,
  Plane,
  Anchor,
  Activity,
  UserCheck,
  X
} from "lucide-react";
import type { SpectralMode } from "@/types/sentinel";
import { useAuth } from "@/hooks/useAuth";
import RestrictedAccessOverlay from "@/components/ui/RestrictedAccessOverlay";
import MarkdownRenderer from "@/components/ui/MarkdownRenderer";
import DebateTranscriptViewer from "@/components/ui/DebateTranscriptViewer";


interface UnifiedWorkspaceProps {
  // Mode & Autopilot
  activeSubMode: "satcom" | "osint" | "butterfly" | "gaia";
  onChangeSubMode: (mode: "satcom" | "osint" | "butterfly" | "gaia") => void;
  isAutopilot: boolean;
  onToggleAutopilot: () => void;
  
  // Sentinel Layers
  activeMode: SpectralMode | null;
  onModeChange: (mode: SpectralMode | null) => void;
  layerOpacity: number;
  onOpacityChange: (val: number) => void;

  // OSINT Signals
  scanAviation: boolean;
  setScanAviation: (val: boolean) => void;
  scanMaritime: boolean;
  setScanMaritime: (val: boolean) => void;
  flights: any[];
  ships: Map<any, any>;
  isScanningTargets: boolean;
  onRunThreatAnalysis: () => void;
  isAnalyzingThreats: boolean;
  threatAnalysisResult: any;
  onClearThreatAnalysis: () => void;

  // Sentinel Alert & Briefings
  activeBriefing: any;
  onCloseBriefing: () => void;
  history: any[];
  onHistoryItemClick: (alert: any) => void;
  isScanningRadar: boolean;
  onForceSweep: () => void;

  // Butterfly Geopolitical Simulation
  clickedLatLng: { lng: number; lat: number } | null;
  onStartSimulation: (scenario: string) => void;
  onClearSimulation: () => void;
  simulationResult: any;
  simulationLoading: boolean;
  simulationStep: number;
  onClose?: () => void;

  // Gaia Shield
  disasters?: any[];
  isScanningDisasters?: boolean;
  onRefreshDisasters?: () => void;
  onDisasterItemClick?: (disaster: any) => void;
  activeDisaster?: any;
  onCloseDisaster?: () => void;
}

const SPECTRAL_MODES: { value: SpectralMode | null; label: string; desc: string }[] = [
  { value: null, label: "STANDARD SATELLITE MAP", desc: "Base Mapbox terrain view" },
  { value: "TRUE_COLOR", label: "NATURAL COLORS (RGB)", desc: "Standard satellite camera imagery (RGB)" },
  { value: "NDVI", label: "CROP HEALTH INDEX (NDVI)", desc: "Monitors vegetation, farming health & crop density" },
  { value: "MOISTURE", label: "SOIL MOISTURE INDEX (NDMI)", desc: "Monitors water saturation, irrigation & dry risk" },
];

const PRESETS = [
  {
    name: "Strait of Hormuz Blockade",
    scenario: "Military block of shipping channels, shutting down oil transport and raising regional combat alert.",
    lng: 56.25,
    lat: 26.56,
  },
  {
    name: "Taiwan Strait Escalation",
    scenario: "Naval drills block semiconductor exports, threatening global electronic supply chains.",
    lng: 120.0,
    lat: 24.5,
  },
  {
    name: "Bab-el-Mandeb USV Attack",
    scenario: "Geopolitical event causing supply chain disruptions and political shifts.",
    lng: 43.33,
    lat: 12.60,
  }
];

export default function UnifiedWorkspace({
  activeSubMode,
  onChangeSubMode,
  isAutopilot,
  onToggleAutopilot,
  activeMode,
  onModeChange,
  layerOpacity,
  onOpacityChange,
  scanAviation,
  setScanAviation,
  scanMaritime,
  setScanMaritime,
  flights,
  ships,
  isScanningTargets,
  onRunThreatAnalysis,
  isAnalyzingThreats,
  threatAnalysisResult,
  onClearThreatAnalysis,
  activeBriefing,
  onCloseBriefing,
  history,
  onHistoryItemClick,
  isScanningRadar,
  onForceSweep,
  clickedLatLng,
  onStartSimulation,
  onClearSimulation,
  simulationResult,
  simulationLoading,
  simulationStep,
  onClose,
  disasters = [],
  isScanningDisasters = false,
  onRefreshDisasters,
  onDisasterItemClick,
  activeDisaster,
  onCloseDisaster
}: UnifiedWorkspaceProps) {
  const { user } = useAuth();
  // Accordion Section States
  const [expandTelemetry, setExpandTelemetry] = useState(true);

  const [expandLayers, setExpandLayers] = useState(true);
  const [expandTargets, setExpandTargets] = useState(true);
  const [expandBriefs, setExpandBriefs] = useState(true);
  const [expandSimulation, setExpandSimulation] = useState(true);
  const [expandHistory, setExpandHistory] = useState(true);

  // Simulation tab state
  const [simTab, setSimTab] = useState<"summary" | "military" | "economic" | "social">("summary");
  const [scenarioInput, setScenarioInput] = useState("");

  // Sync scenario text when active briefing, active disaster or clicked coordinates change
  useEffect(() => {
    if (activeBriefing) {
      setScenarioInput(`${activeBriefing.title}: ${activeBriefing.analysis}`);
    } else if (activeDisaster) {
      setScenarioInput(`Natural Disaster: ${activeDisaster.title}. Place: ${activeDisaster.place}. Evaluate the humanitarian fallout, infrastructure damage, and supply chain delays caused by this event.`);
    } else if (clickedLatLng) {
      if (!scenarioInput) {
        setScenarioInput("Geopolitical event causing supply chain disruptions and political shifts.");
      }
    }
  }, [clickedLatLng, activeBriefing, activeDisaster]);

  const runSimulation = () => {
    if (!scenarioInput.trim()) return;
    onStartSimulation(scenarioInput);
  };

  const handlePresetSelect = (preset: typeof PRESETS[number]) => {
    setScenarioInput(preset.scenario);
    // Dispatch event to fly map
    const customEvent = new CustomEvent("fly-to-preset", { detail: { lng: preset.lng, lat: preset.lat, zoom: 6 } });
    document.dispatchEvent(customEvent);
  };

  // Auto-expand sections based on mode selection or new data triggers
  useEffect(() => {
    if (activeSubMode === "satcom") {
      setExpandLayers(true);
    } else if (activeSubMode === "osint") {
      setExpandTargets(true);
      setExpandBriefs(true);
    } else if (activeSubMode === "butterfly") {
      setExpandSimulation(true);
    }
  }, [activeSubMode]);

  // Expand briefing card automatically when a briefing loads
  useEffect(() => {
    if (activeBriefing || threatAnalysisResult) {
      setExpandBriefs(true);
    }
  }, [activeBriefing, threatAnalysisResult]);

  return (
    <div
      className="fixed left-4 right-4 md:right-auto top-12 bottom-12 z-30 w-auto md:w-[320px] max-w-[calc(100%-32px)] flex flex-col font-mono text-xs select-text pointer-events-auto transition-all duration-300"
      id="unified-workspace"
    >
      <GlassPanel
        glowColor="white"
        padding="sm"
        className="w-full h-full flex flex-col border border-white/10 bg-black/90 rounded-none shadow-[0_0_20px_rgba(255,255,255,0.05)]"
      >
        {/* Workspace Title Header */}
        <div className="flex items-center justify-between pb-2 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2">
            {onClose && (
              <button
                onClick={onClose}
                className="md:hidden p-0.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white mr-1 border border-white/20 rounded-none"
              >
                <X size={11} />
              </button>
            )}
            <Terminal size={12} className="text-white animate-pulse" />
            <span className="text-[10px] font-extrabold tracking-wider uppercase text-white">
              COMMAND CENTER WORKSPACE
            </span>
          </div>
          <span className="text-[8px] bg-white/10 text-white border border-white/20 px-1 font-bold">
            v5.0
          </span>
        </div>

        {/* Global Telemetry & Autopilot bar */}
        <div className="flex items-center justify-between px-2 py-1 bg-white/5 border border-white/10 mt-2 shrink-0 text-[8.5px]">
          <div className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-none ${isAutopilot ? "bg-white animate-cyber-blink shadow-[0_0_6px_#ffffff]" : "bg-neutral-600"}`} />
            <span className="text-neutral-400 font-bold uppercase">AUTOPILOT MODULE</span>
          </div>
          <button
            onClick={onToggleAutopilot}
            className={`px-2 py-0.5 border text-[8px] font-bold transition-all duration-150 ${
              isAutopilot
                ? "bg-white text-black border-white hover:bg-neutral-200"
                : "bg-transparent text-neutral-400 border-white/20 hover:text-white hover:border-white/50"
            }`}
          >
            {isAutopilot ? "ACTIVE" : "STANDBY"}
          </button>
        </div>

        {/* Premium Tab Mode Selectors */}
        <div className="grid grid-cols-4 gap-0.5 border border-white/10 p-0.5 bg-black/40 mt-2 shrink-0">
          {(["satcom", "osint", "gaia", "butterfly"] as const).map((mode) => {
            const modeLabels = {
              satcom: "SAT",
              osint: "RADAR",
              gaia: "GAIA",
              butterfly: "SIM",
            };
            const isActive = activeSubMode === mode;
            return (
              <button
                key={mode}
                onClick={() => onChangeSubMode(mode)}
                className={`py-1 text-[8px] font-bold tracking-widest transition-all duration-150 uppercase ${
                  isActive
                    ? "bg-white text-black font-extrabold shadow-[0_0_8px_rgba(255,255,255,0.3)]"
                    : "text-neutral-500 hover:text-neutral-300"
                }`}
              >
                {modeLabels[mode]}
              </button>
            );
          })}
        </div>

        {/* Unified Dynamic Stream (Context-Sensitive UI) */}
        <div className="flex-1 overflow-y-auto pr-1 mt-2.5 mb-2 flex flex-col gap-3.5 cyber-scrollbar">

          {/* ── MODULE 1: SATELLITE (SATCOM) ── */}
          {activeSubMode === "satcom" && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-2">
                <div className="text-[8.5px] text-neutral-400 uppercase tracking-widest font-bold flex items-center gap-1.5">
                  <Layers size={10} className="text-white" />
                  <span>Spectral Filters</span>
                </div>
                <div className="grid grid-cols-1 gap-1">
                  {SPECTRAL_MODES.map((mode, index) => {
                    const isActive = activeMode === mode.value;
                    return (
                      <button
                        key={mode.value || "basemap"}
                        onClick={() => onModeChange(mode.value)}
                        className={`p-2 text-left border transition-all duration-150 relative overflow-hidden group ${
                          isActive
                            ? "bg-white border-white text-black font-extrabold shadow-[0_0_8px_rgba(255,255,255,0.15)]"
                            : "bg-black/30 border-white/5 text-neutral-400 hover:border-white/30 hover:text-white"
                        }`}
                        title={mode.desc}
                      >
                        <div className="flex justify-between items-center text-[9px]">
                          <span>[0{index + 1}] {mode.label}</span>
                          {isActive && <span className="text-[7.5px] bg-black text-white px-1 font-bold">ON</span>}
                        </div>
                        <p className={`text-[7.5px] mt-0.5 leading-relaxed font-medium ${isActive ? "text-neutral-700" : "text-neutral-500"}`}>
                          {mode.desc}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {activeMode && (
                <div className="bg-white/5 border border-white/10 p-2">
                  <CyberSlider
                    label="Blend Opacity"
                    min={0}
                    max={1}
                    step={0.05}
                    value={layerOpacity}
                    onChange={onOpacityChange}
                    glowColor="white"
                    formatValue={(v) => `${Math.round(v * 100)}%`}
                  />
                </div>
              )}
            </div>
          )}

          {/* ── MODULE 2: RADAR SIGNALS (OSINT) ── */}
          {activeSubMode === "osint" && (
            <div className="flex flex-col gap-3">
              <div className="bg-white/5 border border-white/10 p-2 flex flex-col gap-2 relative">
                {!user && <RestrictedAccessOverlay moduleName="Live Radar" compact />}

                <div className="flex items-center justify-between pb-1.5 border-b border-white/10">
                  <span className="text-[8.5px] text-neutral-400 uppercase tracking-widest font-bold flex items-center gap-1">
                    <Target size={10} className="text-white" />
                    <span>Signals Control</span>
                  </span>
                  <span className="text-[7.5px] bg-white/15 text-white border border-white/20 px-1 font-bold animate-pulse">
                    RECEIVING
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-1 mt-1">
                  <label className="flex items-center gap-1.5 cursor-pointer text-[8px] font-bold text-neutral-400 hover:text-white py-1 px-1.5 bg-black/40 border border-white/5">
                    <input
                      type="checkbox"
                      checked={scanAviation}
                      onChange={(e) => setScanAviation(e.target.checked)}
                      className="accent-white shrink-0"
                    />
                    <Plane size={8} className="text-white" />
                    <span>ADSB AIR</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-[8px] font-bold text-neutral-400 hover:text-white py-1 px-1.5 bg-black/40 border border-white/5">
                    <input
                      type="checkbox"
                      checked={scanMaritime}
                      onChange={(e) => setScanMaritime(e.target.checked)}
                      className="accent-white shrink-0"
                    />
                    <Anchor size={8} className="text-white" />
                    <span>AIS SEA</span>
                  </label>
                </div>

                <div className="flex justify-between items-center text-[8.5px] text-neutral-400 mt-1">
                  <span>Sector target sweep:</span>
                  <span className="font-bold text-white bg-white/15 px-1 border border-white/10">
                    {flights.length + (scanMaritime ? ships.size : 0)} TARGETS
                  </span>
                </div>

                <GlowButton
                  onClick={onRunThreatAnalysis}
                  variant="white"
                  className="w-full text-[8px] py-1 mt-1"
                  disabled={(flights.length === 0 && ships.size === 0) || isAnalyzingThreats}
                >
                  {isAnalyzingThreats ? "SCANNING SECTOR COORDS..." : "[ SWEEP COORDINATES WITH AI ]"}
                </GlowButton>
              </div>

              {/* Signals Logs stream */}
              <div className="flex flex-col gap-1">
                <div className="text-[8px] text-neutral-500 font-bold uppercase tracking-wider pl-1">
                  // LOG MATRIX FEED
                </div>
                <div className="max-h-24 overflow-y-auto pr-1 flex flex-col gap-0.5 cyber-scrollbar bg-black border border-white/5 p-1 font-mono text-[7.5px]">
                  {scanAviation && flights.slice(0, 4).map((f) => (
                    <div key={f.icao24} className="py-0.5 border-b border-white/5 text-neutral-300 flex justify-between">
                      <span className="text-white font-bold flex items-center gap-1">
                        <span className="w-1 h-1 bg-white animate-pulse" />
                        ✈ {f.callsign || "UNKN"}
                      </span>
                      <span>ALT: {f.altitude ? `${Math.round(f.altitude)}m` : "STEALTH"}</span>
                      <span className="text-neutral-500">{f.origin_country.slice(0, 5).toUpperCase()}</span>
                    </div>
                  ))}
                  {scanMaritime && Array.from(ships.values()).slice(0, 4).map((s) => (
                    <div key={s.mmsi} className="py-0.5 border-b border-white/5 text-neutral-300 flex justify-between">
                      <span className="text-white font-bold flex items-center gap-1">
                        <span className="w-1 h-1 bg-white animate-pulse" />
                        ⚓ {s.name.slice(0, 7).toUpperCase() || "UNKN"}
                      </span>
                      <span>SOG: {s.sog || "0"}kn</span>
                      <span className="text-neutral-500">MMSI:{s.mmsi}</span>
                    </div>
                  ))}
                  {flights.length === 0 && ships.size === 0 && (
                    <div className="text-neutral-600 text-center py-3 italic">
                      NO DECAY SIGNALS RECORDED
                    </div>
                  )}
                </div>
              </div>

              {/* AI Threat Scan Output */}
              {threatAnalysisResult && (
                <div className="bg-white/5 border border-white/10 p-2 relative">
                  <div className="flex justify-between items-center border-b border-white/10 pb-1 mb-1.5">
                    <span className="text-[8px] font-bold text-white uppercase tracking-widest flex items-center gap-1">
                      <ShieldAlert size={9} className="text-white animate-cyber-blink" />
                      <span>AI ANOMALY REPORT</span>
                    </span>
                    <button onClick={onClearThreatAnalysis} className="text-[7.5px] text-neutral-500 hover:text-white uppercase font-bold">[ CLEAR ]</button>
                  </div>
                  <div className="flex justify-between items-center text-[8.5px] font-bold text-white uppercase mb-1">
                    <span>SPECTRUM THREAT:</span>
                    <span className={threatAnalysisResult.threatLevel === "CRITICAL" || threatAnalysisResult.threatLevel === "HIGH" ? "text-plasma-pink drop-shadow-[0_0_4px_rgba(248,113,113,0.3)] animate-pulse" : "text-white"}>
                      {threatAnalysisResult.threatLevel}
                    </span>
                  </div>
                    <div className="text-[8px] text-neutral-300 leading-relaxed max-h-24 overflow-y-auto pr-1 cyber-scrollbar">
                    <MarkdownRenderer content={threatAnalysisResult.analysis || ""} compact />
                  </div>
                </div>
              )}

              {/* Classified Briefing Panel */}
              {activeBriefing && (
                <div className="bg-white/5 border border-white/10 p-2 relative">
                  <div className="flex justify-between items-center border-b border-white/10 pb-1 mb-1.5">
                    <span className="text-[8px] font-extrabold text-white uppercase tracking-widest flex items-center gap-1">
                      <ShieldAlert size={9} className="text-plasma-pink animate-pulse" />
                      <span>TACTICAL INTEL REPORT</span>
                    </span>
                    <button onClick={onCloseBriefing} className="text-[7.5px] text-neutral-500 hover:text-white uppercase font-bold">[ CLOSE ]</button>
                  </div>

                  <div className="text-[9px] font-bold text-white uppercase truncate tracking-wide mb-1 border-b border-white/5 pb-0.5">
                    {activeBriefing.title}
                  </div>

                  <div className="grid grid-cols-2 gap-1 bg-black border border-white/5 p-1 text-[7px] text-neutral-400 mb-1.5">
                    <div>SECTOR: <span className="text-white font-semibold">{activeBriefing.hotspot}</span></div>
                    <div>COORDS: <span className="text-white font-semibold">{activeBriefing.lng.toFixed(2)}, {activeBriefing.lat.toFixed(2)}</span></div>
                  </div>

                  <div className="text-[8px] leading-relaxed text-neutral-200 border-b border-white/5 pb-1 mb-1">
                    <span className="text-neutral-500 text-[7.5px] font-bold uppercase block">ANALYSIS:</span>
                    <MarkdownRenderer content={activeBriefing.analysis || ""} compact />
                  </div>

                  <div className="text-[8px] leading-relaxed text-neutral-300">
                    <span className="text-neutral-500 text-[7.5px] font-bold uppercase block">MACRO IMPACT:</span>
                    <MarkdownRenderer content={activeBriefing.impact || ""} compact />
                  </div>

                  {activeBriefing.debateTranscript && (
                    <DebateTranscriptViewer
                      transcript={activeBriefing.debateTranscript}
                      debateSummary={activeBriefing.debateSummary}
                      debateDuration={activeBriefing.debateDuration}
                      overallConfidence={activeBriefing.overallConfidence}
                      dissent={activeBriefing.dissent}
                      consensus={activeBriefing.consensus}
                      className="mt-1"
                    />
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── MODULE 3: GAIA HAZARDS (GAIA) ── */}
          {activeSubMode === "gaia" && (
            <div className="flex flex-col gap-3">
              <div className="bg-white/5 border border-white/10 p-2 flex flex-col gap-2 relative">
                <div className="flex items-center justify-between pb-1.5 border-b border-white/10">
                  <span className="text-[8.5px] text-neutral-400 uppercase tracking-widest font-bold flex items-center gap-1">
                    <Activity size={10} className="text-white" />
                    <span>Seismic & Eco Radar</span>
                  </span>
                  <button
                    onClick={onRefreshDisasters}
                    disabled={isScanningDisasters}
                    className="text-[8px] text-white font-bold hover:underline uppercase disabled:text-neutral-500"
                  >
                    {isScanningDisasters ? "SYNCING..." : "[ SYNC FEED ]"}
                  </button>
                </div>

                {/* Selected hazard briefing */}
                {activeDisaster ? (
                  <div className="bg-white/5 border border-white/15 p-2 rounded-none">
                    <div className="flex justify-between items-center border-b border-white/10 pb-1 mb-1">
                      <span className="text-[8px] font-extrabold text-white uppercase tracking-widest">
                        ⚠ {activeDisaster.type} INFO
                      </span>
                      <button onClick={onCloseDisaster} className="text-[7.5px] text-neutral-500 hover:text-white uppercase font-bold">[ CLOSE ]</button>
                    </div>

                    <div className="text-[9px] font-bold text-white uppercase truncate tracking-wide mb-1 border-b border-white/5 pb-0.5">
                      {activeDisaster.place}
                    </div>

                    <div className="grid grid-cols-2 gap-1 bg-black border border-white/5 p-1 text-[7px] text-neutral-400 mb-1.5">
                      <div>MAGNITUDE: <span className="text-white font-semibold">{activeDisaster.magnitude || "N/A"}</span></div>
                      <div>COORDS: <span className="text-white font-semibold">{activeDisaster.lng.toFixed(2)}, {activeDisaster.lat.toFixed(2)}</span></div>
                    </div>

                    <div className="text-[8px] leading-relaxed text-neutral-200 border-b border-white/5 pb-1 mb-1">
                      <span className="text-neutral-500 text-[7.5px] font-bold uppercase block">HAZARD BRIEF:</span>
                      {activeDisaster.details || "Geophysical anomaly logged. Awaiting downrange supply chain impact vector calculations."}
                    </div>

                    <GlowButton
                      onClick={() => {
                        onChangeSubMode("butterfly");
                      }}
                      variant="white"
                      className="w-full text-[8px] py-1 border-white/20 text-white hover:bg-white/10"
                    >
                      EVALUATE RISKS WITH AI
                    </GlowButton>
                  </div>
                ) : (
                  <div className="text-[8px] text-neutral-500 text-center py-2 border border-dashed border-white/5 italic">
                    Select a hazard indicator from list or map to inspect details
                  </div>
                )}
              </div>

              {/* Feed items list */}
              <div className="flex flex-col gap-1">
                <div className="text-[8px] text-neutral-500 font-bold uppercase tracking-wider pl-1">
                  // SECTOR WARNING RECORDS
                </div>
                <div className="max-h-48 overflow-y-auto pr-1 flex flex-col gap-1 cyber-scrollbar">
                  {disasters.length === 0 ? (
                    <div className="text-[8px] text-neutral-600 py-3 text-center italic border border-dashed border-white/5">
                      NO DESTRUCTIVE EVENTS REGISTERED
                    </div>
                  ) : (
                    disasters.map((d) => {
                      const levelColors: { [key: string]: string } = {
                        CRITICAL: "border-plasma-pink bg-plasma-pink/5 text-plasma-pink",
                        HIGH: "border-amber-500 bg-amber-500/5 text-amber-400",
                        ELEVATED: "border-white/20 bg-white/5 text-white",
                      };

                      return (
                        <div
                          key={d.id}
                          onClick={() => onDisasterItemClick?.(d)}
                          className={`p-1 border rounded-none cursor-pointer transition-all duration-150 text-[8px] ${levelColors[d.severity] || "border-neutral-800 text-white"} ${activeDisaster?.id === d.id ? "border-white ring-1 ring-white/20" : ""}`}
                        >
                          <div className="flex justify-between items-center font-bold mb-0.5">
                            <span className="uppercase font-extrabold">{d.type} ({d.source})</span>
                            <span className="text-neutral-500 text-[7px]">
                              {d.time ? new Date(d.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "ACTIVE"}
                            </span>
                          </div>
                          <div className="text-[8.5px] font-bold text-neutral-100 uppercase truncate">
                            {d.place}
                          </div>
                          {d.magnitude && (
                            <div className="text-[7px] text-neutral-400">
                              MAGNITUDE: <span className="text-white font-bold">{d.magnitude}</span>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── MODULE 4: GEOPOLITICAL SIM (BUTTERFLY) ── */}
          {activeSubMode === "butterfly" && (
            <div className="flex flex-col gap-3 relative">
              {!user && <RestrictedAccessOverlay moduleName="Geopolitical Simulator" />}

              <div className="bg-white/5 border border-white/10 p-2 flex flex-col gap-2">
                <div>
                  <span className="text-neutral-500 text-[7.5px] uppercase font-bold block mb-0.5">// SIM GRID POINT:</span>
                  {clickedLatLng ? (
                    <div className="bg-white/5 border border-white/10 p-1 text-white font-mono font-bold text-[8.5px] flex justify-between">
                      <span>LAT: {clickedLatLng.lat.toFixed(4)}</span>
                      <span>LNG: {clickedLatLng.lng.toFixed(4)}</span>
                    </div>
                  ) : (
                    <div className="text-[8px] text-neutral-500 border border-dashed border-white/10 p-2 text-center">
                      Click map coordinates or load preset:
                    </div>
                  )}
                </div>

                {!simulationResult && !simulationLoading && (
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-neutral-500 text-[7.5px] uppercase font-bold block mb-0.5">Tactical Presets:</span>
                      <div className="grid grid-cols-3 gap-0.5">
                        {PRESETS.map((p, idx) => (
                          <button
                            key={idx}
                            onClick={() => handlePresetSelect(p)}
                            className="p-1 bg-black border border-white/10 hover:border-white/50 text-left text-[7px] text-neutral-300 truncate transition-all duration-150"
                          >
                            {p.name.replace(" Blockade", "").replace(" Escalation", "").replace(" USV Attack", "")}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span className="text-neutral-500 text-[7.5px] uppercase font-bold block mb-0.5">Tactical Incident Hypothesis:</span>
                      <textarea
                        value={scenarioInput}
                        onChange={(e) => setScenarioInput(e.target.value)}
                        placeholder="e.g. military blockade, cyber attack on maritime ports..."
                        rows={2}
                        className="w-full bg-black border border-white/10 p-1 text-neutral-200 focus:outline-none focus:border-white/40 resize-none text-[8px] font-mono leading-normal"
                      />
                    </div>

                    <GlowButton
                      onClick={runSimulation}
                      variant="white"
                      className="w-full text-[8.5px] py-1"
                      disabled={!clickedLatLng || !scenarioInput.trim()}
                    >
                      <Play size={8} className="mr-1" /> RUN SIMULATION CASCADES
                    </GlowButton>
                  </div>
                )}

                {/* Simulation loading loop */}
                {simulationLoading && (
                  <div className="flex flex-col gap-2 p-1.5 bg-black border border-white/10 text-[8px] font-mono">
                    <div className="flex items-center gap-1 font-bold text-white uppercase tracking-widest animate-pulse">
                      <span className="cyber-spinner border-white w-2.5 h-2.5" />
                      <span>CASCADING SCENARIOS...</span>
                    </div>
                    <div className="flex flex-col gap-0.5 border-t border-white/5 pt-1 text-neutral-400">
                      <div className={simulationStep >= 1 ? "text-white font-bold" : "text-neutral-600"}>
                        {simulationStep > 1 ? "✔" : simulationStep === 1 ? "⚡" : "○"} [1/4] Starting simulation...
                      </div>
                      <div className={simulationStep >= 2 ? "text-white font-bold" : "text-neutral-600"}>
                        {simulationStep > 2 ? "✔" : simulationStep === 2 ? "⚡" : "○"} [2/4] Analyzing local security impact...
                      </div>
                      <div className={simulationStep >= 3 ? "text-white font-bold" : "text-neutral-600"}>
                        {simulationStep > 3 ? "✔" : simulationStep === 3 ? "⚡" : "○"} [3/4] Analyzing trade and economic impact...
                      </div>
                      <div className={simulationStep >= 4 ? "text-white font-bold" : "text-neutral-600"}>
                        {simulationStep > 4 ? "✔" : simulationStep === 4 ? "⚡" : "○"} [4/4] Analyzing social and civil impact...
                      </div>
                    </div>
                  </div>
                )}

                {/* Simulation results container */}
                {simulationResult && !simulationLoading && (
                  <div className="flex flex-col gap-2 border border-white/10 p-1 bg-black">
                    <div className="grid grid-cols-4 gap-0.5 border-b border-white/10 pb-0.5">
                      {(["summary", "military", "economic", "social"] as const).map((tab) => (
                        <button
                          key={tab}
                          onClick={() => setSimTab(tab)}
                          className={`py-0.5 text-[7px] uppercase font-bold ${simTab === tab ? "bg-white text-black font-extrabold" : "bg-transparent text-neutral-500 hover:text-white"}`}
                        >
                          {tab}
                        </button>
                      ))}
                    </div>

                    <div className="max-h-36 overflow-y-auto pr-1 text-[8px] text-neutral-300 cyber-scrollbar leading-normal">
                      {simTab === "summary" && (
                        <div>
                          <div className="text-[7.5px] text-white font-bold uppercase mb-0.5">// SIMULATION SUMMARY</div>
                          <MarkdownRenderer content={simulationResult.summary || ""} compact />
                        </div>
                      )}

                      {simTab === "military" && (
                        <div className="flex flex-col gap-1">
                          <div className="flex justify-between items-center text-[7.5px] bg-white/5 p-1 font-bold">
                            <span className="text-neutral-400">SECURITY INDEX</span>
                            <span className="text-white">{simulationResult.military.status}</span>
                          </div>
                          <MarkdownRenderer content={simulationResult.military.report || ""} compact />
                          <div className="text-[7.5px] text-neutral-500 font-bold mt-1">RADIUS ENVELOPE: {simulationResult.military.exclusionRadiusKm} KM</div>
                        </div>
                      )}

                      {simTab === "economic" && (
                        <div className="flex flex-col gap-1">
                          <div className="flex justify-between items-center text-[7.5px] bg-white/5 p-1 font-bold">
                            <span className="text-neutral-400">SUPPLY VECTOR</span>
                            <span className="text-white">{simulationResult.economic.status}</span>
                          </div>
                          <MarkdownRenderer content={simulationResult.economic.report || ""} compact />
                          {simulationResult.economic.disruptedPorts?.length > 0 && (
                            <div className="mt-1">
                              <span className="text-neutral-500 text-[7.5px] uppercase font-bold">AFFECTED HUB PORTS:</span>
                              <div className="flex flex-wrap gap-0.5 mt-0.5">
                                {simulationResult.economic.disruptedPorts.map((p: string, i: number) => (
                                  <span key={i} className="bg-white/10 text-white border border-white/5 px-1 py-0.2 text-[7px]">{p}</span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {simTab === "social" && (
                        <div className="flex flex-col gap-1">
                          <div className="flex justify-between items-center text-[7.5px] bg-white/5 p-1 font-bold">
                            <span className="text-neutral-400">CIVIL INDICES</span>
                            <span className="text-white">{simulationResult.social.status}</span>
                          </div>
                          <MarkdownRenderer content={simulationResult.social.report || ""} compact />
                          <div className="text-[7px] text-neutral-500 mt-1">REFUGEE DISPLACEMENT RISK: {simulationResult.social.refugeeRisk}</div>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={onClearSimulation}
                      className="w-full py-1 mt-1 bg-white/5 hover:bg-white/10 border border-white/20 text-[7.5px] text-white font-bold uppercase transition-all duration-150 flex items-center justify-center gap-1"
                    >
                      <RotateCcw size={9} /> CLEAR SIMULATION
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* ── PERMANENT BOTTOM DRAWER: INCIDENT ALERTS LOG ── */}
        <div className="border border-white/10 bg-black/40 mt-auto shrink-0">
          <div
            onClick={() => setExpandHistory(!expandHistory)}
            className="flex items-center justify-between border-b border-white/10 p-2 cursor-pointer text-[9px] font-extrabold text-white uppercase hover:bg-white/5 transition-all"
          >
            <div className="flex items-center gap-1.5">
              <Radio size={11} className="text-white animate-cyber-blink" />
              <span>INCIDENT LOG FEED</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[7.5px] text-neutral-500 font-normal">FREQ: 9.6 GHz</span>
              {expandHistory ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            </div>
          </div>

          {expandHistory && (
            <div className="relative p-2 flex flex-col gap-1.5 bg-black/60">
              {!user && <RestrictedAccessOverlay moduleName="Incident Alerts Log" compact />}

              <div className="flex justify-between items-center bg-black/80 p-1 border border-white/5 text-[7.5px]">
                <span className="text-neutral-500 font-bold uppercase">ALERTS BUFFER</span>
                <button
                  onClick={onForceSweep}
                  disabled={isScanningRadar}
                  className="text-white font-bold hover:underline uppercase disabled:text-neutral-500 font-mono"
                >
                  {isScanningRadar ? "SWEEPING..." : "[ INITIATE SCAN ]"}
                </button>
              </div>

              <div className="max-h-36 overflow-y-auto pr-1 flex flex-col gap-1 cyber-scrollbar">
                {history.length === 0 ? (
                  <div className="text-[8px] text-neutral-600 py-3 text-center italic border border-dashed border-white/5">
                    NO THREAT SIGNALS LOGGED
                  </div>
                ) : (
                  history.map((alert) => {
                    const isSelected = activeBriefing?.id === alert.id;
                    const levelColors: { [key: string]: string } = {
                      CRITICAL: "border-plasma-pink bg-plasma-pink/5 text-plasma-pink",
                      HIGH: "border-amber-500 bg-amber-500/5 text-amber-400",
                      ELEVATED: "border-white/20 bg-white/5 text-white",
                    };

                    return (
                      <div
                        key={alert.id}
                        onClick={() => onHistoryItemClick(alert)}
                        className={`p-1.5 border rounded-none cursor-pointer transition-all duration-150 text-[8px] ${levelColors[alert.threatLevel] || "border-neutral-800 text-white"} ${isSelected ? "border-white ring-1 ring-white/30" : ""}`}
                      >
                        <div className="flex justify-between items-center font-bold mb-0.5">
                          <span className="uppercase font-extrabold">{alert.threatLevel}</span>
                          <span className="text-neutral-500 font-medium">
                            {alert.timestamp ? new Date(alert.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "ACTIVE"}
                          </span>
                        </div>
                        <div className="text-[8.5px] font-bold text-neutral-100 uppercase truncate">
                          {alert.hotspot}
                        </div>
                        <div className="text-neutral-500 truncate">
                          {alert.type}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </GlassPanel>
    </div>
  );
}

