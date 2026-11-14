"use client";

import { motion } from "motion/react";
import { Map as MapIcon, ScrollText } from "lucide-react";
import { Fit } from "@/components/Fit";
import { Button, Dock, DockButton, Inspector, Label, Meter, Section, Tag, ViewHeader } from "@/components/ui";
import { FACTIONS } from "@/lib/data";
import { CITYWIDE, whereTheyLive } from "@/lib/demographics";
import { biggestReason, causes, feelHistory } from "@/lib/factionHistory";
import { districtBy } from "@/lib/geo";
import { relationsOf, strongest } from "@/lib/relations";
import { useGame } from "@/lib/store";
import { clock, cn, feelWord, tone } from "@/lib/util";

// Bubble positions: rough seeds, then pushed apart once so circles can never overlap.
// Bubble size is the group's real share of the city (census) or a labelled estimate.
const W = 900, H = 500, GAP = 16;
const radius = (id: string) => 26 + Math.sqrt(CITYWIDE[id]?.share ?? 0.1) * 75;
const SEEDS: Record<string, [number, number]> = { renters: [420, 200], homeowners: [720, 180], immigrants: [200, 350], transit: [540, 380], seniors: [760, 380], unions: [190, 160], smallbiz: [600, 250], activists: [350, 380], donors: [600, 80], students: [330, 70] };
const POS = (() => {
  const p = FACTIONS.map((f) => ({ id: f.id, x: SEEDS[f.id][0], y: SEEDS[f.id][1], r: radius(f.id) }));
  for (let n = 0; n < 400; n++)
    for (const a of p) {
      for (const b of p) {
        if (a === b) continue;
        const dx = a.x - b.x, dy = a.y - b.y, dist = Math.hypot(dx, dy) || 1, need = a.r + b.r + GAP;
        if (dist < need) { a.x += (dx / dist) * (need - dist) * 0.5; a.y += (dy / dist) * (need - dist) * 0.5; }
      }
      a.x = Math.max(a.r, Math.min(W - a.r, a.x));
      a.y = Math.max(a.r, Math.min(H - a.r, a.y));
    }
  return Object.fromEntries(p.map((x) => [x.id, x]));
})();
const LINES = strongest(8);
const pct = (x: number) => `${Math.round(x * 100)}%`;

export function Factions() {
  const factions = useGame((s) => s.factions);
  const faction = useGame((s) => s.faction);
  const select = useGame((s) => s.select);
  const open = useGame((s) => s.open);
  const go = useGame((s) => s.go);
  const sel = factions.find((f) => f.id === faction);
  const showOnMap = (id: string) => { select({ filter: id }); go("map"); };
  // With a group selected, show all of its links; otherwise only the strongest in the city.
  const lines = sel ? relationsOf(sel.id).map((r) => ({ a: sel.id, b: r.id, weight: r.weight })) : LINES;

  return (
    <div className="flex h-full">
      <section className="@container relative flex min-w-0 flex-1 flex-col">
        <ViewHeader title="Factions" sub="Who the voters are. Circle size is their real share of the city. Lines show who moves together." />
        <div className="relative min-h-0 flex-1 px-6 pb-24" onClick={() => select({ faction: null })}>
          <div className="dots pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black,transparent_78%)]" />
          <Fit w={W} h={H}>
            <svg viewBox={`0 0 ${W} ${H}`} className="pointer-events-none absolute inset-0 overflow-visible" aria-hidden>
              {lines.map(({ a, b, weight }) => {
                const p = POS[a], q = POS[b];
                return (
                  <motion.line
                    key={`${a}-${b}`}
                    x1={p.x} y1={p.y} x2={q.x} y2={q.y}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: sel ? 0.75 : 0.32 }}
                    stroke={weight > 0 ? "var(--color-warm)" : "var(--color-cool)"}
                    strokeWidth={1 + Math.abs(weight) * (sel ? 7 : 4)}
                    strokeDasharray={weight > 0 ? undefined : "5 5"}
                    strokeLinecap="round"
                  />
                );
              })}
            </svg>
            {factions.map((f, i) => {
              const p = POS[f.id], c = tone(f.feel), on = f.id === faction;
              const dim = sel && !on && !relationsOf(sel.id).some((r) => r.id === f.id);
              return (
                <motion.button
                  key={f.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: dim ? 0.35 : 1, scale: 1 }}
                  whileHover={{ scale: 1.035 }}
                  transition={{ duration: 0.4, delay: i * 0.03, ease: [0.22, 1, 0.36, 1] }}
                  onClick={(e) => { e.stopPropagation(); select({ faction: f.id }); }}
                  className={cn("absolute grid place-items-center rounded-full border bg-bg text-center transition-[border-color,box-shadow] duration-300", on && "shadow-[0_0_0_1.5px_#fff,0_0_44px_rgba(255,255,255,0.2)]")}
                  style={{
                    left: p.x - p.r, top: p.y - p.r, width: p.r * 2, height: p.r * 2,
                    borderColor: `color-mix(in srgb, ${c} ${on ? 0 : 45}%, transparent)`,
                    backgroundImage: `radial-gradient(circle at 50% 30%, color-mix(in srgb, ${c} 20%, transparent), color-mix(in srgb, ${c} 6%, transparent))`,
                  }}
                >
                  <span className="px-3">
                    <span className={cn("block leading-tight font-medium", p.r > 60 ? "text-[14px]" : "text-[12px]")}>{f.name}</span>
                    <span className="mt-0.5 block text-[10.5px]" style={{ color: c }}>{feelWord(f.feel)}</span>
                    <span className="tnum block font-mono text-[10px] text-faint">{pct(CITYWIDE[f.id]?.share ?? 0)}{CITYWIDE[f.id]?.real ? "" : "*"}</span>
                  </span>
                </motion.button>
              );
            })}
          </Fit>
          <div className="pointer-events-none absolute bottom-24 left-7 flex gap-4 text-[11px] text-muted">
            <span className="flex items-center gap-1.5"><i className="h-0.5 w-5 rounded bg-warm" />Move together</span>
            <span className="flex items-center gap-1.5"><i className="h-0 w-5 border-t-2 border-dashed border-cool" />Pull apart</span>
            <span>* estimated size</span>
          </div>
        </div>
        <Dock label={sel ? sel.name : "Read-only. Use this to write better policy."}>
          <DockButton primary icon={<ScrollText />} label={sel ? "Write policy for them" : "Open the manifesto"} onClick={() => open("manifesto")} />
          {sel && <DockButton icon={<MapIcon />} label="Show on map" onClick={() => showOnMap(sel.id)} />}
        </Dock>
      </section>

      <Inspector>{sel ? <FactionPanel id={sel.id} showOnMap={showOnMap} /> : <Overview />}</Inspector>
    </div>
  );
}

