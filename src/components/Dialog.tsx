"use client";

import { forwardRef, useId, type ReactNode } from "react";

export interface DialogProps {
  /** The dialog's accessible name (DESIGN.md -> dialog: an ink title in `text-card-title`). */
  title: ReactNode;
  children?: ReactNode;
  /**
   * The native `close` event -- fires for every way the dialog closes (Esc's
   * default action, or the caller's own `close()`). Not every engine
   * reliably restores focus to the opener on its own, so this is the one
   * hook a caller needs to do it itself (see `ClearAllData`).
   */
  onClose?: () => void;
}

/**
 * DESIGN.md -> Components -> Dialog (Story 6.5, FR-28): a paper panel over
 * a night scrim (`tokens.css`'s `--color-scrim` + `dialog::backdrop`), built
 * on the native `<dialog>` element -- `showModal()` gives the focus trap and
 * Esc-to-cancel for free. Callers hold the ref and call
 * `showModal()`/`close()` from their own event handlers -- never from an
 * effect (react-hooks/refs, react-hooks/set-state-in-effect). `m-auto` restores
 * the UA's centring that Tailwind's preflight zeroes; the width keeps a phone
 * gutter each side and stops at the reading width on desktop.
 */
export const Dialog = forwardRef<HTMLDialogElement, DialogProps>(function Dialog({ title, children, onClose }, ref) {
  const titleId = useId();
  return (
    <dialog ref={ref} aria-labelledby={titleId} onClose={onClose} className="m-auto w-[calc(100%-2*var(--spacing-gutter-phone))] max-w-reading-max rounded-scrap bg-paper p-8 text-ink shadow-lift">
      <h2 id={titleId} className="text-card-title">
        {title}
      </h2>
      {children}
    </dialog>
  );
});
