"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Shield, TrendingUp, Users, Search, Cpu } from "lucide-react";

interface DebateRound {
  round: number;
  messages: {
    agent: string;
    phase: string;
    data: any;
  }[];
}

interface DebateTranscriptViewerProps {
  transcript: DebateRound[];
  debateSummary?: string;
  debateDuration?: number;
  overallConfidence?: number;
  dissent?: string[];
  consensus?: string[];
  className?: string;
}

const AGENT_CONFIG: Record<string, { label: string; color: string; bgColor: string; borderColor: string; icon: typeof Shield }> = {
  military: {
    label: "SENTINEL-MIL",
    color: "text-red-400",
    bgColor: "bg-red-500/5",
    borderColor: "border-red-500/20",
    icon: Shield,
  },
  economic: {
    label: "SENTINEL-ECON",
    color: "text-amber-400",
    bgColor: "bg-amber-500/5",
    borderColor: "border-amber-500/20",
    icon: TrendingUp,
  },
  social: {
    label: "SENTINEL-SOC",
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/5",
    borderColor: "border-cyan-500/20",
    icon: Users,
  },
  fact_checker: {
    label: "SENTINEL-VERIFY",
    color: "text-purple-400",
    bgColor: "bg-purple-500/5",
    borderColor: "border-purple-500/20",
    icon: Search,
  },
  synthesizer: {
    label: "SENTINEL-CORE",
    color: "text-white",
    bgColor: "bg-white/5",
    borderColor: "border-white/20",
    icon: Cpu,
  },
};

const PHASE_LABELS: Record<string, string> = {
  analysis: "PHASE 1 — INDEPENDENT ANALYSIS",
  cross_exam: "PHASE 2 — CROSS-EXAMINATION",
  rebuttal: "PHASE 3 — REBUTTAL",
  synthesis: "PHASE 4 — SYNTHESIS",
};

