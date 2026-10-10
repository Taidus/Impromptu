"use client";

import { useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { GetAChallengeButton } from "@/components/GetAChallengeButton";
import { SiteFooter } from "@/components/journey/SiteFooter";
import { practiceMap } from "@/domain/practice/practice-map";
import { useAppStore } from "@/store";
import { ClearAllData } from "./ClearAllData";
import { ExportButton } from "./ExportButton";
import { PracticeHeader } from "./PracticeHeader";
import { PracticeView } from "./PracticeView";

// Story 6.1: the Practice page body, driven by the store (AD-10: the server
// snapshot and first client render are the neutral loading state).
export function PracticeClient() {
  const { status, storageAvailable, history, library, libraryStatus } = useAppStore();
  // Story 6.5: lifted above PracticeView so "All data cleared." stays
  // visible across the switch from the with-Reps branch to the Empty state
  // that follows a clear (ClearAllData itself unmounts with that branch).
  // The line takes focus after a clear: the opener unmounts with that branch.
  const [clearedMessage, setClearedMessage] = useState<string | null>(null);
  const statusRef = useRef<HTMLParagraphElement>(null);
  const onCleared = (message: string) => {
    // Clear first so a second clear in one page lifetime re-announces (as ExportButton does).
    flushSync(() => setClearedMessage(null));
    setClearedMessage(message);
    statusRef.current?.focus();
  };
  // Story 6.3: `null` until the library loads -- PracticeView hides the Map then.
  // If the library fails, counts still come from the Rep snapshots (all trailing rows).
  const map = useMemo(
    () =>
      library
        ? practiceMap(history, library)
        : libraryStatus === "error"
          ? practiceMap(history, { skills: [], mediums: [] })
          : null,
    [history, library, libraryStatus],
  );

  return (
    <>
      <PracticeHeader />
      <main className="flex-1 bg-paper px-gutter-phone py-12 text-ink desktop:px-14 desktop:py-20">
        <div className="mx-auto w-full max-w-reading-max">
          <p ref={statusRef} tabIndex={-1} role="status" className="text-body text-ink-soft focus:outline-none">
            {clearedMessage}
          </p>
          <PracticeView
            status={status}
            storageAvailable={storageAvailable}
            reps={history}
            map={map}
            action={<GetAChallengeButton ground="paper" />}
            exportControl={<ExportButton reps={history} />}
            clearControl={<ClearAllData onCleared={onCleared} />}
          />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
