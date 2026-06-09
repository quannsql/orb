import { NextResponse } from "next/server";
import { initBackgroundWorker } from "@/lib/backgroundWorker";
import { getSession, checkCORS, rateLimitByIP, rateLimitByUser } from "@/lib/auth-api";
import { runButterflySimulation } from "@/lib/simulation";

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

    // ── Try Railway Brain API first (multi-agent debate simulation) ──
    const railwayUrl = process.env.RAILWAY_BRAIN_URL;
    const railwayApiKey = process.env.RAILWAY_API_KEY;

    if (railwayUrl) {
      try {
        console.log("[Butterfly] Calling Railway Brain for multi-agent debate simulation...");
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 min timeout

        const railwayRes = await fetch(`${railwayUrl}/simulate`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": railwayApiKey || "",
          },
          body: JSON.stringify({ lng, lat, scenario }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (railwayRes.ok) {
          const resultJson = await railwayRes.json();
          console.log("[Butterfly] Railway debate simulation completed");
          return NextResponse.json(resultJson);
        } else {
          console.warn(`[Butterfly] Railway returned ${railwayRes.status}, falling back to local`);
        }
      } catch (railwayErr) {
        console.warn("[Butterfly] Railway unreachable, falling back to local:", railwayErr);
      }
    }

    // ── Fallback: Local single-agent simulation ──
    console.log("[Butterfly] Running local fallback (single-agent mode)...");
    const resultJson = await runButterflySimulation(lng, lat, scenario);

    return NextResponse.json(resultJson);
  } catch (error: any) {
    console.error("Butterfly simulation API error:", error);
    return NextResponse.json(
      { error: "Simulation failed", details: error.message },
      { status: 500 }
    );
  }
}

