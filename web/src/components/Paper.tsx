"use client";

import { ArrowDown, ArrowUp, ChevronDown, Megaphone, MessageSquare, X } from "lucide-react";
import { useState } from "react";
import { DAILY, appearancesToday } from "@/lib/staff/run";
import { currentCase, longDate, shortDate, useCase } from "@/lib/cases/store";
import type { Case } from "@/lib/cases/types";
import { surnameOf, type Edition, type NewsItem } from "@/lib/paper/edition";
import { respond, usePaper } from "@/lib/paper/run";
import { cn } from "@/lib/util";
import { Cite } from "@/views/CaseView";
import { Button, Dialog, Label, Meter, Popover, Tag } from "./ui";

// The morning paper: one page per morning, every edition kept. What it reports from the record is the case's own
// paraphrase of cited coverage, ranked by how much it moved the race, wherever it happened; coverage dated today or
// later is held back, because a later headline can give away what the real campaign chose. What the campaigns did
// is the simulation's, and says so.

export { usePaper };

/** First sentence as the headline, the rest as the story. */
const split = (s: string): [string, string] => {
  const i = s.indexOf(". ");
  return i < 0 ? [s.replace(/\.$/, ""), ""] : [s.slice(0, i), s.slice(i + 2)];
};

export function Paper() {
  const { open, set } = usePaper();
  const close = () => set(false);
  return <Dialog open={open} onClose={close} plate="plate-press" className="max-w-[760px]">{open && <Page close={close} />}</Dialog>;
}

