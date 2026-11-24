"use client";

import { useMotionValue, useSpring } from "framer-motion";
import { useEffect, useRef } from "react";

type OrientationEventWithPermission = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<"granted" | "denied">;
};

const clamp = (v: number) => Math.max(-1, Math.min(1, v));

/**
 * Steering for the fall, in -1..1 on each axis. Phones use tilt (calibrated to however
 * you're holding it when the fall starts); desktops follow the mouse, more gently.
 * `steer` feeds the tunnel every frame; `x`/`y` are springy values for parallax on the page.
 */
export function useSteer(enabled: boolean) {
  const steer = useRef({ x: 0, y: 0 });
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const x = useSpring(rawX, { stiffness: 40, damping: 14 });
  const y = useSpring(rawY, { stiffness: 40, damping: 14 });

  useEffect(() => {
    if (!enabled) return;
    const set = (nx: number, ny: number) => {
      steer.current = { x: clamp(nx), y: clamp(ny) };
      rawX.set(steer.current.x);
      rawY.set(steer.current.y);
    };

    const touch = window.matchMedia("(pointer: coarse)").matches;
    if (!touch) {
      // Desktop: the mouse leans the hole a little, never enough to fight reading.
      const onMove = (e: PointerEvent) =>
        set(((e.clientX / window.innerWidth) * 2 - 1) * 0.5, ((e.clientY / window.innerHeight) * 2 - 1) * 0.5);
      window.addEventListener("pointermove", onMove);
      return () => window.removeEventListener("pointermove", onMove);
    }

    // Phones: tilt, relative to the first reading so any comfortable grip is "straight down".
    let base: { beta: number; gamma: number } | null = null;
    const onOrient = (e: DeviceOrientationEvent) => {
      if (e.beta === null || e.gamma === null) return;
      base ??= { beta: e.beta, gamma: e.gamma };
      set((e.gamma - base.gamma) / 25, (e.beta - base.beta) / 25);
    };
    const listen = () => window.addEventListener("deviceorientation", onOrient);

    // Many phones send tilt straight away. iOS only does after permission, which has to be
    // asked from a tap, so ask on the first one too (re-adding the same listener is a no-op).
    listen();
    const Orientation = window.DeviceOrientationEvent as OrientationEventWithPermission | undefined;
    let askOnTap: (() => void) | null = null;
    if (Orientation?.requestPermission) {
      askOnTap = () => {
        Orientation.requestPermission?.()
          .then((state) => state === "granted" && listen())
          .catch(() => {});
      };
      window.addEventListener("pointerdown", askOnTap, { once: true });
    }
    return () => {
      window.removeEventListener("deviceorientation", onOrient);
      if (askOnTap) window.removeEventListener("pointerdown", askOnTap);
    };
  }, [enabled, rawX, rawY]);

  return { steer, x, y };
}
