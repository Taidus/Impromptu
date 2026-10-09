import { fileURLToPath } from "node:url";
import { resolve, join, dirname } from "node:path";
import { mkdirSync, readdirSync, writeFileSync, readFileSync } from "node:fs";
import { BatchManifest } from "../../src/domain/library/schema";

export const KINDS = ["topics", "styles", "constraints", "templates"] as const;
export type Kind = (typeof KINDS)[number];

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** A lowercase kebab slug: `scope` is embedded directly in a folder path. */
export function isSlug(value: string): boolean {
  return SLUG.test(value);
}

/** Reads "Version: <x>" from a header line. Never crosses a newline. Throws if missing. */
export function parseVersionHeader(markdown: string): string {
  const match = /^Version:[ \t]*(\S+)/m.exec(markdown);
  if (!match) throw new Error("no 'Version: <x>' header found");
  return match[1];
}

/** Next zero-padded sequence number for `<kind>-<scope>`, scanning existing batch folder names. */
export function nextBatchSeq(existingFolderNames: string[], kind: string, scope: string): string {
  const pattern = new RegExp(`^\\d{4}-\\d{2}-\\d{2}-${kind}-${scope}-(\\d+)$`);
  let max = 0;
  for (const name of existingFolderNames) {
    const match = pattern.exec(name);
    if (!match) continue;
    const n = Number(match[1]);
    if (n > max) max = n;
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

/** Local calendar date (not UTC) -- a batch is dated by the author's day, not UTC's. */
export function todayDate(now: Date): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
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
  if (!isSlug(scope)) throw new Error(`scope "${scope}" must be a lowercase kebab slug (e.g. "general")`);

  const existing = readdirSync(batchesDir);
  const seq = nextBatchSeq(existing, kind, scope);
  const folderName = `${todayDate(now)}-${kind}-${scope}-${seq}`;
  const folderPath = join(batchesDir, folderName);

  // Parse and validate everything that can fail before touching the filesystem.
  const promptVersion = parseVersionHeader(readFileSync(promptPath, "utf8"));
  const rubricVersion = parseVersionHeader(readFileSync(rubricPath, "utf8"));
  const manifest = BatchManifest.parse(buildManifest(promptVersion, rubricVersion));

  // Non-recursive: throws EEXIST instead of silently reusing/overwriting a folder that
  // already exists (e.g. a stale `existing` listing racing a concurrent run).
  mkdirSync(folderPath);
  const manifestPath = join(folderPath, "manifest.json");
  const kindFilePath = join(folderPath, `${kind}.json`);
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  writeFileSync(kindFilePath, "[]\n");

  return { folderPath, manifestPath, kindFilePath };
}

function main() {
  const [kindArg, scope] = process.argv.slice(2);
  if (!kindArg || !scope || !(KINDS as readonly string[]).includes(kindArg) || !isSlug(scope)) {
    console.error(`Usage: library:new-batch -- <${KINDS.join("|")}> <scope>  (scope must be a lowercase kebab slug)`);
    process.exit(1);
  }
  const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
  const batchesDir = join(repoRoot, "content/library/batches");
  const pipelineDir = join(repoRoot, "content/library/pipeline");
  try {
    const { folderPath } = createBatch({
      kind: kindArg as Kind,
      scope,
      batchesDir,
      promptPath: join(pipelineDir, "PROMPT.md"),
      rubricPath: join(pipelineDir, "RUBRIC.md"),
      now: new Date(),
    });
    console.log(`Created ${folderPath}`);
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

if (fileURLToPath(import.meta.url) === resolve(process.argv[1] ?? "")) {
  main();
}
