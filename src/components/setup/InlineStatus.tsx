/**
 * DESIGN.md -> Inline message (EXPERIENCE.md -> Component Patterns): a
 * leading vermilion dot and ground-colored text, announced politely. Always
 * mounted with only its text changing -- a `role="status"` region inserted
 * already holding its text is often not announced. Link it from the control
 * it concerns with `aria-describedby` only while `message` is set.
 */
export function InlineStatus({
  id,
  message,
  className = "text-cream-dim",
}: {
  id: string;
  message: string | null;
  /** Text color for the ground the message sits on (default: night). */
  className?: string;
}) {
  return (
    <p id={id} role="status" className={`flex items-start gap-2 text-body ${className} ${message === null ? "" : "mt-2"}`}>
      {message !== null && (
        <>
          <span aria-hidden="true" className="mt-2 size-2.5 shrink-0 rounded-disc bg-vermilion" />
          {message}
        </>
      )}
    </p>
  );
}
