// Fails unless every app page route was fully statically prerendered by `next build` (AD-1).
// Run from a cwd that contains `.next/`.
import { readFileSync } from "node:fs";

const read = (file) => JSON.parse(readFileSync(`.next/${file}`, "utf8"));
const appRoutes = read("app-path-routes-manifest.json");
const { routes } = read("prerender-manifest.json");

const required = Object.entries(appRoutes)
  .filter(([key]) => key.endsWith("/page") && !["/_not-found/page", "/_global-error/page"].includes(key))
  .map(([, route]) => route);

const isStatic = (entry) =>
  entry?.compute === "static" && entry?.response === "complete" && entry?.initialRevalidateSeconds === false;

const offenders = required.filter((route) => !isStatic(routes[route]));

if (offenders.length > 0) {
  console.error(`check:static FAILED — not fully static: ${offenders.join(", ")}`);
  process.exit(1);
}
console.log(`check:static OK — prerendered: ${required.join(", ")}`);
