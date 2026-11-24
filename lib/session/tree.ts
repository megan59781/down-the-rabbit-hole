import type { ExplorationMode, ExplorationSession, GeneratedQuestion, QuestionNode } from "@/lib/types";
import { uid } from "@/lib/utils";

export function createSession(question: string): ExplorationSession {
  const now = new Date().toISOString();
  const root: QuestionNode = {
    id: uid("q-"),
    parentId: null,
    text: question,
    mode: "deeper",
    children: [],
    createdAt: now,
  };
  return { id: uid(), rootQuestion: question, createdAt: now, nodes: [root], focusId: root.id, mode: "deeper" };
}

export function getNode(session: ExplorationSession, id: string | null | undefined) {
  return session.nodes.find((n) => n.id === id);
}

export function childrenOf(session: ExplorationSession, id: string): QuestionNode[] {
  const node = getNode(session, id);
  return (node?.children ?? []).map((c) => getNode(session, c)).filter((n): n is QuestionNode => Boolean(n));
}

/** The questions currently rising from a node in a direction: the newest set of four. */
export function risingFrom(session: ExplorationSession, id: string, mode: ExplorationMode, count = 4) {
  return childrenOf(session, id)
    .filter((n) => n.mode === mode)
    .slice(-count);
}

/** Add generated questions under a node, skipping repeats. */
export function addQuestions(
  session: ExplorationSession,
  parentId: string,
  generated: GeneratedQuestion[],
  mode: ExplorationMode,
): ExplorationSession {
  const existing = new Set(childrenOf(session, parentId).map((n) => n.text.toLowerCase()));
  const now = new Date().toISOString();
  const added: QuestionNode[] = [];
  for (const q of generated) {
    if (existing.has(q.text.toLowerCase())) continue;
    existing.add(q.text.toLowerCase());
    added.push({ id: uid("q-"), parentId, text: q.text, whisper: q.whisper, mode, children: [], createdAt: now });
  }
  const nodes = session.nodes.map((n) =>
    n.id === parentId ? { ...n, children: [...n.children, ...added.map((a) => a.id)] } : n,
  );
  return { ...session, nodes: [...nodes, ...added] };
}

/** Nodes from the root down to `id`, inclusive. */
export function pathTo(session: ExplorationSession, id: string): QuestionNode[] {
  const path: QuestionNode[] = [];
  let node = getNode(session, id);
  while (node) {
    path.unshift(node);
    node = getNode(session, node.parentId);
  }
  return path;
}

/** Ancestor questions (root first, excluding `id`), capped for prompt context. */
export function contextPath(session: ExplorationSession, id: string, limit = 5): string[] {
  return pathTo(session, id)
    .slice(0, -1)
    .slice(-limit)
    .map((n) => n.text);
}