export default function DebateTranscriptViewer({
  transcript,
  debateSummary,
  debateDuration,
  overallConfidence,
  dissent,
  consensus,
  className = "",
}: DebateTranscriptViewerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedRounds, setExpandedRounds] = useState<Set<number>>(new Set());

  const toggleRound = (roundIndex: number) => {
    setExpandedRounds((prev) => {
      const next = new Set(prev);
      if (next.has(roundIndex)) {
        next.delete(roundIndex);
      } else {
        next.add(roundIndex);
      }
      return next;
    });
  };

  if (!transcript || transcript.length === 0) return null;

  return (
    <div className={`border border-white/10 bg-black/40 ${className}`}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-2 hover:bg-white/5 transition-all text-[8px]"
      >
        <div className="flex items-center gap-1.5">
          <Cpu size={9} className="text-white animate-pulse" />
          <span className="font-extrabold text-white uppercase tracking-widest">
            AGENT DEBATE TRANSCRIPT
          </span>
        </div>
        <div className="flex items-center gap-2">
          {debateDuration && (
            <span className="text-neutral-500 font-mono">
              {debateDuration.toFixed(1)}s
            </span>
          )}
          {overallConfidence !== undefined && (
            <span className="text-white font-bold bg-white/10 px-1 border border-white/10">
              {overallConfidence}% CONF
            </span>
          )}
          {isExpanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
        </div>
      </button>

      {isExpanded && (
        <div className="p-2 pt-0 flex flex-col gap-2">
          {/* Summary bar */}
          {debateSummary && (
            <div className="text-[7.5px] text-neutral-400 bg-black/60 border border-white/5 p-1.5 italic leading-relaxed">
              {debateSummary}
            </div>
          )}

          {/* Confidence bar */}
          {overallConfidence !== undefined && (
            <div className="flex items-center gap-2 text-[7.5px]">
              <span className="text-neutral-500 font-bold uppercase shrink-0">CONFIDENCE:</span>
              <div className="flex-1 h-1.5 bg-white/5 border border-white/10 relative">
                <div
                  className="h-full bg-white/60 transition-all duration-500"
                  style={{ width: `${overallConfidence}%` }}
                />
              </div>
              <span className="text-white font-bold shrink-0">{overallConfidence}%</span>
            </div>
          )}

          {/* Consensus points */}
          {consensus && consensus.length > 0 && (
            <div className="text-[7.5px]">
              <span className="text-neutral-500 font-bold uppercase block mb-0.5">
                ✓ CONSENSUS POINTS:
              </span>
              {consensus.map((point, i) => (
                <div key={i} className="text-neutral-300 flex gap-1 ml-1">
                  <span className="text-green-500 shrink-0">•</span>
                  <span>{point}</span>
                </div>
              ))}
            </div>
          )}

          {/* Dissent points */}
          {dissent && dissent.length > 0 && (
            <div className="text-[7.5px]">
              <span className="text-neutral-500 font-bold uppercase block mb-0.5">
                ✗ DISSENT POINTS:
              </span>
              {dissent.map((point, i) => (
                <div key={i} className="text-neutral-300 flex gap-1 ml-1">
                  <span className="text-red-400 shrink-0">•</span>
                  <span>{point}</span>
                </div>
              ))}
            </div>
          )}

          {/* Debate Rounds */}
          <div className="flex flex-col gap-1">
            {transcript.map((round, roundIdx) => {
              const firstMsg = round.messages?.[0];
              const phase = firstMsg?.phase || "unknown";
              const phaseLabel = PHASE_LABELS[phase] || `ROUND ${round.round}`;
              const isRoundExpanded = expandedRounds.has(roundIdx);

              return (
                <div
                  key={roundIdx}
                  className="border border-white/5 bg-black/30"
                >
                  <button
                    onClick={() => toggleRound(roundIdx)}
                    className="w-full flex items-center justify-between p-1.5 hover:bg-white/5 transition-all text-[7.5px]"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="w-1 h-1 bg-white/50 rounded-full" />
                      <span className="text-neutral-400 font-bold uppercase tracking-wider">
                        {phaseLabel}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {round.messages?.map((msg, msgIdx) => {
                        const config = AGENT_CONFIG[msg.agent] || AGENT_CONFIG.synthesizer;
                        return (
                          <span
                            key={msgIdx}
                            className={`w-1.5 h-1.5 rounded-full ${config.color.replace("text-", "bg-")}`}
                            title={config.label}
                          />
                        );
                      })}
                      {isRoundExpanded ? <ChevronUp size={8} /> : <ChevronDown size={8} />}
                    </div>
                  </button>

                  {isRoundExpanded && (
                    <div className="p-1.5 pt-0 flex flex-col gap-1">
                      {round.messages?.map((msg, msgIdx) => {
                        const config = AGENT_CONFIG[msg.agent] || AGENT_CONFIG.synthesizer;
                        const IconComponent = config.icon;
                        const confidence = msg.data?.confidenceScore;

                        return (
                          <div
                            key={msgIdx}
                            className={`p-1.5 border ${config.borderColor} ${config.bgColor} text-[7.5px]`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-1">
                                <IconComponent size={8} className={config.color} />
                                <span className={`font-bold uppercase tracking-wider ${config.color}`}>
                                  {config.label}
                                </span>
                              </div>
                              {confidence !== undefined && (
                                <span className="text-neutral-500 font-mono">
                                  {confidence}% conf
                                </span>
                              )}
                            </div>

                            {/* Show key data points */}
                            {msg.data?.status && (
                              <div className="text-neutral-400">
                                STATUS: <span className="text-white font-bold">{msg.data.status}</span>
                              </div>
                            )}
                            {msg.data?.report && (
                              <div className="text-neutral-300 mt-0.5 max-h-16 overflow-y-auto cyber-scrollbar leading-relaxed whitespace-pre-line">
                                {typeof msg.data.report === "string"
                                  ? msg.data.report.slice(0, 300) + (msg.data.report.length > 300 ? "..." : "")
                                  : JSON.stringify(msg.data.report).slice(0, 300)}
                              </div>
                            )}
                            {msg.data?.overallAssessment && (
                              <div className="text-neutral-300 mt-0.5 max-h-16 overflow-y-auto cyber-scrollbar leading-relaxed">
                                {msg.data.overallAssessment}
                              </div>
                            )}
                            {msg.data?.dissent && (
                              <div className="text-red-400/80 mt-0.5 text-[7px] italic">
                                ⚠ {msg.data.dissent}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
