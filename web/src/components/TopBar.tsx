"use client";

import { ArrowDownRight, ArrowUpRight, ListChecks } from "lucide-react";
import { motion } from "motion/react";
import { longDate, shortMoney, staffMoney, useCase, useCaseNow } from "@/lib/cases/store";
import { effectOf } from "@/lib/cases/types";
import type { View } from "@/lib/data";
import { useGame } from "@/lib/store";
import { cn } from "@/lib/util";
import { ClockControls } from "./Clock";
import { SidebarBody } from "./Sidebar";
import { Label, Meter, Popover } from "./ui";

// The sections of the tool, in the order a student meets them: the case first, then the material behind it. Add new views here.
const VIEWS: [View, string][] = [["case", "Case"], ["profile", "Profile"], ["war", "War room"], ["map", "Map"], ["factions", "Factions"]];

// Sections on the left, money in the centre, the poll, the clock and the date on the right.
// The money plate hangs below the bar. Everything it shows is read from the case and the student's decisions so far.
export function TopBar() {
  return (
    <header className="relative z-40 grid h-14 grid-cols-[1fr_auto_1fr] items-center gap-3 bg-[#0a0806] px-4">
      <span className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-gold/10 via-gold/70 to-gold/10" />
      <Nav />
      <Money />
      <div className="flex items-center justify-end gap-4">
        <Standing />
        <ClockControls />
        <Day />
      </div>
    </header>
  );
}

function Nav() {
  const view = useGame((s) => s.view);
  const go = useGame((s) => s.go);
  return (
    <div className="flex items-center gap-4 self-stretch">
      <div className="flex items-center gap-2.5">
        <svg viewBox="0 0 32 32" className="size-8 shrink-0 text-gold" aria-hidden>
          <circle cx="16" cy="16" r="15" fill="none" stroke="currentColor" strokeOpacity=".35" />
          <circle cx="16" cy="16" r="12.5" fill="none" stroke="currentColor" strokeOpacity=".6" strokeWidth="2.5" strokeDasharray="1 2.27" />
          <path d="M16 6.5 25.5 16 16 25.5 6.5 16Z" fill="currentColor" fillOpacity=".14" stroke="currentColor" />
          <path d="M12.4 16.2l2.5 2.5 4.8-5.2" fill="none" stroke="var(--color-gold-bright)" strokeWidth="1.6" strokeLinecap="square" />
        </svg>
        <span className="gilt hidden font-display text-[15px] leading-none font-semibold tracking-[0.12em] whitespace-nowrap uppercase min-[1560px]:block">Campaign Academy</span>
      </div>
      <nav aria-label="Sections" className="flex items-stretch self-stretch">
        {VIEWS.map(([k, name]) => (
          <button key={k} onClick={() => go(k)} aria-current={view === k ? "page" : undefined} className={cn("relative px-3.5 font-display text-[12.5px] font-medium tracking-[0.09em] whitespace-nowrap uppercase transition-colors", view === k ? "text-gold-bright" : "text-muted hover:text-fg")}>
            {/* Where you are: a faint wash, a gold line on the bar's edge and a diamond on it. It slides between tabs. */}
            {view === k && (
              <motion.span layoutId="nav" className="absolute inset-0" transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}>
                <span className="absolute inset-0 bg-gradient-to-t from-gold/15 via-gold/5 to-transparent" />
                <span className="absolute inset-x-1 bottom-0 h-px bg-gold-bright" />
                <i className="diamond absolute -bottom-[3.5px] left-1/2 -ml-[3.5px] size-[7px] bg-gold-bright" />
              </motion.span>
            )}
            <span className="relative">{name}</span>
          </button>
        ))}
      </nav>
      {/* Below 1200px the sidebar is hidden and its content opens from here. */}
      <div className="h-8 min-[1200px]:hidden">
        <Popover align="start" className="flex max-h-[76vh] w-[272px] flex-col" trigger={(o) => (
          <button className={cn("btn-pill flex h-8 items-center gap-2 px-3 text-[12.5px] whitespace-nowrap", o && "bg-gold/15")}>
            <ListChecks className="size-3.5" />Tasks
          </button>
        )}>
          <SidebarBody />
        </Popover>
      </div>
    </div>
  );
}

