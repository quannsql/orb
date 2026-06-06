"use client";

import { useState, useCallback, useRef } from "react";
import { daysAgo } from "@/lib/utils";
import { TIME_CONFIG } from "@/lib/constants";

/**
 * Hook for managing time-travel slider state.
 */
export function useTimeTravel() {
  const [selectedDate, setSelectedDate] = useState(daysAgo(7));
  const [isPlaying, setIsPlaying] = useState(false);
  const [stepDays, setStepDays] = useState<number>(TIME_CONFIG.defaultStepDays);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Date range
  const minDate = `${TIME_CONFIG.minYear}-01-01`;
  const maxDate = new Date().toISOString().split("T")[0];

  /**
   * Convert date string to days-since-epoch for slider value.
   */
  const dateToValue = useCallback((date: string): number => {
    return Math.floor(new Date(date).getTime() / (1000 * 60 * 60 * 24));
  }, []);

  /**
   * Convert slider value back to date string.
   */
  const valueToDate = useCallback((value: number): string => {
    const d = new Date(value * 1000 * 60 * 60 * 24);
    return d.toISOString().split("T")[0];
  }, []);

  /**
   * Step forward in time.
   */
  const stepForward = useCallback(() => {
    setSelectedDate((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + stepDays);
      const maxD = new Date(maxDate);
      if (d > maxD) {
        // Loop back to beginning if playing
        return minDate;
      }
      return d.toISOString().split("T")[0];
    });
  }, [stepDays, maxDate, minDate]);

  /**
   * Step backward in time.
   */
  const stepBackward = useCallback(() => {
    setSelectedDate((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() - stepDays);
      const minD = new Date(minDate);
      if (d < minD) return minDate;
      return d.toISOString().split("T")[0];
    });
  }, [stepDays, minDate]);

  /**
   * Toggle auto-play.
   */
  const togglePlay = useCallback(() => {
    setIsPlaying((prev) => {
      if (!prev) {
        // Start playing
        intervalRef.current = setInterval(() => {
          stepForward();
        }, TIME_CONFIG.autoPlayIntervalMs);
        return true;
      } else {
        // Stop
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        return false;
      }
    });
  }, [stepForward]);

  return {
    selectedDate,
    setSelectedDate,
    isPlaying,
    togglePlay,
    stepForward,
    stepBackward,
    stepDays,
    setStepDays,
    minDate,
    maxDate,
    dateToValue,
    valueToDate,
  };
}
