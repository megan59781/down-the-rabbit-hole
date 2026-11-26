"use client";

// Browser-side handle on the embedding worker. Vectors are cached by text for the page's life;
// nothing is stored. Every call can fail or time out, so callers always have a fallback.

type Pending = { texts: string[]; resolve: (v: number[][]) => void; reject: (e: Error) => void };

let worker: Worker | null = null;
let nextId = 0;
const pending = new Map<number, Pending>();
const cache = new Map<string, number[]>();
let state: "idle" | "loading" | "ready" | "failed" = "idle";
const listeners = new Set<() => void>();

function setState(next: typeof state) {
  state = next;
  listeners.forEach((l) => l());
}

export const embedderState = () => state;
export function subscribeEmbedder(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Skip the download on data-saver connections: the hole still steers, by territory alone. */
function allowed() {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return typeof Worker !== "undefined" && !connection?.saveData;
}

function getWorker(): Worker | null {
  if (worker || !allowed()) return worker;
  worker = new Worker("/astray/embed-worker.js", { type: "module" });
  worker.onmessage = (event: MessageEvent<{ id: number; vectors?: number[][]; error?: string }>) => {
    const job = pending.get(event.data.id);
    if (!job) return;
    pending.delete(event.data.id);
    if (event.data.vectors) {
      // Cache on arrival, so even a reply that came back after its caller gave up isn't wasted.
      job.texts.forEach((t, i) => cache.set(t, event.data.vectors![i]));
      if (state !== "ready") setState("ready");
      job.resolve(event.data.vectors);
    }
    else job.reject(new Error(event.data.error ?? "Embedding failed"));
  };
  worker.onerror = () => {
    setState("failed");
    pending.forEach((job) => job.reject(new Error("Embedding worker failed")));
    pending.clear();
  };
  return worker;
}

/** Start downloading the model in the background (first Astray). */
export function warmEmbedder() {
  if (state !== "idle") return;
  void embed([], 60_000);
}

/**
 * Embed texts as unit vectors (cosine = dot product). Resolves null if the model isn't
 * available in time, in which case the caller falls back to territories.
 */
export async function embed(texts: string[], timeoutMs = 8_000): Promise<number[][] | null> {
  const w = getWorker();
  if (!w || state === "failed") return null;
  const missing = [...new Set(texts.filter((t) => !cache.has(t)))];
  if (state === "idle") setState("loading");
  try {
    if (missing.length > 0 || state !== "ready") {
      const id = nextId++;
      const vectors = await Promise.race([
        new Promise<number[][]>((resolve, reject) => {
          pending.set(id, { texts: missing, resolve, reject });
          w.postMessage({ id, texts: missing });
        }),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
      ]);
      if (!vectors) return null; // Still loading: the result will land in the cache for next time.
    }
    return texts.map((t) => cache.get(t)!);
  } catch {
    setState("failed");
    return null;
  }
}
