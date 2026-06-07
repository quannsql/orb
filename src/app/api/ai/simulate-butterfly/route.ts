import { NextResponse } from "next/server";
import { queryGrok } from "@/lib/grok";
import { cacheGet, cacheSet } from "@/lib/redis";
import { initBackgroundWorker } from "@/lib/backgroundWorker";
import { getSession, checkCORS, rateLimitByIP, rateLimitByUser } from "@/lib/auth-api";

export async function POST(request: Request) {
  try {
    await initBackgroundWorker();
    
    // 1. CORS validation
    if (!checkCORS(request)) {
      return NextResponse.json({ error: "Access denied: CORS validation failed" }, { status: 403 });
    }

    // 2. Authentication check
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Access denied: Authentication required" }, { status: 401 });
    }

    // 3. IP Rate Limiting Check
    const isIPAllowed = await rateLimitByIP(request, 5, 60);
    if (!isIPAllowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Maximum 5 simulations per minute." },
        { status: 429 }
      );
    }

    // 4. User Rate Limiting Check
    const isUserAllowed = await rateLimitByUser(user.email, 5, 60);
    if (!isUserAllowed) {
      return NextResponse.json(
        { error: "Operator rate limit exceeded. Maximum 5 simulations per minute." },
        { status: 429 }
      );
    }

    const { lng, lat, scenario } = await request.json();

    if (!lng || !lat || !scenario) {
      return NextResponse.json(
        { error: "Missing required fields: lng, lat, scenario" },
        { status: 400 }
      );
    }

    // 2. Cache Check (using scenario and rounded coords for accuracy and match rate)
    const roundLng = Number(lng.toFixed(2));
    const roundLat = Number(lat.toFixed(2));
    const normalizedScenario = scenario.toLowerCase().trim().replace(/[^a-z0-9]/g, "_");
    const cacheKey = `butterfly:cache:${normalizedScenario}:${roundLng}:${roundLat}`;

    const cachedResult = await cacheGet(cacheKey);
    if (cachedResult) {
      console.log(`[Butterfly AI] Serving cached result for key ${cacheKey}`);
      return NextResponse.json({ ...cachedResult, cached: true });
    }

    console.log(`[Butterfly AI] Cache miss. Generating simulation via Grok for ${cacheKey}...`);

    const systemPrompt = `You are a Geopolitical Simulation Core running a Multi-Agent reasoning loop.
Analyze the cascading effects ("Butterfly Effect") of the following hypothetical event:
Event Scenario: "${scenario}"
Origin Coordinates: [${lng}, ${lat}]

Analyze this scenario across three distinct intelligence domains:
1. MILITARY/SECURITY AGENT: Assess tactical combat risks, naval/air patrols, exclusion zones, and combat readiness.
2. MACRO-ECONOMIC AGENT: Calculate supply chain blocks, shipping route re-routing (e.g. Malacca, Suez, Hormuz), chip/oil inflation, and ports shut down.
3. SOCIO-POLITICAL AGENT: Project refugee migration patterns, local riots, regional instabilities, and political backlash.

Return your analysis in a valid JSON object matching the following schema. Ensure all fields are filled, and do NOT include any markdown code blocks, backticks, or other text outside the JSON.

{
  "military": {
    "status": "CRITICAL | ELEVATED | SECURE",
    "report": "Detailed 3-4 bulleted points of security and tactical assessment...",
    "exclusionRadiusKm": 150
  },
  "economic": {
    "status": "DISRUPTED | CRITICAL | STABLE",
    "report": "Detailed 3-4 bulleted points of global trade and logistics impact...",
    "disruptedPorts": ["Port A", "Port B"]
  },
  "social": {
    "status": "UNSTABLE | TENSE | CALM",
    "report": "Detailed 3-4 bulleted points of migration, protests, and local stability...",
    "refugeeRisk": "HIGH | MEDIUM | LOW"
  },
  "summary": "A cohesive paragraph synthesizing the Butterfly Effect cascade...",
  "mapVisuals": {
    "impactZone": { "lng": ${lng}, "lat": ${lat}, "radiusKm": 200 },
    "redirectedRoutes": [
      {
        "name": "Bypass Route A",
        "path": [[${lng - 2}, ${lat - 2}], [${lng - 1}, ${lat - 4}], [${lng + 1}, ${lat - 5}], [${lng + 3}, ${lat - 3}]]
      }
    ],
    "migrationVectors": [
      {
        "from": [${lng}, ${lat}],
        "to": [${lng + 3}, ${lat + 3}],
        "intensity": "HIGH"
      }
    ]
  }
}`;

    const userPrompt = `Simulate butterfly effect cascade for scenario: "${scenario}" at coordinates [${lng}, ${lat}]`;

    const responseText = await queryGrok(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      true
    );

    // Parse the JSON. Clean up potential markdown formatting and thinking blocks from reasoning models
    let cleanedText = responseText.trim();
    const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("[Butterfly AI] Raw LLM Response:", responseText);
      throw new Error("No JSON object found in response from Grok");
    }

    const resultJson = JSON.parse(jsonMatch[0]);

    // Save result to cache (expires in 24 hours = 86400 seconds)
    await cacheSet(cacheKey, resultJson, 86400);

    return NextResponse.json(resultJson);
  } catch (error: any) {
    console.error("Butterfly simulation API error:", error);
    return NextResponse.json(
      { error: "Simulation failed", details: error.message },
      { status: 500 }
    );
  }
}
