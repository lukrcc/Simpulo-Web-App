"use client";

import { useFeatureFlag } from "@/lib/featureFlags";
import { Check, ChevronRight, Home, ImagePlus, KeyRound, MapPin, Minus, Plus, Users, X } from "lucide-react";
import { CATEGORY_IMAGE, CATEGORY_IMAGE_ALT, CHARTERED_CATEGORY, POPULAR_BY_TOPIC, TYPE_IMAGE, accommodationOf, livingCategoriesFor, type AccommodationCategoryId } from "@/config/accommodation";
import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useEffectEvent, useId, useLayoutEffect, useRef, useState, type ReactNode, type Ref, type TextareaHTMLAttributes } from "react";
import { useTabScroll } from "@/components/ui/useTabScroll";
import { FEE_MODEL, INVITE_POLICY } from "@/config/policies";
import { DEFAULT_DEPTH, DEPTHS, suggestedDepth } from "@/config/depth";
import { DAYLIGHT, KITCHENS, OUTDOORS, ROOM_KINDS, SETTINGS, SHARED_SPACES, SPACE_LIMITS, TABLE_SPOTS, type HouseSpace, SPACE_FIELDS, spaceAnswered } from "@/config/space";
import { PlaceSearch } from "./PlaceSearch";
import { useMonthName } from "@/components/explore/SearchFields";
import { FormField, formInput, formTextarea } from "@/components/form/FormLayout";
import { shortMonth, upcomingMonths, yearLabelOf } from "@/components/form/MonthChips";
import { Button } from "@/components/ui/ActionButton";
import { Avatar } from "@/components/ui/Avatar";
import { Checkbox } from "@/components/ui/Checkbox";
import { ChipCheck } from "@/components/ui/Chip";
import { PanelCapsule } from "@/components/ui/PanelCapsule";
import { Combobox } from "@/components/ui/Combobox";
import { DateRangePicker } from "@/components/ui/DateRangePicker";
import { Img } from "@/components/ui/Img";
import { WAITLIST_MAX_LIMIT } from "@/lib/waitlist";
import { LanguageInput } from "@/components/ui/LanguageInput";
import { PhotoUploader } from "@/components/ui/PhotoUploader";
import { Switch } from "@/components/ui/Switch";
import { useFormat } from "@/i18n/format";
import { guestFee, hostProgrammeEarning, isMinimumFee } from "@/lib/fees";
import { linkDomain } from "@/lib/links";
import type { Currency, Place, Stay, User, Vibe } from "@/lib/types";
import Link from "next/link";
import { CURRENCIES, VIBES, cn, nightsBetween } from "@/lib/utils";
import { InForHint, SearchDemandHint } from "./SearchDemandHint";
import { Sheet } from "@/components/ui/Sheet";
import { useViewerPrice } from "@/components/ui/PriceLine";
import { PEOPLE_MAX, PEOPLE_MIN } from "@/config/open-house-steps";
import { useStore } from "@/lib/store";
import {
  budgetScaleOf,
  CUSTOM_VIBE_MAX,
  HOST_NOTE_MAX,
  LOOKING_FOR_MAX,
  MAX_COVER_PHOTOS,
  MAX_NIGHTS,
  MAX_PROPOSALS,
  OPTIONAL_GROUPS,
  SPOTS_BIG,
  SPOTS_CHIPS_MAX,
  BUDGET_SPREAD_MAX,
  EXTRAS,
  nextMonthRun,
  placeShare,
  type ExtraKey,
  SPOTS_MIN,
  TITLE_MAX_NEW,
  detailDone,
  fieldId,
  formPlaceOf,
  isLink,
  kindPick,
  monthBounds,
  suggestionVibe,
  type DetailKey,
  type FieldKey,
  type FormState,
  type HouseTemplate,
  type StepKey,
} from "./model";
import { regionShortName } from "./places";

/** Several fields at once (e.g. region + city from one pick) */
export type Patch = (patch: Partial<FormState>) => void;

/** Shared by the steps: the form, the visible error of a field (null until touched / Next tried) and marking it touched. */
export interface StepProps {
  form: FormState;
  patch: Patch;
  errorOf: (key: FieldKey) => string | null;
  touch: (key: FieldKey) => void;
}

/** A field's error line under a group of chips (FormField shows it for single fields). */
function ErrorLine({ text }: { text: string | null }) {
  return text ? (
    <p role="alert" className="text-small text-danger">
      {text}
    </p>
  ) : null;
}

/**
 * One choice out of a few (Who, Crew age, the waitlist, spots for friends, dates and place modes, host experience): the panels' capsules in a
 * row, chosen graphite (CLAUDE.md "Open a House Teil 2") – instead of a segmented bar. The chosen one stays chosen; a tap picks another.
 */
function CapsuleChoice<T extends string | number | null>({ options, value, onChange, label, className }: { options: ReadonlyArray<{ value: T; label: ReactNode }>; value: T; onChange: (value: T) => void; label: string; className?: string }) {
  return (
    <div role="radiogroup" aria-label={label} className={cn("flex flex-wrap gap-2", className)}>
      {options.map((o) => (
        <PanelCapsule key={String(o.value)} role="radio" aria-checked={value === o.value} on={value === o.value} onClick={() => onChange(o.value)}>
          {o.label}
        </PanelCapsule>
      ))}
    </div>
  );
}

/** A label over what it labels: small and muted, the answer free on the page. */
function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div role="group" aria-label={label}>
      <p className="mb-2 text-small text-muted">{label}</p>
      {children}
    </div>
  );
}

const newId = () => `p-${Math.random().toString(36).slice(2, 9)}`;

/* ───────────────────────── 1 · Theme ───────────────────────── */

/** The categories as text chips, one sliding capsule (single select), plus "Custom", which opens a small field. */
export function VibeStep({ form, patch, errorOf }: StepProps) {
  const t = useTranslations("create.house");
  const format = useFormat();
  const custom = form.customVibe !== null;
  return (
    <div id={fieldId("vibe")} className="space-y-4">
      <div role="group" aria-label={t("vibe")} className="relative flex flex-wrap gap-1.5">
        {VIBES.map((v) => (
          <PanelCapsule key={v.key} on={!custom && form.vibe === v.key} aria-pressed={!custom && form.vibe === v.key} onClick={() => patch({ vibe: v.key, customVibe: null })}>
            {format.vibe(v.key)}
          </PanelCapsule>
        ))}
        <PanelCapsule on={custom} aria-pressed={custom} onClick={() => patch({ customVibe: custom ? null : "" })}>
          {t("custom")}
        </PanelCapsule>
      </div>
      {custom && (
        <input
          autoFocus
          value={form.customVibe ?? ""}
          maxLength={CUSTOM_VIBE_MAX}
          onChange={(e) => patch({ customVibe: e.target.value })}
          placeholder={t("customPlaceholder")}
          aria-label={t("customLabel")}
          className={cn(formInput, "max-w-80")}
        />
      )}
      <ErrorLine text={errorOf("vibe")} />
    </div>
  );
}

/* ───────────────────────── 0 · Host from your place ───────────────────────── */

/**
 * Before step 1, only for hosts with saved places: each place as a large choice (photo, name, free rooms · city, how many windows) and
 * "New place". Chosen = black like every choice of yours; Next fills in what the place knows (CreateStayForm).
 */
export function SourceStep({ form, patch, errorOf, places, windows }: StepProps & { places: readonly Place[]; /** Windows per place id */ windows: Readonly<Record<string, number>> }) {
  const t = useTranslations("create.home");
  const choice = (chosen: boolean) =>
    cn(
      "press flex min-h-44 flex-col items-start gap-3 overflow-hidden rounded-3xl text-left transition-colors duration-150",
      chosen ? "bg-ink text-inverse" : "bg-(--create-option) text-ink hover:bg-(--create-option-hover)",
    );
  return (
    <div id={fieldId("source")} className="space-y-3">
      <p className="text-small text-muted">{t("ownTitle")}</p>
      <div role="radiogroup" aria-label={t("ownTitle")} className="grid gap-3 sm:grid-cols-2">
        {places.map((place) => {
          const chosen = form.source === "own" && form.placeId === place.id;
          return (
            <button key={place.id} type="button" role="radio" aria-checked={chosen} onClick={() => patch({ source: "own", placeId: place.id })} className={choice(chosen)}>
              <span className="relative block aspect-[16/7] w-full bg-ink/5">
                {place.photos[0] && <Img src={place.photos[0]} alt="" fill sizes="360px" className="object-cover" />}
              </span>
              <span className="flex flex-col gap-1 px-6 pb-5">
                <span className="text-h3">{place.name}</span>
                <span className={cn("text-small", chosen ? "text-inverse/75" : "text-muted")}>
                  {t("placeMeta", { rooms: place.freeSpots, city: place.address.city || regionShortName(place.address.region) })} · {t("windows", { count: windows[place.id] ?? 0 })}
                </span>
              </span>
            </button>
          );
        })}
        <button type="button" role="radio" aria-checked={form.source === "new"} onClick={() => patch({ source: "new", placeId: "" })} className={cn(choice(form.source === "new"), "p-6")}>
          <Plus className={cn("size-6", form.source === "new" ? "text-inverse" : "text-muted")} aria-hidden />
          <span className="text-h3">{t("newTitle")}</span>
          <span className={cn("text-body", form.source === "new" ? "text-inverse/75" : "text-muted")}>{t("newText")}</span>
        </button>
      </div>
      <ErrorLine text={errorOf("source")} />
    </div>
  );
}

/**
 * "I live here – save it to Your places" under "I have a place" (a new place only): the rental period, the rent per month and the required
 * statement "I'm allowed to host guests here …" with "What this means" (the Hosting FAQ, #host-at-home). Saved on publish.
 */
