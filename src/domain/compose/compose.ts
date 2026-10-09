import { isCompatible } from "@/domain/library/compat";
import { render } from "@/domain/library/render";
import type {
  Constraint,
  Level,
  Medium,
  MediumId,
  Skill,
  SkillId,
  Style,
  Template,
  TemplateId,
  Topic,
  TopicId,
} from "@/domain/library/schema";
import type { Clock, Random } from "@/domain/ports";
import type { Challenge, ChallengeInputs, InputKind, Locks, Origin, PerformTiming } from "@/domain/session/schema";

/** The minimal synchronous library shape `compose()` needs (Story 3.6 builds the real loader). */
export type ComposeLibrary = {
  libraryVersion: string;
  skills: Skill[];
  mediums: Medium[];
  templates: Template[];
  topics: Topic[];
  styles: Style[];
  constraints: Constraint[];
};

export type ComposeRequest = {
  level: Level;
  performTiming: PerformTiming;
  enabledMediums: MediumId[];
  medium: MediumId | "random";
  skillFocus: SkillId | "random";
  locks: Locks;
  mustDiffer: Locks;
  origin: Origin;
};

export type ComposeResult =
  | { ok: true; challenge: Challenge }
  | { ok: false; reason: "no_compatible"; blockingLock: InputKind | null };

type Fill = Topic | Style | Constraint;

/** A renderable, `isCompatible()`-approved combination; `brief`/`guidance` are pre-rendered. */
type Combo = {
  template: Template;
  skill: Skill;
  medium: Medium;
  topic: Topic | null;
  style: Style | null;
  constraint: Constraint | null;
  brief: string;
  guidance: string | null;
};

/** All of one Template's renderable combos (never empty — Templates with none are dropped). */
type TemplateGroup = {
  template: Template;
  combos: Combo[];
};

const LOCK_ORDER: InputKind[] = ["skill", "medium", "topic", "style", "constraint"];

/** The single AD-11 recent-repeat key: `templateId+topicId`. Shared with the session reducer (Story 3.4). */
export function recentKeyFor(templateId: TemplateId, topicId: TopicId | null): string {
  return `${templateId}|${topicId ?? ""}`;
}

/** Clamps a `Random.next()` draw (contract: `[0,1)`, but never trust it) to a valid array index. */
function pickIndex(nextValue: number, length: number): number {
  return Math.min(Math.max(Math.floor(nextValue * length), 0), length - 1);
}

/**
 * The single AD-3 implementation behind New Challenge, Reroll, and Variation.
 * Pure and total: never throws, never returns a partial Challenge.
 */
export function compose(
  request: ComposeRequest,
  library: ComposeLibrary,
  recent: string[],
  clock: Clock,
  random: Random,
): ComposeResult {
  const nowMs = clock.now();
  if (!Number.isFinite(nowMs)) {
    // Totality: `new Date(NaN).toISOString()` throws, and a broken Clock names no Lock to blame.
    return { ok: false, reason: "no_compatible", blockingLock: null };
  }

  const groups = buildCandidates(request, library, request.locks);
  if (groups.length === 0) {
    return { ok: false, reason: "no_compatible", blockingLock: findBlockingLock(request, library) };
  }

  const recentSet = new Set(recent);
  const isFresh = (c: Combo) => !recentSet.has(recentKeyFor(c.template.id, c.topic?.id ?? null));

  // AD-11: pick the Template uniformly among Templates with a fresh combo, if any exist;
  // only fall back to the full set when the ring has exhausted every Template.
  const freshGroups = groups.filter((g) => g.combos.some(isFresh));
  const templatePool = freshGroups.length > 0 ? freshGroups : groups;
  const group = templatePool[pickIndex(random.next(), templatePool.length)];

  // Then pick uniformly among that Template's fresh combos, if any; else any of its combos.
  const freshCombos = group.combos.filter(isFresh);
  const comboPool = freshCombos.length > 0 ? freshCombos : group.combos;
  const picked = comboPool[pickIndex(random.next(), comboPool.length)];

  const inputs: ChallengeInputs = {
    skill: { id: picked.skill.id, revealText: picked.skill.revealText },
    medium: { id: picked.medium.id, revealText: picked.medium.revealText },
    ...(picked.topic ? { topic: { id: picked.topic.id, revealText: picked.topic.revealText } } : {}),
    ...(picked.style ? { style: { id: picked.style.id, revealText: picked.style.revealText } } : {}),
    ...(picked.constraint ? { constraint: { id: picked.constraint.id, revealText: picked.constraint.revealText } } : {}),
  };

  return {
    ok: true,
    challenge: {
      id: random.uuid(),
      createdAt: new Date(nowMs).toISOString(),
      libraryVersion: library.libraryVersion,
      templateId: picked.template.id,
      level: picked.template.level,
      timeLimitSec: picked.template.timeLimitSec ?? null,
      brief: picked.brief,
      guidance: picked.guidance,
      inputs,
      origin: request.origin,
    },
  };
}

