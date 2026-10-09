import { groundTextClassName, type Ground } from "@/components/ground";

export interface SectionHeaderProps {
  /** Which ground this section sits on, for text color. */
  ground: Ground;
  /** Left meta line, e.g. "02 — IMPROMPTU". */
  eyebrow: string;
  /** The big lowercase headline fragment, ending in a full stop. */
  title: string;
  /** Three-line meta stack, right-aligned. */
  meta: readonly string[];
}

// Setup journey: every numbered section opens with this eyebrow + hairline
// ornament + meta stack row, then its big lowercase headline.
export function SectionHeader({ ground, eyebrow, title, meta }: SectionHeaderProps) {
  return (
    <header className={`flex flex-col gap-6 ${groundTextClassName(ground)}`}>
      <div className="flex flex-wrap items-center gap-4">
        <p className="shrink-0 text-meta uppercase">{eyebrow}</p>
        <Ornament />
        <ul className="flex shrink-0 flex-col items-end gap-0.5 text-right text-meta uppercase">
          {meta.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>
      <h2 className="text-display-phone [overflow-wrap:anywhere] desktop:text-display-setup">{title}</h2>
    </header>
  );
}

// Decorative hairline rule with two diamonds and a centre circle. CSS
// shapes, so only the rules stretch and the diamonds/circle keep their size.
function Ornament() {
  return (
    <div aria-hidden="true" className="flex min-w-10 flex-1 items-center">
      <span className="h-px flex-1 bg-current" />
      <span className="size-2 rotate-45 bg-current" />
      <span className="h-px flex-1 bg-current" />
      <span className="size-3 rounded-full bg-current" />
      <span className="h-px flex-1 bg-current" />
      <span className="size-2 rotate-45 bg-current" />
      <span className="h-px flex-1 bg-current" />
    </div>
  );
}
