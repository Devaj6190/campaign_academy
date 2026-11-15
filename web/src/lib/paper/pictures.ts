// The Ledger's picture desk. Every picture is prebuilt in public/art/paper (generated once, black-and-white press style,
// no real people), so an edition never waits on an image. Each story gets the first picture whose topic it mentions;
// a page never shows the same picture twice. The paper captions them as illustrations, never as news photographs.

export type Picture = { id: string; src: string; caption: string };

// Order is priority: the first topic a story matches wins, so the specific ones come before the broad ones.
const DESK: (Picture & { test: RegExp })[] = [
  { id: "debate", caption: "A debate stage before the candidates arrive.", test: /\b(debate|forum|podium)s?\b/i },
  { id: "ads", caption: "A crew films a campaign advertisement.", test: /\b(ad|ads|advert\w*|television|tv|commercial|spot)\b/i },
  { id: "policing", caption: "Patrol officers on a Bronx block.", test: /stop-and-frisk|\bpolic\w*|\bcommissioner\b|\bnypd\b|\bcrime\b|counterterror/i },
  { id: "court", caption: "Reporters wait outside a courthouse.", test: /\b(judge|court|trial|probe|indict\w*|arrest\w*|unconstitutional|investigat\w*|admissions?)\b/i },
  { id: "fundraising", caption: "Donors at a campaign dinner.", test: /\b(fundrais\w*|donors?|war chest|matching funds|raised|reserve|spending limit|house part(y|ies))\b/i },
  { id: "endorsement", caption: "Microphones wait for an endorsement.", test: /\bendors\w*|\bpress conference\b|\bspokesman\b|\bannounc\w*/i },
  { id: "poll", caption: "Interviewers at a polling firm.", test: /\b(polls?|polling|pollsters?|survey)\b/i },
  { id: "union", caption: "Members rally in a Manhattan plaza.", test: /\b(unions?|labor|workers|rally|rallies|protest\w*|march\w*|raises|pension\w*|contracts?)\b/i },
  { id: "community", caption: "A community meeting in a church hall.", test: /\b(church\w*|congregation|pastor|black voters|faith)\b/i },
  { id: "housing", caption: "Public housing beside Brooklyn brownstones.", test: /\b(housing|rent\w*|tenants?|landlords?|hospital|homeless\w*|inequality|two cities)\b/i },
  { id: "schools", caption: "Morning at a public school.", test: /\b(schools?|teachers?|pre-?k|education|students?)\b/i },
  { id: "transit", caption: "Rush hour on a subway platform.", test: /\b(subway|transit|commut\w*|fares?|buses?|mta)\b/i },
  { id: "canvass", caption: "Volunteers knock on a Queens door.", test: /\b(doors?|canvass\w*|volunteers?|knock\w*|field)\b/i },
  { id: "voting", caption: "Voters line up at a polling place.", test: /\b(ballots?|turnout|primary day|polling place|runoff|vote|votes|voters)\b/i },
  { id: "cityhall", caption: "City Hall across the park.", test: /\b(city hall|mayor|bloomberg|incumbent|budget|bankruptcy|council)\b/i },
].map((p) => ({ ...p, src: `/art/paper/${p.id}.webp` }));

/** The picture for a story: the first topic it mentions that the page has not used yet. Marks it used. */
export function pictureFor(text: string, used: Set<string>): Picture | null {
  const p = DESK.find((x) => !used.has(x.id) && x.test.test(text));
  if (!p) return null;
  used.add(p.id);
  return { id: p.id, src: p.src, caption: p.caption };
}

/** For the self-check: every topic on the desk. */
export const DESK_IDS = DESK.map((p) => p.id);
