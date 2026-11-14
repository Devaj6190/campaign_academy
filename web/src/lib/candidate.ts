"use client";

import { largestGroup } from "./demographics";
import { resolve, type Effect } from "./engine/resolve";
import { snapshot } from "./staff/run";
import { useStaff } from "./staff/store";
import { shortPlace } from "./staff/world";
import { useGame } from "./store";
import { canPay } from "./money/run";

// The candidate in person. Better than staff, but scarce: two appearances a day, so the rest has to be
// delegated. Runs through the same rules engine and lands in the same ledger as everything else.

export const DAILY = 2;

export const APPEARANCES = [
  { id: "canvass", label: "Door knock", note: "Moves this district" },
  { id: "rally", label: "Rally", note: "Big, visible, costly" },
  { id: "house_party", label: "House party", note: "Raises money" },
  { id: "coalition_meeting", label: "Town hall", note: "Meets the biggest local group" },
] as const;
export type Appearance = (typeof APPEARANCES)[number]["id"];

export const appearancesToday = (g = useGame.getState()) => g.ledger.filter((l) => l.source === "candidate" && l.day === g.day).length;

/** Preview what an appearance would cost and do, without doing it. */
export function preview(cd: number, id: Appearance): Effect {
  const g = useGame.getState();
  const faction = id === "coalition_meeting" ? largestGroup(cd) : g.filter !== "all" ? g.filter : undefined;
  return resolve(snapshot(), "candidate", id, { district: cd, faction }, { quality: 1, seed: g.day * 1000 + cd, load: 0 });
}

export function appear(cd: number, id: Appearance): { ok: boolean; text: string; effect?: Effect } {
  const g = useGame.getState();
  if (appearancesToday(g) >= DAILY) return { ok: false, text: `Cole has already made ${DAILY} appearances today. Send staff instead.` };
  const effect = preview(cd, id);
  const pay = canPay(id, effect.cost);
  if (!pay.ok) return { ok: false, text: pay.text };
  g.applyEffect(effect, "candidate");
  return { ok: true, text: effect.summary, effect };
}

/** Hand a district to the Field Director with a ready-made order the player can edit before sending. */
export function sendStaff(cd: number) {
  const g = useGame.getState();
  const group = g.filter !== "all" ? g.factions.find((f) => f.id === g.filter)?.name : g.factions.find((f) => f.id === largestGroup(cd))?.name;
  const order = `Canvass ${shortPlace(cd)}${group ? ` for ${group.toLowerCase()}` : ""} tomorrow`;
  useStaff.setState((s) => ({ draft: { ...s.draft, fd: order } }));
  useGame.setState({ view: "war", person: "fd" });
}
