import { mayor2013 as C } from "../cases/mayor2013";
import { shares } from "../demographics";
import { districtBy } from "../geo";
import type { Scenario, Sourced } from "./index";

// The 2013 Democratic primary for Mayor of New York, from inside Bill de Blasio's campaign, as the simulation's
// starting point. Real: who ran, the opening poll and money, the 2013 public-financing rules, the dates, the
// record and the result (used only at the end). Estimates, labelled: where each rival is strong within the city,
// the voter groups' starting feelings, rivals' daily spending and income. Everything after day 1 is simulated.

/** A line from the case file with its source link. */
const from = (text: string, id: string): Sourced => {
  const s = C.sources.find((x) => x.id === id);
  return { text, source: s?.url, publisher: s ? `${s.publisher}${s.date ? `, ${s.date}` : ""}` : undefined };
};

const race = (cd: number) => districtBy(cd)?.demo?.race ?? { white: 30, black: 25, asian: 13, hispanic: 29 };
const g = (cd: number) => shares(cd);
const boro = (cd: number) => Math.floor(cd / 100);

const day = (iso: string) => {
  const a = Date.parse(C.briefingDate), b = Date.parse(C.electionDate);
  return Math.max(1, Math.min(30, Math.round(1 + (29 * (Date.parse(iso) - a)) / (b - a))));
};

const ALL: Scenario["rivals"][number]["profile"]["skills"] = ["planning", "field", "volunteers", "finance", "events", "comms", "press", "digital", "policy", "data"];

/**
 * The certified result by borough (Board of Elections, Statement and Return Report for Certification, 2013-09-30,
 * borough recaps; totals include write-ins and minor candidates). Used only at the end, never to seed the race.
 * The Board publishes 2013 primary results by assembly district, not by election district, so there is no real
 * per-community-district result; any district-level 2013 figure in the game is an estimate.
 */
export const RESULT_2013 = {
  source: "https://www.vote.nyc/page/election-results-summary-2013",
  byBorough: {
    1: { total: 198_457, deblasio: 81_197, quinn: 52_102, thompson: 42_720, liu: 10_191, weiner: 6_858 },
    2: { total: 96_779, deblasio: 36_896, quinn: 10_392, thompson: 31_617, liu: 4_753, weiner: 5_726 },
    3: { total: 225_828, deblasio: 104_703, quinn: 23_007, thompson: 61_471, liu: 13_927, weiner: 10_950 },
    4: { total: 149_304, deblasio: 52_190, quinn: 19_847, thompson: 38_162, liu: 16_977, weiner: 9_438 },
    5: { total: 21_433, deblasio: 7_358, quinn: 3_545, thompson: 6_871, liu: 1_438, weiner: 1_220 },
  } as Record<1 | 2 | 3 | 4 | 5, Record<string, number>>,
};

