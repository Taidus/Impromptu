import { copy } from "@/components/copy";
import { SectionHeader } from "./SectionHeader";
import { listSkills, resolveSetupSample } from "./sample";

const { journey } = copy;

// Section 02 (lilac): the static CL-5 anchor-2 sample beside the six Skills.
export function WhatsInAChallenge() {
  const sample = resolveSetupSample();
  const skills = listSkills();

  return (
    <section className="bg-lilac px-gutter-phone py-20 text-plum desktop:px-14 desktop:py-28">
      <div className="relative z-10 mx-auto flex max-w-content-max flex-col gap-12">
        <SectionHeader
          ground="lilac"
          eyebrow={journey.whatsInAChallenge.eyebrow}
          title={journey.whatsInAChallenge.title}
          meta={journey.whatsInAChallenge.meta}
        />
        <div className="flex flex-col gap-12 desktop:flex-row desktop:gap-16">
          <dl className="flex flex-1 flex-col gap-5">
            <SampleRow label={journey.inputs.skill} value={sample.skill} />
            <SampleRow label={journey.inputs.medium} value={sample.medium} />
            <SampleRow label={journey.inputs.topic} value={sample.topic} variant="card-title" />
            <SampleRow label={journey.inputs.constraint} value={sample.constraint} />
            <SampleRow label={journey.inputs.brief} value={sample.brief} variant="brief-setup" />
          </dl>
          <ul className="flex flex-1 flex-col gap-5">
            {skills.map((entry) => (
              <li key={entry.id} className="flex flex-col gap-1">
                <p className="text-label uppercase">{entry.name}</p>
                <p className="[overflow-wrap:anywhere] text-body">{entry.description}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

// Literal class names only: a Tailwind class built from a runtime template
// (e.g. `text-${variant}`) is invisible to Tailwind's static scanner.
const VALUE_CLASS = {
  lede: "text-lede",
  "card-title": "text-card-title",
  "brief-setup": "text-brief-setup",
} as const;

function SampleRow({
  label,
  value,
  variant = "lede",
}: {
  label: string;
  value: string;
  variant?: keyof typeof VALUE_CLASS;
}) {
  const valueClass = VALUE_CLASS[variant];
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-meta uppercase">{label}</dt>
      <dd className={`[overflow-wrap:anywhere] ${valueClass}`}>{value}</dd>
    </div>
  );
}
