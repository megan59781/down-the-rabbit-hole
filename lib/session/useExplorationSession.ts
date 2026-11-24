"use client";

import { useCallback, useRef, useState } from "react";
import { requestContinue, requestMutations } from "@/lib/explore/client";
import { sessionStore } from "@/lib/storage/sessions";
import type {
  ExplorationMode,
  ExplorationSession,
  Mutation,
  SimulationInteraction,
} from "@/lib/types";
import { addChild, getNode, historyFor, thoughtAnchor, updateNode } from "./tree";

function without<T>(record: Record<string, T>, key: string): Record<string, T> {
  const next = { ...record };
  delete next[key];
  return next;
}

/**
 * Owns one exploration session: loads it from storage (client-only component),
 * persists every change, and runs generation requests per node.
 */
export function useExplorationSession(sessionId: string) {
  const [session, setSession] = useState<ExplorationSession | null>(() => sessionStore.get(sessionId));
  const sessionRef = useRef(session);
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const commit = useCallback((change: (s: ExplorationSession) => ExplorationSession) => {
    if (!sessionRef.current) return;
    const next = change(sessionRef.current);
    sessionRef.current = next;
    setSession(next);
    sessionStore.save(next);
  }, []);

  const run = useCallback(async (nodeId: string, task: () => Promise<void>) => {
    setPending((p) => ({ ...p, [nodeId]: true }));
    setErrors((e) => without(e, nodeId));
    try {
      await task();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Something went wrong.";
      setErrors((e) => ({ ...e, [nodeId]: message }));
    } finally {
      setPending((p) => without(p, nodeId));
    }
  }, []);

  const goTo = useCallback(
    (nodeId: string) => commit((s) => ({ ...s, currentNodeId: nodeId })),
    [commit],
  );

  const generateMutations = useCallback(
    (nodeId: string, mode: ExplorationMode) =>
      run(nodeId, async () => {
        const s = sessionRef.current!;
        const node = getNode(s, nodeId)!;
        const result = await requestMutations({
          thought: node.content,
          mode,
          history: historyFor(s, nodeId),
        });
        commit((cur) =>
          updateNode(cur, nodeId, (n) => ({
            mutations: { ...n.mutations, [mode]: result.mutations },
            source: result.source,
          })),
        );
      }),
    [commit, run],
  );

  const chooseMode = useCallback(
    (nodeId: string, mode: ExplorationMode) => {
      commit((s) => ({ ...updateNode(s, nodeId, { mode }), currentNodeId: nodeId }));
      const node = getNode(sessionRef.current!, nodeId);
      if (!node?.mutations?.[mode]) void generateMutations(nodeId, mode);
    },
    [commit, generateMutations],
  );

  /** Switch direction from wherever the user is: applies to the owning thought/question. */
  const switchMode = useCallback(
    (mode: ExplorationMode) => {
      const s = sessionRef.current;
      if (!s) return;
      const anchor = thoughtAnchor(s, s.currentNodeId);
      if (anchor) chooseMode(anchor.id, mode);
    },
    [chooseMode],
  );

  const generateSimulation = useCallback(
    (nodeId: string) =>
      run(nodeId, async () => {
        const s = sessionRef.current!;
        const node = getNode(s, nodeId)!;
        const parent = getNode(s, node.parentId)!;
        const result = await requestContinue({
          originalThought: s.originalThought,
          thought: parent.content,
          selectedMutation: node.mutation!,
          mode: node.mode ?? "deeper",
          interaction: null,
          history: historyFor(s, nodeId),
        });
        commit((cur) =>
          updateNode(cur, nodeId, {
            simulation: result.simulation,
            questions: result.questions,
            source: result.source,
          }),
        );
      }),
    [commit, run],
  );

  const openMutation = useCallback(
    (parentId: string, mutation: Mutation) => {
      const s = sessionRef.current!;
      const parent = getNode(s, parentId)!;
      const existing = parent.children
        .map((id) => getNode(s, id))
        .find((n) => n?.mutation?.id === mutation.id);
      if (existing) return goTo(existing.id);

      let childId = "";
      commit((cur) => {
        const [next, child] = addChild(cur, parentId, {
          type: "mutation",
          title: mutation.title,
          content: mutation.thought,
          mode: parent.mode,
          mutation,
          appliedInteractions: [],
        });
        childId = child.id;
        return { ...next, currentNodeId: child.id };
      });
      void generateSimulation(childId);
    },
    [commit, generateSimulation, goTo],
  );

  const refreshQuestions = useCallback(
    (nodeId: string, interaction: SimulationInteraction | null, append: boolean) =>
      run(`${nodeId}:questions`, async () => {
        const s = sessionRef.current!;
        const node = getNode(s, nodeId)!;
        const parent = getNode(s, node.parentId)!;
        const result = await requestContinue({
          originalThought: s.originalThought,
          thought: parent.content,
          selectedMutation: node.mutation!,
          mode: node.mode ?? "deeper",
          interaction,
          history: historyFor(s, nodeId),
          questionsOnly: true,
          excludeQuestions: (node.questions ?? []).map((q) => q.text),
        });
        commit((cur) =>
          updateNode(cur, nodeId, (n) => ({
            questions: append ? [...(n.questions ?? []), ...result.questions] : result.questions,
          })),
        );
      }),
    [commit, run],
  );

  const applyInteraction = useCallback(
    (nodeId: string, interaction: SimulationInteraction) => {
      const node = getNode(sessionRef.current!, nodeId);
      if (!node || node.appliedInteractions?.includes(interaction.id)) return;
      commit((s) =>
        updateNode(s, nodeId, (n) => ({
          appliedInteractions: [...(n.appliedInteractions ?? []), interaction.id],
        })),
      );
      void refreshQuestions(nodeId, interaction, false);
    },
    [commit, refreshQuestions],
  );

  const moreQuestions = useCallback(
    (nodeId: string) => refreshQuestions(nodeId, null, true),
    [refreshQuestions],
  );

  /** A question becomes the next thought: a new branch under the mutation. */
  const followQuestion = useCallback(
    (mutationNodeId: string, text: string) => {
      const s = sessionRef.current!;
      const parent = getNode(s, mutationNodeId)!;
      const existing = parent.children
        .map((id) => getNode(s, id))
        .find((n) => n?.content === text);
      if (existing) return goTo(existing.id);

      const mode = parent.mode ?? "deeper";
      let childId = "";
      commit((cur) => {
        const [next, child] = addChild(cur, mutationNodeId, { type: "question", content: text, mode });
        childId = child.id;
        return { ...next, currentNodeId: child.id };
      });
      void generateMutations(childId, mode);
    },
    [commit, generateMutations, goTo],
  );

  return {
    session,
    pending,
    errors,
    goTo,
    chooseMode,
    switchMode,
    generateMutations,
    openMutation,
    generateSimulation,
    applyInteraction,
    moreQuestions,
    followQuestion,
  };
}

export type ExplorationController = ReturnType<typeof useExplorationSession>;
