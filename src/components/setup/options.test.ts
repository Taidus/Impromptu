import { describe, expect, it } from "vitest";
import type { Medium, Skill } from "@/domain/library/schema";
import { mediumSelectOptions, skillSelectOptions } from "./options";

const mediums: Medium[] = [
  { id: "med.writing", revealText: "Writing", info: "...", tags: [] },
  { id: "med.drawing", revealText: "Drawing", info: "...", tags: [] },
  { id: "med.photography", revealText: "Photography", info: "...", tags: [] },
];

const skills: Skill[] = [
  { id: "skl.observation", revealText: "Observation", info: "Notice what's actually there.", tags: [] },
  { id: "skl.connection", revealText: "Connection", info: "Join things that don't belong together.", tags: [] },
];

describe("mediumSelectOptions", () => {
  it("lists Random plus the enabled Mediums in the library's own order, not the given order", () => {
    expect(mediumSelectOptions(mediums, ["med.photography", "med.writing"], "Random")).toEqual([
      { value: "random", label: "Random" },
      { value: "med.writing", label: "Writing" },
      { value: "med.photography", label: "Photography" },
    ]);
  });

  it("excludes a disabled Medium", () => {
    expect(mediumSelectOptions(mediums, ["med.writing"], "Random")).toEqual([
      { value: "random", label: "Random" },
      { value: "med.writing", label: "Writing" },
    ]);
  });

  it("is just Random when nothing is enabled", () => {
    expect(mediumSelectOptions(mediums, [], "Random")).toEqual([{ value: "random", label: "Random" }]);
  });
});

describe("skillSelectOptions", () => {
  it("lists Random plus every Skill, in the library's order", () => {
    expect(skillSelectOptions(skills, "Random")).toEqual([
      { value: "random", label: "Random" },
      { value: "skl.observation", label: "Observation" },
      { value: "skl.connection", label: "Connection" },
    ]);
  });

  it("is just Random when the library has no Skills", () => {
    expect(skillSelectOptions([], "Random")).toEqual([{ value: "random", label: "Random" }]);
  });
});
