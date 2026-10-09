// Loads library content from disk and parses it through the Story 1.3 schemas.
// Pure I/O + parsing only — no gate rules here (see gate.ts). Never throws: every
// parse failure (bad JSON, a non-array file, a missing required file, a schema
// mismatch) becomes an `issue` so the gate can report all of them at once.
import fs from "node:fs";
import path from "node:path";
import { Anchor, BatchManifest, Constraint, Medium, Skill, Style, Tag, Template, Topic } from "../../src/domain/library/schema";

export interface LoadIssue {
  source: string;
  message: string;
}

export interface Sourced<T> {
  value: T;
  /** Batch folder name, or "anchors" for the anchors/ folder. */
  source: string;
}

export interface LoadedLibrary {
  tags: Tag[];
  skills: Skill[];
  mediums: Medium[];
  templates: Sourced<Template>[];
  topics: Sourced<Topic>[];
  styles: Sourced<Style>[];
  constraints: Sourced<Constraint>[];
  anchors: Anchor[];
  manifests: Sourced<BatchManifest>[];
  issues: LoadIssue[];
}

const FILL_FILENAMES = ["topics.json", "styles.json", "constraints.json"];
const KNOWN_BATCH_FILENAMES = new Set(["manifest.json", "templates.json", ...FILL_FILENAMES]);

/** Reads and JSON.parses a file, returning `undefined` (and recording an issue) instead
 * of throwing on bad JSON, a missing file, or a non-array body. */
