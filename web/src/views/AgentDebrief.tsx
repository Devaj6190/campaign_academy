"use client";

import { useEffect } from "react";
import { create } from "zustand";
import { RotateCcw } from "lucide-react";
import { Button, Label, Section } from "@/components/ui";
import { finished } from "@/lib/cases/clock";
import { useCase } from "@/lib/cases/store";
import type { Case } from "@/lib/cases/types";
import { campaignRecord } from "@/lib/debrief/record";
import type { Debrief, DebriefResponse } from "@/lib/debrief/types";
import { cn } from "@/lib/util";

// The written debrief at the end of the campaign: a live deep agent (lib/debrief/agent.ts) reads the student's whole
// campaign and the sourced record and writes it. It sits above the plain debrief and never replaces it. It is held
// for this campaign only: a restart, another case or a loaded save writes a new one. Not saved.

type State = { key: string; status: "idle" | "writing" | "ready" | "off" | "error"; debrief?: Debrief };
const useDebrief = create<State>(() => ({ key: "", status: "idle" }));

/** Which finished campaign a debrief belongs to. Work that lands after election day does not make it a new one. */
const keyOf = (s: ReturnType<typeof useCase.getState>) => `${s.caseId}|${JSON.stringify(s.picks)}`;

// Another campaign (a restart, another case, a loaded save) gets a new debrief: the work layer shrinking or starting
// differently is the sign, since one campaign's work only ever grows.
useCase.subscribe((s, p) => {
  if (s.caseId !== p.caseId || s.at < p.at || s.work.length < p.work.length || (p.work.length && s.work[0]?.note !== p.work[0]?.note)) useDebrief.setState({ key: "", status: "idle", debrief: undefined });
});

async function write(key: string) {
  // Already being written for this campaign (an effect that runs twice, a second render): one agent run only.
  const now = useDebrief.getState();
  if (now.key === key && now.status === "writing") return;
  useDebrief.setState({ key, status: "writing", debrief: undefined });
  let next: State;
  try {
    const res = await fetch("/api/debrief", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(campaignRecord()) });
    const out = (await res.json()) as DebriefResponse;
    next = out.mode === "live" ? { key, status: "ready", debrief: out.debrief } : { key, status: out.mode === "off" ? "off" : "error" };
  } catch {
    next = { key, status: "error" };
  }
  // A restart or a loaded save while it was writing: this one belongs to a campaign that is gone.
  if (useDebrief.getState().key === key) useDebrief.setState(next);
}

function Cite({ c, id }: { c: Case; id: string }) {
  const i = c.sources.findIndex((s) => s.id === id);
  const s = c.sources[i];
  if (!s) return null;
  return <a href={s.url} target="_blank" rel="noreferrer" title={`${s.title} · ${s.publisher}`} className="ml-1 align-super text-[10.5px] text-gold hover:underline">[{i + 1}]</a>;
}

export function AgentDebrief({ c }: { c: Case }) {
  const key = useCase(keyOf);
  const { status, debrief, key: held } = useDebrief();
  const done = finished();

  useEffect(() => {
    if (done && held !== key) void write(key);
  }, [done, held, key]);

  if (!done || status === "off") return null;
  const current = held === key;

  return (
    <Section title="Your debrief">
      {(!current || status === "writing" || status === "idle") && <p className="text-[13.5px] text-muted">Reading your whole campaign against the record: every order, report and decision. This takes a minute or two.</p>}
      {current && status === "error" && (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-[13.5px] text-muted">The written debrief could not be finished. Your decisions against the record are below.</p>
          <Button size="sm" onClick={() => void write(key)}><RotateCcw className="size-3.5" /> Try again</Button>
        </div>
      )}
      {current && status === "ready" && debrief && (
        <div className="space-y-5">
          <div>
            <h2 className="font-serif text-[26px] leading-tight text-fg">{debrief.headline}</h2>
            <p className="mt-2 text-[14.5px] leading-relaxed text-soft">{debrief.summary}</p>
          </div>
          {!!debrief.lessons.length && (
            <div>
              <Label>What to take from it</Label>
              <ul className="mt-1.5 list-disc space-y-1 pl-5 text-[14px] text-soft">{debrief.lessons.map((l, i) => <li key={i}>{l}</li>)}</ul>
            </div>
          )}
          <div className="space-y-3">
            {debrief.decisions.map((x) => {
              const i = c.decisions.findIndex((d) => d.id === x.decision);
              return (
                <div key={x.decision} className="rounded-lg border border-line bg-raised p-4">
                  <div className="flex justify-between gap-3 text-[14px]">
                    <span className="font-medium">{i + 1}. {c.decisions[i]?.title}</span>
                    <span className={cn("shrink-0 text-[11.5px]", x.same ? "text-pos" : "text-gold")}>{x.same ? "Same call as the real campaign" : "A different call"}</span>
                  </div>
                  <p className="mt-2 text-[13.5px] leading-relaxed text-soft">{x.analysis}{x.sources.map((id) => <Cite key={id} c={c} id={id} />)}</p>
                  {x.lesson && <p className="mt-2 text-[13px] text-muted"><span className="text-fg">Lesson: </span>{x.lesson}</p>}
                </div>
              );
            })}
          </div>
          {debrief.staff && <div><Label>How you ran your staff</Label><p className="mt-1.5 text-[14px] leading-relaxed text-soft">{debrief.staff}</p></div>}
          {debrief.rivals && <div><Label>The rival campaigns</Label><p className="mt-1.5 text-[14px] leading-relaxed text-soft">{debrief.rivals}</p></div>}
          <p className="text-[11.5px] text-faint">Written by a live agent after election day, from your campaign&rsquo;s record and the sourced 2013 record. What your campaign did is simulated; every real-world claim cites its source.</p>
        </div>
      )}
    </Section>
  );
}
