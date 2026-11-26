"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useId, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { RabbitIcon } from "@/components/branding/RabbitIcon";

const noopSubscribe = () => () => {};

const POINTS: { icon: ReactNode; text: ReactNode }[] = [
  { icon: "?", text: "Ask anything. You won't get an answer." },
  { icon: "↓", text: "Questions rise out of it instead. Tap one to fall in. They never run out." },
  {
    icon: "✦",
    text: (
      <>
        Pick a direction: <span className="text-ice">Deeper</span>, <span className="text-pink">Stranger</span>, or{" "}
        <span className="text-lavender">Astray</span>, which steers you away from your habits.
      </>
    ),
  },
  { icon: <RabbitIcon className="h-4 w-4" />, text: "Catch the rabbit and it asks you something only you can answer." },
];

/** The ? on the landing page: the idea in four lines, and where to find the tour once you're falling. */
export function HowItWorks() {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const titleId = useId();
  // The dialog renders at the top of the page, outside the header's layer, so nothing can cover it.
  const mounted = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );

  useEffect(() => {
    if (!open) return;
    dialog.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      trigger.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Closing hands focus back to the ? so keyboard users carry on where they were.
  const close = () => {
    setOpen(false);
    trigger.current?.focus();
  };

  return (
    <>
      <button
        ref={trigger}
        type="button"
        onClick={() => setOpen(true)}
        aria-label="How it works"
        aria-haspopup="dialog"
        className="grid h-9 w-9 place-items-center rounded-full border border-white/20 bg-midnight/70 font-display text-sm font-semibold text-muted backdrop-blur transition hover:border-lavender/60 hover:text-soft"
      >
        ?
      </button>

      {mounted
        ? createPortal(
            <AnimatePresence>
              {open ? (
                <motion.div
                  className="fixed inset-0 z-50 grid place-items-center bg-midnight/75 px-4 backdrop-blur-sm"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={(e) => e.target === e.currentTarget && close()}
                >
                  <motion.div
                    ref={dialog}
                    tabIndex={-1}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby={titleId}
                    className="w-full max-w-md rounded-3xl border border-white/15 bg-midnight-2/95 p-6 text-left shadow-[0_0_60px_-15px_rgb(183_154_255/0.6)] focus:outline-none sm:p-7"
                    initial={{ scale: 0.92, y: 16 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 260, damping: 24 }}
                  >
                    <div className="flex items-center gap-3">
                      <RabbitIcon portal className="h-10 w-10 shrink-0 text-soft" />
                      <div>
                        <h2 id={titleId} className="font-serif text-2xl text-soft">
                          A place for questions
                        </h2>
                        <p className="text-sm text-muted">Not answers.</p>
                      </div>
                    </div>

                    <ol className="mt-6 flex flex-col gap-4">
                      {POINTS.map((p, i) => (
                        <motion.li
                          key={i}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.1 + i * 0.07 }}
                          className="flex items-start gap-3 text-sm text-soft"
                        >
                          <span
                            aria-hidden
                            className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-lavender/40 bg-lavender/10 font-display text-xs text-lavender"
                          >
                            {p.icon}
                          </span>
                          <span className="pt-1">{p.text}</span>
                        </motion.li>
                      ))}
                    </ol>

                    {/* One line of text with the ? sitting in it, so it wraps naturally on small screens. */}
                    <p className="mt-6 rounded-2xl border border-white/10 bg-midnight/60 px-4 py-3 text-sm leading-7 text-muted">
                      Once you&rsquo;re falling, tap{" "}
                      <span
                        aria-hidden
                        className="mx-0.5 inline-grid h-6 w-6 place-items-center rounded-full border border-white/25 align-middle font-display text-xs font-semibold text-soft"
                      >
                        ?
                      </span>
                      <span className="sr-only">the ? button</span> for a quick tour.
                    </p>

                    <div className="mt-5 flex justify-end">
                      <button
                        type="button"
                        onClick={close}
                        className="rounded-full bg-lavender px-5 py-2.5 font-display text-sm font-semibold text-midnight transition hover:bg-soft"
                      >
                        Got it
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}
    </>
  );
}
