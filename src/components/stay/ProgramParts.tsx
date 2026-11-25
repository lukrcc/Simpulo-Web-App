"use client";

// The programme builder for Pro hosts (CLAUDE.md "Programm-Baukasten"): the editor in Manage (a day plan per House day – time, title,
// where, a few words – templates by theme, sorted by dragging or the arrows, the arc's own moments), the crew's view in Plan (in full from
// two days before, a preview until then), "What's planned" on the House page, and the programme's feedback for the host after the House.
import { PanelCapsule } from "@/components/ui/PanelCapsule";
import { ArrowDown, ArrowUp, GripVertical, Sparkles, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, type DragEvent } from "react";
import { Button } from "@/components/ui/ActionButton";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { TabBar } from "@/components/ui/TabBar";
import { useToast } from "@/components/ui/Toast";
import { PROGRAM_MOMENTS, PROGRAM_TEMPLATE_DEFAULT, PROGRAM_TEMPLATES, PROGRAM_FEEDBACK_MIN, type ProgramMoment } from "@/config/program";
import { useFormat } from "@/i18n/format";
import { APP_MODE } from "@/lib/appMode";
import { afterAt, useArcNow } from "@/lib/arc";
import { isProHouse, itemsOfDay, programDate, programDays, programFull, programPreview, summarizeProgramme } from "@/lib/program";
import { findUser, getCrew, settingsOf, useStore } from "@/lib/store";
import type { ProgramItem, Stay } from "@/lib/types";
import { cn, firstName, makeId } from "@/lib/utils";

/** A programme item's line: time, title, where; its moment as a small badge. */
function ItemLine({ item, full }: { item: ProgramItem; full: boolean }) {
  const t = useTranslations("program");
  return (
    <div className="min-w-0">
      <p className="flex flex-wrap items-baseline gap-x-3 text-body-lg text-ink">
        {full && item.time && <span className="tabular-nums text-muted">{item.time}</span>}
        <span className="font-semibold">{item.title}</span>
        {item.moment && (
          <span className="inline-flex items-center gap-1 rounded-full bg-ink/6 px-2 py-0.5 text-small text-ink">
            <Sparkles aria-hidden className="size-3" />
            {t(`moments.${item.moment}`)}
          </span>
        )}
      </p>
      {full && item.place && <p className="text-small text-muted">{item.place}</p>}
      {full && item.text && <p className="mt-0.5 text-body text-muted">{item.text}</p>}
    </div>
  );
}

// ── Manage: the editor ──────────────────────────────────────────────────────────────────────────────────────────────────────────

