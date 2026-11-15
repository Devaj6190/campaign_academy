"use client";

import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn, initials } from "@/lib/util";

const ease = [0.22, 1, 0.36, 1] as const;

// Gold is spent on one thing per screen: the primary action. Everything else is neutral.
type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "outline" | "ghost"; size?: "sm" | "md" };
export function Button({ variant = "outline", size = "md", className, ...p }: BtnProps) {
  return (
    <button
      {...p}
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md font-medium whitespace-nowrap transition-colors disabled:pointer-events-none disabled:opacity-40",
        size === "sm" ? "h-7 px-2.5 text-[12.5px]" : "h-9 px-3.5 text-[13.5px]",
        variant === "primary" && "bg-gold text-[#1a1408] hover:bg-gold-bright",
        variant === "outline" && "border border-line-strong text-fg hover:bg-hover",
        variant === "ghost" && "text-muted hover:bg-hover hover:text-fg",
        className,
      )}
    />
  );
}

/** A field or group label. Sentence case, quiet: it names the thing below it and nothing more. */
export const Label = ({ children, className }: { children: ReactNode; className?: string }) => (
  <span className={cn("text-[12px] font-medium text-muted", className)}>{children}</span>
);

/** Marks a number or section as coming from real data or from the simulation. */
export const Tag = ({ kind }: { kind: "real" | "sim" }) => (
  <span className={cn("rounded border px-1.5 py-px text-[11px] font-medium", kind === "real" ? "border-pos/30 text-pos" : "border-warm/30 text-warm")}>
    {kind === "real" ? "Real data" : "Simulated"}
  </span>
);

export const Meter = ({ value, color = "var(--color-fg)", className }: { value: number; color?: string; className?: string }) => (
  <div className={cn("h-1 overflow-hidden rounded-full bg-white/[0.08]", className)}>
    <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color }} />
  </div>
);

export function Avatar({ name, size = 40, className }: { name?: string; size?: number; className?: string }) {
  return (
    <div
      className={cn("grid shrink-0 place-items-center rounded-full border border-line-strong bg-gradient-to-b from-[#2a2722] to-[#161512] font-medium text-soft", className)}
      style={{ width: size, height: size, fontSize: size * 0.34 }}
    >
      {name ? initials(name) : ""}
    </div>
  );
}

export const Section = ({ title, right, children }: { title: string; right?: ReactNode; children: ReactNode }) => (
  <section className="border-t border-line px-5 pt-5 pb-4 first:border-t-0">
    <div className="mb-3 flex items-baseline justify-between gap-2">
      <h3 className="text-[13px] font-medium text-fg">{title}</h3>
      {right}
    </div>
    {children}
  </section>
);

export const Inspector = ({ children }: { children: ReactNode }) => <aside className="w-[300px] shrink-0 overflow-y-auto border-l border-line bg-surface xl:w-[340px]">{children}</aside>;

/** The title of a screen: a serif heading and one line saying what the screen is for. */
export const ViewHeader = ({ title, sub, right }: { title: string; sub: string; right?: ReactNode }) => (
  <header className="flex shrink-0 items-end justify-between gap-6 px-8 pt-7 pb-5">
    <div className="min-w-0">
      <h1 className="font-serif text-[30px] leading-none tracking-tight">{title}</h1>
      <p className="mt-2 max-w-[72ch] text-[13.5px] text-muted">{sub}</p>
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
      className="pointer-events-auto flex max-w-full items-center gap-1 overflow-x-auto rounded-xl border border-line-strong bg-raised p-1.5 shadow-[0_12px_32px_-8px_rgba(0,0,0,0.75)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {label && <div className="hidden max-w-[190px] shrink-0 truncate border-r border-line px-3 text-[12.5px] text-muted @[760px]:block">{label}</div>}
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
        primary ? "bg-gold text-[#1a1408] hover:bg-gold-bright" : "text-fg hover:bg-hover [&_svg]:text-muted",
      )}
    >
      {icon}
      <span className="leading-tight">
        <span className="block text-[13px] font-medium">{label}</span>
        {sub && <span className={cn("hidden text-[11.5px] @[680px]:block", primary ? "text-[#1a1408]/70" : "text-muted")}>{sub}</span>}
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
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.16, ease }}
            className={cn(
              "absolute top-full z-50 mt-2 rounded-lg border border-line-strong bg-raised shadow-[0_16px_40px_-10px_rgba(0,0,0,0.85)]",
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

/** `plate` names a painting in public/art shown as a band across the top. Use it for narrative moments, not utilities. */
export function Dialog({ open, onClose, children, side, plate, className }: { open: boolean; onClose: () => void; children: ReactNode; side?: "right"; plate?: string; className?: string }) {
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
          className={cn("fixed inset-0 z-[60] flex bg-black/65", side ? "justify-end" : "items-center justify-center p-6")}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={side ? { x: 24, opacity: 0 } : { y: 8, opacity: 0 }}
            animate={{ x: 0, y: 0, opacity: 1 }}
            exit={side ? { x: 24, opacity: 0 } : { y: 8, opacity: 0 }}
            transition={{ duration: 0.22, ease }}
            className={cn(
              "relative flex flex-col overflow-hidden border-line-strong bg-surface shadow-[0_32px_80px_-20px_rgba(0,0,0,0.9)]",
              side ? "h-full w-[480px] border-l" : "max-h-full w-full rounded-xl border",
              className,
            )}
          >
            <button onClick={onClose} aria-label="Close" className={cn("absolute top-3.5 right-3.5 z-10 grid size-8 place-items-center rounded-md text-muted transition-colors hover:bg-hover hover:text-fg", plate && "bg-surface/70 text-soft")}>
              <X className="size-4" />
            </button>
            {plate && <div className="plate-art -mb-4 h-[132px] shrink-0" style={{ backgroundImage: `url(/art/${plate}.webp)` }} />}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
