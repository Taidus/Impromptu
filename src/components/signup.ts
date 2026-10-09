import { subscribeRequestSchema, subscribeResponseSchema, type SubscribeErrorCode } from "@/shared/subscribe";

export type SignupError = SubscribeErrorCode | "offline";
export type SignupResult = { ok: true } | { ok: false; error: SignupError };
export type FetchLike = (input: string, init: RequestInit) => Promise<{ status: number; json(): Promise<unknown> }>;

export interface SignupValues {
  email: string;
  consent: boolean;
  consentTextVersion: string;
  website: string;
}

/** Client-side check with the shared schema (AD-14): email first, then consent. */
export function validateSignup(values: SignupValues): SignupError | null {
  if (!subscribeRequestSchema.shape.email.safeParse(values.email).success) return "invalid_email";
  if (values.consent !== true) return "consent_required";
  return null;
}

/** POSTs to /api/subscribe and maps every outcome to a SignupResult. Never throws. */
export async function submitSignup(fetchLike: FetchLike, values: SignupValues): Promise<SignupResult> {
  const invalid = validateSignup(values);
  if (invalid) return { ok: false, error: invalid };
  let response: { status: number; json(): Promise<unknown> };
  try {
    response = await fetchLike("/api/subscribe", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(values),
    });
  } catch {
    return { ok: false, error: "offline" };
  }
  if (response.status === 429) return { ok: false, error: "rate_limited" };
  const parsed = subscribeResponseSchema.safeParse(await response.json().catch(() => null));
  if (!parsed.success) return { ok: false, error: "unavailable" };
  return parsed.data.ok ? { ok: true } : { ok: false, error: parsed.data.error };
}
