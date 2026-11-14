import raw from "../nyc.json";
import type { Faction, Staff } from "../data";
import type { Profile } from "./roster";

// The slice of the world a staff run needs. The browser sends it with each instruction; the server never keeps state.

export type Snapshot = {
  day: number;
  min: number;
  cash: number;
  poll: { cole: number; hale: number; brandt: number };
  sent: Record<number, number>;
  factions: Pick<Faction, "id" | "name" | "feel" | "size" | "values" | "dislikes">[];
  staff: Staff[];
  manifesto: string[];
  /** Profiles for people hired during the game (seed staff use roster.ts). */
  hires: Record<string, Profile>;
  morale: Record<string, number>;
};

export const BOROS = ["", "Manhattan", "Bronx", "Brooklyn", "Queens", "Staten Island"];

type RawD = { cd: number; name: string; issues: [string, number][] };
// Voting districts only: numbers above 18 are parks and airports.
export const PLACES = (raw as unknown as { districts: RawD[] }).districts
  .filter((d) => d.cd % 100 <= 18)
  .sort((a, b) => a.cd - b.cd)
  .map((d) => ({ cd: d.cd, name: d.name, boro: BOROS[Math.floor(d.cd / 100)], issue: d.issues[0]?.[0] ?? "", parts: d.name.toLowerCase().split("-").map((s) => s.trim()) }));

export const placeName = (cd?: number) => PLACES.find((p) => p.cd === cd)?.name ?? "the city";
export const shortPlace = (cd?: number) => placeName(cd).split("-")[0];

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
