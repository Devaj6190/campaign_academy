"use client";

import { ChevronDown, MapPin, Megaphone, MessageSquare, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button, Label, Popover, Tag } from "@/components/ui";
import type { Edition, Story } from "@/lib/paper/edition";
import { markRead, respond } from "@/lib/paper/run";
import { appearancesToday, DAILY } from "@/lib/candidate";
import { useGame } from "@/lib/store";
import { cn } from "@/lib/util";
import { CANDIDATES } from "@/lib/scenario";

// The Five Borough Ledger. A broadsheet in four sections, with every past edition one click away.
// It never opens itself: it arrives as a chip in the top bar.

const TABS = ["Front page", "City", "Polls", "Opinion"] as const;
type Tab = (typeof TABS)[number];
const KIND: Record<Edition["kind"], string> = { daily: "Morning edition", debate: "Debate night extra", eve: "Election eve", result: "Election night extra" };

export function PaperView({ close }: { close: () => void }) {
  const editions = useGame((s) => s.editions);
  const index = useGame((s) => s.paperIndex);
  const e = editions[index ?? editions.length - 1];
  const [tab, setTab] = useState<Tab>("Front page");
  useEffect(() => { if (e) markRead(e); }, [e]);
  if (!e) return <div className="p-10 text-[13px] text-muted">The first edition is on its way.</div>;

  return (
    <div className="flex max-h-[88vh] flex-col">
      <header className="shrink-0 px-10 pt-8">
        <div className="tnum flex items-center justify-between gap-4 pr-8 font-mono text-[10.5px] tracking-[0.14em] text-faint uppercase">
          <span>Day {e.day} · {30 - e.day} days to the election</span>
          <span className={cn(e.kind !== "daily" && "text-warm")}>{KIND[e.kind]}</span>
          <Archive current={e} />
        </div>
        <h1 className="mt-3 border-y border-line-strong py-3 text-center font-serif text-[46px] leading-none tracking-tight">The Five Borough Ledger</h1>
        <nav className="mt-3 flex items-center justify-center gap-1 border-b border-line pb-2">
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)} className={cn("rounded-md px-3 py-1 font-serif text-[15px] transition-colors", tab === t ? "bg-white/[0.08] text-fg" : "text-muted hover:text-fg")}>{t}</button>
          ))}
        </nav>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-10 pt-6 pb-8">
        {tab === "Front page" && <Front e={e} close={close} />}
        {tab === "City" && <City e={e} close={close} />}
        {tab === "Polls" && <Polls e={e} />}
        {tab === "Opinion" && <Opinion e={e} />}
        <p className="mt-8 border-t border-line pt-3 text-[11px] text-faint">
          {e.mode === "live" ? "Written by the Ledger's AI newsroom from the day's record; every figure is checked against it." : "Filed from the day's record."} The Ledger is fictional and nonpartisan. Polls carry a margin of error.
        </p>
      </div>
    </div>
  );
}

function Archive({ current }: { current: Edition }) {
  const editions = useGame((s) => s.editions);
  return (
    <div className="h-6">
      <Popover
        align="end"
        className="max-h-[320px] w-56 overflow-y-auto p-1.5"
        trigger={() => <button className="flex items-center gap-1 text-faint transition-colors hover:text-fg">Archive <ChevronDown className="size-3" /></button>}
      >
        {[...editions].map((x, i) => ({ x, i })).reverse().map(({ x, i }) => (
          <button key={`${x.day}-${x.kind}`} onClick={() => useGame.setState({ paperIndex: i === editions.length - 1 ? null : i })} className={cn("flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-[12px] normal-case tracking-normal transition-colors hover:bg-hover", x === current ? "text-fg" : "text-soft")}>
            <span className="truncate font-sans">Day {x.day} · {x.lead.headline}</span>
            {x.kind !== "daily" && <span className="ml-2 shrink-0 font-sans text-[10px] text-warm">{KIND[x.kind].split(" ")[0]}</span>}
          </button>
        ))}
      </Popover>
    </div>
  );
}

const Body = ({ s, big }: { s: Story; big?: boolean }) => (
  <article>
    <Label>{s.kicker}</Label>
    <h3 className={cn("mt-1.5 font-serif leading-[1.1] tracking-tight", big ? "text-[34px]" : "text-[21px]")}>{s.headline}</h3>
    <p className={cn("mt-2 leading-relaxed text-soft", big ? "text-[14.5px]" : "text-[13px]")}>{s.body}</p>
  </article>
);

