// Build entry for `predev`/`prebuild`/`library:build` (AD-16/AD-18). Loads anchors plus only
// `accepted` batches, runs the full hard gate, and only on success writes the gitignored
// src/generated/library.json that the runtime Library port consumes. A gate failure deletes
// any stale library.json and exits non-zero, so `next dev`/`next build` (and the Vercel
// build) never run against an unreviewed draft batch or a broken library.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gateConfig } from "./gate-config";
import { runGate, type GateReport } from "./gate";
import { filterAccepted, loadLibrary, type LoadedLibrary } from "./load";

/** The library.json payload. Retired Templates/fills stay in (flagged `retired: true`) —
 * AD-6: compose() skips them, but lookups (Variation, Practice) still resolve them. */
export function buildPayload(lib: LoadedLibrary, report: GateReport) {
  const retired = new Set(report.retiredIds);
  const mark = <T extends { id: string }>(items: { value: T }[]) =>
    items.map(({ value }) => (retired.has(value.id) ? { ...value, retired: true } : value));
  const base = {
    skills: lib.skills,
    mediums: lib.mediums,
    templates: mark(lib.templates),
    topics: mark(lib.topics),
    styles: mark(lib.styles),
    constraints: mark(lib.constraints),
  };
  // Anchors are a build-time gate check (AD-16); the runtime never reads them, so they don't ship.
  // Content hash of the payload, so libraryVersion only changes when the shipped content does.
  const libraryVersion = crypto.createHash("sha256").update(JSON.stringify(base)).digest("hex").slice(0, 16);
  return { libraryVersion, ...base };
}

const printFindings = (label: string, items: GateReport["failures"], max = Infinity) => {
  for (const f of items.slice(0, max)) console.error(`  [${f.rule}] ${f.id}${f.source ? ` (${f.source})` : ""}: ${f.message}`);
  if (items.length > max) console.error(`  ... and ${items.length - max} more ${label}`);
};

/** Runs the build against `root`; returns the process exit code. */
export function runBuild(root: string): number {
  const loaded = loadLibrary(root);
  for (const m of loaded.manifests)
    if (m.value.status === "draft") console.log(`Library build: excluding batch "${m.source}" (draft)`);
  const lib = filterAccepted(loaded, root);
  const report = runGate(lib, gateConfig);
  const outFile = path.join(root, "src", "generated", "library.json");

  if (report.warnings.length > 0) {
    console.warn(`Library build: ${report.warnings.length} warning(s) (non-blocking):`);
    printFindings("warning(s)", report.warnings, 5);
  }

  if (!report.ok) {
    fs.rmSync(outFile, { force: true });
    console.error(
      `Library build: FAIL — ${report.failures.length} failure(s) on the accepted set (anchors + accepted batches; ` +
        `drafts excluded). ${outFile} removed.`,
    );
    printFindings("failure(s)", report.failures);
    return 1;
  }

  const payload = buildPayload(lib, report);
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(payload, null, 2) + "\n");
  console.log(
    `Library build: OK — libraryVersion ${payload.libraryVersion}, ${payload.templates.length} templates, ` +
      `${lib.anchors.length} anchors checked, ${lib.manifests.length} accepted batch(es), written to src/generated/library.json`,
  );
  console.log(`Library build: "next dev" does not watch content/library — re-run "npm run library:build" after content edits.`);
  return 0;
}

// Resolve the repo root from this file's own location, not process.cwd() (matches validate.ts).
const self = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === self) {
  process.exitCode = runBuild(path.resolve(path.dirname(self), "..", ".."));
}
