"use client";

import { useEffect, useState, type FormEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { EXAMPLE_PROMPTS, pickPrompts } from "@/lib/content/examplePrompts";

export const MAX_THOUGHT_LENGTH = 280;

const VISIBLE_EXAMPLES = 4;
const ROTATE_MS = 7000;
// Deterministic first render (avoids hydration mismatch); randomised right after mount.
const INITIAL_EXAMPLES = EXAMPLE_PROMPTS.slice(0, VISIBLE_EXAMPLES);

type ThoughtInputProps = {
  onSubmit?: (thought: string) => void;
};

export function ThoughtInput({ onSubmit }: ThoughtInputProps) {
  const [thought, setThought] = useState("");
  const [examples, setExamples] = useState<string[]>([...INITIAL_EXAMPLES]);
  const [paused, setPaused] = useState(false);
  const reduceMotion = useReducedMotion();
  const trimmed = thought.trim();

  function shuffle() {
    setExamples((current) => pickPrompts(VISIBLE_EXAMPLES, current));
  }

  useEffect(() => {
    const first = setTimeout(shuffle, 0);
    return () => clearTimeout(first);
  }, []);

  useEffect(() => {
    // Auto-rotation is motion; skip it for reduced-motion users (they still have the shuffle button).
    if (paused || reduceMotion) return;
    const timer = setInterval(shuffle, ROTATE_MS);
    return () => clearInterval(timer);
  }, [paused, reduceMotion]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!trimmed) return;
    onSubmit?.(trimmed);
  }

  return (
    <div className="w-full max-w-xl">
      <form
        onSubmit={handleSubmit}
        className="group relative rounded-3xl border border-white/10 bg-midnight-2/70 p-2 shadow-[0_0_60px_-20px_rgb(101_68_165/0.6)] backdrop-blur transition focus-within:border-lavender/50"
      >
        <label htmlFor="thought" className="sr-only">
          Your question
        </label>
        <textarea
          id="thought"
          value={thought}
          onChange={(e) => setThought(e.target.value.slice(0, MAX_THOUGHT_LENGTH))}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) handleSubmit(e);
          }}
          rows={2}
          placeholder="Why do I always feel behind?"
          className="w-full resize-none bg-transparent px-4 pt-3 text-lg text-soft placeholder:text-muted/60 focus:outline-none"
        />
        <div className="flex items-center justify-between gap-3 px-2 pb-1">
          <span className="text-xs tabular-nums text-muted/60" aria-live="polite">
            {thought.length}/{MAX_THOUGHT_LENGTH}
          </span>
          <button
            type="submit"
            disabled={!trimmed}
            className="rounded-full bg-lavender px-5 py-2.5 font-display text-sm font-semibold text-midnight transition hover:bg-soft disabled:cursor-not-allowed disabled:opacity-40"
          >
            Follow the rabbit →
          </button>
        </div>
      </form>

      <div
        className="mt-5 flex min-h-[5.5rem] flex-col items-center gap-3"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
      >
        <ul className="flex flex-wrap justify-center gap-2" aria-label="Example thoughts">
          <AnimatePresence mode="popLayout" initial={false}>
            {examples.map((example, i) => (
              <motion.li
                key={example}
                layout={!reduceMotion}
                initial={{ opacity: 0, y: 6, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -6, filter: "blur(4px)" }}
                transition={{ duration: reduceMotion ? 0 : 0.5, delay: reduceMotion ? 0 : i * 0.08 }}
              >
                <button
                  type="button"
                  onClick={() => setThought(example)}
                  className="rounded-full border border-white/10 px-3 py-1.5 text-sm text-muted transition hover:border-lavender/40 hover:text-soft"
                >
                  {example}
                </button>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
        <button
          type="button"
          onClick={shuffle}
          className="font-display text-xs tracking-[0.2em] text-muted/70 uppercase transition hover:text-lavender"
        >
          ↻ Other thoughts
        </button>
      </div>
    </div>
  );
}
