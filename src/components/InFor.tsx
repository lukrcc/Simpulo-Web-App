"use client";

import { MapPin, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import { MonthField, PlaceField, useMonthName } from "@/components/explore/SearchFields";
import { Button } from "@/components/ui/ActionButton";
import { CapsuleGroup } from "@/components/ui/CapsuleGroup";
import { Chip } from "@/components/ui/Chip";
import { IconButton } from "@/components/ui/IconButton";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";
import { IN_FOR_POLICY } from "@/config/policies";
import { useFormat } from "@/i18n/format";
import { useTodayIso } from "@/lib/birthDate";
import { VIBES } from "@/lib/catalog";
import { activeInForOf, canAddInFor, IN_FOR_LENGTHS, inForPlaceName, type InFor, type InForLength } from "@/lib/inFor";
import { useStore } from "@/lib/store";
import type { Vibe } from "@/lib/types";

/** "Lisbon · Mar" or "Lisbon · Mar–Apr". */
export function useInForLine() {
  const t = useTranslations("inFor");
  const monthName = useMonthName();
  return (s: InFor) => t("line", { place: inForPlaceName(s), months: s.monthFrom === s.monthTo ? monthName(s.monthFrom, "bare") : `${monthName(s.monthFrom, "bare")}–${monthName(s.monthTo, "bare")}` });
}

/**
 * "I'm in for …": your running signals (each with ✕) and, while there's room (IN_FOR_POLICY.maxActive), the form – Where (a city or
 * region of the place search) · When (from, until – months) · How long (capsule group: short trip · about a month · longer) · optionally
 * categories. Saved at once (the store); each runs out by itself after its last month.
 */
export function InForEditor({ initial, onSaved, showList = true }: { initial?: { placeId?: string | null; month?: string | null }; onSaved?: () => void; showList?: boolean }) {
  const t = useTranslations("inFor");
  const store = useStore();
  const today = useTodayIso();
  const format = useFormat();
  const showToast = useToast();
  const line = useInForLine();
  const [placeId, setPlaceId] = useState<string | null>(initial?.placeId ?? null);
  const [from, setFrom] = useState<string | null>(initial?.month ?? null);
  const [until, setUntil] = useState<string | null>(null);
  const [length, setLength] = useState<InForLength>("month");
  const [categories, setCategories] = useState<Vibe[]>([]);
  const me = store.currentUserId;
  if (!me || !today) return null;
  const mine = activeInForOf(store.inFor, me, today);
  const room = canAddInFor(store.inFor, me, today);
  const valid = placeId !== null && from !== null && (until === null || until >= from);
  const save = () => {
    if (!valid || !placeId || !from) return;
    if (!store.addInFor({ placeId, monthFrom: from, monthTo: until ?? from, length, categories })) return showToast(t("max", { count: IN_FOR_POLICY.maxActive }));
    showToast(t("added", { place: inForPlaceName({ placeId }) }));
    setPlaceId(null);
    setFrom(null);
    setUntil(null);
    setCategories([]);
    onSaved?.();
  };
  const toggleCategory = (vibe: Vibe) => setCategories((list) => (list.includes(vibe) ? list.filter((v) => v !== vibe) : [...list, vibe]));

  return (
    <div className="flex flex-col gap-6">
      {showList && mine.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {mine.map((s) => (
            <li key={s.id} className="inline-flex h-10 items-center gap-2 rounded-full border border-ink/12 pl-4 pr-1 text-body text-ink">
              <MapPin aria-hidden className="size-4 text-muted" />
              {line(s)}
              <IconButton size="sm" variant="surface" onClick={() => store.removeInFor(s.id)} aria-label={`${t("remove")}: ${line(s)}`}>
                <X aria-hidden />
              </IconButton>
            </li>
          ))}
        </ul>
      )}
      {room ? (
        <div className="flex flex-col gap-5">
          <Field label={t("where")}>
            <PlaceField value={placeId} onChange={setPlaceId} size="lg" />
          </Field>
          <Field label={t("when")}>
            <div className="flex flex-wrap items-center gap-2">
              <MonthField value={from} onChange={setFrom} size="lg" />
              <span className="text-small text-muted">{t("until")}</span>
              <MonthField value={until} onChange={setUntil} size="lg" />
            </div>
          </Field>
          <Field label={t("howLong")}>
            <CapsuleGroup label={t("howLong")} value={length} onChange={setLength} options={IN_FOR_LENGTHS.map((key) => ({ value: key, content: t(key) }))} className="w-max max-w-full" />
          </Field>
          <Field label={t("categories")}>
            <div className="flex flex-wrap gap-2">
              {VIBES.map(({ key }) => (
                <Chip key={key} active={categories.includes(key)} onClick={() => toggleCategory(key)}>
                  {format.vibe(key)}
                </Chip>
              ))}
            </div>
          </Field>
          <div>
            <Button onClick={save} disabled={!valid}>
              {t("save")}
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-small text-muted">{t("max", { count: IN_FOR_POLICY.maxActive })}</p>
      )}
    </div>
  );
}

/** A label small and muted above its control (never "Label: value" in one line). */
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-small text-muted">{label}</p>
      {children}
    </div>
  );
}

/** Explore's "Nothing fits?": the editor in a dialog, the search's place and month already in. */
export function InForSheet({ open, onClose, initial }: { open: boolean; onClose: () => void; initial?: { placeId?: string | null; month?: string | null } }) {
  const t = useTranslations("inFor");
  return (
    <Sheet open={open} onClose={onClose} title={t("title")} subtitle={t("lead")}>
      <InForEditor initial={initial} onSaved={onClose} />
    </Sheet>
  );
}
