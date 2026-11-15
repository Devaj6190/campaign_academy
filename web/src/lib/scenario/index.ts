import type { Profile } from "../staff/roster";
import { FICTIONAL } from "./fictional";
import { NYC2013 } from "./nyc2013";

// The race the game plays. Everything the engine needs to know about who is running comes from here, so the
// rest of the code never names a candidate. Two scenarios exist: the original fictional race, and a real one
// built from a case file (lib/cases). Switch with ACTIVE below.

export type Shares = Record<string, number>;

export type RivalDef = {
  id: string;
  name: string;
  short: string;
  /** Map and chart colour. */
  color: string;
  /** Money at the start, and what they usually spend in a night / raise on an ordinary day (game scale). */
  cash: number;
  perDay: number;
  income: number;
  participant: boolean;
  /** Share of their money from small, matchable gifts. */
  smallShare: number;
  runsOn: string;
  base: string;
  /** Game day they enter the race (absent: from day 1). */
  joins?: number;
  /** Game day the Campaign Finance Board denied them matching funds (no payments after it). */
  matchDenied?: number;
  profile: Profile;
  /** Groups they court, for the rule-based fallback and for where they are strong. */
  courts: string[];
  /** How strongly a district leans to them, from its voter groups and census (relative; calibrated). */
  lean: (cd: number) => number;
  /** True when a number above is an estimate rather than from the record. */
  estimates?: string[];
};

/** A line on the Profile with where it comes from. `source` is a URL; absent in a fictional race. */
export type Sourced = { text: string; source?: string; publisher?: string };

/** Campaign finance rules for the race (real per-donor rules; campaign totals scaled by `scale`). */
export type Finance = {
  year: number;
  limitParticipant: number;
  limitNonParticipant: number;
  /** Public funds match the first `matchable` dollars of each NYC resident's gift, `ratio` to 1. */
  matchable: number;
  ratio: number;
  thresholdDollars: number;
  thresholdDonors: number;
  publicCap: number;
  spendingLimit: number;
  scale: number;
  /** Real dollars already set aside under the limit for staff, rent and fixed costs; when set, payroll is that allowance and does not count again. */
  fixedAllowance?: number;
  source: string;
  /** Day-one daily budgets (game scale). */
  envelopes: { ads: number; field: number; events: number };
};

export type Scenario = {
  id: string;
  /** "fiction" or "real": real scenarios carry sources and must never invent claims about the people in them. */
  kind: "fiction" | "real";
  title: string;
  me: { id: string; name: string; short: string; pitch: string; color: string };
  rivals: RivalDef[];
  /** Day-1 poll, by candidate id; the rest is undecided. */
  startPoll: Shares;
  undecided: { start: number; end: number };
  /** Share needed to win outright; below it the top two go to a runoff (0: plurality wins). */
  threshold: number;
  startCash: number;
  /** Optional real date for each game day. */
  dateOf?: (day: number) => Date;
  finance: Finance;
  /** What the Profile and the opening screens say. In a real race every line carries a source. */
  story: {
    initials: string;
    standing: string;
    about?: Sourced;
    tags: string[];
    record: (Sourced & { ok: boolean; liked: string; not: string })[];
    problems: Sourced[];
    /** Districts where the student starts strong or weak (simulated starting support; calibrated to the poll). */
    strong: number[];
    weak: number[];
    /** Planks on the record at the start. */
    manifesto: string[];
    tasks: string[];
    calendar: Record<number, string[]>;
    /** Starting feeling of each voter group toward the student (0..100). Estimates in a real race. */
    feel?: Record<string, number>;
    /** Staff posts filled by people named in the record: post id → name and the source that names them. */
    staff?: Record<string, { name: string; source: string }>;
    /** The contrast-ad tactic: who it targets and what it is about. */
    tactic: { target: string; title: string; note: string };
  };
};

/** The race the app plays: the real 2013 primary. FICTIONAL is the original invented race. */
export const ACTIVE: Scenario = NYC2013;
export const SCENARIOS = { FICTIONAL, NYC2013 };

export const ME = ACTIVE.me;
export const RIVAL_LIST = ACTIVE.rivals;
export const RIVAL_IDS = RIVAL_LIST.map((r) => r.id);
export type Rival = string;
export const rivalDef = (id: string) => RIVAL_LIST.find((r) => r.id === id)!;

/** Everyone on the ballot, the student first. */
export const CANDIDATES = [ME, ...RIVAL_LIST];
export const nameOf = (id: string) => CANDIDATES.find((c) => c.id === id)?.short ?? id;
export const fullNameOf = (id: string) => CANDIDATES.find((c) => c.id === id)?.name ?? id;
export const colorOf = (id: string) => CANDIDATES.find((c) => c.id === id)?.color ?? "#888";
/** Rivals in the race by this day. */
export const activeRivals = (day: number) => RIVAL_LIST.filter((r) => !r.joins || day >= r.joins).map((r) => r.id);
/** What every AI prompt is told about the world it is in. A real race names real people: the model may describe
 *  simulated campaign moves but must never invent quotes, statements or private facts about them. */
export const FRAMING =
  ACTIVE.kind === "fiction"
    ? "This is a fictional, nonpartisan teaching simulation; the candidates and staff are invented."
    : `This is a nonpartisan teaching simulation that starts from a real race (${ACTIVE.title}). The candidates are real people, but everything that happens in the simulation is invented: never invent quotes, statements, positions or private facts about real people, and describe only simulated campaign moves.`;
/** "Bill de Blasio's", for prompts. */
export const MY_CAMPAIGN = `${ACTIVE.me.name}'s campaign`;

/** Undecided share of the electorate on a game day. */
export const undecidedShare = (day: number) => Math.max(ACTIVE.undecided.end, ACTIVE.undecided.start - ((ACTIVE.undecided.start - ACTIVE.undecided.end) * (day - 1)) / 29);
/** "Day 4" or, in a real race, "Day 4 · about Mar 2". */
export const dayLabel = (day: number) => {
  const d = ACTIVE.dateOf?.(day);
  return d ? `about ${d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}` : "";
};
