import { DISTRICTS, districtBy } from "../geo";
import type { MoneyEvent } from "../money/rules";
import type { Faction } from "../data";
import { RIVALS } from "../engine/rivals";
import type { PollRecord } from "../engine/polls";
import type { ElectionResult } from "../engine/election";
import type { LedgerEntry } from "../store";
import { hash } from "../util";
import { ACTIVE, activeRivals, dayLabel, ME, nameOf } from "../scenario";
import { CASE } from "../scenario/case";

// The Five Borough Ledger. Each edition covers what happened since the previous one. Stories are picked
// by newsworthiness and written here as plain templates from the facts; the AI newsroom may rewrite them,
// but only with numbers that appear in these facts (newsroom.ts checks).

export type Story = {
  kicker: string;
  headline: string;
  body: string;
  cd?: number;
  /** "real": from the 2013 record, cited, never rewritten by the AI newsroom. "sim": what the simulation produced. */
  tag?: "real" | "sim";
  sources?: { url: string; label: string }[];
};
export type Respond = { kind: "issue" | "attack"; cd?: number; faction?: string; rival?: string };
export type Kind = "daily" | "debate" | "eve" | "result";

export type Edition = {
  day: number;
  kind: Kind;
  lead: Story & { respond?: Respond };
  campaign: Story;
  opposition: Story;
  city: Story[];
  polls: { latest: PollRecord; previous?: PollRecord; since: string[]; fresh: boolean };
  editorial: Story;
  letters: Story[];
  /** The real coverage of the race in this edition's window (a real scenario only). */
  record: Story[];
  /** Every figure a writer may use. */
  numbers: string[];
  upTo: number;
  /** Money news already reported (an index into money.events). */
  moneyUpTo?: number;
  mode: "template" | "live";
  read: boolean;
  decision?: "respond" | "staff" | "pass";
};

type World = {
  day: number;
  ledger: LedgerEntry[];
  polls: PollRecord[];
  factions: Faction[];
  manifesto: string[];
  fieldRead: Record<number, number>;
  staff: { id: string; name?: string }[];
  editions: Edition[];
  election: { result: ElectionResult } | null;
  money?: { events: MoneyEvent[]; raisedTotal: number; spentTotal: number; matchPaid: number };
  cash?: number;
  rivals?: Record<string, { raised: number; spent: number; cash: number }>;
};

const fmt = (n: number) => Math.round(n).toLocaleString("en-US");
const short = (cd?: number) => districtBy(cd ?? null)?.name.split("-")[0] ?? "the city";
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const clean = (s: string) => s.replace(/ \(Not their strength.*$/, "");

/** Pull every number out of a piece of text, normalised (commas, trailing %, trailing .0). */
// "$12k", "$12,000" and "12000" are the same number to the checker.
export const numbersIn = (text: string) =>
  (text.match(/\d[\d,]*(\.\d+)?k?/gi) ?? []).map((x) => {
    const n = Number(x.replace(/,/g, "").replace(/k$/i, ""));
    return String(/k$/i.test(x) ? Math.round(n * 1000) : n);
  });

function who(l: LedgerEntry, staff: World["staff"]) {
  if (l.source === "candidate") return ME.short;
  if (l.source === "rival") return RIVALS[l.effect.by]?.short ?? "A rival";
  return staff.find((p) => p.id === l.effect.by)?.name ?? `The ${ME.short} campaign`;
}

function cityStory(cd: number, why: string): Story {
  const d = districtBy(cd)!;
  const demo = d.demo, vote = d.vote, issue = d.issues[0];
  const bits = [
    demo && `${fmt(demo.pop)} people live here; ${demo.renters}% of households rent and ${demo.otherLang}% speak a language other than English at home.`,
    issue && `Residents filed ${fmt(issue[1])} complaints about ${issue[0].toLowerCase()} in the last month, the most common report to 311.`,
    vote && `In 2025, ${fmt(vote.votes)} people voted here, a turnout of ${vote.turnout}%.`,
  ].filter(Boolean);
  return { kicker: d.boro, headline: `${d.name}: ${why}`, body: bits.join(" "), cd };
}

/** "Quinn 36, de Blasio 12, Thompson 11": everyone in the race, highest first. */
const pollNames = (p: PollRecord) => Object.entries(p.shares).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).map(([id, v]) => `${nameOf(id)} ${v}`).join(", ");

