// The staff's iMessage line (#53, Photon 2.0). One Spectrum connection per server process: it sends the staff's texts
// to the student's phone and reads the student's replies from Spectrum's message stream, which the server opens
// itself, so no public webhook is needed. Replies wait in a small in-memory inbox that the browser polls.
// ponytail: the inbox lives in this process. On serverless hosting (Vercel) replies need Photon webhooks and shared
// storage; texts out still work.

type Space = { send: (text: string) => Promise<unknown>; startTyping?: () => Promise<void>; stopTyping?: () => Promise<void> };
type Inbound = { direction: string; id: string; sender?: { id: string }; content: { type: string; text?: string }; react?: (emoji: string) => Promise<unknown>; reply?: (text: string) => Promise<unknown> };
type App = { messages: AsyncIterable<[Space, Inbound]>; stop: () => Promise<void> };
type IMessage = { user: (id: string) => Promise<unknown>; space: { create: (user: unknown) => Promise<Space> } };
export type Reply = { id: string; from: string; text: string; at: number };

/** Photon is set up on this server: the project's id and secret are in the environment. */
export const photonReady = () => !!(process.env.SPECTRUM_PROJECT_ID && process.env.SPECTRUM_PROJECT_SECRET);

/** A phone number as the last ten digits, so "+1 (555) 111-2222" and "any;-;+15551112222" match. */
export const sameNumber = (a: string, b: string) => a.replace(/\D/g, "").slice(-10) === b.replace(/\D/g, "").slice(-10);

/** `last`: each number's latest message, so the answer can come back as a threaded reply to it. */
type State = { app: Promise<App>; inbox: Reply[]; spaces: Map<string, Space>; last: Map<string, Inbound> };
const g = globalThis as unknown as { __photon?: State; __photonFailed?: number };

function state(): State {
  if (g.__photon) return g.__photon;
  // After a failed connection, wait before trying again: the browser polls every few seconds.
  if (g.__photonFailed && Date.now() - g.__photonFailed < 30_000) {
    const failed = Promise.reject(new Error("Photon is not connected; trying again shortly"));
    failed.catch(() => {});
    return { app: failed, inbox: [], spaces: new Map(), last: new Map() };
  }
  const inbox: Reply[] = [];
  const spaces = new Map<string, Space>();
  const last = new Map<string, Inbound>();
  const app = (async () => {
    const { Spectrum } = await import("@spectrum-ts/core");
    const { imessage } = await import("@spectrum-ts/imessage");
    const a = (await Spectrum({ projectId: process.env.SPECTRUM_PROJECT_ID!, projectSecret: process.env.SPECTRUM_PROJECT_SECRET!, providers: [imessage.config()] })) as unknown as App;
    // Read replies for as long as the process lives.
    void (async () => {
      for await (const [space, m] of a.messages) {
        if (m.direction !== "inbound" || m.content.type !== "text" || !m.content.text?.trim()) continue;
        const from = m.sender?.id ?? "";
        const key = from.replace(/\D/g, "").slice(-10);
        spaces.set(key, space);
        last.set(key, m);
        inbox.push({ id: m.id, from, text: m.content.text.trim(), at: Date.now() });
        if (inbox.length > 300) inbox.shift();
        // Like a person would: a tapback that the order landed, then typing while the staff work on it.
        void m.react?.("👍").catch(() => {});
        void space.startTyping?.().catch(() => {});
      }
    })().catch((err) => {
      console.error("[photon] the message stream ended:", err);
      g.__photon = undefined;
    });
    console.log("[photon] connected");
    return a;
  })();
  // A failed connection is not cached: the next request tries again.
  app.catch((err) => {
    console.error("[photon] could not connect:", err);
    g.__photon = undefined;
    g.__photonFailed = Date.now();
  });
  return (g.__photon = { app, inbox, spaces, last });
}

/**
 * Text `to` (E.164) from the staff's line. Reuses the conversation once it exists. `thread`: answer the student's
 * latest message as a threaded reply (the report on an order they gave by text), which also ends the typing.
 */
export async function sendText(to: string, text: string, thread = false) {
  const s = state();
  const app = await s.app;
  const key = to.replace(/\D/g, "").slice(-10);
  const prior = s.last.get(key);
  if (thread && prior?.reply) {
    await s.spaces.get(key)?.stopTyping?.().catch(() => {});
    await prior.reply(text);
    s.last.delete(key);
    return;
  }
  let space = s.spaces.get(key);
  if (!space) {
    const { imessage } = await import("@spectrum-ts/imessage");
    const im = (imessage as unknown as (a: unknown) => IMessage)(app);
    space = await im.space.create(await im.user(to));
    s.spaces.set(key, space);
  }
  await space.send(text);
}

/** Replies from `from` that arrived after `after` (ms). Starts the connection if it is not running yet. */
export function repliesFrom(from: string, after: number): Reply[] {
  return state().inbox.filter((m) => m.at > after && sameNumber(m.from, from));
}
