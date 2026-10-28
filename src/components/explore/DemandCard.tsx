"use client";

import { BellRing, CalendarSearch, Check, Plus } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { createHref } from "@/components/create/model";
import { formInput } from "@/components/form/FormLayout";
import { buttonClass } from "@/components/ui/button";
import { Sheet } from "@/components/ui/Sheet";
import { useFormat } from "@/i18n/format";
import { getCurrentUser, useStore } from "@/lib/store";

interface DemandCardProps {
  /** Country as filtered on Explore (null = anywhere) */
  region: string | null;
  /** Start-date window (null = any dates) */
  from?: string;
  to?: string;
  onClear: () => void;
}

/**
 * Explore without results: the demand is there, the supply isn't – so offer to open that House ("Open one",
 * prefilled with place and dates) or to hear when one opens ("Notify me", stored as an alert).
 */
export function DemandCard({ region, from, to, onClear }: DemandCardProps) {
  const t = useTranslations("growth.demand");
  const [notifying, setNotifying] = useState(false);

  return (
    <>
      <div className="flex flex-col items-center justify-center rounded-[28px] bg-white px-6 py-10 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-accent-soft text-accent">
          <CalendarSearch className="size-6" aria-hidden />
        </span>
        <h3 className="mt-5 text-xl font-semibold tracking-tight">{region ? t("titlePlace", { place: region }) : t("title")}</h3>
        <p className="mt-2 max-w-md text-sm text-zinc-500">{t("text")}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link href={createHref({ region: region ?? undefined, from, to })} className={buttonClass("dark", "md")}>
            <Plus className="size-4" aria-hidden />
            {t("openOne")}
          </Link>
          <button type="button" onClick={() => setNotifying(true)} className={buttonClass("secondary", "md")}>
            <BellRing className="size-4" aria-hidden />
            {t("notifyMe")}
          </button>
        </div>
        <button type="button" onClick={onClear} className="mt-4 text-sm font-medium text-zinc-500 underline underline-offset-2 hover:text-ink">
          {t("clear")}
        </button>
      </div>
      {/* Outside the centred card, so the form doesn't inherit text-center. */}
      <NotifyMeSheet open={notifying} onClose={() => setNotifying(false)} region={region ?? ""} from={from} to={to} />
    </>
  );
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function NotifyMeSheet({ open, onClose, region, from, to }: { open: boolean; onClose: () => void; region: string; from?: string; to?: string }) {
  const t = useTranslations("growth.alert");
  return (
    <Sheet open={open} onClose={onClose} title={t("title")} subtitle={t("subtitle")}>
      {/* Remounted per open: a sent alert doesn't linger as "done". */}
      {open && <NotifyMeForm region={region} from={from} to={to} onDone={onClose} />}
    </Sheet>
  );
}

function NotifyMeForm({ region, from, to, onDone }: { region: string; from?: string; to?: string; onDone: () => void }) {
  const t = useTranslations("growth.alert");
  const f = useFormat();
  const store = useStore();
  const [email, setEmail] = useState(() => getCurrentUser(store)?.email ?? "");
  const [tried, setTried] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const valid = EMAIL.test(email.trim());

  function submit(e: FormEvent) {
    e.preventDefault();
    setTried(true);
    if (!valid) return;
    store.addAlert({ email: email.trim(), region, from, to });
    setSentTo(email.trim());
  }

  if (sentTo) {
    return (
      <div className="flex flex-col items-center pt-4 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-zinc-100 text-ink">
          <Check className="size-7" strokeWidth={2.5} aria-hidden />
        </span>
        <p className="mt-5 text-lg font-semibold">{t("doneTitle")}</p>
        <p className="mt-1 text-sm text-neutral-600">{t("doneText", { email: sentTo })}</p>
        <button type="button" onClick={onDone} className={buttonClass("dark", "lg", "mt-8 w-full")}>
          {t("done")}
        </button>
      </div>
    );
  }

  const dates = from && to ? t("starting", { range: f.longRange(from, to) }) : t("anyDates");
  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <span className="rounded-full bg-page px-3 py-1.5 text-sm font-medium">{region || t("anywhere")}</span>
        <span className="rounded-full bg-page px-3 py-1.5 text-sm font-medium">{dates}</span>
      </div>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">{t("email")}</span>
        <input
          type="email"
          autoComplete="email"
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t("emailPlaceholder")}
          aria-invalid={tried && !valid ? true : undefined}
          className={formInput}
        />
        {tried && !valid && <span className="mt-1.5 block text-[13px] text-red-600">{t("invalid")}</span>}
      </label>
      <button type="submit" className={buttonClass("dark", "lg", "w-full")}>
        {t("submit")}
      </button>
    </form>
  );
}
