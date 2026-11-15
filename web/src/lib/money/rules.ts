import type { ActionId } from "../engine/catalog";
import { ACTIVE } from "../scenario";

// Campaign money, modelled on New York City's public financing program for the race's election year.
// Per-donor rules are the real ones; campaign-wide totals are scaled (1:10) to fit the game's campaign.
// Figures and source: the scenario's `finance` (lib/scenario), from the NYC Campaign Finance Board.

const F = ACTIVE.finance;
export const SCALE = F.scale;
export const SOURCE_NOTE = `Modelled on NYC Campaign Finance Board rules (${F.year}); campaign totals scaled 1:${Math.round(1 / F.scale)}.`;

export const NYC = {
  limitParticipant: F.limitParticipant,
  limitNonParticipant: F.limitNonParticipant,
  matchable: F.matchable,
  ratio: F.ratio,
  thresholdDollars: F.thresholdDollars,
  thresholdDonors: F.thresholdDonors,
  publicCap: F.publicCap,
  spendingLimit: F.spendingLimit,
};

/** The game's campaign-wide numbers (real × SCALE). Per-donor numbers stay real. */
export const GAME = {
  thresholdDollars: Math.round(NYC.thresholdDollars * SCALE),
  thresholdDonors: Math.round(NYC.thresholdDonors * SCALE),
  publicCap: Math.round(NYC.publicCap * SCALE),
  spendingLimit: Math.round(NYC.spendingLimit * SCALE),
};

/** Days the Board pays out matching funds earned so far. */
export const PAYMENT_DAYS = [10, 18, 24, 28];

export type Envelope = "ads" | "field" | "events";
export const ENVELOPES: { id: Envelope; label: string; note: string }[] = [
  { id: "ads", label: "Ads", note: "Digital ads, mail, contrast ads" },
  { id: "field", label: "Field", note: "Canvassing, phone banks, training, targeting" },
  { id: "events", label: "Events", note: "Rallies, town halls, coalition meetings, fundraisers" },
];
export type Envelopes = Record<Envelope, number>;

/** Which daily budget pays for each action. Anything not listed is cheap and comes straight from cash. */
export const ENVELOPE_OF: Partial<Record<ActionId | "tactic", Envelope>> = {
  digital_ads: "ads",
  mail_piece: "ads",
  tactic: "ads",
  canvass: "field",
  phone_bank: "field",
  volunteer_training: "field",
  voter_targeting: "field",
  rally: "events",
  coalition_meeting: "events",
  house_party: "events",
  donor_dinner: "events",
};

/** Day one, as the README describes it: about $22k a day out (payroll $9.2k + $12.6k of budgets). */
export const START_ENVELOPES: Envelopes = { ...F.envelopes };

export type Source = "Small donors" | "Fundraisers" | "Large donors" | "Public funds";
export const SOURCES: Source[] = ["Small donors", "Fundraisers", "Large donors", "Public funds"];

/** Who gives when you ask a certain way: groups, a typical gift, and the share who are NYC residents. */
export const ASKS: Partial<Record<ActionId, { source: Source; groups: [string, number][]; avg: number; nyc: number; large: boolean }>> = {
  call_time: { source: "Large donors", groups: [["donors", 0.7], ["smallbiz", 0.3]], avg: 1000, nyc: 0.75, large: true },
  donor_dinner: { source: "Fundraisers", groups: [["donors", 0.8], ["homeowners", 0.2]], avg: 1500, nyc: 0.7, large: true },
  house_party: { source: "Fundraisers", groups: [], avg: 90, nyc: 0.95, large: false }, // the host district's biggest group
  email_blast: { source: "Small donors", groups: [], avg: 35, nyc: 0.9, large: false }, // the group the email is framed for
};
/** The everyday trickle of small online gifts from the groups most excited about Cole. */
export const TRICKLE = { groups: [["activists", 0.35], ["students", 0.25], ["renters", 0.4]] as [string, number][], avg: 27, nyc: 0.92, base: 900 };

/** Asking the same people again tires them: each ask leaves them this much more tired; they recover daily. */
export const FATIGUE = { perAsk: 0.22, recover: 0.2, floor: 0.25 };

export type Gift = { faction: string; count: number; avg: number; nyc: number };

export type Money = {
  /** Today's budgets, already paid for this morning; whatever is not used today is gone. */
  envelopes: Envelopes;
  /** Spent from each budget today. */
  spent: Envelopes;
  /** Tomorrow's budgets (changes are booked a day ahead). */
  next: Envelopes;
  /** Money left unused in yesterday's budgets. */
  waste: { day: number; amount: number; by: Envelopes } | null;
  /** Every dollar that came in, for the last-7-days view and filings. */
  income: { day: number; source: Source; amount: number }[];
  /** Donors so far, by group: how many, how many are NYC residents, and how much of their money is matchable. */
  donors: Record<string, { count: number; nyc: number; matchable: number; dollars: number }>;
  /** How tired each group is of being asked (0 fresh, 1 exhausted). */
  fatigue: Record<string, number>;
  /** Public financing: null until Cole decides on day 1. */
  participant: boolean | null;
  matchPaid: number;
  payments: { day: number; amount: number }[];
  raisedTotal: number;
  spentTotal: number;
  /** Payroll paid so far (inside spentTotal). */
  payrollTotal: number;
  fines: { day: number; amount: number }[];
  matchStopped: boolean;
  /** Paydays missed in a row. */
  missed: number;
  /** Money news for the paper and the feed: payments, fines, missed payroll, the public-financing choice. */
  events: MoneyEvent[];
  /** Dana's latest budget proposal. */
  proposal: Proposal | null;
  proposalDay: number;
};

export type MoneyEvent = { day: number; kind: "joined" | "declined" | "payment" | "fine" | "missed" | "quit" | "broke" | "qualified"; text: string; amount?: number };

export type Proposal = { day: number; ads: number; field: number; events: number; fundraising: string[]; note: string; mode: "live" | "rules"; state: "open" | "approved" | "dismissed" };

export const sum = (e: Envelopes) => e.ads + e.field + e.events;

export const START_MONEY: Money = {
  envelopes: { ...START_ENVELOPES },
  spent: { ads: 0, field: 0, events: 0 },
  next: { ...START_ENVELOPES },
  waste: null,
  income: [],
  donors: {},
  fatigue: {},
  participant: null,
  matchPaid: 0,
  payments: [],
  raisedTotal: 0,
  payrollTotal: 0,
  // Day one's budgets were paid for before the game starts.
  spentTotal: START_ENVELOPES.ads + START_ENVELOPES.field + START_ENVELOPES.events,
  fines: [],
  matchStopped: false,
  missed: 0,
  events: [],
  proposal: null,
  proposalDay: 0,
};
