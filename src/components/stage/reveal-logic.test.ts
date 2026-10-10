import { describe, expect, it } from "vitest";
import { baseChallenge, fullChallenge } from "@/domain/session/session-fixture";
import { presentKinds } from "@/domain/session/session-reducer";
import { copy } from "@/components/copy";
import {
  announcementFor,
  emptySlotLabel,
  isFullyRevealed,
  isPastTwoLines,
  liveAnnouncement,
  nextKind,
  quickRevealAnnouncement,
  restoreAnnouncement,
} from "./reveal-logic";

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

describe("liveAnnouncement", () => {
  const all = presentKinds(fullChallenge);

  it("announces one newly landed kind", () => {
    expect(liveAnnouncement(fullChallenge.id, ["skill"], fullChallenge, ["skill", "medium"], false)).toBe(
      announcementFor("medium", fullChallenge),
    );
  });

  it("announces every kind of a multi-kind jump, in order", () => {
    expect(liveAnnouncement(fullChallenge.id, ["skill"], fullChallenge, ["skill", "medium", "topic"], false)).toBe(
      `${announcementFor("medium", fullChallenge)} ${announcementFor("topic", fullChallenge)}`,
    );
  });

  it("leaves the text alone when nothing new landed", () => {
    expect(liveAnnouncement(fullChallenge.id, ["skill"], fullChallenge, ["skill"], false)).toBeNull();
    expect(liveAnnouncement(null, [], null, [], false)).toBeNull();
  });

  it("clears stale text for a new Challenge with nothing landed, or when the Challenge goes away", () => {
    expect(liveAnnouncement("old", all, fullChallenge, [], false)).toBe("");
    expect(liveAnnouncement("old", all, null, [], false)).toBe("");
  });

  it("uses the Quick reveal wording only for a new, fully landed Challenge with Quick reveal on", () => {
    const text = liveAnnouncement("old", [], fullChallenge, all, true);
    expect(text).toBe(quickRevealAnnouncement(fullChallenge));
    expect(text?.startsWith(copy.stage.challengeReady)).toBe(true);
    expect(liveAnnouncement("old", [], fullChallenge, all, false)).not.toContain(copy.stage.challengeReady);
  });
});

describe("restoreAnnouncement", () => {
  const all = presentKinds(fullChallenge);

  it("is null when nothing present has landed", () => {
    expect(restoreAnnouncement(baseChallenge, [], false)).toBeNull();
    expect(restoreAnnouncement(baseChallenge, [], true)).toBeNull();
    // baseChallenge has no Style: a stray "style" is not a landed piece.
    expect(restoreAnnouncement(baseChallenge, ["style"], false)).toBeNull();
  });

  it("announces only the already-landed part, in reveal order, while mid-Reveal", () => {
    expect(restoreAnnouncement(baseChallenge, ["medium", "skill"], false)).toBe(
      `${announcementFor("skill", baseChallenge)} ${announcementFor("medium", baseChallenge)}`,
    );
  });

  it("announces every landed piece and the Brief, without \"Challenge ready.\", once fully revealed", () => {
    const text = restoreAnnouncement(fullChallenge, all, false);
    expect(text).toBe(all.map((kind) => announcementFor(kind, fullChallenge)).join(" "));
    expect(text).not.toContain(copy.stage.challengeReady);
  });

  it("uses the Quick-reveal wording only when Quick reveal landed it all", () => {
    expect(restoreAnnouncement(fullChallenge, all, true)).toBe(quickRevealAnnouncement(fullChallenge));
  });

  it("matches liveAnnouncement for the same state seen as new", () => {
    expect(restoreAnnouncement(fullChallenge, ["topic", "skill"], false)).toBe(
      liveAnnouncement(null, [], fullChallenge, ["topic", "skill"], false),
    );
  });
});

describe("isPastTwoLines", () => {
  it("is false up to two lines (with sub-pixel slack) and true past them", () => {
    expect(isPastTwoLines(96, 48)).toBe(false);
    expect(isPastTwoLines(96.5, 48)).toBe(false);
    expect(isPastTwoLines(144, 48)).toBe(true);
  });
});
