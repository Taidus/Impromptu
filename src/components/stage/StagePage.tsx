"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { copy } from "@/components/copy";
import { LineButton } from "@/components/LineButton";
import { StageIconButton } from "@/components/StageIconButton";
import type { RevealedKind } from "@/domain/session/schema";
import { getAppStore, useAppStore } from "@/store";
import { ArrowLeftIcon, SpeakerIcon, SpeakerOffIcon, StarIcon } from "./icons";
import { canHandleEscape, isPlainActivationKey, isPlainEscape, isStageError, shouldRequestNewChallenge, stageMeta } from "./logic";
import { RevealComposition } from "./RevealComposition";
import { liveAnnouncement, nextKind, restoreAnnouncement } from "./reveal-logic";

/**
 * The Challenge Stage shell (Story 3.9): a lilac ground with no navigation,
 * footer, setup controls, or signup; a visually hidden h1; a centered
 * safe-area column holding the Stage mark and the Level/mode meta; and the
 * back/sound corner controls outside it. This is also the one Stage-level
 * key handler (AD-7, Cross-Document Resolution 3) -- Story 3.10 extends it
 * (Space/Enter) rather than adding a second one.
 *
 * The reveal composition itself (Story 3.10: ticket tabs, paper scrap, foil
 * slip, ink stamp, Brief, and the "Reveal next" sun button) renders via
 * `RevealComposition` once a Challenge is held. Pieces land instantly --
 * Epic 4 adds the shuffle/shimmer motion. With everything landed, the
 * action row has no primary action yet (Reroll is 4.3, Start creating 5.1).
 */
