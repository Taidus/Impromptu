---
title: "Addendum: Impromptu PRD"
created: 2026-10-08
updated: 2026-10-08
---

# Addendum — technical and configuration detail for architecture and UX

## Stack (founder decision, 2026-10-08)

- **Hosting:** Vercel.
- **App:** Next.js. The Challenge experience is client-heavy. The only server code is the email signup route (FR-35).
- **3D:** three.js, placed per PRD NFR-7: the landing/setup hero and the Reveal shuffle only. 3D renders the Y2K accents (chrome stars, inflated shapes, and orbital rings in the hero and Reveal). The mockup's chrome is image-based, so 3D supplements those images rather than replacing them. Architecture should decide:
  - **Scope:** 3D is a decorative layer behind or around the stable center, never the carrier of Inputs or the Brief. Text stays in the DOM for accessibility, selection, and legibility on camera.
  - **Loading:** dynamically imported, client-only, and never blocking first interaction (NFR-3).
  - **Fallback:** a static 2D or SVG equivalent when reduced motion is on, WebGL is unavailable, or the device is low-power (NFR-3, NFR-7).
  - **Settle rule:** on the Challenge Stage, the render loop stops (or the scene freezes on a frame) once the Reveal completes, and stays stopped while the user is creating (FR-15, FR-33). This also saves battery while someone films.
- **Email:** Resend, called from a server-side route. The API key is in a Vercel environment variable. Add per-IP rate limiting and a honeypot field (FR-36). Store contacts in a single Resend audience. Unsubscribe uses Resend's managed link or a signed token route (FR-37).
- **Persistence:** browser storage behind a small versioned repository (schema version and migrations, FR-27), with a detected-unavailable fallback to memory (FR-29).

## Proposed configuration defaults (NFR-6)

| Key | Default | Notes |
|---|---|---|
| `generator.recentWindow` | 30 revealed Challenges | FR-8 |
| `mediums` | Writing, Drawing, Photography, Spoken storytelling | Extensible list |
| `timeLimits` | 5 min (idea generation), 10 min (writing/storytelling), 20 min (sketch) | Perform only |
| `reflection.maxChars` | 280 per field | FR-23 |
| `reveal.quickMaxMs` | 1000 | SM-C2 |

## Challenge library shape (proposal for architecture)

Store the library as typed data in the repo (for example, TypeScript or JSON), validated at build time (CL-3). Shape:

- **Template:** `id`, `skill`, `level`, `mediums[]`, `briefPattern` with `{topic}`/`{style}`/`{constraint}` slots (or per-medium variants), `topicTags[]`, `styleTags[]`, `constraintTags[]`, `incompatible[]`, optional `timeLimit`, optional `guidance` (Explore).
- **Topics, Styles, Constraints:** `id`, `label`, `revealText`, `tags[]`, and optional `requires`/`excludes` attributes, for example a Topic that `requires: person` versus a Constraint that `excludes: person`.

Generation sequence: filter Templates (Level, Skill, Mediums, Locks) → filter compatible fills → drop recent Template-plus-Topic combinations (FR-8; allow a repeat if none remain) → pick at random → render the Brief. When filtering leaves no compatible Challenge, the result names the Lock to release (FR-9).

## Example Challenges carried verbatim (CL-5)

1. **Explore · Observation · Drawing.** "Draw an object near you. Include three details you have never paid attention to." Untimed.
2. **Experiment · Expression · Photography · Minimalist · No people.** "Take two photos of coming home. Make one feel comforting and the other lonely. Keep people out of both." Untimed. (The founder's "Intermediate" maps to Experiment, confirmed 2026-10-08.)
3. **Perform · Idea generation · Writing · Horror · Nothing bad happens.** "Write three premises for a first date that feels like horror, even though nothing bad happens." 5 minutes, starting when the user taps **Start creating**.

## Email compliance notes

The form needs a consent line and a link to the privacy note. Every email needs the sender's physical address (CAN-SPAM) and a one-click unsubscribe. Decision: apply GDPR-style opt-in for every visitor, since it is simpler than detecting location. That means an unticked consent box or a clearly worded explicit submit, plus a stored consent timestamp.
