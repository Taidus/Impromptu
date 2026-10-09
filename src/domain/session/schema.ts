import { z } from "zod";
import { config } from "@/config/app";
import { ConstraintId, Level, MediumId, SkillId, StyleId, TemplateId, TopicId } from "@/domain/library/schema";

const text = z.string().trim().min(1);
const bounded = (maxChars: number) => z.string().max(maxChars);

export const PerformTiming = z.enum(["timed", "untimed", "either"]);
export type PerformTiming = z.infer<typeof PerformTiming>;

/** Input kinds, in the AD-5 / AD-18 order (the "brief" pseudo-kind lands last in a Reveal, see RevealedKind). */
export const InputKind = z.enum(["skill", "medium", "topic", "style", "constraint"]);
export type InputKind = z.infer<typeof InputKind>;

export const RevealedKind = z.enum(["skill", "medium", "topic", "style", "constraint", "brief"]);
export type RevealedKind = z.infer<typeof RevealedKind>;

// --- Setup (AD-9, FR-1..FR-4) ---------------------------------------------

export const Setup = z
  .object({
    level: Level,
    performTiming: PerformTiming,
    enabledMediums: z.array(MediumId).min(1),
    medium: z.union([MediumId, z.literal("random")]),
    skillFocus: z.union([SkillId, z.literal("random")]),
    quickReveal: z.boolean(),
    sound: z.boolean(),
    ambientMotion: z.boolean(),
  })
  .strict();
export type Setup = z.infer<typeof Setup>;

// --- Challenge (AD-5) -------------------------------------------------------

const inputEntry = <T extends z.ZodString>(id: T) => z.object({ id, revealText: text }).strict();

/** Keyed by Input kind; a kind the Template omits is absent (skill and medium are always present). */
export const ChallengeInputs = z
  .object({
    skill: inputEntry(SkillId),
    medium: inputEntry(MediumId),
    topic: inputEntry(TopicId).optional(),
    style: inputEntry(StyleId).optional(),
    constraint: inputEntry(ConstraintId).optional(),
  })
  .strict();
export type ChallengeInputs = z.infer<typeof ChallengeInputs>;

export const Origin = z
  .object({
    kind: z.enum(["new", "reroll", "retry", "variation"]),
    fromRepId: z.uuid().nullable(),
  })
  .strict();
export type Origin = z.infer<typeof Origin>;

export const Challenge = z
  .object({
    id: z.uuid(),
    createdAt: z.iso.datetime(),
    libraryVersion: text,
    templateId: TemplateId,
    level: Level,
    timeLimitSec: z.number().int().positive().nullable(),
    brief: text,
    guidance: text.nullable(),
    inputs: ChallengeInputs,
    origin: Origin,
  })
  .strict();
export type Challenge = z.infer<typeof Challenge>;

// --- Attempt (AD-8) ---------------------------------------------------------

export const Attempt = z
  .object({
    startedAt: z.number().int().nonnegative(),
    pausedAt: z.number().int().nonnegative().nullable(),
    pausedTotalMs: z.number().int().nonnegative(),
    timeLimitSec: z.number().int().positive().nullable(),
  })
  .strict();
export type Attempt = z.infer<typeof Attempt>;

// --- Rep & Export (AD-5) -----------------------------------------------------

export const Reflection = z
  .object({
    worked: bounded(config.reflection.maxChars),
    change: bounded(config.reflection.maxChars),
  })
  .strict();
export type Reflection = z.infer<typeof Reflection>;

export const Rep = z
  .object({
    id: z.uuid(),
    challenge: Challenge,
    finishedAt: z.iso.datetime(),
    timeUsedSec: z.number().int().nonnegative().nullable(),
    reflection: Reflection.nullable(),
  })
  .strict();
export type Rep = z.infer<typeof Rep>;

export const Export = z
  .object({
    app: z.literal("impromptu"),
    exportVersion: z.number().int().positive(),
    exportedAt: z.iso.datetime(),
    reps: z.array(Rep),
  })
  .strict();
export type Export = z.infer<typeof Export>;

// --- Session (AD-7, AD-9, AD-11, AD-18) --------------------------------------

export const SessionState = z.enum(["none", "held", "attempt", "finished", "saved"]);
export type SessionState = z.infer<typeof SessionState>;

export const Locks = z.partialRecord(InputKind, z.string());
export type Locks = z.infer<typeof Locks>;

export const ComposeError = z
  .object({
    reason: text,
    blockingLock: InputKind.nullable(),
  })
  .strict();
export type ComposeError = z.infer<typeof ComposeError>;

export const Session = z
  .object({
    state: SessionState,
    challenge: Challenge.nullable(),
    revealed: z.array(RevealedKind),
    locks: Locks,
    attempt: Attempt.nullable(),
    reflectionDraft: Reflection.nullable(),
    lastRepId: z.uuid().nullable(),
    lastComposeError: ComposeError.nullable(),
    recent: z.array(z.string()).max(config.generator.recentWindow),
  })
  .strict();
export type Session = z.infer<typeof Session>;
