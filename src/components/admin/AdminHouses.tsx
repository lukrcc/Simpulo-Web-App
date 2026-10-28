"use client";

import { Copy, Plus } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { FormField, formInput, formTextarea } from "@/components/form/FormLayout";
import { buttonClass } from "@/components/ui/button";
import { Img } from "@/components/ui/Img";
import { useToast } from "@/components/ui/Toast";
import { useFormat } from "@/i18n/format";
import { shareUrl } from "@/lib/growth";
import { findUser, useStore, type ClaimableStayInput } from "@/lib/store";
import type { Stay } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AdminShell } from "./AdminShell";

/** The link a creator claims their prepared House with (tagged, so claims show up per channel). */
function claimLink(token: string): string {
  return shareUrl(`/claim/${token}`, { refUserId: null, channel: "copy", medium: "claim" });
}

function useCopyClaimLink() {
  const t = useTranslations("growth.admin");
  const tCommon = useTranslations("common");
  const showToast = useToast();
  return async (token: string) => {
    try {
      await navigator.clipboard.writeText(claimLink(token));
      showToast(t("linkCopied"));
    } catch {
      showToast(tCommon("linkCopyFailed"));
    }
  };
}

/** /admin/houses – every House prepared on someone's behalf, claimed or not. */
export function AdminHouses() {
  const t = useTranslations("growth.admin");
  const { stays } = useStore();
  const prepared = stays.filter((s) => s.claim).toSorted((a, b) => b.claim!.createdAt.localeCompare(a.claim!.createdAt));

  return (
    <AdminShell
      title={t("housesTitle")}
      intro={t("housesIntro")}
      aside={
        <Link href="/admin/houses/new" className={buttonClass("dark", "md")}>
          <Plus className="size-4" aria-hidden />
          {t("newHouse")}
        </Link>
      }
    >
      <section className="rounded-[24px] bg-white p-6">
        {prepared.length === 0 ? (
          <p className="text-sm text-zinc-500">{t("none")}</p>
        ) : (
          <ul className="divide-y divide-black/5">
            {prepared.map((stay) => (
              <PreparedRow key={stay.id} stay={stay} />
            ))}
          </ul>
        )}
      </section>
    </AdminShell>
  );
}

