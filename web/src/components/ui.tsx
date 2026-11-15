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
        "inline-flex shrink-0 items-center justify-center gap-2 font-display font-semibold whitespace-nowrap transition-colors disabled:pointer-events-none disabled:opacity-40",
        size === "sm" ? "h-7 px-3.5 text-[12.5px]" : "h-9 px-5 text-[13.5px]",
        variant === "primary" && "btn-gold",
        variant === "outline" && "btn-pill",
        variant === "ghost" && "text-muted underline decoration-line-strong underline-offset-4 hover:text-gold-bright hover:decoration-gold",
        className,
      )}
    />
  );
}

export const Label = ({ children, className }: { children: ReactNode; className?: string }) => (
  <span className={cn("font-display text-[12px] font-medium text-gold/80", className)}>{children}</span>
);

/** Marks a number or section as coming from real data or from the simulation. `big` for screens that have had the text pass. */
export const Tag = ({ kind, big }: { kind: "real" | "sim"; big?: boolean }) => (
  <span className={cn("shrink-0 rounded-full border px-2 py-px font-display font-medium whitespace-nowrap", big ? "text-[13px]" : "text-[11px]", kind === "real" ? "border-pos/25 text-pos" : "border-warm/25 text-warm")}>
    {kind === "real" ? "Real data" : "Simulated"}
  </span>
);

export const Meter = ({ value, color = "var(--color-gold)", className }: { value: number; color?: string; className?: string }) => (
  <div className={cn("relative h-[5px] overflow-hidden rounded-full bg-white/[0.09]", className)}>
    <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: `linear-gradient(90deg, color-mix(in srgb, ${color} 45%, transparent), ${color})` }} />
  </div>
);

export function Avatar({ name, size = 40, className }: { name?: string; size?: number; className?: string }) {
  return (
    <div
      className={cn("grid shrink-0 place-items-center rounded-full border border-gold/45 bg-gradient-to-b from-[#2e2616] to-[#100d08] font-display font-semibold tracking-wide text-gold-bright", className)}
      style={{ width: size, height: size, fontSize: size * 0.34 }}
    >
      {name ? initials(name) : ""}
    </div>
  );
}

/** `big` gives the heading the size used on the screens that have had the text pass; the body is laid out the same. */
export const Section = ({ title, right, big, children }: { title: string; right?: ReactNode; big?: boolean; children: ReactNode }) => (
  <section className="px-5 pt-5 pb-3 first:pt-0">
    <div className={cn("plate -mx-5 mb-3.5 flex items-center gap-2.5 px-5", big ? "h-12" : "h-8")}>
      <Label className={cn("flex-1 text-gold-bright", big && "text-[20px] leading-tight font-semibold")}>{title}</Label>
      {right}
    </div>
    {children}
  </section>
);

export const Inspector = ({ children }: { children: ReactNode }) => <aside className="edge-l panel w-[300px] shrink-0 overflow-y-auto xl:w-[340px]">{children}</aside>;

export const ViewHeader = ({ title, sub, right }: { title: string; sub: string; right?: ReactNode }) => (
  // The controls on the right drop below the title when there is no room for both, instead of squeezing the subtitle.
  <header className="relative flex min-h-[84px] shrink-0 flex-wrap items-center justify-between gap-x-6 gap-y-3 px-8 py-4">
    <div className="min-w-0 flex-[1_1_340px]">
      <h1 className="gilt font-display text-[28px] leading-none font-semibold whitespace-nowrap">{title}</h1>
      <p className="mt-2 text-[14px] leading-snug text-soft">{sub}</p>
    </div>
    {right}
  </header>
);

/** Floating action bar at the bottom of a view. Its contents change from screen to screen. */
export const Dock = ({ label, children }: { label?: string; children: ReactNode }) => (
  <div className="pointer-events-none absolute inset-x-0 bottom-5 z-20 flex items-center justify-center px-4">
    <motion.div
      layout
      transition={{ duration: 0.25, ease }}
      className="pointer-events-auto flex max-w-full items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden rounded-2xl border border-line-strong bg-[#0f0d09] p-1.5 shadow-[0_18px_44px_-14px_rgba(0,0,0,0.9)]"
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
        // ponytail: aria-disabled looks off but still takes the click, so the caller can say why nothing happened.
        "flex h-11 shrink-0 items-center gap-2.5 rounded-xl px-4 text-left transition-colors [&_svg]:size-4 disabled:cursor-not-allowed disabled:opacity-40 aria-disabled:cursor-not-allowed aria-disabled:opacity-40",
        primary ? "btn-gold !rounded-xl" : "text-fg hover:bg-gold/10 hover:text-gold-bright [&_svg]:text-gold",
      )}
    >
      {icon}
      <span className="leading-tight">
        <span className="block font-display text-[13.5px] font-semibold">{label}</span>
        {sub && <span className={cn("hidden font-mono text-[10.5px] @[680px]:block", primary ? "text-[#1a1206]/65" : "text-faint")}>{sub}</span>}
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
              "panel absolute top-full z-50 mt-2 overflow-hidden rounded-xl border border-line-strong shadow-[0_24px_60px_-12px_rgba(0,0,0,0.9)]",
              align === "center" && "left-1/2 -translate-x-1/2",
              align === "start" && "left-0",
              align === "end" && "right-0",
              className,
            )}
          >
            {/* Using a control inside pins it open, so a native menu or a drag that leaves the panel does not close it. */}
            <div onPointerDown={() => setPinned(true)}>{children}</div>
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
          className={cn("fixed inset-0 z-[60] flex bg-black/75", side ? "justify-end" : "items-center justify-center p-6")}
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
              "panel relative flex flex-col overflow-hidden border-line-strong shadow-[0_40px_100px_-20px_rgba(0,0,0,1)]",
              side ? "h-full w-[480px] border-l" : "max-h-full w-full rounded-2xl border",
              className,
            )}
          >
            <button onClick={onClose} aria-label="Close" className="absolute top-4 right-4 z-10 grid size-7 place-items-center rounded-full border border-line-strong text-muted transition-colors hover:border-gold hover:text-gold-bright">
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
