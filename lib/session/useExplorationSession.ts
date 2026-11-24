"use client";

import { useCallback, useRef, useState } from "react";
import { requestQuestions } from "@/lib/explore/client";
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

/**
 * Owns one fall: loads it from storage (client-only component), persists every change,
 * and makes questions rise from whichever question you're holding.
 */
export function useExplorationSession(sessionId: string) {
  const [session, setSession] = useState<ExplorationSession | null>(() => sessionStore.get(sessionId));
  const sessionRef = useRef(session);
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const inFlight = useRef(new Set<string>());

  const commit = useCallback((change: (s: ExplorationSession) => ExplorationSession) => {
    if (!sessionRef.current) return;
    const next = change(sessionRef.current);
    sessionRef.current = next;
    setSession(next);
    sessionStore.save(next);
  }, []);

  const grow = useCallback(
    async (nodeId: string, mode: ExplorationMode) => {
      const key = growKey(nodeId, mode);
      if (inFlight.current.has(key) || !sessionRef.current) return;
      inFlight.current.add(key);
      setPending((p) => ({ ...p, [key]: true }));
      setErrors((e) => without(e, key));
      try {
        const s = sessionRef.current;
        const node = getNode(s, nodeId)!;
        const questions = await requestQuestions({
          question: node.text,
          // Each new set grows only from the question you're holding, not the steps before it.
          path: [],
          mode,
          exclude: childrenOf(s, nodeId).map((n) => n.text),
        });
        commit((cur) => addQuestions(cur, nodeId, questions, mode));
      } catch (error) {
        setErrors((e) => ({ ...e, [key]: error instanceof Error ? error.message : "Something went wrong." }));
      } finally {
        inFlight.current.delete(key);
        setPending((p) => without(p, key));
      }
    },
    [commit],
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
      commit((s) => ({ ...s, focusId: nodeId }));
      ensureRising(nodeId);
    },
    [commit, ensureRising],
  );

  /** Flip the direction of the fall. */
  const setMode = useCallback(
    (mode: ExplorationMode) => {
      commit((s) => ({ ...s, mode }));
      ensureRising(sessionRef.current!.focusId);
    },
    [commit, ensureRising],
  );

  return { session, pending, errors, grow, dive, setMode, ensureRising };
}

export type ExplorationController = ReturnType<typeof useExplorationSession>;
