import { FACTIONS_2013 } from "./mayor2013-factions";

// Which of the primary's voter groups pull together and which pull apart, for the lines on the Factions screen.
//
// None of this is poll data. Every link is read off mayor2013-leanings.ts: two groups are `shared` when both list the
// same thing among what they are likely to value or dislike, and `opposed` when one is likely to value what the other
// is likely to dislike. `why` names that thing. A group the leanings file leaves empty (most groups defined only by
// race, religion or gender) has no links, because identity alone says too little to infer one fairly.
//
// A link only shows a connection. It moves no number: work aimed at one group does not spill into its linked groups.
// ponytail: written by hand, one line per pair. Derive them from tagged leanings if a second case needs links.

export type Link = { a: string; b: string; kind: "shared" | "opposed"; why: string };

export const LINKS_2013: Link[] = [
  { a: "brooklyn", b: "queens-si", kind: "shared", why: "Attention for the boroughs outside Manhattan" },
  { a: "brooklyn", b: "bronx", kind: "shared", why: "Attention for the boroughs outside Manhattan" },
  { a: "queens-si", b: "bronx", kind: "shared", why: "Attention for the boroughs outside Manhattan" },
  { a: "liberal", b: "black", kind: "shared", why: "Changing how the police stop and frisk" },
  { a: "liberal", b: "income-low", kind: "shared", why: "Public services kept and paid for" },
  { a: "income-low", b: "union", kind: "shared", why: "Paid sick leave" },
  { a: "income-low", b: "younger", kind: "shared", why: "Housing they can afford" },
  { a: "income-low", b: "bronx", kind: "shared", why: "Affordable housing" },
  { a: "income-low", b: "no-college", kind: "shared", why: "Higher wages" },
  { a: "younger", b: "no-college", kind: "shared", why: "Jobs" },
  { a: "income-low", b: "older", kind: "shared", why: "No cuts to city services" },
  { a: "moderate", b: "older", kind: "shared", why: "Public safety" },
  { a: "moderate", b: "conservative", kind: "shared", why: "Public safety, and no tax rises" },
  { a: "conservative", b: "income-high", kind: "shared", why: "Lower taxes" },
  { a: "liberal", b: "conservative", kind: "opposed", why: "Taxes on high incomes, and limits on policing" },
  { a: "liberal", b: "income-high", kind: "opposed", why: "Higher income taxes" },
  { a: "liberal", b: "moderate", kind: "opposed", why: "A sharp break or steady management" },
  { a: "black", b: "conservative", kind: "opposed", why: "Stop and frisk" },
];

/** Every link that touches one group, with the group at the other end. */
export const linksOf = (id: string) => LINKS_2013.filter((l) => l.a === id || l.b === id).map((l) => ({ ...l, other: l.a === id ? l.b : l.a }));

// The one check this file needs: a link that names a group the screen does not have would silently draw nothing.
const known = new Set(FACTIONS_2013.map((f) => f.id));
console.assert(LINKS_2013.every((l) => known.has(l.a) && known.has(l.b) && l.a !== l.b), "mayor2013-links names an unknown group");
