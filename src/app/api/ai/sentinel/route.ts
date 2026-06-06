import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey || "");

const SYSTEM_PROMPT = `
You are the Autonomous Sentinel Core for ORB. Your function is to detect anomalies in satellite geospatial data.
You will receive statistical data for a specific region.
Analyze the data and determine if there are any critical anomalies (e.g., extreme drought, sudden deforestation, abnormal moisture levels).

Your response MUST be in valid JSON format ONLY, structured as follows:
{
  "threatLevel": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "anomalyDetected": boolean,
  "confidenceScore": number (0-100),
  "analysis": "Short 1-2 sentence explanation of the findings"
}
Do not include markdown code block syntax (like \`\`\`json) in your final output, just raw JSON string.
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
      // Force JSON response
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    const prompt = `
Data for analysis:
Area: ${stats.areaKm2?.toFixed(2)} km²
Date Range: ${stats.dateRange?.from} to ${stats.dateRange?.to}
NDVI: ${stats.meanNDVI?.toFixed(3) ?? "N/A"}
NDMI: ${stats.meanMoisture?.toFixed(3) ?? "N/A"}
Cloud Coverage: ${stats.cloudCoverage?.toFixed(1)}%
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    let parsedResult;
    try {
      parsedResult = JSON.parse(text);
    } catch (e) {
      // fallback if it included markdown
      const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
      parsedResult = JSON.parse(cleaned);
    }

    return NextResponse.json(parsedResult);
  } catch (error: any) {
    console.error("Sentinel API Error:", error);
    return NextResponse.json(
      { error: "Failed to scan for anomalies", details: error.message },
      { status: 500 }
    );
  }
}
