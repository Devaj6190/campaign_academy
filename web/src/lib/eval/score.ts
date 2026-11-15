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
    // Headline (decided 15 November, after run 3): 1. changed facts followed, with the reworded control beside it;
    // 2. agreement on the card where the model's memory (recall, same run) was wrong; 3. agreement on twins it did
    // not recognise. Masked cards stay as a reported finding.
    // Changed and reworded cards have no chips (the chips were written for the real situation), so both are compared with the card without chips.
    const cardOf = (r: Rec) => rs.find((x) => x.cond === "card" && x.decision === r.decision && x.n === r.n);
    const plainOf = (r: Rec) => rs.find((x) => x.cond === "nochips" && x.decision === r.decision && x.n === r.n);
    const ch = line(rs.filter((r) => r.cond === "changed"));
    // Runs before 15 November's chips fix had chips on changed and reworded cards: those pair with the card.
    const baseOf = (r: Rec) => (rs.some((x) => x.cond === "nochips") ? plainOf(r) : cardOf(r));
    const ctrl = rs.filter((r) => r.cond === "reworded" && r.chosen && baseOf(r)?.chosen);
    const moved = rs.filter((r) => r.cond === "changed" && r.chosen && baseOf(r)?.onReal);
    const wrong = rs.filter((r) => r.cond === "recall" && r.onReal === false).map((r) => cardOf(r) ?? plainOf(r)).filter((r): r is Rec => !!r && r.onReal !== null);
    const twinU = line(rs.filter((r) => r.cond === "twin" && r.recognised === false));
    const twinR = rs.filter((r) => r.cond === "twin" && r.recognised === true).length;
    const unrec = line(rs.filter((r) => r.cond === "masked" && r.recognised === false));
    const rec = line(rs.filter((r) => r.cond === "masked" && r.recognised === true));
    if (ch.scored || ctrl.length || wrong.length || twinU.scored + twinR || unrec.scored + rec.scored) {
      out.push("Grounding (the headline):");
      if (ch.scored) out.push(`- Changed facts followed (moved off the 2013 choice): ${ch.scored - ch.real}/${ch.scored} (${pct(ch.scored - ch.real, ch.scored)}).`);
      if (moved.length) { const m = moved.filter((r) => !r.onReal).length; out.push(`- Of the runs where the same decision's card chose 2013, changed facts moved it ${m}/${moved.length} (${pct(m, moved.length)}).`); }
      if (ctrl.length) { const same = ctrl.filter((r) => r.chosen === baseOf(r)!.chosen).length; out.push(`- Control, same facts reworded: kept the card's choice ${same}/${ctrl.length} (${pct(same, ctrl.length)}).`); }
      if (rs.some((r) => r.cond === "recall")) out.push(`- Where memory was wrong (recall missed): the card got the real choice ${wrong.filter((r) => r.onReal).length}/${wrong.length}.`);
      if (twinU.scored + twinR) out.push(`- Twins not recognised: ${twinU.scored} of ${twinU.scored + twinR}; on those, ${twinU.real}/${twinU.scored} on the real choice (${pct(twinU.real, twinU.scored)}).`);
      if (unrec.scored + rec.scored) out.push(`- Masked cards not recognised: ${unrec.scored} of ${unrec.scored + rec.scored}${unrec.scored ? `; on those, ${unrec.real}/${unrec.scored} on the real choice` : ""}.`);
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
    if (probed.length) out.push("", `Masked and twin cards recognised as the real race: ${probed.filter((r) => r.recognised).length}/${probed.length}.`);
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
