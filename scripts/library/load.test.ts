import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadLibrary } from "./load";

function writeJson(filePath: string, data: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data));
}

describe("loadLibrary — real content tree", () => {
  it("loads content/library with zero issues", () => {
    // Minimums only, never exact counts: a real content batch landing must not break this.
    const lib = loadLibrary(path.resolve(__dirname, "../.."));
    expect(lib.issues).toEqual([]);
    expect(lib.skills.length).toBeGreaterThanOrEqual(6);
    expect(lib.mediums.length).toBeGreaterThanOrEqual(4);
    expect(lib.templates.length).toBeGreaterThanOrEqual(3);
    expect(lib.anchors.length).toBeGreaterThanOrEqual(3);
  });
});

describe("loadLibrary — batch folders", () => {
  let root: string;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "library-load-test-"));
    const lib = path.join(root, "content", "library");
    writeJson(path.join(lib, "skills.json"), []);
    writeJson(path.join(lib, "mediums.json"), []);
    writeJson(path.join(lib, "tags.json"), [{ id: "t", description: "t" }]);
    writeJson(path.join(lib, "anchors", "anchors.json"), []);
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  it("applies batches in folder-name order and carries each entity's source batch", () => {
    const batches = path.join(root, "content", "library", "batches");
    const manifest = (extra: Record<string, unknown>) => ({
      status: "draft",
      generator: { tool: "cli", model: "m", promptVersion: "1" },
      rubricVersion: "1",
      review: null,
      ...extra,
    });

    // Written out of order on disk; folder-name order (AD-6) is what matters.
    writeJson(path.join(batches, "2026-02-01-topics-pilot-02", "manifest.json"), manifest({}));
    writeJson(path.join(batches, "2026-02-01-topics-pilot-02", "topics.json"), [
      { id: "top.beta", revealText: "Beta", briefText: "beta", tags: ["t"], requires: [], excludes: [] },
    ]);
    writeJson(
      path.join(batches, "2026-01-01-topics-pilot-01", "manifest.json"),
      manifest({ status: "accepted", review: { judge: "m", founderSample: 1, rejectedIds: [], date: "2026-01-01" } }),
    );
    writeJson(path.join(batches, "2026-01-01-topics-pilot-01", "topics.json"), [
      { id: "top.alpha", revealText: "Alpha", briefText: "alpha", tags: ["t"], requires: [], excludes: [] },
    ]);

    const lib = loadLibrary(root);
    expect(lib.issues).toEqual([]);
    expect(lib.manifests.map((m) => m.source)).toEqual(["2026-01-01-topics-pilot-01", "2026-02-01-topics-pilot-02"]);
    expect(lib.topics.map((t) => [t.value.id, t.source])).toEqual([
      ["top.alpha", "2026-01-01-topics-pilot-01"],
      ["top.beta", "2026-02-01-topics-pilot-02"],
    ]);
  });

  it("reports a missing manifest.json as an issue and skips that folder's content", () => {
    const batches = path.join(root, "content", "library", "batches");
    fs.mkdirSync(path.join(batches, "2026-03-01-topics-oops"), { recursive: true });

    const lib = loadLibrary(root);
    expect(lib.issues).toHaveLength(1);
    expect(lib.issues[0].message).toMatch(/no manifest\.json/);
    expect(lib.manifests).toEqual([]);
  });

  it("reports an invalid manifest as an issue, naming the folder", () => {
    const batches = path.join(root, "content", "library", "batches");
    writeJson(path.join(batches, "2026-03-01-topics-bad-manifest", "manifest.json"), { status: "not-a-status" });

    const lib = loadLibrary(root);
    expect(lib.issues).toHaveLength(1);
    expect(lib.issues[0].source).toContain("2026-03-01-topics-bad-manifest");
  });

  it("reports one bad entry without blocking the rest of the file", () => {
    const batches = path.join(root, "content", "library", "batches");
    writeJson(path.join(batches, "2026-04-01-topics-mixed", "manifest.json"), {
      status: "draft",
      generator: { tool: "cli", model: "m", promptVersion: "1" },
      rubricVersion: "1",
      review: null,
    });
    writeJson(path.join(batches, "2026-04-01-topics-mixed", "topics.json"), [
      { id: "top.good", revealText: "Good", briefText: "good", tags: [], requires: [], excludes: [] },
      { id: "not-a-topic-id", revealText: "Bad", briefText: "bad", tags: [], requires: [], excludes: [] },
    ]);

    const lib = loadLibrary(root);
    expect(lib.topics.map((t) => t.value.id)).toEqual(["top.good"]);
    expect(lib.issues).toHaveLength(1);
    expect(lib.issues[0].message).toContain("not-a-topic-id");
  });

  it("reports malformed JSON (base file and batch file) as issues instead of throwing", () => {
    fs.writeFileSync(path.join(root, "content", "library", "tags.json"), "{ not json");
    const batches = path.join(root, "content", "library", "batches");
    writeJson(path.join(batches, "2026-05-01-topics-broken", "manifest.json"), {
      status: "draft",
      generator: { tool: "cli", model: "m", promptVersion: "1" },
      rubricVersion: "1",
      review: null,
    });
    fs.writeFileSync(path.join(batches, "2026-05-01-topics-broken", "topics.json"), "[not valid json");

    expect(() => loadLibrary(root)).not.toThrow();
    const lib = loadLibrary(root);
    expect(lib.tags).toEqual([]);
    expect(lib.topics).toEqual([]);
    expect(lib.issues.some((i) => i.source.endsWith("tags.json") && i.message.includes("invalid JSON"))).toBe(true);
    expect(lib.issues.some((i) => i.source.endsWith("topics.json") && i.message.includes("invalid JSON"))).toBe(true);
  });

  it("reports a missing required base file as an issue instead of throwing", () => {
    fs.rmSync(path.join(root, "content", "library", "tags.json"));
    expect(() => loadLibrary(root)).not.toThrow();
    const lib = loadLibrary(root);
    expect(lib.tags).toEqual([]);
    expect(lib.issues.some((i) => i.source.endsWith("tags.json") && i.message.includes("required file is missing"))).toBe(
      true,
    );
  });

  it("flags an unexpected *.json filename inside a batch folder", () => {
    const batches = path.join(root, "content", "library", "batches");
    writeJson(path.join(batches, "2026-06-01-topics-extra", "manifest.json"), {
      status: "draft",
      generator: { tool: "cli", model: "m", promptVersion: "1" },
      rubricVersion: "1",
      review: null,
    });
    writeJson(path.join(batches, "2026-06-01-topics-extra", "topics.json"), []);
    writeJson(path.join(batches, "2026-06-01-topics-extra", "notes.json"), { stray: true });

    const lib = loadLibrary(root);
    expect(lib.issues.some((i) => i.message.includes('unexpected file "notes.json"'))).toBe(true);
  });
});
