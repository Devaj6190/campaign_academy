"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/** Lays children out on a fixed logical canvas and scales it to the space available, so nothing can collide at any window size. */
export function Fit({ w, h, max = 1.2, children }: { w: number; h: number; max?: number; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const el = ref.current!;
    const fit = () => setScale(Math.min(el.clientWidth / w, el.clientHeight / h, max));
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    window.addEventListener("resize", fit);
    return () => { ro.disconnect(); window.removeEventListener("resize", fit); };
  }, [w, h, max]);
  return (
    <div ref={ref} className="relative h-full w-full overflow-hidden">
      <div className="absolute top-1/2 left-1/2" style={{ width: w, height: h, transform: `translate(-50%, -50%) scale(${scale})` }}>
        {children}
      </div>
    </div>
  );
}
