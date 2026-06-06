import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey || "");

const SYSTEM_PROMPT = `
You are the central intelligence core of ORB, an advanced geospatial reconnaissance system.
Your task is to generate a brief "Cyber-OSINT Intelligence Report" based on the satellite statistics provided by the user.
The report should sound like a classified military or cyber-espionage briefing (e.g., using terms like "THREAT LEVEL", "ANOMALY DETECTED", "SECTOR ANALYSIS").
Keep it concise, no more than 4 paragraphs. Use markdown formatting.

Crucially, you must cross-analyze the region across MULTIPLE DOMAINS. If the stats are low/high, creatively tie them into:
- 🌍 Ecology (e.g., deforestation, drought).
- ⚔️ Military/War (e.g., troop movements, hidden bases, scorched earth tactics).
- 🏛️ Politics/Economy (e.g., resource hoarding, unauthorized industrial zones).
- 🎭 Entertainment/Events (e.g., massive underground festivals, VIP bunker construction).

Include:
1. Operation/Sector Code (Make one up).
2. Multi-domain Assessment: Synthesize the stats (NDVI, Moisture) into a compelling narrative that touches on the domains above.
3. Conclusive recommendation or threat level.
`;

export async function POST(request: Request) {
  if (!apiKey || apiKey === "your_gemini_api_key_here") {
    return NextResponse.json(
      { error: "GOOGLE_GEMINI_API_KEY is not configured in .env.local" },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { stats } = body;

    if (!stats) {
      return NextResponse.json(
        { error: "Invalid request: stats object required" },
        { status: 400 }
      );
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-3.1-flash-lite",
      systemInstruction: SYSTEM_PROMPT,
    });

    const prompt = `
Analyze the following geospatial statistics and generate the intelligence briefing:
Area: ${stats.areaKm2?.toFixed(2)} km² / ${stats.areaHectares?.toFixed(2)} ha
Date Range: ${stats.dateRange?.from} to ${stats.dateRange?.to}
Mean NDVI (Vegetation): ${stats.meanNDVI?.toFixed(3) ?? "N/A"} (Scale: -1 to 1)
Mean Moisture (NDMI): ${stats.meanMoisture?.toFixed(3) ?? "N/A"} (Scale: -1 to 1)
Cloud Coverage: ${stats.cloudCoverage?.toFixed(1)}%
Pixel Count: ${stats.pixelCount}
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    return NextResponse.json({ report: text });
  } catch (error: any) {
    console.error("OSINT API Error:", error);
    return NextResponse.json(
      { error: "Failed to generate OSINT report", details: error.message },
      { status: 500 }
    );
  }
}