export function ProgramEditor({ stay }: { stay: Stay }) {
  const t = useTranslations("program");
  const tTpl = useTranslations("program.templates");
  const f = useFormat();
  const store = useStore();
  const showToast = useToast();
  const days = programDays(stay);
  const [day, setDay] = useState(1);
  const [form, setForm] = useState({ time: "", title: "", place: "", text: "" });
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const all = stay.program ?? [];
  const items = itemsOfDay(stay, day);
  if (!isProHouse(stay)) return <p className="text-body text-muted">{t("proOnly")}</p>;

  const save = (next: ProgramItem[]) => store.setProgram(stay.id, next);
  const setDayItems = (next: ProgramItem[]) => save([...all.filter((i) => i.day !== day), ...next]);
  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length || from === to) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setDayItems(next);
  };
  const add = () => {
    if (!form.title.trim()) return;
    setDayItems([...items, { id: makeId("pi"), day, time: form.time || undefined, title: form.title.trim().slice(0, 80), place: form.place.trim().slice(0, 80) || undefined, text: form.text.trim().slice(0, 200) || undefined }]);
    setForm({ time: "", title: "", place: "", text: "" });
  };
  const template = PROGRAM_TEMPLATES[stay.vibe] ?? PROGRAM_TEMPLATE_DEFAULT;
  const useTemplate = () =>
    setDayItems([
      ...items,
      ...template.map((x) => ({ id: makeId("pi"), day, time: x.time, title: tTpl(`${x.key}.title` as "lunch.title"), text: tTpl(`${x.key}.text` as "lunch.text") || undefined })),
    ]);
  const copyToAll = () => {
    const copies = Array.from({ length: days }, (_, i) => i + 1)
      .filter((d) => d !== day)
      // The arc's moments stay where they are – a copy never takes one.
      .flatMap((d) => items.map((i) => ({ ...i, id: makeId("pi"), day: d, moment: undefined })));
    save([...all.filter((i) => i.day === day), ...copies]);
    showToast(t("copied"));
  };
  // One item per moment: setting it here takes it from wherever it was.
  const setMoment = (id: string, moment: ProgramMoment | "") =>
    save(all.map((i) => (i.id === id ? { ...i, moment: moment || undefined } : moment && i.moment === moment ? { ...i, moment: undefined } : i)));

  const onDrop = (e: DragEvent, to: number) => {
    e.preventDefault();
    if (dragFrom !== null) move(dragFrom, to);
    setDragFrom(null);
  };

  return (
    <div data-program-editor className="flex flex-col gap-5">
      <p className="text-body text-muted">{t("intro")}</p>
      <TabBar bleed={false} label={t("daysLabel")} value={String(day)} onChange={(v) => setDay(Number(v))} options={Array.from({ length: days }, (_, i) => ({ value: String(i + 1), label: t("day", { day: i + 1 }) }))} />
      <p className="text-small text-muted">{f.day(programDate(stay, day))}</p>
      {items.length === 0 ? (
        <p className="text-body text-muted">{t("empty")}</p>
      ) : (
        <ol className="flex flex-col divide-y divide-ink/8 border-y border-ink/8">
          {items.map((item, i) => (
            <li
              key={item.id}
              data-program-item={item.id}
              draggable
              onDragStart={() => setDragFrom(i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => onDrop(e, i)}
              className={cn("flex flex-wrap items-start gap-3 py-3", dragFrom === i && "opacity-50")}
            >
              <span aria-hidden className="mt-1 cursor-grab text-muted active:cursor-grabbing">
                <GripVertical className="size-4" />
              </span>
              <div className="min-w-0 flex-1 basis-[220px]">
                <ItemLine item={item} full />
              </div>
              <label className="flex items-center gap-2 text-small text-muted">
                <span className="sr-only">{t("moment")}</span>
                <Select value={item.moment ?? ""} onChange={(e) => setMoment(item.id, e.target.value as ProgramMoment | "")} className="h-9 w-36" aria-label={t("moment")}>
                  <option value="">{t("moment")}: {t("momentNone")}</option>
                  {PROGRAM_MOMENTS.map((m) => (
                    <option key={m} value={m}>
                      {t(`moments.${m}`)}
                    </option>
                  ))}
                </Select>
              </label>
              <span className="flex shrink-0 items-center">
                <button type="button" aria-label={t("moveUp")} onClick={() => move(i, i - 1)} disabled={i === 0} className="flex size-9 items-center justify-center rounded-full text-muted hover:bg-ink/6 hover:text-ink disabled:opacity-30">
                  <ArrowUp className="size-4" />
                </button>
                <button type="button" aria-label={t("moveDown")} onClick={() => move(i, i + 1)} disabled={i === items.length - 1} className="flex size-9 items-center justify-center rounded-full text-muted hover:bg-ink/6 hover:text-ink disabled:opacity-30">
                  <ArrowDown className="size-4" />
                </button>
                <button type="button" aria-label={t("remove")} onClick={() => setDayItems(items.filter((x) => x.id !== item.id))} className="flex size-9 items-center justify-center rounded-full text-muted hover:bg-ink/6 hover:text-ink">
                  <Trash2 className="size-4" />
                </button>
              </span>
            </li>
          ))}
        </ol>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
        className="grid gap-3 sm:grid-cols-[120px_minmax(0,1fr)]"
      >
        <label className="flex flex-col gap-1.5">
          <span className="text-small font-semibold text-ink">{t("time")}</span>
          <Input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-small font-semibold text-ink">{t("itemTitle")}</span>
          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={80} />
        </label>
        <label className="flex flex-col gap-1.5 sm:col-span-2">
          <span className="text-small font-semibold text-ink">
            {t("place")} <span className="font-normal text-muted">· {t("optional")}</span>
          </span>
          <Input value={form.place} onChange={(e) => setForm({ ...form, place: e.target.value })} maxLength={80} />
        </label>
        <label className="flex flex-col gap-1.5 sm:col-span-2">
          <span className="text-small font-semibold text-ink">
            {t("text")} <span className="font-normal text-muted">· {t("optional")}</span>
          </span>
          <Textarea value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} rows={2} maxLength={200} />
        </label>
        <div className="flex flex-wrap gap-2 sm:col-span-2">
          <Button type="submit" size="sm" disabled={!form.title.trim()}>
            {t("add")}
          </Button>
          <Button type="button" size="sm" variant="secondary" onClick={useTemplate}>
            {PROGRAM_TEMPLATES[stay.vibe] ? t("template", { theme: f.vibe(stay.vibe) }) : t("templateGeneric")}
          </Button>
          {items.length > 0 && days > 1 && (
            <Button type="button" size="sm" variant="tertiary" onClick={copyToAll}>
              {t("copyAll")}
            </Button>
          )}
        </div>
      </form>
      <p className="text-small text-muted">{t("momentsHint")}</p>
    </div>
  );
}

// ── Plan: the crew's view ──────────────────────────────────────────────────────────────────────────────────────────────────────

export function ProgramView({ stay, isHost, onHostAdd }: { stay: Stay; isHost: boolean; /** The host's empty programme: "Plan the programme" → Manage */ onHostAdd?: () => void }) {
  const t = useTranslations("program");
  const f = useFormat();
  const store = useStore();
  const now = useArcNow(stay);
  if (!isProHouse(stay)) return null;
  const items = stay.program ?? [];
  const host = findUser(store, stay.hostId);
  if (items.length === 0) return isHost && onHostAdd ? <PanelCapsule onClick={onHostAdd}>{t("planAdd")}</PanelCapsule> : <p className="text-body text-muted">{t("planEmpty", { host: host ? firstName(host) : "" })}</p>;
  if (!programFull(stay, now, isHost)) {
    return (
      <div data-program-view="preview" className="flex flex-col gap-3">
        <ul className="flex flex-col gap-2">
          {programPreview(stay).map((i) => (
            <li key={i.id}>
              <ItemLine item={i} full={false} />
            </li>
          ))}
        </ul>
        <p className="text-small text-muted">{t("planPreview")}</p>
      </div>
    );
  }
  const days = [...new Set(items.map((i) => i.day))].toSorted((a, b) => a - b);
  return (
    <div data-program-view="full" className="flex flex-col gap-6">
      {days.map((d) => (
        <section key={d} aria-label={t("day", { day: d })}>
          <h3 className="text-eyebrow uppercase text-ink/55">{t("dayDate", { day: d, date: f.day(programDate(stay, d)) })}</h3>
          <ol className="mt-2 flex flex-col gap-3">
            {itemsOfDay(stay, d).map((i) => (
              <li key={i.id}>
                <ItemLine item={i} full />
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}

// ── House page: "What's planned" ─────────────────────────────────────────────────────────────────────────────────────────────

export function WhatsPlanned({ stay }: { stay: Stay }) {
  const t = useTranslations("program");
  if (!isProHouse(stay) || !(stay.program ?? []).length) return null;
  return (
    <section aria-labelledby="house-planned" data-whats-planned>
      <h2 id="house-planned" className="text-subhead text-ink">
        {t("whatsPlanned")}
      </h2>
      <ul className="mt-3 flex flex-col gap-2">
        {programPreview(stay).map((i) => (
          <li key={i.id}>
            <ItemLine item={i} full={false} />
          </li>
        ))}
      </ul>
      <p className="mt-3 text-small text-muted">{t("whatsPlannedMore")}</p>
    </section>
  );
}

// ── After the House: the programme's feedback for the host ─────────────────────────────────────────────────────────────────

/** A stable 0–1 from a text (the mock's other guests answer the same every time). */
function unit(text: string): number {
  let h = 2166136261;
  for (const c of text) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return (h >>> 0) / 4294967296;
}

export function ProgramFeedbackSummary({ stay }: { stay: Stay }) {
  const t = useTranslations("program");
  const store = useStore();
  const now = useArcNow(stay);
  if (!isProHouse(stay) || now < afterAt(stay)) return null;
  // Each guest's answer (ArcAfter.programme / programmeNote); in the mock the others answer by id – their sentences are never made up.
  const rows = getCrew(store, stay)
    .filter((u) => u.id !== stay.hostId)
    .flatMap((u) => {
      const own = settingsOf(u).after?.[stay.id];
      if (own?.programme) return [{ programme: own.programme, programmeNote: own.programmeNote }];
      if (APP_MODE !== "production" && u.id !== store.currentUserId && unit(`${u.id}:${stay.id}:programme`) > 0.25) return [{ programme: 3 + Math.floor(unit(`${u.id}:${stay.id}:p`) * 3) }];
      return [];
    });
  const s = summarizeProgramme(rows);
  return (
    <div data-program-feedback className="flex flex-col gap-3">
      {s.average !== null ? <p className="text-body font-semibold text-ink">{t("feedbackAverage", { average: s.average.toFixed(1), count: s.count })}</p> : <p className="text-body text-muted">{t("feedbackWait", { min: PROGRAM_FEEDBACK_MIN })}</p>}
      <div>
        <p className="text-small font-semibold text-ink">{t("feedbackNotes")}</p>
        {s.notes.length === 0 ? (
          <p className="text-small text-muted">{t("feedbackNone")}</p>
        ) : (
          <ul className="mt-1 flex flex-col gap-1">
            {s.notes.map((n) => (
              <li key={n} className="text-body text-ink">
                “{n}”
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
