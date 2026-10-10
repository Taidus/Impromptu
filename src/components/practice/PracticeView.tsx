import Link from "next/link";
import { copy } from "@/components/copy";
import { inkButtonClassName } from "@/components/InkButton";
import type { Status } from "@/store";

export interface PracticeViewProps {
  status: Status;
  storageAvailable: boolean;
  repCount: number;
  /** True when `session.state === "attempt"` -- the action reads Resume instead of Get a challenge. */
  attemptActive: boolean;
}

/**
 * Pure presentational: no store, no hooks -- unit-testable with
 * `renderToStaticMarkup`. Four states (AD-10, FR-27, FR-29): loading (neutral
 * placeholder, pre-hydration), storage unavailable, empty (no Reps), and with
 * Reps (storage note only this story; the Rep list itself is Story 6.2).
 * `status === "error"` renders like `ready`: history is already loaded by then,
 * and compose failures are the Stage's to handle.
 */
export function PracticeView({ status, storageAvailable, repCount, attemptActive }: PracticeViewProps) {
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
      {(!storageAvailable || repCount === 0) && (
        // Always to /stage (Story 6.1 boundary).
        <Link href="/stage" className={`${inkButtonClassName("paper")} self-start`}>
          {attemptActive ? copy.button.resume : copy.button.getAChallenge}
        </Link>
      )}
    </div>
  );
}
