"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import { create } from "zustand";
import { FACTIONS_2013, factionNow } from "@/lib/cases/mayor2013-factions";
import { dateOf } from "@/lib/cases/clock";
import { factionWork, longDate, useCase, useCaseNow } from "@/lib/cases/store";
import { Cite, Claims } from "@/views/CaseView";
import { Button, Dialog, Label, Meter, Tag } from "./ui";

// The morning paper for the day the student has reached. Everything reported is from the case: its press list
// (paraphrased from cited coverage) and what the case says happened since the last decision. Coverage dated on or
// after today is held back, because a later headline can give away what the real campaign chose.

export const usePaper = create<{ open: boolean; set: (open: boolean) => void }>((set) => ({ open: false, set: (open) => set({ open }) }));

/** First sentence as the headline, the rest as the story. */
const split = (s: string): [string, string] => {
  const i = s.indexOf(". ");
  return i < 0 ? [s.replace(/\.$/, ""), ""] : [s.slice(0, i), s.slice(i + 2)];
};

export function Paper() {
  const { open, set } = usePaper();
  const close = () => set(false);
  return <Dialog open={open} onClose={close} className="max-w-[760px]">{open && <Edition close={close} />}</Dialog>;
}

function Edition({ close }: { close: () => void }) {
  const { c, w, step, today, daysLeft } = useCaseNow();
  const past = c.press.filter((p) => p.date < today).reverse();
  const [lead, ...older] = past;
  const since = step >= 1 && step <= c.decisions.length ? (c.decisions[step - 1].since?.notes ?? []) : [];
  const mine = w.poll[c.follow] ?? 0, mineStart = c.start.poll[c.follow] ?? 0;
  const standing = FACTIONS_2013.map((f) => ({ f, v: factionNow(f, w.groups, mine, mineStart, factionWork()) })).sort((a, b) => b.v - a.v);
  const poll = c.candidates.map((x) => ({ id: x.id, name: x.id === c.follow ? "You" : x.name, v: Math.round(w.poll[x.id] ?? 0) })).filter((x) => x.v > 0).sort((a, b) => b.v - a.v).slice(0, 5);
  const [head, body] = lead ? split(lead.summary) : ["", ""];
  // What the rival campaigns did since the student last decided. Their moves are simulated (lib/cases/rivals).
  const rivals = useCase((s) => s.work).filter((x) => x.by !== c.follow && c.candidates.some((r) => r.id === x.by) && x.date >= dateOf(c, step)).reverse();

  return (
    <div className="overflow-y-auto px-10 pt-9 pb-8">
      <div className="tnum flex justify-between pr-8 font-mono text-[11px] text-faint">
        <span>{longDate(today)}</span><span>{daysLeft ? `${daysLeft} days to the primary` : "Primary day"}</span><span>Morning edition</span>
      </div>
      <h1 className="mt-4 border-y border-line-strong py-3 text-center font-serif text-[42px] leading-none tracking-tight">The Five Borough Ledger</h1>

      <div className="mt-7 flex items-center gap-2"><Label>Lead story</Label><Tag kind="real" /></div>
      {lead ? (
        <>
          <h2 className="mt-2 font-serif text-[30px] leading-[1.1] tracking-tight">{head}</h2>
          {body && <p className="mt-3 max-w-[62ch] text-[14px] leading-relaxed text-soft">{body}</p>}
          <p className="mt-2 text-[12px] text-muted">{lead.outlet}, {longDate(lead.date)}<Cite c={c} id={lead.source} /> · paraphrased, not the article&rsquo;s own words</p>
        </>
      ) : (
        <>
          <h2 className="mt-2 font-serif text-[30px] leading-[1.1] tracking-tight">The race for mayor opens</h2>
          <div className="mt-3 max-w-[62ch]"><Claims c={c} items={c.briefing.slice(1, 4)} /></div>
        </>
      )}

      <div className="mt-8 grid grid-cols-2 gap-8 border-t border-line pt-6">
        <article>
          <Label>Since your last decision</Label>
          {since.length ? <div className="mt-2"><Claims c={c} items={since} /></div> : <p className="mt-2 text-[13px] leading-relaxed text-muted">Nothing new to report. The next decision brings the next news.</p>}
        </article>
        <article>
          <Label>Earlier coverage</Label>
          {older.length ? (
            <ul className="mt-2 space-y-3">
              {older.slice(0, 3).map((p) => (
                <li key={p.date + p.source} className="text-[13px] leading-relaxed text-soft">
                  <div className="text-[11.5px] text-muted">{p.outlet}, {longDate(p.date)}</div>
                  {p.summary}<Cite c={c} id={p.source} />
                </li>
              ))}
            </ul>
          ) : <p className="mt-2 text-[13px] leading-relaxed text-muted">This is the first edition of the campaign.</p>}
        </article>
      </div>

      {!!rivals.length && (
        <div className="mt-8 border-t border-line pt-6">
          <div className="flex items-center gap-2"><Label>What your rivals did</Label><Tag kind="sim" /></div>
          <ul className="mt-2 space-y-1.5">
            {rivals.slice(0, 6).map((x) => (
              <li key={x.id} className="text-[13px] leading-relaxed text-soft"><span className="tnum mr-2 font-mono text-[11px] text-muted">{longDate(x.date)}</span>{x.note}</li>
            ))}
          </ul>
          <p className="mt-2 text-[12px] text-muted">The candidates are real. These moves are the simulation&rsquo;s: each rival campaign reacts to what yours did.</p>
        </div>
      )}

      <div className="mt-8 grid grid-cols-2 gap-8 border-t border-line pt-6">
        <div>
          <div className="flex items-center gap-2"><Label>The poll</Label><Tag kind="sim" /></div>
          <div className="mt-3 space-y-2.5">
            {poll.map((x) => (
              <div key={x.id} className="flex items-center gap-3 text-[13px]">
                <span className="w-32 truncate text-soft">{x.name}</span>
                <Meter value={x.v * 2} color={x.id === c.follow ? "var(--color-warm)" : "rgb(255 243 223 / .4)"} className="flex-1" />
                <span className="tnum w-8 text-right font-mono text-[12px]">{x.v}%</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="flex items-center gap-2"><Label>Where you stand</Label><Tag kind="sim" /></div>
          <div className="mt-3 space-y-2 text-[13px]">
            <div className="flex gap-2.5"><ArrowUp className="mt-0.5 size-3.5 shrink-0 text-warm" /><span className="text-soft">Strongest with {standing.slice(0, 3).map((x) => `${x.f.name} (${Math.round(x.v)}%)`).join(", ")}</span></div>
            <div className="flex gap-2.5"><ArrowDown className="mt-0.5 size-3.5 shrink-0 text-cool" /><span className="text-soft">Weakest with {standing.slice(-3).reverse().map((x) => `${x.f.name} (${Math.round(x.v)}%)`).join(", ")}</span></div>
          </div>
        </div>
      </div>

      <div className="mt-8 flex justify-end"><Button variant="primary" onClick={close}>Start the day</Button></div>
    </div>
  );
}
