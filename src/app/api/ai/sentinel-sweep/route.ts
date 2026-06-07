import { NextResponse } from "next/server";
import { queryGrok } from "@/lib/grok";
import { cacheGet, cacheSet, checkRateLimit } from "@/lib/redis";
import { initBackgroundWorker } from "@/lib/backgroundWorker";

const DEFAULT_HANDLES = [
  "visegrad24",
  "warsurv",
  "KobeissiLetter",
];

async function fetchApifyTweets(): Promise<string[]> {
  const token = process.env.APIFY_API_TOKEN;
  if (!token || token.startsWith("apify_api_YOUR_TOKEN")) {
    console.log("[Sentinel Sweep] APIFY_API_TOKEN not configured or using placeholder. Falling back to simulated intel.");
    return [];
  }

  try {
    console.log("[Sentinel Sweep] Triggering Apify Twitter Scraper synchronously...");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout for synchronous run

    const res = await fetch(`https://api.apify.com/v2/acts/apidojo~tweet-scraper/run-sync-get-dataset-items?token=${token}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        twitterHandles: DEFAULT_HANDLES,
        maxItems: 10,
        sort: "Latest",
        tweetLanguage: "en",
        addParentTweets: false
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      console.warn(`[Sentinel Sweep] Apify Actor run failed: ${res.status} ${await res.text()}`);
      return [];
    }

    const items = await res.json();
    if (!Array.isArray(items)) return [];

    return items
      .filter((item: any) => item.text)
      .map((item: any) => `@${item.user?.username || "OSINT"}: "${item.text.replace(/\n/g, " ")}"`);
  } catch (err) {
    console.error("[Sentinel Sweep] Apify fetch error:", err);
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
    // 1. Rate Limiting Check
    const ip = request.headers.get("x-forwarded-for") || "127.0.0.1";
    const isAllowed = await checkRateLimit(ip, 5, 60); // Max 5 requests per minute
    if (!isAllowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Maximum 5 sweeps per minute." },
        { status: 429 }
      );
    }

    // 2. Parse request body to check for "force" parameter
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
    const recentHotspots = Array.from(new Set(recentAlerts.map((h: any) => h.hotspot).filter(Boolean))).slice(0, 5);

    // 3. Cooldown check (only if not forced)
    if (!force) {
      const cooldownActive = await cacheGet(cooldownKey);
      if (cooldownActive) {
        console.log(`[Sentinel AI] Cooldown active, serving latest cached alert from history`);
        if (recentAlerts && recentAlerts.length > 0) {
          return NextResponse.json({ ...recentAlerts[0], cached: true });
        }
      }
    }

    // 4. Fetch real tweets if token is available
    const tweets = await fetchApifyTweets();

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
2. Select a highly dynamic, realistic, and specific hotspot/location anywhere on Earth. Do NOT restrict yourself to a fixed list of common locations. It can be any region, country border, strait, ocean, canal, or port (e.g. Red Sea, North Sea, Baltic borders, South America borders, Aegean Sea, Cyprus, Arctic Passage, Gulf of Aden, Panama Canal, DMZ, Gibraltar, Suez Canal, Strait of Hormuz, Taiwan Strait, South China Sea, etc.), representing a genuine global flashpoint.
3. You MUST NOT select any of these recently reported hotspots to avoid redundancy: ${JSON.stringify(recentHotspots)}. Choose a completely different region/country.
4. You MUST research your internal knowledge for the actual coordinate location (latitude and longitude) of this event/hotspot and return it.
`;
    }

    const systemPrompt = `You are the central processor for ORB Autonomous Proactive Sentinels.
Analyze the following source intelligence and detect any critical geopolitical, economic, or military anomaly.

${promptDirective}

Generate a realistic, professional, and slightly alarming military/economic analyst report using the grok-4.3 model.
Focus on:
1. Geopolitical fallout: Border closures or hostile patrols.
2. Economic impact: Disrupted commodities, supply chain delay rates, shipping detour routes.
3. Military threat level.

Return your response ONLY as a valid JSON object matching the following structure (no backticks, no markdown formatting):
{
  "id": "SWE-XXXX",
  "title": "PROACTIVE ALERT: Sudden Escalation at [Hotspot Name]",
  "hotspot": "[Hotspot Name]",
  "type": "[Event Category / Type of Crisis]",
  "lng": [longitude],
  "lat": [latitude],
  "threatLevel": "CRITICAL | HIGH | ELEVATED",
  "analysis": "A concise paragraph explaining the tactical situation...",
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

    // 5. Append to history list in Redis (max 15 items)
    let history = await cacheGet<any[]>(historyKey);
    if (!Array.isArray(history)) {
      history = [];
    }

    // Add the new result to the beginning
    history = [resultJson, ...history];

    // Limit to 15 items
    if (history.length > 15) {
      history = history.slice(0, 15);
    }

    // Cache the updated history (TTL: 7 days = 604800 seconds)
    await cacheSet(historyKey, history, 604800);

    // Set the cooldown key for automatic sweeps (TTL: 2 hours = 7200 seconds)
    await cacheSet(cooldownKey, true, 7200);

    return NextResponse.json(resultJson);
  } catch (error: any) {
    console.error("Sentinel sweep API error:", error);
    return NextResponse.json(
      { error: "Sentinel sweep failed", details: error.message },
      { status: 500 }
    );
  }
}