function Front({ e, close }: { e: Edition; close: () => void }) {
  const isLatest = useGame((s) => s.editions[s.editions.length - 1] === e);
  const left = useGame((s) => DAILY - appearancesToday(s));
  const go = useGame((s) => s.go);
  const select = useGame((s) => s.select);
  const [note, setNote] = useState("");
  const r = e.lead.respond;
  const p = e.polls.latest;
  return (
    <>
      <div className="grid grid-cols-3 gap-8">
        <div className="col-span-2">
          <Body s={e.lead} big />
          {r && isLatest && !e.decision && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button size="sm" variant="primary" disabled={left <= 0} title={left <= 0 ? "No appearances left today" : undefined} onClick={() => setNote(respond(e, "statement"))}>
                <Megaphone className="size-3.5" />{r.kind === "attack" ? "Cole hits back" : "Cole responds"} · {left}/{DAILY} left
              </Button>
              <Button size="sm" onClick={() => { respond(e, "staff"); close(); }}><MessageSquare className="size-3.5" />Hand it to Comms</Button>
              <Button size="sm" variant="ghost" onClick={() => setNote(respond(e, "pass"))}><X className="size-3.5" />Let it pass</Button>
            </div>
          )}
          {(note || e.decision) && <p className="mt-3 text-[12px] text-muted">{note || (e.decision === "respond" ? "Cole responded." : e.decision === "staff" ? "Handed to Leo." : "The campaign let it pass.")}</p>}
          {e.lead.cd && <button onClick={() => { select({ district: e.lead.cd! }); go("map"); close(); }} className="mt-3 flex items-center gap-1 text-[12px] text-muted hover:text-fg"><MapPin className="size-3.5" />See it on the map</button>}
        </div>
        <aside className="border-l border-line pl-6">
          <Label>The race</Label>
          <PollBars p={p} />
          <p className="mt-2 text-[11px] text-faint">{p.pollster}, day {p.day} · {p.n.toLocaleString("en-US")} likely voters · ±{p.moe}</p>
          {!e.polls.fresh && <p className="mt-1 text-[11px] text-faint">No new poll today.</p>}
        </aside>
      </div>
      <div className="mt-8 grid grid-cols-2 gap-8 border-t border-line pt-6">
        <Body s={e.campaign} />
        <Body s={e.opposition} />
      </div>
    </>
  );
}

// Everyone who has a share in the poll, as [short name, id, colour].
const rowsOf = (polls: { shares: Record<string, number> }[]) => CANDIDATES.filter((c) => polls.some((p) => (p.shares[c.id] ?? 0) > 0)).map((c) => [c.short, c.id, c.color] as const);

