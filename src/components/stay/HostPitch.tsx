import { useTranslations } from "next-intl";
import type { Stay } from "@/lib/types";
import { Section } from "./Section";

/** The host's own words – one section each. Empty ones are skipped. */
export function HostPitch({ stay }: { stay: Stay }) {
  const t = useTranslations("house.pitch");
  const sections = [
    { title: t("why"), text: stay.whyText },
    { title: t("day"), text: stay.dayText },
    { title: t("lookingFor"), text: stay.lookingForText },
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
