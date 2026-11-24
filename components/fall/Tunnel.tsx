"use client";

import { useEffect, useRef } from "react";
import type { ExplorationMode } from "@/lib/types";

type TunnelProps = {
  mode: ExplorationMode;
  /** Increment to lurch forward (falling into a question). */
  burst: number;
  /** Hover in place (e.g. while looking up). */
  paused: boolean;
  /** Called every frame with the current falling speed (drives the wind sound). */
  onSpeed?: (speed: number) => void;
};

const ICE = [156, 203, 255];
const PINK = [229, 162, 232];
const LAVENDER = [183, 154, 255];
const RINGS = 30;
const PARTICLES = 160;
const NEAR = 0.3;
const FAR = 14;

const mix = (a: number[], b: number[], t: number) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * The rabbit hole: rings rush towards you out of a dark vanishing point. Deeper falls straight
 * down a cold, round tunnel; Stranger twists it into a drifting pink spiral. Scrolling or
 * swiping changes how fast you fall.
 */
export function Tunnel({ mode, burst, paused, onSpeed }: TunnelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const live = useRef({ modeTarget: mode === "stranger" ? 1 : 0, boost: 0, paused, onSpeed });

  useEffect(() => {
    live.current.modeTarget = mode === "stranger" ? 1 : 0;
  }, [mode]);
  useEffect(() => {
    if (burst > 0) live.current.boost = 7;
  }, [burst]);
  useEffect(() => {
    live.current.paused = paused;
  }, [paused]);
  useEffect(() => {
    live.current.onSpeed = onSpeed;
  }, [onSpeed]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let w = 0;
    let h = 0;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    const rings = Array.from({ length: RINGS }, (_, i) => ({ z: NEAR + (i / RINGS) * (FAR - NEAR), alt: i % 3 === 0 }));
    const particles = Array.from({ length: PARTICLES }, () => ({
      a: Math.random() * Math.PI * 2,
      r: 0.55 + Math.random() * 0.9,
      z: NEAR + Math.random() * (FAR - NEAR),
    }));

    // Scroll / swipe: down speeds the fall, up slows it towards a hover.
    let scroll = 0;
    let touchY: number | null = null;
    const onWheel = (e: WheelEvent) => {
      scroll = clamp(scroll + e.deltaY * 0.004, -0.95, 7);
    };
    const onTouchStart = (e: TouchEvent) => {
      touchY = e.touches[0]?.clientY ?? null;
    };
    const onTouchMove = (e: TouchEvent) => {
      const y = e.touches[0]?.clientY;
      if (touchY === null || y === undefined) return;
      scroll = clamp(scroll + (touchY - y) * 0.02, -0.95, 7);
      touchY = y;
    };
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });

    let m = live.current.modeTarget;
    let speed = 1;
    let spin = 0;
    let t = 0;
    let last = performance.now();
    let raf = 0;

    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const s = live.current;
      t += dt;
      m += (s.modeTarget - m) * Math.min(1, dt * 2);
      s.boost *= Math.pow(0.12, dt);
      scroll *= Math.pow(0.35, dt);
      const target = s.paused ? 0.04 : reduce ? 0.12 : 1 + s.boost + scroll;
      speed += (target - speed) * Math.min(1, dt * 3);
      s.onSpeed?.(speed);
      spin += dt * (0.05 + m * 0.35) * Math.max(speed, 0.2);

      // Stranger tips gravity sideways: the vanishing point drifts and the whole hole rotates.
      const vx = w / 2 + m * w * 0.09 * Math.sin(t * 0.35);
      const vy = h * 0.48 + m * h * 0.07 * Math.cos(t * 0.27);
      const scale = Math.max(w, h) * 0.5;
      const colour = mix(ICE, PINK, m);
      const accent = mix(LAVENDER, ICE, 1 - m);

      ctx.clearRect(0, 0, w, h);

      // The dark heart of the hole.
      const hole = ctx.createRadialGradient(vx, vy, 0, vx, vy, scale * 0.9);
      hole.addColorStop(0, "rgba(4, 3, 10, 0.95)");
      hole.addColorStop(0.35, `rgba(${mix([101, 68, 165], colour, 0.3).join(",")}, 0.10)`);
      hole.addColorStop(1, "rgba(16, 14, 25, 0)");
      ctx.fillStyle = hole;
      ctx.fillRect(0, 0, w, h);

      const advance = dt * speed * 2.4;
      for (const ring of rings) {
        ring.z -= advance;
        if (ring.z < NEAR) ring.z += FAR - NEAR;
      }
      rings.sort((a, b) => b.z - a.z);

      // Each ring's centre is offset along a twisting path; in Deeper the path is straight.
      const centreAt = (z: number) => {
        const off = m * z * 16;
        return [vx + Math.cos(z * 0.55 + t * 0.9) * off, vy + Math.sin(z * 0.55 + t * 0.9) * off];
      };

      for (const ring of rings) {
        const r = scale / ring.z;
        const [cx, cy] = centreAt(ring.z);
        const fadeFar = clamp(1 - ring.z / FAR, 0, 1);
        const fadeNear = clamp((ring.z - NEAR) / 0.8, 0, 1);
        const alpha = fadeFar * fadeNear * (ring.alt ? 0.7 : 0.4);
        const c = ring.alt ? accent : colour;
        ctx.beginPath();
        ctx.ellipse(cx, cy, r, r * (1 - 0.28 * m), spin + ring.z * 0.4 * m, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${c.join(",")}, ${alpha})`;
        ctx.lineWidth = clamp(2.4 / ring.z, 0.4, 3.5);
        ctx.stroke();
      }

      // Particle streaks rushing past; longer when you fall faster.
      const streak = clamp(0.08 + speed * 0.08, 0.06, 1.2);
      ctx.lineCap = "round";
      for (const p of particles) {
        p.z -= advance * 1.35;
        if (p.z < NEAR) {
          p.z += FAR - NEAR;
          p.a = Math.random() * Math.PI * 2;
        }
        const angle = p.a + spin * (0.6 + m);
        const [cx1, cy1] = centreAt(p.z);
        const [cx2, cy2] = centreAt(p.z + streak);
        const x1 = cx1 + Math.cos(angle) * (p.r * scale) / p.z;
        const y1 = cy1 + Math.sin(angle) * (p.r * scale) / p.z;
        const x2 = cx2 + Math.cos(angle) * (p.r * scale) / (p.z + streak);
        const y2 = cy2 + Math.sin(angle) * (p.r * scale) / (p.z + streak);
        const alpha = clamp(1 - p.z / FAR, 0, 1) * 0.8;
        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(x1, y1);
        ctx.strokeStyle = `rgba(242, 239, 248, ${alpha})`;
        ctx.lineWidth = clamp(1.6 / p.z, 0.3, 2.2);
        ctx.stroke();
      }

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden className="absolute inset-0 h-full w-full" />;
}
