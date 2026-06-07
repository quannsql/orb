import { cookies } from "next/headers";
import { verifyJWT } from "./jwt";
import { checkRateLimit } from "./redis";

const JWT_SECRET = process.env.JWT_SECRET || "orb_geospatial_command_center_secret_2026_key";

export interface SessionUser {
  email: string;
  name: string;
  avatarUrl?: string;
  provider: "google" | "email";
}

/**
 * Get active session user from cookies
 */
export async function getSession(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("orb_session")?.value;

    if (!token) return null;

    const payload = await verifyJWT(token, JWT_SECRET);
    if (!payload) return null;

    return {
      email: payload.email,
      name: payload.name,
      avatarUrl: payload.avatarUrl,
      provider: payload.provider,
    };
  } catch (e) {
    console.error("[auth-api] getSession error:", e);
    return null;
  }
}

/**
 * Verify Request Origin/Referer to prevent CSRF and external API abuse (CORS validation)
 */
export function checkCORS(req: Request): boolean {
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");

  if (origin) {
    try {
      const originUrl = new URL(origin);
      // Return true if origin matches host
      return originUrl.host === host;
    } catch {
      return false;
    }
  }

  // Fallback to Referer check if Origin header is missing (e.g. GET/some POST requests)
  const referer = req.headers.get("referer");
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      return refererUrl.host === host;
    } catch {
      return false;
    }
  }

  // Direct script requests without headers are allowed in development,
  // but we should fail them in production if we want to be fully secure.
  if (process.env.NODE_ENV === "production") {
    return false;
  }
  return true;
}

/**
 * Rate limit based on IP address
 */
export async function rateLimitByIP(req: Request, limit = 10, windowSeconds = 60): Promise<boolean> {
  const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "127.0.0.1";
  const cleanIp = ip.split(",")[0].trim();
  return checkRateLimit(cleanIp, limit, windowSeconds);
}

/**
 * Rate limit based on Authenticated User Email
 */
export async function rateLimitByUser(email: string, limit = 10, windowSeconds = 60): Promise<boolean> {
  // Use prefix to avoid collision with IP keys
  return checkRateLimit(`user:${email}`, limit, windowSeconds);
}
