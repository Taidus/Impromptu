"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { config } from "@/config/app";
import { copy } from "@/components/copy";
import { InkButton } from "@/components/InkButton";
import { LineButton } from "@/components/LineButton";
import { FOCUS_RING_BASE, focusRingClassName } from "@/components/ground";
import { submitSignup, validateSignup, type SignupError } from "@/components/signup";

export interface EmailSignupProps {
  /** DESIGN → Email signup: night (footer) or the lilac card (Stage, after a saved Rep). */
  variant: "night" | "lilac";
  className?: string;
}

const { signup } = copy;

// Field-level errors sit under the field they concern; the rest under the button.
const FIELD_ERRORS: ReadonlySet<SignupError> = new Set(["invalid_email", "consent_required"]);

export function EmailSignup({ variant, className = "" }: EmailSignupProps) {
  const id = useId();
  const emailRef = useRef<HTMLInputElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const successRef = useRef<HTMLParagraphElement>(null);
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "done">("idle");
  const [error, setError] = useState<SignupError | null>(null);
  // Counts submits so the same error twice still re-focuses.
  const [attempt, setAttempt] = useState(0);

  // The lilac card is cream, so its controls read as "paper" ground; night stays night.
  const ground = variant === "night" ? "night" : "paper";
  const text = variant === "night" ? "text-cream" : "text-ink";
  const card = variant === "lilac" ? "rounded-scrap border border-ink bg-cream p-6" : "";
  const link = `underline underline-offset-4 ${FOCUS_RING_BASE} ${focusRingClassName(ground)}`;
  const emailError = error === "invalid_email";
  const consentError = error === "consent_required";
  const formError = error !== null && !FIELD_ERRORS.has(error);

  // Focus moves after the commit, never before it (EXPERIENCE: focus is never lost).
  useEffect(() => {
    if (status === "done") successRef.current?.focus();
    else if (error === "invalid_email") emailRef.current?.focus();
    else if (error !== null) buttonRef.current?.focus();
  }, [status, error, attempt]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = { email, consent, consentTextVersion: config.signup.consentTextVersion, website };
    setAttempt((n) => n + 1);
    const invalid = validateSignup(values);
    if (invalid) {
      setError(invalid);
      return;
    }
    setError(null);
    setStatus("submitting");
    const result = await submitSignup(fetch, values);
    if (result.ok) {
      setStatus("done");
      return;
    }
    setStatus("idle");
    setError(result.error);
  }

  const Button = variant === "night" ? InkButton : LineButton;

  return (
    <div className={`${text} ${card} ${className}`}>
      {status === "done" ? (
        <p ref={successRef} tabIndex={-1} className="text-body" role="status">
          {signup.success}
        </p>
      ) : (
        <form onSubmit={onSubmit} noValidate className="relative flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor={`${id}-email`} className="text-label">
              {signup.emailLabel}
            </label>
            <input
              ref={emailRef}
              id={`${id}-email`}
              type="email"
              name="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={emailError || undefined}
              aria-describedby={emailError ? `${id}-email-error` : undefined}
              className={`min-h-target-min rounded-scrap border bg-cream px-4 text-body text-ink ${emailError ? "border-vermilion-ink shadow-[inset_0_0_0_1px_var(--color-vermilion-ink)]" : "border-ink-soft"} ${FOCUS_RING_BASE} ${focusRingClassName(ground)}`}
            />
            {emailError && <InlineMessage id={`${id}-email-error`}>{signup.errors.invalid_email}</InlineMessage>}
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-start gap-3">
              <input
                id={`${id}-consent`}
                type="checkbox"
                name="consent"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                aria-invalid={consentError || undefined}
                aria-describedby={consentError ? `${id}-consent-error` : undefined}
                className={`mt-1 checkbox-consent ${FOCUS_RING_BASE} ${focusRingClassName(ground)}`}
              />
              <label htmlFor={`${id}-consent`} className="text-body">
                {signup.consent}
              </label>
            </div>
            {consentError && <InlineMessage id={`${id}-consent-error`}>{signup.errors.consent_required}</InlineMessage>}
            <a href="/privacy" target="_blank" rel="noopener" className={`self-start text-meta uppercase ${link}`}>
              {signup.privacyLink}
              <span className="sr-only"> {signup.opensInNewTab}</span>
            </a>
          </div>

          {/* Honeypot: off-screen, never reachable by keyboard or assistive tech. */}
          <div aria-hidden="true" className="absolute -left-[200vw] top-0 h-px w-px overflow-hidden">
            <label htmlFor={`${id}-website`}>{signup.honeypotLabel}</label>
            <input id={`${id}-website`} type="text" name="website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
          </div>

          <Button
            ref={buttonRef}
            type="submit"
            ground={ground}
            disabled={status === "submitting"}
            aria-describedby={formError ? `${id}-form-error` : undefined}
            className="self-start"
          >
            {status === "submitting" ? signup.submitting : signup.submit}
          </Button>
          {formError && <InlineMessage id={`${id}-form-error`}>{signup.errors[error]}</InlineMessage>}
        </form>
      )}
    </div>
  );
}

// DESIGN → Inline message: ground-colored text with a leading vermilion dot, announced politely.
function InlineMessage({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <p id={id} role="status" className="flex items-start gap-2 text-body">
      <span aria-hidden="true" className="mt-2 size-2.5 shrink-0 rounded-disc bg-vermilion" />
      {children}
    </p>
  );
}
