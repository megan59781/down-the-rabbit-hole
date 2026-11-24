import type { ExplorationNode, ExplorationSession } from "@/lib/types";
import { uid } from "@/lib/utils";

type NewNode = Omit<ExplorationNode, "id" | "parentId" | "children" | "createdAt">;

export function createSession(thought: string): ExplorationSession {
  const now = new Date().toISOString();
  const root: ExplorationNode = {
    id: uid("n-"),
    parentId: null,
    type: "thought",
    content: thought,
    children: [],
    createdAt: now,
  };
  return {
    id: uid(),
    originalThought: thought,
    createdAt: now,
    nodes: [root],
    currentNodeId: root.id,
  };
}

export function getNode(session: ExplorationSession, id: string | null | undefined) {
  return session.nodes.find((n) => n.id === id);
}

export function getRoot(session: ExplorationSession) {
  return session.nodes.find((n) => n.parentId === null) ?? session.nodes[0];
}

export function addChild(
  session: ExplorationSession,
  parentId: string,
  node: NewNode,
): [ExplorationSession, ExplorationNode] {
  const child: ExplorationNode = {
    ...node,
    id: uid("n-"),
    parentId,
    children: [],
    createdAt: new Date().toISOString(),
  };
  const nodes = session.nodes.map((n) =>
    n.id === parentId ? { ...n, children: [...n.children, child.id] } : n,
  );
  return [{ ...session, nodes: [...nodes, child] }, child];
}

export function updateNode(
  session: ExplorationSession,
  id: string,
  patch: Partial<ExplorationNode> | ((node: ExplorationNode) => Partial<ExplorationNode>),
): ExplorationSession {
  return {
    ...session,
    nodes: session.nodes.map((n) =>
      n.id === id ? { ...n, ...(typeof patch === "function" ? patch(n) : patch) } : n,
    ),
  };
}

/** Nodes from the root down to `id`, inclusive. */
export function pathTo(session: ExplorationSession, id: string): ExplorationNode[] {
  const path: ExplorationNode[] = [];
  let node = getNode(session, id);
  while (node) {
    path.unshift(node);
    node = getNode(session, node.parentId);
  }
  return path;
}

/** The thought-like node (thought or question) that owns `id`: itself, or its parent for a mutation. */
export function thoughtAnchor(session: ExplorationSession, id: string): ExplorationNode | undefined {
  const node = getNode(session, id);
  if (!node) return undefined;
  return node.type === "mutation" ? getNode(session, node.parentId) : node;
}

/** Short context for generation: the last few steps of the path, oldest first. */
export function historyFor(session: ExplorationSession, id: string, limit = 5): string[] {
  return pathTo(session, id)
    .slice(-limit - 1, -1)
    .map((n) => (n.type === "mutation" ? `${n.title}: ${n.content}` : n.content));
}
