import { queryGrok } from "./grok";
import { cacheGet, cacheSet } from "./redis";

export async function runButterflySimulation(
  lng: number,
  lat: number,
  scenario: string,
  bypassCache = false
): Promise<any> {
  const roundLng = Number(lng.toFixed(2));
  const roundLat = Number(lat.toFixed(2));
  const normalizedScenario = scenario.toLowerCase().trim().replace(/[^a-z0-9]/g, "_");
  const cacheKey = `butterfly:cache:${normalizedScenario}:${roundLng}:${roundLat}`;

  if (!bypassCache) {
    const cachedResult = await cacheGet(cacheKey);
    if (cachedResult) {
      console.log(`[Butterfly AI Helper] Serving cached result for key ${cacheKey}`);
      return { ...cachedResult, cached: true };
    }
  }

  console.log(`[Butterfly AI Helper] Cache miss. Generating simulation via Grok for ${cacheKey}...`);

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
      { role: "user", content: userPrompt }
    ],
    true
  );

  let cleanedText = responseText.trim();
  const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error("[Butterfly AI Helper] Raw LLM Response:", responseText);
    throw new Error("No JSON object found in response from Grok");
  }

  const resultJson = JSON.parse(jsonMatch[0]);

  // Save result to cache (expires in 24 hours = 86400 seconds)
  await cacheSet(cacheKey, resultJson, 86400);

  return resultJson;
}
