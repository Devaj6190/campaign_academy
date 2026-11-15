// npm run check:engine — the engine checks from issue #35 (src/lib/sim/check.ts), run without the browser.
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url);
const { checkEngine } = await jiti.import("../src/lib/sim/check.ts");
const { problems, report } = checkEngine();
console.log(report.join("\n"));
if (problems.length) {
  console.error(`\n${problems.length} problem(s):\n- ${problems.join("\n- ")}`);
  process.exit(1);
}
console.log("\nEngine checks pass: the real path lands on the certified result, and the same inputs give the same world.");
