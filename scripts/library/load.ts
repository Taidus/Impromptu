// Loads library content from disk and parses it through the Story 1.3 schemas.
// Pure I/O + parsing only — no gate rules here (see gate.ts). Never throws: every
// parse failure becomes an `issue` so the gate can report all of them at once.
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

function readJsonArray(filePath: string): unknown[] {
  const raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
  if (!Array.isArray(raw)) throw new Error(`${filePath}: expected a JSON array`);
  return raw;
}

function parseEach<T>(
  filePath: string,
  schema: { safeParse: (v: unknown) => { success: boolean; data?: T; error?: { issues: { message: string }[] } } },
  issues: LoadIssue[],
): T[] {
  if (!fs.existsSync(filePath)) return [];
  const out: T[] = [];
  for (const item of readJsonArray(filePath)) {
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

const FILL_FILES: [string, typeof Topic | typeof Style | typeof Constraint][] = [
  ["topics.json", Topic],
  ["styles.json", Style],
  ["constraints.json", Constraint],
];

function loadFills(
  dir: string,
  issues: LoadIssue[],
  source: string,
  buckets: { topics: Sourced<Topic>[]; styles: Sourced<Style>[]; constraints: Sourced<Constraint>[] },
) {
  for (const [file, schema] of FILL_FILES) {
    const list = parseEach<Topic | Style | Constraint>(path.join(dir, file), schema, issues);
    const bucket = file === "topics.json" ? buckets.topics : file === "styles.json" ? buckets.styles : buckets.constraints;
    for (const value of list) bucket.push({ value: value as never, source });
  }
}

export function loadLibrary(root: string): LoadedLibrary {
  const issues: LoadIssue[] = [];
  const libraryDir = path.join(root, "content", "library");

  const tags = parseEach<Tag>(path.join(libraryDir, "tags.json"), Tag, issues);
  const skills = parseEach<Skill>(path.join(libraryDir, "skills.json"), Skill, issues);
  const mediums = parseEach<Medium>(path.join(libraryDir, "mediums.json"), Medium, issues);

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
  const anchors = parseEach<Anchor>(path.join(anchorsDir, "anchors.json"), Anchor, issues);

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
    const manifestPath = path.join(dir, "manifest.json");
    if (!fs.existsSync(manifestPath)) {
      issues.push({ source: dir, message: `batch folder "${folder}" has no manifest.json` });
      continue;
    }
    const manifestRaw = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
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
