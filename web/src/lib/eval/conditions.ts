import { PLACES } from "../staff/world";

// What each condition changes about what the agent is shown (#28).
// - card: the decision as a student sees it.
// - nochips: the same, without the options' up and down chips (they were fitted to the record).
// - masked: the same, with people, places, the year and other giveaways replaced, then a recognition probe.
// - changed: the situation altered so that a reasoning agent should move away from the 2013 choice.
// - recall: no card at all; the model is asked what the real campaign did.

export const CONDITIONS = ["card", "nochips", "masked", "changed", "recall"] as const;
export type Condition = (typeof CONDITIONS)[number];

/**
 * Card lines that state something not yet known on the card's date. The eval leaves them out and lists them in the
 * report. Matched by the start of the line's text.
 */
export const DROPPED: Record<string, string[]> = {
  weiner: ["There are 111 days to the primary. As late as mid-July"],
  budget: ["Outside money is in play for a rival: the teachers' union will spend"],
};

/**
 * The changed-facts cards: a new situation for each case decision, and the 2013 choice a reasoning agent should
 * move away from given it. Written before the first run. The world's numbers are left as they are, so nothing here
 * contradicts the poll or the money the agent can read.
 */
export const CHANGED: Record<string, { situation: string[]; away: string }> = {
  positioning: {
    situation: [
      "A new poll finds most Democrats approve of the outgoing mayor and want his main policies continued.",
      "The front-runner is running as the candidate of change from the last twelve years.",
      "The mayor is not running after three terms.",
    ],
    away: "break",
  },
  weiner: {
    situation: [
      "The new entrant is drawing nearly all of his support from voters who were backing you, by the latest poll.",
      "His message is the same as yours, and coverage is treating him as the candidate of your ideas.",
      "You have already claimed the most you can in matching funds.",
    ],
    away: "hold",
  },
  hospital: {
    situation: [
      "The union organising the protest has endorsed your main rival, and its leaders attacked you by name last week.",
      "A survey of residents near the hospital finds most of them support its sale.",
      "Organisers plan civil disobedience. Two rivals will also be there.",
    ],
    away: "arrest",
  },
  budget: {
    situation: [
      "Television time in the city is booked up for the final weeks and costs twice the usual rate.",
      "Primary turnout will be small, and the voter file shows exactly who will vote; a mail vendor can reach every one of them.",
      "You are fourth in the polls.",
    ],
    away: "alltv",
  },
  firstad: {
    situation: [
      "Your teenage son has said in public that he wants no part in the campaign.",
      "A rival's ad featuring a child drew wide criticism this month.",
      "A federal court ruling on the police stop policy is expected any day.",
    ],
    away: "family",
  },
  base: {
    situation: [
      "In the latest poll, most likely primary voters call the police stop policy an acceptable way to keep the city safe.",
      "Your rival who leads among Black voters holds the same position on the policy as you.",
      "Coverage says voters rank jobs and rents far above policing this year.",
    ],
    away: "frisk",
  },
};

// --- Masking ---------------------------------------------------------------------------------------------------

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const ELECTION = Date.parse("2013-09-10");
const daysBefore = (iso: string) => Math.round((ELECTION - Date.parse(iso)) / 86_400_000);
const relative = (iso: string) => { const n = daysBefore(iso); return n === 0 ? "primary day" : n > 0 ? `${n} days before the primary` : `${-n} days after the primary`; };

