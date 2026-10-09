import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const script = fileURLToPath(new URL("./check-static.mjs", import.meta.url));

const appRoutes = {
  "/_global-error/page": "/_global-error",
  "/_not-found/page": "/_not-found",
  "/favicon.ico/route": "/favicon.ico",
  "/page": "/",
  "/practice/page": "/practice",
  "/privacy/page": "/privacy",
  "/stage/page": "/stage",
};
const staticEntry = { compute: "static", response: "complete", initialRevalidateSeconds: false };

const run = (routes: Record<string, object>) => {
  const cwd = mkdtempSync(join(tmpdir(), "check-static-"));
  mkdirSync(join(cwd, ".next"));
  writeFileSync(join(cwd, ".next/app-path-routes-manifest.json"), JSON.stringify(appRoutes));
  writeFileSync(join(cwd, ".next/prerender-manifest.json"), JSON.stringify({ routes }));
  return spawnSync(process.execPath, [script], { cwd, encoding: "utf8" });
};

describe("check:static", () => {
  it("fails naming a route missing from the prerender manifest", () => {
    const r = run({ "/": staticEntry, "/stage": staticEntry, "/practice": staticEntry });
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("/privacy");
  });

  it("fails a route that revalidates", () => {
    const r = run({
      "/": staticEntry,
      "/stage": { ...staticEntry, initialRevalidateSeconds: 60 },
      "/practice": staticEntry,
      "/privacy": staticEntry,
    });
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("/stage");
  });

  it("passes a complete static manifest", () => {
    const r = run({ "/": staticEntry, "/stage": staticEntry, "/practice": staticEntry, "/privacy": staticEntry });
    expect(r.status).toBe(0);
  });
});
