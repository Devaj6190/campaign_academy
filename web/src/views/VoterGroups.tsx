"use client";

import { ArrowRight } from "lucide-react";
import { Inspector, Label, Meter, Section, Tag, ViewHeader } from "@/components/ui";
import { useCase, useCaseNow, worldAt } from "@/lib/cases/store";
import { DISTRICTS } from "@/lib/geo";
import { useGame } from "@/lib/store";
import { Claims } from "./CaseView";

// The voter groups the case tracks: your support in each, how your decisions have moved it, and where the
// census says each group lives. Support is simulated; where people live is real.

export function VoterGroups() {
  const { c, w, step } = useCaseNow();
  const picks = useCase((s) => s.picks);
  const go = useGame((s) => s.go);
  const select = useGame((s) => s.select);
  const arrived = Math.min(Math.max(step - 1, 0), c.decisions.length); // decisions the student has arrived at
  const mine = w.poll[c.follow] ?? 0;

  // Support at the briefing, on arriving at each decision reached, and now.
  const path = (id: string) => {
    const pts = [c.start.groups[id] ?? 0, ...Array.from({ length: arrived }, (_, i) => worldAt(c, picks, i + 1).groups[id] ?? 0)];
    const now = w.groups[id] ?? 0;
    return pts[pts.length - 1] === now ? pts : [...pts, now];
  };
  const homes = (census: "white" | "black" | "asian" | "hispanic") =>
    DISTRICTS.filter((d) => d.demo && !d.park).sort((a, b) => b.demo!.race[census] - a.demo!.race[census]).slice(0, 4);

  return (
    <div className="flex h-full">
      <section className="flex min-w-0 flex-1 flex-col">
        <ViewHeader title="Voter groups" sub="The groups this case follows. Your support in each moves with your decisions; where each group lives decides how the map responds." />
        <div className="min-h-0 flex-1 overflow-y-auto border-t border-line px-8 pt-6 pb-16">
          <div className="grid max-w-[900px] gap-4 md:grid-cols-2">
            {c.groups.map((g) => {
              const pts = path(g.id);
              const now = pts[pts.length - 1];
              const moved = now - pts[0];
              return (
                <div key={g.id} className="rounded-xl border border-line bg-surface p-5">
                  <div className="flex items-baseline justify-between gap-3">
                    <h2 className="font-serif text-[22px] leading-tight">{g.name}</h2>
                    <span className="tnum font-mono text-[26px] leading-none font-medium">{Math.round(now)}%</span>
                  </div>
                  <Meter value={now * 2} color={now >= mine ? "var(--color-warm)" : "var(--color-cool)"} className="mt-3" />
                  <div className="mt-2 flex justify-between text-[12px] text-muted">
                    <span>{now >= mine ? "Above" : "Below"} your citywide {Math.round(mine)}%</span>
                    <span className={moved > 0 ? "text-pos" : moved < 0 ? "text-neg" : ""}>{moved ? `${moved > 0 ? "+" : "−"}${Math.abs(Math.round(moved))} since the briefing` : "Unchanged since the briefing"}</span>
                  </div>
                  <div className="mt-4">
                    <Label>Your path</Label>
                    <div className="tnum mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 font-mono text-[12.5px] text-soft">
                      {pts.map((v, i) => <span key={i} className="flex items-center gap-1.5">{i > 0 && <ArrowRight className="size-3 text-faint" />}<span className={i === pts.length - 1 ? "text-fg" : ""}>{Math.round(v)}</span></span>)}
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="flex items-center justify-between"><Label>Where they live</Label>{g.census && <Tag kind="real" />}</div>
                    {g.census ? (
                      <ul className="mt-1.5">
                        {homes(g.census).map((d) => (
                          <li key={d.cd}>
                            <button onClick={() => { select({ district: d.cd }); go("map"); }} className="-mx-2 flex w-[calc(100%+16px)] items-center justify-between gap-3 rounded-md px-2 py-1 text-left text-[12.5px] text-soft transition-colors hover:bg-hover hover:text-fg">
                              <span className="min-w-0 truncate">{d.name}</span>
                              <span className="tnum shrink-0 font-mono text-[11.5px] text-muted">{Math.round(d.demo!.race[g.census!])}% of residents</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : <p className="mt-1.5 text-[12.5px] text-muted">The census does not record this group, so it is not placed on the map.</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <Inspector>
        <Section title="Reading this screen">
          <div className="space-y-2 text-[12px] text-soft">
            <div className="flex items-start gap-2"><Tag kind="sim" /><span>Your support in each group. It moves with your decisions and is fitted so the real campaign&rsquo;s choices end near the real result.</span></div>
            <div className="flex items-start gap-2"><Tag kind="real" /><span>Where each group lives: census estimates by community district. These are current figures, not 2013.</span></div>
          </div>
        </Section>
        <Section title="What the starting numbers rest on">
          <Claims c={c} items={c.start.basis} />
        </Section>
      </Inspector>
    </div>
  );
}
