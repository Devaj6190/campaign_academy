// Builds the README figures as SVG, in the app's black-and-gold style.
// Run: node docs/readme/diagrams/build.mjs   (no dependencies)
// ponytail: hand-placed coordinates; edit a figure by editing its function below.
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = dirname(fileURLToPath(import.meta.url));
const W = 1600;
const C = {
  bg: "#0b0a08", card: "#13110d", gold: "#d6b25e", goldSoft: "#a88a45", goldDeep: "#5e4d27",
  ivory: "#f1e8d4", muted: "#9a8f7a", faint: "#3b3324",
};
const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = "'Helvetica Neue', 'Segoe UI', Arial, sans-serif";
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function svg(h, body) {
  const d = (x, y) => `<path d="M${x},${y - 7} L${x + 7},${y} L${x},${y + 7} L${x - 7},${y} z" fill="${C.gold}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${h}" width="${W}" height="${h}">
<defs>
<radialGradient id="glow" cx="50%" cy="0%" r="90%"><stop offset="0" stop-color="#211b10"/><stop offset="1" stop-color="${C.bg}"/></radialGradient>
<marker id="h" viewBox="0 0 12 12" refX="10" refY="6" markerWidth="9" markerHeight="9" orient="auto-start-reverse"><path d="M2,2 L10,6 L2,10" fill="none" stroke="${C.gold}" stroke-width="1.4"/></marker>
</defs>
<rect width="${W}" height="${h}" fill="url(#glow)"/>
<rect x="22" y="22" width="${W - 44}" height="${h - 44}" fill="none" stroke="${C.goldDeep}"/>
<rect x="30" y="30" width="${W - 60}" height="${h - 60}" fill="none" stroke="${C.faint}"/>
${d(22, 22)}${d(W - 22, 22)}${d(22, h - 22)}${d(W - 22, h - 22)}
${body}</svg>\n`;
}

// Centered eyebrow between two hairlines, then a serif title with *gold italic* accents.
function head(eyebrow, title, sub) {
  const e = eyebrow.toUpperCase();
  const ew = e.length * 10.5;
  const parts = title.split("*").map((t, i) =>
    i % 2 ? `<tspan font-style="italic" fill="${C.gold}">${esc(t)}</tspan>` : esc(t)).join("");
  return `<line x1="${800 - ew / 2 - 90}" y1="96" x2="${800 - ew / 2 - 20}" y2="96" stroke="${C.goldSoft}"/>
<line x1="${800 + ew / 2 + 20}" y1="96" x2="${800 + ew / 2 + 90}" y2="96" stroke="${C.goldSoft}"/>
<text x="800" y="101" text-anchor="middle" font-family="${SANS}" font-size="14" letter-spacing="4" fill="${C.goldSoft}">${esc(e)}</text>
<text x="800" y="166" text-anchor="middle" font-family="${SERIF}" font-size="50" fill="${C.ivory}">${parts}</text>
${sub ? `<text x="800" y="210" text-anchor="middle" font-family="${SERIF}" font-style="italic" font-size="21" fill="${C.muted}">${esc(sub)}</text>` : ""}`;
}

const T = (x, y, t, { size = 18, fill = C.muted, font = SANS, anchor = "middle", italic, spacing, weight } = {}) =>
  `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="${font}" font-size="${size}"${weight ? ` font-weight="${weight}"` : ""}${italic ? ' font-style="italic"' : ""}${spacing ? ` letter-spacing="${spacing}"` : ""} fill="${fill}">${esc(t)}</text>`;
const cap = (x, y, t, fill = C.goldSoft, anchor = "middle") => T(x, y, t.toUpperCase(), { size: 15, spacing: 3, fill, anchor });

