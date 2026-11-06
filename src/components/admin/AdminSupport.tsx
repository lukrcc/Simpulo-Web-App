"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/Badge";
import { Img } from "@/components/ui/Img";
import { useFormat } from "@/i18n/format";
import { findUser, useStore } from "@/lib/store";
import { AdminShell } from "./AdminShell";

/** /admin/support – every help request, newest first: number, House, who, category, text, photo. */
export function AdminSupport() {
  const t = useTranslations("help");
  const f = useFormat();
  const store = useStore();
  const cases = (store.supportCases ?? []).toSorted((a, b) => b.createdAt.localeCompare(a.createdAt));
  return (
    <AdminShell title={t("adminTitle")} intro={t("adminIntro")}>
      {cases.length === 0 ? (
        <p className="text-body text-muted">{t("adminEmpty")}</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {cases.map((c) => {
            const stay = store.stays.find((s) => s.id === c.stayId);
            const person = findUser(store, c.userId);
            return (
              <li key={c.id} className="card-soft flex gap-4 rounded-3xl p-6">
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-body font-semibold text-ink">
                    {c.number}
                    <Badge className="bg-ink/6">{t(`categories.${c.category}`)}</Badge>
                    <span className="text-small font-normal text-muted">{f.day(c.createdAt)}</span>
                  </p>
                  <p className="mt-1 text-small text-muted">
                    {person?.name ?? "–"} · {stay ? <Link href={`/house/${stay.slug}`} className="hover:underline">{stay.title}</Link> : "–"}
                  </p>
                  <p className="mt-3 max-w-[640px] text-body text-ink">{c.text}</p>
                </div>
                {c.photo && <Img src={c.photo} alt="" width={96} height={96} className="size-24 shrink-0 rounded-2xl object-cover" />}
              </li>
            );
          })}
        </ul>
      )}
    </AdminShell>
  );
}