export function StagePage() {
  const store = useAppStore();
  const router = useRouter();
  const requestedChallenge = useRef(false);

  // AD-7 + EXPERIENCE.md -> Information Architecture: opening /stage with
  // nothing held behaves like "Get a challenge" with the saved setup.
  // Fires once per stay in `none`; the store itself handles "wait until truly
  // ready". Re-arms whenever the session leaves `none`, so a later return to
  // `none` (another tab cleared it) asks again; a failed compose leaves the
  // session in `none` and does not loop.
  useEffect(() => {
    if (store.session.state !== "none") {
      requestedChallenge.current = false;
      return;
    }
    if (requestedChallenge.current) return;
    if (!shouldRequestNewChallenge(store.libraryStatus, store.session.state)) return;
    requestedChallenge.current = true;
    getAppStore().dispatch({ type: "new_challenge" });
  }, [store.libraryStatus, store.session.state]);

  const goToSetup = useCallback(() => {
    // replace, not push: browser Back from Setup must not reopen /stage and
    // compose again. Focus lands on Setup's h1 via ReturnFocus (layout).
    router.replace("/");
  }, [router]);

  // AD-7 / EXPERIENCE.md -> Interaction Primitives: this stays the Stage's
  // one keydown listener. Story 3.10 extends it with the Space/Enter
  // "Reveal next" shortcut for when no control has focus -- normally the
  // sun button itself has focus, so its native button activation already
  // handles Space/Enter and this branch never fires.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (isPlainEscape(event)) {
        if (!canHandleEscape(store.session)) return;
        goToSetup();
        return;
      }
      if (!isPlainActivationKey(event)) return;
      const focused = document.activeElement;
      if (focused !== null && focused !== document.body && focused !== document.documentElement) return;
      const challenge = store.session.challenge;
      if (store.session.state !== "held" || challenge === null) return;
      if (nextKind(challenge, store.session.revealed) === null) return;
      event.preventDefault();
      getAppStore().dispatchSession({ type: "reveal_next" });
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [store.session, goToSetup]);

  // EXPERIENCE.md -> Accessibility Floor: the Stage's one aria-live region.
  // It lives here, mounted before any Challenge is held, so its text changes
  // are spoken rather than arriving with the region itself. Text is derived
  // with React's "store information from previous renders" pattern (a
  // guarded setState during render; the lint config forbids setState in an
  // effect body and ref reads during render). The first hydrated render
  // seeds it -- Story 3.11: a fresh mount (reload, resume, or a Setup round
  // trip) that already finds a Challenge held with some progress queues
  // `restoreAnnouncement` as `restore`, and the effect below moves it into
  // the region a commit later: a region that mounts already holding its text
  // (a client-side return) is usually not spoken. Only `held` is restored --
  // a reload during an Attempt stays silent until Story 5.x owns that state.
  const heldChallenge = store.session.state === "held" ? store.session.challenge : null;
  const quickReveal = store.setup?.quickReveal ?? false;
  const [live, setLive] = useState<{
    seeded: boolean;
    challengeId: string | null;
    revealed: readonly RevealedKind[];
    text: string;
    restore: string | null;
  }>({ seeded: false, challengeId: null, revealed: [], text: "", restore: null });
  const heldId = heldChallenge?.id ?? null;
  if (!live.seeded) {
    if (store.status !== "loading") {
      const restore = heldChallenge !== null ? restoreAnnouncement(heldChallenge, store.session.revealed, quickReveal) : null;
      setLive({ seeded: true, challengeId: heldId, revealed: store.session.revealed, text: "", restore });
    }
  } else if (heldId !== live.challengeId || store.session.revealed !== live.revealed) {
    const text = liveAnnouncement(live.challengeId, live.revealed, heldChallenge, store.session.revealed, quickReveal);
    setLive({ seeded: true, challengeId: heldId, revealed: store.session.revealed, text: text ?? live.text, restore: null });
  }
  useEffect(() => {
    if (live.restore === null) return;
    const id = setTimeout(() => setLive((prev) => ({ ...prev, text: prev.restore ?? prev.text, restore: null })));
    return () => clearTimeout(id);
  }, [live.restore]);

  const sound = store.setup?.sound ?? false;
  const meta = stageMeta(store.session.challenge);
  const errorText = isStageError(store.status, store.libraryStatus)
    ? copy.stage.loadError
    : store.session.lastComposeError !== null
      ? copy.stage.composeError
      : null;

  return (
    <div className="relative isolate min-h-screen bg-lilac">
      {/* Lilac-deep edge fade (DESIGN.md -> Colors): a bottom band behind the
          content, ending well over 120px below the top corner controls so
          back and sound sit on plain lilac. Grain is deferred to Story 8.2. */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 bottom-0 -z-10 h-1/3 bg-linear-to-t from-lilac-deep"
      />

      <h1 className="sr-only">{copy.stage.h1}</h1>

      {/* Corner controls (DESIGN.md -> Layout: "outside the safe area on
          purpose, so a 9:16 crop drops them"). Fixed to the viewport, not
          the column, so they stay put even if the column later scrolls
          (the fit-rule's last resort). */}
      <StageIconButton
        ground="lilac"
        icon={<ArrowLeftIcon />}
        aria-label={copy.stage.back}
        onClick={goToSetup}
        className="fixed top-header-inset left-header-inset"
      />
      <StageIconButton
        ground="lilac"
        icon={sound ? <SpeakerIcon /> : <SpeakerOffIcon />}
        caption={store.setup === null ? undefined : sound ? copy.stage.soundOnCaption : copy.stage.soundOffCaption}
        aria-label={sound ? copy.stage.soundOnAnnounced : copy.stage.soundOffAnnounced}
        disabled={store.setup === null}
        onClick={() => getAppStore().dispatchSetup({ type: "set_sound", sound: !sound })}
        className="fixed top-header-inset right-header-inset"
      />

      {/* Phone: bottom padding clears the fixed action row (RevealComposition). */}
      <div className="flex min-h-screen flex-col items-center justify-center px-gutter-phone pt-12 pb-[calc(var(--spacing-target-min)+--spacing(8)+env(safe-area-inset-bottom))] desktop:pb-12">
        <div className="flex w-safe-area-width max-w-full flex-col items-start gap-stage-gap">
          {/* Decorative; the h1 above names the page (DESIGN.md -> Stage mark). */}
          <p aria-hidden="true" className="flex items-center gap-2 text-stage-mark text-plum">
            {copy.stage.mark}
            <span className="text-grape">
              <StarIcon />
            </span>
          </p>

          {/* Reserves the meta row's height before a Challenge lands, so
              nothing reflows once it does (EXPERIENCE.md -> Cold load). */}
          <p
            aria-hidden={meta === null}
            className="text-stage-meta-phone uppercase text-plum-muted desktop:text-stage-meta"
          >
            {meta ?? "\u00a0"}
          </p>

          {/* Always mounted, so screen readers announce text changes. */}
          <p role="status" className="text-body text-plum">
            {errorText}
          </p>
          {errorText !== null ? (
            <LineButton ground="lilac" onClick={goToSetup}>
              {copy.stage.back}
            </LineButton>
          ) : null}

          {store.session.state === "held" && store.session.challenge !== null ? (
            <RevealComposition
              challenge={store.session.challenge}
              revealed={store.session.revealed}
              onRevealNext={() => getAppStore().dispatchSession({ type: "reveal_next" })}
            />
          ) : null}

          <p aria-live="polite" className="sr-only">
            {live.text}
          </p>
        </div>
      </div>
    </div>
  );
}
