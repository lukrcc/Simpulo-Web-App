"use client";

import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { VIBES } from "@/lib/catalog";
import type { Vibe } from "@/lib/types";

/**
 * The Spotlight's sentence per category (lib/i18n/en.ts explore.themeLines): "member" for the logged in, "visitor" for visitors. One stable
 * record per audience (the carousel measures every sentence once), and the fallback for a House without a category.
 */
export function useSpotlightThemeLines(visitor: boolean): { lines: Record<Vibe, string>; fallback: (count: number) => string } {
  const t = useTranslations("explore.themeLines");
  return useMemo(() => {
    const audience = visitor ? "visitor" : "member";
    const lines = Object.fromEntries(VIBES.map((v) => [v.key, t(`${audience}.${v.key}`)])) as Record<Vibe, string>;
    return { lines, fallback: (count: number) => t("fallback", { count }) };
  }, [t, visitor]);
}
