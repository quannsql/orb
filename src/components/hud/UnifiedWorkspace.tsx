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


interface UnifiedWorkspaceProps {
  // Mode & Autopilot
  activeSubMode: "satcom" | "osint" | "butterfly";
  onChangeSubMode: (mode: "satcom" | "osint" | "butterfly") => void;
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
  onClose
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

  // Sync preset scenarios when coordinates change via map clicks
  useEffect(() => {
    if (clickedLatLng) {
      if (!scenarioInput) {
        setScenarioInput("Geopolitical event causing supply chain disruptions and political shifts.");
      }
    }
  }, [clickedLatLng]);

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
      className="fixed left-4 right-4 md:right-auto top-14 bottom-12 z-30 w-auto md:w-[350px] max-w-[calc(100%-32px)] flex flex-col font-mono text-xs select-text pointer-events-auto transition-all duration-300"
      id="unified-workspace"
    >
      <GlassPanel 
        glowColor={activeSubMode === "osint" ? "pink" : activeSubMode === "butterfly" ? "purple" : "cyan"} 
        padding="sm" 
        className="w-full h-full flex flex-col border border-white/10 bg-black/85 rounded-none"
      >
        {/* Workspace Title Header */}
        <div className="flex items-center justify-between pb-2 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2">
            {onClose && (
              <button 
                onClick={onClose} 
                className="md:hidden p-0.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white mr-1 border border-white/20 rounded-xs"
              >
                <X size={11} />
              </button>
            )}
            <Terminal size={14} className="text-cyan-glow animate-pulse" />
            <span className="text-[11px] font-extrabold tracking-wider uppercase text-white">
              CONTROL PANEL WORKSPACE
            </span>
          </div>
          <span className="text-[9px] bg-cyan-glow/10 text-cyan-glow border border-cyan-glow/20 px-1 font-bold">
            v5.0
          </span>
        </div>

        {/* Unified Scrollable Stream */}
        <div className="flex-1 overflow-y-auto pr-1 mt-2.5 flex flex-col gap-3.5 cyber-scrollbar">
          
