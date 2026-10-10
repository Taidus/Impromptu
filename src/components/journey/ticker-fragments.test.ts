import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { tickerFragments } from "./ticker-fragments";

const fill = (id: string, revealText: string) => ({
  id,
  revealText,
  briefText: revealText.toLowerCase(),
  tags: [],
  requires: [],
  excludes: [],
});

const generator = { tool: "test", model: "test", promptVersion: "1" };

function writeJson(path: string, value: unknown) {
  writeFileSync(path, JSON.stringify(value));
}

function fixtureRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "ticker-fragments-"));
  const library = join(root, "content", "library");

  const anchors = join(library, "anchors");
  mkdirSync(anchors, { recursive: true });
  writeJson(join(anchors, "topics.json"), [fill("top.kept-anchor", "Kept anchor"), fill("top.retired-anchor", "Retired anchor")]);
  writeJson(join(anchors, "styles.json"), [fill("sty.anchor-style", "Anchor style")]);

  const accepted = join(library, "batches", "001-accepted");
  mkdirSync(accepted, { recursive: true });
  writeJson(join(accepted, "topics.json"), [fill("top.accepted-topic", "Accepted topic")]);
  writeJson(join(accepted, "manifest.json"), {
    status: "accepted",
    generator,
    rubricVersion: "1",
    review: { judge: "test", founderSample: 0, rejectedIds: [], date: "2026-01-01" },
    retire: ["top.retired-anchor"],
  });

  const draft = join(library, "batches", "002-draft");
  mkdirSync(draft, { recursive: true });
  writeJson(join(draft, "topics.json"), [fill("top.draft-topic", "Draft topic")]);
  writeJson(join(draft, "manifest.json"), { status: "draft", generator, rubricVersion: "1", review: null });

  return root;
}

describe("tickerFragments", () => {
  const fragments = tickerFragments();

  it("includes the three anchor topics and the anchor style", () => {
    expect(fragments).toEqual(
      expect.arrayContaining(["A nearby object", "Coming home", "A first date", "Horror"]),
    );
  });

  it("has no duplicate entries", () => {
    expect(fragments.length).toBe(new Set(fragments).size);
  });

  it("adds accepted batches, skips drafts, and drops ids an accepted batch retires", () => {
    const result = tickerFragments(fixtureRoot());
    expect(result).toEqual(["Kept anchor", "Anchor style", "Accepted topic"]);
    expect(result).not.toContain("Draft topic");
    expect(result).not.toContain("Retired anchor");
  });

  it("throws when the anchors are missing", () => {
    expect(() => tickerFragments(mkdtempSync(join(tmpdir(), "ticker-fragments-empty-")))).toThrow(/missing/);
  });
});
