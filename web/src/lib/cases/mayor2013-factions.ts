// The factions of the 2013 Democratic primary, for the Factions screen.
//
// Every number here is read from two published Marist poll tables:
// - `feb`: de Blasio's share in the group, NY1-Marist poll, 4 to 12 February 2013, registered Democrats (n=875).
// - `sep`: the same, NBC 4 New York / Wall Street Journal / Marist poll, 3 to 6 September 2013, likely Democratic
//   primary voters (n=556). The two polls ask different populations, so the gap is not a pure trend.
// - `share`: the group's share of the September poll's likely voters, in percent. It sets the bubble size.
// `tracks` names the case's own voter group where the case already simulates this group decision by decision.

export type Faction = { id: string; name: string; kind: "Race" | "Borough" | "Ideology" | "Religion" | "Age" | "Gender" | "Income" | "Education" | "Labor"; feb: number; sep: number; share: number; tracks?: string };

export const FACTION_POLLS = {
  feb: { label: "NY1-Marist poll, 4 to 12 February 2013, registered Democrats", url: "https://maristpoll.marist.edu/wp-content/misc/nycpolls/c130204/2013%20Mayoralty/NYC%20NY1-Marist%20Poll%20Tables_February%2014,%202013.pdf", citywide: 12 },
  sep: { label: "NBC 4 New York / Wall Street Journal / Marist poll, 3 to 6 September 2013, likely Democratic primary voters", url: "https://maristpoll.marist.edu/wp-content/misc/nycpolls/c130903/NYC%20Mayoralty/Complete%20September%209,%202013%20NBC%204%20New%20York_Wall%20Street%20Journal_Marist%20Poll%20NYC%20Tables.pdf", citywide: 36 },
};

export const FACTIONS_2013: Faction[] = [
  { id: "white", name: "White voters", kind: "Race", feb: 15, sep: 37, share: 41, tracks: "white" },
  { id: "black", name: "Black voters", kind: "Race", feb: 11, sep: 39, share: 29, tracks: "black" },
  { id: "latino", name: "Latino voters", kind: "Race", feb: 12, sep: 29, share: 23, tracks: "hispanic" },
  { id: "brooklyn", name: "Brooklyn", kind: "Borough", feb: 17, sep: 40, share: 30 },
  { id: "manhattan", name: "Manhattan", kind: "Borough", feb: 13, sep: 40, share: 27 },
  { id: "queens-si", name: "Queens and Staten Island", kind: "Borough", feb: 9, sep: 28, share: 27 },
  { id: "bronx", name: "The Bronx", kind: "Borough", feb: 10, sep: 32, share: 15 },
  { id: "liberal", name: "Liberals", kind: "Ideology", feb: 13, sep: 40, share: 46 },
  { id: "moderate", name: "Moderates", kind: "Ideology", feb: 15, sep: 34, share: 33 },
  { id: "conservative", name: "Conservatives", kind: "Ideology", feb: 11, sep: 28, share: 21 },
  { id: "catholic", name: "Catholics", kind: "Religion", feb: 12, sep: 34, share: 34 },
  { id: "protestant", name: "Protestants", kind: "Religion", feb: 11, sep: 38, share: 29 },
  { id: "jewish", name: "Jewish voters", kind: "Religion", feb: 18, sep: 33, share: 15 },
  { id: "older", name: "45 and older", kind: "Age", feb: 12, sep: 38, share: 64 },
  { id: "younger", name: "Under 45", kind: "Age", feb: 12, sep: 31, share: 36 },
  { id: "women", name: "Women", kind: "Gender", feb: 11, sep: 34, share: 56 },
  { id: "men", name: "Men", kind: "Gender", feb: 15, sep: 38, share: 44 },
  { id: "income-high", name: "$50,000 or more", kind: "Income", feb: 15, sep: 37, share: 58 },
  { id: "income-low", name: "Under $50,000", kind: "Income", feb: 11, sep: 36, share: 42 },
  { id: "college", name: "College graduates", kind: "Education", feb: 13, sep: 37, share: 56 },
  { id: "no-college", name: "No college degree", kind: "Education", feb: 12, sep: 34, share: 44 },
  { id: "union", name: "Union households", kind: "Labor", feb: 13, sep: 34, share: 31, tracks: "union" },
];

/**
 * A faction's support on the student's path. Simulated: it starts at the February figure and moves in step with
 * the student's citywide standing, so a campaign that reaches the September citywide figure reaches the faction's
 * September figure too. Groups the case simulates itself (`tracks`) are read from the case and never come here.
 */
export function factionSupport(f: Faction, citywideNow: number, citywideStart: number): number {
  const done = (citywideNow - citywideStart) / (FACTION_POLLS.sep.citywide - FACTION_POLLS.feb.citywide);
  return Math.max(0, Math.min(100, f.feb + (f.sep - f.feb) * done));
}

/** Where the student stands with a faction now: from the case where the case simulates it, otherwise derived. */
export const factionNow = (f: Faction, groups: Record<string, number>, citywideNow: number, citywideStart: number): number =>
  f.tracks ? (groups[f.tracks] ?? 0) : factionSupport(f, citywideNow, citywideStart);
