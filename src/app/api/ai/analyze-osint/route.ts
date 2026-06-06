import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const apiKey = process.env.GOOGLE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey || "");

// In-memory cache for AI Analysis to save API costs
const aiCache = new Map<string, { data: any; timestamp: number }>();
const AI_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function POST(req: Request) {
  try {
    const { flights, bounds } = await req.json();

    if (!apiKey || apiKey === "your_gemini_api_key_here") {
      return NextResponse.json(
        { error: "GOOGLE_GEMINI_API_KEY is not configured in the environment." },
        { status: 500 }
      );
    }

    if (!flights || flights.length === 0) {
      return NextResponse.json({
        threatLevel: "LOW",
        analysis: "No active targets detected in this sector.",
        confidenceScore: 100,
        anomalyDetected: false,
      });
    }

    // Generate cache key based on bounding box and number of flights
    const boundsStr = bounds ? `${bounds._sw.lng},${bounds._sw.lat},${bounds._ne.lng},${bounds._ne.lat}` : "global";
    const cacheKey = `osint_ai_${boundsStr}_count_${flights.length}`;

    const cached = aiCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < AI_CACHE_TTL) {
      console.log(`[OSINT AI] Serving cached analysis for ${cacheKey}`);
      return NextResponse.json({ ...cached.data, cached: true });
    }

    console.log(`[OSINT AI] No cache hit. Querying Gemini for ${cacheKey}...`);

    // Prepare prompt
    const flightSummary = flights.slice(0, 50).map((f: any) => 
      `Callsign: ${f.callsign || "UNKNOWN"}, Country: ${f.origin_country}, AC: ${f.category || "0"}, Alt: ${f.altitude !== null ? f.altitude + 'm' : 'HIDDEN/STEALTH'}, Spd: ${f.velocity}m/s, Squawk: ${f.squawk || "NONE"}`
    ).join("\n");

    const prompt = `You are an advanced automated OSINT intelligence system. 
Analyze the following flight data collected from sector bounds: ${JSON.stringify(bounds)}

Flight Data:
${flightSummary}

Task:
1. Identify specific anomalous flights. You MUST explicitly state the Callsign and the Country of Origin for these flagged aircraft.
2. Format your analysis using bullet points for each flagged flight in exactly this format: "- CALLSIGN (Country): [Your analysis]".
3. Pay SPECIAL ATTENTION to flights where Alt (Altitude) is "HIDDEN/STEALTH" (this indicates a deactivated transponder, typical of military stealth operations or drones). 
4. If there are flights from major military powers (e.g., United States, Russian Federation, China), explicitly mention them. DO NOT mention these countries if they do not appear in the data. Do NOT add generic "No aircraft from..." statements.
5. You receive an 'AC' (Aircraft Category) number. Interpret it: 14=UAV/Drone, 7=High Performance/Fighter, 8=Helicopter, 4/6=Heavy Transporter. Do NOT mention AC if it is 0 or missing.
6. Output a highly specific, professional military-style intelligence report. Keep each bullet point brief.

Respond ONLY with a valid JSON object matching this schema exactly, with no markdown formatting or extra text:
{
  "threatLevel": "LOW | MEDIUM | HIGH | CRITICAL",
  "analysis": "Your analysis text here...",
  "confidenceScore": 85,
  "anomalyDetected": true | false
}`;

    const model = genAI.getGenerativeModel({
      model: "gemini-3.1-flash-lite",
      generationConfig: {
        responseMimeType: "application/json",
      },
    });
    
    const result = await model.generateContent(prompt);
    let text = result.response.text();
    
    // Clean up potential markdown formatting from Gemini response
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();
    
    const analysisJson = JSON.parse(text);

    // Save to cache
    aiCache.set(cacheKey, {
      data: analysisJson,
      timestamp: Date.now(),
    });

    return NextResponse.json(analysisJson);
  } catch (error) {
    console.error("OSINT AI Analysis Error:", error);
    return NextResponse.json(
      { error: "Failed to process intelligence data." },
      { status: 500 }
    );
  }
}
