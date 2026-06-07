import { Redis } from "@upstash/redis";

const redisUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
export const isKVEnabled = !!(redisUrl && redisToken);

let _redis: Redis | null = null;
export function getRedis(): Redis {
  if (!_redis) {
    _redis = new Redis({ url: redisUrl!, token: redisToken! });
  }
  return _redis;
}

// In-memory fallback stores (for local dev when Upstash is not configured)
const memoryCache = new Map<string, { data: any; expires: number }>();
const ipLimitStore = new Map<string, { count: number; expires: number }>();

/**
 * Get item from cache (Redis or in-memory fallback)
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  if (isKVEnabled) {
    try {
      return await getRedis().get<T>(key);
    } catch (e) {
      console.error("[Redis Cache] get error:", e);
    }
  }
  
  const cached = memoryCache.get(key);
  if (cached && Date.now() < cached.expires) {
    return cached.data as T;
  }
  if (cached) memoryCache.delete(key);
  return null;
}

/**
 * Set item in cache (Redis or in-memory fallback)
 */
export async function cacheSet(key: string, value: any, ttlSeconds: number): Promise<void> {
  if (isKVEnabled) {
    try {
      await getRedis().set(key, value, { ex: ttlSeconds });
      return;
    } catch (e) {
      console.error("[Redis Cache] set error:", e);
    }
  }
  
  memoryCache.set(key, {
    data: value,
    expires: Date.now() + ttlSeconds * 1000
  });
}

/**
 * Check if the IP rate limit is exceeded (Redis or in-memory fallback)
 * Returns true if allowed, false if rate limited.
 */
export async function checkRateLimit(ip: string, limit = 5, windowSeconds = 60): Promise<boolean> {
  const key = `ratelimit:${ip}`;
  if (isKVEnabled) {
    try {
      const redis = getRedis();
      const count = await redis.incr(key);
      if (count === 1) {
        await redis.expire(key, windowSeconds);
      }
      return count <= limit;
    } catch (e) {
      console.error("[Redis RateLimit] error, falling back to memory:", e);
    }
  }

  const now = Date.now();
  const limitInfo = ipLimitStore.get(ip);
  if (!limitInfo || now > limitInfo.expires) {
    ipLimitStore.set(ip, { count: 1, expires: now + windowSeconds * 1000 });
    return true;
  } else {
    limitInfo.count++;
    return limitInfo.count <= limit;
  }
}
