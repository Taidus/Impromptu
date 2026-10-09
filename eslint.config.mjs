import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Layer boundaries per the Design Paradigm diagram (AD-2), as allow-lists:
// every `@/` import fails unless its layer is named. Each block fully replaces
// no-restricted-imports (rules do not merge), so every block re-includes the
// parent-relative ban: cross-layer imports use the @/ alias.
const noParentImports = {
  group: ["..", "../*"],
  message: "Parent-relative imports are banned under src/; use the @/ alias.",
};

const allowLayers = (layers, message) => ({
  group: ["@/*", ...layers.flatMap((layer) => [`!@/${layer}`, `!@/${layer}/*`])],
  message,
});

const restrictImports = (...patterns) => ({
  "no-restricted-imports": ["error", { patterns: [noParentImports, ...patterns] }],
});

const layer = (files, allowed, message, extra = {}) => ({
  files: files.map((f) => `${f}/**/*.{ts,tsx}`),
  ...extra,
  rules: restrictImports(allowLayers(allowed, message)),
});

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Generated and test output:
    "src/generated/**",
    "test-results/**",
    "playwright-report/**",
  ]),
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: restrictImports(),
  },
  {
    files: ["src/domain/**/*.{ts,tsx}"],
    rules: {
      ...restrictImports(
        allowLayers(["config"], "src/domain is the pure core: it imports only @/config and zod."),
        {
          group: ["next", "next/*", "react", "react/*", "react-dom", "react-dom/*"],
          message: "src/domain is the pure core: no framework imports.",
        },
      ),
      "no-restricted-globals": [
        "error",
        ...[
          "window",
          "document",
          "localStorage",
          "sessionStorage",
          "crypto",
          "performance",
          "setTimeout",
          "setInterval",
          "fetch",
          "navigator",
          "self",
          "globalThis",
        ].map((name) => ({
          name,
          message: `src/domain may not touch ${name}; use a port from @/domain/ports.`,
        })),
      ],
      "no-restricted-properties": [
        "error",
        { object: "Date", property: "now", message: "Use the Clock port." },
        { object: "Math", property: "random", message: "Use the Random port." },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector: "NewExpression[callee.name='Date'][arguments.length=0]",
          message: "Use the Clock port instead of new Date().",
        },
      ],
    },
  },
  layer(["src/config"], [], "src/config imports nothing from @/."),
  layer(["src/shared"], [], "src/shared imports only zod."),
  layer(["src/decor"], ["config"], "src/decor imports only @/config."),
  layer(["src/adapters"], ["domain", "config", "generated"], "src/adapters imports only @/domain, @/config, @/generated."),
  layer(["src/store"], ["domain", "adapters", "config", "shared"], "src/store imports only @/domain, @/adapters, @/config, @/shared."),
  layer(
    ["src/components"],
    ["components", "store", "domain", "decor", "shared", "config", "styles"],
    "src/components never imports @/adapters, @/server, or @/app.",
  ),
  layer(
    ["src/app"],
    ["app", "components", "store", "domain", "decor", "shared", "config", "styles"],
    "Client code never imports @/adapters or @/server (only src/app/api/** may).",
    { ignores: ["src/app/api/**"] },
  ),
  layer(["src/app/api"], ["server", "shared", "config"], "src/app/api imports only @/server, @/shared, @/config."),
  layer(["src/server"], ["shared", "config"], "src/server imports only @/shared, @/config."),
]);

export default eslintConfig;
