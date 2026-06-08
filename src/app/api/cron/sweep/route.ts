import { NextResponse } from "next/server";
import { cacheGet, cacheSet } from "@/lib/redis";
import { queryGrok } from "@/lib/grok";

export async function GET(request: Request) {
  try {
    // Basic security check for Vercel Cron
    const authHeader = request.headers.get('authorization');
    if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[ORB Vercel Cron] Running periodic OSINT and Sentinel sweep...");

    const token = process.env.APIFY_API_TOKEN;
    let tweets: string[] = [];
    const historyKey = "sentinel:alerts:history";

    // Attempt apify fetch if configured
    if (token && !token.startsWith("apify_api_YOUR_TOKEN")) {
      const handles = ["visegrad24", "warsurv", "KobeissiLetter"];
      try {
        const res = await fetch(`https://api.apify.com/v2/acts/apidojo~tweet-scraper/run-sync-get-dataset-items?token=${token}&maxItems=20`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            twitterHandles: handles,
            maxItems: 20,
            sort: "Latest",
            tweetLanguage: "en",
            addParentTweets: false
          })
        });
        if (res.ok) {
          const items = await res.json();
          if (Array.isArray(items)) {
            tweets = items
              .filter((item: any) => item.text)
              .map((item: any) => `@${item.user?.username || "OSINT"}: "${item.text.replace(/\n/g, " ")}"`);
          }
        } else {
          console.error("[ORB Vercel Cron] Apify API error:", res.status, await res.text());
        }
      } catch (e) {
        console.error("[ORB Vercel Cron] Apify fetch error during sweep:", e);
      }
    }

    const history = await cacheGet<any[]>(historyKey) || [];
    const recentHotspots = Array.from(new Set(history.map((h: any) => h.hotspot).filter(Boolean))).slice(0, 5);

    let promptDirective = "";
    if (tweets.length > 0) {
      promptDirective = `
CRITICAL DIRECTIVE:
1. You MUST analyze the following real-time OSINT tweets collected from key military/economic accounts:
${tweets.map(t => `- ${t}`).join("\n")}
2. Select the most critical ongoing geopolitical, military, or supply chain anomaly described in these tweets.
3. Extract the hotspot/location, the category/type of crisis, the tactical situation, and the supply chain/geopolitical impact directly from the tweets.
4. You MUST research your internal knowledge for the actual coordinate location (latitude and longitude) of the hotspot/event mentioned in the tweets and return it.
5. If the most critical event is in one of these recently reported hotspots (${JSON.stringify(recentHotspots)}), you CAN select it again ONLY IF the situation has escalated or changed. Otherwise, pick a different hotspot.
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

    const responseText = await queryGrok(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: "Analyze OSINT signals and generate the proactive sentinel report." }
      ],
      true
    );

    let cleanedText = responseText.trim();
    const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const resultJson = JSON.parse(jsonMatch[0]);
      resultJson.id = `SENTINEL-${Math.floor(1000 + Math.random() * 9000)}`;
      resultJson.timestamp = new Date().toISOString();

      // Append to cache
      let history = await cacheGet<any[]>(historyKey) || [];
      history = [resultJson, ...history].slice(0, 15);
      await cacheSet(historyKey, history, 604800);
      console.log(`[ORB Vercel Cron] Generated and cached new alert: ${resultJson.title}`);

      return NextResponse.json({ success: true, alert: resultJson });
    } else {
      throw new Error("No JSON object found in response from Grok");
    }
  } catch (error: any) {
    console.error("[ORB Vercel Cron] Sweep cycle error:", error.message);
    return NextResponse.json({ error: "Cron execution failed", details: error.message }, { status: 500 });
  }
}
