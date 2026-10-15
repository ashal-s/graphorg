import { getRedis } from "@/lib/redis";

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

/**
 * INCR then ensure a TTL in one Redis round-trip. Covers both a brand-new
 * key and an orphan from the old SET NX / INCR race (exists, no expiry).
 */
const INCR_WITH_EXPIRE = `
local n = redis.call("INCR", KEYS[1])
if redis.call("TTL", KEYS[1]) < 0 then
  redis.call("EXPIRE", KEYS[1], ARGV[1])
end
return n
`;

export async function checkRateLimit(opts: {
  key: string;
  limit: number;
  windowSeconds: number;
}): Promise<RateLimitResult> {
  const redis = getRedis();
  const count = Number(
    await redis.eval(INCR_WITH_EXPIRE, 1, opts.key, opts.windowSeconds),
  );
  if (count <= opts.limit) return { allowed: true, retryAfterSeconds: 0 };

  const ttl = await redis.ttl(opts.key);
  return {
    allowed: false,
    retryAfterSeconds: Math.max(ttl > 0 ? ttl : opts.windowSeconds, 1),
  };
}
