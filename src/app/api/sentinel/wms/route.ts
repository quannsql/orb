import { type NextRequest, NextResponse } from "next/server";
import { SENTINEL_CONFIG } from "@/lib/constants";

/**
 * Server-side WMS tile proxy for Sentinel Hub.
 * Mapbox GL JS uses this as a raster tile source, and we inject the auth token.
 *
 * Query params: bbox, layers (evalscript mode), time, width, height
 */

async function getToken(): Promise<string | null> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/sentinel/token`
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.access_token;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bbox = searchParams.get("bbox");
    const evalscript = searchParams.get("evalscript");
    const time = searchParams.get("time") || new Date().toISOString().split("T")[0];
    const width = searchParams.get("width") || "512";
    const height = searchParams.get("height") || "512";

    if (!bbox) {
      return NextResponse.json({ error: "Missing bbox" }, { status: 400 });
    }

    const token = await getToken();
    if (!token) {
      return NextResponse.json(
        { error: "Authentication failed" },
        { status: 401 }
      );
    }

    // Build Sentinel Hub Process API request for tile rendering
    const [minX, minY, maxX, maxY] = bbox.split(",").map(Number);
    const timeTo = new Date(time);
    timeTo.setDate(timeTo.getDate() + 1);

    const processRequest = {
      input: {
        bounds: {
          bbox: [minX, minY, maxX, maxY],
          properties: { crs: "http://www.opengis.net/def/crs/EPSG/0/3857" },
        },
        data: [
          {
            type: SENTINEL_CONFIG.collectionId,
            dataFilter: {
              timeRange: {
                from: `${time}T00:00:00Z`,
                to: timeTo.toISOString().split("T")[0] + "T23:59:59Z",
              },
              mosaickingOrder: "leastCC",
            },
          },
        ],
      },
      output: {
        width: parseInt(width),
        height: parseInt(height),
        responses: [
          {
            identifier: "default",
            format: { type: "image/png" },
          },
        ],
      },
      evalscript: evalscript || "",
    };

    const response = await fetch(SENTINEL_CONFIG.processUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "image/png",
      },
      body: JSON.stringify(processRequest),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Sentinel WMS proxy error:", response.status, errorText);
      // Return transparent 1x1 PNG on error so map doesn't break
      return new NextResponse(TRANSPARENT_PNG, {
        status: 200,
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "public, max-age=3600",
        },
      });
    }

    const imageBuffer = await response.arrayBuffer();

    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=3600",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("WMS proxy error:", error);
    return new NextResponse(TRANSPARENT_PNG, {
      status: 200,
      headers: { "Content-Type": "image/png" },
    });
  }
}

// 1x1 transparent PNG fallback
const TRANSPARENT_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64"
);
