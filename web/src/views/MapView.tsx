"use client";

import { Check, ChevronDown, DoorOpen, HandCoins, Megaphone, UserRound } from "lucide-react";
import { useState } from "react";
import { Dock, DockButton, Inspector, Label, Meter, Popover, Section, Tag, ViewHeader } from "@/components/ui";
import { DISTRICTS, FETCHED, MAP_H, MAP_W, districtBy } from "@/lib/geo";
import { sentimentOf, useGame } from "@/lib/store";
import { cn, hash, heat, tone } from "@/lib/util";

const LABELS: [string, number, number][] = [["Bronx", 690, 95], ["Manhattan", 318, 420], ["Queens", 905, 470], ["Brooklyn", 380, 905], ["Staten Island", 120, 720]];

export function MapView() {
  const sent = useGame((s) => s.sent);
  const filter = useGame((s) => s.filter);
  const factions = useGame((s) => s.factions);
  const district = useGame((s) => s.district);
  const select = useGame((s) => s.select);
  const act = useGame((s) => s.act);
  const go = useGame((s) => s.go);
  const [tip, setTip] = useState<{ x: number; y: number; cd: number } | null>(null);
  const world = { sent, filter, factions };
  const sel = districtBy(district);
  const hovered = districtBy(tip?.cd ?? null);
  const current = factions.find((f) => f.id === filter);

  return (
    <div className="flex h-full">
      <section className="@container relative flex min-w-0 flex-1 flex-col">
        <ViewHeader
          title="New York City"
          sub="59 community districts. Colour shows how each one feels about Cole."
          right={
            <div className="flex shrink-0 items-center gap-5">
              <div className="hidden items-center gap-2 text-[11px] text-muted @[700px]:flex">
                Cold
                <i className="h-1 w-24 rounded-full" style={{ background: `linear-gradient(90deg, ${heat(20)}, ${heat(47)}, ${heat(75)})` }} />
                Warm
              </div>
              <div className="h-8">
                <Popover
                  align="end"
                  className="w-56 p-1.5"
                  trigger={() => (
                    <button className="flex h-8 items-center gap-2 rounded-md border border-line-strong bg-raised px-3 text-[12.5px] whitespace-nowrap transition-colors hover:bg-hover">
                      <span className="text-muted">Showing</span>
                      {current?.name ?? "All voters"}
                      <ChevronDown className="size-3.5 text-muted" />
                    </button>
                  )}
                >
                  {[{ id: "all", name: "All voters" }, ...factions].map((f) => (
                    <button key={f.id} onClick={() => select({ filter: f.id })} className="flex h-8 w-full items-center justify-between rounded-md px-2.5 text-[13px] text-soft transition-colors hover:bg-hover hover:text-fg">
                      {f.name}
                      {filter === f.id && <Check className="size-3.5" />}
                    </button>
                  ))}
                </Popover>
              </div>
            </div>
          }
        />
        <div className="relative min-h-0 flex-1 px-6 pb-24">
          <div className="dots pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
          <svg viewBox={`-30 -20 ${MAP_W + 60} ${MAP_H + 40}`} className="relative h-full w-full" onMouseLeave={() => setTip(null)} onClick={() => select({ district: null })}>
            {DISTRICTS.map((d) => (
              <path
                key={d.cd}
                d={d.d}
                fill={d.park ? "#0c0e0c" : heat(sentimentOf(world, d.cd))}
                stroke="var(--color-bg)"
                strokeWidth={1.4}
                strokeLinejoin="round"
                className={cn("transition-[fill,filter] duration-500", !d.park && "cursor-pointer hover:brightness-125")}
                onMouseMove={(e) => setTip({ x: e.clientX, y: e.clientY, cd: d.cd })}
                onClick={(e) => { e.stopPropagation(); select({ district: d.cd }); }}
              />
            ))}
            {sel && <path d={sel.d} fill="none" stroke="#fff" strokeWidth={2.2} strokeLinejoin="round" className="pointer-events-none drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]" />}
            {LABELS.map(([n, x, y]) => (
              <text key={n} x={x} y={y} textAnchor="middle" className="pointer-events-none fill-white/30 font-mono text-[13px] tracking-[0.22em] uppercase">{n}</text>
            ))}
          </svg>
        </div>
        {tip && hovered && (
          <div className="pointer-events-none fixed z-50 rounded-md border border-line-strong bg-raised px-2.5 py-1.5 text-[12px] shadow-xl" style={{ left: tip.x + 14, top: tip.y + 14 }}>
            {hovered.name}
            {!hovered.park && <span className="tnum ml-2 font-mono text-muted">{Math.round(sentimentOf(world, hovered.cd))}%</span>}
          </div>
        )}
        <Dock label={sel ? sel.name : "Select a district to act there"}>
          {sel && !sel.park && (
            <>
              <DockButton primary icon={<DoorOpen />} label="Door knocking" sub="$1,200 · half day" onClick={() => act("Door knocking", 1200, 5)} />
              <DockButton icon={<Megaphone />} label="Rally" sub="$4,000 · evening" onClick={() => act("Rally", 4000, 8)} />
              <DockButton icon={<HandCoins />} label="Fundraiser" sub="$2,500 · raises $6k" onClick={() => act("Fundraiser", 2500, 1, 6000)} />
              <DockButton icon={<UserRound />} label="Send an organizer" sub="via Field Director" onClick={() => { select({ person: "fd" }); go("war"); }} />
            </>
          )}
        </Dock>
      </section>

      <Inspector>
        {sel ? <DistrictPanel cd={sel.cd} /> : <CityPanel />}
      </Inspector>
    </div>
  );
}

