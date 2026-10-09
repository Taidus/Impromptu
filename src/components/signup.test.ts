import { describe, expect, it } from "vitest";
import { submitSignup, validateSignup, type FetchLike, type SignupValues } from "./signup";

const values: SignupValues = { email: "a@b.co", consent: true, consentTextVersion: "2026-10-09", website: "" };
const reply = (status: number, body: unknown): FetchLike => async () => ({ status, json: async () => body });

describe("validateSignup", () => {
  it("reports the email before consent", () => {
    expect(validateSignup({ ...values, email: "nope", consent: false })).toBe("invalid_email");
    expect(validateSignup({ ...values, consent: false })).toBe("consent_required");
    expect(validateSignup(values)).toBeNull();
    expect(validateSignup({ ...values, email: "  a@b.co " })).toBeNull(); // schema trims; the server trims again
  });
});

describe("submitSignup", () => {
  it("does not call fetch when validation fails", async () => {
    let calls = 0;
    const fetchLike: FetchLike = async () => (calls++, { status: 200, json: async () => ({ ok: true }) });
    expect(await submitSignup(fetchLike, { ...values, consent: false })).toEqual({ ok: false, error: "consent_required" });
    expect(calls).toBe(0);
  });
  it("posts JSON to /api/subscribe and returns ok", async () => {
    let seen: { input: string; init: RequestInit } | null = null;
    const fetchLike: FetchLike = async (input, init) => ((seen = { input, init }), { status: 200, json: async () => ({ ok: true }) });
    expect(await submitSignup(fetchLike, values)).toEqual({ ok: true });
    expect(seen!.input).toBe("/api/subscribe");
    expect(JSON.parse(seen!.init.body as string)).toEqual(values);
  });
  it("maps 429, server errors, malformed bodies and thrown fetches", async () => {
    expect(await submitSignup(reply(429, {}), values)).toEqual({ ok: false, error: "rate_limited" });
    expect(await submitSignup(reply(200, { ok: false, error: "rate_limited" }), values)).toEqual({ ok: false, error: "rate_limited" });
    expect(await submitSignup(reply(200, { ok: false, error: "unavailable" }), values)).toEqual({ ok: false, error: "unavailable" });
    expect(await submitSignup(reply(500, "<html>"), values)).toEqual({ ok: false, error: "unavailable" });
    const offline: FetchLike = async () => { throw new TypeError("Failed to fetch"); };
    expect(await submitSignup(offline, values)).toEqual({ ok: false, error: "offline" });
  });
});
