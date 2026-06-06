import type { SpectralMode } from "@/types/sentinel";
import { EVALSCRIPTS } from "./evalscripts";

/**
 * Client-side Sentinel Hub service.
 * Builds tile URLs and calls internal API proxies.
 */

/**
 * Generates the tile URL template for Mapbox raster source.
 * Uses our internal proxy to add auth transparently.
 */
export function buildTileUrl(
  mode: SpectralMode,
  date: string
): string {
  const evalscript = encodeURIComponent(EVALSCRIPTS[mode].script);
  return `/api/sentinel/wms?bbox={bbox-epsg-3857}&evalscript=${evalscript}&time=${date}&width=512&height=512`;
}

/**
 * Fetches the OAuth token from our proxy.
 */
export async function fetchToken(): Promise<{
  access_token: string;
  expires_in: number;
} | null> {
  try {
    const res = await fetch("/api/sentinel/token");
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

/**
 * Calls the Statistical API proxy for polygon analysis.
 */
export async function fetchPolygonStats(
  geometry: GeoJSON.Geometry,
  from: string,
  to: string
) {
  const res = await fetch("/api/sentinel/statistics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ geometry, from, to }),
  });

  if (!res.ok) {
    throw new Error(`Statistics API error: ${res.status}`);
  }

  return res.json();
}