export function PlaceSaveStep({ form, patch, errorOf, touch, currency }: StepProps & { currency: Currency }) {
  const t = useTranslations("create.home");
  const rentError = errorOf("rentPeriod");
  return (
    <div className="space-y-5 pt-2">
      <div>
        <CheckRow label={t("liveHere")} checked={form.savePlace} onChange={(savePlace) => patch({ savePlace, ...(!savePlace && { allowedToHost: false }) })} />
        <p className="pl-8 text-small text-muted">{t("liveHereText")}</p>
      </div>
      {form.savePlace && (
        <div className="space-y-5 pl-8">
          <div id={fieldId("rentPeriod")}>
            <Group label={t("rentPeriod")}>
              <DateRangePicker
                start={form.rentFrom}
                end={form.rentTo}
                // A rental may have started long ago: no earliest day (the calendar opens on this month).
                min=""
                maxNights={RENT_MAX_NIGHTS}
                invalid={Boolean(rentError)}
                onChange={(rentFrom, rentTo) => {
                  patch({ rentFrom, rentTo });
                  if (rentTo) touch("rentPeriod");
                }}
                onClose={() => touch("rentPeriod")}
              />
            </Group>
            {rentError && <div className="mt-2"><ErrorLine text={rentError} /></div>}
          </div>
          <div id={fieldId("monthlyRent")} className="max-w-80">
            <FormField label={t("monthlyRent")} error={errorOf("monthlyRent")}>
              <AmountInput value={form.monthlyRent} onChange={(monthlyRent) => patch({ monthlyRent })} currency={currency} label={t("monthlyRent")} invalid={Boolean(errorOf("monthlyRent"))} onBlur={() => touch("monthlyRent")} />
            </FormField>
          </div>
          <div id={fieldId("allowedToHost")}>
            <label className="flex cursor-pointer items-start gap-3 text-body text-ink">
              <Checkbox
                checked={form.allowedToHost}
                aria-invalid={Boolean(errorOf("allowedToHost")) || undefined}
                onChange={(e) => {
                  patch({ allowedToHost: e.target.checked });
                  touch("allowedToHost");
                }}
                className="mt-0.5"
              />
              <span>{t("allowed")}</span>
            </label>
            <Link href="/help#host-at-home" target="_blank" rel="noopener noreferrer" className="ml-8 mt-1 inline-block text-small font-semibold text-ink underline-offset-4 hover:underline">
              {t("whatThisMeans")} ↗
            </Link>
            {errorOf("allowedToHost") && <div className="ml-8 mt-2"><ErrorLine text={errorOf("allowedToHost")} /></div>}
          </div>
        </div>
      )}
    </div>
  );
}

/** A rental period may run for years (the date picker's limit, in nights). */
const RENT_MAX_NIGHTS = 3660;

/* ───────────────────────── 2 · Got a place? ───────────────────────── */

/**
 * Two large choices: "I have a place" (the host found it, the crew splits it, an exact price) or "Let's find it together" (a city and a
 * budget, the crew picks the place). Chosen = black, like every choice of yours.
 */
export function PlaceStep({ form, patch, errorOf }: StepProps) {
  const t = useTranslations("create.flow");
  const options = [
    { value: "set" as const, icon: KeyRound, title: t("placeSetTitle"), text: t("placeSetText") },
    { value: "together" as const, icon: Users, title: t("placeTogetherTitle"), text: t("placeTogetherText") },
  ];
  return (
    <div id={fieldId("placeMode")} className="space-y-3">
      <div role="radiogroup" aria-label={t("placeSetTitle")} className="grid gap-3 sm:grid-cols-2">
        {options.map(({ value, icon: Icon, title, text }) => {
          const chosen = form.placeMode === value;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={chosen}
              // "Let's find it together" isn't the host's own place any more.
              onClick={() => patch({ placeMode: value, ...(value === "set" ? { budgetTbd: false } : { placeId: "", savePlace: false, allowedToHost: false }) })}
              className={cn(
                "press flex min-h-44 flex-col items-start gap-3 rounded-3xl p-6 text-left transition-colors duration-150",
                chosen ? "bg-ink text-inverse" : "bg-(--create-option) text-ink hover:bg-(--create-option-hover)",
              )}
            >
              <Icon className={cn("size-6", chosen ? "text-inverse" : "text-muted")} aria-hidden />
              <span className="text-h3">{title}</span>
              <span className={cn("text-body", chosen ? "text-inverse/75" : "text-muted")}>{text}</span>
            </button>
          );
        })}
      </div>
      <ErrorLine text={errorOf("placeMode")} />
    </div>
  );
}

/* ───────────────────────── How deep should this House go? ───────────────────────── */

/**
 * Three tiles – Easy · Balanced · Deep (config/depth.ts), one sentence each; chosen = black like every choice of yours. Preselected: the
 * topic's suggestion (Balanced for most), marked "Suggested for {topic}" when it isn't Balanced. Only while the depth choice is on; after the
 * first booking it's fixed (`locked`: the tiles show, can't be changed, with the reason).
 */
export function DepthStep({ form, patch, locked = false }: StepProps & { locked?: boolean }) {
  const t = useTranslations("create.depth");
  const format = useFormat();
  const topic = form.vibe || null;
  const suggestion = suggestedDepth(topic);
  const value = form.depth ?? suggestion;
  return (
    <div className="space-y-4">
      <div role="radiogroup" aria-label={t("title")} className="grid gap-3 sm:grid-cols-3">
        {DEPTHS.map((depth) => {
          const chosen = value === depth;
          return (
            <button
              key={depth}
              type="button"
              role="radio"
              aria-checked={chosen}
              disabled={locked}
              onClick={() => patch({ depth })}
              className={cn(
                "press relative flex min-h-36 flex-col items-start gap-2 rounded-3xl p-5 text-left transition-colors duration-150 disabled:cursor-not-allowed",
                chosen ? "bg-ink text-inverse" : "bg-(--create-option) text-ink enabled:hover:bg-(--create-option-hover)",
                locked && !chosen && "opacity-50",
              )}
            >
              <span className="text-h3">{t(`${depth}.title`)}</span>
              <span className={cn("text-body", chosen ? "text-inverse/75" : "text-muted")}>{t(`${depth}.text`)}</span>
              {depth === suggestion && depth !== DEFAULT_DEPTH && topic && <span className={cn("mt-auto text-small font-semibold", chosen ? "text-inverse/75" : "text-muted")}>{t("suggested", { topic: format.vibe(topic) })}</span>}
            </button>
          );
        })}
      </div>
      <p className="text-small text-muted">{locked ? t("locked") : t("hint")}</p>
    </div>
  );
}

/* ───────────────────────── 3 · Where will you live? ───────────────────────── */

/** "surf camp" → "Surf camp" */
const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
/** Tiles shown before "More places" */
const KIND_TILES_VISIBLE = 6;

/**
 * The kinds of place as photo tiles (photo, name, "crew 4–12"; config/accommodation.ts): the theme's 2–3 popular types first, marked
 * "Popular for {theme}" – the step's one nudge –, then the categories one can live in; six visible, "More places" opens the rest. A
 * category asks "Which one?" (its types as chips). "Not sure yet" leaves it to the crew. Picking sets the crew size to the category's lower
 * end; the budget follows on "Crew and price" (kindBudget).
 */
export function KindStep({ form, patch, errorOf }: StepProps) {
  const t = useTranslations("create.kind");
  const format = useFormat();
  const topic = form.customVibe !== null ? null : form.vibe;
  const popular = ((topic && POPULAR_BY_TOPIC[topic]) || []).flatMap((id) => {
    const place = accommodationOf(id);
    return place ? [{ key: `type:${id}`, categoryId: place.category.id, typeId: id, name: capitalize(place.type.label), crew: place.category.crew, image: TYPE_IMAGE[id] ?? CATEGORY_IMAGE[place.category.id as AccommodationCategoryId], popular: true }] : [];
  });
  // "Popular for {theme}" on ONE tile only: the type opened most often among the theme's popular ones (the data), else the first.
  const stays = useStore().stays;
  const usage = (typeId: string) => stays.filter((stay) => stay.accommodationType === typeId).length;
  const mostPopular = popular.reduce<string | null>((best, tile) => (best === null || usage(tile.typeId) > usage(best) ? tile.typeId : best), null);
  const usedImages = new Set(popular.map((tile) => tile.image));
  const categories = livingCategoriesFor(topic).map((c) => {
    const own = CATEGORY_IMAGE[c.id as AccommodationCategoryId];
    // Never the same photo twice: a category whose photo is on a popular tile takes its second one.
    const image = own && usedImages.has(own) ? (CATEGORY_IMAGE_ALT[c.id as AccommodationCategoryId] ?? own) : own;
    return { key: `category:${c.id}`, categoryId: c.id, typeId: "", name: c.label, crew: c.crew, image, popular: false };
  });
  const tiles = [...popular, ...categories];
  const popularPicked = popular.some((tile) => tile.typeId === form.accommodationType);
  const isChosen = (tile: (typeof tiles)[number]) => (tile.popular ? form.accommodationType === tile.typeId : !popularPicked && form.accommodationCategory === tile.categoryId);
  const [more, setMore] = useState(false);
  // Six tiles in 3 × 2 on the page; "More places" opens a sheet with the rest. A pick from the sheet takes the sixth place, so it stays seen.
  const rest = tiles.slice(KIND_TILES_VISIBLE);
  const pickedFromRest = rest.find(isChosen);
  const shown = pickedFromRest ? [...tiles.slice(0, KIND_TILES_VISIBLE - 1), pickedFromRest] : tiles.slice(0, KIND_TILES_VISIBLE);
  const category = form.accommodationCategory && form.accommodationCategory !== "unsure" && !popularPicked ? livingCategoriesFor(null).find((c) => c.id === form.accommodationCategory) : undefined;
  const unsure = form.accommodationCategory === "unsure";
  const pick = (tile: (typeof tiles)[number]) => {
    if (tile.popular) patch(kindPick(tile.categoryId, tile.typeId));
    // The same category again keeps its type; another one starts without.
    else if (form.accommodationCategory !== tile.categoryId || popularPicked) patch(kindPick(tile.categoryId, ""));
  };
  const tileButton = (tile: (typeof tiles)[number], onPicked?: () => void) => {
    const chosen = isChosen(tile);
    return (
      <button
        key={tile.key}
        type="button"
        role="radio"
        aria-checked={chosen}
        onClick={() => {
          pick(tile);
          onPicked?.();
        }}
        className="press group min-w-0 text-left"
      >
        <span className={cn("relative block aspect-[16/10] overflow-hidden rounded-2xl bg-surface-2 transition-shadow duration-150", chosen && "ring-2 ring-ink ring-offset-2 ring-offset-bg")}>
          {tile.image ? (
            <Img src={tile.image} alt="" width={360} height={225} className="size-full object-cover" />
          ) : (
            <span className="flex size-full items-center justify-center text-muted">
              <MapPin className="size-6" aria-hidden />
            </span>
          )}
          {tile.popular && tile.typeId === mostPopular && topic && <span className="absolute left-2 top-2 rounded-full bg-surface/90 px-2.5 py-1 text-small font-semibold text-ink">{t("popular", { topic: format.vibe(topic) })}</span>}
          {chosen && (
            <span className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-full bg-ink text-inverse">
              <Check className="size-3.5 motion-safe:animate-check-in" strokeWidth={3} aria-hidden />
              <span className="sr-only">{t("chosen")}</span>
            </span>
          )}
        </span>
        <span className="mt-1.5 block truncate text-body font-semibold text-ink">{tile.name}</span>
        <span className="block text-small text-muted">{t("crew", { min: tile.crew.min, max: tile.crew.max })}</span>
      </button>
    );
  };

  return (
    <div id={fieldId("accommodationType")} className="space-y-4">
      <div role="radiogroup" aria-label={t("whichOne")} className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {shown.map((tile) => tileButton(tile))}
      </div>
      {category && (
        <div role="radiogroup" aria-label={t("whichOne")} className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-small text-muted">{t("whichOne")}</span>
          {category.types.map((type) => (
            <PanelCapsule key={type.id} role="radio" aria-checked={form.accommodationType === type.id} on={form.accommodationType === type.id} onClick={() => patch({ accommodationType: type.id })}>
              {capitalize(type.label)}
            </PanelCapsule>
          ))}
        </div>
      )}
      <div className="-ml-4 flex flex-wrap items-center gap-1">
        {rest.length > 0 && (
          <Button variant="tertiary" size="sm" onClick={() => setMore(true)}>
            {t("more")}
          </Button>
        )}
        {/* "Not sure yet": a text link – the crew picks the kind of place together. */}
        <Button variant="tertiary" size="sm" role="radio" aria-checked={unsure} onClick={() => patch({ accommodationCategory: "unsure", accommodationType: "" })} className={cn(unsure && "underline underline-offset-4")}>
          {unsure && <Check aria-hidden />}
          {t("unsure")} – {t("unsureText")}
        </Button>
      </div>
      <ErrorLine text={errorOf("accommodationType")} />
      <Sheet open={more} onClose={() => setMore(false)} title={t("moreTitle")}>
        <div role="radiogroup" aria-label={t("moreTitle")} className="grid grid-cols-2 gap-3">
          {rest.map((tile) => tileButton(tile, () => setMore(false)))}
        </div>
      </Sheet>
    </div>
  );
}

