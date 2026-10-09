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
  /** Batch folder name, or "anchors" / "base", when the culprit's origin is known. */
  source?: string;
}

export interface GateReport {
  ok: boolean;
  failures: GateFailure[];
  counts: {
    // Totals — includes retired entities; `retired` says how many of each bucket that is.
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

function fail(failures: GateFailure[], id: string, rule: string, message: string, source?: string) {
  failures.push(source === undefined ? { id, rule, message } : { id, rule, message, source });
}

/** Last write wins in a plain Map(); first declaration wins here, matching the
 * integrity.duplicate-id check (the first copy of a reused id is the canonical one). */
function firstWins<T>(items: T[], idOf: (v: T) => string): Map<string, T> {
  const map = new Map<string, T>();
  for (const v of items) {
    const id = idOf(v);
    if (!map.has(id)) map.set(id, v);
  }
  return map;
}

/** De-duplicate by (rule, culprit id): keeps the first failure's shape, merging in any
 * distinct later message for the same pair so one bad fill can't flood the report while
 * still surfacing every distinct problem recorded against that id. */
function dedupe(failures: GateFailure[]): GateFailure[] {
  const byKey = new Map<string, GateFailure>();
  for (const f of failures) {
    const key = `${f.rule}::${f.id}`;
    const existing = byKey.get(key);
    if (!existing) byKey.set(key, { ...f });
    else if (!existing.message.includes(f.message)) existing.message += `; ${f.message}`;
  }
  return [...byKey.values()];
}

export function runGate(lib: GateInput, config: GateConfig): GateReport {
  const failures: GateFailure[] = [];

  for (const issue of lib.issues) fail(failures, issue.source, "integrity.parse", issue.message);

  const tagIds = new Set(lib.tags.map((t) => t.id));
  const checkTags = (id: string, list: readonly string[], source?: string) => {
    for (const t of list) if (!tagIds.has(t)) fail(failures, id, "integrity.unknown-tag", `unknown tag "${t}"`, source);
  };

  // --- Unique ids across all declarations (tags, skills, mediums share no prefix with
  // templates/fills, but duplicates within each namespace are still a real authoring bug). ---
  const allIds = new Map<string, string>(); // id -> first source kind, for duplicate messages
  const declare = (id: string, kind: string, source?: string) => {
    if (allIds.has(id)) fail(failures, id, "integrity.duplicate-id", `"${id}" declared more than once (${kind})`, source);
    else allIds.set(id, kind);
  };
  for (const s of lib.skills) declare(s.id, "skill");
  for (const m of lib.mediums) declare(m.id, "medium");
  for (const { value: t, source } of lib.templates) declare(t.id, "template", source);
  for (const { value: t, source } of lib.topics) declare(t.id, "topic", source);
  for (const { value: s, source } of lib.styles) declare(s.id, "style", source);
  for (const { value: c, source } of lib.constraints) declare(c.id, "constraint", source);
  const dupTagIds = new Set<string>();
  for (const t of lib.tags) {
    if (dupTagIds.has(t.id)) fail(failures, t.id, "integrity.duplicate-id", `tag "${t.id}" declared more than once`);
    dupTagIds.add(t.id);
  }

  // --- Tag vocabulary ---
  for (const s of lib.skills) checkTags(s.id, s.tags);
  for (const m of lib.mediums) checkTags(m.id, m.tags);
  for (const { value: t, source } of lib.templates) {
    checkTags(t.id, t.topicTags, source);
    checkTags(t.id, t.styleTags, source);
    checkTags(t.id, t.constraintTags, source);
    checkTags(t.id, t.tags, source);
  }
  for (const list of [lib.topics, lib.styles, lib.constraints]) {
    for (const { value: f, source } of list) checkTags(f.id, [...f.tags, ...f.requires, ...f.excludes], source);
  }

  // --- Id sets. `entityIds` is templates + fills ONLY (matches the EntityId union that
  // incompatible[]/retire[]/edits[]/rejectedIds are typed against) — skills and Mediums
  // are base data and never referenced that way. ---
  const skillIds = new Set(lib.skills.map((s) => s.id));
  const mediumIds = new Set(lib.mediums.map((m) => m.id));
  const templateIds = new Set(lib.templates.map((t) => t.value.id));
  const topicIds = new Set(lib.topics.map((t) => t.value.id));
  const styleIds = new Set(lib.styles.map((t) => t.value.id));
  const constraintIds = new Set(lib.constraints.map((t) => t.value.id));
  const entityIds = new Set([...templateIds, ...topicIds, ...styleIds, ...constraintIds]);
  const resolvesAsIdOrTag = (ref: string) => entityIds.has(ref) || tagIds.has(ref);

  // --- Retired set: an entity's own `retired: true`, or any batch's manifest.retire[].
  // Reference checks use the full id set below, so a retired id stays resolvable. ---
  const retiredIds = new Set<string>();
  for (const { value: t } of lib.templates) if (t.retired) retiredIds.add(t.id);
  for (const list of [lib.topics, lib.styles, lib.constraints])
    for (const { value: f } of list) if (f.retired) retiredIds.add(f.id);

  for (const { value: m, source } of lib.manifests) {
    for (const ref of m.retire) {
      if (!entityIds.has(ref)) fail(failures, ref, "integrity.unresolved", `retire[] "${ref}" does not resolve`, source);
      else retiredIds.add(ref);
    }
    for (const edit of m.edits) {
      if (!entityIds.has(edit.id))
        fail(failures, edit.id, "integrity.unresolved", `edits[].id "${edit.id}" does not resolve`, source);
    }
    if (m.review) {
      for (const ref of m.review.rejectedIds) {
        if (!entityIds.has(ref))
          fail(failures, ref, "integrity.unresolved", `review.rejectedIds "${ref}" does not resolve`, source);
      }
    }
  }

  // --- Template reference resolution + Time Limit (defense in depth: the Story 1.3 schema
  // already refines this, but the gate checks it directly too since it is listed as the
  // gate's own duty and gate.test.ts exercises runGate with hand-built fixtures). ---
  for (const { value: t, source } of lib.templates) {
    if (!skillIds.has(t.skill)) fail(failures, t.id, "integrity.unresolved", `skill "${t.skill}" does not exist`, source);
    for (const m of t.mediums)
      if (!mediumIds.has(m)) fail(failures, t.id, "integrity.unresolved", `medium "${m}" does not exist`, source);
    for (const ref of t.incompatible)
      if (!resolvesAsIdOrTag(ref))
        fail(failures, t.id, "integrity.unresolved", `incompatible "${ref}" does not resolve`, source);
    if (t.timeLimitSec !== undefined && t.level !== "perform")
      fail(failures, t.id, "integrity.time-limit", `timeLimitSec is only allowed at the perform level (level "${t.level}")`, source);
  }

  // --- Anchors are required: the gate has nothing to prove the quality bar with otherwise. ---
  if (lib.anchors.length === 0)
    fail(failures, "anchors", "anchor.missing", "no anchors loaded (content/library/anchors/anchors.json)", "anchors");

  // --- Anchor reference resolution: each field against its OWN kind's set (not a pooled
  // set), so a field pointing at the wrong kind of entity is actually caught, not silently
  // treated as resolved. Also fails an anchor that resolves but points at a retired id. ---
  for (const a of lib.anchors) {
    const fields: [string, string | null, Set<string>][] = [
      ["templateId", a.templateId, templateIds],
      ["mediumId", a.mediumId, mediumIds],
      ["topicId", a.topicId, topicIds],
      ["styleId", a.styleId, styleIds],
      ["constraintId", a.constraintId, constraintIds],
    ];
    let resolvedAll = true;
    for (const [field, ref, set] of fields) {
      if (ref === null) continue; // nullable Style/Constraint slot
      if (!set.has(ref)) {
        fail(failures, a.templateId, "integrity.unresolved", `anchor ${field} "${ref}" does not resolve`, "anchors");
        resolvedAll = false;
      }
    }
    if (resolvedAll) {
      const refs = [a.templateId, a.topicId, a.styleId, a.constraintId].filter((r): r is string => r !== null);
      const retiredRef = refs.find((r) => retiredIds.has(r));
      if (retiredRef)
        fail(failures, a.templateId, "anchor.retired", `anchor references retired id "${retiredRef}"`, "anchors");
    }
  }

  // First-wins by-id maps, consistent with the duplicate-id check above (the first
  // declaration of a reused id is canonical for enumeration, linting, and anchor lookups).
  const templateMap = firstWins(lib.templates, (t) => t.value.id);
  const topicMap = firstWins(lib.topics, (t) => t.value.id);
  const styleMap = firstWins(lib.styles, (t) => t.value.id);
  const constraintMap = firstWins(lib.constraints, (t) => t.value.id);
  const mediumById = firstWins(lib.mediums, (m) => m.id);

  const activeTemplates = [...templateMap.values()].filter((t) => !retiredIds.has(t.value.id));
  const activeMediums = lib.mediums; // Mediums are never retired (no `retired` field).
  const activeTopics = [...topicMap.values()].filter((t) => !retiredIds.has(t.value.id));
  const activeStyles = [...styleMap.values()].filter((t) => !retiredIds.has(t.value.id));
  const activeConstraints = [...constraintMap.values()].filter((t) => !retiredIds.has(t.value.id));

  // --- Brief rules, enumerated over every compatible combination of an active Template. ---
  // ponytail: full cross-product per Template, pre-filtered per slot by tag intersection.
  // Fine at anchors-only / pilot-batch scale; revisit with sampling if Epic 2's volume
  // makes this slow in CI.
  const candidatesForSlot = <T extends Fill>(fills: Sourced<T>[], slotTags: readonly string[]): (Sourced<T> | null)[] =>
    slotTags.length === 0 ? [null] : fills.filter((f) => f.value.tags.some((t) => slotTags.includes(t)));

  const countSentences = (s: string) => {
    // A '.' between two digits is a decimal point (e.g. "3.5"), not a sentence break.
    const withoutDecimalPoints = s.replace(/(\d)\.(?=\d)/g, "$1");
    return (withoutDecimalPoints.trim().match(/[^.!?]*[.!?]+/g) ?? []).length;
  };

  for (const ts of activeTemplates) {
    const template = ts.value;
    const eligibleMediums = activeMediums.filter((m) => template.mediums.includes(m.id));
    for (const medium of eligibleMediums) {
      for (const topicS of candidatesForSlot(activeTopics, template.topicTags)) {
        for (const styleS of candidatesForSlot(activeStyles, template.styleTags)) {
          for (const constraintS of candidatesForSlot(activeConstraints, template.constraintTags)) {
            const topic = topicS?.value ?? null;
            const style = styleS?.value ?? null;
            const constraint = constraintS?.value ?? null;
            if (!isCompatible(template, medium, topic, style, constraint)) continue;

            const result = render(template, medium, { topic, style, constraint });
            if (!result.ok) {
              if (result.reason === "unknown_slot")
                fail(
                  failures,
                  template.id,
                  "brief.braces",
                  `briefPattern for medium "${medium.id}" has an unrecognized token`,
                  ts.source,
                );
              else if (result.reason === "no_pattern_for_medium")
                fail(failures, template.id, "integrity.no-pattern", `no briefPattern defined for medium "${medium.id}"`, ts.source);
              // missing_fill / unused_fill: reachability (0 valid Briefs) is Story 1.7's concern.
              continue;
            }

            const { brief } = result;
            const fillSources: (Sourced<Fill> | null)[] = [topicS, styleS, constraintS];
            const culprit = (check: (text: string) => boolean) =>
              fillSources.find((f): f is Sourced<Fill> => f !== null && check(f.value.briefText));

            if (/[{}]/.test(brief)) {
              const c = culprit((text) => /[{}]/.test(text));
              fail(
                failures,
                c?.value.id ?? template.id,
                "brief.braces",
                `rendered Brief still has braces: "${brief}"`,
                c?.source ?? ts.source,
              );
            }
            if (!/[.!?]$/.test(brief.trim())) {
              const c = culprit((text) => !/[.!?]$/.test(text.trim()));
              fail(
                failures,
                c?.value.id ?? template.id,
                "brief.sentences",
                `Brief does not end with "." "!" or "?": "${brief}"`,
                c?.source ?? ts.source,
              );
            }
            const sentences = countSentences(brief);
            if (sentences < config.brief.minSentences || sentences > config.brief.maxSentences) {
              const c = culprit((text) => countSentences(text) > 1);
              fail(
                failures,
                c?.value.id ?? template.id,
                "brief.sentences",
                `Brief has ${sentences} sentence(s) (want ${config.brief.minSentences}-${config.brief.maxSentences}): "${brief}"`,
                c?.source ?? ts.source,
              );
            }
            if (brief.length > config.brief.maxChars) {
              const c = culprit((text) => text.length > config.brief.maxChars);
              fail(
                failures,
                c?.value.id ?? template.id,
                "brief.length",
                `Brief is ${brief.length} chars (max ${config.brief.maxChars}): "${brief}"`,
                c?.source ?? ts.source,
              );
            }
          }
        }
      }
    }
  }

  // --- Anchors: each must render byte-for-byte to its expectedBrief. ---
  for (const anchor of lib.anchors) {
    const template = templateMap.get(anchor.templateId)?.value;
    const medium = mediumById.get(anchor.mediumId);
    const topic = topicMap.get(anchor.topicId)?.value;
    const style = anchor.styleId === null ? null : styleMap.get(anchor.styleId)?.value;
    const constraint = anchor.constraintId === null ? null : constraintMap.get(anchor.constraintId)?.value;
    if (!template || !medium || !topic || style === undefined || constraint === undefined) continue; // already reported above

    if (!isCompatible(template, medium, topic, style, constraint)) {
      fail(failures, anchor.templateId, "anchor.incompatible", "anchor's own fills are not isCompatible()", "anchors");
      continue;
    }
    const result = render(template, medium, { topic, style, constraint });
    if (!result.ok || result.brief !== anchor.expectedBrief)
      fail(
        failures,
        anchor.templateId,
        "anchor.mismatch",
        `render produced ${result.ok ? `"${result.brief}"` : `{ok:false, reason:"${result.reason}"}`}, expected "${anchor.expectedBrief}"`,
        "anchors",
      );
  }

  // --- CL-4 lint: Style phrased as a rule, Constraint phrased as a mood/treatment. ---
  const firstWord = (s: string) => s.trim().toLowerCase().split(/\s+/)[0]?.replace(/[^a-z]/g, "") ?? "";

  // Standalone only: a digit run or number word not glued to a letter or hyphen, so
  // "1920s", "35mm", and "one-point" don't count, but "three" and a bare "3" do.
  const hasStandaloneCount = (text: string) => {
    const lower = text.toLowerCase();
    if (/(?<![a-z0-9-])\d+(?![a-z0-9-])/.test(lower)) return true;
    return config.lint.styleCountWords.some((w) => new RegExp(`(?<![a-z-])${w}(?![a-z-])`).test(lower));
  };

  for (const styleS of activeStyles) {
    const style = styleS.value;
    for (const text of [style.revealText, style.briefText]) {
      const first = firstWord(text);
      if ((config.lint.styleRuleStartWords as readonly string[]).includes(first))
        fail(failures, style.id, "lint.style-rule", `starts with rule word "${first}": "${text}"`, styleS.source);
      if (hasStandaloneCount(text)) fail(failures, style.id, "lint.style-count", `names a count: "${text}"`, styleS.source);
    }
  }

  // A mood/treatment phrase: every word is a mood word, an intensifier, or "and"/"or", and
  // at least one mood word is present — catches a bare "moody" as well as "very moody" and
  // "dreamy and soft".
  const CONNECTORS = new Set(["and", "or"]);
  const isMoodPhrase = (text: string) => {
    const words = text
      .trim()
      .toLowerCase()
      .replace(/[.!?]+$/, "")
      .split(/\s+/)
      .filter(Boolean);
    if (words.length === 0) return false;
    const moodWords = config.lint.constraintMoodWords as readonly string[];
    const intensifiers = config.lint.moodIntensifiers as readonly string[];
    const hasMoodWord = words.some((w) => moodWords.includes(w));
    const allRecognized = words.every((w) => moodWords.includes(w) || intensifiers.includes(w) || CONNECTORS.has(w));
    return hasMoodWord && allRecognized;
  };

  for (const constraintS of activeConstraints) {
    const constraint = constraintS.value;
    for (const text of [constraint.revealText, constraint.briefText]) {
      if (isMoodPhrase(text))
        fail(
          failures,
          constraint.id,
          "lint.constraint-mood",
          `phrased as a mood/treatment word or phrase: "${text}"`,
          constraintS.source,
        );
    }
  }

  const deduped = dedupe(failures);
  return {
    ok: deduped.length === 0,
    failures: deduped,
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
