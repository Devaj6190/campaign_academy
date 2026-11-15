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

export function summarise(recs: Rec[]): string {
  const out: string[] = [];
  const kinds = [...new Set(recs.map((r) => r.kind))];
  for (const kind of kinds) {
    const rs = recs.filter((r) => r.kind === kind);
    const conds = [...new Set(rs.map((r) => r.cond))];
    const decisions = [...new Set(rs.map((r) => r.decision))];
    out.push(`\n### ${kind === "case" ? "Case decisions (the campaigner)" : kind === "adviser" ? "Adviser fidelity" : "Held-out decisions"}\n`);
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
  }
  const dropped = [...new Set(recs.flatMap((r) => (r.dropped ?? []).map((t) => `${r.decision}: ${t}`)))];
  if (dropped.length) out.push("", "Card lines left out because they state something not yet known on the card's date:", ...dropped.map((t) => `- ${t}`));
  const modes = [...new Set(recs.map((r) => r.mode))];
  out.push("", `Mode: ${modes.join(", ")}${modes.includes("rules") ? " (rules: no API key, the chips decide; not a measurement of the agents)" : ""}.`);
  return out.join("\n");
}
