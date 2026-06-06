"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { TickerEvent } from "@/types/ui";
import { TICKER_EVENTS } from "@/lib/constants";
import { generateId } from "@/lib/utils";

/**
 * Hook for simulated live event ticker.
 * Generates matrix-style geo events at random intervals.
 */
export function useEventTicker(maxEvents = 50) {
  const [events, setEvents] = useState<TickerEvent[]>([]);
  const indexRef = useRef(0);

  const addEvent = useCallback(() => {
    const template =
      TICKER_EVENTS[indexRef.current % TICKER_EVENTS.length];
    indexRef.current++;

    const types: TickerEvent["type"][] = [
      "coordinate",
      "event",
      "alert",
      "system",
    ];

    const newEvent: TickerEvent = {
      id: generateId(),
      timestamp: new Date(),
      message: template,
      type: types[Math.floor(Math.random() * types.length)],
    };

    setEvents((prev) => {
      const updated = [newEvent, ...prev];
      return updated.slice(0, maxEvents);
    });
  }, [maxEvents]);

  useEffect(() => {
    // Seed initial events
    for (let i = 0; i < 5; i++) {
      addEvent();
    }

    // Add new events at random intervals (3-8 seconds)
    const scheduleNext = () => {
      const delay = 3000 + Math.random() * 5000;
      return setTimeout(() => {
        addEvent();
        timerRef.current = scheduleNext();
      }, delay);
    };

    const timerRef: { current: ReturnType<typeof setTimeout> | null } = {
      current: scheduleNext(),
    };

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [addEvent]);

  return { events };
}
