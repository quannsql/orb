"use client";

import { useState, useCallback } from "react";
import type { Feature, Polygon, GeoJsonProperties } from "geojson";
import type { PolygonStats } from "@/types/sentinel";
import { calculateArea } from "@/lib/utils";
import { fetchPolygonStats } from "@/services/sentinel";

/**
 * Hook for polygon drawing → statistical analysis pipeline.
 */
export function usePolygonAnalysis() {
  const [stats, setStats] = useState<PolygonStats | null>(null);
  const [polygon, setPolygon] = useState<Feature<
    Polygon,
    GeoJsonProperties
  > | null>(null);

  const analyzePolygon = useCallback(
    async (
      feature: Feature<Polygon, GeoJsonProperties>,
      dateFrom: string,
      dateTo: string
    ) => {
      setPolygon(feature);

      // Calculate area immediately (client-side)
      const area = calculateArea(feature);

      setStats({
        areaKm2: area.km2,
        areaHectares: area.hectares,
        meanNDVI: null,
        meanMoisture: null,
        cloudCoverage: null,
        pixelCount: 0,
        dateRange: { from: dateFrom, to: dateTo },
        loading: true,
        error: null,
      });

      try {
        const result = await fetchPolygonStats(
          feature.geometry,
          dateFrom,
          dateTo
        );

        // Parse the statistical response
        const intervals = result?.data || [];
        if (intervals.length > 0) {
          const latest = intervals[intervals.length - 1];
          const ndviStats = latest?.outputs?.ndvi?.bands?.B0?.stats;
          const ndmiStats = latest?.outputs?.ndmi?.bands?.B0?.stats;

          setStats((prev) =>
            prev
              ? {
                  ...prev,
                  meanNDVI: ndviStats?.mean ?? null,
                  meanMoisture: ndmiStats?.mean ?? null,
                  pixelCount: ndviStats?.sampleCount ?? 0,
                  cloudCoverage:
                    ndviStats?.noDataCount != null &&
                    ndviStats?.sampleCount != null
                      ? Math.round(
                          (ndviStats.noDataCount /
                            (ndviStats.sampleCount + ndviStats.noDataCount)) *
                            100
                        )
                      : null,
                  loading: false,
                }
              : null
          );
        } else {
          setStats((prev) =>
            prev ? { ...prev, loading: false, error: "No data available for this area/date range" } : null
          );
        }
      } catch (err) {
        setStats((prev) =>
          prev
            ? {
                ...prev,
                loading: false,
                error:
                  err instanceof Error
                    ? err.message
                    : "Failed to fetch statistics",
              }
            : null
        );
      }
    },
    []
  );

  const clearAnalysis = useCallback(() => {
    setStats(null);
    setPolygon(null);
  }, []);

  return {
    stats,
    polygon,
    analyzePolygon,
    clearAnalysis,
  };
}
