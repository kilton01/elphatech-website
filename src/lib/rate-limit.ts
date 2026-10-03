import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Vercel's Upstash integration creates KV_REST_API_*; a manual Upstash setup uses UPSTASH_REDIS_REST_*.
const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

const redis = url && token ? new Redis({ url, token }) : null;

if (!redis) {
  console.warn('Rate limiting is DISABLED: no Upstash/KV REST credentials found in the environment.');
}

const noopLimiter = { limit: () => Promise.resolve({ success: true, limit: 0, remaining: 0, reset: 0 }) } as unknown as Ratelimit;

export const contactLimiter = redis
  ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(3, '1 h'), prefix: 'rl:contact' })
  : noopLimiter;
