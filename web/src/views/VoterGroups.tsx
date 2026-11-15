"use client";

import { motion } from "motion/react";
import { ArrowRight, BookOpen, Map as MapIcon } from "lucide-react";
import { useState } from "react";
import { Fit } from "@/components/Fit";
import { Dock, DockButton, Inspector, Label, Meter, Section, Tag, ViewHeader } from "@/components/ui";
import { FACTION_POLLS, FACTIONS_2013, factionNow, type Faction } from "@/lib/cases/mayor2013-factions";
import { useCase, useCaseNow, worldAt } from "@/lib/cases/store";
import { DISTRICTS } from "@/lib/geo";
import { useGame } from "@/lib/store";
import { cn } from "@/lib/util";

// Factions: who the primary's voters are, how big each group is, and where you stand with them.
// Sizes and the February and September figures are real poll numbers (lib/cases/mayor2013-factions).
// Where you stand now is simulated: the case's own groups move decision by decision, the rest move with your
// citywide standing.

// Bubble positions: seeded on a grid in list order (so each kind sits together), then pushed apart once so
// circles never overlap. Radius follows the group's share of likely voters.
const W = 980, H = 560, GAP = 10, COLS = 6;
const POS = (() => {
  const p = FACTIONS_2013.map((f, i) => ({ id: f.id, x: 110 + (i % COLS) * 152 + (Math.floor(i / COLS) % 2) * 56, y: 86 + Math.floor(i / COLS) * 132, r: 30 + Math.sqrt(f.share / 100) * 46 }));
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

// Warm where you run ahead of your citywide figure, cool where you trail it by two points or more.
const tint = (support: number, citywide: number) => (support >= citywide + 2 ? "var(--color-warm)" : support <= citywide - 2 ? "var(--color-cool)" : "var(--color-soft)");
const word = (support: number, citywide: number) => (support >= citywide + 2 ? "Ahead" : support <= citywide - 2 ? "Behind" : "Level");

export function VoterGroups() {
  const { c, w, step } = useCaseNow();
  const picks = useCase((s) => s.picks);
  const go = useGame((s) => s.go);
  const select = useGame((s) => s.select);
  const [picked, setPicked] = useState<string | null>(null);
  const mine = w.poll[c.follow] ?? 0, mineStart = c.start.poll[c.follow] ?? 0;
  const now = (f: Faction) => factionNow(f, w.groups, mine, mineStart);
  const sel = FACTIONS_2013.find((f) => f.id === picked) ?? null;

  return (
    <div className="flex h-full">
      <section className="@container relative flex min-w-0 flex-1 flex-col">
        <ViewHeader title="Factions" sub="Who the primary's voters are. Circle size is each group's share of likely voters; colour shows whether you run ahead of or behind your citywide figure there." />
        <div className="relative min-h-0 flex-1 px-6 pb-24" onClick={() => setPicked(null)}>
          <div className="dots pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black,transparent_78%)]" />
          <Fit w={W} h={H}>
            {FACTIONS_2013.map((f, i) => {
              const p = POS[f.id], v = now(f), col = tint(v, mine), on = f.id === picked;
              const dim = sel && !on && sel.kind !== f.kind;
              return (
                <motion.button
                  key={f.id}
                  initial={{ opacity: 0, scale: 0.94 }}
                  animate={{ opacity: dim ? 0.35 : 1, scale: 1 }}
                  whileHover={{ scale: 1.03 }}
                  transition={{ duration: 0.35, delay: i * 0.015, ease: [0.22, 1, 0.36, 1] }}
                  onClick={(e) => { e.stopPropagation(); setPicked(on ? null : f.id); }}
                  aria-pressed={on}
                  className={cn("absolute grid place-items-center rounded-full border bg-bg text-center transition-[border-color,box-shadow] duration-300", on && "shadow-[0_0_0_1.5px_var(--color-gold-bright)]")}
                  style={{
                    left: p.x - p.r, top: p.y - p.r, width: p.r * 2, height: p.r * 2,
                    borderColor: `color-mix(in srgb, ${col} ${on ? 0 : 45}%, transparent)`,
                    backgroundImage: `radial-gradient(circle at 50% 30%, color-mix(in srgb, ${col} 18%, transparent), color-mix(in srgb, ${col} 5%, transparent))`,
                  }}
                >
                  <span className="px-2">
                    <span className={cn("block leading-tight font-medium", p.r > 60 ? "text-[13.5px]" : "text-[11.5px]")}>{f.name}</span>
                    <span className="tnum mt-0.5 block font-mono text-[13px]" style={{ color: col }}>{Math.round(v)}%</span>
                    <span className="tnum block font-mono text-[9.5px] text-faint">{f.share}% of voters</span>
                  </span>
                </motion.button>
              );
            })}
          </Fit>
          <div className="pointer-events-none absolute bottom-24 left-7 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted">
            <span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-warm" />Ahead of your citywide {Math.round(mine)}%</span>
            <span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-cool" />Behind it</span>
            <span>A voter belongs to several groups at once, so shares do not add to 100.</span>
          </div>
        </div>
        <Dock label={sel ? sel.name : "Select a group to read where you stand with it."}>
          <DockButton primary icon={<BookOpen />} label="Back to the case" onClick={() => go("case")} />
          <DockButton icon={<MapIcon />} label="Open the map" onClick={() => go("map")} />
        </Dock>
      </section>

      <Inspector>
        {sel ? (
          <One f={sel} now={now(sel)} mine={mine} path={sel.tracks ? pathOf(c, picks, w, step, sel.tracks) : null} census={c.groups.find((g) => g.id === sel.tracks)?.census} toDistrict={(cd) => { select({ district: cd }); go("map"); }} />
        ) : (
          <>
            <Section title="Reading factions">
              <div className="space-y-2 text-[12px] leading-relaxed text-soft">
                <div className="flex items-start gap-2"><Tag kind="real" /><span>Group sizes, and where de Blasio stood with each in February and September 2013, are from two Marist polls.</span></div>
                <div className="flex items-start gap-2"><Tag kind="sim" /><span>Where you stand now follows your decisions. Race and union households move decision by decision; the other groups move with your citywide standing.</span></div>
              </div>
            </Section>
            <Section title="All factions">
              <div className="-mx-2">
                {[...FACTIONS_2013].sort((a, b) => now(b) - now(a)).map((f) => (
                  <button key={f.id} onClick={() => setPicked(f.id)} className="block w-full rounded-md px-2 py-2 text-left transition-colors hover:bg-hover">
                    <div className="flex justify-between text-[13px]"><span className="text-soft">{f.name}</span><span className="tnum font-mono text-[11.5px]" style={{ color: tint(now(f), mine) }}>{Math.round(now(f))}%</span></div>
                    <Meter value={now(f) * 2} color={tint(now(f), mine)} className="mt-1.5" />
                  </button>
                ))}
              </div>
            </Section>
          </>
        )}
      </Inspector>
    </div>
  );
}

type CaseNow = ReturnType<typeof useCaseNow>;

/** Support in one of the case's own groups: at the briefing, on arriving at each decision reached, and now. */
function pathOf(c: CaseNow["c"], picks: ReturnType<typeof useCase.getState>["picks"], w: CaseNow["w"], step: number, id: string): number[] {
  const arrived = Math.min(Math.max(step - 1, 0), c.decisions.length);
  const pts = [c.start.groups[id] ?? 0, ...Array.from({ length: arrived }, (_, i) => worldAt(c, picks, i + 1).groups[id] ?? 0)];
  const now = w.groups[id] ?? 0;
  return pts[pts.length - 1] === now ? pts : [...pts, now];
}

function One({ f, now, mine, path, census, toDistrict }: { f: Faction; now: number; mine: number; path: number[] | null; census?: "white" | "black" | "asian" | "hispanic"; toDistrict: (cd: number) => void }) {
  const col = tint(now, mine);
  const homes = census ? DISTRICTS.filter((d) => d.demo && !d.park).sort((a, b) => b.demo!.race[census] - a.demo!.race[census]).slice(0, 4) : [];
  return (
    <>
      <Section title={f.name} right={<span className="text-[11.5px] text-muted">{f.kind}</span>}>
        <div className="flex items-end justify-between">
          <div>
            <div className="text-[15px] font-medium" style={{ color: col }}>{word(now, mine)} <span className="text-[12px] font-normal text-muted">of your citywide {Math.round(mine)}%</span></div>
            <div className="mt-0.5 flex items-center gap-2 text-[11.5px] text-muted"><Tag kind="sim" />Where you stand now</div>
          </div>
          <span className="tnum font-mono text-[30px] leading-none font-medium" style={{ color: col }}>{Math.round(now)}%</span>
        </div>
        <Meter value={now * 2} color={col} className="mt-3" />
        {path && (
          <div className="mt-4">
            <Label>Your path, decision by decision</Label>
            <div className="tnum mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 font-mono text-[12.5px] text-soft">
              {path.map((v, i) => <span key={i} className="flex items-center gap-1.5">{i > 0 && <ArrowRight className="size-3 text-faint" />}<span className={i === path.length - 1 ? "text-fg" : ""}>{Math.round(v)}</span></span>)}
            </div>
          </div>
        )}
        {!path && <p className="mt-3 text-[12px] leading-relaxed text-muted">This group moves with your citywide standing: gain citywide and you gain here in proportion to how far the real campaign moved this group.</p>}
      </Section>
      <Section title="What the polls recorded" right={<Tag kind="real" />}>
        <dl className="space-y-3 text-[12.5px]">
          <Row label="February 2013" value={`${f.feb}%`} note={`De Blasio's share in this group. Citywide he had ${FACTION_POLLS.feb.citywide}%.`} src={FACTION_POLLS.feb} />
          <Row label="September 2013" value={`${f.sep}%`} note={`The week before the primary. Citywide he had ${FACTION_POLLS.sep.citywide}%.`} src={FACTION_POLLS.sep} />
          <Row label="Share of likely voters" value={`${f.share}%`} note="Of the September poll's likely Democratic primary voters." src={FACTION_POLLS.sep} />
        </dl>
        <p className="mt-3 text-[11.5px] leading-relaxed text-faint">February asked registered Democrats and September asked likely voters, so the two are not strictly comparable.</p>
      </Section>
      {census && (
        <Section title="Where they live" right={<Tag kind="real" />}>
          <ul>
            {homes.map((d) => (
              <li key={d.cd}>
                <button onClick={() => toDistrict(d.cd)} className="-mx-2 flex w-[calc(100%+16px)] items-center justify-between gap-3 rounded-md px-2 py-1 text-left text-[12.5px] text-soft transition-colors hover:bg-hover hover:text-fg">
                  <span className="min-w-0 truncate">{d.name}</span>
                  <span className="tnum shrink-0 font-mono text-[11.5px] text-muted">{Math.round(d.demo!.race[census])}% of residents</span>
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[11.5px] text-faint">Census estimates by community district. Current figures, not 2013.</p>
        </Section>
      )}
    </>
  );
}

const Row = ({ label, value, note, src }: { label: string; value: string; note: string; src: { label: string; url: string } }) => (
  <div>
    <div className="flex items-baseline justify-between"><dt className="text-soft">{label}</dt><dd className="tnum font-mono text-[14px]">{value}</dd></div>
    <p className="mt-0.5 text-[11.5px] leading-relaxed text-muted">{note} <a href={src.url} target="_blank" rel="noreferrer" title={src.label} className="text-gold underline decoration-gold/40 hover:text-gold-bright">Source</a></p>
  </div>
);
