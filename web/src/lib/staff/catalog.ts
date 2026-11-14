// What staff can actually do. Agents choose from this list; the engine (engine.ts) decides what it costs and
// what it changes. No number an agent writes ever reaches cash, sentiment or the poll directly.

export type Skill = "planning" | "scheduling" | "field" | "volunteers" | "finance" | "events" | "comms" | "press" | "digital" | "policy" | "data";

export type ActionId =
  | "canvass"
  | "phone_bank"
  | "rally"
  | "house_party"
  | "donor_dinner"
  | "call_time"
  | "email_blast"
  | "digital_ads"
  | "mail_piece"
  | "press_pitch"
  | "rapid_response"
  | "volunteer_training"
  | "coalition_meeting"
  | "policy_brief"
  | "voter_targeting"
  | "schedule_event";

export type Action = {
  id: ActionId;
  label: string;
  /** Present participle for live status: "Canvassing Astoria". */
  doing: string;
  cost: number;
  /** Base sentiment change in the target district. */
  local?: number;
  /** Base change in how the target faction feels. */
  group?: number;
  /** Money raised, [low, high] before modifiers. */
  raise?: [number, number];
  /** Poll momentum; whole points reach the poll. */
  momentum?: number;
  needs: { district?: boolean; faction?: boolean };
  skills: Skill[];
  /** One line the agents read when choosing. */
  about: string;
};

export const ACTIONS: Record<ActionId, Action> = {
  canvass: { id: "canvass", label: "Door canvass", doing: "Canvassing", cost: 1800, local: 4, momentum: 0.15, needs: { district: true }, skills: ["field", "volunteers"], about: "Shifts of volunteers knocking doors in one district. Best way to move a district." },
  phone_bank: { id: "phone_bank", label: "Phone bank", doing: "Phone banking", cost: 700, local: 1.5, group: 1.5, momentum: 0.08, needs: { district: true }, skills: ["field", "volunteers"], about: "Volunteers calling voters in one district. Cheap, modest effect." },
  rally: { id: "rally", label: "Rally", doing: "Running a rally in", cost: 6500, local: 6, group: 2, momentum: 0.35, needs: { district: true }, skills: ["events", "field"], about: "A big public event in one district. Expensive, visible, energises a faction." },
  house_party: { id: "house_party", label: "House party", doing: "Hosting a house party in", cost: 900, local: 1.5, raise: [3000, 7000], needs: { district: true }, skills: ["events", "finance"], about: "Supporters host neighbours. Raises small money and some goodwill." },
  donor_dinner: { id: "donor_dinner", label: "Donor dinner", doing: "Hosting a donor dinner", cost: 4000, raise: [14000, 26000], group: -1, needs: {}, skills: ["finance", "events"], about: "High-dollar dinner. Raises the most money; activists notice." },
  call_time: { id: "call_time", label: "Call time", doing: "Running call time", cost: 200, raise: [5000, 11000], needs: {}, skills: ["finance"], about: "The candidate calls donors from a list. Cheap and effective, costs his time." },
  email_blast: { id: "email_blast", label: "Small-dollar email", doing: "Sending a small-dollar email", cost: 300, raise: [2500, 6500], group: 1, momentum: 0.05, needs: { faction: true }, skills: ["digital", "finance"], about: "An email and text push to supporters, framed for one faction." },
  digital_ads: { id: "digital_ads", label: "Digital ads", doing: "Running digital ads for", cost: 5000, group: 3, momentum: 0.3, needs: { faction: true }, skills: ["digital", "comms"], about: "Targeted online ads to one faction, citywide." },
  mail_piece: { id: "mail_piece", label: "Mail piece", doing: "Mailing", cost: 3500, local: 2, group: 2, momentum: 0.15, needs: { district: true, faction: true }, skills: ["digital", "comms"], about: "Printed mail to one faction in one district. Seniors read mail." },
  press_pitch: { id: "press_pitch", label: "Press pitch", doing: "Pitching reporters on", cost: 400, group: 2, momentum: 0.25, needs: { faction: true }, skills: ["press", "comms"], about: "Pitch a story to reporters. Free media if it lands." },
  rapid_response: { id: "rapid_response", label: "Rapid response", doing: "Hitting back on", cost: 1200, group: 2.5, momentum: 0.2, needs: { faction: true }, skills: ["comms", "press"], about: "Answer an attack or a news story the same day." },
  volunteer_training: { id: "volunteer_training", label: "Volunteer training", doing: "Training volunteers in", cost: 600, local: 1, needs: { district: true }, skills: ["volunteers", "field"], about: "Train new volunteers. Makes later canvasses in that district stronger." },
  coalition_meeting: { id: "coalition_meeting", label: "Coalition meeting", doing: "Meeting leaders of", cost: 500, group: 4, needs: { faction: true }, skills: ["planning", "policy", "field"], about: "Sit down with a faction's leaders (union locals, tenant groups, merchants)." },
  policy_brief: { id: "policy_brief", label: "Policy brief", doing: "Drafting a brief for", cost: 800, group: 3, momentum: 0.1, needs: { faction: true }, skills: ["policy"], about: "A detailed plan aimed at one faction's concerns." },
  voter_targeting: { id: "voter_targeting", label: "Voter targeting", doing: "Modelling turnout in", cost: 1500, local: 1, needs: { district: true }, skills: ["data"], about: "Build a target list for a district. Makes later field work there stronger." },
  schedule_event: { id: "schedule_event", label: "Schedule it", doing: "Scheduling", cost: 0, needs: {}, skills: ["scheduling", "planning"], about: "Put something on the candidate's calendar. No direct effect, but it happens." },
};

export const ACTION_IDS = Object.keys(ACTIONS) as [ActionId, ...ActionId[]];
