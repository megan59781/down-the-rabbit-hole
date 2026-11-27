"use client";

import { clsx } from "clsx";
import Link from "next/link";
import type { MouseEvent } from "react";
import { Logo } from "@/components/branding/Logo";
import type { ExplorationMode } from "@/lib/types";
import { GravityToggle } from "./GravityToggle";

type FallHeaderProps = {
  mode: ExplorationMode;
  onModeChange: (mode: ExplorationMode) => void;
  soundOn: boolean;
  onToggleSound: () => void;
  onHelp: () => void;
  onLookUp: () => void;
  /** Leaving for the start (logo or New question): FallView plays the climb out first. */
  onLeave: (e: MouseEvent<HTMLAnchorElement>) => void;
};

/** The bar across the top of the fall: logo, direction, help, sound, Look up and New question. */
export function FallHeader({ mode, onModeChange, soundOn, onToggleSound, onHelp, onLookUp, onLeave }: FallHeaderProps) {
  return (
    <header className="relative z-30 flex flex-wrap items-center justify-between gap-2 px-3 py-3 sm:flex-nowrap sm:px-6">
      <Link href="/" onClick={onLeave} aria-label="Back to the start" className="shrink-0">
        <span className="hidden sm:block">
          <Logo />
        </span>
        <span className="sm:hidden">
          <Logo compact />
        </span>
      </Link>
      {/* On phones the three directions get a row of their own under the logo. */}
      <div className="order-last flex w-full justify-center sm:order-none sm:w-auto">
        <div data-tour="toggle">
          <GravityToggle mode={mode} onChange={onModeChange} />
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={onHelp}
          aria-label="How it works"
          className="grid h-9 w-9 place-items-center rounded-full border border-white/20 bg-midnight/70 font-display text-sm font-semibold text-muted backdrop-blur transition hover:text-soft"
        >
          ?
        </button>
        <button
          data-tour="sound"
          type="button"
          onClick={onToggleSound}
          aria-pressed={soundOn}
          aria-label={soundOn ? "Turn sound off" : "Turn sound on"}
          title={soundOn ? "Sound on" : "Sound off"}
          className={clsx(
            "grid h-9 w-9 place-items-center rounded-full border bg-midnight/70 text-sm backdrop-blur transition",
            soundOn ? "border-lavender/60 text-soft" : "border-white/20 text-muted hover:text-soft",
          )}
        >
          <span aria-hidden>{soundOn ? "🔊" : "🔇"}</span>
        </button>
        <button
          type="button"
          data-tour="lookup"
          onClick={onLookUp}
          className="rounded-full border border-lavender/50 bg-lavender/15 px-3.5 py-2 text-sm font-medium text-soft backdrop-blur transition hover:bg-lavender/25"
        >
          ↑ Look up
        </button>
        <Link
          href="/"
          onClick={onLeave}
          aria-label="New question"
          className="rounded-full border border-white/20 bg-midnight/70 px-3.5 py-2 text-sm text-soft backdrop-blur transition hover:border-white/40"
        >
          <span aria-hidden>+ </span>New<span className="hidden sm:inline"> question</span>
        </Link>
      </div>
    </header>
  );
}