export const NYC2013: Scenario = {
  id: "nyc-2013",
  kind: "real",
  title: "the 2013 Democratic primary for Mayor of New York",
  me: { id: "deblasio", name: "Bill de Blasio", short: "de Blasio", color: "#f0a23b", pitch: "higher taxes on incomes over $500,000 to pay for full-day pre-K, paid sick leave, and an end to a city split into haves and have-nots" },
  rivals: [
    {
      id: "quinn",
      name: "Christine Quinn",
      short: "Quinn",
      color: "#a3a3ad",
      cash: 530_000, // $5.3M on hand in January 2013 (dna-0114), at the game's 1:10 scale
      perDay: 24_000,
      income: 15_000,
      participant: true,
      smallShare: 0.25,
      runsOn: "40,000 middle-class apartments, a technology agenda for jobs, and her record running the City Council",
      base: "Manhattan, the front-runner's money and endorsements",
      profile: { skills: ALL, cost: 1, effect: 1, voice: "Disciplined front-runner and Council Speaker, with the most money.", salary: 0 },
      courts: ["homeowners", "donors", "smallbiz", "seniors"],
      lean: (cd) => race(cd).white / 100 + (boro(cd) === 1 ? 0.45 : 0) + (g(cd)?.donors ?? 0) * 2,
      estimates: ["perDay", "income", "smallShare", "lean"],
    },
    {
      id: "thompson",
      name: "Bill Thompson",
      short: "Thompson",
      color: "#7b72d6",
      cash: 250_000,
      perDay: 14_000,
      income: 9_000,
      participant: true,
      smallShare: 0.45,
      runsOn: "keeping stop-and-frisk but limiting it, 2,000 more officers, and a driver-friendly transport plan",
      base: "the party's 2009 nominee, with strength among Black voters and unions",
      profile: { skills: ALL, cost: 1, effect: 1, voice: "The party's 2009 nominee: steady, establishment, careful.", salary: 0 },
      courts: ["unions", "seniors", "homeowners", "immigrants"],
      lean: (cd) => 0.15 + (race(cd).black / 100) * 1.8 + (g(cd)?.seniors ?? 0),
      estimates: ["cash", "perDay", "income", "smallShare", "lean"],
    },
    {
      id: "liu",
      name: "John Liu",
      short: "Liu",
      color: "#4fb3a9",
      cash: 200_000, // just over $2M in January 2013 (dna-0114), at 1:10
      perDay: 7_000,
      income: 4_500,
      participant: true,
      smallShare: 0.7,
      runsOn: "abolishing stop-and-frisk, and legalising marijuana to cut CUNY tuition",
      base: "the City Comptroller, with a following in Queens",
      profile: { skills: ALL, cost: 1.05, effect: 0.95, voice: "Combative comptroller whose campaign is under federal scrutiny.", salary: 0 },
      courts: ["immigrants", "students", "activists"],
      lean: (cd) => 0.08 + (race(cd).asian / 100) * 2.2 + (boro(cd) === 4 ? 0.12 : 0),
      estimates: ["perDay", "income", "smallShare", "lean"],
    },
    {
      id: "weiner",
      name: "Anthony Weiner",
      short: "Weiner",
      color: "#d9785f",
      cash: 480_000, // $4.8M at entry (cbs-weiner), at 1:10
      perDay: 18_000,
      income: 8_000,
      participant: true,
      smallShare: 0.4,
      runsOn: "64 ideas for the middle class, including a city-run health plan modelled on single payer",
      base: "name recognition across the outer boroughs",
      joins: day("2013-05-22"),
      profile: { skills: ALL, cost: 1, effect: 1.05, voice: "Famous comeback candidate, combative and fast.", salary: 0 },
      courts: ["homeowners", "seniors", "transit", "renters"],
      lean: (cd) => 0.2 + (g(cd)?.homeowners ?? 0.4) * 0.6 + (boro(cd) === 3 || boro(cd) === 4 ? 0.15 : 0),
      estimates: ["perDay", "income", "smallShare", "lean"],
    },
  ],
  // January–February 2013 public polls (the case's opening; Weiner not yet running).
  startPoll: { deblasio: 12, quinn: 36, thompson: 11, liu: 9, weiner: 0 },
  undecided: { start: 0.32, end: 0.04 },
  threshold: C.threshold,
  // The case's money left to spend under the cap ($4.3M), at the game's 1:10 scale.
  startCash: Math.round(C.start.budget * 0.1),
  dateOf: (d) => {
    const a = Date.parse(C.briefingDate), b = Date.parse(C.electionDate);
    return new Date(a + ((b - a) * (d - 1)) / 29);
  },
  finance: {
    year: 2013,
    limitParticipant: 4950,
    limitNonParticipant: 4950,
    matchable: 175,
    ratio: 6,
    thresholdDollars: 250_000,
    thresholdDonors: 1_000,
    publicCap: 3_534_300,
    spendingLimit: 6_426_000,
    scale: 0.1,
    source: "https://www.nyccfb.info/candidate-services/limits-thresholds/2013/",
    // Kept under the scaled $642,600 limit at the default pace (payroll + budgets for 30 days).
    envelopes: { ads: 5000, field: 3600, events: 1900 },
  },
  story: {
    initials: "BdB",
    standing: "Public Advocate of New York City, running in the Democratic primary for mayor.",
    about: from("He announces outside his home in Park Slope, Brooklyn, saying twelve years under Mayor Bloomberg have left the middle class behind.", "dna-launch"),
    tags: ["Public Advocate", "Pre-K paid for by the top earners", "Paid sick leave"],
    record: [
      { ...from("Proposed raising the city income tax on incomes over $500,000 to pay for full-day pre-K and after-school programmes (October 2012).", "chalk-prek"), ok: true, liked: "The Campaign for Children", not: "Mayor Bloomberg" },
      { ...from("Pressed the Council Speaker to allow a vote on paid sick leave (January 2013).", "wnyc-lucky"), ok: true, liked: "Paid sick leave activists", not: "The Speaker's office" },
    ],
    problems: [
      from("Christine Quinn leads every public poll with 35 to 37 percent; de Blasio, Thompson and Liu are bunched between 9 and 14.", "q-0522"),
      from("If nobody reaches 40 percent, the top two meet in a runoff.", "cfb-ao"),
      from("Candidates who take matching funds may spend no more than $6,426,000 on the primary.", "cfb-limits"),
      from("Quinn has $5.3 million on hand.", "dna-0114"),
    ],
    // Simulated starting support: brownstone Brooklyn, his home base, warm; Staten Island and the Upper East Side cold.
    strong: [306, 302, 307, 308],
    weak: [501, 502, 503, 108, 106],
    // Planks on his record at the briefing date (see lib/cases: platform).
    manifesto: [
      "Raise the city income tax on incomes above $500,000 to fund full-day pre-K and after-school programmes.",
      "Paid sick leave: press the Council to allow a vote on the paid sick days bill.",
    ],
    tasks: ["Take the platform to five planks", "Hire a Policy Director", "Two hours of call time", "Decide on public matching funds"],
    calendar: { 1: ["Campaign launch, Park Slope"], [day("2013-05-22")]: ["Weiner expected to enter"], 7: ["First debate"], 21: ["Second debate"], 30: ["Primary day"] },
    // Estimates: low name recognition early in 2013, warmer with renters and activists, cool with donors.
    feel: { renters: 50, homeowners: 38, immigrants: 46, transit: 48, seniors: 40, unions: 47, smallbiz: 42, activists: 52, donors: 28, students: 46 },
    staff: { cm: { name: "Bill Hyers", source: C.sources.find((s) => s.id === "spb-hyers")!.url } },
    tactic: { target: "quinn", title: "A contrast ad against the front-runner", note: "It names a real rival. The ad itself, and how voters take it, is simulated." },
  },
};
