import { z } from "zod";

/** AD-14: one schema defines the signup request, shared by client and server. */
export const subscribeRequestSchema = z.object({
  email: z.string().email(),
  consent: z.boolean(),
  consentTextVersion: z.string(),
  /** Honeypot. Humans leave it empty; a non-empty value means a bot. */
  website: z.string(),
});

export type SubscribeRequest = z.infer<typeof subscribeRequestSchema>;

export const SUBSCRIBE_ERROR_CODES = ["invalid_email", "consent_required", "rate_limited", "unavailable"] as const;

export type SubscribeErrorCode = (typeof SUBSCRIBE_ERROR_CODES)[number];

export type SubscribeResponse = { ok: true } | { ok: false; error: SubscribeErrorCode };
