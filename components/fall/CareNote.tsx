"use client";

import { motion } from "framer-motion";
import { useState } from "react";

/**
 * Shown when a question in this fall sounds like real distress. Calm, not alarming: the
 * fall carries on (gently), but help is one tap away. Can be tucked away, never lost.
 */
export function CareNote() {
  const [open, setOpen] = useState(true);

  if (!open) {
    return (
      <motion.button
        type="button"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={() => setOpen(true)}
        className="fixed top-16 right-3 z-30 rounded-full sm:top-auto sm:bottom-5 border border-ice/40 bg-midnight/80 px-3 py-1.5 text-xs text-soft backdrop-blur sm:right-6"
      >
        Need someone to talk to?
      </motion.button>
    );
  }

  return (
    <motion.aside
      role="note"
      aria-label="Support"
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6, delay: 0.8 }}
      className="fixed inset-x-3 top-16 z-30 mx-auto max-w-md rounded-2xl sm:top-auto sm:bottom-16 border border-ice/30 bg-midnight/90 p-4 text-sm text-soft shadow-[0_0_40px_-10px_rgb(156_203_255/0.5)] backdrop-blur"
    >
      <p className="font-display font-semibold">You don&rsquo;t have to fall alone.</p>
      <p className="mt-1 text-muted">
        If things feel heavy right now, talking to someone can help. In the UK, Samaritans are there day and night:
        call <a className="text-ice underline underline-offset-2" href="tel:116123">116 123</a>, free.
        Elsewhere,{" "}
        <a
          className="text-ice underline underline-offset-2"
          href="https://findahelpline.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          find a helpline near you
        </a>
        .
      </p>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="mt-3 rounded-full border border-white/15 px-3 py-1 text-xs text-muted hover:text-soft"
      >
        Keep falling, gently
      </button>
    </motion.aside>
  );
}
