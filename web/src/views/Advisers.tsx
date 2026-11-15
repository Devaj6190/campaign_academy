"use client";

import { ArrowRight } from "lucide-react";
import { Button, Inspector, Label, Section, ViewHeader } from "@/components/ui";
import { longDate, useCase, useCaseNow } from "@/lib/cases/store";
import type { Decision } from "@/lib/cases/types";
import { useGame } from "@/lib/store";
import { AdviceCard, Cite } from "./CaseView";

// The war room: the campaign's staff, arguing each decision from what was known at the time. Everything is read
// from the case. A real name appears only where the record names that person; otherwise the adviser is the post.
// Advice for a decision appears when the student reaches it, never before.

export function Advisers() {
  const { c, step, today } = useCaseNow();
  const picks = useCase((s) => s.picks);
  const go = useGame((s) => s.go);
  const n = c.decisions.length;
  const current = step >= 1 && step <= n ? c.decisions[step - 1] : null;
  const reached = c.decisions.slice(0, Math.min(Math.max(step, 0), n));
  const earlier = reached.filter((d) => d !== current).reverse();
  const press = c.press.filter((p) => p.date <= today).reverse();

  const roster = new Map<string, { name?: string; role: string; onRecord: boolean; times: number }>();
  for (const d of reached) for (const a of d.advice) {
    const k = a.name ?? a.role;
    const r = roster.get(k) ?? { name: a.name, role: a.role, onRecord: false, times: 0 };
    roster.set(k, { ...r, onRecord: r.onRecord || a.basis === "on-record", times: r.times + 1 });
  }

  const block = (d: Decision) => {
    const chosen = d.options.find((o) => o.id === picks[d.id]?.option);
    return (
      <div key={d.id}>
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 className="font-serif text-[22px] leading-tight">{d.title}</h2>
          <span className="text-[12px] text-muted">{longDate(d.date)}</span>
        </div>
        <p className="mt-1 text-[12.5px] text-muted">{chosen ? <>You chose: <span className="text-soft">{chosen.label}</span></> : "You have not decided yet."}</p>
        <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
          {d.advice.map((a) => <AdviceCard key={a.role + a.argues} c={c} a={a} option={d.options.find((o) => o.id === a.argues)?.label} />)}
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-full">
      <section className="flex min-w-0 flex-1 flex-col">
        <ViewHeader title="War room" sub="The campaign's staff, arguing each decision from what was known at the time. They disagree; weighing them is your job." />
        <div className="min-h-0 flex-1 overflow-y-auto border-t border-line px-8 pt-6 pb-16">
          <div className="max-w-[860px] space-y-10">
            {!reached.length && <p className="text-[14px] text-soft">Nobody has anything to argue about yet. Your advisers weigh in when you reach the first decision.</p>}
            {current && (
              <div>
                <Label>The decision in front of you</Label>
                <div className="mt-2">{block(current)}</div>
                <Button variant="primary" className="mt-4" onClick={() => go("case")}>{picks[current.id] ? "Back to the case" : "Go and decide"} <ArrowRight className="size-3.5" /></Button>
              </div>
            )}
            {!!earlier.length && (
              <div>
                <Label>Earlier decisions</Label>
                <div className="mt-2 space-y-8">{earlier.map(block)}</div>
              </div>
            )}
          </div>
        </div>
      </section>

      <Inspector>
        <Section title="Who is in the room">
          {roster.size ? (
            <ul className="space-y-2.5">
              {[...roster.values()].sort((a, b) => Number(!!b.name) - Number(!!a.name) || b.times - a.times).map((r) => (
                <li key={r.name ?? r.role} className="text-[13px]">
                  <div className="flex items-baseline justify-between gap-2"><span className={r.name ? "font-medium text-gold-bright" : "text-soft"}>{r.name ?? r.role}</span>{r.name && <span className="text-[11.5px] text-muted">{r.role}</span>}</div>
                  <div className="text-[11px] text-faint">{r.onRecord ? "Documented in this post" : "A post, not a named person"} · argued {r.times === 1 ? "once" : `${r.times} times`}</div>
                </li>
              ))}
            </ul>
          ) : <p className="text-[12.5px] text-faint">The room fills as decisions arrive.</p>}
          <p className="mt-3 text-[11.5px] leading-relaxed text-faint">&ldquo;On the record&rdquo; means the person is documented as arguing that, with a source. &ldquo;Predicted&rdquo; is written for this exercise from the post and is not a quotation.</p>
        </Section>
        <Section title="In the press so far">
          {press.length ? (
            <ul className="space-y-3">
              {press.map((p) => (
                <li key={p.date + p.source} className="text-[12.5px] leading-relaxed text-soft">
                  <div className="text-[11px] text-faint">{longDate(p.date)} · {p.outlet}</div>
                  {p.summary}<Cite c={c} id={p.source} />
                </li>
              ))}
            </ul>
          ) : <p className="text-[12.5px] text-faint">Nothing reported yet.</p>}
          <p className="mt-3 text-[11.5px] text-faint">Paraphrased from the cited coverage.</p>
        </Section>
      </Inspector>
    </div>
  );
}