// A quiet card: hairline gold frame, serif title, one or two plain lines.
function card(x, y, w, h, title, lines = [], { strong, label } = {}) {
  const ls = [].concat(lines);
  const mid = y + h / 2 + (label ? 10 : 0);
  const ty = mid - (ls.length * 15) + 9;
  let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${strong ? "#1d180f" : C.card}" stroke="${strong ? C.gold : C.goldDeep}" stroke-width="${strong ? 1.5 : 1}"/>`;
  if (label) s += cap(x + w / 2, y + 34, label);
  s += T(x + w / 2, ty, title, { font: SERIF, size: 31, fill: strong ? C.gold : C.ivory });
  ls.forEach((l, i) => { s += T(x + w / 2, ty + 38 + i * 29, l, { size: 21 }); });
  return s;
}
const line = (pts, { dash, color = C.goldSoft, head = true } = {}) =>
  `<path d="${pts.map((p, i) => `${i ? "L" : "M"}${p[0]},${p[1]}`).join(" ")}" fill="none" stroke="${color}" stroke-width="1.3"${dash ? ' stroke-dasharray="5 6"' : ""}${head ? ' marker-end="url(#h)"' : ""}/>`;
const num = (x, y, n) => `<circle cx="${x}" cy="${y}" r="22" fill="${C.bg}" stroke="${C.gold}"/>${T(x, y + 8, n, { font: SERIF, size: 22, fill: C.gold })}`;
const rule = y => `<line x1="140" y1="${y}" x2="1460" y2="${y}" stroke="${C.faint}"/>`;

// ---------------------------------------------------------------- figures

function loop() {
  const H = 1000, cx = 800, cy = 590, r = 280;
  let s = head("Figure 1", "The learning cycle",
    "A real race on its real calendar. At each point where the real campaign decided, the clock stops and the student decides.");
  s += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${C.faint}"/>`;
  const nodes = [
    [-90, "A decision point", ["the clock stops"]],
    [0, "The student decides", ["two staff memos argue options"]],
    [90, "The record is shown", ["what the real campaign did"]],
    [180, "The campaign runs", ["staff work · rival moves · press"]],
  ];
  const at = a => [cx + r * Math.cos(a * Math.PI / 180), cy + r * Math.sin(a * Math.PI / 180)];
  for (let i = 0; i < 4; i++) {
    const [x1, y1] = at(nodes[i][0] + 26), [x2, y2] = at(nodes[i][0] + 64);
    s += `<path d="M${x1},${y1} A${r},${r} 0 0 1 ${x2},${y2}" fill="none" stroke="${C.goldSoft}" stroke-width="1.3" marker-end="url(#h)"/>`;
  }
  s += `<circle cx="${cx}" cy="${cy}" r="96" fill="#1d180f" stroke="${C.gold}"/>`;
  s += T(cx, cy - 2, "The record", { font: SERIF, size: 30, fill: C.gold });
  s += cap(cx, cy + 32, "every fact cited", C.goldSoft);
  for (const [a, t, l] of nodes) { const [x, y] = at(a); s += card(x - 160, y - 56, 320, 112, t, l); }
  s += T(250, 300, "Begin", { font: SERIF, size: 20, italic: true, fill: C.goldSoft });
  s += T(250, 336, "The briefing", { font: SERIF, size: 26, fill: C.ivory });
  s += T(250, 364, "the race as it really stood", { size: 20 });
  s += line([[355, 330], [cx - 175, at(-90)[1]]]);
  s += T(1350, 840, "End", { font: SERIF, size: 20, italic: true, fill: C.goldSoft });
  s += T(1350, 876, "Election night", { font: SERIF, size: 26, fill: C.ivory });
  s += T(1350, 904, "your result beside the real one", { size: 20 });
  s += line([[at(90)[0] + 165, at(90)[1] + 20], [1220, 868]]);
  return svg(H, s);
}

// Left-aligned detail panel: numbered seal, serif title, plain lines. Lines starting with ` are code.
function panel(x, y, w, h, n, title, lines, { strong, tag } = {}) {
  let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${strong ? "#1d180f" : C.card}" stroke="${strong ? C.gold : C.goldDeep}" stroke-width="${strong ? 1.5 : 1}"/>`;
  if (n) s += num(x + 34, y, n);
  if (tag) s += cap(x + w - 24, y + 34, tag, C.muted, "end");
  s += T(x + 28, y + 62, title, { anchor: "start", font: SERIF, size: 25, fill: strong ? C.gold : C.ivory });
  lines.forEach((l, i) => {
    const code = l.startsWith("`");
    s += T(x + 28, y + 100 + i * 28, code ? l.slice(1) : l, { anchor: "start", size: 17, fill: code ? C.goldSoft : C.muted, font: code ? "Consolas, Menlo, monospace" : SANS });
  });
  return s;
}
const note = (x, y, t, anchor = "middle") => T(x, y, t, { font: SERIF, size: 16, italic: true, fill: C.muted, anchor });

