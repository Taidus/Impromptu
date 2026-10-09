// The pure hard gate (AD-16, scope: integrity, Brief rules, Time Limits, anchors, CL-4 lint).
// Takes already-parsed library data (see load.ts) and already-computed tunables (see
// gate-config.ts) and returns a report. No fs, no process — unit-testable with fixtures.
// Reachability, coverage, repeat headroom, and batch sizing are Story 1.7/1.8 additions.
import { isCompatible } from "../../src/domain/library/compat";
import { render } from "../../src/domain/library/render";
import type {
  Anchor,
  BatchManifest,
  Constraint,
  Medium,
  Skill,
  Style,
  Tag,
  Template,
  Topic,
} from "../../src/domain/library/schema";
import type { GateConfig } from "./gate-config";
import type { LoadIssue, Sourced } from "./load";

export interface GateInput {
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

export interface GateFailure {
  id: string;
  rule: string;
  message: string;
}

export interface GateReport {
  ok: boolean;
  failures: GateFailure[];
  counts: {
    skills: number;
    mediums: number;
    templates: number;
    topics: number;
    styles: number;
    constraints: number;
    anchors: number;
    batches: number;
    retired: number;
  };
}

type Fill = Topic | Style | Constraint;

function fail(failures: GateFailure[], id: string, rule: string, message: string) {
  failures.push({ id, rule, message });
}

export function runGate(lib: GateInput, config: GateConfig): GateReport {
  const failures: GateFailure[] = [];

  for (const issue of lib.issues) fail(failures, issue.source, "integrity.parse", issue.message);

  const tagIds = new Set(lib.tags.map((t) => t.id));
  const checkTags = (id: string, list: readonly string[]) => {
    for (const t of list) if (!tagIds.has(t)) fail(failures, id, "integrity.unknown-tag", `unknown tag "${t}"`);
  };

  // --- Unique ids across all declarations (tags, skills, mediums share no prefix with
  // templates/fills, but duplicates within each namespace are still a real authoring bug). ---
  const allIds = new Map<string, string>(); // id -> first source kind, for duplicate messages
  const declare = (id: string, kind: string) => {
    if (allIds.has(id)) fail(failures, id, "integrity.duplicate-id", `"${id}" declared more than once (${kind})`);
    else allIds.set(id, kind);
  };
  for (const s of lib.skills) declare(s.id, "skill");
  for (const m of lib.mediums) declare(m.id, "medium");
  for (const { value: t } of lib.templates) declare(t.id, "template");
  for (const { value: t } of lib.topics) declare(t.id, "topic");
  for (const { value: s } of lib.styles) declare(s.id, "style");
  for (const { value: c } of lib.constraints) declare(c.id, "constraint");
  const dupTagIds = new Set<string>();
  for (const t of lib.tags) {
    if (dupTagIds.has(t.id)) fail(failures, t.id, "integrity.duplicate-id", `tag "${t.id}" declared more than once`);
    dupTagIds.add(t.id);
  }

  // --- Tag vocabulary ---
  for (const s of lib.skills) checkTags(s.id, s.tags);
  for (const m of lib.mediums) checkTags(m.id, m.tags);
  for (const { value: t } of lib.templates) {
    checkTags(t.id, t.topicTags);
    checkTags(t.id, t.styleTags);
    checkTags(t.id, t.constraintTags);
    checkTags(t.id, t.tags);
  }
  for (const list of [lib.topics, lib.styles, lib.constraints]) {
    for (const { value: f } of list) checkTags(f.id, [...f.tags, ...f.requires, ...f.excludes]);
  }

  // --- Reference resolution (ids still resolve even once retired) ---
  const skillIds = new Set(lib.skills.map((s) => s.id));
  const mediumIds = new Set(lib.mediums.map((m) => m.id));
  const entityIds = new Set(allIds.keys()); // templates + topics + styles + constraints
  const resolvesAsIdOrTag = (ref: string) => entityIds.has(ref) || tagIds.has(ref);

  for (const { value: t } of lib.templates) {
    if (!skillIds.has(t.skill)) fail(failures, t.id, "integrity.unresolved", `skill "${t.skill}" does not exist`);
    for (const m of t.mediums)
      if (!mediumIds.has(m)) fail(failures, t.id, "integrity.unresolved", `medium "${m}" does not exist`);
    for (const ref of t.incompatible)
      if (!resolvesAsIdOrTag(ref)) fail(failures, t.id, "integrity.unresolved", `incompatible "${ref}" does not resolve`);
  }
  for (const a of lib.anchors) {
    const anchorRefs: [string, string][] = [
      ["templateId", a.templateId],
      ["mediumId", a.mediumId],
      ["topicId", a.topicId],
      ...(a.styleId !== null ? ([["styleId", a.styleId]] as [string, string][]) : []),
      ...(a.constraintId !== null ? ([["constraintId", a.constraintId]] as [string, string][]) : []),
    ];
    for (const [field, ref] of anchorRefs) {
      const resolved = field === "mediumId" ? mediumIds.has(ref) : entityIds.has(ref);
      if (!resolved) fail(failures, a.templateId, "integrity.unresolved", `anchor ${field} "${ref}" does not resolve`);
    }
  }

  const retiredIds = new Set<string>();
  for (const { value: t } of lib.templates) if (t.retired) retiredIds.add(t.id);
  for (const list of [lib.topics, lib.styles, lib.constraints])
    for (const { value: f } of list) if (f.retired) retiredIds.add(f.id);
  for (const { value: m, source } of lib.manifests) {
    for (const ref of m.retire) {
      if (!entityIds.has(ref))
        fail(failures, ref, "integrity.unresolved", `retire[] "${ref}" (batch ${source}) does not resolve`);
      else retiredIds.add(ref);
    }
  }

  const activeTemplates = lib.templates.filter((t) => !retiredIds.has(t.value.id)).map((t) => t.value);
  const activeMediums = lib.mediums; // Mediums are never retired (no `retired` field).
  const activeTopics = lib.topics.filter((t) => !retiredIds.has(t.value.id)).map((t) => t.value);
  const activeStyles = lib.styles.filter((t) => !retiredIds.has(t.value.id)).map((t) => t.value);
  const activeConstraints = lib.constraints.filter((t) => !retiredIds.has(t.value.id)).map((t) => t.value);

  // --- Brief rules, enumerated over every compatible combination of an active Template. ---
  // ponytail: full cross-product per Template, pre-filtered per slot by tag intersection.
  // Fine at anchors-only / pilot-batch scale; revisit with sampling if Epic 2's volume
  // makes this slow in CI.
  const candidatesForSlot = <T extends Fill>(fills: T[], slotTags: readonly string[]): (T | null)[] =>
    slotTags.length === 0 ? [null] : fills.filter((f) => f.tags.some((t) => slotTags.includes(t)));

  const countSentences = (s: string) => (s.trim().match(/[^.!?]*[.!?]+/g) ?? []).length;

  for (const template of activeTemplates) {
    const mediums = activeMediums.filter((m) => template.mediums.includes(m.id));
    for (const medium of mediums) {
      for (const topic of candidatesForSlot(activeTopics, template.topicTags)) {
        for (const style of candidatesForSlot(activeStyles, template.styleTags)) {
          for (const constraint of candidatesForSlot(activeConstraints, template.constraintTags)) {
            if (!isCompatible(template, medium, topic, style, constraint)) continue;
            const result = render(template, medium, { topic, style, constraint });
            if (!result.ok) continue; // reachability (0 valid Briefs) is Story 1.7's concern.
            const { brief } = result;
            if (/[{}]/.test(brief))
              fail(failures, template.id, "brief.braces", `rendered Brief still has braces: "${brief}"`);
            const sentences = countSentences(brief);
            if (sentences < config.brief.minSentences || sentences > config.brief.maxSentences)
              fail(
                failures,
                template.id,
                "brief.sentences",
                `Brief has ${sentences} sentence(s) (want ${config.brief.minSentences}-${config.brief.maxSentences}): "${brief}"`,
              );
            if (brief.length > config.brief.maxChars)
              fail(
                failures,
                template.id,
                "brief.length",
                `Brief is ${brief.length} chars (max ${config.brief.maxChars}): "${brief}"`,
              );
          }
        }
      }
    }
  }

  // --- Anchors: each must render byte-for-byte to its expectedBrief. ---
  const templateById = new Map(lib.templates.map((t) => [t.value.id, t.value]));
  const mediumById = new Map(lib.mediums.map((m) => [m.id, m]));
  const topicById = new Map(lib.topics.map((t) => [t.value.id, t.value]));
  const styleById = new Map(lib.styles.map((t) => [t.value.id, t.value]));
  const constraintById = new Map(lib.constraints.map((t) => [t.value.id, t.value]));

  for (const anchor of lib.anchors) {
    const template = templateById.get(anchor.templateId);
    const medium = mediumById.get(anchor.mediumId);
    const topic = topicById.get(anchor.topicId);
    const style = anchor.styleId === null ? null : styleById.get(anchor.styleId);
    const constraint = anchor.constraintId === null ? null : constraintById.get(anchor.constraintId);
    if (!template || !medium || !topic || style === undefined || constraint === undefined) continue; // already reported above

    if (!isCompatible(template, medium, topic, style, constraint)) {
      fail(failures, anchor.templateId, "anchor.incompatible", "anchor's own fills are not isCompatible()");
      continue;
    }
    const result = render(template, medium, { topic, style, constraint });
    if (!result.ok || result.brief !== anchor.expectedBrief)
      fail(
        failures,
        anchor.templateId,
        "anchor.mismatch",
        `render produced ${result.ok ? `"${result.brief}"` : `{ok:false, reason:"${result.reason}"}`}, expected "${anchor.expectedBrief}"`,
      );
  }

  // --- CL-4 lint: Style phrased as a rule, Constraint phrased as a mood/treatment. ---
  const firstWord = (s: string) => s.trim().toLowerCase().split(/\s+/)[0]?.replace(/[^a-z]/g, "") ?? "";
  const hasCountWord = (s: string) => {
    const lower = s.toLowerCase();
    if (/\d/.test(lower)) return true;
    return config.lint.styleCountWords.some((w) => new RegExp(`\\b${w}\\b`).test(lower));
  };

  for (const style of activeStyles) {
    for (const text of [style.revealText, style.briefText]) {
      const first = firstWord(text);
      if ((config.lint.styleRuleStartWords as readonly string[]).includes(first))
        fail(failures, style.id, "lint.style-rule", `starts with rule word "${first}": "${text}"`);
      if (hasCountWord(text)) fail(failures, style.id, "lint.style-count", `names a count: "${text}"`);
    }
  }

  const bareWord = (s: string) => s.trim().toLowerCase().replace(/[.!?]+$/, "");
  for (const constraint of activeConstraints) {
    for (const text of [constraint.revealText, constraint.briefText]) {
      const word = bareWord(text);
      if (!word.includes(" ") && (config.lint.constraintMoodWords as readonly string[]).includes(word))
        fail(failures, constraint.id, "lint.constraint-mood", `phrased as a bare mood/treatment word: "${text}"`);
    }
  }

  return {
    ok: failures.length === 0,
    failures,
    counts: {
      skills: lib.skills.length,
      mediums: lib.mediums.length,
      templates: lib.templates.length,
      topics: lib.topics.length,
      styles: lib.styles.length,
      constraints: lib.constraints.length,
      anchors: lib.anchors.length,
      batches: lib.manifests.length,
      retired: retiredIds.size,
    },
  };
}