function PreparedRow({ stay }: { stay: Stay }) {
  const t = useTranslations("growth.admin");
  const f = useFormat();
  const store = useStore();
  const copy = useCopyClaimLink();
  const claim = stay.claim!;
  const claimedBy = claim.claimedBy ? findUser(store, claim.claimedBy) : undefined;

  return (
    <li className="flex flex-wrap items-center gap-4 py-4 first:pt-0 last:pb-0">
      {claim.photoUrl ? (
        <Img src={claim.photoUrl} alt="" width={56} height={56} className="size-14 shrink-0 rounded-xl object-cover" />
      ) : (
        <span className="size-14 shrink-0 rounded-xl bg-page" aria-hidden />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate font-semibold">{stay.title}</p>
          <span
            className={cn(
              "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium",
              claim.claimedAt ? "bg-emerald-50 text-emerald-700" : "bg-black/5 text-zinc-600",
            )}
          >
            {claim.claimedAt ? t("claimed") : t("unclaimed")}
          </span>
        </div>
        <p className="truncate text-sm text-zinc-500">
          {claim.name} · {f.placeName(stay)} · {f.shortRange(stay.startDate, stay.endDate)}
        </p>
        {claim.claimedAt && (
          <p className="text-xs text-zinc-500">{t("claimedBy", { name: claimedBy?.name ?? claim.claimedBy ?? "", date: f.day(claim.claimedAt) })}</p>
        )}
      </div>
      <div className="flex gap-2">
        {!claim.claimedAt && (
          <button type="button" onClick={() => void copy(claim.token)} className={buttonClass("secondary", "sm")}>
            <Copy className="size-3.5" aria-hidden />
            {t("copyLink")}
          </button>
        )}
        <Link href={`/claim/${claim.token}`} className={buttonClass("ghost", "sm")}>
          {t("open")}
        </Link>
      </div>
    </li>
  );
}

type FieldName = keyof ClaimableStayInput;

const EMPTY: ClaimableStayInput = {
  name: "",
  photoUrl: "",
  sourceLink: "",
  title: "",
  region: "",
  city: "",
  startDate: "",
  endDate: "",
  spotsTotal: 4,
  pitch: "",
};

const isHttpUrl = (value: string) => {
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
};

/** Photo URLs may also be app paths (/mock/…). */
const isPhotoUrl = (value: string) => value.startsWith("/") || isHttpUrl(value);

type ErrorKey = "required" | "url" | "dates" | "spots";

function errorsOf(input: ClaimableStayInput): Partial<Record<FieldName, ErrorKey>> {
  const errors: Partial<Record<FieldName, ErrorKey>> = {};
  for (const key of ["name", "title", "region", "pitch", "photoUrl", "sourceLink", "startDate", "endDate"] as const) {
    if (!String(input[key]).trim()) errors[key] = "required";
  }
  if (input.photoUrl.trim() && !isPhotoUrl(input.photoUrl.trim())) errors.photoUrl = "url";
  if (input.sourceLink.trim() && !isHttpUrl(input.sourceLink.trim())) errors.sourceLink = "url";
  if (input.startDate && input.endDate && input.endDate <= input.startDate) errors.endDate = "dates";
  if (!Number.isInteger(input.spotsTotal) || input.spotsTotal < 2 || input.spotsTotal > 12) errors.spotsTotal = "spots";
  return errors;
}

/** /admin/houses/new – prepare a House for a creator from their post; the result is a claim link. */
export function AdminNewHouse() {
  const t = useTranslations("growth.admin");
  const store = useStore();
  const copy = useCopyClaimLink();
  const [input, setInput] = useState<ClaimableStayInput>(EMPTY);
  const [tried, setTried] = useState(false);
  const [created, setCreated] = useState<{ token: string; name: string } | null>(null);
  const errors = errorsOf(input);

  const set = <K extends FieldName>(key: K, value: ClaimableStayInput[K]) => setInput((prev) => ({ ...prev, [key]: value }));
  const errorOf = (key: FieldName) => (tried && errors[key] ? t(`errors.${errors[key]}`) : null);

  function submit(e: FormEvent) {
    e.preventDefault();
    setTried(true);
    if (Object.keys(errors).length > 0) return;
    setCreated({ token: store.createClaimableStay(input), name: input.name.trim() });
  }

  if (created) {
    const link = claimLink(created.token);
    return (
      <AdminShell title={t("createdTitle")} intro={t("createdText", { name: created.name })}>
        <section className="max-w-2xl rounded-[24px] bg-white p-6">
          <p className="break-all rounded-xl bg-page px-4 py-3 font-mono text-sm">{link}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={() => void copy(created.token)} className={buttonClass("dark", "sm")}>
              <Copy className="size-3.5" aria-hidden />
              {t("copyLink")}
            </button>
            <Link href={`/claim/${created.token}`} className={buttonClass("secondary", "sm")}>
              {t("open")}
            </Link>
            <button
              type="button"
              onClick={() => {
                setInput(EMPTY);
                setTried(false);
                setCreated(null);
              }}
              className={buttonClass("ghost", "sm")}
            >
              {t("another")}
            </button>
            <Link href="/admin/houses" className={buttonClass("ghost", "sm")}>
              {t("viewAll")}
            </Link>
          </div>
        </section>
      </AdminShell>
    );
  }

  const text = (key: "name" | "photoUrl" | "title" | "region" | "city" | "sourceLink", props: { placeholder?: string; type?: string } = {}) => (
    <FormField label={t(`fields.${key}`)} optional={key === "city"} error={errorOf(key)}>
      <input
        type={props.type ?? "text"}
        value={input[key]}
        onChange={(e) => set(key, e.target.value)}
        placeholder={props.placeholder}
        aria-invalid={errorOf(key) ? true : undefined}
        className={formInput}
      />
    </FormField>
  );

  return (
    <AdminShell title={t("newTitle")} intro={t("newIntro")}>
      <form onSubmit={submit} noValidate className="max-w-2xl space-y-5 rounded-[24px] bg-white p-6">
        <div className="grid gap-5 sm:grid-cols-2">
          {text("name")}
          {text("photoUrl", { type: "url", placeholder: "https://…" })}
        </div>
        {text("title")}
        <div className="grid gap-5 sm:grid-cols-2">
          {text("region", { placeholder: t("fields.regionPlaceholder") })}
          {text("city", { placeholder: t("fields.cityPlaceholder") })}
        </div>
        <div className="grid gap-5 sm:grid-cols-3">
          <FormField label={t("fields.startDate")} error={errorOf("startDate")}>
            <input type="date" value={input.startDate} onChange={(e) => set("startDate", e.target.value)} className={formInput} />
          </FormField>
          <FormField label={t("fields.endDate")} error={errorOf("endDate")}>
            <input type="date" value={input.endDate} min={input.startDate || undefined} onChange={(e) => set("endDate", e.target.value)} className={formInput} />
          </FormField>
          <FormField label={t("fields.spots")} error={errorOf("spotsTotal")}>
            <input
              type="number"
              inputMode="numeric"
              min={2}
              max={12}
              value={input.spotsTotal}
              onChange={(e) => set("spotsTotal", Number(e.target.value))}
              className={formInput}
            />
          </FormField>
        </div>
        <FormField label={t("fields.pitch")} error={errorOf("pitch")}>
          <textarea
            rows={4}
            value={input.pitch}
            onChange={(e) => set("pitch", e.target.value)}
            placeholder={t("fields.pitchPlaceholder")}
            aria-invalid={errorOf("pitch") ? true : undefined}
            className={formTextarea}
          />
        </FormField>
        {text("sourceLink", { type: "url", placeholder: t("fields.sourceLinkPlaceholder") })}
        <button type="submit" className={buttonClass("dark", "lg", "w-full sm:w-auto")}>
          {t("create")}
        </button>
      </form>
    </AdminShell>
  );
}
