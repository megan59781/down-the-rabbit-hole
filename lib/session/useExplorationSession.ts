"use client";

import { useCallback, useRef, useState } from "react";
import { embedderState } from "@/lib/astray/embedder";
import { getHabits, habitTerritories, tasteProfile } from "@/lib/astray/habits";
import { selectAstray } from "@/lib/astray/select";
import { streamQuestions } from "@/lib/explore/client";
import { MAX_EXCLUDE } from "@/lib/schemas";
import { sessionStore } from "@/lib/storage/sessions";
import type { ExplorationMode, ExplorationSession, GeneratedQuestion } from "@/lib/types";
import { addQuestions, addRabbitAnswer, childrenOf, getNode, pathTo, risingFrom, setPassedOver } from "./tree";

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
  /** Astray candidates as they stream in, before the hole picks which ones to let rise. */
  const [candidates, setCandidates] = useState<Record<string, GeneratedQuestion[]>>({});
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
        // An answer to the rabbit grows its own four questions directly: no steering field.
        const astray = mode === "astray" && node.answer === undefined;
        const field: GeneratedQuestion[] = [];
        let care = false;
        await streamQuestions(
          {
            question: node.answer ?? node.text,
            answer: node.answer !== undefined ? { asked: node.text, said: node.answer } : undefined,
            // Each new set grows only from the question you're holding, not the steps before it.
            path: [],
            mode,
            // The most recent ones only: the API takes at most MAX_EXCLUDE, and after many rounds of
            // "Let others rise" a question can have more children than that.
            exclude: childrenOf(s, nodeId)
              .slice(-MAX_EXCLUDE)
              .map((n) => n.text),
            // Your taste: Deeper and Stranger lean gently towards it, Astray writes against it.
            habits: habitTerritories(getHabits()),
            profile: tasteProfile(getHabits()),
          },
          {
            onQuestion: (q) => {
              if (!astray) return commit((cur) => addQuestions(cur, nodeId, [q], mode));
              // Astray: gather the whole field first, so the hole can choose what to turn down.
              field.push(q);
              if (!quiet) setCandidates((c) => ({ ...c, [key]: [...field] }));
            },
            onCare: () => {
              care = true;
              commit((cur) => (cur.care ? cur : { ...cur, care: true }));
            },
          },
        );
        if (astray && care) {
          // Someone who may be struggling isn't steered against anything: just the gentle questions.
          commit((cur) => addQuestions(cur, nodeId, field.slice(0, 4), mode));
        } else if (astray) {
          const selection = await selectAstray({
            candidates: field,
            held: node.text,
            path: pathTo(s, nodeId).slice(0, -1).map((n) => n.text),
            habits: getHabits(),
            // Wait for meaning only if the model is already loaded; otherwise steer by tags now.
            timeoutMs: embedderState() === "ready" ? 3_000 : 300,
          });
          commit((cur) =>
            setPassedOver(
              addQuestions(cur, nodeId, selection.chosen, mode),
              nodeId,
              selection.passedOver.map(({ text, territory, style }) => ({ text, territory, style })),
            ),
          );
        }
      } catch (error) {
        // A look-ahead's failure only matters if you've since fallen into that question.
        const cur = sessionRef.current;
        if (!quiet || (cur?.focusId === nodeId && cur.mode === mode)) {
          setErrors((e) => ({ ...e, [key]: error instanceof Error ? error.message : "Something went wrong." }));
        }
      } finally {
        inFlight.current.delete(key);
        setPending((p) => without(p, key));
        setCandidates((c) => (key in c ? without(c, key) : c));
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

  /** You answered the rabbit: your words become the next step down, and questions grow from them. */
  const answerRabbit = useCallback(
    (asked: string, said: string) => {
      const s = sessionRef.current;
      if (!s) return;
      queue.current = [];
      const { session: next, id } = addRabbitAnswer(s, s.focusId, asked, said, s.mode);
      commit(() => ({ ...next, focusId: id }));
      ensureRising(id);
    },
    [commit, ensureRising],
  );

  return { session, pending, errors, candidates, grow, dive, setMode, ensureRising, prefetch, answerRabbit };
}

export type ExplorationController = ReturnType<typeof useExplorationSession>;
