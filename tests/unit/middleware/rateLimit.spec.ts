import { describe, it, expect, vi } from 'vitest';
import { createRateLimiter } from '../../../src/middleware/rateLimit.js';

describe('token-bucket rate limiter', () => {
  it('allows up to the burst capacity then blocks', () => {
    const limiter = createRateLimiter(60, 3); // 1/sec, burst 3
    expect(limiter.check('a').allowed).toBe(true);
    expect(limiter.check('a').allowed).toBe(true);
    expect(limiter.check('a').allowed).toBe(true);
    const blocked = limiter.check('a');
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('tracks buckets independently per key', () => {
    const limiter = createRateLimiter(60, 1);
    expect(limiter.check('a').allowed).toBe(true);
    expect(limiter.check('a').allowed).toBe(false);
    expect(limiter.check('b').allowed).toBe(true);
  });

  it('refills over time', () => {
    vi.useFakeTimers();
    const limiter = createRateLimiter(60, 1); // 1 token/sec
    expect(limiter.check('a').allowed).toBe(true);
    expect(limiter.check('a').allowed).toBe(false);
    vi.advanceTimersByTime(1100);
    expect(limiter.check('a').allowed).toBe(true);
    vi.useRealTimers();
  });
});
