"use client";

import { useMemo } from "react";
import { GetAChallengeButton } from "@/components/GetAChallengeButton";
import { SiteFooter } from "@/components/journey/SiteFooter";
import { practiceMap } from "@/domain/practice/practice-map";
import { useAppStore } from "@/store";
import { ExportButton } from "./ExportButton";
import { PracticeHeader } from "./PracticeHeader";
import { PracticeView } from "./PracticeView";

// Story 6.1: the Practice page body, driven by the store (AD-10: the server
// snapshot and first client render are the neutral loading state).
export function PracticeClient() {
  const { status, storageAvailable, history, library, libraryStatus } = useAppStore();
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
          <PracticeView
            status={status}
            storageAvailable={storageAvailable}
            reps={history}
            map={map}
            action={<GetAChallengeButton ground="paper" />}
            exportControl={<ExportButton reps={history} />}
          />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
