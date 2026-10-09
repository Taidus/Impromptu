// Fails if package.json pulls in analytics or a client error-monitoring SDK (privacy guard).
import { readFileSync } from "node:fs";

const banned = [
  /^@vercel\/analytics$/,
  /^@vercel\/speed-insights$/,
  /^@vercel\/otel$/,
  /^@sentry\//,
  /^@bugsnag\//,
  /^@datadog\/browser-/,
  /^logrocket$/,
  /^rollbar$/,
  /^posthog-js$/,
  /^@posthog\//,
  /^@highlight-run\//,
  /^mixpanel-browser$/,
  /^@segment\//,
  /^@amplitude\//,
  /^@microsoft\/clarity$/,
  /^react-ga/,
  /^@fullstory\//,
  /^@hotjar\//,
];

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const deps = Object.keys({
  ...pkg.dependencies,
  ...pkg.devDependencies,
  ...pkg.optionalDependencies,
  ...pkg.peerDependencies,
});
const offenders = deps.filter((name) => banned.some((re) => re.test(name)));

if (offenders.length > 0) {
  console.error(`check:privacy FAILED — banned dependencies: ${offenders.join(", ")}`);
  process.exit(1);
}
console.log("check:privacy OK — no analytics or error-monitoring SDKs.");