          {/* ── SECTION 1: MISSION CONTROL TELEMETRY ── */}
          <div className="border border-white/5 bg-void/40 p-2">
            <div 
              onClick={() => setExpandTelemetry(!expandTelemetry)}
              className="flex items-center justify-between border-b border-white/5 pb-1 mb-1.5 cursor-pointer text-[10px] font-bold text-neutral-300 uppercase hover:text-white"
            >
              <div className="flex items-center gap-1.5">
                <Activity size={12} className="text-cyan-glow" />
                <span>Map Mode Settings</span>
              </div>
              {expandTelemetry ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </div>

            {expandTelemetry && (
              <div className="flex flex-col gap-2">
                {/* 3-Way Mode Toggle */}
                <div className="grid grid-cols-3 gap-0.5 border border-white/10 p-0.5 bg-black/40">
                  <button 
                    onClick={() => onChangeSubMode("satcom")}
                    className={`py-1 text-[8.5px] font-bold transition-all duration-150 uppercase ${activeSubMode === "satcom" ? "bg-cyan-glow text-black font-extrabold" : "text-neutral-500 hover:text-neutral-300"}`}
                  >
                    Satellite View
                  </button>
                  <button 
                    onClick={() => onChangeSubMode("osint")}
                    className={`py-1 text-[8.5px] font-bold transition-all duration-150 uppercase ${activeSubMode === "osint" ? "bg-plasma-pink text-white font-extrabold" : "text-neutral-500 hover:text-neutral-300"}`}
                  >
                    Live Radar
                  </button>
                  <button 
                    onClick={() => onChangeSubMode("butterfly")}
                    className={`py-1 text-[8.5px] font-bold transition-all duration-150 uppercase ${activeSubMode === "butterfly" ? "bg-purple-600 text-white font-extrabold" : "text-neutral-500 hover:text-neutral-300"}`}
                  >
                    Simulator
                  </button>
                </div>

                {/* Autopilot Glowing Switch */}
                <div className={`flex items-center justify-between p-2 border ${isAutopilot ? "bg-matrix-green/10 border-matrix-green/45 animate-pulse" : "bg-black/30 border-white/5"}`}>
                  <div className="flex items-center gap-1.5">
                    <UserCheck size={13} className={isAutopilot ? "text-matrix-green" : "text-neutral-500"} />
                    <div>
                      <div className={`text-[9.5px] font-bold ${isAutopilot ? "text-matrix-green" : "text-neutral-300"}`}>
                        AUTO-PILOT
                      </div>
                      <div className="text-[7.5px] text-neutral-500">Auto-fly map and run simulations on new alerts</div>
                    </div>
                  </div>
                  <button
                    onClick={onToggleAutopilot}
                    className={`px-3 py-1 text-[9px] font-bold rounded-xs transition-all duration-150 ${
                      isAutopilot 
                        ? "bg-matrix-green text-black border border-matrix-green font-extrabold shadow-[0_0_8px_#00ff41]" 
                        : "bg-neutral-800 text-neutral-400 border border-neutral-700 hover:text-white"
                    }`}
                  >
                    {isAutopilot ? "AUTOPILOT: ON" : "MANUAL CONTROL"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── SECTION 2: SATELLITE LAYERS ── */}
          <div className="border border-white/5 bg-void/40 p-2">
            <div 
              onClick={() => setExpandLayers(!expandLayers)}
              className="flex items-center justify-between border-b border-white/5 pb-1 mb-1.5 cursor-pointer text-[10px] font-bold text-neutral-300 uppercase hover:text-white"
            >
              <div className="flex items-center gap-1.5">
                <Layers size={12} className="text-cyan-glow" />
                <span>Satellite Layers</span>
              </div>
              {expandLayers ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </div>

            {expandLayers && (
              <div className="flex flex-col gap-2.5">
                <div className="flex flex-col gap-1">
                  <span className="text-[8.5px] text-neutral-500 uppercase">Select Layer Filter:</span>
                  <div className="grid grid-cols-2 gap-1">
                    {SPECTRAL_MODES.map((mode) => (
                      <button
                        key={mode.value || "basemap"}
                        onClick={() => onModeChange(mode.value)}
                        className={`p-1.5 text-[8.5px] font-semibold text-left border rounded-xs leading-tight transition-all duration-150 ${
                          activeMode === mode.value 
                            ? "bg-cyan-glow/10 border-cyan-glow text-cyan-glow font-bold" 
                            : "bg-black/30 border-white/5 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200"
                        }`}
                        title={mode.desc}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Opacity slider */}
                {activeMode && (
                  <div className="bg-black/40 border border-white/5 p-2">
                    <CyberSlider
                      label="LAYER OPACITY"
                      min={0}
                      max={1}
                      step={0.05}
                      value={layerOpacity}
                      onChange={onOpacityChange}
                      formatValue={(v) => `${Math.round(v * 100)}%`}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── SECTION 3: LIVE RADAR SIGNAL SCANNER ── */}
          <div className="border border-white/5 bg-void/40 p-2">
            <div 
              onClick={() => setExpandTargets(!expandTargets)}
              className="flex items-center justify-between border-b border-white/5 pb-1 mb-1.5 cursor-pointer text-[10px] font-bold text-neutral-300 uppercase hover:text-white"
            >
              <div className="flex items-center gap-1.5">
                <Target size={12} className="text-plasma-pink" />
                <span>Live Radar Scanner</span>
              </div>
              {expandTargets ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </div>

            {expandTargets && (
              <div className="relative flex flex-col gap-2.5 min-h-[140px]">
                {!user && (
                  <RestrictedAccessOverlay moduleName="Live Radar" compact />
                )}

                {/* Active settings & counts */}
                <div className="flex justify-between items-center gap-2 bg-black/40 p-1.5 border border-white/5">
                  <label className="flex items-center gap-1 cursor-pointer text-[9px] font-bold text-neutral-400 hover:text-white">
                    <input 
                      type="checkbox" 
                      checked={scanAviation} 
                      onChange={(e) => setScanAviation(e.target.checked)} 
                      className="accent-plasma-pink shrink-0" 
                    />
                    <Plane size={10} className="text-plasma-pink" />
                    <span>Air Traffic (ADSB)</span>
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer text-[9px] font-bold text-neutral-400 hover:text-white">
                    <input 
                      type="checkbox" 
                      checked={scanMaritime} 
                      onChange={(e) => setScanMaritime(e.target.checked)} 
                      className="accent-cyan-400 shrink-0" 
                    />
                    <Anchor size={10} className="text-cyan-400" />
                    <span>Sea Traffic (AIS)</span>
                  </label>
                  
                  <span className="text-[10px] text-neutral-400 font-bold ml-auto shrink-0 bg-neutral-900 border border-white/5 px-1.5 py-0.5">
                    Total: {flights.length + (scanMaritime ? ships.size : 0)} Targets
                  </span>
                </div>

                {/* AI Threat Scan Trigger */}
                <GlowButton
                  onClick={onRunThreatAnalysis}
                  variant="danger"
                  className="w-full text-[9px] py-1.5"
                  disabled={(flights.length === 0 && ships.size === 0) || isAnalyzingThreats}
                >
                  {isAnalyzingThreats ? "Running AI Threat Scan..." : "Scan Sector with AI"}
                </GlowButton>

                {/* Signals logs - concise list */}
                <div className="max-h-36 overflow-y-auto pr-1 flex flex-col gap-1 custom-scrollbar">
                  {scanAviation && flights.slice(0, 3).map((f) => (
                    <div key={f.icao24} className="p-1 bg-plasma-pink/5 border border-plasma-pink/15 text-[8.5px] text-neutral-300 flex items-center justify-between">
                      <span className="font-extrabold text-white flex items-center gap-1"><Plane size={9} className="text-plasma-pink" /> {f.callsign}</span>
                      <span>ALT: {f.altitude ? `${Math.round(f.altitude)}m` : "STEALTH"}</span>
                      <span className="text-neutral-500">{f.origin_country.slice(0, 8)}</span>
                    </div>
                  ))}
                  {scanMaritime && Array.from(ships.values()).slice(0, 3).map((s) => (
                    <div key={s.mmsi} className="p-1 bg-cyan-950/20 border border-cyan-800/15 text-[8.5px] text-neutral-300 flex items-center justify-between">
                      <span className="font-extrabold text-white flex items-center gap-1"><Anchor size={9} className="text-cyan-400" /> {s.name.slice(0, 10)}</span>
                      <span>SOG: {s.sog}kn</span>
                      <span className="text-neutral-500">MMSI:{s.mmsi}</span>
                    </div>
                  ))}
                  {flights.length === 0 && ships.size === 0 && (
                    <div className="text-[8.5px] text-neutral-600 text-center py-2 italic border border-dashed border-white/5">
                      No signals active in sector
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── SECTION 4: AI THREAT ANALYSIS REPORT ── */}
          <div className="border border-white/5 bg-void/40 p-2">
            <div 
              onClick={() => setExpandBriefs(!expandBriefs)}
              className="flex items-center justify-between border-b border-white/5 pb-1 mb-1.5 cursor-pointer text-[10px] font-bold text-neutral-300 uppercase hover:text-white"
            >
              <div className="flex items-center gap-1.5">
                <ShieldAlert size={12} className="text-amber-500" />
                <span>AI Threat Analysis Report</span>
              </div>
              {expandBriefs ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </div>

            {expandBriefs && (
              <div className="flex flex-col gap-2.5">
                {/* 1. Anomaly Sweeper Results */}
                {threatAnalysisResult && (
                  <div className="bg-amber-500/5 border border-amber-500/25 p-2 rounded-xs">
                    <div className="flex justify-between items-center border-b border-amber-500/20 pb-1 mb-1.5">
                      <span className="text-[8.5px] font-bold text-amber-500 uppercase tracking-widest">AI Location Anomaly Scan</span>
                      <button onClick={onClearThreatAnalysis} className="text-[8.5px] text-neutral-500 hover:text-white uppercase">[ CLEAR ]</button>
                    </div>
                    <div className="flex justify-between items-center text-[9px] font-extrabold text-white uppercase mb-1">
                      <span>THREAT SPECTRUM:</span>
                      <span className={threatAnalysisResult.threatLevel === "CRITICAL" || threatAnalysisResult.threatLevel === "HIGH" ? "text-plasma-pink" : "text-amber-400"}>
                        {threatAnalysisResult.threatLevel}
                      </span>
                    </div>
                    <p className="text-[9px] text-neutral-300 leading-normal max-h-36 overflow-y-auto pr-1 custom-scrollbar">
                      {threatAnalysisResult.analysis}
                    </p>
                  </div>
                )}

                {/* 2. Sentinel Classified Briefing Details */}
                {activeBriefing ? (
                  <div className="bg-plasma-pink/5 border border-plasma-pink/20 p-2 rounded-xs">
                    <div className="flex justify-between items-center border-b border-plasma-pink/20 pb-1 mb-1">
                      <span className="text-[8.5px] font-extrabold text-plasma-pink uppercase tracking-widest">AI Incident Report</span>
                      <button onClick={onCloseBriefing} className="text-[8.5px] text-neutral-500 hover:text-white uppercase">[ CLOSE ]</button>
                    </div>
                    
                    <div className="text-[10px] font-bold text-white uppercase truncate tracking-wide mb-1.5 border-b border-white/5 pb-1">
                      {activeBriefing.title}
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 bg-black/40 border border-white/5 p-1 text-[8px] text-neutral-400 mb-2">
                      <div>HOTSPOT: <span className="text-white font-semibold">{activeBriefing.hotspot}</span></div>
                      <div>COORD: <span className="text-cyan-400">LN:{activeBriefing.lng.toFixed(2)} LA:{activeBriefing.lat.toFixed(2)}</span></div>
                    </div>

                    <div className="text-[9px] leading-relaxed text-neutral-200 border-b border-white/5 pb-1.5 mb-1.5">
                      <span className="text-neutral-500 text-[8px] font-bold uppercase block">TACTICAL ANALYSIS:</span>
                      {activeBriefing.analysis}
                    </div>

                    <div className="text-[9px] leading-relaxed text-neutral-300">
                      <span className="text-neutral-500 text-[8px] font-bold uppercase block">MACRO IMPACT VECTORS:</span>
                      {activeBriefing.impact}
                    </div>
                    
                    <div className="text-[7.5px] text-neutral-500 mt-2 flex justify-between">
                      <span>ID: {activeBriefing.id}</span>
                      <span>STATUS: {activeBriefing.status}</span>
                    </div>
                  </div>
                ) : !threatAnalysisResult && (
                  <div className="text-[8.5px] text-neutral-600 text-center py-4 border border-dashed border-white/5 italic">
                    No active intelligence report loaded. Click on an alert in the Incident Log below or run an AI threat scan.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── SECTION 5: GEOPOLITICAL IMPACT SIMULATOR ── */}
          <div className="border border-white/5 bg-void/40 p-2">
            <div 
              onClick={() => setExpandSimulation(!expandSimulation)}
              className="flex items-center justify-between border-b border-white/5 pb-1 mb-1.5 cursor-pointer text-[10px] font-bold text-neutral-300 uppercase hover:text-white"
            >
              <div className="flex items-center gap-1.5">
                <AlertTriangle size={12} className="text-purple-400" />
                <span>Geopolitical Simulator</span>
              </div>
              {expandSimulation ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </div>

            {expandSimulation && (
              <div className="relative flex flex-col gap-2.5 min-h-[200px]">
                {!user && (
                  <RestrictedAccessOverlay moduleName="Geopolitical Simulator" />
                )}

                
                {/* 1. Setup mode (only if simulation is not running/completed) */}
                {!simulationResult && !simulationLoading && (
                  <div className="flex flex-col gap-2">
                    {/* Latitude/Longitude Display */}
                    <div>
                      <span className="text-neutral-500 text-[8px] uppercase block mb-0.5">Target Coordinates:</span>
                      {clickedLatLng ? (
                        <div className="bg-purple-950/10 border border-purple-500/25 p-1 text-purple-400 font-bold text-[9px] flex justify-between">
                          <span>LAT: {clickedLatLng.lat.toFixed(4)}</span>
                          <span>LNG: {clickedLatLng.lng.toFixed(4)}</span>
                        </div>
                      ) : (
                        <div className="text-[8.5px] text-neutral-500 border border-dashed border-purple-500/20 p-2 text-center">
                          Click map sector or select preset below:
                        </div>
                      )}
                    </div>

                    {/* Presets */}
                    <div className="flex flex-col gap-0.5">
                      <span className="text-neutral-500 text-[8px] uppercase block mb-0.5">Presets:</span>
                      <div className="grid grid-cols-3 gap-0.5">
                        {PRESETS.map((p, idx) => (
                          <button
                            key={idx}
                            onClick={() => handlePresetSelect(p)}
                            className="p-1 bg-purple-950/5 border border-purple-500/15 hover:border-purple-400 text-left text-[8px] text-neutral-300 truncate transition-all duration-150"
                          >
                            {p.name.replace(" Blockade", "").replace(" Escalation", "").replace(" USV Attack", "")}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Scenario input text */}
                    <div>
                      <span className="text-neutral-500 text-[8px] uppercase block mb-0.5">Event Hypothesis:</span>
                      <textarea
                        value={scenarioInput}
                        onChange={(e) => setScenarioInput(e.target.value)}
                        placeholder="e.g., Strike disables military port radar..."
                        rows={2}
                        className="w-full bg-black/45 border border-purple-500/20 p-1.5 text-neutral-200 focus:outline-none focus:border-purple-400 resize-none text-[9px]"
                      />
                    </div>
                    <GlowButton
                      onClick={runSimulation}
                      variant="white"
                      className="w-full text-[9px] py-1.5 border-purple-500/30 text-purple-300 hover:bg-purple-500/10"
                      disabled={!clickedLatLng || !scenarioInput.trim()}
                    >
                      <Play size={10} className="mr-1" /> Run Simulation
                    </GlowButton>
                  </div>
                )}
 
                {/* 2. Simulation Loading / Agent loops */}
                {simulationLoading && (
                  <div className="flex flex-col gap-2 p-2 bg-purple-950/10 border border-purple-500/20 text-[9px]">
                    <div className="flex items-center gap-1.5 font-bold text-purple-400 uppercase tracking-widest animate-pulse">
                      <span className="cyber-spinner border-purple-400 w-3.5 h-3.5" />
                      <span>Running Simulation...</span>
                    </div>
                    <div className="flex flex-col gap-1 border-t border-purple-500/10 pt-1.5 text-neutral-400 font-mono text-[8.5px]">
                      <div className={simulationStep >= 1 ? "text-purple-300 font-semibold" : "text-neutral-600"}>
                        {simulationStep > 1 ? "✔" : simulationStep === 1 ? "⚡" : "○"} [1/4] Starting simulation...
                      </div>
                      <div className={simulationStep >= 2 ? "text-purple-300 font-semibold" : "text-neutral-600"}>
                        {simulationStep > 2 ? "✔" : simulationStep === 2 ? "⚡" : "○"} [2/4] Analyzing local security impact...
                      </div>
                      <div className={simulationStep >= 3 ? "text-purple-300 font-semibold" : "text-neutral-600"}>
                        {simulationStep > 3 ? "✔" : simulationStep === 3 ? "⚡" : "○"} [3/4] Analyzing trade and economic impact...
                      </div>
                      <div className={simulationStep >= 4 ? "text-purple-300 font-semibold" : "text-neutral-600"}>
                        {simulationStep > 4 ? "✔" : simulationStep === 4 ? "⚡" : "○"} [4/4] Analyzing social and civil impact...
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. Output Simulation Results */}
                {simulationResult && !simulationLoading && (
                  <div className="flex flex-col gap-2 border border-purple-500/20 p-2 bg-purple-950/5">
                    {/* Tabs */}
                    <div className="grid grid-cols-4 gap-0.5 border-b border-purple-500/20 pb-1">
                      {(["summary", "military", "economic", "social"] as const).map((tab) => (
                        <button
                          key={tab}
                          onClick={() => setSimTab(tab)}
                          className={`py-0.5 text-[7.5px] uppercase font-extrabold ${simTab === tab ? "bg-purple-800 text-white" : "bg-black/45 text-neutral-500 hover:text-white"}`}
                        >
                          {tab}
                        </button>
                      ))}
                    </div>

                    {/* Report Text Container */}
                    <div className="max-h-40 overflow-y-auto pr-1 text-[9px] text-neutral-300 custom-scrollbar leading-normal">
                      {simTab === "summary" && (
                        <div>
                          <div className="text-[8px] text-purple-400 font-bold uppercase mb-1">SIMULATION SUMMARY</div>
                          <p>{simulationResult.summary}</p>
                        </div>
                      )}
                      
                      {simTab === "military" && (
                        <div className="flex flex-col gap-1.5">
                          <div className="flex justify-between items-center text-[8px] bg-black/40 p-1 font-bold">
                            <span className="text-neutral-500 uppercase">SECURITY IMPACT</span>
                            <span className="text-purple-400">{simulationResult.military.status}</span>
                          </div>
                          <div className="whitespace-pre-line leading-relaxed text-[8.5px] text-neutral-200">
                            {simulationResult.military.report}
                          </div>
                          <div className="text-[7.5px] text-neutral-500">EXCLUSION: {simulationResult.military.exclusionRadiusKm} KM</div>
                        </div>
                      )}

                      {simTab === "economic" && (
                        <div className="flex flex-col gap-1.5">
                          <div className="flex justify-between items-center text-[8px] bg-black/40 p-1 font-bold">
                            <span className="text-neutral-500 uppercase">ECONOMIC IMPACT</span>
                            <span className="text-purple-400">{simulationResult.economic.status}</span>
                          </div>
                          <div className="whitespace-pre-line leading-relaxed text-[8.5px] text-neutral-200">
                            {simulationResult.economic.report}
                          </div>
                          {simulationResult.economic.disruptedPorts?.length > 0 && (
                            <div className="mt-1">
                              <span className="text-neutral-500 text-[7.5px] uppercase font-bold">AFFECTED PORTS:</span>
                              <div className="flex flex-wrap gap-0.5 mt-0.5">
                                {simulationResult.economic.disruptedPorts.map((p: string, i: number) => (
                                  <span key={i} className="bg-purple-950/30 text-purple-300 border border-purple-500/10 px-1 py-0.2 text-[7.5px]">{p}</span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {simTab === "social" && (
                        <div className="flex flex-col gap-1.5">
                          <div className="flex justify-between items-center text-[8px] bg-black/40 p-1 font-bold">
                            <span className="text-neutral-500 uppercase">CIVIL IMPACT</span>
                            <span className="text-purple-400">{simulationResult.social.status}</span>
                          </div>
                          <div className="whitespace-pre-line leading-relaxed text-[8.5px] text-neutral-200">
                            {simulationResult.social.report}
                          </div>
                          <div className="text-[7.5px] text-neutral-500">REFUGEE DISPLACEMENT RISK: {simulationResult.social.refugeeRisk}</div>
                        </div>
                      )}
                    </div>

                    <button 
                      onClick={onClearSimulation}
                      className="w-full mt-1.5 py-1 bg-purple-950/20 hover:bg-purple-950/40 border border-purple-500/25 hover:border-purple-400 text-[8.5px] text-purple-300 uppercase transition-all duration-150 flex items-center justify-center gap-1"
                    >
                      <RotateCcw size={10} /> CLEAR SIMULATION
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── SECTION 6: INCIDENT ALERTS LOG ── */}
          <div className="border border-white/5 bg-void/40 p-2">
            <div 
              onClick={() => setExpandHistory(!expandHistory)}
              className="flex items-center justify-between border-b border-white/5 pb-1 mb-1.5 cursor-pointer text-[10px] font-bold text-neutral-300 uppercase hover:text-white"
            >
              <div className="flex items-center gap-1.5">
                <Radio size={12} className="text-plasma-pink animate-pulse" />
                <span>Incident Alerts Log</span>
              </div>
              {expandHistory ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </div>

            {expandHistory && (
              <div className="relative flex flex-col gap-2 min-h-[150px]">
                {!user && (
                  <RestrictedAccessOverlay moduleName="Incident Alerts Log" compact />
                )}

                <div className="flex justify-between items-center bg-black/40 p-1 border border-white/5">
                  <span className="text-[8px] text-neutral-500">RADAR FREQ: 9.6 GHz</span>
                  <button 
                    onClick={onForceSweep}
                    disabled={isScanningRadar}
                    className="text-[8px] text-plasma-pink font-bold hover:underline uppercase disabled:text-neutral-500"
                  >
                    {isScanningRadar ? "Scanning..." : "[ Scan for Alerts ]"}
                  </button>
                </div>

                <div className="max-h-48 overflow-y-auto pr-1 flex flex-col gap-1.5 custom-scrollbar">
                  {history.length === 0 ? (
                    <div className="text-[8.5px] text-neutral-600 py-3 text-center italic border border-dashed border-white/5">
                      No warning signals recorded
                    </div>
                  ) : (
                    history.map((alert) => {
                      const levelColors: { [key: string]: string } = {
                        CRITICAL: "border-plasma-pink/30 hover:border-plasma-pink/70 bg-plasma-pink/5 text-plasma-pink",
                        HIGH: "border-amber-500/35 hover:border-amber-500/75 bg-amber-500/5 text-amber-400",
                        ELEVATED: "border-cyan-400/25 hover:border-cyan-400/75 bg-cyan-950/10 text-cyan-400"
                      };

                      return (
                        <div
                          key={alert.id}
                          onClick={() => onHistoryItemClick(alert)}
                          className={`p-1.5 border rounded-xs cursor-pointer transition-all duration-150 text-[8.5px] ${levelColors[alert.threatLevel] || "border-neutral-800 text-white"}`}
                        >
                          <div className="flex justify-between items-center font-bold mb-0.5">
                            <span className="uppercase font-extrabold">{alert.threatLevel}</span>
                            <span className="text-neutral-500 text-[8px] font-medium">
                              {alert.timestamp ? new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : "ACTIVE"}
                            </span>
                          </div>
                          <div className="text-[9px] font-bold text-neutral-100 uppercase truncate">
                            {alert.hotspot}
                          </div>
                          <div className="text-neutral-500 font-medium truncate">
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

        </div>
      </GlassPanel>
    </div>
  );
}
