import demo from "./demo/weiner.json";
import { useCase } from "./cases/store";
import { publish, usePaper } from "./paper/run";
import { readSave, resetAll, restore, SAVE_KEY, SAVE_VERSION, snapshot, valid, watchSave, type Save } from "./save";
import { useMemos } from "./staff/memos";
import { instruct } from "./staff/run";
import { nextId, useStaff } from "./staff/store";
import { STAFF } from "./data";
import { useGame } from "./store";
import { useTasks } from "./tasks";

// Checks on saving, loading and resetting the campaign (lib/save.ts). Run with `npm run check:save`; no key needed.
// 1. Round trip: a campaign saved, reset and loaded again is the same campaign, every saved field.
// 2. Loading over a campaign that is further on (the restart hooks fire) keeps everything just loaded.
// 3. An order that was running is closed with a note and frees its director; a memo half written is dropped.
// 4. A save from another version, or the wrong shape, is refused and changes nothing.
// 5. New ids after a load do not collide with loaded ones (the War room feed, the paper's editions).
// 6. A reset leaves every store as a new visitor finds it, and no save.
// 7. Changes are written to storage within a second.
// 8. The demo start point is a valid save of May 22, 2013 with the Weiner decision waiting.
// 9. An order still running when the campaign is reset lands nothing in the new one.
// 10. Whether the agents are live is not saved: a loaded save or a reset keeps the server's answer.

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export async function checkSave() {
  const problems: string[] = [], report: string[] = [];
  const base = demo as unknown as Save;

  // 8. The demo start point.
  if (!valid(base)) problems.push("demo: weiner.json is not a valid save (rebuild it: npm run demo:start)");
  const dc = base.stores.case as { date: string; at: number; picks: Record<string, unknown> };
  if (dc.date !== "2013-05-22" || dc.at !== 2 || "weiner" in dc.picks) problems.push(`demo: ${dc.date} at step ${dc.at}, not May 22 with the Weiner decision waiting`);

  // 1. Round trip, with tasks added and the clock running.
  restore(base);
  useTasks.getState().add("Call the UFT before Friday");
  useCase.setState({ running: true });
  const saved = snapshot();
  resetAll();
  if (!restore(saved)) problems.push("round trip: a fresh save was refused");
  const back = snapshot();
  for (const k of Object.keys(saved.stores)) if (!same(saved.stores[k], back.stores[k])) problems.push(`round trip: the ${k} store came back different`);
  if (useCase.getState().running) problems.push("round trip: the clock came back running, not paused");
  report.push(`round trip: ${Object.keys(saved.stores).length} stores, ${Math.round(JSON.stringify(saved).length / 1024)} KB`);

  // 2. Loading over a campaign further on: the date goes back, the hooks wipe the paper and memos, the load refills them.
  useCase.setState({ at: 4, step: 4, date: "2013-08-01" });
  restore(saved);
  const ed = (saved.stores.paper as { editions: unknown[] }).editions.length;
  if (usePaper.getState().editions.length !== ed) problems.push(`load over a later campaign: the paper has ${usePaper.getState().editions.length} editions, the save ${ed}`);
  if (!same(useMemos.getState().byDecision, (saved.stores.memos as { byDecision: unknown }).byDecision)) problems.push("load over a later campaign: the memos were lost");
  if (!same(useStaff.getState().spoken, (saved.stores.staff as { spoken: unknown }).spoken)) problems.push("load over a later campaign: the staff's record of remarks was lost");
  report.push(`load over a later campaign: ${ed} editions and the memos kept`);

  // 3. An order cut off by a reload, and a memo half written.
  {
    const s = structuredClone(saved);
    const staff = s.stores.staff as { runs: Record<string, { id: number; status: string; text: string }[]>; job: Record<string, string>; chat: Record<string, { k: string; run?: number; live?: boolean }[]> };
    staff.runs.cm = [{ ...(staff.runs.cm?.[0] ?? { text: "Canvass Harlem" }), id: 4242, status: "running" } as never, ...(staff.runs.cm ?? [])];
    staff.job.cm = "Canvassing";
    (staff.chat.cm ??= []).push({ k: "thoughts", run: 4242, live: true });
    (s.stores.memos as { byDecision: Record<string, unknown> }).byDecision.hospital = { status: "writing", memos: [] };
    restore(s);
    const st = useStaff.getState();
    const r = st.runs.cm?.find((x) => x.id === 4242);
    if (r?.status !== "done") problems.push("in flight: the cut-off run is still marked running");
    if (st.job.cm) problems.push("in flight: the director still shows a job");
    if (Object.keys(st.active).length) problems.push("in flight: a director is still marked busy");
    if (!st.chat.cm?.some((c) => c.k === "note" && c.run === 4242 && /reload/.test(c.text))) problems.push("in flight: the chat does not say the order was cut off");
    if (st.chat.cm?.some((c) => c.k === "thoughts" && c.run === 4242 && c.live)) problems.push("in flight: its thinking still shows as live");
    if (useMemos.getState().byDecision.hospital) problems.push("in flight: a half-written memo was loaded");
    report.push("in flight: a cut-off order is closed with a note, a half-written memo dropped");
  }

  // 4. Another version, or the wrong shape, is refused and changes nothing.
  {
    restore(saved);
    const before = snapshot();
    const old = { ...saved, v: SAVE_VERSION - 1 };
    const bad = structuredClone(saved);
    (bad.stores.case as { work: unknown }).work = {};
    const noStore = structuredClone(saved);
    delete noStore.stores.paper;
    if (restore(old)) problems.push("versions: an older save was loaded");
    if (restore(bad)) problems.push("versions: a save with the wrong shape was loaded");
    if (restore(noStore)) problems.push("versions: a save missing a store was loaded");
    if (restore(null) || restore("{}")) problems.push("versions: nothing at all was loaded as a save");
    const after = snapshot();
    if (!same(before.stores, after.stores)) problems.push("versions: a refused save changed the campaign");
    report.push("versions: an old, misshapen or partial save is refused and changes nothing");
  }

  // 5. Ids after a load.
  {
    restore(saved);
    const feedMax = Math.max(0, ...useStaff.getState().feed.map((f) => f.id));
    const id = nextId();
    if (id <= feedMax) problems.push(`ids: a new feed id (${id}) repeats a loaded one (up to ${feedMax})`);
    const edMax = Math.max(0, ...usePaper.getState().editions.map((e) => e.id));
    useCase.setState({ date: "2013-05-23" });
    publish();
    const fresh = usePaper.getState().editions.at(-1)!;
    if (fresh.id <= edMax) problems.push(`ids: a new edition id (${fresh.id}) repeats a loaded one (up to ${edMax})`);
    report.push(`ids: new ones start past the loaded (feed ${id} > ${feedMax}, edition ${fresh.id} > ${edMax})`);
  }

  // 7. Changes reach storage.
  {
    restore(saved);
    const off = watchSave();
    useTasks.getState().add("Watch the debate tape");
    await wait(700);
    off();
    const s = readSave() as Save | null;
    if (!(s?.stores.tasks as { tasks: { text: string }[] } | undefined)?.tasks.some((t) => t.text === "Watch the debate tape")) problems.push("saving: a change did not reach storage within a second");
    else report.push("saving: a change reaches storage within a second");
  }

  // 6. Reset.
  {
    restore(saved);
    resetAll();
    const c = useCase.getState(), st = useStaff.getState();
    const left = [
      c.at !== 0 && "the case step",
      Object.keys(c.picks).length && "decisions",
      c.work.length && "work",
      c.bookings.length && "the calendar",
      Object.keys(st.chat).length && "staff chats",
      st.feed.length && "the War room feed",
      Object.keys(st.memory).length && "staff memory",
      st.followups.length && "follow-ups",
      usePaper.getState().editions.length && "the paper",
      Object.keys(useMemos.getState().byDecision).length && "memos",
      useTasks.getState().tasks.length && "tasks",
      !same(useGame.getState().staff, STAFF) && "the roster",
      readSave() !== null && "the save",
    ].filter(Boolean);
    if (left.length) problems.push(`reset: left behind ${left.join(", ")}`);
    if (globalThis.localStorage?.getItem(SAVE_KEY)) problems.push("reset: the save is still in storage");
    report.push("reset: nothing of the campaign is left, and no save");
  }
  // 10. Whether the agents are live is the server's, not the save's (full test, 15 Nov: the demo, built with no key,
  //     said "no API key" on a live server). It is not saved, a loaded save does not change it, and a reset keeps it.
  {
    if ("mode" in saved.stores.staff) problems.push("live label: the save carries the staff's mode");
    useStaff.setState({ mode: "live" });
    const old = structuredClone(saved);
    (old.stores.staff as { mode?: string }).mode = "offline";
    restore(old);
    if (useStaff.getState().mode !== "live") problems.push(`live label: loading a save set the mode to ${useStaff.getState().mode}`);
    resetAll();
    if (useStaff.getState().mode !== "live") problems.push(`live label: a reset set the mode to ${useStaff.getState().mode}`);
    report.push("live label: not saved, kept through a load and a reset");
  }

  // 9. An order running through a reset. With no server here it runs by the rules, in this process.
  {
    restore(saved);
    const going = instruct("fd", "Canvass Crown Heights this week");
    await wait(50);
    resetAll();
    await going;
    const st = useStaff.getState(), c = useCase.getState();
    if (Object.keys(st.chat).length || c.work.length || st.feed.length) problems.push(`reset mid-order: the old order landed in the new campaign (${Object.keys(st.chat).length} chats, ${c.work.length} work, ${st.feed.length} feed)`);
    else report.push("reset mid-order: the old order lands nothing");
    resetAll();
  }
  return { problems, report };
}
