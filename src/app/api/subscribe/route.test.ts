import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const create = vi.fn().mockResolvedValue({ error: null });

vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation(function FakeResend() {
    // @ts-expect-error -- test double constructed with `new`, shape is intentionally partial
    this.contacts = { create, get: vi.fn(), update: vi.fn(), segments: { add: vi.fn() } };
  }),
}));

const { POST } = await import("./route");

const jsonRequest = (body: unknown) =>
  new Request("http://localhost/api/subscribe", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

describe("POST /api/subscribe", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.RESEND_API_KEY = "test-key";
    process.env.RESEND_SEGMENT_ID = "seg_test";
    create.mockClear();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("wires a valid signup through to Resend and responds ok:true", async () => {
    const res = await POST(
      jsonRequest({ email: "visitor@example.com", consent: true, consentTextVersion: "2026-10-09", website: "" }),
    );
    expect(await res.json()).toEqual({ ok: true });
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("honeypot short-circuits before Resend is ever constructed", async () => {
    const res = await POST(
      jsonRequest({
        email: "visitor@example.com",
        consent: true,
        consentTextVersion: "2026-10-09",
        website: "bot-filled",
      }),
    );
    expect(await res.json()).toEqual({ ok: true });
    expect(create).not.toHaveBeenCalled();
  });

  it("missing env vars fail closed with unavailable", async () => {
    delete process.env.RESEND_API_KEY;
    const res = await POST(
      jsonRequest({ email: "visitor@example.com", consent: true, consentTextVersion: "2026-10-09", website: "" }),
    );
    expect(await res.json()).toEqual({ ok: false, error: "unavailable" });
    expect(create).not.toHaveBeenCalled();
  });
});
