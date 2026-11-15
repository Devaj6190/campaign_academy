import type { FinalRec } from "./free";
import type { Rec } from "./replay";

// The tables the eval reports (#28), read from the saved records after a run. Agreement is how often the agent chose
// what the real person chose; chance is one over the number of options. For the changed-facts cards the same count
// means the opposite: it is how often the agent stuck to the 2013 choice when the facts said otherwise.

const pct = (a: number, b: number) => (b ? `${Math.round((100 * a) / b)}%` : "–");

function line(rs: Rec[]) {
  const scored = rs.filter((r) => r.onReal !== null);
  const real = scored.filter((r) => r.onReal).length;
  const chance = rs.length ? rs.reduce((a, r) => a + 1 / r.order.length, 0) / rs.length : 0;
  return { real, scored: scored.length, none: rs.length - scored.length, chance };
}

const TITLE: Record<Rec["kind"], string> = { case: "Case decisions (the campaigner)", adviser: "Adviser fidelity", heldout: "Held-out decisions", free: "Free run (the whole system)" };

export function summarise(all: (Rec | FinalRec)[]): string {
  const out: string[] = [];
  const recs = all.filter((r): r is Rec => r.kind !== "final");
  const finals = all.filter((r): r is FinalRec => r.kind === "final");
  const kinds = [...new Set(recs.map((r) => r.kind))];
  for (const kind of kinds) {
    const rs = recs.filter((r) => r.kind === kind);
    const conds = [...new Set(rs.map((r) => r.cond))];
    const decisions = [...new Set(rs.map((r) => r.decision))];
    out.push(`\n### ${TITLE[kind]}\n`);
    // The grounding scores come first: they are the ones that matter (docs/evals.md, section 3).
    const unrec = line(rs.filter((r) => r.cond === "masked" && r.recognised === false));
    const rec = line(rs.filter((r) => r.cond === "masked" && r.recognised === true));
    const ch = line(rs.filter((r) => r.cond === "changed"));
    if (unrec.scored + rec.scored || ch.scored) {
      out.push("Grounding:");
      if (unrec.scored + rec.scored) out.push(`- Masked cards not recognised: ${unrec.scored} of ${unrec.scored + rec.scored}; on those, ${unrec.real}/${unrec.scored} on the real choice (${pct(unrec.real, unrec.scored)}). On recognised ones: ${rec.real}/${rec.scored}.`);
      if (ch.scored) out.push(`- Changed facts followed (moved off the 2013 choice): ${ch.scored - ch.real}/${ch.scored} (${pct(ch.scored - ch.real, ch.scored)}).`);
      out.push("");
    }
    out.push(`| Condition | On the real choice | Chance | No answer |`, `|---|---|---|---|`);
    for (const cond of conds) {
      const l = line(rs.filter((r) => r.cond === cond));
      out.push(`| ${cond === "changed" ? "changed (stuck to 2013)" : cond} | ${l.real}/${l.scored} (${pct(l.real, l.scored)}) | ${Math.round(l.chance * 100)}% | ${l.none} |`);
    }
    out.push("", `| Decision | ${conds.join(" | ")} |`, `|---|${conds.map(() => "---").join("|")}|`);
    for (const d of decisions) {
      const cells = conds.map((cond) => { const l = line(rs.filter((r) => r.decision === d && r.cond === cond)); return l.scored ? `${l.real}/${l.scored}` : "–"; });
      out.push(`| ${d}${rs.find((r) => r.decision === d && r.kind === "adviser") ? ` (${rs.find((r) => r.decision === d)!.person})` : ""} | ${cells.join(" | ")} |`);
    }
    const probed = rs.filter((r) => r.recognised !== undefined);
    if (probed.length) out.push("", `Masked cards recognised as the real race: ${probed.filter((r) => r.recognised).length}/${probed.length}.`);
    const memo = rs.filter((r) => r.memos?.length && r.chosen);
    if (memo.length) out.push(`Choices that matched one of the two staff memos: ${memo.filter((r) => r.memos!.some((m) => m.option === r.chosen)).length}/${memo.length}.`);
    const read = rs.filter((r) => r.mode === "live" && r.cond !== "recall");
    if (read.length) out.push(`Live decisions that read the map, voter groups or paper first: ${read.filter((r) => r.read.length).length}/${read.length}.`);
    if (kind === "free") {
      // After a run's first choice that differs from 2013, the race is no longer the real one: count those apart.
      const order = new Map(decisions.map((d, i) => [d, i]));
      const after = rs.filter((r) => { const f = finals.find((x) => x.n === r.n)?.firstDifferent; return f !== null && f !== undefined && order.get(r.decision)! > order.get(f)!; });
      const l = line(after);
      out.push(`After each run's first different choice: ${l.real}/${l.scored} on the real choice.`);
    }
  }
  if (finals.length) {
    out.push("", "### Free run results (context, not the score: the simulation is fitted to the real result)", "", "| Run | De Blasio | Leader | Runoff | First different choice | Orders | Staff jobs | Rival moves |", "|---|---|---|---|---|---|---|---|");
    for (const f of finals) { const [lead, share] = Object.entries(f.poll).sort((a, b) => b[1] - a[1])[0]; out.push(`| ${f.n + 1} | ${f.poll.deblasio ?? 0} | ${lead} ${share} | ${f.runoff ? "yes" : "no"} | ${f.firstDifferent ?? "none"} | ${f.orders} | ${f.staffJobs} | ${f.rivalMoves} |`); }
    out.push("", "Certified result: de Blasio 40.81, Thompson 26.14, Quinn 15.74; no runoff.");
  }
  const dropped = [...new Set(recs.flatMap((r) => (r.dropped ?? []).map((t) => `${r.decision}: ${t}`)))];
  if (dropped.length) out.push("", "Card lines left out because they state something not yet known on the card's date:", ...dropped.map((t) => `- ${t}`));
  const modes = [...new Set(recs.map((r) => r.mode))];
  out.push("", `Mode: ${modes.join(", ")}${modes.includes("rules") ? " (rules: no API key, the chips decide; not a measurement of the agents)" : ""}.`);
  return out.join("\n");
}
