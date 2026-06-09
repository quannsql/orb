import { NextResponse, after } from "next/server";
import { queryGrok } from "@/lib/grok";
import { cacheGet, cacheSet } from "@/lib/redis";
import { initBackgroundWorker } from "@/lib/backgroundWorker";
import { getSession, checkCORS, rateLimitByIP, rateLimitByUser } from "@/lib/auth-api";
import { runButterflySimulation } from "@/lib/simulation";

const DEFAULT_HANDLES = [
  "visegrad24",
  "warsurv",
  "KobeissiLetter",
];

async function fetchTwikitTweets(): Promise<string[]> {
  const apiUrl = process.env.TWIKIT_API_URL;
  const apiKey = process.env.TWIKIT_API_KEY || "default_secret_key";
  
  if (!apiUrl) {
    console.log("[Sentinel Sweep] TWIKIT_API_URL not configured. Falling back to simulated intel.");
    return [];
  }

  try {
    console.log("[Sentinel Sweep] Triggering Twikit Python Scraper...");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 50000); // 50s timeout for scraper

    const res = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        handles: DEFAULT_HANDLES,
        max_items: 5,
        api_key: apiKey
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      console.warn(`[Sentinel Sweep] Twikit API run failed: ${res.status} ${await res.text()}`);
      return [];
    }

    const data = await res.json();
    if (!data.tweets || !Array.isArray(data.tweets)) return [];

    return data.tweets;
  } catch (err) {
    console.error("[Sentinel Sweep] Twikit fetch error:", err);
    return [];
  }
}

