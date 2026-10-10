import type { ReactNode } from "react";
import { copy } from "@/components/copy";
import type { Status } from "@/store";

export interface PracticeViewProps {
  status: Status;
  storageAvailable: boolean;
  repCount: number;
  /** The Get a challenge / Resume control (a client `GetAChallengeButton`); rendered in the empty and unavailable states. */
  action: ReactNode;
}

/**
 * Pure presentational: no store, no hooks -- unit-testable with
 * `renderToStaticMarkup`. Four states (AD-10, FR-27, FR-29): loading (neutral
 * placeholder, pre-hydration), storage unavailable, empty (no Reps), and with
 * Reps (storage note only this story; the Rep list itself is Story 6.2).
 * `status === "error"` renders like `ready`: history is already loaded by then,
 * and compose failures are the Stage's to handle.
 */
export function PracticeView({ status, storageAvailable, repCount, action }: PracticeViewProps) {
  if (status === "loading") {
    return (
      <p aria-busy="true" className="text-body text-ink-soft">
        {copy.practice.loading}
      </p>
    );
  }

  const message = !storageAvailable
    ? copy.practice.storageUnavailable
    : repCount === 0
      ? copy.state.nothingHereYet
      : copy.state.progressSavedInBrowserOnly;

  return (
    <div className="flex flex-col gap-6">
      <p className="text-body">{message}</p>
      {(!storageAvailable || repCount === 0) && action}
    </div>
  );
}
