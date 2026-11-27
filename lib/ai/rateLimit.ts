import "server-only";

// Rate limits and the daily spending cap.
//
// With UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN set, counts live in Upstash Redis, so
// every server instance shares them (on Vercel each instance has its own memory, which makes
// in-memory limits close to meaningless at scale). Without them, counts are kept in memory: fine
// locally and as a first line of defence.

const PER_MINUTE = Number(process.env.RATE_LIMIT_PER_MINUTE ?? 40);
const PER_HOUR = Number(process.env.RATE_LIMIT_PER_HOUR ?? 300);
/** Hard ceiling on AI calls per day across everyone: a spending cap for the API key. */
const DAILY_CAP = Number(process.env.AI_DAILY_CAP ?? 3000);

export type Limit = { ok: true } | { ok: false; message: string; retryAfter: number };

const SLOW_DOWN = "You're falling very fast. Take a breath and try again in a moment.";
const HOURLY = "That's a lot of falling for one hour. Come back a little later.";
const RESTING = "The rabbit hole is resting for today. Come back tomorrow.";

/** Counts after recording this request: this visitor this minute and hour, and everyone today. */
type Counts = { minute: number; hour: number; day: number };

function verdict({ minute, hour, day }: Counts): Limit {
  if (day > DAILY_CAP) return { ok: false, message: RESTING, retryAfter: 3600 };
  if (minute > PER_MINUTE) return { ok: false, message: SLOW_DOWN, retryAfter: 30 };
  if (hour > PER_HOUR) return { ok: false, message: HOURLY, retryAfter: 600 };
  return { ok: true };
}

// ---------------------------------------------------------------- In memory

const hits = new Map<string, number[]>();
let day = "";
let dayCount = 0;

function memoryCounts(clientId: string, cost: number, now: number): Counts {
  const today = new Date(now).toISOString().slice(0, 10);
  if (today !== day) {
    day = today;
    dayCount = 0;
  }
  const recent = (hits.get(clientId) ?? []).filter((t) => now - t < 3_600_000);
  const before = { minute: recent.filter((t) => now - t < 60_000).length, hour: recent.length, day: dayCount };
  const counts = { minute: before.minute + cost, hour: before.hour + cost, day: before.day + cost };
  // Only spend the allowance if the request goes ahead.
  if (verdict(counts).ok) {
    for (let i = 0; i < cost; i++) recent.push(now);
    dayCount += cost;
  }
  hits.set(clientId, recent);
  // Keep the map from growing without bound.
  if (hits.size > 5000) {
    for (const [id, times] of hits) if (times.every((t) => now - t > 3_600_000)) hits.delete(id);
  }
  return counts;
}

// ---------------------------------------------------------------- Upstash Redis

/** Run commands in one Upstash REST round trip; returns each command's numeric result. */
async function pipeline(url: string, token: string, commands: string[][]): Promise<number[]> {
  const response = await fetch(`${url.replace(/\/+$/, "")}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(commands),
    signal: AbortSignal.timeout(2_000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Upstash answered ${response.status}`);
  const results = (await response.json()) as { result?: unknown; error?: string }[];
  return commands.map((_, i) => {
    const r = results[i];
    if (!r || r.error || typeof r.result !== "number") throw new Error(r?.error ?? "Unexpected Upstash reply");
    return r.result;
  });
}

/** INCRBY a key and (re)set its expiry: a fixed window that cleans itself up. */
const bump = (key: string, cost: number, ttl: number) => [
  ["INCRBY", key, String(cost)],
  ["EXPIRE", key, String(ttl)],
];

/**
 * Fixed windows in Redis. The visitor's own windows are counted first; the shared daily total
 * only grows for requests that visitor is allowed to make, so one visitor hammering the API and
 * being refused can't use up the day's cap for everyone else.
 */
async function redisCounts(url: string, token: string, clientId: string, cost: number, now: number): Promise<Counts> {
  const minuteKey = `rh:m:${clientId}:${Math.floor(now / 60_000)}`;
  const hourKey = `rh:h:${clientId}:${Math.floor(now / 3_600_000)}`;
  const dayKey = `rh:d:${new Date(now).toISOString().slice(0, 10)}`;

  const [minute, , hour] = await pipeline(url, token, [...bump(minuteKey, cost, 120), ...bump(hourKey, cost, 7_200)]);
  if (minute > PER_MINUTE || hour > PER_HOUR) return { minute, hour, day: 0 };
  const [day] = await pipeline(url, token, bump(dayKey, cost, 172_800));
  return { minute, hour, day };
}

let warned = false;

/**
 * Record a request from `clientId` costing `cost` AI calls, and say whether it may go ahead.
 * If Redis is configured but unreachable, it lets the request through rather than taking the
 * whole site down, and warns once in the logs.
 */
export async function checkRateLimit(clientId: string, { cost = 1, now = Date.now() } = {}): Promise<Limit> {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (url && token) {
    try {
      return verdict(await redisCounts(url, token, clientId, cost, now));
    } catch (error) {
      if (!warned) {
        warned = true;
        console.warn("Rate limiting is failing open: Upstash Redis unreachable.", error);
      }
      return { ok: true };
    }
  }
  return verdict(memoryCounts(clientId, cost, now));
}
