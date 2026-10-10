"use client";

import { useEffect, useRef, type MouseEvent } from "react";
import { copy } from "@/components/copy";
import { Dialog } from "@/components/Dialog";
import { InkButton } from "@/components/InkButton";
import { LineButton } from "@/components/LineButton";
import { getAppStore, useAppStore } from "@/store";

/**
 * Story 6.5 (FR-28): the Practice History "Clear all data" opener, next to
 * Export. Opens a modal Dialog ("Clear everything in this browser?") with
 * initial focus on "Keep my data"; confirming dispatches `clear_all_data`
 * (AD-7/AD-9 -- empties setup/session/history and wipes every `impromptu:*`
 * key) and hands `onCleared` the message to announce ("All data cleared." or,
 * if the wipe failed, "Couldn't clear this browser's data."), since this
 * component unmounts along with the rest of the with-Reps branch once the
 * Practice page switches to its Empty state. The opener stays disabled while
 * the library loads: a clear then would flash the loading placeholder.
 */
export function ClearAllData({ onCleared }: { onCleared: (message: string) => void }) {
  const { libraryStatus } = useAppStore();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const keepRef = useRef<HTMLButtonElement>(null);
  // Captured on open (the click's own currentTarget): Dialog's onClose returns
  // focus here on Esc and Keep my data, since not every engine restores it to
  // the opener on its own. Confirm nulls it -- focus goes to the caller's status line.
  const openerRef = useRef<HTMLButtonElement | null>(null);

  // If this branch unmounts with the dialog open (another tab cleared), close
  // it explicitly rather than letting the modal vanish without a close.
  useEffect(() => {
    const dialog = dialogRef.current;
    return () => {
      if (dialog?.open) dialog.close();
    };
  }, []);

  const open = (event: MouseEvent<HTMLButtonElement>) => {
    openerRef.current = event.currentTarget;
    dialogRef.current?.showModal();
    keepRef.current?.focus();
  };
  const close = () => dialogRef.current?.close();
  const confirm = () => {
    const store = getAppStore();
    store.dispatch({ type: "clear_all_data" });
    const message = store.getState().saveFailed ? copy.state.clearFailed : copy.state.allDataCleared;
    openerRef.current = null;
    close();
    onCleared(message);
  };
  const restoreFocus = () => openerRef.current?.focus();

  return (
    <>
      <LineButton ground="paper" disabled={libraryStatus === "loading"} onClick={open}>
        {copy.button.clearAllData}
      </LineButton>
      <Dialog ref={dialogRef} title={copy.practice.clearAllTitle} onClose={restoreFocus}>
        <p className="mt-4 text-body">{copy.practice.clearAllBody}</p>
        <div className="mt-8 flex flex-wrap justify-end gap-3">
          <LineButton ref={keepRef} ground="paper" onClick={close}>
            {copy.button.keepMyData}
          </LineButton>
          <InkButton ground="paper" onClick={confirm}>
            {copy.button.clearEverything}
          </InkButton>
        </div>
      </Dialog>
    </>
  );
}
