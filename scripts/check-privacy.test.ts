import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const script = fileURLToPath(new URL("./check-privacy.mjs", import.meta.url));

const run = (pkg: object) => {
  const cwd = mkdtempSync(join(tmpdir(), "check-privacy-"));
  writeFileSync(join(cwd, "package.json"), JSON.stringify(pkg));
  return spawnSync(process.execPath, [script], { cwd, encoding: "utf8" });
};

describe("check:privacy", () => {
  it("fails naming banned dependencies", () => {
    const r = run({
      dependencies: { next: "1", "@vercel/analytics": "1" },
      devDependencies: { "@sentry/nextjs": "1" },
    });
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("@vercel/analytics");
    expect(r.stderr).toContain("@sentry/nextjs");
  });

  it("passes a clean package.json", () => {
    const r = run({ dependencies: { next: "1" }, devDependencies: { vitest: "1" } });
    expect(r.status).toBe(0);
  });
});
