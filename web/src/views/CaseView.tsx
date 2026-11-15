"use client";

import { ArrowDown, ArrowRight, ArrowUp, Check, ChevronDown, ExternalLink, Map as MapIcon, RotateCcw } from "lucide-react";
import { useState } from "react";
import { Button, Label, Meter, Section } from "@/components/ui";
import { run } from "@/lib/cases/clock";
import { changeAt, currentCase, decisionFilter, useCase, worldAt } from "@/lib/cases/store";
import type { Advice, Case, Claim, Decision, Judgment, Shift, Skill, World } from "@/lib/cases/types";
import { useMemos } from "@/lib/staff/memos";
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
  const place = field.findIndex(([id]) => id === c.follow) + 1;
  return (
    <div className="mt-5 rounded-xl border border-line bg-surface px-5 py-4">
      <div className="mb-3"><Label className="text-[13px]">{final ? "Where your campaign finished" : "Your campaign now"}</Label></div>
      <div className="grid gap-x-8 gap-y-4 sm:grid-cols-[150px_1fr_1fr]">
        <div>
          <div className="tnum font-mono text-[38px] leading-none font-medium tracking-tight text-gold-bright">{Math.round(w.poll[c.follow] ?? 0)}%</div>
          <div className="mt-2 text-[13px] text-muted">{ordinal(place)} of {field.length} in the polls</div>
          <div className={cn("tnum mt-3 font-mono text-[19px] leading-none", w.budget < 0 ? "text-neg" : "text-fg")}>{usd(w.budget)}</div>
          <div className="mt-1.5 text-[13px] text-muted">left to spend</div>
        </div>
        <div className="space-y-2">
          {field.map(([id, v]) => (
            <div key={id} className="grid grid-cols-[84px_1fr_42px] items-center gap-2 text-[14px]">
              <span className={cn(id === c.follow ? "font-medium text-gold-bright" : "text-muted")}>{id === c.follow ? "You" : name(id)}</span>
              <Meter value={v * 2} color={id === c.follow ? "var(--color-gold)" : "var(--color-muted)"} />
              <span className="text-right font-mono text-soft">{Math.round(v)}%</span>
            </div>
          ))}
        </div>
        <div className="space-y-2">
          {c.groups.map((g) => (
            <div key={g.id} className="grid grid-cols-[124px_1fr_42px] items-center gap-2 text-[14px]">
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

/** Swaps a block between its short version and the original wording. */
export const More = ({ on, set }: { on: boolean; set: (on: boolean) => void }) => (
  <button onClick={() => set(!on)} aria-expanded={on} className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-gold transition-colors hover:text-gold-bright">
    <ChevronDown className={cn("size-3.5 transition-transform", on && "rotate-180")} />
    {on ? "Show the short version" : "Read more"}
  </button>
);

/**
 * Statements with their sources. Every line shows where it comes from. A statement with a short version shows that,
 * and "Read more" swaps the whole block to the original wording. Pass `full` to control that from outside (one
 * control for several blocks); `big` is the reading size of the screens that have had the text pass.
 */
export function Claims({ c, items, big, full }: { c: Case; items: (Claim | Judgment)[]; big?: boolean; full?: boolean }) {
  const [open, setOpen] = useState(false);
  const all = full ?? open;
  return (
    <>
      <ul className={big ? "space-y-3" : "space-y-2.5"}>
        {items.map((x, i) => (
          <li key={i} className={cn("leading-relaxed text-soft", big ? "text-[16px]" : "text-[14px]")}>
            {"who" in x && <span className="font-medium text-fg">{x.who}: </span>}
            {all ? x.text : (x.short ?? x.text)}
            {x.estimate && <span className={cn("ml-1.5 border border-warm/30 px-1 tracking-wide text-warm uppercase", big ? "text-[12px]" : "text-[10.5px]")}>Estimate</span>}
            {x.sources.map((id) => <Cite key={id} c={c} id={id} />)}
          </li>
        ))}
      </ul>
      {full === undefined && items.some((x) => x.short) && <More on={open} set={setOpen} />}
    </>
  );
}

/** A key number with what it is. */
const Figure = ({ value, label, sub, mine }: { value: string; label: string; sub?: string; mine?: boolean }) => (
  <div className="px-5 py-4">
    <div className={cn("tnum font-mono text-[38px] leading-none font-medium tracking-tight", mine && "text-gold-bright")}>{value}</div>
    <div className="mt-2 text-[15px] text-fg">{label}</div>
    {sub && <div className="text-[13px] text-muted">{sub}</div>}
  </div>
);

const ordinal = (n: number) => `${n}${["th", "st", "nd", "rd"][n % 100 > 10 && n % 100 < 14 ? 0 : n % 10 < 4 ? n % 10 : 0]}`;

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
  const [people, setPeople] = useState(false);
  const [how, setHow] = useState(false);
  const you = c.candidates.find((x) => x.id === c.follow)!;
  const poll = c.start.poll;
  const ranked = c.candidates.filter((x) => (poll[x.id] ?? 0) > 0).sort((a, b) => poll[b.id] - poll[a.id]);
  const rival = ranked.find((x) => x.id !== c.follow);
  const days = Math.round((Date.parse(c.electionDate) - Date.parse(c.briefingDate)) / 86_400_000);
  return (
    <>
      <Section big title={`The race on ${day(c.briefingDate)}`}>
        <p className="text-[18px] text-fg">You are running {you.name}&rsquo;s campaign.</p>
        <div className="mt-4 grid grid-cols-2 divide-x divide-line rounded-xl border border-line bg-raised sm:grid-cols-4">
          <Figure mine value={`${poll[c.follow] ?? 0}%`} label="You" sub={`${ordinal(ranked.indexOf(you) + 1)} of ${ranked.length} in the polls`} />
          {rival && <Figure value={`${poll[rival.id]}%`} label={rival.name} sub={poll[rival.id] > (poll[c.follow] ?? 0) ? "Leads the field" : "Closest rival"} />}
          <Figure value={String(days)} label="Days left" sub={`Primary on ${day(c.electionDate)}`} />
          <Figure value={`${c.threshold}%`} label="To win outright" sub="Below it, a runoff" />
        </div>
        <p className="mt-2 text-[13px] text-muted">{c.start.basis[0].text}{c.start.basis[0].sources.map((id) => <Cite key={id} c={c} id={id} />)}</p>
        <div className="mt-5"><Claims big c={c} items={c.briefing} /></div>
      </Section>
      <Section big title="The candidates">
        <div className="divide-y divide-line">
          {c.candidates.map((x) => (
            <div key={x.id} className="grid grid-cols-[1fr_auto] items-start gap-x-6 py-3.5 first:pt-0">
              <div className="min-w-0">
                <div className={cn("font-display text-[19px] leading-tight font-medium", x.id === c.follow && "text-gold-bright")}>{x.name}</div>
                <div className="mt-0.5 text-[13px] text-muted">{x.standing}</div>
                <div className="mt-2"><Claims big c={c} items={x.about} full={people} /></div>
              </div>
              <div className={cn("tnum font-mono text-[30px] leading-none font-medium", x.id === c.follow ? "text-gold-bright" : "text-soft")}>{poll[x.id] ? `${poll[x.id]}%` : "—"}</div>
            </div>
          ))}
        </div>
        <More on={people} set={setPeople} />
      </Section>
      <Section big title="How this works">
        <p className="text-[18px] leading-snug text-fg">{c.lesson}</p>
        {how ? (
          <>
            <p className="mt-3 text-[16px] leading-relaxed text-soft">The people, dates, polls and money in this case are real and sourced. Your decisions are yours: each one changes your campaign, and the race plays on from where you leave it. After each decision you see what the real campaign did; how it turned out for them comes at the end.</p>
            <div className="mt-3"><Claims c={c} items={c.start.basis} /></div>
          </>
        ) : (
          <p className="mt-3 text-[16px] leading-relaxed text-soft">The people, dates, polls and money are real and sourced. Your decisions are yours, and the race plays on from where you leave it.</p>
        )}
        <div><More on={how} set={setHow} /></div>
        <Button variant="primary" className="mt-5 h-11 px-6 text-[15px]" onClick={() => (useCase.getState().at ? go(1) : run())}>First decision <ArrowRight className="size-4" /></Button>
      </Section>
    </>
  );
}

export const Chip = ({ up, children }: { up: boolean; children: string }) => (
  <span className={cn("inline-flex items-center gap-0.5 rounded border px-1.5 py-px text-[11px]", up ? "border-pos/30 text-pos" : "border-neg/30 text-neg")}>
    {up ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />}{children}
  </span>
);

/** `full` shows the adviser's argument in its original wording instead of the short version. */
export function AdviceCard({ c, a, option, full }: { c: Case; a: Advice; option?: string; full?: boolean }) {
  return (
    <div className="rounded-lg border border-line bg-raised p-4">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[16px] font-medium text-gold-bright">{a.name ?? a.role}</span>
        <span className="shrink-0 text-[13px] text-muted">{a.basis === "on-record" ? "On the record" : "Predicted"}</span>
      </div>
      {a.name && <div className="text-[13px] text-muted">{a.role}</div>}
      <div className="mt-3 text-[13px] text-muted">Argues for</div>
      <div className="font-display text-[18px] leading-snug font-medium text-fg">{option}</div>
      <p className="mt-2 text-[16px] leading-relaxed text-soft">{full ? a.says : (a.short ?? a.says)}{a.sources.map((id) => <Cite key={id} c={c} id={id} />)}</p>
    </div>
  );
}

export function Changes({ c, s }: { c: Case; s: Shift }) {
  const rows: [string, string, boolean][] = [];
  if (s.budget) rows.push(["Money left to spend", usd(s.budget), s.budget > 0]);
  for (const [id, v] of Object.entries(s.poll ?? {})) if (v) rows.push([id === c.follow ? "Your poll standing" : `${c.candidates.find((x) => x.id === id)?.name ?? id} in the polls`, `${pts(v)} points`, id === c.follow ? v > 0 : v < 0]);
  for (const [id, v] of Object.entries(s.groups ?? {})) if (v) rows.push([c.groups.find((g) => g.id === id)?.name ?? id, `${pts(v)} points`, v > 0]);
  if (!rows.length) return <p className="text-[16px] text-soft">Nothing moved. You kept your money and your position.</p>;
  return (
    <ul className="space-y-2">
      {rows.map(([label, value, good]) => (
        <li key={label} className="flex items-baseline justify-between text-[16px]"><span className="text-soft">{label}</span><span className={cn("tnum font-mono text-[20px]", good ? "text-pos" : "text-neg")}>{value}</span></li>
      ))}
    </ul>
  );
}

/** One decision: the record, the advisers, the choice. Shown in the Case tab and as the card that opens when the clock reaches it. */
/**
 * What two of the student's directors argue on this decision, from this campaign. Written in the background by live
 * agents (lib/staff/memos.ts); simulated views of the post, beside the fixed advisers, never the tool's advice.
 */
function StaffMemos({ d, label }: { d: Decision; label: (id: string) => string | undefined }) {
  const entry = useMemos((s) => s.byDecision[d.id]);
  const staff = useGame((s) => s.staff);
  if (!entry) return null;
  const nameOf = (id: string) => { const p = staff.find((x) => x.id === id); return p ? (p.onRecord || !p.name || p.name === p.role ? `The ${p.role}` : p.name) : id; };
  return (
    <Section big title="Your staff's memos">
      <div className="grid gap-2.5 sm:grid-cols-2">
        {entry.memos.map((m) => (
          <div key={m.director} className="rounded-lg border border-line bg-raised p-3.5">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[13.5px] font-medium">{nameOf(m.director)}</span>
              <span className="text-[11px] text-faint">{staff.find((x) => x.id === m.director)?.role}</span>
            </div>
            <p className="mt-1 text-[12px] text-gold">Argues for: {label(m.option)}</p>
            <p className="mt-2 text-[13.5px] leading-relaxed text-soft">{m.text}</p>
          </div>
        ))}
        {entry.status === "writing" && <p className="text-[13px] text-muted">{entry.memos.length ? "The second memo is being written…" : "Your staff are writing their memos…"} You can decide without them.</p>}
      </div>
      <p className="mt-2 text-[12px] text-muted">Simulated: what your own staff think, from this campaign. Not advice from the case, and not what anyone said in 2013.</p>
    </Section>
  );
}

export function DecisionStep({ c, d, index }: { c: Case; d: Decision; index: number }) {
  const { decide, picks, at, running } = useCase();
  const live = index === at - 1;
  const pick = picks[d.id];
  const decided = !!pick;
  const w = worldAt(c, picks, index);
  const [option, setOption] = useState(pick?.option ?? "");
  const last = index === c.decisions.length - 1;
  const label = (id: string) => d.options.find((o) => o.id === id)?.label;
  const [advice, setAdvice] = useState(false);

  return (
    <>
      {d.since && <Section big title="Since your last decision"><Claims big c={c} items={d.since.notes} /></Section>}
      <Section big title={`${day(d.date)} · ${SKILLS[d.skill]}`}>
        <h2 className="mb-4 font-serif text-[34px] leading-[1.1] tracking-tight">{d.title}</h2>
        <Claims big c={c} items={d.situation} />
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-[14px] text-muted">
          <span><span className="text-fg">{d.constraints.daysLeft}</span> days to the primary</span>
          {d.constraints.notes?.map((t) => <span key={t}>{t}</span>)}
        </div>
        <div className="mt-4"><PlatformPanel c={c} step={index + 1} picks={picks} decision={d.id} /></div>
      </Section>

      {!!d.advice.length && (
        <Section big title="Your advisers">
          <div className="grid gap-2.5 sm:grid-cols-2">{d.advice.map((a) => <AdviceCard key={a.role + a.argues} c={c} a={a} option={label(a.argues)} full={advice} />)}</div>
          {d.advice.some((a) => a.short) && <More on={advice} set={setAdvice} />}
        </Section>
      )}

      <StaffMemos d={d} label={label} />

      <Section big title={decided ? "Your decision" : "What do you do?"}>
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
        {!decided && <Button variant="primary" className="mt-3" disabled={!option} onClick={() => decide(d.id, { option })}>Decide</Button>}
      </Section>

      {decided && (
        <>
          <Section big title="What changed">
            <Changes c={c} s={changeAt(c, picks, d)} />
            <Button className="mt-4" onClick={() => { useCase.setState({ card: false }); useGame.getState().select({ filter: decisionFilter(d.id), district: null }); useGame.getState().go("map"); }}><MapIcon className="size-3.5" /> See it on the map</Button>
          </Section>
          <Section big title="What the real campaign did">
            <p className="text-[13px] text-muted">{d.taken === null ? "Not one of your options" : d.taken === pick.option ? "The same call you made" : "A different call"}</p>
            <p className="mb-4 font-display text-[22px] leading-snug font-medium text-fg">{d.taken === null ? "Something that was not on your list" : label(d.taken)}</p>
            <Claims big c={c} items={d.did} />
            {live && (running ? (
              <p className="mt-4 text-[14px] text-muted">The campaign is running. The next decision arrives on its own date; until then your staff are in the War room.</p>
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
        <p className="mt-2 text-[12.5px] text-muted">A simulated result. The six decisions are fitted so that the real campaign&rsquo;s choices land on the real one; what your staff did and what your rivals did then moved it from there.</p>
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
                  <div>You: <span className="text-soft">{you?.label ?? "No decision"}</span></div>
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
