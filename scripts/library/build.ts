// Build entry for `predev`/`prebuild` (AD-16/AD-18). Loads anchors plus only `accepted`
// batches, runs the full hard gate, and only on success writes the gitignored
// src/generated/library.json that the runtime Library port consumes. A gate failure exits
// non-zero, so `next dev`/`next build` (and the Vercel build) never run against an
// unreviewed draft batch or a broken library.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gateConfig } from "./gate-config";
import { runGate } from "./gate";
import { filterAccepted, loadLibrary } from "./load";

// Resolve the repo root from this file's own location, not process.cwd() (matches validate.ts).
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const lib = filterAccepted(loadLibrary(root));
const report = runGate(lib, gateConfig);

if (!report.ok) {
  console.error(
    `Library build: FAIL — ${report.failures.length} failure(s). Run "npm run library:validate" for the full report.`,
  );
  for (const f of report.failures) console.error(`  [${f.rule}] ${f.id}${f.source ? ` (${f.source})` : ""}: ${f.message}`);
  process.exitCode = 1;
} else {
  const retired = new Set(report.retiredIds);
  const base = {
    skills: lib.skills,
    mediums: lib.mediums,
    templates: lib.templates.filter((t) => !retired.has(t.value.id)).map((t) => t.value),
    topics: lib.topics.filter((t) => !retired.has(t.value.id)).map((t) => t.value),
    styles: lib.styles.filter((t) => !retired.has(t.value.id)).map((t) => t.value),
    constraints: lib.constraints.filter((t) => !retired.has(t.value.id)).map((t) => t.value),
    anchors: lib.anchors,
  };
  // Content hash of the active payload, so libraryVersion only changes when the shipped
  // content does.
  const libraryVersion = crypto.createHash("sha256").update(JSON.stringify(base)).digest("hex").slice(0, 16);

  const outDir = path.join(root, "src", "generated");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "library.json"), JSON.stringify({ libraryVersion, ...base }, null, 2) + "\n");

  console.log(
    `Library build: OK — libraryVersion ${libraryVersion}, ${base.templates.length} templates, ${base.anchors.length} anchors, ` +
      `${lib.manifests.length} accepted batch(es), written to src/generated/library.json`,
  );
}
