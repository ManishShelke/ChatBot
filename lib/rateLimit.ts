/**
 * In-Memory Rate Limiter.
 * Production-ready for single-instance / stateless container runtimes.
 * 
 * Configured for 30 requests / minute per authenticated user or IP address.
 */

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetSeconds: number;
}

class InMemoryRateLimiter {
  private records = new Map<string, RateLimitRecord>();
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(windowMs = 60 * 1000, maxRequests = 30) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;

    // Prune stale records every 2 minutes
    setInterval(() => this.pruneStale(), 2 * 60 * 1000);
  }

  public check(identifier: string): RateLimitResult {
    const now = Date.now();
    let record = this.records.get(identifier);

    if (!record || now >= record.resetAt) {
      record = {
        count: 1,
        resetAt: now + this.windowMs,
      };
      this.records.set(identifier, record);
      return {
        allowed: true,
        limit: this.maxRequests,
        remaining: this.maxRequests - 1,
        resetSeconds: Math.ceil(this.windowMs / 1000),
      };
    }

    if (record.count >= this.maxRequests) {
      const resetSeconds = Math.max(1, Math.ceil((record.resetAt - now) / 1000));
      return {
        allowed: false,
        limit: this.maxRequests,
        remaining: 0,
        resetSeconds,
      };
    }

    record.count += 1;
    const resetSeconds = Math.max(1, Math.ceil((record.resetAt - now) / 1000));
    return {
      allowed: true,
      limit: this.maxRequests,
      remaining: this.maxRequests - record.count,
      resetSeconds,
    };
  }

  private pruneStale(): void {
    const now = Date.now();
    for (const [key, record] of this.records.entries()) {
      if (now >= record.resetAt) {
        this.records.delete(key);
      }
    }
  }
}

// Global chat rate limiter: 30 requests per 60 seconds
export const chatRateLimiter = new InMemoryRateLimiter(60 * 1000, 30);
