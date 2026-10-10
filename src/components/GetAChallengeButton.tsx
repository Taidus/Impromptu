"use client";

import { useRouter } from "next/navigation";
import { useId } from "react";
import { copy } from "@/components/copy";
import { inkButtonClassName } from "@/components/InkButton";
import type { Ground } from "@/components/ground";
import { InlineStatus } from "@/components/setup/InlineStatus";
import { useGetAChallenge } from "@/components/setup/useGetAChallenge";
import { useAppStore } from "@/store";

export interface GetAChallengeButtonViewProps {
  ground: Ground;
  label: string;
  failed: boolean;
  disabled?: boolean;
  errorId: string;
  onClick: () => void;
  className?: string;
}

// Pure, props-driven (unit-testable without the store or the router): an ink
// pill plus the always-mounted inline status it describes when compose fails.
export function GetAChallengeButtonView({
  ground,
  label,
  failed,
  disabled = false,
  errorId,
  onClick,
  className = "",
}: GetAChallengeButtonViewProps) {
  return (
    <div className={`flex flex-col ${className}`}>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-describedby={failed ? errorId : undefined}
        className={`${inkButtonClassName(ground, disabled)} self-start`}
      >
        {label}
      </button>
      <InlineStatus
        id={errorId}
        message={failed ? copy.stage.composeError : null}
        className={ground === "night" ? "text-cream-dim" : "text-ink-soft"}
      />
    </div>
  );
}

/**
 * Every "Get a challenge" entry point outside the setup hero (UX-DR26): the
 * closing call on Setup and the Practice page's empty states. Composes a fresh
 * Challenge through `useGetAChallenge` and opens /stage only once one is held;
 * during an Attempt it reads Resume and just opens the Stage (nothing to
 * compose). Disabled until the store and the library are ready (AD-10).
 */
export function GetAChallengeButton({ ground, className }: { ground: Ground; className?: string }) {
  const { status, libraryStatus, session } = useAppStore();
  const router = useRouter();
  const { getAChallenge, failed } = useGetAChallenge();
  const errorId = useId();
  const resume = session.state === "attempt";
  const ready = status === "ready" && libraryStatus === "ready";

  return (
    <GetAChallengeButtonView
      ground={ground}
      label={resume ? copy.button.resume : copy.button.getAChallenge}
      failed={failed}
      disabled={!ready}
      errorId={errorId}
      onClick={resume ? () => router.push("/stage") : getAChallenge}
      className={className}
    />
  );
}
