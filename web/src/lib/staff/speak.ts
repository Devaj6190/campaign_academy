"use client";

import { finished, waiting } from "../cases/clock";
import { FACTIONS_2013, factionNow } from "../cases/mayor2013-factions";
import { factionWork, shortMoney, supportIn, useCase, worldNow } from "../cases/store";
import { useGame } from "../store";
import { profileFor } from "./roster";
import { comeBack, dueFollowUps, feed } from "./run";
import { pushChat, useStaff } from "./store";
import { BOROS, PLACES, short, shortPlace } from "./world";

// Staff speak up unprompted when something in the campaign deserves it. Every worry is read from the live case:
// the money left under the cap, the voter groups and districts where the campaign trails, what the rivals just did,
// empty posts, idle staff, morale. The clock calls speakUp() as the days pass; it lets one remark through every GAP
// days at most, and the same worry returns only after REPEAT days. With an API key the post says it in its own voice.

const GAP = 3;
const REPEAT = 14;

/** `carryOut`: the decision just made, which the suggested order must carry out (chatter.ts SpeakRequest). */
type Trigger = { key: string; who: string; situation: string; text: string; suggest: string; moved?: boolean; carryOut?: string };

// A restarted case is a new campaign: who spoke when, and what they last saw, start over. Without this, remarks stay
// silent until the new campaign passes the old one's last remark day.
useCase.subscribe((s, p) => {
  if (s.at < p.at || s.date < p.date) {
    seen = null;
    if (Object.keys(useStaff.getState().spoken).length) useStaff.setState({ spoken: {} });
  }
});

/** Where the numbers stood the last time the staff spoke up about them. */
let seen: { poll: number; groups: Record<string, number> } | null = null;

const dayNow = () => { const s = useCase.getState(), c = worldNow().c; return Math.round((Date.parse(s.date) - Date.parse(c.briefingDate)) / 86_400_000) + 1; };

