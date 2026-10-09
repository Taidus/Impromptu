// Guards the Styling convention (AR-23, Story 3.1 AC): src/components must
// style everything through tokens.css, never a literal hex color or a
// literal px length (both are a sign a value was typed by hand instead of
// read off a design token).
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const COMPONENTS_DIR = join(__dirname, "..", "src", "components");
const HEX_COLOR = /#[0-9a-fA-F]{3,8}\b/;
const RAW_PX = /\b\d+(?:\.\d+)?px\b/;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const fullPath = join(dir, entry);
    if (statSync(fullPath).isDirectory()) return sourceFiles(fullPath);
    if (!/\.(ts|tsx)$/.test(entry) || entry.endsWith(".test.ts") || entry.endsWith(".test.tsx")) return [];
    return [fullPath];
  });
}

// Comments may legitimately quote a DESIGN.md token description (e.g.
// "a 52px circle"); only code can hardcode a styling value.
function stripComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
}

describe("src/components token usage", () => {
  for (const file of sourceFiles(COMPONENTS_DIR)) {
    it(`${file.slice(COMPONENTS_DIR.length + 1)} has no raw hex color or px length`, () => {
      const code = stripComments(readFileSync(file, "utf8"));
      expect(code).not.toMatch(HEX_COLOR);
      expect(code).not.toMatch(RAW_PX);
    });
  }
});
