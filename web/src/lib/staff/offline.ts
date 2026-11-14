import { ACTIONS, type ActionId } from "./catalog";
import { describeTeam, profileOf } from "./engine";
import { jitter, RunCtx, sleep } from "./protocol";
import { findBoros, findFactions, findPlaces, PLACES, shortPlace, type Snapshot } from "./world";

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
  if (action === "mail_piece") return "seniors";
  // The biggest group that could still go either way.
  return [...w.factions].filter((f) => f.feel > 35 && f.feel < 62).sort((a, b) => b.size - a.size)[0]?.id ?? w.factions[0].id;
}

export async function runOffline(ctx: RunCtx, pace = 1) {
  const { req, emit } = ctx;
  const w = req.snapshot;
  const me = w.staff.find((s) => s.id === req.director);
  if (!me?.name) return emit({ t: "done" }); // the post is vacant now
  const first = me.name.split(" ")[0];
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
    return { a, district, faction, who: who?.id ?? req.director, whoName: who?.name ?? me.name! };
  });

  emit({ t: "start", mode: "offline" });
  await wait(700);
  emit({ t: "say", text: team.length ? `On it. ${jobs.map((j) => j.whoName.split(" ")[0]).filter((n, i, a) => a.indexOf(n) === i).join(" and ")} will take this.` : me.boss ? "On it." : `On it. I'll handle this myself; nobody reports to me yet.` });
  const items = jobs.map((j) => ({ title: `${ACTIONS[j.a].label}${j.district ? ` in ${shortPlace(j.district)}` : j.faction ? ` for ${w.factions.find((f) => f.id === j.faction)?.name}` : ""}`, status: "pending" as const }));
  emit({ t: "plan", items });
  await wait(900);

  const notes: string[] = [];
  for (const [i, j] of jobs.entries()) {
    emit({ t: "plan", items: items.map((it, k) => ({ ...it, status: k < i ? "completed" : k === i ? "in-progress" : "pending" })) });
    if (j.who !== req.director) emit({ t: "delegate", to: j.who, job: items[i].title });
    await wait(1600);
    const r = ctx.act(j.who, j.a, { district: j.district, faction: j.faction });
    notes.push(r.text);
    await wait(1100);
    if (j.who !== req.director) emit({ t: "job-done", to: j.who, summary: r.ok ? r.text.split(" Cost ")[0] : r.text });
    await wait(500);
  }
  emit({ t: "plan", items: items.map((it) => ({ ...it, status: "completed" })) });

  const prof = profileOf(w, req.director);
  const overspender = prof.cost > 1.1;
  const blocked = notes.some((n) => n.startsWith("Not done: it costs"));
  const ask = !req.followOf && (blocked || overspender) ? { amount: overspender ? 3000 : 5000, reason: blocked ? "to finish the job" : "to run another round while we have momentum" } : null;
  const head = ctx.effects.length ? `Done. Spent $${ctx.spent.toLocaleString("en-US")}${ctx.raised ? `, raised $${ctx.raised.toLocaleString("en-US")}` : ""}.` : "Couldn't get it done.";
  const best = ctx.effects.find((e) => Object.keys(e.sent).length || Object.keys(e.factions).length);
  const coaching = req.followOf
    ? ""
    : ctx.quality.missing.length
    ? `Clearer next time: say ${ctx.quality.missing.join(", ")}. ${first} had to guess, and guesses cost money.`
    : ctx.effects.some((e) => !e.fit)
      ? `Clear instruction, but part of it went to someone without the skills. Check who is best placed before you ask.`
      : `Clear, specific, and given to the right person. That's how delegation should look.`;
  ctx.report(`${head} ${best ? best.summary.replace(/ \(Not their strength.*$/, "") : ""}${ask ? ` I could use another $${ask.amount.toLocaleString("en-US")} ${ask.reason}.` : ""}`.trim(), ask, coaching);
  emit({ t: "done" });
}
