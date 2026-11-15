// Builds the README figures as SVG in the app's black-and-gold palette.
// Run: node docs/readme/diagrams/build.mjs   (no dependencies)
// ponytail: hand-placed coordinates; edit a figure by editing its function below.
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = dirname(fileURLToPath(import.meta.url));
const C = {
  bg: "#0d0b08", panel: "#16130d", line: "#3a3224", gold: "#d9b45a", goldDim: "#8f7638",
  cream: "#efe6d2", muted: "#8b8070", blue: "#7d9bc4", green: "#86c08f", red: "#d0654a",
};
const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = "'Segoe UI', Inter, Helvetica, Arial, sans-serif";
const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function svg(w, h, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
<defs>
<marker id="a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="${C.gold}"/></marker>
<marker id="am" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="${C.muted}"/></marker>
<marker id="ab" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="${C.blue}"/></marker>
<marker id="ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="${C.red}"/></marker>
</defs>
<rect width="${w}" height="${h}" fill="${C.bg}"/>
<rect x="12" y="12" width="${w - 24}" height="${h - 24}" fill="none" stroke="${C.line}"/>
${body}</svg>\n`;
}

// Eyebrow + serif headline; wrap the accent words in *stars*.
function head(eyebrow, title, sub) {
  const parts = title.split("*").map((t, i) =>
    i % 2 ? `<tspan font-style="italic" fill="${C.gold}">${esc(t)}</tspan>` : esc(t)).join("");
  return `<text x="64" y="72" font-family="${MONO}" font-size="15" letter-spacing="3" fill="${C.muted}">${esc(eyebrow.toUpperCase())}</text>
<text x="64" y="128" font-family="${SERIF}" font-size="44" fill="${C.cream}">${parts}</text>
${sub ? `<text x="64" y="166" font-family="${SANS}" font-size="19" fill="${C.muted}">${esc(sub)}</text>` : ""}`;
}

const KIND = {
  code: { stroke: C.cream, fill: C.panel, title: C.cream },
  model: { stroke: C.gold, fill: "#2a2210", title: C.gold },
  record: { stroke: C.gold, fill: "#2a2210", title: C.gold },
  sim: { stroke: C.blue, fill: "#141b26", title: C.blue },
  ext: { stroke: C.muted, fill: C.panel, title: C.cream, dash: "6 5" },
  dark: { stroke: C.gold, fill: "#050403", title: C.cream },
  red: { stroke: C.red, fill: "#251310", title: C.red, dash: "6 5" },
};

// A box with an optional mono tag chip, a title and up to three sub lines.
function box(x, y, w, h, { tag, title, sub = [], kind = "code", size = 21, center = true } = {}) {
  const k = KIND[kind];
  const cx = center ? x + w / 2 : x + 20;
  const anchor = center ? "middle" : "start";
  const lines = [].concat(sub);
  const top = y + h / 2 - (lines.length * 22) / 2 + (tag ? 15 : 4);
  let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="${k.fill}" stroke="${k.stroke}" stroke-width="1.6"${k.dash ? ` stroke-dasharray="${k.dash}"` : ""}/>`;
  if (tag) s += `<rect x="${x + 10}" y="${y + 10}" width="${tag.length * 9 + 14}" height="20" rx="3" fill="none" stroke="${k.stroke}" stroke-opacity=".6"/><text x="${x + 17}" y="${y + 24}" font-family="${MONO}" font-size="12" letter-spacing="1" fill="${k.stroke}">${esc(tag.toUpperCase())}</text>`;
  s += `<text x="${cx}" y="${top}" text-anchor="${anchor}" font-family="${SANS}" font-weight="600" font-size="${size}" fill="${k.title}">${esc(title)}</text>`;
  lines.forEach((l, i) => { s += `<text x="${cx}" y="${top + 26 + i * 22}" text-anchor="${anchor}" font-family="${MONO}" font-size="14" fill="${C.muted}">${esc(l)}</text>`; });
  return s;
}

