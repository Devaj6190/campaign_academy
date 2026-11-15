// What each of the primary's voter groups is likely to care about, for shaping platform planks.
//
// Unlike the sizes and support figures in mayor2013-factions.ts, most of this is NOT poll data. `values` and
// `dislikes` are inferred for this exercise from who the group is (an income band, a union household, a borough
// outside Manhattan), and are left empty where identity alone says too little to infer anything fairly.
// `poll` is the exception: one line read from a published 2013 poll table, with its source. The poll lines were read
// from the tables in a research pass on 14 November 2026; recheck them against the PDFs before publishing.
//
// Sources for the poll lines:
// - Marist: NBC 4 New York / Wall Street Journal / Marist, 3 to 6 September 2013, registered Democrats (the September
//   tables linked in mayor2013-factions.ts).
// - Quinnipiac: 13 August 2013, likely Democratic primary voters, https://poll.qu.edu/images/polling/nyc/nyc08132013.pdf

export type Leaning = { values: string[]; dislikes: string[]; poll?: string };

const OUTER = { values: ["Attention and services for the boroughs outside Manhattan"], dislikes: ["Manhattan-first spending"] };

export const LEANINGS_2013: Record<string, Leaning> = {
  white: { values: [], dislikes: [], poll: "Marist: 42% wanted the next mayor to continue stop and frisk, 51% did not. Quinnipiac: 52% called it excessive, 39% acceptable." },
  black: { values: ["Ending stop and frisk as it is practised"], dislikes: ["Keeping stop and frisk unchanged"], poll: "Marist: 33% wanted the next mayor to continue stop and frisk, 58% did not. Quinnipiac: 76% called it excessive, 15% acceptable." },
  latino: { values: [], dislikes: [], poll: "Marist: 48% wanted the next mayor to continue stop and frisk, 45% did not." },
  brooklyn: OUTER,
  manhattan: { values: [], dislikes: [] },
  "queens-si": { values: [...OUTER.values, "Neighbourhood services"], dislikes: OUTER.dislikes },
  bronx: { values: [...OUTER.values, "Jobs and affordable housing"], dislikes: OUTER.dislikes },
  liberal: { values: ["Higher taxes on high incomes to pay for public services", "Police reform", "A break from the incumbent's policies"], dislikes: ["Continuity with the incumbent", "Expanding stop and frisk"] },
  moderate: { values: ["Competent management", "Public safety", "Balanced budgets"], dislikes: ["Sharp tax rises", "Abrupt change"] },
  conservative: { values: ["Public safety and policing", "Lower taxes"], dislikes: ["Tax rises", "Limits on policing"] },
  catholic: { values: [], dislikes: [], poll: "Marist: 52% wanted the next mayor to continue stop and frisk, 41% did not." },
  protestant: { values: [], dislikes: [] },
  jewish: { values: [], dislikes: [] },
  older: { values: ["Public safety", "Reliable city services"], dislikes: ["Service cuts"] },
  younger: { values: ["Affordable rent", "Jobs"], dislikes: ["Rising cost of living"] },
  women: { values: [], dislikes: [] },
  men: { values: [], dislikes: [] },
  "income-high": { values: ["Low taxes", "Public safety", "Good schools"], dislikes: ["Higher income taxes"] },
  "income-low": { values: ["Affordable housing", "Higher wages", "Paid sick leave"], dislikes: ["Service cuts", "Rising rents"], poll: "Marist: 43% thought the next mayor could make the city affordable, against 35% of all registered Democrats." },
  college: { values: [], dislikes: [] },
  "no-college": { values: ["Jobs and wages"], dislikes: [] },
  union: { values: ["Contracts honoured", "Paid sick leave", "Public-sector jobs"], dislikes: ["Outsourcing", "Contract freezes"], poll: "Marist: 45% were less likely to back a candidate who supported extending term limits, 7% more likely." },
};
