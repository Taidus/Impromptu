import { ESLint } from "eslint";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
let eslint: ESLint;

const ruleIds = async (filePath: string, code: string) => {
  const [result] = await eslint.lintText(code, { filePath: `${repoRoot}${filePath}` });
  return result.messages.map((m) => m.ruleId);
};

beforeAll(() => {
  eslint = new ESLint({ cwd: repoRoot });
});

describe("layer boundaries", () => {
  const violations: [string, string, string][] = [
    ["domain -> store", "src/domain/x.ts", 'import { x } from "@/store/x"; export const y = x;'],
    ["domain Date.now()", "src/domain/x.ts", "export const t = Date.now();"],
    ["domain new Date()", "src/domain/x.ts", "export const t = new Date();"],
    ["domain ../config", "src/domain/x.ts", 'import { config } from "../config/app"; export const c = config;'],
    ["components -> adapters", "src/components/x.tsx", 'import { systemClock } from "@/adapters/clock"; export const c = systemClock;'],
    ["app -> server", "src/app/x/page.tsx", 'import { x } from "@/server/x"; export const y = x;'],
    ["shared -> config", "src/shared/x.ts", 'import { config } from "@/config/app"; export const c = config;'],
    ["decor -> domain", "src/decor/x.tsx", 'import { x } from "@/domain/x"; export const y = x;'],
    ["decor dynamic -> store", "src/decor/x.tsx", 'export const load = () => import("@/store/x");'],
    ["decor dynamic non-literal", "src/decor/x.tsx", 'const p = "@/store/x"; export const load = () => import(p);'],
    ["store -> server", "src/store/x.ts", 'import { x } from "@/server/x"; export const y = x;'],
    ["config -> domain", "src/config/x.ts", 'import { x } from "@/domain/x"; export const y = x;'],
    ["server -> components", "src/server/x.ts", 'import { x } from "@/components/x"; export const y = x;'],
  ];
  const expectedRule: Record<string, string> = {
    "domain Date.now()": "no-restricted-properties",
    "domain new Date()": "no-restricted-syntax",
    "decor dynamic -> store": "no-restricted-syntax",
    "decor dynamic non-literal": "no-restricted-syntax",
  };

  for (const [name, filePath, code] of violations) {
    it(`rejects ${name}`, async () => {
      expect(await ruleIds(filePath, code)).toContain(expectedRule[name] ?? "no-restricted-imports");
    });
  }

  const allowed: [string, string, string][] = [
    ["domain -> config", "src/domain/x.ts", 'import { config } from "@/config/app"; export const w = config.generator.recentWindow;'],
    ["domain -> domain (own submodule)", "src/domain/session/x.ts", 'import { Level } from "@/domain/library/schema"; export const l = Level;'],
    ["adapters -> domain", "src/adapters/x.ts", 'import type { Clock } from "@/domain/ports"; export const c: Clock = { now: () => 0 };'],
    ["app/api -> server", "src/app/api/x/route.ts", 'import { x } from "@/server/x"; export const y = x;'],
    ["decor -> config", "src/decor/x.ts", 'import { config } from "@/config/app"; export const d = config.decor;'],
    ["decor dynamic -> own file", "src/decor/x.tsx", 'export const load = () => import("./DecorScene");'],
  ];

  for (const [name, filePath, code] of allowed) {
    it(`allows ${name}`, async () => {
      expect(await ruleIds(filePath, code)).toEqual([]);
    });
  }
});
