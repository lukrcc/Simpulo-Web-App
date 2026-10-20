import type { Stay } from "@/lib/types";
import { Section } from "./Section";

/** The host's own words – one section each. Empty ones are skipped. */
export function HostPitch({ stay }: { stay: Stay }) {
  const sections = [
    { title: "Why I'm hosting this", text: stay.whyText },
    { title: "A typical day", text: stay.dayText },
    { title: "Who I'm looking for", text: stay.lookingForText },
  ].filter((s) => s.text.trim());

  return (
    <>
      {sections.map(({ title, text }) => (
        <Section key={title} title={title}>
          <p className="whitespace-pre-line leading-relaxed text-neutral-700">{text}</p>
        </Section>
      ))}
    </>
  );
}
