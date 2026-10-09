// CLI entry for `npm run library:validate` (AD-16). Loads content/library, runs the hard
// gate, writes gate-report.json, prints a human summary, and exits non-zero on failure.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gateConfig } from "./gate-config";
import { runGate } from "./gate";
import { loadLibrary } from "./load";

// Resolve the repo root from this file's own location, not process.cwd(), so the gate
// behaves the same regardless of where `npm run library:validate` is invoked from.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const lib = loadLibrary(root);
const report = runGate(lib, gateConfig);

const reportPath = path.join(root, "gate-report.json");
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + "\n");

const counts = report.counts;
console.log(
  `Library gate: ${report.ok ? "PASS" : "FAIL"} — ${counts.templates} templates, ${counts.topics} topics, ` +
    `${counts.styles} styles, ${counts.constraints} constraints, ${counts.anchors} anchors, ${counts.batches} batches, ` +
    `${counts.retired} retired.`,
);
if (!report.ok) {
  console.log(`${report.failures.length} failure(s):`);
  for (const f of report.failures) console.log(`  [${f.rule}] ${f.id}${f.source ? ` (${f.source})` : ""}: ${f.message}`);
}
console.log(`Report written to ${reportPath}`);

process.exitCode = report.ok ? 0 : 1;