function architecture() {
  const H = 1140;
  let s = head("Figure 2", "System architecture",
    "Campaign state lives in the browser. Each request carries a snapshot; the server keeps no state between requests.");
  s += cap(260, 262, "Browser"); s += cap(790, 262, "Next.js API routes"); s += cap(1320, 262, "Models and services");
  s += panel(70, 290, 380, 170, "", "Screens", ["Case · Profile · War room", "Map · Factions · Morning paper", "Top bar: money, polls, weekly plan"]);
  s += panel(70, 490, 380, 170, "", "Campaign state", ["Case store (zustand)", "Daily clock: stops at decisions", "Saved in the browser (localStorage)"]);
  s += panel(70, 690, 380, 200, "", "Simulation engine", ["`simulate(case, picks, work)", "Pure and deterministic", "Prices and scores every action", "Fitted to the certified result"], { strong: true });
  s += panel(70, 920, 380, 140, "", "Rules fallbacks", ["Used with no API key or on failure", "Emit the same events"]);
  s += panel(530, 290, 520, 200, "", "Staff orders", ["`POST /api/staff/instruct", "One deep agent per order", "Director (Opus), team as subagents (Haiku)", "Streams NDJSON events to the War room"], { strong: true, tag: "deep agent" });
  s += panel(530, 510, 520, 140, "", "Rival campaigns", ["One deep agent per rival, run in parallel", "Tool make_move, scored by the engine"], { strong: true, tag: "deep agent" });
  s += panel(530, 670, 520, 140, "", "Election debrief", ["Read-only virtual filesystem of the campaign", "Seven subagents in parallel (Sonnet)"], { strong: true, tag: "deep agent" });
  s += panel(530, 830, 520, 120, "", "Single model calls", ["Decision memos · planks · remarks · hiring"]);
  s += panel(530, 970, 520, 90, "", "Morning paper", []);
  s += T(780, 1032, "stories · letters · stances", { anchor: "start", size: 17 });
  s += panel(1110, 290, 420, 110, "", "Claude Opus 5.5", ["directors · decision memos"]);
  s += panel(1110, 420, 420, 110, "", "Claude Haiku 5.5", ["staff subagents · rivals"]);
  s += panel(1110, 670, 420, 110, "", "Claude Sonnet 5.5", ["election debrief"]);
  s += panel(1110, 800, 420, 110, "", "LangSmith", ["traces of LangChain runs"]);
  s += panel(1110, 970, 420, 90, "", "Gemini 3.8 Flash", []);
  s += T(1370, 1032, "Claude as fallback", { anchor: "start", size: 17 });
  s += line([[450, 350], [530, 350]]); s += note(490, 338, "snapshot");
  s += line([[530, 430], [450, 430]]); s += note(490, 452, "events");
  s += line([[530, 470], [490, 470], [490, 760], [456, 760]], { dash: true }); s += note(490, 620, "resolve()");
  s += line([[1050, 345], [1110, 345]]);
  s += line([[1050, 400], [1080, 400], [1080, 470], [1110, 470]]);
  s += line([[1050, 580], [1080, 580], [1080, 490], [1110, 490]]);
  s += line([[1050, 740], [1110, 725]]);
  s += line([[1050, 1015], [1110, 1015]]);
  s += line([[1050, 455], [1095, 455], [1095, 855], [1110, 855]], { dash: true });
  return svg(H, s);
}

