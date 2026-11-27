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
