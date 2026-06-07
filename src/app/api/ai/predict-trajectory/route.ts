import { NextResponse } from "next/server";
import { queryGrok } from "@/lib/grok";

// Optional: Simple in-memory cache to prevent spamming Grok for the same ship
const cache = new Map<string, { data: any, timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 5; // 5 minutes

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { mmsi, name, lat, lng, sog, cog, shipType, isMilitary } = body;

    if (!mmsi || lat == null || lng == null) {
      return NextResponse.json({ error: "Missing ship data" }, { status: 400 });
    }

    // Check cache
    const cached = cache.get(mmsi.toString());
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json(cached.data);
    }

    const systemPrompt = `You are ORB-OSINT, an advanced military AI radar system.
Your task is to predict the trajectory of a maritime vessel based on its current telemetrics and generate a tactical analysis report.
Current Vessel Data:
- Name: ${name || "UNKNOWN"}
- MMSI: ${mmsi}
- Type: ${shipType} (Military: ${isMilitary})
- Speed: ${sog} knots
- Course/Heading: ${cog} degrees
- Current Coordinates: [${lng}, ${lat}]

Instructions:
1. Predict the vessel's path for the next 2-4 hours. Generate exactly 5 coordinates [longitude, latitude] extending linearly along the current heading (${cog} degrees), calculating distance based on speed (${sog} knots).
   (Note: 1 knot = 1.852 km/h. 1 degree of latitude ≈ 111 km). 
   Provide the array of 5 coordinates, starting with the current coordinate as the first point.
2. Provide a short, highly tactical analysis (2-3 sentences) in English explaining the vessel's status. Keep it concise, professional, and military-styled.
3. Output strictly in JSON format matching this structure:
{
  "predictedPath": [[lng, lat], [lng, lat], [lng, lat], [lng, lat], [lng, lat]],
  "analysis": "TACTICAL SUMMARY HERE"
}
Do not include markdown blocks or any other text outside the JSON.`;

    const responseText = await queryGrok(
      [{ role: "system", content: systemPrompt }],
      true // jsonMode = true
    );

    let result;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      // Fallback if the model didn't return valid JSON
      console.warn("Grok returned invalid JSON, attempting fallback parse", responseText);
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
         result = JSON.parse(jsonMatch[0]);
      } else {
         throw new Error("Could not parse JSON from model response");
      }
    }

    // Save to cache
    cache.set(mmsi.toString(), { data: result, timestamp: Date.now() });

    return NextResponse.json(result);

  } catch (error: any) {
    console.error("Error predicting trajectory:", error);
    return NextResponse.json(
      { error: "Failed to predict trajectory" },
      { status: 500 }
    );
  }
}
