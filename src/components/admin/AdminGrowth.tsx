"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useMemo, useState, type ReactNode } from "react";
import { useFormat } from "@/i18n/format";
import type { GrowthEvent } from "@/lib/growth";
import { convertApprox } from "@/lib/mock-extras";
import { findUser, useStore } from "@/lib/store";
import type { Currency } from "@/lib/types";
import { AdminShell } from "./AdminShell";

/** One row of a growth table: a channel, a referrer or a House. */
interface Row {
  key: string;
  visits: number;
  requests: number;
  accepted: number;
  paid: number;
  /** Simpulo's part, ≈ EUR */
  revenue: number;
}

/** Visits = house_viewed, requests = request_sent, accepted = request_accepted, paid = payment_completed. */
function aggregate(events: GrowthEvent[], keyOf: (e: GrowthEvent) => string | undefined): Row[] {
  const rows = new Map<string, Row>();
  for (const e of events) {
    const key = keyOf(e);
    if (key === undefined) continue;
    const row = rows.get(key) ?? { key, visits: 0, requests: 0, accepted: 0, paid: 0, revenue: 0 };
    if (e.name === "house_viewed") row.visits++;
    else if (e.name === "request_sent") row.requests++;
    else if (e.name === "request_accepted") row.accepted++;
    else if (e.name === "payment_completed") {
      row.paid++;
      row.revenue += convertApprox(e.revenue ?? 0, (e.currency ?? "EUR") as Currency, "EUR");
    }
    rows.set(key, row);
  }
  return [...rows.values()]
    .filter((r) => r.visits + r.requests + r.accepted + r.paid > 0)
    .toSorted((a, b) => b.revenue - a.revenue || b.visits - a.visits || a.key.localeCompare(b.key));
}

const DIRECT = "\u0000direct";
const NO_REF = "\u0000none";
const COLLAPSED_ROWS = 10;

/** /admin/growth – tracked events per channel, per referrer and per House. */
export function AdminGrowth() {
  const t = useTranslations("growth.admin");
  const store = useStore();
  const { events } = store;

  const byChannel = useMemo(() => aggregate(events, (e) => e.utmSource ?? DIRECT), [events]);
  const byRef = useMemo(() => aggregate(events, (e) => e.refUserId ?? NO_REF), [events]);
  const byHouse = useMemo(() => aggregate(events, (e) => e.houseId), [events]);
  const visits = events.filter((e) => e.name === "house_viewed").length;
  const paid = events.filter((e) => e.name === "payment_completed").length;

  const userName = (id: string) => findUser(store, id)?.name ?? t("unknownUser", { id });
  const stayOf = (id: string) => store.stays.find((s) => s.id === id);

  return (
    <AdminShell title={t("growthTitle")} intro={t("growthIntro")}>
      <p className="text-sm font-medium tabular-nums text-zinc-600">{t("summary", { events: events.length, visits, paid })}</p>

      <div className="mt-6 space-y-6">
        <GrowthTable title={t("byChannel")} keyLabel={t("cols.channel")} rows={byChannel} label={(key) => (key === DIRECT ? t("direct") : key)} />
        <GrowthTable
          title={t("byRef")}
          keyLabel={t("cols.ref")}
          rows={byRef}
          label={(key) =>
            key === NO_REF ? (
              t("noRef")
            ) : (
              <Link href={`/u/${key}`} className="hover:underline">
                {userName(key)}
              </Link>
            )
          }
        />
        <GrowthTable
          title={t("byHouse")}
          keyLabel={t("cols.house")}
          rows={byHouse}
          label={(key) => {
            const stay = stayOf(key);
            if (!stay) return key;
            return (
              <Link href={`/stays/${stay.slug}`} className="hover:underline">
                {stay.title}
              </Link>
            );
          }}
        />
        <div className="grid gap-6 lg:grid-cols-2">
          <AlertsCard />
          <ApplicationsCard />
        </div>
      </div>
    </AdminShell>
  );
}