/** Replacements, applied in order. People and offices first, then places, then dates and other giveaways. */
const RULES: [RegExp, string | ((...m: string[]) => string)][] = [
  [/\bBill de Blasio\b|\bde Blasio\b|\bDe Blasio\b|\bDante\b/g, "Candidate A"],
  [/\bChristine Quinn\b|\bQuinn\b/g, "Candidate B"],
  [/\bBill Thompson\b|\bWilliam C\. Thompson( Jr\.)?|\bThompson\b/g, "Candidate C"],
  [/\bJohn Liu\b|\bLiu\b/g, "Candidate D"],
  [/\bAnthony Weiner\b|\bWeiner\b/g, "Candidate E"],
  [/\bSal Albanese\b|\bAlbanese\b/g, "Candidate F"],
  [/\b(your wife )?Chirlane( McCray)?\b/g, "your wife"],
  [/\b(the )?(Mayor )?(Michael )?Bloomberg\b/g, "the outgoing mayor"],
  [/\b(Police Commissioner )?Ray(mond)? Kelly\b|\bKelly\b/g, "the police commissioner"],
  [/\bBill Hyers\b|\bHyers\b/g, "the campaign manager"],
  [/\bJohn Del Cecato\b|\bDel Cecato\b/g, "the media consultant"],
  [/\bPhil Walzak\b|\bWalzak\b/g, "the communications director"],
  [/\bJessica Singleton\b|\bSingleton\b/g, "the digital director"],
  [/\bAKPD( Message and Media)?\b/g, "a media firm"],
  [/\b(Governor )?(Andrew )?Cuomo\b/g, "the governor"],
  [/\bGreenberg Quinlan Rosner\b/g, "the polling firm"],
  [/\bPublic Advocate\b/g, "citywide official"],
  [/\bSpeaker of the City Council\b|\bCouncil Speaker\b|\bSpeaker\b/g, "council leader"],
  [/\b(City )?Comptroller\b/g, "chief financial officer"],
  [/\b(the )?(stop-and-frisks?|stop and frisk)\b/gi, "the police stop policy"],
  [/\b(a )?tale of two cities( divided by income)?/gi, "a city divided by income"],
  [/\b(the )?Boston Marathon bombing\b/g, "a terror attack in another city"],
  [/\b(the )?Zimmerman verdict( in Florida)?|\bTrayvon Martin\b/g, "a national verdict on race and policing"],
  [/\bDetroit's bankruptcy\b/g, "another city's bankruptcy"],
  [/\bDetroit\b/g, "another city"],
  [/\bLong Island College Hospital\b/g, "a community hospital"],
  [/\b1199 SEIU\b|\b1199\b/g, "the health-care workers' union"],
  [/\bNew York State Nurses Association\b/g, "the nurses' association"],
  [/\bUnited Federation of Teachers\b|\bUFT\b/g, "the teachers' union"],
  [/\bCampaign Finance Board\b|\bCFB\b/g, "the campaign finance board"],
  [/\bQuinnipiac( University)?( Poll)?\b|\bMarist( Poll)?\b|\bNY1\b|\bNBC 4 New York\b|\bWall Street Journal\b/g, "a pollster"],
  [/\bNew York Times\b|\bDNAinfo\b|\bWNYC\b|\bCBS New York\b|\bBrooklyn Paper\b|\bVIN News\b|\bNewsOne\b|\bAl Jazeera\b|\bThe Nation\b|\bBloomberg News\b|\bWFUV\b/g, "a newspaper"],
  [/\bCUNY\b/g, "the city university"],
  [/\bBrooklyn Navy Yard\b/g, "an old navy yard"],
  [/\b(the )?(state university|SUNY)\b/gi, "the state university"],
  [/\bNew York City\b|\bNew York\b|\bNYC\b/g, "the city"],
  // Boroughs by number, the same numbers the districts carry (district 306 is in Borough 3).
  [/\bStaten Island\b/g, "Borough 5"],
  [/\b(the )?Bronx\b/g, "Borough 2"],
  [/\bManhattan\b/g, "Borough 1"],
  [/\bBrooklyn\b/g, "Borough 3"],
  [/\bQueens\b/g, "Borough 4"],
  [/\b(\d{4})-(\d{2})-(\d{2})\b/g, (m) => relative(m)],
  [new RegExp(`\\b(?:[Oo]n )?(${MONTHS.join("|")}) (\\d{1,2})\\b`, "g"), (_m, mon, d) => relative(`2013-${String(MONTHS.indexOf(mon) + 1).padStart(2, "0")}-${d.padStart(2, "0")}`)],
  [/\b(19|20)\d{2}\b/g, "that year"],
];

/** District and neighbourhood names, longest first, so "Park Slope-Carroll Gardens" goes before "Park Slope". */
const PLACE_NAMES = [...new Set(PLACES.flatMap((p) => [p.name, ...p.name.split("-").map((x) => x.trim())]))].filter((x) => x.length >= 5).sort((a, b) => b.length - a.length);
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const PLACE_RULE = new RegExp(`\\b(${PLACE_NAMES.map(escape).join("|")})\\b`, "g");
const placeId = new Map(PLACES.flatMap((p) => [p.name, ...p.name.split("-").map((x) => x.trim())].map((n) => [n, p.cd] as const)));

export function mask(text: string): string {
  let out = text;
  for (const [re, to] of RULES) out = out.replace(re, to as never);
  // Neighbourhoods last, so a named place ("Long Island College Hospital", "Staten Island") is replaced whole first.
  return out.replace(PLACE_RULE, (m) => `district ${placeId.get(m) ?? ""}`.trim());
}

/** What a masked agent's answer to "which race is this?" gives away: the city, the year or a real name. */
export function recognised(answer: string): boolean {
  return /new york|nyc|2013|de blasio|quinn|weiner|thompson|bloomberg/i.test(answer);
}

/** The rules fallback (no API key): the option whose chips point up most. It doubles as the "chips alone" baseline. */
export function byChips(options: { key: string; up?: string[]; down?: string[]; cost?: number }[]): string {
  const score = (o: (typeof options)[number]) => (o.up?.length ?? 0) - (o.down?.filter((t) => t !== "Money left to spend").length ?? 0);
  return [...options].sort((a, b) => score(b) - score(a) || (a.cost ?? 0) - (b.cost ?? 0))[0].key;
}
