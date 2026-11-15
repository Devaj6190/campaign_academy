"use client";

import { ArrowRight, CalendarDays, Check, Lock, Newspaper, ScrollText, X } from "lucide-react";
import { PROBLEMS, RECORD } from "@/lib/data";
import { netPerDay, useGame } from "@/lib/store";
import { cn, money, moneyK } from "@/lib/util";
import { Dock, DockButton, Inspector, Label, Meter, Section } from "@/components/ui";
import { ShaderBackground } from "@/components/ui21/dithering";
import { districtBy } from "@/lib/geo";
import { activeRivals, CANDIDATES, ME, rivalDef } from "@/lib/scenario";

export function Profile() {
  const s = useGame();
  const net = netPerDay(s);
  const inRace = CANDIDATES.filter((c) => (s.poll[c.id] ?? 0) > 0).sort((a, b) => (s.poll[b.id] ?? 0) - (s.poll[a.id] ?? 0));
  const undecided = 100 - inRace.reduce((a, c) => a + (s.poll[c.id] ?? 0), 0);
  const rank = inRace.findIndex((c) => c.id === ME.id) + 1;
  const stats: [string, string, string, string?][] = [
    ["Polling", `${s.poll[ME.id] ?? 0}%`, `${rank} of ${inRace.length}`],
    ["Days left", String(30 - s.day), `Day ${s.day} of 30`],
    ["Cash", money(s.cash), "On hand"],
    ["Burn", `${net < 0 ? "−" : "+"}${moneyK(net)}`, "Per day", net < 0 ? "text-neg" : "text-pos"],
  ];
  const race: [string, number, string][] = [...inRace.map((c) => [c.name, s.poll[c.id] ?? 0, c.color] as [string, number, string]), ["Undecided", undecided, "rgb(255 255 255 / .1)"]];

  return (
    <div className="flex h-full">
      <section className="@container relative flex min-w-0 flex-1 flex-col">
        <div className="flex-1 overflow-y-auto px-10 pt-12 pb-28">
          <div className="mx-auto max-w-[800px]">
            <div className="grid grid-cols-[176px_1fr] items-end gap-9">
              <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-line bg-gradient-to-b from-[#1b1b20] to-[#0c0c0e]">
                <div className="absolute inset-0 opacity-45 [mask-image:linear-gradient(to_top,black,transparent_85%)]"><ShaderBackground /></div>
                <span className="absolute inset-0 grid place-items-center font-serif text-[72px] text-white/70 mix-blend-overlay">AC</span>
                <span className="absolute inset-x-0 bottom-3 text-center text-[10px] tracking-[0.12em] text-faint uppercase">Portrait</span>
              </div>
              <div className="pb-1">
                <Label>Your candidate</Label>
                <h1 className="mt-2 font-serif text-[64px] leading-[0.95] tracking-tight">Adrian Cole</h1>
                <p className="mt-3 text-[14px] text-soft">Council Member, western Queens. Running for Mayor of New York City.</p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {["Housing near transit", "Better buses", "Level police funding", "Small-business relief"].map((t) => (
                    <span key={t} className={cn("rounded-full border px-2.5 py-0.5 text-[11.5px]", "border-line text-soft")}>{t}</span>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-9 grid grid-cols-4 divide-x divide-line rounded-xl border border-line bg-surface">
              {stats.map(([k, v, sub, tone]) => (
                <div key={k} className="px-5 py-4">
                  <Label>{k}</Label>
                  <div className={cn("tnum mt-1.5 font-mono text-[22px] font-medium tracking-tight", tone)}>{v}</div>
                  <div className="text-[11.5px] text-faint">{sub}</div>
                </div>
              ))}
            </div>

            <p className="mt-8 max-w-[62ch] text-[14px] leading-relaxed text-soft">
              Son of a bus mechanic and a school aide. A tenant organiser first, then a small-business loan officer. He is cross-pressured: nobody is fully happy with him, so every choice you make will cost him someone.
            </p>

            <div className="mt-10 grid grid-cols-2 gap-10">
              <div>
                <Label>Record</Label>
                <ul className="mt-3 space-y-3.5">
                  {RECORD.map((r) => (
                    <li key={r.text} className="flex gap-3">
                      <span className={cn("mt-0.5 grid size-4 shrink-0 place-items-center rounded-full", r.ok ? "bg-pos/15 text-pos" : "bg-neg/15 text-neg")}>
                        {r.ok ? <Check className="size-2.5" strokeWidth={3} /> : <X className="size-2.5" strokeWidth={3} />}
                      </span>
                      <div>
                        <div className="text-[13px]">{r.text}</div>
                        <div className="text-[11.5px] text-faint">Liked by {r.liked.toLowerCase()} · not by {r.not.toLowerCase()}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <Label>Where he stands</Label>
                <dl className="mt-3 space-y-3 text-[13px]">
                  {([["Strong", "var(--color-warm)", "Western Queens, north Brooklyn"], ["Weak", "var(--color-cool)", "Staten Island, southern Brooklyn, Upper East Side"], ["Open", "var(--color-faint)", "The Bronx, Upper Manhattan, southeast Queens"]] as const).map(([k, c, v]) => (
                    <div key={k} className="flex gap-3">
                      <dt className="flex w-16 shrink-0 items-center gap-2 text-muted"><i className="size-1.5 rounded-full" style={{ background: c }} />{k}</dt>
                      <dd>{v}</dd>
                    </div>
                  ))}
                </dl>
                <button onClick={() => s.go("map")} className="mt-4 inline-flex items-center gap-1 text-[12.5px] text-muted transition-colors hover:text-fg">Open the map <ArrowRight className="size-3.5" /></button>

                <div className="mt-8 flex items-center justify-between"><Label>Manifesto</Label><span className="tnum font-mono text-[11px] text-faint">{s.manifesto.length} of 5</span></div>
                <ol className="mt-3 space-y-2">
                  {s.manifesto.map((m, i) => (
                    <li key={i} className="flex gap-3 text-[13px]">
                      <span className="tnum w-4 shrink-0 font-mono text-[11px] leading-[20px] text-faint">{String(i + 1).padStart(2, "0")}</span>
                      <span className="flex-1 text-soft">{m}</span>
                      <Lock className="mt-1 size-3 shrink-0 text-faint" />
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </div>
        <Dock>
          <DockButton primary icon={<ScrollText />} label="Build the manifesto" sub={`${s.manifesto.length} of 5 planks`} onClick={() => s.open("manifesto")} />
          <DockButton icon={<Newspaper />} label="Morning paper" onClick={() => s.open("paper")} />
          <DockButton icon={<CalendarDays />} label="Calendar" onClick={() => s.open("calendar")} />
          <DockButton icon={<ArrowRight />} label="War room" onClick={() => s.go("war")} />
        </Dock>
      </section>

      <Inspector>
        <Section title="The race">
          <div className="space-y-3">
            {race.map(([n, v, c]) => (
              <div key={n}>
                <div className="flex justify-between text-[13px]"><span className={n === "Adrian Cole" ? "" : "text-soft"}>{n}</span><span className="tnum font-mono text-[12px]">{v}%</span></div>
                <Meter value={v * 2} color={c} className="mt-1.5" />
              </div>
            ))}
          </div>
        </Section>
        <Section title="Rivals">
          <div className="space-y-2">
            {activeRivals(s.day).map((id) => <RivalCard key={id} id={id} name={rivalDef(id).name} tag={`Runs on ${rivalDef(id).runsOn.split(":")[0]}`} note={rivalDef(id).base} />)}
          </div>
        </Section>
        <Section title="Opening problems">
          <ol className="space-y-2.5">
            {PROBLEMS.map((p, i) => (
              <li key={p} className="flex gap-3 text-[13px] text-soft"><span className="tnum font-mono text-[11px] leading-[20px] text-faint">{i + 1}</span>{p}</li>
            ))}
          </ol>
        </Section>
      </Inspector>
    </div>
  );
}

// What a rival campaign has been doing: their poll, money, last moves and where they've built strength.
function RivalCard({ id, name, tag, note }: { id: string; name: string; tag: string; note: string }) {
  const r = useGame((s) => s.rivals[id]);
  const poll = useGame((s) => s.poll[id]);
  const ledger = useGame((s) => s.ledger);
  const moves = ledger.filter((l) => l.source === "rival" && l.effect.by === id).slice(-3).reverse();
  const strong = Object.entries(r.strength).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([cd]) => districtBy(+cd)?.name.split("-")[0]).filter(Boolean);
  return (
    <div className="rounded-lg border border-line bg-raised p-3">
      <div className="flex items-baseline justify-between gap-2">
        <div className="text-[13px] font-medium">{name}</div>
        <div className="tnum font-mono text-[12px]">{poll}%</div>
      </div>
      <div className="text-[11.5px] text-muted">{tag}</div>
      <div className="mt-1.5 flex justify-between text-[11.5px] text-muted">
        <span>{moneyK(r.cash)} in the bank</span>
        <span className={cn(r.plan.status === "planning" && "breathe text-warm")}>{r.plan.status === "planning" ? "Planning tonight…" : r.plan.mode === "live" ? "AI campaign" : ""}</span>
      </div>
      <div className="mt-1.5 text-[12px] text-soft">Strong with: {strong.length ? strong.join(", ") : note.toLowerCase()}</div>
      {!!moves.length && (
        <ul className="mt-2 space-y-1 border-t border-line pt-2 text-[11.5px] text-muted">
          {moves.map((l) => <li key={l.id}><span className="tnum font-mono text-faint">D{l.day}</span> {l.effect.summary}</li>)}
        </ul>
      )}
    </div>
  );
}
