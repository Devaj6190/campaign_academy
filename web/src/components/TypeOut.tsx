"use client";

import { useEffect, useState } from "react";

// Text that types out word by word the first time it appears, so a staff answer reads as if it is being written.
// Used in a few important places only. Anything seen before, a click, or a reduced-motion setting shows it at once.
// The answer has already arrived when this runs: it is a presentation effect, not the model streaming.

/** Keys already typed out in this session: going back to them never replays the effect. */
const typed = new Set<string>();
const WORD_MS = 38;

export function TypeOut({ id, text, className }: { id: string; text: string; className?: string }) {
  const words = text.split(/(\s+)/);
  const [n, setN] = useState(() => {
    const still = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    return typed.has(id) || still ? words.length : 0;
  });
  useEffect(() => {
    typed.add(id);
    if (n >= words.length) return;
    const t = setInterval(() => setN((k) => { const next = Math.min(words.length, k + 2); if (next >= words.length) clearInterval(t); return next; }), WORD_MS);
    return () => clearInterval(t);
    // Starts once per text; `n` is read only to skip finished ones.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, text]);
  const done = n >= words.length;
  return (
    <span className={className} onClick={done ? undefined : () => setN(words.length)} title={done ? undefined : "Click to show it all"}>
      {words.slice(0, n).join("")}
      {!done && <span className="ml-0.5 inline-block h-[1em] w-[2px] translate-y-[2px] animate-pulse bg-current opacity-60" aria-hidden />}
      {/* Screen readers get the whole text at once. */}
      {!done && <span className="sr-only">{text}</span>}
    </span>
  );
}