/* ───────────────────────── 4 · Where + when ───────────────────────── */

/** The place search; once there's a place, it stands as a chip (a tap searches again). The months follow. */
export function WhereStep({ form, patch, errorOf, touch, today, editing, rentalNote, part = "both" }: StepProps & { /** "" before hydration */ today: string; editing: boolean; /** A window of the host's own place: "Your rental: …" */ rentalNote?: string; /** A new House asks one at a time: "Where?" then "When?" (editing: both) */ part?: "where" | "when" | "both" }) {
  const t = useTranslations("create.house");
  const tFlow = useTranslations("create.flow");
  const format = useFormatter();
  const monthLong = useMonthName();
  const id = useId();
  const months = today ? upcomingMonths(new Date(`${today}T00:00:00Z`)) : [];
  const exact = form.datesMode === "exact";
  const bounds = monthBounds(form.month, today, form.monthEnd);
  const placeName = [form.city.trim(), form.region.trim()].filter(Boolean).join(", ");
  return (
    <div className="space-y-6">
      {part !== "when" && <div id={fieldId("region")}>
        {form.region.trim() && form.placeId ? (
          // A window of the host's own place: the place is where they live.
          <PanelCapsule on aria-label={placeName} className="pointer-events-none">
            <span className="flex items-center gap-1.5">
              <Home className="size-4" aria-hidden />
              {placeName}
            </span>
          </PanelCapsule>
        ) : form.region.trim() ? (
          <PanelCapsule on onClick={() => patch({ region: "", city: "" })} aria-label={tFlow("changePlace", { place: placeName })}>
            <span className="flex items-center gap-1.5">
              <MapPin className="size-4" aria-hidden />
              {placeName}
              <X className="size-3.5" aria-hidden />
            </span>
          </PanelCapsule>
        ) : (
          <PlaceSearch
            id={`${id}-place`}
            onPick={(pick) => {
              patch(pick.kind === "place" ? formPlaceOf(pick.place) : { region: pick.text.slice(0, 80), city: "" });
              touch("region");
            }}
          />
        )}
        {errorOf("region") && <div className="mt-2"><ErrorLine text={errorOf("region")} /></div>}
      </div>}

      {part !== "where" && (form.region.trim() || editing || part === "when") && (
        <Group label={t("when")}>
          {exact ? (
            <ExactDates form={form} patch={patch} errorOf={errorOf} touch={touch} today={today} />
          ) : (
            // One row of the next 12 months (phones: one row that scrolls sideways, .tab-scroll); the year small above the first month of a
            // new one, never in the chip. Several months in a row can be picked; picked = black.
            <MonthRow id={fieldId("month")} active={form.month}>
              {months.map((month, i) => {
                const last = form.monthEnd || form.month;
                const picked = Boolean(form.month) && month >= form.month && month <= last;
                return (
                  <div key={month} className="flex min-w-0 flex-col max-md:w-14">
                    <span aria-hidden className="block h-4 text-eyebrow text-muted">
                      {yearLabelOf(months, i)}
                    </span>
                    <PanelCapsule on={picked} aria-pressed={picked} aria-label={monthLong(month)} onClick={() => patch(nextMonthRun(month, form.month, form.monthEnd, months))} className="mt-1 w-full px-0!">
                      {shortMonth(format, month, false)}
                    </PanelCapsule>
                  </div>
                );
              })}
            </MonthRow>
          )}
          <div className="mt-2 space-y-2">
            {rentalNote && <p className="text-small text-muted">{rentalNote}</p>}
            <ErrorLine text={errorOf("month")} />
            {form.datesMode !== "crew" && (
              <Button variant="tertiary" className="-ml-4" onClick={() => patch({ datesMode: exact ? "month" : "exact" })}>
                {exact ? tFlow("justMonths") : tFlow("exactDates")}
              </Button>
            )}
          </div>
        </Group>
      )}
      {part !== "where" && <SearchDemandHint city={form.city} region={form.region} startDate={exact ? form.startDate : bounds.start} endDate={exact ? form.endDate : bounds.end} vibe={form.vibe} />}
      {part !== "where" && <InForHint city={form.city} region={form.region} startDate={exact ? form.startDate : bounds.start} endDate={exact ? form.endDate : bounds.end} vibe={form.vibe} />}
    </div>
  );
}

function ExactDates({ form, patch, errorOf, touch, today }: StepProps & { today: string }) {
  const dateError = errorOf("startDate") ?? errorOf("endDate");
  return (
    <div id={fieldId("startDate")}>
      {/* Jump target for end-date problems – the one control covers both dates. */}
      <span id={fieldId("endDate")} className="block">
        <DateRangePicker
          start={form.startDate}
          end={form.endDate}
          min={earliest(today)}
          maxNights={MAX_NIGHTS}
          invalid={Boolean(dateError)}
          onChange={(start, end) => {
            patch({ startDate: start, endDate: end, ...(start && { month: start.slice(0, 7) }) });
            if (end) {
              touch("startDate");
              touch("endDate");
            }
          }}
          onClose={() => {
            touch("startDate");
            touch("endDate");
          }}
        />
      </span>
      {dateError && <div className="mt-2"><ErrorLine text={dateError} /></div>}
    </div>
  );
}

