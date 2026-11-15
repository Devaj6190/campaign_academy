"use client";

import { ArrowDownRight, ArrowUpRight, ListChecks } from "lucide-react";
import { motion } from "motion/react";
import { longDate, shortMoney, useCase, useCaseNow } from "@/lib/cases/store";
import { effectOf } from "@/lib/cases/types";
import type { View } from "@/lib/data";
import { useGame } from "@/lib/store";
import { cn } from "@/lib/util";
import { SidebarBody } from "./Sidebar";
import { Label, Meter, Popover } from "./ui";

// The sections of the tool, in the order a student meets them: the case first, then the material behind it. Add new views here.
const VIEWS: [View, string][] = [["case", "Case"], ["profile", "Profile"], ["war", "War room"], ["map", "Map"], ["factions", "Voter groups"]];

// Sections on the left, money in the centre, the poll and the date on the right.
// The money, poll and date are read from the case and the student's decisions so far.
export function TopBar() {
  return (
    <header className="relative z-40 grid h-14 grid-cols-[1fr_auto_1fr] items-center gap-4 border-b border-line bg-bg px-4">
      <Nav />
      <Money />
      <div className="flex items-center justify-end gap-5">
        <Standing />
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
      <span className="font-serif text-[21px] leading-none tracking-tight whitespace-nowrap max-[1439px]:hidden">Ballot to Bill</span>
      <nav aria-label="Sections" className="flex items-stretch self-stretch">
        {VIEWS.map(([k, name]) => (
          <button key={k} onClick={() => go(k)} aria-current={view === k ? "page" : undefined} className={cn("relative px-3 text-[13.5px] whitespace-nowrap transition-colors", view === k ? "text-fg" : "text-muted hover:text-fg")}>
            {name}
            {/* Gold marks where you are: the line sits on the bar's bottom border and slides between tabs. */}
            {view === k && <motion.span layoutId="tab" className="absolute inset-x-3 -bottom-px h-0.5 bg-gold" transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }} />}
          </button>
        ))}
      </nav>
      {/* Below 1200px the sidebar is hidden and its content opens from here. */}
      <div className="h-8 min-[1200px]:hidden">
        <Popover align="start" className="flex max-h-[76vh] w-[272px] flex-col" trigger={(o) => (
          <button className={cn("flex h-8 items-center gap-2 rounded-md border border-line px-2.5 text-[12.5px] whitespace-nowrap text-soft transition-colors hover:bg-hover", o && "bg-hover")}>
            <ListChecks className="size-3.5 text-muted" />Outline
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
    <div className="flex h-9 items-stretch rounded-lg border border-line">
      <Popover trigger={(o) => <FlowTrigger open={o} side="left" label="Spending" value={spent} />} className="w-[340px]">
        <FlowPanel kind="losses" title="Spending" rows={out} total={spent} />
      </Popover>
      <div className="flex items-baseline gap-2 self-center border-x border-line px-4" title="What you have left to spend under the cap (simulated)">
        <span className="tnum text-[15px] font-medium">{shortMoney(Math.max(0, left))}</span>
        <span className="text-[12.5px] whitespace-nowrap text-muted">left to spend</span>
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
    <button className={cn("flex h-full items-center gap-2 px-3 transition-colors hover:bg-hover", side === "left" ? "rounded-l-[7px]" : "rounded-r-[7px]", open && "bg-hover")}>
      <Icon className={cn("size-3.5", side === "left" ? "text-neg" : "text-pos")} />
      <span className="hidden text-[12.5px] text-muted xl:inline">{label}</span>
      <span className="tnum text-[12.5px]">{shortMoney(value)}</span>
    </button>
  );
}

function FlowPanel({ kind, title, rows, total }: { kind: "losses" | "gains"; title: string; rows: Entry[]; total: number }) {
  const color = kind === "losses" ? "var(--color-neg)" : "var(--color-pos)";
  return (
    <div className="p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <Label>{title} so far</Label>
        <span className="tnum text-[13px] text-soft">{shortMoney(total)}</span>
      </div>
      {rows.length === 0 && <p className="text-[13px] text-soft">Nothing yet. This fills in as you make decisions.</p>}
      <div className="space-y-3.5">
        {rows.map((r) => (
          <div key={r.label}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[13px]">{r.label}</span>
              <span className="tnum text-[12.5px] text-soft">{shortMoney(Math.abs(r.v))}</span>
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
    <div className="hidden w-44 xl:block" title="Poll standing on your path through the case (simulated)">
      <div className="tnum mb-1.5 flex justify-between text-[12px] leading-none">
        {top.map((x) => <span key={x.id} className={x.mine ? "text-warm" : "text-muted"}>{x.name} {x.v}</span>)}
      </div>
      <div className="flex h-1 gap-px overflow-hidden rounded-full">
        {top.map((x) => <div key={x.id} className={cn("transition-[width] duration-500", x.mine ? "bg-warm" : "bg-white/30")} style={{ width: `${x.v}%` }} />)}
        <div className="flex-1 bg-white/[0.06]" />
      </div>
    </div>
  );
}

// Where you are on the real calendar.
function Day() {
  const { c, today, daysLeft } = useCaseNow();
  const span = Math.max(1, Math.round((Date.parse(c.electionDate) - Date.parse(c.briefingDate)) / 86_400_000));
  const date = new Date(today).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  return (
    <div className="w-[176px]" title={`${longDate(today)}. Primary on ${longDate(c.electionDate)}.`}>
      <div className="flex items-baseline justify-between leading-none whitespace-nowrap">
        <span className="tnum text-[12.5px] text-muted">{daysLeft ? `${daysLeft} days left` : "Primary day"}</span>
        <span className="tnum text-[13px]">{date}</span>
      </div>
      {/* How far through the campaign you are, from the briefing to the primary. */}
      <Meter value={(1 - daysLeft / span) * 100} color="var(--color-soft)" className="mt-1.5 h-[3px]" />
    </div>
  );
}
