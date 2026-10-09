// Guards the Styling convention (AR-23, Story 3.1 AC): src/components must
// style everything through tokens.css, never a literal hex color, px
// length, or CSS color function (both are a sign a value was typed by
// hand instead of read off a design token).
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const COMPONENTS_DIR = join(__dirname, "..", "src", "components");
const SOURCE_EXT = /\.(ts|tsx|css|js|jsx)$/;
const TEST_FILE = /\.test\.[jt]sx?$/;

const HEX_COLOR = /#[0-9a-fA-F]{3,8}\b/;
const RAW_PX = /\b\d+(?:\.\d+)?px\b/;
const COLOR_FUNCTION = /\b(?:rgb|rgba|hsl|hsla|oklch)\(/;

// Comments may legitimately quote a DESIGN.md token description (e.g.
// "a 52px circle"); only code can hardcode a styling value. Only a `//`
// that starts a line (after leading whitespace) is treated as a line
// comment — a `//` elsewhere (e.g. inside a "http://..." string) is not,
// so it can never swallow real code that follows it on the same line.
export function stripComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");
}

export function findRawStyleLiteral(text: string): string | null {
  const code = stripComments(text);
  if (HEX_COLOR.test(code)) return "hex color";
  if (RAW_PX.test(code)) return "px length";
  if (COLOR_FUNCTION.test(code)) return "color function";
  return null;
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const fullPath = join(dir, entry);
    if (statSync(fullPath).isDirectory()) return sourceFiles(fullPath);
    if (!SOURCE_EXT.test(entry) || TEST_FILE.test(entry)) return [];
    return [fullPath];
  });
}

describe("src/components token usage", () => {
  for (const file of sourceFiles(COMPONENTS_DIR)) {
    it(`${file.slice(COMPONENTS_DIR.length + 1)} has no raw hex color, px length, or color function`, () => {
      expect(findRawStyleLiteral(readFileSync(file, "utf8"))).toBeNull();
    });
  }

  it("fixture: a line with a hex color, a px length, and an rgb() literal is flagged", () => {
    const fixture = `const bad = { color: "#fff", width: "16px", shadow: "rgb(0,0,0)" };`;
    expect(findRawStyleLiteral(fixture)).not.toBeNull();
  });

  it("fixture: a `//` inside a string (e.g. a URL) is not mistaken for a comment", () => {
    const fixture = `const url = "http://example.com"; const width = "16px";`;
    expect(findRawStyleLiteral(fixture)).not.toBeNull();
  });

  it("fixture: a token value only mentioned in a comment is not flagged", () => {
    const fixture = `// DESIGN.md says a 52px circle with a #fff border and rgb(0,0,0) shadow\nconst x = 1;`;
    expect(findRawStyleLiteral(fixture)).toBeNull();
  });
});
