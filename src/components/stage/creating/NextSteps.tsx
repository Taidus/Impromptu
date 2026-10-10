// Story 5.7: the three honest next moves after Saved. DESIGN.md -> Challenge
// Stage: full-width sun "Try another version", "Retry" and "Get a
// challenge" as line buttons side by side below it, then -- the first saved
// Rep ever only -- the FR-27/FR-29 storage note (browser-only, or its
// storage-unavailable variant) with a link to Practice.
import Link from "next/link";
import { copy } from "@/components/copy";
import { LineButton } from "@/components/LineButton";
import { SunButton } from "@/components/SunButton";

export interface NextStepsProps {
  onVariation: () => void;
  onRetry: () => void;
  onNew: () => void;
  /** True only for the very first Rep this browser has ever saved (FR-27). */
  firstSave: boolean;
  storageAvailable: boolean;
}

export function NextSteps({ onVariation, onRetry, onNew, firstSave, storageAvailable }: NextStepsProps) {
  return (
    <div className="flex flex-col gap-4">
      <SunButton ground="paper" className="w-full" onClick={onVariation}>
        {copy.button.tryAnotherVersion}
      </SunButton>
      <div className="flex gap-4">
        <LineButton ground="paper" className="flex-1" onClick={onRetry}>
          {copy.button.retry}
        </LineButton>
        <LineButton ground="paper" className="flex-1" onClick={onNew}>
          {copy.button.getAChallenge}
        </LineButton>
      </div>
      {firstSave &&
        (storageAvailable ? (
          <p className="text-body text-ink-soft">
            {copy.state.progressSavedInBrowserOnly}{" "}
            <Link href="/practice" className="underline">
              {copy.journey.footer.practice}
            </Link>
          </p>
        ) : (
          <p className="text-body text-ink-soft">{copy.state.repNotKept}</p>
        ))}
    </div>
  );
}
