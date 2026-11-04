/**
 * Fixed-window rate limiter with two backends:
 *
 *  - Upstash Redis (REST API, no SDK needed — just fetch) when
 *    UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are set. This is
 *    exact across every Vercel serverless instance, which matters once
 *    there's enough traffic to run more than one instance concurrently.
 *    Upstash's free tier (10,000 commands/day at the time of writing) is
 *    the natural fit here: no infra to run, plays nicely with Vercel.
 *
 *  - In-memory fixed-window buckets otherwise. State is per server
 *    instance, so on a multi-instance / serverless deployment the
 *    effective limit is roughly `limit x concurrently-warm-instances`. It
 *    still stops casual brute-forcing and spam, just not with a hard
 *    guarantee under real concurrent load — hence the Upstash option above.
 *
 * Callers don't need to know which backend is active; both are exposed
 * through the same async rateLimit()/limitOr429() functions.
 */
interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

function inMemoryRateLimit(key: string, limit: number, windowMs: number): { ok: true } | { ok: false; retryAfterSeconds: number } {
  const now = Date.now();

  if (buckets.size > 5000) {
    for (const [k, b] of buckets) {
      if (b.resetAt <= now) buckets.delete(k);
    }
    // Hard cap: if expiry sweep didn't free enough entries, evict all to prevent OOM
    if (buckets.size > 5000) buckets.clear();
  }

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }

  bucket.count += 1;
  if (bucket.count > limit) {
    return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) };
  }
  return { ok: true };
}

function upstashConfig(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) return null;
  return { url: url.replace(/\/$/, ""), token };
}

let warnedUpstashUnavailable = false;

async function upstashRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<{ ok: true } | { ok: false; retryAfterSeconds: number } | null> {
  const config = upstashConfig();
  if (!config) return null;

  // Redis key namespaced so it can't collide with anything else stored in
  // the same Upstash database.
  const redisKey = `ratelimit:${key}`;
  const windowSeconds = Math.max(1, Math.ceil(windowMs / 1000));

  try {
    const incrRes = await fetch(`${config.url}/incr/${encodeURIComponent(redisKey)}`, {
      headers: { Authorization: `Bearer ${config.token}` },
    });
    if (!incrRes.ok) throw new Error(`Upstash INCR failed: ${incrRes.status}`);
    const { result: count } = (await incrRes.json()) as { result: number };

    if (count === 1) {
      // First hit in this window: set the window to expire. Fire-and-forget
      // is fine here — a missing expire in the rare failure case just means
      // this key lives a little longer than intended, not a correctness bug.
      void fetch(`${config.url}/expire/${encodeURIComponent(redisKey)}/${windowSeconds}`, {
        headers: { Authorization: `Bearer ${config.token}` },
      });
    }

    if (count > limit) {
      // TTL isn't tracked precisely here (would need an extra round trip);
      // the window length is a safe, if slightly pessimistic, upper bound.
      return { ok: false, retryAfterSeconds: windowSeconds };
    }
    return { ok: true };
  } catch (err) {
    if (!warnedUpstashUnavailable) {
      warnedUpstashUnavailable = true;
      console.warn("[rateLimit] Upstash request failed, falling back to in-memory limiter:", err);
    }
    return null;
  }
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim() || "unknown";
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<{ ok: true } | { ok: false; retryAfterSeconds: number }> {
  const upstashResult = await upstashRateLimit(key, limit, windowMs);
  if (upstashResult) return upstashResult;
  return inMemoryRateLimit(key, limit, windowMs);
}

/** Convenience wrapper returning a ready-made 429 response when the limit is hit. */
export async function limitOr429(
  request: Request,
  scope: string,
  limit: number,
  windowMs: number,
  extraKey = ""
): Promise<Response | null> {
  const result = await rateLimit(`${scope}:${getClientIp(request)}:${extraKey}`, limit, windowMs);
  if (result.ok) return null;
  return new Response(
    JSON.stringify({ detail: "Too many requests. Please wait a moment and try again.", error: "Too many requests." }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(result.retryAfterSeconds),
      },
    }
  );
}