function Page({ close }: { close: () => void }) {
  const editions = usePaper((s) => s.editions);
  const showing = usePaper((s) => s.showing);
  const c = currentCase(useCase((s) => s.caseId));
  const e = editions.find((x) => x.id === showing) ?? editions.at(-1);
  if (!e) return null;
  const latest = e === editions.at(-1);

  return (
    <div className="overflow-y-auto px-10 pt-9 pb-8">
      <div className="tnum flex items-center justify-between pr-8 font-mono text-[11px] text-faint">
        <span>{longDate(e.date)}</span>
        <span>{e.daysLeft ? `${e.daysLeft} days to the primary` : "Primary day"}</span>
        <Archive editions={editions} current={e} />
      </div>
      <h1 className="mt-4 border-y border-line-strong py-3 text-center font-serif text-[42px] leading-none tracking-tight">The Five Borough Ledger</h1>
      {!latest && <p className="mt-3 text-center text-[12px] text-muted">An earlier edition. <button className="text-gold hover:underline" onClick={() => usePaper.getState().show(null)}>Back to this morning</button></p>}

      <Lead c={c} e={e} latest={latest} close={close} />

      {!!e.news.length && (
        <section className="mt-8 border-t border-line pt-6">
          <div className="flex items-center gap-2"><Label>The stories moving the race</Label><Tag kind="real" /></div>
          <ol className="mt-3 space-y-3.5">
            {e.news.map((x) => <Item key={x.key} c={c} x={x} />)}
          </ol>
        </section>
      )}

      <div className="mt-8 grid grid-cols-2 gap-8 border-t border-line pt-6">
        <Sim label="Your campaign" s={e.campaign} />
        <Sim label="Your rivals" s={e.rivals} />
      </div>

      <div className="mt-8 grid grid-cols-2 gap-8 border-t border-line pt-6">
        <div>
          <div className="flex items-center gap-2"><Label>The poll</Label><Tag kind="sim" /></div>
          <div className="mt-3 space-y-2.5">
            {e.poll.map((x) => (
              <div key={x.id} className="flex items-center gap-3 text-[13px]">
                <span className="w-32 truncate text-soft">{x.name}</span>
                <Meter value={x.v * 2} color={x.you ? "var(--color-warm)" : "rgb(255 243 223 / .4)"} className="flex-1" />
                <span className="tnum w-8 text-right font-mono text-[12px]">{x.v}%</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="flex items-center gap-2"><Label>Where you stand</Label><Tag kind="sim" /></div>
          <div className="mt-3 space-y-2 text-[13px]">
            <div className="flex gap-2.5"><ArrowUp className="mt-0.5 size-3.5 shrink-0 text-warm" /><span className="text-soft">Strongest with {e.strong.map((x) => `${x.name} (${x.v}%)`).join(", ")}</span></div>
            <div className="flex gap-2.5"><ArrowDown className="mt-0.5 size-3.5 shrink-0 text-cool" /><span className="text-soft">Weakest with {e.weak.map((x) => `${x.name} (${x.v}%)`).join(", ")}</span></div>
          </div>
        </div>
      </div>

      <section className="mt-8 border-t border-line pt-6">
        <div className="flex items-center gap-2"><Label>Voices of the city</Label><Tag kind="sim" /></div>
        <div className="mt-3 grid grid-cols-2 gap-8">
          {e.voices.map((v) => (
            <article key={v.group}>
              <h3 className="font-serif text-[17px] leading-snug">{v.headline}</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-soft">{v.body}</p>
            </article>
          ))}
        </div>
        <p className="mt-3 text-[12px] text-muted">Letters are written for this exercise from what each group is likely to value. They are not real letters.</p>
      </section>

      <div className="mt-8 flex justify-end"><Button variant="primary" onClick={close}>{latest ? "Start the day" : "Close"}</Button></div>
    </div>
  );
}

function Archive({ editions, current }: { editions: Edition[]; current: Edition }) {
  return (
    <Popover
      align="end"
      trigger={() => <button className="flex items-center gap-1 transition-colors hover:text-fg">Archive · {editions.length} <ChevronDown className="size-3" /></button>}
      className="w-[300px]"
    >
      <ul className="max-h-[320px] overflow-y-auto py-1.5">
        {[...editions].reverse().map((x) => (
          <li key={x.id}>
            <button onClick={() => usePaper.getState().show(x.id)} className={cn("flex w-full gap-3 px-3.5 py-2 text-left text-[12.5px] transition-colors hover:bg-white/5", x.id === current.id && "text-gold-bright")}>
              <span className="tnum w-14 shrink-0 font-mono text-[11px] text-muted">{shortDate(x.date)}</span>
              <span className="line-clamp-2 font-sans text-soft">{x.lead ? split(x.lead.text)[0] : "The race for mayor opens"}</span>
            </button>
          </li>
        ))}
      </ul>
    </Popover>
  );
}

function Lead({ c, e, latest, close }: { c: Case; e: Edition; latest: boolean; close: () => void }) {
  const [note, setNote] = useState("");
  const [head, body] = e.lead ? split(e.lead.text) : ["The race for mayor opens", ""];
  const left = DAILY - appearancesToday();
  const full = c.candidates.find((x) => x.id === c.follow)?.name;
  const you = full ? surnameOf(full).replace(/^./, (ch) => ch.toUpperCase()) : "The candidate";
  return (
    <section className="mt-7">
      <div className="flex items-center gap-2"><Label>Lead story</Label><Tag kind="real" /></div>
      <h2 className="mt-2 font-serif text-[30px] leading-[1.1] tracking-tight">{head}</h2>
      {e.lead ? (
        <>
          {body && <p className="mt-3 max-w-[62ch] text-[14px] leading-relaxed text-soft">{body}</p>}
          <p className="mt-2 text-[12px] text-muted">
            {e.lead.outlet ? `${e.lead.outlet}, ` : ""}{longDate(e.lead.date)}{e.lead.sources.map((id) => <Cite key={id} c={c} id={id} />)} · paraphrased, not the article&rsquo;s own words
          </p>
          {latest && !e.decision && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button size="sm" variant="primary" disabled={left <= 0} title={left <= 0 ? "No appearances left today" : undefined} onClick={() => setNote(respond(e, "respond"))}>
                <Megaphone className="size-3.5" />{you} responds · {Math.max(0, left)}/{DAILY} left
              </Button>
              <Button size="sm" onClick={() => { respond(e, "staff"); close(); }}><MessageSquare className="size-3.5" />Hand it to Comms</Button>
              <Button size="sm" variant="ghost" onClick={() => setNote(respond(e, "pass"))}><X className="size-3.5" />Let it pass</Button>
            </div>
          )}
          {(note || e.answer) && <p className="mt-3 text-[12px] text-muted">{e.answer ?? note}</p>}
        </>
      ) : (
        <p className="mt-3 max-w-[62ch] text-[14px] leading-relaxed text-soft">{c.briefing.slice(1, 3).map((x) => x.text).join(" ")}{c.briefing.slice(1, 3).flatMap((x) => x.sources).map((id) => <Cite key={id} c={c} id={id} />)}</p>
      )}
    </section>
  );
}

function Item({ c, x }: { c: Case; x: NewsItem }) {
  return (
    <li className="text-[13.5px] leading-relaxed text-soft">
      <div className="text-[11.5px] text-muted">{x.outlet ? `${x.outlet}, ` : ""}{longDate(x.date)}</div>
      {x.text}
      {x.estimate && <span className="ml-1.5 border border-warm/30 px-1 text-[10.5px] tracking-wide text-warm uppercase" title="The tie to this race is our inference, not the source's">Estimate</span>}
      {x.sources.map((id) => <Cite key={id} c={c} id={id} />)}
    </li>
  );
}

function Sim({ label, s }: { label: string; s: { headline: string; body: string } }) {
  return (
    <article>
      <div className="flex items-center gap-2"><Label>{label}</Label><Tag kind="sim" /></div>
      <h3 className="mt-2 font-serif text-[19px] leading-snug">{s.headline}</h3>
      <p className="mt-1.5 text-[13px] leading-relaxed text-soft">{s.body}</p>
    </article>
  );
}