/** Case source ids as links. */
const cite = (ids: string[]) => [...new Set(ids)].map((id) => CASE.sources.find((x) => x.id === id)).filter(Boolean).map((x) => ({ url: x!.url, label: `${x!.publisher}${x!.date ? `, ${x!.date}` : ""}` }));
/** The case's notes speak to the student ("You raised"); a newspaper names the candidate. */
const thirdPerson = (t: string) => t.replace(/\bYou\b/g, ME.short).replace(/\byou\b/g, ME.short).replace(/\b[Yy]our\b/g, `${ME.short}'s`);
/** A headline from the first sentence of a real note, under about 12 words. */
const headlineOf = (text: string) => {
  const first = text.split(/(?<=\.)\s/)[0].replace(/\.$/, "");
  const words = first.split(" ");
  return words.length > 13 ? `${words.slice(0, 12).join(" ")}…` : first;
};
const dayOfDate = (iso: string) => {
  const a = Date.parse(CASE.briefingDate), b = Date.parse(CASE.electionDate);
  return Math.max(1, Math.min(30, Math.round(1 + (29 * (Date.parse(iso) - a)) / (b - a))));
};

export function buildEdition(w: World, kind: Kind = "daily"): Edition {
  const prev = w.editions[w.editions.length - 1];
  const since = w.ledger.filter((l) => !prev || l.id > prev.upTo);
  const cole = since.filter((l) => l.source === "staff" || l.source === "candidate" || l.source === "manifesto" || l.source === "tactic" || l.source === "moment");
  const rival = since.filter((l) => l.source === "rival");
  const debate = since.find((l) => l.source === "debate");
  const realEvent = [...since].reverse().find((l) => l.source === "event");
  const backfire = since.find((l) => l.source === "tactic" && /attack/.test(l.effect.summary));
  const latest = w.polls[w.polls.length - 1];
  const previous = w.polls[w.polls.length - 2];
  const freshPoll = latest.day === w.day;
  const worst311 = [...DISTRICTS].filter((d) => !d.park && d.issues.length).sort((a, b) => b.issues[0][1] * (0.6 + hash(b.cd, w.day) * 0.8) - a.issues[0][1] * (0.6 + hash(a.cd, w.day) * 0.8))[0];
  const blitz = rival.find((l) => l.effect.district && (w.fieldRead[l.effect.district] ?? 0) >= 55);
  const biggest = [...cole].filter((l) => l.source !== "manifesto").sort((a, b) => b.effect.cost + b.effect.raised - (a.effect.cost + a.effect.raised))[0];
  // Money news since the last edition: the serious kind leads ahead of a poll; the rest ahead of the trail.
  const moneyNews = (w.money?.events ?? []).slice(prev?.moneyUpTo ?? 0);
  const urgent = moneyNews.find((e) => e.kind === "fine" || e.kind === "quit" || e.kind === "missed" || e.kind === "broke");
  const plain = moneyNews.find((e) => e.kind === "joined" || e.kind === "declined" || e.kind === "payment" || e.kind === "qualified");
  const filings = w.money && w.rivals ? ` Latest filings: ${ME.short} has raised $${fmt(w.money.raisedTotal + w.money.matchPaid)} and spent $${fmt(w.money.spentTotal)}; ${activeRivals(w.day).map((id) => `${nameOf(id)} raised $${fmt(w.rivals![id].raised)} and spent $${fmt(w.rivals![id].spent)}`).join("; ")}.` : "";
  const MONEY_HEAD: Record<MoneyEvent["kind"], string> = { fine: `${ME.short} campaign fined for breaking the spending limit`, quit: `Staffer quits ${ME.short} campaign over missed pay`, missed: `${ME.short} campaign misses payroll`, broke: `${ME.short} campaign runs short of cash`, joined: `${ME.short} opts into public financing`, declined: `${ME.short} turns down public financing`, payment: `Public funds arrive for ${ME.short}`, qualified: `${ME.short} qualifies for matching funds` };
  const moneyLead = (e: MoneyEvent): Edition["lead"] => ({ kicker: "Campaign money", headline: MONEY_HEAD[e.kind], body: `${e.text}${filings}` });
  const pollLine = (p: PollRecord) => `${pollNames(p)}, undecided ${p.undecided} (${p.pollster}, ${fmt(p.n)} likely voters, margin of error ±${p.moe})`;

  // Front page, in order of news value.
  let lead: Edition["lead"];
  if (kind === "result" && w.election) {
    const r = w.election.result;
    lead = { kicker: "Election night", headline: r.won ? `${ME.short} wins ${r.runoff ? "the runoff" : "City Hall"}` : `${ME.short} concedes`, body: `With all 59 districts reporting: ${r.ranked.map((id) => `${nameOf(id)} ${r.pct[id]}%`).join(", ")}. ${r.runoff ? `Nobody reached the threshold, so ${nameOf(r.runoff.a)} and ${nameOf(r.runoff.b)} met in a runoff: ${nameOf(r.runoff.a)} ${r.runoff.pct[r.runoff.a]}%, ${nameOf(r.runoff.b)} ${r.runoff.pct[r.runoff.b]}%.` : `${ME.short} carried ${r.districtsWon[ME.id] ?? 0} districts.`}` };
  } else if (kind === "eve") {
    lead = { kicker: "Election day", headline: "New York votes today", body: `The final poll: ${pollLine(latest)}. The race is decided in the districts below.` };
  } else if (realEvent) {
    lead = { kicker: `The real race · ${dayLabel(w.day) || `day ${w.day}`}`, headline: headlineOf(thirdPerson(realEvent.effect.summary)), body: thirdPerson(clean(realEvent.effect.summary)), tag: "real", sources: cite(realEvent.effect.sources ?? []) };
  } else if (debate) {
    lead = { kicker: "Debate night", headline: clean(debate.effect.summary).replace(/\.$/, ""), body: `The candidates met on stage with ${w.manifesto.length} planks in ${ME.short}'s platform. ${freshPoll ? `The latest poll: ${pollLine(latest)}.` : "The next poll will show whether it moved anyone."}` };
  } else if (urgent) {
    lead = moneyLead(urgent);
  } else if (freshPoll) {
    const mine = (p: PollRecord) => p.shares[ME.id] ?? 0;
    const change = previous ? mine(latest) - mine(previous) : 0;
    lead = { kicker: "New poll", headline: pollNames(latest), body: `${pollLine(latest)}.${previous ? ` In the day ${previous.day} poll ${ME.short} stood at ${mine(previous)}; ${change === 0 ? "no change beyond the margin" : Math.abs(change) <= latest.moe ? "a shift within the margin of error" : change > 0 ? "a real gain" : "a real slide"}.` : ""}` };
  } else if (plain) {
    lead = moneyLead(plain);
  } else if (backfire) {
    lead = { kicker: "Campaign trail", headline: `${ME.short}'s contrast ad backfires`, body: `${clean(backfire.effect.summary)} Critics called it the first negative ad of the race.` };
  } else if (blitz) {
    const r = RIVALS[blitz.effect.by];
    lead = { kicker: "Campaign trail", headline: `${r.short} moves into ${short(blitz.effect.district)}`, body: `${clean(blitz.effect.summary)} ${short(blitz.effect.district)} had been one of ${ME.short}'s stronger districts.`, cd: blitz.effect.district, respond: { kind: "attack", cd: blitz.effect.district, faction: blitz.effect.faction, rival: blitz.effect.by } };
  } else if (biggest) {
    lead = { kicker: "Campaign trail", headline: clean(biggest.effect.summary).replace(/\.$/, ""), body: `${who(biggest, w.staff)} led the ${ME.short} campaign's biggest push since the last edition.`, cd: biggest.effect.district };
  } else {
    const [issue, count] = worst311.issues[0];
    lead = { kicker: "City", headline: `${cap(issue.toLowerCase())} complaints pile up in ${worst311.name}`, body: `Residents filed ${fmt(count)} reports in a month and say nobody at City Hall is listening. All three campaigns were asked what they would do.`, cd: worst311.cd, respond: { kind: "issue", cd: worst311.cd } };
  }
  // What the real 2013 press reported in this edition's window (paraphrased in the case file, cited).
  const fromDay = prev ? prev.day : 0;
  const record: Story[] = ACTIVE.kind === "real" ? CASE.press.filter((p) => { const d = dayOfDate(p.date); return d > fromDay && d <= w.day; }).map((p) => ({ kicker: `${p.outlet} · ${p.date}`, headline: headlineOf(thirdPerson(p.summary)), body: thirdPerson(p.summary), tag: "real" as const, sources: cite([p.source]) })) : [];

  // Every real city issue on the front page can be answered, even when something else leads.
  if (!lead.respond && kind === "daily" && !freshPoll && !debate) lead.respond = { kind: "issue", cd: worst311.cd };

  const campaign: Story = cole.length
    ? { kicker: "Your campaign", headline: clean(cole[cole.length - 1].effect.summary).replace(/\.$/, ""), body: cole.slice(-4).map((l) => `${who(l, w.staff)}: ${clean(l.effect.summary)}`).join(" ") }
    : { kicker: "Your campaign", headline: w.day === 1 ? `${ME.short} opens the campaign` : `A quiet day for the ${ME.short} campaign`, body: w.day === 1 ? `The campaign starts with a staff, ${w.manifesto.length} planks and ground to make up in the polls.` : "No events, no ads, no doors." };
  const opposition: Story = rival.length
    ? { kicker: "The opposition", headline: clean(rival[0].effect.summary).replace(/\.$/, ""), body: rival.map((l) => clean(l.effect.summary)).join(" ") }
    : { kicker: "The opposition", headline: w.day === 1 ? "The field takes shape" : "A quiet night for the rivals", body: w.day === 1 ? `${activeRivals(1).map((id) => `${nameOf(id)} runs on ${RIVALS[id].runsOn.split(":")[0]}`).join("; ")}.` : "Their moves will show here the morning after they make them." };

  const coleCd = [...cole].reverse().find((l) => l.effect.district)?.effect.district;
  const rivalCd = [...rival].reverse().find((l) => l.effect.district)?.effect.district;
  const picks: [number, string][] = [];
  if (coleCd) picks.push([coleCd, `where ${ME.short}'s campaign worked`]);
  if (rivalCd && rivalCd !== coleCd) picks.push([rivalCd, `where ${RIVALS[rival.find((l) => l.effect.district === rivalCd)!.effect.by].short} campaigned`]);
  for (const d of [worst311, ...DISTRICTS.filter((x) => !x.park && x.vote).sort((a, b) => hash(a.cd, w.day + 3) - hash(b.cd, w.day + 3))]) {
    if (picks.length >= 3) break;
    if (!picks.some(([cd]) => cd === d.cd)) picks.push([d.cd, d.cd === worst311.cd ? "the city's loudest complaint" : "a neighborhood to know"]);
  }
  const city = picks.map(([cd, why]) => cityStory(cd, why));

  const sinceLines = w.ledger.filter((l) => previous && l.id > previous.upTo && l.id <= latest.upTo).map((l) => { const s = clean(l.effect.summary), w0 = who(l, w.staff); return s.startsWith(`${w0}:`) || s.startsWith(w0) ? s : `${w0}: ${s}`; });

  // Opinion: the day's issue, every candidate's stated position, no endorsement.
  const issue = lead.respond?.kind === "issue" && lead.cd ? districtBy(lead.cd)!.issues[0]?.[0].toLowerCase() : worst311.issues[0][0].toLowerCase();
  const editorial: Story = {
    kicker: "Editorial",
    headline: `On ${issue}, three answers`,
    body: `New Yorkers keep telling the city about ${issue}. The candidates offer different answers. ${ME.short}'s platform: ${w.manifesto.slice(0, 2).join(" ")} ${activeRivals(w.day).map((id) => `${nameOf(id)} runs on ${RIVALS[id].runsOn}.`).join(" ")} This page endorses no one; voters should judge each campaign by what it does in their neighborhood, not by what it promises.`,
  };
  const moved = previous ? w.factions.map((f) => ({ f, d: (latest.groups[f.id]?.feel ?? 50) - (previous.groups[f.id]?.feel ?? 50) })).sort((a, b) => b.d - a.d) : w.factions.map((f) => ({ f, d: f.feel - 50 })).sort((a, b) => b.d - a.d);
  const letter = (f: Faction, pleased: boolean): Story => ({
    kicker: "Letters",
    headline: pleased ? `A voice from ${f.name.toLowerCase()}: "Someone is listening"` : `A voice from ${f.name.toLowerCase()}: "We are being taken for granted"`,
    body: pleased ? `What we want is simple: ${f.values.join(", ").toLowerCase()}. For the first time this race, it feels like that is on the table.` : `We have said it before: ${f.dislikes.join(", ").toLowerCase()}. Whoever wants our vote should show us, not tell us.`,
  });
  const letters = [letter(moved[0].f, true), letter(moved[moved.length - 1].f, false)];

  const ed: Edition = {
    day: w.day,
    kind,
    lead,
    campaign,
    opposition,
    city,
    polls: { latest, previous, since: sinceLines, fresh: freshPoll },
    editorial,
    letters,
    record,
    numbers: [],
    upTo: w.ledger.at(-1)?.id ?? 0,
    moneyUpTo: w.money?.events.length ?? 0,
    mode: "template",
    read: false,
  };
  // The fact sheet's numbers: everything the template says, plus the day and the poll figures.
  const text = [lead, campaign, opposition, ...city, editorial, ...letters].map((s) => `${s.headline} ${s.body}`).join(" ") + ` ${pollLine(latest)} ${previous ? pollLine(previous) : ""} ${w.day} ${30 - w.day} 30 59 2025`;
  // Earlier days of the campaign may be named too ("since day 4"); nothing else beyond the record.
  ed.numbers = [...new Set([...numbersIn(text), ...Array.from({ length: ed.day }, (_, i) => String(i + 1))])];
  return ed;
}

/** The facts the newsroom writes from (kept small: it is sent with every edition). */
export const factsOf = (e: Edition) => ({
  day: e.day,
  daysLeft: 30 - e.day,
  kind: e.kind,
  poll: { latest: e.polls.latest && { day: e.polls.latest.day, pollster: e.polls.latest.pollster, n: e.polls.latest.n, moe: e.polls.latest.moe, ...e.polls.latest.shares, undecided: e.polls.latest.undecided }, previous: e.polls.previous && { day: e.polls.previous.day, ...e.polls.previous.shares }, fresh: e.polls.fresh },
  since: e.polls.since.slice(-8),
  stories: { lead: e.lead, campaign: e.campaign, opposition: e.opposition, city: e.city, editorial: e.editorial, letters: e.letters },
  allowedNumbers: e.numbers,
});