function Overview() {
  const factions = useGame((s) => s.factions);
  const select = useGame((s) => s.select);
  return (
    <>
      <Section title="Reading factions">
        <p className="text-[12.5px] leading-relaxed text-muted">You cannot change a faction from here. Read what each one values and dislikes, see why its feeling moved, and notice who moves with whom: winning one group can cost you another.</p>
      </Section>
      <Section title="All factions">
        <div className="-mx-2">
          {[...factions].sort((a, b) => (CITYWIDE[b.id]?.share ?? 0) - (CITYWIDE[a.id]?.share ?? 0)).map((f) => (
            <button key={f.id} onClick={() => select({ faction: f.id })} className="block w-full rounded-md px-2 py-2 text-left transition-colors hover:bg-hover">
              <div className="flex justify-between text-[13px]"><span className="text-soft">{f.name}</span><span className="text-[11.5px]" style={{ color: tone(f.feel) }}>{feelWord(f.feel)} · {Math.round(f.feel)}</span></div>
              <Meter value={f.feel} color={tone(f.feel)} className="mt-1.5" />
            </button>
          ))}
        </div>
      </Section>
    </>
  );
}

function Spark({ values }: { values: number[] }) {
  if (values.length < 2) return <p className="text-[11.5px] text-faint">The line fills in day by day.</p>;
  const w = 260, h = 44, lo = Math.min(...values, 40) - 2, hi = Math.max(...values, 60) + 2;
  const pts = values.map((v, i) => [(i / (values.length - 1)) * w, h - ((v - lo) / (hi - lo)) * h]);
  const last = values[values.length - 1];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-11 w-full overflow-visible">
      <line x1={0} x2={w} y1={h - ((50 - lo) / (hi - lo)) * h} y2={h - ((50 - lo) / (hi - lo)) * h} stroke="rgb(255 255 255 / .08)" strokeDasharray="3 4" />
      <path d={"M" + pts.map((p) => p.join(" ")).join("L")} fill="none" stroke={tone(last)} strokeWidth={1.6} strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r={2.6} fill={tone(last)} />
    </svg>
  );
}

