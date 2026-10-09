import type { SubscribeResponse } from "@/shared/subscribe";
import { createResendClient, handleSubscribe } from "@/server/email/subscribe";

// AD-14: the one dynamic route. Node runtime, never cached.
export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  const body: unknown = await request.json().catch(() => null);

  const apiKey = process.env.RESEND_API_KEY;
  const segmentId = process.env.RESEND_SEGMENT_ID;
  if (!apiKey || !segmentId) {
    return Response.json({ ok: false, error: "unavailable" } satisfies SubscribeResponse);
  }

  const result = await handleSubscribe(body, createResendClient(apiKey), segmentId);
  return Response.json(result);
}
