// npm run refit:case — refit the case's own shifts so the real campaign's choices land on the certified result
// with the rivals (rules mode) and the typical staff plan running (issue #35).
//
// The record's shifts already contain what the real rivals and staff did, and the game also runs rival agents and
// staff work, so the same effect would count twice. This measures each candidate's gap to the certified result and
// spreads the correction evenly over the stretches where the world moves on its own: each decision's `since.shift`
// and the closing `close.shift` in src/lib/cases/mayor2013.ts. It repeats until every gap is under TARGET.
//
// Run it after anything that changes what rival moves or staff work are worth (SCALE, STAFF_CAP, RIVAL_CAP, CONTEST,
// the rules planner, TYPICAL_STAFF) or the case's shifts, then run `npm run check:engine`.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createJiti } from "jiti";

const FILE = fileURLToPath(new URL("../src/lib/cases/mayor2013.ts", import.meta.url));
const TARGET = 0.25;
const ROUNDS = 6;
// A candidate's correction goes only into stretches where they are in the race: Weiner enters at the "weiner" decision.
const SKIP = { weiner: ["weiner"] };

// One measurement, in its own process so the edited case file is read fresh.
if (process.argv.includes("--gaps")) {
  const jiti = createJiti(import.meta.url);
  const { CASES } = await jiti.import("../src/lib/cases/index.ts");
  const { runCampaign, TYPICAL_STAFF } = await jiti.import("../src/lib/sim/headless.ts");
  const c = CASES[0];
  const r = runCampaign({ staff: TYPICAL_STAFF });
  console.log("GAPS " + JSON.stringify(Object.fromEntries(c.result.map((x) => [x.candidate, +((r.world.poll[x.candidate] ?? 0) - x.share).toFixed(3)]))));
  process.exit(0);
}

const measure = () => {
  const out = execFileSync(process.execPath, [fileURLToPath(import.meta.url), "--gaps"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  return JSON.parse(out.split("\n").find((l) => l.startsWith("GAPS ")).slice(5));
};

/** The lines holding the shifts the world makes on its own: one per decision that has a `since`, then the close. */
function slots(lines) {
  const out = [];
  let decision = null;
  lines.forEach((l, i) => {
    const id = l.match(/^      id: "([\w-]+)",$/);
    if (id) decision = id[1];
    if (/^  close: \{$/.test(l)) decision = "close";
    // An option's own effect is `effect: {…}` or `synergy: {…}`; the world's is a `shift:`, alone or inside `since:`.
    const own = /shift: \{ poll: \{/.test(l) && !/\b(effect|synergy):/.test(l);
    if (decision && own && !out.some((s) => s.decision === decision)) out.push({ decision, line: i });
  });
  return out;
}

const fmt = (v) => String(+v.toFixed(1));

for (let round = 1; round <= ROUNDS; round++) {
  const gaps = measure();
  const worst = Math.max(...Object.values(gaps).map(Math.abs));
  console.log(`round ${round}: ${Object.entries(gaps).map(([k, v]) => `${k} ${v >= 0 ? "+" : ""}${v.toFixed(2)}`).join(", ")}`);
  if (worst <= TARGET) {
    console.log(`\nFitted: every candidate within ${TARGET} points. Now run: npm run check:engine`);
    process.exit(0);
  }
  const lines = readFileSync(FILE, "utf8").split("\n");
  const all = slots(lines);
  if (round === 1) console.log(`  spreading over: ${all.map((x) => x.decision).join(", ")}`);
  if (all.length < 2) throw new Error("could not find the case's own shifts in mayor2013.ts");
  for (const [who, gap] of Object.entries(gaps)) {
    const mine = all.filter((s) => !(SKIP[who] ?? []).includes(s.decision));
    for (const s of mine) {
      const l = lines[s.line];
      const m = l.match(/shift: \{ poll: \{([^}]*)\}/);
      const poll = Object.fromEntries(m[1].split(",").filter((x) => x.trim()).map((x) => { const [k, v] = x.split(":"); return [k.trim(), Number(v)]; }));
      poll[who] = (poll[who] ?? 0) - gap / mine.length;
      const body = Object.entries(poll).filter(([, v]) => +v.toFixed(1) !== 0).map(([k, v]) => `${k}: ${fmt(v)}`).join(", ");
      lines[s.line] = l.slice(0, m.index) + `shift: { poll: { ${body} }` + l.slice(m.index + m[0].length);
    }
  }
  writeFileSync(FILE, lines.join("\n"));
}
console.error(`\nNot fitted after ${ROUNDS} rounds. Look at the gaps above.`);
process.exit(1);
