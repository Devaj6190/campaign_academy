"use client";

import { motion } from "motion/react";
import { ArrowDownRight, ArrowUpRight, ListChecks, Newspaper } from "lucide-react";
import type { View } from "@/lib/data";
import { DAY_END, DAY_START, SPEEDS, useGame } from "@/lib/store";
import { avgIncome } from "@/lib/money/finance";
import { sum } from "@/lib/money/rules";
import { FinancePanel, IncomePanel, SpendingPanel } from "./money/MoneyPanels";
import { clock, cn, money, moneyK } from "@/lib/util";
import { SidebarBody } from "./Sidebar";
import { Meter, Popover } from "./ui";
import { CANDIDATES, ME } from "@/lib/scenario";

const VIEWS: [View, string][] = [["profile", "Profile"], ["war", "War room"], ["map", "Map"], ["factions", "Factions"]];

export function TopBar() {
  return (
    <header className="relative z-40 grid h-14 grid-cols-[1fr_auto_1fr] items-center gap-3 border-b border-line bg-bg px-4">
      <Nav />
      <Money />
      <Clock />
    </header>
  );
}

function Nav() {
  const view = useGame((s) => s.view);
  const go = useGame((s) => s.go);
  const left = useGame((s) => s.tasks.filter((t) => !t.done).length);
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2.5">
        <svg viewBox="0 0 20 20" className="size-5" aria-hidden>
          <rect x="1.5" y="1.5" width="17" height="17" rx="5" fill="none" stroke="currentColor" strokeOpacity=".35" />
          <path d="M6 10.4l2.7 2.7L14.2 7" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="hidden text-[13px] font-medium tracking-tight 2xl:block">Ballot to Bill</span>
      </div>
      <nav className="flex items-center gap-0.5">
        {VIEWS.map(([k, name]) => (
          <button key={k} onClick={() => go(k)} className={cn("relative h-8 rounded-md px-2.5 text-[13px] whitespace-nowrap transition-colors", view === k ? "text-fg" : "text-muted hover:text-fg")}>
            {view === k && <motion.span layoutId="nav" className="absolute inset-0 rounded-md bg-white/[0.08]" transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }} />}
            <span className="relative">{name}</span>
          </button>
        ))}
      </nav>
      <div className="h-8 min-[1200px]:hidden">
        <Popover align="start" className="flex max-h-[70vh] w-[272px] flex-col" trigger={(o) => (
          <button className={cn("flex h-8 items-center gap-2 rounded-md border border-line px-2.5 text-[12.5px] whitespace-nowrap text-soft transition-colors hover:bg-hover", o && "bg-hover")}>
            <ListChecks className="size-3.5 text-muted" />Today<span className="tnum font-mono text-[11px] text-faint">{left}</span>
          </button>
        )}>
          <SidebarBody />
        </Popover>
      </div>
    </div>
  );
}

