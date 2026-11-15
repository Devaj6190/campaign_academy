import type { ActionId, Skill } from "../engine/catalog";
import { ME } from "../scenario";

// How each person actually works, beyond the one-line "good at / weak at" on the profile.
// The engine uses the numbers; the agents use the voice.

export type Profile = {
  skills: Skill[];
  /** Multiplier on what their actions cost. Marcus overspends. */
  cost: number;
  /** Multiplier on what their actions achieve. */
  effect: number;
  /** Per-action adjustments, e.g. Dana is great at call time and bad at small-dollar email. */
  special?: Partial<Record<ActionId, number>>;
  /** Extra effect in these boroughs (first digit of the district number). */
  turf?: number[];
  /** Extra effect in these specific districts (the candidate's home turf). */
  home?: number[];
  /** How they talk. Fed to their agent. */
  voice: string;
  salary: number;
};

// Role → skills, for vacant posts and new hires.
export const ROLE_SKILLS: Record<string, Skill[]> = {
  "Campaign Manager": ["planning", "scheduling"],
  "Field Director": ["field", "volunteers"],
  "Finance Director": ["finance", "events"],
  "Communications Director": ["comms", "press"],
  "Policy Director": ["policy", "planning"],
  "Data Director": ["data", "planning"],
  Scheduler: ["scheduling"],
  "Organizer, Queens": ["field", "volunteers"],
  "Organizer, Brooklyn": ["field", "volunteers"],
  "Organizer, Bronx": ["field", "volunteers"],
  "Volunteer Coordinator": ["volunteers", "field"],
  "Call-time Manager": ["finance"],
  "Events Lead": ["events"],
  "Press Secretary": ["press", "comms"],
  "Digital Lead": ["digital"],
};

const TURF: Record<string, number[]> = { "Organizer, Queens": [4], "Organizer, Brooklyn": [3], "Organizer, Bronx": [2] };

export const PROFILES: Record<string, Profile> = {
  cm: { skills: ["planning", "scheduling"], cost: 0.95, effect: 1, voice: "Calm, organised, slightly cautious. Speaks in plans and next steps. Pushes back on risky moves.", salary: 1500 },
  fd: { skills: ["field", "volunteers"], cost: 1.25, effect: 1.15, voice: "High energy, talks fast, loves the doors. Always wants a bit more money.", salary: 1300 },
  fin: { skills: ["finance", "events"], cost: 1, effect: 1, special: { call_time: 1.35, donor_dinner: 1.3, email_blast: 0.7, house_party: 0.85 }, voice: "Crisp and transactional. Thinks in donors and dollars. Faintly dismissive of small-dollar fundraising.", salary: 1300 },
  com: { skills: ["comms", "press"], cost: 1, effect: 1.1, special: { rapid_response: 1.2 }, voice: "Quick, witty, a little reckless. Always has an angle.", salary: 1100 },
  sch: { skills: ["scheduling"], cost: 1, effect: 1, voice: "Brisk logistics person. Mentions times and conflicts.", salary: 450 },
  oq: { skills: ["field", "volunteers"], cost: 1, effect: 1.1, turf: [4], special: { coalition_meeting: 1.3 }, voice: "Warm, grounded, knows every tenant association in Queens. Sounds tired.", salary: 500 },
  ob: { skills: ["field", "volunteers"], cost: 1, effect: 0.9, turf: [3], voice: "Eager and new. A little unsure, very earnest.", salary: 450 },
  vc: { skills: ["volunteers", "field"], cost: 0.9, effect: 1, special: { volunteer_training: 1.4 }, voice: "Patient teacher. Practical. Hates paperwork.", salary: 400 },
  ct: { skills: ["finance"], cost: 1, effect: 1, special: { call_time: 1.25 }, voice: "Blunt. Numbers first, feelings never.", salary: 400 },
  ev: { skills: ["events"], cost: 1.2, effect: 1.15, voice: "Showman. Loves a packed room, forgets the budget.", salary: 450 },
  pr: { skills: ["press", "comms"], cost: 1, effect: 1, special: { press_pitch: 1.3 }, voice: "Measured and principled. Reporters trust her. Will not lie.", salary: 500 },
  dg: { skills: ["digital"], cost: 1, effect: 1, special: { email_blast: 1.3 }, voice: "Online native. Edgy, punchy, uses short sentences.", salary: 400 },
};

