import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { signJWT } from "@/lib/jwt";
import { cacheGet, cacheSet, isKVEnabled, getRedis } from "@/lib/redis";
import nodemailer from "nodemailer";

const JWT_SECRET = process.env.JWT_SECRET || "orb_geospatial_command_center_secret_2026_key";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { provider, email } = body;

    // ────────────────────────────────────────────────────────────────
    // GOOGLE AUTH PROVIDER
    // ────────────────────────────────────────────────────────────────
    if (provider === "google") {
      const { credential } = body;

      let emailAddress = email;
      let name = body.name;
      let avatarUrl = body.avatarUrl;

      // Real Google credential validation if present
      if (credential) {
        console.log("[Google Auth] Real credential received. Verifying with Google...");
        try {
          const googleRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
          if (!googleRes.ok) {
            return NextResponse.json({ error: "Invalid Google credential token" }, { status: 400 });
          }
          const googlePayload = await googleRes.json();

          // Verify audience matches our Client ID
          const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
          if (clientId && clientId !== "your_google_client_id_here" && googlePayload.aud !== clientId) {
            console.warn(`[Google Auth] Audience mismatch: got ${googlePayload.aud}, expected ${clientId}`);
            return NextResponse.json({ error: "Security validation failed: Audience mismatch" }, { status: 400 });
          }

          emailAddress = googlePayload.email;
          name = googlePayload.name || emailAddress.split("@")[0].toUpperCase();
          avatarUrl = googlePayload.picture;
          console.log(`[Google Auth] Successfully verified Google user: ${emailAddress}`);
        } catch (e: any) {
          console.error("[Google Auth] Verification request failed:", e);
          return NextResponse.json({ error: "Google token verification failed", details: e.message }, { status: 400 });
        }
      } else {
        // Dev simulator mode fallback
        if (!emailAddress) {
          return NextResponse.json({ error: "Email is required for simulator login" }, { status: 400 });
        }
        console.log("[Google Auth] No credential token. Running in simulator fallback mode.");
      }

      const cleanEmail = emailAddress.toLowerCase().trim();
      const userPayload = {
        email: cleanEmail,
        name: name || cleanEmail.split("@")[0].toUpperCase(),
        avatarUrl: avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanEmail}`,
        provider: "google" as const,
      };

      // Generate JWT Token (exp: 7 days)
      const tokenExp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7;
      const jwtToken = await signJWT({ ...userPayload, exp: tokenExp }, JWT_SECRET);

      // Set cookie
      const cookieStore = await cookies();
      cookieStore.set("orb_session", jwtToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 60 * 60 * 24 * 7,
        path: "/",
      });

      return NextResponse.json({ user: userPayload });
    }

    // ────────────────────────────────────────────────────────────────
    // EMAIL AUTH PROVIDER (OTP FLOW)
    // ────────────────────────────────────────────────────────────────
    if (provider === "email") {
      if (!email) {
        return NextResponse.json({ error: "Email is required" }, { status: 400 });
      }
      const cleanEmail = email.toLowerCase().trim();
      const { action } = body;

      if (action === "request_otp") {
        // Generate a 4-digit code
        const otpCode = Math.floor(1000 + Math.random() * 9000).toString();

        // Save to cache (TTL: 5 minutes = 300 seconds)
        await cacheSet(`otp:${cleanEmail}`, otpCode, 300);

        console.log(`[Auth Login] Generated OTP for ${cleanEmail}: ${otpCode}`);

        // Check if SMTP is configured
        const smtpHost = process.env.SMTP_HOST;
        const smtpUser = process.env.SMTP_USER;
        const smtpPass = process.env.SMTP_PASS;

        const isSMTPConfigured = smtpHost && smtpUser && smtpPass;

        if (isSMTPConfigured) {
          console.log(`[SMTP Mailer] Initiating secure transmission to ${cleanEmail}...`);
          try {
            const transporter = nodemailer.createTransport({
              host: smtpHost,
              port: parseInt(process.env.SMTP_PORT || "587"),
              secure: process.env.SMTP_PORT === "465",
              auth: {
                user: smtpUser,
                pass: smtpPass,
              },
            });

            await transporter.sendMail({
              from: process.env.SMTP_FROM || `"ORB Command Center" <${smtpUser}>`,
              to: cleanEmail,
              subject: "ORB Command Center - Operator Access Key",
              text: `SECURE ACCESS CONTROL DIRECTIVE\n\nYour operator secure access key is: ${otpCode}\n\nThis key will expire in 5 minutes. Do not share this transmission.`,
              html: `
                <div style="font-family: monospace; background-color: #000000; color: #00ff41; padding: 25px; border: 2px solid #00f0ff; max-width: 500px; margin: 0 auto; box-shadow: 0 0 15px rgba(0, 240, 255, 0.25);">
                  <h2 style="color: #ffffff; border-bottom: 2px solid #00f0ff; padding-bottom: 10px; margin-top: 0; font-size: 16px; letter-spacing: 2px;">SECURE ACCESS CONTROL DIRECTIVE</h2>
                  <p style="color: #d1d5db; font-size: 12px; line-height: 1.5;">A secure operator authentication request has been initiated for this channel.</p>
                  <div style="margin: 20px 0; padding: 15px; background-color: #0b0f19; border: 1px dashed #00ff41; text-align: center;">
                    <span style="color: #888; font-size: 10px; display: block; margin-bottom: 5px; text-transform: uppercase;">Operator Access Key</span>
                    <strong style="color: #ffffff; font-size: 24px; letter-spacing: 5px;">${otpCode}</strong>
                  </div>
                  <p style="color: #9ca3af; font-size: 10px; margin-top: 20px; border-t: 1px solid #374151; pt: 10px; margin-bottom: 0;">This transmission is encrypted. Key expires in 5 minutes. Do not share this credentials.</p>
                </div>
              `,
            });
            console.log(`[SMTP Mailer] Real email successfully sent to ${cleanEmail}`);
            return NextResponse.json({ success: true, message: "OTP sent via email" });
          } catch (e: any) {
            console.error("[SMTP Mailer] Error sending mail, falling back to warning log:", e);
            // Fallback to sending code in response so the developer is not locked out
            return NextResponse.json({ 
              success: true, 
              message: "SMTP transmission failed. Falling back to log print.", 
              otpCode,
              smtpError: e.message 
            });
          }
        } else {
          console.log(`[SMTP Offline] Credentials not configured in .env.local. Falling back to warning log.`);
          return NextResponse.json({ success: true, message: "OTP code generated", otpCode });
        }
      }

      if (action === "verify_otp") {
        const { code } = body;
        if (!code) {
          return NextResponse.json({ error: "Code is required" }, { status: 400 });
        }

        const storedCode = await cacheGet<string | number>(`otp:${cleanEmail}`);

        if (!storedCode || String(storedCode).trim() !== code.trim()) {
          return NextResponse.json({ error: "Invalid or expired access code" }, { status: 400 });
        }

        // Delete OTP code so it cannot be reused
        if (isKVEnabled) {
          try {
            await getRedis().del(`otp:${cleanEmail}`);
          } catch (e) {
            console.error("Failed to delete Redis OTP code key:", e);
          }
        }

        const namePart = cleanEmail.split("@")[0];
        const formattedName = namePart.charAt(0).toUpperCase() + namePart.slice(1);

        const userPayload = {
          email: cleanEmail,
          name: formattedName,
          avatarUrl: `https://api.dicebear.com/7.x/identicon/svg?seed=${cleanEmail}`,
          provider: "email" as const,
        };

        // Generate JWT Token (exp: 7 days)
        const tokenExp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7;
        const jwtToken = await signJWT({ ...userPayload, exp: tokenExp }, JWT_SECRET);

        // Set cookie
        const cookieStore = await cookies();
        cookieStore.set("orb_session", jwtToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          maxAge: 60 * 60 * 24 * 7,
          path: "/",
        });

        return NextResponse.json({ user: userPayload });
      }

      return NextResponse.json({ error: "Invalid email login action" }, { status: 400 });
    }

    return NextResponse.json({ error: "Unsupported authentication provider" }, { status: 400 });
  } catch (err: any) {
    console.error("[Login API] Error:", err);
    return NextResponse.json({ error: "Login failed", details: err.message }, { status: 500 });
  }
}
