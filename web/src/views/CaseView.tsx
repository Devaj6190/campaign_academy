"use client";

import { ArrowDown, ArrowRight, ArrowUp, Check, ExternalLink, Map as MapIcon, RotateCcw } from "lucide-react";
import { useState } from "react";
import { Button, Label, Meter, Section } from "@/components/ui";
import { run } from "@/lib/cases/clock";
import { changeAt, currentCase, useCase, worldAt } from "@/lib/cases/store";
import type { Advice, Case, Claim, Decision, Judgment, Shift, Skill, World } from "@/lib/cases/types";
import { useGame } from "@/lib/store";
import { cn } from "@/lib/util";
import { PlatformPanel } from "./Platform";

// A case, played: briefing, then each decision point, then the debrief.
// At a decision the student sees the record of that date, hears their advisers, and chooses. The choice changes
// their simulated campaign and the race plays on from there. The clock (lib/cases/clock) carries the campaign from
// one decision to the next; a step opens here only once the campaign has reached it.

const SKILLS: Record<Skill, string> = { delegating: "Delegating", budgeting: "Budgeting", "voter-groups": "Reading voter groups", policy: "Policy trade-offs" };
const day = (iso: string) => new Date(iso + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const usd = (n: number) => `${n < 0 ? "−" : ""}$${Math.abs(Math.round(n)).toLocaleString("en-US")}`;
const pts = (n: number) => `${n > 0 ? "+" : "−"}${Math.abs(Math.round(n * 10) / 10)}`;

export function CaseView() {
  const { caseId, step, go, picks, at } = useCase();
  const c = currentCase(caseId);
  const n = c.decisions.length;
  const steps = ["Briefing", ...c.decisions.map((_, i) => `Decision ${i + 1}`), "Debrief"];

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-[820px] px-8 pt-8 pb-24">
        <Label>Case study · {c.office}</Label>
        <h1 className="mt-1.5 font-serif text-[40px] leading-[1.05] tracking-tight">{c.title}</h1>
        <nav className="mt-5 flex flex-wrap gap-1.5" aria-label="Case steps">
          {steps.map((label, i) => (
            <button
              key={label}
              disabled={i > at}
              onClick={() => go(i)}
              className={cn("rounded-full border px-3 py-1 text-[12px] transition-colors disabled:opacity-35", i === step ? "border-gold bg-hover text-gold-bright" : "border-line text-muted hover:text-fg")}
            >
              {label}
            </button>
          ))}
        </nav>
        {step > 0 && <WorldStrip c={c} w={worldAt(c, picks, Math.min(step - 1, n))} final={step > n} />}
        <div className="mt-4 rounded-xl border border-line bg-surface">
          {step === 0 ? <Briefing c={c} /> : step <= n ? <DecisionStep key={c.decisions[step - 1].id} c={c} d={c.decisions[step - 1]} index={step - 1} /> : <Debrief c={c} />}
        </div>
      </div>
    </div>
  );
}

