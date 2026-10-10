"use client";

import { useId, useState } from "react";
import { flushSync } from "react-dom";
import { copy } from "@/components/copy";
import { InkButton } from "@/components/InkButton";
import { buildExport, exportFilename } from "@/domain/practice/export";
import type { Rep } from "@/domain/session/schema";

export interface ExportButtonViewProps {
  onExport: () => void;
  /** Status text ("Exported." / "Export failed."), or null before the first export. */
  message: string | null;
}

/**
 * Pure markup (unit-testable with `renderToStaticMarkup`): an ink button on
 * paper, right-aligned above an always-mounted `role="status"` line in body
 * type (a success line, not an Inline message -- DESIGN.md reserves the
 * vermilion dot for conflicts and errors).
 */
export function ExportButtonView({ onExport, message }: ExportButtonViewProps) {
  const statusId = useId();
  return (
    <div className="flex flex-col items-end">
      <InkButton ground="paper" onClick={onExport} aria-describedby={message ? statusId : undefined}>
        {copy.button.export}
      </InkButton>
      <p id={statusId} role="status" className="text-body text-ink-soft">
        {message}
      </p>
    </div>
  );
}

/**
 * Story 6.4 (FR-28): downloads the current Reps as
 * `impromptu-practice-YYYY-MM-DD.json` via a Blob object URL on a temporary
 * `<a download>` -- no network request -- then announces "Exported.". The
 * timestamp comes from `new Date()` here, not the domain layer, which may
 * not touch the clock (AD-2).
 */
export function ExportButton({ reps }: { reps: Rep[] }) {
  const [message, setMessage] = useState<string | null>(null);

  const onExport = () => {
    // Clear first so a repeat export mutates the live region and re-announces.
    flushSync(() => setMessage(null));
    let data;
    try {
      data = buildExport(reps, new Date().toISOString());
    } catch (error) {
      setMessage(copy.state.exportFailed);
      throw error;
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = exportFilename(data.exportedAt);
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    // Revoking synchronously can cancel the download in some browsers.
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    setMessage(copy.state.exported);
  };

  return <ExportButtonView onExport={onExport} message={message} />;
}