// Money is the only resource: spending on the left, the books in the middle, income on the right (components/money).
function Money() {
  const cash = useGame((s) => s.cash);
  const day = useGame((s) => s.day);
  const payroll = useGame((s) => s.losses[0]?.v ?? 0);
  const m = useGame((s) => s.money);
  const out = payroll + sum(m.envelopes);
  const inc = avgIncome(m, day);
  const net = inc - payroll - sum(m.next);
  const attention = m.participant === null || m.proposal?.state === "open";
  return (
    <div className="flex h-9 items-stretch rounded-lg border border-line bg-surface">
      <Popover trigger={(o) => <FlowTrigger open={o} side="left" label="Spending" value={out} />} className="w-[360px]">
        <SpendingPanel />
      </Popover>
      <Popover trigger={(o) => (
        <button className={cn("relative flex items-center gap-2.5 border-x border-line px-4 transition-colors hover:bg-hover", o && "bg-hover")} title="The books: runway, matching funds, spending limit, filings">
          <span className="tnum font-mono text-[15px] font-medium tracking-tight">{money(cash)}</span>
          <span className={cn("tnum font-mono text-[11px] whitespace-nowrap", net < 0 ? "text-neg" : "text-pos")}>{net < 0 ? "−" : "+"}{moneyK(Math.abs(net))}/d</span>
          {attention && <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-warm" aria-label="Needs a decision" />}
        </button>
      )} className="w-[380px]">
        <FinancePanel />
      </Popover>
      <Popover trigger={(o) => <FlowTrigger open={o} side="right" label="Income" value={inc} />} className="w-[340px]">
        <IncomePanel />
      </Popover>
    </div>
  );
}

function FlowTrigger({ open, side, label, value }: { open: boolean; side: "left" | "right"; label: string; value: number }) {
  const Icon = side === "left" ? ArrowDownRight : ArrowUpRight;
  return (
    <button className={cn("flex h-full items-center gap-2 px-3 transition-colors hover:bg-hover", side === "left" ? "rounded-l-[7px]" : "rounded-r-[7px]", open && "bg-hover")}>
      <Icon className={cn("size-3.5", side === "left" ? "text-neg" : "text-pos")} />
      <span className="hidden text-[12px] text-muted xl:inline">{label}</span>
      <span className="tnum font-mono text-[12px]">{moneyK(value)}</span>
    </button>
  );
}

// The Ledger arrives here, never as a popup: the latest headline, with a dot until it has been read.
function PaperChip() {
  const e = useGame((s) => s.editions[s.editions.length - 1]);
  const open = useGame((s) => s.open);
  if (!e) return null;
  return (
    <button onClick={() => { useGame.setState({ paperIndex: null }); open("paper"); }} title={e.lead.headline} className="relative hidden h-8 max-w-[260px] items-center gap-2 rounded-md border border-line px-2.5 text-[12px] text-soft transition-colors hover:bg-hover hover:text-fg min-[1400px]:flex">
      <Newspaper className="size-3.5 shrink-0 text-muted" />
      <span className="truncate font-serif text-[13px]">{e.lead.headline}</span>
      {!e.read && <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-warm" aria-label="Unread" />}
    </button>
  );
}

function Clock() {
  const day = useGame((s) => s.day);
  const min = useGame((s) => s.min);
  const speed = useGame((s) => s.speed);
  const setSpeed = useGame((s) => s.setSpeed);
  const poll = useGame((s) => s.poll);
  // Only published polls are ever shown: opinion is not visible between them (engine/polls.ts).
  const latest = useGame((s) => s.polls[s.polls.length - 1]);
  const late = min > DAY_END - 120; // last two hours of the day
  // Everyone with a share in the latest poll, the student first, then by standing.
  const inPoll = CANDIDATES.filter((c) => (poll[c.id] ?? 0) > 0).sort((a, b) => (a.id === ME.id ? -1 : b.id === ME.id ? 1 : (poll[b.id] ?? 0) - (poll[a.id] ?? 0)));
  return (
    <div className="flex items-center justify-end gap-4">
      <PaperChip />
      <div className="hidden w-60 xl:block" title={`${latest.pollster}, day ${latest.day}: ${latest.n.toLocaleString("en-US")} likely voters, margin of error ±${latest.moe}`}>
        <div className="tnum mb-1 flex justify-between gap-2 font-mono text-[11px]">
          {inPoll.slice(0, 3).map((c) => <span key={c.id} className="whitespace-nowrap" style={{ color: c.id === ME.id ? "var(--color-warm)" : undefined }}>{c.short} {poll[c.id]}</span>)}
        </div>
        <div className="flex h-1 gap-px overflow-hidden rounded-full">
          {inPoll.map((c) => <div key={c.id} className="transition-[width] duration-500" style={{ width: `${poll[c.id]}%`, background: c.color }} />)}
          <div className="flex-1 bg-white/[0.06]" />
        </div>
        <div className="mt-0.5 text-right text-[9.5px] text-faint">poll as of day {latest.day} · ±{latest.moe}</div>
      </div>
      <div className="w-[104px]">
        <div className="flex items-baseline justify-between">
          <span className="text-[12px] text-muted">Day {day}<span className="text-faint">/30</span></span>
          <span className={cn("tnum font-mono text-[13px] transition-colors", late && "breathe text-warm")}>{clock(min)}</span>
        </div>
        <Meter value={((min - DAY_START) / (DAY_END - DAY_START)) * 100} color={late ? "var(--color-warm)" : "var(--color-soft)"} className="mt-1 h-[3px]" />
      </div>
      <div className="flex h-7 items-center rounded-md border border-line p-0.5" title="Slow the day down or speed it up. There is no pause.">
        {SPEEDS.map((s) => (
          <button key={s} onClick={() => setSpeed(s)} className={cn("tnum h-full rounded px-2 font-mono text-[11px] transition-colors", speed === s ? "bg-white/10 text-fg" : "text-faint hover:text-fg")}>
            {s === 0.5 ? "½" : s}×
          </button>
        ))}
      </div>
    </div>
  );
}
