import { hash } from "../util";
import { effectOf, type Effect } from "./resolve";

// The one bold move: an honest contrast ad. Never deceptive, still risky. The risk is worked out from the
// situation and shown, with its reasons, before the player decides. The roll is seeded: the same situation
// gives the same result.

export type Deliverer = "com" | "pr";
type World = { day: number; poll: { cole: number; hale: number; brandt: number }; ledger: { source: string }[]; factions: { id: string; dislikes: string[] }[] };

export function tacticRisk(w: World, by: Deliverer) {
  const reasons: [string, number][] = [["Any contrast ad can read as an attack", 0.35]];
  const seniors = w.factions.find((f) => f.id === "seniors");
  if (seniors?.dislikes.some((d) => /disorder|change|attack|negative/i.test(d))) reasons.push(["Seniors, the target, dislike disorder and sudden change", 0.15]);
  const before = w.ledger.filter((l) => l.source === "tactic").length;
  if (before) reasons.push([`You have already gone negative ${before === 1 ? "once" : `${before} times`}`, 0.12 * before]);
  reasons.push(by === "com" ? ["Leo delivers it: sharp, but reporters expect a hit job", 0.1] : ["Jo delivers it: reporters trust her", -0.12]);
  const lead = Math.max(w.poll.hale, w.poll.brandt) - w.poll.cole;
  if (lead > 5) reasons.push([`You trail by ${lead}: voters expect a challenger to draw contrasts`, -0.08]);
  const risk = Math.max(0.1, Math.min(0.85, reasons.reduce((a, [, v]) => a + v, 0)));
  return { risk, reasons: reasons.map(([text, v]) => ({ text, v })) };
}

export function tacticOutcome(w: World, by: Deliverer): { backfired: boolean; effect: Effect } {
  const { risk } = tacticRisk(w, by);
  const count = w.ledger.filter((l) => l.source === "tactic").length;
  const backfired = hash(w.day * 31 + count, by === "com" ? 7 : 11) < risk;
  const effect = effectOf({
    by: "tactic",
    action: "tactic",
    label: "Contrast ad",
    cost: 8000,
    momentum: backfired ? -0.4 : 0.3,
    summary: backfired ? `The contrast ad (delivered by ${by === "com" ? "Leo" : "Jo"}) read as an attack. Seniors turned away.` : `The contrast ad (delivered by ${by === "com" ? "Leo" : "Jo"}) landed. Seniors took note.`,
    factions: { seniors: backfired ? -6 : 3 },
  });
  return { backfired, effect };
}