type Entry = { label: string; v: number };

// Every dollar that has moved on the student's path so far, in order. It repeats the budget steps of `simulate`
// in lib/cases/types so each one can be listed; the assert below fails if the two ever disagree.
function useLedger() {
  const { c, w, step } = useCaseNow();
  const picks = useCase((s) => s.picks);
  const chosen = Object.fromEntries(Object.entries(picks).map(([k, p]) => [k, p.option]));
  const n = c.decisions.length, upTo = Math.min(Math.max(step - 1, 0), n);
  const rows: Entry[] = [{ label: "Available at the briefing", v: c.start.budget }];
  for (const d of c.decisions.slice(0, upTo + 1)) {
    if (d.since?.shift.budget) rows.push({ label: `By ${longDate(d.date)}`, v: d.since.shift.budget });
    const v = effectOf(c, d, chosen[d.id], chosen).reduce((a, s) => a + (s.budget ?? 0), 0);
    if (v) rows.push({ label: d.title, v });
  }
  const sum = (xs: Entry[]) => xs.reduce((a, r) => a + r.v, 0);
  // Staff work between decisions. What the staff raise pays for staff work and stops there (see staffMoney).
  const staff = staffMoney(useCase((s) => s.work));
  if (staff.spent) rows.push({ label: "Staff work", v: -staff.spent });
  if (staff.raised) rows.push({ label: "Raised by your staff", v: staff.raised });
  if (upTo >= n && c.close.shift.budget) {
    // The closing stretch is paid only as far as the money lasts.
    const cost = -c.close.shift.budget;
    rows.push({ label: "The closing stretch", v: -cost * (cost > 0 ? Math.max(0, Math.min(1, sum(rows) / cost)) : 1) });
  }
  console.assert(Math.abs(sum(rows) - w.budget) < 1, "TopBar ledger disagrees with simulate()", sum(rows), w.budget);
  const out = rows.filter((r) => r.v < 0), inc = rows.filter((r) => r.v > 0);
  return { left: w.budget, out, inc, spent: -sum(out), raised: sum(inc) };
}

// Money is the only resource: spending on the left, what is left in the middle, income on the right.
function Money() {
  const { left, out, inc, spent, raised } = useLedger();
  return (
    <div className="flex h-14 items-stretch">
      <Popover trigger={(o) => <FlowTrigger open={o} side="left" label="Spending" value={spent} />} className="w-[340px]">
        <FlowPanel kind="losses" title="Spending" rows={out} total={spent} />
      </Popover>
      {/* The money plate drops below the bar, like a seal hung from a rail. */}
      <div className="relative w-[208px]" title="What you have left to spend under the cap (simulated)">
        <svg viewBox="0 0 208 76" className="absolute top-0 left-0 h-[76px] w-full" aria-hidden>
          <defs>
            <linearGradient id="money-plate" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#221a0d" />
              <stop offset="1" stopColor="#0a0806" />
            </linearGradient>
          </defs>
          <path d="M.5 0V52L24 75.5H184L207.5 52V0" fill="url(#money-plate)" stroke="var(--color-gold)" strokeOpacity=".8" />
          <path d="M6.5 0V49.5L26.5 69.5H181.5L201.5 49.5V0" fill="none" stroke="var(--color-gold)" strokeOpacity=".22" />
        </svg>
        <div className="relative flex h-[70px] flex-col items-center justify-center">
          <span className="font-display text-[10px] leading-none font-medium tracking-[0.14em] text-gold/70 uppercase">Left to spend</span>
          <span className="tnum mt-1.5 font-mono text-[20px] leading-none font-medium tracking-tight text-gold-bright">{shortMoney(Math.max(0, left))}</span>
        </div>
      </div>
      <Popover align="end" trigger={(o) => <FlowTrigger open={o} side="right" label="Income" value={raised} />} className="w-[340px]">
        <FlowPanel kind="gains" title="Income" rows={inc} total={raised} />
      </Popover>
    </div>
  );
}

