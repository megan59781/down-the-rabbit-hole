"use client";

import { clsx } from "clsx";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Footprints } from "@/components/branding/RabbitGuide";
import { RabbitIcon } from "@/components/branding/RabbitIcon";
import { childrenOf, pathTo } from "@/lib/session/tree";
import type { ExplorationSession } from "@/lib/types";
import { HabitMirror } from "./HabitMirror";

const MODE_TEXT = { deeper: "text-ice", stranger: "text-pink", astray: "text-lavender" } as const;
const MODE_GLYPH = { deeper: "↓", stranger: "✦", astray: "⇝" } as const;

const PAGES = [
  { id: "path", label: "Your path", glyph: "↑" },
  { id: "you", label: "About you", glyph: "⇝" },
] as const;
type Page = (typeof PAGES)[number]["id"];

type LookUpProps = {
  session: ExplorationSession;
  onJump: (nodeId: string) => void;
  onClose: () => void;
};

/**
 * Pause the fall and look back up the hole. Two pages: the path you fell (and what you passed
 * on the way), and what the hole has learned about you.
 */
export function LookUp({ session, onJump, onClose }: LookUpProps) {
  const [page, setPage] = useState<Page>("path");
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Arrow keys move between the two pages, as tabs should.
  const onTabKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const next = PAGES[(PAGES.findIndex((p) => p.id === page) + 1) % PAGES.length].id;
    setPage(next);
    tabs.current[PAGES.findIndex((p) => p.id === next)]?.focus();
  };

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label="Look up"
      className="fixed inset-0 z-40 flex flex-col bg-midnight/90 backdrop-blur-md"
      initial={{ opacity: 0, y: -40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -40 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <div className="mx-auto flex w-full max-w-2xl flex-wrap items-center justify-between gap-3 px-4 pt-5 pb-3">
        <p className="font-display text-xs tracking-[0.15em] text-muted uppercase sm:tracking-[0.3em]">↑ Looking up the hole</p>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-full border border-lavender/50 bg-lavender/15 px-4 py-2 text-sm font-medium text-soft transition hover:bg-lavender/25"
        >
          Keep falling ↓
        </button>

        <div role="tablist" aria-label="Look up" className="relative mx-auto flex w-full max-w-sm rounded-full border border-white/15 bg-midnight-2/70 p-1">
          {PAGES.map((p, i) => {
            const active = p.id === page;
            return (
              <button
                key={p.id}
                ref={(el) => {
                  tabs.current[i] = el;
                }}
                id={`lookup-tab-${p.id}`}
                type="button"
                role="tab"
                aria-selected={active}
                aria-controls={`lookup-page-${p.id}`}
                tabIndex={active ? 0 : -1}
                onClick={() => setPage(p.id)}
                onKeyDown={onTabKey}
                className={clsx(
                  "relative flex-1 rounded-full px-4 py-2 font-display text-sm font-semibold transition",
                  active ? "text-midnight" : "text-muted hover:text-soft",
                )}
              >
                {active ? (
                  <motion.span
                    layoutId="lookup-pill"
                    className="absolute inset-0 rounded-full bg-lavender"
                    transition={{ type: "spring", stiffness: 300, damping: 28 }}
                  />
                ) : null}
                <span className="relative">
                  <span aria-hidden>{p.glyph} </span>
                  {p.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={page}
            id={`lookup-page-${page}`}
            role="tabpanel"
            aria-labelledby={`lookup-tab-${page}`}
            initial={{ opacity: 0, x: page === "path" ? -24 : 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: page === "path" ? -24 : 24 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="mx-auto flex max-w-2xl flex-col items-center px-4 pt-6 pb-12"
          >
            {page === "path" ? <PathPage session={session} onJump={onJump} onClose={onClose} /> : <HabitMirror />}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

/** The way down: root at the top, you at the bottom, the questions you passed beside each step. */
function PathPage({ session, onJump, onClose }: LookUpProps) {
  const path = pathTo(session, session.focusId);
  return (
    <>
      <ol className="flex w-full flex-col items-center">
        {path.map((node, i) => {
          const passed = node.parentId
            ? childrenOf(session, node.parentId)
                .filter((s) => s.id !== node.id && s.answer === undefined)
                .slice(-4)
            : [];
          const current = i === path.length - 1;
          return (
            <motion.li
              key={node.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 + i * 0.06 }}
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
                  "flex max-w-lg items-center gap-2 rounded-3xl border px-4 py-2 text-center transition",
                  current
                    ? "border-lavender/70 bg-lavender/10 shadow-[0_0_30px_-6px_rgb(183_154_255/0.7)]"
                    : "border-white/15 hover:border-white/40",
                )}
              >
                {node.answer !== undefined ? (
                  <>
                    <RabbitIcon className="h-4 w-4 shrink-0 text-lavender" aria-hidden />
                    <span className="flex flex-col text-left">
                      <span className="text-xs text-muted italic">{node.text}</span>
                      <span className="font-serif text-sm text-soft">&ldquo;{node.answer}&rdquo;</span>
                    </span>
                  </>
                ) : (
                  <>
                    <span className={clsx("text-xs", i === 0 ? "text-lavender" : MODE_TEXT[node.mode])}>
                      {i === 0 ? "◯" : MODE_GLYPH[node.mode]}
                    </span>
                    <span className={clsx(i === 0 ? "font-serif text-lg" : "text-sm", "text-soft")}>{node.text}</span>
                  </>
                )}
                {current ? <Footprints className="h-3.5 w-3.5 shrink-0 text-lavender" /> : null}
              </button>
            </motion.li>
          );
        })}
      </ol>
      <p className="mt-10 text-center text-xs text-muted/70">
        Tap any question to fall back into it. The faint ones are the paths you passed.
      </p>
    </>
  );
}