function group(x, y, w, h, label, color = C.line) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="#120f0a" stroke="${color}" stroke-dasharray="4 5"/>
<text x="${x + 18}" y="${y + 28}" font-family="${MONO}" font-size="13" letter-spacing="2" fill="${C.muted}">${esc(label.toUpperCase())}</text>`;
}

// Polyline arrow with an optional mono label at a given point.
function arrow(pts, { color = "gold", dash, label, lx, ly, both } = {}) {
  const col = { gold: C.gold, muted: C.muted, blue: C.blue, red: C.red }[color];
  const mk = { gold: "a", muted: "am", blue: "ab", red: "ar" }[color];
  const d = pts.map((p, i) => `${i ? "L" : "M"}${p[0]},${p[1]}`).join(" ");
  let s = `<path d="${d}" fill="none" stroke="${col}" stroke-width="1.6"${dash ? ` stroke-dasharray="${dash}"` : ""} marker-end="url(#${mk})"${both ? ` marker-start="url(#${mk})"` : ""}/>`;
  if (label) s += lbl(lx, ly, label, col);
  return s;
}
function lbl(x, y, t, col = C.muted, anchor = "middle") {
  const w = t.length * 8.4 + 14;
  const rx = anchor === "middle" ? x - w / 2 : x - 7;
  return `<rect x="${rx}" y="${y - 14}" width="${w}" height="20" fill="${C.bg}"/><text x="${x}" y="${y}" text-anchor="${anchor}" font-family="${MONO}" font-size="13" letter-spacing="1" fill="${col}">${esc(t.toUpperCase())}</text>`;
}
function text(x, y, t, { size = 16, fill = C.muted, font = SANS, anchor = "start", weight = 400, italic } = {}) {
  return `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="${font}" font-size="${size}" font-weight="${weight}"${italic ? ' font-style="italic"' : ""} fill="${fill}">${esc(t)}</text>`;
}
function legend(y, items) {
  let x = 64, s = `<line x1="64" y1="${y - 26}" x2="1536" y2="${y - 26}" stroke="${C.line}"/>`;
  for (const [kind, label] of items) {
    if (kind.startsWith("line")) {
      const [, color, dash] = kind.split(":");
      s += `<line x1="${x}" y1="${y - 5}" x2="${x + 34}" y2="${y - 5}" stroke="${C[color]}" stroke-width="1.6"${dash ? ' stroke-dasharray="6 5"' : ""}/>`;
    } else {
      const k = KIND[kind];
      s += `<rect x="${x}" y="${y - 14}" width="34" height="18" rx="3" fill="${k.fill}" stroke="${k.stroke}"${k.dash ? ` stroke-dasharray="${k.dash}"` : ""}/>`;
    }
    s += text(x + 44, y, label.toUpperCase(), { font: MONO, size: 13 });
    x += 44 + label.length * 8.6 + 40;
  }
  return s;
}

// ---------------------------------------------------------------- figures

function loop() {
  const W = 1600, H = 1000, cx = 800, cy = 560, rx = 360, ry = 290;
  const at = deg => [cx + rx * Math.cos(deg * Math.PI / 180), cy + ry * Math.sin(deg * Math.PI / 180)];
  const nodes = [
    [-90, "A real decision", ["its real date · the clock stops"], "code"],
    [-18, "You decide", ["two staff memos argue", "chips preview direction"], "code"],
    [54, "What the real campaign did", ["shown only after you choose"], "record"],
    [126, "The calendar runs", ["you direct live staff", "rivals move · money moves"], "sim"],
    [198, "The morning paper", ["the real headline, cited", "your story, simulated"], "code"],
  ];
  let s = head("Campaign Academy · the student's loop", "Six times, the clock stops on *a real decision*",
    "The 2013 calendar runs day by day. At each moment the real campaign had to choose, you choose instead.");
  // arcs between nodes
  for (let i = 0; i < nodes.length; i++) {
    const a1 = nodes[i][0] + 13, a2 = (i + 1 < nodes.length ? nodes[i + 1][0] : nodes[0][0] + 360) - 13;
    const steps = 24, pts = [];
    for (let j = 0; j <= steps; j++) pts.push(at(a1 + (a2 - a1) * j / steps));
    s += arrow(pts, { color: "muted" });
  }
  s += lbl(at(-54)[0] + 60, at(-54)[1] - 20, "× 6 decisions", C.gold);
  // centre
  s += box(cx - 170, cy - 60, 340, 120, { title: "The 2013 record", sub: ["55 sources · every fact cited", "polls · money · events · voters"], kind: "dark", size: 26 });
  for (const deg of [-90, 54, 198]) {
    const [x, y] = at(deg);
    const sx = cx + (x - cx) * 0.36, sy = cy + (y - cy) * 0.36;
    const ex = cx + (x - cx) * 0.74, ey = cy + (y - cy) * 0.74;
    s += arrow([[sx, sy], [ex, ey]], { dash: "5 5" });
  }
  s += lbl(cx + 6, cy - 128, "sourced facts", C.goldDim);
  for (const [deg, title, sub, kind] of nodes) {
    const [x, y] = at(deg);
    s += box(x - 160, y - 46, 320, 92, { title, sub, kind });
  }
  // entry and exit
  s += box(70, 210, 260, 84, { title: "Briefing", sub: ["27 Jan 2013 · you start fourth"], kind: "ext" });
  s += arrow([[330, 252], [cx - 168, at(-90)[1]]], { color: "muted" });
  const cal = at(126);
  s += box(70, 800, 300, 96, { title: "Election night", sub: ["10 Sep 2013 · 65 districts", "then the certified result"], kind: "record" });
  s += arrow([[cal[0] - 160, cal[1] + 20], [372, 848]], { color: "gold", label: "after decision 6", lx: 470, ly: 834 });
  s += legend(H - 40, [["code", "What you see"], ["record", "From the record"], ["sim", "Simulated"], ["line:gold:d", "Feeds facts"]]);
  return svg(W, H, s);
}

function architecture() {
  const W = 1600, H = 1060;
  let s = head("Campaign Academy · system architecture", "One browser, one Next.js server, *live agents* behind every screen",
    "The game state lives in the browser. Each request sends a snapshot; the server keeps nothing between orders.");
  s += group(50, 200, 430, 720, "Browser · the game");
  s += group(520, 200, 560, 720, "Next.js API routes · the agents");
  s += group(1120, 200, 430, 720, "Models and services");
  // browser
  s += box(80, 250, 370, 110, { tag: "UI", title: "Five screens + the paper", sub: ["Case · Profile · War room", "Map · Factions"] });
  s += box(80, 400, 370, 100, { tag: "state", title: "Case store + clock", sub: ["zustand · saves itself", "one day at a time"] });
  s += box(80, 540, 370, 110, { tag: "engine", title: "Rules engine", sub: ["simulate() is pure", "fitted to the 2013 result"] });
  s += box(80, 690, 370, 100, { tag: "fallback", title: "Rules fallbacks", sub: ["same events, no key needed"], kind: "ext" });
  s += box(80, 820, 370, 76, { title: "Photon iMessage", sub: ["staff text your phone"], kind: "ext", size: 18 });
  s += arrow([[265, 360], [265, 400]], { both: true });
  s += arrow([[265, 500], [265, 540]]);
  // server
  s += box(550, 250, 500, 120, { tag: "deep agent", title: "Staff: /api/staff/instruct", sub: ["one director per order, own team as subagents", "task · take_action · send_report · propose"], kind: "model" });
  s += box(550, 395, 500, 90, { tag: "deep agent", title: "Rival campaigns ×4", sub: ["make_move · in parallel after each decision"], kind: "model" });
  s += box(550, 510, 500, 90, { tag: "deep agent", title: "End-of-election debrief", sub: ["read-only virtual filesystem · 7 subagents"], kind: "model" });
  s += box(550, 625, 500, 90, { tag: "single calls", title: "Memos · planks · remarks · hiring", sub: ["ChatAnthropic, one call each"] });
  s += box(550, 740, 500, 90, { tag: "paper", title: "Newsroom + stances", sub: ["lib/paper/model.ts"] });
  s += box(550, 850, 500, 56, { title: "Guards on every reply: no invented numbers · no hindsight", kind: "red", size: 16 });
  // models
  s += box(1150, 250, 370, 90, { title: "Claude Opus 5.5", sub: ["directors · memos"], kind: "model" });
  s += box(1150, 360, 370, 90, { title: "Claude Haiku 5.5", sub: ["staff subagents · rivals"], kind: "model" });
  s += box(1150, 470, 370, 90, { title: "Claude Sonnet 5.5", sub: ["the debrief agent"], kind: "model" });
  s += box(1150, 600, 370, 90, { title: "Gemini 3.8 Flash", sub: ["the paper · Claude if it fails"], kind: "model" });
  s += box(1150, 730, 370, 90, { title: "LangSmith", sub: ["traces every LangChain run"], kind: "ext" });
  s += box(1150, 840, 370, 66, { title: "Photon Spectrum", sub: ["iMessage line"], kind: "ext", size: 18 });
  // flows
  s += arrow([[450, 290], [550, 290]], { label: "snapshot", lx: 500, ly: 280 });
  s += arrow([[550, 335], [450, 335]], { color: "muted", label: "ndjson", lx: 500, ly: 328 });
  s += arrow([[1050, 300], [1150, 295]]);
  s += arrow([[1050, 440], [1150, 405]]);
  s += arrow([[1050, 555], [1150, 515]]);
  s += arrow([[1050, 785], [1150, 645]]);
  s += arrow([[1050, 330], [1100, 330], [1100, 775], [1150, 775]], { color: "muted", dash: "5 5" });
  s += arrow([[550, 360], [500, 360], [500, 595], [450, 595]], { color: "muted", dash: "5 5", label: "take_action → engine", lx: 500, ly: 480 });
  s += legend(H - 40, [["code", "Our code"], ["model", "Live model / deep agent"], ["ext", "Service or fallback"], ["red", "Guard"], ["line:gold", "Request"], ["line:muted:d", "Tool call / trace"]]);
  return svg(W, H, s);
}

function order() {
  const W = 1600, H = 1180;
  const lanes = [["Student", C.cream], ["War room", C.cream], ["Director", C.gold], ["Team", C.gold], ["Engine", C.blue], ["Guards", C.red]];
  const sub = ["browser", "browser", "Opus deep agent", "Haiku subagents", "lib/engine", "numbers · hindsight"];
  const X = lanes.map((_, i) => 210 + i * 236);
  let s = head("Campaign Academy · one order, end to end", "Plain English in, *a team at work*, real engine numbers out",
    "Measured on a live run: a director's order takes 10–24 s; four directors in parallel about 20 s.");
  lanes.forEach(([n, col], i) => {
    s += box(X[i] - 110, 200, 220, 70, { title: n, sub: [sub[i]], kind: i < 2 ? "code" : i < 4 ? "model" : i === 4 ? "sim" : "red", size: 19 });
    s += `<line x1="${X[i]}" y1="270" x2="${X[i]}" y2="${H - 90}" stroke="${C.line}" stroke-dasharray="3 6"/>`;
  });
  const msgs = [
    [0, 1, "“Canvass Black voters in Crown Heights and Flatbush, $25,000”", "gold"],
    [1, 2, "POST snapshot + order budget", "gold"],
    [2, 2, "reads the campaign + /memory/AGENTS.md", "muted"],
    [2, 3, "task(“doors in Crown Heights”) ∥ task(“calls in Flatbush”)", "gold"],
    [3, 4, "take_action(why, canvass, district)", "blue"],
    [4, 3, "priced · scored · budget left", "blue"],
    [3, 2, "job done", "muted"],
    [2, 5, "send_report draft", "gold"],
    [5, 2, "unknown figure → sent back once · future → dropped", "red"],
    [2, 1, "stream: thought · delegate · action · report", "muted"],
    [1, 0, "“Spent $24,300 · Crown Heights +4.1 · Flatbush +1.2”", "gold"],
  ];
  let y = 330;
  for (const [a, b, label, col] of msgs) {
    if (a === b) {
      s += arrow([[X[a], y - 8], [X[a] + 60, y - 8], [X[a] + 60, y + 16], [X[a] + 6, y + 16]], { color: col });
      s += text(X[a] + 72, y + 9, label, { font: MONO, size: 14, fill: C.muted });
    } else {
      const dir = b > a ? 1 : -1;
      s += arrow([[X[a] + dir * 6, y], [X[b] - dir * 6, y]], { color: col });
      const mid = (X[a] + X[b]) / 2;
      s += text(mid, y - 12, label, { font: MONO, size: 14, fill: col === "muted" ? C.muted : { gold: C.gold, blue: C.blue, red: C.red }[col], anchor: "middle" });
    }
    y += 62;
  }
  s += box(90, y + 6, 1420, 64, { title: "What the student reads: the reasoning live under Thinking, the money spent, what moved, and a delegation grade (clarity, right people)", kind: "ext", size: 16 });
  s += legend(H - 40, [["model", "Live agent"], ["sim", "Rules engine"], ["red", "Guard"], ["line:gold", "Order / tool call"], ["line:blue", "Engine result"]]);
  return svg(W, H, s);
}

function recordVsSim() {
  const W = 1600, H = 960;
  let s = head("Campaign Academy · honesty by design", "What *happened* stays apart from what *you* did",
    "Every number on screen is tagged Real data or Simulated. The engine is fitted to the record, never the other way round.");
  s += group(50, 200, 520, 600, "The record · sourced", C.goldDim);
  s += group(1030, 200, 520, 600, "The simulation · fitted", "#3c4c63");
  const rec = [["Polls", "Quinnipiac · Marist, 2013"], ["Money and rules", "filings · $6.4M cap · 6-to-1 match"], ["Events and press", "real headlines, paraphrased"], ["Results", "certified, by Assembly District"], ["Real staff", "named only where sourced"]];
  rec.forEach(([t, u], i) => { s += box(80, 250 + i * 104, 460, 84, { title: t, sub: [u], kind: "record", size: 19 }); });
  const sim = [["Your six choices", "and their price"], ["Staff work", "every live agent action"], ["Weekly plan", "eight actions, every 7 days"], ["Rival moves", "four rival agents"], ["Your planks", "groups served and cost"]];
  sim.forEach(([t, u], i) => { s += box(1060, 250 + i * 104, 460, 84, { title: t, sub: [u], kind: "sim", size: 19 }); });
  s += box(650, 330, 300, 120, { tag: "engine", title: "simulate()", sub: ["picks + work in", "a world out"], size: 24 });
  s += box(650, 560, 300, 120, { title: "Every screen", sub: ["Real data · cited", "Simulated · tagged"], kind: "dark", size: 24 });
  s += arrow([[540, 300], [650, 370]], { label: "starting world", lx: 595, ly: 318 });
  s += arrow([[540, 510], [650, 420]], { dash: "5 5", label: "fitted to", lx: 590, ly: 480 });
  s += arrow([[1060, 400], [950, 390]], { color: "blue" });
  s += arrow([[800, 450], [800, 560]]);
  s += arrow([[540, 720], [650, 650]], { label: "citations", lx: 590, ly: 704 });
  s += box(80, 830, 1440, 66, { title: "Never in any agent prompt: what the campaign really chose, how it turned out, what was said afterwards", sub: [], kind: "red", size: 18 });
  s += legend(H - 24, [["record", "Real data"], ["sim", "Simulated"], ["red", "Walled off from agents"]]);
  return svg(W, H, s);
}

function evals() {
  const W = 1600, H = 820;
  let s = head("Campaign Academy · evals (#28)", "The agents *follow the facts*. Past memory, they add *little*.",
    "No student: an agent plays de Blasio, live agents play everyone else, and each sees only facts dated before the decision.");
  const x0 = 520, scale = 9.2;
  const bars = [
    ["Grounding · tuned set, run 7", null],
    ["Facts rewritten to point away: moved", 78, "28 of 36", C.gold],
    ["Control, same facts reworded: held", 94, "17 of 18", C.goldDim],
    ["Held out · 11 new decisions, run once", null],
    ["On the card: chose what really happened", 70, "23 of 33", C.blue],
    ["Memory alone, no card", 67, "22 of 33", "#4c5d78"],
  ];
  let y = 240;
  for (const [label, v, n, col] of bars) {
    if (v === null) { s += text(64, y + 6, label.toUpperCase(), { font: MONO, size: 14, fill: C.muted }); y += 36; continue; }
    s += text(64, y + 26, label, { size: 19, fill: C.cream });
    s += `<rect x="${x0}" y="${y}" width="${100 * scale}" height="38" fill="#1a160f"/><rect x="${x0}" y="${y}" width="${v * scale}" height="38" fill="${col}"/>`;
    s += text(x0 + v * scale + 14, y + 27, `${v}%`, { font: SERIF, size: 26, fill: C.cream });
    s += text(x0 + v * scale + 82, y + 26, n, { font: MONO, size: 14 });
    y += 64;
  }
  const chanceX = x0 + 24 * scale;
  s += `<line x1="${chanceX}" y1="${452}" x2="${chanceX}" y2="${y - 16}" stroke="${C.muted}" stroke-dasharray="4 4"/>`;
  s += text(chanceX + 6, y + 6, "chance ≈ 24%", { font: MONO, size: 13 });
  y += 40;
  s += `<line x1="64" y1="${y}" x2="1536" y2="${y}" stroke="${C.line}"/>`;
  const notes = [
    ["Memory wrong, card right", "11 of 11 on the tuned set (all at the second ad) · 2 of 11 held out"],
    ["Why not plain agreement", "with no card at all, the model names the real choice at 5 of 6 decisions"],
    ["Whole campaign, no student", "6 of 6 real choices · 32 weekly meetings · 294 staff jobs"],
  ];
  notes.forEach(([a, b], i) => {
    s += text(64, y + 44 + i * 40, a, { size: 18, fill: C.gold, weight: 600 });
    s += text(400, y + 44 + i * 40, b, { size: 18, fill: C.cream });
  });
  return svg(W, H, s);
}

function accuracy() {
  const W = 1600, H = 720;
  let s = head("Campaign Academy · the engine fit", "Play the real choices and you land *on the real result*",
    "The six real choices, the rivals acting and the default weekly plan, against the certified count. npm run check:engine fails if this drifts.");
  const rows = [["Bill de Blasio", 40.9, 40.81], ["Bill Thompson", 26.3, 26.14], ["Christine Quinn", 15.7, 15.74], ["John Liu", 6.7, 6.84], ["Anthony Weiner", 4.9, 4.94]];
  const x0 = 380, scale = 22;
  let y = 230;
  for (const [n, sim, cert] of rows) {
    s += text(64, y + 30, n, { size: 21, fill: C.cream });
    s += `<rect x="${x0}" y="${y}" width="${cert * scale}" height="20" fill="${C.gold}"/><rect x="${x0}" y="${y + 24}" width="${sim * scale}" height="20" fill="${C.blue}"/>`;
    s += text(x0 + cert * scale + 12, y + 16, `${cert.toFixed(2)}% certified`, { font: MONO, size: 14, fill: C.gold });
    s += text(x0 + sim * scale + 12, y + 40, `${sim.toFixed(1)}% simulated`, { font: MONO, size: 14, fill: C.blue });
    y += 76;
  }
  const line = x0 + 40 * scale;
  s += `<line x1="${line}" y1="210" x2="${line}" y2="${y - 10}" stroke="${C.red}" stroke-dasharray="5 5"/>`;
  s += text(line + 8, 206, "40% · win outright", { font: MONO, size: 13, fill: C.red });
  s += text(64, y + 26, "And you can lose: the weakest choice at every decision, with no staff work, finishes third at 8.3%.", { size: 18, fill: C.muted });
  return svg(W, H, s);
}

const figs = { loop, architecture, "one-order": order, "record-vs-simulation": recordVsSim, evals, accuracy };
for (const [name, fn] of Object.entries(figs)) writeFileSync(join(OUT, `${name}.svg`), fn());
console.log("wrote", Object.keys(figs).join(", "));
