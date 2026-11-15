// npm run check:staff — the staff-agent checks that need no API key (src/lib/staff/check.ts).
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url);
const { checkStaff } = await jiti.import("../src/lib/staff/check.ts");
const { problems, report } = await checkStaff();
console.log(report.join("\n"));
if (problems.length) {
  console.error(`\n${problems.length} problem(s):\n- ${problems.join("\n- ")}`);
  process.exit(1);
}
console.log("\nStaff checks pass: orders and questions are told apart, and a question spends nothing.");