function GrowthTable({ title, keyLabel, rows, label }: { title: string; keyLabel: string; rows: Row[]; label: (key: string) => ReactNode }) {
  const t = useTranslations("growth.admin");
  const f = useFormat();
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? rows : rows.slice(0, COLLAPSED_ROWS);
  const total = rows.reduce(
    (sum, r) => ({ visits: sum.visits + r.visits, requests: sum.requests + r.requests, accepted: sum.accepted + r.accepted, paid: sum.paid + r.paid, revenue: sum.revenue + r.revenue }),
    { visits: 0, requests: 0, accepted: 0, paid: 0, revenue: 0 },
  );
  const num = "py-2.5 pl-4 text-right tabular-nums";

  return (
    <section className="rounded-[24px] bg-white p-6">
      <h2 className="mb-4 text-lg font-semibold">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-zinc-500">{t("none")}</p>
      ) : (
        // Scrolls inside the card on narrow screens – the page itself never scrolls sideways.
        <div className="-mx-6 overflow-x-auto px-6">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="text-xs text-zinc-500">
              <tr>
                <th scope="col" className="pb-2 font-medium">{keyLabel}</th>
                <th scope="col" className="pb-2 pl-4 text-right font-medium">{t("cols.visits")}</th>
                <th scope="col" className="pb-2 pl-4 text-right font-medium">{t("cols.requests")}</th>
                <th scope="col" className="pb-2 pl-4 text-right font-medium">{t("cols.accepted")}</th>
                <th scope="col" className="pb-2 pl-4 text-right font-medium">{t("cols.paid")}</th>
                <th scope="col" className="pb-2 pl-4 text-right font-medium">{t("cols.revenue")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 border-t border-black/5">
              {shown.map((row) => (
                <tr key={row.key}>
                  <td className="max-w-64 truncate py-2.5 font-medium">{label(row.key)}</td>
                  <td className={num}>{row.visits}</td>
                  <td className={num}>{row.requests}</td>
                  <td className={num}>{row.accepted}</td>
                  <td className={num}>{row.paid}</td>
                  <td className={num}>{f.price(Math.round(row.revenue), "EUR")}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t border-black/10 font-semibold">
              <tr>
                <td className="py-2.5" />
                <td className={num}>{total.visits}</td>
                <td className={num}>{total.requests}</td>
                <td className={num}>{total.accepted}</td>
                <td className={num}>{total.paid}</td>
                <td className={num}>{f.price(Math.round(total.revenue), "EUR")}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
      {rows.length > COLLAPSED_ROWS && (
        <button type="button" onClick={() => setExpanded((e) => !e)} className="mt-3 text-sm font-medium text-zinc-600 underline underline-offset-2 hover:text-ink">
          {expanded ? t("showLess") : t("showAll", { count: rows.length })}
        </button>
      )}
    </section>
  );
}

function AlertsCard() {
  const t = useTranslations("growth.admin");
  const tAlert = useTranslations("growth.alert");
  const f = useFormat();
  const { alerts } = useStore();
  return (
    <section className="rounded-[24px] bg-white p-6">
      <h2 className="mb-4 text-lg font-semibold">{t("alerts")}</h2>
      {alerts.length === 0 ? (
        <p className="text-sm text-zinc-500">{t("none")}</p>
      ) : (
        <ul className="divide-y divide-black/5 text-sm">
          {alerts.toReversed().map((a) => (
            <li key={a.id} className="py-2.5">
              {t("alertRow", {
                email: a.email,
                place: a.region || tAlert("anywhere"),
                dates: a.from && a.to ? f.longRange(a.from, a.to) : tAlert("anyDates"),
              })}
              <span className="block text-xs text-zinc-500">{f.day(a.createdAt)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ApplicationsCard() {
  const t = useTranslations("growth.admin");
  const tHost = useTranslations("growth.host");
  const f = useFormat();
  const { applications } = useStore();
  return (
    <section className="rounded-[24px] bg-white p-6">
      <h2 className="mb-4 text-lg font-semibold">{t("applications")}</h2>
      {applications.length === 0 ? (
        <p className="text-sm text-zinc-500">{t("none")}</p>
      ) : (
        <ul className="divide-y divide-black/5 text-sm">
          {applications.toReversed().map((a) => (
            <li key={a.id} className="py-3">
              <p className="font-medium">
                {a.name} · <span className="font-normal text-zinc-600">{a.email}</span>
              </p>
              <p className="mt-0.5 text-zinc-600">
                {tHost(`audienceSizes.${a.audienceSize}`)} · {a.place}
                {a.from && a.to && ` · ${f.longRange(a.from, a.to)}`}
              </p>
              <p className="mt-1 text-neutral-700">{a.idea}</p>
              <p className="mt-1 break-all text-xs text-zinc-500">{a.platformLinks.join(" · ")}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