export async function GET() {
  try {
    await initBackgroundWorker();
    const historyKey = "sentinel:alerts:history";
    const history = await cacheGet<any[]>(historyKey);
    return NextResponse.json(history || []);
  } catch (error: any) {
    console.error("Failed to get sentinel sweep history:", error);
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await initBackgroundWorker();
    
    // 1. CORS validation
    if (!checkCORS(request)) {
      return NextResponse.json({ error: "Access denied: CORS validation failed" }, { status: 403 });
    }

    // 2. Authentication check (force sweeps require login, automatic sweeps run in bg worker check session if direct client calls)
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Access denied: Authentication required" }, { status: 401 });
    }

    // 3. IP Rate Limiting Check
    const isIPAllowed = await rateLimitByIP(request, 5, 60);
    if (!isIPAllowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Maximum 5 sweeps per minute." },
        { status: 429 }
      );
    }

    // 4. User Rate Limiting Check
    const isUserAllowed = await rateLimitByUser(user.email, 5, 60);
    if (!isUserAllowed) {
      return NextResponse.json(
        { error: "Operator rate limit exceeded. Maximum 5 sweeps per minute." },
        { status: 429 }
      );
    }

    // Parse request body to check for "force" parameter
    let force = false;
    try {
      const body = await request.json();
      force = !!body.force;
    } catch (e) {
      // Body might be empty or not JSON, default to force = false
    }

    const historyKey = "sentinel:alerts:history";
    const cooldownKey = "sentinel:sweep:cooldown";

    const recentAlerts = await cacheGet<any[]>(historyKey) || [];

    // Cooldown check (only if not forced)
    if (!force) {
      const cooldownActive = await cacheGet(cooldownKey);
      if (cooldownActive) {
        console.log(`[Sentinel AI] Cooldown active, serving latest cached alert from history`);
        if (recentAlerts && recentAlerts.length > 0) {
          return NextResponse.json({ ...recentAlerts[0], cached: true });
        }
      }
    }

    // ── Try Railway Brain API first (multi-agent debate) ──
    const railwayUrl = process.env.RAILWAY_BRAIN_URL;
    const railwayApiKey = process.env.RAILWAY_API_KEY;

    if (railwayUrl) {
      try {
        console.log("[Sentinel AI] Calling Railway Brain for multi-agent debate...");
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 min timeout for debate

        const railwayRes = await fetch(`${railwayUrl}/run-sweep`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": railwayApiKey || "",
          },
          body: JSON.stringify({ force }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (railwayRes.ok) {
          const resultJson = await railwayRes.json();
          console.log(`[Sentinel AI] Railway debate completed: ${resultJson.title}`);

          // Railway already saved to Redis, but ensure local cache is fresh
          let history = await cacheGet<any[]>(historyKey);
          if (!Array.isArray(history)) history = [];
          const exists = history.some((h: any) => h.id === resultJson.id);
          if (!exists) {
            history = [resultJson, ...history].slice(0, 15);
            await cacheSet(historyKey, history, 604800);
          }
          await cacheSet(cooldownKey, true, 7200);

          return NextResponse.json(resultJson);
        } else {
          console.warn(`[Sentinel AI] Railway returned ${railwayRes.status}, falling back to local`);
        }
      } catch (railwayErr) {
        console.warn("[Sentinel AI] Railway unreachable, falling back to local:", railwayErr);
      }
    }

    // ── Fallback: Local queryGrok (single-agent, no debate) ──
    console.log("[Sentinel AI] Running local fallback (single-agent mode)...");

    const recentHotspots = Array.from(new Set(recentAlerts.map((h: any) => h.hotspot).filter(Boolean))).slice(0, 5);

    // Fetch real tweets if API URL is available
    const tweets = await fetchTwikitTweets();

    let promptDirective = "";
    if (tweets.length > 0) {
      promptDirective = `
CRITICAL DIRECTIVE:
1. You MUST analyze the following real-time OSINT tweets collected from key military/economic accounts:
${tweets.map(t => `- ${t}`).join("\n")}
2. Select the most critical ongoing geopolitical, military, or supply chain anomaly described in these tweets.
3. Extract the hotspot/location, the category/type of crisis, the tactical situation, and the supply chain/geopolitical impact directly from the tweets.
4. You MUST research your internal knowledge for the actual coordinate location (latitude and longitude) of the hotspot/event mentioned in the tweets and return it.
5. You MUST NOT select any of these recently reported hotspots to avoid redundancy: ${JSON.stringify(recentHotspots)}. Choose another topic/location from the tweets if there is a conflict.
`;
    } else {
      promptDirective = `
CRITICAL DIRECTIVE:
1. Since no live OSINT tweets are currently available, you MUST identify an ongoing or recent (2025/2026) REAL-WORLD geopolitical conflict, military standoff, border tension, or critical supply chain disruption globally.
2. Select a highly dynamic, realistic, and specific hotspot/location anywhere on Earth.
3. You MUST NOT select any of these recently reported hotspots to avoid redundancy: ${JSON.stringify(recentHotspots)}. Choose a completely different region/country.
4. You MUST research your internal knowledge for the actual coordinate location (latitude and longitude) of this event/hotspot and return it.
`;
    }

    const systemPrompt = `You are the central processor for ORB Autonomous Proactive Sentinels.
Analyze the following source intelligence and detect any critical geopolitical, economic, or military anomaly.

${promptDirective}

Generate a realistic, professional, and slightly alarming military/economic analyst report.
Use markdown formatting: **bold** for key terms, bullet points for lists, ### for section headers.

Return your response ONLY as a valid JSON object matching the following structure (no backticks, no markdown formatting):
{
  "id": "SWE-XXXX",
  "title": "PROACTIVE ALERT: Sudden Escalation at [Hotspot Name]",
  "hotspot": "[Hotspot Name]",
  "type": "[Event Category / Type of Crisis]",
  "lng": [longitude],
  "lat": [latitude],
  "threatLevel": "CRITICAL | HIGH | ELEVATED",
  "analysis": "A concise paragraph explaining the tactical situation with **bold** key terms and bullet points...",
  "impact": "1-2 sentences outlining the specific supply chain / geopolitical bottleneck impact...",
  "status": "ACTIVE ACTION REQUIRED"
}`;

    const userPrompt = `Analyze OSINT signals and generate the proactive sentinel report.`;

    const responseText = await queryGrok(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      true
    );

    // Parse the JSON. Clean up potential markdown formatting and thinking blocks from reasoning models
    let cleanedText = responseText.trim();
    const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("[Sentinel AI] Raw LLM Response:", responseText);
      throw new Error("No JSON object found in response from Grok");
    }

    const resultJson = JSON.parse(jsonMatch[0]);

    // Add a unique ID and timestamp if not present
    if (!resultJson.id || resultJson.id.startsWith("SWE-")) {
      resultJson.id = `SENTINEL-${Math.floor(1000 + Math.random() * 9000)}`;
    }
    resultJson.timestamp = new Date().toISOString();

    // Append to history list in Redis (max 15 items)
    let history = await cacheGet<any[]>(historyKey);
    if (!Array.isArray(history)) {
      history = [];
    }
    history = [resultJson, ...history].slice(0, 15);
    await cacheSet(historyKey, history, 604800);
    await cacheSet(cooldownKey, true, 7200);

    // Pre-generate butterfly simulation in the background without blocking the response
    const scenarioText = `${resultJson.title}: ${resultJson.analysis}`;
    try {
      after(async () => {
        try {
          await runButterflySimulation(resultJson.lng, resultJson.lat, scenarioText);
          console.log(`[Sentinel Sweep] Pre-generated butterfly simulation for ${resultJson.hotspot}`);
        } catch (e) {
          console.error(`[Sentinel Sweep] Pre-generation of simulation failed:`, e);
        }
      });
    } catch (afterErr) {
      console.warn("[Sentinel Sweep] after failed, running simulation fallback:", afterErr);
      runButterflySimulation(resultJson.lng, resultJson.lat, scenarioText)
        .then(() => console.log(`[Sentinel Sweep] Pre-generated butterfly simulation (fallback) for ${resultJson.hotspot}`))
        .catch((e) => console.error(`[Sentinel Sweep] Pre-generation of simulation (fallback) failed:`, e));
    }

    return NextResponse.json(resultJson);
  } catch (error: any) {
    console.error("Sentinel sweep API error:", error);
    return NextResponse.json(
      { error: "Sentinel sweep failed", details: error.message },
      { status: 500 }
    );
  }
}
