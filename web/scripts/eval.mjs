// npm run eval — do the agents decide as the real people did? (#28; src/lib/eval/)
//
//   npm run eval -- replay [--n 5] [--cond card,nochips,masked,changed,reworded,twin,recall] [--kinds case,adviser] [--only weiner,base] [--concurrency 4] [--dry]
//   npm run eval -- heldout --frozen [--n 5] [--cond card,masked,recall]
//   npm run eval -- free [--runs 3] [--weekly 7] [--orders 2]
//   npm run eval -- score eval/runs/<file>.jsonl
//
// Reads ANTHROPIC_API_KEY (and LANGSMITH_API_KEY, to trace each run in LangSmith) from .env.local. Without a key, or
// with --dry, the rules decide (the chips), which checks the wiring and measures nothing. Every request and reply is
// saved to eval/runs/ as JSON lines, with the summary beside it.
import { createHash } from "node:crypto";
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, appendFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createJiti } from "jiti";

const env = new URL("../.env.local", import.meta.url);
if (existsSync(env)) process.loadEnvFile(env);
if (process.env.LANGSMITH_API_KEY && !process.env.LANGSMITH_TRACING) process.env.LANGSMITH_TRACING = "true";
process.env.LANGSMITH_PROJECT ??= "campaign-academy-evals";

const [mode = "replay", ...rest] = process.argv.slice(2);
const flag = (name, dflt) => { const i = rest.indexOf(`--${name}`); return i < 0 ? dflt : rest[i + 1] && !rest[i + 1].startsWith("--") ? rest[i + 1] : true; };
const list = (name, dflt) => String(flag(name, dflt)).split(",").filter(Boolean);

const jiti = createJiti(import.meta.url, { alias: { "@/": fileURLToPath(new URL("../src/", import.meta.url)) } });

// The game code calls its own API routes with relative URLs. Here there is no server, so each call goes straight to
// the route's handler: the live agents run through exactly the code the game uses.
// A staff order's luck is seeded from its run id, which the game takes from the clock; here it is a counter, so the
// same orders in the same order get the same luck.
const realFetch = globalThis.fetch;
let runIds = 0;
globalThis.fetch = async (url, init) => {
  if (typeof url === "string" && url.startsWith("/api/")) {
    const { POST } = await jiti.import(`../src/app${url}/route.ts`);
    if (url === "/api/staff/instruct" && init?.body) init = { ...init, body: JSON.stringify({ ...JSON.parse(init.body), runId: ++runIds * 7919 }) };
    return POST(new Request(`http://eval.local${url}`, init));
  }
  return realFetch(url, init);
};

const { summarise } = await jiti.import("../src/lib/eval/score.ts");
if (mode === "score") {
  const file = rest[0];
  const recs = readFileSync(file, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
  console.log(summarise(recs));
  process.exit(0);
}
if (!["replay", "heldout", "free"].includes(mode)) { console.error(`Unknown mode "${mode}". Use replay, heldout, free or score.`); process.exit(1); }
if (mode === "heldout" && !flag("frozen", false)) {
  console.error("The held-out decisions run once, after tuning is frozen. Pass --frozen to confirm tuning is over.");
  process.exit(1);
}

const live = !!process.env.ANTHROPIC_API_KEY && !flag("dry", false);
const heldHash = createHash("sha256").update(readFileSync(new URL("../src/lib/eval/heldout.ts", import.meta.url))).digest("hex").slice(0, 12);
const commit = (() => { try { return execSync("git rev-parse --short HEAD").toString().trim(); } catch { return "unknown"; } })();
const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const tag = `${mode}${live ? "" : "-dry"}-${stamp}`; // dry runs are not kept (web/.gitignore)
const dir = new URL("../eval/runs/", import.meta.url);
mkdirSync(dir, { recursive: true });
const out = new URL(`${tag}.jsonl`, dir);
writeFileSync(out, "");

const save = (r) => appendFileSync(out, JSON.stringify(r) + "\n");
const log = (s) => console.log(`[eval] ${s}`);
if (mode === "free") {
  const { freeRun } = await jiti.import("../src/lib/eval/free.ts");
  const runs = Number(flag("runs", 3));
  console.log(`[eval] free run, ${live ? "live agents" : "rules (no key or --dry)"}, ${runs} run(s); commit ${commit}${process.env.LANGSMITH_TRACING === "true" ? `; tracing to LangSmith project ${process.env.LANGSMITH_PROJECT}` : ""}`);
  const recs = [];
  await freeRun({ runs, live, tag, weekly: Number(flag("weekly", 7)), orders: Number(flag("orders", 2)), onRecord: (r) => { recs.push(r); save(r); }, log });
  if (live) { const { awaitAllCallbacks } = await import("@langchain/core/callbacks/promises"); await awaitAllCallbacks(); }
  const summary = `## ${tag}\n\n${live ? "Live agents" : "Rules only (no key or --dry): wiring check, not a measurement"}. ${runs} run(s). Commit ${commit}.\n` + summarise(recs);
  writeFileSync(new URL(`${tag}.md`, dir), summary + "\n");
  console.log(`\n${summary}\n\nSaved: eval/runs/${tag}.jsonl and .md`);
  process.exit(0);
}

const { replay } = await jiti.import("../src/lib/eval/replay.ts");
const opts = {
  n: Number(flag("n", 5)),
  conds: list("cond", mode === "heldout" ? "card,masked,recall" : "card,nochips,masked,changed,reworded,twin,recall"),
  kinds: mode === "heldout" ? ["heldout"] : list("kinds", "case,adviser"),
  only: flag("only", false) ? list("only", "") : undefined,
  concurrency: Number(flag("concurrency", 4)),
  live,
  tag,
  onRecord: save,
  log,
};
console.log(`[eval] ${mode}, ${live ? "live agents" : "rules (no key or --dry)"}, n=${opts.n}, conditions ${opts.conds.join(", ")}; commit ${commit}; held-out file ${heldHash}${process.env.LANGSMITH_TRACING === "true" ? `; tracing to LangSmith project ${process.env.LANGSMITH_PROJECT}` : ""}`);
const recs = await replay(opts);
if (live) { const { awaitAllCallbacks } = await import("@langchain/core/callbacks/promises"); await awaitAllCallbacks(); }

const head = `## ${tag}\n\n${live ? "Live agents" : "Rules only (no key or --dry): wiring check, not a measurement"}. N = ${opts.n} per condition. Commit ${commit}. Held-out file ${heldHash}.\n`;
const summary = head + summarise(recs);
writeFileSync(new URL(`${tag}.md`, dir), summary + "\n");
console.log(`\n${summary}\n\nSaved: eval/runs/${tag}.jsonl and .md`);
