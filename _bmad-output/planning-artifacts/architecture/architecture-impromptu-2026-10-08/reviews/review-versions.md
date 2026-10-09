# Review: Versions and Reality Check of ARCHITECTURE-SPINE.md

- **Lens:** Was every committed decision web-researched or reality-checked rather than asserted from training data? This covers current versions, whether each named technology still exists and fits, and the live defaults of the starter.
- **Target:** `ARCHITECTURE-SPINE.md` and `.memlog.md`, both from 2026-10-08.
- **Reviewed:** 2026-10-08.
- **Method:**
  - Queried the npm registry `/latest` for every package in the Stack table.
  - Downloaded and read `create-next-app@16.4.0`, `resend@6.32.1` and `three@0.186.1`.
  - Ran a dry `npm install --package-lock-only` to test peer resolution.
  - Read the current docs on nextjs.org (16.4.0), vercel.com and resend.com.

## Verdict

Every pinned version is current and matches the registry exactly. The memlog shows real registry checks. However, three assertions were never checked against the actual starter or SDK, and they are wrong:

- what the create-next-app defaults are;
- the shape of the Resend `segments` field;
- whether the Vitest pin installs at all next to the starter's `@types/node`.

These need fixing before stories are cut.

## Version spot-check (npm registry, 2026-10-08)

