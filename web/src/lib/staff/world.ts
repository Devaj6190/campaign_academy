import raw from "../nyc.json";
import { ACTIONS } from "../engine/catalog";
import type { Faction, Staff } from "../data";
import type { Profile } from "./roster";

// The slice of the world a staff run needs. The browser sends it with each instruction; the server never keeps state.

export type Snapshot = {
  day: number;
  min: number;
  cash: number;
  poll: Record<string, number>;
  sent: Record<number, number>;
  factions: Pick<Faction, "id" | "name" | "feel" | "size" | "values" | "dislikes">[];
  staff: Staff[];
  manifesto: string[];
  /** Profiles for people hired during the game (seed staff use roster.ts). */
  hires: Record<string, Profile>;
  morale: Record<string, number>;
  /** Campaign money the rules need: how tired donor groups are, public financing, and today's budgets left. */
  money?: { fatigue: Record<string, number>; participant: boolean | null; left: Record<"ads" | "field" | "events", number> };
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

// Words a player might use for each faction.
export const FACTION_WORDS: Record<string, string[]> = {
  renters: ["renter", "tenant", "rent"],
  homeowners: ["homeowner", "owner", "property"],
  immigrants: ["immigrant", "language", "community", "communities"],
  transit: ["transit", "subway", "bus", "rider", "commut"],
  seniors: ["senior", "older", "elderly", "retire"],
  unions: ["union", "labor", "labour", "worker", "picket"],
  smallbiz: ["small business", "small-business", "merchant", "shop", "bodega", "restaurant"],
  activists: ["progressive", "left", "activist", "brandt"],
  donors: ["donor", "real estate", "wealthy", "developer"],
  students: ["student", "college", "campus", "young"],
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
    .replace(/\b(smallbiz|progressives)\b/g, (m) => fname(m)?.toLowerCase() ?? m)
    .replace(/\b[a-z]+(?:_[a-z]+)+\b/g, (m) => (ACTIONS as Record<string, { label: string }>)[m]?.label.toLowerCase() ?? m.replace(/_/g, " "));
};
