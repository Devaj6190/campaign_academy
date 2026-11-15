import { FACTIONS_2013, factionNow, type Faction } from "../cases/mayor2013-factions";
import { LEANINGS_2013 } from "../cases/mayor2013-leanings";
import type { Work } from "../cases/store";
import type { Case, World } from "../cases/types";
import type { Stance } from "./stances";

// The Five Borough Ledger on the 2013 case: one page per morning, built only from the case and its work layer.
//
// Two layers, kept apart as everywhere else in the case:
// - The record: press items and the decision's `since` notes, each cited and paraphrased. Ranked by how much they
//   moved this race (`impact`), wherever they happened. The AI newsroom never rewrites these.
// - The simulation: what the student's campaign and the rivals did, and two letters from voter groups. Written here
//   as templates; the newsroom (newsroom.ts) may rewrite them, using only numbers that appear in their facts.

/** The most news items an edition carries, lead included, and the most of those that can be our own inference. */
export const CAP = 5;
export const MAX_ESTIMATES = 1;
/** Days between polls in the paper. An edition after a longer gap carries one too, so a long skip always ends on a poll. */
export const POLL_EVERY = 7;

export type NewsItem = { key: string; date: string; outlet?: string; text: string; sources: string[]; impact: number; outside?: boolean; estimate?: boolean };
export type Story = { headline: string; body: string };
export type Decision = "respond" | "staff" | "pass";

export type Edition = {
  id: number;
  date: string;
  /** The case step the campaign had reached; a later edition replaces nothing, the archive keeps them all. */
  step: number;
  daysLeft: number;
  lead: NewsItem | null;
  news: NewsItem[];
  campaign: Story;
  rivals: Story;
  voices: (Story & { group: string })[];
  /** Whether this morning's paper carries a poll. Most mornings it does not, and the page leaves the figures below out. */
  polled: boolean;
  poll:{ id: string; name: string; v: number; you: boolean }[];
  strong: { id: string; name: string; v: number }[];
  weak: { id: string; name: string; v: number }[];
  /** Every number the simulated stories may use. */
  numbers: string[];
  mode: "template" | "live";
  /** The model that wrote the simulated stories, when one did (#52). */
  by?: "gemini" | "claude";
  decision?: Decision;
  /** Ways to answer the lead, drafted when the student first asks (stances.ts). */
  stances?: Stance[];
  /** What happened when the campaign answered the front page. */
  answer?: string;
};

const DEFAULT_IMPACT = 3;
/** A decision's `since` notes carry no rating of their own and often recap press already ranked, so they sit just below an unrated press item. */
const SINCE_IMPACT = 2.5;
const DAY = 86_400_000;
/** A decision's notes cover the stretch that ends the day before it. */
const dayBefore = (iso: string) => new Date(Date.parse(iso) - DAY).toISOString().slice(0, 10);
const days = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / DAY);

/** Pull every number out of a piece of text, normalised ("$12k", "$12,000" and "12000" are the same number). */
export const numbersIn = (text: string) =>
  (text.match(/\d[\d,]*(\.\d+)?k?/gi) ?? []).map((x) => {
    const n = Number(x.replace(/,/g, "").replace(/k$/i, ""));
    return String(/k$/i.test(x) ? Math.round(n * 1000) : n);
  });

/**
 * What the paper may report on `today`: press dated before today and the notes of the decision just reached. Ranked by
 * impact, with a small lift for the last fortnight so old news gives way. At most CAP items, at most MAX_ESTIMATES of
 * them our own inference. The lead is the best item that is not from outside the city.
 */
export function pickNews(c: Case, today: string, step: number): { lead: NewsItem | null; news: NewsItem[] } {
  const press: NewsItem[] = c.press
    .filter((p) => p.date < today)
    .map((p) => ({ key: `p:${p.date}:${p.source}`, date: p.date, outlet: p.outlet, text: p.summary, sources: [p.source], impact: p.impact ?? DEFAULT_IMPACT, outside: p.outside, estimate: p.estimate }));
  // A decision's notes repeat a press item when they cite the same source; the press item (with its outlet) stays.
  const cited = new Set(press.flatMap((p) => p.sources));
  const d = step >= 1 ? c.decisions[step - 1] : undefined;
  const since: NewsItem[] = (d?.since?.notes ?? [])
    .filter((n) => !n.sources.some((s) => cited.has(s)))
    .map((n, i) => ({ key: `s:${d!.id}:${i}`, date: dayBefore(d!.date), text: n.text, sources: n.sources, impact: SINCE_IMPACT, estimate: n.estimate }));
  const score = (x: NewsItem) => x.impact + (days(x.date, today) <= 14 ? 1.5 : 0) - days(x.date, today) / 120;
  const ranked = [...press, ...since].sort((a, b) => score(b) - score(a) || b.date.localeCompare(a.date));

  const lead = ranked.find((x) => !x.outside && !x.estimate) ?? null;
  const news: NewsItem[] = [];
  let estimates = 0;
  for (const x of ranked) {
    if (news.length >= CAP - (lead ? 1 : 0)) break;
    if (x === lead) continue;
    if (x.estimate && estimates >= MAX_ESTIMATES) continue;
    if (x.estimate) estimates++;
    news.push(x);
  }
  return { lead, news };
}

