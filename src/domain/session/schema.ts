import { z } from "zod";
import { config } from "@/config/app";
import { ConstraintId, Level, MediumId, SkillId, StyleId, TemplateId, TopicId } from "@/domain/library/schema";

const text = z.string().trim().min(1);

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
  .strict()
  .superRefine((setup, ctx) => {
    if (new Set(setup.enabledMediums).size !== setup.enabledMediums.length) {
      ctx.addIssue({ code: "custom", path: ["enabledMediums"], message: "enabledMediums must not contain duplicate ids" });
    }
    if (setup.medium !== "random" && !setup.enabledMediums.includes(setup.medium)) {
      ctx.addIssue({ code: "custom", path: ["medium"], message: "medium must be \"random\" or one of enabledMediums (FR-2)" });
    }
  });
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

/** new/reroll never reference a Rep; retry/variation always copy from one (AD-3). */
export const Origin = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("new"), fromRepId: z.null() }).strict(),
  z.object({ kind: z.literal("reroll"), fromRepId: z.null() }).strict(),
  z.object({ kind: z.literal("retry"), fromRepId: z.uuid() }).strict(),
  z.object({ kind: z.literal("variation"), fromRepId: z.uuid() }).strict(),
]);
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

/**
 * Persisted Reflection has no length cap: `config.reflection.maxChars` may be
 * lowered later (AD-19 tunable), and a stored Rep or draft must still parse
 * even if its text now exceeds the current cap. Use `ReflectionInput` to
 * enforce the cap at the point of entry (the UI form, Story 5.6).
 */
export const Reflection = z
  .object({
    worked: z.string(),
    change: z.string(),
  })
  .strict();
export type Reflection = z.infer<typeof Reflection>;

export const ReflectionInput = z
  .object({
    worked: z.string().max(config.reflection.maxChars),
    change: z.string().max(config.reflection.maxChars),
  })
  .strict();
export type ReflectionInput = z.infer<typeof ReflectionInput>;

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
  .strict()
  .refine((e) => new Set(e.reps.map((r) => r.id)).size === e.reps.length, {
    path: ["reps"],
    message: "reps must have unique ids",
  });
export type Export = z.infer<typeof Export>;

// --- Session (AD-7, AD-9, AD-11, AD-18) --------------------------------------

export const SessionState = z.enum(["none", "held", "attempt", "finished", "saved"]);
export type SessionState = z.infer<typeof SessionState>;

/** Locked value per Input kind; always a subset (none, one, or several kinds). */
export const Locks = z
  .object({
    skill: SkillId,
    medium: MediumId,
    topic: TopicId,
    style: StyleId,
    constraint: ConstraintId,
  })
  .partial()
  .strict();
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
    // Keep only the newest entries: a transform (not a `.max()` rejection) so
    // a lowered `config.generator.recentWindow` never fails to parse a
    // previously-persisted session (AD-11, AD-19).
    recent: z.array(z.string().min(1)).transform((entries) => entries.slice(-config.generator.recentWindow)),
  })
  .strict()
  .superRefine((session, ctx) => {
    if (new Set(session.revealed).size !== session.revealed.length) {
      ctx.addIssue({ code: "custom", path: ["revealed"], message: "revealed must not contain duplicate kinds" });
    }
    if (session.state === "none" && (session.challenge !== null || session.attempt !== null)) {
      ctx.addIssue({ code: "custom", path: ["state"], message: "none must have no challenge and no attempt" });
    }
    if (session.state === "held" && (session.challenge === null || session.attempt !== null)) {
      ctx.addIssue({ code: "custom", path: ["state"], message: "held requires a challenge and no attempt" });
    }
    if (session.state === "attempt" && (session.challenge === null || session.attempt === null)) {
      ctx.addIssue({ code: "custom", path: ["state"], message: "attempt requires both a challenge and an attempt" });
    }
  });
export type Session = z.infer<typeof Session>;