function FlowTrigger({ open, side, label, value }: { open: boolean; side: "left" | "right"; label: string; value: number }) {
  const Icon = side === "left" ? ArrowDownRight : ArrowUpRight;
  return (
    <button className={cn("group flex h-full items-center gap-2.5 px-4 transition-colors", side === "left" ? "flex-row-reverse text-right" : "text-left", open && "bg-gold/10")}>
      <span className={cn("grid size-6 place-items-center rounded-full border transition-colors group-hover:border-gold", open ? "border-gold" : "border-line-strong")}>
        <Icon className={cn("size-3.5", side === "left" ? "text-neg" : "text-pos")} />
      </span>
      <span className="leading-none">
        <span className="hidden font-display text-[10px] font-medium tracking-[0.1em] text-muted uppercase xl:block">{label}</span>
        <span className="tnum mt-1 block font-mono text-[13px] text-fg">{shortMoney(value)}</span>
      </span>
    </button>
  );
}

function FlowPanel({ kind, title, rows, total }: { kind: "losses" | "gains"; title: string; rows: Entry[]; total: number }) {
  const color = kind === "losses" ? "var(--color-neg)" : "var(--color-pos)";
  return (
    <div className="p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <Label>{title} so far</Label>
        <span className="tnum font-mono text-[13px] text-soft">{shortMoney(total)}</span>
      </div>
      {rows.length === 0 && <p className="text-[13px] text-soft">Nothing yet. This fills in as you make decisions.</p>}
      <div className="space-y-3.5">
        {rows.map((r) => (
          <div key={r.label}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[13px]">{r.label}</span>
              <span className="tnum font-mono text-[12.5px] text-soft">{shortMoney(Math.abs(r.v))}</span>
            </div>
            <Meter value={(Math.abs(r.v) / total) * 100} color={color} className="mt-1.5" />
          </div>
        ))}
      </div>
      <p className="mt-4 border-t border-line pt-3 text-[12px] text-muted">Simulated from the case and your decisions so far.</p>
    </div>
  );
}

// Your campaign and the two candidates nearest the top, as the polls stand on your path through the case.
function Standing() {
  const { c, w } = useCaseNow();
  const all = c.candidates.map((x) => ({ id: x.id, name: x.id === c.follow ? "You" : x.name.split(" ").pop()!, v: Math.round(w.poll[x.id] ?? 0), mine: x.id === c.follow })).sort((a, b) => b.v - a.v);
  const top = all.slice(0, 3).some((x) => x.mine) ? all.slice(0, 3) : [...all.slice(0, 2), all.find((x) => x.mine)!];
  return (
    <div className="hidden w-40 min-[1440px]:block" title="Poll standing on your path through the case (simulated)">
      <div className="tnum mb-1.5 flex justify-between font-mono text-[11px] leading-none">
        {top.map((x) => <span key={x.id} className={x.mine ? "text-warm" : "text-muted"}>{x.name} {x.v}</span>)}
      </div>
      <div className="flex h-[5px] gap-px overflow-hidden">
        {top.map((x) => <div key={x.id} className={cn("transition-[width] duration-500", x.mine ? "bg-warm" : "bg-white/35")} style={{ width: `${x.v}%` }} />)}
        <div className="flex-1 bg-white/[0.07]" />
      </div>
    </div>
  );
}

// Where you are on the real calendar, and how far through the campaign.
function Day() {
  const { c, today, daysLeft } = useCaseNow();
  const span = Math.max(1, Math.round((Date.parse(c.electionDate) - Date.parse(c.briefingDate)) / 86_400_000));
  const date = new Date(today).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  return (
    <div className="w-[168px]" title={`${longDate(today)}. Primary on ${longDate(c.electionDate)}.`}>
      <div className="flex items-baseline justify-between leading-none whitespace-nowrap">
        <span className="font-display text-[10px] font-medium tracking-[0.1em] text-muted uppercase">{daysLeft ? `${daysLeft} days left` : "Primary day"}</span>
        <span className="tnum font-mono text-[13px]">{date}</span>
      </div>
      <Meter value={(1 - daysLeft / span) * 100} className="mt-2" />
    </div>
  );
}
