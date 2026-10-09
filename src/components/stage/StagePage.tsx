"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";
import { copy } from "@/components/copy";
import { StageIconButton } from "@/components/StageIconButton";
import { getAppStore, useAppStore } from "@/store";
import { ArrowLeftIcon, SpeakerIcon, SpeakerOffIcon, StarIcon } from "./icons";
import { canHandleEscape, isStageError, shouldRequestNewChallenge, stageMeta } from "./logic";

/**
 * The Challenge Stage shell (Story 3.9): a lilac ground with no navigation,
 * footer, setup controls, or signup; a visually hidden h1; a centered
 * safe-area column holding the Stage mark and the Level/mode meta; and the
 * back/sound corner controls outside it. This is also the one Stage-level
 * key handler (AD-7, Cross-Document Resolution 3) -- later stories add to
 * it, never add a second one.
 *
 * The reveal composition itself (ticket tabs, paper scrap, foil slip, ink
 * stamp, Brief, action row) is Story 3.10's slot and is deliberately left
 * empty here.
 */
export function StagePage() {
  const store = useAppStore();
  const router = useRouter();
  const requestedChallenge = useRef(false);

  // AD-7 + EXPERIENCE.md -> Information Architecture: opening /stage with
  // nothing held behaves like "Get a challenge" with the saved setup.
  // Fires once; the store itself handles "wait until truly ready".
  useEffect(() => {
    if (requestedChallenge.current) return;
    if (!shouldRequestNewChallenge(store.libraryStatus, store.session.state)) return;
    requestedChallenge.current = true;
    getAppStore().dispatch({ type: "new_challenge" });
  }, [store.libraryStatus, store.session.state]);

  const goToSetup = useCallback(() => {
    router.push("/");
  }, [router]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (!canHandleEscape(store.session)) return;
      goToSetup();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [store.session, goToSetup]);

  const sound = store.setup?.sound ?? false;
  const meta = stageMeta(store.session.challenge);
  const hasError = isStageError(store.status, store.libraryStatus);

  return (
    <div className="relative min-h-screen bg-lilac">
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
        caption={sound ? copy.stage.soundOnCaption : copy.stage.soundOffCaption}
        aria-label={sound ? copy.stage.soundOnAnnounced : copy.stage.soundOffAnnounced}
        disabled={store.setup === null}
        onClick={() => getAppStore().dispatchSetup({ type: "set_sound", sound: !sound })}
        className="fixed top-header-inset right-header-inset"
      />

      <div className="flex min-h-screen flex-col items-center justify-center px-gutter-phone py-12">
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
          <p aria-hidden={meta === null} className="text-stage-meta uppercase text-plum-muted">
            {meta ?? " "}
          </p>

          {hasError ? (
            <p role="status" className="text-body text-plum">
              {copy.stage.loadError}
            </p>
          ) : null}

          {/* Story 3.10 renders the reveal composition here: ticket tabs,
              paper scrap, foil slip, ink stamp, and the Brief. */}
        </div>
      </div>
    </div>
  );
}
