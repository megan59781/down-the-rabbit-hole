"use client";

import { motion } from "framer-motion";
import { RabbitIcon } from "@/components/branding/RabbitIcon";

export const CLIMB_MS = 1500;

// Fixed so it looks the same every time: the night sky you climb out into.
const STARS = [
  [12, 14], [26, 30], [40, 9], [58, 20], [71, 12], [84, 27], [92, 8],
  [8, 44], [20, 60], [80, 56], [93, 40], [66, 36], [33, 42],
] as const;

/**
 * The reverse of jumping in: the tunnel runs backwards (FallView reverses it), you break the
 * surface into the night, the hole shrinks away beneath you, and the rabbit hops out after you.
 */
export function ClimbOut() {
  const d = CLIMB_MS / 1000;
  return (
    <motion.div
      aria-hidden
      className="fixed inset-0 z-50 overflow-hidden"
      initial={{ backgroundColor: "rgb(16 14 25 / 0)" }}
      animate={{ backgroundColor: ["rgb(16 14 25 / 0)", "rgb(16 14 25 / 0)", "rgb(16 14 25 / 1)", "rgb(16 14 25 / 1)"] }}
      transition={{ duration: d, times: [0, 0.3, 0.62, 1], ease: "easeInOut" }}
    >
      {/* The night sky, once you're out. */}
      {STARS.map(([x, y], i) => (
        <motion.span
          key={i}
          className="absolute h-0.5 w-0.5 rounded-full bg-soft"
          style={{ left: `${x}%`, top: `${y}%` }}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0, 0.9] }}
          transition={{ duration: d, times: [0, 0.6, 1] }}
        />
      ))}

      {/* The rim of the hole: all around you at first, then shrinking to a ring far below. */}
      <motion.div
        className="absolute top-1/2 left-1/2 h-16 w-64 -translate-x-1/2 -translate-y-1/2 rounded-[50%] border-2 border-lavender bg-[radial-gradient(closest-side,#04030a,#100e19_70%,rgb(101_68_165/0.5))] shadow-[0_0_40px_rgb(183_154_255/0.7),inset_0_0_20px_rgb(183_154_255/0.5)]"
        initial={{ scale: 14, opacity: 0, y: 0 }}
        animate={{ scale: [14, 14, 1, 0.8], opacity: [0, 0.9, 1, 1], y: ["0vh", "0vh", "18vh", "20vh"] }}
        transition={{ duration: d, times: [0, 0.25, 0.75, 1], ease: ["linear", "easeOut", "easeOut"] }}
      />

      {/* And the rabbit hops out after you. */}
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-soft"
        initial={{ opacity: 0, y: "18vh", scale: 0.5 }}
        animate={{ opacity: [0, 0, 1, 1], y: ["18vh", "18vh", "-6vh", "2vh"], scale: [0.5, 0.5, 1.1, 1] }}
        transition={{ duration: d, times: [0, 0.6, 0.85, 1], ease: "easeOut" }}
      >
        <RabbitIcon className="h-14 w-14 drop-shadow-[0_0_12px_rgb(183_154_255/0.8)]" />
      </motion.div>
    </motion.div>
  );
}
