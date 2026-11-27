"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ExplorationMode } from "@/lib/types";
import { FallAudio } from "./fallAudio";

const PREF_KEY = "rabbit-hole:sound";

function readPref(): boolean {
  try {
    return window.localStorage.getItem(PREF_KEY) === "on";
  } catch {
    return false;
  }
}

function writePref(on: boolean) {
  try {
    window.localStorage.setItem(PREF_KEY, on ? "on" : "off");
  } catch {
    // Not remembering is fine.
  }
}

/**
 * Sound for the fall. Off by default; once switched on it's remembered, and resumes on the
 * next click or key press (browsers only allow audio to start from a user gesture).
 */
export function useFallAudio(mode: ExplorationMode) {
  const audio = useRef<FallAudio | null>(null);
  const modeRef = useRef(mode);
  const [soundOn, setSoundOn] = useState(readPref);

  const startAudio = useCallback(async () => {
    audio.current ??= FallAudio.create();
    await audio.current?.start(modeRef.current);
  }, []);

  useEffect(() => {
    modeRef.current = mode;
    audio.current?.setMode(mode);
  }, [mode]);

  // Remembered "on": wait for the first gesture, then begin.
  useEffect(() => {
    if (!soundOn || audio.current) return;
    const begin = () => void startAudio();
    window.addEventListener("pointerdown", begin, { once: true });
    window.addEventListener("keydown", begin, { once: true });
    return () => {
      window.removeEventListener("pointerdown", begin);
      window.removeEventListener("keydown", begin);
    };
  }, [soundOn, startAudio]);

  // Close the audio when the page goes away, and forget it: Next keeps visited pages alive and
  // re-shows them, and a closed AudioContext can't be resumed, so the next gesture makes a new one.
  useEffect(
    () => () => {
      audio.current?.dispose();
      audio.current = null;
    },
    [],
  );

  const toggleSound = useCallback(() => {
    const next = !soundOn;
    setSoundOn(next);
    writePref(next);
    if (next) void startAudio();
    else void audio.current?.stop();
  }, [soundOn, startAudio]);

  const live = () => (soundOn ? audio.current : null);
  return {
    soundOn,
    toggleSound,
    setSpeed: (speed: number) => live()?.setSpeed(speed),
    chime: (m: ExplorationMode) => live()?.chime(m),
    whoosh: () => live()?.whoosh(),
    sparkle: (count?: number) => live()?.sparkle(count),
  };
}
