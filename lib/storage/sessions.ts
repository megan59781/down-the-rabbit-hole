import type { ExplorationSession } from "@/lib/types";

/** Persistence boundary: swap this implementation for Supabase or another backend later. */
export interface SessionStore {
  get(id: string): ExplorationSession | null;
  save(session: ExplorationSession): void;
  remove(id: string): void;
  /** Most recently created session id, if any. */
  latestId(): string | null;
}

const KEY = "rabbit-hole:sessions:v1";
const MAX_SESSIONS = 20;

function isSession(value: unknown): value is ExplorationSession {
  if (!value || typeof value !== "object") return false;
  const s = value as ExplorationSession;
  return (
    typeof s.id === "string" &&
    typeof s.originalThought === "string" &&
    typeof s.createdAt === "string" &&
    Array.isArray(s.nodes) &&
    s.nodes.every(
      (n) =>
        n &&
        typeof n.id === "string" &&
        typeof n.content === "string" &&
        Array.isArray(n.children),
    ) &&
    s.nodes.some((n) => n.id === s.currentNodeId)
  );
}

function readAll(): Record<string, ExplorationSession> {
  try {
    const raw = window.localStorage.getItem(KEY);
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
  const newest = Object.values(sessions)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, MAX_SESSIONS);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(Object.fromEntries(newest.map((s) => [s.id, s]))));
  } catch {
    // Storage full or unavailable (private mode): the session still works in memory.
  }
}

export const localSessionStore: SessionStore = {
  get(id) {
    return readAll()[id] ?? null;
  },
  save(session) {
    writeAll({ ...readAll(), [session.id]: session });
  },
  remove(id) {
    const all = readAll();
    delete all[id];
    writeAll(all);
  },
  latestId() {
    const sessions = Object.values(readAll());
    if (sessions.length === 0) return null;
    return sessions.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0].id;
  },
};

export const sessionStore: SessionStore = localSessionStore;
