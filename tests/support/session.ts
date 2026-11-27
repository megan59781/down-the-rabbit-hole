import type { ExplorationMode, ExplorationSession, QuestionNode } from "@/lib/types";

/** A small fall for tests: give each node as [id, parentId, text, mode?, extra?]. */
export function makeSession(
  nodes: [string, string | null, string, ExplorationMode?, Partial<QuestionNode>?][],
  focusId: string,
  mode: ExplorationMode = "deeper",
): ExplorationSession {
  const createdAt = "2026-01-01T00:00:00.000Z";
  const list: QuestionNode[] = nodes.map(([id, parentId, text, m = "deeper", extra = {}]) => ({
    id,
    parentId,
    text,
    whisper: "w",
    mode: m,
    children: [],
    createdAt,
    ...extra,
  }));
  for (const n of list) if (n.parentId) list.find((p) => p.id === n.parentId)!.children.push(n.id);
  return { id: "test", rootQuestion: list[0].text, createdAt, nodes: list, focusId, mode };
}
