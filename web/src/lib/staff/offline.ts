import { ACTIONS, type ActionId, type BookingKind } from "../engine/catalog";
import { describeTeam, profileOf } from "../engine/resolve";
import { jitter, RunCtx, sleep } from "./protocol";
import { findBoros, findFactions, findPlaces, PLACES, short, shortPlace, type Snapshot } from "./world";

// The simulation used when no API key is set, or when the live agents fail. It emits exactly the same events
// as the real agents, so the war room behaves the same either way. Responses are templated, not written.

const KEYWORDS: [RegExp, ActionId[]][] = [
  [/canvass|door|knock/, ["canvass"]],
  [/phone bank|phone-bank|calls? (to )?voters/, ["phone_bank"]],
  [/rally|speech|town hall/, ["rally"]],
  [/house part/, ["house_party"]],
  [/dinner|big donor|major donor|high.dollar/, ["donor_dinner"]],
  [/call time|call-time|dial|donor call/, ["call_time"]],
  [/e-?mail|small.dollar|text/, ["email_blast"]],
  [/\bads?\b|digital|online|social/, ["digital_ads"]],
  [/\bmail(er|ing)?\b|flyer|leaflet/, ["mail_piece"]],
  [/press|reporter|story|media|pitch|interview/, ["press_pitch"]],
  [/respond|response|hit back|counter|attack|rebut/, ["rapid_response"]],
  [/train|recruit/, ["volunteer_training"]],
  [/meet|coalition|endorse|leaders|sit down/, ["coalition_meeting"]],
  [/policy|brief|white paper|proposal/, ["policy_brief"]],
  [/target|data|model|turnout list/, ["voter_targeting"]],
  [/schedule|book|calendar/, ["schedule_event"]],
  [/fund.?rais|raise money|money|cash/, ["call_time", "house_party"]],
];

const DEFAULTS: Record<string, ActionId[]> = {
  cm: ["coalition_meeting", "schedule_event"],
  fd: ["canvass", "volunteer_training"],
  fin: ["call_time", "house_party"],
  com: ["press_pitch", "digital_ads"],
  pol: ["policy_brief", "coalition_meeting"],
  dat: ["voter_targeting"],
};

const cap = (t: string) => t[0].toUpperCase() + t.slice(1);

function pickActions(text: string, director: string) {
  const t = text.toLowerCase();
  const found = KEYWORDS.filter(([re]) => re.test(t)).flatMap(([, a]) => a);
  const unique = [...new Set(found)].slice(0, 3);
  return unique.length ? unique : DEFAULTS[director] ?? ["coalition_meeting"];
}

/** Districts with the most to gain: open ones first. */
function pickDistricts(w: Snapshot, text: string, boro?: number) {
  const named = findPlaces(text);
  if (named.length) return named;
  const boros = boro ? [boro] : findBoros(text);
  const pool = PLACES.filter((p) => !boros.length || boros.includes(Math.floor(p.cd / 100)));
  return [...pool].sort((a, b) => Math.abs((w.sent[a.cd] ?? 50) - 50) - Math.abs((w.sent[b.cd] ?? 50) - 50)).slice(0, 2).map((p) => p.cd);
}

function pickFaction(w: Snapshot, text: string, action: ActionId) {
  const named = findFactions(text);
  if (named.length) return named[0];
  void action;
  // The sizeable group where the campaign is weakest.
  return [...w.factions].filter((f) => f.size >= 20).sort((a, b) => a.feel - b.feel)[0]?.id ?? w.factions[0].id;
}

/**
 * What to book when there is no model: the kind the order names (a rally, a house party, a meeting), door knocking
 * otherwise, as the cheapest; on the days after today, one per job, so they do not all land tomorrow.
 */
function bookingFor(text: string, today: string, n: number): { kind: BookingKind; on: string } {
  const t = text.toLowerCase();
  const kind: BookingKind = /rally|speech/.test(t) ? "rally" : /house part|fundrais/.test(t) ? "house_party" : /meet|leaders|coalition|church|forum/.test(t) ? "meeting" : "doors";
  return { kind, on: new Date(Date.parse(today) + (n + 1) * 86_400_000).toISOString().slice(0, 10) };
}

/** Words that ask for ideas rather than work. */
const IDEAS = /\b(ideas?|suggest(ions?)?|options?|advice|advise|thoughts|recommend(ations?)?|what do you think|your (view|take|read))\b/i;

/**
 * A question rather than an order: the campaigner wants options, not work. A polite request ("Can you canvass Crown
 * Heights this week?", "Please run call time") is an order, unless it asks for ideas ("Can you suggest something?").
 */
