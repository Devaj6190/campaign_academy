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
const cap = (x, y, t, fill = C.goldSoft, anchor = "middle") => T(x, y, t.toUpperCase(), { size: 18, spacing: 4, fill, anchor });

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

// A code chip under a card: gold monospace in a hairline frame.
function chip(cx, y, t) {
  const w = t.length * 12 + 36;
  return `<rect x="${cx - w / 2}" y="${y}" width="${w}" height="40" fill="${C.bg}" stroke="${C.goldSoft}"/>` +
    T(cx, y + 27, t, { size: 20, fill: C.gold, font: "Consolas, Menlo, monospace" });
}
const note = (x, y, t) => T(x, y, t, { font: SERIF, size: 20, italic: true, fill: C.muted });

function architecture() {
  const H = 1080, w = 380, xs = [90, 610, 1130], bh = 120, step = 150;
  let s = head("Figure 2", "System architecture");
  ["Browser", "Server", "Models"].forEach((c, i) => { s += cap(xs[i] + w / 2, 250, c); });
  const col = (x, items, top = 280) => items.forEach(([t, l, strong], i) => { s += card(x, top + i * step, w, bh, t, [l], { strong }); });
  col(xs[0], [["Screens", "six views"], ["Campaign state", "saved in the browser"], ["Simulation engine", "simulate()", true], ["Rules fallback", "runs with no API key"]], 355);
  col(xs[1], [["Staff agents", "director + team", true], ["Rival agents", "one per rival", true], ["Debrief agent", "after election night", true], ["Memos and planks", "single model calls"], ["Morning paper", "stories and stances"]]);
  col(xs[2], [["Claude Opus", "directors · memos"], ["Claude Haiku", "staff · rivals"], ["Claude Sonnet", "debrief"], ["LangSmith", "traces"], ["Gemini", "the paper"]]);
  const R = xs[0] + w, L = xs[1], R2 = xs[1] + w, L3 = xs[2];
  s += line([[R, 395], [L, 325]]); s += note((R + L) / 2, 340, "snapshot");
  s += line([[L, 370], [R, 435]]); s += note((R + L) / 2, 440, "events");
  s += line([[L, 380], [L - 50, 380], [L - 50, 715], [R, 715]], { dash: true }); s += note(L - 70, 600, "resolve()");
  s += line([[R2, 330], [L3, 330]]);
  s += line([[R2, 360], [L3, 470]]);
  s += line([[R2, 490], [L3, 490]]);
  s += line([[R2, 640], [L3, 640]]);
  s += line([[R2, 920], [L3, 920]]);
  s += line([[R2, 395], [L3 - 70, 395], [L3 - 70, 790], [L3, 790]], { dash: true });
  return svg(H, s);
}

function order() {
  const H = 1140, w = 400, xs = [120, 600, 1080], bh = 170;
  let s = head("Figure 3", "Processing of one staff order");
  const step = (i, x, y, t, l, code, strong) => {
    s += card(x, y, w, bh, t, [l], { strong });
    s += num(x + w / 2, y, String(i));
    if (code) s += chip(x + w / 2, y + bh - 20, code);
  };
  step(1, xs[0], 260, "Instruction", "an order and a budget");
  step(2, xs[1], 260, "Context", "a snapshot of the campaign", "AGENTS.md");
  step(3, xs[2], 260, "Director", "plans and assigns jobs", "task", true);
  step(4, xs[2], 560, "Team", "subagents, in parallel", "take_action", true);
  step(5, xs[1], 560, "Engine", "prices and scores", "resolve()");
  step(6, xs[0], 560, "Report", "checked, then sent", "send_report");
  s += line([[xs[0] + w, 345], [xs[1], 345]]); s += line([[xs[1] + w, 345], [xs[2], 345]]);
  s += line([[xs[2] + w / 2, 470], [xs[2] + w / 2, 538]]);
  s += line([[xs[2], 645], [xs[1] + w, 645]]); s += line([[xs[1], 645], [xs[0] + w, 645]]);
  s += T(xs[2] + w / 2 + 120, 255 - 0, "Claude Opus", { font: SERIF, size: 20, italic: true, fill: C.goldSoft, anchor: "end" }).replace(`x="${xs[2] + w / 2 + 120}"`, `x="${xs[2] + w}"`);
  s += T(xs[2] + w, 555, "Claude Haiku", { font: SERIF, size: 20, italic: true, fill: C.goldSoft, anchor: "end" });
  // live view
  s += `<rect x="120" y="860" width="1360" height="200" fill="#1d180f" stroke="${C.gold}" stroke-width="1.5"/>`;
  s += num(800, 860, "7");
  s += T(800, 925, "Live in the War room", { font: SERIF, size: 31, fill: C.gold });
  const ev = ["thought", "delegate", "action", "job done", "report"];
  ev.forEach((e, i) => { s += chip(800 + (i - 2) * 230, 965, e); });
  s += line([[xs[0] + w / 2, 768], [xs[0] + w / 2, 838]], { dash: true });
  s += line([[xs[2] + w / 2, 768], [xs[2] + w / 2, 838]], { dash: true });
  s += note(800, 815, "every step is streamed as it happens");
  return svg(H, s);
}

function recordVsSim() {
  const H = 760;
  let s = head("Figure 4", "Record and simulation, kept separate");
  s += card(170, 270, 500, 220, "The record", ["real data, cited"], { strong: true });
  s += card(930, 270, 500, 220, "The simulation", ["your campaign"]);
  s += line([[930, 380], [670, 380]], { dash: true }); s += note(800, 362, "fitted to");
  s += rule(570);
  s += T(800, 650, "Agents never see how the race ended.", { font: SERIF, size: 34, fill: C.ivory });
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
