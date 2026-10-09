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

type Combo = {
  template: Template;
  skill: Skill;
  medium: Medium;
  topic: Topic | null;
  style: Style | null;
  constraint: Constraint | null;
};

const LOCK_ORDER: InputKind[] = ["skill", "medium", "topic", "style", "constraint"];

/** The single AD-11 recent-repeat key: `templateId+topicId`. Shared with the session reducer (Story 3.4). */
export function recentKeyFor(templateId: TemplateId, topicId: TopicId | null): string {
  return `${templateId}|${topicId ?? ""}`;
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
  const combos = buildCandidates(request, library, request.locks);
  if (combos.length === 0) {
    return { ok: false, reason: "no_compatible", blockingLock: findBlockingLock(request, library) };
  }

  const recentSet = new Set(recent);
  const fresh = combos.filter((c) => !recentSet.has(recentKeyFor(c.template.id, c.topic?.id ?? null)));
  const pool = fresh.length > 0 ? fresh : combos;
  const picked = pool[Math.floor(random.next() * pool.length)];

  const rendered = render(picked.template, picked.medium, {
    topic: picked.topic,
    style: picked.style,
    constraint: picked.constraint,
  });
  if (!rendered.ok) {
    // Defensive only: the library gate (Story 1.6) guarantees every isCompatible
    // combo renders. Never surface a partial Challenge if it somehow doesn't.
    return { ok: false, reason: "no_compatible", blockingLock: null };
  }

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
      createdAt: new Date(clock.now()).toISOString(),
      libraryVersion: library.libraryVersion,
      templateId: picked.template.id,
      level: picked.template.level,
      timeLimitSec: picked.template.timeLimitSec ?? null,
      brief: rendered.brief,
      guidance: rendered.guidance,
      inputs,
      origin: request.origin,
    },
  };
}

function buildCandidates(request: ComposeRequest, library: ComposeLibrary, locks: Locks): Combo[] {
  const skillsById = new Map(library.skills.map((s) => [s.id, s]));
  const activeTopics = library.topics.filter((t) => !t.retired);
  const activeStyles = library.styles.filter((s) => !s.retired);
  const activeConstraints = library.constraints.filter((c) => !c.retired);

  const combos: Combo[] = [];

  for (const template of library.templates) {
    if (template.retired || template.level !== request.level) continue;
    if (!matchesPerformTiming(template, request.performTiming)) continue;
    if (locks.skill && template.skill !== locks.skill) continue;
    if (!locks.skill && request.skillFocus !== "random" && template.skill !== request.skillFocus) continue;
    if (request.mustDiffer.skill && template.skill === request.mustDiffer.skill) continue;

    const skill = skillsById.get(template.skill);
    if (!skill) continue;

    const mediums = mediumChoices(template, request, library, locks);
    const topics = fillChoices(template.topicTags, activeTopics, locks.topic, request.mustDiffer.topic);
    const styles = fillChoices(template.styleTags, activeStyles, locks.style, request.mustDiffer.style);
    const constraints = fillChoices(template.constraintTags, activeConstraints, locks.constraint, request.mustDiffer.constraint);

    for (const medium of mediums) {
      for (const topic of topics) {
        for (const style of styles) {
          for (const constraint of constraints) {
            if (isCompatible(template, medium, topic, style, constraint)) {
              combos.push({ template, skill, medium, topic, style, constraint });
            }
          }
        }
      }
    }
  }

  return combos;
}

function matchesPerformTiming(template: Template, performTiming: PerformTiming): boolean {
  if (template.level !== "perform" || performTiming === "either") return true;
  const timed = template.timeLimitSec !== undefined;
  return performTiming === "timed" ? timed : !timed;
}

function mediumChoices(template: Template, request: ComposeRequest, library: ComposeLibrary, locks: Locks): Medium[] {
  const byId = new Map(library.mediums.map((m) => [m.id, m]));
  if (locks.medium) {
    const m = byId.get(locks.medium);
    return m && template.mediums.includes(m.id) && m.id !== request.mustDiffer.medium ? [m] : [];
  }
  return template.mediums
    .filter(
      (id) =>
        request.enabledMediums.includes(id) &&
        (request.medium === "random" || id === request.medium) &&
        id !== request.mustDiffer.medium,
    )
    .map((id) => byId.get(id))
    .filter((m): m is Medium => m !== undefined);
}

/** A slot is present iff `slotTags` is non-empty (same rule as `isCompatible`). */
function fillChoices<T extends Fill>(slotTags: string[], pool: T[], lockId?: string, mustDifferId?: string): (T | null)[] {
  if (slotTags.length === 0) return lockId ? [] : [null];
  if (lockId) {
    const fill = pool.find((f) => f.id === lockId);
    return fill && fill.id !== mustDifferId ? [fill] : [];
  }
  return pool.filter((f) => f.id !== mustDifferId);
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
