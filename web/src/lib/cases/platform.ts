import type { Case, Plank, Reaction } from "./types";

// What each candidate had put on the record by the student's current step. Pure, so every screen agrees.
// A plank that was the real campaign's answer to a decision stays hidden until the student has made it.

/** The date a step stands for: the briefing, a decision's date, or election day for the debrief. */
export const dateOfStep = (c: Case, step: number) => (step === 0 ? c.briefingDate : (c.decisions[step - 1]?.date ?? c.electionDate));

export const isDebrief = (c: Case, step: number) => step > c.decisions.length;

/** Planks on record for one candidate (the followed one by default) at this step, oldest first. */
export function platformAt(c: Case, step: number, picks: Record<string, unknown>, by = c.follow): Plank[] {
  const today = dateOfStep(c, step);
  return c.platform
    .filter((p) => (p.by ?? c.follow) === by)
    .filter((p) => p.asOf <= today || isDebrief(c, step))
    .filter((p) => !p.decision || picks[p.decision] !== undefined || isDebrief(c, step))
    .sort((a, b) => a.asOf.localeCompare(b.asOf));
}

/** Reactions to a plank, including the older single liked-by / disliked-by fields. */
export function reactionsOf(p: Plank): Reaction[] {
  const legacy: Reaction[] = [
    ...(p.likedBy ? [{ ...p.likedBy, who: "Reported", stance: "for" as const }] : []),
    ...(p.dislikedBy ? [{ ...p.dislikedBy, who: "Reported", stance: "against" as const }] : []),
  ];
  return [...(p.reactions ?? []), ...legacy];
}

/** Reactions that had happened by this step (all of them at the debrief). */
export const reactionsAt = (c: Case, p: Plank, step: number) => {
  const today = dateOfStep(c, step);
  return reactionsOf(p).filter((r) => !r.asOf || r.asOf <= today || isDebrief(c, step));
};

/** The decisions where a candidate's positions were at stake. */
const PLATFORM_SKILLS = new Set(["policy", "voter-groups"]);

/** The options the student has picked at platform-type decisions so far, labelled as theirs. */
export function choicesSoFar(c: Case, picks: Record<string, { option: string }>) {
  return c.decisions
    .filter((d) => PLATFORM_SKILLS.has(d.skill) && picks[d.id])
    .map((d) => {
      const o = d.options.find((x) => x.id === picks[d.id].option);
      return { decision: d.id, title: d.title, date: d.date, label: o?.label ?? picks[d.id].option, detail: o?.detail ?? "" };
    });
}

/** Rival candidates with at least one plank in the case. */
export const rivalsWithPlatform = (c: Case) => c.candidates.filter((x) => x.id !== c.follow && c.platform.some((p) => p.by === x.id));
