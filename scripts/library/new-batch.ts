import { fileURLToPath } from "node:url";
import { resolve, join, dirname } from "node:path";
import { mkdirSync, readdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { BatchManifest } from "../../src/domain/library/schema";

export const KINDS = ["topics", "styles", "constraints", "templates"] as const;
export type Kind = (typeof KINDS)[number];

/** Reads "Version: <x>" from a pipeline doc's first lines. Throws if missing. */
export function parseVersionHeader(markdown: string): string {
  const match = /^Version:\s*(\S+)/m.exec(markdown);
  if (!match) throw new Error("no 'Version: <x>' header found");
  return match[1];
}

/** Next zero-padded sequence number for `<kind>-<scope>`, scanning existing batch folder names. */
export function nextBatchSeq(existingFolderNames: string[], kind: string, scope: string): string {
  const prefix = `${kind}-${scope}-`;
  let max = 0;
  for (const name of existingFolderNames) {
    const i = name.indexOf(prefix);
    if (i === -1) continue;
    const n = Number(name.slice(i + prefix.length));
    if (Number.isInteger(n) && n > max) max = n;
  }
  return String(max + 1).padStart(2, "0");
}

export function buildManifest(promptVersion: string, rubricVersion: string): BatchManifest {
  return {
    status: "draft",
    generator: { tool: "TBD", model: "TBD", promptVersion },
    rubricVersion,
    review: null,
    edits: [],
    retire: [],
  };
}

export function todayDate(now: Date): string {
  return now.toISOString().slice(0, 10);
}

export function createBatch(opts: {
  kind: Kind;
  scope: string;
  batchesDir: string;
  promptPath: string;
  rubricPath: string;
  now: Date;
}): { folderPath: string; manifestPath: string; kindFilePath: string } {
  const { kind, scope, batchesDir, promptPath, rubricPath, now } = opts;
  mkdirSync(batchesDir, { recursive: true });
  const existing = readdirSync(batchesDir);
  const seq = nextBatchSeq(existing, kind, scope);
  const folderName = `${todayDate(now)}-${kind}-${scope}-${seq}`;
  const folderPath = join(batchesDir, folderName);
  mkdirSync(folderPath, { recursive: true });

  const promptVersion = parseVersionHeader(readFileSync(promptPath, "utf8"));
  const rubricVersion = parseVersionHeader(readFileSync(rubricPath, "utf8"));
  const manifest = BatchManifest.parse(buildManifest(promptVersion, rubricVersion));

  const manifestPath = join(folderPath, "manifest.json");
  const kindFilePath = join(folderPath, `${kind}.json`);
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  writeFileSync(kindFilePath, "[]\n");

  return { folderPath, manifestPath, kindFilePath };
}

function main() {
  const [kindArg, scope] = process.argv.slice(2);
  if (!kindArg || !scope || !(KINDS as readonly string[]).includes(kindArg)) {
    console.error(`Usage: library:new-batch -- <${KINDS.join("|")}> <scope>`);
    process.exit(1);
  }
  const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
  const batchesDir = join(repoRoot, "content/library/batches");
  const pipelineDir = join(repoRoot, "content/library/pipeline");
  const { folderPath } = createBatch({
    kind: kindArg as Kind,
    scope,
    batchesDir,
    promptPath: join(pipelineDir, "PROMPT.md"),
    rubricPath: join(pipelineDir, "RUBRIC.md"),
    now: new Date(),
  });
  console.log(`Created ${folderPath}`);
  if (!existsSync(folderPath)) process.exit(1);
}

if (fileURLToPath(import.meta.url) === resolve(process.argv[1] ?? "")) {
  main();
}
