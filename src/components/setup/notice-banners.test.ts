import { describe, expect, it } from "vitest";
import { activeNoticeBanners } from "./notice-banners";

describe("activeNoticeBanners", () => {
  it("is empty when nothing applies", () => {
    expect(activeNoticeBanners({ sessionState: "none", storageAvailable: true, migrationFailed: false })).toEqual([]);
  });

  it("shows challengeWaiting only for a held session, not none or attempt", () => {
    expect(activeNoticeBanners({ sessionState: "held", storageAvailable: true, migrationFailed: false })).toEqual([
      "challengeWaiting",
    ]);
    expect(activeNoticeBanners({ sessionState: "attempt", storageAvailable: true, migrationFailed: false })).toEqual([]);
  });

  it("shows storageUnavailable when the startup probe failed", () => {
    expect(activeNoticeBanners({ sessionState: "none", storageAvailable: false, migrationFailed: false })).toEqual([
      "storageUnavailable",
    ]);
  });

  it("shows migrationFailed when the Repository reports it", () => {
    expect(activeNoticeBanners({ sessionState: "none", storageAvailable: true, migrationFailed: true })).toEqual([
      "migrationFailed",
    ]);
  });

  it("pairs a held Challenge with each storage flag on its own", () => {
    expect(activeNoticeBanners({ sessionState: "held", storageAvailable: false, migrationFailed: false })).toEqual([
      "challengeWaiting",
      "storageUnavailable",
    ]);
    expect(activeNoticeBanners({ sessionState: "held", storageAvailable: true, migrationFailed: true })).toEqual([
      "challengeWaiting",
      "migrationFailed",
    ]);
  });

  it("stacks every applicable banner, in order: challengeWaiting, storageUnavailable, migrationFailed", () => {
    expect(activeNoticeBanners({ sessionState: "held", storageAvailable: false, migrationFailed: true })).toEqual([
      "challengeWaiting",
      "storageUnavailable",
      "migrationFailed",
    ]);
  });
});
