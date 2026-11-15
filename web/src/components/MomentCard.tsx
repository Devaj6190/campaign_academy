"use client";

import { ArrowDown, ArrowUp, Check, MessageSquare } from "lucide-react";
import { useState } from "react";
import { CASE } from "@/lib/scenario/case";
import { decide, handleMyself, momentById } from "@/lib/scenario/moments";
import { ACTIVE, dayLabel, ME } from "@/lib/scenario";
import { useGame } from "@/lib/store";
import { cn, money } from "@/lib/util";
import { AdviceCard, Claims } from "@/views/CaseView";
import { Button, Label, Tag } from "./ui";

// A real moment from the race, in the middle of the simulation: what was true that day (cited), the real
// options with their direction (never their size), and the advisers' arguments. Pick one, or do it your way.

export function MomentCard({ close }: { close: () => void }) {
  const id = useGame((s) => s.momentId);
  const state = useGame((s) => (id ? s.moments[id] : undefined));
  const day = useGame((s) => s.day);
  const cash = useGame((s) => s.cash);
  const d = id ? momentById(id) : undefined;
  const [option, setOption] = useState(state?.option ?? "");
  const [why, setWhy] = useState("");
  const [note, setNote] = useState("");
  if (!d || !state) return null;
  const open = state.status === "pending";
  const costOf = (budget?: number) => Math.max(0, -(budget ?? 0) * ACTIVE.finance.scale);

  return (
    <div className="flex max-h-[86vh] flex-col">
      <header className="shrink-0 border-b border-line px-8 pt-7 pb-5">
        <div className="flex items-center gap-2">
          <Label className="text-warm">A real moment · {dayLabel(day) || `day ${day}`}</Label>
          <Tag kind="real" />
        </div>
        <h2 className="mt-2 font-serif text-[30px] leading-tight tracking-tight">{d.title}</h2>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-8 py-5">
        {d.since && (
          <section className="mb-5">
            <Label>What happened in the run-up</Label>
            <div className="mt-2"><Claims c={CASE} items={d.since.notes} /></div>
            <p className="mt-1.5 text-[11.5px] text-faint">These are real events. Their effect on your race is simulated.</p>
          </section>
        )}
        <section>
          <Label>The situation</Label>
          <div className="mt-2"><Claims c={CASE} items={d.situation} /></div>
        </section>

        <section className="mt-6">
          <Label>What the real options were</Label>
          <div className="mt-2 space-y-2">
            {d.options.map((o) => {
              const cost = costOf(o.effect.budget);
              const short = open && cost > cash;
              const on = option === o.id;
              return (
                <button key={o.id} disabled={!open || short} onClick={() => setOption(o.id)} className={cn("block w-full rounded-lg border p-3 text-left transition-colors", on ? "border-gold bg-hover" : "border-line bg-raised hover:border-line-strong", (!open || short) && !on && "opacity-50")}>
                  <div className="flex items-center gap-2 text-[14px] font-medium">{on && <Check className="size-3.5 text-gold-bright" />}{o.label}{cost > 0 && <span className="tnum ml-auto font-mono text-[11.5px] font-normal text-muted">{money(cost)}</span>}</div>
                  <p className="mt-0.5 text-[12.5px] text-muted">{o.detail}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {o.preview.up.map((t) => <Chip key={t} up>{t}</Chip>)}
                    {o.preview.down.map((t) => <Chip key={t} up={false}>{t}</Chip>)}
                    {short && <span className="text-[11px] text-neg">Not enough cash</span>}
                  </div>
                </button>
              );
            })}
          </div>
          <p className="mt-1.5 text-[11.5px] text-faint">Arrows show the direction a choice tends to move things, never how far. What actually happens is worked out by the simulation from your campaign as it stands.</p>
        </section>

        {d.advice.length > 0 && (
          <section className="mt-6">
            <Label>What your advisers argue</Label>
            <div className="mt-2 grid gap-2 md:grid-cols-2">{d.advice.map((a, i) => <AdviceCard key={i} c={CASE} a={a} option={d.options.find((o) => o.id === a.argues)?.label} />)}</div>
          </section>
        )}
      </div>

      <footer className="shrink-0 border-t border-line px-8 py-4">
        {open ? (
          <>
            <textarea value={why} onChange={(e) => setWhy(e.target.value)} rows={2} placeholder="Why? One line on what drives your choice (saved for the debrief)." className="w-full resize-none rounded-lg border border-line bg-raised px-3 py-2 text-[13px] outline-none placeholder:text-faint focus:border-line-strong" />
            {note && <p className="mt-1.5 text-[12px] text-neg">{note}</p>}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button variant="primary" disabled={!option} onClick={() => { const err = decide(d.id, option, why.trim()); if (err) setNote(err); else close(); }}>Choose this</Button>
              <Button onClick={() => handleMyself(d.id)}><MessageSquare className="size-3.5" />Handle it my own way</Button>
              <Button variant="ghost" className="ml-auto" onClick={close}>Decide later today</Button>
            </div>
            <p className="mt-2 text-[11px] text-faint">Unanswered by the end of the day, the moment passes. What {ME.name.split(" ").slice(-2).join(" ")} really did is shown at the end.</p>
          </>
        ) : (
          <div className="flex items-center justify-between gap-3 text-[12.5px] text-muted">
            <span>{state.status === "decided" ? `You chose: ${d.options.find((o) => o.id === state.option)?.label}.` : state.status === "own" ? "You handled it your own way, through the war room." : "This moment passed without a decision."}</span>
            <Button onClick={close}>Close</Button>
          </div>
        )}
      </footer>
    </div>
  );
}

const Chip = ({ up, children }: { up: boolean; children: string }) => (
  <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-px text-[11px]", up ? "border-pos/30 text-pos" : "border-neg/30 text-neg")}>
    {up ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />}{children}
  </span>
);
