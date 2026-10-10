import { describe, expect, it } from "vitest";
import type { Rep } from "@/domain/session/schema";
import { baseChallenge } from "@/domain/session/session-fixture";
import { buildExport, exportFilename } from "./export";

const makeRep = (id: string): Rep => ({
  id,
  challenge: baseChallenge,
  finishedAt: "2026-10-09T12:00:00.000Z",
  timeUsedSec: null,
  reflection: null,
});

describe("buildExport", () => {
  it("wraps the reps with app, exportVersion and exportedAt passthrough", () => {
    const reps = [makeRep("323e4567-e89b-42d3-a456-426614174000")];
    const result = buildExport(reps, "2026-10-09T18:00:00.000Z");
    expect(result).toEqual({
      app: "impromptu",
      exportVersion: 1,
      exportedAt: "2026-10-09T18:00:00.000Z",
      reps,
    });
  });

  it("allows an empty rep list", () => {
    expect(buildExport([], "2026-10-09T18:00:00.000Z").reps).toEqual([]);
  });

  it("throws on duplicate rep ids (the Export schema's own refine)", () => {
    const dup = makeRep("323e4567-e89b-42d3-a456-426614174000");
    expect(() => buildExport([dup, dup], "2026-10-09T18:00:00.000Z")).toThrow();
  });
});

describe("exportFilename", () => {
  it("formats the UTC day from an ISO datetime", () => {
    expect(exportFilename("2026-10-09T18:00:00.000Z")).toBe("impromptu-practice-2026-10-09.json");
  });

  it("takes the date portion of a Z datetime as-is at midnight UTC", () => {
    expect(exportFilename("2026-01-01T00:00:00.000Z")).toBe("impromptu-practice-2026-01-01.json");
  });
});
