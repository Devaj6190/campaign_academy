"use client";

import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn, initials } from "@/lib/util";

const ease = [0.22, 1, 0.36, 1] as const;

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "outline" | "ghost"; size?: "sm" | "md" };
export function Button({ variant = "outline", size = "md", className, ...p }: BtnProps) {
  return (
    <button
      {...p}
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md font-medium whitespace-nowrap transition-colors disabled:pointer-events-none disabled:opacity-40",
        size === "sm" ? "h-7 px-2.5 text-[12px]" : "h-8 px-3 text-[13px]",
        variant === "primary" && "bg-fg text-bg hover:bg-white",
        variant === "outline" && "border border-line-strong bg-raised text-fg hover:bg-hover",
        variant === "ghost" && "text-muted hover:bg-hover hover:text-fg",
        className,
      )}
    />
  );
}

export const Label = ({ children, className }: { children: ReactNode; className?: string }) => (
  <span className={cn("text-[10.5px] font-medium tracking-[0.12em] text-faint uppercase", className)}>{children}</span>
);

/** Marks a number or section as coming from real data or from the simulation. */
export const Tag = ({ kind }: { kind: "real" | "sim" }) => (
  <span className={cn("rounded-full border px-1.5 py-px text-[10px] font-medium tracking-wide", kind === "real" ? "border-pos/25 text-pos" : "border-warm/25 text-warm")}>
    {kind === "real" ? "Real data" : "Simulated"}
  </span>
);

export const Meter = ({ value, color = "var(--color-fg)", className }: { value: number; color?: string; className?: string }) => (
  <div className={cn("h-1 overflow-hidden rounded-full bg-white/[0.06]", className)}>
    <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color }} />
  </div>
);

export function Avatar({ name, size = 40, className }: { name?: string; size?: number; className?: string }) {
  return (
    <div
      className={cn("grid shrink-0 place-items-center rounded-full border border-line-strong bg-gradient-to-b from-[#2a2a31] to-[#141417] font-medium text-soft", className)}
      style={{ width: size, height: size, fontSize: size * 0.34 }}
    >
      {name ? initials(name) : ""}
    </div>
  );
}

export const Section = ({ title, right, children }: { title: string; right?: ReactNode; children: ReactNode }) => (
  <section className="border-t border-line px-5 py-4 first:border-t-0">
    <div className="mb-2.5 flex items-center justify-between gap-2">
      <Label>{title}</Label>
      {right}
    </div>
    {children}
  </section>
);

export const Inspector = ({ children }: { children: ReactNode }) => <aside className="w-[300px] shrink-0 overflow-y-auto border-l border-line bg-surface xl:w-[340px]">{children}</aside>;

export const ViewHeader = ({ title, sub, right }: { title: string; sub: string; right?: ReactNode }) => (
  <header className="flex h-16 shrink-0 items-center justify-between gap-4 px-7">
    <div className="min-w-0">
      <h1 className="text-[15px] font-medium tracking-tight">{title}</h1>
      <p className="truncate text-[12.5px] text-muted">{sub}</p>
    </div>
    {right}
  </header>
);

/** Floating action bar at the bottom of a view. Its contents change from screen to screen. */
export const Dock = ({ label, children }: { label?: string; children: ReactNode }) => (
  <div className="pointer-events-none absolute inset-x-0 bottom-5 z-20 flex justify-center px-4">
    <motion.div
      layout
      transition={{ duration: 0.25, ease }}
      className="pointer-events-auto flex max-w-full items-center gap-1 overflow-x-auto rounded-xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden border border-line-strong bg-raised/85 p-1.5 shadow-[0_18px_44px_-14px_rgba(0,0,0,0.9)] backdrop-blur-xl"
    >
      {label && <div className="hidden max-w-[190px] shrink-0 truncate border-r border-line px-3 text-[12px] text-muted @[760px]:block">{label}</div>}
      {children}
    </motion.div>
  </div>
);

export function DockButton({ icon, label, sub, primary, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { icon: ReactNode; label: string; sub?: string; primary?: boolean }) {
  return (
    <button
      {...p}
      className={cn(
        "flex h-10 shrink-0 items-center gap-2.5 rounded-lg px-3 text-left transition-colors [&_svg]:size-4",
        primary ? "bg-fg text-bg hover:bg-white [&_svg]:text-bg" : "text-fg hover:bg-white/[0.07] [&_svg]:text-muted",
      )}
    >
      {icon}
      <span className="leading-tight">
        <span className="block text-[12.5px] font-medium">{label}</span>
        {sub && <span className={cn("hidden font-mono text-[10.5px] @[680px]:block", primary ? "text-bg/60" : "text-faint")}>{sub}</span>}
      </span>
    </button>
  );
}

/** Opens on hover, pins on click, closes on outside click. */
export function Popover({ trigger, children, align = "center", className }: { trigger: (open: boolean) => ReactNode; children: ReactNode; align?: "start" | "center" | "end"; className?: string }) {
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    const off = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) { setOpen(false); setPinned(false); }
    };
    document.addEventListener("mousedown", off);
    return () => document.removeEventListener("mousedown", off);
  }, []);
  return (
    <div
      ref={ref}
      className="relative h-full"
      onMouseEnter={() => { clearTimeout(timer.current); setOpen(true); }}
      onMouseLeave={() => { if (!pinned) timer.current = setTimeout(() => setOpen(false), 140); }}
    >
      <div className="h-full" onClick={() => { setPinned(!pinned); setOpen(!pinned); }}>{trigger(open)}</div>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.16, ease }}
            className={cn(
              "absolute top-full z-50 mt-2 rounded-xl border border-line-strong bg-raised shadow-[0_24px_60px_-12px_rgba(0,0,0,0.9)]",
              align === "center" && "left-1/2 -translate-x-1/2",
              align === "start" && "left-0",
              align === "end" && "right-0",
              className,
            )}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Dialog({ open, onClose, children, side, className }: { open: boolean; onClose: () => void; children: ReactNode; side?: "right"; className?: string }) {
  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className={cn("fixed inset-0 z-[60] flex bg-black/65 backdrop-blur-[3px]", side ? "justify-end" : "items-center justify-center p-6")}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={side ? { x: 40, opacity: 0 } : { y: 10, scale: 0.98, opacity: 0 }}
            animate={{ x: 0, y: 0, scale: 1, opacity: 1 }}
            exit={side ? { x: 40, opacity: 0 } : { y: 10, scale: 0.98, opacity: 0 }}
            transition={{ duration: 0.26, ease }}
            className={cn(
              "relative flex flex-col overflow-hidden border-line-strong bg-surface shadow-[0_40px_100px_-20px_rgba(0,0,0,1)]",
              side ? "h-full w-[480px] border-l" : "max-h-full w-full rounded-2xl border",
              className,
            )}
          >
            <button onClick={onClose} aria-label="Close" className="absolute top-4 right-4 z-10 grid size-7 place-items-center rounded-md text-muted transition-colors hover:bg-hover hover:text-fg">
              <X className="size-4" />
            </button>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
