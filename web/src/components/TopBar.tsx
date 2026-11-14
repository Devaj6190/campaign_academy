"use client";

import { ArrowDownRight, ArrowUpRight, Menu, Minus, Plus } from "lucide-react";
import type { Flow } from "@/lib/data";
import { DAY_END, DAY_START, SPEEDS, netPerDay, useGame } from "@/lib/store";
import { clock, cn, money, moneyK } from "@/lib/util";
import { SidebarBody } from "./Sidebar";
import { Label, Meter, Popover } from "./ui";

// The masthead: the name of the tool on the left, the state of the campaign on the right. Navigation lives in the rail.
export function TopBar() {
  return (
    <header className="relative z-40 flex h-14 items-center gap-5 border-b border-line bg-bg px-4">
      {/* The one picture in the frame: a strip of skyline behind the name, fading out to the right. */}
      <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-[380px] bg-[url(/art/masthead-skyline.webp)] bg-[length:480px_auto] bg-[position:left_47%] [mask-image:linear-gradient(to_right,black_40%,transparent)]" />
      <Brand />
      <div className="flex-1" />
      <Poll />
      <Money />
      <Clock />
    </header>
  );
}

function Brand() {
  return (
    <div className="relative flex items-center gap-3 min-[1200px]:w-[216px]">
      <div className="h-8 min-[1200px]:hidden">
        <Popover align="start" className="flex max-h-[76vh] w-[264px] flex-col" trigger={(o) => (
          <button aria-label="Menu" className={cn("grid size-8 place-items-center rounded-md text-soft transition-colors hover:bg-hover", o && "bg-hover")}>
            <Menu className="size-4" />
          </button>
        )}>
          <SidebarBody />
        </Popover>
      </div>
      <span className="font-serif text-[21px] leading-none tracking-tight whitespace-nowrap">Ballot to Bill</span>
    </div>
  );
}

function Poll() {
  const poll = useGame((s) => s.poll);
  return (
    <div className="hidden w-44 xl:block" title="Latest poll">
      <div className="tnum mb-1.5 flex justify-between text-[12px] leading-none">
        <span className="text-warm">Cole {poll.cole}</span>
        <span className="text-muted">Hale {poll.hale}</span>
        <span className="text-faint">Brandt {poll.brandt}</span>
      </div>
      <div className="flex h-1 gap-px overflow-hidden rounded-full">
        <div className="bg-warm transition-[width] duration-500" style={{ width: `${poll.cole}%` }} />
        <div className="bg-white/40 transition-[width] duration-500" style={{ width: `${poll.hale}%` }} />
        <div className="bg-white/20 transition-[width] duration-500" style={{ width: `${poll.brandt}%` }} />
        <div className="flex-1 bg-white/[0.06]" />
      </div>
    </div>
  );
}

// Money is the only resource: spending on the left, the total in the middle, income on the right.
function Money() {
  const cash = useGame((s) => s.cash);
  const losses = useGame((s) => s.losses);
  const gains = useGame((s) => s.gains);
  const net = netPerDay({ gains, losses });
  const out = losses.reduce((a, c) => a + c.v, 0), inc = gains.reduce((a, c) => a + c.v, 0);
  return (
    <div className="flex h-9 items-stretch rounded-lg border border-line">
      <Popover trigger={(o) => <FlowTrigger open={o} side="left" label="Spending" value={out} />} className="w-[340px]">
        <FlowPanel kind="losses" title="Spending" flows={losses} total={out} />
      </Popover>
      <div className="flex items-baseline gap-2 self-center border-x border-line px-4">
        <span className="tnum text-[15px] font-medium">{money(cash)}</span>
        <span className={cn("tnum text-[12px] whitespace-nowrap", net < 0 ? "text-neg" : "text-pos")}>{net < 0 ? "−" : "+"}{moneyK(net)} a day</span>
      </div>
      <Popover align="end" trigger={(o) => <FlowTrigger open={o} side="right" label="Income" value={inc} />} className="w-[340px]">
        <FlowPanel kind="gains" title="Income" flows={gains} total={inc} />
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
      <span className="tnum text-[12.5px]">{moneyK(value)}</span>
    </button>
  );
}

function FlowPanel({ kind, title, flows, total }: { kind: "losses" | "gains"; title: string; flows: Flow[]; total: number }) {
  const allocate = useGame((s) => s.allocate);
  const color = kind === "losses" ? "var(--color-neg)" : "var(--color-pos)";
  return (
    <div className="p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <Label>{title} per day</Label>
        <span className="tnum text-[13px] text-soft">{money(total)}</span>
      </div>
      <div className="space-y-3.5">
        {flows.map((c, i) => (
          <div key={c.k}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[13px]">{c.k}</span>
              <div className="flex items-center gap-1.5">
                <span className="tnum mr-1 text-[12.5px] text-soft">{money(c.v)}</span>
                <Step onClick={() => allocate(kind, i, -500)} label={`Less on ${c.k}`}><Minus /></Step>
                <Step onClick={() => allocate(kind, i, 500)} label={`More on ${c.k}`}><Plus /></Step>
              </div>
            </div>
            <Meter value={(c.v / total) * 100} color={color} className="my-1.5" />
            <div className="flex flex-wrap gap-x-3 text-[12px] text-muted">
              {c.items.map(([n, v]) => (
                <span key={n}>{n} <span className="tnum">{moneyK(v)}</span></span>
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 border-t border-line pt-3 text-[12px] text-muted">Use − and + to move money. Changes apply from tomorrow.</p>
    </div>
  );
}

const Step = ({ children, onClick, label }: { children: React.ReactNode; onClick: () => void; label: string }) => (
  <button onClick={(e) => { e.stopPropagation(); onClick(); }} aria-label={label} className="grid size-6 place-items-center rounded border border-line-strong text-muted transition-colors hover:bg-hover hover:text-fg [&_svg]:size-3">
    {children}
  </button>
);

function Clock() {
  const day = useGame((s) => s.day);
  const min = useGame((s) => s.min);
  const speed = useGame((s) => s.speed);
  const setSpeed = useGame((s) => s.setSpeed);
  const late = min > DAY_END - 120; // last two hours of the day
  return (
    <div className="flex items-center gap-3">
      <div className="w-[116px]">
        <div className="flex items-baseline justify-between leading-none">
          <span className="text-[12.5px] text-muted">Day {day} of 30</span>
          <span className={cn("tnum text-[13px] transition-colors", late && "breathe text-warm")}>{clock(min)}</span>
        </div>
        <Meter value={((min - DAY_START) / (DAY_END - DAY_START)) * 100} color={late ? "var(--color-warm)" : "var(--color-soft)"} className="mt-1.5 h-[3px]" />
      </div>
      <div className="flex h-7 items-center rounded-md border border-line p-0.5" title="Slow the day down or speed it up. There is no pause.">
        {SPEEDS.map((s) => (
          <button key={s} onClick={() => setSpeed(s)} aria-pressed={speed === s} className={cn("tnum h-full rounded px-2 text-[12px] transition-colors", speed === s ? "bg-white/10 text-fg" : "text-muted hover:text-fg")}>
            {s === 0.5 ? "½" : s}×
          </button>
        ))}
      </div>
    </div>
  );
}