function order() {
  const H = 1220;
  let s = head("Figure 3", "Processing of one staff order",
    "From the student's instruction to the report, as it runs in the War room.");
  const xs = [60, 570, 1080], w = 460;
  s += panel(xs[0], 270, w, 270, "1", "Instruction", ["The student writes an order to one director.", "Example: canvass our strongest districts,", "$25,000.", "Budget read from the text: $80,000 by", "default, at most $250,000."]);
  s += panel(xs[1], 270, w, 270, "2", "Context", ["Campaign snapshot from the browser: date,", "cash, polls, calendar, platform, voter", "groups and support in every district.", "`/memory/AGENTS.md  (12 lines at most)", "Action catalog with engine prices."]);
  s += panel(xs[2], 270, w, 270, "3", "Director", ["Plans the order and splits it into jobs.", "Assigns each job by role and strengths.", "`task  hand a job to a subagent", "`propose  2–3 priced options", "`send_report  close the order"], { strong: true, tag: "Opus · deep agent" });
  s += panel(xs[2], 600, w, 270, "4", "Team", ["One subagent per job, run in parallel.", "Isolated context: sees only its brief.", "Own prompt, in its own voice.", "`take_action { why, action, target }", "The reason is written before the choice."], { strong: true, tag: "Haiku · subagents" });
  s += panel(xs[1], 600, w, 270, "5", "Engine", ["`resolve(action)", "Refuses anything over the order budget.", "Prices the action from the catalog.", "Moves support in districts and groups.", "Returns the result and budget left."]);
  s += panel(xs[0], 600, w, 270, "6", "Report and guards", ["The director drafts the report.", "Number ledger: a figure the agent was", "never shown is sent back once, then cut.", "Hindsight filter: lines past the date are cut.", "The memory file records the order."]);
  s += line([[520, 405], [570, 405]]); s += line([[1030, 405], [1080, 405]]);
  s += line([[1310, 540], [1310, 600]]); s += note(1322, 576, "task × N", "start");
  s += line([[1080, 705], [1030, 705]]); s += note(1055, 690, "action");
  s += line([[1030, 765], [1080, 765]]); s += note(1055, 792, "result");
  s += line([[1310, 870], [1310, 905], [290, 905], [290, 874]], { dash: true }); s += note(800, 897, "jobs done → director → send_report");
  s += panel(60, 950, 1480, 210, "7", "Live view in the War room", []);
  ["thought", "delegate", "action", "job done", "report", "proposals"].forEach((e, i) => {
    const x = 88 + i * 146;
    s += `<rect x="${x}" y="1036" width="130" height="34" fill="none" stroke="${C.goldSoft}"/>` + T(x + 65, 1059, e, { size: 16, fill: C.gold });
  });
  s += T(88, 1112, "NDJSON events, streamed as each step happens", { anchor: "start", size: 16 });
  ["Thinking: each agent's reasoning, line by line", "Hand-offs drawn between director and team", "Report: spent, effects, money asked for", "Delegation grade: clarity, right people"]
    .forEach((v, i) => { s += T(1010, 1030 + i * 32, "·  " + v, { anchor: "start", size: 17, fill: C.ivory }); });
  return svg(H, s);
}

function recordVsSim() {
  const H = 860;
  let s = head("Figure 4", "Record and simulation, kept separate",
    "Every number on screen is labelled Real data or Simulated.");
  s += card(150, 270, 520, 330, "The record", ["polls · money · events · results", "55 sources, every fact cited", "", "never changes"], { strong: true, label: "Real data" });
  s += card(930, 270, 520, 330, "Your campaign", ["your choices · your staff's work", "rival moves · your weekly plan", "", "simulated by the engine"], { label: "Simulated" });
  s += line([[670, 400], [930, 400]], { dash: true });
  s += T(800, 384, "the engine is fitted to it", { font: SERIF, size: 20, italic: true });
  s += T(800, 440, "play the real choices,", { size: 18 });
  s += T(800, 462, "land on the real result", { size: 18 });
  s += rule(660);
  s += T(800, 716, "The agents never see how the race ended.", { font: SERIF, size: 30, fill: C.ivory });
  s += T(800, 756, "What the campaign really chose, how it turned out and what was said afterwards are kept out of every prompt.", { size: 19 });
  return svg(H, s);
}

