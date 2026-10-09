import { z } from "zod";

/** AD-14: one schema defines the signup request, shared by client and server. */
export const subscribeRequestSchema = z.object({
  // Trim before validating (pasted addresses carry stray whitespace) and cap
  // length before the format check; z.email() (not the deprecated
  // z.string().email()) does the actual format validation.
  email: z.string().trim().max(254).pipe(z.email()),
  consent: z.boolean(),
  consentTextVersion: z.string().min(1).max(64),
  /** Honeypot. Humans leave it empty; a non-empty value means a bot. */
  website: z.string(),
});

export type SubscribeRequest = z.infer<typeof subscribeRequestSchema>;

export const SUBSCRIBE_ERROR_CODES = ["invalid_email", "consent_required", "rate_limited", "unavailable"] as const;

export type SubscribeErrorCode = (typeof SUBSCRIBE_ERROR_CODES)[number];

/** AD-14: one schema defines the response too, so client and server never drift. */
export const subscribeResponseSchema = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true) }),
  z.object({ ok: z.literal(false), error: z.enum(SUBSCRIBE_ERROR_CODES) }),
]);

export type SubscribeResponse = z.infer<typeof subscribeResponseSchema>;
