// Seed content for the one hand-made candidate. People and groups are described by local issues, never by party or ideology.
// All of it is fiction; only the map data (nyc.json) is real.

export type View = "case" | "profile" | "war" | "map" | "factions";

export type Faction = {
  id: string;
  name: string;
  size: number; // relative size, 0-100
  feel: number; // 0 cold - 100 warm toward the candidate
  about: string;
  values: string[];
  dislikes: string[];
};

export const FACTIONS: Faction[] = [
  { id: "renters", name: "Renters", size: 100, feel: 68, about: "Most of the city rents. Young, spread across every borough, and they turn out when they believe rent is on the ballot.", values: ["Stable rents", "More housing", "Tenant protection"], dislikes: ["Luxury-only development", "Landlord tax breaks"] },
  { id: "homeowners", name: "Homeowners", size: 80, feel: 30, about: "Concentrated in the low-density outer boroughs. Older, reliable voters who feel the city changes without asking them.", values: ["Property values", "Parking", "Quiet streets"], dislikes: ["Upzoning", "Density near their blocks", "Property tax rises"] },
  { id: "immigrants", name: "Immigrant communities", size: 78, feel: 66, about: "Dozens of communities, many of them small-business families and renters, clustered in Queens, Brooklyn and the Bronx.", values: ["Language access", "Small-business support", "Stable housing"], dislikes: ["Enforcement crackdowns", "Being talked about, not to"] },
  { id: "transit", name: "Transit riders", size: 72, feel: 64, about: "Anyone who depends on a bus or subway to get to work. They notice every delay.", values: ["Reliable service", "Bus lanes", "Fair fares"], dislikes: ["Service cuts", "Fare hikes"] },
  { id: "seniors", name: "Seniors", size: 70, feel: 48, about: "The most dependable voters in the city. Cautious about change, attentive to safety and services.", values: ["Safety", "Healthcare access", "Stability"], dislikes: ["Disorder", "Sudden change"] },
  { id: "unions", name: "Union members", size: 56, feel: 46, about: "Municipal workers, building trades, transit and service workers. Organised, and they remember who showed up.", values: ["Contracts honoured", "Good public jobs", "Showing up"], dislikes: ["Outsourcing", "Fair-weather allies"] },
  { id: "smallbiz", name: "Small business", size: 50, feel: 62, about: "Shop, restaurant and service owners working on thin margins and high rents.", values: ["Affordable commercial rent", "Less red tape"], dislikes: ["Fines", "Street changes without consultation"] },
  { id: "activists", name: "Young activists", size: 46, feel: 38, about: "Activist, online and energetic. They supply volunteers when they believe, and criticism when they do not.", values: ["Bold housing and climate action", "Police accountability"], dislikes: ["Compromise sold as victory", "The police budget vote"] },
  { id: "donors", name: "Donors & real estate", size: 26, feel: 24, about: "Few in number, large in money. They fund campaigns and expect a hearing.", values: ["Predictability", "Development rights"], dislikes: ["Rent regulation", "Surprises"] },
  { id: "students", name: "Students", size: 24, feel: 50, about: "Low turnout, high energy. Many are deciding between you and Brandt.", values: ["Affordable housing and transit", "Being taken seriously"], dislikes: ["Being treated as free labour"] },
];

export type Staff = {
  id: string;
  boss?: string;
  role: string;
  name?: string; // undefined = vacant post
  good?: string;
  weak?: string;
  doing?: string;
  /** Set when the case's record names this person in this post: the id of the source. What they say here is simulated. */
  onRecord?: string;
};