function CityPanel() {
  const world = useGame();
  const select = useGame((s) => s.select);
  const ranked = DISTRICTS.filter((d) => !d.park).map((d) => ({ d, v: sentimentOf(world, d.cd) })).sort((a, b) => b.v - a.v);
  const list = (rows: typeof ranked) =>
    rows.map(({ d, v }) => (
      <button key={d.cd} onClick={() => select({ district: d.cd })} className="-mx-2 flex w-[calc(100%+16px)] items-center gap-3 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-hover">
        <i className="size-2 shrink-0 rounded-sm" style={{ background: heat(v) }} />
        <span className="min-w-0 flex-1 truncate text-[13px] text-soft">{d.name}</span>
        <span className="tnum font-mono text-[12px] text-muted">{Math.round(v)}%</span>
      </button>
    ));
  return (
    <>
      <Section title="Reading the map">
        <p className="text-[12.5px] leading-relaxed text-muted">Click a district to see who lives there, what they are complaining about, and what you can do there.</p>
        <div className="mt-3 space-y-2 text-[12px] text-soft">
          <div className="flex items-start gap-2"><Tag kind="real" /><span>Boundaries, names and 311 complaints. NYC Open Data, {FETCHED}.</span></div>
          <div className="flex items-start gap-2"><Tag kind="sim" /><span>How each district feels about your candidate.</span></div>
        </div>
      </Section>
      <Section title="Strongest districts" right={<Tag kind="sim" />}>{list(ranked.slice(0, 5))}</Section>
      <Section title="Weakest districts" right={<Tag kind="sim" />}>{list(ranked.slice(-5).reverse())}</Section>
    </>
  );
}

function DistrictPanel({ cd }: { cd: number }) {
  const world = useGame();
  const d = districtBy(cd)!;
  const v = Math.round(sentimentOf(world, cd));
  const max = d.issues[0]?.[1] ?? 1;
  const top = [...world.factions].sort((a, b) => hash(cd, b.size) - hash(cd, a.size)).slice(0, 3);
  return (
    <>
      <div className="border-b border-line px-5 py-5">
        <Label>{d.boro} · Community District {d.num}</Label>
        <h2 className="mt-1.5 text-[17px] leading-snug font-medium tracking-tight">{d.name}</h2>
      </div>
      {d.park ? (
        <Section title="No voters"><p className="text-[12.5px] text-muted">Park or airport land. Nobody votes from here.</p></Section>
      ) : (
        <Section title="Support for Cole" right={<Tag kind="sim" />}>
          <div className="flex items-baseline gap-2">
            <span className="tnum font-mono text-[30px] leading-none font-medium tracking-tight" style={{ color: tone(v) }}>{v}%</span>
            <span className="text-[12px] text-muted">{world.filter === "all" ? "of all voters" : `of ${world.factions.find((f) => f.id === world.filter)?.name.toLowerCase()}`}</span>
          </div>
          <Meter value={v} color={tone(v)} className="mt-3" />
        </Section>
      )}
      <Section title="What residents report" right={<Tag kind="real" />}>
        {d.issues.length ? (
          <div className="space-y-2.5">
            {d.issues.map(([name, n]) => (
              <div key={name}>
                <div className="flex justify-between gap-3 text-[13px]"><span className="truncate text-soft capitalize">{name.toLowerCase()}</span><span className="tnum font-mono text-[12px] text-muted">{n.toLocaleString("en-US")}</span></div>
                <Meter value={(n / max) * 100} color="rgb(255 255 255 / .5)" className="mt-1.5" />
              </div>
            ))}
            <p className="pt-1 text-[11.5px] text-faint">311 service requests, last 30 days.</p>
          </div>
        ) : <p className="text-[12.5px] text-faint">No reports.</p>}
      </Section>
      {!d.park && (
        <>
          <Section title="Who lives here">
            <dl className="space-y-1.5 text-[13px]">
              {["Median income", "Renters", "Median age", "Speaks another language"].map((k) => (
                <div key={k} className="flex justify-between"><dt className="text-muted">{k}</dt><dd className="font-mono text-faint">—</dd></div>
              ))}
            </dl>
            <p className="mt-2 text-[11.5px] text-faint">Census data is not connected yet.</p>
          </Section>
          <Section title="Strongest factions here" right={<Tag kind="sim" />}>
            <div className="flex flex-wrap gap-1.5">
              {top.map((f) => <span key={f.id} className="rounded-full border border-line px-2.5 py-0.5 text-[12px] text-soft">{f.name}</span>)}
            </div>
          </Section>
        </>
      )}
    </>
  );
}
