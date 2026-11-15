// The case file: one real race, as data. Every screen reads the current case; nothing writes to it.
// Adding a case means writing one more file in this shape.
//
// A case has two layers, and the shape keeps them apart:
// - The record: Claims with sources. What was true, what the real campaign did, what followed.
// - The simulation: Shifts. Invented magnitudes, fitted so that the real campaign's own choices land near the
//   real result. The student's choices move this layer, and it is always labelled as simulated.
// The record of what the real campaign chose is held back until the debrief.

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

/**
 * One statement and where it comes from. `estimate` marks anything derived rather than recorded.
 * `short` says the same thing in fewer words, for screens that show the full text behind "Read more". It may not
 * add a fact or a number (`checkCase` checks the numbers).
 */
export type Claim = { text: string; sources: string[]; estimate?: boolean; short?: string };

/** A conclusion someone else drew. Never the tool's own verdict. */
export type Judgment = Claim & { who: string };

export type Candidate = {
  id: string;
  name: string;
  /** Standing at the briefing date, e.g. "Ten-term incumbent" or "First-time candidate". */
  standing: string;
  about: Claim[];
};

/** A simulated change to the student's campaign. `budget` is dollars; `poll` and `groups` are points, keyed by id. */
export type Shift = { budget?: number; poll?: Record<string, number>; groups?: Record<string, number> };

export type Option = {
  id: string;
  label: string;
  detail: string;
  /** What the student sees before choosing: directions only, never sizes. */
  preview: { up: string[]; down: string[] };
  effect: Shift;
  /** Extra effect when an earlier choice set this one up. `with` is "decisionId:optionId". */
  synergy?: { with: string; effect: Shift };
};

export type Decision = {
  id: string;
  /** ISO date of the moment, or the start of the phase it belongs to. */
  date: string;
  title: string;
  skill: Skill;
  // --- shown before the student decides ---
  /** What the world did on its own since the previous decision: rivals, events, money coming in. */
  since?: { notes: Claim[]; shift: Shift };
  situation: Claim[];
  constraints: { daysLeft: number; cashOnHand?: number; notes?: string[] };
  options: Option[];
  // --- the record, shown at the debrief ---
  /** The option closest to what the campaign did. Null when they did something not on the list. */
  taken: string | null;
  did: Claim[];
  followed: Claim[];
  saidAfter: Judgment[];
};

/** How someone reacted to a plank, in their own reported words. `groups` ties it to the case's voter groups,
 *  and only when the cited source itself makes that tie. */
export type Reaction = Judgment & { stance: "for" | "against"; groups?: string[]; /** When it was said (ISO); hidden before then. */ asOf?: string };

/**
 * One position a candidate ran on. `asOf` is the date it was first on record, so a screen can show only what
 * was known at the student's step. `decision` marks a plank that was the real campaign's answer to a decision:
 * it stays hidden until the student has made that decision.
 */
export type Plank = {
  text: string;
  sources: string[];
  /** Candidate id; the followed candidate when absent. */
  by?: string;
  asOf: string;
  decision?: string;
  reactions?: Reaction[];
  /** @deprecated Read through reactionsOf (lib/cases/platform.ts); kept so older case files still load. */
  likedBy?: Claim;
  /** @deprecated As likedBy. */
  dislikedBy?: Claim;
};

/**
 * What the press was reporting. `summary` is a paraphrase, never the article's own text.
 * `impact` (1 to 5) is how much the item moved this race, wherever it happened; the paper ranks by it, not by place.
 * `outside` marks an event from beyond the city. It is never shown as a label; it only keeps the item off the lead.
 * `estimate` marks a tie to the race that is our inference, not the source's: shown as an estimate, never moves numbers.
 */
