"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { copy } from "@/components/copy";
import { LineButton } from "@/components/LineButton";
import { StageIconButton } from "@/components/StageIconButton";
import type { Challenge, ComposeError, RevealedKind } from "@/domain/session/schema";
import { getAppStore, useAppStore } from "@/store";
import { ArrowLeftIcon, SpeakerIcon, SpeakerOffIcon, StarIcon } from "./icons";
import { canHandleEscape, isPlainActivationKey, isPlainEscape, isStageError, shouldRequestNewChallenge, stageMeta } from "./logic";
import { RevealComposition } from "./RevealComposition";
import { liveAnnouncement, nextLiveText, restoreAnnouncement } from "./reveal-logic";
import { useRerollShuffle, useRevealMotion } from "./useRevealMotion";

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
 * `RevealComposition` once a Challenge is held; `useRevealMotion` (Story
 * 4.1) drives each piece's shuffle-then-land motion and is the one place
 * that dispatches `reveal_next`. With everything landed, Lock toggles and
 * Reroll appear (Story 4.3); Start creating is Story 5.1.
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

  // Story 4.1: the shuffle/landing motion state machine, shared by the
  // keydown fallback below and RevealComposition's sun button -- a press
  // from either place goes through the same sequencing (AD-18 dispatches
  // `reveal_next` only once, from inside the hook, when a piece's landing
  // phase elapses; see useRevealMotion.ts).
  const heldChallenge = store.session.state === "held" ? store.session.challenge : null;
  const motion = useRevealMotion(heldChallenge, store.session.revealed, store.library, store.setup);
  const { canPress, press } = motion;

  // Story 4.3: the changed pieces' decorative reshuffle after a Reroll.
  const reshuffle = useRerollShuffle(heldChallenge, store.library, store.setup);

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
      if (store.session.state !== "held" || store.session.challenge === null) return;
      if (!canPress) return;
      event.preventDefault();
      press();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [store.session, goToSetup, canPress, press]);

  // EXPERIENCE.md -> Accessibility Floor: the Stage's one aria-live region.
  // It lives here, mounted before any Challenge is held, so its text changes
  // are spoken rather than arriving with the region itself. Text is derived
  // with React's "store information from previous renders" pattern (a
  // guarded setState during render; the lint config forbids setState in an
  // effect body and ref reads during render). The first hydrated render
  // seeds it -- Story 3.11: a fresh mount (reload, resume, or a Setup round
  // trip) that already finds a Challenge held with some progress queues
  // `restoreAnnouncement` as `pending`, and the effect below moves it into
  // the region a tick later: a region that mounts already holding its text
  // (a client-side return) is usually not spoken. The same `pending` hop
  // re-speaks text identical to what the region already says (`nextLiveText`:
  // two Rerolls, or two failed ones, in a row). Only `held` is restored --
  // a reload during an Attempt stays silent until Story 5.x owns that state.
  const quickReveal = store.setup?.quickReveal ?? false;
  const composeError = store.session.lastComposeError;
  const [live, setLive] = useState<{
    seeded: boolean;
    challenge: Challenge | null;
    revealed: readonly RevealedKind[];
    composeError: ComposeError | null;
    text: string;
    pending: string | null;
  }>({ seeded: false, challenge: null, revealed: [], composeError: null, text: "", pending: null });
  if (!live.seeded) {
    if (store.status !== "loading") {
      const restore = heldChallenge !== null ? restoreAnnouncement(heldChallenge, store.session.revealed, quickReveal) : null;
      setLive({ seeded: true, challenge: heldChallenge, revealed: store.session.revealed, composeError, text: "", pending: restore });
    }
  } else if (heldChallenge?.id !== live.challenge?.id || store.session.revealed !== live.revealed || composeError !== live.composeError) {
    // Story 4.3 interim (until Story 4.4's inline Lock-conflict message and
    // Unlock button): a failed Reroll keeps the held Challenge and focus on
    // Reroll, and just says so here, politely.
    // TODO(Story 4.4): replace with the inline message + "Unlock <piece>" button.
    const failedReroll = heldChallenge !== null && composeError !== null && composeError !== live.composeError;
    const text = failedReroll
      ? copy.stage.rerollFailed
      : liveAnnouncement(live.challenge, live.revealed, heldChallenge, store.session.revealed, quickReveal);
    const next = nextLiveText(live.text, text);
    setLive({ seeded: true, challenge: heldChallenge, revealed: store.session.revealed, composeError, ...next });
  }
  useEffect(() => {
    if (live.pending === null) return;
    const id = setTimeout(() => setLive((prev) => ({ ...prev, text: prev.pending ?? prev.text, pending: null })));
    return () => clearTimeout(id);
  }, [live.pending]);

  const sound = store.setup?.sound ?? false;
  const meta = stageMeta(store.session.challenge);
  // Story 4.3: a failed Reroll also sets `lastComposeError`, but the held
  // Challenge stays exactly as it was (Story 4.4 owns its own Lock-conflict
  // message) -- this generic banner is only for the pre-held "nothing
  // composed yet" case, so it must not also appear over a still-held Stage.
  const errorText = isStageError(store.status, store.libraryStatus)
    ? copy.stage.loadError
    : store.session.state !== "held" && store.session.lastComposeError !== null
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
              motion={motion}
              locks={store.session.locks}
              reshuffle={reshuffle}
              onToggleLock={(kind) => getAppStore().dispatchSession({ type: "toggle_lock", kind })}
              onReroll={() => getAppStore().dispatch({ type: "reroll" })}
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
