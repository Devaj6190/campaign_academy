// npm run check:memos — the staff memos, written live, must not simply land on what the real campaign chose (#41).
// Needs ANTHROPIC_API_KEY (read from .env.local). About twelve calls to the director model.
import { existsSync } from "node:fs";
import { createJiti } from "jiti";

if (existsSync(new URL("../.env.local", import.meta.url))) process.loadEnvFile(new URL("../.env.local", import.meta.url));
if (!process.env.ANTHROPIC_API_KEY) { console.error("check:memos needs ANTHROPIC_API_KEY (in .env.local). The no-key version runs in check:staff."); process.exit(1); }
const jiti = createJiti(import.meta.url);
const { checkMemos } = await jiti.import("../src/lib/staff/memoCheck.ts");
const { liveMemo } = await jiti.import("../src/lib/staff/memoLive.ts");
const { problems, report } = await checkMemos(liveMemo);
console.log(report.join("\n"));
if (problems.length) { console.error(`\n${problems.length} problem(s):\n- ${problems.join("\n- ")}`); process.exit(1); }
console.log("\nMemo checks pass: the memos disagree, carry no part of the record, and do not simply land on the real choice.");
