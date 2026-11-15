"use client";

import { ArrowRight } from "lucide-react";
import { useState } from "react";
import { Avatar, Button, Inspector, Label, Section, ViewHeader } from "@/components/ui";
import { longDate, useCase, useCaseNow } from "@/lib/cases/store";
import type { Advice, Case, Decision } from "@/lib/cases/types";
import { useGame } from "@/lib/store";
import { cn } from "@/lib/util";
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

  const [picked, setPicked] = useState<string | null>(null);
  const posts = postsOf(c, reached);
  const sel = posts.find((p) => p.key === picked) ?? null;

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
            <OrgChart posts={posts} picked={picked} pick={(k) => setPicked(k === picked ? null : k)} />
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
        <Section title={sel ? (sel.name ?? sel.role) : "The campaign"}>
          {sel ? (
            <>
              <p className="text-[12.5px] text-muted">{sel.name ? sel.role : "A post on the campaign. The record does not name who held it."}</p>
              {sel.said.length ? (
                <ul className="mt-3 space-y-3.5">
                  {sel.said.map(({ d, a }) => (
                    <li key={d.id + a.argues} className="text-[12.5px] leading-relaxed text-soft">
                      <div className="text-[11px] text-faint">{longDate(d.date)} · {d.title}</div>
                      {a.says}{a.sources.map((id) => <Cite key={id} c={c} id={id} />)}
                      <div className="mt-1 text-[11.5px] text-muted">Argues for: <span className="text-soft">{d.options.find((o) => o.id === a.argues)?.label}</span> · {a.basis === "on-record" ? "on the record" : "predicted"}</div>
                    </li>
                  ))}
                </ul>
              ) : <p className="mt-3 text-[12.5px] text-faint">Has not weighed in yet.</p>}
            </>
          ) : <p className="text-[12.5px] text-soft">Select someone on the chart to read what they have argued so far.</p>}
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

type Post = { key: string; name?: string; role: string; said: { d: Decision; a: Advice }[] };

/** Every post that advises at some point in the case, with what each has argued in the decisions reached so far. */
function postsOf(c: Case, reached: Decision[]): Post[] {
  const posts = new Map<string, Post>();
  for (const d of c.decisions) for (const a of d.advice) {
    const key = a.name ?? a.role;
    const p = posts.get(key) ?? { key, name: a.name, role: a.role, said: [] };
    if (reached.includes(d)) p.said.push({ d, a });
    posts.set(key, p);
  }
  return [...posts.values()];
}

const isManager = (p: Post) => /campaign manager/i.test(p.role);
const isOutside = (p: Post) => /consultant|pollster|polling/i.test(p.role);

// The record names some of these people but not who reported to whom, so the chart uses the usual shape of a
// campaign: the manager and the outside consultants answer to the candidate, the staff answer to the manager.
function OrgChart({ posts, picked, pick }: { posts: Post[]; picked: string | null; pick: (key: string) => void }) {
  const manager = posts.find(isManager);
  const outside = posts.filter((p) => isOutside(p) && p !== manager);
  const staff = posts.filter((p) => !isOutside(p) && p !== manager);
  const half = Math.ceil(outside.length / 2);
  const top = [...outside.slice(0, half), ...(manager ? [manager] : []), ...outside.slice(half)];
  const spread = (n: number, i: number, pad: number) => (n === 1 ? 50 : pad + (i * (100 - 2 * pad)) / (n - 1));
  const at = new Map<string, { x: number; y: number }>();
  top.forEach((p, i) => at.set(p.key, { x: spread(top.length, i, 12), y: 150 }));
  staff.forEach((p, i) => at.set(p.key, { x: spread(staff.length, i, 7), y: 282 }));
  const you = { x: 50, y: 30 }, boss = manager ? at.get(manager.key)! : you;
  // Lines leave below a node's label and arrive above the next node's circle.
  const line = (a: { x: number; y: number }, b: { x: number; y: number }) => `M${a.x} ${a.y + 64}C${a.x} ${(a.y + b.y) / 2 + 30},${b.x} ${(a.y + b.y) / 2 + 30},${b.x} ${b.y - 24}`;
  return (
    <div className="relative h-[372px] min-w-[640px]">
      <svg viewBox="0 0 100 372" preserveAspectRatio="none" className="absolute inset-0 size-full" aria-hidden>
        {top.map((p) => <path key={p.key} d={line(you, at.get(p.key)!)} fill="none" stroke="var(--color-line-strong)" vectorEffect="non-scaling-stroke" />)}
        {staff.map((p) => <path key={p.key} d={line(boss, at.get(p.key)!)} fill="none" stroke="var(--color-line-strong)" vectorEffect="non-scaling-stroke" />)}
      </svg>
      <Person x={you.x} y={you.y} label="You" sub="The candidate's chair" />
      {[...top, ...staff].map((p) => (
        <Person key={p.key} x={at.get(p.key)!.x} y={at.get(p.key)!.y} label={p.name ?? p.role} sub={p.name ? p.role : undefined} count={p.said.length} selected={p.key === picked} onClick={() => pick(p.key)} />
      ))}
    </div>
  );
}

function Person({ x, y, label, sub, count, selected, onClick }: { x: number; y: number; label: string; sub?: string; count?: number; selected?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick} disabled={!onClick} aria-pressed={onClick ? !!selected : undefined} className="group absolute flex w-[112px] -translate-x-1/2 flex-col items-center text-center" style={{ left: `${x}%`, top: y - 22 }}>
      <span className={cn("relative rounded-full p-[3px] transition-shadow", selected && "shadow-[0_0_0_1.5px_var(--color-gold-bright)]")}>
        <Avatar name={onClick ? label : undefined} size={44} className={cn("transition-colors group-hover:border-gold-bright", !onClick && "border-gold-bright from-[#f3ecdc] to-[#b9ae95]", count === 0 && "opacity-80", "uppercase")} />
        {!!count && <i className="tnum absolute -top-0.5 -right-0.5 grid size-4 place-items-center rounded-full bg-gold font-mono text-[9.5px] text-bg not-italic">{count}</i>}
      </span>
      <span className={cn("mt-1.5 text-[12px] leading-tight font-medium", count === 0 && "text-muted")}>{label}</span>
      {sub && <span className="text-[10.5px] leading-tight text-muted">{sub}</span>}
    </button>
  );
}