// The campaign's posts. A real name appears only where the case's record names that person in that post; every other
// post is shown by its title, because no invented person sits in a real campaign.
export const STAFF: Staff[] = [
  { id: "cm", name: "Bill Hyers", role: "Campaign Manager", onRecord: "spb-hyers" },
  { id: "fd", name: "Field Director", role: "Field Director", good: "Volunteers, door programs", weak: "Overspends" },
  { id: "fin", name: "Finance Director", role: "Finance Director", good: "Large donors", weak: "Dismissive of small-dollar" },
  { id: "com", name: "Communications Director", role: "Communications Director", good: "Press, rapid response", weak: "Tempted by risky tactics" },
  { id: "pol", role: "Policy Director" },
  { id: "dat", role: "Data Director" },
  { id: "sch", boss: "cm", name: "Scheduler", role: "Scheduler", good: "Logistics", weak: "Overbooks" },
  { id: "oq", boss: "fd", name: "Organizer, Queens", role: "Organizer, Queens", good: "Tenant networks", weak: "Stretched thin" },
  { id: "ob", boss: "fd", name: "Organizer, Brooklyn", role: "Organizer, Brooklyn", good: "Volunteer turnout", weak: "New to the job" },
  { id: "vc", boss: "fd", name: "Volunteer Coordinator", role: "Volunteer Coordinator", good: "Training", weak: "Paperwork" },
  { id: "ox", boss: "fd", role: "Organizer, Bronx" },
  { id: "ct", boss: "fin", name: "Call-time Manager", role: "Call-time Manager", good: "Persistence", weak: "Blunt" },
  { id: "ev", boss: "fin", name: "Events Lead", role: "Events Lead", good: "Rooms that fill", weak: "Costs run over" },
  { id: "pr", boss: "com", name: "Press Secretary", role: "Press Secretary", good: "Trusted by reporters", weak: "Uneasy with negative campaigning" },
  { id: "dg", boss: "com", name: "Digital Lead", role: "Digital Lead", good: "Small-dollar email", weak: "Edgy tone" },
];

export type Flow = { k: string; v: number; items: [string, number][] };

export const LOSSES: Flow[] = [
  { k: "Staff", v: 9200, items: [["Directors", 5200], ["Organizers", 2900], ["Support", 1100]] },
  { k: "Ads", v: 6000, items: [["Digital", 3500], ["Mail", 1700], ["Radio", 800]] },
  { k: "Field", v: 4100, items: [["Field offices", 1900], ["Canvass literature", 1600], ["Volunteer food", 600]] },
  { k: "Events", v: 2500, items: [["Venues", 1500], ["Sound and staging", 1000]] },
];

export const GAINS: Flow[] = [
  { k: "Fundraisers", v: 8000, items: [["Dinners", 5000], ["House parties", 3000]] },
  { k: "Small donors", v: 7400, items: [["Online", 5100], ["Text", 1400], ["At the door", 900]] },
  { k: "Large donors", v: 3000, items: [["Call time", 3000]] },
];

export const RECORD: { ok: boolean; text: string; liked: string; not: string }[] = [
  { ok: true, text: "Voted for housing near subway stations", liked: "Renters, students", not: "Homeowners" },
  { ok: true, text: "Wrote small-business rent relief", liked: "Small business, immigrant communities", not: "Real-estate donors" },
  { ok: false, text: "Voted against cutting the police budget", liked: "Seniors", not: "Young activists" },
  { ok: true, text: "Backed bus lane expansion", liked: "Transit riders", not: "Drivers, some merchants" },
  { ok: false, text: "Took union endorsements, skipped a picket", liked: "Nobody fully", not: "Union members" },
];

export const OPPONENTS = [
  { id: "hale", name: "Victoria Hale", tag: "Runs on public safety and business", note: "Money, homeowners, Staten Island." },
  { id: "brandt", name: "Naomi Brandt", tag: "Runs on rent and police reform", note: "Young activists and students." },
] as const;

export const PROBLEMS = [
  "Brandt is pulling young activists and students; Hale holds homeowners and seniors.",
  "At the current burn, the money runs out before day 30.",
  "No organizer in the Bronx, the biggest open area.",
  "The unions have not endorsed.",
];

export const QUIPS: [string, string][] = [
  ["fd", "We have nobody in the Bronx. I need an organizer there this week."],
  ["fin", "At this burn we are out of money by day 24."],
  ["com", "Hale's crime ad is landing. I have an idea, but you may not like it."],
  ["cm", "The unions are meeting on day 3. You should be in the room."],
];

export const STRONG = [401, 402, 403, 301, 304, 302];
export const WEAK = [501, 502, 503, 310, 311, 313, 315, 318, 108, 106];
