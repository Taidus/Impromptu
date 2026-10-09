import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildPayload, runBuild } from "./build";
import { gateConfig } from "./gate-config";
import { runGate } from "./gate";
import { filterAccepted, loadLibrary } from "./load";

const repoRoot = path.resolve(__dirname, "..", "..");

function writeJson(filePath: string, data: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data));
}

const topic = (id: string, over: Record<string, unknown> = {}) => ({
  id,
  revealText: id,
  briefText: "a spoon",
  tags: ["object"],
  requires: [],
  excludes: [],
  ...over,
});
const manifest = (status: "draft" | "accepted") => ({
  status,
  generator: { tool: "cli", model: "m", promptVersion: "1" },
  rubricVersion: "1",
  review: status === "accepted" ? { judge: "m", founderSample: 1, rejectedIds: [], date: "2026-10-09" } : null,
  edits: [],
  retire: [],
});

describe("build", () => {
  let root: string;
  let batches: string;

  beforeEach(() => {
    // Real anchors + base data, so the gate passes on the anchors alone.
    root = fs.mkdtempSync(path.join(os.tmpdir(), "library-build-test-"));
    fs.cpSync(path.join(repoRoot, "content", "library"), path.join(root, "content", "library"), { recursive: true });
    batches = path.join(root, "content", "library", "batches");
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    fs.rmSync(root, { recursive: true, force: true });
  });

  it("buildPayload drops draft batches and keeps retired entries flagged retired: true", () => {
    const accepted = path.join(batches, "2026-10-01-topics-a-01");
    writeJson(path.join(accepted, "manifest.json"), manifest("accepted"));
    writeJson(path.join(accepted, "topics.json"), [topic("top.spoon"), topic("top.old-fork", { retired: true })]);
    const draft = path.join(batches, "2026-10-02-topics-b-01");
    writeJson(path.join(draft, "manifest.json"), manifest("draft"));
    writeJson(path.join(draft, "topics.json"), [topic("top.draft-cup")]);

    const lib = filterAccepted(loadLibrary(root), root);
    const report = runGate(lib, gateConfig);
    expect(report.failures).toEqual([]);

    const payload = buildPayload(lib, report);
    const ids = payload.topics.map((t) => t.id);
    expect(ids).toContain("top.spoon");
    expect(ids).not.toContain("top.draft-cup");
    expect(payload.topics.find((t) => t.id === "top.old-fork")?.retired).toBe(true);
    expect(payload.anchors.length).toBeGreaterThanOrEqual(3);
    expect(payload.libraryVersion).toMatch(/^[0-9a-f]{16}$/);
  });

  it("runBuild writes library.json on success", () => {
    expect(runBuild(root)).toBe(0);
    const out = JSON.parse(fs.readFileSync(path.join(root, "src", "generated", "library.json"), "utf8"));
    expect(out.libraryVersion).toMatch(/^[0-9a-f]{16}$/);
  });

  it("runBuild removes a pre-existing library.json when the gate fails", () => {
    const outFile = path.join(root, "src", "generated", "library.json");
    writeJson(outFile, { stale: true });
    // A batch folder with no manifest.json fails the gate instead of silently vanishing.
    writeJson(path.join(batches, "2026-10-03-topics-c-01", "topics.json"), [topic("top.orphan")]);

    expect(runBuild(root)).toBe(1);
    expect(fs.existsSync(outFile)).toBe(false);
  });
});
