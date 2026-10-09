import { afterEach, describe, expect, it, vi } from "vitest";
import { handleSubscribe, type ResendContactsClient } from "./subscribe";

const segmentId = "seg_test";

function fakeClient(overrides: Partial<ResendContactsClient["contacts"]> = {}): ResendContactsClient {
  return {
    contacts: {
      create: vi.fn().mockResolvedValue({ error: null }),
      get: vi.fn().mockResolvedValue({ data: null, error: { message: "not found" } }),
      update: vi.fn().mockResolvedValue({ error: null }),
      segments: { add: vi.fn().mockResolvedValue({ error: null }) },
      ...overrides,
    },
  };
}

const validBody = {
  email: "visitor@example.com",
  consent: true,
  consentTextVersion: "2026-10-09",
  website: "",
};

describe("handleSubscribe", () => {
  it("honeypot filled returns ok:true without calling Resend", async () => {
    const client = fakeClient();
    const result = await handleSubscribe({ ...validBody, website: "https://spam.example" }, client, segmentId);
    expect(result).toEqual({ ok: true });
    expect(client.contacts.create).not.toHaveBeenCalled();
  });

  it("malformed email returns invalid_email", async () => {
    const client = fakeClient();
    const result = await handleSubscribe({ ...validBody, email: "nope" }, client, segmentId);
    expect(result).toEqual({ ok: false, error: "invalid_email" });
    expect(client.contacts.create).not.toHaveBeenCalled();
  });

  it("consent false returns consent_required", async () => {
    const client = fakeClient();
    const result = await handleSubscribe({ ...validBody, consent: false }, client, segmentId);
    expect(result).toEqual({ ok: false, error: "consent_required" });
    expect(client.contacts.create).not.toHaveBeenCalled();
  });

  it("consent omitted entirely returns consent_required (not invalid_email)", async () => {
    const { consent, ...bodyWithoutConsent } = validBody;
    void consent;
    const client = fakeClient();
    const result = await handleSubscribe(bodyWithoutConsent, client, segmentId);
    expect(result).toEqual({ ok: false, error: "consent_required" });
    expect(client.contacts.create).not.toHaveBeenCalled();
  });

  it("new contact creates with segment and properties, returns ok:true", async () => {
    const client = fakeClient();
    const result = await handleSubscribe(validBody, client, segmentId);
    expect(result).toEqual({ ok: true });
    expect(client.contacts.create).toHaveBeenCalledWith({
      email: validBody.email,
      unsubscribed: false,
      segments: [{ id: segmentId }],
      properties: {
        consent_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
        consent_text_version: validBody.consentTextVersion,
      },
    });
  });

  it("existing contact adds the segment and updates properties without touching unsubscribed", async () => {
    const client = fakeClient({
      create: vi.fn().mockResolvedValue({ error: { message: "exists" } }),
      get: vi.fn().mockResolvedValue({ data: { id: "contact_1" }, error: null }),
    });
    const result = await handleSubscribe(validBody, client, segmentId);
    expect(result).toEqual({ ok: true });
    expect(client.contacts.segments.add).toHaveBeenCalledWith({ email: validBody.email, segmentId });
    expect(client.contacts.update).toHaveBeenCalledWith({
      email: validBody.email,
      properties: {
        consent_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
        consent_text_version: validBody.consentTextVersion,
      },
    });
    const updateCall = (client.contacts.update as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(updateCall).not.toHaveProperty("unsubscribed");
  });

  it("provider failure (create errors, lookup also fails) returns unavailable", async () => {
    const client = fakeClient({
      create: vi.fn().mockResolvedValue({ error: { message: "down" } }),
      get: vi.fn().mockResolvedValue({ data: null, error: { message: "down" } }),
    });
    const result = await handleSubscribe(validBody, client, segmentId);
    expect(result).toEqual({ ok: false, error: "unavailable" });
  });

  it("provider failure (segment add fails after found existing contact) returns unavailable", async () => {
    const client = fakeClient({
      create: vi.fn().mockResolvedValue({ error: { message: "exists" } }),
      get: vi.fn().mockResolvedValue({ data: { id: "contact_1" }, error: null }),
      segments: { add: vi.fn().mockResolvedValue({ error: { message: "down" } }) },
    });
    const result = await handleSubscribe(validBody, client, segmentId);
    expect(result).toEqual({ ok: false, error: "unavailable" });
  });

  it("provider failure (update fails even though segments.add succeeds) returns unavailable", async () => {
    const client = fakeClient({
      create: vi.fn().mockResolvedValue({ error: { message: "exists" } }),
      get: vi.fn().mockResolvedValue({ data: { id: "contact_1" }, error: null }),
      update: vi.fn().mockResolvedValue({ error: { message: "down" } }),
    });
    const result = await handleSubscribe(validBody, client, segmentId);
    expect(result).toEqual({ ok: false, error: "unavailable" });
    expect(client.contacts.segments.add).toHaveBeenCalled();
  });

  it("client throwing is caught and returns unavailable", async () => {
    const client = fakeClient({ create: vi.fn().mockRejectedValue(new Error("network down")) });
    const result = await handleSubscribe(validBody, client, segmentId);
    expect(result).toEqual({ ok: false, error: "unavailable" });
  });

  describe("provider-failure logging", () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("never logs the email address across any failure branch", async () => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const client = fakeClient({
        create: vi.fn().mockResolvedValue({ error: { name: "down", statusCode: 500 } }),
        get: vi.fn().mockResolvedValue({ data: null, error: { name: "down", statusCode: 500 } }),
      });

      await handleSubscribe(validBody, client, segmentId);

      expect(errorSpy).toHaveBeenCalled();
      for (const call of errorSpy.mock.calls) {
        expect(JSON.stringify(call)).not.toContain(validBody.email);
      }
    });
  });
});
