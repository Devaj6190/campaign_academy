"use client";

import { create } from "zustand";
import { finished } from "../cases/clock";
import { FACTIONS_2013 } from "../cases/mayor2013-factions";
import { LEANINGS_2013 } from "../cases/mayor2013-leanings";
import { platformAt } from "../cases/platform";
import { currentCase, longDate, useCase } from "../cases/store";
import { effectOf } from "../engine/resolve";
import { profileFor } from "../staff/roster";
import { apply, feed } from "../staff/run";
import { useStaff } from "../staff/store";
import { useGame } from "../store";
import { canAdd, effectsOf, PLANK_CITYWIDE, rulesShape, type Plank, type ShapeRequest, type Shaped } from "./rules";

// The student's own additions to the platform: ask the Policy Director (or a staffer, while that post is vacant) to
// shape an idea, then adopt it. An adopted plank lands on the case's work layer like any other work. Simulated.

export const usePlanks = create<{ planks: Plank[] }>(() => ({ planks: [] }));
// A restarted case starts with the platform on record only.
useCase.subscribe((s) => { if (s.at === 0 && s.work.length === 0 && usePlanks.getState().planks.length) usePlanks.setState({ planks: [] }); });

const director = () => {
  const p = useGame.getState().staff.find((x) => x.id === "pol" && x.name);
  if (!p) return null;
  const prof = useStaff.getState().hires.pol ?? profileFor("pol", p.role);
  return { name: `the ${p.role}`, voice: prof.voice, effect: prof.effect };
};

export async function shapeIdea(idea: string): Promise<Shaped> {
  const s = useCase.getState(), c = currentCase(s.caseId);
  const d = director();
  const req: ShapeRequest = {
    idea,
    factions: FACTIONS_2013.map((f) => ({ id: f.id, name: f.name, ...LEANINGS_2013[f.id] })),
    planks: [...platformAt(c, s.at, s.picks).map((p) => p.text), ...usePlanks.getState().planks.map((p) => p.text)],
    candidate: c.candidates.find((x) => x.id === c.follow)?.name ?? c.follow,
    framing: `This is a nonpartisan teaching simulation built on ${c.title[0].toLowerCase()}${c.title.slice(1)}. Today is ${longDate(s.date)}.`,
    director: d ? { name: d.name, voice: d.voice } : null,
  };
  try {
    const res = await fetch("/api/manifesto/shape", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(req) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as Shaped;
  } catch {
    return rulesShape(req, d ? "pol" : "staff");
  }
}

/** Why a plank cannot go in right now, or null when it can. */
export function blocked(): string | null {
  if (finished()) return "The campaign is over.";
  if (!canAdd(usePlanks.getState().planks, useCase.getState().at)) return "One plank between each pair of decisions. A platform that changes every week reads as a weathervane.";
  return null;
}

/** Put a shaped plank in the platform for good. Returns why it can't, or null. */
export function commit(s: Shaped): string | null {
  const no = blocked();
  if (no) return no;
  // A Policy Director's draft lands better than a generic one; an agent's draft better than a keyword match.
  const d = director();
  const quality = (s.by === "pol" && d ? Math.min(1.3, 1 + (d.effect - 1) + 0.1) : 0.8) * (s.mode === "live" ? 1 : 0.85);
  const { at, date } = useCase.getState();
  apply(effectOf({ by: "platform", action: "plank", label: "Platform plank", summary: s.text, factions: effectsOf(s, quality) }), PLANK_CITYWIDE);
  usePlanks.setState((x) => ({ planks: [...x.planks, { text: s.text, at, date, by: s.by, serves: s.serves, offends: s.offends, tradeoff: s.tradeoff }] }));
  feed("platform", `New plank in the platform: ${s.text}`, "pos");
  return null;
}
