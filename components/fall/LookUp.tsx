"use client";

import { clsx } from "clsx";
import { motion } from "framer-motion";
import { useEffect } from "react";
import { Footprints } from "@/components/branding/RabbitGuide";
import { childrenOf, pathTo } from "@/lib/session/tree";
import type { ExplorationSession } from "@/lib/types";

const MODE_TEXT = { deeper: "text-ice", stranger: "text-pink" } as const;

type LookUpProps = {
  session: ExplorationSession;
  onJump: (nodeId: string) => void;
  onClose: () => void;
};

/** Pause the fall and look back up the hole: the path you took, and what you passed on the way. */
export function LookUp({ session, onJump, onClose }: LookUpProps) {
  const path = pathTo(session, session.focusId);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label="Look up: the path you fell"
      className="fixed inset-0 z-40 overflow-y-auto bg-midnight/85 backdrop-blur-md"
      initial={{ opacity: 0, y: -40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -40 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-10">
        <div className="flex w-full items-center justify-between">
          <p className="font-display text-xs tracking-[0.3em] text-muted uppercase">↑ Looking up the hole</p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-soft hover:border-lavender/60"
          >
            Keep falling ↓
          </button>
        </div>

        <ol className="mt-10 flex w-full flex-col items-center">
          {path.map((node, i) => {
            const passed = node.parentId
              ? childrenOf(session, node.parentId)
                  .filter((s) => s.id !== node.id)
                  .slice(-4)
              : [];
            const current = i === path.length - 1;
            return (
              <motion.li
                key={node.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.08 }}
                className="flex w-full flex-col items-center"
              >
                {i > 0 ? (
                  <span
                    aria-hidden
                    className="h-10 w-px bg-gradient-to-b from-lavender/20 to-lavender/70 shadow-[0_0_8px_rgb(183_154_255/0.6)]"
                  />
                ) : null}
                {passed.length > 0 ? (
                  <div className="mb-2 flex flex-wrap justify-center gap-x-4 gap-y-1">
                    {passed.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => onJump(s.id)}
                        className="max-w-[14rem] truncate text-xs text-muted/60 transition hover:text-soft"
                        title="Fall into this one instead"
                      >
                        <span className={MODE_TEXT[s.mode]}>?</span> {s.text}
                      </button>
                    ))}
                  </div>
                ) : null}
                <button
                  type="button"
                  onClick={() => (current ? onClose() : onJump(node.id))}
                  className={clsx(
                    "flex max-w-lg items-center gap-2 rounded-full border px-4 py-2 text-center transition",
                    current
                      ? "border-lavender/70 bg-lavender/10 shadow-[0_0_30px_-6px_rgb(183_154_255/0.7)]"
                      : "border-white/15 hover:border-white/40",
                  )}
                >
                  <span className={clsx("text-xs", i === 0 ? "text-lavender" : MODE_TEXT[node.mode])}>
                    {i === 0 ? "◯" : node.mode === "deeper" ? "↓" : "✦"}
                  </span>
                  <span className={clsx(i === 0 ? "font-serif text-lg" : "text-sm", "text-soft")}>{node.text}</span>
                  {current ? <Footprints className="h-3.5 w-3.5 shrink-0 text-lavender" /> : null}
                </button>
              </motion.li>
            );
          })}
        </ol>

        <p className="mt-10 text-center text-xs text-muted/70">
          Tap any question to fall back into it. The faint ones are the paths you passed.
        </p>
      </div>
    </motion.div>
  );
}
