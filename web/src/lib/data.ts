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

// The campaign's posts. Three are filled by the people the case's record names in them (`onRecord` is the source);
// the War room cites it. Every other name is invented, at Devaj's decision on 15 November 2026: the record does not
// say who held those posts, and the student needs a team to direct. The screen does not label them. `good` and `weak`
// describe how a post is played in the simulation; on a real person's post they are not claims about that person.
// Looked for and not found in the 2013 coverage (15 November 2026): field director, scheduler, policy and data
// directors, the organizers, volunteer coordinator, call-time manager and events lead. Two more people are on record
// but not in these posts for the primary: Ross Offinger was finance director but joined "toward the end" of the
// campaign (NY1, 28 December 2017), and Emma Wolfe was deputy campaign manager and political director.
export const STAFF: Staff[] = [
  { id: "cm", name: "Bill Hyers", role: "Campaign Manager", onRecord: "spb-hyers" },
  { id: "fd", name: "Marcus Bell", role: "Field Director", good: "Volunteers, door programs", weak: "Overspends" },
  { id: "fin", name: "Dana Whitfield", role: "Finance Director", good: "Large donors", weak: "Dismissive of small-dollar" },
  { id: "com", name: "Phil Walzak", role: "Communications Director", good: "Press, rapid response", weak: "Tempted by risky tactics", onRecord: "gg-walzak" },
  { id: "pol", role: "Policy Director" },
  { id: "dat", role: "Data Director" },
  { id: "sch", boss: "cm", name: "Priya Nair", role: "Scheduler", good: "Logistics", weak: "Overbooks" },
  { id: "oq", boss: "fd", name: "Rosa Delgado", role: "Organizer, Queens", good: "Tenant networks", weak: "Stretched thin" },
  { id: "ob", boss: "fd", name: "Andre Baptiste", role: "Organizer, Brooklyn", good: "Volunteer turnout", weak: "New to the job" },
  { id: "vc", boss: "fd", name: "Ruth Feldman", role: "Volunteer Coordinator", good: "Training", weak: "Paperwork" },
  { id: "ox", boss: "fd", role: "Organizer, Bronx" },
  { id: "ct", boss: "fin", name: "Vincent Moretti", role: "Call-time Manager", good: "Persistence", weak: "Blunt" },
  { id: "ev", boss: "fin", name: "Carlos Vega", role: "Events Lead", good: "Rooms that fill", weak: "Costs run over" },
  { id: "pr", boss: "com", name: "Hannah Brooks", role: "Press Secretary", good: "Trusted by reporters", weak: "Uneasy with negative campaigning" },
  { id: "dg", boss: "com", name: "Jessica Singleton", role: "Digital Director", good: "Small-dollar email", weak: "Edgy tone", onRecord: "huff-digital" },
];