const earliest = (today: string) => {
  if (!today) return "";
  const next = new Date(`${today}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return next.toISOString().slice(0, 10);
};

/* ───────────────────────── 3 · Crew + budget ───────────────────────── */

/**
 * How many people, including the host: 2–10, the exact number (crewSize = spotsTotal, the host counts). Editing never goes below who's in, and
 * adds how many may wait on the waitlist once it's full.
 */
export function CrewStep({ form, patch, errorOf, touch, currency, locked, minSpots, editing, rentNote, maxSpots }: StepProps & { /** "From your rent: …" – a window of the host's own place */ rentNote?: string; /** The host's own place: its free rooms + the host */ maxSpots?: number; currency: Currency; /** Editing a locked place: price and currency live on the Manage page */ locked: boolean; /** The crew already in (editing), host included */ minSpots: number; editing: boolean }) {
  const t = useTranslations("create.house");
  const tKind = useTranslations("create.kind");
  const tVerify = useTranslations("verification");
  // Host fees exist only with the feature (hostPremium).
  const hostFees = useFeatureFlag("hostPremium");
  return (
    <div className="space-y-8">
      <CrewSize form={form} patch={patch} minSpots={minSpots} maxSpots={maxSpots} />
      {errorOf("spotsTotal") && <ErrorLine text={errorOf("spotsTotal")} />}
      {/* Boats: the step's one nudge. */}
      {form.accommodationCategory === CHARTERED_CATEGORY && <p className="-mt-6 text-small text-muted">{tKind("skipper")}</p>}
      {/* The waitlist behind a full House – a detail for later, so only when editing. */}
      {editing && (
        <Group label={t("waitlistMax")}>
          <CapsuleChoice
            label={t("waitlistMax")}
            value={form.waitlistMax}
            onChange={(waitlistMax) => patch({ waitlistMax })}
            options={Array.from({ length: WAITLIST_MAX_LIMIT + 1 }, (_, n) => ({ value: n, label: String(n) }))}
          />
          <p className="mt-2 text-small text-muted">{t("waitlistMaxHint")}</p>
        </Group>
      )}
      {/* Spots for friends: how many spots one person's link may hold for 48h (0 = none) – only when editing. */}
      {editing && (
        <Group label={t("friendSpotsMax")}>
          <CapsuleChoice
            label={t("friendSpotsMax")}
            value={form.friendSpotsMax}
            onChange={(friendSpotsMax) => patch({ friendSpotsMax })}
            options={Array.from({ length: INVITE_POLICY.maxSpotsPerLink + 1 }, (_, n) => ({ value: n, label: String(n) }))}
          />
          <p className="mt-2 text-small text-muted">{t("friendSpotsMaxHint", { hours: INVITE_POLICY.inviteHoldHours })}</p>
        </Group>
      )}
      {editing && (
        <div className="flex items-center justify-between gap-6">
          <div>
            <p className="text-body font-semibold text-ink">{tVerify("verifiedOnly")}</p>
            <p className="mt-1 max-w-[520px] text-small text-muted">{tVerify("verifiedOnlyText")}</p>
          </div>
          <Switch on={form.verifiedGuestsOnly} label={tVerify("verifiedOnly")} onChange={(verifiedGuestsOnly) => patch({ verifiedGuestsOnly })} />
        </div>
      )}
      {locked ? (
        <p className="text-body text-muted">{t("lockedNote")}</p>
      ) : form.placeMode === "set" ? (
        <SetPrice form={form} patch={patch} errorOf={errorOf} touch={touch} currency={currency} rentNote={rentNote} />
      ) : (
        <BudgetFields form={form} patch={patch} errorOf={errorOf} touch={touch} currency={currency} locked={locked} allowOpen={editing} />
      )}
      {!locked && hostFees && <HostFeeField form={form} patch={patch} errorOf={errorOf} touch={touch} currency={currency} />}
    </div>
  );
}

/**
 * "Host fee per guest (optional)" under the price: for hosts who lead the House (coaching, a program, guiding), shown to guests as its own
 * line. Live what the host keeps per guest after Simpulo's cut (FEE_MODEL.hostFeeCommissionPercent). Empty = no host fee.
 */
function HostFeeField({ form, patch, errorOf, touch, currency }: StepProps & { currency: Currency }) {
  const t = useTranslations("create.flow");
  const format = useFormat();
  const fee = form.hostExperience === "program" ? Math.round(Number(form.hostFee)) || 0 : 0;
  return (
    <div id={fieldId("hostFee")} className="space-y-2">
      <FormField label={t("hostFee")} error={errorOf("hostFee")}>
        <AmountInput
          value={form.hostExperience === "program" ? form.hostFee : ""}
          onChange={(v) => patch({ hostFee: v, hostExperience: Number(v) > 0 ? "program" : "rent" })}
          currency={currency}
          label={t("hostFee")}
          invalid={Boolean(errorOf("hostFee"))}
          onBlur={() => touch("hostFee")}
        />
      </FormField>
      <p className="text-small text-muted">{t("hostFeeHint")}</p>
      {fee > 0 && (
        <p className="text-body font-medium text-ink" aria-live="polite">
          {t("hostFeeEarn", { amount: format.price(hostProgrammeEarning(fee), currency), percent: FEE_MODEL.hostFeeCommissionPercent })}
        </p>
      )}
    </div>
  );
}

/**
 * "People, including you": chips 2–8 and "More", which opens a number field without an upper limit. From 20 people a quiet hint (it
 * blocks nothing). Editing never goes below who's in.
 */
function CrewSize({ form, patch, minSpots, maxSpots }: { form: FormState; patch: Patch; minSpots: number; /** The host's own place: no more than its free rooms + the host */ maxSpots?: number }) {
  const t = useTranslations("create.flow");
  const chips = Array.from({ length: SPOTS_CHIPS_MAX - SPOTS_MIN + 1 }, (_, i) => SPOTS_MIN + i).filter((n) => n >= minSpots && (maxSpots === undefined || n <= maxSpots));
  const [more, setMore] = useState(form.spotsTotal > SPOTS_CHIPS_MAX);
  return (
    <div id={fieldId("spotsTotal")}>
      <Group label={t("people")}>
        <div role="radiogroup" aria-label={t("people")} className="flex flex-wrap items-center gap-1.5">
          {chips.map((n) => (
            <PanelCapsule
              key={n}
              role="radio"
              aria-checked={!more && form.spotsTotal === n}
              on={!more && form.spotsTotal === n}
              onClick={() => {
                setMore(false);
                patch({ spotsTotal: n });
              }}
              className="min-w-11 justify-center"
            >
              {n}
            </PanelCapsule>
          ))}
          {(maxSpots === undefined || maxSpots > SPOTS_CHIPS_MAX) && (
            <PanelCapsule role="radio" aria-checked={more} on={more} onClick={() => setMore(true)}>
              {t("more")}
            </PanelCapsule>
          )}
          {more && (
            <input
              autoFocus
              inputMode="numeric"
              aria-label={t("moreLabel")}
              value={form.spotsTotal > 0 ? String(form.spotsTotal) : ""}
              onChange={(e) => patch({ spotsTotal: Number(e.target.value.replace(/\D/g, "")) || 0 })}
              className={cn(formInput, "w-24 tabular-nums")}
            />
          )}
        </div>
      </Group>
      {form.spotsTotal >= SPOTS_BIG && <p className="mt-2 text-small text-muted">{t("bigHouse")}</p>}
    </div>
  );
}

/**
 * A new House, step 6 "How many people, including you?": one large stepper "− 4 +" (2–30; editing never below who's in; the host's own
 * place: at most its free rooms + the host). From 20 people a quiet hint.
 */
export function PeopleStep({ form, patch, errorOf, minSpots, maxSpots }: StepProps & { minSpots: number; maxSpots?: number }) {
  const t = useTranslations("create.flow");
  const min = Math.max(PEOPLE_MIN, minSpots);
  const max = Math.min(PEOPLE_MAX, maxSpots ?? PEOPLE_MAX);
  const value = Math.min(max, Math.max(min, form.spotsTotal || min));
  const btn = "press flex size-14 items-center justify-center rounded-full bg-(--chip-bg) text-ink transition-colors duration-150 hover:bg-(--chip-bg-hover) disabled:cursor-not-allowed disabled:opacity-40";
  return (
    <div id={fieldId("spotsTotal")} className="space-y-4">
      <div role="group" aria-label={t("people")} className="flex items-center gap-6">
        <button type="button" aria-label={t("fewerPeople")} disabled={value <= min} onClick={() => patch({ spotsTotal: value - 1 })} className={btn}>
          <Minus className="size-6" aria-hidden />
        </button>
        <output aria-live="polite" className="min-w-20 text-center text-display tabular-nums text-ink">
          {value}
        </output>
        <button type="button" aria-label={t("morePeople")} disabled={value >= max} onClick={() => patch({ spotsTotal: value + 1 })} className={btn}>
          <Plus className="size-6" aria-hidden />
        </button>
      </div>
      <p className="text-small text-muted">{t("peopleRange", { min, max })}</p>
      {value >= SPOTS_BIG && <p className="text-small text-muted">{t("bigHouse")}</p>}
      <ErrorLine text={errorOf("spotsTotal")} />
    </div>
  );
}

/**
 * A new House, step 7 "Price": one large amount (the place's total with "I have a place", the budget per person – from / to – when it's found
 * together) and the currency as a capsule beside it; live under it "≈ €X per person" – the card's own price (the viewer's currency, the fee
 * included, "est." when it may move). The host fee only behind "Add a host fee".
 */
export function PriceStep({ form, patch, errorOf, touch, currency, rentNote, previewStay, hostFees }: StepProps & { currency: Currency; rentNote?: string; previewStay: Stay; hostFees: boolean }) {
  const t = useTranslations("create.flow");
  const tHouse = useTranslations("create.house");
  const tCommon = useTranslations("common");
  const price = useViewerPrice(previewStay);
  const [feeOpen, setFeeOpen] = useState(form.hostExperience === "program" && Number(form.hostFee) > 0);
  const scale = budgetScaleOf(currency);
  const together = form.placeMode !== "set";
  const fillStart = useEffectEvent(() => patch({ budgetMin: String(scale.start[0]), budgetMax: String(scale.start[1]) }));
  useEffect(() => {
    if (together && !form.budgetTbd && !form.budgetMin && !form.budgetMax) fillStart();
  }, [together, form.budgetTbd, form.budgetMin, form.budgetMax]);
  const currencyPick = (
    <Combobox
      aria-label={t("currency")}
      value={currency}
      options={CURRENCIES.map((code) => ({ value: code, label: code }))}
      onPick={(option) => {
        const next = option.value as Currency;
        if (next === currency) return;
        patch(together ? { currency: next, budgetMin: String(budgetScaleOf(next).start[0]), budgetMax: String(budgetScaleOf(next).start[1]) } : { currency: next });
      }}
    />
  );
  const ready = together ? Number(form.budgetMin) > 0 && Number(form.budgetMax) >= Number(form.budgetMin) : Number(form.totalPrice) > 0;
  return (
    <div className="space-y-5" data-price-step>
      {together ? (
        <div id={fieldId("budget")} className="space-y-2">
          <p className="text-small text-muted">{t("budget")}</p>
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_128px] items-center gap-3" data-amount-big>
            <AmountInput value={form.budgetMin} onChange={(v) => patch({ budgetMin: v })} currency={currency} label={tHouse("budgetFrom")} invalid={Boolean(errorOf("budget"))} onBlur={() => touch("budget")} />
            <AmountInput value={form.budgetMax} onChange={(v) => patch({ budgetMax: v })} currency={currency} label={tHouse("budgetTo")} invalid={Boolean(errorOf("budget"))} onBlur={() => touch("budget")} />
            {currencyPick}
          </div>
          <ErrorLine text={errorOf("budget")} />
        </div>
      ) : (
        <div id={fieldId("totalPrice")} className="space-y-2">
          <p className="text-small text-muted">{t("totalPrice")}</p>
          <div className="grid grid-cols-[minmax(0,1fr)_128px] items-center gap-3" data-amount-big>
            <AmountInput value={form.totalPrice} onChange={(v) => patch({ totalPrice: v })} currency={currency} label={t("totalPrice")} invalid={Boolean(errorOf("totalPrice"))} onBlur={() => touch("totalPrice")} />
            {currencyPick}
          </div>
          {rentNote && <p className="text-small text-muted">{rentNote}</p>}
          <ErrorLine text={errorOf("totalPrice")} />
        </div>
      )}
      {ready && (
        <p aria-live="polite" className="text-h3 tabular-nums text-ink">
          {t("perPersonLive", { price: price.label.replace(/\s*pp$/, "") })}
          {price.estimated && <span className="ml-1.5 text-body font-normal text-muted">{tCommon("estimated")}</span>}
          <span className="mt-1 block text-small font-normal text-muted">{t("perPersonNote", { percent: FEE_MODEL.serviceFeePercent })}</span>
        </p>
      )}
      {hostFees &&
        (feeOpen ? (
          <HostFeeField form={form} patch={patch} errorOf={errorOf} touch={touch} currency={currency} />
        ) : (
          <Button variant="tertiary" size="sm" className="-ml-4" onClick={() => setFeeOpen(true)}>
            <Plus aria-hidden />
            {t("addHostFee")}
          </Button>
        ))}
    </div>
  );
}

/** "I have a place": the total and (optional) the listing; live under it the equal share, and what a guest adds (config/policies). */
function SetPrice({ form, patch, errorOf, touch, currency, rentNote }: StepProps & { currency: Currency; rentNote?: string }) {
  const t = useTranslations("create.flow");
  const format = useFormat();
  const share = placeShare(form);
  const fee = share ? guestFee(share.share, currency) : 0;
  return (
    <div className="space-y-5">
      <div id={fieldId("totalPrice")} className="grid grid-cols-[minmax(0,1fr)_128px] gap-3">
        <FormField label={t("totalPrice")} error={errorOf("totalPrice")}>
          <AmountInput value={form.totalPrice} onChange={(v) => patch({ totalPrice: v })} currency={currency} label={t("totalPrice")} invalid={Boolean(errorOf("totalPrice"))} onBlur={() => touch("totalPrice")} />
        </FormField>
        {rentNote && <p className="col-span-2 -mt-1 text-small text-muted">{rentNote}</p>}
        <FormField label={t("currency")}>
          <Combobox aria-label={t("currency")} value={currency} options={CURRENCIES.map((code) => ({ value: code, label: code }))} onPick={(option) => patch({ currency: option.value as Currency })} />
        </FormField>
      </div>
      {share && (
        <div aria-live="polite">
          <p className="text-h3 tabular-nums text-ink">{t("perPerson", { share: format.price(share.share, currency) })}</p>
          <p className="mt-1 text-small text-muted">{t(share && isMinimumFee(share.share, currency) ? "guestFeeMin" : "guestFee", { percent: FEE_MODEL.serviceFeePercent, fee: format.price(fee, currency) })}</p>
        </div>
      )}
      <FormField label={t("placeLink")}>
        <input inputMode="url" value={form.placeLink} onChange={(e) => patch({ placeLink: e.target.value })} placeholder={t("placeLinkPlaceholder")} className={formInput} />
      </FormField>
    </div>
  );
}

/** Typed amount with the currency symbol inside the field: digits only, no stepper. */
function AmountInput({ id, value, onChange, currency, label, invalid, onBlur }: { id?: string; value: string; onChange: (value: string) => void; currency: Currency; label: string; invalid?: boolean; onBlur?: () => void }) {
  const format = useFormat();
  return (
    <span className="relative block">
      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-body text-muted">{format.currencySymbol(currency)}</span>
      <input
        id={id}
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
        onBlur={onBlur}
        aria-label={label}
        aria-invalid={invalid || undefined}
        placeholder="0"
        className={cn(formInput, "pl-11 tabular-nums")}
      />
    </span>
  );
}

function BudgetFields({ form, patch, errorOf, touch, currency, locked, allowOpen }: StepProps & { currency: Currency; locked: boolean; /** Houses opened with no budget keep that choice when edited; new ones always say a range */ allowOpen: boolean }) {
  const t = useTranslations("create.house");
  const tFlow = useTranslations("create.flow");
  const scale = budgetScaleOf(currency);
  const empty = !form.budgetMin && !form.budgetMax;

  // Fresh budget: start from the currency's typical range, so the slider and the fields agree from the first look.
  const fillStart = useEffectEvent(() => patch({ budgetMin: String(scale.start[0]), budgetMax: String(scale.start[1]) }));
  useEffect(() => {
    if (!locked && !form.budgetTbd && empty) fillStart();
  }, [locked, form.budgetTbd, empty]);

  if (locked) return <p className="text-body text-muted">{t("lockedNote")}</p>;

  const currencies = CURRENCIES.map((code) => ({ value: code, label: code }));

  return (
    <Group label={tFlow("budget")}>
      {allowOpen && (
        <div className="mb-3 flex items-center justify-between gap-3">
          <span className="text-body text-ink">{t("decideTogether")}</span>
          <Switch on={form.budgetTbd} label={t("decideTogether")} onChange={(on) => patch({ budgetTbd: on })} />
        </div>
      )}
      {!form.budgetTbd && (
        <div id={fieldId("budget")} className="space-y-4">
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_128px] gap-3">
            <AmountInput value={form.budgetMin} onChange={(v) => patch({ budgetMin: v })} currency={currency} label={t("budgetFrom")} invalid={Boolean(errorOf("budget"))} onBlur={() => touch("budget")} />
            <AmountInput value={form.budgetMax} onChange={(v) => patch({ budgetMax: v })} currency={currency} label={t("budgetTo")} invalid={Boolean(errorOf("budget"))} onBlur={() => touch("budget")} />
            <Combobox
              aria-label={t("currencyLabel")}
              value={currency}
              options={currencies}
              onPick={(option) => {
                // Another currency means another scale – the range starts over at its defaults.
                const next = option.value as Currency;
                if (next !== currency) patch({ currency: next, budgetMin: String(budgetScaleOf(next).start[0]), budgetMax: String(budgetScaleOf(next).start[1]) });
              }}
            />
          </div>
          {/* No absolute top: the amounts are typed. A wide range only gets a hint, never an error. */}
          {Number(form.budgetMin) > 0 && Number(form.budgetMax) > Number(form.budgetMin) * BUDGET_SPREAD_MAX && <p className="text-small text-muted">{tFlow("budgetSpread")}</p>}
          <ErrorLine text={errorOf("budget")} />
        </div>
      )}
    </Group>
  );
}

/* ───────────────────────── 6 · Make it stand out (optional) ───────────────────────── */

/** How many of "Make it stand out"'s six are there – "Optional details · N of 6 added". */
export function extrasAdded(form: FormState): number {
  const done: Record<ExtraKey, boolean> = {
    description: form.whyText.trim() !== "",
    placePhoto: form.accommodationPhoto !== "",
    languages: form.languages.length > 0,
    who: form.who === "women",
    age: form.ageKey !== "",
    rules: form.rulesText.trim() !== "",
  };
  return EXTRAS.filter((key) => done[key]).length;
}

/** Optional, all on one screen: the description, photos of the place, languages, who, the crew's age and the house rules. */
export function ExtrasStep({ form, patch }: StepProps) {
  const t = useTranslations("create.flow");
  return (
    <div className="space-y-8">
      <FormField label={t("description")}>
        <AutoTextarea rows={3} value={form.whyText} onChange={(e) => patch({ whyText: e.target.value })} placeholder={t("descriptionPlaceholder")} />
      </FormField>
      <Group label={t("placePhoto")}>
        <PlacePhoto value={form.accommodationPhoto} onChange={(accommodationPhoto) => patch({ accommodationPhoto })} />
      </Group>
      <Group label={t("languages")}>
        <LanguageInput languages={form.languages} onChange={(languages) => patch({ languages })} />
      </Group>
      <div className="grid gap-8 sm:grid-cols-2">
        <Group label={t("who")}>
          <CapsuleChoice
            label={t("who")}
            value={form.who === "women" ? "women" : null}
            onChange={(who) => patch({ who: who === "women" ? "women" : "mixed" })}
            options={[
              { value: null, label: t("whoMixed") },
              { value: "women", label: t("whoWomen") },
            ]}
          />
        </Group>
        <Group label={t("age")}>
          <CapsuleChoice
            label={t("age")}
            value={form.ageKey || null}
            onChange={(ageKey) => patch({ ageKey: ageKey ?? "" })}
            options={[
              { value: null, label: t("ageAny") },
              { value: "18-25" as const, label: "18–25" },
              { value: "25-35" as const, label: "25–35" },
              { value: "35+" as const, label: "35+" },
            ]}
          />
        </Group>
      </div>
      <FormField label={t("rules")}>
        <AutoTextarea rows={3} value={form.rulesText} onChange={(e) => patch({ rulesText: e.target.value })} placeholder={t("rulesPlaceholder")} />
      </FormField>
    </div>
  );
}

/* ───────────────────────── About the space (optional) ───────────────────────── */

/** A number for the space: digits only, empty = not answered, kept within its bounds. */
function SpaceNumber({ label, value, onChange, min, max, suffix }: { label: string; value: number | undefined; onChange: (value: number | undefined) => void; min: number; max: number; suffix?: string }) {
  const id = useId();
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <label htmlFor={id} className="text-small text-muted">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          id={id}
          inputMode="numeric"
          pattern="[0-9]*"
          className={cn(formInput, "w-full min-w-0 max-w-[min(160px,100%)]")}
          value={value ?? ""}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, "").slice(0, 5);
            onChange(digits === "" ? undefined : Number(digits));
          }}
          onBlur={() => value !== undefined && onChange(Math.min(max, Math.max(min, value)))}
        />
        {suffix && <span className="text-body text-muted">{suffix}</span>}
      </div>
    </div>
  );
}

/**
 * A count as a stepper "− 3 +" (bedrooms, bathrooms, seats at the table): no free typing. Empty = not answered ("–"); the first + gives the
 * minimum, − at the minimum takes the answer back; never past the maximum (config/space.ts SPACE_LIMITS).
 */
function SpaceStepper({ label, value, onChange, min, max }: { label: string; value: number | undefined; onChange: (value: number | undefined) => void; min: number; max: number }) {
  const t = useTranslations("create.space");
  const id = useId();
  const btn = "press flex size-10 items-center justify-center rounded-full bg-(--chip-bg) text-ink transition-colors duration-150 hover:bg-(--chip-bg-hover) disabled:cursor-not-allowed disabled:opacity-40";
  return (
    <div role="group" aria-labelledby={id} className="flex min-w-0 flex-col gap-2">
      <span id={id} className="text-small text-muted">
        {label}
      </span>
      <div className="flex items-center gap-2">
        <button type="button" aria-label={t("stepDown", { label })} disabled={value === undefined} onClick={() => onChange(value === undefined || value <= min ? undefined : value - 1)} className={btn}>
          <Minus className="size-4" aria-hidden />
        </button>
        <output aria-live="polite" className="min-w-10 text-center text-body-lg font-semibold tabular-nums text-ink">
          {value ?? "–"}
        </output>
        <button type="button" aria-label={t("stepUp", { label })} disabled={value !== undefined && value >= max} onClick={() => onChange(value === undefined ? Math.max(min, 1) : Math.min(max, value + 1))} className={btn}>
          <Plus className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}

/** One answer from a few; tapping the chosen one again takes it back (nothing is required). */
function SpaceChoice<T extends string>({ label, options, value, onChange, labelOf }: { label: string; options: readonly T[]; value: T | undefined; onChange: (value: T | undefined) => void; labelOf: (option: T) => string }) {
  return (
    <Group label={label}>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <PanelCapsule key={option} on={value === option} aria-pressed={value === option} onClick={() => onChange(value === option ? undefined : option)}>
            {labelOf(option)}
          </PanelCapsule>
        ))}
      </div>
    </Group>
  );
}

/**
 * "About the space" (optional, right after "Where and when?"; editing: a detail): rooms, shared spaces, the kitchen, the biggest table, the
 * way to the bathroom, a quiet corner, size, light, setting – every answer optional, nothing about people (config/space.ts). The House
 * page shows bedrooms, bathrooms, own/shared rooms, outdoor space and the kitchen; the rest stays with us (model "Raum-Wirkung").
 */
export function SpaceStep({ form, patch }: StepProps) {
  const t = useTranslations("create.space");
  const space = form.space;
  const set = (next: Partial<HouseSpace>) => patch({ space: { ...space, ...next } });
  const yesNo = ["yes", "no"] as const;
  const fromBool = (v: boolean | undefined) => (v === undefined ? undefined : v ? "yes" : "no");
  const toBool = (v: "yes" | "no" | undefined) => (v === undefined ? undefined : v === "yes");
  return (
    <div className="space-y-8">
      <p className="text-body text-muted">{t("intro")}</p>
      <section className="space-y-5">
        <h2 className="text-h3 text-ink">{t("roomsTitle")}</h2>
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(140px,100%),1fr))]">
          <SpaceStepper label={t("bedrooms")} value={space.bedrooms} onChange={(bedrooms) => set({ bedrooms })} {...SPACE_LIMITS.rooms} />
          <SpaceStepper label={t("bathrooms")} value={space.bathrooms} onChange={(bathrooms) => set({ bathrooms })} {...SPACE_LIMITS.rooms} />
        </div>
        <SpaceChoice label={t("rooms")} options={ROOM_KINDS} value={space.rooms} onChange={(rooms) => set({ rooms })} labelOf={(o) => t(`roomKinds.${o}`)} />
      </section>
      <section className="space-y-5">
        <h2 className="text-h3 text-ink">{t("sharedTitle")}</h2>
        <Group label={t("shared")}>
          <div className="flex flex-wrap gap-2">
            {SHARED_SPACES.map((option) => {
              const on = space.shared?.includes(option) ?? false;
              return (
                <PanelCapsule key={option} on={on} aria-pressed={on} onClick={() => set({ shared: on ? (space.shared ?? []).filter((s) => s !== option) : [...(space.shared ?? []), option] })}>
                  {t(`sharedSpaces.${option}`)}
                </PanelCapsule>
              );
            })}
          </div>
        </Group>
        <SpaceChoice label={t("outdoor")} options={OUTDOORS} value={space.outdoor} onChange={(outdoor) => set({ outdoor })} labelOf={(o) => t(`outdoors.${o}`)} />
        <SpaceChoice label={t("kitchen")} options={KITCHENS} value={space.kitchen} onChange={(kitchen) => set({ kitchen })} labelOf={(o) => t(`kitchens.${o}`)} />
      </section>
      <section className="space-y-5">
        <h2 className="text-h3 text-ink">{t("togetherTitle")}</h2>
        <SpaceChoice label={t("table")} options={TABLE_SPOTS} value={space.table} onChange={(table) => set({ table, ...(table === "none" ? { seats: undefined } : {}) })} labelOf={(o) => t(`tables.${o}`)} />
        {space.table !== "none" && <SpaceStepper label={t("seats")} value={space.seats} onChange={(seats) => set({ seats })} {...SPACE_LIMITS.seats} />}
        <SpaceChoice label={t("bathThroughShared")} options={yesNo} value={fromBool(space.bathThroughShared)} onChange={(v) => set({ bathThroughShared: toBool(v) })} labelOf={(o) => t(`answers.${o}`)} />
        <SpaceChoice label={t("retreat")} options={yesNo} value={fromBool(space.retreat)} onChange={(v) => set({ retreat: toBool(v) })} labelOf={(o) => t(`answers.${o}`)} />
      </section>
      <section className="space-y-5">
        <h2 className="text-h3 text-ink">{t("placeTitle")}</h2>
        <SpaceNumber label={t("area")} value={space.area} onChange={(area) => set({ area })} {...SPACE_LIMITS.area} suffix={t("areaUnit")} />
        <SpaceChoice label={t("daylight")} options={DAYLIGHT} value={space.daylight} onChange={(daylight) => set({ daylight })} labelOf={(o) => t(`daylights.${o}`)} />
        <SpaceChoice label={t("setting")} options={SETTINGS} value={space.setting} onChange={(setting) => set({ setting })} labelOf={(o) => t(`settings.${o}`)} />
      </section>
      <p className="text-small text-muted">{t("visibility")}</p>
    </div>
  );
}

/* ───────────────────────── 5 · Cover + title ───────────────────────── */

const COVER_MAX_WIDTH = 1600;

/** A picked photo as a data URL, scaled down: it has to survive in the draft. */
async function fileToPhoto(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, COVER_MAX_WIDTH / bitmap.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.8);
}

/** "Pick a cover": your own photos (up to six, the first is the cover) or one that fits the theme and place. Then the title and the card note. */
export function CoverStep({ form, patch, errorOf, touch, suggestions }: StepProps & { suggestions: string[] }) {
  const t = useTranslations("create.cover");
  const tHouse = useTranslations("create.house");
  const tPitch = useTranslations("create.pitch");
  const titles = useTitleSuggestions(form, TITLE_MAX_NEW);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  // The title starts as "{Theme} House {Place}", yours to change.
  const fillTitle = useEffectEvent(() => {
    if (!form.title && titles[0]) patch({ title: titles[0] });
  });
  useEffect(() => fillTitle(), []);

  async function add(files: FileList | null) {
    const images = [...(files ?? [])].filter((file) => file.type.startsWith("image/")).slice(0, MAX_COVER_PHOTOS);
    // A file that can't be read as an image is simply left out.
    const results = await Promise.allSettled(images.map(fileToPhoto));
    const photos = results.flatMap((result) => (result.status === "fulfilled" ? [result.value] : []));
    patch({ photos: [...form.photos, ...photos].slice(0, MAX_COVER_PHOTOS) });
    touch("photos");
  }
  const pickSuggestion = (src: string) => {
    patch({ photos: form.photos.includes(src) ? form.photos.filter((photo) => photo !== src) : [src, ...form.photos].slice(0, MAX_COVER_PHOTOS) });
    touch("photos");
  };

  return (
    <div className="space-y-5">
      <div id={fieldId("photos")} className="space-y-3">
        <div className={cn("grid gap-4", suggestions.length > 0 && "sm:grid-cols-2")}>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              void add(e.dataTransfer.files);
            }}
            className={cn("flex min-h-48 flex-col items-center justify-center gap-2 rounded-3xl p-6 text-center transition-colors duration-150 max-md:min-h-40", dragging ? "bg-ink/10" : "bg-ink/5 hover:bg-ink/8")}
          >
            <ImagePlus className="size-6 text-muted" aria-hidden />
            {/* Phones: no dragging – the photo library (accept="image/*", several at once). */}
            <span className="text-body font-semibold text-ink max-md:hidden">{t("drop")}</span>
            <span className="text-small text-muted max-md:hidden">{t("dropHint", { max: MAX_COVER_PHOTOS })}</span>
            <span className="text-body font-semibold text-ink md:hidden">{t("pickPhotos")}</span>
            <span className="text-small text-muted md:hidden">{t("pickPhotosHint", { max: MAX_COVER_PHOTOS })}</span>
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => {
              void add(e.target.files);
              e.target.value = "";
            }}
          />
          {suggestions.length > 0 && (
            <div>
              <p className="mb-2 text-small text-muted">{t("suggestions")}</p>
              <div role="group" aria-label={t("suggestions")} className="grid grid-cols-3 gap-2">
                {suggestions.map((src, i) => {
                  const chosen = form.photos.includes(src);
                  return (
                    <button key={src} type="button" aria-pressed={chosen} aria-label={t("suggestion", { number: i + 1 })} onClick={() => pickSuggestion(src)} className="relative block aspect-4/3 overflow-hidden rounded-2xl bg-ink/5">
                      <Img src={src} alt="" fill sizes="120px" className="object-cover" />
                      {chosen && (
                        <span className="absolute right-1.5 top-1.5 flex size-6 items-center justify-center rounded-full bg-(--select-bg)">
                          <ChipCheck />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        {form.photos.length > 0 && (
          // Phones: the own photos as a grid of three (3:4), the first one the cover.
          <ul aria-label={t("yours")} className="flex flex-wrap gap-2 max-md:grid max-md:grid-cols-3">
            {form.photos.map((src, i) => (
              <li key={src} className="relative">
                <button type="button" disabled={i === 0} onClick={() => patch({ photos: [src, ...form.photos.filter((photo) => photo !== src)] })} aria-label={i === 0 ? t("isCover") : t("makeCover")} className="relative block h-20 w-15 overflow-hidden rounded-xl bg-ink/5 max-md:aspect-3/4 max-md:h-auto max-md:w-full">
                  <Img src={src} alt="" fill sizes="60px" className="object-cover" />
                  {i === 0 && <span className="absolute inset-x-0 bottom-0 bg-shade/45 py-0.5 text-center text-small text-on-image">{t("cover")}</span>}
                </button>
                <button type="button" onClick={() => patch({ photos: form.photos.filter((photo) => photo !== src) })} aria-label={t("remove")} className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-surface text-ink shadow-(--shadow-sm)">
                  <X className="size-3" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
        <ErrorLine text={errorOf("photos")} />
      </div>
      <FormField id={fieldId("title")} label={tHouse("title")} error={errorOf("title")} aside={<span className="text-small tabular-nums text-muted">{tHouse("titleCount", { count: form.title.length, max: TITLE_MAX_NEW })}</span>}>
        <input className={formInput} value={form.title} onChange={(e) => patch({ title: e.target.value })} onBlur={() => touch("title")} placeholder={titles[0] ?? tHouse("titlePlaceholder")} maxLength={TITLE_MAX_NEW} aria-invalid={Boolean(errorOf("title")) || undefined} />
      </FormField>
    </div>
  );
}

/* ───────────────────────── Ready to open? ───────────────────────── */

/** What the four answers came to, each with its way back. */
export function ReadySummary({ rows, onEdit }: { rows: Array<{ key: string; label: string; value: string; step: StepKey }>; onEdit: (step: StepKey) => void }) {
  const t = useTranslations("create.ready");
  return (
    // A calm list: one line per answer – the label muted, the answer, "Edit" back to its step.
    <dl className="divide-y divide-ink/6">
      {rows.map(({ key, label, value, step }) => (
        <div key={key} className="flex min-h-11 items-center gap-4 py-0.5">
          <dt className="w-32 shrink-0 text-small text-muted">{label}</dt>
          <dd className="min-w-0 flex-1 truncate text-body font-semibold text-ink">{value}</dd>
          <Button variant="tertiary" size="sm" onClick={() => onEdit(step)} aria-label={t("editLabel", { label })}>
            {t("edit")}
          </Button>
        </div>
      ))}
    </dl>
  );
}

/** The optional details by group: what's there in muted after the name, an accent check once it's done, "Add" while it's empty. */
export function OptionalList({ form, details, invalid, onOpen }: { form: FormState; details: DetailKey[]; invalid: StepKey[]; onOpen: (step: DetailKey) => void }) {
  const t = useTranslations("create.details");
  const tReady = useTranslations("create.ready");
  const summary = useDetailSummary(form);
  return (
    <div className="space-y-6">
      {OPTIONAL_GROUPS.map((group) => {
        const rows = group.details.filter((key) => details.includes(key));
        if (rows.length === 0) return null;
        return (
          <section key={group.key} aria-label={tReady(`groups.${group.key}`)}>
            <h2 className="mb-1 text-eyebrow uppercase text-ink/55">{tReady(`groups.${group.key}`)}</h2>
            <ul>
              {rows.map((key) => {
                const done = detailDone(key, form);
                const value = summary(key);
                return (
                  <li key={key}>
                    <button type="button" onClick={() => onOpen(key)} className="-mx-3 flex min-h-11 w-[calc(100%+24px)] items-center gap-2 rounded-2xl px-3 text-left transition-colors duration-150 hover:bg-(--chip-bg)">
                      <span className="flex w-4 shrink-0 justify-center">{done && <ChipCheck />}</span>
                      <span className="min-w-0 flex-1 truncate text-body text-ink">
                        {t(`rows.${key}`)}
                        {value && <span className="text-muted"> · {value}</span>}
                      </span>
                      {invalid.includes(key) ? <span className="shrink-0 text-small text-danger">{t("fix")}</span> : !done && <span className="shrink-0 text-small font-semibold text-ink">{tReady("add")}</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

/* ───────────────────────── Details (optional) ───────────────────────── */

export function TitleDetail({ form, patch, errorOf, touch, titleMax }: StepProps & { titleMax: number }) {
  const t = useTranslations("create.house");
  const tPitch = useTranslations("create.pitch");
  const titles = useTitleSuggestions(form, titleMax);
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <FormField id={fieldId("title")} label={t("title")} error={errorOf("title")} aside={<span className="text-small tabular-nums text-muted">{t("titleCount", { count: form.title.length, max: titleMax })}</span>}>
          <input className={formInput} value={form.title} onChange={(e) => patch({ title: e.target.value })} onBlur={() => touch("title")} placeholder={titles[0] ?? t("titlePlaceholder")} maxLength={titleMax} aria-invalid={Boolean(errorOf("title")) || undefined} />
        </FormField>
        {titles.length > 0 && (
          <div role="group" aria-label={t("titleSuggestions")} className="flex flex-wrap gap-2">
            {titles.map((title) => (
              <PanelCapsule key={title} on={form.title === title} aria-pressed={form.title === title} onClick={() => patch({ title })}>
                {title}
              </PanelCapsule>
            ))}
          </div>
        )}
      </div>
      <div className="space-y-3">
        <FormField label={t("cardNote")} optional aside={<span className="text-small tabular-nums text-muted">{tPitch("hostNoteCount", { count: form.hostNote.length, max: HOST_NOTE_MAX })}</span>}>
          <input className={formInput} value={form.hostNote} maxLength={HOST_NOTE_MAX} onChange={(e) => patch({ hostNote: e.target.value })} placeholder={tPitch("hostNotePlaceholder")} />
        </FormField>
        <div className="flex flex-wrap gap-2">
          {(tPitch.raw("hostNoteExamples") as string[]).map((example) => (
            <PanelCapsule key={example} on={form.hostNote === example} aria-pressed={form.hostNote === example} onClick={() => patch({ hostNote: example })}>
              {example}
            </PanelCapsule>
          ))}
        </div>
      </div>
    </div>
  );
}

export function PhotosDetail({ form, patch }: StepProps) {
  return <PhotoUploader photos={form.photos} onChange={(photos) => patch({ photos })} slots={5} labels="house" />;
}

export function WhyDetail({ form, patch }: StepProps) {
  const t = useTranslations("create.pitch");
  const tRows = useTranslations("create.extras.rows");
  return (
    <div className="space-y-5">
      <FormField label={tRows("why")}>
        <AutoTextarea value={form.whyText} onChange={(e) => patch({ whyText: e.target.value })} placeholder={t("whyPlaceholder")} />
      </FormField>
      <FormField label={tRows("day")}>
        <AutoTextarea value={form.dayText} onChange={(e) => patch({ dayText: e.target.value })} placeholder={t("dayPlaceholder")} />
      </FormField>
    </div>
  );
}

/** A deadline for the vote, the proposals' optional last word. */
function DeadlineField({ value, onChange, min }: { value: string; onChange: (value: string) => void; min: string }) {
  const t = useTranslations("create.vote");
  return (
    <FormField label={t("deadline")} optional>
      <input type="date" className={cn(formInput, "max-w-56")} value={value} min={min} onChange={(e) => onChange(e.target.value)} />
    </FormField>
  );
}

/** Exact dates, or 1–3 ranges for the crew to vote on. */
export function DatesDetail({ form, patch, errorOf, touch, today }: StepProps & { today: string }) {
  const t = useTranslations("create.vote");
  const proposals = form.dateProposals;
  const setMode = (datesMode: FormState["datesMode"]) =>
    patch({ datesMode, ...(datesMode === "crew" && proposals.length === 0 && { dateProposals: [{ id: newId(), start: "", end: "" }] }) });
  return (
    <div className="space-y-6">
      <CapsuleChoice
        label={t("datesLabel")}
        value={form.datesMode}
        onChange={setMode}
        options={[
          { value: "month", label: t("monthOnly") },
          { value: "exact", label: t("exact") },
          { value: "crew", label: t("decideWithCrew") },
        ]}
      />
      {form.datesMode === "exact" && <ExactDates form={form} patch={patch} errorOf={errorOf} touch={touch} today={today} />}
      {form.datesMode === "crew" && (
        <div id={fieldId("dateProposals")} className="space-y-4">
          <p className="text-body text-muted">{t("explainDates")}</p>
          {proposals.map((proposal, i) => (
            <div key={proposal.id} className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <DateRangePicker
                  start={proposal.start}
                  end={proposal.end}
                  min={earliest(today)}
                  maxNights={MAX_NIGHTS}
                  onChange={(start, end) => patch({ dateProposals: proposals.map((p) => (p.id === proposal.id ? { ...p, start, end } : p)) })}
                  onClose={() => touch("dateProposals")}
                />
              </div>
              {proposals.length > 1 && (
                <Button variant="tertiary" size="md" icon onClick={() => patch({ dateProposals: proposals.filter((p) => p.id !== proposal.id) })} aria-label={t("remove", { number: i + 1 })}>
                  <X />
                </Button>
              )}
            </div>
          ))}
          {proposals.length < MAX_PROPOSALS && (
            <Button variant="tertiary" onClick={() => patch({ dateProposals: [...proposals, { id: newId(), start: "", end: "" }] })}>
              <Plus />
              {t("add")}
            </Button>
          )}
          <ErrorLine text={errorOf("dateProposals")} />
          <DeadlineField value={form.datesDeadline} onChange={(datesDeadline) => patch({ datesDeadline })} min={earliest(today)} />
        </div>
      )}
    </div>
  );
}

/** The place: the host sorts it out later, or the crew votes on 1–3 links with a price. */
/** "Add a photo of the place" (optional): the accommodation tile on the House page uses it when the listing's link has no picture. */
function PlacePhoto({ value, onChange }: { value: string; onChange: (photo: string) => void }) {
  const t = useTranslations("create.house");
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="flex items-center gap-4">
      {value && <Img src={value} alt="" width={64} height={64} className="size-16 shrink-0 rounded-2xl object-cover" />}
      <Button variant="tertiary" className="-ml-4" onClick={() => inputRef.current?.click()}>
        <ImagePlus aria-hidden />
        {value ? t("placePhotoChange") : t("placePhoto")}
      </Button>
      {value && (
        <Button variant="tertiary" onClick={() => onChange("")}>
          {t("placePhotoRemove")}
        </Button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void fileToPhoto(file).then(onChange, () => {});
        }}
      />
    </div>
  );
}

export function AccommodationDetail({ form, patch, errorOf, touch, currency, locked, today }: StepProps & { currency: Currency; locked: boolean; today: string }) {
  const t = useTranslations("create.vote");
  const tHouse = useTranslations("create.house");
  const proposals = form.placeProposals;
  if (locked) return <p className="text-body text-muted">{tHouse("lockedNote")}</p>;
  const setMode = (accommodationMode: FormState["accommodationMode"]) =>
    patch({ accommodationMode, ...(accommodationMode === "crew" && proposals.length === 0 && { placeProposals: [{ id: newId(), link: "", price: "" }] }) });
  return (
    <div className="space-y-6">
      <CapsuleChoice
        label={t("placeLabel")}
        value={form.accommodationMode}
        onChange={setMode}
        options={[
          { value: "later", label: t("later") },
          { value: "crew", label: t("decideWithCrew") },
        ]}
      />
      {form.accommodationMode === "later" && <p className="text-body text-muted">{t("explainLater")}</p>}
      <PlacePhoto value={form.accommodationPhoto} onChange={(accommodationPhoto) => patch({ accommodationPhoto })} />
      {form.accommodationMode === "crew" && (
        <div id={fieldId("placeProposals")} className="space-y-4">
          <p className="text-body text-muted">{t("explainPlace")}</p>
          {proposals.map((proposal, i) => {
            const set = (change: Partial<typeof proposal>) => patch({ placeProposals: proposals.map((p) => (p.id === proposal.id ? { ...p, ...change } : p)) });
            const link = proposal.link.trim();
            return (
              <div key={proposal.id}>
                <div className="grid grid-cols-[minmax(0,1fr)_128px_auto] items-center gap-2">
                  <input type="url" inputMode="url" aria-label={t("linkLabel", { number: i + 1 })} className={formInput} value={proposal.link} onChange={(e) => set({ link: e.target.value })} onBlur={() => touch("placeProposals")} placeholder="https://www.airbnb.com/rooms/…" />
                  <AmountInput value={proposal.price} onChange={(price) => set({ price })} currency={currency} label={t("priceLabel", { number: i + 1 })} onBlur={() => touch("placeProposals")} />
                  {proposals.length > 1 ? (
                    <Button variant="tertiary" size="md" icon onClick={() => patch({ placeProposals: proposals.filter((p) => p.id !== proposal.id) })} aria-label={t("remove", { number: i + 1 })}>
                      <X />
                    </Button>
                  ) : (
                    <span aria-hidden className="size-11" />
                  )}
                </div>
                {link && isLink(link) && <p className="mt-1 text-small text-muted">{linkDomain(link)}</p>}
              </div>
            );
          })}
          <p className="text-small text-muted">{t("pricePerPerson")}</p>
          {proposals.length < MAX_PROPOSALS && (
            <Button variant="tertiary" onClick={() => patch({ placeProposals: [...proposals, { id: newId(), link: "", price: "" }] })}>
              <Plus />
              {t("add")}
            </Button>
          )}
          <ErrorLine text={errorOf("placeProposals")} />
          <DeadlineField value={form.accommodationDeadline} onChange={(accommodationDeadline) => patch({ accommodationDeadline })} min={earliest(today)} />
        </div>
      )}
    </div>
  );
}

/** Same flow for everyone: a program is one more detail, up to 30 % of the share. */
export function HostDetail({ form, patch, errorOf, touch, currency, allowed }: StepProps & { currency: Currency; /** Only hosts who may charge one can offer a program */ allowed: boolean }) {
  const t = useTranslations("create.host");
  const format = useFormat();
  if (!allowed) return <p className="text-body text-muted">{t("proOnly")}</p>;
  const program = form.hostExperience === "program";
  const fee = Math.round(Number(form.hostFee)) || 0;
  const earning = hostProgrammeEarning(fee);
  return (
    <div className="space-y-5">
      <CapsuleChoice
        label={t("label")}
        value={form.hostExperience}
        onChange={(hostExperience) => patch({ hostExperience })}
        options={[
          { value: "rent", label: t("rent.title") },
          { value: "program", label: t("program.title") },
        ]}
      />
      <p className="text-body text-muted">{t(`${form.hostExperience}.text`)}</p>
      {program && (
        <div className="space-y-3">
          <FormField label={t("amount")} error={errorOf("hostFee")}>
            <AmountInput id={fieldId("hostFee")} value={form.hostFee} onChange={(v) => patch({ hostFee: v })} currency={currency} label={t("amount")} invalid={Boolean(errorOf("hostFee"))} onBlur={() => touch("hostFee")} />
          </FormField>
          {fee > 0 && (
            <p className="text-body font-medium text-ink" aria-live="polite">
              {t("earn", { amount: format.price(earning, currency), total: format.price(earning * Math.max(0, form.spotsTotal - 1), currency) })}
            </p>
          )}
          <p className="text-small text-muted">{t("note")}</p>
        </div>
      )}
    </div>
  );
}

export function LookingForDetail({ form, patch, errorOf, touch }: StepProps) {
  const t = useTranslations("create.pitch");
  const tStarters = useTranslations("create.starters");
  const starters = (tStarters.raw(`${suggestionVibe(form)}.lookingFor`) as string[]).slice(0, 3);
  const ref = useRef<HTMLTextAreaElement>(null);

  /** Adds a starter (after what's there) and puts the cursor at the end, ready to finish the sentence. */
  function insert(starter: string) {
    const current = form.lookingForText.trimEnd();
    patch({ lookingForText: (current ? `${current} ${starter}` : starter).slice(0, LOOKING_FOR_MAX) });
    requestAnimationFrame(() => {
      const el = ref.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    });
  }

  return (
    <div className="space-y-3">
      <FormField id={fieldId("lookingForText")} label={t("lookingFor")} error={errorOf("lookingForText")} aside={<span className="text-small tabular-nums text-muted">{t("lookingForCount", { count: form.lookingForText.length, max: LOOKING_FOR_MAX })}</span>}>
        <AutoTextarea ref={ref} rows={3} maxLength={LOOKING_FOR_MAX} value={form.lookingForText} onChange={(e) => patch({ lookingForText: e.target.value })} onBlur={() => touch("lookingForText")} placeholder={t("lookingForPlaceholder")} aria-invalid={Boolean(errorOf("lookingForText")) || undefined} />
      </FormField>
      <div role="group" aria-label={t("startWith")} className="flex flex-wrap gap-2">
        {starters.map((starter) => (
          <PanelCapsule key={starter} on={false} aria-pressed={false} onClick={() => insert(starter)}>
            {`${starter.replace(/[\s–-]+$/, "")}…`}
          </PanelCapsule>
        ))}
      </div>
    </div>
  );
}

export function RulesDetail({ form, patch }: StepProps) {
  const t = useTranslations("create.house");
  return (
    <FormField label={t("rulesLabel")} helper={t("rulesHelper")}>
      <AutoTextarea rows={4} value={form.rulesText} onChange={(e) => patch({ rulesText: e.target.value })} placeholder={t("rulesPlaceholder")} />
    </FormField>
  );
}

export function LanguagesDetail({ form, patch }: StepProps) {
  return <LanguageInput languages={form.languages} onChange={(languages) => patch({ languages })} />;
}

export function CrewGroupDetail({ form, patch, errorOf, touch }: StepProps) {
  const t = useTranslations("create.house");
  return (
    <FormField id={fieldId("crewGroupUrl")} label={t("crewGroupUrl")} error={errorOf("crewGroupUrl")}>
      <input className={formInput} value={form.crewGroupUrl} onChange={(e) => patch({ crewGroupUrl: e.target.value })} onBlur={() => touch("crewGroupUrl")} placeholder="https://chat.whatsapp.com/…" inputMode="url" autoCapitalize="none" autoCorrect="off" spellCheck={false} aria-invalid={Boolean(errorOf("crewGroupUrl")) || undefined} />
    </FormField>
  );
}

/* ───────────────────────── The list of details ───────────────────────── */

function DetailRow({ title, value, done, invalid, onOpen }: { title: string; value?: string; done: boolean; invalid?: boolean; onOpen: () => void }) {
  const t = useTranslations("create.details");
  return (
    <li>
      <button type="button" onClick={onOpen} className="flex min-h-14 w-full items-center gap-3 rounded-2xl py-2 text-left outline-none transition-colors hover:text-ink focus-visible:ring-2 focus-visible:ring-ink/25">
        <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-full", done ? "bg-(--select-bg)" : "bg-ink/5")}>{done && <ChipCheck />}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-body font-medium text-ink">{title}</span>
          {invalid ? <span className="block text-small text-danger">{t("fix")}</span> : value && <span className="block truncate text-small text-muted">{value}</span>}
        </span>
        <ChevronRight className="size-4 shrink-0 text-muted" aria-hidden />
      </button>
    </li>
  );
}

/** "Add details": each with its check. Editing also lists the three required answers on top. */
export function DetailsList({ form, details, required, invalid, onOpen }: { form: FormState; details: DetailKey[]; required?: Array<{ step: StepKey; value: string }>; invalid: StepKey[]; onOpen: (step: StepKey) => void }) {
  const t = useTranslations("create.details");
  const summary = useDetailSummary(form);
  return (
    <ul>
      {required?.map(({ step, value }) => <DetailRow key={step} title={t(`rows.${step as "vibe"}`)} value={value} done={!invalid.includes(step)} invalid={invalid.includes(step)} onOpen={() => onOpen(step)} />)}
      {details.map((key) => <DetailRow key={key} title={t(`rows.${key}`)} value={summary(key)} done={detailDone(key, form)} invalid={invalid.includes(key)} onOpen={() => onOpen(key)} />)}
    </ul>
  );
}

function useDetailSummary(form: FormState) {
  const t = useTranslations("create.vote");
  const tSpace = useTranslations("create.space");
  const monthName = useMonthName();
  return (key: DetailKey): string | undefined => {
    if (key === "title") return form.title.trim() || undefined;
    if (key === "photos" && form.photos.length > 0) return String(form.photos.length);
    if (key === "languages") return form.languages.join(", ") || undefined;
    if (key === "dates") return form.datesMode === "crew" ? t("decideWithCrew") : form.datesMode === "month" && form.month ? monthName(form.month) : undefined;
    if (key === "accommodation" && form.accommodationMode === "crew") return t("decideWithCrew");
    if (key === "rules") return form.rulesText.split("\n").find((rule) => rule.trim());
    if (key === "why") return form.whyText.trim() || undefined;
    if (key === "lookingFor") return form.lookingForText.trim() || undefined;
    if (key === "space" && spaceAnswered(form.space) > 0) return tSpace("answered", { count: spaceAnswered(form.space), total: SPACE_FIELDS.length });
    return undefined;
  };
}

/** No photo or name: publishing waits for them. */
export function ProfileNote({ me }: { me?: User }) {
  const t = useTranslations("create.publish.profile");
  if (!me) return <p className="text-small text-muted">{t("loggedOut")}</p>;
  const missing = [!me.photos[0] && t("photo"), !me.name.trim() && t("name")].filter((item): item is string => Boolean(item));
  if (missing.length === 0) return null;
  return (
    <p role="alert" className="flex flex-wrap items-center gap-3 text-small text-danger">
      <Avatar user={me} size="sm" />
      {t("hint", { items: missing.join(" & ") })}
      <Button variant="tertiary" href="/settings/profile">
        {t("edit")}
      </Button>
    </p>
  );
}

/** Three title ideas from vibe + place + duration ("Fitness House Canggu", "Canggu Fitness Month", "Two Weeks of Training in Bali"). */
export function useTitleSuggestions(form: FormState, titleMax: number): string[] {
  const t = useTranslations("create.house");
  const customLabel = form.customVibe?.trim();
  const vibe: Vibe | "" = form.customVibe !== null ? (customLabel ? "social" : "") : form.vibe;
  const region = regionShortName(form.region);
  if (!vibe || !region) return [];
  const place = form.city.trim() || region;
  const vibeWord = customLabel ? customLabel.replace(/^\p{Ll}/u, (c) => c.toUpperCase()) : t(`titleVibes.${vibe}`);
  const activity = customLabel || t(`activities.${vibe}`);
  const nights = form.datesMode === "exact" && form.startDate && form.endDate ? nightsBetween(form.startDate, form.endDate) : 0;
  const period = nights >= 25 && nights <= 35 ? "month" : nights >= 5 && nights <= 9 ? "week" : "other";
  const duration = durationKey(nights);
  const ideas = [
    t("titleTemplates.house", { vibe: vibeWord, place }),
    t("titleTemplates.period", { place, vibe: vibeWord, period: t(`periods.${period}`) }),
    nights > 0
      ? t("titleTemplates.of", { duration: duration ? t(`durations.${duration}`) : t("durations.nights", { count: nights }), activity, region })
      : t("titleTemplates.ofNoDates", { activity, region }),
  ];
  return Array.from(new Set(ideas.filter((idea) => idea.length <= titleMax)));
}

function durationKey(nights: number) {
  if (nights >= 6 && nights <= 8) return "week";
  if (nights >= 13 && nights <= 15) return "twoWeeks";
  if (nights >= 20 && nights <= 22) return "threeWeeks";
  if (nights >= 27 && nights <= 31) return "month";
  if (nights >= 58 && nights <= 62) return "twoMonths";
  return null;
}

/** Textarea that starts at 3 rows (or `rows`) and grows with its text. */
function AutoTextarea({ ref, rows = 3, ...props }: Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "className"> & { ref?: Ref<HTMLTextAreaElement> }) {
  const own = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = own.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight + el.offsetHeight - el.clientHeight}px`;
  }, [props.value]);
  return (
    <textarea
      ref={(el) => {
        own.current = el;
        if (typeof ref === "function") ref(el);
        else if (ref) ref.current = el;
      }}
      rows={rows}
      className={formTextarea}
      {...props}
    />
  );
}

