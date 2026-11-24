"use client";

import { clsx } from "clsx";
import { motion } from "framer-motion";
import { Footprints } from "@/components/branding/RabbitGuide";
import { getNode, getRoot, pathTo } from "@/lib/session/tree";
import type { ExplorationNode, ExplorationSession } from "@/lib/types";

type TrailMapProps = {
  session: ExplorationSession;
  onSelect: (nodeId: string) => void;
};

/** YOUR TRAIL: the branching history of the exploration, as an indented tree. */
export function TrailMap({ session, onSelect }: TrailMapProps) {
  const onPath = new Set(pathTo(session, session.currentNodeId).map((n) => n.id));
  const root = getRoot(session);

  return (
    <nav aria-label="Your trail">
      <p className="mb-4 font-display text-xs tracking-[0.3em] text-muted uppercase">Your trail</p>
      <ul>
        <TrailNode node={root} session={session} onPath={onPath} onSelect={onSelect} />
      </ul>
    </nav>
  );
}

type TrailNodeProps = {
  node: ExplorationNode;
  session: ExplorationSession;
  onPath: Set<string>;
  onSelect: (nodeId: string) => void;
};

function TrailNode({ node, session, onPath, onSelect }: TrailNodeProps) {
  const current = node.id === session.currentNodeId;
  const inPath = onPath.has(node.id);
  const children = node.children.map((id) => getNode(session, id)).filter((n): n is ExplorationNode => Boolean(n));
  const modeColour = node.mode === "stranger" ? "text-pink" : node.mode === "deeper" ? "text-ice" : "text-lavender";

  return (
    <motion.li layout initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}>
      <button
        type="button"
        onClick={() => onSelect(node.id)}
        aria-current={current ? "step" : undefined}
        className={clsx(
          "group flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition",
          current ? "bg-white/8 text-soft" : inPath ? "text-soft/90 hover:bg-white/5" : "text-muted hover:bg-white/5 hover:text-soft",
        )}
      >
        <span className={clsx("mt-1 shrink-0", modeColour)} aria-hidden>
          {node.type === "thought" ? "◯" : node.type === "mutation" ? "◆" : "?"}
        </span>
        <span className="min-w-0 flex-1">
          {node.type === "mutation" ? <span className="font-medium">{node.title}</span> : <span className="line-clamp-2">{node.content}</span>}
        </span>
        {current ? <Footprints className={clsx("mt-1 h-3.5 w-3.5 shrink-0", modeColour)} /> : null}
      </button>
      {children.length > 0 ? (
        <ul className={clsx("ml-[0.95rem] border-l pl-2", inPath ? "border-lavender/40" : "border-white/10")}>
          {children.map((child) => (
            <TrailNode key={child.id} node={child} session={session} onPath={onPath} onSelect={onSelect} />
          ))}
        </ul>
      ) : null}
    </motion.li>
  );
}
