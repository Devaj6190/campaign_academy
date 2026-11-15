import { CASES } from "../cases";
import type { Case, Claim, Judgment } from "../cases/types";
import type { DebriefRequest } from "./types";

// The debrief agent's files. /campaign/ is the student's campaign as the browser sent it (simulated); /record/ is the
// case file's sourced account of what really happened, read here on the server so the browser cannot change it.

export type Files = Record<string, string>;

const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const pct = (n: number) => `${Math.round(n * 10) / 10}%`;
const claim = (x: Claim | Judgment) => `- ${"who" in x ? `${x.who}: ` : ""}${x.text}${x.estimate ? " (estimate)" : ""} [${x.sources.join(", ")}]`;
const claims = (xs: (Claim | Judgment)[]) => (xs.length ? xs.map(claim).join("\n") : "- (nothing on record)");

export const caseOf = (id: string): Case | undefined => CASES.find((c) => c.id === id);

export function debriefFiles(c: Case, r: DebriefRequest): Files {
  const name = (id: string) => c.candidates.find((x) => x.id === id)?.name ?? id;
  const isRival = (by: string) => by !== c.follow && c.candidates.some((x) => x.id === by);
  const poll = (p: Record<string, number>) => Object.entries(p).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).map(([id, v]) => `${name(id)} ${pct(v)}`).join(", ");
  const pick = (id: string) => r.picks.find((p) => p.decision === id)?.option;
  const label = (decision: string, option?: string | null) => c.decisions.find((d) => d.id === decision)?.options.find((o) => o.id === option)?.label;
  const work = (from: string, to: string, rivals: boolean) => {
    const xs = r.work.filter((x) => x.date > from && x.date <= to && isRival(x.by) === rivals);
    if (!xs.length) return "- nothing";
    return xs.map((x) => `- ${x.date} ${rivals ? name(x.by) : x.by}: ${x.note ?? x.label}${!rivals && (x.cost || x.raised) ? ` (cost ${usd(x.cost)}${x.raised ? `, raised ${usd(x.raised)}` : ""})` : ""}`).join("\n");
  };

  const files: Files = {};
  const decisionList = c.decisions.map((d, i) => `${i + 1}. ${d.id} (${d.date}): ${d.title}`).join("\n");

  files["/README.md"] = `# Files for the debrief
The student played ${c.title}, from inside ${name(c.follow)}'s campaign. The election was on ${c.electionDate}; the campaign is over.

/campaign/ is what this student and their simulated staff and rivals did. All of it is simulated.
- /campaign/summary.md: the student's final standing, money and every decision they made
- /campaign/decisions/<id>.md: one per decision: the student's pick, the two staff memos, and the work in the stretch leading up to it
- /campaign/after-last-decision.md: the work from the last decision to election day
- /campaign/staff/<post>.md: one per staff post the student worked with: orders, replies, thinking, results, reports, coaching
- /campaign/platform.md: the planks the student added
- /campaign/rivals.md: what the simulated rival campaigns did

/record/ is what really happened in 2013. Every line ends with source ids in brackets; cite them.
- /record/decisions/<id>.md: one per decision: the situation, the options, what the real campaign chose and did, what followed, what was said after
- /record/result.md: the certified result and the aftermath
- /record/sources.md: every source id with its title and publisher

Decisions, in order:
${decisionList}
`;

  files["/campaign/summary.md"] = `# The student's campaign (simulated)
Final standing: ${poll(r.final.poll)}. To win outright a candidate needed ${c.threshold}%.
Money left under the spending cap: ${usd(r.final.budgetLeft)}.

Decisions:
${c.decisions.map((d, i) => `${i + 1}. ${d.title}: ${label(d.id, pick(d.id)) ?? "no decision"}`).join("\n")}

Staff posts the student gave work to: ${r.staff.map((s) => (s.name && s.name !== s.role ? `${s.name} (${s.role}, post ${s.post})` : `${s.role} (post ${s.post})`)).join("; ") || "none"}.
`;

  c.decisions.forEach((d, i) => {
    const from = i ? c.decisions[i - 1].date : c.briefingDate;
    const memos = r.memos.filter((m) => m.decision === d.id);
    files[`/campaign/decisions/${d.id}.md`] = `# Decision ${i + 1}: ${d.title} (${d.date})
The student chose: ${label(d.id, pick(d.id)) ?? "no decision"}

The two staff memos the student read before choosing (each director was assigned an option to argue for):
${memos.length ? memos.map((m) => `- ${m.by} argued for "${label(d.id, m.option) ?? m.option}": ${m.headline ? `${m.headline}. ` : ""}${m.text}`).join("\n") : "- none"}

The student's campaign from ${from} to ${d.date} (orders to staff, the candidate's appearances, the weekly plan, planks):
${work(from, d.date, false)}

The rival campaigns in the same stretch:
${work(from, d.date, true)}
`;
    files[`/record/decisions/${d.id}.md`] = `# Decision ${i + 1}: ${d.title} (${d.date})
## The situation, as known on ${d.date}
${claims(d.situation)}
${d.constraints.daysLeft} days to the primary.${d.constraints.notes?.length ? ` ${d.constraints.notes.join(" ")}` : ""}

## The options
${d.options.map((o) => `- ${o.id}: ${o.label}. ${o.detail}`).join("\n")}

## What the real campaign chose
${label(d.id, d.taken) ?? "Something not on the list"}

## What the real campaign did
${claims(d.did)}

## What followed
${claims(d.followed)}

## What was said afterwards
${claims(d.saidAfter)}
${d.advice?.length ? `\n## What real advisers argued at the time\n${d.advice.map((a) => `- ${a.name}, ${a.role}, argued for ${a.argues}: ${a.says} [${a.sources.join(", ")}]`).join("\n")}\n` : ""}`;
  });

  const last = c.decisions.at(-1)?.date ?? c.briefingDate;
  files["/campaign/after-last-decision.md"] = `# From the last decision (${last}) to election day (${c.electionDate})
The student's campaign:
${work(last, c.electionDate, false)}

The rival campaigns:
${work(last, c.electionDate, true)}
`;

  for (const s of r.staff) files[`/campaign/staff/${s.post}.md`] = `# ${s.name && s.name !== s.role ? `${s.name}, ${s.role}` : `The ${s.role}`} (post ${s.post}), oldest first\n${s.lines.map((l) => `- ${l}`).join("\n")}\n`;

  files["/campaign/platform.md"] = `# Planks the student added (simulated)\n${r.planks.length ? r.planks.map((p) => `- ${p.date}: ${p.text}${p.tradeoff ? ` Trade-off: ${p.tradeoff}` : ""}`).join("\n") : "- none"}\n`;

  files["/campaign/rivals.md"] = `# The rival campaigns (simulated)\n${Object.entries(r.rivals).map(([id, lines]) => `## ${name(id)}\n${lines.map((l) => `- ${l}`).join("\n")}`).join("\n\n") || "- no rival moves"}\n\nEvery rival move:\n${work(c.briefingDate, c.electionDate, true)}\n`;

  files["/record/result.md"] = `# What really happened on ${c.electionDate}
${c.result.map((x) => `- ${name(x.candidate)}: ${pct(x.share)} (${x.votes.toLocaleString("en-US")} votes)`).join("\n")} [${c.resultSources.join(", ")}]
A candidate needed ${c.threshold}% to avoid a runoff.

## Aftermath
${claims(c.aftermath)}
`;

  files["/record/sources.md"] = `# Sources\n${c.sources.map((s) => `- ${s.id}: ${s.title}, ${s.publisher}${s.date ? `, ${s.date}` : ""}`).join("\n")}\n`;

  return files;
}
