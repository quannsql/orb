"use client";

import { useState, useEffect } from "react";
import GlassPanel from "@/components/ui/GlassPanel";
import GlowButton from "@/components/ui/GlowButton";
import { Play, RotateCcw, AlertTriangle, Shield, TrendingUp, Users } from "lucide-react";

interface ButterflyPanelProps {
  isOpen: boolean;
  onToggleOpen: () => void;
  clickedLatLng: { lng: number; lat: number } | null;
  onStartSimulation: (lng: number, lat: number, scenario: string) => Promise<any>;
  onClearSimulation: () => void;
  simulationResult: any;
}

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
    name: "Mekong Delta Heatwave",
    scenario: "Severe regional drought triggers agricultural collapse, microchip shipping delays, and migration flows.",
    lng: 105.5,
    lat: 9.5,
  },
];

export default function ButterflyPanel({
  isOpen,
  onToggleOpen,
  clickedLatLng,
  onStartSimulation,
  onClearSimulation,
  simulationResult,
}: ButterflyPanelProps) {
  const [scenario, setScenario] = useState("");
  const [lng, setLng] = useState<number | null>(null);
  const [lat, setLat] = useState<number | null>(null);

  const [simStep, setSimStep] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"summary" | "military" | "economic" | "social">("summary");

  // Sync with map clicks
  useEffect(() => {
    if (clickedLatLng) {
      setLng(Number(clickedLatLng.lng.toFixed(4)));
      setLat(Number(clickedLatLng.lat.toFixed(4)));
      if (!scenario) {
        setScenario("Geopolitical event causing supply chain disruptions and political shifts.");
      }
    }
  }, [clickedLatLng]);

  const selectPreset = (preset: typeof PRESETS[number]) => {
    setLng(preset.lng);
    setLat(preset.lat);
    setScenario(preset.scenario);
  };

  const handleRun = async () => {
    if (!lng || !lat || !scenario || loading) return;
    setLoading(true);
    setSimStep(1);

    // Dynamic step progress simulation to look premium and agentic
    const timers = [
      setTimeout(() => setSimStep(2), 2000), // Military
      setTimeout(() => setSimStep(3), 4500), // Economic
      setTimeout(() => setSimStep(4), 7000), // Social
      setTimeout(() => setSimStep(5), 9000), // Synthesis
    ];

    try {
      await onStartSimulation(lng, lat, scenario);
    } catch (err) {
      console.error(err);
      // Clear timers
      timers.forEach(clearTimeout);
      setSimStep(0);
    } finally {
      setLoading(false);
      setSimStep(0);
      setActiveTab("summary");
    }
  };

  const handleClear = () => {
    onClearSimulation();
    setScenario("");
    setLng(null);
    setLat(null);
    setSimStep(0);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed left-0 top-12 bottom-12 z-30 flex flex-col transition-all duration-300"
      id="butterfly-panel"
    >
      <GlassPanel
        className="w-72 flex-1 slide-in-left cyber-scrollbar overflow-y-auto rounded-none border-y-0 border-l-0 bg-[rgba(10,5,20,0.85)] border-r-purple-500/30"
        padding="sm"
        glowColor="purple"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-purple-500/20">
          <h3 className="text-[10px] font-mono text-purple-400 uppercase tracking-widest font-bold flex items-center gap-1.5 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
            Butterfly Engine
          </h3>
          <span className="text-[8px] font-mono text-neutral-500">
            LANGGRAPH / GROK-4.3
          </span>
        </div>

        {/* Setup State */}
        {!simulationResult && !loading && (
          <div className="flex flex-col gap-3 font-mono text-[11px]">
            <div>
              <span className="text-neutral-500 text-[9px] uppercase block mb-1">Coordinates</span>
              {lng !== null && lat !== null ? (
                <div className="bg-black/40 border border-purple-500/10 p-2 text-purple-400">
                  LAT: {lat} | LNG: {lng}
                </div>
              ) : (
                <div className="text-[10px] text-neutral-400 border border-dashed border-purple-500/20 p-3 text-center">
                  Click on map or select a preset below
                </div>
              )}
            </div>

            <div>
              <span className="text-neutral-500 text-[9px] uppercase block mb-1">Presets</span>
              <div className="flex flex-col gap-1">
                {PRESETS.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => selectPreset(p)}
                    className="p-1.5 bg-purple-950/10 border border-purple-500/10 hover:border-purple-400/40 text-left text-[10px] text-neutral-300 transition-colors"
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="text-neutral-500 text-[9px] uppercase block mb-1">Hypothetical Scenario</span>
              <textarea
                value={scenario}
                onChange={(e) => setScenario(e.target.value)}
                placeholder="Describe the geopolitical event..."
                rows={3}
                className="w-full bg-black/40 border border-purple-500/20 p-2 text-neutral-200 focus:outline-none focus:border-purple-400 resize-none text-[10px]"
              />
            </div>

            <GlowButton
              onClick={handleRun}
              variant="white"
              className="w-full mt-2 text-[10px]"
              disabled={!lng || !scenario}
            >
              <Play size={10} className="mr-1.5" />
              RUN GEOPOLITICAL SIMULATION
            </GlowButton>
          </div>
        )}

        {/* Loading / Agent thinking states */}
        {loading && (
          <div className="flex flex-col gap-4 font-mono text-[10px] text-neutral-300 mt-4 p-2 bg-purple-950/10 border border-purple-500/20">
            <div className="flex items-center gap-2">
              <span className="cyber-spinner border-purple-400" />
              <span className="text-purple-400 font-bold uppercase tracking-wider">Simulating...</span>
            </div>

            <div className="flex flex-col gap-2 border-t border-purple-500/10 pt-2.5">
              <div className={`flex items-center gap-1.5 ${simStep >= 1 ? "text-purple-400" : "text-neutral-600"}`}>
                <span>{simStep > 1 ? "✔" : simStep === 1 ? "◷" : "○"}</span>
                <span>[INIT] Spin up Agent pipeline</span>
              </div>
              <div className={`flex items-center gap-1.5 ${simStep >= 2 ? "text-purple-400" : "text-neutral-600"}`}>
                <span>{simStep > 2 ? "✔" : simStep === 2 ? "◷" : "○"}</span>
                <span>[MILITARY] Exclusions & containment</span>
              </div>
              <div className={`flex items-center gap-1.5 ${simStep >= 3 ? "text-purple-400" : "text-neutral-600"}`}>
                <span>{simStep > 3 ? "✔" : simStep === 3 ? "◷" : "○"}</span>
                <span>[ECONOMIC] Trade routes & inflation</span>
              </div>
              <div className={`flex items-center gap-1.5 ${simStep >= 4 ? "text-purple-400" : "text-neutral-600"}`}>
                <span>{simStep > 4 ? "✔" : simStep === 4 ? "◷" : "○"}</span>
                <span>[SOCIAL] Stability & migration</span>
              </div>
              <div className={`flex items-center gap-1.5 ${simStep >= 5 ? "text-purple-400" : "text-neutral-600"}`}>
                <span>{simStep === 5 ? "◷" : "○"}</span>
                <span>[SYNTHESIS] Compilation</span>
              </div>
            </div>
          </div>
        )}

        {/* Output Report Tabs */}
        {simulationResult && !loading && (
          <div className="flex flex-col h-full font-mono text-[10px] gap-2">
            {/* Tabs */}
            <div className="grid grid-cols-4 gap-0.5 border-b border-purple-500/20 pb-1.5 shrink-0">
              {(["summary", "military", "economic", "social"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-1 text-[8px] uppercase tracking-tighter ${
                    activeTab === tab
                      ? "bg-purple-800 text-white font-bold"
                      : "bg-black/30 text-neutral-400 hover:text-white"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Content Area */}
            <div className="flex-1 min-h-[200px] overflow-y-auto pr-1 custom-scrollbar text-neutral-300">
              {activeTab === "summary" && (
                <div className="flex flex-col gap-2">
                  <h4 className="text-[10px] text-purple-400 font-bold uppercase tracking-wider">
                    Butterfly Synthesis
                  </h4>
                  <p className="leading-relaxed text-[10px]">{simulationResult.summary}</p>
                </div>
              )}

              {activeTab === "military" && (
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center bg-black/40 border border-purple-500/10 p-1.5">
                    <span className="text-neutral-500 text-[8px] uppercase">STATUS</span>
                    <span className="text-purple-400 font-bold">{simulationResult.military.status}</span>
                  </div>
                  <h4 className="text-[10px] text-purple-400 font-bold uppercase tracking-wider flex items-center gap-1">
                    <Shield size={10} /> SECURITY REPORT
                  </h4>
                  <div className="text-[10px] leading-relaxed whitespace-pre-line">
                    {simulationResult.military.report}
                  </div>
                  <div className="text-[8px] text-neutral-500 mt-2">
                    Exclusion Radius: {simulationResult.military.exclusionRadiusKm} KM
                  </div>
                </div>
              )}

              {activeTab === "economic" && (
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center bg-black/40 border border-purple-500/10 p-1.5">
                    <span className="text-neutral-500 text-[8px] uppercase">TRADE STATUS</span>
                    <span className="text-purple-400 font-bold">{simulationResult.economic.status}</span>
                  </div>
                  <h4 className="text-[10px] text-purple-400 font-bold uppercase tracking-wider flex items-center gap-1">
                    <TrendingUp size={10} /> MACRO SUPPLY CHAIN
                  </h4>
                  <div className="text-[10px] leading-relaxed whitespace-pre-line">
                    {simulationResult.economic.report}
                  </div>
                  {simulationResult.economic.disruptedPorts?.length > 0 && (
                    <div className="mt-2">
                      <span className="text-neutral-500 text-[8px] uppercase block mb-1">AFFECTED PORTS</span>
                      <div className="flex flex-wrap gap-1">
                        {simulationResult.economic.disruptedPorts.map((p: string, i: number) => (
                          <span key={i} className="bg-purple-950/20 text-purple-300 border border-purple-500/20 px-1 py-0.5 text-[8px]">
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "social" && (
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center bg-black/40 border border-purple-500/10 p-1.5">
                    <span className="text-neutral-500 text-[8px] uppercase">STABILITY</span>
                    <span className="text-purple-400 font-bold">{simulationResult.social.status}</span>
                  </div>
                  <h4 className="text-[10px] text-purple-400 font-bold uppercase tracking-wider flex items-center gap-1">
                    <Users size={10} /> SOCIO-POLITICAL OUTLOOK
                  </h4>
                  <div className="text-[10px] leading-relaxed whitespace-pre-line">
                    {simulationResult.social.report}
                  </div>
                  <div className="text-[8px] text-neutral-500 mt-2">
                    Refugee Displacement Risk: {simulationResult.social.refugeeRisk}
                  </div>
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="pt-2 border-t border-purple-500/10 shrink-0">
              <GlowButton onClick={handleClear} variant="ghost" className="w-full text-[9px] py-1 border border-purple-500/20 hover:bg-purple-500/10 text-purple-300">
                <RotateCcw size={10} className="mr-1.5" />
                RESET ENGINE
              </GlowButton>
            </div>
          </div>
        )}
      </GlassPanel>
    </div>
  );
}
