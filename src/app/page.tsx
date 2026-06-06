"use client";

import dynamic from "next/dynamic";

/**
 * Dynamic import with SSR disabled — Mapbox GL JS requires browser DOM APIs.
 * "use client" is required for next/dynamic with ssr:false in Next.js 16+.
 */
const MapContainer = dynamic(
  () => import("@/components/map/MapContainer"),
  {
    ssr: false,
    loading: () => (
      <div className="w-screen h-screen bg-void flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="cyber-spinner !w-10 !h-10 !border-[3px]" />
          <span className="text-xs font-mono glow-text-cyan uppercase tracking-widest">
            Initializing ORB
          </span>
          <span className="text-[9px] font-mono text-neutral-600">
            Loading geospatial engine...
          </span>
        </div>
      </div>
    ),
  }
);

export default function Home() {
  return (
    <main className="w-screen h-screen overflow-hidden">
      <MapContainer />
    </main>
  );
}
