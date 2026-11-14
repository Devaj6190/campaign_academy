import { DISTRICTS, districtBy } from "../geo";
import type { Faction } from "../data";
import { RIVALS } from "../engine/rivals";
import type { PollRecord } from "../engine/polls";
import type { ElectionResult } from "../engine/election";
import type { LedgerEntry } from "../store";
import { hash } from "../util";

// The Five Borough Ledger. Each edition covers what happened since the previous one. Stories are picked
// by newsworthiness and written here as plain templates from the facts; the AI newsroom may rewrite them,
// but only with numbers that appear in these facts (newsroom.ts checks).

export type Story = { kicker: string; headline: string; body: string; cd?: number };
export type Respond = { kind: "issue" | "attack"; cd?: number; faction?: string; rival?: "hale" | "brandt" };
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
  /** Every figure a writer may use. */
  numbers: string[];
  upTo: number;
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
  if (l.source === "candidate") return "Cole";
  if (l.source === "rival") return RIVALS[l.effect.by as "hale" | "brandt"]?.short ?? "A rival";
  return staff.find((p) => p.id === l.effect.by)?.name ?? "The Cole campaign";
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

export function buildEdition(w: World, kind: Kind = "daily"): Edition {
  const prev = w.editions[w.editions.length - 1];
  const since = w.ledger.filter((l) => !prev || l.id > prev.upTo);
  const cole = since.filter((l) => l.source === "staff" || l.source === "candidate" || l.source === "manifesto" || l.source === "tactic");
  const rival = since.filter((l) => l.source === "rival");
  const debate = since.find((l) => l.source === "debate");
  const backfire = since.find((l) => l.source === "tactic" && /attack/.test(l.effect.summary));
  const latest = w.polls[w.polls.length - 1];
  const previous = w.polls[w.polls.length - 2];
  const freshPoll = latest.day === w.day;
  const worst311 = [...DISTRICTS].filter((d) => !d.park && d.issues.length).sort((a, b) => b.issues[0][1] * (0.6 + hash(b.cd, w.day) * 0.8) - a.issues[0][1] * (0.6 + hash(a.cd, w.day) * 0.8))[0];
  const blitz = rival.find((l) => l.effect.district && (w.fieldRead[l.effect.district] ?? 0) >= 55);
  const biggest = [...cole].filter((l) => l.source !== "manifesto").sort((a, b) => b.effect.cost + b.effect.raised - (a.effect.cost + a.effect.raised))[0];
  const pollLine = (p: PollRecord) => `Hale ${p.hale}, Cole ${p.cole}, Brandt ${p.brandt}, undecided ${p.undecided} (${p.pollster}, ${fmt(p.n)} likely voters, margin of error ±${p.moe})`;

  // Front page, in order of news value.
  let lead: Edition["lead"];
  if (kind === "result" && w.election) {
    const r = w.election.result;
    lead = { kicker: "Election night", headline: r.won ? "Cole wins City Hall" : "Cole concedes", body: `With all 59 districts reporting: Cole ${r.pct.cole}%, Hale ${r.pct.hale}%, Brandt ${r.pct.brandt}%. Cole carried ${r.districtsWon.cole} districts, Hale ${r.districtsWon.hale}, Brandt ${r.districtsWon.brandt}.` };
  } else if (kind === "eve") {
    lead = { kicker: "Election day", headline: "New York votes today", body: `The final poll: ${pollLine(latest)}. The race is decided in the districts below.` };
  } else if (debate) {
    lead = { kicker: "Debate night", headline: clean(debate.effect.summary).replace(/\.$/, ""), body: `The candidates met on stage with ${w.manifesto.length} planks in Cole's platform. ${freshPoll ? `The latest poll: ${pollLine(latest)}.` : "The next poll will show whether it moved anyone."}` };
  } else if (freshPoll) {
    const change = previous ? latest.cole - previous.cole : 0;
    lead = { kicker: "New poll", headline: `Hale ${latest.hale}, Cole ${latest.cole}, Brandt ${latest.brandt}`, body: `${pollLine(latest)}.${previous ? ` In the day ${previous.day} poll Cole stood at ${previous.cole}; ${change === 0 ? "no change beyond the margin" : Math.abs(change) <= latest.moe ? "a shift within the margin of error" : change > 0 ? "a real gain" : "a real slide"}.` : ""}` };
  } else if (backfire) {
    lead = { kicker: "Campaign trail", headline: "Cole's contrast ad backfires", body: `${clean(backfire.effect.summary)} Critics called it the first negative ad of the race.` };
  } else if (blitz) {
    const r = RIVALS[blitz.effect.by as "hale" | "brandt"];
    lead = { kicker: "Campaign trail", headline: `${r.short} moves into ${short(blitz.effect.district)}`, body: `${clean(blitz.effect.summary)} ${short(blitz.effect.district)} had been one of Cole's stronger districts.`, cd: blitz.effect.district, respond: { kind: "attack", cd: blitz.effect.district, faction: blitz.effect.faction, rival: blitz.effect.by as "hale" | "brandt" } };
  } else if (biggest) {
    lead = { kicker: "Campaign trail", headline: clean(biggest.effect.summary).replace(/\.$/, ""), body: `${who(biggest, w.staff)} led the Cole campaign's biggest push since the last edition.`, cd: biggest.effect.district };
  } else {
    const [issue, count] = worst311.issues[0];
    lead = { kicker: "City", headline: `${cap(issue.toLowerCase())} complaints pile up in ${worst311.name}`, body: `Residents filed ${fmt(count)} reports in a month and say nobody at City Hall is listening. All three campaigns were asked what they would do.`, cd: worst311.cd, respond: { kind: "issue", cd: worst311.cd } };
  }
  // Every real city issue on the front page can be answered, even when something else leads.
  if (!lead.respond && kind === "daily" && !freshPoll && !debate) lead.respond = { kind: "issue", cd: worst311.cd };

  const campaign: Story = cole.length
    ? { kicker: "Your campaign", headline: clean(cole[cole.length - 1].effect.summary).replace(/\.$/, ""), body: cole.slice(-4).map((l) => `${who(l, w.staff)}: ${clean(l.effect.summary)}`).join(" ") }
    : { kicker: "Your campaign", headline: w.day === 1 ? "Cole takes over a campaign in motion" : "A quiet day for the Cole campaign", body: w.day === 1 ? `Thirty days out, the council member inherits a staff, ${w.manifesto.length} planks and a deficit in the polls.` : "No events, no ads, no doors. Rivals noticed." };
  const opposition: Story = rival.length
    ? { kicker: "The opposition", headline: clean(rival[0].effect.summary).replace(/\.$/, ""), body: rival.map((l) => clean(l.effect.summary)).join(" ") }
    : { kicker: "The opposition", headline: w.day === 1 ? "Hale and Brandt open their final month" : "A quiet night for the rivals", body: w.day === 1 ? `Hale runs on ${RIVALS.hale.runsOn.split(":")[0]}; Brandt on ${RIVALS.brandt.runsOn.split(":")[0]}. Both will answer what Cole does.` : "Their moves will show here the morning after they make them." };

  const coleCd = [...cole].reverse().find((l) => l.effect.district)?.effect.district;
  const rivalCd = [...rival].reverse().find((l) => l.effect.district)?.effect.district;
  const picks: [number, string][] = [];
  if (coleCd) picks.push([coleCd, "where Cole's campaign worked"]);
  if (rivalCd && rivalCd !== coleCd) picks.push([rivalCd, `where ${RIVALS[rival.find((l) => l.effect.district === rivalCd)!.effect.by as "hale" | "brandt"].short} campaigned`]);
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
    body: `New Yorkers keep telling the city about ${issue}. The candidates offer different answers. Cole's platform: ${w.manifesto.slice(0, 2).join(" ")} Hale runs on ${RIVALS.hale.runsOn}. Brandt runs on ${RIVALS.brandt.runsOn}. This page endorses no one; voters should judge each campaign by what it does in their neighborhood, not by what it promises.`,
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
    numbers: [],
    upTo: w.ledger.at(-1)?.id ?? 0,
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
  poll: { latest: e.polls.latest && { day: e.polls.latest.day, pollster: e.polls.latest.pollster, n: e.polls.latest.n, moe: e.polls.latest.moe, hale: e.polls.latest.hale, cole: e.polls.latest.cole, brandt: e.polls.latest.brandt, undecided: e.polls.latest.undecided }, previous: e.polls.previous && { day: e.polls.previous.day, cole: e.polls.previous.cole, hale: e.polls.previous.hale, brandt: e.polls.previous.brandt }, fresh: e.polls.fresh },
  since: e.polls.since.slice(-8),
  stories: { lead: e.lead, campaign: e.campaign, opposition: e.opposition, city: e.city, editorial: e.editorial, letters: e.letters },
  allowedNumbers: e.numbers,
});
