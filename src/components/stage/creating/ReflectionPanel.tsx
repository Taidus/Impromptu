// Story 5.6: the optional Reflection, shown once a Rep is Finished.
// DESIGN.md -> Challenge Stage: a cream, ink-bordered panel replacing the
// action row; two stacked optional fields, each capped at
// `config.reflection.maxChars` with a live counter appearing only once the
// cap is close, and a sun "Save rep". Controlled: no internal state, no
// store -- the caller (the Stage) owns the draft.
import { config } from "@/config/app";
import { copy } from "@/components/copy";
import { SunButton } from "@/components/SunButton";
import type { Reflection } from "@/domain/session/schema";

export interface ReflectionPanelProps {
  draft: Reflection;
  onChange: (next: Reflection) => void;
  onSave: () => void;
  saving?: boolean;
}

/** The counter only appears in the last stretch -- "24 left" once within this many characters of the cap. */
const COUNTER_WINDOW_CHARS = 40;

function Field({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const left = Math.max(0, config.reflection.maxChars - value.length);
  const counterId = `${id}-counter`;
  return (
    <div>
      <label htmlFor={id} className="text-label text-ink">
        {label}
      </label>
      <textarea
        id={id}
        value={value}
        maxLength={config.reflection.maxChars}
        aria-describedby={counterId}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 min-h-24 w-full rounded-scrap border border-ink-soft bg-cream p-3 text-body text-ink"
      />
      {/* Always mounted so the polite live region exists before its text first appears. */}
      <p id={counterId} aria-live="polite" className="mt-1 text-meta text-ink-soft">
        {left <= COUNTER_WINDOW_CHARS ? copy.reflection.charsLeft(left) : ""}
      </p>
    </div>
  );
}

export function ReflectionPanel({ draft, onChange, onSave, saving }: ReflectionPanelProps) {
  return (
    <div className="rounded-scrap border border-ink bg-cream p-6">
      <div className="flex flex-col gap-4">
        <Field id="reflection-worked" label={copy.reflection.workedLabel} value={draft.worked} onChange={(worked) => onChange({ ...draft, worked })} />
        <Field id="reflection-change" label={copy.reflection.changeLabel} value={draft.change} onChange={(change) => onChange({ ...draft, change })} />
      </div>
      <SunButton ground="paper" className="mt-6" onClick={onSave} disabled={saving}>
        {copy.button.saveRep}
      </SunButton>
    </div>
  );
}