export const isQuestion = (text: string) => {
  const t = text.trim();
  if (IDEAS.test(t)) return true;
  if (/^(please\b|(can|could|would|will) (you|we)\b|let'?s\b)/i.test(t)) return false;
  if (/\?\s*$/.test(t)) return true;
  // A question word opens a question even without its mark. "Do", "is" or "should" open an order as often ("Do a
  // canvass in Crown Heights"), so they need the question mark.
  return /^(what|which|where|who|how|why)\b/i.test(t);
};

/** Without a model: two or three options from the post's usual work, aimed where the campaign is weakest. */
function offlineProposals(ctx: RunCtx, first: string) {
  const { req } = ctx;
  const w = req.snapshot;
  const actions = [...new Set([...pickActions(req.text, req.director), ...(DEFAULTS[req.director] ?? [])])].slice(0, 3);
  const drafts = actions.map((a) => {
    const act = ACTIONS[a];
    const district = act.needs.district ? pickDistricts(w, req.text)[0] : undefined;
    const faction = act.needs.faction || act.group ? pickFaction(w, req.text, a) : undefined;
    const group = faction ? w.factions.find((f) => f.id === faction)?.name : undefined;
    const where = [district && `in ${shortPlace(district)}`, group && `for ${group}`].filter(Boolean).join(" ");
    return { title: cap(`${act.label.toLowerCase()} ${where}`.trim()), why: act.about, steps: [{ action: a, district, faction }] };
  });
  const opener = req.followUp
    ? `${cap(first)} here, coming back about earlier work. ${req.text.match(/What it did: ([^\n]*)/)?.[1] ?? ""} ${req.text.match(/Where things stand now: ([^\n]*)/)?.[1] ?? ""} Here is what I would do next.`.replace(/\s+/g, " ")
    : `${cap(first)} here. You asked, so here's what I'd put on the table. Pick one and I'll get moving.`;
  ctx.propose(opener, drafts);
}

/**
 * Carry out a picked option: exactly its steps, in order, with no planning. `say` writes the closing line in the
 * director's own voice when there is a model; without one, or if it fails, a plain line stands.
 */
export async function runSteps(ctx: RunCtx, mode: "live" | "offline", say?: (results: string[]) => Promise<string>, pace = 1) {
  const { req, emit } = ctx;
  const steps = req.steps ?? [];
  const wait = (ms: number) => sleep(ms * pace);
  emit({ t: "start", mode });
  const items = steps.map((s) => ({ title: ctx.describe(s), status: "pending" as const }));
  emit({ t: "plan", items });
  const results: string[] = [];
  let failed = "";
  for (const [i, s] of steps.entries()) {
    emit({ t: "plan", items: items.map((it, k) => ({ ...it, status: k < i ? "completed" : k === i ? "in-progress" : "pending" })) });
    if (s.by !== req.director) emit({ t: "delegate", to: s.by, job: items[i].title });
    await wait(600);
    const r = ctx.act(s.by, s.action, { district: s.district, faction: s.faction, on: s.on, kind: s.kind });
    if (r.ok) results.push(r.text.split(" Cost ")[0]);
    else failed = r.text;
    await wait(600);
    if (s.by !== req.director) emit({ t: "job-done", to: s.by, summary: r.ok ? r.text.split(" Cost ")[0] : r.text });
  }
  emit({ t: "plan", items: items.map((it) => ({ ...it, status: "completed" })) });
  let text = failed ? `Not all of it went through. ${failed}` : "Done, exactly as we agreed.";
  if (!failed && say) { try { text = (await say(results)) || text; } catch { /* the plain line stands */ } }
  ctx.report(text, null, "");
  emit({ t: "done" });
}

export async function runOffline(ctx: RunCtx, pace = 1) {
  const { req, emit } = ctx;
  const w = req.snapshot;
  const me = w.staff.find((s) => s.id === req.director);
  if (!me?.name) return emit({ t: "done" }); // the post is vacant now
  const first = short(me);
  if (req.followUp || (!req.followOf && isQuestion(req.text))) {
    emit({ t: "start", mode: "offline" });
    await sleep(600 * pace);
    offlineProposals(ctx, first);
    return emit({ t: "done" });
  }
  const team = describeTeam(w, req.director);
  const basis = req.followOf ?? req.text;
  const actions = pickActions(basis, req.director);
  const wait = (ms: number) => sleep(jitter(req.runId + ms, ms) * pace);

  // Each job goes to the teammate whose skills fit best; turf breaks ties. The director does it if nobody fits.
  const jobs = actions.map((a, i) => {
    const districts = pickDistricts(w, basis);
    const district = ACTIONS[a].needs.district ? districts[i % districts.length] : undefined;
    const faction = ACTIONS[a].needs.faction ? pickFaction(w, basis, a) : undefined;
    const ranked = [...team].sort((x, y) => score(y) - score(x));
    function score(p: (typeof team)[number]) {
      const sk = ACTIONS[a].skills;
      return (sk.some((s) => p.profile.skills.includes(s)) ? 2 : 0) + (p.profile.skills.includes(sk[0]) ? 0.5 : 0) + ((p.profile.special?.[a] ?? 1) > 1 ? 0.5 : 0) + (district && p.profile.turf?.includes(Math.floor(district / 100)) ? 1 : 0);
    }
    const who = ranked[0] && score(ranked[0]) >= 2 ? ranked[0] : null;
    // Why, in the words of whoever decided it. Each line follows the rule that actually made the pick.
    const skill = who ? ACTIONS[a].skills.find((s) => who.profile.skills.includes(s)) : undefined;
    const handoff = who ? `${cap(short(who))} takes "${titleOf(a, district, faction)}": ${skill ? `${skill} is their strength` : "the best fit I have"}${district && who.profile.turf?.includes(Math.floor(district / 100)) ? ", and they know the borough" : ""}.` : "";
    const named = findPlaces(basis).length > 0;
    const where = district ? (named ? `You named ${shortPlace(district)}, so that's where this goes.` : `${shortPlace(district)} is the closest race we have, at ${Math.round(w.sent[district] ?? 50)}% for us, so it's where work moves the most votes.`) : "";
    const f = faction ? w.factions.find((x) => x.id === faction) : undefined;
    const whom = f ? (findFactions(basis).length ? ` Aimed at ${f.name}, as asked.` : ` Aimed at ${f.name}: only ${Math.round(f.feel)}% with us and ${Math.round(f.size)}% of likely voters.`) : "";
    const doing = `${where}${whom}`.trim() || `${ACTIONS[a].label} is the job, and it doesn't need a place or a group.`;
    return { a, district, faction, who: who?.id ?? req.director, whoShort: short(who ?? me), handoff, doing };
  });
  function titleOf(a: ActionId, district?: number, faction?: string) {
    return `${ACTIONS[a].label}${district ? ` in ${shortPlace(district)}` : faction ? ` for ${w.factions.find((f) => f.id === faction)?.name}` : ""}`;
  }
  const asked = KEYWORDS.some(([re]) => re.test(basis.toLowerCase()));
  const labels = [...new Set(jobs.map((j) => ACTIONS[j.a].label.toLowerCase()))].join(" and ");
  const split = asked
    ? `You asked for ${labels}. ${jobs.length > 1 ? `${jobs.length} jobs` : "One job"}${team.length ? `, each to whoever has the skills` : ", and I'll do it myself"}.`
    : `No specific action named, so the usual for this post: ${labels}.${team.length ? " Each goes to whoever has the skills." : ""}`;

  emit({ t: "start", mode: "offline" });
  await wait(700);
  emit({ t: "say", text: team.length ? `On it. ${cap(jobs.map((j) => j.whoShort).filter((n, i, a) => a.indexOf(n) === i).join(" and "))} will take this.` : me.boss ? "On it." : `On it. I'll handle this myself; nobody reports to me yet.` });
  const items = jobs.map((j) => ({ title: titleOf(j.a, j.district, j.faction), status: "pending" as const }));
  ctx.think(req.director, split);
  emit({ t: "plan", items });
  await wait(900);

  const notes: string[] = [];
  for (const [i, j] of jobs.entries()) {
    emit({ t: "plan", items: items.map((it, k) => ({ ...it, status: k < i ? "completed" : k === i ? "in-progress" : "pending" })) });
    if (j.who !== req.director) {
      ctx.think(req.director, j.handoff);
      emit({ t: "delegate", to: j.who, job: items[i].title });
    }
    await wait(900);
    ctx.think(j.who, j.doing);
    await wait(700);
    const r = ctx.act(j.who, j.a, { district: j.district, faction: j.faction, ...(j.a === "schedule_event" ? bookingFor(basis, w.date, i) : {}) });
    notes.push(r.text);
    await wait(1100);
    if (j.who !== req.director) emit({ t: "job-done", to: j.who, summary: r.ok ? r.text.split(" Cost ")[0] : r.text });
    await wait(500);
  }
  emit({ t: "plan", items: items.map((it) => ({ ...it, status: "completed" })) });

  const prof = profileOf(w, req.director);
  const overspender = prof.cost > 1.1;
  const blocked = notes.some((n) => n.startsWith("Not done: it costs"));
  const ask = !req.followOf && (blocked || overspender) ? { amount: (overspender ? 3000 : 5000) * w.scale.money, reason: blocked ? "to finish the job" : "to run another round while we have momentum" } : null;
  // The receipts already show each cost and effect, so the report says what it adds up to and what comes next.
  const head = !ctx.effects.length ? "Couldn't get it done." : blocked ? "Done, but not all of it: the budget ran out." : "Done.";
  const best = ctx.effects.find((e) => Object.keys(e.sent).length || Object.keys(e.factions).length);
  const group = best && Object.keys(best.factions)[0] ? w.factions.find((f) => f.id === Object.keys(best.factions)[0])?.name : undefined;
  const next = best?.district ? `Next I'd go back to ${shortPlace(best.district)} while it's moving.` : group ? `Next I'd keep at ${group}.` : "";
  const coaching = req.followOf
    ? ""
    : ctx.quality.missing.length
    ? `Clearer next time: say ${ctx.quality.missing.join(", ")}. ${cap(first)} had to guess, and guesses cost money.`
    : ctx.effects.some((e) => !e.fit)
      ? `Clear instruction, but part of it went to someone without the skills. Check who is best placed before you ask.`
      : `Clear, specific, and given to the right person. That's how delegation should look.`;
  ctx.report(`${head} ${ask ? `I could use another $${ask.amount.toLocaleString("en-US")} ${ask.reason}.` : next}`.trim(), ask, coaching);
  emit({ t: "done" });
}
