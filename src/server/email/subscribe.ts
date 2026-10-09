import { Resend } from "resend";
import { subscribeRequestSchema, type SubscribeResponse } from "@/shared/subscribe";

/**
 * The slice of the Resend SDK this route depends on. Hand-written (not
 * `Pick<Resend, "contacts">`) because `Contacts`/`ContactSegments` are
 * `declare class`es with private fields, so a plain test double isn't
 * structurally assignable to them.
 */
export interface ResendContactsClient {
  contacts: {
    create(payload: {
      email: string;
      unsubscribed: boolean;
      segments: { id: string }[];
      properties: Record<string, string>;
    }): Promise<{ error: unknown }>;
    get(payload: { email: string }): Promise<{ data: unknown; error: unknown }>;
    update(payload: { email: string; properties: Record<string, string> }): Promise<{ error: unknown }>;
    segments: {
      add(payload: { email: string; segmentId: string }): Promise<{ error: unknown }>;
    };
  };
}

export function createResendClient(apiKey: string): ResendContactsClient {
  return new Resend(apiKey);
}

/** Logs a provider failure by stage, never the email address (AD-13). */
function logProviderError(stage: "create" | "get" | "segments.add" | "update" | "exception", error: unknown): void {
  const e = error as { name?: unknown; statusCode?: unknown } | null | undefined;
  console.error(`subscribe: Resend ${stage} failed`, { name: e?.name, statusCode: e?.statusCode });
}

/**
 * AD-14 signup contract. Never throws: every branch resolves a
 * `SubscribeResponse`, including when the client's promises reject.
 */
export async function handleSubscribe(
  rawBody: unknown,
  client: ResendContactsClient,
  segmentId: string,
): Promise<SubscribeResponse> {
  const body = rawBody as Record<string, unknown> | null;

  // Honeypot first: a filled hidden field means a bot. Pretend success and
  // never touch Resend, so the field never reveals whether it matters.
  if (typeof body?.website === "string" && body.website.length > 0) {
    return { ok: true };
  }

  // Email validity is checked on its own so a bad email always reports
  // invalid_email regardless of what consent holds.
  const emailResult = subscribeRequestSchema.shape.email.safeParse(body?.email);
  if (!emailResult.success) {
    return { ok: false, error: "invalid_email" };
  }

  // Consent is a value check (must be exactly `true`), not a type check, so
  // missing/null/non-boolean consent all map to consent_required.
  if (body?.consent !== true) {
    return { ok: false, error: "consent_required" };
  }

  // Everything else (consentTextVersion, website shape) is validated last.
  const parsed = subscribeRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    return { ok: false, error: "invalid_email" };
  }

  const { email, consentTextVersion } = parsed.data;
  const properties = {
    consent_at: new Date().toISOString(),
    consent_text_version: consentTextVersion,
  };

  try {
    const created = await client.contacts.create({
      email,
      unsubscribed: false,
      segments: [{ id: segmentId }],
      properties,
    });
    if (!created.error) {
      return { ok: true };
    }
    logProviderError("create", created.error);

    const existing = await client.contacts.get({ email });
    if (existing.error || !existing.data) {
      if (existing.error) logProviderError("get", existing.error);
      return { ok: false, error: "unavailable" };
    }

    const [added, updated] = await Promise.all([
      client.contacts.segments.add({ email, segmentId }),
      client.contacts.update({ email, properties }),
    ]);
    if (added.error) logProviderError("segments.add", added.error);
    if (updated.error) logProviderError("update", updated.error);
    if (added.error || updated.error) {
      return { ok: false, error: "unavailable" };
    }
    return { ok: true };
  } catch (err) {
    logProviderError("exception", err);
    return { ok: false, error: "unavailable" };
  }
}