| Package | Spine pin | npm `latest` | Status |
| --- | --- | --- | --- |
| next / create-next-app / eslint-config-next | 16.4.0 | 16.4.0 | OK (engines node >=20.9) |
| react / react-dom | 19.3.0 | 19.3.0 | OK |
| typescript | 5.9.3 | 7.0.2 (5.9.3 exists) | OK, deliberate: the starter's template still says `typescript: "^5"` (confirmed in the tarball) |
| tailwindcss / @tailwindcss/postcss | 4.3.3 | 4.3.3 | OK |
| three / @types/three | 0.186.1 / 0.186.0 | same | OK |
| zod | 4.6.5 | 4.6.5 | OK |
| resend | 6.32.1 | 6.32.1 | OK (engines node >=20) |
| vitest | 5.0.3 | 5.0.3 | Version OK, but **does not install with the starter** (F-3) |
| @playwright/test | 1.64.0 | 1.64.0 | OK (Next's peer range is `^1.51.1`) |
| eslint | not pinned | 10.12.0; the starter pins `^9` | Low: leave it unpinned and inherit the starter's `^9` |
| vite | **not listed** | 8.3.4 | Required peer of vitest 5 (`peerDependenciesMeta.vite.optional: false`) |
| Node on Vercel | 24.x | 24.x is the default; 22.x and 20.x also offered | OK (vercel.com docs; the Node 20 deprecation on 2026-10-01 is confirmed in the changelog) |

## Findings

### F-1 — HIGH: The create-next-app 16.4 defaults are misstated. The default `cacheComponents: true` is not addressed.

**Evidence.** I read the defaults object in `create-next-app@16.4.0/dist/index.js`:

```
{typescript:true, linter:"eslint", tailwind:true, app:true, srcDir:false,
 importAlias:"@/*", reactCompiler:false, cacheComponents:true, agentsMd:true}
```

When `cacheComponents` is on, the starter also writes `cacheComponents: true, partialPrefetching: true` into `next.config.ts`.

**Problems.**

1. The memlog says the starter defaults include a `src/` dir, but the default is `srcDir:false`. The spine's whole source tree is under `src/`, so scaffolding "with defaults" gives the wrong layout.
2. The spine never mentions Cache Components or Partial Prerendering, yet they are on by default. The Next 16.4 docs say this changes two things:
   - **Prerender behavior.** A Client Component that reads `Date.now()`/`new Date()` during prerender triggers `next-prerender-current-time-client`. Next then needs a Suspense fallback, or the component drops out of the static HTML. This conflicts with AD-1 ("every page statically prerendered"), which assumes classic static output. AD-10's effect-only hydration mitigates it, but only if nobody reads `Clock` or `Random` during render.
   - **Navigation.** Routes are kept mounted inside React `<Activity mode="hidden">` instead of unmounting. AD-12 says "All GPU resources are disposed on unmount", and AD-7/AD-8 rely on the Stage's ticking intervals. Under Activity, a hidden `/stage` is not unmounted. Its effects are cleaned up and then re-run, so the three.js renderer may be kept or rebuilt in ways the spine does not anticipate.

**Fix.** Add an explicit starter line to AD-1 and to the Stack table:

> `npx create-next-app@16.4.0 --ts --tailwind --eslint --app --src-dir --turbopack --import-alias "@/*" --no-cache-components --no-react-compiler`

Also record the reason. Opting out keeps classic static prerendering and the unmount semantics that AD-10 and AD-12 assume. If you would rather keep Cache Components, do two things instead:

- amend AD-12 to "dispose in effect cleanup (also fires when the route is hidden by Activity)";
- amend AD-10 to "never read Clock or Random during render".

### F-2 — HIGH: The Resend `contacts.create` call in AD-14 is the wrong type and relies on unverified behavior

**Evidence.** I read `resend@6.32.1/dist/index.d.mts`:

```ts
export interface CreateContactOptions {
  email: string; unsubscribed?: boolean; firstName?: string; lastName?: string;
  properties?: { [key: string]: string | number | null };
  segments?: { id: string }[];
  topics?: { id: string; subscription: 'opt_in' | 'opt_out' }[];
}
```

The Resend docs on contact properties (resend.com/docs/dashboard/contacts/properties) say:

> "properties are added to the Contact only if the property key already exists and the value type is valid"

and that an undefined key makes the call fail. The supported property types are `string` and `number` only.

The SDK's `RESEND_ERROR_CODE_KEY` union has **no** `already_exists` or conflict code. Neither the docs nor the SDK says what `contacts.create` does for an email that already exists. Contacts are now global, so it could be an upsert, a `validation_error`, or a silent ignore.

**Problems.**

- AD-14 writes `segments:[RESEND_SEGMENT_ID]`. The SDK needs `segments:[{id: RESEND_SEGMENT_ID}]`.
- `consent_at` and `consent_text_version` must be **pre-created** as contact properties, using `resend.contactProperties.create` or the dashboard. Otherwise every signup fails, and the route returns `unavailable`.
- `consent_at` has to be stored as an ISO string, because there is no date type.
- "An existing contact counts as success" has no detection rule. There is also a deeper consent problem with returning contacts:
  - A contact who exists but is not in the Segment would not be added to it.
  - A contact who previously unsubscribed would stay unsubscribed, or be silently re-subscribed. Either outcome is a consent issue.

**Fix.** Amend AD-14:

- Use `segments:[{id}]`.
- Add an ops step to AD-20: create both properties as `string` in each Resend account or environment that is used, before the first deploy.
- Define the existing-contact path explicitly: on a create error, call `contacts.update({email, unsubscribed:false, properties})` and then `contacts.segments.add({email, segmentId})`. Both exist in the SDK.
- Map only `validation_error` on `email` to `invalid_email`.
- Add a Preview-environment smoke test that signs up the same address twice and records the observed behavior in the memlog.

### F-3 — MEDIUM: The Vitest 5.0.3 pin breaks `npm install` against the starter's `@types/node`

**Evidence.**

- The create-next-app 16.4 template writes `"@types/node": "^20"`.
- vitest 5.0.3 declares `peerOptional @types/node "^22.0.0 || >=24.0.0"`.
- A dry run of `npm install --package-lock-only` with `{@types/node:^20, vitest:5.0.3}` fails with `ERESOLVE ... Conflicting peer dependency`.
- vitest 5 also requires `vite` as a non-optional peer, and the Stack table does not list it.

**Fix.** Add `@types/node` `^24` to the Stack table, to match `engines.node 24.x`, and bump it right after scaffolding. Also add `vite` 8.3.4. The first CI run will need jsdom 30.1.2 or happy-dom for any component tests, so pin whichever one is chosen as well. The spine's domain tests can stay in the `node` environment.

### F-4 — LOW: Vercel WAF details are slightly misreported and have caveats the spine does not cover

**Evidence.** vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting, last updated 2026-08-28:

- It is "available on all plans".
- Hobby gets **1 rate-limit rule per project**, a fixed window of 10 s to 10 min, IP or JA4 keys, and **1,000,000 allowed requests included**. Pricing is "Regional".
- "Rate limit counters are tracked on a per-region basis."
- Changes are published "to your production deployment".

The memlog's "$0.50/1M" price is not stated on the current page.

**Fix.**

- Correct the memlog's pricing line.
- Note in AD-14 that the limit applies per region, so "5 per 60 s" is approximate.
- Note in AD-14 that the one Hobby rule is now used up.
- Confirm in the dashboard whether the rule covers Preview deployments. If it does not, the separate test Segment in AD-20 is unthrottled, which is acceptable but should be written down.

### F-5 — LOW: Smaller unconfirmed details (no change needed, noted for completeness)

- **next/dynamic `ssr:false`.** Confirmed in the 16.4 docs: it is allowed only inside Client Components, and using it in a Server Component is an error. AD-12 is correct, but the story should say that the importing file has `'use client'`.
- **`proxy.ts`.** Confirmed as the current name. In v16.0.0 `middleware` was deprecated and renamed to `proxy`, and Proxy now defaults to the Node runtime. AD-1's ban is correctly worded.
- **`next/font/google`.** Confirmed: it downloads at build time, and "No requests are sent to Google by the browser". AD-13 holds. The Vercel build does need network access to Google Fonts. Bodoni Moda's `opsz` axis is only included if `axes:['opsz']` is passed, which matters for display sizes.
- **three.js 0.186.1.** `WebGLRenderer` uses only the `webgl2` context ("WebGL 1 is not supported since r163"), and `setAnimationLoop(callback|null)` exists. The AD-12 gate and freeze are correct.
- **zod 4.6.5.** The root `zod` export is v4, and `z.infer` is unchanged. AD-15 holds.
- **Tailwind v4 `@theme`.** The starter's `app/globals.css` uses `@import "tailwindcss"` plus `@theme inline`. A separate `src/styles/tokens.css` works only if `globals.css` imports it after `@import "tailwindcss"`. State this in the Styling convention.
- **ESLint.** The starter pins `eslint ^9`, while npm latest is 10.12.0. Keep the starter's pin. `eslint-config-next@16.4.0` peers on `eslint >=9`.
- **AGENTS.md.** The starter now generates an `AGENTS.md` by default (`agentsMd:true`). Decide whether to keep it, because it overlaps with any project-context file.

## Summary of required edits

1. AD-1 and the Stack table: record the exact create-next-app flags, `--src-dir` and `--no-cache-components` (or adapt AD-10 and AD-12 to Cache Components and Activity).
2. AD-14: change `segments` to `[{id}]`; require the two properties to be pre-created; define the existing-contact path with update and segments.add; add a smoke test.
3. Stack table: add `@types/node ^24` and `vite 8.3.4`, otherwise install fails with ERESOLVE.
4. Memlog and AD-14: correct the WAF pricing and add the per-region and Preview caveats.
