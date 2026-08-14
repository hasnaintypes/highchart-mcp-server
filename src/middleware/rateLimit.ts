/**
 * In-process token-bucket rate limiter. Per-key buckets refill continuously at
 * `ratePerMinute / 60` tokens per second up to `burst` capacity.
 *
 * Note: state is per-process. Multi-instance deployments need a shared store
 * (e.g. Redis) — out of scope here.
 */

export interface RateLimitResult {
  allowed: boolean;
  /** Whole seconds until at least one token is available (0 when allowed). */
  retryAfterSeconds: number;
  /** Approximate tokens remaining after this check. */
  remaining: number;
}

interface Bucket {
  tokens: number;
  lastRefill: number;
}

export interface RateLimiter {
  check(key: string): RateLimitResult;
  reset(): void;
}

export function createRateLimiter(ratePerMinute: number, burst: number): RateLimiter {
  const capacity = Math.max(1, burst);
  const refillPerMs = ratePerMinute / 60000;
  const buckets = new Map<string, Bucket>();

  return {
    check(key: string): RateLimitResult {
      const now = Date.now();
      let bucket = buckets.get(key);
      if (bucket === undefined) {
        bucket = { tokens: capacity, lastRefill: now };
        buckets.set(key, bucket);
      } else {
        const elapsed = now - bucket.lastRefill;
        if (elapsed > 0) {
          bucket.tokens = Math.min(capacity, bucket.tokens + elapsed * refillPerMs);
          bucket.lastRefill = now;
        }
      }

      if (bucket.tokens >= 1) {
        bucket.tokens -= 1;
        return { allowed: true, retryAfterSeconds: 0, remaining: Math.floor(bucket.tokens) };
      }

      const deficit = 1 - bucket.tokens;
      const retryAfterSeconds = refillPerMs > 0 ? Math.ceil(deficit / refillPerMs / 1000) : 60;
      return { allowed: false, retryAfterSeconds, remaining: 0 };
    },
    reset(): void {
      buckets.clear();
    },
  };
}
