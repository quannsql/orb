"""
Upstash Redis client for Python — reads/writes the same keys as Next.js frontend.
"""

import os
import json
from typing import Optional, Any
from upstash_redis import Redis


_redis: Optional[Redis] = None


def get_redis() -> Redis:
    """Get or create Redis client singleton."""
    global _redis
    if _redis is None:
        url = os.getenv("KV_REST_API_URL") or os.getenv("UPSTASH_REDIS_REST_URL")
        token = os.getenv("KV_REST_API_TOKEN") or os.getenv("UPSTASH_REDIS_REST_TOKEN")

        if not url or not token:
            raise RuntimeError(
                "Redis not configured. Set KV_REST_API_URL and KV_REST_API_TOKEN."
            )

        _redis = Redis(url=url, token=token)
    return _redis


# ───────────────────────────────────────────────────────
# Cache Read/Write (compatible with Next.js redis.ts)
# ───────────────────────────────────────────────────────

def cache_get(key: str) -> Any:
    """
    Get cached value from Redis.
    Returns deserialized JSON or None.
    """
    try:
        redis = get_redis()
        value = redis.get(key)
        if value is None:
            return None
        # Upstash REST API returns strings — parse if JSON
        if isinstance(value, str):
            try:
                return json.loads(value)
            except (json.JSONDecodeError, TypeError):
                return value
        return value
    except Exception as e:
        print(f"[Redis] GET error for key '{key}': {e}")
        return None


def cache_set(key: str, value: Any, ttl_seconds: int = 86400) -> bool:
    """
    Set cached value in Redis with TTL.

    Args:
        key: Cache key
        value: Value to store (will be JSON serialized)
        ttl_seconds: Time-to-live in seconds (default: 24 hours)

    Returns:
        True if successful
    """
    try:
        redis = get_redis()
        # Serialize to JSON string for compatibility with Next.js
        serialized = json.dumps(value) if not isinstance(value, str) else value
        redis.set(key, serialized, ex=ttl_seconds)
        return True
    except Exception as e:
        print(f"[Redis] SET error for key '{key}': {e}")
        return False


# ───────────────────────────────────────────────────────
# Sentinel Alert History (same keys as Next.js)
# ───────────────────────────────────────────────────────

HISTORY_KEY = "sentinel:alerts:history"
COOLDOWN_KEY = "sentinel:sweep:cooldown"


def get_alert_history() -> list[dict]:
    """Get sentinel alert history from Redis."""
    history = cache_get(HISTORY_KEY)
    if isinstance(history, list):
        return history
    return []


def save_alert_to_history(alert: dict, max_items: int = 15) -> bool:
    """
    Prepend a new alert to the history list.
    Limits to max_items to prevent unbounded growth.
    """
    history = get_alert_history()
    history = [alert, *history][:max_items]
    return cache_set(HISTORY_KEY, history, ttl_seconds=604800)  # 7 days


def get_recent_hotspots(limit: int = 5) -> list[str]:
    """Get list of recent hotspot names to avoid redundancy."""
    history = get_alert_history()
    hotspots = list(dict.fromkeys(
        h.get("hotspot", "") for h in history if h.get("hotspot")
    ))
    return hotspots[:limit]


def is_cooldown_active() -> bool:
    """Check if the sweep cooldown is active."""
    return cache_get(COOLDOWN_KEY) is not None


def set_cooldown(ttl_seconds: int = 1800) -> bool:
    """Set the sweep cooldown (default 30 minutes)."""
    return cache_set(COOLDOWN_KEY, "active", ttl_seconds)


# ───────────────────────────────────────────────────────
# Butterfly Simulation Cache
# ───────────────────────────────────────────────────────

def get_butterfly_cache(scenario: str, lng: float, lat: float) -> Optional[dict]:
    """Get cached butterfly simulation result."""
    import re
    round_lng = round(lng, 2)
    round_lat = round(lat, 2)
    normalized = re.sub(r"[^a-z0-9]", "_", scenario.lower().strip())
    key = f"butterfly:cache:{normalized}:{round_lng}:{round_lat}"
    return cache_get(key)


def set_butterfly_cache(
    scenario: str,
    lng: float,
    lat: float,
    result: dict,
    ttl_seconds: int = 86400 * 7,
) -> bool:
    """Cache butterfly simulation result (default: 7 days)."""
    import re
    round_lng = round(lng, 2)
    round_lat = round(lat, 2)
    normalized = re.sub(r"[^a-z0-9]", "_", scenario.lower().strip())
    key = f"butterfly:cache:{normalized}:{round_lng}:{round_lat}"
    return cache_set(key, result, ttl_seconds)


# ───────────────────────────────────────────────────────
# Debate Transcript Storage
# ───────────────────────────────────────────────────────

def save_debate_transcript(alert_id: str, transcript: list) -> bool:
    """Save debate transcript for an alert."""
    key = f"sentinel:debate:{alert_id}"
    return cache_set(key, transcript, ttl_seconds=604800)  # 7 days


def get_debate_transcript(alert_id: str) -> Optional[list]:
    """Get debate transcript for an alert."""
    key = f"sentinel:debate:{alert_id}"
    result = cache_get(key)
    return result if isinstance(result, list) else None
