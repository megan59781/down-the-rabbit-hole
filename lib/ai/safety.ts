import "server-only";

// A fast first check for questions that need care rather than play. The model also flags
// these itself (CARE: yes); this catches the clearest cases before it even starts.
const CARE_PATTERNS = [
  // "myself", not "me": "why do sad songs hurt me so much?" is curiosity, not crisis.
  /\b(kill|hurt|harm)(ing)?\s+my\s?self\b/i,
  /\bsuicid/i,
  /\bself[-\s]?harm/i,
  /\b(end|ending|take|taking)\s+my\s+(own\s+)?life\b/i,
  /\b(want|wanna|wish)\s+(to\s+)?(die|be dead|disappear forever)\b/i,
  /\bno\s+(reason|point)\s+(to|in)\s+(live|living|go on|going on)\b/i,
  /\bbetter off (dead|without me)\b/i,
];

export function needsCare(text: string): boolean {
  return CARE_PATTERNS.some((p) => p.test(text));
}

// Rate limits. In memory, so per server instance: fine locally and as a first line of
// defence. Swap for a shared store (e.g. Upstash Redis) before real public traffic.
const PER_MINUTE = Number(process.env.RATE_LIMIT_PER_MINUTE ?? 40);
const PER_HOUR = Number(process.env.RATE_LIMIT_PER_HOUR ?? 300);
/** Hard ceiling on AI calls per day across everyone: a spending cap for the API key. */
const DAILY_CAP = Number(process.env.AI_DAILY_CAP ?? 3000);

const hits = new Map<string, number[]>();
let day = "";
let dayCount = 0;

export type Limit = { ok: true } | { ok: false; message: string; retryAfter: number };

export function checkRateLimit(clientId: string, now = Date.now()): Limit {
  const today = new Date(now).toISOString().slice(0, 10);
  if (today !== day) {
    day = today;
    dayCount = 0;
  }
  if (dayCount >= DAILY_CAP) {
    return { ok: false, message: "The rabbit hole is resting for today. Come back tomorrow.", retryAfter: 3600 };
  }

  const recent = (hits.get(clientId) ?? []).filter((t) => now - t < 3_600_000);
  const lastMinute = recent.filter((t) => now - t < 60_000);
  if (lastMinute.length >= PER_MINUTE) {
    return { ok: false, message: "You're falling very fast. Take a breath and try again in a moment.", retryAfter: 30 };
  }
  if (recent.length >= PER_HOUR) {
    return { ok: false, message: "That's a lot of falling for one hour. Come back a little later.", retryAfter: 600 };
  }

  recent.push(now);
  hits.set(clientId, recent);
  dayCount++;
  // Keep the map from growing without bound.
  if (hits.size > 5000) {
    for (const [id, times] of hits) if (times.every((t) => now - t > 3_600_000)) hits.delete(id);
  }
  return { ok: true };
}

/** Best guess at who's asking, for rate limiting only. Never stored or logged. */
export function clientIdOf(request: Request): string {
  // Prefer what the host sets itself (Vercel overwrites these); a visitor can put anything in
  // their own X-Forwarded-For, which would hand them a fresh rate-limit bucket every request.
  const platform =
    request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip")?.trim();
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return platform || forwarded || "local";
}

/**
 * Only our own pages may call the API, so it can't be used as a free AI endpoint from
 * elsewhere. Not bulletproof (headers can be forged by scripts), but it stops casual reuse.
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!origin) return process.env.NODE_ENV !== "production";
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
