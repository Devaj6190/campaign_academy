// The case file: one real race, as data. Every screen reads the current case and the current decision point;
// nothing writes to it. Adding a case means writing one more file in this shape.
//
// Rules the shape enforces:
// - Every statement shown to the student is a Claim and names its sources.
// - Nothing in `result`, `districts[..].votes` or a decision's reveal fields is shown before its reveal.

export type Skill = "delegating" | "budgeting" | "voter-groups" | "policy";

export type Source = {
  id: string;
  title: string;
  publisher: string;
  /** Publication date, ISO. */
  date?: string;
  url: string;
  kind: "data" | "filing" | "reporting" | "analysis" | "campaign" | "book";
};

/** One statement and where it comes from. `estimate` marks anything derived rather than recorded. */
export type Claim = { text: string; sources: string[]; estimate?: boolean };

/** A conclusion someone else drew. Never the tool's own verdict. */
export type Judgment = Claim & { who: string };

export type Candidate = {
  id: string;
  name: string;
  /** Standing at the briefing date, e.g. "Ten-term incumbent" or "First-time candidate". */
  standing: string;
  about: Claim[];
};

export type Option = { id: string; label: string; detail: string };

/** A director's argument for one option, written from what was known at the decision date. Used when no live agent is available. */
export type Advice = { role: string; argues: string; says: string };

export type Decision = {
  id: string;
  /** ISO date of the moment, or the start of the phase it belongs to. */
  date: string;
  title: string;
  skill: Skill;
  // --- shown before the prediction ---
  situation: Claim[];
  constraints: { daysLeft: number; cashOnHand?: number; notes?: string[] };
  options: Option[];
  advice: Advice[];
  // --- the reveal ---
  /** The option closest to what the campaign did. Null when they did something not on the list. */
  taken: string | null;
  did: Claim[];
  followed: Claim[];
  saidAfter: Judgment[];
};

export type Plank = { text: string; sources: string[]; likedBy?: Claim; dislikedBy?: Claim };

/** What the press was reporting. `summary` is a paraphrase, never the article's own text. */
export type Press = { date: string; outlet: string; summary: string; source: string };

/** One point on the money timeline, from a public filing. */
export type Filing = { date: string; candidate: string; raised: number; spent: number; cash: number; source: string; estimate?: boolean };

/** Per community district. `votes` is the reveal; `before` is what the map may show ahead of it. */
export type DistrictRecord = {
  votes: Record<string, number>;
  turnout?: number;
  before?: { label: string; votes: Record<string, number> };
};

export type Case = {
  id: string;
  title: string;
  office: string;
  electionDate: string;
  briefingDate: string;
  /** Candidate id of the campaign the student sits in. */
  follow: string;
  /** One sentence: what this case teaches. */
  lesson: string;
  briefing: Claim[];
  candidates: Candidate[];
  platform: Plank[];
  decisions: Decision[];
  press: Press[];
  finance: Filing[];
  /** Keyed by community district number. Empty until the data pipeline fills it. */
  districts: Record<number, DistrictRecord>;
  result: { candidate: string; votes: number; share: number }[];
  resultSources: string[];
  aftermath: Claim[];
  sources: Source[];
};

/** Every source id a case cites that is missing from its source list. A case is shippable when this is empty. */
export function missingSources(c: Case): string[] {
  const known = new Set(c.sources.map((s) => s.id));
  const claims: { sources: string[] }[] = [
    ...c.briefing,
    ...c.aftermath,
    ...c.candidates.flatMap((x) => x.about),
    ...c.platform.flatMap((p) => [p, ...(p.likedBy ? [p.likedBy] : []), ...(p.dislikedBy ? [p.dislikedBy] : [])]),
    ...c.decisions.flatMap((d) => [...d.situation, ...d.did, ...d.followed, ...d.saidAfter]),
    { sources: c.resultSources },
    ...c.press.map((p) => ({ sources: [p.source] })),
    ...c.finance.map((f) => ({ sources: [f.source] })),
  ];
  const unsourced = claims.some((x) => x.sources.length === 0) ? ["(a claim with no source)"] : [];
  return [...new Set([...claims.flatMap((x) => x.sources).filter((id) => !known.has(id)), ...unsourced])];
}
