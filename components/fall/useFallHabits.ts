"use client";

import { useMemo, useSyncExternalStore } from "react";
import { getHabits, getServerHabits, habitTerritories, narrowness, styleHabits, subscribeHabits } from "@/lib/astray/habits";
import { territoryAngle, type Territory } from "@/lib/astray/territories";

/** "You keep choosing playful, small questions about language and art. Not this time." */
export function habitLineFor(styles: string[], territories: string[]): string | null {
  if (!styles.length && !territories.length) return null;
  const kind = styles.length ? `${styles.join(", ")} ` : "";
  const about = territories.length ? ` about ${territories.join(" and ")}` : "";
  return `You keep choosing ${kind}questions${about}. Not this time.`;
}

/**
 * What the rabbit has learnt about you (this browser only), shaped for the fall: the line it says
 * in Astray, and where the tunnel's walls should dent (towards your strongest habit).
 */
export function useFallHabits(focusTerritory: Territory | undefined) {
  const habits = useSyncExternalStore(subscribeHabits, getHabits, getServerHabits);
  const habitLine = habitLineFor(styleHabits(habits).slice(0, 2), habitTerritories(habits, 2));
  const push = useMemo(() => {
    const top = habitTerritories(habits, 1)[0] ?? focusTerritory;
    return { angle: top ? territoryAngle(top) : -Math.PI / 2, strength: narrowness(habits) };
  }, [habits, focusTerritory]);
  return { habitLine, push };
}
