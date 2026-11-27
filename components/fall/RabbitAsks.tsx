"use client";

import { clsx } from "clsx";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from "react";
import { RabbitIcon } from "@/components/branding/RabbitIcon";
import { streamRabbit } from "@/lib/explore/client";
import { MAX_ANSWER_LENGTH } from "@/lib/schemas";

type Candidate = { text: string; known?: boolean; attempt?: string };

/** Let people watch the self-test land before the rabbit turns to them. */
const ASK_DELAY_MS = 1400;

/**
 * You caught the rabbit. First it checks it doesn't already know the answer (you can watch it
 * strike out the ones it does), then it asks you the one only you can answer.
 */
export function RabbitAsks({
  holding,
  onAnswer,
  onClose,
}: {
  holding: string;
  onAnswer: (asked: string, said: string) => void;
  onClose: () => void;
}) {
  const titleId = useId();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [chosen, setChosen] = useState<number | null>(null);
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [said, setSaid] = useState("");
  const input = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let live = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const abort = new AbortController();
    streamRabbit(holding, abort.signal, (event) => {
      if (!live) return;
      if (event.type === "candidate") {
        setCandidates((c) => {
          const next = [...c];
          next[event.index] = { text: event.text };
          return next;
        });
      } else if (event.type === "verdict") {
        setCandidates((c) => {
          const next = [...c];
          if (next[event.index]) next[event.index] = { ...next[event.index], known: event.known, attempt: event.attempt };
          return next;
        });
      } else if (event.type === "ask") {
        setChosen(event.index);
        timer = setTimeout(() => live && setAsking(true), ASK_DELAY_MS);
      }
    }).catch((e: unknown) => {
      if (live) setError(e instanceof Error ? e.message : "The rabbit lost its question.");
    });
    return () => {
      live = false;
      // Closing the card stops the rabbit's AI calls too, rather than letting them run unseen.
      abort.abort();
      if (timer) clearTimeout(timer);
    };
  }, [holding]);

  // Focus the answer box as it appears (it mounts only after the self-test has animated out).
  const attachInput = useCallback((el: HTMLTextAreaElement | null) => {
    input.current = el;
    el?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const question = chosen !== null ? candidates[chosen]?.text : undefined;
  const knewCount = candidates.filter((c) => c?.known).length;

  function submit(e: FormEvent) {
    e.preventDefault();
    const text = said.trim();
    if (question && text) onAnswer(question, text);
  }

  return (
    <motion.div
      className="fixed inset-0 z-40 grid place-items-center bg-midnight/70 px-4 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-md rounded-3xl border border-white/15 bg-midnight-2/95 p-5 shadow-[0_0_60px_-15px_rgb(183_154_255/0.6)] sm:p-7"
        initial={{ scale: 0.85, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 24 }}
      >
        <div className="flex items-center gap-3">
          <motion.span
            initial={{ y: -30, rotate: -20 }}
            animate={{ y: [-30, 4, 0], rotate: [-20, 6, 0] }}
            transition={{ duration: 0.6 }}
            className="text-soft"
          >
            <RabbitIcon portal className="h-12 w-12" />
          </motion.span>
          <div>
            <p id={titleId} className="font-display text-sm font-semibold text-soft">
              You caught the rabbit.
            </p>
            <p className="text-xs text-muted">
              {asking ? "It has a question only you can answer." : "It's checking it doesn't already know the answer…"}
            </p>
          </div>
        </div>

        {error ? (
          <div className="mt-6">
            <p role="alert" className="text-sm text-pink">
              {error}
            </p>
            <button type="button" onClick={onClose} className="mt-4 rounded-full border border-white/20 px-4 py-2 text-sm text-soft">
              Keep falling ↓
            </button>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {!asking ? (
              <motion.ul
                key="testing"
                exit={{ opacity: 0, y: -8 }}
                className="mt-6 flex min-h-32 flex-col gap-3"
                aria-live="polite"
                aria-label="The rabbit testing itself"
              >
                {candidates.map((c, i) =>
                  c ? (
                    <motion.li
                      key={c.text}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={clsx("text-sm", i === chosen ? "text-soft" : "text-muted")}
                    >
                      <span className={clsx(c.known && "line-through decoration-lavender/70")}>{c.text}</span>
                      {c.known !== undefined ? (
                        <motion.span
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className={clsx("mt-0.5 block text-xs italic", c.known ? "text-muted/70" : "text-lavender")}
                        >
                          {c.known
                            ? `I know this one: ${c.attempt || "easy"}`
                            : c.attempt
                              ? `My guess: ${c.attempt} Only you know.`
                              : "I'd only be guessing. Only you know this one."}
                        </motion.span>
                      ) : (
                        <span className="mt-0.5 block animate-pulse text-xs text-muted/60 italic">Can I answer this myself?</span>
                      )}
                    </motion.li>
                  ) : null,
                )}
                {candidates.length === 0 ? <li className="animate-pulse text-sm text-muted italic">Thinking of something…</li> : null}
              </motion.ul>
            ) : (
              <motion.form key="asking" onSubmit={submit} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-6">
                <label htmlFor={`${titleId}-answer`} className="block font-serif text-2xl leading-snug text-soft">
                  {question}
                </label>
                {knewCount > 0 ? (
                  <p className="mt-2 text-xs text-muted">
                    It asked itself {candidates.length} and could answer {knewCount}. Not this one.
                  </p>
                ) : null}
                <textarea
                  id={`${titleId}-answer`}
                  ref={attachInput}
                  value={said}
                  onChange={(e) => setSaid(e.target.value.slice(0, MAX_ANSWER_LENGTH))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) submit(e);
                  }}
                  rows={2}
                  placeholder="Just a sentence…"
                  className="mt-4 w-full resize-none rounded-2xl border border-white/15 bg-midnight/70 px-4 py-3 text-soft placeholder:text-muted/60 focus:border-lavender/60 focus:outline-none"
                />
                <p className="mt-1 text-xs text-muted/70">
                  It won&rsquo;t reply. Your answer only becomes more questions. Kept in this browser.
                </p>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                  <button type="button" onClick={onClose} className="rounded-full px-3 py-2 text-sm text-muted hover:text-soft">
                    Not this one
                  </button>
                  <button
                    type="submit"
                    disabled={!said.trim()}
                    className="rounded-full bg-lavender px-5 py-2.5 font-display text-sm font-semibold text-midnight transition hover:bg-soft disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Fall into your answer ↓
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        )}
      </motion.div>
    </motion.div>
  );
}
