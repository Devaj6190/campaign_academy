import type { LedgerEntry } from "../store";
import { effectOf, type Effect } from "./resolve";

// Debates on days 7 and 21. Cole is judged on what he can stand behind: how many planks his manifesto
// has, whether they hang together (few groups left angry), and whether he arrives with momentum.

export const DEBATE_DAYS = [7, 21];

type World = { day: number; manifesto: string[]; ledger: LedgerEntry[]; polls: { cole: number }[] };

export function debate(w: World): { effect: Effect; score: number; story: string } {
  const planks = w.manifesto.length;
  const net: Record<string, number> = {};
  for (const l of w.ledger) if (l.source === "manifesto") for (const [f, d] of Object.entries(l.effect.factions)) net[f] = (net[f] ?? 0) + d;
  const angry = Object.values(net).filter((d) => d < -4).length;
  // Momentum as the public sees it: Cole's change across the last two published polls.
  const trend = w.polls.length >= 2 ? w.polls[w.polls.length - 1].cole - w.polls[w.polls.length - 2].cole : 0;
  const score = Math.max(-1, Math.min(1, (planks - 4) * 0.22 - angry * 0.15 + trend * 0.12));
  const best = Object.entries(net).sort((a, b) => b[1] - a[1])[0]?.[0];
  const effect = effectOf({
    by: "debate",
    action: "plank",
    label: "Debate",
    momentum: score * 1.4,
    factions: best ? { [best]: Math.round(score * 30) / 10 } : {},
    summary:
      score > 0.3
        ? `Cole won the day ${w.day} debate: ${planks} clear planks and a consistent case.`
        : score < -0.2
          ? `Cole struggled in the day ${w.day} debate: ${planks < 5 ? `only ${planks} planks to stand on` : "too many groups left angry by his platform"}.`
          : `The day ${w.day} debate was a draw. Cole held his ground without breaking through.`,
  });
  return { effect, score, story: effect.summary };
}
