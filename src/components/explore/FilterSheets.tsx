"use client";

import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState, type ReactNode, type RefObject } from "react";
import { ChevronDown, type LucideIcon } from "lucide-react";
import { PanelCapsule, PanelCapsules } from "@/components/ui/PanelCapsule";
import { cn } from "@/lib/utils";
import { CurrencyPicker } from "@/components/layout/CurrencyPicker";
import { PriceFilter, type CheckOption } from "@/components/explore/Filters";
import { FilterDropdown, FilterRow, OverflowPickOptions, PickOptions, ToggleChip } from "@/components/explore/FilterPanel";
import { MonthField, PlaceField } from "@/components/explore/SearchFields";
import { Button } from "@/components/ui/ActionButton";
import { HeaderPanel, type PanelHandlers } from "@/components/layout/header/HeaderPanel";
import { RollingNumber } from "@/components/ui/RollingNumber";
import { Sheet } from "@/components/ui/Sheet";
import { FILTER_ICONS } from "@/config/explore";
import { useFormat } from "@/i18n/format";
import {
  ACCOMMODATION_KEYS,
  AGE_KEYS,
  CREW_SIZE_KEYS,
  DEPTH_KEYS,
  EMPTY_FILTERS,
  HOST_EXPERIENCE_KEYS,
  LENGTH_KEYS,
  matchesFilters,
  panelFilterCount,
  SPOTS_MINS,
  WHO_KEYS,
  type ExploreFilters,
  type SortKey,
} from "@/lib/exploreFilters";
import type { Stay, Vibe } from "@/lib/types";

/** How long after the last move the count is worked out (CLAUDE.md "Filter erst beim Bestätigen"). */
const COUNT_DELAY_MS = 200;

interface FilterSheetsProps {
  open: boolean;
  /** From 744px the header's panel (HeaderPanel), on phones the bottom sheet */
  md: boolean;
  /** The header panel's hover and lock (useHeaderPanel, in the caller with its trigger) */
  panelHandlers: PanelHandlers["panel"];
  /** Closing without "Show": the draft is dropped, the applied filters stay */
  onClose: () => void;
  /** "Show N houses": the draft becomes the filters (URL, list, scroll to the results) – the caller closes */
  onApply: (next: ExploreFilters) => void;
  /** Phones: after the sheet's slide-out (the scroll to the results waits for it) */
  onClosed: () => void;
  anchor: RefObject<HTMLElement | null>;
  /** The applied filters – the draft starts from them each time the sheet opens */
  filters: ExploreFilters;
  /** The Houses the count runs over (the page's scope, before the filters) */
  base: readonly Stay[];
  verifiedHosts: ReadonlySet<string>;
  showVibes: boolean;
  vibeOptions: Parameters<typeof OverflowPickOptions>[0]["options"];
  sortOptions: readonly { value: SortKey; label: string }[];
  budgetBounds: { min: number; max: number } | null;
  prices: readonly number[];
  currency: Parameters<typeof PriceFilter>[0]["currency"];
  hostPremium: boolean;
  depthOn: boolean;
}

/**
 * Explore's "All filters" – the bar's sheet from 744px, the bottom sheet on phones. Everything set in here is a draft (this component's own
 * state, so the list behind it doesn't move or redraw while a slider is dragged) until "Show N houses": then it's applied once – URL, list,
 * a scroll to the results. While adjusting only the number is worked out, 200ms after the last change, without cards or pictures; with 0 the
 * button says "No houses – adjust filters" and can't be pressed. Closing without "Show" drops the draft; "Clear all" clears only the draft.
 */
