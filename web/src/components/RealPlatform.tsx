"use client";

import { ACTIVE, ME } from "@/lib/scenario";
import { CASE } from "@/lib/scenario/case";
import type { Plank, Reaction } from "@/lib/cases/types";
import { useGame } from "@/lib/store";
import { Cite } from "@/views/CaseView";
import { Label, Tag } from "./ui";

// The real 2013 platforms, as history reaches them in the game: what a real campaign ran on, who welcomed it
// and who objected, cited. A plank that was the real answer to a moment waits until that moment has come up.

const iso = (day: number) => ACTIVE.dateOf?.(day).toISOString().slice(0, 10) ?? "9999-12-31";

/** Real planks for a candidate that were on record by this game day. */
export function realPlanksAt(by: string, day: number, moments: Record<string, { status: string }>): Plank[] {
  if (ACTIVE.kind !== "real") return [];
  const today = iso(day);
  return CASE.platform
    .filter((p) => (p.by ?? CASE.follow) === by && p.asOf <= today)
    .filter((p) => !p.decision || (moments[p.decision] && moments[p.decision].status !== "pending"))
    .sort((a, b) => a.asOf.localeCompare(b.asOf));
}

const reactions = (p: Plank, day: number): Reaction[] => {
  const today = iso(day);
  const legacy: Reaction[] = [...(p.likedBy ? [{ ...p.likedBy, who: "Reported", stance: "for" as const }] : []), ...(p.dislikedBy ? [{ ...p.dislikedBy, who: "Reported", stance: "against" as const }] : [])];
  return [...(p.reactions ?? []), ...legacy].filter((r) => !r.asOf || r.asOf <= today);
};

export function RealPlatform() {
  const day = useGame((s) => s.day);
  const moments = useGame((s) => s.moments);
  const planks = realPlanksAt(ME.id, day, moments);
  if (ACTIVE.kind !== "real") return null;
  return (
    <section className="mt-6 rounded-xl border border-line bg-surface p-4">
      <div className="flex items-center gap-2"><Label>How the real campaign did it</Label><Tag kind="real" /></div>
      <p className="mt-1 text-[11.5px] text-faint">What {ME.name} actually ran on in 2013, as far as the race has got. For reference: your platform is yours.</p>
      {planks.length ? (
        <ul className="mt-3 space-y-4">
          {planks.map((p) => (
            <li key={p.text}>
              <div className="text-[13px] leading-relaxed">{p.text}{p.sources.map((id) => <Cite key={id} c={CASE} id={id} />)}</div>
              <div className="text-[11px] text-faint">On record from {p.asOf}</div>
              <ul className="mt-1 space-y-0.5">
                {reactions(p, day).map((r, i) => (
                  <li key={i} className="text-[12px] text-muted">
                    <span className={r.stance === "for" ? "text-pos" : "text-neg"}>{r.stance === "for" ? "For it" : "Against it"} · </span>
                    <span className="text-soft">{r.who}: </span>{r.text}{r.sources.map((id) => <Cite key={id} c={CASE} id={id} />)}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-[12px] text-faint">Nothing more on the record yet.</p>
      )}
    </section>
  );
}

/** Two lines for a rival's card: their real planks on record by now. */
export function RealPlanksBrief({ id }: { id: string }) {
  const day = useGame((s) => s.day);
  const moments = useGame((s) => s.moments);
  const planks = realPlanksAt(id, day, moments).slice(-2);
  if (!planks.length) return null;
  return (
    <div className="mt-2 border-t border-line pt-2">
      <div className="flex items-center gap-1.5 text-[10.5px] text-faint">Real 2013 positions <Tag kind="real" /></div>
      <ul className="mt-1 space-y-1 text-[11.5px] text-soft">{planks.map((p) => <li key={p.text}>{p.text}{p.sources.slice(0, 1).map((s) => <Cite key={s} c={CASE} id={s} />)}</li>)}</ul>
    </div>
  );
}
