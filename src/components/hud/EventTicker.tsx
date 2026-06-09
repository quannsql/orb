"use client";

import { useState } from "react";
import { useEventTicker } from "@/hooks/useEventTicker";
import GlassPanel from "@/components/ui/GlassPanel";
import { ChevronDown, ChevronUp, Radio } from "lucide-react";

/**
 * Monochrome-themed scrolling event ticker.
 */
export default function EventTicker() {
  const { events } = useEventTicker();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed top-14 right-4 z-20 w-80 transition-all duration-300" id="event-ticker">
      <GlassPanel padding="sm" glowColor="white" className="overflow-hidden">
        {/* Header */}
        <div 
          onClick={() => setIsOpen(!isOpen)} 
          className="flex items-center gap-2 mb-0 pb-1.5 border-b border-white/10 cursor-pointer select-none"
        >
          <Radio size={12} className="text-white/70 animate-pulse" />
          <span className="text-[9px] font-mono text-white/80 uppercase tracking-widest font-bold">
            Live Feed
          </span>
          <span className="text-[8px] font-mono text-neutral-500 ml-auto mr-1">
            {events.length} EVENTS
          </span>
          <div className="text-neutral-500 hover:text-white transition-colors">
            {isOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </div>
        </div>

        {isOpen && (
          <>
            {/* Event list */}
            <div className="max-h-40 overflow-hidden cyber-scrollbar mt-2">
              {events.slice(0, 8).map((event, i) => (
                <div
                  key={event.id}
                  className={`
                    flex items-start gap-2 py-1 
                    ${i === 0 ? "fade-in" : ""}
                    ${i === 0 ? "opacity-100" : i < 3 ? "opacity-90" : "opacity-75"}
                    transition-opacity duration-500
                  `}
                >
                  <span className="text-[8px] font-mono text-neutral-500 mt-0.5 shrink-0">
                    {event.timestamp.toLocaleTimeString("en-US", {
                      hour12: false,
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </span>
                  <span
                    className={`text-[9px] font-mono leading-tight ${
                      event.type === "alert"
                        ? "text-warning-amber"
                        : event.type === "system"
                          ? "text-neutral-400"
                          : "text-white/70"
                    }`}
                  >
                    {event.message}
                  </span>
                </div>
              ))}
            </div>

            {/* Bottom marquee */}
            <div className="mt-2 pt-1.5 border-t border-white/5 overflow-hidden">
              <div className="ticker-marquee whitespace-nowrap">
                <span className="text-[8px] font-mono text-white/30 inline-block pr-12">
                  {events
                    .slice(0, 5)
                    .map((e) => e.message)
                    .join(" ░ ")}
                </span>
                <span className="text-[8px] font-mono text-white/30 inline-block pr-12">
                  {events
                    .slice(0, 5)
                    .map((e) => e.message)
                    .join(" ░ ")}
                </span>
              </div>
            </div>
          </>
        )}
      </GlassPanel>
    </div>
  );
}