// The candidate in person: better than staff, no skill gaps, strongest in his council district in western Queens.
export const CANDIDATE: Profile = {
  skills: ["planning", "scheduling", "field", "volunteers", "finance", "events", "comms", "press", "digital", "policy", "data"],
  cost: 1,
  effect: 1.15,
  home: [401, 402, 403],
  voice: `${ME.name}, the candidate.`,
  salary: 0,
};

export const profileFor = (id: string, role: string): Profile =>
  PROFILES[id] ?? { skills: ROLE_SKILLS[role] ?? ["planning"], cost: 1, effect: 1, turf: TURF[role], voice: "Professional and direct.", salary: 600 };

// Hiring pool used when the live agents are unavailable. Live hiring generates candidates instead.
export type Candidate = { name: string; pitch: string; good: string; weak: string; salary: number; cost: number; effect: number; voice: string };

export const POOL: Record<string, Candidate[]> = {
  "Policy Director": [
    { name: "Helen Voss", pitch: "Ran policy for two citywide races. Writes plans that survive a budget hearing.", good: "Detailed, credible plans", weak: "Slow, expensive", salary: 1400, cost: 1, effect: 1.2, voice: "Precise, a little professorial." },
    { name: "Kai Lindqvist", pitch: "Think-tank wunderkind with sharp housing ideas and sharper elbows.", good: "Bold ideas", weak: "Abrasive with allies", salary: 900, cost: 1, effect: 1.05, voice: "Confident, fast, impatient." },
    { name: "Marisol Ortega", pitch: "Former tenant lawyer. Knows exactly who a policy hurts.", good: "Coalition-friendly policy", weak: "Hates compromise", salary: 1100, cost: 0.95, effect: 1.1, voice: "Warm but exacting." },
  ],
  "Data Director": [
    { name: "Arjun Mehta", pitch: "Built turnout models for a state party. Finds voters nobody else counts.", good: "Turnout models", weak: "Speaks in jargon", salary: 1200, cost: 1, effect: 1.2, voice: "Nerdy, precise, loves a chart." },
    { name: "Bea Kowalski", pitch: "Scrappy analyst who ran data for a council upset on a shoestring.", good: "Cheap and fast", weak: "Thin team", salary: 700, cost: 0.85, effect: 1, voice: "Plain-spoken and practical." },
    { name: "Theo Grant", pitch: "Ex-tech data scientist, new to politics, brilliant with targeting.", good: "Sharp targeting", weak: "Naive about politics", salary: 1000, cost: 1, effect: 1.1, voice: "Curious, analytical, a bit literal." },
  ],
  "Organizer, Bronx": [
    { name: "Dee Santana", pitch: "Grew up in Mott Haven, ran tenant drives across the South Bronx.", good: "Bronx networks", weak: "Distrusts the campaign brass", salary: 550, cost: 1, effect: 1.2, voice: "Direct, protective of her neighbourhood." },
    { name: "Jamal Wright", pitch: "Church and union volunteer with a deep phone list.", good: "Turnout from churches and unions", weak: "Not great with apps", salary: 500, cost: 1, effect: 1.05, voice: "Friendly, unhurried, persuasive." },
    { name: "Lena Park", pitch: "Organised students at Fordham and Lehman.", good: "Students, energy", weak: "Little experience with older voters", salary: 450, cost: 0.95, effect: 1, voice: "Upbeat, organised, young." },
  ],
};

export const genericPool = (role: string): Candidate[] => [
  { name: "Sam Rivera", pitch: `Experienced ${role.toLowerCase()} from a borough president's race.`, good: "Steady, reliable", weak: "Unremarkable", salary: 800, cost: 1, effect: 1, voice: "Calm and professional." },
  { name: "Noor Haddad", pitch: `Ambitious ${role.toLowerCase()} who wants to prove herself.`, good: "Hungry, creative", weak: "Inexperienced", salary: 550, cost: 1, effect: 1.05, voice: "Energetic and eager." },
  { name: "Grant Ellis", pitch: `Veteran ${role.toLowerCase()} who has seen five mayoral races.`, good: "Knows everyone", weak: "Expensive, set in his ways", salary: 1300, cost: 1.05, effect: 1.15, voice: "Gravelly, anecdotal, sure of himself." },
];
