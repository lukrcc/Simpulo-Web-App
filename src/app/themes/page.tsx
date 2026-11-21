import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { Container } from "@/components/layout/Container";
import { getStaysByVibe } from "@/lib/data/stays";
import { pageMetadata } from "@/lib/seo";
import { VIBES } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("seo.themes");
  return pageMetadata({ title: t("title"), description: t("description"), path: "/themes" });
}

/** /themes – every theme with its open Houses (most first), each to its page /themes/[theme]; none open: "Opening soon". "All themes →" in the footer. */
/** The data is read inside a boundary (like the city pages): the list depends on today's Houses. */
export default function ThemesPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ThemesContent />
    </Suspense>
  );
}

async function ThemesContent() {
  const t = await getTranslations("seo.themes");
  const tVibe = await getTranslations("common.vibes");
  const themes = (await Promise.all(VIBES.map(async (v) => ({ key: v.key, count: (await getStaysByVibe(v.key)).length })))).toSorted((a, b) => b.count - a.count || a.key.localeCompare(b.key));
  return (
    <Container page className="pb-(--space-section)">
      <h1 className="text-h1 text-ink">{t("title")}</h1>
      <p className="mt-4 max-w-[640px] text-body-lg text-muted">{t("intro")}</p>
      <ul data-themes className="mt-(--space-inner) grid gap-x-6 [grid-template-columns:repeat(auto-fill,minmax(min(240px,100%),1fr))]">
        {themes.map((theme) => (
          <li key={theme.key} className="border-b border-line">
            <Link href={`/themes/${theme.key}`} className="flex min-h-14 items-baseline justify-between gap-4 py-3 transition-colors hover:text-ink">
              <span className="text-body-lg font-semibold text-ink">{tVibe(theme.key)}</span>
              <span className="shrink-0 text-small text-muted">{t("count", { count: theme.count })}</span>
            </Link>
          </li>
        ))}
      </ul>
    </Container>
  );
}
