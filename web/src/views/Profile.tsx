"use client";

import { ArrowRight, BookOpen, Map as MapIcon } from "lucide-react";
import { Dock, DockButton, Inspector, Label, Section } from "@/components/ui";
import { ShaderBackground } from "@/components/ui21/dithering";
import { useCase, useCaseNow } from "@/lib/cases/store";
import { useGame } from "@/lib/store";
import { Claims } from "./CaseView";
import { PlankDesk } from "@/components/PlankDesk";
import { PlatformSection } from "./Platform";

// The real candidate and race of the current case. Everything here is read from the case file; the only
// simulated numbers are the student's own standing and money, which follow their decisions so far.

const money = (n: number) => (n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : `$${Math.round(n / 1000)}k`);

export function Profile() {
  const go = useGame((s) => s.go);
  // The platform shows what was on record by the step the campaign has reached.
  const { c, w, step, daysLeft } = useCaseNow();
  const picks = useCase((s) => s.picks);
  const me = c.candidates.find((x) => x.id === c.follow)!;
  const rivals = c.candidates.filter((x) => x.id !== c.follow);
  const work = useCase((s) => s.work);
  const lastMove = (id: string) => [...work].reverse().find((x) => x.by === id)?.note;

  // No poll figures here: the student reads polls in the morning paper, on the mornings it carries one.
  const stats: [string, string, string][] = [
    ["Days left", String(daysLeft), `Primary on ${new Date(c.electionDate).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}`],
    ["Money left", money(Math.max(0, w.budget)), "To spend under the cap"],
    ["To win outright", `${c.threshold}%`, "Below it, a runoff"],
  ];

  return (
    <div className="flex h-full">
      <section className="@container relative flex min-w-0 flex-1 flex-col">
        <div className="flex-1 overflow-y-auto px-10 pt-12 pb-28">
          <div className="mx-auto max-w-[800px]">
            <div className="grid grid-cols-[176px_1fr] items-end gap-9">
              <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-line bg-gradient-to-b from-[#1b1b20] to-[#0c0c0e]">
                <div className="absolute inset-0 opacity-45 [mask-image:linear-gradient(to_top,black,transparent_85%)]"><ShaderBackground /></div>
                <span className="absolute inset-0 grid place-items-center font-serif text-[64px] text-white/70 mix-blend-overlay">{me.name.split(" ").map((p) => p[0]).join("")}</span>
              </div>
              <div className="pb-1">
                <Label>The campaign you run</Label>
                <h1 className="mt-2 font-serif text-[64px] leading-[0.95] tracking-tight">{me.name}</h1>
                <p className="mt-3 text-[14px] text-soft">{me.standing}. Running for {c.office}.</p>
              </div>
            </div>

            <div className="mt-9 grid grid-cols-3 divide-x divide-line rounded-xl border border-line bg-surface">
              {stats.map(([k, v, sub]) => (
                <div key={k} className="px-5 py-4">
                  <Label>{k}</Label>
                  <div className="tnum mt-1.5 font-mono text-[22px] font-medium tracking-tight">{v}</div>
                  <div className="text-[11.5px] text-faint">{sub}</div>
                </div>
              ))}
            </div>
            <p className="mt-2 text-[11.5px] text-faint">Money follows your decisions so far and is simulated. Everything else on this page is from the record.</p>

            <div className="mt-8"><Claims c={c} items={me.about} /></div>

            <div className="mt-10"><PlatformSection c={c} step={step} picks={picks} /></div>
            <div className="mt-10"><PlankDesk /></div>
          </div>
        </div>
        <Dock>
          <DockButton primary icon={<BookOpen />} label="Back to the case" onClick={() => go("case")} />
          <DockButton icon={<MapIcon />} label="Map" onClick={() => go("map")} />
          <DockButton icon={<ArrowRight />} label="War room" onClick={() => go("war")} />
        </Dock>
      </section>

      <Inspector>
        <Section title="Opponents">
          <div className="space-y-2">
            {rivals.map((o) => (
              <div key={o.id} className="rounded-lg border border-line bg-raised p-3">
                <div className="text-[13px] font-medium">{o.name}</div>
                <div className="text-[11.5px] text-muted">{o.standing}</div>
                {lastMove(o.id) && <div className="mt-1.5 text-[11.5px] leading-snug text-soft">Latest move (simulated): {lastMove(o.id)!.replace(`${o.name}: `, "")}</div>}
              </div>
            ))}
          </div>
        </Section>
      </Inspector>
    </div>
  );
}
