"use client";

import { GetAChallengeButton } from "@/components/GetAChallengeButton";
import { SiteFooter } from "@/components/journey/SiteFooter";
import { useAppStore } from "@/store";
import { PracticeHeader } from "./PracticeHeader";
import { PracticeView } from "./PracticeView";

// Story 6.1: the Practice page body, driven by the store (AD-10: the server
// snapshot and first client render are the neutral loading state).
export function PracticeClient() {
  const { status, storageAvailable, history } = useAppStore();

  return (
    <>
      <PracticeHeader />
      <main className="flex-1 bg-paper px-gutter-phone py-12 text-ink desktop:px-14 desktop:py-20">
        <div className="mx-auto w-full max-w-reading-max">
          <PracticeView
            status={status}
            storageAvailable={storageAvailable}
            reps={history}
            action={<GetAChallengeButton ground="paper" />}
          />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
