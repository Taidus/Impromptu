import { describe, expect, it } from "vitest";
import { baseChallenge, fullChallenge } from "@/domain/session/session-fixture";
import { announcementFor, emptySlotLabel, isFullyRevealed, nextKind, presentKinds, quickRevealAnnouncement } from "./reveal-logic";

describe("presentKinds", () => {
  it("is skill, medium, topic, brief for a Challenge with no Style or Constraint", () => {
    expect(presentKinds(baseChallenge)).toEqual(["skill", "medium", "topic", "brief"]);
  });

  it("includes Style and Constraint, with brief last, when the Challenge has them", () => {
    expect(presentKinds(fullChallenge)).toEqual(["skill", "medium", "topic", "style", "constraint", "brief"]);
  });
});

describe("nextKind", () => {
  it("is the first present kind when nothing has landed", () => {
    expect(nextKind(baseChallenge, [])).toBe("skill");
  });

  it("is the next present kind not yet in revealed", () => {
    expect(nextKind(baseChallenge, ["skill", "medium"])).toBe("topic");
  });

  it("skips Style and Constraint when the Challenge has neither", () => {
    expect(nextKind(baseChallenge, ["skill", "medium", "topic"])).toBe("brief");
  });

  it("is null once every present kind, including brief, has landed", () => {
    expect(nextKind(baseChallenge, ["skill", "medium", "topic", "brief"])).toBeNull();
  });
});

describe("isFullyRevealed", () => {
  it("is false while a kind remains", () => {
    expect(isFullyRevealed(baseChallenge, ["skill"])).toBe(false);
  });

  it("is true once nothing remains", () => {
    expect(isFullyRevealed(baseChallenge, ["skill", "medium", "topic", "brief"])).toBe(true);
  });
});

describe("announcementFor", () => {
  it("reads \"Label: value.\" for an Input kind", () => {
    expect(announcementFor("topic", baseChallenge)).toBe("Topic: An object near you.");
  });

  it("reads every Input kind's own label", () => {
    expect(announcementFor("skill", baseChallenge)).toBe("Skill: Observation.");
    expect(announcementFor("medium", baseChallenge)).toBe("Medium: Drawing.");
    expect(announcementFor("style", fullChallenge)).toBe("Style: Minimal.");
    expect(announcementFor("constraint", fullChallenge)).toBe("Constraint: One color only.");
  });

  it("announces the Brief in full, unprefixed", () => {
    expect(announcementFor("brief", baseChallenge)).toBe(baseChallenge.brief);
  });
});

describe("quickRevealAnnouncement", () => {
  it("opens with \"Challenge ready.\" then every present Input, then the Brief", () => {
    expect(quickRevealAnnouncement(baseChallenge)).toBe(
      "Challenge ready. Skill: Observation. Medium: Drawing. Topic: An object near you. Draw an object near you.",
    );
  });

  it("includes Style and Constraint when present", () => {
    expect(quickRevealAnnouncement(fullChallenge)).toBe(
      "Challenge ready. Skill: Observation. Medium: Drawing. Topic: An object near you. Style: Minimal. Constraint: One color only. Draw an object near you.",
    );
  });
});

describe("emptySlotLabel", () => {
  it("reads \"Label, not revealed yet.\"", () => {
    expect(emptySlotLabel("topic")).toBe("Topic, not revealed yet.");
    expect(emptySlotLabel("style")).toBe("Style, not revealed yet.");
  });
});
