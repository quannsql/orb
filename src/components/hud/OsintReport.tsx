"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import GlassPanel from "@/components/ui/GlassPanel";

interface OsintReportProps {
  report: string;
  onClose: () => void;
}

export default function OsintReport({ report, onClose }: OsintReportProps) {
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(true);

  useEffect(() => {
    let i = 0;
    setDisplayedText("");
    setIsTyping(true);

    const interval = setInterval(() => {
      if (i < report.length) {
        const charsToAdd = report.slice(i, i + 4);
        setDisplayedText((prev) => prev + charsToAdd);
        i += 4;
      } else {
        setIsTyping(false);
        clearInterval(interval);
      }
    }, 8);

    return () => clearInterval(interval);
  }, [report]);

  return (
    <>
      {/* Backdrop overlay */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 cursor-pointer animate-fade-in"
      />

      {/* Centered Modal Panel */}
      <GlassPanel className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] max-w-[95vw] max-h-[75vh] flex flex-col z-50 pointer-events-auto overflow-hidden animate-fade-in">
        <div className="flex items-center justify-between border-b border-white/10 p-3 bg-black/50">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
            <h2 className="text-sm font-mono text-white glow-text-white uppercase tracking-widest font-bold">
              Intelligence Briefing
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="p-4 overflow-y-auto custom-scrollbar flex-1 bg-black/40 font-mono text-xs text-neutral-300 leading-relaxed [&_h1]:text-sm [&_h1]:font-bold [&_h1]:text-white [&_h1]:mb-2 [&_h2]:text-sm [&_h2]:font-bold [&_h2]:text-white [&_h2]:mb-2 [&_strong]:text-white [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-4 [&_li]:mb-1 [&_hr]:border-neutral-700 [&_hr]:my-3">
          <ReactMarkdown>{displayedText}</ReactMarkdown>
          {isTyping && <span className="animate-pulse bg-neutral-300 w-2 h-3 inline-block ml-1 align-middle" />}
        </div>
        
        <div className="border-t border-white/10 p-2 text-center text-[10px] text-neutral-500 font-mono bg-black/50">
          CLASSIFIED // ORB-CORE-OSINT // {new Date().toISOString()}
        </div>
      </GlassPanel>
    </>
  );
}