/* ───────────────────────── Invites and templates ───────────────────────── */

/** A checkbox row: 44px, the box on the left. */
export function CheckRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (on: boolean) => void }) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-3 text-body text-ink">
      <Checkbox checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

/** "Start from a template": the saved templates as cards above step 1; picking one fills everything but the dates. */
export function TemplatePicker({ templates, onPick, onRemove, className }: { templates: HouseTemplate[]; onPick: (template: HouseTemplate) => void; onRemove: (id: string) => void; className?: string }) {
  const t = useTranslations("create.templates");
  const format = useFormat();
  return (
    <section className={className}>
      <h2 className="mb-3 text-small text-muted">{t("title")}</h2>
      <ul className="grid gap-3 sm:grid-cols-2">
        {templates.map((template) => {
          const { form } = template;
          const vibe = form.customVibe?.trim() || (form.vibe ? format.vibe(form.vibe) : "");
          const title = form.title.trim() || t("untitled");
          return (
            <li key={template.id} className="flex items-start gap-2 rounded-xl bg-surface shadow-(--shadow-sm) p-4 transition-colors hover:border-ink">
              <button type="button" onClick={() => onPick(template)} className="min-w-0 flex-1 text-left">
                <span className="block truncate text-body font-medium text-ink">{title}</span>
                <span className="mt-0.5 block truncate text-small text-muted">
                  {[vibe, regionShortName(form.region), format.people(form.spotsTotal)].filter(Boolean).join(" · ")}
                </span>
              </button>
              <Button variant="tertiary" onClick={() => onRemove(template.id)} aria-label={t("remove", { title })} className="size-6">
                <X />
              </Button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** The months of "Where and when?": 12 columns from 744px; on phones one row that scrolls sideways, the picked month scrolled into view. */
function MonthRow({ id, active, children }: { id: string; active: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useTabScroll(ref, active);
  return (
    <div ref={ref} id={id} className="tab-scroll grid grid-cols-6 gap-x-1.5 gap-y-2 max-md:flex md:grid-cols-12">
      {children}
    </div>
  );
}
