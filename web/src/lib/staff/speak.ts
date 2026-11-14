"use client";

import { QUIPS } from "../data";
import { netPerDay, useGame } from "../store";
import { profileFor } from "./roster";
import { feed } from "./run";
import { pushChat, useStaff } from "./store";
import { PLACES } from "./world";

// Staff speak up unprompted when something in the world deserves it. Each kind of worry fires at most once
// every few days, and only when nobody is mid-conversation with that person.

type Trigger = { key: string; who: string; situation: string; text: string; suggest: string };

function triggers(): Trigger[] {
  const g = useGame.getState();
  const s = useStaff.getState();
  const has = (id: string) => g.staff.some((p) => p.id === id && p.name);
  const out: Trigger[] = [];
  const net = netPerDay(g);
  const left = 30 - g.day;
  if (net < 0 && has("fin")) {
    const runway = Math.floor(g.cash / -net);
    if (runway < left + 4) out.push({ key: "runway", who: "fin", situation: `At the current burn of $${(-net).toLocaleString("en-US")}/day the campaign runs out of money in ${runway} days, before election day.`, text: `At this burn we're broke by day ${g.day + runway}. I need call time and a dinner on the books.`, suggest: "Raise $40k this week with call time and a donor dinner" });
  }
  if (!g.staff.find((p) => p.id === "ox")?.name && has("fd")) out.push({ key: "bronx", who: "fd", situation: "There is still no organizer in the Bronx, the biggest open area on the map.", text: "Still nobody in the Bronx. Every day without an organizer there is a day Hale gets for free.", suggest: "Canvass the open Bronx districts this weekend" });
  if (!g.staff.find((p) => p.id === "pol")?.name && has("cm") && g.day >= 2) out.push({ key: "policy", who: "cm", situation: "The Policy Director post is still empty and the manifesto needs work.", text: "We need a Policy Director. The manifesto won't write itself, and the debate is on day 7.", suggest: "Plan the week around the debate on day 7" });
  const cold = [...g.factions].sort((a, b) => a.feel - b.feel)[0];
  if (cold.feel < 30 && has("com")) out.push({ key: `cold-${cold.id}`, who: "com", situation: `${cold.name} are cold toward Cole (${Math.round(cold.feel)}/100).`, text: `${cold.name} have gone cold on us. I have an idea for how to reach them.`, suggest: `Reach ${cold.name.toLowerCase()} with a press pitch this week` });
  const slipping = PLACES.filter((p) => (g.sent[p.cd] ?? 50) < 40 && Math.floor(p.cd / 100) === 4).sort((a, b) => g.sent[a.cd] - g.sent[b.cd])[0];
  if (slipping && has("oq")) out.push({ key: `slip-${slipping.cd}`, who: "oq", situation: `${slipping.name} in Queens is slipping (support ${Math.round(g.sent[slipping.cd])}). Top complaint there: ${slipping.issue}.`, text: `${slipping.name.split("-")[0]} is slipping. People there are angry about ${slipping.issue.toLowerCase()}.`, suggest: `Canvass ${slipping.name.split("-")[0]} on ${slipping.issue.toLowerCase()} tomorrow` });
  const morale = Object.entries(s.morale).filter(([id]) => has(id)).sort((a, b) => a[1] - b[1])[0];
  if (morale && morale[1] < 40) out.push({ key: `morale-${morale[0]}`, who: "cm", situation: `${g.staff.find((p) => p.id === morale[0])?.name} has low morale (${morale[1]}/100) and might walk.`, text: `${g.staff.find((p) => p.id === morale[0])?.name?.split(" ")[0]} is close to quitting. Clearer orders would help.`, suggest: "Give the team a clear plan for the next three days" });
  return out.filter((t) => has(t.who) && !s.active[t.who] && (s.spoken[t.key] === undefined || g.day - s.spoken[t.key] >= 3));
}

export async function speakUp() {
  const g = useGame.getState();
  const pick = triggers()[0];
  const t: Trigger = pick ?? (() => {
    // Canned lines only when they are still true.
    const quips = QUIPS.filter(([who, text]) => g.staff.some((p) => p.id === who && p.name) && !(/Bronx/.test(text) && g.staff.find((p) => p.id === "ox")?.name));
    const [who, text] = quips[Math.floor(Math.random() * quips.length)] ?? QUIPS[3];
    return { key: `quip-${who}`, who, situation: text, text, suggest: "" };
  })();
  const p = g.staff.find((x) => x.id === t.who);
  if (!p?.name) return;
  useStaff.setState((s) => ({ spoken: { ...s.spoken, [t.key]: g.day } }));

  let said = { text: t.text, suggest: t.suggest };
  if (pick) {
    try {
      const prof = useStaff.getState().hires[p.id] ?? profileFor(p.id, p.role);
      const res = await fetch("/api/staff/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: p.name, role: p.role, voice: prof.voice, situation: t.situation, context: `Day ${g.day}/30, cash $${g.cash.toLocaleString("en-US")}, poll Cole ${g.poll.cole} vs Hale ${g.poll.hale}.`, fallback: said }),
      });
      if (res.ok) said = await res.json();
    } catch {}
  }
  useGame.setState((s) => ({ toasts: [...s.toasts.slice(-2), { id: Date.now(), staff: p.id, text: said.text }], unread: { ...s.unread, [p.id]: true } }));
  pushChat(p.id, { k: "them", text: said.text, suggest: said.suggest || undefined });
  feed(p.id, `${p.name.split(" ")[0]}: "${said.text}"`, "warm");
}