function FactionPanel({ id, showOnMap }: { id: string; showOnMap: (id: string) => void }) {
  const factions = useGame((s) => s.factions);
  const ledger = useGame((s) => s.ledger);
  const staff = useGame((s) => s.staff);
  const day = useGame((s) => s.day);
  const select = useGame((s) => s.select);
  const go = useGame((s) => s.go);
  const sel = factions.find((f) => f.id === id)!;
  const names = Object.fromEntries(factions.map((f) => [f.id, f.name]));
  const list = causes(id, ledger, staff, names);
  const history = feelHistory(id, ledger, day);
  const top = biggestReason(list);
  const start = FACTIONS.find((f) => f.id === id)!.feel;
  const change = Math.round((sel.feel - start) * 10) / 10;
  const rels = relationsOf(id);
  const size = CITYWIDE[id];
  const places = whereTheyLive(id);

  return (
    <>
      <div className="border-b border-line px-5 py-5">
        <Label>Faction</Label>
        <h2 className="mt-1.5 text-[17px] font-medium tracking-tight">{sel.name}</h2>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-line bg-raised px-3 py-2.5">
            <div className="text-[15px] font-medium" style={{ color: tone(sel.feel) }}>{feelWord(sel.feel)} <span className="tnum font-mono text-[12px] text-muted">{Math.round(sel.feel)}</span></div>
            <div className="text-[11.5px] text-muted">Toward Cole{change ? <span className={change > 0 ? "text-pos" : "text-neg"}> · {change > 0 ? "+" : ""}{change} since day 1</span> : ""}</div>
          </div>
          <div className="rounded-lg border border-line bg-raised px-3 py-2.5">
            <div className="tnum text-[15px] font-medium">{pct(size?.share ?? 0)}</div>
            <div className="text-[11.5px] text-muted">{size?.basis ?? "of voters"}</div>
          </div>
        </div>
      </div>

      <Section title="How they've felt" right={<Tag kind="sim" />}>
        <Spark values={history} />
        {top && <p className="mt-2 text-[12px] text-soft">Biggest reason: <span className="text-fg">{top.who}</span> <span className={cn("tnum font-mono", top.delta >= 0 ? "text-pos" : "text-neg")}>{top.delta >= 0 ? "+" : ""}{top.delta}</span></p>}
      </Section>

      <Section title="Why it changed">
        {list.length ? (
          <ol className="space-y-2">
            {list.slice(0, 8).map((c) => (
              <li key={c.id} className="text-[12px] leading-snug">
                <div className="flex justify-between gap-2 text-[11px] text-faint">
                  <span className="tnum font-mono">Day {c.day} · {clock(c.min)}</span>
                  <span className={cn("tnum font-mono", c.delta >= 0 ? "text-pos" : "text-neg")}>{c.delta >= 0 ? "+" : ""}{c.delta}</span>
                </div>
                <p className="text-soft"><span className="text-fg">{c.who}</span> · {c.what}</p>
                {c.because && <p className="text-[11px] text-muted">Because {c.because} moved, and they move {(rels.find((r) => r.id === c.becauseId)?.weight ?? 0) > 0 ? "together" : "apart"}.</p>}
              </li>
            ))}
          </ol>
        ) : <p className="text-[12.5px] text-faint">Nothing has moved them yet. Policy, appearances and staff work all show up here.</p>}
      </Section>

      <Section title="Who they are"><p className="text-[13px] leading-relaxed text-soft">{sel.about}</p></Section>
      <Section title="What they value"><Bullets items={sel.values} color="var(--color-pos)" /></Section>
      <Section title="What they dislike"><Bullets items={sel.dislikes} color="var(--color-neg)" /></Section>

      <Section title="Who they move with">
        <div className="space-y-2">
          {rels.map((r) => (
            <div key={r.id} className="text-[12.5px]">
              <div className="flex items-center justify-between gap-2">
                <button onClick={() => select({ faction: r.id })} className="text-soft hover:text-fg hover:underline">{names[r.id]}</button>
                <span className={cn("text-[11px]", r.weight > 0 ? "text-warm" : "text-cool")}>{r.weight > 0 ? "Moves with" : "Moves against"} · {Math.round(Math.abs(r.weight) * 100)}%</span>
              </div>
              <p className="text-[11.5px] text-muted">{r.why}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Where they live" right={<Tag kind={size?.real ? "real" : "sim"} />}>
        <div className="-mx-2">
          {places.map(({ cd, share }) => (
            <button key={cd} onClick={() => { select({ district: cd, filter: id }); go("map"); }} className="flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-hover">
              <span className="min-w-0 flex-1 truncate text-[13px] text-soft">{districtBy(cd)?.name}</span>
              <span className="tnum font-mono text-[11.5px] text-muted">{pct(share)}</span>
            </button>
          ))}
        </div>
        <Button size="sm" className="mt-2" onClick={() => showOnMap(id)}><MapIcon className="size-3.5" />Show on map</Button>
      </Section>
    </>
  );
}

const Bullets = ({ items, color }: { items: string[]; color: string }) => (
  <ul className="space-y-1.5">
    {items.map((t) => (
      <li key={t} className="flex items-center gap-2.5 text-[13px] text-soft"><i className="size-1 shrink-0 rounded-full" style={{ background: color }} />{t}</li>
    ))}
  </ul>
);
