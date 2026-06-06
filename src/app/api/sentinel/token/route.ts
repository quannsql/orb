import { NextResponse } from "next/server";
import { SENTINEL_CONFIG } from "@/lib/constants";

/**
 * Server-side OAuth2 token proxy for Sentinel Hub (CDSE).
 * Performs client_credentials flow — client secret never reaches the browser.
 */

let cachedToken: { access_token: string; expires_at: number } | null = null;

export async function GET() {
  try {
    // Return cached token if still valid (with 5-min buffer)
    if (
      cachedToken &&
      Date.now() < cachedToken.expires_at - SENTINEL_CONFIG.tokenRefreshBufferMs
    ) {
      return NextResponse.json({
        access_token: cachedToken.access_token,
        expires_in: Math.floor(
          (cachedToken.expires_at - Date.now()) / 1000
        ),
      });
    }

    const clientId = process.env.SENTINEL_CLIENT_ID;
    const clientSecret = process.env.SENTINEL_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: "Sentinel Hub credentials not configured" },
        { status: 500 }
      );
    }

    const response = await fetch(SENTINEL_CONFIG.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Sentinel token error:", errorText);
      return NextResponse.json(
        { error: "Failed to obtain Sentinel Hub token" },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Cache the token
    cachedToken = {
      access_token: data.access_token,
      expires_at: Date.now() + data.expires_in * 1000,
    };

    return NextResponse.json({
      access_token: data.access_token,
      expires_in: data.expires_in,
    });
  } catch (error) {
    console.error("Token proxy error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
