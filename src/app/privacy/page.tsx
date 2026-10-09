import type { Metadata } from "next";
import Link from "next/link";
import { copy } from "@/components/copy";
import { FOCUS_RING_BASE, focusRingClassName } from "@/components/ground";

export const metadata: Metadata = { title: "Privacy" };

const { privacy } = copy;
const link = `underline underline-offset-4 ${FOCUS_RING_BASE} ${focusRingClassName("paper")}`;

// UX-DR30: the Privacy note sits on paper. One reading column (the same
// width DESIGN.md gives the Practice body), with the back-to-setup link in
// the header as EXPERIENCE.md's IA describes. Story 8.1 adds the night band.
export default function PrivacyPage() {
  return (
    <main className="flex-1 bg-paper text-ink px-gutter-phone py-12 desktop:px-14 desktop:py-20">
      <article className="mx-auto flex w-full max-w-reading-max flex-col gap-10">
        <header className="flex flex-col gap-6">
          <Link href="/" className={`self-start text-button uppercase ${link}`}>
            {copy.stage.back}
          </Link>
          <h1 className="text-display-phone desktop:text-display-setup">{privacy.title}</h1>
          <p className="text-lede text-ink-soft">{privacy.lede}</p>
        </header>

        {privacy.sections.map((section) => (
          <section key={section.heading} className="flex flex-col gap-2">
            <h2 className="text-meta uppercase text-ink-soft">{section.heading}</h2>
            <p className="text-body">{section.body}</p>
          </section>
        ))}

        <p className="text-body">
          {privacy.contactLead}{" "}
          <a href={`mailto:${privacy.contactEmail}`} className={link}>
            {privacy.contactEmail}
          </a>
        </p>
      </article>
    </main>
  );
}