/** The student's own campaign, as the simulation has it. Always labelled. */
function WorldStrip({ c, w, final }: { c: Case; w: World; final?: boolean }) {
  const name = (id: string) => c.candidates.find((x) => x.id === id)?.name.split(" ").slice(-1)[0] ?? id;
  const field = Object.entries(w.poll).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  return (
    <div className="mt-5 rounded-xl border border-line bg-surface px-5 py-4">
      <div className="mb-3"><Label>{final ? "Where your campaign finished" : "Your campaign now"}</Label></div>
      <div className="grid gap-x-8 gap-y-3 sm:grid-cols-[1fr_1fr]">
        <div className="space-y-1.5">
          {field.map(([id, v]) => (
            <div key={id} className="grid grid-cols-[84px_1fr_38px] items-center gap-2 text-[12.5px]">
              <span className={cn(id === c.follow ? "font-medium text-gold-bright" : "text-muted")}>{id === c.follow ? "You" : name(id)}</span>
              <Meter value={v * 2} color={id === c.follow ? "var(--color-gold)" : "var(--color-muted)"} />
              <span className="text-right font-mono text-soft">{Math.round(v)}%</span>
            </div>
          ))}
        </div>
        <div className="space-y-1.5">
          <div className="flex justify-between text-[12.5px]"><span className="text-muted">Money left to spend</span><span className={cn("font-mono", w.budget < 0 ? "text-neg" : "text-fg")}>{usd(w.budget)}</span></div>
          {c.groups.map((g) => (
            <div key={g.id} className="grid grid-cols-[120px_1fr_38px] items-center gap-2 text-[12.5px]">
              <span className="text-muted">{g.name}</span>
              <Meter value={(w.groups[g.id] ?? 0) * 1.5} color="var(--color-cool)" />
              <span className="text-right font-mono text-soft">{Math.round(w.groups[g.id] ?? 0)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Statements with their sources. Every line shows where it comes from. */
export function Claims({ c, items }: { c: Case; items: (Claim | Judgment)[] }) {
  return (
    <ul className="space-y-2.5">
      {items.map((x, i) => (
        <li key={i} className="text-[14px] leading-relaxed text-soft">
          {"who" in x && <span className="font-medium text-fg">{x.who}: </span>}
          {x.text}
          {x.estimate && <span className="ml-1.5 border border-warm/30 px-1 text-[10.5px] tracking-wide text-warm uppercase">Estimate</span>}
          {x.sources.map((id) => <Cite key={id} c={c} id={id} />)}
        </li>
      ))}
    </ul>
  );
}

export function Cite({ c, id }: { c: Case; id: string }) {
  const i = c.sources.findIndex((s) => s.id === id);
  const s = c.sources[i];
  if (!s) return null;
  return (
    <a href={s.url} target="_blank" rel="noreferrer" title={`${s.title} · ${s.publisher}`} className="ml-1 align-super text-[10.5px] text-gold hover:underline">
      [{i + 1}]
    </a>
  );
}

function Briefing({ c }: { c: Case }) {
  const go = useCase((s) => s.go);
  const you = c.candidates.find((x) => x.id === c.follow)!;
  return (
    <>
      <Section title={`The race on ${day(c.briefingDate)}`}>
        <p className="mb-3 text-[14px] text-fg">You are running {you.name}&rsquo;s campaign. Election day is {day(c.electionDate)}. Win {c.threshold} percent and there is no runoff.</p>
        <Claims c={c} items={c.briefing} />
      </Section>
      <Section title="The candidates">
        <div className="space-y-4">
          {c.candidates.map((x) => (
            <div key={x.id}>
              <div className="flex items-baseline gap-2">
                <span className={cn("text-[15px] font-medium", x.id === c.follow && "text-gold-bright")}>{x.name}</span>
                <span className="text-[12px] text-muted">{x.standing}</span>
              </div>
              <div className="mt-1"><Claims c={c} items={x.about} /></div>
            </div>
          ))}
        </div>
      </Section>
      <Section title="How this works">
        <p className="text-[14px] text-soft">{c.lesson}</p>
        <p className="mt-2 text-[13px] text-muted">The people, dates, polls and money in this case are real and sourced. Your decisions are yours: each one changes your campaign, and the race plays on from where you leave it. After each decision you see what the real campaign did; how it turned out for them comes at the end.</p>
        <div className="mt-3"><Claims c={c} items={c.start.basis} /></div>
        <Button variant="primary" className="mt-4" onClick={() => (useCase.getState().at ? go(1) : run())}>First decision <ArrowRight className="size-3.5" /></Button>
      </Section>
    </>
  );
}

const Chip = ({ up, children }: { up: boolean; children: string }) => (
  <span className={cn("inline-flex items-center gap-0.5 rounded border px-1.5 py-px text-[11px]", up ? "border-pos/30 text-pos" : "border-neg/30 text-neg")}>
    {up ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />}{children}
  </span>
);

export function AdviceCard({ c, a, option }: { c: Case; a: Advice; option?: string }) {
  return (
    <div className="rounded-lg border border-line bg-raised p-3">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[13px] font-medium text-gold-bright">{a.name ?? a.role}</span>
        {a.name && <span className="text-[11.5px] text-muted">{a.role}</span>}
      </div>
      <p className="mt-1 text-[13px] leading-relaxed text-soft">{a.says}{a.sources.map((id) => <Cite key={id} c={c} id={id} />)}</p>
      <p className="mt-1.5 text-[11.5px] text-muted">Argues for: <span className="text-soft">{option}</span></p>
      <p className="mt-0.5 text-[10.5px] tracking-wide text-faint uppercase">{a.basis === "on-record" ? "On the record" : "Predicted"}</p>
    </div>
  );
}

function Changes({ c, s }: { c: Case; s: Shift }) {
  const rows: [string, string, boolean][] = [];
  if (s.budget) rows.push(["Money left to spend", usd(s.budget), s.budget > 0]);
  for (const [id, v] of Object.entries(s.poll ?? {})) if (v) rows.push([id === c.follow ? "Your poll standing" : `${c.candidates.find((x) => x.id === id)?.name ?? id} in the polls`, `${pts(v)} points`, id === c.follow ? v > 0 : v < 0]);
  for (const [id, v] of Object.entries(s.groups ?? {})) if (v) rows.push([c.groups.find((g) => g.id === id)?.name ?? id, `${pts(v)} points`, v > 0]);
  if (!rows.length) return <p className="text-[13.5px] text-soft">Nothing moved. You kept your money and your position.</p>;
  return (
    <ul className="space-y-1.5">
      {rows.map(([label, value, good]) => (
        <li key={label} className="flex items-center justify-between text-[13.5px]"><span className="text-soft">{label}</span><span className={cn("font-mono", good ? "text-pos" : "text-neg")}>{value}</span></li>
      ))}
    </ul>
  );
}

/** One decision: the record, the advisers, the choice. Shown in the Case tab and as the card that opens when the clock reaches it. */
export function DecisionStep({ c, d, index }: { c: Case; d: Decision; index: number }) {
  const { decide, picks, at, running } = useCase();
  const live = index === at - 1;
  const pick = picks[d.id];
  const decided = !!pick;
  const w = worldAt(c, picks, index);
  const [option, setOption] = useState(pick?.option ?? "");
  const [why, setWhy] = useState(pick?.why ?? "");
  const last = index === c.decisions.length - 1;
  const label = (id: string) => d.options.find((o) => o.id === id)?.label;

  return (
    <>
      {d.since && <Section title="Since your last decision"><Claims c={c} items={d.since.notes} /></Section>}
      <Section title={`${day(d.date)} · ${SKILLS[d.skill]}`}>
        <h2 className="mb-3 font-serif text-[26px] leading-tight">{d.title}</h2>
        <Claims c={c} items={d.situation} />
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-[12.5px] text-muted">
          <span><span className="text-fg">{d.constraints.daysLeft}</span> days to the primary</span>
          {d.constraints.notes?.map((t) => <span key={t}>{t}</span>)}
        </div>
        <div className="mt-4"><PlatformPanel c={c} step={index + 1} picks={picks} decision={d.id} /></div>
      </Section>

      {!!d.advice.length && (
        <Section title="Your advisers">
          <div className="grid gap-2.5 sm:grid-cols-2">{d.advice.map((a) => <AdviceCard key={a.role + a.argues} c={c} a={a} option={label(a.argues)} />)}</div>
        </Section>
      )}

      <Section title={decided ? "Your decision" : "What do you do?"}>
        <div className="space-y-2" role="radiogroup">
          {d.options.map((o) => {
            const on = (pick?.option ?? option) === o.id; // the pick wins: this step can be on screen twice (tab and card)
            const short = !decided && w.budget + (o.effect.budget ?? 0) < 0;
            return (
              <button
                key={o.id}
                role="radio"
                aria-checked={on}
                disabled={decided || short}
                onClick={() => setOption(o.id)}
                className={cn("block w-full rounded-lg border p-3 text-left transition-colors", on ? "border-gold bg-hover" : "border-line bg-raised hover:border-line-strong", (decided || short) && !on && "opacity-50")}
              >
                <div className="flex items-center gap-2 text-[14px] font-medium">{on && <Check className="size-3.5 text-gold-bright" />}{o.label}</div>
                <p className="mt-0.5 text-[12.5px] text-muted">{o.detail}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {o.preview.up.map((t) => <Chip key={t} up>{t}</Chip>)}
                  {o.preview.down.map((t) => <Chip key={t} up={false}>{t}</Chip>)}
                  {!o.preview.up.length && !o.preview.down.length && <span className="text-[11px] text-faint">No immediate change</span>}
                  {short && <span className="text-[11px] text-neg">You no longer have the money for this</span>}
                </div>
              </button>
            );
          })}
        </div>
        {!decided && (
          <>
            <textarea
              value={why}
              onChange={(e) => setWhy(e.target.value)}
              rows={2}
              placeholder="Why? One or two sentences on what in the situation drives your choice."
              className="mt-3 w-full resize-none rounded-lg border border-line-strong bg-raised p-3 text-[13.5px] outline-none placeholder:text-faint focus:border-gold"
            />
            <Button variant="primary" className="mt-3" disabled={!option || why.trim().length < 10} onClick={() => decide(d.id, { option, why: why.trim() })}>Decide</Button>
          </>
        )}
        {decided && <p className="mt-3 text-[13px] text-muted">Your reasoning: {pick.why}</p>}
      </Section>

      {decided && (
        <>
          <Section title="What changed">
            <Changes c={c} s={changeAt(c, picks, d)} />
            <Button className="mt-4" onClick={() => { useCase.setState({ card: false }); useGame.getState().go("map"); }}><MapIcon className="size-3.5" /> See it on the map</Button>
          </Section>
          <Section title="What the real campaign did">
            <p className="mb-3 text-[13px] text-muted">{d.taken === null ? "Something that was not on your list." : d.taken === pick.option ? "The same call you made." : `A different call: ${label(d.taken)}.`}</p>
            <Claims c={c} items={d.did} />
            {live && (running ? (
              <p className="mt-4 text-[13px] text-muted">The campaign is running. The next decision arrives on its own date; until then your staff are in the War room.</p>
            ) : (
              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="primary" onClick={() => run()}>{last ? "Run to election day" : "Carry on with the campaign"} <ArrowRight className="size-3.5" /></Button>
                <Button onClick={() => { useCase.setState({ card: false }); useGame.getState().go("war"); }}>Give your staff work first</Button>
              </div>
            ))}
          </Section>
        </>
      )}
    </>
  );
}

function Debrief({ c }: { c: Case }) {
  const { picks, restart } = useCase();
  const w = worldAt(c, picks, c.decisions.length);
  const name = (id: string) => c.candidates.find((x) => x.id === id)?.name ?? id;
  const mine = w.poll[c.follow];
  const rival = Object.entries(w.poll).filter(([id]) => id !== c.follow).sort((a, b) => b[1] - a[1])[0];
  const place = Object.values(w.poll).filter((v) => v > mine).length + 1;
  const verdict = place === 1 && mine >= c.threshold ? `You finish first with ${mine.toFixed(1)} percent, above the ${c.threshold} needed. No runoff.` : place <= 2 ? `You finish ${place === 1 ? "first" : "second"} with ${mine.toFixed(1)} percent, short of ${c.threshold}. You go to a runoff against ${place === 1 ? name(rival[0]) : name(rival[0])}.` : `You finish ${place === 3 ? "third" : `in place ${place}`} with ${mine.toFixed(1)} percent. You miss the runoff.`;
  const real = c.result.find((r) => r.candidate === c.follow)!;

  return (
    <>
      <Section title="Your election night">
        <p className="text-[15px] text-fg">{verdict}</p>
        <p className="mt-2 text-[12.5px] text-muted">A simulated result, fitted so that the real campaign&rsquo;s choices land on the real one.</p>
      </Section>
      <Section title={`What really happened · ${day(c.electionDate)}`}>
        <div className="space-y-2.5">
          {c.result.map((r) => (
            <div key={r.candidate}>
              <div className="mb-1 flex justify-between text-[13.5px]">
                <span className={cn(r.candidate === c.follow && "font-medium text-gold-bright")}>{name(r.candidate)}</span>
                <span className="font-mono text-soft">{r.share.toFixed(2)}% · {r.votes.toLocaleString("en-US")}</span>
              </div>
              <Meter value={r.share * 2} color={r.candidate === c.follow ? "var(--color-gold)" : "var(--color-muted)"} />
            </div>
          ))}
        </div>
        <p className="mt-2 text-[11.5px] text-faint">Certified result{c.resultSources.map((id) => <Cite key={id} c={c} id={id} />)} · the real campaign finished on {real.share.toFixed(2)} percent</p>
        <div className="mt-4"><Claims c={c} items={c.aftermath} /></div>
      </Section>
      <Section title="Your decisions against the record">
        <div className="space-y-4">
          {c.decisions.map((d, i) => {
            const you = d.options.find((o) => o.id === picks[d.id]?.option);
            const they = d.options.find((o) => o.id === d.taken);
            return (
              <div key={d.id} className="rounded-lg border border-line bg-raised p-4">
                <div className="flex justify-between gap-3 text-[14px]"><span className="font-medium">{i + 1}. {d.title}</span><span className="shrink-0 text-[11.5px] text-gold">{SKILLS[d.skill]}</span></div>
                <div className="mt-2 grid gap-1 text-[13px] text-muted">
                  <div>You: <span className="text-soft">{you?.label ?? "No decision"}</span>{picks[d.id]?.why && <span> · {picks[d.id].why}</span>}</div>
                  <div>The real campaign: <span className="text-soft">{they?.label ?? "Something not on the list"}</span>{you && they && you.id === they.id && <span className="text-pos"> · the same call</span>}</div>
                </div>
                <div className="mt-3 space-y-3 border-t border-line pt-3">
                  <div><Label>What followed</Label><div className="mt-1.5"><Claims c={c} items={d.followed} /></div></div>
                  {!!d.saidAfter.length && <div><Label>What was said afterwards</Label><div className="mt-1.5"><Claims c={c} items={d.saidAfter} /></div></div>}
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-[12.5px] text-muted">Making the same call as the real campaign is not the same as being right. Several accounts of this race give luck and rivals&rsquo; mistakes a share of the credit.</p>
        <Button className="mt-4" onClick={restart}><RotateCcw className="size-3.5" /> Play it again</Button>
      </Section>
      <Section title="Sources">
        <ol className="space-y-1.5 text-[12.5px] text-muted">
          {c.sources.map((s, i) => (
            <li key={s.id}>
              [{i + 1}] <a href={s.url} target="_blank" rel="noreferrer" className="text-soft hover:text-gold-bright hover:underline">{s.title} <ExternalLink className="inline size-3" /></a> · {s.publisher}{s.date ? ` · ${s.date}` : ""}
            </li>
          ))}
        </ol>
      </Section>
    </>
  );
}
