import { ArrowUpRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { useFormat } from "@/i18n/format";
import type { Stay } from "@/lib/types";
import { googleMapsUrl, isCityOpen, mapQuery } from "@/lib/utils";
import { Section } from "./Section";

/**
 * Live Google Maps embed: 16:9, capped at 320px tall, with a link out above it.
 * City still open → the whole region at island/country zoom.
 */
export function PlaceMap({ stay }: { stay: Stay }) {
  const t = useTranslations("house.map");
  const format = useFormat();
  const { query, zoom } = mapQuery(stay);
  const cityOpen = isCityOpen(stay);
  return (
    <Section
      title={t("title")}
      action={
        <a
          href={googleMapsUrl(stay)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-ink underline underline-offset-2 hover:text-zinc-600"
        >
          {t("openInMaps")}
          <ArrowUpRight className="size-4" />
        </a>
      }
    >
      <div className="relative aspect-video max-h-[320px] w-full overflow-hidden rounded-[20px] bg-[#eef0ea]">
        <iframe
          src={`https://www.google.com/maps?q=${query}&z=${zoom}&output=embed`}
          title={t("mapOf", { place: format.placeLabel(stay) })}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="absolute inset-0 size-full border-0"
        />
      </div>
      {cityOpen && <p className="mt-2 text-sm text-zinc-500">{t("areaOpen")}</p>}
    </Section>
  );
}
