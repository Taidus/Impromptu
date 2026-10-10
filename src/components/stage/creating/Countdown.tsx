// Story 5.2/5.3: the Perform countdown. Prop-driven only -- no store, no
// Clock -- the caller (the Stage, wired in a later phase) derives
// `remainingSec`/`timeUp` from `@/domain/timer/timer` each tick and passes
// them down. DESIGN.md -> Challenge Stage: a stage-meta caption above the
// digits ("TIME LIMIT n MIN" from the fixed limit, or "PAUSED"), digits in
// the countdown role, and at zero the digits give way to a no-penalty
// "time's up." message -- no overtime count, no red/flash.
import { copy } from "@/components/copy";
import { formatCountdown } from "@/domain/timer/timer";

export interface CountdownProps {
  /** Seconds left, from `@/domain/timer/timer`'s `remainingSec` (the caller only renders this for a timed Attempt). */
  remainingSec: number;
  /** The Attempt's fixed limit (`attempt.timeLimitSec`) -- the caption never counts down. */
  timeLimitSec: number;
  paused: boolean;
  timeUp: boolean;
}

export function Countdown({ remainingSec, timeLimitSec, paused, timeUp }: CountdownProps) {
  return (
    <div role="timer" aria-live="off">
      <p className="mb-1 text-stage-meta-phone uppercase text-plum-muted desktop:text-stage-meta">
        {paused ? copy.stage.countdown.pausedCaption : copy.stage.countdown.caption(Math.round(timeLimitSec / 60))}
      </p>
      {timeUp ? (
        <>
          <p className="text-card-title text-plum">{copy.stage.countdown.timesUpTitle}</p>
          <p className="mt-1 text-body text-plum-muted">{copy.stage.countdown.timesUpBody}</p>
        </>
      ) : (
        <p className="text-countdown-phone tabular-nums text-plum desktop:text-countdown">{formatCountdown(remainingSec)}</p>
      )}
    </div>
  );
}
