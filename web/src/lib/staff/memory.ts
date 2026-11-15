"use client";

import { useCase } from "../cases/store";
import { useStaff } from "./store";

// What each staffer remembers of this campaign (issue #41, item 5). The whole game lives in the browser and every
// agent is rebuilt on each request, so memory is kept here with the rest of the campaign, sent with each order, and
// handed to the director as its deepagents memory file (lib/staff/agents.ts). A restarted case starts it over.
//
// Two kinds of line: what happened, written here from the run's own results, so it is exact; and at most one lesson
// per order that the director chooses to keep, which has passed the number check before it arrives.

/** The most a post keeps. The oldest lines fall away first. */
export const KEEP = 12;
const MAX_LINE = 240;

const squeeze = (t: string) => t.replace(/\s+/g, " ").trim();

/** One more line in a post's memory, dated today in the campaign. */
export function remember(id: string, line: string) {
  const text = squeeze(line);
  if (!text) return;
  const dated = `${useCase.getState().date}: ${text.length > MAX_LINE ? `${text.slice(0, MAX_LINE - 1)}…` : text}`;
  useStaff.setState((s) => ({ memory: { ...s.memory, [id]: [...(s.memory[id] ?? []), dated].slice(-KEEP) } }));
}

/** The memories that travel with an order: the director's own and those of everyone who reports to them. */
export function memoriesFor(ids: string[]): Record<string, string[]> {
  const m = useStaff.getState().memory;
  return Object.fromEntries(ids.filter((id) => m[id]?.length).map((id) => [id, m[id]]));
}

// A restarted case is another campaign: nobody remembers the last one.
useCase.subscribe((s, p) => {
  if ((s.at < p.at || s.date < p.date) && Object.keys(useStaff.getState().memory).length) useStaff.setState({ memory: {} });
});