function readJsonArray(filePath: string, issues: LoadIssue[], required: boolean): unknown[] | undefined {
  if (!fs.existsSync(filePath)) {
    if (required) issues.push({ source: filePath, message: "required file is missing" });
    return undefined;
  }
  let raw: unknown;
  try {
    raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (e) {
    issues.push({ source: filePath, message: `invalid JSON: ${e instanceof Error ? e.message : String(e)}` });
    return undefined;
  }
  if (!Array.isArray(raw)) {
    issues.push({ source: filePath, message: "expected a JSON array" });
    return undefined;
  }
  return raw;
}

function parseEach<T>(
  filePath: string,
  schema: { safeParse: (v: unknown) => { success: boolean; data?: T; error?: { issues: { message: string }[] } } },
  issues: LoadIssue[],
  options: { required?: boolean } = {},
): T[] {
  const raw = readJsonArray(filePath, issues, options.required ?? false);
  if (raw === undefined) return [];
  const out: T[] = [];
  for (const item of raw) {
    const result = schema.safeParse(item);
    if (result.success && result.data !== undefined) {
      out.push(result.data);
    } else {
      const rawId =
        typeof item === "object" && item !== null && "id" in item ? String((item as { id: unknown }).id) : "<unknown id>";
      const messages = result.error?.issues.map((i) => i.message).join("; ") ?? "parse failed";
      issues.push({ source: filePath, message: `${rawId}: ${messages}` });
    }
  }
  return out;
}

function loadFills(
  dir: string,
  issues: LoadIssue[],
  source: string,
  buckets: { topics: Sourced<Topic>[]; styles: Sourced<Style>[]; constraints: Sourced<Constraint>[] },
) {
  for (const value of parseEach<Topic>(path.join(dir, "topics.json"), Topic, issues)) buckets.topics.push({ value, source });
  for (const value of parseEach<Style>(path.join(dir, "styles.json"), Style, issues)) buckets.styles.push({ value, source });
  for (const value of parseEach<Constraint>(path.join(dir, "constraints.json"), Constraint, issues))
    buckets.constraints.push({ value, source });
}

export function loadLibrary(root: string): LoadedLibrary {
  const issues: LoadIssue[] = [];
  const libraryDir = path.join(root, "content", "library");

  const tags = parseEach<Tag>(path.join(libraryDir, "tags.json"), Tag, issues, { required: true });
  const skills = parseEach<Skill>(path.join(libraryDir, "skills.json"), Skill, issues, { required: true });
  const mediums = parseEach<Medium>(path.join(libraryDir, "mediums.json"), Medium, issues, { required: true });

  const templates: Sourced<Template>[] = [];
  const topics: Sourced<Topic>[] = [];
  const styles: Sourced<Style>[] = [];
  const constraints: Sourced<Constraint>[] = [];
  const manifests: Sourced<BatchManifest>[] = [];

  const anchorsDir = path.join(libraryDir, "anchors");
  for (const value of parseEach<Template>(path.join(anchorsDir, "templates.json"), Template, issues)) {
    templates.push({ value, source: "anchors" });
  }
  loadFills(anchorsDir, issues, "anchors", { topics, styles, constraints });
  const anchors = parseEach<Anchor>(path.join(anchorsDir, "anchors.json"), Anchor, issues, { required: true });

  const batchesDir = path.join(libraryDir, "batches");
  const batchFolders = fs.existsSync(batchesDir)
    ? fs
        .readdirSync(batchesDir, { withFileTypes: true })
        .filter((e) => e.isDirectory())
        .map((e) => e.name)
        .sort() // AD-6: batches apply in folder-name order.
    : [];

  for (const folder of batchFolders) {
    const dir = path.join(batchesDir, folder);

    for (const entry of fs.readdirSync(dir)) {
      if (entry.endsWith(".json") && !KNOWN_BATCH_FILENAMES.has(entry))
        issues.push({ source: path.join(dir, entry), message: `unexpected file "${entry}" in batch folder "${folder}"` });
    }

    const manifestPath = path.join(dir, "manifest.json");
    if (!fs.existsSync(manifestPath)) {
      issues.push({ source: dir, message: `batch folder "${folder}" has no manifest.json` });
      continue;
    }
    let manifestRaw: unknown;
    try {
      manifestRaw = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    } catch (e) {
      issues.push({ source: manifestPath, message: `invalid JSON: ${e instanceof Error ? e.message : String(e)}` });
      continue;
    }
    const manifestResult = BatchManifest.safeParse(manifestRaw);
    if (!manifestResult.success) {
      issues.push({ source: manifestPath, message: manifestResult.error.issues.map((i) => i.message).join("; ") });
      continue;
    }
    manifests.push({ value: manifestResult.data, source: folder });

    for (const value of parseEach<Template>(path.join(dir, "templates.json"), Template, issues)) {
      templates.push({ value, source: folder });
    }
    loadFills(dir, issues, folder, { topics, styles, constraints });
  }

  return { tags, skills, mediums, templates, topics, styles, constraints, anchors, manifests, issues };
}

/** Restricts a loaded library to anchors plus batches whose manifest status is "accepted" —
 * used by build.ts so a Vercel build never ships an unreviewed draft batch. Pure (no fs). */
export function filterAccepted(lib: LoadedLibrary): LoadedLibrary {
  const acceptedSources = new Set(lib.manifests.filter((m) => m.value.status === "accepted").map((m) => m.source));
  const keep = <T>(items: Sourced<T>[]): Sourced<T>[] =>
    items.filter((i) => i.source === "anchors" || acceptedSources.has(i.source));

  // An issue's `source` is a filesystem path; pull the batch folder name (the segment right
  // after "batches") back out so a draft/invalid batch's issues don't block an unrelated
  // accepted batch's build. An issue with no "batches" segment is a base-file issue and
  // always counts.
  const batchFolderOf = (source: string): string | undefined => {
    const parts = source.split(path.sep);
    const idx = parts.indexOf("batches");
    return idx >= 0 ? parts[idx + 1] : undefined;
  };

  return {
    ...lib,
    templates: keep(lib.templates),
    topics: keep(lib.topics),
    styles: keep(lib.styles),
    constraints: keep(lib.constraints),
    manifests: lib.manifests.filter((m) => m.value.status === "accepted"),
    issues: lib.issues.filter((i) => {
      const folder = batchFolderOf(i.source);
      return folder === undefined || acceptedSources.has(folder);
    }),
  };
}
