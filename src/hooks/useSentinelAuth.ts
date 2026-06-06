"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { fetchToken } from "@/services/sentinel";

/**
 * Hook for managing Sentinel Hub OAuth token lifecycle.
 * Auto-fetches and refreshes before expiry.
 */
export function useSentinelAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const authenticate = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const tokenData = await fetchToken();

      if (tokenData) {
        setIsAuthenticated(true);

        // Schedule refresh 5 minutes before expiry
        const refreshInMs = (tokenData.expires_in - 300) * 1000;
        if (refreshTimerRef.current) {
          clearTimeout(refreshTimerRef.current);
        }
        refreshTimerRef.current = setTimeout(authenticate, refreshInMs);
      } else {
        setError("Could not authenticate with Sentinel Hub");
        setIsAuthenticated(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    authenticate();
    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };
  }, [authenticate]);

  return { isAuthenticated, loading, error, retry: authenticate };
}
