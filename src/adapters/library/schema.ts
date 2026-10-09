import { z } from "zod";
import { Constraint, Medium, Skill, Style, Template, Topic } from "@/domain/library/schema";

const text = z.string().trim().min(1);

/**
 * The on-disk shape of `src/generated/library.json` (Story 1.7's build.ts output), validated at
 * load time. Field-for-field the same as `compose()`'s `ComposeLibrary` (src/domain/compose/compose.ts) --
 * reusing the same zod schemas from `src/domain/library/schema.ts` means `z.infer<typeof LibraryFile>`
 * structurally satisfies `ComposeLibrary` with no separate cast.
 */
export const LibraryFile = z
  .object({
    libraryVersion: text,
    skills: z.array(Skill),
    mediums: z.array(Medium),
    templates: z.array(Template),
    topics: z.array(Topic),
    styles: z.array(Style),
    constraints: z.array(Constraint),
  })
  .strict();
export type LibraryFile = z.infer<typeof LibraryFile>;
