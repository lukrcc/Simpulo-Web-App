"use client";

import { Heart } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { RequireLogin } from "@/components/auth/RequireLogin";
import { Container } from "@/components/layout/Container";
import { StayCard } from "@/components/StayCard";
import { Avatar } from "@/components/ui/Avatar";
import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import { findUser, getCrew, getCurrentUser, useStore } from "@/lib/store";
import type { Stay, User } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Explore's card grid. */
const GRID = "grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-3 min-[90rem]:grid-cols-4";

/** /saved (avatar menu → "Saved houses"): the Houses you hearted, in Explore's card grid, plus your host alerts. */
export function SavedHouses() {
  const t = useTranslations("houses.saved");
  return (
    <RequireLogin title={t("loginTitle")} description={t("loginDescription")}>
      <SavedContent />
    </RequireLogin>
  );
}

function SavedContent() {
  const t = useTranslations("houses.saved");
  const store = useStore();
  const savedIds = getCurrentUser(store)?.savedStayIds ?? [];
  const saved = savedIds.map((id) => store.stays.find((s) => s.id === id)).filter((s): s is Stay => Boolean(s));

  return (
    <Container page>
      <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{t("title")}</h1>
      <p className="mt-2 text-muted">{t("description")}</p>
      {saved.length > 0 ? (
        <ul className={cn("mt-8", GRID)}>
          {saved.map((stay) => (
            <li key={stay.id}>
              <StayCard stay={stay} host={findUser(store, stay.hostId)} crew={getCrew(store, stay)} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-8">
          <EmptyState
            icon={Heart}
            title={t("emptyTitle")}
            description={t("emptyDescription")}
            action={
              <Link href="/" className={buttonClass("dark", "sm")}>
                {t("explore")}
              </Link>
            }
          />
        </div>
      )}
      <HostAlerts />
    </Container>
  );
}

/** Hosts with alerts on ("Notify me" on their profile) as rows with a switch. */
function HostAlerts() {
  const t = useTranslations("houses.hostAlerts");
  const store = useStore();
  const alertIds = getCurrentUser(store)?.hostAlerts ?? [];
  // Hosts switched off here stay listed until the page is left, so a mis-tap can be undone.
  const [shownIds, setShownIds] = useState(alertIds);
  const ids = [...shownIds, ...alertIds.filter((id) => !shownIds.includes(id))];
  if (ids.length !== shownIds.length) setShownIds(ids);
  const hosts = ids.map((id) => findUser(store, id)).filter((u): u is User => Boolean(u));
  if (hosts.length === 0) return null;

  return (
    <section className="mt-12 max-w-xl border-t border-line pt-6">
      <h2 className="text-lg font-semibold">{t("title")}</h2>
      <p className="mt-0.5 text-sm text-muted">{t("description")}</p>
      <ul className="mt-3 divide-y divide-line">
        {hosts.map((host) => {
          const on = alertIds.includes(host.id);
          return (
            <li key={host.id} className="flex items-center gap-3 py-2.5">
              <Avatar user={host} size="md" linked />
              <Link href={`/u/${host.id}`} className="min-w-0 flex-1 truncate text-sm font-medium hover:underline">
                {host.name}
              </Link>
              <button
                type="button"
                role="switch"
                aria-checked={on}
                aria-label={t("notifyLabel", { name: host.name.split(" ")[0] })}
                onClick={() => store.toggleHostAlert(host.id)}
                className="flex shrink-0 items-center gap-2 text-xs font-medium text-muted"
              >
                {t("notifyMe")}
                <span className={cn("relative h-5 w-9 shrink-0 rounded-full transition-colors", on ? "bg-ink" : "bg-line")}>
                  <span
                    className={cn("absolute left-0 top-0.5 size-4 rounded-full bg-surface shadow transition-transform", on ? "translate-x-4.5" : "translate-x-0.5")}
                  />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