export function FilterSheets(props: FilterSheetsProps) {
  const { open, md, panelHandlers, onClose, onApply, onClosed, anchor, filters, base, verifiedHosts, showVibes, vibeOptions, sortOptions, budgetBounds, prices, currency, hostPremium, depthOn } = props;
  const t = useTranslations("explore");
  const tf = useTranslations("explore.filtersUi");
  const tc = useTranslations("common");
  const format = useFormat();

  // The draft: a copy of the applied filters, taken each time the sheet opens (CLAUDE.md "Filter erst beim Bestätigen"). "More filters"
  // opens with the panel when one of its filters is set – so what's active is always in view.
  const moreActive = (f: ExploreFilters) => [f.who, f.age, f.accommodation, f.spots, f.hostExperience, f.depth].some((v) => v !== null) || f.languages.length > 0 || f.verifiedOnly;
  const [wasOpen, setWasOpen] = useState(open);
  const [draft, setDraft] = useState(filters);
  const [moreOpen, setMoreOpen] = useState(() => moreActive(filters));
  // What the number counts: the draft, 200ms after its last change.
  const [counted, setCounted] = useState(filters);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setDraft(filters);
      setCounted(filters);
      setMoreOpen(moreActive(filters));
    }
  }
  useEffect(() => {
    if (counted === draft) return;
    const timer = window.setTimeout(() => setCounted(draft), COUNT_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [draft, counted]);
  const count = useMemo(() => base.filter((s) => matchesFilters(s, counted, undefined, verifiedHosts)).length, [base, counted, verifiedHosts]);
  const settling = counted !== draft;

  const update = (patch: Partial<ExploreFilters>) => setDraft((d) => ({ ...d, ...patch }));
  const clearDraft = () => setDraft((d) => ({ ...EMPTY_FILTERS, sort: d.sort }));
  const apply = () => {
    if (count === 0 && !settling) return;
    onApply(draft);
  };
  const draftCount = panelFilterCount(draft);

  // Options with how many Houses each would show alongside the other (counted) choices.
  const languageOptions = useMemo<CheckOption[]>(
    () =>
      [...new Set(base.map((s) => s.language).filter(Boolean))]
        .map((code) => ({ value: code, label: format.language(code), count: base.filter((s) => s.language === code && matchesFilters(s, counted, "languages", verifiedHosts)).length }))
        .toSorted((a, b) => b.count - a.count || a.label.localeCompare(b.label)),
    [base, counted, format, verifiedHosts],
  );

  const one = <T,>(value: T | null): T[] => (value === null ? [] : [value]);
  // The rows. Phones' sheet: the label left (150px), a 1px line between. The bar's sheet (`stacked`): the label above. Nothing picked = all.
  const rows = (stacked: boolean) => ({
    sort: (
      <FilterRow stacked={stacked} label={t("sort")}>
        <PickOptions label={t("sort")} options={[...sortOptions]} value={[draft.sort]} onChange={(sort) => sort[0] && update({ sort: sort[0] })} />
      </FilterRow>
    ),
    where: (
      <FilterRow stacked={stacked} label={tf("whereWhenRow")}>
        <div className="grid grid-cols-2 gap-3">
          <PlaceField size="panel" value={draft.place} onChange={(place) => update({ place })} className="w-full max-w-none" />
          <MonthField size="panel" value={draft.month} onChange={(month) => update({ month })} className="w-full" />
        </div>
      </FilterRow>
    ),
    category: showVibes && (
      <FilterRow stacked={stacked} label={tf("category")} count={draft.vibes.length}>
        <OverflowPickOptions label={tf("category")} options={vibeOptions} value={draft.vibes} onChange={(vibes) => update({ vibes: vibes as Vibe[] })} />
      </FilterRow>
    ),
    length: (
      <FilterRow stacked={stacked} label={tf("length")} count={draft.lengths.length}>
        <PickOptions multiple label={tf("length")} options={LENGTH_KEYS.map((key) => ({ value: key, label: tf(`lengthOptions.${key}`) }))} value={draft.lengths} onChange={(lengths) => update({ lengths })} />
      </FilterRow>
    ),
    crew: (
      <FilterRow stacked={stacked} label={tf("crewSize")} count={draft.crewSizes.length}>
        <PickOptions multiple label={tf("crewSize")} options={CREW_SIZE_KEYS.map((key) => ({ value: key, label: key.replace("-", "–") }))} value={draft.crewSizes} onChange={(crewSizes) => update({ crewSizes })} />
      </FilterRow>
    ),
    price: (
      <FilterRow stacked={stacked} label={tf("price")} aside={<CurrencyPicker />}>
        {budgetBounds ? (
          <PriceFilter bounds={budgetBounds} prices={[...prices]} value={draft.budget} onChange={(budget) => update({ budget })} currency={currency} />
        ) : (
          <p className="text-small text-muted">{tf("noBudget")}</p>
        )}
      </FilterRow>
    ),
    more: (
      <FilterRow stacked={stacked} label={tf("moreRow")}>
        {/* In the bar: the dropdowns as capsules in two columns, each a column wide. */}
        <div className={stacked ? "filter-more-grid grid grid-cols-2 gap-2" : "flex flex-wrap items-center gap-2"}>
          <FilterDropdown icon={FILTER_ICONS.who} label={tf("who")} options={WHO_KEYS.map((key) => ({ value: key, label: tf(`whoOptions.${key}`) }))} value={one(draft.who)} onChange={(v) => update({ who: v[0] ?? null })} />
          <FilterDropdown icon={FILTER_ICONS.age} label={tf("age")} options={AGE_KEYS.map((key) => ({ value: key, label: tf(`ageOptions.${key}`) }))} value={one(draft.age)} onChange={(v) => update({ age: v[0] ?? null })} />
          <FilterDropdown icon={FILTER_ICONS.accommodation} label={tf("accommodation")} options={ACCOMMODATION_KEYS.map((key) => ({ value: key, label: tf(`accommodationOptions.${key}`) }))} value={one(draft.accommodation)} onChange={(v) => update({ accommodation: v[0] ?? null })} />
          <FilterDropdown icon={FILTER_ICONS.spots} label={tf("spots")} options={SPOTS_MINS.map((n) => ({ value: n, label: tf("spotsOptions.atLeast", { count: n }) }))} value={one(draft.spots)} onChange={(v) => update({ spots: v[0] ?? null })} />
          {languageOptions.length > 0 && (
            <FilterDropdown
              multiple
              icon={FILTER_ICONS.language}
              label={t("language")}
              options={languageOptions.map((o) => ({ value: o.value, label: o.label, hint: String(o.count) }))}
              value={draft.languages}
              onChange={(languages) => update({ languages })}
            />
          )}
          {/* Host experience only with its feature flag. */}
          {hostPremium && (
            <FilterDropdown icon={FILTER_ICONS.hostExperience} label={tf("hostExperience")} options={HOST_EXPERIENCE_KEYS.map((key) => ({ value: key, label: tf(`hostExperienceOptions.${key}`) }))} value={one(draft.hostExperience)} onChange={(v) => update({ hostExperience: v[0] ?? null })} />
          )}
          {/* The social depth (config/depth.ts) – only while the depth choice is on. */}
          {depthOn && <FilterDropdown icon={FILTER_ICONS.depth} label={tf("depth")} options={DEPTH_KEYS.map((key) => ({ value: key, label: tf(`depthOptions.${key}`) }))} value={one(draft.depth)} onChange={(v) => update({ depth: v[0] ?? null })} />}
          <ToggleChip icon={FILTER_ICONS.verified} label={tf("verifiedChip")} on={draft.verifiedOnly} onChange={(verifiedOnly) => update({ verifiedOnly })} />
        </div>
      </FilterRow>
    ),
  });

  const label = tc("houses", { count });
  const footer = (alwaysClear: boolean, brand: boolean) => (
    <>
      {/* Phones: only when something is set (otherwise the primary keeps its place on the right). The bar's sheet: always, on the left. */}
      {alwaysClear || draftCount > 0 || draft.vibes.length > 0 ? (
        <button type="button" onClick={clearDraft} className="text-body font-semibold text-ink underline underline-offset-4 transition-colors hover:text-ink/70">
          {tf("clearAll")}
        </button>
      ) : (
        <span />
      )}
      {/* The one main action: applies the draft. In the header's panel graphite like "Open a House" (no orange), on phones the primary. With 0
          matches it says so and can't be pressed. */}
      <Button variant={brand ? "graphite" : "primary"} size="md" onClick={apply} disabled={count === 0 && !settling} aria-busy={settling || undefined}>
        {/* One span: inside the button's flex row, "Show", the number and "houses" would each be an item with 8px gaps instead of spaces. */}
        <span>{count === 0 ? tf("noneMatch") : tf.rich("show", { count, num: () => <RollingNumber value={count} /> })}</span>
      </Button>
    </>
  );

  // The header's panel (CLAUDE.md "Panels einheitlich"): every choice the one panel capsule (ui/PanelCapsule); Category shows all its themes;
  // "More filters ▾" a calm text link that opens inside the panel – each filter a row, its label left, its options as capsules.
  const withIcon = (Icon: LucideIcon | undefined, label: ReactNode) =>
    Icon ? (
      <>
        <Icon aria-hidden className="size-4 shrink-0" strokeWidth={1.75} />
        {label}
      </>
    ) : (
      label
    );
  const panelRows = {
    category: showVibes && (
      <FilterRow stacked label={tf("category")} count={draft.vibes.length}>
        <PanelCapsules multiple label={tf("category")} options={vibeOptions.map((o) => ({ value: o.value, label: withIcon(o.icon, o.label) }))} value={draft.vibes} onChange={(vibes) => update({ vibes: vibes as Vibe[] })} />
      </FilterRow>
    ),
    length: (
      <FilterRow stacked label={tf("length")} count={draft.lengths.length}>
        <PanelCapsules multiple label={tf("length")} options={LENGTH_KEYS.map((key) => ({ value: key, label: tf(`lengthOptions.${key}`) }))} value={draft.lengths} onChange={(lengths) => update({ lengths })} />
      </FilterRow>
    ),
    crew: (
      <FilterRow stacked label={tf("crewSize")} count={draft.crewSizes.length}>
        <PanelCapsules multiple label={tf("crewSize")} options={CREW_SIZE_KEYS.map((key) => ({ value: key, label: key.replace("-", "–") }))} value={draft.crewSizes} onChange={(crewSizes) => update({ crewSizes })} />
      </FilterRow>
    ),
  };
  const moreCount = [draft.who, draft.age, draft.accommodation, draft.spots, draft.hostExperience, draft.depth].filter((v) => v !== null).length + (draft.languages.length > 0 ? 1 : 0) + (draft.verifiedOnly ? 1 : 0);
  // Each filter a row – its label left, its options as capsules; the rows in the panel's two columns, so the panel stays on one screen.
  const moreRow = (label: string, control: ReactNode) => (
    <div className="grid grid-cols-[136px_minmax(0,1fr)] items-center gap-x-4">
      <span className="text-nav font-semibold text-ink">{label}</span>
      {control}
    </div>
  );
  const moreRows = (
    <div data-more-filters className="mt-8 grid grid-cols-2 gap-x-16 gap-y-3">
      {moreRow(tf("who"), <PanelCapsules label={tf("who")} options={WHO_KEYS.map((key) => ({ value: key, label: tf(`whoOptions.${key}`) }))} value={one(draft.who)} onChange={(v) => update({ who: v[0] ?? null })} />)}
      {moreRow(tf("age"), <PanelCapsules label={tf("age")} options={AGE_KEYS.map((key) => ({ value: key, label: tf(`ageOptions.${key}`) }))} value={one(draft.age)} onChange={(v) => update({ age: v[0] ?? null })} />)}
      {moreRow(tf("accommodation"), <PanelCapsules label={tf("accommodation")} options={ACCOMMODATION_KEYS.map((key) => ({ value: key, label: tf(`accommodationOptions.${key}`) }))} value={one(draft.accommodation)} onChange={(v) => update({ accommodation: v[0] ?? null })} />)}
      {moreRow(tf("spots"), <PanelCapsules label={tf("spots")} options={SPOTS_MINS.map((n) => ({ value: n, label: tf("spotsOptions.atLeast", { count: n }) }))} value={one(draft.spots)} onChange={(v) => update({ spots: v[0] ?? null })} />)}
      {languageOptions.length > 0 && moreRow(t("language"), <PanelCapsules multiple label={t("language")} options={languageOptions.map((o) => ({ value: o.value, label: o.label }))} value={draft.languages} onChange={(languages) => update({ languages })} />)}
      {hostPremium && moreRow(tf("hostExperience"), <PanelCapsules label={tf("hostExperience")} options={HOST_EXPERIENCE_KEYS.map((key) => ({ value: key, label: tf(`hostExperienceOptions.${key}`) }))} value={one(draft.hostExperience)} onChange={(v) => update({ hostExperience: v[0] ?? null })} />)}
      {depthOn && moreRow(tf("depth"), <PanelCapsules label={tf("depth")} options={DEPTH_KEYS.map((key) => ({ value: key, label: tf(`depthOptions.${key}`) }))} value={one(draft.depth)} onChange={(v) => update({ depth: v[0] ?? null })} />)}
      {moreRow(tf("hosts"), (
        <div className="flex">
          <PanelCapsule on={draft.verifiedOnly} aria-pressed={draft.verifiedOnly} onClick={() => update({ verifiedOnly: !draft.verifiedOnly })}>
            {withIcon(FILTER_ICONS.verified, tf("verifiedChip"))}
          </PanelCapsule>
        </div>
      ))}
    </div>
  );

  const bar = rows(true);
  const phone = rows(false);
  return (
    <>
      {/* From 744px: the header's panel (HeaderPanel – full width under the bar, the same glass and room as Search and Themes), two columns,
          without "Where & when" (that's Search) and without "Sort" (the results head has it); "Clear all" · "Show N houses" at its foot. */}
      <HeaderPanel
        open={open && md}
        onClose={onClose}
        label={t("filters")}
        handlers={panelHandlers}
        triggerRef={anchor}
        head={
          <div className="mb-5 flex items-baseline gap-3">
            <h2 className="text-h3 text-ink">{t("filters")}</h2>
            <span className="text-small text-muted">{label}</span>
          </div>
        }
        // No lines in the panel (CLAUDE.md "Panels einheitlich"): only spacing above the foot.
        footer={<div className="mt-8 flex items-center justify-between gap-4">{footer(true, true)}</div>}
      >
        <div data-filter-panel>
          <div className="grid grid-cols-2 gap-x-16">
            <div className="flex min-w-0 flex-col gap-7">
              {panelRows.category}
              {panelRows.length}
            </div>
            <div className="flex min-w-0 flex-col gap-7">
              {panelRows.crew}
              {bar.price}
              <button type="button" aria-expanded={moreOpen} onClick={() => setMoreOpen((o) => !o)} className="inline-flex w-fit items-center gap-1.5 text-nav font-semibold text-ink underline-offset-4 hover:underline">
                {tf("moreFilters")}
                {moreCount > 0 && <span className="text-muted">· {moreCount}</span>}
                <ChevronDown aria-hidden className={cn("size-4 transition-transform duration-150", moreOpen && "rotate-180")} />
              </button>
            </div>
          </div>
          {moreOpen && moreRows}
        </div>
      </HeaderPanel>
      {/* Phones: the same content as a bottom sheet. */}
      <Sheet variant="panel" wide filterSheet titleNote={label} open={open && !md} onClose={onClose} onClosed={onClosed} title={t("filters")} footer={footer(false, false)}>
        <div data-filter-panel className="px-6">
          <div className="flex flex-col divide-y divide-ink/7">
            {phone.sort}
            {phone.where}
            {phone.category}
            {phone.length}
            {phone.crew}
            {phone.price}
            {phone.more}
          </div>
        </div>
      </Sheet>
    </>
  );
}
