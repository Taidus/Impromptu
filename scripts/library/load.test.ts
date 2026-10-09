import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { filterAccepted, loadLibrary } from "./load";
import type { LoadedLibrary } from "./load";

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

describe("filterAccepted", () => {
  // Minimal fixture: filterAccepted only inspects `.source` and `.status`, never parses or
  // validates, so loosely-shaped stand-ins are fine here.
  const root = path.join(path.sep, "repo");
  const batchFile = (folder: string, file: string) => path.join(root, "content", "library", "batches", folder, file);
  const DRAFT = "2026-01-01-topics-draft";
  const ACCEPTED = "2026-01-01-topics-accepted";
  const fill = (id: string, source: string) => ({ value: { id } as never, source });

  function fixture(): LoadedLibrary {
    return {
      tags: [],
      skills: [],
      mediums: [],
      templates: [fill("tpl.draft", DRAFT), fill("tpl.accepted", ACCEPTED), fill("tpl.anchor", "anchors")],
      topics: [fill("top.draft", DRAFT), fill("top.accepted", ACCEPTED), fill("top.anchor", "anchors")],
      styles: [fill("sty.draft", DRAFT), fill("sty.accepted", ACCEPTED)],
      constraints: [fill("con.draft", DRAFT), fill("con.accepted", ACCEPTED)],
      anchors: [],
      manifests: [
        { value: { status: "draft" } as never, source: DRAFT },
        { value: { status: "accepted" } as never, source: ACCEPTED },
      ],
      issues: [
        { source: path.join(root, "content", "library", "tags.json"), message: "base file issue" },
        { source: batchFile(DRAFT, "topics.json"), message: "draft batch issue" },
        { source: batchFile(ACCEPTED, "topics.json"), message: "accepted batch issue" },
      ],
    };
  }

  it("keeps anchors-sourced and accepted-batch-sourced entities, drops draft-sourced ones", () => {
    const filtered = filterAccepted(fixture(), root);
    expect(filtered.templates.map((t) => t.value.id)).toEqual(["tpl.accepted", "tpl.anchor"]);
  });

  it("filters fills (topics, styles, constraints) the same way", () => {
    const filtered = filterAccepted(fixture(), root);
    expect(filtered.topics.map((t) => t.value.id)).toEqual(["top.accepted", "top.anchor"]);
    expect(filtered.styles.map((t) => t.value.id)).toEqual(["sty.accepted"]);
    expect(filtered.constraints.map((t) => t.value.id)).toEqual(["con.accepted"]);
  });

  it("keeps only accepted manifests", () => {
    const filtered = filterAccepted(fixture(), root);
    expect(filtered.manifests.map((m) => m.source)).toEqual([ACCEPTED]);
  });

  it("keeps base-file issues and accepted-batch issues, drops draft-batch issues", () => {
    const filtered = filterAccepted(fixture(), root);
    expect(filtered.issues.map((i) => i.message)).toEqual(["base file issue", "accepted batch issue"]);
  });

  it("keeps the issue of a batch folder with no successfully parsed manifest", () => {
    const lib = fixture();
    lib.issues.push({ source: path.join(root, "content", "library", "batches", "2026-01-02-orphan"), message: "no manifest" });
    const filtered = filterAccepted(lib, root);
    expect(filtered.issues.map((i) => i.message)).toContain("no manifest");
  });

  it("treats a path with a 'batches' segment outside content/library/batches as a base-file issue", () => {
    const outside = path.join(path.sep, "home", "batches", DRAFT, "x.json");
    const lib = { ...fixture(), issues: [{ source: outside, message: "outside" }] };
    expect(filterAccepted(lib, root).issues.map((i) => i.message)).toEqual(["outside"]);
  });

  it("is a no-op shape-wise on a library with no batches at all (anchors only)", () => {
    const anchorsOnly: LoadedLibrary = { ...fixture(), templates: [fill("tpl.anchor", "anchors")], manifests: [], issues: [] };
    const filtered = filterAccepted(anchorsOnly, root);
    expect(filtered.templates).toHaveLength(1);
  });
});
