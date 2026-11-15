import { FACTIONS_2013 } from "./mayor2013-factions";

// Which of the primary's voter groups pull together and which pull apart, for the lines on the Factions screen.
//
// Every link rests on a published poll table: two groups are `shared` when both stand clearly on the same side of a
// question, and `opposed` when they stand on opposite sides or far apart. `why` completes "Agree on: …" or "Split on: …" in a few words
// (the screen has room for two short lines); the figures are in the comment beside each link. Read from the tables on
// 15 November 2026; recheck them against the PDFs before publishing.
//
// Sources:
// - Marist: the NBC 4 New York / Wall Street Journal / Marist tables of 3 to 6 September 2013 linked in
//   mayor2013-factions.ts, registered Democrats (n=936). Its Bloomberg rating is of all registered voters (n=1,533).
//   "S&F" is "Should the next mayor continue or not continue the police policy of stop and frisk?"
//
// Limits: each group is a few hundred people or fewer, so a gap under about 10 points is within the margin of error.
// All figures are from one week, so the links do not change as the campaign runs. Some shared pairs are largely the
// same people (Black voters and Protestants, Latino voters and Catholics). Women, men, college graduates and the Bronx
// have no links: the tables show no clear gap for them.
//
// A link shows a connection. Work bought by the weekly plan spills along it (`spill` in lib/cases/allocation, #33);
// staff orders, appearances and planks do not.
// ponytail: written by hand, one line per pair. Derive them from a table of figures if a second case needs links.

export type Link = { a: string; b: string; kind: "shared" | "opposed"; why: string };

const END = "Ending stop and frisk", RATING = "A good job by Bloomberg", COST = "The city being unaffordable", TERM = "Opposing the term-limits extension";

export const LINKS_2013: Link[] = [
  { a: "liberal", b: "manhattan", kind: "shared", why: END }, // S&F not continue: 60% and 61% (all Democrats 52%)
  { a: "liberal", b: "black", kind: "shared", why: END }, // 60% and 58%
  { a: "liberal", b: "younger", kind: "shared", why: END }, // 60% and 57%
  { a: "black", b: "protestant", kind: "shared", why: END }, // 58% and 57%
  { a: "catholic", b: "latino", kind: "shared", why: "Keeping stop and frisk" }, // S&F continue: 52% and 48%, the only two groups with more for than against
  { a: "moderate", b: "conservative", kind: "shared", why: "No majority for ending stop and frisk" }, // continue / not: 46-47 and 45-45
  { a: "income-low", b: "latino", kind: "shared", why: COST }, // cost of living "not affordable at all": 42% and 41% (all 33%)
  { a: "income-low", b: "no-college", kind: "shared", why: COST }, // 42% and 39%
  { a: "white", b: "jewish", kind: "shared", why: RATING }, // Bloomberg excellent or good: 56% and 64% (all voters 46%)
  { a: "jewish", b: "manhattan", kind: "shared", why: RATING }, // 64% and 54%
  { a: "white", b: "income-high", kind: "shared", why: "Affordability being beyond the mayor" }, // 65% each (all 59%)
  { a: "union", b: "black", kind: "shared", why: TERM }, // less likely to back a candidate who supported extending term limits: 45% and 41% (all 36%)
  { a: "union", b: "brooklyn", kind: "shared", why: TERM }, // 45% and 41%
  { a: "liberal", b: "moderate", kind: "opposed", why: END }, // S&F not continue: 60% against 47%
  { a: "liberal", b: "conservative", kind: "opposed", why: END }, // 60% against 45%
  { a: "black", b: "conservative", kind: "opposed", why: END }, // 58% against 45%
  { a: "black", b: "catholic", kind: "opposed", why: END }, // 58% not continue; 52% continue
  { a: "manhattan", b: "queens-si", kind: "opposed", why: END }, // 61% against 45%
  { a: "white", b: "black", kind: "opposed", why: "How well Bloomberg has done" }, // excellent or good: 56% against 37%
  { a: "jewish", b: "union", kind: "opposed", why: "How well Bloomberg has done" }, // 64% against 35%
  { a: "income-low", b: "income-high", kind: "opposed", why: "Whether a mayor can lower the cost of living" }, // able to make the city affordable: 43% against 31%
  { a: "younger", b: "older", kind: "opposed", why: "How much the term-limits extension matters" }, // less likely: 30% against 40%
];

/** Every link that touches one group, with the group at the other end. */
export const linksOf = (id: string) => LINKS_2013.filter((l) => l.a === id || l.b === id).map((l) => ({ ...l, other: l.a === id ? l.b : l.a }));

// The one check this file needs: a link that names a group the screen does not have would silently draw nothing.
const known = new Set(FACTIONS_2013.map((f) => f.id));
console.assert(LINKS_2013.every((l) => known.has(l.a) && known.has(l.b) && l.a !== l.b), "mayor2013-links names an unknown group");
