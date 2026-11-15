import type { LedgerEntry } from "../store";
import { effectOf, type Effect } from "./resolve";
import { ME } from "../scenario";
import { contradictions, type Plank } from "../manifesto/rules";

// Debates on days 7 and 21. The candidate is judged on what they can stand behind: how many planks the
// platform has, how many groups it speaks to, whether it contradicts itself (serving a group with one plank and
// costing it with another), how many groups it leaves angry, and whether they arrive with momentum.

export const DEBATE_DAYS = [7, 21];

type World = { day: number; manifesto: string[]; planks?: Pick<Plank, "serves" | "offends">[]; ledger: LedgerEntry[]; polls: { shares: Record<string, number> }[] };

export function debate(w: World): { effect: Effect; score: number; story: string } {
  const planks = w.manifesto.length;
  const net: Record<string, number> = {};
  for (const l of w.ledger) if (l.source === "manifesto") for (const [f, d] of Object.entries(l.effect.factions)) net[f] = (net[f] ?? 0) + d;
  const angry = Object.values(net).filter((d) => d < -4).length;
  // Momentum as the public sees it: Cole's change across the last two published polls.
  const trend = w.polls.length >= 2 ? (w.polls[w.polls.length - 1].shares[ME.id] ?? 0) - (w.polls[w.polls.length - 2].shares[ME.id] ?? 0) : 0;
  // What the planks say: groups spoken to, and contradictions an opponent will find on stage.
  const covered = new Set((w.planks ?? []).flatMap((p) => p.serves.map((r) => r.faction))).size;
  const contradicts = contradictions(w.planks ?? []).length;
  const score = Math.max(-1, Math.min(1, (planks - 4) * 0.18 + Math.min(4, covered) * 0.05 - contradicts * 0.18 - angry * 0.15 + trend * 0.12));
  const best = Object.entries(net).sort((a, b) => b[1] - a[1])[0]?.[0];
  const effect = effectOf({
    by: "debate",
    action: "plank",
    label: "Debate",
    momentum: score * 1.4,
    factions: best ? { [best]: Math.round(score * 30) / 10 } : {},
    summary:
      score > 0.3
        ? `${ME.short} won the day ${w.day} debate: ${planks} clear planks and a consistent case.`
        : score < -0.2
          ? `${ME.short} struggled in the day ${w.day} debate: ${planks < 5 ? `only ${planks} planks to stand on` : contradicts ? "rivals pointed out a platform that promises the same voters opposite things" : "too many groups left angry by the platform"}.`
          : `The day ${w.day} debate was a draw. ${ME.short} held his ground without breaking through.`,
  });
  return { effect, score, story: effect.summary };
}