function buildCandidates(request: ComposeRequest, library: ComposeLibrary, locks: Locks): TemplateGroup[] {
  // FR-2: a Lock must still satisfy the broader restriction it would otherwise override —
  // a disabled/unfocused Medium or an unfocused Skill can never be produced just by locking it.
  if (locks.skill && request.skillFocus !== "random" && request.skillFocus !== locks.skill) return [];
  if (
    locks.medium &&
    (!request.enabledMediums.includes(locks.medium) || (request.medium !== "random" && request.medium !== locks.medium))
  ) {
    return [];
  }

  const skillsById = new Map(library.skills.map((s) => [s.id, s]));
  const mediumsById = new Map(library.mediums.map((m) => [m.id, m]));
  const activeTopics = library.topics.filter((t) => !t.retired);
  const activeStyles = library.styles.filter((s) => !s.retired);
  const activeConstraints = library.constraints.filter((c) => !c.retired);

  const groups: TemplateGroup[] = [];

  for (const template of library.templates) {
    if (template.retired || template.level !== request.level) continue;
    if (!matchesPerformTiming(template, request.performTiming)) continue;
    if (locks.skill && template.skill !== locks.skill) continue;
    if (!locks.skill && request.skillFocus !== "random" && template.skill !== request.skillFocus) continue;
    if (request.mustDiffer.skill && template.skill === request.mustDiffer.skill) continue;

    const skill = skillsById.get(template.skill);
    if (!skill) continue;

    const incompatible = new Set(template.incompatible);
    const mediums = mediumChoices(template, request, locks, mediumsById);
    const topics = fillChoices(template.topicTags, activeTopics, incompatible, locks.topic, request.mustDiffer.topic);
    const styles = fillChoices(template.styleTags, activeStyles, incompatible, locks.style, request.mustDiffer.style);
    const constraints = fillChoices(
      template.constraintTags,
      activeConstraints,
      incompatible,
      locks.constraint,
      request.mustDiffer.constraint,
    );

    const combos: Combo[] = [];
    for (const medium of mediums) {
      for (const topic of topics) {
        for (const style of styles) {
          for (const constraint of constraints) {
            if (!isCompatible(template, medium, topic, style, constraint)) continue;
            const rendered = render(template, medium, { topic, style, constraint });
            if (!rendered.ok) continue; // defensive only: the library gate guarantees this never happens
            combos.push({ template, skill, medium, topic, style, constraint, brief: rendered.brief, guidance: rendered.guidance });
          }
        }
      }
    }
    if (combos.length > 0) groups.push({ template, combos });
  }

  return groups;
}

function matchesPerformTiming(template: Template, performTiming: PerformTiming): boolean {
  if (template.level !== "perform" || performTiming === "either") return true;
  const timed = template.timeLimitSec !== undefined;
  return performTiming === "timed" ? timed : !timed;
}

function mediumChoices(
  template: Template,
  request: ComposeRequest,
  locks: Locks,
  mediumsById: Map<MediumId, Medium>,
): Medium[] {
  if (locks.medium) {
    const m = mediumsById.get(locks.medium);
    return m && template.mediums.includes(m.id) && m.id !== request.mustDiffer.medium ? [m] : [];
  }
  return template.mediums
    .filter(
      (id) =>
        request.enabledMediums.includes(id) &&
        (request.medium === "random" || id === request.medium) &&
        id !== request.mustDiffer.medium,
    )
    .map((id) => mediumsById.get(id))
    .filter((m): m is Medium => m !== undefined);
}

/**
 * A slot is present iff `slotTags` is non-empty (same rule as `isCompatible`).
 * Pre-filters the pool to fills sharing a slot tag and not Template-incompatible, before the
 * caller's cross product multiplies it out — `isCompatible()` still makes the final call.
 */
function fillChoices<T extends Fill>(
  slotTags: string[],
  pool: T[],
  incompatible: Set<string>,
  lockId?: string,
  mustDifferId?: string,
): (T | null)[] {
  if (slotTags.length === 0) return lockId ? [] : [null];
  if (lockId) {
    const fill = pool.find((f) => f.id === lockId);
    return fill && fill.id !== mustDifferId ? [fill] : [];
  }
  return pool.filter((f) => f.id !== mustDifferId && !incompatible.has(f.id) && f.tags.some((t) => slotTags.includes(t)));
}

/** Names the one locked kind whose release alone would allow a result, else `null` (no Lock to name). */
function findBlockingLock(request: ComposeRequest, library: ComposeLibrary): InputKind | null {
  for (const kind of LOCK_ORDER) {
    if (request.locks[kind] === undefined) continue;
    const relaxed: Locks = { ...request.locks, [kind]: undefined };
    if (buildCandidates(request, library, relaxed).length > 0) return kind;
  }
  return null;
}
