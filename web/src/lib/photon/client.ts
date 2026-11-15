"use client";

import { create } from "zustand";
import type { Staff } from "../data";
import { answerAsk, instruct } from "../staff/run";
import { useStaff } from "../staff/store";
import { useGame } from "../store";

// The staff text the student's phone (#53, Photon 2.0), and the student answers by text.
// - A staff remark goes out as a text, signed by the post, with its suggested order: "Reply YES to …".
// - A reply becomes an order to whoever texted last: YES sends the suggested order, anything else is the order itself.
// - The report on that order is texted back; when it asks for money, YES approves it.
// The number is one the student typed in. It stays in this browser (not in the campaign save) and nothing is sent
// without it. With no Photon keys on the server none of this runs.

const KEY = "campaign-academy:phone";
const YES = /^\s*(y|yes|yep|yeah|ok|okay|sure|go|do it|approve|approved)\b/i;

/** What a YES answers: the staffer's suggested order, or a request for more money in a report. */
type Pending = { who: string; order?: string; ask?: number } | null;
type PhoneState = { phone: string | null; enabled: boolean | null; line: string | null; code: string | null; after: number; pending: Pending; awaiting: Record<string, number>; error: string | null };

const stored = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
export const usePhone = create<PhoneState>(() => ({ phone: null, enabled: null, line: null, code: null, after: Date.now(), pending: null, awaiting: {}, error: null }));

const staffer = (id: string) => useGame.getState().staff.find((p) => p.id === id);
/** How a post signs a text: a post held by a real person in the record signs as the post, never as that person. */
const signature = (p: Staff | undefined) => (!p ? "Your campaign" : p.onRecord || !p.name || p.name === p.role ? `The ${p.role}` : `${p.name}, ${p.role}`);

async function post(text: string, thread = false) {
  const { phone, enabled } = usePhone.getState();
  if (!phone || !enabled) return false;
  try {
    const res = await fetch("/api/photon/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ to: phone, text, thread }) });
    const out = (await res.json()) as { ok: boolean; error?: string };
    usePhone.setState({ error: out.ok ? null : out.error ?? "The text did not go out" });
    return out.ok;
  } catch {
    usePhone.setState({ error: "The text did not go out" });
    return false;
  }
}

/**
 * Link a phone the way Photon's lines work: the student texts the line first ("JOIN 4821"), and the phone that sent
 * the code is theirs. Then the line can text back in that conversation. Resolves to an error to show, or null.
 */
export async function linkPhone(): Promise<string | null> {
  const code = `JOIN ${Math.floor(1000 + Math.random() * 9000)}`;
  usePhone.setState({ code, error: null });
  for (let i = 0; i < 90 && usePhone.getState().code === code; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    try {
      const { from } = (await (await fetch(`/api/photon/join?code=${encodeURIComponent(code)}`)).json()) as { from: string | null };
      if (!from) continue;
      try { localStorage.setItem(KEY, from); } catch {}
      usePhone.setState({ phone: from, code: null, after: Date.now() });
      const ok = await post("Campaign Academy: you're linked. Your campaign staff will text you here when something needs your call. Reply to any of them to give an order.", true);
      return ok ? null : (usePhone.getState().error ?? "The text did not go out");
    } catch {}
  }
  if (usePhone.getState().code === code) usePhone.setState({ code: null });
  return "No text with the code arrived. Try again.";
}

export const cancelLink = () => usePhone.setState({ code: null });

export function unlinkPhone() {
  try { localStorage.removeItem(KEY); } catch {}
  usePhone.setState({ phone: null, code: null, pending: null, awaiting: {} });
}

/** A staff remark, texted. Called from lib/staff/speak say(). */
export function textFromStaff(id: string, text: string, suggest?: string) {
  if (!usePhone.getState().phone || !usePhone.getState().enabled) return;
  usePhone.setState({ pending: { who: id, order: suggest || undefined } });
  void post(`${signature(staffer(id))}: ${text}${suggest ? `\n\nReply YES to: "${suggest}". Or reply with your own order.` : "\n\nReply with an order."}`);
}

/** One reply from the phone: approve, carry out the suggestion, or give the reply itself as an order. */
function handle(text: string) {
  const { pending } = usePhone.getState();
  const who = pending?.who ?? "cm";
  const p = staffer(who);
  if (!p?.name) { void post("That post is empty right now. Hire someone in the War room first.", true); return; }
  if (pending?.ask !== undefined && YES.test(text)) {
    answerAsk(who, pending.ask, true);
    usePhone.setState({ pending: null, awaiting: { ...usePhone.getState().awaiting, [who]: (useStaff.getState().chat[who] ?? []).length } });
    return;
  }
  const order = YES.test(text) && pending?.order ? pending.order : text;
  if (useStaff.getState().active[who]) { void post(`${signature(p)}: I'm still on the last job. I'll text you the report.`, true); return; }
  usePhone.setState({ pending: null, awaiting: { ...usePhone.getState().awaiting, [who]: (useStaff.getState().chat[who] ?? []).length } });
  void instruct(who, order);
}

let started = false;
/** Start once: find out whether the server can text, restore the number, poll for replies, text back reports. */
export function watchPhone() {
  if (started) return () => {};
  started = true;
  const phone = stored();
  usePhone.setState({ phone, after: Date.now() });
  void fetch("/api/photon/status").then((r) => r.json()).then((x: { enabled: boolean; line: string | null }) => usePhone.setState({ enabled: x.enabled, line: x.line })).catch(() => usePhone.setState({ enabled: false }));

  // Replies from the phone.
  const poll = setInterval(async () => {
    const { phone: to, enabled, after } = usePhone.getState();
    if (!to || !enabled) return;
    try {
      const res = await fetch(`/api/photon/inbox?from=${encodeURIComponent(to)}&after=${after}`);
      const { messages } = (await res.json()) as { messages: { text: string; at: number }[] };
      if (!messages?.length) return;
      usePhone.setState({ after: Math.max(after, ...messages.map((m) => m.at)) });
      for (const m of messages) if (!/^\s*join\s+\d{4}\s*$/i.test(m.text)) handle(m.text);
    } catch {}
  }, 3000);

  // The report on an order given by text goes back by text.
  const off = useStaff.subscribe((s) => {
    const { awaiting } = usePhone.getState();
    for (const [who, from] of Object.entries(awaiting)) {
      const chat = s.chat[who] ?? [];
      const i = chat.findIndex((x, n) => n >= from && x.k === "report");
      if (i < 0) continue;
      const r = chat[i];
      if (r.k !== "report") continue;
      const rest = { ...awaiting };
      delete rest[who];
      const money = r.spent || r.raised ? `\n\nSpent $${r.spent.toLocaleString("en-US")}${r.raised ? `, raised $${r.raised.toLocaleString("en-US")}` : ""}.` : "";
      const ask = r.ask && r.state === "open" ? `\n\nI could use another $${r.ask.amount.toLocaleString("en-US")} ${r.ask.reason}. Reply YES to approve.` : "\n\nReply with the next order.";
      usePhone.setState({ awaiting: rest, pending: r.ask && r.state === "open" ? { who, ask: i } : { who } });
      // A threaded reply to the order they texted, which also ends the typing bubble.
      void post(`${signature(staffer(who))}: ${r.text}${money}${ask}`, true);
    }
  });
  return () => { clearInterval(poll); off(); started = false; };
}
