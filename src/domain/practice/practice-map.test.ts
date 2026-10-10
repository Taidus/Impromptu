import { describe, expect, it } from "vitest";
import type { Rep } from "@/domain/session/schema";
import { baseChallenge } from "@/domain/session/session-fixture";
import { practiceMap } from "./practice-map";

const library = {
  skills: [
    { id: "skl.observation", revealText: "Observation" },
    { id: "skl.connection", revealText: "Connection" },
  ],
  mediums: [
    { id: "med.drawing", revealText: "Drawing" },
    { id: "med.writing", revealText: "Writing" },
  ],
};

/** `baseChallenge` is skl.observation/med.drawing/explore/new; override per case. */
const makeRep = (overrides: Partial<Rep["challenge"]> = {}, origin: Rep["challenge"]["origin"] = baseChallenge.origin): Rep => ({
  id: "323e4567-e89b-42d3-a456-426614174000",
  challenge: { ...baseChallenge, ...overrides, origin },
  finishedAt: "2026-10-09T12:00:00.000Z",
  timeUsedSec: null,
  reflection: null,
});

describe("practiceMap", () => {
  it("returns every library Skill and Medium in library order, counts at 0 with no Reps", () => {
    const map = practiceMap([], library);
    expect(map.skills).toEqual([
      { id: "skl.observation", label: "Observation", count: 0 },
      { id: "skl.connection", label: "Connection", count: 0 },
    ]);
    expect(map.mediums).toEqual([
      { id: "med.drawing", label: "Drawing", count: 0 },
      { id: "med.writing", label: "Writing", count: 0 },
    ]);
  });

  it("returns the four Levels in order, count 0 with no Reps", () => {
    const map = practiceMap([], library);
    expect(map.levels).toEqual([
      { id: "explore", count: 0 },
      { id: "experiment", count: 0 },
      { id: "develop", count: 0 },
      { id: "perform", count: 0 },
    ]);
  });

  it("counts a Rep under its snapshot Skill, Medium and Level", () => {
    const rep = makeRep();
    const map = practiceMap([rep], library);
    expect(map.skills.find((r) => r.id === "skl.observation")?.count).toBe(1);
    expect(map.mediums.find((r) => r.id === "med.drawing")?.count).toBe(1);
    expect(map.levels.find((r) => r.id === "explore")?.count).toBe(1);
  });

  it("counts Retries and Variations as Reps", () => {
    const reps = [
      makeRep(),
      makeRep({}, { kind: "retry", fromRepId: "423e4567-e89b-42d3-a456-426614174000" }),
      makeRep({}, { kind: "variation", fromRepId: "523e4567-e89b-42d3-a456-426614174000" }),
    ];
    const map = practiceMap(reps, library);
    expect(map.skills.find((r) => r.id === "skl.observation")?.count).toBe(3);
  });

  it("adds a trailing row, labelled from the snapshot revealText, for a Skill/Medium id no longer in the library", () => {
    const rep = makeRep({
      inputs: {
        skill: { id: "skl.retired", revealText: "Retired Skill" },
        medium: { id: "med.retired", revealText: "Retired Medium" },
      },
    });
    const map = practiceMap([rep], library);
    expect(map.skills).toEqual([
      { id: "skl.observation", label: "Observation", count: 0 },
      { id: "skl.connection", label: "Connection", count: 0 },
      { id: "skl.retired", label: "Retired Skill", count: 1 },
    ]);
    expect(map.mediums).toEqual([
      { id: "med.drawing", label: "Drawing", count: 0 },
      { id: "med.writing", label: "Writing", count: 0 },
      { id: "med.retired", label: "Retired Medium", count: 1 },
    ]);
  });

  it("merges multiple Reps under the same retired id into one trailing row", () => {
    const retiredInputs = {
      skill: { id: "skl.retired", revealText: "Retired Skill" },
      medium: { id: "med.drawing", revealText: "Drawing" },
    };
    const reps = [makeRep({ inputs: retiredInputs }), makeRep({ inputs: retiredInputs })];
    const map = practiceMap(reps, library);
    expect(map.skills.filter((r) => r.id === "skl.retired")).toEqual([{ id: "skl.retired", label: "Retired Skill", count: 2 }]);
  });

  it("with an empty library (library failed to load), every Rep lands in trailing rows", () => {
    const map = practiceMap([makeRep(), makeRep()], { skills: [], mediums: [] });
    expect(map.skills).toEqual([{ id: "skl.observation", label: baseChallenge.inputs.skill.revealText, count: 2 }]);
    expect(map.mediums).toEqual([{ id: "med.drawing", label: baseChallenge.inputs.medium.revealText, count: 2 }]);
    expect(map.levels.find((r) => r.id === "explore")?.count).toBe(2);
  });
});
