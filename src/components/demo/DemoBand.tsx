import { ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";

/** Demo only, above the header: says what this is, and where the real thing is. */
export async function DemoBand() {
  const t = await getTranslations("demo.band");
  const production = process.env.NEXT_PUBLIC_PRODUCTION_URL ?? "";
  return (
    <div data-demo-band className="sticky top-0 z-50 flex h-(--band-h) items-center justify-between gap-4 bg-bg bg-[linear-gradient(color-mix(in_srgb,var(--stage-peach)_28%,transparent),color-mix(in_srgb,var(--stage-peach)_28%,transparent))] px-4 text-small text-white md:px-8">
      <p className="truncate">{t("text")}</p>
      <a href={`${production}/how-it-works?role=host`} className="inline-flex shrink-0 items-center gap-1 underline-offset-4 hover:underline">
        {t("link")}
        <ArrowRight className="size-3.5" aria-hidden />
      </a>
    </div>
  );
}