function triggers(day: number): Trigger[] {
  const g = useGame.getState();
  const s = useStaff.getState();
  const k = useCase.getState();
  const { c, w } = worldNow();
  const has = (id: string) => g.staff.some((p) => p.id === id && p.name);
  const vacant = (id: string) => g.staff.find((p) => p.id === id && !p.name);
  const mine = w.poll[c.follow] ?? 0;
  const pct = (n: number) => `${Math.round(n)}%`;
  const out: Trigger[] = [];

  // The rivals just moved against the campaign.
  const rivals = k.work.filter((x) => x.by !== c.follow && c.candidates.some((r) => r.id === x.by) && Date.parse(k.date) - Date.parse(x.date) <= 10 * 86_400_000);
  if (rivals.length && has("com")) {
    const last = rivals[rivals.length - 1].note ?? "";
    out.push({ key: `rivals-${k.at}`, who: "com", situation: `Rival campaigns have made ${rivals.length} moves in the last ten days. The latest: ${last}`, text: `The other campaigns have been busy: ${last} We should not let that sit.`, suggest: "Answer the rivals' latest moves with a press pitch today" });
  }

  // Money: the closing weeks need a reserve.
  const close = -(c.close.shift.budget ?? 0);
  if (close > 0 && w.budget < close && has("fin")) out.push({ key: "money", who: "fin", situation: `The campaign has ${shortMoney(w.budget)} left to spend under the cap. A full push in the closing weeks costs about ${shortMoney(close)}.`, text: `We have ${shortMoney(w.budget)} left under the cap, and the closing weeks need about ${shortMoney(close)}. Everything we fund now comes out of the finish.`, suggest: "Raise money this week with call time and a donor dinner" });

  // The large voter group where the campaign trails its own citywide figure by the most.
  const boost = factionWork();
  const weak = FACTIONS_2013.filter((f) => f.share >= 20).map((f) => ({ f, v: factionNow(f, w.groups, mine, c.start.poll[c.follow] ?? 0, boost) })).sort((a, b) => a.v - b.v)[0];
  if (weak && mine - weak.v >= 2 && has("com")) out.push({ key: `group-${weak.f.id}`, who: "com", situation: `Support among ${weak.f.name} is ${pct(weak.v)}, against ${pct(mine)} citywide. They are ${weak.f.share}% of likely voters.`, text: `We are at ${pct(weak.v)} with ${weak.f.name}, against ${pct(mine)} citywide. They are ${weak.f.share}% of the electorate.`, suggest: `Pitch reporters a story for ${weak.f.name} this week` });

  // The weakest district on each organizer's turf.
  for (const [id, boro] of [["oq", 4], ["ob", 3]] as const) {
    if (!has(id)) continue;
    const low = PLACES.filter((p) => Math.floor(p.cd / 100) === boro).map((p) => ({ p, v: supportIn(p.cd) ?? mine })).sort((a, b) => a.v - b.v)[0];
    if (low && mine - low.v >= 3) out.push({ key: `district-${low.p.cd}`, who: id, situation: `${low.p.name} is the campaign's weakest district in ${BOROS[boro]}: ${pct(low.v)} support, against ${pct(mine)} citywide.`, text: `${shortPlace(low.p.cd)} is our weakest spot in ${BOROS[boro]}: ${pct(low.v)}, against ${pct(mine)} citywide.`, suggest: `Canvass ${shortPlace(low.p.cd)} this week` });
  }

  // Empty posts.
  if (vacant("ox") && has("fd")) out.push({ key: "vacant-ox", who: "fd", situation: "The Organizer, Bronx post is still empty, so nobody is running field work in the Bronx.", text: "Nobody is organising the Bronx for us. That post is still empty.", suggest: "Train volunteers in the Bronx this weekend" });
  if (vacant("pol") && has("cm")) out.push({ key: "vacant-pol", who: "cm", situation: "The Policy Director post is still empty, so platform planks are drafted by whoever is free.", text: "The Policy Director post is still empty. Whoever is free is drafting our planks, and it shows.", suggest: "" });

  // Nobody has been given work since the last decision.
  const since = c.decisions[k.at - 1]?.date ?? c.briefingDate;
  const quiet = !k.work.some((x) => x.date >= since && g.staff.some((p) => p.id === x.by));
  if (k.at >= 1 && quiet && has("cm") && Date.parse(k.date) - Date.parse(since) >= 10 * 86_400_000) out.push({ key: `idle-${k.at}`, who: "cm", situation: "No one on the staff has been given a job since the last decision.", text: "The staff have had no orders since your last decision. Tell a director what you want done.", suggest: "Sit down with union leaders this week and tell me where we stand" });

  // The numbers moved: the campaign's standing, or one of the voter groups the case tracks.
  const base = seen ?? { poll: mine, groups: { ...w.groups } };
  const dPoll = mine - base.poll;
  const groupMove = Object.entries(w.groups).map(([id, v]) => ({ id, d: v - (base.groups[id] ?? v) })).sort((a, b) => Math.abs(b.d) - Math.abs(a.d))[0];
  const groupName = (id: string) => c.groups.find((g) => g.id === id)?.name ?? id;
  if (Math.abs(dPoll) >= 1.5 && has(dPoll < 0 ? "com" : "cm"))
    out.push({ key: `poll-${Math.round(mine)}`, who: dPoll < 0 ? "com" : "cm", situation: `The campaign's citywide standing has moved from ${pct(base.poll)} to ${pct(mine)} since the staff last looked.`, text: dPoll < 0 ? `We have slipped from ${pct(base.poll)} to ${pct(mine)}. Something out there is working against us.` : `We are up from ${pct(base.poll)} to ${pct(mine)}. Now is the time to press, not coast.`, suggest: dPoll < 0 ? "Answer what is pulling us down with a press push this week" : "Double down where we are gaining this week", moved: true });
  else if (groupMove && Math.abs(groupMove.d) >= 3 && has("fd"))
    out.push({ key: `grp-${groupMove.id}-${Math.round(w.groups[groupMove.id])}`, who: "fd", situation: `Support among ${groupName(groupMove.id)} has moved ${groupMove.d > 0 ? "up" : "down"} by ${Math.abs(Math.round(groupMove.d))} points, to ${pct(w.groups[groupMove.id])}.`, text: `${groupName(groupMove.id)} moved ${groupMove.d > 0 ? "our way" : "away from us"}: ${pct(w.groups[groupMove.id])} now.`, suggest: `Canvass ${groupName(groupMove.id)} where they live this week`, moved: true });

  // Morale.
  const low = Object.entries(s.morale).filter(([id]) => has(id)).sort((a, b) => a[1] - b[1])[0];
  const who = low && g.staff.find((p) => p.id === low[0]);
  if (low && who && low[1] < 40 && has("cm")) out.push({ key: `morale-${low[0]}`, who: "cm", situation: `Morale in the ${who.role} post is low (${Math.round(low[1])} of 100). Clearer orders to the right person would help.`, text: `Morale is low with ${short(who)}. Clearer orders, to the right person, would help.`, suggest: "" });

  return out.filter((t) => has(t.who) && !s.active[t.who] && (s.spoken[t.key] === undefined || day - s.spoken[t.key] >= REPEAT));
}

export async function speakUp() {
  if (waiting() || finished()) return;
  const day = dayNow();
  if (seen === null) { const { c, w } = worldNow(); seen = { poll: w.poll[c.follow] ?? 0, groups: { ...w.groups } }; }
  const last = useStaff.getState().spoken._last;
  // A director coming back about its own work goes first: it is the most specific thing anyone has to say, so it
  // does not wait out the gap between remarks. It only waits for a day when nobody else has spoken.
  const fu = dueFollowUps()[0];
  if (fu && (last === undefined || day > last)) {
    useStaff.setState((s) => ({ spoken: { ...s.spoken, _last: day } }));
    comeBack(fu);
    return;
  }
  if (last !== undefined && day - last < GAP) return;
  // Numbers that just moved are news; standing worries can wait their turn.
  const all = triggers(day);
  const t = all.find((x) => x.moved) ?? all[0];
  if (!t) return;
  await say(t, day);
}

