"use client";

import React, { createContext, useState, useEffect, useCallback } from "react";

export interface User {
  email: string;
  name: string;
  avatarUrl?: string;
  provider: "google" | "email";
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isLoginModalOpen: boolean;
  setLoginModalOpen: (open: boolean) => void;
  triggerGoogleSignIn: () => void;
  sendEmailOTP: (email: string) => Promise<{ success: boolean; error?: string }>;
  verifyEmailOTP: (email: string, code: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoginModalOpen, setLoginModalOpen] = useState(false);

  // Fetch active session on mount
  const checkSession = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/auth/session");
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          setUser(data.user);
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch (e) {
      console.error("[AuthContext] Check session failed:", e);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  // Google OAuth Popup Trigger
  const triggerGoogleSignIn = useCallback(() => {
    const width = 500;
    const height = 650;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;
    
    // Open Google Sign-In Popup window
    window.open(
      "/auth/google-sign-in",
      "GoogleSignIN",
      `width=${width},height=${height},top=${top},left=${left},scrollbars=no,resizable=no`
    );
  }, []);

  // Listen for Google login success from popup
  useEffect(() => {
    const handleGoogleMessage = async (event: MessageEvent) => {
      // Security Check: Only accept messages from same origin
      if (event.origin !== window.location.origin) return;
      
      if (event.data?.type === "GOOGLE_SIGN_IN_SUCCESS") {
        const payload = event.data.payload;
        try {
          const res = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              provider: "google",
              email: payload.email,
              name: payload.name,
              avatarUrl: payload.avatarUrl,
            }),
          });

          if (res.ok) {
            const data = await res.json();
            setUser(data.user);
            setLoginModalOpen(false);
            
            // Dispatch dynamic ticker event to let the Live Feed know about auth success
            document.dispatchEvent(
              new CustomEvent("add-ticker-event", {
                detail: {
                  message: `OPERATOR ${data.user.name.toUpperCase()} LOGGED IN SUCCESSFULLY`,
                  type: "system",
                },
              })
            );
          } else {
            console.error("Google sign in backend exchange failed");
          }
        } catch (err) {
          console.error("Error exchanging Google sign in payload:", err);
        }
      }
    };

    window.addEventListener("message", handleGoogleMessage);
    return () => window.removeEventListener("message", handleGoogleMessage);
  }, []);

  // Email OTP Request
  const sendEmailOTP = useCallback(async (email: string) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "email", action: "request_otp", email }),
      });

      if (res.ok) {
        const data = await res.json();
        
        // Feed mock OTP to Command Center feed to help user log in easily
        if (data.otpCode) {
          document.dispatchEvent(
            new CustomEvent("add-ticker-event", {
              detail: {
                message: `VERIFICATION CODE SENT TO ${email.toUpperCase()} :: [ ${data.otpCode} ]`,
                type: "alert",
              },
            })
          );
        }
        return { success: true };
      } else {
        const data = await res.json();
        return { success: false, error: data.error || "Failed to send code" };
      }
    } catch (err) {
      return { success: false, error: "Network error sending code" };
    }
  }, []);

  // Email OTP Verification
  const verifyEmailOTP = useCallback(async (email: string, code: string) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "email", action: "verify_otp", email, code }),
      });

      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setLoginModalOpen(false);

        document.dispatchEvent(
          new CustomEvent("add-ticker-event", {
            detail: {
              message: `OPERATOR ${data.user.name.toUpperCase()} LOGGED IN SUCCESSFULLY`,
              type: "system",
            },
          })
        );
        return { success: true };
      } else {
        const data = await res.json();
        return { success: false, error: data.error || "Verification failed" };
      }
    } catch (err) {
      return { success: false, error: "Network error verifying code" };
    }
  }, []);

  // Logout
  const logout = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/logout", {
        method: "POST",
      });
      if (res.ok) {
        const oldUser = user;
        setUser(null);
        
        if (oldUser) {
          document.dispatchEvent(
            new CustomEvent("add-ticker-event", {
              detail: {
                message: `OPERATOR ${oldUser.name.toUpperCase()} LOGGED OUT`,
                type: "system",
              },
            })
          );
        }
      }
    } catch (err) {
      console.error("Logout failed:", err);
    }
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isLoginModalOpen,
        setLoginModalOpen,
        triggerGoogleSignIn,
        sendEmailOTP,
        verifyEmailOTP,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
