// The end-of-campaign debrief (lib/debrief): what the browser sends after election day, and what the agent returns.
// Shared by the browser (record.ts), the route and the agent, so it imports nothing.

/** One post's whole campaign, oldest first: orders, what they said and did, reports, coaching, options picked. */
export type StaffLog = { post: string; role: string; name?: string; lines: string[] };

/** The student's campaign as it stood on election day. All of it is simulated; the record comes from the case file on the server. */
export type DebriefRequest = {
  caseId: string;
  final: { poll: Record<string, number>; budgetLeft: number };
  picks: { decision: string; option: string }[];
  memos: { decision: string; by: string; option: string; headline?: string; text: string }[];
  /** Every piece of work on the case's work layer: staff, the candidate, the weekly plan, planks and the rivals' moves. */
  work: { date: string; by: string; label: string; note?: string; cost: number; raised: number }[];
  staff: StaffLog[];
  planks: { date: string; text: string; tradeoff?: string }[];
  /** Each rival campaign's own memo lines, by candidate id. */
  rivals: Record<string, string[]>;
};

export type DebriefDecision = { decision: string; same: boolean; analysis: string; lesson: string; sources: string[] };

export type Debrief = {
  headline: string;
  summary: string;
  decisions: DebriefDecision[];
  staff: string;
  rivals: string;
  lessons: string[];
};

/** `off`: no API key on this server; `error`: the agent did not finish. The screen keeps the plain debrief either way. */
export type DebriefResponse = { mode: "live"; debrief: Debrief } | { mode: "off" } | { mode: "error" };
