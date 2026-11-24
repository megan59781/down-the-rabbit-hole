"use client";

import { motion } from "framer-motion";
import { RabbitIcon } from "@/components/branding/RabbitIcon";

export const JUMP_MS = 1300;

/**
 * The plunge from the landing page: the rabbit hops into a portal, your question drops in
 * after it, and the portal opens until it swallows the screen.
 */
export function JumpIn({ question }: { question: string }) {
  return (
    <motion.div
      aria-hidden
      className="fixed inset-0 z-50 grid place-items-center overflow-hidden"
      initial={{ backgroundColor: "rgb(16 14 25 / 0)" }}
      animate={{ backgroundColor: "rgb(16 14 25 / 0.75)" }}
      transition={{ duration: 0.35 }}
    >
      {/* The portal: appears, waits for its passengers, then opens over everything. */}
      <motion.div
        className="absolute h-16 w-64 rounded-[50%] border-2 border-lavender bg-[radial-gradient(closest-side,#04030a,#100e19_70%,rgb(101_68_165/0.5))] shadow-[0_0_40px_rgb(183_154_255/0.7),inset_0_0_20px_rgb(183_154_255/0.5)]"
        initial={{ scale: 0.2, opacity: 0 }}
        animate={{ scale: [0.2, 1, 1, 24], opacity: [0, 1, 1, 1] }}
        transition={{ duration: JUMP_MS / 1000, times: [0, 0.25, 0.55, 1], ease: ["easeOut", "linear", "easeIn"] }}
      />

      <motion.div
        className="absolute text-soft"
        initial={{ y: -160, scale: 1, opacity: 0 }}
        animate={{ y: [-160, -200, 0], scale: [1, 1, 0.4], opacity: [0, 1, 0] }}
        transition={{ duration: 0.6, delay: 0.1, times: [0, 0.45, 1], ease: "easeIn" }}
      >
        <RabbitIcon className="h-14 w-14" />
      </motion.div>

      <motion.p
        className="absolute max-w-[80vw] text-center font-serif text-2xl text-soft sm:text-4xl"
        style={{ textShadow: "0 0 24px rgb(183 154 255 / 0.6)" }}
        initial={{ y: 140, scale: 1, opacity: 0 }}
        animate={{ y: [140, -50, 0], scale: [1, 1, 0.15], opacity: [0, 1, 0] }}
        transition={{ duration: 0.7, delay: 0.3, times: [0, 0.4, 1], ease: "easeIn" }}
      >
        {question}
      </motion.p>
    </motion.div>
  );
}
