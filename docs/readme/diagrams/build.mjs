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
  let s = head("How a student plays", "Six times, the clock stops on *a real decision*",
    "The 2013 calendar runs day by day. Where the real campaign had to choose, you choose.");
  s += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${C.faint}"/>`;
  const nodes = [
    [-90, "A real decision", ["on its real date"]],
    [0, "You choose", ["your staff argue the options"]],
    [90, "History revealed", ["what the real campaign did"]],
    [180, "The campaign runs", ["direct staff · rivals move"]],
  ];
  const at = a => [cx + r * Math.cos(a * Math.PI / 180), cy + r * Math.sin(a * Math.PI / 180)];
  for (let i = 0; i < 4; i++) {
    const [x1, y1] = at(nodes[i][0] + 26), [x2, y2] = at(nodes[i][0] + 64);
    s += `<path d="M${x1},${y1} A${r},${r} 0 0 1 ${x2},${y2}" fill="none" stroke="${C.goldSoft}" stroke-width="1.3" marker-end="url(#h)"/>`;
  }
  s += `<circle cx="${cx}" cy="${cy}" r="96" fill="#1d180f" stroke="${C.gold}"/>`;
  s += T(cx, cy - 4, "× 6", { font: SERIF, size: 52, fill: C.gold });
  s += cap(cx, cy + 34, "real decisions", C.goldSoft);
  for (const [a, t, l] of nodes) { const [x, y] = at(a); s += card(x - 160, y - 56, 320, 112, t, l); }
  s += T(250, 300, "Begin", { font: SERIF, size: 20, italic: true, fill: C.goldSoft });
  s += T(250, 336, "27 January 2013", { font: SERIF, size: 26, fill: C.ivory });
  s += T(250, 364, "you start fourth", { size: 20 });
  s += line([[355, 330], [cx - 175, at(-90)[1]]]);
  s += T(1350, 840, "End", { font: SERIF, size: 20, italic: true, fill: C.goldSoft });
  s += T(1350, 876, "10 September 2013", { font: SERIF, size: 26, fill: C.ivory });
  s += T(1350, 904, "your result beside the real one", { size: 20 });
  s += line([[at(90)[0] + 165, at(90)[1] + 20], [1220, 868]]);
  return svg(H, s);
}

function architecture() {
  const H = 900;
  let s = head("How it is built", "The game in the browser, *live agents* on the server",
    "Every live part has a rules fallback, so the app runs even with no API key.");
  const cols = [
    [110, "In the browser", [["The game", "case file · clock · saves itself"], ["The rules engine", "prices and scores every action"]]],
    [600, "On our server", [["Staff agents", "a director and their team"], ["Rival agents", "Quinn · Thompson · Liu · Weiner"], ["Debrief agent", "reviews your whole campaign"]]],
    [1090, "The models", [["Claude", "Opus · Sonnet · Haiku"], ["Gemini", "writes the morning paper"], ["LangSmith", "traces every agent run"]]],
  ];
  for (const [x, label, items] of cols) {
    s += cap(x + 200, 290, label);
    s += `<line x1="${x + 120}" y1="306" x2="${x + 280}" y2="306" stroke="${C.goldDeep}"/>`;
    const n = items.length, gap = 26, h = 128, top = 340 + (3 - n) * (h + gap) / 2;
    items.forEach(([t, l], i) => { s += card(x, top + i * (h + gap), 400, h, t, [l], { strong: x === 600 }); });
  }
  s += line([[516, 470], [594, 470]]);
  s += line([[594, 560], [516, 560]]);
  s += T(555, 456, "state", { size: 15, italic: true, font: SERIF });
  s += T(555, 586, "actions", { size: 15, italic: true, font: SERIF });
  for (const y of [404, 558, 712]) s += line([[1006, y], [1084, y]]);
  s += rule(820);
  s += T(800, 856, "No model ever sets a poll number, a cost or an effect. The engine does.", { font: SERIF, size: 23, italic: true, fill: C.ivory });
  return svg(H, s);
}

