import type { Constraint, Medium, Style, Template, Topic } from "./schema";

export type Slot = "topic" | "style" | "constraint";
export type RenderFills = { topic: Topic | null; style: Style | null; constraint: Constraint | null };
export type RenderResult =
  | { ok: true; brief: string; guidance: string | null }
  | {
      ok: false;
      reason: "no_pattern_for_medium" | "unknown_slot" | "missing_fill" | "unused_fill";
      slot?: Slot;
    };

const SLOTS: Slot[] = ["topic", "style", "constraint"];

/** The single Brief renderer. Never throws; slot/fill mismatches return `{ok:false}`. */
export function render(template: Template, medium: Medium, fills: RenderFills): RenderResult {
  const pattern =
    typeof template.briefPattern === "string"
      ? template.briefPattern
      : Object.hasOwn(template.briefPattern, medium.id)
        ? template.briefPattern[medium.id]
        : undefined;
  if (pattern === undefined) return { ok: false, reason: "no_pattern_for_medium" };

  const tokens = new Set([...pattern.matchAll(/\{([^{}]*)\}/g)].map((m) => m[1]));
  if ([...tokens].some((t) => !(SLOTS as string[]).includes(t))) return { ok: false, reason: "unknown_slot" };
  for (const slot of SLOTS) {
    if (tokens.has(slot) && fills[slot] === null) return { ok: false, reason: "missing_fill", slot };
    if (!tokens.has(slot) && fills[slot] !== null) return { ok: false, reason: "unused_fill", slot };
  }

  // Single pass so a fill's briefText is never itself re-substituted.
  const brief = pattern.replace(/\{(topic|style|constraint)\}/g, (_, s: Slot) => fills[s]!.briefText);
  return { ok: true, brief, guidance: template.guidance ?? null };
}