/** One staffer says one thing, in their own voice when there is a key, with a suggested order. */
async function say(t: Trigger, day: number) {
  if (t.moved) { const { c, w } = worldNow(); seen = { poll: w.poll[c.follow] ?? 0, groups: { ...w.groups } }; }
  const g = useGame.getState();
  const p = g.staff.find((x) => x.id === t.who);
  if (!p?.name) return;
  useStaff.setState((s) => ({ spoken: { ...s.spoken, [t.key]: day, _last: day } }));

  let said = { text: t.text, suggest: t.suggest };
  try {
    const w = worldNow();
    const prof = useStaff.getState().hires[p.id] ?? profileFor(p.id, p.role);
    const res = await fetch("/api/staff/speak", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        // A post held by a real person in the record speaks as the post, never as that person.
        name: `the ${p.role}`,
        campaign: `${w.c.candidates.find((x) => x.id === w.c.follow)?.name ?? w.c.follow}'s campaign in ${w.c.title[0].toLowerCase()}${w.c.title.slice(1)}`,
        voice: prof.voice,
        situation: t.situation,
        context: `Today is ${useCase.getState().date}.${t.key === "money" ? ` ${shortMoney(w.w.budget)} left to spend under the cap.` : ""} Citywide standing ${Math.round(w.w.poll[w.c.follow] ?? 0)}%.`,
        fallback: said,
        carryOut: t.carryOut,
      }),
    });
    if (res.ok) said = await res.json();
  } catch {}
  useGame.setState((s) => ({ toasts: [...s.toasts.slice(-2), { id: Date.now(), staff: p.id, text: said.text }], unread: { ...s.unread, [p.id]: true } }));
  pushChat(p.id, { k: "them", text: said.text, suggest: said.suggest || undefined });
  const who = short(p);
  feed(p.id, `${who[0].toUpperCase()}${who.slice(1)}: "${said.text}"`, "warm");
}

/** The post that owns a kind of decision. A vacant post hands it to the Campaign Manager. */
const OWNER: Record<string, string> = { delegating: "cm", budgeting: "fin", "voter-groups": "com", policy: "pol" };

/**
 * The order a decision hands to the staff: the chosen option, worded as an instruction. It is offered with the
 * owner's remark and nothing is spent until the campaigner sends it. With a key the post words its own; this is the
 * fallback, and the rules planner reads its work from the option's own words.
 * ponytail: a choice to hold back ("Leave him alone") still offers an order, and the post then does its usual work.
 */
export const orderFor = (o: { label: string }) => `Put our decision to work: "${o.label}"`;

/**
 * Staff react to events as they happen, not only as days pass: a decision the campaigner just made, and a new lead
 * story in the morning paper. Each speaks once per event, through the same say() as everything else. Mount once.
 */
export function watch() {
  const offCase = useCase.subscribe((s, p) => {
    // A restarted case starts the staff's read of the numbers over.
    if (s.at < p.at || s.date < p.date) seen = null;
    const made = Object.keys(s.picks).find((id) => !(id in p.picks));
    if (!made) return;
    const { c } = worldNow();
    const d = c.decisions.find((x) => x.id === made);
    const o = d?.options.find((x) => x.id === s.picks[made].option);
    if (!d || !o) return;
    if (useStaff.getState().spoken[`decided-${d.id}`] !== undefined) return; // once per decision
    useStaff.setState((st) => ({ spoken: { ...st.spoken, [`decided-${d.id}`]: dayNow() } }));
    const g = useGame.getState();
    const owner = OWNER[d.skill] ?? "cm";
    const who = g.staff.some((x) => x.id === owner && x.name) ? owner : "cm";
    void say({ key: `decided-${d.id}`, who, situation: `The campaigner has just decided "${d.title}" and chose: ${o.label}. ${o.detail} Your suggested instruction is the first piece of work your post would do to carry that choice out.`, text: `On "${d.title}": ${o.label}. Fine. My side can start on that as soon as you give the order.`, suggest: orderFor(o), carryOut: o.label }, dayNow());
  });
  let editions = 0;
  let offPaper: (() => void) | undefined;
  let stopped = false;
  void import("../paper/run").then(({ usePaper }) => {
    if (stopped) return;
    editions = usePaper.getState().editions.length;
    offPaper = usePaper.subscribe((s) => {
      if (s.editions.length <= editions) { editions = s.editions.length; return; }
      editions = s.editions.length;
      const lead = s.editions.at(-1)?.lead;
      if (!lead || useStaff.getState().spoken[`news-${lead.key}`] !== undefined) return;
      useStaff.setState((st) => ({ spoken: { ...st.spoken, [`news-${lead.key}`]: dayNow() } }));
      void say({ key: `news-${lead.key}`, who: "com", situation: `This morning's paper leads with: ${lead.text}`, text: "Did you see the front page? We should have a line on it before lunch.", suggest: "Answer this morning's front page with a press pitch today" }, dayNow());
    });
  });
  return () => { stopped = true; offCase(); offPaper?.(); };
}
