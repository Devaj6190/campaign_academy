import raw from "../nyc.json";
import { ACTIONS } from "../engine/catalog";
import type { Faction, Staff } from "../data";
import type { Profile } from "./roster";

// The slice of the world a staff run needs. The browser sends it with each instruction; the server never keeps state.

export type Snapshot = {
  /** The race, the candidate the student works for (name and id) and the live date, read from the case. */
  race: string;
  candidate: string;
  me: string;
  date: string;
  daysLeft: number;
  /** Days since the briefing, from 1. */
  day: number;
  min: number;
  /** What is left to spend under the cap. */
  cash: number;
  /** Citywide standing by candidate id, with the names to print. */
  poll: Record<string, number>;
  names: Record<string, string>;
  /** The student's support in each community district, in percent. */
  sent: Record<number, number>;
  /** The primary's voter groups: `feel` is the student's support there in percent, `size` the group's share of likely voters. */
  factions: Pick<Faction, "id" | "name" | "feel" | "size" | "values" | "dislikes">[];
  staff: Staff[];
  /** The candidate's calendar: appearances booked and not yet done, and the most he can do in a day. */
  booked: { date: string; label: string }[];
  daily: number;
  manifesto: string[];
  /** Profiles for people hired during the game (seed staff use roster.ts). */
  hires: Record<string, Profile>;
  morale: Record<string, number>;
  /** Case units per engine unit: dollars, points in a district, points in a voter group (set in staff/run.ts). */
  scale: { money: number; local: number; group: number };
};

export const BOROS = ["", "Manhattan", "Bronx", "Brooklyn", "Queens", "Staten Island"];

type RawD = { cd: number; name: string; issues: [string, number][] };
// Voting districts only: numbers above 18 are parks and airports.
export const PLACES = (raw as unknown as { districts: RawD[] }).districts
  .filter((d) => d.cd % 100 <= 18)
  .sort((a, b) => a.cd - b.cd)
  .map((d) => ({ cd: d.cd, name: d.name, boro: BOROS[Math.floor(d.cd / 100)], issue: d.issues[0]?.[0] ?? "", parts: d.name.toLowerCase().split("-").map((s) => s.trim()) }));

export const placeName = (cd?: number) => PLACES.find((p) => p.cd === cd)?.name ?? "the city";
export const shortPlace = (cd?: number) => {
  const full = placeName(cd);
  const first = full.split("-")[0];
  return first.length < 5 ? full : first; // "Mid-Island", not "Mid"
};

// Words a student might use for each of the primary's voter groups (ids from lib/cases/mayor2013-factions).
export const FACTION_WORDS: Record<string, string[]> = {
  white: ["white voter", "white "],
  black: ["black voter", "black ", "african american", "african-american"],
  latino: ["latino", "latina", "hispanic"],
  brooklyn: ["brooklyn"],
  manhattan: ["manhattan"],
  "queens-si": ["queens", "staten island"],
  bronx: ["bronx"],
  liberal: ["liberal", "progressive"],
  moderate: ["moderate"],
  conservative: ["conservative"],
  catholic: ["catholic"],
  protestant: ["protestant", "church"],
  jewish: ["jewish"],
  older: ["older", "senior", "over 45", "45 and older", "retire"],
  younger: ["younger", "young", "under 45", "student"],
  women: ["women"],
  men: [" men ", "male voter"],
  "income-high": ["higher income", "high income", "above $50", "over $50"],
  "income-low": ["lower income", "low income", "working class", "under $50"],
  college: ["college graduate", "graduates", "degree holder"],
  "no-college": ["no college", "without a degree", "non-college"],
  union: ["union", "labor", "labour"],
};

export const findPlaces = (text: string) => {
  const t = text.toLowerCase();
  return PLACES.filter((p) => p.parts.some((part) => part.length > 4 && t.includes(part))).map((p) => p.cd);
};
export const findBoros = (text: string) => {
  const t = text.toLowerCase();
  return BOROS.map((b, i) => (b && t.includes(b.toLowerCase()) ? i : 0)).filter(Boolean);
};
export const findFactions = (text: string) => {
  const t = text.toLowerCase();
  return Object.entries(FACTION_WORDS).filter(([, ws]) => ws.some((w) => t.includes(w))).map(([id]) => id);
};

/** Turn the ids an agent writes into words a player reads: "voter_targeting in district 403, faction id: renters"
 *  becomes "voter targeting in Jackson Heights, Renters". */
export const humanize = (text: string, factions: { id: string; name: string }[]) => {
  const fname = (id: string) => factions.find((f) => f.id === id.toLowerCase())?.name;
  return text
    .replace(/(?<![$\d,.])\b(?:(?:community )?district |cd ?)?#?(\d{3})\b(?![,.]?\d)/gi, (m, n) => (PLACES.some((p) => p.cd === +n) ? shortPlace(+n) : m))
    .replace(/\(?\bfaction(?:[ _]id)?\s*[:=]?\s*"?([a-z]+)"?\)?/gi, (m, id) => fname(id) ?? m)
    .replace(/\b[a-z]+(?:_[a-z]+)+\b/g, (m) => (ACTIONS as Record<string, { label: string }>)[m]?.label.toLowerCase() ?? m.replace(/_/g, " "));
};

/** How to refer to someone in a sentence: a first name, or "the Field Director" for a post shown by its title. */
export const short = (p: { name?: string; role: string }) => (!p.name ? "someone" : p.name === p.role ? `the ${p.role}` : p.name.split(" ")[0]);

/** The campaign as staff read it: the date, money, poll, calendar, platform, voter groups and districts. */
export function describeWorld(w: Snapshot) {
  const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
  const poll = Object.entries(w.poll).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).map(([id, v]) => `${w.names[id] ?? id} ${Math.round(v)}`).join(", ");
  const factions = w.factions.map((f) => `${f.id} (${f.name}): ${Math.round(f.feel)}% support ${w.candidate}; ${f.size}% of likely voters`).join("\n");
  const weakest = [...PLACES].sort((a, b) => (w.sent[a.cd] ?? 0) - (w.sent[b.cd] ?? 0));
  const line = (p: (typeof PLACES)[number]) => `${p.cd} ${p.name} (${p.boro}): support ${Math.round(w.sent[p.cd] ?? 0)}%`;
  return `Today is ${w.date}; ${w.daysLeft} days to the primary. The whole campaign has ${usd(w.cash)} left to spend under the cap (every order draws on it). Poll: ${poll}.
The candidate's calendar (he can do ${w.daily} things a day): ${w.booked.length ? w.booked.map((b) => `${b.date} ${b.label}`).join("; ") : "nothing booked"}.
Platform: ${w.manifesto.map((m, i) => `${i + 1}. ${m}`).join(" ")}
Voter groups (use the id). They overlap: one voter is in several.
${factions}
Districts (use the number). Support is simulated, in percent:
${PLACES.map(line).join("\n")}
Weakest five: ${weakest.slice(0, 5).map((p) => p.name).join(", ")}.`;
}
