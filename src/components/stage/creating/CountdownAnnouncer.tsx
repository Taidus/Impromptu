// Story 5.2/5.3: the Countdown's accessible companion -- a separate,
// visually hidden `aria-live="polite"` region (EXPERIENCE.md -> Accessibility
// Floor), since the countdown itself is `aria-live="off"` and would never be
// announced. Pure and stateless: it renders the current instant's phrase (a
// minute mark, 1:00, zero, or paused), or "" otherwise, so an assistive-tech
// user isn't read the countdown every second.
//
// ponytail: detecting "just resumed" needs the previous render's `paused`
// value, and this repo's React Compiler lint rules forbid both tracking it
// in a ref read during render and setting state from an effect -- the
// supported fix is to derive it where the transition is already known, not
// reconstruct it here. Add it once the Stage (which already owns the tick
// loop) passes resume through explicitly, e.g. by remounting this with a
// `key` at the moment it dispatches `resume`; `copy.stage.countdown.resumedAnnounced`
// is ready for it.
import { copy } from "@/components/copy";

export interface CountdownAnnouncerProps {
  remainingSec: number;
  paused: boolean;
  timeUp: boolean;
}

/**
 * The phrase for this exact instant, or `null` when nothing should be
 * announced right now. Exported standalone so the minute-mark/1:00/zero
 * logic is unit-testable without mounting the component.
 */
export function announceFor({ remainingSec, paused, timeUp }: CountdownAnnouncerProps): string | null {
  if (timeUp) return copy.stage.countdown.timeUpAnnounced;
  if (paused) return copy.stage.countdown.pausedAnnounced;
  if (remainingSec === 60) return copy.stage.countdown.oneMinuteLeftAnnounced;
  if (remainingSec > 0 && remainingSec % 60 === 0) return copy.stage.countdown.minutesLeftAnnounced(remainingSec / 60);
  return null;
}

export function CountdownAnnouncer(props: CountdownAnnouncerProps) {
  return (
    <p aria-live="polite" className="sr-only">
      {announceFor(props) ?? ""}
    </p>
  );
}
