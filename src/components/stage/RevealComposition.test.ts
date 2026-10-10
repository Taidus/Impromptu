// Story 4.3: render-level checks for when Lock toggles + Reroll show, since
// this is driven by `origin.kind` + `next`, not just the store's plain
// `revealed`/`locks` fields. The underlying `toggle_lock`/`reroll` behavior
// is unit-tested in session-reducer.test.ts and store.test.ts; e2e (lock-
// reroll.spec.ts) covers click/focus/announcement/persistence end to end.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { copy } from "@/components/copy";
import type { Challenge, Locks, RevealedKind } from "@/domain/session/schema";
import { baseChallenge, fullChallenge } from "@/domain/session/session-fixture";
import { presentKinds } from "@/domain/session/session-reducer";
import { RevealComposition } from "./RevealComposition";
import type { RevealMotion } from "./useRevealMotion";

const idleMotion: RevealMotion = { state: { status: "idle" }, flickText: null, canPress: false, reduced: false, press: () => {} };

function render(challenge: Challenge, revealed: RevealedKind[] = presentKinds(challenge), locks: Locks = {}) {
  return renderToStaticMarkup(
    createElement(RevealComposition, { challenge, revealed, motion: idleMotion, locks, onToggleLock: () => {}, onReroll: () => {} }),
  );
}

describe("RevealComposition -- Lock toggles + Reroll (Story 4.3)", () => {
  it("are absent mid-Reveal", () => {
    const html = render(baseChallenge, ["skill"]);
    expect(html).not.toContain(copy.button.reroll);
    expect(html).not.toContain(copy.stage.lock.lockedCaption);
  });

  it("appear once fully revealed for a new-origin Challenge, one toggle per present kind", () => {
    const html = render(fullChallenge);
    expect(html).toContain(copy.button.reroll);
    expect(html).toContain(copy.stage.lock.toggleLabel(copy.stage.piece.skill));
    expect(html).toContain(copy.stage.lock.toggleLabel(copy.stage.piece.constraint));
  });

  it("are hidden once fully revealed for a retry-origin Challenge (EXPERIENCE.md -> Retry)", () => {
    const retryChallenge: Challenge = { ...fullChallenge, origin: { kind: "retry", fromRepId: "223e4567-e89b-42d3-a456-426614174000" } };
    const html = render(retryChallenge);
    expect(html).not.toContain(copy.button.reroll);
    expect(html).not.toContain(copy.stage.lock.toggleLabel(copy.stage.piece.skill));
  });

  it("show the LOCKED caption and aria-pressed=true for a locked kind", () => {
    const html = render(fullChallenge, presentKinds(fullChallenge), { skill: fullChallenge.inputs.skill.id });
    expect(html).toContain(copy.stage.lock.lockedCaption);
    expect(html).toContain('aria-pressed="true"');
  });

  it("keeps Reroll mounted through its own reroll-origin catch-up, never the sun button", () => {
    const rerolled: Challenge = { ...fullChallenge, origin: { kind: "reroll", fromRepId: null } };
    const html = render(rerolled, ["skill"]); // mid catch-up: not fully revealed yet
    expect(html).toContain(copy.button.reroll);
    expect(html).not.toContain(copy.button.revealNext);
  });
});
