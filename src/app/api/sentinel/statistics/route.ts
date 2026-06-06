import { type NextRequest, NextResponse } from "next/server";
import { SENTINEL_CONFIG } from "@/lib/constants";
import { STATS_EVALSCRIPT } from "@/services/evalscripts";

/**
 * Server-side proxy for Sentinel Hub Statistical API.
 * Accepts a GeoJSON polygon + time range, returns aggregated stats (NDVI, NDMI).
 */

async function getToken(): Promise<string | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/sentinel/token`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.access_token;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { geometry, from, to } = body;

    if (!geometry || !from || !to) {
      return NextResponse.json(
        { error: "Missing geometry, from, or to parameters" },
        { status: 400 }
      );
    }

    const token = await getToken();
    if (!token) {
      return NextResponse.json(
        { error: "Authentication failed" },
        { status: 401 }
      );
    }

    const statsRequest = {
      input: {
        bounds: {
          geometry,
          properties: {
            crs: "http://www.opengis.net/def/crs/EPSG/0/4326",
          },
        },
        data: [
          {
            type: SENTINEL_CONFIG.collectionId,
            dataFilter: {
              timeRange: {
                from: `${from}T00:00:00Z`,
                to: `${to}T23:59:59Z`,
              },
              mosaickingOrder: "leastCC",
            },
          },
        ],
      },
      aggregation: {
        timeRange: {
          from: `${from}T00:00:00Z`,
          to: `${to}T23:59:59Z`,
        },
        aggregationInterval: { of: "P1D" },
        evalscript: STATS_EVALSCRIPT,
        // 0.0001 degrees is roughly 10 meters at the equator
        resx: 0.0001,
        resy: 0.0001,
      },
    };

    const response = await fetch(SENTINEL_CONFIG.statisticalUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(statsRequest),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Statistics API error:", response.status, errorText);
      return NextResponse.json(
        { error: "Statistical API request failed" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Statistics proxy error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