const sentence = (s: string) => {
  const t = s.trim().replace(/\s+/g, " ");
  return /[.!?]$/.test(t) ? t : `${t}.`;
};
/**
 * A headline from a note: its first sentence, without a quoted aside, cut at a colon (a one-word label before it is
 * dropped; otherwise the clause after it is). "Bill de Blasio answered the morning paper's lead ("..."): The campaign
 * ties" becomes "Bill de Blasio answered the morning paper's lead".
 */
export const headlineOf = (s: string) => {
  const first = sentence(s).replace(/\s*\("[^"]*"\)/g, "").split(/(?<=\.) /)[0].replace(/\.$/, "");
  const i = first.indexOf(": ");
  if (i < 0) return first;
  return /\s/.test(first.slice(0, i)) ? first.slice(0, i) : first.slice(i + 2);
};
/** The simulation's tallies ("Support +3.5.", "Women +0.6.") are game readouts, not newspaper copy. */
export const prose = (note: string) => sentence(note).split(/(?<=[.!?]) /).filter((x) => !/[+\u2212]\d/.test(x)).join(" ");
/** A note that opens on a bare verb ("Knocked 1,448 doors") gets its subject, as a reporter would write it. */
const withSubject = (note: string, subject: string) =>
  /^[A-Z][a-z]+ed\b|^(Ran|Held|Sent|Spent|Won|Took|Put|Made|Met|Gave|Went|Bought|Hit|Cut|Set)\b/.test(note) ? `${subject} ${lowerFirst(note)}` : note;
const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
/** "Bill de Blasio" → "de Blasio": everything after the first name, so particles stay. */
export const surnameOf = (name: string) => name.split(" ").slice(1).join(" ") || name;

function letter(f: Faction, pleased: boolean): Story & { group: string } {
  const l = LEANINGS_2013[f.id];
  const want = l?.values.length ? l.values.map(lowerFirst).join(", ") : null;
  const not = l?.dislikes.length ? l.dislikes.map(lowerFirst).join(", ") : null;
  // Boroughs, races and religions keep their capitals ("Queens", "Black voters"); "Liberals" does not.
  const who = ["Borough", "Race", "Religion"].includes(f.kind) ? f.name : f.name.toLowerCase();
  // Written as letters to the editor: measured, first person, no slogans.
  return pleased
    ? { group: f.name, headline: `From ${who}: a campaign begins to listen`, body: want ? `To the editor: What we ask for is plain: ${want}. This year, for the first time, one campaign has begun to speak to those concerns.` : "To the editor: We have not been courted like this before. Whether it lasts past the primary remains to be seen." }
    : { group: f.name, headline: `From ${who}: still waiting to be asked`, body: not ? `To the editor: We have said it before: no ${not}. Whoever wants our votes will have to show us, not tell us.` : "To the editor: No one running has come to our neighborhood to ask what we need. Voters here will remember that in September." };
}

type Inputs = { c: Case; w: World; today: string; step: number; work: Work[]; since: string | null; groupWork: Record<string, number>; id: number; lastPoll: string | null };

/** Build the morning's edition. Pure: the same inputs give the same paper. `since` is the previous edition's date, `lastPoll` the date of the last edition that carried a poll. */
export function buildEdition({ c, w, today, step, work, since, groupWork, id, lastPoll }: Inputs): Edition {
  const { lead, news } = pickNews(c, today, step);
  const polled = !lastPoll || days(lastPoll, today) >= POLL_EVERY;
  const fresh = work.filter((x) => (since ? x.date >= since : true) && x.date <= today);
  const isRival = (by: string) => by !== c.follow && c.candidates.some((r) => r.id === by);
  const name = (id: string) => c.candidates.find((x) => x.id === id)?.name ?? id;
  const you = name(c.follow), surname = surnameOf(you);

  const mine = fresh.filter((x) => !isRival(x.by) && x.note).slice(-4);
  const spent = mine.reduce((s, x) => s + x.cost, 0), raised = mine.reduce((s, x) => s + x.raised, 0);
  const told = mine.map((x) => withSubject(prose(cap(x.note!)), `The ${surname} campaign`)).filter(Boolean);
  const campaign: Story = told.length
    ? { headline: headlineOf(told.at(-1)!), body: `${told.join(" ")}${spent || raised ? ` The campaign spent $${spent.toLocaleString("en-US")} and raised $${raised.toLocaleString("en-US")} on it.` : ""}` }
    : { headline: step === 0 ? `The ${surname} campaign opens` : `A quiet stretch for the ${surname} campaign`, body: step === 0 ? `${you} starts ${days(today, c.electionDate)} days out, behind in every public poll.` : "No events, advertising or canvassing since the last edition. The rival campaigns will have noticed." };

  // Rival notes arrive as "John Liu: digital ads aimed at Moderates." One sentence per rival, in the paper's voice.
  const theirs = fresh.filter((x) => isRival(x.by) && x.note).slice(-4);
  const byRival = new Map<string, string[]>();
  for (const x of theirs) {
    const m = /^(.+?): (.+?)\.?$/.exec(x.note!.trim());
    const who = m ? m[1] : name(x.by), what = m ? m[2] : prose(x.note!).replace(/\.$/, "");
    byRival.set(who, [...(byRival.get(who) ?? []), lowerFirst(what)]);
  }
  const last = [...byRival].at(-1);
  const rivals: Story = last
    ? { headline: `${cap(surnameOf(last[0]))} campaign turns to ${last[1].at(-1)}`, body: [...byRival].map(([who, did]) => `${who} spent the stretch on ${did.join(" and ")}.`).join(" ") }
    : { headline: "No new moves from the rival campaigns", body: "The other campaigns made no public moves since the last edition. Their plans appear here the morning after they act." };

  const yours = w.poll[c.follow] ?? 0, yoursStart = c.start.poll[c.follow] ?? 0;
  const standing = FACTIONS_2013.map((f) => ({ f, v: factionNow(f, w.groups, yours, yoursStart, groupWork) })).sort((a, b) => b.v - a.v);
  const moved = FACTIONS_2013.map((f) => ({ f, d: factionNow(f, w.groups, yours, yoursStart, groupWork) - f.feb })).sort((a, b) => b.d - a.d);
  const voices = [letter(moved[0].f, true), letter(moved.at(-1)!.f, false)];
  const poll = c.candidates.map((x) => ({ id: x.id, name: x.id === c.follow ? "You" : x.name, v: Math.round(w.poll[x.id] ?? 0), you: x.id === c.follow })).filter((x) => x.v > 0).sort((a, b) => b.v - a.v).slice(0, 5);

  const text = [campaign, rivals, ...voices].map((s) => `${s.headline} ${s.body}`).join(" ");
  return {
    id,
    date: today,
    step,
    daysLeft: Math.max(0, days(today, c.electionDate)),
    lead,
    news,
    campaign,
    rivals,
    voices,
    polled,
    poll,
    strong: standing.slice(0, 3).map((x) => ({ id: x.f.id, name: x.f.name, v: Math.round(x.v) })),
    weak: standing.slice(-3).reverse().map((x) => ({ id: x.f.id, name: x.f.name, v: Math.round(x.v) })),
    // Without a poll this morning the newsroom gets no poll figures to write from.
    numbers: [...new Set([...numbersIn(text), ...(polled ? poll.map((x) => String(x.v)) : []), "2013"])],
    mode: "template",
  };
}

/** The facts the newsroom may write from: only the simulated stories, never the cited record. Kept small. */
export const factsOf = (e: Edition, c: Case) => ({
  date: e.date,
  daysLeft: e.daysLeft,
  campaignOf: c.candidates.find((x) => x.id === c.follow)?.name,
  rivals: c.candidates.filter((x) => x.id !== c.follow).map((x) => x.name),
  poll: e.polled ? e.poll.map((x) => `${x.name} ${x.v}`) : [],
  stories: { campaign: e.campaign, rivals: e.rivals, voices: e.voices.map(({ headline, body }) => ({ headline, body })) },
  voiceGroups: e.voices.map((v) => v.group),
  allowedNumbers: e.numbers,
});