function order() {
  const H = 860;
  let s = head("One order, end to end", "You give an order. *A team* does the work.",
    "A live run in the War room takes about 10 to 24 seconds.");
  const steps = [
    ["You", ["type an order", "in plain English"]],
    ["The director", ["plans it and splits", "it into jobs"]],
    ["The team", ["each takes a job,", "all at once"]],
    ["The engine", ["prices and scores", "every action"]],
    ["The report", ["checked, then", "streamed back"]],
  ];
  const w = 250, gap = 34, x0 = (W - (steps.length * w + (steps.length - 1) * gap)) / 2;
  steps.forEach(([t, l], i) => {
    const x = x0 + i * (w + gap);
    s += card(x, 300, w, 190, t, l, { strong: i === 1 || i === 2 });
    s += num(x + w / 2, 300, String(i + 1));
    if (i < steps.length - 1) s += line([[x + w + 6, 395], [x + w + gap - 6, 395]]);
  });
  const sub = ["", "Claude Opus deep agent", "Claude Haiku subagents", "same rules as the game", "two guards"];
  sub.forEach((t, i) => { if (t) s += cap(x0 + i * (w + gap) + w / 2, 524, t, C.muted); });
  s += rule(580);
  s += cap(800, 630, "An example from a live run");
  s += T(800, 680, "“Canvass Black voters in Crown Heights and Flatbush this week, $25,000.”", { font: SERIF, size: 24, italic: true, fill: C.ivory });
  s += T(800, 724, "The Field Director sends one organizer to knock doors and another to run phone calls.", { size: 21 });
  s += T(800, 754, "Spent $24,300 · Crown Heights +4.1 · Flatbush +1.2", { font: SERIF, size: 22, fill: C.gold });
  s += T(800, 800, "The guards: a number the agent was never shown is sent back; anything from after the game's date is cut.", { size: 19 });
  return svg(H, s);
}

function recordVsSim() {
  const H = 860;
  let s = head("Honest by design", "What *happened*, kept apart from what *you* did",
    "Every number on screen is labelled Real data or Simulated.");
  s += card(150, 270, 520, 330, "The record", ["polls · money · events · results", "55 sources, every fact cited", "", "never changes"], { strong: true, label: "Real data" });
  s += card(930, 270, 520, 330, "Your campaign", ["your choices · your staff's work", "rival moves · your weekly plan", "", "simulated by the engine"], { label: "Simulated" });
  s += line([[670, 400], [930, 400]], { dash: true });
  s += T(800, 384, "the engine is fitted to it", { font: SERIF, size: 20, italic: true });
  s += T(800, 440, "play the real choices,", { size: 18 });
  s += T(800, 462, "land on the real result", { size: 18 });
  s += rule(660);
  s += T(800, 716, "The agents never see how 2013 ended.", { font: SERIF, size: 30, fill: C.ivory });
  s += T(800, 756, "What the campaign really chose, how it turned out and what was said afterwards are kept out of every prompt.", { size: 19 });
  return svg(H, s);
}

function evals() {
  const H = 900;
  let s = head("Evals", "The agents *follow the facts* on the card",
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
  s += panel(150, "Grounding · tuned set", [["Facts rewritten to point elsewhere: it moved", 78, "28 of 36", C.gold], ["Same facts, new words: it held", 94, "17 of 18", C.goldSoft]], "It reacts to evidence, not wording.");
  s += `<line x1="800" y1="280" x2="800" y2="700" stroke="${C.faint}"/>`;
  s += panel(850, "11 held-out decisions · run once", [["With the card: chose what really happened", 70, "23 of 33", C.ivory], ["Memory alone, no card", 67, "22 of 33", C.muted]], "On new decisions, the card adds little to memory.");
  s += rule(740);
  s += T(800, 796, "The model already knows this race, so plain agreement mostly measures memory.", { font: SERIF, size: 21, fill: C.ivory });
  s += T(800, 830, "We score whether choices follow the facts instead.", { font: SERIF, size: 21, fill: C.ivory });
  return svg(H, s);
}

function accuracy() {
  const H = 820;
  let s = head("The simulation", "Play the real choices, land on *the real result*",
    "Every candidate within 0.2 points of the certified count. A test fails if it drifts.");
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
  s += T(800, 780, "And you can lose: the weakest choices with no staff work finish third, at 8.3%.", { size: 20 });
  return svg(H, s);
}

const figs = { loop, architecture, "one-order": order, "record-vs-simulation": recordVsSim, evals, accuracy };
for (const [name, fn] of Object.entries(figs)) writeFileSync(join(OUT, `${name}.svg`), fn());
console.log("wrote", Object.keys(figs).join(", "));
