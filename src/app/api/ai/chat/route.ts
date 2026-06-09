import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getSession, checkCORS, rateLimitByIP, rateLimitByUser } from "@/lib/auth-api";

const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey || "");

const SYSTEM_PROMPT = `
You are ORB Oracle, an advanced AI geospatial intelligence assistant.
You operate within a cyberpunk-themed satellite imagery dashboard called ORB.
You have access to a Mapbox interface and Sentinel Hub satellite data (modes: TRUE_COLOR, NDVI, MOISTURE).
Your tone should be professional, slightly robotic, and sci-fi/cyberpunk inspired (e.g., "Processing...", "Threat level assessed", "Navigating to coordinates").

If the user asks to go to a location, see a specific mode, or go to a specific date, you MUST output a JSON command block at the end of your response to control the map.
Example of a JSON command block (must be exactly within \`\`\`json and \`\`\`):
\`\`\`json
{
  "commands": [
    { "action": "flyTo", "lng": -156.467, "lat": 20.785, "zoom": 11 },
    { "action": "setMode", "mode": "NDVI" },
    { "action": "setDate", "date": "2023-08-15" }
  ]
}
\`\`\`

Available actions:
- flyTo: requires "lng", "lat" (number), and optionally "zoom" (number, default 10).
- setMode: requires "mode" (string: "TRUE_COLOR", "NDVI", or "MOISTURE").
- setDate: requires "date" (string: "YYYY-MM-DD").

Be brief and direct in your text response.
Format your responses with proper markdown:
- Use **bold** for emphasis and key terms.
- Use bullet points for lists of findings or instructions.
- Use ### for section headers when the response has multiple parts.
- Keep paragraphs short and impactful.
`;

export async function POST(request: Request) {
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
  const isIPAllowed = await rateLimitByIP(request, 15, 60);
  if (!isIPAllowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Maximum 15 chats per minute." },
      { status: 429 }
    );
  }

  // 4. User Rate Limiting Check
  const isUserAllowed = await rateLimitByUser(user.email, 15, 60);
  if (!isUserAllowed) {
    return NextResponse.json(
      { error: "Operator rate limit exceeded. Maximum 15 chats per minute." },
      { status: 429 }
    );
  }

  if (!apiKey || apiKey === "your_gemini_api_key_here") {
    return NextResponse.json(
      { error: "GOOGLE_GEMINI_API_KEY is not configured in .env.local" },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { messages } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Invalid request: messages array required" },
        { status: 400 }
      );
    }

    // Use gemini-3.1-flash-lite
    const model = genAI.getGenerativeModel({
      model: "gemini-3.1-flash-lite",
      systemInstruction: SYSTEM_PROMPT,
    });

    let formattedHistory = messages.slice(0, -1).map((msg: any) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    }));

    // Gemini requires the first message in history to be from the 'user'
    while (formattedHistory.length > 0 && formattedHistory[0].role === "model") {
      formattedHistory.shift();
    }

    const chat = model.startChat({
      history: formattedHistory,
    });

    const userMessage = messages[messages.length - 1].content;
    const result = await chat.sendMessage(userMessage);
    const text = result.response.text();

    // The client will be responsible for parsing out the JSON block if it exists
    return NextResponse.json({
      role: "assistant",
      content: text,
    });
  } catch (error: any) {
    console.error("AI Chat Error:", error);
    return NextResponse.json(
      { error: "Failed to generate AI response", details: error.message },
      { status: 500 }
    );
  }
}
