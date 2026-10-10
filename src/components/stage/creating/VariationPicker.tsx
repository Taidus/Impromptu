// Story 5.8 (phase 1, pure UI only -- `vary` itself is phase 2): the
// Variation picker. DESIGN.md -> Challenge Stage: a prompt, one dashed-
// outline radio option per changeable piece ("Change Topic" etc. -- never
// Skill), a sun "Change it", and -- in its own alert under the prompt -- the
// "nothing chosen" or "no alternative" message (the picker stays open; the
// caller keeps `value` as-is). With no options at all, the no-alternative
// message shows on its own.
import { copy } from "@/components/copy";
import { SunButton } from "@/components/SunButton";
import type { InputKind } from "@/domain/session/schema";

export type VariationKind = Exclude<InputKind, "skill">;

export interface VariationOption {
  kind: VariationKind;
  label: string;
}

export interface VariationPickerProps {
  options: VariationOption[];
  value: VariationKind | null;
  onChange: (kind: VariationKind) => void;
  onConfirm: () => void;
  /** `nothing_chosen`: Change it was pressed with no pick; `no_alternative`: the picked kind has nothing else that fits. */
  error?: "nothing_chosen" | "no_alternative";
}

const PROMPT_ID = "variation-prompt";

export function VariationPicker({ options, value, onChange, onConfirm, error }: VariationPickerProps) {
  const message =
    options.length === 0 || error === "no_alternative"
      ? copy.stage.variation.noAlternative
      : error === "nothing_chosen"
        ? copy.stage.variation.nothingChosen
        : null;
  // Pressing with nothing chosen is allowed (it shows the nothing-chosen message); a value the picker doesn't offer is not.
  const disabled = options.length === 0 || (value !== null && !options.some((option) => option.kind === value));
  return (
    <div className="flex flex-col gap-4">
      <p id={PROMPT_ID} className="text-lede text-plum">
        {copy.stage.variation.prompt}
      </p>
      {message !== null && (
        <p role="alert" className="text-body text-plum">
          {message}
        </p>
      )}
      <div role="radiogroup" aria-labelledby={PROMPT_ID} className="flex flex-col gap-2">
        {options.map((option) => (
          <label
            key={option.kind}
            className={`rounded-scrap border border-dashed px-4 py-2 text-body text-plum ${
              value === option.kind ? "border-grape" : "border-plum-muted"
            }`}
          >
            <input
              type="radio"
              name="variation-kind"
              value={option.kind}
              checked={value === option.kind}
              onChange={() => onChange(option.kind)}
              className="sr-only"
            />
            {copy.stage.variation.changeLabel(option.label)}
          </label>
        ))}
      </div>
      <SunButton ground="lilac" onClick={onConfirm} disabled={disabled}>
        {copy.button.changeIt}
      </SunButton>
    </div>
  );
}
