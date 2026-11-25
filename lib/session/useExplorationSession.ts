"use client";

import { useCallback, useRef, useState } from "react";
import { streamQuestions } from "@/lib/explore/client";
import { sessionStore } from "@/lib/storage/sessions";
import type { ExplorationMode, ExplorationSession } from "@/lib/types";
import { addQuestions, childrenOf, getNode, risingFrom } from "./tree";

function without<T>(record: Record<string, T>, key: string): Record<string, T> {
  const next = { ...record };
  delete next[key];
  return next;
}

/** Pending/error key for growing questions from a node in a direction. */
export const growKey = (nodeId: string, mode: ExplorationMode) => `${nodeId}:${mode}`;

/** How many quiet look-aheads may run at once, so they never crowd out what you asked for. */
const PREFETCH_CONCURRENCY = 2;

/**
 * Owns one fall: loads it from storage (client-only component), persists every change,
 * and makes questions rise from whichever question you're holding. Questions stream in
 * one at a time, and the next level is quietly grown ahead so diving feels instant.
 */
export function useExplorationSession(sessionId: string) {
  const [session, setSession] = useState<ExplorationSession | null>(() => sessionStore.get(sessionId));
  const sessionRef = useRef(session);
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const inFlight = useRef(new Set<string>());
  const queue = useRef<{ nodeId: string; mode: ExplorationMode }[]>([]);
  const prefetching = useRef(0);

  const commit = useCallback((change: (s: ExplorationSession) => ExplorationSession) => {
    if (!sessionRef.current) return;
    const next = change(sessionRef.current);
    sessionRef.current = next;
    setSession(next);
    sessionStore.save(next);
  }, []);

  /** Grow questions from a node. `quiet` look-aheads don't show errors; a real dive will retry. */
  const grow = useCallback(
    async (nodeId: string, mode: ExplorationMode, quiet = false) => {
      const key = growKey(nodeId, mode);
      if (inFlight.current.has(key) || !sessionRef.current) return;
      inFlight.current.add(key);
      setPending((p) => ({ ...p, [key]: true }));
      setErrors((e) => without(e, key));
      try {
        const s = sessionRef.current;
        const node = getNode(s, nodeId)!;
        await streamQuestions(
          {
            question: node.text,
            // Each new set grows only from the question you're holding, not the steps before it.
            path: [],
            mode,
            exclude: childrenOf(s, nodeId).map((n) => n.text),
          },
          {
            onQuestion: (q) => commit((cur) => addQuestions(cur, nodeId, [q], mode)),
            onCare: () => commit((cur) => (cur.care ? cur : { ...cur, care: true })),
          },
        );
      } catch (error) {
        // A look-ahead's failure only matters if you've since fallen into that question.
        const cur = sessionRef.current;
        if (!quiet || (cur?.focusId === nodeId && cur.mode === mode)) {
          setErrors((e) => ({ ...e, [key]: error instanceof Error ? error.message : "Something went wrong." }));
        }
      } finally {
        inFlight.current.delete(key);
        setPending((p) => without(p, key));
      }
    },
    [commit],
  );

  const pump = useCallback(() => {
    while (prefetching.current < PREFETCH_CONCURRENCY && queue.current.length > 0) {
      const { nodeId, mode } = queue.current.shift()!;
      const s = sessionRef.current;
      if (!s || risingFrom(s, nodeId, mode).length > 0 || inFlight.current.has(growKey(nodeId, mode))) continue;
      prefetching.current++;
      void grow(nodeId, mode, true).finally(() => {
        prefetching.current--;
        pump();
      });
    }
  }, [grow]);

  /** Quietly grow the next level for these questions, so falling into one is instant. */
  const prefetch = useCallback(
    (nodeIds: string[], mode: ExplorationMode) => {
      // Newest wishes first: only what's on screen now is worth growing.
      queue.current = nodeIds.map((nodeId) => ({ nodeId, mode }));
      pump();
    },
    [pump],
  );

  /** Make sure questions are rising from a node in the current direction. */
  const ensureRising = useCallback(
    (nodeId: string) => {
      const s = sessionRef.current;
      if (s && risingFrom(s, nodeId, s.mode).length === 0) void grow(nodeId, s.mode);
    },
    [grow],
  );

  /** Fall into a question: it becomes the one you're holding. */
  const dive = useCallback(
    (nodeId: string) => {
      queue.current = [];
      commit((s) => ({ ...s, focusId: nodeId }));
      ensureRising(nodeId);
    },
    [commit, ensureRising],
  );

  /** Flip the direction of the fall. */
  const setMode = useCallback(
    (mode: ExplorationMode) => {
      queue.current = [];
      commit((s) => ({ ...s, mode }));
      ensureRising(sessionRef.current!.focusId);
    },
    [commit, ensureRising],
  );

  return { session, pending, errors, grow, dive, setMode, ensureRising, prefetch };
}

export type ExplorationController = ReturnType<typeof useExplorationSession>;
