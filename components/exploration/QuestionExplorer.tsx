"use client";

import { clsx } from "clsx";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { MODES } from "@/lib/modes";
import type { ExplorationMode, Question } from "@/lib/types";

const TYPE_LABEL: Record<Question["type"], string> = {
  philosophical: "Philosophical",
  personal: "Personal",
  counterfactual: "What if",
  challenging: "Challenge",
  unexpected: "Unexpected",
};

const MAX_QUESTION_LENGTH = 200;

type QuestionExplorerProps = {
  questions: Question[];
  mode: ExplorationMode;
  locked: boolean;
  loading: boolean;
  onUnlock: () => void;
  onFollow: (text: string) => void;
  onMore: () => void;
  onBack: () => void;
};

export function QuestionExplorer({
  questions,
  mode,
  locked,
  loading,
  onUnlock,
  onFollow,
  onMore,
  onBack,
}: QuestionExplorerProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const m = MODES[mode];

  if (locked) {
    return (
      <div className="rounded-3xl border border-dashed border-white/15 p-8 text-center">
        <p className="font-serif text-2xl text-soft">The questions are hiding in the scene.</p>
        <p className="mt-2 text-muted">Interact with the simulation above to uncover them.</p>
        <button
          type="button"
          onClick={onUnlock}
          className="mt-5 text-sm text-muted underline decoration-white/20 underline-offset-4 hover:text-soft"
        >
          Show the questions anyway
        </button>
      </div>
    );
  }

  return (
    <section aria-label="Questions to follow">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className={clsx("text-xs tracking-[0.25em] uppercase", m.text)}>Where next?</p>
          <h2 className="mt-1 font-serif text-3xl text-soft">Pick a question to follow</h2>
        </div>
        {loading ? <p className="text-sm text-muted animate-pulse">New questions surfacing…</p> : null}
      </div>

      <ul className={clsx("mt-6 grid gap-4 sm:grid-cols-2", loading && "opacity-60 transition-opacity")}>
        <AnimatePresence initial={false}>
          {questions.map((q, i) => {
            const editing = editingId === q.id;
            return (
              <motion.li
                key={q.id}
                layout
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: (i % 6) * 0.06 }}
                className={clsx(
                  "group flex flex-col rounded-2xl border border-white/10 bg-midnight-2/80 p-5 transition-colors",
                  mode === "deeper" ? "hover:border-ice/40" : "hover:border-pink/40",
                )}
              >
                <span className="text-[0.7rem] tracking-[0.2em] text-muted/80 uppercase">{TYPE_LABEL[q.type]}</span>
                {editing ? (
                  <form
                    className="mt-2 flex flex-1 flex-col gap-3"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (draft.trim()) onFollow(draft.trim());
                    }}
                  >
                    <label htmlFor={`edit-${q.id}`} className="sr-only">
                      Edit question
                    </label>
                    <textarea
                      id={`edit-${q.id}`}
                      autoFocus
                      rows={3}
                      value={draft}
                      onChange={(e) => setDraft(e.target.value.slice(0, MAX_QUESTION_LENGTH))}
                      className="w-full resize-none rounded-xl border border-white/15 bg-midnight p-3 text-soft focus:border-lavender/60 focus:outline-none"
                    />
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={!draft.trim()}
                        className="rounded-full bg-lavender px-4 py-1.5 text-sm font-semibold text-midnight disabled:opacity-40"
                      >
                        Follow this →
                      </button>
                      <button type="button" onClick={() => setEditingId(null)} className="px-3 text-sm text-muted hover:text-soft">
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <p className="mt-2 flex-1 text-lg leading-snug text-soft">{q.text}</p>
                    <div className="mt-4 flex items-center gap-4">
                      <button
                        type="button"
                        onClick={() => onFollow(q.text)}
                        className={clsx("font-display text-sm font-semibold transition hover:translate-x-1", m.text)}
                      >
                        Follow →
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(q.id);
                          setDraft(q.text);
                        }}
                        className="text-sm text-muted hover:text-soft"
                      >
                        Edit
                      </button>
                    </div>
                  </>
                )}
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onMore}
          disabled={loading}
          className="rounded-full border border-white/15 px-4 py-2 text-sm text-soft transition hover:border-lavender/50 disabled:opacity-50"
        >
          ✦ More questions
        </button>
        <button
          type="button"
          onClick={onBack}
          className="rounded-full border border-white/15 px-4 py-2 text-sm text-soft transition hover:border-lavender/50"
        >
          ← Back to the other worlds
        </button>
      </div>
    </section>
  );
}
