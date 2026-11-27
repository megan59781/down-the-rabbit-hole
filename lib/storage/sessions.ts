import type { ExplorationSession } from "@/lib/types";

/** Persistence boundary: swap this implementation for Supabase or another backend later. */
export interface SessionStore {
  get(id: string): ExplorationSession | null;
  save(session: ExplorationSession): void;
  remove(id: string): void;
  /** The fall you were last in (most recently saved), if any. */
  latestId(): string | null;
}

// v3: the fall. Sessions from earlier designs (v1, v2) are left behind.
const KEY = "rabbit-hole:sessions:v3";
const MAX_SESSIONS = 20;

function isSession(value: unknown): value is ExplorationSession {
  if (!value || typeof value !== "object") return false;
  const s = value as ExplorationSession;
  return (
    typeof s.id === "string" &&
    typeof s.rootQuestion === "string" &&
    typeof s.createdAt === "string" &&
    Array.isArray(s.nodes) &&
    s.nodes.every(
      (n) =>
        n &&
        typeof n.id === "string" &&
        typeof n.text === "string" &&
        Array.isArray(n.children),
    ) &&
    (s.mode === "deeper" || s.mode === "stranger" || s.mode === "astray") &&
    s.nodes.some((n) => n.id === s.focusId)
  );
}

/** Most recently used first: when it was last saved, or created for older saves without that. */
const recency = (s: ExplorationSession) => s.updatedAt ?? s.createdAt;

// The last thing read or written, so saving (once per streamed question) doesn't re-parse every
// stored fall. Keyed by the raw string, so a change from another tab is still picked up.
let cache: { raw: string | null; sessions: Record<string, ExplorationSession> } | null = null;
let lastSaved = 0;

function readAll(): Record<string, ExplorationSession> {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (cache && cache.raw === raw) return { ...cache.sessions };
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    // Drop anything malformed rather than failing the whole store.
    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>).filter(([, v]) => isSession(v)),
    ) as Record<string, ExplorationSession>;
  } catch {
    return {};
  }
}

function writeAll(sessions: Record<string, ExplorationSession>) {
  // Keep the most recently used falls, so carrying on with an old one never evicts it.
  const kept = Object.fromEntries(
    Object.values(sessions)
      .sort((a, b) => recency(b).localeCompare(recency(a)))
      .slice(0, MAX_SESSIONS)
      .map((s) => [s.id, s]),
  );
  try {
    const raw = JSON.stringify(kept);
    window.localStorage.setItem(KEY, raw);
    cache = { raw, sessions: kept };
  } catch {
    // Storage full or unavailable (private mode): the session still works in memory.
  }
}

export const localSessionStore: SessionStore = {
  get(id) {
    return readAll()[id] ?? null;
  },
  save(session) {
    // Always later than the previous save, even within the same millisecond, so "most recent" is exact.
    lastSaved = Math.max(Date.now(), lastSaved + 1);
    writeAll({ ...readAll(), [session.id]: { ...session, updatedAt: new Date(lastSaved).toISOString() } });
  },
  remove(id) {
    const all = readAll();
    delete all[id];
    writeAll(all);
  },
  latestId() {
    const sessions = Object.values(readAll());
    if (sessions.length === 0) return null;
    return sessions.sort((a, b) => recency(b).localeCompare(recency(a)))[0].id;
  },
};

export const sessionStore: SessionStore = localSessionStore;
