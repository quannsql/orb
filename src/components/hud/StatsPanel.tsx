"use client";

import type { PolygonStats } from "@/types/sentinel";
import GlassPanel from "@/components/ui/GlassPanel";
import GlowButton from "@/components/ui/GlowButton";
import DataLabel from "@/components/ui/DataLabel";
import MatrixText from "@/components/ui/MatrixText";
import { formatNumber, formatDate } from "@/lib/utils";

interface StatsPanelProps {
  stats: PolygonStats | null;
  onClose: () => void;
}

/**
 * NDVI gauge bar component.
 */
function GaugeBar({
  value,
  min,
  max,
  label,
  colors,
}: {
  value: number | null;
  min: number;
  max: number;
  label: string;
  colors: string;
}) {
  if (value === null) return null;
  const percent = ((value - min) / (max - min)) * 100;

  return (
    <div className="mt-2">
      <div className="flex justify-between mb-1">
        <span className="text-[9px] font-mono text-neutral-400 uppercase">
          {label}
        </span>
        <span className="text-[10px] font-mono glow-text-white">
          {value.toFixed(3)}
        </span>
      </div>
      <div className="h-2 rounded-none bg-[rgba(255,255,255,0.05)] overflow-hidden">
        <div
          className="h-full rounded-none transition-all duration-700 ease-out"
          style={{
            width: `${Math.max(0, Math.min(100, percent))}%`,
            background: colors,
          }}
        />
      </div>
    </div>
  );
}

/**
 * Right-side panel showing polygon analysis results.
 */
export default function StatsPanel({ stats, onClose }: StatsPanelProps) {
  if (!stats) return null;

  return (
    <div className="fixed right-0 top-12 bottom-12 z-30 w-72 flex flex-col" id="stats-panel">
      <GlassPanel className="flex-1 slide-in-right rounded-none border-y-0 border-r-0 overflow-y-auto" padding="md">
        {/* Header */}
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-neutral-600/20">
          <h3 className="text-[10px] font-mono text-neutral-300 uppercase tracking-widest">
            ▣ Polygon Analysis
          </h3>
          <GlowButton onClick={onClose} size="sm" variant="ghost" id="stats-close">
            ✕
          </GlowButton>
        </div>

        {/* Loading state */}
        {stats.loading && (
          <div className="flex items-center justify-center py-6 gap-3">
            <span className="cyber-spinner" />
            <MatrixText text="Analyzing satellite data..." speed={8} color="white" />
          </div>
        )}

        {/* Error state */}
        {stats.error && (
          <div className="text-[11px] font-mono text-plasma-pink py-4 text-center">
            ⚠ {stats.error}
          </div>
        )}

        {/* Area data (always available immediately) */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <DataLabel
            label="Area"
            value={formatNumber(stats.areaKm2)}
            unit="km²"
            color="white"
          />
          <DataLabel
            label="Area"
            value={formatNumber(stats.areaHectares)}
            unit="ha"
            color="white"
          />
        </div>

        {/* Date range */}
        <div className="text-[9px] font-mono text-neutral-500 mb-3">
          {formatDate(stats.dateRange.from)} → {formatDate(stats.dateRange.to)}
        </div>

        {/* Spectral stats (after API response) */}
        {!stats.loading && !stats.error && (
          <>
            {/* NDVI Gauge */}
            <GaugeBar
              value={stats.meanNDVI}
              min={-1}
              max={1}
              label="Mean NDVI"
              colors="linear-gradient(90deg, #111115, #555562, #9999a6, #ffffff)"
            />

            {/* Moisture Gauge */}
            <GaugeBar
              value={stats.meanMoisture}
              min={-1}
              max={1}
              label="Mean NDMI"
              colors="linear-gradient(90deg, #111115, #555562, #9999a6, #ffffff)"
            />

            {/* Pixel & cloud info */}
            <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-neutral-600/20">
              <DataLabel
                label="Pixels"
                value={stats.pixelCount.toLocaleString()}
                color="white"
              />
              <DataLabel
                label="Cloud"
                value={
                  stats.cloudCoverage !== null
                    ? `${stats.cloudCoverage}%`
                    : "N/A"
                }
                color="white"
              />
            </div>

            {/* AI Integration Actions */}
            <div className="flex flex-col gap-2 mt-4 pt-3 border-t border-white/10">
              <span className="text-[9px] font-mono text-neutral-400 uppercase tracking-widest text-center mb-1">
                AI Intelligence Core
              </span>
              <GlowButton 
                onClick={() => document.dispatchEvent(new CustomEvent("generate-osint", { detail: stats }))} 
                variant="white"
                className="w-full text-[10px] py-1.5"
              >
                [ GENERATE REPORT ]
              </GlowButton>
              <GlowButton 
                onClick={() => document.dispatchEvent(new CustomEvent("run-anomaly", { detail: stats }))}
                variant="ghost"
                className="w-full text-[10px] py-1.5 text-neutral-400 hover:text-white"
              >
                [ SCAN FOR ANOMALIES ]
              </GlowButton>
            </div>
          </>
        )}
      </GlassPanel>
    </div>
  );
}
