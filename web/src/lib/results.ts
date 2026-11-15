"use client";

import { FACTIONS_2013 } from "./cases/mayor2013-factions";
import { currentCase, useCase, type Work } from "./cases/store";
import { useGame, type Toast } from "./store";
import { shortPlace } from "./staff/world";

// A notification for every result (item 3 of the visible-changes plan): each piece of work that lands on the case,
// a staff job, the candidate in person, a rival's move, shows on whatever screen the student is on, with what it cost
// or raised and what it moved. Work that lands together (one order's jobs, the rivals' round) is grouped into one.

/** Work landing within this long of the last piece from the same source is grouped with it. */
const GROUP_MS = 1500;
const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const signed = (n: number) => `${n >= 0 ? "+" : "−"}${Math.abs(Math.round(n * 10) / 10)}`;

/** What one piece of work did, as chips: money out and in, then the largest movements. */
function chipsOf(w: Work[], follow: string): Toast["chips"] {
  const c = currentCase(useCase.getState().caseId);
  const cost = w.reduce((a, x) => a + x.cost, 0), raised = w.reduce((a, x) => a + x.raised, 0);
  const moved = new Map<string, number>();
  const add = (k: string, v: number) => moved.set(k, (moved.get(k) ?? 0) + v);
  for (const x of w) {
    for (const [cd, v] of Object.entries(x.districts)) add(shortPlace(+cd), v);
    for (const [g, v] of Object.entries(x.groups)) add(c.groups.find((y) => y.id === g)?.name ?? g, v);
    for (const [f, v] of Object.entries(x.factions)) add(FACTIONS_2013.find((y) => y.id === f)?.name ?? f, v);
    for (const [who, v] of Object.entries(x.poll)) if (who === follow) add("Citywide", v);
  }
  const out: NonNullable<Toast["chips"]> = [];
  if (cost) out.push({ text: `−${usd(cost)}`, tone: "neg" });
  if (raised) out.push({ text: `+${usd(raised)} raised`, tone: "pos" });
  // For a rival's move the numbers are what the student lost: they show as falls.
  [...moved.entries()].filter(([, v]) => Math.abs(v) >= 0.05).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 3)
    .forEach(([k, v]) => out.push({ text: `${k} ${signed(v)}`, tone: v >= 0 ? "pos" : "neg" }));
  return out;
}

/** Who did it, for the notification's heading. */
function whoOf(by: string): { name: string; role?: string; kind: Toast["kind"] } {
  const c = currentCase(useCase.getState().caseId);
  if (by === "candidate") return { name: c.candidates.find((x) => x.id === c.follow)?.name ?? "The candidate", role: "In person", kind: "result" };
  const rival = c.candidates.find((x) => x.id === by && x.id !== c.follow);
  if (rival) return { name: rival.name, role: "Rival campaign", kind: "rival" };
  const p = useGame.getState().staff.find((x) => x.id === by);
  if (p) return { name: p.name && p.name !== p.role ? p.name : `The ${p.role}`, role: p.role, kind: "result" };
  if (by === "platform") return { name: "Your platform", kind: "result" };
  return { name: "Your campaign", kind: "result" };
}

let pending: { key: string; work: Work[]; timer: ReturnType<typeof setTimeout> } | null = null;

function flush() {
  if (!pending) return;
  const { work } = pending;
  pending = null;
  const c = currentCase(useCase.getState().caseId);
  const first = work[0];
  const rivals = work.every((x) => x.by !== c.follow && c.candidates.some((r) => r.id === x.by));
  const people = [...new Set(work.map((x) => x.by))];
  // Several of one director's people reporting together are that director's team, and open on the director.
  const staff = useGame.getState().staff;
  const boss = people.length > 1 && !rivals ? staff.find((p) => p.id === staff.find((x) => x.id === first.by)?.boss) : undefined;
  const teamOf = boss && people.every((id) => staff.find((x) => x.id === id)?.boss === boss.id || id === boss.id) ? boss : undefined;
  const who = rivals && people.length > 1 ? { name: "Rival campaigns", role: `${work.length} moves`, kind: "rival" as const }
    : teamOf ? { name: `${teamOf.name && teamOf.name !== teamOf.role ? teamOf.name : `The ${teamOf.role}`}'s team`, role: `${work.length} jobs`, kind: "result" as const }
    : whoOf(first.by);
  // The heading names who did it; a line keeps its "Name: " only when several rivals share one notification.
  const many = people.length > 1;
  const lines = work.map((x) => (x.note ?? x.label).replace(/^[^:]{1,40}: /, (m) => (rivals && many ? m : "")));
  const text = work.length === 1 ? lines[0] : `${lines.slice(0, 2).join(" ")}${work.length > 2 ? ` And ${work.length - 2} more.` : ""}`;
  const cd = Object.keys(first.districts)[0];
  const lead = teamOf?.id ?? first.by;
  const staffer = staff.some((p) => p.id === lead);
  const target: Toast["target"] = staffer ? { view: "war", person: lead } : cd ? { view: "map", district: +cd } : undefined;
  const toast: Toast = { id: Date.now() + Math.random(), staff: staffer ? lead : "", kind: who.kind, name: who.name, role: who.role, text, chips: chipsOf(work, c.follow), target };
  useGame.setState((s) => ({ toasts: [...s.toasts.slice(-2), toast] }));
}

/** Watch the work layer and announce each new piece. Mount once. */
export function watchResults() {
  return useCase.subscribe((s, p) => {
    if (s.work.length <= p.work.length) return; // a restart empties it; nothing to announce
    const c = currentCase(s.caseId);
    for (const w of s.work.slice(p.work.length)) {
      const rival = w.by !== c.follow && c.candidates.some((r) => r.id === w.by);
      // A staff order's jobs come from one director's run; group them by the run's people, rivals all together.
      const key = rival ? "rivals" : w.by === "candidate" ? "candidate" : "staff";
      if (pending && pending.key !== key) { clearTimeout(pending.timer); flush(); }
      if (pending) { clearTimeout(pending.timer); pending.work.push(w); }
      else pending = { key, work: [w], timer: 0 as unknown as ReturnType<typeof setTimeout> };
      pending.timer = setTimeout(flush, GROUP_MS);
    }
  });
}
