"use client";

import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Chip } from "@/components/ui/Chip";
import { useFormat } from "@/i18n/format";
import { convertApprox } from "@/lib/rates";
import type { ExploreFilters } from "@/lib/exploreFilters";
import type { Currency } from "@/lib/types";

interface ActiveFiltersProps {
  filters: ExploreFilters;
  onChange: (patch: Partial<ExploreFilters>) => void;
  currency: Currency;
  /** The panel lists categories too; the chip row has them as its own chips */
  withCategory?: boolean;
  /** The chip row has its own "Short trips" switch */
  withoutShortTrips?: boolean;
  /** Only this many, then "+N" (`onMore`) */
  limit?: number;
  onMore?: () => void;
}

/** Every value set in the panel as a peach chip with an ✕. Where? and When? carry their own ✕. */
export function ActiveFilters({ filters, onChange, currency, withCategory = false, withoutShortTrips = false, limit, onMore }: ActiveFiltersProps) {
  const t = useTranslations("explore.filtersUi");
  const format = useFormat();
  const money = (eur: number) => format.price(Math.round(convertApprox(eur, "EUR", currency)), currency);
  const items: Array<{ key: string; label: string; remove: Partial<ExploreFilters> }> = [
    ...(withCategory ? filters.vibes.map((vibe) => ({ key: `vibe-${vibe}`, label: format.vibe(vibe), remove: { vibes: filters.vibes.filter((v) => v !== vibe) } })) : []),
    ...(filters.length && !(withoutShortTrips && filters.length === "weekend") ? [{ key: "length", label: t(`lengthOptions.${filters.length}`), remove: { length: null } }] : []),
    ...(filters.budget ? [{ key: "budget", label: `${money(filters.budget.min)}–${money(filters.budget.max)}`, remove: { budget: null } }] : []),
    ...(filters.spots ? [{ key: "spots", label: `${t("spots")}: ${t("spotsOptions.atLeast", { count: filters.spots })}`, remove: { spots: null } }] : []),
    ...(filters.crewSize ? [{ key: "crewSize", label: `${t("crewSize")}: ${filters.crewSize.replace("-", "–")}`, remove: { crewSize: null } }] : []),
    ...(filters.who ? [{ key: "who", label: t(`whoOptions.${filters.who}`), remove: { who: null } }] : []),
    ...(filters.age ? [{ key: "age", label: `${t("age")}: ${t(`ageOptions.${filters.age}`)}`, remove: { age: null } }] : []),
    ...(filters.accommodation ? [{ key: "accommodation", label: t(`accommodationOptions.${filters.accommodation}`), remove: { accommodation: null } }] : []),
    ...filters.languages.map((code) => ({ key: `lang-${code}`, label: format.language(code), remove: { languages: filters.languages.filter((l) => l !== code) } })),
  ];
  if (items.length === 0) return null;
  const shown = limit === undefined ? items : items.slice(0, limit);
  const rest = items.length - shown.length;
  return (
    <>
      {shown.map((item) => (
        <Chip key={item.key} active check={false} size="sm" aria-label={t("remove", { label: item.label })} onClick={() => onChange(item.remove)}>
          <span className="flex items-center gap-1">
            {item.label}
            <X className="size-3.5 shrink-0" aria-hidden />
          </span>
        </Chip>
      ))}
      {rest > 0 && (
        <Chip active={false} size="sm" onClick={onMore}>
          {t("moreActive", { count: rest })}
        </Chip>
      )}
    </>
  );
}