function evals() {
  const H = 900;
  let s = head("Figure 6", "Evals: agent decisions against the record",
    "No student: an agent plays de Blasio, and each agent sees only what was known on the day.");
  const panel = (x, label, rows, note) => {
    let p = cap(x + 300, 290, label);
    rows.forEach(([t, v, n, col], i) => {
      const y = 340 + i * 150;
      p += T(x, y, t, { anchor: "start", size: 22, fill: C.ivory });
      p += `<rect x="${x}" y="${y + 22}" width="600" height="10" fill="${C.faint}"/><rect x="${x}" y="${y + 22}" width="${6 * v}" height="10" fill="${col}"/>`;
      p += T(x, y + 96, `${v}%`, { anchor: "start", font: SERIF, size: 54, fill: col });
      p += T(x + 135, y + 90, n, { anchor: "start", size: 19 });
    });
    p += T(x + 300, 680, note, { font: SERIF, size: 22, italic: true, fill: C.muted });
    return p;
  };
  s += panel(150, "Grounding · tuned set", [["Facts rewritten to point elsewhere: it moved", 78, "28 of 36", C.gold], ["Same facts, new words: it held", 94, "17 of 18", C.goldSoft]], "Choices change with the evidence, not the wording.");
  s += `<line x1="800" y1="280" x2="800" y2="700" stroke="${C.faint}"/>`;
  s += panel(850, "11 held-out decisions · run once", [["With the card: chose what really happened", 70, "23 of 33", C.ivory], ["Memory alone, no card", 67, "22 of 33", C.muted]], "On new decisions, the card adds little to memory.");
  s += rule(740);
  s += T(800, 796, "The model already knows this race, so plain agreement mostly measures memory.", { font: SERIF, size: 21, fill: C.ivory });
  s += T(800, 830, "We score whether choices follow the facts instead.", { font: SERIF, size: 21, fill: C.ivory });
  return svg(H, s);
}

function accuracy() {
  const H = 820;
  let s = head("Figure 5", "Simulated and certified vote share",
    "The real choices, replayed with rivals active and the default weekly plan. A test fails if any candidate drifts.");
  const rows = [["Bill de Blasio", 40.9, 40.81], ["Bill Thompson", 26.3, 26.14], ["Christine Quinn", 15.7, 15.74], ["John Liu", 6.7, 6.84], ["Anthony Weiner", 4.9, 4.94]];
  const x0 = 470, sc = 19;
  s += `<rect x="1180" y="262" width="14" height="14" fill="${C.gold}"/>` + T(1202, 276, "Certified", { anchor: "start", size: 19 });
  s += `<rect x="1310" y="262" width="14" height="14" fill="${C.ivory}" fill-opacity=".55"/>` + T(1332, 276, "Simulated", { anchor: "start", size: 19 });
  rows.forEach(([n, sim, cert], i) => {
    const y = 330 + i * 78;
    s += T(430, y + 22, n, { anchor: "end", font: SERIF, size: 24, fill: C.ivory });
    s += `<rect x="${x0}" y="${y}" width="${cert * sc}" height="12" fill="${C.gold}"/><rect x="${x0}" y="${y + 18}" width="${sim * sc}" height="12" fill="${C.ivory}" fill-opacity=".55"/>`;
    s += T(x0 + cert * sc + 18, y + 26, `${cert.toFixed(1)}%`, { anchor: "start", font: SERIF, size: 24, fill: C.gold });
  });
  const lx = x0 + 40 * sc;
  s += `<line x1="${lx}" y1="306" x2="${lx}" y2="712" stroke="${C.goldSoft}" stroke-dasharray="3 6"/>`;
  s += T(lx, 736, "40% wins outright", { font: SERIF, italic: true, size: 20, fill: C.goldSoft });
  s += T(800, 780, "The weakest choice at every decision, with no staff work, finishes third at 8.3%.", { size: 20 });
  return svg(H, s);
}

const figs = { loop, architecture, "one-order": order, "record-vs-simulation": recordVsSim, evals, accuracy };
for (const [name, fn] of Object.entries(figs)) writeFileSync(join(OUT, `${name}.svg`), fn());
console.log("wrote", Object.keys(figs).join(", "));
