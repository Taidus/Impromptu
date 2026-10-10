"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { copy } from "@/components/copy";
import { FOCUS_RING_BASE, focusRingClassName } from "@/components/ground";
import { SunButton } from "@/components/SunButton";
import type { MediumId, SkillId } from "@/domain/library/schema";
import type { Setup } from "@/domain/session/schema";
import { getAppStore, useAppStore, type StoreState } from "@/store";
import { DifficultyDial } from "./DifficultyDial";
import { MediumsRow } from "./MediumsRow";
import { mediumSelectOptions, skillSelectOptions } from "./options";
import { PerformTimingControl } from "./PerformTiming";
import { QuickRevealSwitch } from "./QuickRevealSwitch";
import { SetupSelect } from "./SetupSelect";
import { SkillInfo } from "./SkillInfo";

const { setup: setupCopy, journey } = copy;
const linkClass = `${FOCUS_RING_BASE} ${focusRingClassName("night")} rounded-sm`;

/**
 * Setup page section 01 (night): header, headline, explanation, the
 * Difficulty Dial, and (at Perform) the Perform-timing control (Story 3.7).
 * EXPERIENCE.md -> Setup page sections.
 */
export function SetupHero() {
  const state = useAppStore();

  return (
    <section id="setup" className="bg-night px-gutter-phone pt-16 pb-28 text-cream desktop:px-14 desktop:pt-20">
      {/* Story 8.2 (main) wraps the page in decorative layers (Ticker, ChromePiece,
          OrbitThread, Grain) behind a `relative` ancestor; this column must stay on top. */}
      <div className="relative z-10 mx-auto flex max-w-content-max flex-col gap-10">
        <Header />
        <div className="flex flex-col gap-6">
          <h1 className="text-display-phone [overflow-wrap:anywhere] desktop:text-display-setup">
            {setupCopy.headline}
          </h1>
          <p className="text-lede text-cream-dim">{setupCopy.explanation}</p>
          {/* Reserves the dial row's real height so hydration doesn't shift the page. */}
          <div className="min-h-52 desktop:min-h-56">
            <SetupControls state={state} />
          </div>
        </div>
      </div>
    </section>
  );
}

function Header() {
  return (
    <header className="flex items-center justify-between gap-4">
      <Link href="/" className={`inline-flex items-center gap-2 text-stage-mark ${linkClass}`}>
        {journey.footer.wordmark}
        <span aria-hidden="true" className="text-sm text-grape">
          ✦
        </span>
      </Link>
      <Link href="/practice" className={`text-meta uppercase ${linkClass}`}>
        {journey.footer.practice}
      </Link>
    </header>
  );
}

function SetupControls({ state }: { state: StoreState }) {
  // AD-10: no branching on stored values, just a neutral placeholder.
  if (state.status === "loading") {
    return null;
  }
  if (state.status === "error" || state.setup === null) {
    return <p className="text-body text-cream-dim">{setupCopy.loadError}</p>;
  }

  const { setup } = state;
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
      {/* Reserves the Mediums/selects/switch/button block's real height so library hydration doesn't shift the page. */}
      <div className="min-h-64 desktop:min-h-48">
        <MediumsAndChallenge state={state} setup={setup} />
      </div>
    </div>
  );
}

function MediumsAndChallenge({ state, setup }: { state: StoreState; setup: Setup }) {
  const store = getAppStore();
  const router = useRouter();

  // AD-10: `libraryStatus` can still be 'loading' on a returning visit (setup
  // resolves from storage synchronously; the library loads async), so this
  // block waits on `state.library` separately from the Dial above it.
  if (state.library === null) {
    if (state.libraryStatus === "error") {
      return <p className="text-body text-cream-dim">{setupCopy.loadError}</p>;
    }
    return null;
  }

  const { library } = state;

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
          value={setup.medium}
          options={mediumSelectOptions(library.mediums, setup.enabledMediums, setupCopy.randomOption)}
          onChange={(value) => store.dispatchSetup({ type: "choose_medium", medium: value as MediumId | "random" })}
        />
        <div className="flex items-end gap-2">
          <SetupSelect
            label={setupCopy.skillLabel}
            value={setup.skillFocus}
            options={skillSelectOptions(library.skills, setupCopy.randomOption)}
            onChange={(value) => store.dispatchSetup({ type: "set_skill_focus", skillFocus: value as SkillId | "random" })}
          />
          <SkillInfo skills={library.skills} />
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <QuickRevealSwitch
          checked={setup.quickReveal}
          onChange={(quickReveal) => store.dispatchSetup({ type: "set_quick_reveal", quickReveal })}
        />
        <SunButton
          onClick={() => {
            // Compose now so the Challenge is already held when `/stage` opens;
            // Story 3.9's own "compose if nothing held" check then skips, so this
            // never composes twice.
            store.dispatch({ type: "new_challenge" });
            router.push("/stage");
          }}
        >
          {copy.button.getAChallenge}
        </SunButton>
      </div>
    </div>
  );
}
