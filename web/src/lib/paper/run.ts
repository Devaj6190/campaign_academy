"use client";

import { largestGroup } from "../demographics";
import { districtBy } from "../geo";
import { appearancesToday, DAILY } from "../candidate";
import { resolve } from "../engine/resolve";
import { snapshot } from "../staff/run";
import { useStaff } from "../staff/store";
import { useGame } from "../store";
import { canPay } from "../money/run";
import { buildEdition, factsOf, type Edition, type Kind, type Story } from "./edition";
import type { WriteResult } from "./newsroom";
import { ME } from "../scenario";

// Puts each edition together: the template goes out at once, the newsroom's copy replaces it when ready.

const same = (e: Edition, day: number, kind: Kind) => e.day === day && e.kind === kind;

function patch(day: number, kind: Kind, fn: (e: Edition) => Edition) {
  useGame.setState((g) => ({ editions: g.editions.map((e) => (same(e, day, kind) ? fn(e) : e)) }));
}

export async function publishEdition(kind: Kind = "daily") {
  const g = useGame.getState();
  if (g.editions.some((e) => same(e, g.day, kind))) return;
  const ed = buildEdition(g, kind);
  useGame.setState((s) => ({ editions: [...s.editions, ed], paperIndex: null }));
  try {
    const res = await fetch("/api/paper/write", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ facts: factsOf(ed) }) });
    const out = (await res.json()) as WriteResult;
    if (out.mode !== "live") return;
    const pick = <T extends Story>(mine: T, theirs?: Story | null): T => (theirs ? { ...mine, kicker: theirs.kicker, headline: theirs.headline, body: theirs.body } : mine);
    patch(ed.day, kind, (e) => ({
      ...e,
      mode: "live",
      lead: pick(e.lead, out.stories.lead),
      campaign: pick(e.campaign, out.stories.campaign),
      opposition: pick(e.opposition, out.stories.opposition),
      editorial: pick(e.editorial, out.stories.editorial),
      city: e.city.map((s, i) => pick(s, out.stories.city?.[i])),
      letters: e.letters.map((s, i) => pick(s, out.stories.letters?.[i])),
    }));
  } catch (err) {
    console.warn("[paper] newsroom unavailable, template stands:", err);
  }
}

export function markRead(e: Edition) {
  if (!e.read) patch(e.day, e.kind, (x) => ({ ...x, read: true }));
}

/** The front page can be answered: Cole speaks himself, Comms handles it, or the campaign lets it pass. */
export function respond(e: Edition, choice: "statement" | "staff" | "pass"): string {
  const r = e.lead.respond;
  if (!r || e.decision) return "";
  const g = useGame.getState();
  if (choice === "statement") {
    if (appearancesToday(g) >= DAILY) return `${ME.short} has already made ${DAILY} appearances today. Hand it to Comms instead.`;
    const cd = r.cd;
    const action = r.kind === "attack" ? "rapid_response" : "coalition_meeting";
    const faction = r.faction ?? (cd ? largestGroup(cd) : undefined);
    const effect = resolve(snapshot(), "candidate", action, { district: cd, faction }, { quality: 1, seed: g.day * 977 + (cd ?? 0), load: 0 });
    const pay = canPay(action, effect.cost);
    if (!pay.ok) return pay.text;
    g.applyEffect({ ...effect, summary: `${ME.short} answered the Ledger's front page ("${e.lead.headline}"): ${effect.summary}` }, "candidate");
    patch(e.day, e.kind, (x) => ({ ...x, decision: "respond" }));
    return `${ME.short} responded in person.`;
  }
  if (choice === "staff") {
    const group = r.faction ? g.factions.find((f) => f.id === r.faction)?.name.toLowerCase() : undefined;
    const order = `Respond to today's front page, "${e.lead.headline}"${group ? `, for ${group}` : ""}${r.cd ? ` in ${districtBy(r.cd)?.name.split("-")[0] ?? "the district"}` : ""}`;
    useStaff.setState((s) => ({ draft: { ...s.draft, com: order } }));
    patch(e.day, e.kind, (x) => ({ ...x, decision: "staff" }));
    useGame.setState({ overlay: null, view: "war", person: "com" });
    return "Sent to Leo.";
  }
  patch(e.day, e.kind, (x) => ({ ...x, decision: "pass" }));
  return "Let it pass. The rivals will have noticed.";
}
