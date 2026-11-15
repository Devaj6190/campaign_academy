"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useCase } from "@/lib/cases/store";
import { cn } from "@/lib/util";

// Makes a number's change visible: when `value` moves, the number pulses and a chip with the difference floats beside
// it for a moment ("−$18,000", "+0.2"). Changes close together add up into one chip. Quiet on the first render, when
// the case restarts and when a saved campaign loads ("campaign:loaded"), so loading a screen never flashes everything.

/** How long a chip stays, and how long after a change another one adds to it rather than starting a new chip. */
const SHOW_MS = 2600;

/** True for a moment after the case restarts: a restart is not a change to show. */
let resetAt = 0;
useCase.subscribe((s, p) => { if (s.at < p.at || s.date < p.date) resetAt = Date.now(); });
// A saved campaign loaded, or a reset: the numbers jump from where the page started, which is not a change to show.
if (typeof window !== "undefined") window.addEventListener("campaign:loaded", () => { resetAt = Date.now(); });

export function useChange(value: number, epsilon = 0) {
  const last = useRef<number | null>(null);
  const [delta, setDelta] = useState(0);
  const [key, setKey] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    const before = last.current;
    last.current = value;
    if (before === null || Date.now() - resetAt < 800) return;
    const d = value - before;
    if (Math.abs(d) <= epsilon) return;
    // Within the window, a further change adds to the chip already showing.
    setDelta((x) => (timer.current ? x + d : d));
    setKey((k) => k + 1);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => { timer.current = undefined; setDelta(0); }, SHOW_MS);
  }, [value, epsilon]);
  useEffect(() => () => clearTimeout(timer.current), []);
  return { delta, key };
}

/**
 * Wraps a number on screen. `format` writes the difference ("−$18,000"); `good` says which direction is good news
 * (for spending, up is not). `place` puts the chip above, below or beside the number.
 */
export function Changed({ value, format, good = "up", epsilon = 0, place = "below", className, children }: { value: number; format: (d: number) => string; good?: "up" | "down"; epsilon?: number; place?: "above" | "below" | "right"; className?: string; children: ReactNode }) {
  const { delta, key } = useChange(value, epsilon);
  const shown = Math.abs(delta) > epsilon;
  const positive = good === "up" ? delta > 0 : delta < 0;
  return (
    <span className={cn("relative inline-flex", className)}>
      <motion.span key={`n${key}`} initial={key ? { scale: 1.12 } : false} animate={{ scale: 1 }} transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }} className={cn("inline-flex", shown && (positive ? "text-pos" : "text-neg"), "transition-colors duration-700")}>
        {children}
      </motion.span>
      <AnimatePresence>
        {shown && (
          <motion.span
            key={`d${key}`}
            initial={{ opacity: 0, y: place === "above" ? 4 : -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: place === "above" ? -6 : 6 }}
            transition={{ duration: 0.25 }}
            className={cn(
              "tnum pointer-events-none absolute z-10 rounded px-1.5 py-px font-mono text-[10.5px] leading-[16px] whitespace-nowrap shadow-[0_6px_18px_-6px_rgba(0,0,0,0.9)]",
              positive ? "bg-pos/15 text-pos" : "bg-neg/15 text-neg",
              place === "below" && "top-full left-1/2 mt-1 -translate-x-1/2",
              place === "above" && "bottom-full left-1/2 mb-1 -translate-x-1/2",
              place === "right" && "top-1/2 left-full ml-1.5 -translate-y-1/2",
            )}
          >
            {format(delta)}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}

/** "+$18,000" / "−$18,000". */
export const usdDelta = (d: number) => `${d >= 0 ? "+" : "−"}$${Math.round(Math.abs(d)).toLocaleString("en-US")}`;
/** "+0.2" / "−1.5". */
export const pointsDelta = (d: number) => `${d >= 0 ? "+" : "−"}${Math.abs(d).toFixed(Math.abs(d) < 10 ? 1 : 0)}`;
