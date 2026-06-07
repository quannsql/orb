"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import GlassPanel from "@/components/ui/GlassPanel";
import GlowButton from "@/components/ui/GlowButton";
import { X, Shield, Mail, Key, ShieldAlert } from "lucide-react";

export default function LoginModal() {
  const {
    isLoginModalOpen,
    setLoginModalOpen,
    triggerGoogleSignIn,
    sendEmailOTP,
    verifyEmailOTP,
  } = useAuth();

  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [step, setStep] = useState<"email" | "otp">("email");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tickerMessage, setTickerMessage] = useState("Awaiting login...");

  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const isRealGoogleConfigured = !!googleClientId && googleClientId !== "your_google_client_id_here";

  useEffect(() => {
    if (!isLoginModalOpen) {
      // Reset state on close
      setEmail("");
      setOtpCode("");
      setStep("email");
      setError(null);
      setIsSubmitting(false);
      setTickerMessage("Awaiting login...");
    }
  }, [isLoginModalOpen]);

  // Handle real Google credential verification response
  const handleGoogleCredentialResponse = async (response: any) => {
    const credential = response.credential;
    setIsSubmitting(true);
    setError(null);
    setTickerMessage("Logging in with Google...");
    
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "google", credential }),
      });
      
      if (res.ok) {
        const data = await res.json();
        setLoginModalOpen(false);
        document.dispatchEvent(
          new CustomEvent("add-ticker-event", {
            detail: {
              message: `OPERATOR ${data.user.name.toUpperCase()} LOGGED IN SUCCESSFULLY`,
              type: "system",
            },
          })
        );
        // Quick reload to refresh session context in hooks
        window.location.reload();
      } else {
        const errData = await res.json();
        setError(errData.error || "Google Identity verification failed");
        setTickerMessage("Google login failed");
      }
    } catch (err) {
      setError("Network error validating Google credentials");
      setTickerMessage("Google login failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Initialize official Google Sign-In SDK Button if client ID configured
  useEffect(() => {
    if (!isLoginModalOpen || !isRealGoogleConfigured) return;

    const initializeGoogle = () => {
      // @ts-ignore
      if (window.google) {
        // @ts-ignore
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: handleGoogleCredentialResponse,
        });

        // @ts-ignore
        window.google.accounts.id.renderButton(
          document.getElementById("google-signin-btn"),
          {
            theme: "filled_black",
            size: "large",
            width: 380,
            text: "signin_with",
            shape: "square"
          }
        );
      }
    };

    // @ts-ignore
    if (window.google) {
      initializeGoogle();
    } else {
      const timer = setInterval(() => {
        // @ts-ignore
        if (window.google) {
          initializeGoogle();
          clearInterval(timer);
        }
      }, 100);
      return () => clearInterval(timer);
    }
  }, [isLoginModalOpen, isRealGoogleConfigured, googleClientId]);

  if (!isLoginModalOpen) return null;

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      setError("Invalid email address");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setTickerMessage("Sending verification code...");

    const res = await sendEmailOTP(email);
    setIsSubmitting(false);

    if (res.success) {
      setStep("otp");
      setTickerMessage("Code sent. Check your email or live feed.");
    } else {
      setError(res.error || "Failed to send code");
      setTickerMessage("Failed to send code. Try again.");
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length !== 4) {
      setError("Code must be 4 digits");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setTickerMessage("Verifying code...");

    const res = await verifyEmailOTP(email, otpCode);
    setIsSubmitting(false);

    if (!res.success) {
      setError(res.error || "Incorrect verification code");
      setTickerMessage("Login failed. Incorrect code.");
    } else {
      // Reload session
      window.location.reload();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-void/80 backdrop-blur-md transition-all duration-300">
      <div className="absolute inset-0 scanline-overlay pointer-events-none opacity-40" />

      {/* Cyber Auth Panel */}
      <div className="relative w-full max-w-md mx-4 animate-fade-in pointer-events-auto">
        <GlassPanel glowColor="cyan" padding="lg" className="border border-cyan-500/30 bg-black/90">
          
          {/* Header */}
          <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3 mb-4">
            <div className="flex items-center gap-2.5">
              <Shield className="text-cyan-glow animate-pulse w-5 h-5" />
              <div>
                <h1 className="text-xs font-extrabold tracking-widest text-white uppercase font-mono">
                  LOG IN TO ORB
                </h1>
                <p className="text-[9px] text-neutral-500 font-mono">
                  LOG IN TO YOUR ACCOUNT
                </p>
              </div>
            </div>
            <button
              onClick={() => setLoginModalOpen(false)}
              className="p-1 hover:bg-white/5 border border-white/10 hover:border-cyan-500/40 text-neutral-400 hover:text-white transition-all cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>

          {/* Ticker HUD Display */}
          <div className="bg-black/60 border border-neutral-800/80 p-2 mb-4 font-mono text-[9px] text-cyan-400/90 tracking-wide flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-glow animate-ping shrink-0" />
            <span className="uppercase">{tickerMessage}</span>
          </div>

          {error && (
            <div className="bg-red-950/20 border border-red-500/30 p-2.5 mb-4 text-[9.5px] font-mono text-red-400 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 text-red-500 animate-bounce" />
              <div className="leading-tight">{error}</div>
            </div>
          )}

          {step === "email" ? (
            <div className="flex flex-col gap-4">
              {/* Google Sign-in - Conditional rendering */}
              {isRealGoogleConfigured ? (
                <div className="flex flex-col gap-1 items-center bg-black/45 border border-neutral-800/85 p-3 rounded-none">
                  <div id="google-signin-btn" className="w-full flex justify-center py-1.5 min-h-[40px]" />
                  <span className="text-[7.5px] text-neutral-500 font-mono uppercase tracking-wider mt-1">
                    GOOGLE LOGIN ACTIVE
                  </span>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <div className="text-[7.5px] border border-dashed border-amber-500/30 bg-amber-500/5 text-amber-400 p-2 leading-normal text-center uppercase">
                    Google Sign-In not configured. Running in simulator mode.
                  </div>
                  <button
                    onClick={triggerGoogleSignIn}
                    className="w-full flex items-center justify-center gap-3 py-2.5 border border-cyan-500/20 bg-cyan-950/10 hover:bg-cyan-500/10 hover:border-cyan-500/50 text-[10px] font-extrabold tracking-widest uppercase font-mono text-cyan-glow transition-all duration-200 cursor-pointer shadow-[0_0_10px_rgba(0,240,255,0.05)]"
                  >
                    {/* SVG Google G icon */}
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M21.35 11.1H12v2.7h5.38c-.24 1.28-.96 2.37-2.05 3.1v2.58h3.3c1.93-1.78 3.04-4.4 3.04-7.46c0-.64-.06-1.26-.18-1.78Z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 20.7a8.2 8.2 0 0 0 5.7-2.08l-3.3-2.58a5.18 5.18 0 0 1-8.1-2.73H2.88v2.66A8.7 8.7 0 0 0 12 20.7Z"
                      />
                      <path
                        fill="currentColor"
                        d="M6.3 13.31a5.24 5.24 0 0 1 0-2.62V8.03H2.88a8.7 8.7 0 0 0 0 7.94l3.42-2.66Z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 7.3a4.78 4.78 0 0 1 3.38 1.3l2.53-2.53A8.3 8.3 0 0 0 12 3.3a8.7 8.7 0 0 0-9.12 4.73l3.42 2.66c.45-1.37 1.72-2.39 3.7-2.39Z"
                      />
                    </svg>
                    LOG IN WITH GOOGLE (SIMULATOR)
                  </button>
                </div>
              )}
              {/* Separator */}
              <div className="flex items-center gap-3 my-1">
                <div className="flex-1 h-[1px] bg-neutral-800" />
                <span className="text-[8px] font-mono text-neutral-600 uppercase font-bold tracking-widest">
                  OR LOG IN WITH EMAIL
                </span>
                <div className="flex-1 h-[1px] bg-neutral-800" />
              </div>

              {/* Email Login Form */}
              <form onSubmit={handleSendOTP} className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[8.5px] font-bold tracking-widest text-neutral-500 uppercase font-mono">
                    ENTER YOUR EMAIL
                  </label>
                  <div className="relative flex items-center">
                    <Mail className="absolute left-2.5 w-3.5 h-3.5 text-neutral-500" />
                    <input
                      type="email"
                      required
                      placeholder="e.g. analyst@orb.net"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isSubmitting}
                      className="w-full bg-black/60 border border-neutral-800 focus:border-cyan-500/40 rounded-none pl-9 pr-3 py-2 text-xs font-mono text-white placeholder-neutral-600 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <GlowButton
                  type="submit"
                  disabled={isSubmitting || !email}
                  variant="white"
                  className="w-full text-[9px] py-2 border-cyan-500/20 text-cyan-300 hover:bg-cyan-500/5 font-mono"
                >
                  SEND CODE
                </GlowButton>
              </form>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {/* OTP Form */}
              <form onSubmit={handleVerifyOTP} className="flex flex-col gap-3">
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center text-[8.5px] font-bold tracking-widest text-neutral-500 uppercase font-mono">
                    <span>ENTER VERIFICATION CODE</span>
                    <span className="text-cyan-500">{email}</span>
                  </div>
                  <div className="relative flex items-center">
                    <Key className="absolute left-2.5 w-3.5 h-3.5 text-neutral-500" />
                    <input
                      type="text"
                      maxLength={4}
                      required
                      placeholder="XXXX"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ""))}
                      disabled={isSubmitting}
                      className="w-full bg-black/60 border border-neutral-800 focus:border-cyan-500/40 rounded-none pl-9 pr-3 py-2 text-center text-sm font-mono tracking-[0.6em] font-extrabold text-white placeholder-neutral-600 focus:outline-none transition-colors"
                    />
                  </div>
                  <span className="text-[7.5px] leading-normal text-neutral-500 font-mono text-center">
                    Note: Code is displayed in the ticker at the top-right for development.
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setStep("email");
                      setError(null);
                    }}
                    className="border border-neutral-800 hover:border-neutral-700 bg-neutral-950/20 text-neutral-400 hover:text-white py-2 text-[9px] uppercase tracking-wider font-mono font-bold cursor-pointer"
                  >
                    BACK
                  </button>
                  <GlowButton
                    type="submit"
                    disabled={isSubmitting || otpCode.length !== 4}
                    variant="white"
                    className="text-[9px] py-2 border-cyan-500/20 text-cyan-300 hover:bg-cyan-500/5 font-mono"
                  >
                    LOGIN
                  </GlowButton>
                </div>
              </form>
            </div>
          )}
        </GlassPanel>
      </div>
    </div>
  );
}
