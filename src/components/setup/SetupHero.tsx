"use client";

import { useEffect, useId } from "react";
import { copy } from "@/components/copy";
import { SunButton } from "@/components/SunButton";
import type { ComposeLibrary } from "@/domain/compose/compose";
import type { Setup } from "@/domain/session/schema";
import { getAppStore, useAppStore, type StoreState } from "@/store";
import { DifficultyDial } from "./DifficultyDial";
import { MediumsRow } from "./MediumsRow";
import { InlineStatus } from "./InlineStatus";
import { mediumSelectOptions, optionOrRandom, skillSelectOptions } from "./options";
import { PerformTimingControl } from "./PerformTiming";
import { QuickRevealSwitch } from "./QuickRevealSwitch";
import { SetupSelect } from "./SetupSelect";
import { SkillInfo } from "./SkillInfo";
import { useGetAChallenge } from "./useGetAChallenge";

const { setup: setupCopy } = copy;

/**
 * Setup page section 01 (night): headline, explanation, the Difficulty
 * Dial, and (at Perform) the Perform-timing control (Story 3.7). The header
 * band (wordmark, Practice link, Motion toggle) moved out to
 * `SetupHeader` (Story 8.3), rendered by page.tsx just above this section.
 * EXPERIENCE.md -> Setup page sections.
 */
export function SetupHero() {
  const state = useAppStore();

  return (
    <section id="setup" className="bg-night px-gutter-phone pt-6 pb-28 text-cream desktop:px-14 desktop:pt-8">
      {/* Story 8.2 wraps the page in decorative layers (Ticker, ChromePiece,
          OrbitThread, Grain) behind a `relative` ancestor; this column must stay on top.
          The header band itself is journey/SetupHeader (Story 8.3), rendered above. */}
      <div className="relative z-10 mx-auto flex max-w-content-max flex-col gap-10">
        <div className="flex flex-col gap-6">
          <h1 className="text-display-phone [overflow-wrap:anywhere] desktop:text-display-setup">
            {setupCopy.headline}
          </h1>
          <p className="text-lede text-cream-dim">{setupCopy.explanation}</p>
          {/* Reserves the dial row's real height so hydration doesn't shift the page. */}
          <div className="min-h-52 desktop:min-h-56" aria-busy={state.status === "loading"}>
            <SetupControls state={state} />
          </div>
        </div>
      </div>
    </section>
  );
}

function SetupControls({ state }: { state: StoreState }) {
  // AD-10: no branching on stored values, just a neutral placeholder.
  if (state.status === "loading") {
    return null;
  }
  const loadError = <p className="text-body text-cream-dim">{setupCopy.loadError}</p>;
  if (state.status === "error" || state.setup === null) {
    return loadError;
  }

  const { setup, library } = state;
  const store = getAppStore();

  return (
    <div className="flex flex-col gap-6">
      <DifficultyDial
        level={setup.level}
        onChange={(level) => store.dispatchSetup({ type: "set_level", level })}
      >
        {setup.level === "perform" && (
          <PerformTimingControl
            value={setup.performTiming}
            onChange={(performTiming) => store.dispatchSetup({ type: "set_perform_timing", performTiming })}
          />
        )}
      </DifficultyDial>
      {/* Reserves the Mediums/selects/switch/button block's real height so library hydration doesn't shift the page.
          AD-10: `libraryStatus` can still be 'loading' on a returning visit (setup resolves from storage
          synchronously; the library loads async), so this block waits on `state.library` separately. */}
      <div className="min-h-64 desktop:min-h-48" aria-busy={library === null && state.libraryStatus !== "error"}>
        {library !== null ? (
          <MediumsAndChallenge library={library} setup={setup} />
        ) : state.libraryStatus === "error" ? (
          loadError
        ) : null}
      </div>
    </div>
  );
}

function MediumsAndChallenge({ library, setup }: { library: ComposeLibrary; setup: Setup }) {
  const store = getAppStore();
  const { getAChallenge, failed } = useGetAChallenge();
  const challengeErrorId = useId();

  const mediumOptions = mediumSelectOptions(library.mediums, setup.enabledMediums, setupCopy.randomOption);
  const skillOptions = skillSelectOptions(library.skills, setupCopy.randomOption);
  // A stored id the options no longer offer (e.g. dropped from the library) shows as Random, and is
  // written back as Random so compose never uses the hidden stale id.
  const medium = optionOrRandom(mediumOptions, setup.medium);
  const skillFocus = optionOrRandom(skillOptions, setup.skillFocus);
  useEffect(() => {
    if (medium !== setup.medium) store.dispatchSetup({ type: "choose_medium", medium });
    if (skillFocus !== setup.skillFocus) store.dispatchSetup({ type: "set_skill_focus", skillFocus });
  }, [store, medium, skillFocus, setup.medium, setup.skillFocus]);

  return (
    <div className="flex flex-col gap-6">
      <MediumsRow
        mediums={library.mediums}
        enabledMediums={setup.enabledMediums}
        onToggle={(mediumId) => store.dispatchSetup({ type: "toggle_medium", mediumId })}
      />
      <div className="flex flex-col gap-4 desktop:flex-row desktop:items-end">
        <SetupSelect
          label={setupCopy.thisTimeLabel}
          value={medium}
          options={mediumOptions}
          onChange={(value) => store.dispatchSetup({ type: "choose_medium", medium: value })}
        />
        <div className="flex items-end gap-2">
          {/* flex-1 puts the info button at the row's end on phones, so its right-aligned popover stays on screen. */}
          <div className="min-w-0 flex-1">
            <SetupSelect
              label={setupCopy.skillLabel}
              value={skillFocus}
              options={skillOptions}
              onChange={(value) => store.dispatchSetup({ type: "set_skill_focus", skillFocus: value })}
            />
          </div>
          <SkillInfo skills={library.skills} />
        </div>
      </div>
      <div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <QuickRevealSwitch
            checked={setup.quickReveal}
            onChange={(quickReveal) => store.dispatchSetup({ type: "set_quick_reveal", quickReveal })}
          />
          <SunButton onClick={getAChallenge} aria-describedby={failed ? challengeErrorId : undefined}>
            {copy.button.getAChallenge}
          </SunButton>
        </div>
        <InlineStatus id={challengeErrorId} message={failed ? copy.stage.composeError : null} />
      </div>
    </div>
  );
}
