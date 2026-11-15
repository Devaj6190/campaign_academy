"use client";

import { ListChecks } from "lucide-react";
import { motion } from "motion/react";
import { longDate, shortMoney, useCaseNow } from "@/lib/cases/store";
import type { View } from "@/lib/data";
import { useGame } from "@/lib/store";
import { cn } from "@/lib/util";
import { SidebarBody } from "./Sidebar";
import { Popover } from "./ui";

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
      <span className="font-serif text-[21px] leading-none tracking-tight whitespace-nowrap max-[1199px]:hidden">Ballot to Bill</span>
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

// Money left under the spending cap.
function Money() {
  const { w } = useCaseNow();
  return (
    <div className="flex h-9 items-center rounded-lg border border-line px-4" title="What you have left to spend under the cap (simulated)">
      <div className="flex items-baseline gap-2">
        <span className="tnum text-[15px] font-medium">{shortMoney(Math.max(0, w.budget))}</span>
        <span className="text-[12.5px] whitespace-nowrap text-muted">left to spend</span>
      </div>
    </div>
  );
}

// Your campaign and the two candidates nearest the top, as the polls stand on your path through the case.
function Standing() {
  const { c, w } = useCaseNow();
  const all = c.candidates.map((x) => ({ id: x.id, name: x.id === c.follow ? "You" : x.name.split(" ").pop()!, v: Math.round(w.poll[x.id] ?? 0), mine: x.id === c.follow })).sort((a, b) => b.v - a.v);
  const top = all.slice(0, 3).some((x) => x.mine) ? all.slice(0, 3) : [...all.slice(0, 2), all.find((x) => x.mine)!];
  return (
    <div className="hidden w-52 xl:block" title="Poll standing on your path through the case (simulated)">
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
  return (
    <div className="text-right leading-tight whitespace-nowrap" title={`Primary on ${longDate(c.electionDate)}`}>
      <div className="text-[13px]">{longDate(today)}</div>
      <div className="tnum text-[12px] text-muted">{daysLeft ? `${daysLeft} days to the primary` : "Primary day"}</div>
    </div>
  );
}
