import { NextResponse } from "next/server";
import { cacheGet, cacheSet } from "@/lib/redis";
import { checkCORS, rateLimitByIP } from "@/lib/auth-api";

const CACHE_KEY = "disasters:cache:global";
const CACHE_TTL = 600; // 10 minutes

export async function GET(request: Request) {
  try {
    // 1. CORS validation
    if (!checkCORS(request)) {
      return NextResponse.json({ error: "Access denied: CORS validation failed" }, { status: 403 });
    }

    // 2. IP Rate Limiting Check (allow up to 20 requests per minute for this general feed)
    const isIPAllowed = await rateLimitByIP(request, 20, 60);
    if (!isIPAllowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Maximum 20 disaster checks per minute." },
        { status: 429 }
      );
    }

    // 3. Cache Check
    const cachedData = await cacheGet<any[]>(CACHE_KEY);
    if (cachedData && Array.isArray(cachedData)) {
      console.log("[Disaster API] Serving disasters from Redis cache");
      return NextResponse.json(cachedData);
    }

    console.log("[Disaster API] Cache miss. Fetching from USGS and GDACS...");
    const disasters: any[] = [];

    // --- FETCH USGS SEISMIC DATA ---
    try {
      const usgsRes = await fetch("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.geojson", {
        headers: { "Accept": "application/json" },
        next: { revalidate: 300 } // Fetch cache validation Next.js hint
      });

      if (usgsRes.ok) {
        const usgsData = await usgsRes.json();
        if (usgsData.features && Array.isArray(usgsData.features)) {
          usgsData.features.forEach((f: any) => {
            if (f.geometry && f.geometry.coordinates) {
              const mag = f.properties.mag;
              disasters.push({
                id: f.id || `USGS-${f.properties.time}`,
                source: "USGS",
                type: "EARTHQUAKE",
                title: f.properties.title,
                magnitude: mag,
                place: f.properties.place || "Unknown Epicenter",
                lng: f.geometry.coordinates[0],
                lat: f.geometry.coordinates[1],
                depth: f.geometry.coordinates[2] || 0,
                time: new Date(f.properties.time).toISOString(),
                severity: mag >= 6.0 ? "CRITICAL" : mag >= 5.0 ? "HIGH" : "ELEVATED",
                details: `Magnitude: ${mag} | Depth: ${f.geometry.coordinates[2] || 0}km`
              });
            }
          });
        }
      }
    } catch (usgsErr) {
      console.error("[Disaster API] Error fetching USGS data:", usgsErr);
    }

    // --- FETCH GDACS NATURAL HAZARD DATA ---
    try {
      const gdacsRes = await fetch("https://www.gdacs.org/xml/rss.xml", {
        next: { revalidate: 600 }
      });

      if (gdacsRes.ok) {
        const xmlText = await gdacsRes.text();
        const itemRegex = /<item>([\s\S]*?)<\/item>/g;
        let match;
        
        while ((match = itemRegex.exec(xmlText)) !== null) {
          const content = match[1];
          const title = content.match(/<title>(.*?)<\/title>/)?.[1] || "Natural Hazard Alert";
          const lat = parseFloat(content.match(/<geo:lat>(.*?)<\/geo:lat>/)?.[1] || "0");
          const lng = parseFloat(content.match(/<geo:long>(.*?)<\/geo:long>/)?.[1] || "0");
          const eventType = content.match(/<gdacs:eventtype>(.*?)<\/gdacs:eventtype>/)?.[1] || "";
          const alertLevel = content.match(/<gdacs:alertlevel>(.*?)<\/gdacs:alertlevel>/)?.[1] || "Green";
          const pubDate = content.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || "";
          const severityText = content.match(/<gdacs:severity>(.*?)<\/gdacs:severity>/)?.[1] || "";

          // Skip earthquakes (EQ) to avoid overlap with higher-fidelity USGS data
          if (eventType && eventType !== "EQ") {
            let type = "DISASTER";
            if (eventType === "TC") type = "CYCLONE";
            if (eventType === "FL") type = "FLOOD";
            if (eventType === "VO") type = "VOLCANO";
            if (eventType === "DR") type = "DROUGHT";

            disasters.push({
              id: `GDACS-${pubDate}-${eventType}-${lng}-${lat}`.replace(/\s+/g, "_"),
              source: "GDACS",
              type: type,
              title: title.replace("<![CDATA[", "").replace("]]>", "").trim(),
              magnitude: null,
              place: title.replace(/.*for\s+/i, "").replace("<![CDATA[", "").replace("]]>", "").trim(),
              lng: lng,
              lat: lat,
              time: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
              severity: alertLevel.toUpperCase() === "RED" ? "CRITICAL" : alertLevel.toUpperCase() === "ORANGE" ? "HIGH" : "ELEVATED",
              details: severityText.replace("<![CDATA[", "").replace("]]>", "").trim()
            });
          }
        }
      }
    } catch (gdacsErr) {
      console.error("[Disaster API] Error fetching GDACS data:", gdacsErr);
    }

    // Sort disasters by time, newest first
    disasters.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

    // Cache the merged list in Redis
    await cacheSet(CACHE_KEY, disasters, CACHE_TTL);
    console.log(`[Disaster API] Cached ${disasters.length} disasters in Redis`);

    return NextResponse.json(disasters);
  } catch (error: any) {
    console.error("Disasters API Route failed:", error);
    return NextResponse.json(
      { error: "Failed to load natural hazard updates", details: error.message },
      { status: 500 }
    );
  }
}
