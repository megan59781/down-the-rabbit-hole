import type { ExplorationMode } from "@/lib/types";

export const MODES: Record<
  ExplorationMode,
  { label: string; tagline: string; text: string; border: string; glow: string; bg: string }
> = {
  deeper: {
    label: "Go Deeper",
    tagline: "Follow the hidden threads beneath your thought.",
    text: "text-ice",
    border: "border-ice/40",
    glow: "shadow-[0_0_50px_-15px_rgb(156_203_255/0.55)]",
    bg: "bg-ice",
  },
  stranger: {
    label: "Go Stranger",
    tagline: "Explore the unexpected, the unusual and the impossible.",
    text: "text-pink",
    border: "border-pink/40",
    glow: "shadow-[0_0_50px_-15px_rgb(229_162_232_/0.55)]",
    bg: "bg-pink",
  },
};