function PollBars({ p }: { p: Edition["polls"]["latest"] }) {
  return (
    <div className="mt-3 space-y-2.5">
      {rowsOf([p]).map(([n, k, c]) => (
        <div key={k} className="text-[13px]">
          <div className="flex justify-between"><span className="text-soft">{n}</span><span className="tnum font-mono text-[12px]">{p.shares[k] ?? 0}%</span></div>
          {/* The bar with its margin of error as a faint band around the end. */}
          <div className="relative mt-1 h-1.5 rounded-full bg-white/[0.06]">
            <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${(p.shares[k] ?? 0) * 2}%`, background: c }} />
            <div className="absolute inset-y-[-2px] rounded-sm bg-white/15" style={{ left: `${Math.max(0, (p.shares[k] ?? 0) - p.moe) * 2}%`, width: `${p.moe * 4}%` }} />
          </div>
        </div>
      ))}
      <div className="flex justify-between text-[12px] text-muted"><span>Undecided</span><span className="tnum font-mono">{p.undecided}%</span></div>
    </div>
  );
}

function City({ e, close }: { e: Edition; close: () => void }) {
  const go = useGame((s) => s.go);
  const select = useGame((s) => s.select);
  return (
    <div className="grid gap-6 md:grid-cols-3">
      {e.city.map((s) => (
        <div key={s.cd ?? s.headline} className="flex flex-col rounded-xl border border-line bg-raised p-4">
          <div className="flex items-center gap-2"><Label>{s.kicker}</Label><Tag kind="real" /></div>
          <h3 className="mt-1.5 font-serif text-[19px] leading-tight">{s.headline}</h3>
          <p className="mt-2 flex-1 text-[12.5px] leading-relaxed text-soft">{s.body}</p>
          {s.cd && <Button size="sm" className="mt-3 self-start" onClick={() => { select({ district: s.cd! }); go("map"); close(); }}><MapPin className="size-3.5" />See on map</Button>}
        </div>
      ))}
    </div>
  );
}

function Polls({ e }: { e: Edition }) {
  const polls = useGame((s) => s.polls);
  const all = useMemo(() => polls.filter((p) => p.day <= e.day), [polls, e.day]);
  const factions = useGame((s) => s.factions);
  const p = e.polls.latest;
  const prev = e.polls.previous;
  // Trend: one point per published poll for each candidate.
  const W = 520, H = 140, lo = 0, hi = 55;
  const x = (i: number) => (all.length < 2 ? W / 2 : (i / (all.length - 1)) * W);
  const y = (v: number) => H - ((v - lo) / (hi - lo)) * H;
  return (
    <div className="grid grid-cols-5 gap-8">
      <div className="col-span-3">
        <Label>Every poll so far</Label>
        <svg viewBox={`0 0 ${W + 70} ${H + 18}`} className="mt-3 w-full overflow-visible">
          {[10, 20, 30, 40, 50].map((v) => <line key={v} x1={0} x2={W} y1={y(v)} y2={y(v)} stroke="rgb(255 255 255 / .06)" />)}
          {rowsOf(all).map(([n, k, c]) => (
            <g key={k}>
              <path d={"M" + all.map((q, i) => `${x(i)} ${y(q.shares[k] ?? 0)}`).join("L")} fill="none" stroke={c} strokeWidth={1.8} />
              {all.map((q, i) => <circle key={i} cx={x(i)} cy={y(q.shares[k] ?? 0)} r={2.5} fill={c} />)}
              <text x={x(all.length - 1) + 8} y={y(all[all.length - 1].shares[k] ?? 0) + 3} fill={c} className="font-mono text-[10px]">{n} {all[all.length - 1].shares[k] ?? 0}</text>
            </g>
          ))}
          {all.map((q, i) => <text key={q.day} x={x(i)} y={H + 14} textAnchor="middle" className="fill-[var(--color-faint)] font-mono text-[9px]">D{q.day}</text>)}
        </svg>
        <p className="mt-2 text-[11.5px] text-muted">Polls carry a margin of error of about ±3. Read the trend across several polls, not one number.</p>

        <Label className="mt-6 block">How each group feels about Cole</Label>
        <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1.5 text-[12.5px]">
          {factions.map((f) => {
            const g = p.groups[f.id], was = prev?.groups[f.id];
            return (
              <div key={f.id} className="flex justify-between gap-2">
                <span className="text-soft">{f.name}</span>
                <span className="tnum font-mono">{g?.feel ?? "–"}<span className="text-faint"> ±{g?.moe ?? 5}</span>{was && g ? <Move d={g.feel - was.feel} moe={g.moe} /> : null}</span>
              </div>
            );
          })}
        </div>
      </div>
      <div className="col-span-2">
        <Label>Latest poll</Label>
        <PollBars p={p} />
        <p className="mt-2 text-[11px] text-faint">{p.pollster}, day {p.day} · {p.n.toLocaleString("en-US")} likely voters · ±{p.moe}</p>
        <Label className="mt-6 block">{prev ? `Between the day ${prev.day} and day ${p.day} polls` : "Before the first poll"}</Label>
        <p className="mt-1 text-[11px] text-faint">What happened in between. No single event can be credited with the change.</p>
        <ul className="mt-2 space-y-1.5 text-[12px] text-soft">
          {e.polls.since.length ? e.polls.since.slice(-10).map((t, i) => <li key={i}>{t}</li>) : <li className="text-faint">Nothing on the record yet.</li>}
        </ul>
      </div>
    </div>
  );
}

// A group "moved" only when the change is bigger than its margin of error; otherwise it is within the noise.
const Move = ({ d, moe }: { d: number; moe: number }) => (
  <span className={cn("ml-1.5", d >= moe ? "text-pos" : d <= -moe ? "text-neg" : "text-faint")} title={Math.abs(d) < moe ? "Within the margin of error" : undefined}>{d >= moe ? "▲" : d <= -moe ? "▼" : "·"}</span>
);

function Opinion({ e }: { e: Edition }) {
  return (
    <div className="grid grid-cols-5 gap-8">
      <div className="col-span-3"><Body s={e.editorial} big /></div>
      <div className="col-span-2 space-y-6 border-l border-line pl-6">
        {e.letters.map((l, i) => <Body key={i} s={l} />)}
      </div>
    </div>
  );
}
