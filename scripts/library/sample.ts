import { fileURLToPath } from "node:url";
import { resolve, join, dirname } from "node:path";
import { readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { z } from "zod";
import { isCompatible } from "../../src/domain/library/compat";
import { render } from "../../src/domain/library/render";
import {
  BatchManifest,
  Constraint,
  Medium,
  Style,
  Template,
  Topic,
} from "../../src/domain/library/schema";

export const KINDS = ["topics", "styles", "constraints", "templates"] as const;
export type Kind = (typeof KINDS)[number];

export type Active = {
  mediums: Medium[];
  templates: Template[];
  topics: Topic[];
  styles: Style[];
  constraints: Constraint[];
};

export type NewEntries =
  | { kind: "templates"; entries: Template[] }
  | { kind: "topics"; entries: Topic[] }
  | { kind: "styles"; entries: Style[] }
  | { kind: "constraints"; entries: Constraint[] };

export type ComboResult = {
  templateId: string;
  mediumId: string;
  topicId: string | null;
  styleId: string | null;
  constraintId: string | null;
  skill: string;
  level: string;
  timeLimitSec?: number;
  brief: string;
  guidance: string | null;
};

const KIND_SCHEMA = { topics: Topic, styles: Style, constraints: Constraint, templates: Template };

/** Which `<kind>.json` lives directly in this batch folder. Exactly one is expected. */
export function detectKind(files: string[]): Kind {
  const found = KINDS.filter((k) => files.includes(`${k}.json`));
  if (found.length !== 1) throw new Error(`expected exactly one of ${KINDS.join(", ")}.json, found: ${found.join(", ") || "none"}`);
  return found[0];
}

/** Resolves `batchId` to a folder name: an exact match, or a unique `-<batchId>` suffix match. */
export function findBatchFolder(folderNames: string[], batchId: string): string {
  const matches = folderNames.filter((name) => name === batchId || name.endsWith(`-${batchId}`));
  if (matches.length !== 1)
    throw new Error(`batchId "${batchId}" resolved to ${matches.length} folder(s): ${matches.join(", ") || "none"}`);
  return matches[0];
}

/** Anchors (always active) plus every `accepted` batch, minus anything any batch's `retire[]` names. */
export function loadActiveLibrary(opts: { anchorsDir: string; baseDir: string; batchesDir: string }): Active {
  const { anchorsDir, baseDir, batchesDir } = opts;
  const readJson = (path: string) => JSON.parse(readFileSync(path, "utf8"));

  const mediums = z.array(Medium).parse(readJson(join(baseDir, "mediums.json")));
  const templates = [...z.array(Template).parse(readJson(join(anchorsDir, "templates.json")))];
  const topics = [...z.array(Topic).parse(readJson(join(anchorsDir, "topics.json")))];
  const styles = [...z.array(Style).parse(readJson(join(anchorsDir, "styles.json")))];
  const constraints = [...z.array(Constraint).parse(readJson(join(anchorsDir, "constraints.json")))];

  const retired = new Set<string>();
  const folders = readdirSync(batchesDir).filter((name) => {
    const path = join(batchesDir, name);
    return statSync(path).isDirectory();
  });
  for (const folder of folders) {
    const folderPath = join(batchesDir, folder);
    const manifestPath = join(folderPath, "manifest.json");
    let manifest;
    try {
      manifest = BatchManifest.parse(readJson(manifestPath));
    } catch {
      continue; // not a batch folder (or malformed) -- ignore
    }
    for (const id of manifest.retire) retired.add(id);
    if (manifest.status !== "accepted") continue;

    const files = readdirSync(folderPath);
    const kind = detectKind(files);
    const entries = z.array(KIND_SCHEMA[kind]).parse(readJson(join(folderPath, `${kind}.json`)));
    if (kind === "templates") templates.push(...(entries as Template[]));
    if (kind === "topics") topics.push(...(entries as Topic[]));
    if (kind === "styles") styles.push(...(entries as Style[]));
    if (kind === "constraints") constraints.push(...(entries as Constraint[]));
  }

  const active = <T extends { id: string; retired?: boolean }>(list: T[]) =>
    list.filter((e) => !e.retired && !retired.has(e.id));

  return { mediums, templates: active(templates), topics: active(topics), styles: active(styles), constraints: active(constraints) };
}

/**
 * Every `isCompatible` combination that exercises a new entry (plus active data for every
 * other slot). The "self" kind's candidates are the new entries only; the other two fill
 * slots offer every active entry of that kind, or `null` when the Template has no slot.
 */
export function buildCombos(active: Active, newEntries: NewEntries): ComboResult[] {
  const templates = newEntries.kind === "templates" ? newEntries.entries : active.templates;
  const topics: (Topic | null)[] = newEntries.kind === "topics" ? newEntries.entries : [...active.topics, null];
  const styles: (Style | null)[] = newEntries.kind === "styles" ? newEntries.entries : [...active.styles, null];
  const constraints: (Constraint | null)[] =
    newEntries.kind === "constraints" ? newEntries.entries : [...active.constraints, null];

  const results: ComboResult[] = [];
  for (const template of templates) {
    for (const mediumId of template.mediums) {
      const medium = active.mediums.find((m) => m.id === mediumId);
      if (!medium) continue;
      for (const topic of topics) {
        for (const style of styles) {
          for (const constraint of constraints) {
            if (!isCompatible(template, medium, topic, style, constraint)) continue;
            const rendered = render(template, medium, { topic, style, constraint });
            if (!rendered.ok) continue;
            results.push({
              templateId: template.id,
              mediumId: medium.id,
              topicId: topic?.id ?? null,
              styleId: style?.id ?? null,
              constraintId: constraint?.id ?? null,
              skill: template.skill,
              level: template.level,
              timeLimitSec: template.timeLimitSec,
              brief: rendered.brief,
              guidance: rendered.guidance,
            });
          }
        }
      }
    }
  }
  return results;
}

function comboLine(n: number, c: ComboResult): string {
  const parts = [
    `template: ${c.templateId}`,
    `medium: ${c.mediumId}`,
    `topic: ${c.topicId ?? "none"}`,
    `style: ${c.styleId ?? "none"}`,
    `constraint: ${c.constraintId ?? "none"}`,
    `skill: ${c.skill}`,
    `level: ${c.level}`,
  ];
  if (c.timeLimitSec !== undefined) parts.push(`timeLimitSec: ${c.timeLimitSec}`);
  const guidance = c.guidance ? `\n   - guidance: ${c.guidance}` : "";
  return `${n}. **Brief:** ${c.brief}\n   - ${parts.join(", ")}${guidance}`;
}

/** Fisher-Yates using an injectable `rng() => [0,1)` so tests can be deterministic. */
function shuffled<T>(list: T[], rng: () => number): T[] {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function toMarkdown(batchId: string, combos: ComboResult[], opts: { sampleSize?: number; rng?: () => number } = {}): string {
  const sampleSize = opts.sampleSize ?? 20;
  const rng = opts.rng ?? Math.random;
  const sample = shuffled(combos, rng).slice(0, Math.min(sampleSize, combos.length));

  const lines = [
    `# Sample: ${batchId}`,
    "",
    `Judge pass: ${combos.length} rendered Challenge(s).`,
    `Founder skim: ${sample.length} random.`,
    "",
    "## Judge pass",
    "",
    ...(combos.length ? combos.map((c, i) => comboLine(i + 1, c)) : ["(no compatible combination renders yet)"]),
    "",
    "## Founder skim (random)",
    "",
    ...(sample.length ? sample.map((c, i) => comboLine(i + 1, c)) : ["(no compatible combination renders yet)"]),
    "",
  ];
  return lines.join("\n");
}

function main() {
  const batchId = process.argv[2];
  if (!batchId) {
    console.error("Usage: library:sample -- <batchId>");
    process.exit(1);
  }
  const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
  const libraryDir = join(repoRoot, "content/library");
  const batchesDir = join(libraryDir, "batches");
  const anchorsDir = join(libraryDir, "anchors");

  const folderNames = readdirSync(batchesDir).filter((name) => statSync(join(batchesDir, name)).isDirectory());
  const folderName = findBatchFolder(folderNames, batchId);
  const folderPath = join(batchesDir, folderName);
  const files = readdirSync(folderPath);
  const kind = detectKind(files);
  const raw = JSON.parse(readFileSync(join(folderPath, `${kind}.json`), "utf8"));
  const entries = z.array(KIND_SCHEMA[kind]).parse(raw);

  const active = loadActiveLibrary({ anchorsDir, baseDir: libraryDir, batchesDir });
  const combos = buildCombos(active, { kind, entries } as NewEntries);
  const markdown = toMarkdown(folderName, combos);
  const outPath = join(folderPath, "sample.md");
  writeFileSync(outPath, markdown);
  console.log(`Wrote ${combos.length} combo(s) to ${outPath}`);
}

if (fileURLToPath(import.meta.url) === resolve(process.argv[1] ?? "")) {
  main();
}
