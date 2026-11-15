// The tabs, and the campaign's staff posts.

export type View = "case" | "profile" | "war" | "map" | "factions";

/** A voter group as the staff agents see it: `feel` is support in percent, `size` its share of likely voters. */
export type Faction = {
  id: string;
  name: string;
  size: number;
  feel: number;
  about: string;
  values: string[];
  dislikes: string[];
};

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
// post is shown by its title, because no invented person sits in a real campaign. `good` and `weak` describe how the
// post is played in the simulation; they are not claims about the person named.
// Looked for and not found in the 2013 coverage (15 November 2026): field director, scheduler, policy and data
// directors, the organizers, volunteer coordinator, call-time manager and events lead. Two more people are on record
// but not in these posts for the primary: Ross Offinger was finance director but joined "toward the end" of the
// campaign (NY1, 28 December 2017), and Emma Wolfe was deputy campaign manager and political director.
export const STAFF: Staff[] = [
  { id: "cm", name: "Bill Hyers", role: "Campaign Manager", onRecord: "spb-hyers" },
  { id: "fd", name: "Field Director", role: "Field Director", good: "Volunteers, door programs", weak: "Overspends" },
  { id: "fin", name: "Finance Director", role: "Finance Director", good: "Large donors", weak: "Dismissive of small-dollar" },
  { id: "com", name: "Phil Walzak", role: "Communications Director", good: "Press, rapid response", weak: "Tempted by risky tactics", onRecord: "gg-walzak" },
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
  { id: "dg", boss: "com", name: "Jessica Singleton", role: "Digital Director", good: "Small-dollar email", weak: "Edgy tone", onRecord: "huff-digital" },
];