export type Press = { date: string; outlet: string; summary: string; /** As `Claim.short`, for `summary`. */ short?: string; source: string; impact?: number; outside?: boolean; estimate?: boolean };

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
  /** Voter groups the simulation tracks: support for the followed candidate in each, 0 to 100. */
  /** `census` names the census share that says where the group lives, so the map can place its support. */
  groups: { id: string; name: string; census?: "white" | "black" | "asian" | "hispanic" }[];
  /** Where the simulation starts. `basis` says what the starting numbers rest on. */
  start: { budget: number; poll: Record<string, number>; groups: Record<string, number>; basis: Claim[] };
  /** The closing stretch after the last decision. Its budget is spent only as far as the money lasts. */
  close: { notes: Claim[]; shift: Shift };
  /** Share of the vote needed to win outright. Below it, the top two go to a runoff. */
  threshold: number;
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
    ...c.platform.flatMap((p) => [p, ...(p.likedBy ? [p.likedBy] : []), ...(p.dislikedBy ? [p.dislikedBy] : []), ...(p.reactions ?? [])]),
    ...c.start.basis,
    ...c.close.notes,
    ...c.decisions.flatMap((d) => [...(d.since?.notes ?? []), ...d.situation, ...d.did, ...d.followed, ...d.saidAfter]),
    { sources: c.resultSources },
    ...c.press.map((p) => ({ sources: [p.source] })),
    ...c.finance.map((f) => ({ sources: [f.source] })),
  ];
  const unsourced = claims.some((x) => x.sources.length === 0) ? ["(a claim with no source)"] : [];
  // Platform entries must point at real decisions, candidates and voter groups, and carry a date.
  const decisions = new Set(c.decisions.map((d) => d.id));
  const people = new Set(c.candidates.map((x) => x.id));
  const groups = new Set(c.groups.map((g) => g.id));
  const platform = c.platform.flatMap((p) => [
    ...(!/^\d{4}-\d{2}-\d{2}$/.test(p.asOf ?? "") ? [`(plank without a date: ${p.text.slice(0, 40)})`] : []),
    ...(p.decision && !decisions.has(p.decision) ? [`(plank linked to unknown decision ${p.decision})`] : []),
    ...(p.by && !people.has(p.by) ? [`(plank by unknown candidate ${p.by})`] : []),
    ...(p.reactions ?? []).flatMap((r) => (r.groups ?? []).filter((g) => !groups.has(g)).map((g) => `(reaction tied to unknown group ${g})`)),
  ]);
  const press = c.press.filter((p) => p.impact !== undefined && !(Number.isInteger(p.impact) && p.impact >= 1 && p.impact <= 5)).map((p) => `(press impact out of 1 to 5: ${p.summary.slice(0, 40)})`);
  return [...new Set([...claims.flatMap((x) => x.sources).filter((id) => !known.has(id)), ...unsourced, ...platform, ...press])];
}

export type World = { budget: number; poll: Record<string, number>; groups: Record<string, number> };

const add = (w: World, s: Shift | undefined, scale = 1): World => {
  if (!s) return w;
  const bump = (base: Record<string, number>, d?: Record<string, number>) => {
    const out = { ...base };
    for (const [k, v] of Object.entries(d ?? {})) out[k] = Math.max(0, Math.min(100, (out[k] ?? 0) + v * scale));
    return out;
  };
  return { budget: w.budget + (s.budget ?? 0) * scale, poll: bump(w.poll, s.poll), groups: bump(w.groups, s.groups) };
};

/** What an option does given the choices already made: its own effect plus any synergy that applies. */
export function effectOf(c: Case, d: Decision, optionId: string, picks: Record<string, string>): Shift[] {
  const o = d.options.find((x) => x.id === optionId);
  if (!o) return [];
  const [dec, opt] = o.synergy?.with.split(":") ?? [];
  return o.synergy && picks[dec] === opt ? [o.effect, o.synergy.effect] : [o.effect];
}

/**
 * The student's world when they reach decision `upTo` (0-based), or at the end when `upTo` is the number of decisions.
 * Pure: the same picks always give the same world. The closing stretch is scaled by how much of it the budget covers.
 */
export function simulate(c: Case, picks: Record<string, string>, upTo = c.decisions.length): World {
  let w: World = { budget: c.start.budget, poll: { ...c.start.poll }, groups: { ...c.start.groups } };
  c.decisions.slice(0, upTo + 1).forEach((d, i) => {
    if (i > upTo) return;
    w = add(w, d.since?.shift);
    if (i < upTo) for (const s of effectOf(c, d, picks[d.id], picks)) w = add(w, s);
  });
  if (upTo >= c.decisions.length) {
    const cost = -(c.close.shift.budget ?? 0);
    const afford = cost > 0 ? Math.max(0, Math.min(1, w.budget / cost)) : 1;
    // Rivals close as they did; only the student's own closing push depends on what they can still pay for.
    const { [c.follow]: own = 0, ...rivals } = c.close.shift.poll ?? {};
    w = add(add(w, { poll: rivals }), { ...c.close.shift, poll: { [c.follow]: own } }, afford);
  }
  return w;
}

/** The real campaign's own choices, as picks. Decisions where they did something off the list are skipped. */
export const realPath = (c: Case): Record<string, string> => Object.fromEntries(c.decisions.filter((d) => d.taken).map((d) => [d.id, d.taken!]));
