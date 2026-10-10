"use client";

import { copy } from "@/components/copy";
import { getAppStore, useAppStore, type StoreState } from "@/store";
import { DifficultyDial } from "./DifficultyDial";
import { PerformTimingControl } from "./PerformTiming";

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
      <div className="mx-auto flex max-w-content-max flex-col gap-10">
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
      {/* Story 3.8 adds here: Mediums row, "This time"/Skill selects, Quick reveal, Get a challenge. */}
    </div>
  );
}
