import type { ReactNode } from "react";
import { copy } from "@/components/copy";
import type { practiceMap } from "@/domain/practice/practice-map";
import type { Rep } from "@/domain/session/schema";
import type { Status } from "@/store";
import { PracticeHistory } from "./PracticeHistory";
import { PracticeMap } from "./PracticeMap";

export interface PracticeViewProps {
  status: Status;
  storageAvailable: boolean;
  /** Rendered newest first below the storage note once Reps exist (Story 6.2, FR-25). */
  reps: Rep[];
  /** The Story 6.3 Practice Map; `null` while the library hasn't loaded yet (hidden, not a placeholder). */
  map: ReturnType<typeof practiceMap> | null;
  /** The Get a challenge / Resume control (a client `GetAChallengeButton`); rendered in the empty and unavailable states. */
  action: ReactNode;
}

/**
 * Pure presentational: no store, no hooks -- unit-testable with
 * `renderToStaticMarkup`. Four states (AD-10, FR-27, FR-29): loading (neutral
 * placeholder, pre-hydration), storage unavailable, empty (no Reps), and with
 * Reps (storage note, the Practice Map (Story 6.3), then the Rep history
 * (Story 6.2)).
 * `status === "error"` renders like `ready`: history is already loaded by then,
 * and compose failures are the Stage's to handle.
 */
export function PracticeView({ status, storageAvailable, reps, map, action }: PracticeViewProps) {
  const repCount = reps.length;
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
      {storageAvailable && repCount > 0 && (
        <>
          {map && <PracticeMap map={map} />}
          <PracticeHistory reps={reps} />
        </>
      )}
    </div>
  );
}
