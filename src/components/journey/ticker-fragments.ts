// Build-time reader for the Ticker's library fragments: every Topic and
// Style revealText from content/library/anchors, plus any accepted batch
// under content/library/batches/*, deduplicated.
//
// Same disk-read pattern as ./sample.ts: content/library/ has no @/ alias
// and the cross-directory import boundary (eslint.config.mjs) bans a
// relative "../" import from src/, so this reads JSON files from disk at
// module-load time instead of a static `import … from ".json"`. Still
// build-time only — consumed by a Server Component, so the read happens
// once during `next build`.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { BatchManifest, Style, Topic } from "@/domain/library/schema";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

function readJsonArray(path: string): unknown[] {
  if (!existsSync(path)) return [];
  const raw: unknown = JSON.parse(readFileSync(path, "utf8"));
  return Array.isArray(raw) ? raw : [];
}

/** Every Topic and Style in `dir` (a folder with topics.json / styles.json). */
function entriesFrom(dir: string): (Topic | Style)[] {
  const topics = Topic.array().parse(readJsonArray(join(dir, "topics.json")));
  const styles = Style.array().parse(readJsonArray(join(dir, "styles.json")));
  return [...topics, ...styles];
}

/** The batch's manifest when it parses and is accepted; a missing or malformed manifest counts as not accepted. */
function acceptedManifest(batchDir: string): BatchManifest | null {
  const manifestPath = join(batchDir, "manifest.json");
  if (!existsSync(manifestPath)) return null;
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch {
    return null;
  }
  const result = BatchManifest.safeParse(raw);
  return result.success && result.data.status === "accepted" ? result.data : null;
}

/**
 * Topic and Style revealText from the anchors plus every accepted batch, in
 * first-seen order with duplicates removed. Entries marked `retired`, or
 * listed in an accepted batch's `manifest.retire`, are left out.
 */
export function tickerFragments(root: string = ROOT): string[] {
  const libraryDir = join(root, "content", "library");
  const anchorsDir = join(libraryDir, "anchors");
  for (const file of ["topics.json", "styles.json"]) {
    if (!existsSync(join(anchorsDir, file))) {
      throw new Error(`tickerFragments: missing ${join(anchorsDir, file)}`);
    }
  }
  const entries = entriesFrom(anchorsDir);
  const retired = new Set<string>();

  const batchesDir = join(libraryDir, "batches");
  const batchFolders = existsSync(batchesDir)
    ? readdirSync(batchesDir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .sort()
    : [];

  for (const folder of batchFolders) {
    const dir = join(batchesDir, folder);
    const manifest = acceptedManifest(dir);
    if (!manifest) continue;
    entries.push(...entriesFrom(dir));
    for (const id of manifest.retire) retired.add(id);
  }

  const fragments = entries
    .filter((entry) => !entry.retired && !retired.has(entry.id))
    .map((entry) => entry.revealText);
  return [...new Set(fragments)];
}
