"use client";

import { Label, Tag } from "@/components/ui";
import { choicesSoFar, dateOfStep, isDebrief, platformAt, reactionsAt, rivalsWithPlatform } from "@/lib/cases/platform";
import { longDate, type Pick } from "@/lib/cases/store";
import type { Case, Plank } from "@/lib/cases/types";
import { cn } from "@/lib/util";
import { Cite } from "./CaseView";

// The platform as it stood on the student's date: what each candidate had put on the record, who reacted and how,
// and next to it the student's own choices. Nothing here is generated; every line is cited.

function PlankItem({ c, p, step, compact }: { c: Case; p: Plank; step: number; compact?: boolean }) {
  const d = p.decision ? c.decisions.find((x) => x.id === p.decision) : undefined;
  const reactions = compact ? [] : reactionsAt(c, p, step);
  const groupName = (id: string) => c.groups.find((g) => g.id === id)?.name ?? id;
  return (
    <li>
      <div className={cn("leading-relaxed", compact ? "text-[13px] text-soft" : "text-[14px]")}>
        {p.text}
        {p.sources.map((id) => <Cite key={id} c={c} id={id} />)}
      </div>
      <div className="mt-0.5 text-[11.5px] text-faint">
        On record from {longDate(p.asOf)}
        {d && <> · became the real campaign&apos;s position at &ldquo;{d.title}&rdquo;</>}
      </div>
      {reactions.length > 0 && (
        <ul className="mt-1.5 space-y-1">
          {reactions.map((r, i) => (
            <li key={i} className="text-[12.5px] leading-relaxed text-muted">
              <span className={r.stance === "for" ? "text-pos" : "text-neg"}>{r.stance === "for" ? "For it" : "Against it"} · </span>
              <span className="text-soft">{r.who}: </span>
              {r.text}
              {r.sources.map((id) => <Cite key={id} c={c} id={id} />)}
              {r.groups?.map((g) => <span key={g} className="ml-1.5 rounded-full border border-line-strong px-1.5 text-[10.5px] text-soft">{groupName(g)}</span>)}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

/** The full view, for Profile: the record next to the student's choices, then the rivals. */
export function PlatformSection({ c, step, picks }: { c: Case; step: number; picks: Record<string, Pick> }) {
  const mine = platformAt(c, step, picks);
  const me = c.candidates.find((x) => x.id === c.follow)!;
  const choices = choicesSoFar(c, picks);
  const rivals = rivalsWithPlatform(c).map((x) => ({ x, planks: platformAt(c, step, picks, x.id) })).filter((r) => r.planks.length);
  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <Label>Platform</Label>
        <span className="text-[11.5px] text-faint">{isDebrief(c, step) ? "The full record." : `What was on record by ${longDate(dateOfStep(c, step))}. More appears as the race goes on.`}</span>
      </div>
      <div className="mt-3 grid grid-cols-[3fr_2fr] gap-8">
        <div>
          <div className="flex items-center gap-2"><span className="text-[12px] text-muted">On the record ({me.name.split(" ").slice(1).join(" ") || me.name})</span><Tag kind="real" /></div>
          <ul className="mt-3 space-y-5">{mine.map((p) => <PlankItem key={p.text} c={c} p={p} step={step} />)}</ul>
        </div>
        <div className="border-l border-line pl-6">
          <div className="flex items-center gap-2"><span className="text-[12px] text-muted">Your choices so far</span><Tag kind="sim" /></div>
          {choices.length ? (
            <ul className="mt-3 space-y-4">
              {choices.map((x) => (
                <li key={x.decision}>
                  <div className="text-[11.5px] text-faint">{x.title} · {longDate(x.date)}</div>
                  <div className="mt-0.5 text-[14px] leading-relaxed">{x.label}</div>
                  {x.detail && <div className="text-[12.5px] text-muted">{x.detail}</div>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-[12.5px] text-faint">Your positions will show here as you make the decisions about message, policy and voter groups.</p>
          )}
        </div>
      </div>
      {rivals.length > 0 && (
        <div className="mt-8">
          <span className="text-[12px] text-muted">The rivals&apos; platforms</span>
          <div className="mt-3 grid grid-cols-2 gap-x-8 gap-y-6">
            {rivals.map(({ x, planks }) => (
              <div key={x.id}>
                <div className="text-[13px] font-medium">{x.name}</div>
                <ul className="mt-2 space-y-4">{planks.map((p) => <PlankItem key={p.text} c={c} p={p} step={step} />)}</ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** The compact panel inside a decision: what the candidate has already promised, without the answer to this one. */
export function PlatformPanel({ c, step, picks, decision }: { c: Case; step: number; picks: Record<string, Pick>; decision: string }) {
  const planks = platformAt(c, step, picks).filter((p) => p.decision !== decision);
  if (!planks.length) return null;
  return (
    <details className="group rounded-xl border border-line bg-surface px-4 py-3">
      <summary className="cursor-pointer list-none text-[12.5px] text-muted marker:hidden hover:text-fg">
        <span className="mr-1.5 inline-block transition-transform group-open:rotate-90">›</span>
        Platform on record as of {longDate(dateOfStep(c, step))} · {planks.length} {planks.length === 1 ? "position" : "positions"}
      </summary>
      <ul className="mt-3 space-y-3">{planks.map((p) => <PlankItem key={p.text} c={c} p={p} step={step} compact />)}</ul>
    </details>
  );
}
